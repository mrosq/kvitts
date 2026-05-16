# Buggar

Kända buggar som inte fixas direkt. Kritiska buggar som kräver utredning
kan promotas till en feature-spec i `docs/features/`.

---

## BUG-001: Återbesök via rum-länk skapar ny deltagare istället för att återansluta

**Allvarlighet:** Hög
**Område:** Rum-flöde / onboarding

**Beskrivning:**
Om en användare stänger fliken och sedan öppnar rum-länken igen visas
"du heter X, vill du gå med i Y?" — dvs. join-flödet körs igen och ett
nytt `members`-inslag skapas i Supabase. Användaren är nu inne i rummet
som en ny person, sina gamla utgifter kopplade till det gamla member-id:t.

**Förväntad beteende:**
Användaren känns igen och återansluts till sitt befintliga member-id utan
att behöva göra något.

**Designfrågor att lösa:**
- Hur identifierar vi en återvändande användare? (localStorage per room_id?)
- Vad händer om samma person öppnar länken på en ny enhet — ska hen få
  välja namn igen eller alltid behandlas som ny?
- Ska appen visa "välkommen tillbaka, X" eller bara tyst återansluta?

---

## BUG-002: Saldo-kortet visar kvarstående skuld efter att sessionen markerats som reglerad

**Allvarlighet:** Medium
**Område:** Rum / saldo-vy (004c)

**Beskrivning:**
När en deltagare som är skyldig pengar väljer "✓ Markera som reglerat" och
bekräftar, växlar sessionen till historik-läge och bannern "✓ Denna session
är reglerad och visas som historik" visas. Däremot fortsätter saldo-kortet
att visa **"DU ÄR SKYLDIG 50,00 kr"** med samma framtoning som en aktiv
skuld. Det är förvirrande direkt under en banner som signalerar att allt är
klart — användaren kan tro att markeringen inte slog igenom.

**Förväntad beteende:**
I reglerat läge bör saldo-kortet antingen visa "Reglerat" / "Jämnt",
visuellt nedtonas, eller ersättas med en sammanfattning typ
"Slutsaldo: 50 kr betalt till Alice".

**Repro:**
1. Skapa rum, gå med som två personer (Alice + Bob).
2. Alice lägger till en utgift som ger Bob en skuld (t.ex. 300 kr mat, delat lika).
3. Bob öppnar `⚙` → "✓ Markera som reglerat" → bekräftar i modalen.
4. Observera: bannern säger "reglerad", men saldo-kortet visar fortfarande "DU ÄR SKYLDIG 50,00 kr".

**Hittad:** dogfood-session 2026-05-16, se
`agent-browser/screenshots/09-reglera-confirm.png` och `10-bob-after-reglera.png`.
