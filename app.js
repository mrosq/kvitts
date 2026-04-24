// State (N personer – se docs/features/006a). UI:t stöder N>=2.
// Sessions – se docs/features/001-multi-session.md.
// En session: { id, namn, skapad, reglerad }. Dess data: { personer, migId, utgifter }.
let sessions = [];               // meta för alla sessioner
let aktivSessionId = null;
let personer = [];
let migId = "p1";
let person1 = "";
let person2 = "";
let utgifter = [];
let valtDatum = new Date();
let valtEditDatum = new Date();
let editId = null;

// Split-state för lägg-till-formuläret
let splitTyp = "jamnt";          // "jamnt" | "delmangd" | "egna"
let splitInkluderade = [];       // tom = alla; annars specifika ids
let splitEgna = {};              // {id: belopp} – egna input-värden

// Split-state för edit-modal
let editSplitTyp = "jamnt";
let editSplitInkluderade = [];
let editSplitEgna = {};

// Tillfälligt state inuti split-modalen
let splitModalKontext = "add";   // "add" | "edit"
let splitModalTempInkluderade = [];
let splitModalTempEgna = {};

function syncaPersonAlias() {
  person1 = personer[0]?.namn || "";
  person2 = personer[1]?.namn || "";
}

// DATUM
const MAX_DAGAR_BAK = 7;
function datumTillStr(d) { return d.toLocaleDateString("sv-SE"); }
function dagarMellan(a, b) {
  const a0 = new Date(a); a0.setHours(0,0,0,0);
  const b0 = new Date(b); b0.setHours(0,0,0,0);
  return Math.round((a0 - b0) / 86400000);
}
function datumChipText(d) {
  const diff = dagarMellan(d, new Date());
  if (diff === 0) return "Idag";
  if (diff === -1) return "Igår";
  return d.getDate() + "/" + (d.getMonth() + 1);
}
function uppdateraDatumChip() {
  const diff = dagarMellan(valtDatum, new Date());
  document.getElementById("datum-text").textContent = datumChipText(valtDatum);
  document.getElementById("datum-pil-bak").hidden = diff <= -MAX_DAGAR_BAK;
  document.getElementById("datum-pil-fram").hidden = diff >= 0;
}
function andradatum(steg) {
  const ny = new Date(valtDatum);
  ny.setDate(ny.getDate() + steg);
  const diff = dagarMellan(ny, new Date());
  if (diff > 0 || diff < -MAX_DAGAR_BAK) return;
  valtDatum = ny;
  uppdateraDatumChip();
}
function resetDatum() {
  valtDatum = new Date();
  uppdateraDatumChip();
}

// Parsar "YYYY-MM-DD" eller sv-SE-format ("2026-04-18" eller "2026-04-18")
function parsaDatum(str) {
  if (!str) return new Date();
  const m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(str);
  return isNaN(d) ? new Date() : d;
}

function uppdateraEditDatumChip() {
  const diff = dagarMellan(valtEditDatum, new Date());
  document.getElementById("edit-datum-text").textContent = datumChipText(valtEditDatum);
  document.getElementById("edit-datum-pil-bak").hidden = diff <= -MAX_DAGAR_BAK;
  document.getElementById("edit-datum-pil-fram").hidden = diff >= 0;
}

function andraEditDatum(steg) {
  const ny = new Date(valtEditDatum);
  ny.setDate(ny.getDate() + steg);
  const diff = dagarMellan(ny, new Date());
  if (diff > 0 || diff < -MAX_DAGAR_BAK) return;
  valtEditDatum = ny;
  uppdateraEditDatumChip();
}

// MIGRATIONER
function migreraGamlaNycklar() {
  const gammalP2 = localStorage.getItem("splitwise_person2");
  if (gammalP2 && !localStorage.getItem("kvitts_person2")) {
    localStorage.setItem("kvitts_person2", gammalP2);
    const gammalUtg = localStorage.getItem("splitwise_utgifter");
    if (gammalUtg) localStorage.setItem("kvitts_utgifter", gammalUtg);
    localStorage.removeItem("splitwise_person2");
    localStorage.removeItem("splitwise_utgifter");
  }
}

// Engångs: konvertera `kvitts_person1`/`kvitts_person2` → `kvitts_personer`
// och utgifter med `delP1`/`delP2` → `betalare_id`/`fordelning`. Idempotent.
function migreraTillNPersoner() {
  const harPersonerArray = !!localStorage.getItem("kvitts_personer");
  const p2 = localStorage.getItem("kvitts_person2");

  if (!harPersonerArray && p2) {
    const p1 = localStorage.getItem("kvitts_person1") || "Mikael";
    const arr = [{ id: "p1", namn: p1 }, { id: "p2", namn: p2 }];
    localStorage.setItem("kvitts_personer", JSON.stringify(arr));
    localStorage.setItem("kvitts_person_mig", "p1");
    localStorage.removeItem("kvitts_person1");
    localStorage.removeItem("kvitts_person2");
  }

  const rawUtg = localStorage.getItem("kvitts_utgifter");
  if (rawUtg) {
    try {
      const parsad = JSON.parse(rawUtg);
      if (Array.isArray(parsad) && parsad.some(u => "delP1" in u || "delP2" in u)) {
        const migrerad = parsad.map(migreraUtgift);
        localStorage.setItem("kvitts_utgifter", JSON.stringify(migrerad));
      }
    } catch (_) { /* lämna orört om ogiltig JSON */ }
  }
}

// SESSIONS
function laddaSessionsMeta() {
  try {
    sessions = JSON.parse(localStorage.getItem("kvitts_sessions") || "[]");
  } catch (_) { sessions = []; }
  aktivSessionId = localStorage.getItem("kvitts_aktiv") || null;
}

function sparaSessionsMeta() {
  localStorage.setItem("kvitts_sessions", JSON.stringify(sessions));
  if (aktivSessionId) localStorage.setItem("kvitts_aktiv", aktivSessionId);
  else localStorage.removeItem("kvitts_aktiv");
}

function sessionDataKey(id) { return "kvitts_session_" + id; }

function laddaSessionsData(id) {
  try {
    const raw = localStorage.getItem(sessionDataKey(id));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) { return null; }
}

function sparaAktivSessionsData() {
  if (!aktivSessionId) return;
  const data = { personer, migId, utgifter };
  localStorage.setItem(sessionDataKey(aktivSessionId), JSON.stringify(data));
}

function unikaNamn(basnamn) {
  const finns = new Set(sessions.map(s => s.namn));
  if (!finns.has(basnamn)) return basnamn;
  for (let i = 1; i < 1000; i++) {
    const kand = basnamn + " (" + i + ")";
    if (!finns.has(kand)) return kand;
  }
  return basnamn + " " + Date.now();
}

function skapaSession(namn, sessionPersoner, sessionMigId, sessionUtgifter) {
  const id = "s" + Date.now() + "_" + Math.floor(Math.random() * 10000);
  const session = {
    id,
    namn: unikaNamn(namn || "Min lista"),
    skapad: new Date().toISOString(),
    reglerad: false,
  };
  sessions.push(session);
  localStorage.setItem(sessionDataKey(id), JSON.stringify({
    personer: sessionPersoner,
    migId: sessionMigId,
    utgifter: sessionUtgifter || [],
  }));
  sparaSessionsMeta();
  return session;
}

function vaxlaTillSession(id) {
  const session = sessions.find(s => s.id === id);
  if (!session) return;
  const data = laddaSessionsData(id);
  if (!data) return;
  aktivSessionId = id;
  personer = data.personer || [];
  migId = data.migId || "p1";
  utgifter = data.utgifter || [];
  syncaPersonAlias();
  sparaSessionsMeta();
  visaApp();
}

function raderaSession(id) {
  sessions = sessions.filter(s => s.id !== id);
  localStorage.removeItem(sessionDataKey(id));
  if (aktivSessionId === id) aktivSessionId = null;
  sparaSessionsMeta();
}

function aktivSession() {
  return sessions.find(s => s.id === aktivSessionId) || null;
}

function aktivArReglerad() {
  const s = aktivSession();
  return !!(s && s.reglerad);
}

// Migrerar pre-sessions-data till en första session. Körs en gång.
function migreraTillSessions() {
  if (localStorage.getItem("kvitts_sessions")) return;
  const rawPersoner = localStorage.getItem("kvitts_personer");
  if (!rawPersoner) {
    // Ingen data alls → tom sessions-lista, onboarding tar vid.
    localStorage.setItem("kvitts_sessions", "[]");
    return;
  }
  let gamlaPersoner = [];
  try { gamlaPersoner = JSON.parse(rawPersoner) || []; } catch (_) { gamlaPersoner = []; }
  const gammalMig = localStorage.getItem("kvitts_person_mig") || "p1";
  let gamlaUtg = [];
  try { gamlaUtg = JSON.parse(localStorage.getItem("kvitts_utgifter") || "[]") || []; } catch (_) { gamlaUtg = []; }

  sessions = [];
  aktivSessionId = null;
  const session = skapaSession("Min lista", gamlaPersoner, gammalMig, gamlaUtg);
  aktivSessionId = session.id;
  sparaSessionsMeta();

  // Rensa gamla top-level-nycklar — de lever nu inuti session-blobben.
  localStorage.removeItem("kvitts_personer");
  localStorage.removeItem("kvitts_person_mig");
  localStorage.removeItem("kvitts_utgifter");
}

// INIT
function init() {
  migreraGamlaNycklar();
  migreraTillNPersoner();
  migreraTillSessions();
  laddaSessionsMeta();

  // Välj en aktiv session om möjligt
  if (aktivSessionId && !sessions.find(s => s.id === aktivSessionId)) {
    aktivSessionId = null;
  }
  if (!aktivSessionId && sessions.length > 0) {
    // Föredra pågående om finns, annars första
    const pagaende = sessions.find(s => !s.reglerad);
    aktivSessionId = (pagaende || sessions[0]).id;
    sparaSessionsMeta();
  }

  if (aktivSessionId) {
    const data = laddaSessionsData(aktivSessionId);
    if (data) {
      personer = data.personer || [];
      migId = data.migId || "p1";
      utgifter = data.utgifter || [];
      syncaPersonAlias();
      visaApp();
      return;
    }
  }
  visaSkarm1();
}

// INTRO-SKÄRMAR
function visaSkarm1() {
  doljAllaSkärmar();
  document.getElementById("intro-1").style.display = "flex";
  const sparadP1 = localStorage.getItem("kvitts_person1");
  if (sparadP1) {
    const input = document.getElementById("intro-person1-namn");
    input.value = sparadP1;
    document.getElementById("btn-nasta-1").disabled = false;
  }
}

function visaSkarm2() {
  doljAllaSkärmar();
  document.getElementById("intro-2").style.display = "flex";
}

function visaSkarm3a() {
  doljAllaSkärmar();
  document.getElementById("intro-3a-text").textContent = "Vem delar du utgifter med, " + person1 + "?";
  document.getElementById("intro-3a").style.display = "flex";
  document.getElementById("setup-namn-lista").innerHTML = "";
  laggTillPersonFalt();
}

function visaSkarm3b() {
  doljAllaSkärmar();
  document.getElementById("intro-3b").style.display = "flex";
}

function doljAllaSkärmar() {
  document.querySelectorAll(".intro-skarm").forEach(el => el.style.display = "none");
  document.getElementById("app").style.display = "none";
}

function sparaOchGaTillSkarm2() {
  const v = document.getElementById("intro-person1-namn").value.trim();
  if (!v) return;
  person1 = v;
  localStorage.setItem("kvitts_person1", person1);
  visaSkarm2();
}

// SETUP – dynamiska personnamns-fält
function laggTillPersonFalt() {
  const lista = document.getElementById("setup-namn-lista");
  const input = document.createElement("input");
  input.className = "setup-input";
  input.type = "text";
  input.placeholder = "T.ex. Anna, Erik...";
  input.maxLength = 20;
  input.oninput = uppdateraSetupKnapp;
  input.onkeydown = (e) => { if (e.key === "Enter") sparaSetup(); };
  lista.appendChild(input);
  input.focus();
  uppdateraSetupKnapp();
}

function uppdateraSetupKnapp() {
  const inputs = document.querySelectorAll("#setup-namn-lista input");
  const harNamn = Array.from(inputs).some(i => i.value.trim() !== "");
  document.getElementById("btn-kom-igang").disabled = !harNamn;
  // Max 7 andra (8 totalt inkl. användaren)
  document.getElementById("btn-lagg-till-person").disabled = inputs.length >= 7;
}

function sparaSetup() {
  const inputs = document.querySelectorAll("#setup-namn-lista input");
  const namn = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);
  if (namn.length === 0) return;
  personer = [{ id: "p1", namn: person1 }];
  namn.forEach((n, i) => personer.push({ id: "p" + (i + 2), namn: n }));
  migId = "p1";
  utgifter = [];
  localStorage.removeItem("kvitts_person1");
  const session = skapaSession("Min lista", personer, migId, utgifter);
  aktivSessionId = session.id;
  sparaSessionsMeta();
  visaApp();
}

function visaApp() {
  document.querySelectorAll(".intro-skarm").forEach(el => el.style.display = "none");
  document.getElementById("app").style.display = "block";
  syncaPersonAlias();

  const andra = personer.filter(p => p.id !== migId);
  let subtitle;
  if (andra.length === 1) subtitle = person1 + " & " + andra[0].namn;
  else if (andra.length === 2) subtitle = person1 + ", " + andra[0].namn + " & " + andra[1].namn;
  else subtitle = person1 + " & " + andra.length + " andra";
  const s = aktivSession();
  if (s) subtitle = s.namn + " · " + subtitle;
  document.getElementById("app-subtitle").textContent = subtitle;

  // Read-only-läge för reglerade sessioner
  const reglerad = aktivArReglerad();
  document.getElementById("reglerad-banner").style.display = reglerad ? "block" : "none";
  document.getElementById("ny-utgift-rubrik").style.display = reglerad ? "none" : "block";
  document.getElementById("ny-utgift-kort").style.display = reglerad ? "none" : "block";

  populeraBetalarDropdowns();

  splitTyp = "jamnt";
  splitInkluderade = [];
  splitEgna = {};
  uppdateraSplitKnapp("add");

  resetDatum();
  uppdatera();
}

function populeraBetalarDropdowns() {
  ["betalare", "edit-betalare"].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = personer.map(p => `<option value="${p.id}">${esc(p.namn)}</option>`).join("");
    sel.value = migId;
  });
}

function deltagareIds() {
  return personer.map(p => p.id);
}

function uppdateraLaggTillKnapp() {
  const besk = document.getElementById("beskrivning").value.trim();
  document.getElementById("btn-lagg-till").disabled = !besk;
}

// INITIALER
function initialer(namn) {
  return namn.split(" ").map(d => d[0]).join("").substring(0, 2).toUpperCase();
}

// SPLIT-MODAL
function oppnaSplitModal(kontext) {
  splitModalKontext = kontext;
  const aktInkl = kontext === "add" ? splitInkluderade : editSplitInkluderade;
  const aktEgna = kontext === "add" ? splitEgna : editSplitEgna;
  splitModalTempInkluderade = aktInkl.length > 0 ? [...aktInkl] : deltagareIds();
  splitModalTempEgna = { ...aktEgna };
  renderaCirklar();
  visaSplitSteg1();
  document.getElementById("split-modal").classList.add("visa");
}

function renderaCirklar() {
  const container = document.getElementById("split-cirklar");
  container.innerHTML = personer.map(p => {
    const aktiv = splitModalTempInkluderade.includes(p.id);
    return `
      <div class="person-cirkel-wrapper">
        <button class="person-cirkel${aktiv ? " aktiv" : ""}"
          id="cirkel-${p.id}" onclick="toggleInkluderad('${p.id}')">
          ${esc(initialer(p.namn))}
        </button>
        <span class="person-cirkel-namn">${esc(p.namn)}</span>
      </div>`;
  }).join("");
}

function toggleInkluderad(id) {
  const idx = splitModalTempInkluderade.indexOf(id);
  if (idx === -1) {
    splitModalTempInkluderade.push(id);
  } else {
    if (splitModalTempInkluderade.length === 1) return;
    splitModalTempInkluderade.splice(idx, 1);
    delete splitModalTempEgna[id];
  }
  const btn = document.getElementById("cirkel-" + id);
  if (btn) btn.classList.toggle("aktiv", splitModalTempInkluderade.includes(id));
  const namn = btn?.nextElementSibling;
  if (namn) namn.style.fontWeight = splitModalTempInkluderade.includes(id) ? "500" : "";
  if (namn) namn.style.color = splitModalTempInkluderade.includes(id) ? "var(--ink)" : "";
}

function visaSplitSteg1() {
  document.getElementById("split-steg-1").style.display = "block";
  document.getElementById("split-steg-2").style.display = "none";
}

function visaSplitSteg2() {
  const beloppId = splitModalKontext === "add" ? "belopp" : "edit-belopp";
  const container = document.getElementById("split-egna-falt");
  container.innerHTML = splitModalTempInkluderade.map(id => {
    const p = personer.find(x => x.id === id);
    const val = splitModalTempEgna[id] || "";
    return `
      <div class="split-person">
        <label>${esc(p?.namn || id)}s egna (kr)</label>
        <input type="number" id="split-egna-${id}" placeholder="0" min="0" step="0.01"
          value="${val}" oninput="uppdateraSplitEgnaInfo()"/>
      </div>`;
  }).join("");
  uppdateraSplitEgnaInfo();
  document.getElementById("split-steg-1").style.display = "none";
  document.getElementById("split-steg-2").style.display = "block";
}

function visaSplitSteg1FranSteg2() {
  for (const id of splitModalTempInkluderade) {
    const inp = document.getElementById("split-egna-" + id);
    if (inp) splitModalTempEgna[id] = parseFloat(inp.value) || 0;
  }
  visaSplitSteg1();
}

function uppdateraSplitEgnaInfo() {
  const beloppId = splitModalKontext === "add" ? "belopp" : "edit-belopp";
  const bel = parseFloat(document.getElementById(beloppId).value) || 0;
  const egna = {};
  for (const id of splitModalTempInkluderade) {
    egna[id] = parseFloat(document.getElementById("split-egna-" + id)?.value) || 0;
  }
  document.getElementById("split-egna-info").textContent = egnaInfoText(bel, egna, splitModalTempInkluderade);
}

function sparaDelmangd() {
  const allaAr = splitModalTempInkluderade.length === personer.length;
  if (splitModalKontext === "add") {
    splitTyp = allaAr ? "jamnt" : "delmangd";
    splitInkluderade = allaAr ? [] : [...splitModalTempInkluderade];
    splitEgna = {};
    uppdateraSplitKnapp("add");
  } else {
    editSplitTyp = allaAr ? "jamnt" : "delmangd";
    editSplitInkluderade = allaAr ? [] : [...splitModalTempInkluderade];
    editSplitEgna = {};
    uppdateraSplitKnapp("edit");
  }
  stangSplitModal();
}

function sparaEgnaFranModal() {
  const beloppId = splitModalKontext === "add" ? "belopp" : "edit-belopp";
  const bel = parseFloat(document.getElementById(beloppId).value) || 0;
  const egna = {};
  let summa = 0;
  for (const id of splitModalTempInkluderade) {
    const v = parseFloat(document.getElementById("split-egna-" + id)?.value) || 0;
    egna[id] = v;
    summa += v;
  }
  if (bel > 0 && summa > bel + 0.001) {
    document.getElementById("split-egna-info").textContent =
      "⚠️ Egna belopp (" + summa.toFixed(2).replace(".",",") + " kr) överstiger totalt (" + bel.toFixed(2).replace(".",",") + " kr)";
    return;
  }
  const allaAr = splitModalTempInkluderade.length === personer.length;
  const harEgna = summa > 0.001;
  let nyTyp, nyInkl, nyEgna;
  if (!harEgna) {
    nyTyp = allaAr ? "jamnt" : "delmangd";
    nyInkl = allaAr ? [] : [...splitModalTempInkluderade];
    nyEgna = {};
  } else {
    nyTyp = "egna";
    nyInkl = [...splitModalTempInkluderade];
    nyEgna = { ...egna };
  }
  if (splitModalKontext === "add") {
    splitTyp = nyTyp;
    splitInkluderade = nyInkl;
    splitEgna = nyEgna;
    uppdateraSplitKnapp("add");
  } else {
    editSplitTyp = nyTyp;
    editSplitInkluderade = nyInkl;
    editSplitEgna = nyEgna;
    uppdateraSplitKnapp("edit");
  }
  stangSplitModal();
}

function uppdateraSplitKnapp(kontext) {
  const likaBtn = document.getElementById(kontext === "add" ? "split-lika" : "edit-split-lika");
  const anpassaBtn = document.getElementById(kontext === "add" ? "split-knapp" : "edit-split-knapp");
  if (!likaBtn || !anpassaBtn) return;
  const typ = kontext === "add" ? splitTyp : editSplitTyp;
  const inkl = kontext === "add" ? splitInkluderade : editSplitInkluderade;
  const arLika = typ === "jamnt";
  let anpassaText;
  if (typ === "egna") {
    anpassaText = "Egna belopp";
  } else if (typ === "delmangd") {
    const namn = inkl.map(id => personer.find(p => p.id === id)?.namn || id);
    anpassaText = namn.length <= 2 ? "Delas: " + namn.join(" & ") : "Delas av " + namn.length + " st";
  } else {
    anpassaText = "Anpassa…";
  }
  anpassaBtn.textContent = anpassaText;
  likaBtn.classList.toggle("aktiv", arLika);
  anpassaBtn.classList.toggle("aktiv", !arLika);
}

function valjDelasLika(kontext) {
  if (kontext === "add") {
    splitTyp = "jamnt";
    splitInkluderade = [];
    splitEgna = {};
    uppdateraSplitKnapp("add");
  } else {
    editSplitTyp = "jamnt";
    editSplitInkluderade = [];
    editSplitEgna = {};
    uppdateraSplitKnapp("edit");
  }
}

function stangSplitModal() {
  document.getElementById("split-modal").classList.remove("visa");
}

function stangSplitModalVidKlickUtanfor(event) {
  if (event.target === document.getElementById("split-modal")) stangSplitModal();
}

// LÄGG TILL
function laggTillUtgift() {
  const besk = document.getElementById("beskrivning").value.trim();
  const bel = parseFloat(document.getElementById("belopp").value);
  const betalare_id = document.getElementById("betalare").value;
  if (!besk) { alert("Fyll i beskrivning."); return; }
  const harBelopp = !isNaN(bel) && bel > 0;
  let fordelning = {};
  if (harBelopp) {
    const deltagare = splitTyp === "jamnt" ? deltagareIds() : splitInkluderade;
    const logikTyp = splitTyp === "delmangd" ? "jamnt" : splitTyp;
    fordelning = raknaDel(bel, logikTyp, deltagare, splitEgna);
    if (!fordelning) { alert("Egna kostnader överstiger totalt belopp."); return; }
  }
  utgifter.unshift({
    id: Date.now(),
    beskrivning: besk,
    belopp: harBelopp ? bel : 0,
    betalare_id,
    fordelning,
    datum: datumTillStr(valtDatum),
    splitTyp,
    inkluderade: splitInkluderade.length > 0 ? [...splitInkluderade] : undefined,
    egnaBelopp: splitTyp === "egna" ? { ...splitEgna } : undefined,
  });
  spara();
  document.getElementById("beskrivning").value = "";
  document.getElementById("belopp").value = "";
  document.getElementById("btn-lagg-till").disabled = true;
  splitTyp = "jamnt";
  splitInkluderade = [];
  splitEgna = {};
  uppdateraSplitKnapp("add");
  resetDatum();
  uppdatera();
}

// DETALJER - öppna
function oppnaDetaljer(id) {
  // Reglerade sessioner: visning är read-only, inga detaljer att redigera.
  if (aktivArReglerad()) return;
  const u = utgifter.find(x => x.id === id);
  if (!u) return;
  editId = id;
  document.getElementById("edit-beskrivning").value = u.beskrivning || "";
  document.getElementById("edit-belopp").value = u.belopp || "";
  document.getElementById("edit-betalare").value = u.betalare_id;

  valtEditDatum = parsaDatum(u.datum);
  uppdateraEditDatumChip();
  renderaFordelningslista(u);

  if (u.splitTyp) {
    editSplitTyp = u.splitTyp;
    editSplitInkluderade = u.inkluderade ? [...u.inkluderade] : [];
    editSplitEgna = u.egnaBelopp ? { ...u.egnaBelopp } : {};
  } else {
    // Bakåtkompatibel inferens för gamla utgifter
    const n = personer.length;
    const expectedShare = u.belopp / n;
    const arJamnt = personer.every(p => Math.abs((u.fordelning?.[p.id] || 0) - expectedShare) < 0.001);
    editSplitTyp = arJamnt ? "jamnt" : "egna";
    editSplitInkluderade = [];
    editSplitEgna = {};
  }
  uppdateraSplitKnapp("edit");
  document.getElementById("edit-modal").classList.add("visa");
}

function renderaFordelningslista(u) {
  const container = document.getElementById("edit-fordelning-lista");
  const harBelopp = u.belopp > 0 && u.fordelning;
  if (!harBelopp) {
    container.innerHTML = '<div class="fordelning-rad noll"><span class="fordelning-namn">Inget belopp angivet ännu</span></div>';
    return;
  }
  container.innerHTML = personer.map(p => {
    const andel = u.fordelning[p.id] || 0;
    const nollKlass = andel < 0.001 ? " noll" : "";
    const taggKlass = u.betalare_id === migId ? "p1" : "p2";
    const tagg = p.id === u.betalare_id ? `<span class="fordelning-betalt-tagg ${taggKlass}">betalade</span>` : "";
    return `
      <div class="fordelning-rad${nollKlass}">
        <span class="fordelning-namn">${esc(p.namn)}${tagg}</span>
        <span class="fordelning-belopp">${andel.toFixed(2).replace(".",",")} kr</span>
      </div>`;
  }).join("");
}

// DETALJER - spara
function sparaEdit() {
  const besk = document.getElementById("edit-beskrivning").value.trim();
  const bel = parseFloat(document.getElementById("edit-belopp").value);
  const betalare_id = document.getElementById("edit-betalare").value;
  if (!besk) { alert("Fyll i beskrivning."); return; }
  const harBelopp = !isNaN(bel) && bel > 0;
  let fordelning = {};
  if (harBelopp) {
    const deltagare = editSplitTyp === "jamnt" ? deltagareIds() : editSplitInkluderade;
    const logikTyp = editSplitTyp === "delmangd" ? "jamnt" : editSplitTyp;
    fordelning = raknaDel(bel, logikTyp, deltagare, editSplitEgna);
    if (!fordelning) { alert("Egna kostnader överstiger totalt belopp."); return; }
  }
  const idx = utgifter.findIndex(x => x.id === editId);
  if (idx !== -1) {
    utgifter[idx] = {
      ...utgifter[idx],
      beskrivning: besk,
      belopp: harBelopp ? bel : 0,
      betalare_id,
      fordelning,
      datum: datumTillStr(valtEditDatum),
      splitTyp: editSplitTyp,
      inkluderade: editSplitInkluderade.length > 0 ? [...editSplitInkluderade] : undefined,
      egnaBelopp: editSplitTyp === "egna" ? { ...editSplitEgna } : undefined,
    };
  }
  spara();
  uppdatera();
  stangModal("edit-modal");
}

function raderaUtgift() {
  if (!confirm("Ta bort utgiften?")) return;
  utgifter = utgifter.filter(x => x.id !== editId);
  spara();
  uppdatera();
  stangModal("edit-modal");
}

function uppdatera() {
  const saldoMap = raknaUtSaldo(utgifter, personer);
  const saldoMig = saldoMap[migId] || 0;
  const totalt = utgifter.reduce((s, u) => s + u.belopp, 0);
  const kortEl = document.getElementById("saldo-kort");
  const labelEl = document.getElementById("saldo-label");
  const belEl = document.getElementById("saldo-belopp");
  const txtEl = document.getElementById("saldo-text");

  const totaltTxt = totalt > 0 ? "Totalt " + totalt.toFixed(2).replace(".",",") + " kr i utgifter" : "";
  if (Math.abs(saldoMig) < 0.01) {
    kortEl.className = "saldo-kort noll";
    labelEl.textContent = "Jämnt";
    belEl.textContent = "";
    txtEl.textContent = totaltTxt;
  } else if (saldoMig > 0) {
    kortEl.className = "saldo-kort";
    labelEl.textContent = "Du skall få";
    belEl.textContent = Math.abs(saldoMig).toFixed(2).replace(".",",") + " kr";
    txtEl.textContent = totaltTxt;
  } else {
    kortEl.className = "saldo-kort";
    labelEl.textContent = "Du är skyldig";
    belEl.textContent = Math.abs(saldoMig).toFixed(2).replace(".",",") + " kr";
    txtEl.textContent = totaltTxt;
  }

  const lista = document.getElementById("historik-lista");
  if (utgifter.length === 0) {
    lista.innerHTML = '<div class="tom-historik">Inga utgifter ännu.</div>';
    return;
  }
  const sorterade = [...utgifter].sort((a, b) => (b.datum || "").localeCompare(a.datum || ""));
  lista.innerHTML = sorterade.map(u => {
    const betalare = personer.find(p => p.id === u.betalare_id);
    const betalareNamn = betalare?.namn || u.betalare_id;
    const badgeKlass = u.betalare_id === migId ? "p1" : "p2";
    const harBelopp = u.belopp > 0;
    const beloppText = harBelopp ? u.belopp.toFixed(2).replace(".",",") + " kr" : "– kr";
    return `
      <div class="utgift-rad" onclick="oppnaDetaljer(${u.id})">
        <div class="utgift-info">
          <div class="utgift-beskrivning">${esc(u.beskrivning)}</div>
          <div class="utgift-meta">${u.datum}</div>
          <span class="betald-badge ${badgeKlass}">Betalt av ${esc(betalareNamn)}</span>
        </div>
        <div class="utgift-belopp">
          <div class="utgift-totalt">${beloppText}</div>
          <div class="edit-hint">tryck för detaljer</div>
        </div>
      </div>`;
  }).join("");
}

function esc(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

function visaSaldoDetalj() {
  const lista = document.getElementById("saldo-detalj-lista");

  // Ditt saldo — par som involverar mig
  const mittSaldo = raknaParSaldon(utgifter, migId, personer);
  const mittHtml = mittSaldo.map(({ id, netto }) => {
    const namn = esc(personer.find(p => p.id === id)?.namn || id);
    if (Math.abs(netto) < 0.01) {
      return `<div class="saldo-detalj-rad noll"><strong>${namn}</strong>: jämnt</div>`;
    } else if (netto > 0) {
      return `<div class="saldo-detalj-rad"><strong>${namn}</strong> skall betala dig <strong>${netto.toFixed(2).replace(".",",")} kr</strong></div>`;
    } else {
      return `<div class="saldo-detalj-rad">Du är skyldig <strong>${namn}</strong> <strong>${Math.abs(netto).toFixed(2).replace(".",",")} kr</strong></div>`;
    }
  }).join("");

  const ovrigaRader = [];
  for (const p of personer) {
    if (p.id === migId) continue;
    for (const { id: annarsId, netto } of raknaParSaldon(utgifter, p.id, personer)) {
      if (annarsId === migId) continue;
      if (netto > 0.01) {
        const betalarNamn = esc(personer.find(x => x.id === annarsId)?.namn || annarsId);
        const mottagarNamn = esc(p.namn);
        const belopp = netto.toFixed(2).replace(".",",");
        ovrigaRader.push(`<div class="saldo-detalj-rad"><strong>${betalarNamn}</strong> skall betala <strong>${mottagarNamn}</strong> <strong>${belopp} kr</strong></div>`);
      }
    }
  }

  let html = "";
  if (mittHtml) {
    const rubrik = personer.length > 2 ? '<div class="saldo-detalj-sektion-rubrik">Ditt saldo</div>' : "";
    html += `<div class="saldo-detalj-sektion">${rubrik}${mittHtml}</div>`;
  }
  if (ovrigaRader.length > 0) {
    html += `<div class="saldo-detalj-sektion"><div class="saldo-detalj-sektion-rubrik">Övriga</div>${ovrigaRader.join("")}</div>`;
  }

  lista.innerHTML = html;
  document.getElementById("saldo-detalj-modal").classList.add("visa");
}

function visaRegleraModal() {
  const parSaldon = raknaParSaldon(utgifter, migId, personer);
  const saldoMig = raknaUtSaldo(utgifter, personer)[migId] || 0;

  let html;
  if (Math.abs(saldoMig) < 0.01) {
    html = "Sessionen markeras som reglerad och flyttas till historiken.";
  } else {
    const rader = parSaldon
      .filter(({ netto }) => Math.abs(netto) >= 0.01)
      .map(({ id, netto }) => {
        const annan = personer.find(p => p.id === id);
        const namn = esc(annan?.namn || id);
        const belopp = Math.abs(netto).toFixed(2).replace(".",",");
        return netto > 0
          ? `<strong>${namn}</strong> betalar dig <strong>${belopp} kr</strong>`
          : `Du betalar <strong>${namn}</strong> <strong>${belopp} kr</strong>`;
      });
    html = rader.join("<br>") + "<br><br>När ni gjort upp: bekräfta för att markera sessionen som reglerad.";
  }
  document.getElementById("reglera-text").innerHTML = html;
  document.getElementById("reglera-modal").classList.add("visa");
}
function stangModal(id) { document.getElementById(id).classList.remove("visa"); }
function reglera() {
  const s = aktivSession();
  if (s) {
    s.reglerad = true;
    sparaSessionsMeta();
  }
  stangModal("reglera-modal");
  // Växla till nästa pågående om det finns; annars stanna kvar i read-only-läge.
  const nastaPagaende = sessions.find(x => !x.reglerad && x.id !== s?.id);
  if (nastaPagaende) {
    vaxlaTillSession(nastaPagaende.id);
  } else {
    // Ingen annan pågående — visa read-only-vyn för den nyligen reglerade.
    visaApp();
  }
}

function sparaFil() {
  const s = aktivSession();
  const data = {
    version: 2,
    exporterad: new Date().toISOString(),
    namn: s?.namn || "Min lista",
    reglerad: !!s?.reglerad,
    personer,
    utgifter,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const filnamn = (s?.namn || "kvitts").replace(/[^a-zA-Z0-9åäöÅÄÖ_-]+/g, "-").replace(/^-+|-+$/g, "") || "kvitts";
  a.download = filnamn + "-" + new Date().toLocaleDateString("sv-SE") + ".json";
  a.click();
  URL.revokeObjectURL(url);
}

function laddaFil(event) {
  const fil = event.target.files[0];
  if (!fil) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data.utgifter)) {
        alert("Filen ser inte ut som en giltig Kvitts-fil (saknar utgifter).");
        return;
      }
      let nyaPersoner;
      let nyaUtgifter;
      if (Array.isArray(data.personer) && data.personer.length > 0) {
        nyaPersoner = data.personer;
        nyaUtgifter = data.utgifter.map(migreraUtgift);
      } else if (typeof data.person2 === "string") {
        const p1Namn = person1 || "Mikael";
        nyaPersoner = [
          { id: "p1", namn: p1Namn },
          { id: "p2", namn: data.person2 },
        ];
        nyaUtgifter = data.utgifter.map(migreraUtgift);
      } else {
        alert(
          "Filen ser inte ut som en giltig Kvitts-fil.\n\n" +
          "Fält i filen: " + Object.keys(data).join(", ")
        );
        return;
      }

      // Säkerställ att nuvarande aktiva sessions data är sparad innan vi skapar ny.
      sparaAktivSessionsData();

      const namnFranFil = (typeof data.namn === "string" && data.namn.trim())
        ? data.namn.trim()
        : "Importerad " + new Date().toLocaleDateString("sv-SE");
      const nySession = skapaSession(namnFranFil, nyaPersoner, "p1", nyaUtgifter);
      if (data.reglerad) {
        nySession.reglerad = true;
        sparaSessionsMeta();
      }
      vaxlaTillSession(nySession.id);
    } catch (err) {
      alert("Kunde inte läsa filen: " + err.message);
    }
  };
  reader.readAsText(fil);
  event.target.value = "";
}

function spara() {
  sparaAktivSessionsData();
}

function visaMeny() {
  renderaSessionsLista();
  const reglerad = aktivArReglerad();
  // Reglera-knappen visas bara när aktiv session är pågående
  const regleraBtn = document.getElementById("meny-reglera-btn");
  if (regleraBtn) regleraBtn.style.display = reglerad || !aktivSessionId ? "none" : "block";
  // Spara-knappen visas om det finns utgifter i aktiv session
  document.getElementById("meny-spara-btn").style.display = utgifter.length > 0 ? "block" : "none";
  document.getElementById("meny-modal").classList.add("visa");
}
function stangMenyVidKlickUtanfor(event) {
  if (event.target === document.getElementById("meny-modal")) stangModal("meny-modal");
}
function visaRegleraFranMeny() { stangModal("meny-modal"); visaRegleraModal(); }
function laddaFilFranMeny() { stangModal("meny-modal"); document.getElementById("ladda-input").click(); }
function sparaFilFranMeny() { sparaFil(); stangModal("meny-modal"); }

// SESSIONS-UI
function renderaSessionsLista() {
  const pagaende = sessions.filter(s => !s.reglerad);
  const reglerade = sessions.filter(s => s.reglerad);
  document.getElementById("sessions-pagaende").innerHTML =
    pagaende.map(s => sessionRadHtml(s, false)).join("") ||
    '<div class="session-meta" style="padding:0.3rem 0">Inga pågående sessioner.</div>';
  const reglRoot = document.getElementById("sessions-reglerade");
  const reglSektion = document.getElementById("sessions-reglerade-sektion");
  if (reglerade.length === 0) {
    reglSektion.style.display = "none";
    reglRoot.innerHTML = "";
  } else {
    reglSektion.style.display = "block";
    reglRoot.innerHTML = reglerade.map(s => sessionRadHtml(s, true)).join("");
  }
}

function sessionRadHtml(s, ärReglerad) {
  const aktivKlass = s.id === aktivSessionId ? " aktiv" : "";
  const aktivTagg = s.id === aktivSessionId ? '<span class="session-aktiv-tagg">aktiv</span>' : "";
  // Hämta metadata för att visa t.ex. antal utgifter
  const data = laddaSessionsData(s.id);
  const antal = data?.utgifter?.length || 0;
  const antalTxt = antal === 1 ? "1 utgift" : antal + " utgifter";
  const raderaBtn = ärReglerad ? `
    <button class="session-radera-btn" onclick="fragaRaderaSession('${s.id}', event)" aria-label="Ta bort">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18"/>
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      </svg>
    </button>` : "";
  return `
    <div class="session-rad${aktivKlass}">
      <div class="session-info">
        <button class="session-namn-btn" onclick="vaxlaTillSessionFranMeny('${s.id}')">${esc(s.namn)}${aktivTagg}</button>
        <div class="session-meta">${antalTxt}</div>
      </div>
      ${raderaBtn}
    </div>`;
}

function vaxlaTillSessionFranMeny(id) {
  if (id === aktivSessionId) { stangModal("meny-modal"); return; }
  vaxlaTillSession(id);
  stangModal("meny-modal");
}

// NY SESSION-FORM
function visaNySessionForm() {
  stangModal("meny-modal");
  document.getElementById("ny-session-namn").value = "";
  document.getElementById("ny-session-personer").innerHTML = "";
  nySessionLaggTillPersonFalt();
  document.getElementById("ny-session-modal").classList.add("visa");
}

function nySessionLaggTillPersonFalt() {
  const lista = document.getElementById("ny-session-personer");
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Namn (t.ex. Anna)";
  input.maxLength = 20;
  input.style.cssText = "padding:0.75rem 0.85rem; border:1.5px solid var(--border); border-radius:10px; font-family:'DM Sans',sans-serif; font-size:0.95rem; background:var(--bg);";
  lista.appendChild(input);
  input.focus();
}

function skapaOchVaxlaNySession() {
  const namn = document.getElementById("ny-session-namn").value.trim() || "Min lista";
  const inputs = document.querySelectorAll("#ny-session-personer input");
  const andraNamn = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);
  if (andraNamn.length === 0) { alert("Lägg till minst en person att dela utgifter med."); return; }

  const migNamn = person1 || personer.find(p => p.id === migId)?.namn || "Jag";
  const nyaPersoner = [{ id: "p1", namn: migNamn }];
  andraNamn.forEach((n, i) => nyaPersoner.push({ id: "p" + (i + 2), namn: n }));

  const session = skapaSession(namn, nyaPersoner, "p1", []);
  stangModal("ny-session-modal");
  vaxlaTillSession(session.id);
}

// RADERA SESSION
let raderaSessionId = null;
function fragaRaderaSession(id, event) {
  if (event) event.stopPropagation();
  const s = sessions.find(x => x.id === id);
  if (!s) return;
  raderaSessionId = id;
  document.getElementById("radera-session-text").innerHTML =
    `Ta bort sessionen <strong>${esc(s.namn)}</strong>? Detta går inte att ångra.`;
  stangModal("meny-modal");
  document.getElementById("radera-session-modal").classList.add("visa");
}
function bekraftaRaderaSession() {
  if (!raderaSessionId) return;
  const blevAktivBorttagen = raderaSessionId === aktivSessionId;
  raderaSession(raderaSessionId);
  raderaSessionId = null;
  stangModal("radera-session-modal");
  if (blevAktivBorttagen) {
    // Välj ny aktiv eller hamna i onboarding
    const nyAktiv = sessions.find(s => !s.reglerad) || sessions[0];
    if (nyAktiv) { vaxlaTillSession(nyAktiv.id); return; }
    personer = []; utgifter = []; migId = "p1";
    visaSkarm2();
    return;
  }
  visaMeny();
}

init();
