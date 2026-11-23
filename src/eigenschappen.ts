import {
  EIGENSCHAP_VAN_ROL,
  heeftVermogen,
  rollenVan,
  type Adapter,
  type Bevinding,
  type Documenteigenschappen,
  type Inhoud,
  type Objecttype,
  type Rol,
  type Standaardeigenschap,
  gemeenteNaamUitId,
} from "@digitaalgemeengoed/oa-contract";
import { velden } from "./metadateren.js";
import type { ObjectMetStaat } from "./verbinding.js";

/**
 * Documenteigenschappen: het bestand neemt zijn gegevens mee, ook buiten het
 * platform (als bijlage, als download, als PDF/A). Het platform blijft de
 * bron: uit de eigenschappen komen alleen voorstellen, en na het vastleggen
 * schrijft de assistent de metadata terug in het bestand.
 */

const platte = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

/** De tekst van elke regel met het opmaakprofiel Titel (<h1 data-oa-stijl="titel">). */
export function titelRegels(inhoud: Inhoud | string): string[] {
  const html = typeof inhoud === "string" ? inhoud : inhoud.formaat === "html" ? inhoud.data : "";
  return [...html.matchAll(/<h1\b[^>]*\bdata-oa-stijl\s*=\s*["']titel["'][^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => platte(m[1]!)).filter(Boolean);
}

export const kanLezen = (a: Adapter) => !!a.leesEigenschappen && heeftVermogen(a.werkomgeving(), "eigenschappen-lezen");
export const kanSchrijven = (a: Adapter) => !!a.schrijfStandaardeigenschap && heeftVermogen(a.werkomgeving(), "standaardeigenschap-schrijven");
const kanEigenSchrijven = (a: Adapter) => !!a.schrijfDocumenteigenschap && heeftVermogen(a.werkomgeving(), "eigenschap-schrijven");

/** De eigenschappen van het document, of null als de werkomgeving ze niet kan lezen. */
export async function lees(adapter: Adapter): Promise<Documenteigenschappen | null> {
  if (!kanLezen(adapter)) return null;
  try {
    return await adapter.leesEigenschappen!();
  } catch {
    return null;
  }
}

/**
 * De bevinding over de titel in de documenteigenschappen (WCAG 2.4.2): een
 * schermlezer leest die voor bij het openen, en een PDF toont hem in plaats
 * van de bestandsnaam. Een regel met het opmaakprofiel Titel is niet nodig,
 * maar als er precies één is, is dat het voorstel. Staan er meer, dan eerst
 * opschonen (zie de bevinding over meer dan één titel).
 */
export function documenttitelBevinding(inhoud: Inhoud, eigenschappen: Documenteigenschappen | null, schrijven: boolean): Bevinding | null {
  if (!eigenschappen || eigenschappen.standaard.titel?.trim()) return null;
  const regels = titelRegels(inhoud);
  const basis = { id: "tg-documenttitel", module: "toegankelijkheid" as const, ernst: "fout" as const, regel: "WCAG 2.2 2.4.2", bron: "bestand" as const };
  if (regels.length > 1) {
    return {
      ...basis,
      melding: "Het document heeft geen titel in de documenteigenschappen. Er staan meer regels met het opmaakprofiel Titel; ruim die eerst op (zie hieronder), dan kan de assistent de titel invullen.",
    };
  }
  if (!schrijven) {
    return { ...basis, melding: "Het document heeft geen titel in de documenteigenschappen. Vul die in via de eigenschappen van het bestand." };
  }
  if (regels.length === 1) {
    return {
      ...basis,
      melding: `Het document heeft geen titel in de documenteigenschappen. Een schermlezer leest die voor bij het openen, en een PDF toont hem in plaats van de bestandsnaam.`,
      voorstel: { beschrijving: `Neem de regel met het opmaakprofiel Titel over: "${regels[0]}".`, eigenschap: { naam: "titel", waarde: regels[0]!.slice(0, 250) } },
    };
  }
  return {
    ...basis,
    melding: "Het document heeft geen titel in de documenteigenschappen en geen regel met het opmaakprofiel Titel. Een schermlezer leest de titel voor bij het openen, en een PDF toont hem in plaats van de bestandsnaam.",
    voorstel: { beschrijving: "Geef het document een titel.", vraag: { label: "Titel van het document", veld: "eigenschap:titel" }, eigenschap: { naam: "titel" } },
  };
}

/** Is dit de bevinding uit de controle van het bestand over de ontbrekende titel? Die vervangt de eigen bevinding. */
export const isTitelUitBestand = (b: Bevinding) => b.bron === "bestand" && b.regel.includes("2.4.2") && /titel|title/i.test(b.melding) && b.id !== "tg-documenttitel";

/** Een eigenschap schrijven als herstel van een bevinding. */
export async function schrijfVoorBevinding(adapter: Adapter, b: Bevinding, antwoord?: string): Promise<void> {
  const e = b.voorstel?.eigenschap;
  const waarde = (e?.waarde ?? antwoord ?? "").trim();
  if (!e || !waarde) throw new Error("Vul eerst een waarde in.");
  if (!kanSchrijven(adapter)) throw new Error("Deze werkomgeving kan de documenteigenschappen niet schrijven.");
  await adapter.schrijfStandaardeigenschap!(e.naam, waarde);
}

/** Welke standaardeigenschap bij welk veld van het metadatamodel hoort (via de rol). */
export function standaardVelden(type: Objecttype): Partial<Record<Standaardeigenschap, string>> {
  const uit: Partial<Record<Standaardeigenschap, string>> = {};
  for (const [rol, sleutel] of Object.entries(rollenVan(type.schema)) as [Rol, string][]) {
    const e = EIGENSCHAP_VAN_ROL[rol];
    if (e && sleutel) uit[e] = sleutel;
  }
  return uit;
}

const alsTekst = (w: unknown): string => (w === undefined || w === null ? "" : Array.isArray(w) ? w.join(", ") : String(w));

/**
 * De metadata als documenteigenschappen: velden met een rol als
 * standaardeigenschap (titel, omschrijving, trefwoorden, auteur, taal,
 * status, categorie), de overige ingevulde velden als eigen eigenschap
 * onder hun label.
 */
// Taalcodes: de documenteigenschap gebruikt twee letters (ISO 639-1, zoals
// "nl"); RGBZ en de ZGW-API's drie (ISO 639-2, zoals "dut").
const DRIE_NAAR_TWEE: Record<string, string> = { dut: "nl", nld: "nl", eng: "en", fry: "fy", ger: "de", deu: "de", fre: "fr", fra: "fr", spa: "es", ita: "it", pap: "pa", tur: "tr", ara: "ar", pol: "pl", ukr: "uk" };

/** Een taalcode uit de metadata als twee letters voor de documenteigenschap; anders niets. */
export function taalVoorBestand(code: string): string | undefined {
  const c = code.trim().toLowerCase();
  if (/^[a-z]{2}([-_][a-z]{2})?$/.test(c)) return c.slice(0, 2);
  return DRIE_NAAR_TWEE[c];
}

/** Een taal uit de documenteigenschap ("nl-NL") in de vorm die het veld kent ("nl" of "dut"). */
export function taalUitBestand(code: string, opties?: string[]): string | undefined {
  const twee = code.trim().toLowerCase().split(/[-_]/)[0];
  if (!twee) return undefined;
  if (!opties || opties.includes(twee)) return twee;
  return opties.find((o) => DRIE_NAAR_TWEE[o] === twee);
}

export function uitMetadata(type: Objecttype, metadata: Record<string, unknown>): { standaard: Partial<Record<Standaardeigenschap, string>>; eigen: Record<string, string> } {
  const standaard: Partial<Record<Standaardeigenschap, string>> = {};
  const gebruikt = new Set<string>();
  for (const [e, sleutel] of Object.entries(standaardVelden(type)) as [Standaardeigenschap, string][]) {
    const w = alsTekst(metadata[sleutel]).trim();
    const waarde = e === "taal" ? taalVoorBestand(w) : w;
    if (waarde) standaard[e] = waarde;
    gebruikt.add(sleutel);
  }
  const eigen: Record<string, string> = {};
  for (const v of velden(type)) {
    if (gebruikt.has(v.naam)) continue;
    const w = alsTekst(metadata[v.naam]).trim();
    if (w) eigen[v.label] = w;
  }
  return { standaard, eigen };
}

/**
 * Na het vastleggen: de metadata in de documenteigenschappen. Alleen met het
 * objecttype waarmee het stuk is vastgelegd; wat de werkomgeving niet kent,
 * slaat de adapter over. Fouten houden het vastleggen niet tegen.
 */
export async function schrijfMetadata(adapter: Adapter, object: ObjectMetStaat, type?: Objecttype): Promise<void> {
  if (!type || type.versie !== object.objecttype.versie || object.aard === "persoonlijk") return;
  const { standaard, eigen } = uitMetadata(type, (object.metadata ?? {}) as Record<string, unknown>);
  try {
    if (kanSchrijven(adapter)) for (const [n, w] of Object.entries(standaard) as [Standaardeigenschap, string][]) await adapter.schrijfStandaardeigenschap!(n, w);
    if (kanEigenSchrijven(adapter)) for (const [n, w] of Object.entries(eigen)) await adapter.schrijfDocumenteigenschap!(n, w);
  } catch {
    /* De eigenschappen zijn een afdruk; het platform heeft de metadata. */
  }
}

const opWoordgrens = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Anonimiseren van de eigenschappen, bij het bevestigen van het
 * anonimiseren: elke afgeschermde waarde wordt ook in de eigenschappen haar
 * plaatshouder, en de auteur wordt de organisatie (een naam van een
 * medewerker is bij openbaarmaking een persoonsgegeven).
 */
export async function anonimiseer(adapter: Adapter, paren: { van: string; naar: string }[], organisatie?: string): Promise<number> {
  const e = await lees(adapter);
  if (!e) return 0;
  const vervang = (w: string) => paren.reduce((t, p) => (p.van ? t.replace(new RegExp(`(?<![\\p{L}\\p{N}])${opWoordgrens(p.van)}(?![\\p{L}\\p{N}])`, "gu"), p.naar) : t), w);
  let aantal = 0;
  if (kanSchrijven(adapter)) {
    for (const [n, w] of Object.entries(e.standaard) as [Standaardeigenschap, string][]) {
      const nieuw = n === "auteur" && organisatie && w ? organisatie : vervang(w ?? "");
      if (w && nieuw !== w) {
        await adapter.schrijfStandaardeigenschap!(n, nieuw);
        aantal++;
      }
    }
  }
  if (kanEigenSchrijven(adapter)) {
    for (const [n, w] of Object.entries(e.eigen)) {
      const nieuw = vervang(w);
      if (nieuw !== w) {
        await adapter.schrijfDocumenteigenschap!(n, nieuw);
        aantal++;
      }
    }
  }
  return aantal;
}

/** "haarlem" → "Gemeente Haarlem", als de organisatie geen eigen naam meegeeft. */
export const organisatieNaam = (gemeente: string) => gemeenteNaamUitId(gemeente);
