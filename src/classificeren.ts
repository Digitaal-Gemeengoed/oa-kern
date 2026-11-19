import type { Afwijking, Procestype, SelectielijstResultaat } from "@digitaalgemeengoed/oa-contract";
import type { ObjectMetStaat, Verbinding } from "./verbinding.js";
import type { Stand } from "./vastleggen.js";

/**
 * De assistent Classificeren. Stelt een klasse uit de selectielijst voor op
 * grond van de woorden in het stuk; de medewerker kiest. Dit is bewust
 * eenvoudig (gedeelde, zeldzame woorden tellen zwaarder); een taalmodel kan
 * dit later beter, met dezelfde vorm van voorstel.
 */

/** Een klasse zoals de gemeente haar gebruikt: met haar afwijking en eigen zoektermen. */
export type Resultaat = SelectielijstResultaat & { afwijking?: Afwijking; zoektermen?: string[] };

export interface Voorstel {
  resultaat: Resultaat;
  score: number;
  /** De woorden waarop het voorstel steunt. */
  woorden: string[];
}

const STOP = new Set(
  "aan als bij dat de deze die dit door een en het hij hun ik in is je kan kunnen maar met na naar niet nog of om onder ook op over te tot uit van voor wat we wel worden wordt zich zijn zij zo ze over geen alle andere meer ons onze uw hun bijvoorbeeld zoals waarin waarbij welke wanneer gemeente gemeentelijke tegen heeft hebben wij ontvangen geldt gaat".split(" "),
);

/** Woorden van 4 tekens of meer, klein, zonder meervoud of -ing. */
export function woordenVan(tekst: string): string[] {
  return (tekst.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").match(/[a-z]{4,}/g) ?? [])
    .filter((w) => !STOP.has(w))
    .map((w) => (w.length > 6 ? w.replace(/(ingen|ing|en|s)$/, "") : w));
}

function beschrijving(r: Resultaat, pt?: Procestype): string {
  return [r.naam, r.omschrijving, r.toelichting, pt?.naam, pt?.procesobject, ...(r.zoektermen ?? [])].filter(Boolean).join(" ");
}

/**
 * De woorden van een klasse met hun gewicht: de omschrijving zegt het meest,
 * dan het procestype en de naam; de toelichting (voorbeelden) het minst.
 */
function gewogen(r: Resultaat, pt?: Procestype): Map<string, number> {
  const uit = new Map<string, number>();
  const voeg = (t: string | undefined, g: number) => {
    for (const w of woordenVan(t ?? "")) uit.set(w, Math.max(uit.get(w) ?? 0, g));
  };
  voeg(r.toelichting, 0.5);
  voeg(pt?.procesobject, 0.8);
  voeg(r.naam, 1);
  voeg(pt?.naam, 1.2);
  voeg(r.omschrijving, 2);
  // De woorden van de gemeente zelf ("collegevoorstel") zeggen het meest.
  voeg(r.zoektermen?.join(" "), 2.5);
  return uit;
}

/** De beste klassen voor deze tekst; de titel telt drie keer. */
export function suggesties(tekst: string, titel: string, resultaten: Resultaat[], procestypen: Procestype[], aantal = 3): Voorstel[] {
  const pt = new Map(procestypen.map((p) => [p.nummer, p]));
  const doc = new Map<string, number>();
  for (const w of woordenVan(tekst)) doc.set(w, (doc.get(w) ?? 0) + 1);
  for (const w of woordenVan(titel)) doc.set(w, (doc.get(w) ?? 0) + 3);
  const zakken = resultaten.map((r) => gewogen(r, pt.get(r.procestype)));
  // Zeldzame woorden in de lijst zeggen meer dan veelvoorkomende.
  const df = new Map<string, number>();
  for (const z of zakken) for (const w of z.keys()) df.set(w, (df.get(w) ?? 0) + 1);
  const n = resultaten.length;
  return resultaten
    .map((r, i) => {
      let score = 0;
      const woorden: [string, number][] = [];
      for (const [w, veld] of zakken[i]!) {
        const tf = doc.get(w);
        if (!tf) continue;
        const gewicht = veld * Math.log(1 + n / (df.get(w) ?? 1)) * Math.min(3, Math.log2(1 + tf));
        score += gewicht;
        woorden.push([w, gewicht]);
      }
      // Een specifiek resultaat is preciezer dan het generieke erboven.
      if (r.generiek) score *= 1.1;
      return { resultaat: r, score: Math.round(score * 100) / 100, woorden: woorden.sort((a, b) => b[1] - a[1]).slice(0, 4).map(([w]) => w) };
    })
    .filter((v) => v.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, aantal);
}

/**
 * De selectielijst als boom, voor kiezen in stappen: procestype, dan het
 * generieke resultaat (12.2), dan eventueel een specifieke uitwerking
 * (12.2.3). Alleen wat de gemeente gebruikt. Een groep kan bestaan zonder
 * dat het generieke resultaat zelf te kiezen is (uitgezet, met uitwerkingen
 * die aan staan); dan is `zelf` null.
 */
export interface Groep {
  id: string;
  naam: string;
  omschrijving: string;
  zelf: Resultaat | null;
  uitwerkingen: Resultaat[];
}
export interface Tak {
  procestype: Procestype;
  groepen: Groep[];
  /** Het aantal te kiezen klassen in dit procestype. */
  aantal: number;
}

/** "3.10" na "3.9": op de getallen, niet op de tekst. */
export function opNummer(a: string, b: string): number {
  const x = a.split(".").map(Number);
  const y = b.split(".").map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? -1) - (y[i] ?? -1);
    if (d) return d;
  }
  return 0;
}

export function boom(resultaten: Resultaat[], procestypen: Procestype[]): Tak[] {
  const groepen = new Map<string, Groep>();
  const groep = (id: string): Groep => {
    let g = groepen.get(id);
    if (!g) groepen.set(id, (g = { id, naam: "", omschrijving: "", zelf: null, uitwerkingen: [] }));
    return g;
  };
  for (const r of resultaten) {
    if (r.generiek) groep(r.generiek).uitwerkingen.push(r);
    else groep(r.id).zelf = r;
  }
  for (const g of groepen.values()) {
    g.naam = g.zelf?.naam ?? g.uitwerkingen[0]?.naam ?? g.id;
    g.omschrijving = g.zelf?.omschrijving ?? "";
    g.uitwerkingen.sort((a, b) => opNummer(a.id, b.id));
  }
  const perType = new Map<number, Groep[]>();
  for (const g of groepen.values()) {
    const nr = (g.zelf ?? g.uitwerkingen[0]!).procestype;
    perType.set(nr, [...(perType.get(nr) ?? []), g]);
  }
  return [...procestypen]
    .sort((a, b) => a.nummer - b.nummer)
    .filter((p) => perType.has(p.nummer))
    .map((p) => {
      const gs = perType.get(p.nummer)!.sort((a, b) => opNummer(a.id, b.id));
      return { procestype: p, groepen: gs, aantal: gs.reduce((n, g) => n + (g.zelf ? 1 : 0) + g.uitwerkingen.length, 0) };
    });
}

/** Zoeken in de lijst: op nummer ("12.2") of op woorden. */
export function zoek(resultaten: Resultaat[], procestypen: Procestype[], vraag: string, max = 40): Resultaat[] {
  const q = vraag.trim().toLowerCase();
  if (!q) return [];
  if (/^\d+(\.\d+){0,2}$/.test(q)) return resultaten.filter((r) => r.id === q || r.id.startsWith(`${q}.`)).slice(0, max);
  const pt = new Map(procestypen.map((p) => [p.nummer, p]));
  const delen = q.split(/\s+/);
  return resultaten.filter((r) => {
    const t = beschrijving(r, pt.get(r.procestype)).toLowerCase();
    return delen.every((d) => t.includes(d));
  }).slice(0, max);
}

/** De classificatie vastleggen tegen de stand die de medewerker zag. */
export async function legVast(
  verbinding: Verbinding,
  stand: Stand,
  keuze: { resultaat: string; attributen?: Record<string, string | boolean>; einddatumProcesobject?: string; toetsvragenBevestigd?: boolean },
): Promise<Stand> {
  if (!stand.object) throw new Error("Het stuk is nog niet geregistreerd.");
  const object: ObjectMetStaat = await verbinding.legClassificatieVast(stand.object.identificatie, keuze, stand.object.volgnummer);
  return { ...stand, object };
}
