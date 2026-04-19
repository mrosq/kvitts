# 002 – Introskärm med lägesval

**Status:** open
**Skapad:** 2026-04-19

## Varför

Idag har appen en hårdkodad antagan: **en person** (Mikael) håller reda på
allas utgifter på sin egen enhet. På sikt finns en annan användning som är
minst lika rimlig: **flera personer** som var och en lägger in sina egna
utgifter på sin egen enhet, med någon form av sync mellan dem.

Det är två väldigt olika appar under huven (den ena helt lokal, den andra
kräver backend/sync), men för en ny användare är det inte uppenbart vilken
modell Kvitts erbjuder. Vi vill:

1. Sätta rätt förväntning från första sekunden — undvika att någon laddar appen
   och tror den har realtidssync mellan parterna.
2. Börja samla signaler om vilket alternativ folk faktiskt väljer (om vi
   senare lägger till någon form av enkel telemetri eller manuell observation),
   för att veta om multi-user-vägen är värd att bygga.
3. Lägga grunden för att senare kunna bygga ut alternativ 2 utan att appens
   onboarding-flöde behöver göras om från noll.

## Vad

Ett nytt onboarding-flöde i flera steg som visas när det inte finns någon
befintlig session i `localStorage`. Befintliga användare hoppar över hela
flödet och går direkt till appen (med ett undantag, se migration nedan).

### Flöde

```
Skärm 1: Välkomst + namn  →  Skärm 2: Lägesval  →  ┬─ Skärm 3a: person2-namn → Appen
                                                    └─ Skärm 3b: "Kommer snart" → tillbaka till skärm 2
```

### Skärm 1 — Välkomst + namn

- Rubrik: "Välkommen till Kvitts" (samma typografi som nuvarande
  `#setup-screen h1`)
- Underrubrik/text: "Låt oss komma igång" + 1 mening om vad appen gör
- Frågefält: **"Vad heter du?"**
  - Textinput, `maxlength="20"`
  - Trim whitespace, kräv minst 1 tecken
- Knapp: "Nästa →" (disabled tills inputen är giltig)

Värdet sparas som **person1:s namn** i `localStorage` och ersätter den
hårdkodade strängen "Mikael" på alla ställen i appen (se "Konsekvenser för
befintlig kod" nedan).

### Skärm 2 — Lägesval

Två tydliga val (knappar/kort):
- **A: "Jag håller reda på allas utgifter"** — beskriv: "Du lägger in alla
  utgifter på din enhet. Inget konto behövs."
- **B: "Vi lägger in utgifter var för sig"** — beskriv: "Varje person lägger
  in sina egna utgifter på sin egen telefon."

### Skärm 3a — person2-namn (val A)

Nuvarande setup-skärm, oförändrad i sin funktion: ange den andra personens
namn → spara session → appen visas. Texten "Vad heter den andra personen?"
kan nu vara mer specifik eftersom person1:s namn redan är känt
(t.ex. "Vem delar du utgifter med, [person1-namn]?").

### Skärm 3b — "Kommer snart" (val B)

Kort text som ärligt säger att multi-user-läget inte finns än, plus en
*Tillbaka*-knapp som tar användaren tillbaka till skärm 2.

### Persistens av val

- Person1:s namn sparas direkt när skärm 1 lämnas (även om användaren sedan
  väljer B och inte fullföljer) — vi har redan frågat efter värdet, slänga
  bort det vore slöseri.
- Val A → session skapas → introflödet visas inte igen vid omstart.
- Val B → ingen session skapas → vid nästa start visas skärm 1 igen, men
  med personens namn redan ifyllt (eftersom det sparades).
- Lagra **inte** själva val B i `localStorage` — det skulle göra appen
  permanent oanvändbar tills lagring rensas.

### Konsekvenser för befintlig kod

Strängen "Mikael" är hårdkodad på flera ställen i `index.html` (UI-text,
`<select>`-options, saldo-meddelanden som "Mikael är skyldig X"). Alla dessa
behöver bytas mot person1:s sparade namn — antingen genom att läsa från en
variabel vid render (samma mönster som befintliga `person2`-användning) eller
genom att sätta `textContent` i `visaApp()` (samma mönster som
`p2-option.textContent = person2`).

Granska minst:
- Saldo-text ("[namn] är skyldig [namn]")
- Betalare-dropdown i ny utgift och i edit-modal
- "Betalt av [namn]"-badge i historiklistan
- Subtitle ("[namn] & [person2]")
- Reglera-modal-text

### Visuellt

Återanvänd existerande klasser (`#setup-screen`, `.setup-input`, `.btn-primary`)
och färgvariabler. Skärmarna 1, 2, 3a, 3b följer samma mönster som nuvarande
setup-skärm — centrerad på sidan, max-width som idag.

## Öppna frågor / noteringar

- **Wording av valen:** Förslagen ovan är utgångspunkt — finslipas vid
  implementation. Värt att testa i appen och justera så det inte blir
  tekniknördigt ("single-user mode").
- **"Kommer snart"-textens innehåll:** Något kortfattat och ärligt — inte ett
  email-signup eller "notify me" (overkill för där projektet är). Bara en
  förklaring att funktionen ligger på roadmap. Eventuellt länk till
  `docs/features/` på GitHub om man är nyfiken på status.
- **Förhållande till 001 (multi-session):** Helt orthogonala. 001 handlar om
  flera *listor* för samma användare. Detta handlar om huruvida flera
  *personer* skriver in data. Båda kan implementeras oberoende.
- **Avgränsning:** Denna feature bygger *bara* introskärmen + "kommer snart"-
  sidan för val B. Den faktiska multi-user-funktionaliteten är en helt egen
  framtida feature (kommer kräva backend/sync — stor bit, eget spec när det
  blir aktuellt).
- **Övergång från befintliga användare:** De som redan har en session ser
  aldrig introskärm 1 eller 2. Men eftersom person1:s namn är ett nytt fält
  som inte fanns innan, behöver vi en migration: om en session finns men
  person1-namnet saknas → defaulta tyst till "Mikael" (det enda värde som
  funnits hårdkodat hittills, så det stämmer för alla som redan kör appen).
  Alternativ: visa en engångsruta "Vad heter du?" innan appen visas första
  gången efter uppgradering. Diskuteras vid implementation — silent default
  är minst friktion, prompt är mer korrekt långsiktigt.
- **Namnet på localStorage-nyckeln:** Bör följa samma prefix som övriga
  nycklar. Om feature 003 (`splitwise_*` → `kvitts_*`) är implementerad först
  → använd `kvitts_person1`. Annars `splitwise_person1` och låt 003 byta
  alla på en gång senare.
- **Skärm 1 som en eller två skärmar:** Specen ovan beskriver välkomsttext
  och namnfältet på samma skärm (intryck av snabbt onboarding). Alternativ
  är att splitta: ren välkomstsida med "Kom igång"-knapp först, sedan
  namnfrågan. Avgör vid implementation utifrån hur det känns visuellt.
