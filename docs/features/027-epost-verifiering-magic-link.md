# 027 – E-postverifiering via magic link (Supabase Auth)

**Status:** open
**Skapad:** 2026-07-07
**Beror på:** 018b (identitets-hash + e-postfält), 026 (konto-grund `identiteter`)

## Varför

Idag är e-post i Kvitts en **overifierad fritext-identifierare** (018b). Vem
som helst kan ange vilken adress som helst — det är avsiktligt en
*minnesvärd nyckel*, inte autentisering. Det räcker för nuvarande
trust-modell, men vi vill ha möjligheten att **verifiera att användaren
faktiskt äger adressen** innan vi bygger vidare på 026 (samma användare över
flera rum, aggregerat saldo, "mina rum").

Utan verifiering är kontogrunden i 026 svag: vem som helst som gissar en
adress blir den användaren. Med en verifierad e-post får vi en riktig
identitet att hänga cross-room-logik på — utan att införa lösenord.

### Varför e-post och inte SMS (beslut)

Utvärderat 2026-07-07. E-post vinner rent tekniskt och kostnadsmässigt:

- **Integration:** Supabase Auth har magic link / e-post-OTP inbyggt. SMS
  kräver alltid extern provider (Twilio/Bird/Vonage) + sender-ID +
  `+46`-normalisering + regulatoriskt krångel.
- **Kostnad:** E-post är i praktiken gratis (Resend free tier ~3 000/mån,
  därefter ~$0.001/mail). SMS kostar per styck (~0.05–0.08 EUR) från första
  meddelandet, ingen meningsfull free tier.
- **Attackyta:** SMS-OTP-endpoints är måltavla för SMS-pumping (bot spammar
  → din räkning). E-post har försumbar motsvarande risk.
- **Passar redan:** Identiteten bygger redan på e-post (018b/026). Fältet
  är fritext idag; att byta *utskicksmekanism* är oberoende av UI-labeln.

SMS kan läggas till som separat add-on senare om telefon-identitet någon gång
önskas — men det finns ingen anledning att börja där.

## Vad

Lägg magic-link-verifiering ovanpå den befintliga e-postidentiteten. Målet
är **minimala ändringar** — datamodellen (018b/026) rörs inte i onödan.

### Infrastruktur (engångsjobb)

1. **Aktivera e-post-auth** i Supabase-dashboarden (magic link / OTP).
2. **Koppla SMTP-provider** för produktion — förslag **Resend** (enklast
   idag). Supabase egen mail är gratis men rate-limitad (~fåtal/timme) och
   duger bara för test.
3. **Domän-verifiering** (SPF/DKIM/DMARC) på avsändardomänen så mailen inte
   hamnar i skräppost. Görs en gång.
4. **Redirect-URL:er** i Supabase Auth-inställningar: lokal
   (`http://localhost:8000`) + Vercel-produktion.

### Flöde – klient

Använd `supabase-js` Auth (redan laddat via CDN):

- `client().auth.signInWithOtp({ email, options: { emailRedirectTo } })`
  skickar magic link.
- Vid retur (länk klickad) läses sessionen via
  `client().auth.getSession()` / `onAuthStateChange`.
- Den verifierade adressen (`session.user.email`) hashas som idag
  (`normaliseraEpost` + `hashIdentitet`) och matchas mot `identitet_hash` /
  `identiteter` (026). Så återanvänds all befintlig dedupe-/konto-logik.

### UX – minimal

- Där e-post anges idag (skapa-rum, join) läggs ett verifieringssteg:
  användaren får ett mail, klickar länken, kommer tillbaka verifierad.
- **Gradvis införande:** verifiering kan börja som *frivilligt* (fritexten
  fungerar kvar, men "Verifiera din e-post"-knapp finns) och skärpas senare.
  Undvik att blockera hela flödet i v1 om det försämrar låg-friktion-känslan.
- En "klicka länken i mailet"-väntvy behövs (magic link öppnas ev. i annan
  flik/enhet — hantera både same-tab och cross-tab retur).

### Koppling till identitetsmodellen

- **Ingen ny hash-logik.** Verifierad adress går genom samma
  `normaliseraEpost`/`hashIdentitet` → `identitet_hash`.
- **026:** en verifierad adress kan sätta ett `verifierad`-flagga på
  `identiteter`-raden (om 026 är byggd) så cross-room-logik kan lita på den.
  Om 026 inte är byggd ännu: håll flaggan i `members`/localStorage tills
  vidare, eller lyft in i 026 när den byggs.

## Avgränsning (vad som INTE ingår i v1)

- Ingen lösenordsinloggning, ingen social login.
- Ingen SMS.
- Ingen tvingad utloggning / sessionshantering utöver Supabase-default.
- Ingen sammanslagning av overifierad → verifierad identitet med olika hash
  (samma normaliserade adress ger samma hash, så det är normalt inget
  problem).
- Ingen ändring av 018b:s `member_token`-återanslutning — den lever kvar
  parallellt som låg-friktions-väg.

## Öppna frågor / noteringar

- **Frivillig vs obligatorisk verifiering i v1?** Förslag: frivillig först
  (behåll låg friktion), skärp när 026-cross-room faktiskt använder
  verifieringen.
- **Provider-val:** Resend föreslås, men Postmark/SES/SendGrid duger. Beslut
  vid implementation.
- **Rate limiting:** även e-post-OTP bör rate-limitas per adress/IP för att
  undvika mail-spam. Supabase har inbyggda gränser — verifiera att de räcker.
- **Retur på annan enhet:** magic link öppnad i annan browser än den som
  begärde den → hantera med OTP-kod som fallback (`signInWithOtp` stöder
  6-siffrig kod) om cross-device visar sig krångligt.
- **Relation till 026:** om 026 byggs efter denna, lägg `verifierad`-flaggan
  där. Om 026 byggs först, utöka dess `identiteter`-tabell här.

## När levererad

*(Fylls i efter leverans.)*
