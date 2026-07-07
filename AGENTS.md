# AGENTS.md

Detta projekts konventioner och instruktioner bor i [CLAUDE.md](CLAUDE.md).
Läs den filen som din primära källa — den gäller alla agenter (Claude Code,
GitHub Copilot m.fl.), inte bara Claude.

Kort sammanfattning (se CLAUDE.md för fullständig kontext):

- **Vanilla JS, single-file HTML.** Ingen build, inget ramverk. `index.html`
  ska kunna öppnas som en fil.
- **Svenska** i UI, kommentarer och funktionsnamn.
- **`logic.js`** = rena beräkningar (ingen DOM). **`app.js`** = DOM-glue.
- **Tester:** `npm test` (Node:s inbyggda test runner). Ska vara grön.
- **Feature-/buggspårning i `docs/`.** Specs i `docs/features/NNN-slug.md`,
  levererade flyttas till `docs/features/done/`. Buggar i `docs/BUGS.md`.
- **Commit-regel:** committa alltid `docs/` tillsammans med koden — det är
  spårningen och hör till varje ändring.
