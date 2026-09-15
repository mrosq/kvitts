# 036 – Onboarding-tooltips i gruppläge

**Status:** done
**Skapad:** 2026-09-15

## Varför

Nya användare landar i appen direkt efter join/skapa-flödet utan någon
vägledning om vad de olika delarna av skärmen gör. Registrerings-flödet
förklarar redan *hur man kommer in* i en grupp — det som saknas är en snabb
introduktion till *vad man gör där*. En kort, tyst självguidning (inga
externa beroenden, ingen backend) sänker tröskeln utan att kräva en hjälpsida.

Gäller bara gruppläge (`s.kind === "grupp"`) — lokala listor har redan ett
enklare UI och en annan målgrupp (en person, inget att bjuda in).

## Vad

En sekvens av 5 tooltips som visas automatiskt första gången en användare
ser gruppens app-vy, en i taget. Klick på en tooltip (var som helst i den,
eller en explicit "Nästa"/"Klar"-knapp) stänger den och öppnar nästa. Klick
utanför/på en "Hoppa över"-länk avbryter hela sekvensen.

**Steg (mål-element → text):**

1. `#topbar-meny` — "Här hittar du menyn: byt grupp, reglera skulder, installera appen."
2. `#saldo-kort` — "Saldot visar vem som är skyldig vem just nu."
3. `#ny-utgift-kort` — "Lägg till en utgift här — välj vem som betalade och hur ni delar den."
4. `#split-knapp` — "Delar ni inte exakt lika? Fördela beloppet själva här."
5. `#historik-lista` — "Alla utgifter hamnar i historiken. Klicka på en för att ändra eller ta bort den."

Exakt text kan justeras vid implementation, men syftet med respektive steg
ska vara detta.

### Visuellt

Återanvänd samma idé som skärmdumps-overlayen som redan gjorts manuellt för
hjälptexten (numrerad badge + pratbubbla), men riktigt i produktions-CSS:

- En halvtransparent bakgrund (`position:fixed; inset:0`) som dimmar resten
  av sidan, med ett "hål" (t.ex. `box-shadow: 0 0 0 9999px rgba(0,0,0,.55)`
  på en highlight-ram runt målelementet) så att just det elementet lyser
  igenom.
- En pratbubbla positionerad relativt målelementets `getBoundingClientRect()`
  (ovanför eller under, beroende på vad som får plats i viewporten) med
  text + stegindikator ("2 av 5") + "Nästa →"-knapp (sista steget: "Klar").
- En diskret "Hoppa över"-länk, alltid synlig.

### Trigger & state

- Ny funktion `startaOnboardingOmForsta()`, anropas i slutet av `visaApp()`
  men bara när `s.kind === "grupp"`.
- Gate: `localStorage.getItem("kvitts_onboarding_grupp_visad")`. Sätts till
  `"1"` **direkt när sekvensen startar** (inte när den avslutas) så den
  aldrig triggas två gånger om `visaApp()` råkar köras igen medan
  onboardingen visas (t.ex. session-växling).
- Flaggan är global per enhet, inte per grupp — man ska bara se introt en
  gång totalt, inte en gång per grupp man går med i.
- Om målelementet för ett steg inte finns i DOM:et eller inte är synligt
  (t.ex. `ny-utgift-kort` är dold när sessionen är reglerad, se
  `reglerad-banner`-logiken i `visaApp()`) — hoppa tyst över det steget.

## Öppna frågor / noteringar

- Ingen persistens i Supabase — rent lokalt (`localStorage`), precis som
  övrig UI-state.
- Ingår inte: möjlighet att se onboardingen igen manuellt (t.ex. från menyn).
  Kan läggas till senare om det efterfrågas.
- Ingår inte: separat variant för lokalt lista-läge.
- Mobil-layout: pratbubblan måste klara smala viewports (ner till ~360px)
  utan att gå utanför skärmen — samma gutter-regel som resten av appen.

## När levererad

Byggt enligt spec, med en avvikelse efter uppföljande feedback:

- `ONBOARDING_STEG` i `app.js` (5 steg), `startaOnboardingOmForsta()` anropas
  sist i `visaApp()` för `kind === "grupp"`.
- Overlay/spotlight/tooltip byggs dynamiskt med `document.createElement`
  (ingen ny markup i `index.html`, bara CSS: `.onboarding-*`).
- Osynliga mål-element hoppas tyst över (`onboardingElementArSynligt`).
- **Avvikelse:** "Hoppa över"-länken togs bort och bakgrunds-klick stänger
  inte längre sekvensen — användaren måste aktivt klicka knappen
  ("Fortsätt →" / "Klar" på sista steget) för varje tooltip. Ingen väg att
  avbryta i förtid.
- Saldo-steget (`#saldo-kort`) fick tillägget "Klicka för detaljer." i texten.
- Verifierat manuellt via agent-browser: alla 5 steg positionerar korrekt,
  bakgrundsklick gör ingenting, "Klar" stänger och sätter
  `kvitts_onboarding_grupp_visad` så den inte visas igen. Lokalt läge
  triggar den aldrig.
- `sw.js`: `CACHE_NAME` bumpad v21 → v23 (v22 vid första leveransen, v23 vid
  denna justering).
