# 031 – Historik grupperad per dag

**Status:** open
**Skapad:** 2026-07-15

## Varför

Med 4–5 personer och dagliga utlägg växer historiklistan snabbt till många
tiotal rader. Scrollandet blir betungande och det är svårt att orientera sig.

## Vad

Historiken renderas per dag istället för som en flat lista. Varje dag får en
klickbar rubrik; idag och igår startar expanderade, äldre dagar kollapsade.

```
▼ Idag  (3 utgifter)
  [utgifter]

▼ Igår  (2 utgifter)
  [utgifter]

▶ Tisdag 14 jul  (8 utgifter)   ← kollapsad, klicka för att öppna
```

Tillståndet (vilka dagar är kollapsade) lever i ett `Set` i minnet — ingen
localStorage, nollställs vid sidladdning. Det räcker; man vill sällan minnas
att "tisdagen var stängd".

## Implementering

- Ny renderingsfunktion som grupperar `sorterade` per `datum`-sträng.
- Dagrubrik: "Idag", "Igår", annars kortformat (`"Måndag 14 jul"`).
- Klick på rubrik togglar kollaps och renderar om den gruppen.
- Befintlig `oppnaDetaljer`-logik, CSS och `esc`-hjälpare återanvänds rakt av.
- Inga ändringar i logic.js, supabase.js eller datamodellen.

## När levererad

Sammanfatta och flytta till `docs/features/done/`.
