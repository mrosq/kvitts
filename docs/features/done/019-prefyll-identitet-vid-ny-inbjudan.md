# 019 – Strömlinjeformat rumsflöde + prefyll identitet

**Status:** open
**Skapad:** 2026-06-07
**Omskriven:** 2026-07-07
**Beror på:** 018b (levererad)

## Varför

Tre saker hänger ihop i rumsflödet och löses tillsammans:

**1. "Gå med i rum" är i praktiken meningslös.**
Appen ansluter redan automatiskt när man öppnar en rum-länk — `init()`
parsar rum-sökvägen och kör återanslutnings-/join-flödet (`visaBekraftaJoin`)
utan att man rör intro-skärmarna. Den manuella "Gå med i rum"-skärmen
(klistra in kod/länk) är alltså en andra, sämre väg till exakt samma sak:
för att kunna använda den måste någon ändå ge dig länken/koden — och det
naturliga man delar är länken, som ansluter med noll knapptryck. Ingen
kommer den manuella vägen i praktiken.

**2. Flödet har ett onödigt mellansteg.**
Idag: start → "Vi lägger in var för sig" → "Gemensamt rum" (Skapa/Gå med)
→ namnge rum → rum skapat (där man dessutom fyller i e-post). Mellansteget
"Gemensamt rum" finns bara för att rymma "Gå med"-grenen — tas den bort
kan man gå direkt till att namnge rummet.

**3. Återkommande användare får fylla i namn + e-post från scratch.**
När man skapar/går med i ett *nytt* rum "vet" appen ofta redan vem man är
(namn i `kvitts_person1`, e-post sparas inte ännu) men frågar ändå om allt
på nytt.

## Vad

### Del A – Ta bort manuell "Gå med i rum" och korta av flödet

Anslutning till rum sker **enbart via länk** (auto-hanteras redan i `init()`).

- Ta bort `intro-ga-med-rum`-skärmen och tillhörande UI/handlers
  (`visaGaMedRum`, "Hitta rum"-knappen, `ga-med-input`, `ga-med-fel`).
  Den underliggande join-logiken (`hittaRumForJoin`, `visaBekraftaJoin`,
  `bekraftaJoin`) behålls — den används fortfarande av länk-flödet i `init()`.
- Ta bort mellansteget `intro-3b` ("Gemensamt rum" med Skapa/Gå med).
- Lägesvalet "Vi lägger in utgifter var för sig" (`intro-2`) leder nu
  **direkt** till skapa-rum-skärmen (`visaSkapaRum`).
- "← Tillbaka" på skapa-rum-skärmen går till lägesvalet (`visaSkarm2`)
  istället för till den borttagna `intro-3b`.

### Del B – Samla namn + e-post + rumsnamn på ett steg (steg 2)

Skapa-rum-skärmen (`intro-skapa-rum`) får **tre fält**: rumsnamn, ditt namn
och din e-post — allt fylls i på samma steg.

- Flytta e-postfältet från rum-skapat-skärmen (`rum-skapat-epost`) hit
  (`intro-skapa-rum`). Behåll info-texten om att e-posten bara används för
  återanslutning och aldrig delas.
- `uppdateraSkapaRumKnapp` kräver nu att alla tre fälten är ifyllda innan
  "Skapa rum →" aktiveras.
- `skapaRumOchGaIn` skickar med e-posten till skapa-rum-anropet (samma
  identitets-mekanism som 018b använde på rum-skapat-skärmen).

Steg 3 (`intro-rum-skapat`) blir då enbart en **bekräftelse**: "Klart!",
delbar länk och Kopiera/Dela-knappar + "Börja lägg till utgifter →".
Inget e-postfält kvar där.

Nytt flöde: start → "Vi lägger in var för sig" → **rumsnamn + namn + e-post**
→ rum skapat (kopiera/dela länk) → in i appen. En skärm färre, ingen död gren.

### Del C – Spara och prefyll identitet (namn + e-post)

**Spara e-post lokalt.** Vid lyckat skapa/join, skriv användarens e-post till
en ny nyckel `kvitts_identitet_epost` (komplement till `kvitts_person1` för
namn). Görs där identiteten slås fast — `skapaRumOchGaIn`/`gaInIRumEfterSkapa`
och `bekraftaJoin`.

**Prefyll skapa-rum-skärmen.** När `visaSkapaRum` körs och namn/e-post finns
i localStorage: förifyll `skapa-rum-mitt-namn` från `kvitts_person1` och
e-postfältet från `kvitts_identitet_epost`. Rumsnamnet lämnas alltid tomt
(nytt rum = nytt namn). Knappen aktiveras direkt om namn + e-post redan är
ifyllda (bara rumsnamn kvar att skriva).

**Prefyll bekräfta-join-skärmen (länk-flödet).** När `visaBekraftaJoin` körs
och `kvitts_person1` / `kvitts_identitet_epost` finns: förifyll namn + e-post
och aktivera bekräftelseknappen. Användaren kan alltid redigera fälten.

Prefyllning sker inline i fälten (inte modal). Enkelt och redigerbart.

## Öppna frågor / noteringar

- **Escape-hatch för kod?** Om vi senare vill stödja "länken funkar inte,
  jag har bara en kod" kan kod-inmatning återinföras som en diskret länk —
  men inte som en jämbördig gren i huvudflödet. Utanför scope för v1.
- **Flera identiteter** (privat vs jobbmail): v1 sparar bara senast använda
  e-post — acceptabelt.
- **Inget Supabase-anrop** för prefyll — ren localStorage-läsning vid
  skärm-init.
- Kolla att inga andra ställen länkar till `intro-3b` / `visaGaMedRum` /
  `intro-ga-med-rum` innan de tas bort (meny, tillbaka-knappar, `init`).

## När levererad

**Levererad 2026-07-07.** Byggdes enligt spec:

- **Del A:** Tog bort `intro-ga-med-rum`-skärmen, `intro-3b`-mellansteget och
  handlers `visaGaMedRum`, `hittaRumForJoin`, `extraheraRumId`. Lägesvalet
  "Vi lägger in var för sig" går nu direkt till `visaSkapaRum`.
  `startaJoinFlode` gjordes async och slår upp rummet direkt (via länk i
  `init`) istället för att gå via den borttagna manuella skärmen; saknas
  rummet visas `visaRumBorttaget`. Tillbaka-knappen på skapa-rum går till
  lägesvalet (`visaSkarm2`).
- **Del B:** Skapa-rum-skärmen har nu tre fält (rumsnamn, namn, e-post).
  E-postfältet flyttades hit från rum-skapat-skärmen, som blev ren
  bekräftelse (länk + kopiera/dela + börja-knapp, alltid aktiv).
  `uppdateraSkapaRumKnapp` kräver alla tre fält. `gaInIRumEfterSkapa`
  läser e-posten från `_joinEpost` (satt i `skapaRumOchGaIn`).
- **Del C:** Ny localStorage-nyckel `kvitts_identitet_epost`. Sparas i
  `skapaRumOchGaIn` och `bekraftaJoin`. Prefylls i `visaSkapaRum` och
  `visaBekraftaJoin` (namn från `kvitts_person1`, e-post från nya nyckeln).

Verifierat i browser: fräscht flöde (tomma fält, knapp disabled),
återkommande användare (namn + e-post prefyllda, knapp aktiveras när
rumsnamn/e-post fylls i), och join-knapplogik. Alla 80 tester gröna.
