# 013 – Fast beloppsfördelning

**Status:** open
**Skapad:** 2026-04-21

## Varför

007 byggde "egna belopp"-läget där man anger vad varje person betalar för sig
och *resten* fördelas lika. Det täcker det vanligaste fallet.

Men ibland är den totala utgiften *summan av individernas faktiska kostnader* —
t.ex. en restaurangräkning där varje person betalat exakt sin rätt. Ingen
"rest" ska fördelas: varje persons andel är precis det angivna beloppet, och
summan av alla andelar = totalt belopp.

Exempel: Mikael 240 kr · Anna 180 kr · Erik 0 kr → totalt 420 kr. Ingen
ytterligare uppdelning.

## Vad

Ett tredje läge i steg 2 av split-modalen (bredvid befintliga "Egna belopp"):

**Knapp: "Exakta belopp"** — ersätter eller kompletterar "Egna belopp →" i
steg 1-vyn.

### Alternativ A – separat knapp i steg 1
Steg 1 får två sekundärval:
- `Egna belopp →` (befintlig logik, rest delas)
- `Exakta belopp →` (nytt läge)

### Alternativ B – toggle i steg 2
Steg 2 behåller sin vy men får ett litet toggle-val högst upp:
- `Egna (rest delas)` | `Exakta (ingen rest)`

Fördelen med B är att UI:t förblir enkelt; nackdelen är att det kräver att
användaren förstår skillnaden.

**Rekommendation:** Alternativ A, men besluta när det byggs.

### Beteende i "Exakta belopp"-läget

- Inputfälten är desamma som i "Egna belopp" (ett per vald person).
- Beloppsfältet i formuläret behöver *inte* fyllas i manuellt — det kan
  räknas ut automatiskt som Σ angiven andel och fyllas i/uppdateras live.
  Alternativt kräver vi att användaren fyller i totalt belopp separat och
  validerar att Σ = totalt (tolerans 0,01 kr).
- Validering: Σ andelar måste = totalt belopp (tolerans 0,001 kr). Annars
  blockeras spara med ett tydligt felmeddelande.
- `fordelning`-kartan innehåller exakt de angivna beloppen, inga
  beräkningar ovanpå.

### Datamodell

Nytt `splitTyp`-värde: `"exakt"`.

```js
{
  splitTyp: "exakt",
  inkluderade: ["p1", "p2"],
  egnaBelopp: { p1: 240, p2: 180 },  // återanvänds, men nu är dessa exakta andelar
  fordelning: { p1: 240, p2: 180 },  // inga tillägg
}
```

### logic.js

`raknaDel` behöver ett nytt `typ`-värde `"exakt"`:

```js
if (typ === "exakt") {
  let summa = 0;
  const fordelning = {};
  for (const id of deltagare) {
    const v = egna[id] || 0;
    fordelning[id] = v;
    summa += v;
  }
  if (Math.abs(summa - belopp) > 0.001) return null;
  return fordelning;
}
```

## Öppna frågor

- Auto-summa av totalt belopp eller manuellt? Auto är smidigare men bryter
  mot att belopp alltid fylls i först i nuvarande flöde.
- Ska beloppsfältet i formuläret låsas/gråas ut när läget är "exakt" och
  auto-summering aktiveras?
- Knapptext i split-knappen: "Exakta belopp"? Eller nåt kortare?

## När levererad

Levererad 2026-07-15. Implementerad utan nytt läge eller toggle — befintliga
"egna belopp"-steget täcker båda fallen implicit:

- **Extras-fallet** (Robbans tröja): fyll i totalen först, lägg till extras i
  steg 2. Infotext visar "Resten X kr delas lika".
- **Exakt-fallet** (alla beställde olika): lämna beloppsfältet tomt, fyll i
  individuella belopp i steg 2. Beloppsfältet auto-uppdateras med summan,
  infotext visar "Exakt fördelning ✓".

`egnaInfoText` i logic.js fick ett rest ≈ 0-fall ("Exakt fördelning ✓").
`visaSplitSteg2` sätter flaggan `_autoTotalLage`; `uppdateraSplitEgnaInfo`
skriver tillbaka summan till beloppsfältet när flaggan är satt.
Steg 2-subtiteln är nu dynamisk beroende på läge.


## Beslut & förtydligande (2026-07-15)

### Beslut: Alternativ B (toggle i steg 2), inte eget läge

`"exakt"` ligger så nära befintliga `"egna"` att ett helt tredje läge är
onödig komplexitet. I `"egna"`-läget gäller redan att om delbeloppen summerar
till totalen så blir `fordelning` exakt dessa belopp (resten som delas = 0).
Skillnaden mot `"exakt"` är i praktiken bara två saker: (1) totalen härleds ur
delbeloppen istället för att fyllas i separat, och (2) ingen rest tillåts.

Därför byggs det som en **toggle högst upp i steg 2**:
`Egna (rest delas)` | `Exakta (ingen rest)`. Mindre kod, en input-vy att
underhålla, och ingen ny begreppsapparat för användaren.

### Förtydligande av öppen fråga 1: auto-summa vs manuell total

Detta är feature-ens verkliga knäckfråga, inte `raknaDel`. Appen är idag byggd
kring att **beloppet fylls i först** och driver allt annat: `laggTillUtgift`
sätter `harBelopp = bel > 0` och hoppar helt över fördelningen om belopp saknas,
och split-modalens steg 2 läser `belopp`-fältet för sin validering. `"exakt"`
med auto-summa **vänder på detta** — totalen blir en konsekvens av delbeloppen.
Det är den ändringen som kostar, inte logiken.

De två vägarna:

- **Manuell total (fits nuvarande flöde):** användaren fyller i totalt belopp
  som vanligt, matar in exakta andelar, och vi validerar `Σ andelar = totalt`
  (tolerans 0,001). `raknaDel`-valideringen har då ett syfte. Nackdel: dubbel
  inmatning (både total *och* alla delar) → mer att skriva och lätt att få
  "beloppen stämmer inte"-fel.
- **Auto-summa (bättre UX, mer jobb):** totalfältet räknas ut live som Σ delar
  och gråas ut/låses. Ingen dubbelinmatning, och `Σ = totalt` är sant per
  konstruktion → `raknaDel`-valideringen blir i praktiken meningslös (kan aldrig
  slå till). Kräver att formulärflödet inte längre kräver manuellt ifyllt
  belopp: `belopp`-fältet måste beräknas och skrivas tillbaka, och `laggTillUtgift`/
  `sparaEdit` måste acceptera att belopp kommer från summan istället för fältet.

**Rekommendation:** auto-summa. Det är hela poängen med läget (slippa räkna ihop
restaurangnotan själv) och tar bort en hel klass av valideringsfel. Priset är
att "belopp-först"-antagandet i formuläret måste luckras upp — avgränsa noga så
att `"jamnt"`/`"delmangd"`/`"egna"` beter sig exakt som förut.

Kvarstående småfrågor att lösa vid bygge: hur en utgift *utan* belopp ("– kr")
samspelar med exakt-läget (troligen: exakt kräver minst ett delbelopp > 0), och
knapptexten på toggeln.
