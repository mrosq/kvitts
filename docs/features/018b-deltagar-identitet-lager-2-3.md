# 018b – Stabil deltagar-identitet, lager 2 + 3 (e-post + personlig länk)

**Status:** open
**Skapad:** 2026-05-21
**Beror på:** [018a](done/018a-deltagar-identitet-lager-1.md) (levererad)
**Relaterat:** 017 (gemensam reglering)

## Varför

018a (lager 1, localStorage per rum) täcker återbesök på samma enhet/
browser. Det räcker för normalfallet och låser upp 017, men löser inte:

- **Rensad cache utan att rensa annat** — alla localStorage-nycklar är borta.
- **Ny enhet** — t.ex. mobil → laptop, eller delad familjedator.
- **Incognito-flik** — ingen localStorage-persistens alls.

I de fallen skapas idag en ny deltagare (BUG-001-symptomet återstår). För
017 (gemensam reglering) betyder det att "Reglerat ✓" kan landa på fel
member-id om någon byter enhet mellan besöken.

Samtidigt vill vi *inte* bygga inloggning/kontohantering.

## Vad

Två kompletterande lager ovanpå 018a:

### Lager 2: E-post som återställnings-nyckel (hashad)

Vid join frågas efter e-post utöver namn. **Mailen skickas aldrig** —
den används bara som en sträng användaren själv minns. Backend hashar
mailen (SHA-256) och lagrar `email_hash` på `members`-raden.

Återställningsflöde när `kvitts_room_<id>_member_id` saknas:

- "Har du varit med i det här rummet förut? [Ja, återställ] [Nej, jag är ny]"
- Vid "Ja": skriv in e-post → hasha → matcha mot `members` i rummet
- Vid träff: återanslut till det member-id:t, spara i localStorage
- Vid miss: visa "Ingen deltagare med den mailen i rummet — kontrollera
  stavning eller välj 'Jag är ny'"

Direkt efter join visas mailen tillbaka: "Din återställnings-mail är
peter@gmial.com — stämmer det?" så stavfel kan rättas innan localStorage
hinner försvinna.

### Lager 3: Bokmärkbar personlig länk (bonus)

URL:en uppdateras efter join till `?room=abc&me=<member_token>` där
`member_token` är ett slumpat värde på `members`-raden. Appen säger
"Bokmärk den här sidan — det här är din personliga länk".

Om länken öppnas direkt: tyst återanslutning oavsett localStorage-status.
Om någon delar länken med fel person: den personen *blir* Peter i appen.
Det är samma capability-modell som rum-länken redan har.

### Datamodell (tillägg till 004)

```
members
  + email_hash    text       — SHA-256 av lowercased trim:ad mail, nullable
  + member_token  text       — slumpad sträng (uuid räcker), nullable
```

Båda fälten är nullable eftersom befintliga members inte har dem. De
fylls i vid join för nya, och kan retroaktivt sättas via återställnings-
flödet för befintliga.

### UI-skisser

**Join (ny deltagare):**
```
Du har bjudits in till "Madeira-resan"

Vad heter du?       [Peter        ]
Din e-post?         [peter@...    ]
                    (används bara om du tappar tillgång,
                     vi mailar ingenting)

[ Jag har varit med förut ]   [ Gå med ]
```

**Återställning:**
```
Välkommen tillbaka till "Madeira-resan"

Skriv in din e-post för att återansluta:
[                              ]

[ Återställ ]   [ Avbryt ]
```

**Efter join (bekräftelse):**
```
Du är inne som Peter ✓

Återställnings-mail: peter@gmial.com   [Ändra]
Din personliga länk: kvitts.app/...    [Kopiera] [Bokmärk]
```

## Säkerhetsmodell

E-post är **identifierare, inte autentisering**. Den som gissar någons
mail kan låtsas vara den personen. Det är acceptabelt för Kvitts trust-
modell — appen är inte en bank, rum-länken är redan en capability som
vem som helst med tillgång kan agera i. Det här måste vara tydligt i UI
och i spec: vi bygger inte ett konto, vi bygger en *minnesvärd nyckel*.

Hashning av mailen är inte säkerhet *mot* användaren utan integritet —
om Supabase-databasen läcker så läcker inte adresserna i klartext.

## Öppna frågor / noteringar

- **Vad händer om Peter glömt vilken mail han angav?** Han väljer
  "Jag är ny" och blir ny Peter. Hans gamla utgifter hänger kvar på
  gamla member-id:t. Acceptabelt — alternativet är inloggning.
- **Får e-post vara obligatoriskt?** Förslag: ja för nya members, annars
  försvinner hela återställnings-poängen. Befintliga members utan
  email_hash kan fortsätta funka tills de råkar ut för rensad cache.
- **Telefonnummer som alternativ?** Samma princip fungerar, men mail är
  mer stabilt över tid (folk byter nummer oftare än mail). Lämnas
  utanför scope för v1.
- **Member_token i URL — säkerhetsrisk vid delning?** Om någon råkar
  klistra in sin personliga länk i en gruppchatt så kan andra agera
  som hen. Samma risk som rum-länken redan har; vi accepterar den men
  bör nämna det vid kopierings-knappen.
- **Migrera befintliga rum?** Befintliga members har varken email_hash
  eller member_token. De fortsätter funka via 018a (localStorage) tills
  den försvinner; då tvingas de skapa ny identitet. Ingen aktiv migration
  behövs.

## När levererad

*(Fylls i efter leverans.)*
