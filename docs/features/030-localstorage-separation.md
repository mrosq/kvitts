# 030 – Separerad localStorage mellan webbläsare och PWA

**Status:** open (avvaktar)
**Skapad:** 2026-07-10

## Varför

På **Android** delar den installerade PWA:n samma localStorage som Chrome-
webbläsaren (samma profil). På **iOS** är hemskärms-appens lagring redan
isolerad från Safari av OS:et. Ibland vill man medvetet hålla isär data
mellan "test i browsern" och "skarpt i appen" — eller helt enkelt ha
förutsägbar separation oavsett plattform.

## Vad

Namespace:a localStorage-nycklarna efter körläge (installerad PWA vs vanlig
webbläsare):

```js
const arInstallerad = window.matchMedia('(display-mode: standalone)').matches
  || window.navigator.standalone === true; // iOS
const NYCKEL_PREFIX = arInstallerad ? 'kvitts_pwa_' : 'kvitts_';
```

Allt localStorage-läsande/skrivande går redan via `kvitts_`-prefixet, så
ändringen är liten men berör alla nyckelbyggen (inkl. `roomMemberKey` och
session-nycklarna).

### Migrering (viktigt)

Utan migrering möter en användare som satt upp allt i webbläsaren **tom state**
första gången appen öppnas i standalone-läge ("allt försvann"). Därför:

- Första gången appen startar i standalone-läge och `kvitts_pwa_`-utrymmet är
  tomt men `kvitts_`-utrymmet har data → **kopiera över** relevanta nycklar
  till `kvitts_pwa_`.
- Sätt en flagga så migreringen bara körs en gång.

## Öppna frågor / noteringar

- **Är detta ens önskvärt som default?** Argumentet emot: den som börjar i
  browsern och sen installerar tappar sin data om vi inte migrerar rätt. Bra
  poäng från diskussionen: **kör man "grupp-versionen" (Supabase-rum) och har
  sin återställningslänk** är förlorad lokal state inget stort problem — man
  ansluter bara igen. Men för det lokala läget (allt i localStorage) är
  migrering ett måste.
- **`display-mode`-detektion är inte 100 % tillförlitlig** — vissa lägen
  (t.ex. `minimal-ui`, TWA) kan lura den. Verifiera på riktiga enheter innan
  vi litar på den för dataseparation.
- **iOS är redan separerat** av OS:et — där ger prefixet ingen extra effekt
  men skadar inte.
- **Risk:** felaktig detektion → användaren ser fel datauppsättning. Det är
  mer riskabelt än 029, därför **avvaktar** vi (per beslut 2026-07-10).
- **Beroende:** oberoende av 029, men båda rör PWA-läget.

## När levererad

Lägg till en kort sammanfattning av vad som faktiskt byggdes (kan skilja från
ursprunglig spec) och flytta filen till `docs/features/done/`.
