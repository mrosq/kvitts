# 025 – Unik e-post per rum (dedupe av medlemmar)

**Status:** open
**Skapad:** 2026-07-07
**Omskriven:** 2026-07-07
**Beror på:** 018b (identitets-hash), 024 (skapa-rum-flödet)

## Varför

Idag finns **ingen garanti** att en person bara är en medlem i ett rum. Varje
`gaMedIRum` infogar en ny `members`-rad om inte ett lokalt sparat
`befintligtPersonId` skickas med. Återanslutnings-skydden (localStorage-nyckel,
`?me=`-token, hash-sökning) är bara *erbjudanden* i vissa flöden — inget
hindrar att samma person blir **två medlemmar i samma rum** (ny enhet, rensade
cookies, hoppade över återanslutning). Två rader för samma person spräcker
saldot.

Vi vill att **en e-postadress = en medlem i ett givet rum**. Anger man en e-post
som redan finns i rummet ska den befintliga medlemmen återanvändas i stället
för att en dubblett skapas.

Detta är avsiktligt bara **inom ett rum**. Global unikhet / cross-room hör till
026 (konto-grund) och byggs inte här.

## Vad

### DB – skyddsnät

Unik constraint på (rum, identitet):

```sql
create unique index if not exists members_room_identitet_uniq
  on members(room_id, identitet_hash)
  where identitet_hash is not null;
```

Partiellt index (`where ... is not null`) så medlemmar utan e-post (gamla /
ännu ej identifierade) inte krockar med varandra.

### Flöde – dedupe innan insert

När e-post anges (skapare i `skapaRumOchGaIn`, deltagare i `bekraftaJoin`):

1. Hasha e-posten (`hashIdentitet`, finns).
2. Slå upp i rummet: `sokMedIdentitetHash(roomId, hash)` (finns redan).
3. **Träff:** återanvänd den medlemmen (koppla lokal session till dess
   `personId`) i stället för att skapa en ny rad. Uppdatera ev.
   `member_token`/localStorage så återanslutning funkar framåt.
4. **Ingen träff:** skapa medlemmen som idag och sätt `identitet_hash`.

Kapsla in i en hjälpare, t.ex.
`KvittsSupabase.gaMedEllerAteranvand(roomId, namn, hash)` som returnerar
`{ personId, redanFanns }`, så skapa- och join-flödet delar logik. Indexet
blir då just ett skyddsnät (normalt sett triggas det aldrig).

### UX

- **Skaparen** kan i praktiken inte kollidera (rummet är nyss skapat, hen är
  enda medlemmen) — men kör samma väg för konsekvens.
- **Deltagare som råkar ange en redan använd adress:** tyst återanvändning är
  rimligt (det *är* samma person). Om namnet skiljer sig kan vi visa en kort
  bekräftelse: "Den här e-posten är redan med i rummet som *X* — fortsätt som
  *X*?" — men v1 kan börja med tyst återanvändning.

## Öppna frågor / noteringar

- **Migration:** befintliga dubbletter i produktion? Skriv en idempotent
  `docs/features/025-migration.sql` som skapar indexet. Om det inte kan skapas
  p.g.a. befintliga dubbletter — dokumentera manuell städning först.
- **Namnkonflikt vid återanvändning:** vilket `namn` gäller om den som
  återansluter angav ett annat namn? V1: behåll befintligt namn i rummet.
- **Avgränsning:** ingen global/cross-room-logik (→ 026).

## När levererad

*(Fylls i efter leverans.)*
