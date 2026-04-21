# TODO

Solo-utveckling. Småsaker direkt i listan, riktiga features som egna filer i
[features/](features/). Mall finns i [features/_template.md](features/_template.md).

## Quick

_(Inga öppna småsaker just nu)_

## Features

- [ ] [001 – Multi-session](features/001-multi-session.md) — växla mellan flera parallella utgiftslistor
- [ ] [004 – Multi-user-läge via delad rum-länk](features/004-multi-user-rum.md) — fyller 002:s val B med faktisk funktionalitet: skapa rum, dela länk, polling-baserad sync via Supabase
- [ ] [006c – Saldo-UI-omdesign](features/006c-saldo-omdesign.md) — kompakt saldo-kort, "Du skall få"/"Du är skyldig", klickbar detalj-popup. Funkar redan för N=2.
- [ ] [006b – N>2 personer i UI](features/006b-n-personer-ui.md) — setup-lista med +-knapp, generell betalar-dropdown, split/edit/reglera för N deltagare.
- [ ] [013 – Fast beloppsfördelning](features/013-fast-belopp-fordelning.md) — "Exakta belopp": varje persons andel är exakt angiven, ingen rest delas (Σ = totalt)
- [ ] [010 – Fun mode: ikon-input](features/010-fun-mode-ikoner.md) — togglebart läge där beskrivning ersätts med 6–10 kombinerbara bas-ikoner
- [ ] [011 – Story stripe](features/011-story-stripe.md) — sessionsgrupperad detaljvy, utgifter per dag som visuell story
- [ ] [012 – Ranking & roliga etiketter](features/012-ranking-forlorare.md) — "kvällens kung", "snålvargen" osv. i saldovyn

## Klart

- [x] [000 – JSON save/load](features/done/000-json-save-load.md) — ersatte CSV-export med JSON-baserad spara/ladda för dataflytt mellan enheter
- [x] [003 – Byt localStorage-prefix](features/done/003-byt-localstorage-prefix.md) — döpte om `splitwise_*`-nycklar till `kvitts_*` med engångsmigration
- [x] [005 – Bryt ut JavaScript från index.html](features/done/005-bryt-ut-script-fran-html.md) — JS i `app.js`, pure functions i `logic.js`, ingen duplikering
- [x] [002 – Introskärm med lägesval](features/done/002-introskarm-lagesval.md) — välkomstflöde med person1-namn, lägesval A/B, och "Kommer snart" för val B
- [x] [006a – Fundament för N personer](features/done/006a-fundament-n-personer.md) — ny datamodell (`personer`, `betalare_id`, `fordelning`), `logic.js`-generalisering, JSON v2 — UI oförändrat för N=2
- [x] [009 – Meny för sekundära actions](features/done/009-meny.md) — ⚙-ikon i övre högra hörnet, bottom-sheet med reglera + ladda/spara fil
- [x] [007 – Komplexa fördelningar](features/done/007-komplex-fordelning.md) — split-knapp med modal: vem var med (initialer-knappar) + egna belopp
