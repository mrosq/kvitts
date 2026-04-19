# 007 – Komplexa fördelningar

**Status:** open
**Skapad:** 2026-04-19

## Varför

När val A utökas till N personer (se 006) blir det fler fall där
default-splitten "jämnt på alla" inte passar:

- **Delmängd:** "Bara 5 av 6 var med på middagen." Resten ska inte belastas.
- **Asymmetriska andelar:** "Anna 20 %, Erik 40 %, Mikael 40 %." Utgiften
  "egna kostnader"-paradigmet täcker bara specialfallet "en klumpsumma som
  är bara min".

006 levererar default + klassisk "egna kostnader" (stackat för N>2). 007
fyller gapet.

## Vad

**Ingen detalj specad än.** Områden att utreda när det blir aktuellt:

- UI-mönster: checkbox-lista "vilka är med på utgiften" + fria belopp-inputs?
  Procent? Snabbval ("alla utom mig", "bara vi två")?
- Hur relaterar det till "egna kostnader"-paradigmet från 2-personers-läget?
  Ersätta, komplettera, eller behålla båda?
- Representation i historiklistan när fördelningen är asymmetrisk (inte
  bara `fordelning`-map, utan kanske också "logiken" bakom som gick in —
  för edit).
- Validering: `Σ andelar = belopp` måste hålla; UI:t bör hjälpa till
  (auto-justera sista raden? varna?).

## Öppna frågor / noteringar

- **Relaterar till 004:** Samma behov i rum-läget. Designa lösningen så att
  den fungerar för både lokalt (006) och i rum (004) utan dubbelbygge.
- **Kan tas innan eller efter 004** — oberoende av backend-delen.
- Skriv ut fullständig spec när det blir aktuellt att bygga.
