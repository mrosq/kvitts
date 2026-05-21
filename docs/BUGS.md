# Buggar

Kända buggar som inte fixas direkt. Kritiska buggar som kräver utredning
kan promotas till en feature-spec i `docs/features/`.

---

## BUG-001: Återbesök via rum-länk skapar ny deltagare istället för att återansluta

**Status:** delvis fixad i [018a](features/done/018a-deltagar-identitet-lager-1.md) (2026-05-21). Återstår: rensad cache, ny enhet, incognito — täcks av [018b](features/018b-deltagar-identitet-lager-2-3.md).
**Allvarlighet:** Hög (innan 018a) → Låg (efter 018a; bara udda-fall återstår)
**Område:** Rum-flöde / onboarding

**Beskrivning:**
Om en användare stänger fliken och sedan öppnar rum-länken igen visas
"du heter X, vill du gå med i Y?" — dvs. join-flödet körs igen och ett
nytt `members`-inslag skapas i Supabase. Användaren är nu inne i rummet
som en ny person, sina gamla utgifter kopplade till det gamla member-id:t.

**Förväntad beteende:**
Användaren känns igen och återansluts till sitt befintliga member-id utan
att behöva göra något.

**Fix-status:**
- ✅ Normalfallet (samma enhet, session-blob borttagen från meny eller
  saknad) — löst i 018a via fristående `kvitts_room_<id>_member_id`-nyckel
  + tyst återanslutning vid `/r/<id>`.
- ⏳ Rensad cache, ny enhet, incognito — kräver lager 2 (hashad e-post)
  och/eller lager 3 (member_token i URL). Specat i 018b.

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
