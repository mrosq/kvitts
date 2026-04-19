# TODO

Solo-utveckling. Småsaker direkt i listan, riktiga features som egna filer i
[features/](features/). Mall finns i [features/_template.md](features/_template.md).

## Quick

_(Inga öppna småsaker just nu)_

## Features

- [ ] [001 – Multi-session](features/001-multi-session.md) — växla mellan flera parallella utgiftslistor
- [ ] [002 – Introskärm med lägesval](features/002-introskarm-lagesval.md) — välkomstskärm för nya användare med val mellan single-user och multi-user-läge
- [ ] [003 – Byt localStorage-prefix](features/003-byt-localstorage-prefix.md) — döp om gamla `splitwise_*`-nycklar till `kvitts_*` med engångsmigration
- [ ] [004 – Multi-user-läge via delad rum-länk](features/004-multi-user-rum.md) — fyller 002:s val B med faktisk funktionalitet: skapa rum, dela länk, polling-baserad sync via Supabase
- [ ] [005 – Bryt ut JavaScript från index.html](features/005-bryt-ut-script-fran-html.md) — eliminerar duplikering mellan `<script>` i HTML och `logic.js`; pre-req för att 004 ska kunna generalisera matematiken på en plats

## Klart

- [x] [000 – JSON save/load](features/done/000-json-save-load.md) — ersatte CSV-export med JSON-baserad spara/ladda för dataflytt mellan enheter
