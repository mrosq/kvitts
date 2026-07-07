# 020 – Städa upp "Ny session" i menyn

**Status:** open
**Skapad:** 2026-06-07

## Varför

"Ny session"-knappen i inställningsmenyn är generisk och förvirrande i
rum-läget — en inbjuden användare vill inte skapa en lokal session, hen
vill gå med i ett nytt rum eller skapa ett till. Knappen löser två
väldigt olika behov utan att skilja på dem.

## Vad

Ersätt den generiska "Ny session"-knappen med tre tydliga separata knappar:

- **+ Gå med i ett nytt rum** → direkt till gå-med-skärmen
- **+ Skapa nytt rum** → direkt till skapa-skärmen
- **+ Ny lokal session** → direkt till namn-formuläret (som idag)

Tre knappar, tre tydliga destinationer. Ingen mellanskärm.

## Öppna frågor / noteringar

- Ska alla tre alltid visas, eller ska t.ex. "Ny lokal session" döljas
  när man är i rum-läget? Förslag: visa alla tre alltid — det är OK att
  blanda lokala och rum-sessioner.
- Knapparna kan staplas vertikalt precis som dagens meny-rader.
- Den befintliga modal-logiken för ny lokal session (`visaNySessionForm`)
  kan antingen återanvändas eller tas bort till förmån för direkt-navigering
  till onboarding-steg 3a.

## När levererad

Levererad 2026-07-07.

Den generiska "＋ Ny session"-knappen i inställningsmenyn ersattes med två
tydliga knappar:

- **＋ Skapa nytt rum** → `skapaRumFranMeny()` stänger menyn, nollställer ev.
  kvarhängande skapa-rum-state (`_rumSkapat`, `_joinMemberToken`) och navigerar
  direkt till skapa-rum-skärmen (`visaSkapaRum`).
- **＋ Ny lokal session** → återanvänder befintliga `visaNySessionForm()`
  (namn-formuläret "som idag").

**Avgränsning:** Den tredje föreslagna knappen, "＋ Gå med i ett nytt rum",
byggdes medvetet inte. Att gå med i ett rum sker uteslutande via en
inbjudningslänk (`/r/<id>`) — det finns ingen skärm för att manuellt ange en
rumskod, och att bygga en sådan bedömdes ligga utanför den här uppstädningen.

