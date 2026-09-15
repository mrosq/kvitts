# 034 – Säkrare JSON-import och rendering

**Status:** open
**Skapad:** 2026-07-17
**Relaterat:** 000 (JSON save/load), 005 (bryt ut script), 030 (localStorage-separation)

## Varför

Importerad JSON används nästan direkt som app-state. Det är praktiskt, men gör
att trasiga eller illvilliga filer kan skapa konstiga UI-lägen. Vissa värden
hamnar dessutom i HTML-strängar och inline-handlers, där vanlig text-escaping
inte räcker.

Målet är inte att bygga ett stort säkerhetslager, utan att göra importen robust
och rendering mindre känslig.

## Vad

### Importvalidering

Lägg en liten validerings-/normaliseringsfunktion nära importlogiken, helst ren
nog att kunna testas:

- acceptera bara förväntad form för `personer`
- säkerställ att person-id:n är strängar i ett tryggt format
- säkerställ att namn är strängar och trimmas/maxlängdbegränsas
- säkerställ att `utgifter` är array
- normalisera varje utgift via `migreraUtgift`
- validera/minimera fält: `id`, `beskrivning`, `belopp`, `betalare_id`,
  `fordelning`, `datum`, `splitTyp`, `inkluderade`, `egnaBelopp`
- välj fallback eller avvisa filen med tydligt fel när datan inte går att lita på

### Rendering

Minska beroendet av inline-handlers med importerad data i HTML-strängar.

Prioritet:

1. Historikrader: undvik `onclick="oppnaDetaljer('${u.id}')"` och bind istället
   via `data-id` + event delegation eller skapade DOM-noder.
2. Daggrupper: undvik inline `togglaHistorikDag('${g.datum}')` på importerade
   datumsträngar.
3. Gå igenom övriga `innerHTML`-platser där data från fil/backend renderas.

`esc()` kan gärna ersättas eller kompletteras med helpers för:

- text node
- attributvärde
- data-attribut

Men föredra DOM-API framför att bygga komplex HTML med strängar.

## Tester

Lägg tester för ren importvalidering:

- giltig v2-export accepteras
- gammalt 2-personersformat accepteras
- saknade/trasiga personer avvisas eller normaliseras
- farliga id/datum/beskrivningar bryter inte rendering
- okänt extra metadata ignoreras

Manuell verifiering:

- importera en normal sparad fil
- importera en gammal fil
- importera en med trasiga fält och kontrollera begripligt fel

## Öppna frågor / noteringar

- Ska ogiltiga rader droppas, eller ska hela filen avvisas? För backup/import är
  hel avvisning oftast tydligare.
- Behöver exportformatet få en striktare `version` och dokumenteras kort?

## När levererad

Sammanfatta vad som valideras, vad som avvisas och vilka renderingar som inte
längre använder inline-handlers. Flytta filen till `docs/features/done/`.
