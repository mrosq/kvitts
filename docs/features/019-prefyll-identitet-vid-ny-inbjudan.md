# 019 – Prefyll namn + e-post vid ny ruminbjudan

**Status:** open
**Skapad:** 2026-06-07
**Beror på:** 018b (levererad)

## Varför

Efter 018b sparar appen e-postadressen lokalt (`kvitts_person1` för namn,
men ingen nyckel för e-post ännu). När användaren får en ny inbjudan till
ett *annat* rum får hen fylla i namn och e-post igen från scratch — trots att
appen redan "vet" vem hen är från ett tidigare rum.

Appen bör känna igen återkommande användare och fråga: "Tidigare har du
gått med som X / x@example.com — vill du använda detta igen?"

## Vad

### Lagra e-post lokalt efter join

Spara användarens e-postadress i localStorage vid join/skapa-rum, t.ex.
nyckeln `kvitts_identitet_epost`. Komplement till befintlig `kvitts_person1`.

### Prefyll bekräftelseskärmen vid ny inbjudan

När `visaBekraftaJoin` körs och `kvitts_identitet_epost` finns i localStorage:

```
Tidigare har du gått med i rum som Peter / peter@gmail.com.
Vill du använda samma uppgifter?

[ Ja, använd dessa ]   [ Nej, ange andra uppgifter ]
```

- **Ja:** prefyll namn + e-post, bekräftelseknappen aktiveras direkt.
  Användaren kan ändra i fälten om hen vill.
- **Nej:** töm fälten, låt användaren fylla i från scratch.

Samma logik gäller för skaparen av rum (`visaRumSkapat`-skärmen med
e-postfältet som lades till i 018b).

### Spara e-post efter varje lyckat join

Varje gång `bekraftaJoin` eller `gaInIRumEfterSkapa` lyckas: skriv
`kvitts_identitet_epost = _joinEpost` till localStorage så nästa rum
kan prefylla.

## Öppna frågor / noteringar

- **Vad om användaren har flera identiteter?** T.ex. en privat och en
  jobbmail beroende på rum. V1 sparar bara den senast använda — acceptabelt.
- **Ska prefyllt namn + epost visas som en sammanfattning eller direkt i fälten?**
  Förslag: visa en sammanfattnings-rad med "Använd dessa →"-knapp ovanför
  fälten (inte en modal). Användaren ser vad som är prefyllt och kan redigera.
- **Bekräftelseskärmen för skaparen** (`rum-skapat`-skärmen) kan prefyllas
  på samma sätt — e-postfältet fylls i direkt och knappen aktiveras.
- **Inget Supabase-anrop** — allt är ren localStorage-läsning vid skärm-init.

## När levererad

*(Fylls i efter leverans.)*
