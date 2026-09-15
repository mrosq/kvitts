# 022b – Rum-ägare: administrera grupp

**Status:** open
**Skapad:** 2026-07-17
**Del av:** [022 – Rum-ägare](022-rum-agare.md)
**Beror på:** 022a (ägargrund och återanslutningslänkar)

## Varför

När ägarskap finns kan ägaren få enkla administrativa verktyg för själva
gruppen: byta namn och ta bort gruppen. Det här ligger separat från 022a för
att ägar-state och återanslutningslänkar ska kunna landa först.

## Vad

Ägar-UI:t byggs vidare i deltagarmodalen eller flyttas till en tydligt avskild
ägardel i inställningsmenyn. Deltagarmodalen är fortfarande närmast eftersom
den redan visar gruppens deltagare och länkar.

### Byta namn på gruppen

`supabase.js`:

- lägg till `bytGruppNamn(gruppId, nyttNamn)`
- gör `update rooms set namn = nyttNamn where id = gruppId`
- returnera gärna uppdaterad rad eller normaliserat namn

`app.js`:

- input + spara-knapp visas bara för ägaren
- tomt namn ska inte kunna sparas
- efter lyckad save:
  - uppdatera `sessions`-namnet
  - uppdatera sessiondata vid behov
  - kör `sparaSessionsMeta()`
  - uppdatera header/subtitle
  - uppdatera deltagarmodalens rubrik

### Ta bort gruppen

`supabase.js`:

- lägg till `raderaGrupp(gruppId)`
- `delete from rooms where id = gruppId`
- databasen förväntas cascade-radera `members`, `expenses` och relaterad gruppdata

`app.js`:

- destruktiv bekräftelse, inte bara direkt knapp
- visas bara för ägaren
- efter lyckad radering:
  - rensa lokal aktiv gruppsession
  - rensa `kvitts_grupp_<id>_member_id`
  - stoppa polling
  - stäng relevanta modaler
  - gå tillbaka till start/meny med befintligt borttagen-grupp-liknande flöde

Kontrollera om nuvarande `visaGruppBorttaget()` kan återanvändas rakt av eller
om den behöver en variant för “ägaren tog själv bort gruppen” med vänligare text.

## Avgränsning

Ingen hård server-side enforcement i 022b. Ägar-UI:t är klientstyrt, precis som
022a. RLS-enforcement kan komma senare om hela åtkomstmodellen skärps.

Ingår inte:

- ägarbyte/överlåtelse
- ägar-only-behörighet för utgifter
- radera enskilda deltagare
- återställa borttagen grupp

## Tester och verifiering

Automatiskt:

- `npm test`

Manuellt:

- ägare kan byta gruppnamn och ser ny titel direkt
- annan deltagare ser inte namnbytes-UI:t
- annan deltagares vy får nytt namn efter refresh/polling om det stöds i implementationen
- ägare kan ta bort gruppen efter bekräftelse
- efter radering hamnar ägaren inte kvar i trasig aktiv session
- annan deltagares polling/join-länk hanterar borttagen grupp rimligt

## När levererad

Sammanfatta vad som faktiskt byggdes och flytta filen till
`docs/features/done/`.
