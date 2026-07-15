# 023 – Intern notifiering

**Status:** open
**Skapad:** 2026-07-07
**Beror på:** 004b (rum-utgifter + polling), 004c (saldo-polering)
**Relaterat:** 022 (rum-ägare)

## Varför

I rum-läge lägger flera personer in utgifter på sina egna enheter. Idag får
man ingen aning om vad de andra gjort — utgifter dyker bara tyst upp i
historiken vid nästa polling. Man saknar en känsla av "vad har hänt sedan
jag var här sist?".

Vi vill ge en lätt intern notifiering: "Pelle la till Taxi, 200 kr", "Anna
gick med", "Erik ändrade Lunch". Det ska kännas levande utan att kräva en
tung infrastruktur.

## Vad

### Grundidé — inget nytt backend, diff mot snapshot

Appen pollar redan rummet var 15:e sekund (`refreshDeltagareOchUtgifter` i
app.js) och hämtar hela utgifts- och deltagar-listan. Vi bygger notifiering
ovanpå detta genom att **jämföra ny backend-state mot en sparad snapshot** —
ingen event-tabell, ingen push, ingen realtime, ingen schema-ändring.

- **Snapshot** lagras per rum i localStorage:
  `kvitts_room_<room_id>_notis_snapshot`. Innehåller en lättviktig
  representation: karta `utgifts-id -> {beskrivning, belopp, uppdaterad}`
  och en mängd av kända `medlems-id`.
- **Notis-lista** lagras per rum:
  `kvitts_room_<room_id>_notiser` — array av
  `{id, typ, text, tid, last}` (last = utläst-flagga).

### Diff-logik (ren funktion i logic.js)

Ny funktion `diffaNotiser(snapshot, nuUtgifter, nuDeltagare, migId) ->
{nyaNotiser[], nySnapshot}` (+ tester). Genererar notiser för:

1. **Ny utgift** — id finns i `nuUtgifter` men inte i snapshot.
   Text: "<namn> la till <beskrivning>, <belopp> kr".
2. **Ny deltagare** — medlems-id finns i `nuDeltagare` men inte i snapshot.
   Text: "<namn> gick med".
3. **Ändrad utgift** — id finns i båda men beskrivning/belopp skiljer.
   Text: "<namn> ändrade <beskrivning>".
4. **Raderad utgift** — id finns i snapshot men inte i `nuUtgifter`.
   Text: "<beskrivning> togs bort".

Egna handlingar filtreras bort: en notis skapas inte om
`lagd_till_av_id === migId` (för ny/ändrad utgift) resp. om medlemmen är
jag själv. Diffen är ren och testbar; app.js sköter localStorage-I/O och UI.

### Retroaktivt (fångar även det som hänt medan appen var stängd)

Eftersom snapshot persisteras i localStorage jämförs den vid **varje** poll
*och* vid inträde i rummet. Det som hänt medan appen var stängd fångas alltså
vid nästa öppning.

**Första inträdet i ett rum** (ingen snapshot finns än) seedar snapshot tyst
från nuvarande state — inga notiser genereras för allt som redan finns.
Annars skulle en ny deltagare få en flod av notiser för hela historiken.

### UI

- **Klock-ikon** i den permanenta headern (`brand-topbar`), till vänster om
  kugghjulet. Visas bara i rum-läge (`kind === "rum"`), på samma sätt som
  `topbar-meny` togglas. Oläst-badge (liten prick/räknare) när det finns
  olästa notiser.
- **Klick öppnar ett notis-flöde** (bottom-sheet-modal, samma mönster som
  övriga modaler): lista nyast först, relativ tid ("2 min sedan"). Att öppna
  flödet markerar alla som lästa (badge nollas).
- **Tom-läge:** "Inga notiser än."
- Notis-listan kan trimmas till t.ex. senaste 50 för att inte växa obegränsat.

### Tester

- `diffaNotiser` — alla fyra typerna, egna-handlingar-filtret, tom snapshot
  (seed-fallet ska ge noll notiser men full snapshot), och att `nySnapshot`
  speglar `nuUtgifter`/`nuDeltagare`.
- Relativ-tid-formattering om den bryts ut som egen ren funktion.

## Öppna frågor / noteringar

- **Notis-persistens vs. snapshot** — två nycklar (snapshot + notiser) eller
  en kombinerad. Landa vid implementation; separat är enklast att resonera om.
- **Ändrad-utgift-granularitet** — v1 säger bara "ändrade X", inte vad som
  ändrades (belopp/beskrivning/fördelning). Räcker för känslan.
- **Reglering (017)** genererar INTE notis i v1 (medvetet bortval enligt
  diskussion). Kan läggas till senare som femte typ.
- **Ingen ljud/vibration/OS-push** i v1 — enbart in-app-badge + flöde.
- **Avgränsning:** ingen "markera enskild notis som läst", ingen filtrering
  per typ. Öppna flödet = allt läst.
- **Beroende på pollingens korrekthet** — om `refreshDeltagareOchUtgifter`
  är offline hoppas diffen över den cykeln; nästa lyckade poll fångar upp.

## När levererad

Levererad 2026-07-15. Implementerad via polling-diff mot localStorage-snapshot,
inga schema-ändringar. `diffaNotiser()` och `relativTid()` i logic.js (rena
funktioner med 12 tester). Notiser genereras för nya/ändrade/raderade utgifter
och nya deltagare; egna handlingar filtreras. SVG-klockikon i topbar (dold
utanför grupp-läge) med oläst-badge i accentfärg. Modal med lista nyast först,
relativ tid, max 20 notiser. Öppna modal = allt markerat som läst.
