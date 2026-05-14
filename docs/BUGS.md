# Buggar

Kända buggar som inte fixas direkt. Kritiska buggar som kräver utredning
kan promotas till en feature-spec i `docs/features/`.

---

## BUG-005: Återbesök via rum-länk skapar ny deltagare istället för att återansluta

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
