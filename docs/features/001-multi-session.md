# 001 – Multi-session

**Status:** open
**Skapad:** 2026-04-18

## Varför

Idag finns bara en aktiv "session" i taget — en lista över utgifter med en
person2. När en period (t.ex. en resa) är slut markerar man som reglerat, vilket
nollställer listan. Men det finns flera realistiska scenarier där man vill
*behålla* historik samtidigt som man startar nytt:

- Olika reskamrater (Spanien-resan med Anna, festivalresan med Jonas)
- Parallella sammanhang (gemensam lägenhet *och* tillfälliga resor)
- Vilja att gå tillbaka och titta på en avslutad period utan att den ligger
  som "aktiv skuld"

Just nu tvingar appen användaren att välja: behåll datan men kan inte börja
nytt, eller börja nytt och förlora historik.

## Vad

Inför konceptet **session**: ett namngivet objekt som innehåller en `person2`
och en lista `utgifter`. Användaren kan:

- Skapa en ny session (anger namn + person2)
- Växla mellan befintliga sessioner
- Byta namn på en session
- Ta bort en session
- Markera en session som "avslutad/arkiverad" (hamnar utanför default-vyn men
  finns kvar — alternativ till hård radering)

Endast **en session är aktiv åt gången** i UI:t. All befintlig funktionalitet
(lägga till utgift, redigera, reglera, spara/ladda fil) verkar på den aktiva
sessionen.

### localStorage-struktur (förslag)

```
kvitts_sessions       → [{ id, namn, skapad, arkiverad: bool }]
kvitts_session_<id>   → { person2, utgifter: [...] }
kvitts_aktiv          → <id>
```

Migrera från gammal struktur (`kvitts_person2` + `kvitts_utgifter`) vid
första uppstart efter feature-deploy: skapa en session med defaultnamn
("Min lista" eller liknande), flytta in datan, ta bort de gamla nycklarna.

### Spara/ladda i ny värld

- **Spara fil** = aktuell session som JSON (precis som idag, men med
  `namn`-fältet inkluderat). Format `version: 2`.
- **Ladda fil** = importera som **ny session** (inte längre överskriva).
  Bakåtkompatibilitet: om filen är `version: 1` (gamla formatet) → skapa
  session med defaultnamn typ "Importerad <datum>".

## Öppna frågor / noteringar

- **UI för att växla session:** Dropdown i headern? Hamburger-meny?
  Egen "sessionsväljare"-skärm? Behöver designas — börja enkelt (dropdown
  räcker långt) och iterera.
- **person2 per session vs globalt:** Per session — gör det möjligt att ha
  olika reskamrater. Setup-skärmen för förstagångsanvändare blir skapelse av
  första sessionen.
- **Mikael (person1):** Fortfarande hårdkodat? För nu: ja. Multi-user generellt
  ligger utanför denna feature.
- **Vad är "Markera som reglerat" i denna värld?** Fortsätter nollställa den
  aktiva sessionens utgifter (saldot går till noll). Sessionen finns kvar.
  Eventuellt: visa en notis om att en arkiveringsknapp finns om man inte vill
  ha sessionen kvar längre.
- **Avgränsning:** Ingen synk mellan enheter, ingen molnlagring — fortfarande
  rent localStorage. Filöverföring (spara/ladda) är fortsatt vägen att flytta
  enskilda sessioner mellan enheter.
