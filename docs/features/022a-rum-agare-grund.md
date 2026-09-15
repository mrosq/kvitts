# 022a – Rum-ägare: grund och återanslutningslänkar

**Status:** open
**Skapad:** 2026-07-17
**Del av:** [022 – Rum-ägare](022-rum-agare.md)
**Beror på:** 004a (grupp-fundament), 018b (member_token / personlig länk)

## Varför

En deltagare som tömt sin localStorage och inte bokmärkt sin personliga
`?me=`-länk kan fastna utanför gruppen. Första ägarleveransen gör skaparen av
gruppen till ägare och ger ägaren möjlighet att kopiera deltagarnas personliga
återanslutningslänkar.

## Vad

### Datamodell

Ny kolumn på `rooms`:

```sql
owner_id uuid references members(id)
```

Levereras som idempotent migration:

- `docs/features/022-migration.sql`
- samma stil som `docs/features/done/018b-migration.sql`
- befintliga grupper får `owner_id = null` och räknas som ägarlösa

### Supabase

`supabase.js`:

- `skapaGrupp(projektnamn, minNamn)` ska:
  1. skapa raden i `rooms`
  2. skapa första medlemmen i `members`
  3. uppdatera `rooms.owner_id = medlem.id`
  4. returnera `{ gruppId, gruppNamn, personId, ownerId }`

`haGrupp(gruppId)` behöver troligen ingen ändring eftersom den redan gör
`.select()` och därmed hämtar `owner_id` när migrationen finns.

`hamtaDeltagare(gruppId)` behöver troligen ingen ändring eftersom den redan
gör `.select()` och därmed hämtar `member_token`.

### Ren logik

Lägg till i `logic.js`:

```js
function arRumAgare(ownerId, personId) {
  return !!ownerId && !!personId && ownerId === personId;
}
```

Exportera funktionen och lägg tester i `logic.test.js`:

- sant när `ownerId === personId`
- falskt när de skiljer sig
- falskt när `ownerId` saknas
- falskt när `personId` saknas

### Klient-state

`app.js` behöver bära ägarinformation i gruppsessionens data.

Rekommenderat:

- spara `ownerId` i sessiondata när gruppen skapas
- spara/uppdatera `ownerId` när gruppen hämtas via `haGrupp`
- låt `aktivGruppData()` returnera `{ gruppId, personId, ownerId }`
- beräkna ägarskap med `arRumAgare(ownerId, personId)` där UI:t renderas

Viktiga flöden:

- skapa grupp
- tyst återanslutning via localStorage
- återanslutning via `?me=`
- join via grupp-länk
- polling/refresh

För äldre grupper med `owner_id = null` visas inget ägar-UI.

### Ägar-UI

Placering: deltagarmodalen (`visaDeltagare`) eftersom den redan handlar om vilka
som är med och redan visar inbjudningslänken.

Lägg en separat sektion, t.ex. **Ägare**, som bara visas när
`arRumAgare(ownerId, personId)` är sant.

Sektionen ska lista varje deltagare:

- namn
- personlig återanslutningslänk om `member_token` finns:
  - `window.location.origin + "/?me=" + member_token`
  - kopiera-knapp per rad
- texten “Ingen personlig länk än” om `member_token` saknas

Ägaren ska inte kunna generera token åt tokenlösa deltagare i 022a.

## Tester och verifiering

Automatiskt:

- `npm test`
- nya tester för `arRumAgare`

Manuellt:

- skapa ny grupp och verifiera att skaparen ser ägarsektionen
- gå med som annan deltagare och verifiera att ägarsektionen inte visas
- kopiera personlig länk för en deltagare och öppna den i ny session/browser
- verifiera att äldre/ägarlös grupp inte visar ägarsektionen

## När levererad

Sammanfatta vad som faktiskt byggdes och flytta filen till
`docs/features/done/`.
