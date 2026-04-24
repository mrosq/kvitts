# 008 – Minimera överföringar vid uppgörelse

**Status:** open
**Skapad:** 2026-04-19

## Varför

När fler än två personer delar utgifter uppstår ett nät av parvisa skulder. Det
naiva sättet att reglera (var och en betalar varje person de är skyldiga) kräver
fler banköverföringar än nödvändigt. Med N personer räcker det alltid med max
N−1 överföringar för att nolla alla saldon — i praktiken ofta betydligt färre.

### Verklig användning

Fram till uppgörelsedagen tenderar varje person att naturligt minska sin
nettoskuld genom att ta nästa stora nota. Det är bra, och appen behöver inte
styra det. Det _sista steget_ — den faktiska uppgörelsen — är däremot ett
tillfälle att presentera en optimerad betalningsplan som minimerar antalet
banköverföringar. Det är den punkten den här featuren adresserar.

### Exempelscenario (3 personer)

Naiv parvisa vy (3 överföringar):
- Person 2 → Mig: 100 kr
- Person 3 → Mig: 150 kr
- Person 3 → Person 2: 50 kr

Nettosaldon: Mig +250 kr, Person 2 −50 kr, Person 3 −200 kr.

Optimerat (2 överföringar):
- Person 2 → Mig: 50 kr
- Person 3 → Mig: 200 kr

## Vad

### Algoritm

"Minimum cash flow"-greedy på nettosaldon:

1. Beräkna nettosaldo per person via `raknaUtSaldo`.
2. Dela upp i kreditorer (netto > 0) och debitorer (netto < 0), sorterade på
   absolutbelopp (störst först).
3. Matcha störste debitor mot störste kreditor:
   - Betalning = min(|debitor|, kreditor).
   - Justera saldon. Ta bort parter som nollat ut.
   - Repetera tills alla är noll.
4. Returnera lista av `{ från, till, belopp }`.

Ger alltid ≤ N−1 överföringar. Är inte garanterat globalt optimal i alla
topologier men är enkel, förutsägbar och tillräckligt bra för ≤ 8 personer.

Implementeras som en ren funktion `minimeradeOverforingar(utgifter, personer)`
i `logic.js`. Enhetstestas separat.

### UI — ny vy i reglera-modalen

Dagens "Reglera"-modal visar rå parvisa saldon. Den ersätts med:

**Steg 1 — välj betalningsplan** (ny rubrik: "Hur vill ni reglera?")

Två alternativ som knappar/toggle:
- **Minimera överföringar** (default när N > 2) — visar den optimerade listan.
- **Parvisa saldon** — visar nuvarande råa vy (behåll som escape-hatch).

För N = 2 finns bara ett par och ingen optimering behövs; hoppa direkt till
bekräftelsesteget som idag.

**Listan** (oavsett vilket alternativ):
- En rad per överföring: "Person 2 betalar **dig** 50 kr" / "Person 3 betalar
  **dig** 200 kr" (namnet "dig" när mottagaren är migId, annars personens namn).
- Ingen interaktivitet — bara en läslista att följa manuellt.

**Steg 2 — bekräfta** (oförändrat)
- "Bekräfta för att reglera?" + Reglera-knapp som nollställer utgiftslistan.

### Saldo-detalj-modalen (klick på saldo-kortet)

Lägg till en diskret "Minimera"-länk eller knapp längst ned i detaljvyn som
öppnar reglera-modalen direkt på optimerade listan. Gör uppgörelseresan
smidigare: Se detalj → tryck "Minimera" → följ planen → bekräfta.

## Öppna frågor / noteringar

- **Algoritm-alternativ:** Greedy matchar störst-mot-störst och ger bra
  resultat i praktiken för ≤ 8 personer. Ett exakt ILP-angreppssätt är
  teoretiskt bättre men overkill här — greedy räcker.
- **Framtida brainstorm (utanför scope):** Hur gör man uppgörelsemomentet
  riktigt bra? Tänkbara riktningar att utforska: (a) "smart avrundning" —
  förslag på runda belopp som minimerar fel, (b) koppling till Swish-länk
  (swish://payment?...), (c) en "bocka av"-vy där varje överföring kan markeras
  klar innan hela gruppen regleras, (d) delreglering (reglera bara en delmängd
  av skulder).
- **N = 2:** Ingen förändring av nuvarande flöde.
- **Beroenden:** Kräver 006a (raknaUtSaldo), 006b (N-personers state).
  Saldo-detalj-länken kräver 006c.

## När levererad

Levererad 2026-04-24. Implementerades exakt som specad:

- `minimeradeOverforingar(utgifter, personer)` i `logic.js` — greedy min-cash-flow på nettosaldon från `raknaUtSaldo`, returnerar `{fran, till, belopp}[]`.
- Reglera-modalen utökades med toggle "Minimera överföringar" / "Parvisa saldon" (default Minimera vid N>2, ingen toggle vid N=2). Nollfall visar bara bekräftelstext.
- Saldo-detalj-modalen fick en diskret "Minimera överföringar →"-länk som hoppar direkt till optimerade läget (synlig bara vid N>2 med obalans).
- 7 nya enhetstester i `logic.test.js`, alla gröna (60/60 totalt).
