# TODO

Solo-utveckling. Småsaker direkt i listan, riktiga features som egna filer i
[features/](features/). Mall finns i [features/_template.md](features/_template.md).

## Quick

_(Inga öppna småsaker just nu)_

## Features

- [ ] [001 – Multi-session](features/001-multi-session.md) — växla mellan flera parallella utgiftslistor
- [ ] [004 – Multi-user-läge via delad rum-länk](features/004-multi-user-rum.md) — fyller 002:s val B med faktisk funktionalitet: skapa rum, dela länk, polling-baserad sync via Supabase

## Klart

- [x] [000 – JSON save/load](features/done/000-json-save-load.md) — ersatte CSV-export med JSON-baserad spara/ladda för dataflytt mellan enheter
- [x] [003 – Byt localStorage-prefix](features/done/003-byt-localstorage-prefix.md) — döpte om `splitwise_*`-nycklar till `kvitts_*` med engångsmigration
- [x] [005 – Bryt ut JavaScript från index.html](features/done/005-bryt-ut-script-fran-html.md) — JS i `app.js`, pure functions i `logic.js`, ingen duplikering
- [x] [002 – Introskärm med lägesval](features/done/002-introskarm-lagesval.md) — välkomstflöde med person1-namn, lägesval A/B, och "Kommer snart" för val B
