# 035 – app.js: stegvis refaktor inför fler grupp- och kontoflöden

**Status:** open
**Skapad:** 2026-07-17
**Relaterat:** 022 (rum-ägare), 025–027 (identitet/konton), 030 (localStorage-separation)

## Varför

`app.js` är idag appens nav: DOM-glue, sessioner, rendering, import/export,
gruppsync, onboarding, reglering, notiser och PWA-install ligger i samma globala
fil. Det har fungerat bra för snabb utveckling, men kommande features kring
ägarskap, identitet och konton kommer röra samma state och samma flöden.

Målet är en **stegvis refaktor utan buildsteg och utan ramverk**. Appen ska
fortfarande vara vanilla JS och kunna laddas som idag.

## Vad

Bryt ut små, testbara och låg-risk-delar först. Undvik en stor rewrite.

Föreslagen ordning:

1. **Session helpers**
   - samla `sessionDataKey`, `laddaSessionsData`, `sparaAktivSessionsData`,
     `skapaSession`, `raderaSession`, `aktivSession`, `aktivArReglerad`
   - gör ägar-/gruppmetadata lättare att lägga till inför 022

2. **Format/render helpers**
   - valutaformat
   - datumformat/rubriker
   - text escaping / DOM-safe rendering helpers

3. **Import/export helpers**
   - passar bra ihop med feature 034
   - rena funktioner för validering och normalisering

4. **Grupp-state helpers**
   - `aktivGruppData`
   - refresh/polling state
   - notisnycklar
   - förbered för `ownerId` i 022a

5. **Reglera helpers**
   - bygg vidare efter analysen i 033
   - separera "vad ska visas" från DOM-rendering där det går

## Avgränsning

Inte i scope:

- React/Vue eller build tooling
- stor designomläggning
- ändrat lagringsformat utan separat migration/spec
- flytta allt på en gång

Det är okej att först skapa fler små `.js`-filer som laddas före `app.js` i
`index.html`, ungefär som `logic.js` och `supabase.js` redan gör.

## Tester

Varje helper som blir ren bör få Node-test i `logic.test.js` eller en ny
testfil om det blir tydligare.

Prioriterade testbara delar:

- sessiondata-normalisering
- importvalidering
- formattering
- reglerad-vy-beslut efter 033
- gruppmetadata/owner-state efter 022a

## Öppna frågor / noteringar

- Ska nya helpers ligga i separata filer (`session.js`, `format.js`,
  `import.js`) eller först samlas i tydliga block i `app.js`?
- Om separata filer: håll global exponering minimal och konsekvent med
  befintlig stil (`window.KvittsSupabase`, rena globals från `logic.js`).

## När levererad

Sammanfatta vilka delar som brutits ut, vilka tester som lades till och vilka
framtida features som blev enklare. Flytta filen till `docs/features/done/`.
