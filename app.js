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
let _autoTotalLage = false;       // sant om beloppsfältet var tomt när steg 2 öppnades

// 018b: state för join/återanslutningsflödet
let _joinEpost = "";           // sparas tillfälligt under join-flödet
let _joinMemberToken = "";     // genereras vid join, visas i bekräftelseskärm
let _joinGruppForAterstall = null; // { gruppId, gruppNamn } – under återanslutningsflödet
let _joinFranAterstall = null; // { gruppId, gruppNamn } – satt när join-flödet nåtts via inbjudningslänk, för att kunna gå tillbaka

// 017: kvittenser (settlements) för aktiv grupp. Speglar `settlements`-tabellen.
let _kvittenser = [];          // [{ fran, till, belopp }]

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
  // Bevara extra fält (gruppId, personId, kind) som finns i befintlig data.
  const befintlig = laddaSessionsData(aktivSessionId) || {};
  const data = { ...befintlig, personer, migId, utgifter };
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

function skapaSession(namn, sessionPersoner, sessionMigId, sessionUtgifter, extraData) {
  const id = "s" + Date.now() + "_" + Math.floor(Math.random() * 10000);
  const kind = (extraData && extraData.kind) || "lokal";
  const session = {
    id,
    namn: unikaNamn(namn || "Min lista"),
    skapad: new Date().toISOString(),
    reglerad: false,
    kind,
  };
  sessions.push(session);
  const data = {
    personer: sessionPersoner,
    migId: sessionMigId,
    utgifter: sessionUtgifter || [],
    ...(extraData || {}),
  };
  localStorage.setItem(sessionDataKey(id), JSON.stringify(data));
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
  _kvittenser = [];
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
async function init() {
  migreraGamlaNycklar();
  migreraTillNPersoner();
  migreraTillSessions();
  laddaSessionsMeta();

  // 018b lager 3: tyst återanslutning via ?me=<member_token>
  const urlParams = new URLSearchParams(window.location.search);
  const memberToken = urlParams.get("me");
  if (memberToken) {
    const lyckades = await forsokTokenAteranslutning(memberToken);
    if (lyckades) return;
    // Misslyckades — URL städad, fortsätt normal init nedan
  }

  // Grupp-länk har företräde — men kolla om vi redan har en session för gruppen.
  const gruppId = parseGruppSokvag(window.location.pathname);
  if (gruppId) {
    const befintligGruppSession = sessions.find(s => {
      if (s.kind !== "grupp") return false;
      const d = laddaSessionsData(s.id);
      return d && d.gruppId === gruppId;
    });
    if (befintligGruppSession) {
      // Redan med — gå direkt in utan join-flöde
      if (window.history && window.history.replaceState) window.history.replaceState({}, "", "/");
      vaxlaTillSession(befintligGruppSession.id);
    } else {
      // 018a + 018b: tyst återanslutning eller erbjud återanslutningsflöde
      forsokTystAteranslutning(gruppId);
    }
    return;
  }

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
  visaSkarm2();
}

// INTRO-SKÄRMAR
function visaSkarm1() {
  doljAllaSkärmar();
  document.getElementById("intro-1").style.display = "flex";
  const sparadP1 = localStorage.getItem("kvitts_person1");
  const input = document.getElementById("intro-person1-namn");
  if (sparadP1) {
    input.value = sparadP1;
    document.getElementById("btn-nasta-1").disabled = false;
  } else {
    input.value = "";
    document.getElementById("btn-nasta-1").disabled = true;
  }
  input.focus();
}

function visaSkarm2() {
  doljAllaSkärmar();
  document.getElementById("intro-2").style.display = "flex";
  kanskeVisaInstallToast();
}

function visaSkarm3a() {
  doljAllaSkärmar();
  document.getElementById("intro-3a-text").textContent = "Vem delar du utgifter med, " + person1 + "?";
  document.getElementById("intro-3a").style.display = "flex";
  document.getElementById("setup-namn-lista").innerHTML = "";
  laggTillPersonFalt();
}

function doljAllaSkärmar() {
  document.querySelectorAll(".intro-skarm").forEach(el => el.style.display = "none");
  document.getElementById("app").style.display = "none";
  document.getElementById("grupp-borttaget-skarm").style.display = "none";
  document.getElementById("topbar-meny").hidden = true;
  document.querySelector(".brand-topbar").classList.remove("kompakt");
  stoppPolling();
  sattOfflineMode(false);
}

function sparaNamnOchGaTillDeltagare() {
  const v = document.getElementById("intro-person1-namn").value.trim();
  if (!v) return;
  person1 = v;
  localStorage.setItem("kvitts_person1", person1);
  visaSkarm3a();
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
  document.getElementById("grupp-borttaget-skarm").style.display = "none";
  document.getElementById("app").style.display = "block";
  document.getElementById("topbar-meny").hidden = false;
  document.querySelector(".brand-topbar").classList.add("kompakt");
  sattOfflineMode(false);
  syncaPersonAlias();

  const s = aktivSession();
  const subtitleEl = document.getElementById("app-subtitle");
  if (s && s.kind === "grupp") {
    // Grupp-header uppdateras igen av uppdateraGruppHeader() efter polling-svar.
    const antalPersoner = personer.length;
    const personerTxt = antalPersoner === 1 ? "1 person" : antalPersoner + " personer";
    subtitleEl.textContent = s.namn + " · " + personerTxt;
    subtitleEl.classList.add("klickbar");
  } else {
    subtitleEl.classList.remove("klickbar");
    const andra = personer.filter(p => p.id !== migId);
    let subtitle;
    if (andra.length === 1) subtitle = person1 + " & " + andra[0].namn;
    else if (andra.length === 2) subtitle = person1 + ", " + andra[0].namn + " & " + andra[1].namn;
    else subtitle = person1 + " & " + andra.length + " andra";
    if (s) subtitle = s.namn + " · " + subtitle;
    subtitleEl.textContent = subtitle;
  }

  const notisKnapp = document.getElementById("notis-knapp");
  if (notisKnapp) notisKnapp.hidden = !(s && s.kind === "grupp");
  uppdateraOlastBadge();

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

  if (s && s.kind === "grupp") {
    startaPolling();
    refreshDeltagareOchUtgifter(true);
  } else {
    stoppPolling();
    uppdatera();
  }

  // 029: uppdatera install-UI och visa ev. engångs-toast
  uppdateraInstallUI();
  kanskeVisaInstallToast();
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
  const befintligtBelopp = parseFloat(document.getElementById(beloppId).value) || 0;
  _autoTotalLage = befintligtBelopp <= 0;
  // Sätt subtitle beroende på läge
  const subEl = document.getElementById("split-steg2-sub");
  if (subEl) {
    subEl.textContent = _autoTotalLage
      ? "Ange vad var och en betalar — totalen räknas ut automatiskt."
      : "Fyll bara i det som är personligt, t.ex. en extra vara. Resten av beloppet delas lika.";
  }
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
  const egna = {};
  let summa = 0;
  for (const id of splitModalTempInkluderade) {
    const v = parseFloat(document.getElementById("split-egna-" + id)?.value) || 0;
    egna[id] = v;
    summa += v;
  }
  // Auto-total: om beloppsfältet var tomt när steg 2 öppnades, håll det
  // synkat med summan av delbeloppen så användaren slipper räkna ihop totalen.
  if (_autoTotalLage && summa > 0) {
    document.getElementById(beloppId).value = summa.toFixed(2).replace(/\.00$/, "");
  }
  const bel = parseFloat(document.getElementById(beloppId).value) || 0;
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
    anpassaText = "✓ Egna belopp";
  } else if (typ === "delmangd") {
    const namn = inkl.map(id => personer.find(p => p.id === id)?.namn || id);
    anpassaText = namn.length <= 2 ? "✓ Delas: " + namn.join(" & ") : "✓ Delas av " + namn.length + " st";
  } else {
    anpassaText = "Fördela…";
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
async function laggTillUtgift() {
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
  const nyUtgift = {
    beskrivning: besk,
    belopp: harBelopp ? bel : 0,
    betalare_id,
    fordelning,
    datum: datumTillStr(valtDatum),
    splitTyp,
    inkluderade: splitInkluderade.length > 0 ? [...splitInkluderade] : undefined,
    egnaBelopp: splitTyp === "egna" ? { ...splitEgna } : undefined,
  };

  const grupp = aktivGruppData();
  if (grupp) {
    const btn = document.getElementById("btn-lagg-till");
    btn.disabled = true;
    try {
      await KvittsSupabase.laggTillUtgiftGrupp(grupp.gruppId, nyUtgift, grupp.personId);
      await refreshUtgifter();
    } catch (e) {
      alert("Kunde inte spara utgiften: " + (e.message || e));
      btn.disabled = false;
      return;
    }
  } else {
    utgifter.unshift({ id: Date.now(), ...nyUtgift });
    spara();
    uppdatera();
  }

  document.getElementById("beskrivning").value = "";
  document.getElementById("belopp").value = "";
  document.getElementById("btn-lagg-till").disabled = true;
  splitTyp = "jamnt";
  splitInkluderade = [];
  splitEgna = {};
  uppdateraSplitKnapp("add");
  resetDatum();
}

// DETALJER - öppna
function oppnaDetaljer(id) {
  // Reglerade sessioner: visning är read-only, inga detaljer att redigera.
  if (aktivArReglerad()) return;
  const u = utgifter.find(x => x.id == id);
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
async function sparaEdit() {
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
  const patch = {
    beskrivning: besk,
    belopp: harBelopp ? bel : 0,
    betalare_id,
    fordelning,
    datum: datumTillStr(valtEditDatum),
    splitTyp: editSplitTyp,
    inkluderade: editSplitInkluderade.length > 0 ? [...editSplitInkluderade] : null,
    egnaBelopp: editSplitTyp === "egna" ? { ...editSplitEgna } : null,
  };

  const grupp = aktivGruppData();
  if (grupp) {
    try {
      await KvittsSupabase.uppdateraUtgift(editId, patch);
      stangModal("edit-modal");
      await refreshUtgifter();
    } catch (e) {
      alert("Kunde inte uppdatera utgiften: " + (e.message || e));
    }
    return;
  }

  const idx = utgifter.findIndex(x => x.id == editId);
  if (idx !== -1) utgifter[idx] = { ...utgifter[idx], ...patch };
  spara();
  uppdatera();
  stangModal("edit-modal");
}

async function raderaUtgift() {
  if (!confirm("Ta bort utgiften?")) return;

  const grupp = aktivGruppData();
  if (grupp) {
    try {
      await KvittsSupabase.raderaUtgiftGrupp(editId);
      stangModal("edit-modal");
      await refreshUtgifter();
    } catch (e) {
      alert("Kunde inte ta bort utgiften: " + (e.message || e));
    }
    return;
  }

  utgifter = utgifter.filter(x => x.id != editId);
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
      <div class="utgift-rad" onclick="oppnaDetaljer('${u.id}')">
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

  const visaMinimera = personer.length > 2 && minimeradeOverforingar(utgifter, personer).length > 0;
  document.getElementById("saldo-detalj-minimera-wrap").style.display = visaMinimera ? "" : "none";

  document.getElementById("saldo-detalj-modal").classList.add("visa");
}

function gaTillMinimera() {
  stangModal("saldo-detalj-modal");
  visaRegleraModal({ initialtLage: "minimera" });
}

let _regleraLage = "parvisa";

function _renderaRegleraLista() {
  const s = aktivSession();
  if (s && s.kind === "grupp") {
    _renderaRegleraGrupp();
    return;
  }

  // Lokala sessioner: befintligt beteende (markera hela sessionen som reglerad).
  _sattRegleraKnappar({ grupp: false });
  const saldoMig = raknaUtSaldo(utgifter, personer)[migId] || 0;
  const allaNetton = Object.values(raknaUtSaldo(utgifter, personer));
  const nollat = allaNetton.every(v => Math.abs(v) < 0.01);

  const toggleWrap = document.getElementById("reglera-toggle-wrap");
  const lista = document.getElementById("reglera-lista");

  if (nollat) {
    toggleWrap.style.display = "none";
    lista.innerHTML = "<p>Sessionen markeras som reglerad och flyttas till historiken.</p>";
    return;
  }

  if (personer.length > 2) {
    toggleWrap.style.display = "";
    document.getElementById("reglera-btn-minimera").classList.toggle("aktiv", _regleraLage === "minimera");
    document.getElementById("reglera-btn-parvisa").classList.toggle("aktiv", _regleraLage === "parvisa");
  } else {
    toggleWrap.style.display = "none";
  }

  let rader = [];
  if (_regleraLage === "minimera") {
    rader = minimeradeOverforingar(utgifter, personer).map(({ fran, till, belopp }) => {
      const franNamn = fran === migId ? "Du" : `<strong>${esc(personer.find(p => p.id === fran)?.namn || fran)}</strong>`;
      const tillNamn = till === migId ? "dig" : `<strong>${esc(personer.find(p => p.id === till)?.namn || till)}</strong>`;
      const beloppStr = belopp.toFixed(2).replace(".", ",");
      return `${franNamn} betalar ${tillNamn} <strong>${beloppStr} kr</strong>`;
    });
  } else {
    rader = raknaParSaldon(utgifter, migId, personer)
      .filter(({ netto }) => Math.abs(netto) >= 0.01)
      .map(({ id, netto }) => {
        const namn = esc(personer.find(p => p.id === id)?.namn || id);
        const beloppStr = Math.abs(netto).toFixed(2).replace(".", ",");
        return netto > 0
          ? `<strong>${namn}</strong> betalar dig <strong>${beloppStr} kr</strong>`
          : `Du betalar <strong>${namn}</strong> <strong>${beloppStr} kr</strong>`;
      });
  }

  lista.innerHTML = rader.join("<br>") + "<br><br>När ni gjort upp: bekräfta för att markera sessionen som reglerad.";
}

// 017: Reglera-vy för grupp. Utgår från den optimerade planen och visar
// kvitterings-status per överföring. Kreditorn (till === migId) får en knapp;
// debitorn ser en statusindikator. Arkivering sker automatiskt via polling.
function _renderaRegleraGrupp() {
  _sattRegleraKnappar({ grupp: true });
  document.getElementById("reglera-toggle-wrap").style.display = "none";
  const lista = document.getElementById("reglera-lista");

  const plan = minimeradeOverforingar(utgifter, personer);
  if (plan.length === 0) {
    lista.innerHTML = "<p>Inga skulder att reglera – allt är redan jämnt.</p>";
    return;
  }

  const matchad = matchaPlanMotKvittenser(plan, _kvittenser);
  const namn = id => esc(personer.find(p => p.id === id)?.namn || id);

  const rader = matchad.map(rad => {
    const beloppStr = rad.belopp.toFixed(2).replace(".", ",");
    if (rad.till === migId) {
      // Jag är kreditor: knapp för att kvittera/ångra.
      const text = `<strong>${namn(rad.fran)}</strong> betalar dig <strong>${beloppStr} kr</strong>`;
      if (rad.kvitterad) {
        return `<div class="reglera-rad">
          <span>${text}</span>
          <button class="btn-reglera kvitterad" onclick="angraKvittens('${rad.fran}')">✓ Reglerat</button>
        </div>`;
      }
      const staleTxt = rad.stale ? ` <span class="reglera-stale">(beloppet ändrades)</span>` : "";
      return `<div class="reglera-rad">
        <span>${text}${staleTxt}</span>
        <button class="btn-reglera" onclick="kvitteraFran('${rad.fran}', ${rad.belopp})">Reglerat</button>
      </div>`;
    }
    if (rad.fran === migId) {
      // Jag är debitor: statusindikator, ingen knapp.
      const text = `Du betalar <strong>${namn(rad.till)}</strong> <strong>${beloppStr} kr</strong>`;
      const status = rad.kvitterad
        ? `<span class="reglera-status klar">✓ Reglerat</span>`
        : `<span class="reglera-status vantar">Väntar på bekräftelse…</span>`;
      return `<div class="reglera-rad"><span>${text}</span>${status}</div>`;
    }
    // Överföring mellan två andra: visas som kontext, ingen åtgärd.
    const text = `<strong>${namn(rad.fran)}</strong> betalar <strong>${namn(rad.till)}</strong> <strong>${beloppStr} kr</strong>`;
    const status = rad.kvitterad
      ? `<span class="reglera-status klar">✓ Reglerat</span>`
      : `<span class="reglera-status vantar">Ej reglerat</span>`;
    return `<div class="reglera-rad ovrig"><span>${text}</span>${status}</div>`;
  });

  const info = `<p class="reglera-info">Den som ska få pengar bekräftar när betalningen kommit in. När alla dina skulder är kvitterade arkiveras din vy automatiskt.</p>`;
  lista.innerHTML = info + rader.join("");
}

// Styr modalens footer-knappar beroende på läge.
function _sattRegleraKnappar({ grupp }) {
  const bekrafta = document.getElementById("reglera-btn-bekrafta");
  const stang = document.getElementById("reglera-btn-stang");
  if (grupp) {
    bekrafta.style.display = "none";
    stang.textContent = "Stäng";
    stang.style.flex = "1";
  } else {
    bekrafta.style.display = "";
    stang.textContent = "Avbryt";
    stang.style.flex = "";
  }
}

// 017: Kreditorn bekräftar att en debitor betalat.
async function kvitteraFran(franId, belopp) {
  const grupp = aktivGruppData();
  if (!grupp) return;
  try {
    await KvittsSupabase.kvitteraOverforing(grupp.gruppId, franId, migId, belopp);
    await refreshDeltagareOchUtgifter(true);
  } catch (e) {
    console.error("Kunde inte kvittera:", e);
    alert("Kunde inte spara regleringen. Försök igen.");
  }
}

// 017: Ångra en kvittens (kreditorn tryckte fel).
async function angraKvittens(franId) {
  const grupp = aktivGruppData();
  if (!grupp) return;
  try {
    await KvittsSupabase.avKvitteraOverforing(grupp.gruppId, franId, migId);
    await refreshDeltagareOchUtgifter(true);
  } catch (e) {
    console.error("Kunde inte ångra kvittens:", e);
    alert("Kunde inte ångra regleringen. Försök igen.");
  }
}

function byttRegleraLage(lage) {
  _regleraLage = lage;
  _renderaRegleraLista();
}

function visaRegleraModal(opts) {
  _regleraLage = (opts && opts.initialtLage) ? opts.initialtLage : (personer.length > 2 ? "minimera" : "parvisa");
  _renderaRegleraLista();
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

// =============================================================================
// GRUPP-UTGIFTER (feature 004b) + OFFLINE-HANTERING (004c)
// =============================================================================

let _offlineMode = false;

function sattOfflineMode(offline) {
  if (_offlineMode === offline) return;
  _offlineMode = offline;
  document.getElementById("offline-banner").style.display = offline ? "block" : "none";
  // Disabla/enablea formuläret så man inte råkar skriva mot en backend som inte svarar
  const form = document.getElementById("ny-utgift-kort");
  if (form) {
    form.querySelectorAll("input, select, button").forEach(el => {
      el.disabled = offline;
    });
  }
}

function visaGruppBorttaget() {
  // Rensa aktiv session och ta användaren tillbaka till menyn
  const s = aktivSession();
  if (s) {
    raderaSession(s.id);
    aktivSessionId = null;
    sparaSessionsMeta();
  }
  stoppPolling();
  doljAllaSkärmar();
  // Visa ett enkelt felmeddelande via intro-skärm-mönster
  const el = document.getElementById("grupp-borttaget-skarm");
  if (el) {
    el.style.display = "flex";
  } else {
    alert("Gruppen finns inte längre.");
    if (sessions.length > 0) {
      const nyAktiv = sessions.find(s => !s.reglerad) || sessions[0];
      vaxlaTillSession(nyAktiv.id);
    } else {
      visaSkarm2();
    }
  }
}

function aktivGruppData() {
  const s = aktivSession();
  if (!s || s.kind !== "grupp") return null;
  const data = laddaSessionsData(s.id);
  return data ? { gruppId: data.gruppId, personId: data.personId } : null;
}

// Uppdaterar lokal utgiftslista från Supabase och renderar om.
async function refreshUtgifter() {
  const grupp = aktivGruppData();
  if (!grupp) return;
  try {
    const fraBackend = await KvittsSupabase.hamtaUtgifter(grupp.gruppId);
    sattOfflineMode(false);
    const forut = JSON.stringify(utgifter);
    utgifter = fraBackend;
    sparaAktivSessionsData();
    if (JSON.stringify(utgifter) !== forut) uppdatera();
  } catch (e) {
    console.error("Kunde inte hämta utgifter:", e);
    sattOfflineMode(true);
  }
}

// Hämtar även deltagare och synkar lokalt.
async function refreshDeltagareOchUtgifter(forcera = false) {
  const grupp = aktivGruppData();
  if (!grupp) return;
  try {
    const [fraBackend, deltagare, kvittenser] = await Promise.all([
      KvittsSupabase.hamtaUtgifter(grupp.gruppId),
      KvittsSupabase.hamtaDeltagare(grupp.gruppId),
      hamtaKvittenserBestEffort(grupp.gruppId),
    ]);
    sattOfflineMode(false);
    const forutUtgifter = JSON.stringify(utgifter);
    const forutPersoner = JSON.stringify(personer);
    const forutKvittenser = JSON.stringify(_kvittenser);
    utgifter = fraBackend;
    _kvittenser = kvittenser;
    // Synka personer-listan med de riktiga deltagarna från backend.
    const s = aktivSession();
    const data = laddaSessionsData(s.id);
    if (data) {
      data.utgifter = utgifter;
      data.personer = deltagare.map(m => ({ id: m.id, namn: m.namn }));
      data.migId = grupp.personId;
      personer = data.personer;
      migId = grupp.personId;
      syncaPersonAlias();
      localStorage.setItem("kvitts_session_" + s.id, JSON.stringify(data));
    }
    const andradPersoner = forcera || JSON.stringify(personer) !== forutPersoner;
    const andradUtgifter = forcera || JSON.stringify(utgifter) !== forutUtgifter;
    const andradKvittenser = forcera || JSON.stringify(_kvittenser) !== forutKvittenser;
    if (andradPersoner) { uppdateraGruppHeader(); populeraBetalarDropdowns(); }
    if (andradPersoner || andradUtgifter) uppdatera();
    // Reglera-modalen live-uppdateras om den är öppen och något ändrats.
    if ((andradPersoner || andradUtgifter || andradKvittenser) &&
        document.getElementById("reglera-modal").classList.contains("visa")) {
      _renderaRegleraLista();
    }
    // 017: auto-arkivera min vy när alla mina skulder är kvitterade.
    if (andradPersoner || andradUtgifter || andradKvittenser) {
      kontrolleraAutoArkivering();
    }
    // 023: diff mot snapshot och generera notiser
    processaNotiser(fraBackend, deltagare);
  } catch (e) {
    console.error("Kunde inte hämta grupp-data:", e);
    // Kontrollera om gruppen är borttagen (404-liknande: inga deltagare returneras alls)
    if (e && (e.code === "PGRST116" || (e.message && e.message.includes("does not exist")))) {
      visaGruppBorttaget();
    } else {
      sattOfflineMode(true);
    }
  }
}

// 017: Hämta kvittenser utan att ett fel (t.ex. att settlements-tabellen inte
// finns förrän migreringen körts) knockar hela grupp-synken. Faller tillbaka på
// den senast kända listan.
async function hamtaKvittenserBestEffort(gruppId) {
  try {
    return await KvittsSupabase.hamtaKvittenser(gruppId);
  } catch (e) {
    console.warn("Kunde inte hämta kvittenser (fortsätter utan):", e);
    return _kvittenser;
  }
}

// =============================================================================
// INTERN NOTIFIERING (feature 023)
// =============================================================================

function notisSnapshotKey(gruppId) { return "kvitts_grupp_" + gruppId + "_notis_snapshot"; }
function notisListaKey(gruppId)    { return "kvitts_grupp_" + gruppId + "_notiser"; }

function laddaNotisSnapshot(gruppId) {
  try { return JSON.parse(localStorage.getItem(notisSnapshotKey(gruppId))); } catch (_) { return null; }
}
function sparaNotisSnapshot(gruppId, snapshot) {
  localStorage.setItem(notisSnapshotKey(gruppId), JSON.stringify(snapshot));
}
function laddaNotiser(gruppId) {
  try { return JSON.parse(localStorage.getItem(notisListaKey(gruppId))) || []; } catch (_) { return []; }
}
function sparaNotiser(gruppId, lista) {
  // Behåll max 20 senaste
  const trimmad = lista.slice(0, 20);
  localStorage.setItem(notisListaKey(gruppId), JSON.stringify(trimmad));
}

function processaNotiser(nuUtgifter, nuDeltagare) {
  const grupp = aktivGruppData();
  if (!grupp) return;
  const snapshot = laddaNotisSnapshot(grupp.gruppId);
  const { nyaNotiser, nySnapshot } = diffaNotiser(snapshot, nuUtgifter, nuDeltagare, migId);
  sparaNotisSnapshot(grupp.gruppId, nySnapshot);
  if (nyaNotiser.length > 0) {
    const befintliga = laddaNotiser(grupp.gruppId);
    sparaNotiser(grupp.gruppId, [...nyaNotiser, ...befintliga]);
    uppdateraOlastBadge();
  }
}

function antalOlasta(gruppId) {
  return laddaNotiser(gruppId).filter(n => !n.last).length;
}

function uppdateraOlastBadge() {
  const grupp = aktivGruppData();
  const badge = document.getElementById("notis-badge");
  if (!badge) return;
  const antal = grupp ? antalOlasta(grupp.gruppId) : 0;
  badge.textContent = antal > 9 ? "9+" : antal > 0 ? String(antal) : "";
  badge.hidden = antal === 0;
}

function visaNotisFlode() {
  const grupp = aktivGruppData();
  if (!grupp) return;
  const lista = laddaNotiser(grupp.gruppId);

  const container = document.getElementById("notis-lista");
  if (lista.length === 0) {
    container.innerHTML = '<p class="notis-tom">Inga notiser än.</p>';
  } else {
    container.innerHTML = lista.map(n => `
      <div class="notis-rad">
        <span class="notis-text">${esc(n.text)}</span>
        <span class="notis-tid">${relativTid(n.tid)}</span>
      </div>`).join("");
  }

  // Markera alla som lästa
  const markerade = lista.map(n => ({ ...n, last: true }));
  sparaNotiser(grupp.gruppId, markerade);
  uppdateraOlastBadge();

  document.getElementById("notis-modal").classList.add("visa");
}

// 017: Om alla mina skulder i den optimerade planen är kvitterade av
// respektive kreditor → arkivera min vy automatiskt (read-only historik).
// Kräver att jag faktiskt HAR skulder (annars triggas det direkt för alla).
function kontrolleraAutoArkivering() {
  const s = aktivSession();
  if (!s || s.kind !== "grupp" || s.reglerad) return;
  const plan = minimeradeOverforingar(utgifter, personer);
  if (plan.length === 0) return; // inget att reglera ännu
  // Arkivera min vy när alla överföringar som rör mig (som debitor eller
  // kreditor) är kvitterade. En ren kreditor arkiveras när hen bekräftat alla
  // inkommande betalningar; en debitor när alla dess skulder är bekräftade.
  if (minRegleringKlar(plan, _kvittenser, migId)) {
    s.reglerad = true;
    sparaSessionsMeta();
    stangModal("reglera-modal");
    visaApp();
  }
}


// ── Polling ──────────────────────────────────────────────────────────────────
let _pollingInterval = null;

function startaPolling() {
  stoppPolling();
  _pollingInterval = setInterval(() => {
    if (!document.hidden) refreshDeltagareOchUtgifter();
  }, 15000);
}

function stoppPolling() {
  if (_pollingInterval !== null) {
    clearInterval(_pollingInterval);
    _pollingInterval = null;
  }
}

// ── Header för grupp-läge ────────────────────────────────────────────────────
function uppdateraGruppHeader() {
  const s = aktivSession();
  if (!s || s.kind !== "grupp") return;
  const antalPersoner = personer.length;
  const personerTxt = antalPersoner === 1 ? "1 person" : antalPersoner + " personer";
  const el = document.getElementById("app-subtitle");
  el.textContent = s.namn + " · " + personerTxt;
  el.classList.add("klickbar");
}

function subtitleKlick() {
  const s = aktivSession();
  if (s && s.kind === "grupp") visaDeltagare();
}

function visaDeltagare() {
  const s = aktivSession();
  if (!s) return;
  document.getElementById("deltagare-modal-rubrik").textContent = s.namn + " – deltagare";
  const container = document.getElementById("deltagare-chips");
  container.innerHTML = personer.map(p => {
    const arMig = p.id === migId;
    return `<span class="deltagar-chip${arMig ? " mig" : ""}">${esc(p.namn)}${arMig ? " (du)" : ""}</span>`;
  }).join("");
  const grupp = aktivGruppData();
  const lankEl = document.getElementById("deltagare-modal-lank");
  if (grupp && lankEl) {
    lankEl.textContent = gruppUrl(grupp.gruppId);
  }
  document.getElementById("deltagare-modal").classList.add("visa");
}

function stangDeltagareModalVidKlick(event) {
  if (event.target === document.getElementById("deltagare-modal")) stangModal("deltagare-modal");
}

function visaMeny() {
  renderaSessionsLista();
  const reglerad = aktivArReglerad();
  const s = aktivSession();
  const erGrupp = !!(s && s.kind === "grupp");
  // Reglera-knappen visas bara när aktiv session är pågående
  const regleraBtn = document.getElementById("meny-reglera-btn");
  if (regleraBtn) regleraBtn.style.display = reglerad || !aktivSessionId ? "none" : "block";
  // Fil-kontroller är irrelevanta i grupp-läge (backend är persistensen)
  document.getElementById("meny-fil-rad").style.display = erGrupp ? "none" : "flex";
  // Spara-knappen visas om det finns utgifter i aktiv lokal session
  document.getElementById("meny-spara-btn").style.display = (!erGrupp && utgifter.length > 0) ? "block" : "none";
  uppdateraInstallUI();
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
function skapaGruppFranMeny() {
  stangModal("meny-modal");
  // Nollställ ev. kvarhängande skapa-grupp-state så en ny grupp skapas rent.
  _gruppSkapat = null;
  _joinMemberToken = "";
  // Kom vi hit från en aktiv session? Då ska "Tillbaka" gå dit, inte till start.
  _skapaGruppRetur = aktivSessionId ? aktivSessionId : null;
  visaSkapaGrupp();
}

// "Tillbaka" från skapa-grupp: återgå till sessionen man kom från om det fanns
// en (öppnad via menyn), annars till lägesvals-skärmen (onboarding-flödet).
function avbrytSkapaGrupp() {
  if (_skapaGruppRetur) {
    const retur = _skapaGruppRetur;
    _skapaGruppRetur = null;
    if (sessions.some(s => s.id === retur)) {
      vaxlaTillSession(retur);
      return;
    }
  }
  visaSkarm2();
}

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
  input.onkeydown = (e) => { if (e.key === "Enter") skapaOchVaxlaNySession(); };
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

// =============================================================================
// GRUPP-FLÖDE (feature 004a)
// =============================================================================
// Tillstånd som lever mellan skärmarna i join/create-flödena.
let _gruppSkapat = null;       // { gruppId, gruppNamn, personId }
let _gruppForJoin = null;      // { gruppId, gruppNamn } – väntar på namn-bekräftelse
let _skapaGruppRetur = null;   // sessions-id att gå tillbaka till om skapa-grupp avbryts

function visaSkapaGrupp() {
  doljAllaSkärmar();
  document.getElementById("intro-skapa-grupp").style.display = "flex";
  const projInp = document.getElementById("skapa-grupp-namn");
  const namnInp = document.getElementById("skapa-grupp-mitt-namn");
  const epostInp = document.getElementById("skapa-grupp-epost");
  projInp.value = "";
  namnInp.value = mittSparadeNamn() || "";
  epostInp.value = localStorage.getItem("kvitts_identitet_epost") || "";
  uppdateraSkapaGruppKnapp();
  projInp.focus();
}

function uppdateraSkapaGruppKnapp() {
  const proj = document.getElementById("skapa-grupp-namn").value.trim();
  const namn = document.getElementById("skapa-grupp-mitt-namn").value.trim();
  const epost = document.getElementById("skapa-grupp-epost").value.trim();
  document.getElementById("btn-skapa-grupp").disabled = !(proj && namn && epost);
}

async function skapaGruppOchGaIn() {
  const namn = document.getElementById("skapa-grupp-namn").value.trim();
  const minNamnInput = document.getElementById("skapa-grupp-mitt-namn").value.trim();
  const epostRaw = document.getElementById("skapa-grupp-epost").value.trim();
  if (!namn || !minNamnInput || !epostRaw) return;
  person1 = minNamnInput;
  localStorage.setItem("kvitts_person1", minNamnInput);
  localStorage.setItem("kvitts_identitet_epost", epostRaw);
  _joinEpost = epostRaw;
  const minNamn = minNamnInput;
  const btn = document.getElementById("btn-skapa-grupp");
  btn.disabled = true;
  btn.textContent = "Skapar…";
  try {
    // Skapa gruppen endast om det inte redan gjorts (retry-skydd så ett
    // misslyckat identitetsanrop inte skapar dubblettgrupper).
    if (!_gruppSkapat) {
      const res = await KvittsSupabase.skapaGrupp(namn, minNamn);
      _gruppSkapat = { gruppId: res.gruppId, gruppNamn: res.gruppNamn, personId: res.personId };
    }
    // Identitet + personlig token (018b) görs direkt så både gruppslänk och
    // personlig länk kan visas på samma bekräftelseskärm.
    const identitetHash = await hashIdentitet(_joinEpost);
    const memberToken = generateMemberToken();
    _joinMemberToken = memberToken;
    await KvittsSupabase.uppdateraMemberIdentitet(_gruppSkapat.personId, identitetHash, memberToken);
    visaGruppSkapat();
  } catch (e) {
    alert("Kunde inte skapa gruppen: " + (e.message || e));
    btn.disabled = false;
    btn.textContent = "Skapa grupp →";
  }
}

function visaGruppSkapat() {
  doljAllaSkärmar();
  document.getElementById("intro-grupp-skapat").style.display = "flex";
  const url = gruppUrl(_gruppSkapat.gruppId);
  document.getElementById("grupp-skapat-text").textContent =
    "Gruppen \"" + _gruppSkapat.gruppNamn + "\" är skapad.";
  document.getElementById("grupp-skapat-url").value = url;
  document.getElementById("grupp-skapat-epost-visning").textContent = _joinEpost;
  document.getElementById("grupp-skapat-personlig-lank").textContent =
    window.location.origin + "/?me=" + _joinMemberToken;
  const delaBtn = document.getElementById("btn-dela-grupp");
  delaBtn.style.display = navigator.share ? "block" : "none";
}

function gruppUrl(gruppId) {
  return window.location.origin + "/g/" + gruppId;
}

async function kopieraGruppLank() {
  const url = document.getElementById("grupp-skapat-url").value;
  try {
    await navigator.clipboard.writeText(url);
    alert("Länken kopierad!");
  } catch (_) {
    // Fallback: selektera fältet så användaren kan kopiera manuellt
    const inp = document.getElementById("grupp-skapat-url");
    inp.select();
  }
}

async function kopieraDeltagarLank() {
  const url = document.getElementById("deltagare-modal-lank").textContent;
  try {
    await navigator.clipboard.writeText(url);
    alert("Länken kopierad!");
  } catch (_) {
    prompt("Kopiera länken:", url);
  }
}

async function delaGruppLank() {
  if (!navigator.share) return;
  const url = document.getElementById("grupp-skapat-url").value;
  try {
    await navigator.share({ title: "Kvitts: " + _gruppSkapat.gruppNamn, url });
  } catch (_) { /* användaren avbröt */ }
}

async function gaInIGruppEfterSkapa() {
  if (!_gruppSkapat) return;
  // Identitet/token är redan sparat i skapaGruppOchGaIn — gå bara in i appen.
  skapaGruppSession(_gruppSkapat.gruppId, _gruppSkapat.gruppNamn, _gruppSkapat.personId);
  if (window.history && window.history.replaceState) {
    window.history.replaceState({}, "", "/");
  }
  _gruppSkapat = null;
  _joinMemberToken = "";
}

function andraSkaparEpost() {
  const ny = prompt("Ange din e-postadress:", _joinEpost);
  if (!ny || !ny.trim()) return;
  _joinEpost = ny.trim();
  localStorage.setItem("kvitts_identitet_epost", _joinEpost);
  document.getElementById("grupp-skapat-epost-visning").textContent = _joinEpost;
  if (_gruppSkapat) {
    hashIdentitet(_joinEpost).then(h =>
      KvittsSupabase.uppdateraMemberIdentitet(_gruppSkapat.personId, h, undefined).catch(console.error)
    );
  }
}

async function kopieraGruppPersonligLank() {
  const lank = document.getElementById("grupp-skapat-personlig-lank").textContent;
  try {
    await navigator.clipboard.writeText(lank);
    alert("Länken kopierad!");
  } catch (_) {
    prompt("Kopiera din personliga länk:", lank);
  }
}

function skapaGruppSession(gruppId, gruppNamn, personId) {
  const minNamn = mittSparadeNamn() || "Jag";
  // Personer/utgifter fylls i av polling i 004b. För 004a räcker det med
  // mig själv i listan så headern och dropdownen har något att visa.
  const sessionPersoner = [{ id: personId, namn: minNamn }];
  sparaAktivSessionsData(); // säkerställ nuvarande session sparad
  const session = skapaSession(gruppNamn, sessionPersoner, personId, [], {
    kind: "grupp",
    gruppId,
    personId,
  });
  localStorage.setItem(gruppMemberKey(gruppId), personId);
  vaxlaTillSession(session.id);
}

function mittSparadeNamn() {
  // Försök i ordning: sparat p1-namn, namnet på "jag" i aktiv lokal session
  const sparad = localStorage.getItem("kvitts_person1");
  if (sparad) return sparad;
  const aktiv = aktivSession();
  if (aktiv) {
    const data = laddaSessionsData(aktiv.id);
    const mig = data?.personer?.find(p => p.id === data.migId);
    if (mig?.namn) return mig.namn;
  }
  return null;
}

// 018a — lager 1: localStorage per grupp.
// 018b — lager 2: identitet_hash (e-post). Lager 3: member_token i URL.
async function forsokTystAteranslutning(gruppId) {
  // Lager 1: localStorage
  const sparatPersonId = localStorage.getItem(gruppMemberKey(gruppId));

  try {
    const grupp = await KvittsSupabase.haGrupp(gruppId);
    if (!grupp) {
      localStorage.removeItem(gruppMemberKey(gruppId));
      startaJoinFlode(gruppId);
      return;
    }

    if (sparatPersonId) {
      const deltagare = await KvittsSupabase.hamtaDeltagare(gruppId);
      const mig = deltagare.find(d => d.id === sparatPersonId);
      if (mig) {
        if (window.history && window.history.replaceState) window.history.replaceState({}, "", "/");
        skapaGruppSession(gruppId, grupp.namn, sparatPersonId);
        return;
      }
      localStorage.removeItem(gruppMemberKey(gruppId));
    }

    // Lager 2: erbjud återanslutning via hash
    _joinGruppForAterstall = { gruppId, gruppNamn: grupp.namn };
    visaAterstallningsFragan();
  } catch (e) {
    startaJoinFlode(gruppId);
  }
}

// 018b lager 3: tyst återanslutning via member_token i URL (?me=<token>)
async function forsokTokenAteranslutning(memberToken) {
  try {
    const medlem = await KvittsSupabase.hamtaMedToken(memberToken);
    if (!medlem) {
      // Token ogiltig — rensa URL och kör vanlig init
      if (window.history && window.history.replaceState) window.history.replaceState({}, "", "/");
      return false;
    }
    const grupp = await KvittsSupabase.haGrupp(medlem.room_id);
    if (!grupp) {
      if (window.history && window.history.replaceState) window.history.replaceState({}, "", "/");
      return false;
    }
    // Spara i localStorage (018a-nyckeln) så nästa besök funkar via lager 1
    localStorage.setItem(gruppMemberKey(grupp.id), medlem.id);
    if (window.history && window.history.replaceState) window.history.replaceState({}, "", "/");
    skapaGruppSession(grupp.id, grupp.namn, medlem.id);
    return true;
  } catch (e) {
    if (window.history && window.history.replaceState) window.history.replaceState({}, "", "/");
    return false;
  }
}

function visaAterstallningsFragan() {
  doljAllaSkärmar();
  const r = _joinGruppForAterstall;
  document.getElementById("atersta-ll-rubrik").textContent = "Välkommen till \"" + (r ? r.gruppNamn : "gruppen") + "\"";
  document.getElementById("atersta-ll-text").textContent = "Är du ny här, eller har du varit med förut?";
  document.getElementById("intro-atersta-ll").style.display = "flex";
  kanskeVisaInstallToast();
}

function visaIdentifierareFormular() {
  doljAllaSkärmar();
  document.getElementById("atersta-ll-epost").value = "";
  document.getElementById("btn-atersta-ll").disabled = true;
  document.getElementById("atersta-ll-fel").style.display = "none";
  document.getElementById("intro-identifierare-formular").style.display = "flex";
  document.getElementById("atersta-ll-epost").focus();
}

async function sokOchAteranslut() {
  if (!_joinGruppForAterstall) return;
  const epostRaw = document.getElementById("atersta-ll-epost").value.trim();
  if (!epostRaw) return;
  const felEl = document.getElementById("atersta-ll-fel");
  felEl.style.display = "none";
  const btn = document.getElementById("btn-atersta-ll");
  btn.disabled = true;
  btn.textContent = "Söker…";
  try {
    const hash = await hashIdentitet(epostRaw);
    const matchningar = await KvittsSupabase.sokMedIdentitetHash(_joinGruppForAterstall.gruppId, hash);
    if (matchningar.length === 0) {
      felEl.textContent = "Ingen deltagare med den e-postadressen i gruppen — kontrollera stavningen eller välj \"Jag är ny\".";
      felEl.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Återanslut →";
      return;
    }
    // Ta första träffen (race-case med flera lämnas för v2)
    const mig = matchningar[0];
    localStorage.setItem(gruppMemberKey(_joinGruppForAterstall.gruppId), mig.id);
    if (window.history && window.history.replaceState) window.history.replaceState({}, "", "/");
    skapaGruppSession(_joinGruppForAterstall.gruppId, _joinGruppForAterstall.gruppNamn, mig.id);
    _joinGruppForAterstall = null;
  } catch (e) {
    felEl.textContent = "Kunde inte söka: " + (e.message || e);
    felEl.style.display = "block";
    btn.disabled = false;
    btn.textContent = "Återanslut →";
  }
}

function fortsattSomNy() {
  if (!_joinGruppForAterstall) return;
  const r = _joinGruppForAterstall;
  _joinGruppForAterstall = null;
  _joinFranAterstall = { gruppId: r.gruppId, gruppNamn: r.gruppNamn };
  _gruppForJoin = { gruppId: r.gruppId, gruppNamn: r.gruppNamn };
  visaBekraftaJoin();
}

async function startaJoinFlode(gruppId) {
  // Kommer hit direkt vid laddning av /g/<id>. Slå upp gruppen och visa
  // bekräftelseskärmen om det finns.
  _joinFranAterstall = null;
  try {
    const grupp = await KvittsSupabase.haGrupp(gruppId);
    if (!grupp) {
      localStorage.removeItem(gruppMemberKey(gruppId));
      visaGruppBorttaget();
      return;
    }
    _gruppForJoin = { gruppId: grupp.id, gruppNamn: grupp.namn };
    visaBekraftaJoin();
  } catch (e) {
    alert("Kunde inte kontakta servern: " + (e.message || e));
    visaSkarm2();
  }
}

function visaBekraftaJoin() {
  doljAllaSkärmar();
  document.getElementById("intro-bekrafta-join").style.display = "flex";
  const sparatNamn = mittSparadeNamn();
  const sparadEpost = localStorage.getItem("kvitts_identitet_epost") || "";
  const namnInp = document.getElementById("bekrafta-join-namn");
  const epostInp = document.getElementById("bekrafta-join-epost");
  epostInp.value = sparadEpost;
  _joinEpost = sparadEpost;
  if (sparatNamn) {
    document.getElementById("bekrafta-join-text").textContent =
      "Du heter " + sparatNamn + ". Gå med i \"" + _gruppForJoin.gruppNamn + "\"?";
    namnInp.style.display = "none";
    epostInp.focus();
  } else {
    document.getElementById("bekrafta-join-text").textContent =
      "Vad heter du? Du går med i \"" + _gruppForJoin.gruppNamn + "\".";
    namnInp.style.display = "";
    namnInp.value = "";
    namnInp.focus();
  }
  uppdateraBekraftaJoinKnapp();
  kanskeVisaInstallToast();
}

function uppdateraBekraftaJoinKnapp() {
  const namnInp = document.getElementById("bekrafta-join-namn");
  const epostInp = document.getElementById("bekrafta-join-epost");
  const sparatNamn = mittSparadeNamn();
  const harNamn = !!(sparatNamn || (namnInp && namnInp.value.trim()));
  const harEpost = !!(epostInp && epostInp.value.trim());
  document.getElementById("btn-bekrafta-join").disabled = !(harNamn && harEpost);
}

async function bekraftaJoin() {
  if (!_gruppForJoin) return;
  let minNamn = mittSparadeNamn();
  if (!minNamn) {
    minNamn = document.getElementById("bekrafta-join-namn").value.trim();
    if (!minNamn) return;
    localStorage.setItem("kvitts_person1", minNamn);
  }
  const epostRaw = document.getElementById("bekrafta-join-epost").value.trim();
  if (!epostRaw) return;
  _joinEpost = epostRaw;
  localStorage.setItem("kvitts_identitet_epost", epostRaw);

  const btn = document.getElementById("btn-bekrafta-join");
  btn.disabled = true;
  btn.textContent = "Går med…";
  try {
    const befintligSession = sessions.find(s => {
      if (s.kind !== "grupp") return false;
      const d = laddaSessionsData(s.id);
      return d && d.gruppId === _gruppForJoin.gruppId;
    });
    if (befintligSession) {
      vaxlaTillSession(befintligSession.id);
      _gruppForJoin = null;
      if (window.history && window.history.replaceState) window.history.replaceState({}, "", "/");
      return;
    }

    const res = await KvittsSupabase.gaMedIGrupp(_gruppForJoin.gruppId, minNamn, null);
    const identitetHash = await hashIdentitet(_joinEpost);
    const memberToken = generateMemberToken();
    _joinMemberToken = memberToken;
    await KvittsSupabase.uppdateraMemberIdentitet(res.personId, identitetHash, memberToken);

    skapaGruppSession(res.gruppId, _gruppForJoin.gruppNamn, res.personId);

    // Lager 3: uppdatera URL med ?me=token
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, "", "/?me=" + memberToken);
    }

    // Visa bekräftelseskärm
    visaMinIdentitetSkarm(minNamn, _gruppForJoin.gruppNamn);
    _gruppForJoin = null;
  } catch (e) {
    alert("Kunde inte gå med: " + (e.message || e));
    btn.disabled = false;
    btn.textContent = "Gå med →";
  }
}

function visaMinIdentitetSkarm(namn, gruppNamn) {
  doljAllaSkärmar();
  document.getElementById("intro-min-identitet").style.display = "flex";
  document.getElementById("min-identitet-rubrik").textContent = "Du är inne som " + namn + " ✓";
  document.getElementById("min-identitet-epost").textContent = _joinEpost;
  const lank = window.location.origin + "/?me=" + _joinMemberToken;
  document.getElementById("min-identitet-lank").textContent = lank;
}

async function kopieraPersonligLank() {
  const lank = document.getElementById("min-identitet-lank").textContent;
  try {
    await navigator.clipboard.writeText(lank);
    alert("Länken kopierad!");
  } catch (_) {
    prompt("Kopiera din personliga länk:", lank);
  }
}

function andraIdentifierare() {
  const ny = prompt("Ange din e-postadress:", _joinEpost);
  if (!ny || !ny.trim()) return;
  _joinEpost = ny.trim();
  document.getElementById("min-identitet-epost").textContent = _joinEpost;
  // Uppdatera hash asynkront
  const gruppData = aktivGruppData();
  if (gruppData) {
    hashIdentitet(_joinEpost).then(h =>
      KvittsSupabase.uppdateraMemberIdentitet(gruppData.personId, h, undefined).catch(console.error)
    );
  }
}

function gaInEfterIdentitet() {
  // Rensa ?me= ur URL och gå in i appen
  if (window.history && window.history.replaceState) {
    window.history.replaceState({}, "", "/");
  }
  visaApp();
}

function avbrytJoin() {
  _gruppForJoin = null;
  // Kom vi hit via en inbjudningslänk (återställningsfrågan)? Gå tillbaka dit
  // istället för till startsidan, så inbjudan inte tappas.
  if (_joinFranAterstall) {
    _joinGruppForAterstall = _joinFranAterstall;
    _joinFranAterstall = null;
    visaAterstallningsFragan();
    return;
  }
  if (window.history && window.history.replaceState) {
    window.history.replaceState({}, "", "/");
  }
  if (sessions.length > 0 && aktivSessionId) {
    visaApp();
  } else {
    visaSkarm2();
  }
}

function gaFranGruppBorttaget() {
  if (window.history && window.history.replaceState) {
    window.history.replaceState({}, "", "/");
  }
  const nyAktiv = sessions.find(s => !s.reglerad) || sessions[0];
  if (nyAktiv) {
    vaxlaTillSession(nyAktiv.id);
  } else {
    visaSkarm2();
  }
}

// Pausa polling när fliken inte är synlig, återuppta vid synlighet igen.
document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  // Återupptag: hämta direkt vid synlighet om grupp-session är aktiv.
  const grupp = aktivGruppData();
  if (grupp) refreshUtgifter();
});

window.addEventListener("beforeunload", stoppPolling);

// 029: install-affordance (se docs/features/029-install-affordance.md).
// Toast första gången + permanent länk i menyn. iOS saknar beforeinstallprompt
// och får en manuell instruktion istället.
let _installPrompt = null; // sparad beforeinstallprompt-event (Android/desktop)
let _installToastTimer = null;
const INSTALL_TOAST_NYCKEL = "kvitts_install_toast_visad";

function appArInstallerad() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true; // iOS
}
function arIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}
// Installation möjlig när vi har ett sparat prompt-event (Android/desktop)
// eller kör iOS Safari (manuell väg), och appen inte redan är installerad.
function installMojlig() {
  if (appArInstallerad()) return false;
  return !!_installPrompt || arIOS();
}

function uppdateraInstallUI() {
  const btn = document.getElementById("meny-installera-btn");
  if (btn) btn.style.display = installMojlig() ? "block" : "none";
}

// Skärmar där toasten får dyka upp: beslutssidan (grupp vs lokal),
// inbjudnings-landningen och själva appen. Inte mitt i inmatningsflöden.
function installToastTillaten() {
  if (document.getElementById("app").style.display === "block") return true;
  return ["intro-2", "intro-bekrafta-join", "intro-atersta-ll"].some(id => {
    const el = document.getElementById(id);
    return el && el.style.display !== "none";
  });
}

// Visar engångs-toasten om den inte redan visats och vi är på en tillåten skärm.
function kanskeVisaInstallToast() {
  if (localStorage.getItem(INSTALL_TOAST_NYCKEL)) return;
  if (!installMojlig()) return;
  if (!installToastTillaten()) return;
  setTimeout(visaInstallToast, 1400);
}

function visaInstallToast() {
  if (localStorage.getItem(INSTALL_TOAST_NYCKEL)) return;
  const el = document.getElementById("install-toast");
  if (!el || !installMojlig()) return;
  localStorage.setItem(INSTALL_TOAST_NYCKEL, "1"); // visas bara en gång totalt
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add("visa"));
  _installToastTimer = setTimeout(doljInstallToast, 8000);
}

function doljInstallToast() {
  const el = document.getElementById("install-toast");
  if (!el) return;
  clearTimeout(_installToastTimer);
  el.classList.remove("visa");
  setTimeout(() => { el.hidden = true; }, 260);
}

async function installeraApp() {
  doljInstallToast();
  stangModal("meny-modal");
  if (_installPrompt) {
    _installPrompt.prompt();
    await _installPrompt.userChoice;
    _installPrompt = null;
    uppdateraInstallUI();
  } else if (arIOS()) {
    document.getElementById("install-ios-modal").classList.add("visa");
  }
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  _installPrompt = e;
  uppdateraInstallUI();
  kanskeVisaInstallToast();
});
window.addEventListener("appinstalled", () => {
  _installPrompt = null;
  doljInstallToast();
  uppdateraInstallUI();
});

// Registrera service worker för PWA/offline (se docs/features/015-pwa.md).
// Bakom feature-check och endast över http(s) – från file:// registreras den inte.
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("Service worker kunde inte registreras:", err);
    });
  });
}

init();
