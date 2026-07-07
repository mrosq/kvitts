# 024 – Slå ihop "rum skapat" + "din identitet" till en skärm

**Status:** open
**Skapad:** 2026-07-07
**Beror på:** 019 (levererad), bygger på 018b:s identitets-/token-flöde

## Varför

Efter 019 ser skapa-rum-flödet ut så här:

1. **Skapa rum** – rumsnamn + namn + e-post → "Skapa rum →"
2. **"Klart!"** (`intro-rum-skapat`) – bekräftelse att rummet skapats,
   **rumslänk** att dela, "Kopiera länk" + "Börja lägg till utgifter →"
3. **"Du är inne som X ✓"** (`intro-min-identitet`) – återanslutnings-e-post
   (med Ändra) + **personlig länk** (`?me=token`) + "Klar →"

Steg 2 och 3 är två separata bekräftelseskärmar som kommer direkt efter
varandra och båda i praktiken säger "det gick bra, här är dina länkar". Det är
ett onödigt extra klick och delar upp två länkar (rumslänk resp. personlig
länk) som användaren rimligen vill se samtidigt precis efter att rummet
skapats.

## Vad

Slå ihop steg 2 och 3 till **en bekräftelseskärm** som visas direkt när
rummet skapats. På samma skärm:

- **Verifiering** att rummet skapats ("Klart! Rummet *X* är skapat.").
- **Rumslänk** – att dela med andra som ska gå med. Kopiera/Dela-knappar.
- **Personlig länk** (`?me=token`) – för att själv komma tillbaka på annan
  enhet. Kopiera-knapp.
- **Återanslutnings-e-post** med "Ändra"-möjlighet (som dagens min-identitet).
- En **primärknapp** in i appen ("Börja lägg till utgifter →" / "Klar →").

Detta gäller **bara skaparen** av rummet. Den som går med via länk
(`visaBekraftaJoin` → `visaMinIdentitetSkarm`) behåller sin egen
bekräftelseskärm — där finns ingen egen rumslänk att visa på samma sätt,
och det flödet rördes inte i 019.

### Teknisk konsekvens

Idag görs identitets-/token-arbetet (`hashIdentitet`,
`generateMemberToken`, `uppdateraMemberIdentitet`) i `gaInIRumEfterSkapa`,
dvs **mellan** steg 2 och 3. För att kunna visa både rumslänk och personlig
länk på en och samma skärm måste det arbetet flyttas till direkt efter att
rummet skapats (i `skapaRumOchGaIn`, efter `KvittsSupabase.skapaRum`).

Skärmen (`intro-rum-skapat`) byggs ut till att rymma båda länkarna +
e-post-raden, och `visaMinIdentitetSkarm` för skapar-fallet försvinner
(logiken flätas in i den utbyggda rum-skapat-skärmen). Primärknappen går
direkt in i appen via `gaInEfterIdentitet`-motsvarande (rensa `?me=` ur URL
och `visaApp`).

## Öppna frågor / noteringar

- **Layout:** rumslänk och personlig länk är två olika saker (dela vs.
  spara själv) — behöver tydliga etiketter så de inte förväxlas. Återanvänd
  gärna kort-stilen från dagens `intro-min-identitet`.
- **Felhantering:** om token-/identitetsanropet misslyckas efter att rummet
  skapats — visa fel men låt rummet finnas kvar (skaparen är redan medlem via
  `skapaRum`). Undvik att skapa dubbletträum vid retry.
- **Avgränsning:** join-flödets `intro-min-identitet` behålls oförändrat.
- Uppdatera ev. hänvisningar till "steg 2/3" i andra specar om det behövs.

## När levererad

**Levererad 2026-07-07.** Byggdes enligt spec:

- **`intro-rum-skapat`** byggdes om till en sammanslagen bekräftelseskärm med
  två kort: "Bjud in andra" (rumslänk + Kopiera/Dela) och ett identitetskort
  (återanslutnings-e-post med "Ändra" + personlig `?me=`-länk med kopiera).
  Primärknapp "Börja lägg till utgifter →" in i appen.
- **Token-/identitetsarbetet flyttades** från `gaInIRumEfterSkapa` till
  `skapaRumOchGaIn` (efter `skapaRum`), med retry-skydd: rummet skapas bara om
  `_rumSkapat` saknas, så ett misslyckat identitetsanrop inte ger dubbletträum.
- **`visaRumSkapat`** fyller nu rumslänk, e-post och personlig länk.
- **`gaInIRumEfterSkapa`** förenklades till att skapa sessionen + gå in i appen
  (rensar URL). Nya handlers `andraSkaparEpost` och `kopieraRumPersonligLank`.
- **Join-flödet orört:** `intro-min-identitet` / `visaMinIdentitetSkarm`
  används fortfarande bara av `bekraftaJoin`.

Verifierat i browser: skapa-rum → sammanslagen skärm med båda länkarna +
e-post → knapp skapar session och går in i appen med rensad URL. Alla 80
tester gröna.
