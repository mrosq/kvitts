# 011 – Story stripe: sessioner som visuell grupp i detaljvyn

**Status:** open
**Skapad:** 2026-04-19

## Varför

När man scrollar utgiftshistoriken på en resa är varje rad isolerad — men i
verkligheten hänger utläggen ihop i "kvällar" eller "dagar". "Fredag kväll"
= middag + bar + taxi hem. Att se dem grupperade skulle både göra summeringen
läsbar (*vad kostade fredagen egentligen?*) och kännas som en liten story
från resan när man bläddrar i efterhand.

Beroende-tråd: kopplar bra till [010](010-fun-mode-ikoner.md) — ikon-sekvenser
per rad blir en visuell "story stripe" när de staplas under ett sessions-headline.

## Vad

En **session-grupperad detaljvy** för utgifter — antingen som default-rendering
av historiken eller som en togglebar vy ("Lista" / "Story").

**Auto-gruppering baserat på datum:**
- Alla utgifter samma datum grupperas under en header.
- Header visar datum + summa för dagen + ev. vem som betalade mest den dagen.
- Inuti headern: utgifterna i kronologisk ordning (eller insert-ordning).

**Visuellt — story stripe:**
- Varje rad som en liten "kort" — när fun mode är på (010) blir ikon-sekvensen
  mini-storyn. När det är av visas beskrivningen som idag.
- Radens kort ligger nära varann vertikalt inom en session, med en tydligare
  separator mellan sessioner.
- Sessionen får ev. ett "titelförslag" baserat på dominerande ikoner:
  "🍺💃 Klubbkväll", "🏨🍔 Ankomstdagen" — lite kul, inget krav.

**Interaktion:**
- Klick på en session kan visa en summering: totalsumma, per-person-utlägg den
  dagen, vem som är "kvällens kung" (mest utlägg).
- Klick på enskild utgift: som idag (redigera/ta bort).

## Öppna frågor / noteringar

- **Gruppering bara på datum, eller mer?** Datum räcker sannolikt. Explicit
  session-koncept (användaren skapar en session) är överkurs i v1.
- **Vy-toggle:** klassisk lista *eller* story-vy, eller ersätter story-vyn helt
  den nuvarande listan? Enklast: story-vy blir default, ingen toggle. Utvärdera.
- **Titelförslag på session:** kul men kan kännas generiskt snabbt. Börja utan,
  lägg till om det känns rätt.
- **Beroenden:**
  - Funkar som bäst tillsammans med [010](010-fun-mode-ikoner.md), men
    fungerar också med text-beskrivningar.
  - [012](012-ranking-forlorare.md) delar ton och kan dela komponenter
    (kvällens kung = dagens ranking).
- **Avgränsning:** inget export-format, ingen "dela story" som bild. Bara
  rendering i appen.

## När levererad

Lägg till en kort sammanfattning av vad som faktiskt byggdes (kan skilja från
ursprunglig spec) och flytta filen till `docs/features/done/`.
