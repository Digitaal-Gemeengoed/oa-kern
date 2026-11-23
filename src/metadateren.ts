import { beperkingsgrond, BEPERKT_OPENBAAR, einddatumBeperking, METADATAMODELLEN, ontbrekendeVelden, rollenVan, type Bevinding, type Documenteigenschappen, type Inhoud, type ModelId, type Objecttype, type Rol, type WieBenIk } from "@digitaalgemeengoed/oa-contract";
import { taalUitBestand, titelRegels } from "./eigenschappen.js";

/** Een invoerveld, afgeleid uit het schema van het objecttype. */
export interface Veld {
  naam: string;
  label: string;
  beschrijving?: string;
  soort: "tekst" | "lange-tekst" | "keuze" | "datum" | "getal";
  verplicht: boolean;
  /** Wat het veld betekent (titel, taal …), als het schema dat zegt. */
  rol?: Rol;
  /** Hoe het gekozen metadatamodel het element noemt, zoals "MDTO naam". */
  element?: string;
  opties?: string[];
  maxLengte?: number;
  standaard?: string;
  /** Alleen tonen als dat veld deze waarde heeft (zoals de grond bij "beperkt openbaar"). */
  toonAls?: { veld: string; waarde: string };
}

interface Eigenschap {
  type?: string;
  "x-oa-type"?: string;
  "x-oa-rol"?: Rol;
  [model: `x-${string}`]: unknown;
  enum?: string[];
  title?: string;
  description?: string;
  maxLength?: number;
  default?: string;
  "x-oa-toon-als"?: { veld: string; waarde: string };
}

/** De velden van een objecttype, verplichte eerst, in de volgorde van het schema. */
export function velden(type: Objecttype): Veld[] {
  const s = type.schema as { properties?: Record<string, Eigenschap>; required?: string[]; "x-oa-model"?: ModelId; "x-oa-verplicht-als"?: { velden: string[] }[] };
  // Ook wat alleen verplicht is als het getoond wordt (x-oa-verplicht-als).
  const verplicht = new Set([...(s.required ?? []), ...(s["x-oa-verplicht-als"] ?? []).flatMap((r) => r.velden)]);
  const model = s["x-oa-model"] ?? "mdto";
  const rollen = rollenVan(type.schema);
  const lijst = Object.entries(s.properties ?? {}).map(([naam, e]): Veld => {
    const element = e[`x-${model}`];
    return {
      naam,
      label: e.title ?? naam,
      beschrijving: e.description,
      soort: e.enum
        ? "keuze"
        : e["x-oa-type"] === "datum"
          ? "datum"
          : e.type === "number" || e.type === "integer"
            ? "getal"
            : e["x-oa-type"] === "lange-tekst" || (e.maxLength ?? 0) > 400
              ? "lange-tekst"
              : "tekst",
      verplicht: verplicht.has(naam),
      rol: (Object.entries(rollen) as [Rol, string][]).find(([, k]) => k === naam)?.[0],
      element: typeof element === "string" ? `${METADATAMODELLEN[model]?.naam ?? model.toUpperCase()} ${element}` : undefined,
      opties: e.enum,
      maxLengte: e.maxLength,
      standaard: e.default,
      ...(e["x-oa-toon-als"] ? { toonAls: e["x-oa-toon-als"] } : {}),
    };
  });
  // Een gemeente die zelf de volgorde koos (beheerportaal): die volgorde. De
  // database bewaart de sleutels van het schema in een eigen volgorde; de
  // keuze zelf (x-oa-config) heeft de goede. Anders verplichte eerst.
  if (s["x-oa-model"]) {
    const config = (type.schema as { "x-oa-config"?: { velden?: { sleutel: string }[] } })["x-oa-config"];
    const plaats = new Map((config?.velden ?? []).map((v, i) => [v.sleutel, i] as const));
    return [...lijst].sort((a, b) => (plaats.get(a.naam) ?? 1e9) - (plaats.get(b.naam) ?? 1e9));
  }
  return [...lijst.filter((v) => v.verplicht), ...lijst.filter((v) => !v.verplicht)];
}

/**
 * Voorstellen uit de inhoud zelf. De medewerker beslist; een voorstel is
 * nooit vastgelegd zonder dat hij het ziet.
 */
export function suggesties(
  inhoud: Inhoud,
  huidig: Record<string, unknown>,
  type?: Objecttype,
  extra: { eigenschappen?: Documenteigenschappen | null; wie?: Pick<WieBenIk, "naam"> | null } = {},
): Record<string, string> {
  const s: Record<string, string> = {};
  const rollen: Partial<Record<Rol, string>> = type ? rollenVan(type.schema) : { titel: "naam", taal: "taal" };
  const titel = rollen.titel;
  const taal = rollen.taal;
  const eig = extra.eigenschappen?.standaard ?? {};
  if (titel && !huidig[titel]) {
    // Eén regel met het opmaakprofiel Titel; staan er meer, dan eerst opschonen
    // (Toegankelijkheid). Anders de titel uit de eigenschappen, dan de eerste
    // kop 1, en in een presentatie de titel van de eerste dia.
    const regels = titelRegels(inhoud);
    if (regels.length === 1) s[titel] = regels[0]!.slice(0, 200);
    else if (regels.length === 0) {
      const m = inhoud.formaat === "html" ? (inhoud.data.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) ?? inhoud.data.match(/^\s*<section data-oa="dia"><h2[^>]*>([\s\S]*?)<\/h2>/i)) : null;
      const t = eig.titel?.trim() || m?.[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (t && t.length >= 3) s[titel] = t.slice(0, 200);
    }
  }
  // Auteur: wie is ingelogd (de naam uit het identiteitsbeheer), anders de eigenschap.
  if (rollen.auteur && !huidig[rollen.auteur]) {
    const a = extra.wie?.naam?.trim() || eig.auteur?.trim();
    if (a) s[rollen.auteur] = a;
  }
  if (rollen.trefwoorden && !huidig[rollen.trefwoorden] && eig.trefwoorden?.trim()) s[rollen.trefwoorden] = eig.trefwoorden.trim();
  if (rollen.omschrijving && !huidig[rollen.omschrijving] && (eig.omschrijving || eig.onderwerp)?.trim()) s[rollen.omschrijving] = (eig.omschrijving || eig.onderwerp)!.trim();
  if (taal && !huidig[taal]) {
    // De standaard van het schema (bv. "dut" bij RGBZ), anders Nederlands.
    const v = type ? velden(type).find((x) => x.naam === taal) : undefined;
    // De taal uit de eigenschappen (bv. "nl-NL" → "nl"), als het model die kent.
    const uitBestand = eig.taal ? taalUitBestand(eig.taal, v?.opties) : undefined;
    if (uitBestand) s[taal] = uitBestand;
    else s[taal] = v?.standaard ?? (v?.opties?.includes("nl") || !v?.opties ? "nl" : v.opties[0]!);
  }
  return s;
}

/** Wordt dit veld getoond bij deze metadata? */
export const zichtbaar = (v: Pick<Veld, "toonAls">, metadata: Record<string, unknown>): boolean => !v.toonAls || metadata[v.toonAls.veld] === v.toonAls.waarde;

/**
 * Na een wijziging in het formulier: wat daaruit volgt. Bij een grond voor
 * beperking de langste duur die artikel 7.4 toestaat (als de duur nog leeg
 * is), en de einddatum uit de datum van het stuk (of vandaag) plus de duur.
 * Velden die niet meer getoond worden, worden leeg.
 */
export function afgeleid(type: Objecttype, metadata: Record<string, string>, vandaag = new Date().toISOString().slice(0, 10)): Record<string, string> {
  const m = { ...metadata };
  const v = velden(type);
  for (const x of v) if (!zichtbaar(x, m) && m[x.naam]) delete m[x.naam];
  const r = rollenVan(type.schema);
  const openbaarheid = r.openbaarheid ? m[r.openbaarheid] : undefined;
  if (openbaarheid === BEPERKT_OPENBAAR && r.beperkingstermijn && !m[r.beperkingstermijn]) {
    const g = beperkingsgrond(r.beperkingsgrond ? m[r.beperkingsgrond] : undefined);
    if (g) m[r.beperkingstermijn] = String(g.maxJaren);
  }
  if (openbaarheid === BEPERKT_OPENBAAR && r.beperkingstermijn && r.beperkingEinddatum) {
    const jaren = Number(m[r.beperkingstermijn]);
    const eind = einddatumBeperking((r.datum && m[r.datum]) || vandaag, jaren);
    if (eind) m[r.beperkingEinddatum] = eind;
  }
  return m;
}

/** Ontbrekende verplichte velden als bevindingen, zodat het paneel ze naast de rest toont. */
export function bevindingen(type: Objecttype, metadata: Record<string, unknown>): Bevinding[] {
  const leeg = new Set(ontbrekendeVelden(type.schema, metadata));
  return velden(type)
    .filter((v) => leeg.has(v.naam))
    .map((v) => ({
      id: `md-${v.naam}`,
      module: "metadateren" as const,
      ernst: "fout" as const,
      regel: v.element ?? `MDTO ${v.naam}`,
      melding: `${v.label} is nog niet ingevuld.`,
    }));
}

/** Alleen ingevulde waarden; lege velden gaan niet als lege tekst naar het platform. */
export function opgeschoond(metadata: Record<string, unknown>, type?: Objecttype): Record<string, unknown> {
  const vv = type ? velden(type) : [];
  const getal = new Set(vv.filter((v) => v.soort === "getal").map((v) => v.naam));
  // Een veld dat niet getoond wordt (zoals de grond bij "openbaar"), gaat niet mee.
  const verborgen = new Set(vv.filter((v) => !zichtbaar(v, metadata)).map((v) => v.naam));
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([k, w]) => w !== undefined && w !== null && w !== "" && !verborgen.has(k))
      .map(([k, w]) => [k, getal.has(k) && typeof w === "string" && w.trim() !== "" && !Number.isNaN(Number(w.replace(",", "."))) ? Number(w.replace(",", ".")) : w]),
  );
}
