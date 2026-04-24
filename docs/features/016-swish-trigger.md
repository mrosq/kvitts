# 016 – Swish-trigger (deeplink med förifyllt belopp)

**Status:** open
**Skapad:** 2026-04-24

## Varför

När Kvitts visar "Du är skyldig X 250 kr" är nästa steg nästan alltid att
öppna Swish och skicka pengarna. Idag är det manuellt: byta app, skriva in
nummer, belopp, meddelande. Swish stödjer deeplinks — en länk som öppnar
appen med fält förifyllda — så vi kan göra det till ett klick.

Ingen backend-integration, inga nycklar, ingen API-kostnad. Bara en URL.

## Vad

En "Swisha"-knapp som visas bredvid/under skuldraderna i saldovyn. När
användaren trycker öppnas Swish-appen med belopp och meddelande förifyllt.
Mottagaren (numret) matar användaren in själv i Swish — vi skippar
nummerlagring i denna version.

**URL-format** (Swish officiella schema):

```
swish://payment?data=<url-encoded JSON>
```

där JSON-payload är:

```json
{
  "version": 1,
  "amount": { "value": 250 },
  "message": { "value": "Kvitts 2026-04-24" }
}
```

Fält:
- `version`: alltid `1`
- `amount.value`: skuldbeloppet som tal (SEK)
- `message.value`: genererat meddelande, t.ex. `"Kvitts – till <namn>"` eller
  datumstämpel. Hålls under ~50 tecken.
- `payee` utelämnas — användaren väljer mottagare i Swish själv.

**Var knappen visas:**
- I saldo-detaljmodal, på varje rad där "Du är skyldig <namn> X kr"
  (se [app.js:598](app.js#L598)).
- I huvudsaldo-kortet om totalsaldot är negativt (du är netto skyldig),
  med beloppet för största enskilda skulden — eller hoppa över och låta
  detaljmodalen vara entry-pointen. Avgörs under implementation.
- Visas *inte* på rader där andra är skyldiga dig — du kan inte trigga
  någon annans Swish-betalning.

**Desktop-beteende:**
- Länken kommer inte göra något vettigt på desktop. Vi visar knappen ändå
  (enkelt), men den kan döljas om det visar sig skräpigt. Ingen QR-kod i v1.

## Öppna frågor / noteringar

- **iOS-quirks**: `<a href="swish://...">` är säkrare än `window.location.href`-
  assignment på iOS Safari. Implementera som riktig länk.
- **URL-encoding**: JSON → `encodeURIComponent`. Testas med Swish-app på
  riktig enhet, inte bara desktop-browser.
- **Meddelande-innehåll**: enkel variant i v1 — `"Kvitts <datum>"`. Kan
  utökas senare (t.ex. lista utgifter, period).
- **QR-kod** — nice-to-have, inte med i v1. Swish har ett separat QR-format
  om det blir aktuellt.
- **Nummerlagring** — medvetet utanför scope. Om det blir aktuellt senare
  blir det en egen feature som utökar person-objekten (inte bara Swish-
  specifikt — kan omfatta annan kontaktinfo).
- **Verifiering** — Swish säger inte till oss om betalningen gick igenom.
  Användaren trycker "reglera" i Kvitts manuellt efter. Dokumenteras inte
  extra — det är redan dagens flöde.
- **Avgränsning**: ingen install-detektion ("finns Swish på enheten?"), ingen
  fallback-UI om länken inte triggar något. Knappen finns, trycker man den
  händer det som händer.

## Att göra som del av leveransen

- Liten helper i [logic.js](logic.js) som bygger Swish-URL från belopp +
  meddelande (ren funktion, enhetstestbar).
- Knapp-rendering i saldo-detaljmodalen i [app.js](app.js).
- Test i [logic.test.js](logic.test.js) som verifierar URL-formatet
  (belopp, meddelande, encoding).
- Manuell testning på riktig telefon — viktigt, iOS och Android beter sig
  olika på custom schemes.

## När levererad

Lägg till en kort sammanfattning av vad som faktiskt byggdes och flytta
filen till `docs/features/done/`. Uppdatera TODO.md om något delmoment
behöver följas upp (t.ex. QR-kod som uppföljning).
