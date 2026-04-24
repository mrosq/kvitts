# 004b – Rum: utgifter och polling-sync

**Status:** open
**Skapad:** 2026-04-24
**Del av:** 004 (multi-user-rum via delad länk), andra steget.
**Beror på:** 004a (rum-fundament)

## Varför

Efter 004a kan deltagare skapa och gå med i rum, men inga utgifter kan
läggas till. 004b gör att alla i rummet kan läsa/skriva utgifter mot
backend, och att ändringar sprids till andra via polling.

## Vad

### CRUD mot Supabase

Utöka `supabase.js` med:

- `hamtaUtgifter(roomId) → utgifter[]`
- `laggTillUtgift(roomId, utgift) → utgift`
- `uppdateraUtgift(id, patch)`
- `raderaUtgift(id)`

Mappning mellan DB-schema och klient-format:
`betalare_id`, `fordelning` (jsonb), `lagd_till_av_id`, `datum`, `skapad`.

### Routing i write-paths

Befintliga funktioner i app.js (`laggTillUtgift`, `redigeraUtgift`,
`raderaUtgift`) greppas för att routa beroende på session-typ:

```
om aktivSession().kind === "rum": skriv till Supabase, refresh lokal kopia
annars: skriv till localStorage (som idag)
```

Enklast via en tunn `persistera()`-abstraktion som tar in action-typ och
delegerar. Lokala sessioner måste vara oförändrade.

### Polling

- `setInterval(hamtaUtgifter, 7000)` när en rum-session är aktiv.
- Pausa när `document.hidden`.
- Direkt-refresh efter att användaren själv skrivit (snabb feedback).
- Avbryt vid session-byte, unload eller byte till lokal session.
- Första hämtningen sker vid in-i-rummet.

### UI-ändringar

- **Header i rum-läge:** Ersätt "Mikael & X" med
  "Spanien 2026 · N personer". Klickbar → visar deltagar-chips
  (se skiss i 004-specen).
- **Split-toggle:** Redan N-generaliserad sedan 006b — bekräfta att den
  fungerar med backend-data utan ändring.
- **Betalare-dropdown:** Redan N-generaliserad (`populeraBetalarDropdowns`)
  — ingen ändring förväntas.

### Tester

Befintliga logic-tester fortsätter gälla (`logic.js` rörs inte). Nya
Supabase-anropen verifieras manuellt — två webbläsarflikar, testa CRUD
och att polling speglar ändringar inom ~10s.

## Öppna frågor / noteringar

- **Polling-frekvens:** Börja med 7s enligt spec; justera vid behov.
  Adaptivt (snabbare vid aktivitet) sparas till senare.
- **Konfliktlösning:** Två personer redigerar samma utgift samtidigt —
  last-write-wins är v1-modellen (ingen optimistic locking). Acceptabelt
  för trafiken.
- **Avgränsning:** Ingen offline-hantering i 004b — om Supabase inte nås
  visas generiskt felmeddelande. Snygg offline-banner är 004c.
- **Avgränsning:** Saldo-vyn i rum-läge kan tillfälligt visa det lokala
  2-personers-formatet eller vara platshållare — rätt per-relation-lista
  levereras i 004c.

## När levererad

Lägg till en kort sammanfattning och flytta filen till `docs/features/done/`.
