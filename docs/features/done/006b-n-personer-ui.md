# 006b – N>2 personer i UI

**Status:** done
**Skapad:** 2026-04-19
**Del av:** 006 (multi-person i lokalt läge), slutsteg.
**Beroende:** 006a (datamodell + `logic.js`). Rekommenderat: 006c (saldo-UI)
levereras först, annars måste 006b hantera minimal N>2-saldorendering själv.

## Varför

Slutsteget som faktiskt låter användaren lägga in fler än en annan person
och registrera utgifter över 2–8 deltagare. All risk har lyfts ur via
006a:s fundament; 006b är främst UI-arbete ovanpå ett stabilt skikt.

## Vad

### Setup-flödet (ändring av 002:s skärm 3a)

Idag: ett textfält för person2:s namn.

Ny utformning:
- Rubrik: "Vem delar du utgifter med, [person1]?"
- Vertikal lista av textfält, ett per annan person.
- Initialt syns **ett** tomt fält + en liten **+**-knapp till höger/under.
- Klick på **+** lägger till ytterligare tomt fält. Går disabled vid 8
  personer totalt (inkl. användaren).
- Inga borttagnings- eller flytt-kontroller. Tomma fält ignoreras vid
  "Klar"-klick.
- "Klar"-knappen aktiveras när minst *ett* annat namn är ifyllt.
- Trim av whitespace; tomma fält droppas; dubbletter accepteras.

Vid "Klar" skrivs `kvitts_personer` och `kvitts_person_mig = "p1"`.

### Ny utgift

- **Betalare-dropdown:** listar alla personer i `kvitts_personer`.
  `p1-option`/`p2-option`-id:na i nuvarande `index.html` ersätts av
  dynamiskt genererade `<option>`-element vid `visaApp()`. Default = `migId`.
- **Split-radiobuttons:**
  - "Jämnt fördelat" (default) — alla deltagare, lika andelar.
  - "Egna kostnader" — se nedan.
- **"Egna kostnader"-UI:**
  - N=2: oförändrat (två namngivna fält).
  - N>2: ett textfält per person, stackade vertikalt. Etikett "[namn]s egna
    (kr)" per rad. Tar mer vertikal plats — acceptabelt i v1. Om det blir
    outhärdligt flyttas hela blocket till egen modal.
  - Infotext ("Delas: X kr ÷ N = Y kr var") uppdateras från generaliserade
    `egnaInfoText`.

### Edit-modal

Samma generaliseringar som ny-utgift-formuläret:
- Betalare-dropdown med alla deltagare.
- Split-UI generaliserat.
- Validering oförändrad men mot ny `raknaDel`-signatur.

### Historiklistan

- "Betalt av X"-badge läser namn från `kvitts_personer` baserat på
  `betalare_id`.
- Detaljrad (nuvarande "p1: X kr · p2: Y kr") generaliseras till en lista
  över alla id:n i `fordelning` med andel > 0. Visas som
  "[namn]: X kr · [namn]: Y kr · ..." på en rad; radbrytning accepteras
  för långa listor.

### Reglera-modal

Dagens modal visar "X betalar Y Z kr" baserat på totala saldot. Med N>2 blir
det en *lista*:
- En rad per icke-jämnt par där användaren är inblandad, från
  `raknaParSaldon`.
- Ingen settle-up-optimering i v1 (se 004:s motsvarande avgränsning).

### Saldo-kortet

Om 006c är levererat: använd det direkt, fungerar out-of-the-box.

Om 006b kommer först: minimal fallback — behåll nuvarande stora siffra,
men generalisera texten:
- N=2: nuvarande "[X] är skyldig [Y] Z kr".
- N>2: "Du skall få Z kr" / "Du är skyldig Z kr" (endast användarens netto).

Detaljerad parvis vy kommer då med 006c.

### Tak

- Min 2 deltagare (användaren + minst en). Max 8.
- Dubblerade namn accepteras.
- Tomma namn tillåts inte.

## Öppna frågor / noteringar

- **"+"-knappens placering:** bredvid senaste tomma fältet, under sista
  fältet, eller som fristående rad? Testa visuellt — ska vara uppenbar men
  inte dominerande.
- **Ordning på deltagare:** Bevara insättningsordning (användaren först,
  sedan tilläggen i den ordning de lades in). Alfabetiskt = inte nu; gör
  insättning/läsning förutsägbar.
- **Edit av personnamn efter start:** Inte i scope. Vill man ändra → rensa
  data. Kan tas som egen feature senare.
- **Dynamiska `<option>` vs statiska HTML:** Gå för dynamiska i
  `visaApp()` — samma mönster som `p2-option.textContent = person2` idag,
  bara generaliserat.
- **"Egna kostnader" för N>2 visuellt:** Stackade fält är fult men
  funktionellt. Om *mycket* dåligt i praktiken → flyttas till separat modal.
  007 (komplexa fördelningar) kommer sannolikt ersätta hela detta block
  med rikare UI.

### Avgränsningar i 006b

- Ingen möjlighet att lägga till/ta bort personer *efter* setup.
- Ingen delmängd-split ("bara 4 av 6 var med") — se 007.
- Inga asymmetriska andelar utöver "egna"-paradigmet — se 007.
- Ingen settle-up-algoritm.

## När levererad

*(Fylls i efter leverans.)*
