# 009 – Meny för sekundära actions

**Status:** levererad 2026-04-20
**Skapad:** 2026-04-19

## Varför

Huvudvyn börjar bli trång. Flera actions syns alltid fast de används sällan
eller bara i vissa lägen:

- **Ladda fil / Spara fil** — används nästan aldrig (migration mellan enheter,
  säkerhetskopia). Tar plats längst ner på skärmen.
- **Markera som reglerat** — används i praktiken en enda gång, när resan/
  perioden är slut och allt ska nollställas. Fram tills dess bara visuellt brus.
- Framtida actions (t.ex. byta läge, inställningar) kommer behöva någonstans
  att bo utan att svälla huvudvyn.

Vi vill ha en tydlig plats för sekundära actions så huvudvyn kan fokusera på
det primära flödet: se saldo, lägg till utgift, bläddra historik.

## Vad

En meny-knapp i övre högra hörnet på app-vyn (`#app`) som öppnar en lista
med sekundära actions.

**Menyn innehåller i första skedet:**
- Markera som reglerat
- Ladda fil
- Spara fil (bara när det finns utgifter att spara — matchar nuvarande
  `#spara-fil-btn` som redan döljs när listan är tom)

**Ikonval:** kugghjul (⚙). Menyn är inte navigation mellan sidor utan en
samling sekundära actions/inställningar — kugghjul signalerar det tydligare
än både ☰ och ⋮. Placeras bredvid/över `<h1>Kvitts</h1>` i övre högra hörnet.

**Interaktion:**
- Klick på ikon öppnar menyn som en enkel dropdown eller bottom-sheet
  (återanvänd gärna befintlig `.modal`-struktur så stilen blir konsekvent).
- Klick utanför stänger menyn.
- Varje rad är en stor, tappbar knapp (mobil-first).

**Huvudvyn efter flytten:**
- `btn-reglera` tas bort från huvudvyn (flyttas till menyn).
- `btn-grupp` (Ladda/Spara fil) tas bort från botten av `#app`.
- `<input type="file" id="ladda-input">` ligger kvar gömd på toppen av
  `<body>` och triggas från menyraden precis som idag.

## Öppna frågor / noteringar

- **Avgränsning:** denna feature är rent UI-omflyttning. Ingen datamodell,
  ingen logik-förändring.
- **Plats för framtid:** menyn ska vara lätt att utöka. När 001 (multi-session)
  eller 004 (delad rum-länk) byggs kommer de troligen behöva en menypost
  (t.ex. "Byt session", "Kopiera rum-länk").

## Vad som byggdes

Exakt enligt spec. ⚙-knapp uppe till höger i `#app` öppnar en bottom-sheet modal med tre rader: Markera som reglerat, Ladda fil, Spara fil (dold när inga utgifter). `btn-reglera` och `btn-grupp` borttagna från huvudvyn. Klick utanför stänger menyn.
