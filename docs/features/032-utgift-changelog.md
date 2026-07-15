# 032 – Utgifts-changelog (vem ändrade vad)

**Status:** open
**Skapad:** 2026-07-15
**Beror på:** 023 (intern notifiering)

## Varför

Notis-systemet (023) visar "Lunch ändrades" utan att kunna säga vem som
ändrade, eftersom `lagd_till_av_id` på `expenses` sätts vid skapandet och
aldrig uppdateras vid edit. En separat changelog-tabell löser detta rent.

## Vad

En ny tabell `expense_changes` loggar varje mutation på en utgift:

```sql
create table expense_changes (
  id          uuid primary key default gen_random_uuid(),
  expense_id  uuid not null references expenses(id) on delete cascade,
  room_id     text not null,
  member_id   uuid,          -- null om okänt/borttagen
  typ         text not null, -- 'skapad' | 'andrad' | 'raderad'
  skapad_at   timestamptz not null default now()
);
```

`member_id` är den inloggade personen som utförde åtgärden (hämtas från
app-state, skickas med av klienten).

## Klientflöde

- **Vid `laggTillUtgiftGrupp`:** skapa en `expense_changes`-rad med
  `typ = 'skapad'` och `member_id = lagd_till_av_id`.
- **Vid `uppdateraUtgift`:** skapa en rad med `typ = 'andrad'` och
  `member_id` = aktiv persons id (skickas in som nytt argument).
- **Vid `raderaUtgiftGrupp`:** skapa en rad med `typ = 'raderad'`.

Skrivning sker best-effort (`catch` loggar men kastar inte om changelog
misslyckas) — changelog är diagnostik, inte affärsdata.

## Notis-integration

`diffaNotiser` får ett nytt valfritt argument `senastAndradAv` (map
`expense_id → member_id`) som byggs från en färsk `expense_changes`-fråga.
Om kartan finns används rätt namn i "andrad"-notisen; annars faller funktionen
tillbaka på nuvarande "X ändrades"-text. Bakåtkompatibel.

## Öppna frågor

- **RLS:** changelog bör ha samma öppna policy som `expenses` i v1 (hemligt
  rum-id = tillräcklig säkerhet).
- **Volym:** en rad per edit kan växa. Alternativ: behåll bara senaste N rader
  per expense (trigger eller periodic cleanup). Troligen onödigt i v1.
- **Migration:** `028-migration.sql`-mönstret — ny fil
  `docs/features/032-migration.sql`.

## När levererad

Sammanfatta och flytta till `docs/features/done/`.
