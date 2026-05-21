# 018a – Stabil deltagar-identitet, lager 1 (localStorage per rum)

**Status:** levererad 2026-05-21
**Skapad:** 2026-05-21
**Del av:** 018 (stabil deltagar-identitet utan inloggning), första lagret.
**Fixar:** BUG-001 (återbesök skapar ny deltagare) i ~90% av fallen.

## Varför

Idag har en deltagare ingen stabil identitet över tid. Om någon raderar
sin rum-session från menyn — eller om `kvitts_sessions`-blobben av någon
anledning försvinner — så känns hen inte igen vid återbesök på rum-länken
och ett nytt `members`-inslag skapas i Supabase. Gamla utgifter hänger kvar
på det förra member-id:t.

Det blockerar också 017 (gemensam reglering): kreditorns "Reglerat ✓"
hamnar på gamla member-id:t medan nya member-id:t ser "Väntar…" för evigt.

Hela 018 har tre lager. Det här är lager 1 — det som täcker normalfallet
"samma enhet, samma browser, cache ej helt rensad". Lager 2 (hashad e-post)
och lager 3 (member_token i URL) ligger i [018b](../018b-deltagar-identitet-lager-2-3.md).

## Vad

En fristående localStorage-nyckel `kvitts_room_<room_id>_member_id` som
lagrar member-id:t för rummet. Skrivs vid join och vid skapa-rum.

Vid återbesök på `/r/<id>`:

1. Om vi har en befintlig rum-session i `sessions[]` — gå in i den (befintligt
   beteende, oförändrat).
2. Annars: läs `kvitts_room_<id>_member_id`. Om värdet finns, verifiera mot
   `KvittsSupabase.hamtaDeltagare(roomId)` att medlemmen fortfarande finns,
   och återskapa rum-sessionen tyst med det `personId`:t.
3. Om medlemmen är borta (rum eller member raderat på backend), rensa nyckeln
   och fall tillbaka på join-flödet.
4. Vid nätfel: visa join-flödet — bättre än att fastna.

Ingen "Välkommen tillbaka"-toast i v1; tyst återanslutning räcker (samma
visuella beteende som dagens befintlig-session-koll).

## Avgränsningar

- **Lager 2 (e-post) och lager 3 (member_token i URL) ingår inte.** De
  täcker rensad cache, ny enhet och incognito och ligger i 018b.
- **Ingen schema-ändring i Supabase.** Lager 1 är ren klient-logik.
- **Ingen UI-ändring i join-flödet** ("Vad heter du?"-skärmen). E-postfält
  och bekräftelseskärm kommer i 018b.

## Levererat

- `roomMemberKey(roomId)` i `logic.js` (+ test).
- `skapaRumSession` skriver nyckeln efter session-skapande.
- `forsokTystAteranslutning(roomId)` i `app.js` — anropas från `init()`
  när `/r/<id>` öppnas och ingen befintlig session matchar.
- 69/69 tester gröna.

## Uppföljning

Se [018b](../018b-deltagar-identitet-lager-2-3.md) för e-post-återställning
och member_token-länken. Levereras separat när 017 (gemensam reglering)
är klar och vi sett hur ofta enhetsbyte faktiskt drabbar användare i
praktiken.
