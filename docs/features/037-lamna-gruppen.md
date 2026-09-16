# 037 – Lämna gruppen (soft leave)

**Status:** open
**Skapad:** 2026-09-16

## Varför

I större grupper (t.ex. 7 personer på en resa) händer det att en person åker
hem tidigare men gruppen fortsätter lägga utgifter för de kvarvarande. Idag är
default-urvalet i split-modalen "alla deltagare", så varje sådan utgift måste
redigeras manuellt för att klicka ur den som redan åkt hem — annars blir
fördelningen fel. Det är lätt att glömma, särskilt när man är van vid att bara
snabbmata in en utgift utan att öppna avancerad redigering.

Personen ska inte tas bort ur gruppen (historik, saldo och tidigare utgifter
ska vara opåverkade) — bara sluta vara ett förvalt/valbart alternativ för
*framtida* utgifter, tills de själva väljer att gå med igen.

## Vad

Lägg till ett fält `lamnad` (boolean, default `false`) på gruppmedlemmar.

- **Migration:** `alter table members add column if not exists lamnad boolean not null default false;` — idempotent, ingen backfill. Befintliga grupper/medlemmar påverkas inte.
- **`deltagareIds()`** i [app.js](app.js) filtreras till `personer.filter(p => !p.lamnad)`. Den här listan är redan grunden för:
  - default-urvalet i split-modalen (`oppnaSplitModal`)
  - de klickbara cirklarna i split-modalen, både vid tillägg (`renderaCirklar`) och redigering — dvs en lämnad person går **inte** att kryssa in manuellt av någon annan, varken vid ny utgift eller vid redigering av en befintlig.
  - betalar-dropdownen (`populeraBetalarDropdowns`) — en lämnad person kan inte väljas som betalare på nya utgifter.
- **Självbetjäning, ingen adminfunktion:** i deltagare-modalen ([app.js](app.js) `oppnaDeltagareModal` m.fl.) visas en knapp bara på den egna raden (matchad mot `migId`):
  - Ej lämnad → "Lämna gruppen", öppnar en bekräftelse-dialog ("Du försvinner från framtida utgifter tills du går med igen") innan `lamnad` sätts till `true`.
  - Lämnad → "Gå med i gruppen igen", sätter `lamnad` till `false` igen, inget bekräftelse-krav.
  - Ingen annan medlem kan ändra en annan persons `lamnad`-status.
- **Historik/saldo:** helt opåverkat. Befintliga utgifter har redan sin egen sparade fördelning (`fordelning`/`delP1`/`delP2`) oberoende av nuvarande `lamnad`-status, så saldo- och historikberäkningar (`raknaUtSaldo` m.fl. i [logic.js](logic.js)) kräver ingen ändring.
- **Sync:** `lamnad` läses/skrivs via samma `members`-rad som redan hämtas i `hamtaDeltagare` (supabase.js) och speglas till `data.personer` i app.js — inget nytt synk-flöde behövs, bara fältet med i select/insert.

## Öppna frågor / noteringar

- Betalare-dropdownen exkluderar lämnade personer som default (konsekvent "allt-eller-inget"). Om det visar sig fel i praktiken (t.ex. någon vill Swisha pengar efter att ha lämnat) kan det ändras separat.
- Ingen skiljelinje mellan "lämnad tillfälligt" och "lämnad permanent" — bara ett boolean-flagga. Om behovet av ett framtida datum (schemalagd utgång) dyker upp är det en separat, senare feature.
- Ingen indikator/badge i övriga vyer (t.ex. historik) om att någon har lämnat — bara avsaknaden i nya utgifters urval. Kan läggas till senare om det känns otydligt i UI.
- Gäller bara gruppläge (flera deltagare via Supabase-rum). Berör inte den ursprungliga person1/person2-modellen.

## När levererad

_Fylls i vid leverans._
