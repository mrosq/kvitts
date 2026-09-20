# Buggar

Kända buggar som inte fixas direkt. Kritiska buggar som kräver utredning
kan promotas till en feature-spec i `docs/features/`.

Inga öppna just nu.

---

# Fixade

Buggar som är lösta. Behålls för historiken.

---

## BUG-002: Saldo-kortet visar historiskt saldo efter att sessionen reglerats

**Status:** ✅ Fixad (2026-09-20). `saldoSammanfattning()` i [app.js](../app.js)
nedtonar nu saldo-kortet och saldo-detaljvyns sammanfattning till en ljus
"historik"-stil (`.saldo-kort.historik` / `.saldo-detalj-sammanfattning.historik`)
och lägger till "· Slutsaldo" i undertexten, för alla reglerade sessioner
(både lokal `reglera()` och grupp-autoarkivering — samma kodväg via
`aktivArReglerad()`). Beloppet och riktningen (skall få/är skyldig) behålls
oförändrade eftersom det är historiskt korrekt information, bara framtoningen
som en aktiv fordran/skuld tas bort.
**Allvarlighet:** Medium
**Område:** Reglering / saldo-vy

**Beskrivning:**
Efter feature 017 gäller detta främst **efter att ett rum autoarkiverats via
gemensam reglering**: den som ska få pengar bekräftar med "Reglerat", och när
alla rader som rör en deltagare är kvitterade markeras deltagarens lokala vy som
`reglerad`. Bannern "✓ Denna session är reglerad och visas som historik" visas,
men saldo-kortet räknar fortfarande på originalutgifterna och kan visa t.ex.
**"DU ÄR SKYLDIG 600,00 kr"** eller **"DU SKALL FÅ 600,00 kr"** med samma
framtoning som en aktiv skuld/fordran.

Det gamla reprot där en debitor själv öppnar "✓ Markera som reglerat" i ett rum
är inte längre korrekt efter 017: i grupp-läge får debitor bara statusen
"Väntar på bekräftelse…"; bara kreditorn kan kvittera. Motsvarande problem kan
fortfarande finnas i lokala sessioner via den manuella `reglera()`-vägen.

**Förväntad beteende:**
I reglerat läge bör saldo-kortet inte se ut som en aktiv skuld. Det bör
antingen visa "Reglerat" / "Historik", nedtonas, eller ersättas med en
sammanfattning som tydligt beskriver slutsaldot som historisk information.

**Repro:**
1. Skapa grupp, gå med som två personer (Alice + Bob).
2. Alice lägger till en utgift som ger Bob en skuld.
3. Alice öppnar regleringsflödet och trycker "Reglerat" för Bob.
4. Bobs vy autoarkiveras efter refresh/polling.
5. Observera: bannern säger "reglerad", men saldo-kortet kan fortfarande visa
   skulden/fordran som en aktiv status.

**Uppdaterad:** 2026-07-17 efter genomgång av 017-flödet. Se även
[033 – Reglera-flöde: analys och polering](features/033-reglera-flode-analys.md).

---

## BUG-001: Återbesök via rum-länk skapar ny deltagare istället för att återansluta

**Status:** ✅ Fixad. Lager 1 i [018a](features/done/018a-deltagar-identitet-lager-1.md) (2026-05-21), lager 2 + 3 i [018b](features/done/018b-deltagar-identitet-lager-2-3.md).
**Allvarlighet:** Hög (innan 018a) → Låg (efter 018a) → Löst (efter 018b)
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
- ✅ Rensad cache, ny enhet, incognito — löst i 018b via lager 2 (hashad
  e-post) och lager 3 (member_token i URL, `?me=<token>`).
