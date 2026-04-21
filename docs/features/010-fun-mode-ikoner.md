# 010 – Fun mode: ikon-input istället för beskrivning

**Status:** open
**Skapad:** 2026-04-19

## Varför

Appen byggs för ett kompisgäng som reser ihop och snabbt vill slänga in utlägg
morgonen efter (eller i baren, när tummen är trög). Att skriva "Pizza + öl på
Kvarterskrogen" är friktion. Samtidigt ska det vara lite kul — en egen grej
som inte finns i Splitwise et al. Typ "den som vet den vet".

Lösningen: ett **fun mode** där beskrivningsfältet ersätts med ett rutnät av
ikoner som kan kombineras till en liten bildsekvens. Snabbare input + inbyggd
humor när man scrollar historiken i efterhand.

## Vad

**Bas-ikoner (6–10 st som täcker ~allt på en resa):**

Förslag att landa när det byggs — men tanken är att täcka mat, dryck, transport,
nöje, boende, shopping:

- 🍺 öl / bar
- 🍔 mat
- ☕ fika
- 🚕 taxi / transport
- 💃 uteställe / klubb
- 🎢 aktivitet / äventyr
- 🏨 boende
- 🛒 shopping / mack
- 🌙 sent / efterfest (modifierare)

Exakta ikoner bestäms i implementation. Håll listan kort — 8 ± 2.

**Kombinerbara:** en utgift kan få 1–3 ikoner i följd. "🍺💃🌙" = klubbkväll.
"🍔🍺" = middag med bira. Spara som array av ikon-nycklar i datamodellen, rendera
som sekvens i historiken.

**Toggla läge:** `kvitts_fun_mode` i localStorage (boolean). Togglas via menyn
från [009](009-meny.md) — t.ex. "Fun mode: på/av". När på döljs
text-beskrivningsfältet och ikon-gridden visas istället. När av: som idag.

**Datumväljaren:** lämna som den är tills vidare. (Diskuterat att ersätta med
"idag/igår/förrgår"-knappar, men det är en separat fråga.)

**Beloppet:** blir kvar som vanligt inmatningsfält i v1. Något "roligt" för
belopp är en öppen idé (se nedan) men blockerar inte featuren.

## Datamodell

Utgifts-objektet får ett nytt fält:

```js
{
  ...,
  beskrivning: "",          // tom sträng när fun mode användes
  ikoner: ["öl", "klubb"],  // array av nyckel-strängar, 1–3 element
}
```

Gamla utgifter utan `ikoner`-fält renderas som idag (text). Nya i fun mode
renderas som ikon-sekvens. Ingen migration behövs — båda formaten lever ihop.

## Öppna frågor / noteringar

- **Ikon-val:** finns det en ikon-modifierare ("🌙 = sent/dyrt") eller är alla
  likvärdiga? Enklast att börja med att alla är likvärdiga.
- **Belopps-grej:** spåna vidare. Idéer:
  - Snabb-knappar för vanliga belopp (50, 100, 200, 500).
  - "Runda upp till närmaste 10" som default-knapp.
  - Lämnas öppet — tas in som egen liten förbättring om det känns rätt senare.
- **Per-rum vs global:** nu är det en global toggle. När [004](004-multi-user-rum.md)
  byggs kan det övervägas att sättas per rum i setup-flödet ("Vill ni köra fun
  mode i det här rummet?"). Inte blockerande.
- **Avgränsning:** ingen sökning på ikoner, ingen statistik per ikontyp i v1.
  Bara input + render i historiken.
- **Tillgänglighet:** varje ikon behöver en label (alt/title) för skärmläsare
  och för att det ska fungera när någon är nykter och sökande.

## När levererad

Lägg till en kort sammanfattning av vad som faktiskt byggdes (kan skilja från
ursprunglig spec) och flytta filen till `docs/features/done/`.
