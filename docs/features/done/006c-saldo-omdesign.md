# 006c – Saldo-UI-omdesign

**Status:** done
**Skapad:** 2026-04-19
**Del av:** 006 (multi-person i lokalt läge), UI-bas för fler personer.
**Beroende:** 006a (behöver `raknaUtSaldo` och `raknaParSaldon`).

## Varför

Nuvarande saldo-kort tar mycket vertikal plats med sin stora siffra och
"X är skyldig Y Z kr"-text. Samtidigt funkar texten inte längre när appen
senare stödjer N>2 (en enda mening räcker inte).

Designa om så att kortet:
1. Är kompaktare.
2. Pratar med **användaren** ("Du skall få" / "Du är skyldig") — namnet
   på motparten är redundant när jag redan vet vem jag delar med, och när
   det är flera personer är det inte ett namn.
3. Har en tydlig "dig djupare"-väg via klick → en detalj-popup med rad
   per annan deltagare.

Funkar för N=2 direkt, så den kan levereras oberoende av 006b. Bra
skarp kandidat för att rulla ut tidigt.

## Vad

### Huvudsaldo-kort

- Beräkna `netto = raknaUtSaldo(utgifter, personer)[migId]`.
- Rubriktext:
  - `netto > 0` → **"Du skall få"**
  - `netto < 0` → **"Du är skyldig"**
  - `|netto| < 0.01` → **"Jämnt"** (ingen siffra, eller "0 kr" dämpad)
- Siffran görs mindre än idag. Exakt storlek finslipas visuellt — riktmärke
  ~60–70 % av nuvarande `font-size`.
- Motpartens namn visas **inte** i själva kortet.
- Hela kortet är klickbart. Hover/touch-feedback (cursor, lätt skugga eller
  bakgrundstonad).

### Detalj-popup/modal

Öppnas vid klick på saldo-kortet. Innehåll:

- **Rubrik:** "Saldo" (eller liknande).
- **En rad per annan deltagare**, baserat på `raknaParSaldon(utgifter, migId)`:
  - Netto > 0 (de skyldig mig): "**Anna** skall betala dig **240 kr**"
  - Netto < 0 (jag skyldig dem): "Du är skyldig **Erik** **80 kr**"
  - |netto| ≈ 0: "**Kalle**: jämnt" (dämpad stil)
- **Stäng**-knapp.

Ingen settle-up-algoritm i v1 — rå parvis vy. Användaren (appbäraren) kvittar
manuellt baserat på listan.

### Reglera-modal (befintlig)

Nuvarande "Reglera saldo"-modal påverkas inte av 006c och kan lämnas orörd.
Den fortsätter använda det 2-personers-parvisa saldot `raknaParSaldon` ger
(vilket för N=2 = det totala saldot).

### Samverkan med 006b

006b (N>2 i UI) återanvänder båda delarna: samma huvud-kort, samma detalj-
popup — listan i popupen växer bara med fler rader när det finns fler
deltagare. Ingen kod-ändring i 006b för saldo-delen utöver att den fungerar
out-of-the-box.

## Öppna frågor / noteringar

- **"Jämnt"-formuleringen:** Kanske "Du är kvitt" eller bara ingen text
  alls + en diskret bock. Testa visuellt.
- **Popup vs modal vs inline-expansion:** Modal (samma mönster som nuvarande
  reglera-modal) är sannolikt rätt. Alternativet inline-expansion (kortet
  växer) kan prövas om modalkänslan bryter flowet.
- **Klick vs hover:** Touch-first app — förlita sig på klick. Hover kan ge
  extra cursor/feedback men ska inte krävas.
- **Beroende uppåt:** 006b drar nytta av men är inte blockerat av 006c;
  beroendet är bara att saldo-UI:t ska funka för N>2 — om 006b kommer först
  får den själv lösa en minimal rendering.

### Avgränsningar

- Ingen settle-up-algoritm.
- Ingen historik över redan-reglerade skulder.
- Påverkar inte reglera-modalen (separat feature vid behov).

## När levererad

*(Fylls i efter leverans.)*
