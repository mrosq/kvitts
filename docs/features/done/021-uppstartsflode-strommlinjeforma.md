# 021 – Strömlinjeforma uppstartsflödet (lägesval först + slå ihop skapa rum)

**Status:** klar
**Skapad:** 2026-07-03

## Varför

Uppstartsflödet känns osammanhängande, särskilt för rum-läget som idag är fem
skärmar: namn → lägesval → nytt/existerande → projektnamn → klart. Två saker
skaver:

1. **Namn frågas innan man valt vad man ska göra.** Man skriver sitt namn utan
   kontext ("varför då?"), och i rum-läget kopplas det loss från resten.
2. **Projektnamn ligger på en helt egen skärm** mellan "skapa nytt rum" och
   slutskärmen — ett extra klick för lite innehåll.

## Vad

Två ändringar (A + C i grubbel-diskussionen):

**A. Lägesval först, namn i sammanhang.**
Vänd på ordningen mellan namn-skärmen ([intro-1]) och lägesval ([intro-2]).
Visa "Hur vill du använda appen?" först. Namn frågas sedan där det hör hemma:
- Lokalt läge ("Jag håller reda på allas utgifter") → be om namn direkt.
- Rum-läge → namn tas i skapa-/gå-med-steget (join-flödet frågar redan namn).

**C. Slå ihop projektnamn med "skapa nytt rum".**
Ta bort den separata `intro-skapa-rum`-skärmen. Låt "Skapa nytt rum" i
`intro-3b` leda direkt till namnfältet (eller expandera kortet inline), så att
projektnamnet matas in utan ett mellansteg.

Netto: rum-flödet går från 5 → 3 skärmar, och det obligatoriska (namn,
projektnamn) skiljs tydligare från valet av läge.

## Öppna frågor / noteringar

- **B (e-post) ingår INTE här.** Att göra e-post valfri / skjuta upp den
  hanteras separat — vi tittar på det när [019](019-prefyll-identitet-vid-ny-inbjudan.md)
  är klar, eftersom 019 påverkar hur e-post/identitet hänger ihop i flödet.
- Behåll "ladda sparad fil"-genvägen som finns i lokalt-läget.
- Se till att ett redan sparat namn (`kvitts_person1`) fortfarande prefylls /
  hoppar över namn-steget som idag.
- Kontrollera att bakåt-knapparna (`← Tillbaka`) fortfarande går rätt efter att
  skärmarna bytt ordning.

## När levererad

Levererad 2026-07-03.

**A — lägesval först:** Appen startar nu på lägesvalet (`intro-2`) istället för
namn-skärmen. Lokalt läge ("Jag håller reda på allas utgifter") leder till
namn-skärmen (`intro-1`, ny rubrik "Vad heter du?" + ← Tillbaka-knapp) och
sedan deltagare. Alla onboarding-fallbacks (rum borttaget, sista sessionen
raderad m.m.) pekar nu på lägesvalet.

**C — sammanslagen skapa-rum:** `intro-skapa-rum` samlar nu in både projektnamn
och ditt namn i samma steg; knappen aktiveras först när båda fälten är ifyllda.
Den separata tidiga namn-frågan för rum-läget är borttagen.

**B (e-post) orörd** enligt spec — kopplas till efter feature 019.

Verifierat i browsern (lägesval → lokalt namnsteg, samt lägesval → skapa rum med
båda fält + knapp-validering). Alla 80 tester passerar.
