# Wijzigingen

## 0.16.1 — 2026-11-26

- `anonimiseren.beperkTotNiveau()`: na bevestigen gaan de herkende waarden boven het niveau van de gebruiker uit de sessie, ook voor wie het stuk zelf anonimiseerde.

## 0.16.0 — 2026-11-25

- `anonimiseren.hervat()` herkent ook een document dat al is geanonimiseerd: plaatshouders in de tekst die in het register van het stuk staan, ook zonder voorvertoningen.
- `anonimiseren.onthulBinnenNiveau()`: de originelen van alle gegevens binnen het niveau van de gebruiker in één verzoek (het platform legt het inzien vast); gegevens boven dat niveau blijven zonder waarde.
- `anonimiseren.kanOriginelenInDocument()`, `toonOriginelenInDocument()` en `verbergOriginelen()`.
- oa-contract 0.16.0.

## 0.15.0 — 2026-11-23

- Openbaarheid (Archiefregeling 2026, art. 2.12): velden met `toonAls`; `metadateren.zichtbaar()` en `metadateren.afgeleid()` (bij een grond de langste toegestane duur, de einddatum uit de datum van het stuk plus de duur, en verborgen velden leeg). `bevindingen` en `opgeschoond` houden rekening met voorwaardelijke velden.
- `Verbinding.zetOmgeving()`: de werkomgeving en de browser gaan mee bij elke nieuwe versie (art. 2.8).
- oa-contract 0.15.0.

## 0.14.0 — 2026-11-23

- Documenteigenschap *Organisatie*: de naam van de gemeente van het stuk (de uitgever bij openbaarmaking), na elke nieuwe versie.
- `eigenschappen.organisatieNaam` gebruikt `gemeenteNaamUitId` uit het contract.
- oa-contract 0.14.0.

## 0.13.0 — 2026-11-20

**Documenteigenschappen.** Ontwerp: `oa-uitrol/docs/ontwerp/documenteigenschappen.md`.
- Nieuw onderdeel `eigenschappen`: de titelregels in de inhoud, het lezen van de eigenschappen, de bevinding over de documenttitel (WCAG 2.2, 2.4.2), het schrijven van de metadata in de eigenschappen en het anonimiseren ervan.
- Toegankelijkheid: de documenttitel is een bevinding met herstel. Eén regel Titel → eigenschap Titel; geen regel en geen eigenschap → vraag om de titel; meer regels Titel → eerst opruimen.
- Metadateren: voorstellen uit de eigenschappen (titel, auteur, trefwoorden, omschrijving, taal) en uit de ingelogde medewerker (auteur). Geen titelvoorstel zolang er meer dan één regel Titel is.
- Vastleggen schrijft de metadata in de documenteigenschappen (niet bij een persoonlijk stuk). Taalcodes worden omgezet: "dut" in de metadata is "nl" in het bestand, en omgekeerd.
- Anonimiseren in het document: bij bevestigen ook de documenteigenschappen; de auteur wordt de naam van de organisatie.
- oa-contract 0.13.0.

## 0.12.3 — 2026-11-20

- oa-contract 0.12.0.

## 0.12.2 — 2026-11-19

- `verbinding.classificatieVersie(n)`: een eerdere versie van het classificatiemodel, met de selectielijst.

## 0.12.1 — 2026-11-19

- oa-contract 0.11.0.

## 0.12.0 — 2026-11-19

- `legVast` en `legClassificatieVast` geven `toetsvragenBevestigd` door (oa-contract 0.10.0).

## 0.11.0 — 2026-11-19

- `classificeren.zoek` en `classificeren.suggesties` gebruiken de eigen zoektermen van de gemeente; bij de voorstellen tellen ze het zwaarst.
- `Verbinding.zaakclassificatie(id)`.
- Hangt af van oa-contract 0.9.0.

## 0.10.0 — 2026-11-19

- Module `classificeren`: `boom` zet de klassen die de gemeente gebruikt in de indeling van de selectielijst: procestype, generiek resultaat (12.2), uitwerkingen (12.2.3). Een groep blijft bestaan als het generieke resultaat zelf uit staat maar uitwerkingen aan; dan is `zelf` null. Met het aantal klassen per procestype. `opNummer` sorteert op de getallen (3.10 na 3.9).
- Typen `Klassegroep` en `Klassetak`.

## 0.9.0 — 2026-11-18

- Module `toegankelijkheid`: `herstelAlles` herstelt alle herstelbare bevindingen in één keer. Het document wordt één keer gelezen, alle wijzigingen gaan erin, en de delen worden van achter naar voren vervangen, zodat een vervangen of verwijderd element de plekken ervoor niet verschuift. Een bevinding binnen of rond een andere wacht op een volgende ronde (`uitgesteld`). Zonder segmentvermogen gaat het hele document één keer heen en weer.
- `herstelbaar`: een bevinding met een vervanging, of met een vraag die al beantwoord is. Een lege alternatieve tekst (versiering) alleen per bevinding.

## 0.8.0 — 2026-11-10

- Module `classificeren`: `suggesties` (de assistent stelt drie klassen voor op grond van de woorden in het stuk; omschrijving en procestype tellen zwaarder dan de toelichting), `zoek` (op nummer of woord) en `legVast`.
- `dienVoorstelIn`: bij een vergrendeld stuk de wijziging als voorstel indienen.
- `Verbinding`: `classificatie`, `legClassificatieVast`, `dienVoorstelIn`, `voorstellen`, `voorstelWeergave`, `beoordeel`.

## 0.7.0 — 2026-11-10

- `afdrukVan`: de afdruk in het bestand noemt nu ook de versie en de naam van het metadatamodel.
- `eigenschappenVan` en `schrijfEigenschappen`: bij registreren, een nieuwe versie en metadata vastleggen schrijft de assistent de documenteigenschappen **Identificatie**, **Versie**, **Metadatamodel** ("RGBZ Haarlem, versie 4") en, als het model een status heeft, **Status**. Te zien bij Bestand → Eigenschappen en te gebruiken in een veld, zoals in de koptekst.
- `legVersieVast` en `legMetadataVast` nemen het objecttype (en de adapter) aan om die eigenschappen bij te werken.

## 0.6.0 — 2026-11-09

Bij bevestigen meet de assistent wat de medewerker deed (`meetSessie`) en stuurt die meting mee met `bevestigPii`: wat werd bevestigd, gelaten (met reden) of zelf toegevoegd, met vorm, lengte en signaalwoord, zonder waarden. `laatStaan` neemt een reden aan; een gewijzigde grondslag wordt onthouden (`oorspronkelijk`). Hangt af van oa-contract 0.6.0.

## 0.5.1 — 2026-11-09

De velden van een metadatamodel uit het beheerportaal in de volgorde die de gemeente koos, ook als de database de sleutels van het schema anders bewaart.

## 0.5.0 — 2026-11-09

Metadatamodellen uit het beheerportaal:

- `metadateren.velden`: ook datum en getal; per veld de rol en het element ("RGBZ titel"); bij een model uit het portaal de volgorde die de gemeente koos.
- `suggesties(inhoud, huidig, type?)`: de titel en de taal via de rol, met de standaard van het model (bv. "dut" bij RGBZ).
- `bevindingen`: de regel noemt het element van het gekozen model.
- `opgeschoond(metadata, type?)` en `registreer`/`legMetadataVast(…, type?)`: een getalveld gaat als getal.
- `Verbinding.objecttype(naam, versie?)`.

## 0.4.3 — 2026-11-09

- `anonimiseren.wijzigCategorie(adapter, verbinding, stand, sessie, sleutel, categorie)`: een andere grondslag voor een kaart. Een voorvertoning gaat in het register naar de sleutel van die categorie en krijgt in het document de kleur van het nieuwe niveau (`herkleurPii`, of terugzetten en opnieuw markeren). Een kaart die blijft staan onthoudt de keuze; een bevestigd gegeven kan niet.
- `voegToe(…, { categorie })`: meteen met een andere grondslag.
- `Verbinding.wijzigPiiCategorie(id, plaatshouder, categorie)`.

## 0.4.2 — 2026-11-09

Beoordelen stuurt het bestand mee als de werkomgeving het kan opleveren (liefst als docx, xlsx of pptx), voor de controles die in de html niet te zien zijn. Te groot (meer dan ongeveer 19 MB) of lukt het niet: alleen de html, met een advies.

## 0.4.1 — 2026-11-09

- Of een plaatshouder nog een voorvertoning is, leidt de kern af uit het register: niet elke werkomgeving kan dat in het document bijhouden (rekenbladen, presentaties, Collabora).
- Na terugzetten leest de kern de plekken opnieuw: een werkomgeving die niet één plek kan terugzetten (Collabora), blijft zo kloppen.
- `raadSoort` herkent meer gezondheidswoorden.

## 0.4.0 — 2026-11-09

Anonimiseren in het document: `begin` (het origineel eerst als versie), `vindEnMarkeer` (registreren als voorvertoning en in het document vervangen; opnieuw zoeken laat staan wat de medewerker liet staan), `hervat` (een lopende sessie na heropenen), `voegToe` (selectie of "toch anonimiseren"), `laatStaan` (alle plekken of één), `bevestigInDocument` (nieuwe versie), `zetVersieTerug`, `raadSoort` en `kanInDocument`. Na elke versie schrijft de kern het versienummer als documenteigenschap Versie.

## 0.3.4 — 2026-11-09

Anonimiseren bij de bron. `anonimiseren.bevestig(adapter, verbinding, stand, gekozen)`:

1. registreert de gekozen gegevens versleuteld in het register (dezelfde waarde één keer);
2. laat de werkomgeving ze in het document zelf vervangen door hun plaatshouder (`vervangTekst`);
3. legt het resultaat vast als nieuwe versie.

Geeft de registraties, het aantal vervangingen en hoe vaak een waarde nog in het document staat (bijvoorbeeld over opmaak heen). `kanBijDeBron(adapter)` zegt of de werkomgeving het kan. Nieuw op `Verbinding`: `registreerPii`, `piiRegister`, `onthulPii`, `vernietigPii`.

Het stuk hoeft niet meer gelijk te zijn aan de laatste versie: wat de medewerker ziet, wordt de nieuwe versie.

## 0.3.3 — 2026-11-09

Module `anonimiseren`: `vind` (treffers bij de html van het stuk), `overal` (dezelfde tekst overal als treffer van de medewerker) en `bevestig` (afschermen en vastleggen bij de laatste versie; weigert als het stuk sindsdien is gewijzigd). `vergelijkMetLaatsteVersie` kijkt alleen naar de gewone weergave.

## 0.3.2 — 2026-11-09

- `registreer(..., aard)`: zakelijk (standaard) of persoonlijk; persoonlijk zonder metadata. `maakZakelijk(verbinding, stand)` en `Verbinding.wijzigAard`.
- `vergelijkMetLaatsteVersie(stand, html)`: wijkt het geopende stuk af van de laatste vastgelegde versie (gewijzigd, of een kopie met dezelfde afdruk)? Vergelijkt de html op sha-256.
- `bepaalStand`: verwijst de afdruk naar een stuk dat je niet kunt zien (persoonlijk van een ander, of uit een andere omgeving), dan geldt het als nieuw, met een melding.

## 0.3.1 — 2026-11-08

Voorstel voor de naam: zonder kop 1 de titel van de eerste dia van een presentatie.

## 0.3.0 — 2026-11-08

`teBewaren`: kan de werkomgeving het bestand opleveren, dan wordt dat de versie en gaat de html mee als weergave. Registreren en versie vastleggen gebruiken dit.

## 0.2.0 — 2026-11-07

`Verbinding.zoeken` en `Verbinding.maakOnleesbaar`.

## 0.1.0 — 2026-11-07

Fase 1 van het werkende prototype: contract, minimaal platform, integratielaag met twee ingangen, assistentkern, paneel en een demo-werkomgeving met de modules metadateren en toegankelijkheid.
