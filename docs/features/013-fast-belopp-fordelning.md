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

## Relaterat

- 007 för kontext om split-modalen.
- Samma behov i rum-läget (004) när det byggs.
