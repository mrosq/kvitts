# 004c – Rum: saldo-vy för N + polering

**Status:** levererad 2026-05-16
**Skapad:** 2026-04-24
**Del av:** 004 (multi-user-rum via delad länk), tredje och sista steget.
**Beror på:** 004b (utgifter + polling)

## Varför

Efter 004b fungerar rum med utgifter, men saldo-visningen och kanterna
runt rum-läget saknar polering. 004c färdigställer N-personers saldo-vy
och ser till att rum-upplevelsen känns klar (felhantering, dolda
irrelevanta kontroller, edge cases).

## Vad

### Saldo-vy i rum

Befintlig `raknaParSaldon(utgifter, migId, personer)` (logic.js) används
redan av `visaSaldoDetalj()` som renderar par-saldo-listan. Saldo-kortet
visar ditt nettosaldo; klick öppnar detalj-modalen med alla relationer.

### Reglera i rum

`reglera()` sätter `s.reglerad = true` lokalt — påverkar inte andra
deltagares vy. Varje person reglerar lokalt för sig.

### Dölj irrelevanta kontroller i rum-läge

Fil-raden (ladda/spara) döljs i menyn när aktiv session är av `kind: "rum"`.
Implementerat i `visaMeny()` via `id="meny-fil-rad"`.

### Felhantering

- **Offline-banner:** `sattOfflineMode(true/false)` i app.js togglar
  `#offline-banner` (gul) och disablar formulärets inputs.
- Anropas från `refreshUtgifter()` och `refreshDeltagareOchUtgifter()` vid fel.
- **Raderat rum (404):** `visaRumBorttaget()` raderar sessionen lokalt och
  visar `#rum-borttaget-skarm` med knapp tillbaka till start.

### Edge cases

- **Dubbel-join med samma enhet:** `init()` kollar om det redan finns en
  lokal session för rum-ID:t vid sidladdning av `/r/<id>` — går direkt in.
  `bekraftaJoin()` kollar detsamma innan backend-anropet.
- `gaMedIRum()` i supabase.js tar emot `befintligtPersonId` och återanvänder
  en befintlig member-rad om den finns (idempotent).
- **Ogiltigt rum-ID:** `parseRumSokvag()` matchar bara 4–10 alfanumeriska
  tecken; icke-matchande pathname → normalt app-flöde.

## Leveranssammanfattning

Alla punkter ur specen levererade. `docs/features/004-multi-user-rum.md`
kan nu också arkiveras (alla tre 004a/b/c är i done/).
