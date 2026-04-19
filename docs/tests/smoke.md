# Smoke-tester

Enkla flödestester för att verifiera att kärnfunktionerna fungerar.
Körs med agent-browser mot en lokal server (`npx serve . -p 8000`).

Testerna är med flit enkla och högnivå — de skall överleva refaktoreringar.
Uppdatera dem när flöden förändras, inte efter varje liten UI-ändring.

---

## S1 · Onboarding och första utgift

**Syfte:** Verifiera att en ny användare kan komma igång och lägga till en utgift.

1. Öppna appen (tom localStorage)
2. Fyll i namn och klicka Nästa
3. Välj "Jag håller reda på allas utgifter"
4. Lägg till 2 personer (t.ex. Anna och Erik) och klicka Kom igång
5. Fyll i beskrivning "Mat", belopp 300, betalare = inloggad person
6. Klicka + Lägg till

**Förväntat:** Utgiften syns i historiken med rätt belopp. Saldo-kortet visar att Anna och Erik är skyldiga pengar (inte "Jämnt").

---

## S2 · Redigera en utgift

**Syfte:** Verifiera att man kan korrigera en utgift utan att lägga till en ny.

Förutsätter att S1 är kört (minst en utgift finns).

1. Tryck på utgiften i historiken
2. Ändra beloppet
3. Spara

**Förväntat:** Historiken visar det uppdaterade beloppet. Saldot räknas om korrekt.

---

## S3 · Spara och ladda JSON

**Syfte:** Verifiera att data överlever en enhetsbyte via JSON-filen.

Förutsätter att S1 är kört.

1. Tryck Spara fil — en JSON-fil laddas ned
2. Rensa localStorage (eller öppna privat flik)
3. Gå igenom onboarding igen
4. Tryck "eller ladda en sparad fil" och välj JSON-filen

**Förväntat:** Samma utgifter och samma saldo som innan.

---

## S4 · Markera som reglerat

**Syfte:** Verifiera att "nollställning" fungerar utan att historiken raderas.

Förutsätter att saldo inte är jämnt.

1. Tryck "✓ Markera som reglerat"
2. Bekräfta

**Förväntat:** Saldo-kortet visar "Jämnt". Tidigare utgifter finns kvar i historiken.
