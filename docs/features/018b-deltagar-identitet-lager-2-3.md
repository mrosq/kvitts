# 018b – Stabil deltagar-identitet, lager 2 + 3 (identifierare + personlig länk)

**Status:** open
**Skapad:** 2026-05-21
**Beror på:** [018a](done/018a-deltagar-identitet-lager-1.md) (levererad)
**Relaterat:** 017 (gemensam reglering), 016 (Swish-trigger)

## Varför

018a (localStorage per rum) täcker bara återbesök på samma enhet/browser
där localStorage är intakt. I praktiken är det ett konstruerat fall —
verkliga användare raderar inte sin egen session från menyn. De *verkliga*
BUG-001-fallen är:

- **Tömd localStorage** (browser-cleanup, cache-rensning)
- **Incognito-flik** — ingen localStorage-persistens alls
- **Ny enhet** — t.ex. mobil → laptop, eller delad familjedator

I de fallen skapas idag en ny deltagare. För 017 (gemensam reglering)
betyder det att "Reglerat ✓" landar på gamla member-id:t medan nya
member-id:t ser "Väntar…" för evigt.

Slutsatsen: **utan 018b är 017 inte meningsfullt att bygga.** 018a räddade
nästan inget i praktiken.

Samtidigt vill vi inte bygga inloggning/kontohantering — appens hela poäng
är låg friktion, inga lösenord, ingen mailtjänst att drifta.

## Vad

Två kompletterande lager ovanpå 018a:

- **Lager 2:** användaren anger en *identifierare* (sträng hen själv kommer
  ihåg) vid join. Hashas på klienten, lagras på `members`. Vid återbesök
  utan localStorage kan användaren skriva samma sträng igen för att matcha
  in på sitt member-id.
- **Lager 3:** efter join uppdateras URL:en med ett `member_token`. Om
  användaren bokmärker den länken så återansluter hen tyst oavsett
  localStorage-status.

Lager 2 är säkerhetsnätet. Lager 3 är ergonomi för den som faktiskt orkar
bokmärka.

### Identifieraren — öppen designfråga

Specen hårdlåser inte formatet i v1. I koden hanteras den som en generisk
sträng (`identitet_hash` på `members`-raden). UI-label och valideringsregler
kan landas under implementation.

**Kandidater:**

- **E-post.** Vanligaste mönstret. Stabilt över tid (folk byter mail
  sällan). Inget bonus-värde utöver återanslutning.
- **Telefonnummer.** Mindre stabilt över tid men öppnar för bonusar:
  Swish-trigger (016) kan länkas direkt, framtida matchning mot telefonbok.
  Risk: flera format (`+46 70…`, `070-…`, `0046…`) — normalisering behövs
  innan hashning, annars matchar inte samma nummer mot sig själv.
- **Vad-som-helst.** "Skriv något du minns — kan vara mail, telefon eller
  ett ord". Maximal friktion-minimering, men användaren förlorar uppenbara
  hjälp-cues om vad som är ett bra val.

**Beslut att ta vid implementation:** vilket format frågar vi efter, och
hur strikt normaliserar vi? Memo: ett tel-fält öppnar för 016-integration,
ett mail-fält gör inte det. Diskutera när första UI-skissen är inne.

I koden namnges fältet **neutralt** (`identitet_hash`, inte `email_hash`)
så vi inte låser oss till mail innan beslutet är taget.

### Lager 2: Identifierare som återställnings-nyckel (hashad)

Vid join frågas efter identifierare utöver namn. **Värdet skickas aldrig
någonstans** — det används bara som en sträng användaren själv minns.
Klienten hashar (SHA-256 över lowercased trim:ad sträng) och lagrar
`identitet_hash` på `members`-raden.

Återställningsflöde när localStorage saknas (rensad cache, ny enhet,
incognito):

```
Välkommen tillbaka till "Madeira-resan"

Har du varit med i det här rummet förut?
[ Ja, återställ ]   [ Nej, jag är ny ]
```

Vid "Ja":

```
Skriv in din identifierare för att återansluta:
[                              ]
(samma sak du skrev när du gick med — mail, telefon eller något du minns)

[ Återställ ]   [ Avbryt ]
```

- Vid träff (hash matchar någon i rummets `members`): återanslut till det
  member-id:t, spara i localStorage (018a-nyckeln).
- Vid miss: "Ingen deltagare med den identifieraren i rummet — kontrollera
  stavning eller välj 'Jag är ny'".

### Lager 3: Bokmärkbar personlig länk

URL:en uppdateras efter join via `replaceState` till
`/r/<roomId>?me=<member_token>` där `member_token` är en slumpad sträng
(uuid räcker) på `members`-raden.

Om länken öppnas direkt: tyst återanslutning oavsett localStorage-status.
Om någon delar länken med fel person: den personen *blir* den medlemmen i
appen. Samma capability-modell som rum-länken redan har — vi accepterar
det och nämner det vid kopierings-knappen.

Beteende vid `/r/<roomId>?me=<token>` i `init`:

1. Slå upp member via token i Supabase.
2. Vid träff: skriv `kvitts_room_<id>_member_id`, gå direkt in i rummet
   (samma kod-väg som 018a:s `forsokTystAteranslutning`).
3. Vid miss: rensa `?me=…` ur URL:en, fall tillbaka på 018a → join-flöde.

### Bekräftelseskärm efter join

Enligt spec — visas direkt efter första join så stavfel kan rättas innan
localStorage hinner försvinna:

```
Du är inne som Peter ✓

Återställnings-identifierare:
peter@gmial.com   [Ändra]

Din personliga länk:
kvitts.app/r/ABC123?me=...   [Kopiera] [Bokmärk]

Den här länken låter dig komma tillbaka även om du
byter enhet eller rensar cookies. Spara den.

[ Klar →]
```

### Datamodell (tillägg till 004)

```
members
  + identitet_hash   text       — SHA-256 av normaliserad identifierare, nullable
  + member_token     text unique — slumpad sträng (uuid), nullable
```

Båda fälten är nullable eftersom befintliga members inte har dem. De fylls
i vid join för nya, och kan retroaktivt sättas via återställningsflödet
för befintliga (samma användare återansluter via 018a och hen fyller då i
identifierare i en prompt).

`member_token` får unique-constraint så token → member-uppslag är säkert
även på rum-överskridande nivå (en token identifierar alltid en specifik
medlem).

### Beslut tagna (2026-05-21)

- **Identifierare obligatoriskt?** Öppen — formatet bestäms senare,
  obligatoriskt-eller-inte avgörs samtidigt. Default-hypotes: obligatoriskt
  för nya members, annars försvinner hela poängen.
- **Bekräftelseskärm:** Ja, full enligt spec (visar mailen tillbaka för
  stavfel-koll + kopiera/bokmärka personlig länk).
- **Migration av befintliga:** Ingen. Befintliga members har null på båda
  fälten och funkar via 018a tills localStorage försvinner; då tvingas de
  skapa ny identitet. Acceptabelt — alternativet är inloggning.

## Säkerhetsmodell

Identifieraren är **identifierare, inte autentisering**. Den som gissar
någons mail/tel kan låtsas vara den personen. Det är acceptabelt för
Kvitts trust-modell — appen är inte en bank, rum-länken är redan en
capability som vem som helst med tillgång kan agera i. Det här måste vara
tydligt i UI och spec: vi bygger inte ett konto, vi bygger en
*minnesvärd nyckel*.

Hashning är inte säkerhet *mot* användaren utan integritet — om Supabase-
databasen läcker så läcker inte adresserna i klartext.

Specifikt om telefonnummer: en läckt hash + en list av tänkbara nummer i
brute-force är trivialt att räkna ut (sökrymden är ~10 siffror). Hashning
ger alltså försumbart skydd för telefon, något bättre för mail. Det är OK
i vår trust-modell — vi är öppna med att det inte är autentisering.

## Öppna frågor / noteringar

- **Format på identifieraren** — beslutas vid implementation. Tel öppnar
  för 016, mail är mer stabilt.
- **Vad händer om Peter glömt vilken identifierare han angav?** Han väljer
  "Jag är ny" och blir ny Peter. Hans gamla utgifter hänger kvar på gamla
  member-id:t. Acceptabelt — alternativet är inloggning.
- **member_token i URL — säkerhetsrisk vid delning?** Om någon råkar
  klistra in sin personliga länk i en gruppchatt så kan andra agera som
  hen. Samma risk som rum-länken redan har; nämn det vid kopierings-
  knappen.
- **Vad om någon vill ändra identifierare senare?** Bekräftelseskärmen har
  en `[Ändra]`-knapp men beteendet vid återbesök till den efteråt är inte
  specat. Förslag: en menypost "Mina inställningar i rummet" som låter
  ändra både namn och identifierare. Utanför scope för v1.
- **Race vid samtidig identitet-hash:** två personer i samma rum med
  samma identifierare → båda matchar vid återställning. Sannolikheten är
  låg (två personer i samma rum med samma mail/tel) men UI bör hantera
  "vilken är du?" om det händer. Försvarbar fallback: visa namnen och
  låt användaren välja. Utanför scope för v1 om vi inte stöter på det.

## När levererad

*(Fylls i efter leverans.)*
