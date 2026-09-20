# 033 – Reglera-flöde: analys och polering

**Status:** open
**Skapad:** 2026-07-17
**Relaterat:** 017 (gemensam reglering), BUG-002

## Varför

Reglera-flödet har vuxit från en enkel lokal "markera som reglerat"-knapp till
gemensam kvittering i grupper. Det fungerar i grunden, men upplevelsen behöver
analyseras samlat innan vi lappar mer: vad betyder "reglerad" i lokal session
vs grupp, vad ska saldo-kortet visa efter arkivering, och hur tydligt är det för
debitor respektive kreditor?

## Vad

Barebones placeholder för en kommande genomgång.

Frågor att analysera:

- Vad ska saldo-kortet visa i `reglerad` historikvy? — ✅ Löst 2026-09-20, se notering.
- Ska lokal session och gruppsession ha samma språk eller olika?
- Behöver gruppflödet en tydligare "du väntar på X" / "du har bekräftat X"-vy?
- Ska autoarkivering visa en liten bekräftelse/toast när den sker?
- Ska "Reglera skuld" byta rubrik/ton när användaren själv inte kan göra något?
- Hur ska BUG-002 lösas utan att tappa historisk slutsaldo-information? — ✅ Löst 2026-09-20.

## Öppna frågor / noteringar

- 2026-09-20: Fixade BUG-002 — saldo-kortet och saldo-detaljvyns sammanfattning
  nedtonas nu till en ljus "historik"-stil med "· Slutsaldo" i undertexten när
  sessionen är reglerad, oavsett om det skedde via lokal `reglera()` eller
  grupp-autoarkivering (samma kodväg, `aktivArReglerad()`). Belopp och riktning
  (skall få/är skyldig) behålls oförändrade — det är fortfarande korrekt
  historisk information, bara framtoningen som aktiv skuld/fordran togs bort.
  Se [BUGS.md](../BUGS.md#bug-002-saldo-kortet-visar-historiskt-saldo-efter-att-sessionen-reglerats).
  Kvarstår i denna analys: samma språk/ton för lokal vs grupp, tydligare
  väntar/bekräftat-vy, ev. toast vid autoarkivering, och rubrik/ton-byte för
  debitor i gruppflödet.
- 2026-09-20: Gjorde en minimal fix i förväg — menyknappen hette "✓ Markera som
  reglerat" vilket kändes slutgiltigt trots att den bara öppnar reglera-modalen
  (den faktiska, irreversibla handlingen är knappen "Reglera" inuti modalen).
  Bytt till "⚖️ Reglera skuld" för att matcha modal-titeln och signalera att
  det öppnar en dialog, inte utför handlingen direkt. Löser inte den större
  frågan om själva bekräftelse-knappens finalitet (ingen ångra) — det hör
  fortfarande hemma i denna analys.
- Gör ingen stor fix direkt utan att först testa tvåpersoners- och trepersonersrum.
- Ta med både debitor-, kreditor- och blandad roll.
- Uppdatera `docs/tests/smoke.md` när nytt önskat beteende är bestämt.

## När levererad

Sammanfatta analysen, beslutade UX-regler och eventuell implementation. Flytta
filen till `docs/features/done/`.
