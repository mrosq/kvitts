# TODO

Solo-utveckling. Småsaker direkt i listan här. Riktiga features som egna
specs i [features/](features/) — levererade flyttas till [features/done/](features/done/).
Mall finns i [features/_template.md](features/_template.md).

## Quick
- [x] Visuell avvikelse på split-knappen beroende på vald fördelning (t.ex. färg) så det syns att den är i icke-default-läge
- [x] Sortera historiken på datum (nyast först), inte på insättningsordning — liten ändring i `renderaHistorik`, sort innan map
- [x] Tillåt lägga till utgift utan belopp. Lägg till-knapp aktiveras efter beskrivning fyllts i. Detta skapar en placeholer i historiken som kan uppdateras senare. Ex om beloppet inte varit klart
- [x] Gör spliknappen tydligare en knapp, nu ser den ut som ett textfält 
- [ ] Flytta "betald av" till split-modalen? När man klickar på split-knappen så ligger väljaren av betalare överst i den. Det är ändå 95% av fallen där den som skapar inlägget gjorde betalningen
