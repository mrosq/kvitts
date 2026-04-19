# 003 – Byt localStorage-prefix till `kvitts_`

**Status:** open
**Skapad:** 2026-04-19

## Varför

`localStorage`-nycklarna i `index.html` använder prefixet från en tidigare
iteration av appens namn, inte det aktuella namnet. Det är en kosmetisk
inkonsekvens — ingen användare ser det — men:

- Det skapar förvirring i kod och dokumentation (varför nämner vi ett annat
  appnamn här?).
- Det smittar nya specs och CLAUDE.md som måste referera till de faktiska
  nyckelnamnen för att vara korrekta.
- Ju längre vi väntar, desto mer data finns att migrera och desto fler
  filer hänvisar till det gamla namnet.

Bättre att städa nu medan datamodellen är liten och åtkallningarna är få
(5 ställen i `index.html`, 3 rader i `CLAUDE.md`).

## Vad

### 1. Byt nycklarna i koden

I `index.html`, ersätt:

| Före              | Efter           |
|-------------------|-----------------|
| `splitwise_person2`   | `kvitts_person2`    |
| `splitwise_utgifter`  | `kvitts_utgifter`   |

Påverkar 5 förekomster (`init`, `sparaSetup`, `laddaFil`, `spara`).

### 2. Lägg till engångsmigration vid uppstart

I `init()`, innan vi läser de nya nycklarna: läs gamla nycklar, kopiera till
nya, ta bort gamla. Idempotent — kör bara om gamla nycklar finns och nya
saknas. Något i stil med:

```js
function migreraGamlaNycklar() {
  const gammalP2 = localStorage.getItem("splitwise_person2");
  if (gammalP2 && !localStorage.getItem("kvitts_person2")) {
    localStorage.setItem("kvitts_person2", gammalP2);
    const gammalUtg = localStorage.getItem("splitwise_utgifter");
    if (gammalUtg) localStorage.setItem("kvitts_utgifter", gammalUtg);
    localStorage.removeItem("splitwise_person2");
    localStorage.removeItem("splitwise_utgifter");
  }
}
```

Migrationen är säker att lämna kvar i koden för all framtid (kostar inget
efter första körningen) men kan också tas bort efter några veckor när vi
vet att alla enheter har kört nya versionen minst en gång.

### 3. Uppdatera CLAUDE.md

Avsnittet om datamodell (`## Datamodell`):
- Byt nyckelnamnen från `splitwise_*` till `kvitts_*`
- Ta bort meningen "namnen är legacy — appen hette först 'splitwise'" — den
  är inte längre sann och dessutom var min ursprungliga formulering en
  gissning, inte verifierat faktum

### 4. Övriga referenser

- `docs/features/001-multi-session.md` nämner gamla nycklar i sin
  migrations-paragraf. Uppdatera så den utgår från `kvitts_*` som
  startpunkt istället.
- `docs/features/done/000-json-save-load.md` är arkiverad — låt den vara,
  den dokumenterar tillståndet vid leverans.
- README.md innehåller inga referenser idag — inget att göra.

## Öppna frågor / noteringar

- **Verifiering:** Efter ändring, testa explicit att en befintlig
  `splitwise_*`-uppsättning i `localStorage` migreras korrekt vid första
  laddning av nya versionen (t.ex. genom att i devtools sätta
  `splitwise_person2: "Test"` + `splitwise_utgifter: "[]"`, ladda om, och
  kontrollera att `kvitts_*` nu finns och de gamla är borta).
- **Kollision med 001:** Ingen — 001 utgår ändå från att den ärver befintlig
  data och migrerar vidare till sin nya struktur. Om 003 är gjord först,
  startar 001 bara från `kvitts_*` istället för `splitwise_*`. Specen för
  001 uppdateras i steg 4 ovan så den är konsekvent.
- **Ingen test-täckning idag:** Migrationen är ren localStorage-pillande och
  testas inte av befintliga `logic.test.js` (de testar pure functions).
  Manuell verifiering enligt ovan räcker för den här ändringen.
