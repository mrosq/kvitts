// State (N personer – se docs/features/006a). UI:t stöder N>=2.
let personer = [];
let migId = "p1";
let person1 = "";
let person2 = "";
let splitTyp = "jamnt";
let editSplitTyp = "jamnt";
let utgifter = [];
let valtDatum = new Date();
let editId = null;

function syncaPersonAlias() {
  person1 = personer[0]?.namn || "";
  person2 = personer[1]?.namn || "";
}

// DATUM
function datumTillStr(d) { return d.toLocaleDateString("sv-SE"); }
function datumVisText(d) {
  const idag = new Date(); idag.setHours(0,0,0,0);
  const igår = new Date(idag); igår.setDate(igår.getDate()-1);
  const imorgon = new Date(idag); imorgon.setDate(imorgon.getDate()+1);
  const jmf = new Date(d); jmf.setHours(0,0,0,0);
  if (jmf.getTime() === idag.getTime()) return "Idag · " + datumTillStr(d);
  if (jmf.getTime() === igår.getTime()) return "Igår · " + datumTillStr(d);
  if (jmf.getTime() === imorgon.getTime()) return "Imorgon · " + datumTillStr(d);
  return datumTillStr(d);
}
function andradatum(steg) {
  valtDatum = new Date(valtDatum);
  valtDatum.setDate(valtDatum.getDate() + steg);
  document.getElementById("datum-text").textContent = datumVisText(valtDatum);
}
function resetDatum() {
  valtDatum = new Date();
  document.getElementById("datum-text").textContent = datumVisText(valtDatum);
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

// INIT
function init() {
  migreraGamlaNycklar();
  migreraTillNPersoner();
  const rawPersoner = localStorage.getItem("kvitts_personer");
  if (rawPersoner) {
    personer = JSON.parse(rawPersoner);
    migId = localStorage.getItem("kvitts_person_mig") || "p1";
    syncaPersonAlias();
    utgifter = JSON.parse(localStorage.getItem("kvitts_utgifter") || "[]");
    visaApp();
  } else {
    visaSkarm1();
  }
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
  localStorage.setItem("kvitts_personer", JSON.stringify(personer));
  localStorage.setItem("kvitts_person_mig", migId);
  localStorage.removeItem("kvitts_person1");
  utgifter = [];
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
  document.getElementById("app-subtitle").textContent = subtitle;

  populeraBetalarDropdowns();
  populeraSplitFalt("split-inputs-container", "uppdateraEgnaInfo");
  populeraSplitFalt("edit-split-inputs-container", "uppdateraEditEgnaInfo");

  resetDatum();
  uppdatera();
  document.getElementById("spara-fil-btn").style.display = utgifter.length > 0 ? "block" : "none";
}

function populeraBetalarDropdowns() {
  ["betalare", "edit-betalare"].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = personer.map(p => `<option value="${p.id}">${esc(p.namn)}</option>`).join("");
    sel.value = migId;
  });
}

function populeraSplitFalt(containerId, callbackNamn) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = personer.map(p => `
    <div class="split-person">
      <label>${esc(p.namn)}s egna (kr)</label>
      <input type="number" id="${containerId}-${p.id}" placeholder="0" min="0" step="0.01" oninput="${callbackNamn}()"/>
    </div>`).join("");
}

function hamtaEgna(containerId) {
  const egna = {};
  for (const p of personer) {
    egna[p.id] = parseFloat(document.getElementById(containerId + "-" + p.id)?.value) || 0;
  }
  return egna;
}

// SPLIT-TYP
function setSplitTyp(typ) {
  splitTyp = typ === "50" ? "jamnt" : typ;
  document.getElementById("toggle-50").classList.toggle("aktiv", splitTyp === "jamnt");
  document.getElementById("toggle-egna").classList.toggle("aktiv", splitTyp === "egna");
  document.getElementById("split-inputs-wrapper").style.display = splitTyp === "egna" ? "block" : "none";
  if (splitTyp === "egna") uppdateraEgnaInfo();
}
function setEditSplitTyp(typ) {
  editSplitTyp = typ === "50" ? "jamnt" : typ;
  document.getElementById("edit-toggle-50").classList.toggle("aktiv", editSplitTyp === "jamnt");
  document.getElementById("edit-toggle-egna").classList.toggle("aktiv", editSplitTyp === "egna");
  document.getElementById("edit-split-inputs-wrapper").style.display = editSplitTyp === "egna" ? "block" : "none";
  if (editSplitTyp === "egna") uppdateraEditEgnaInfo();
}

// EGNA-INFO (live preview)
function deltagareIds() {
  return personer.map(p => p.id);
}
function uppdateraEgnaInfo() {
  const bel = parseFloat(document.getElementById("belopp").value) || 0;
  document.getElementById("egna-info").textContent = egnaInfoText(bel, hamtaEgna("split-inputs-container"), deltagareIds());
}
function uppdateraEditEgnaInfo() {
  const bel = parseFloat(document.getElementById("edit-belopp").value) || 0;
  document.getElementById("edit-egna-info").textContent = egnaInfoText(bel, hamtaEgna("edit-split-inputs-container"), deltagareIds());
}

// LÄGG TILL
function laggTillUtgift() {
  const besk = document.getElementById("beskrivning").value.trim();
  const bel = parseFloat(document.getElementById("belopp").value);
  const betalare_id = document.getElementById("betalare").value;
  if (!besk || isNaN(bel) || bel <= 0) { alert("Fyll i beskrivning och belopp."); return; }
  const fordelning = raknaDel(bel, splitTyp, deltagareIds(), hamtaEgna("split-inputs-container"));
  if (!fordelning) { alert("Egna kostnader överstiger totalt belopp."); return; }
  utgifter.unshift({
    id: Date.now(),
    beskrivning: besk,
    belopp: bel,
    betalare_id,
    fordelning,
    datum: datumTillStr(valtDatum),
  });
  spara();
  document.getElementById("beskrivning").value = "";
  document.getElementById("belopp").value = "";
  document.getElementById("egna-info").textContent = "";
  setSplitTyp("jamnt");
  resetDatum();
  uppdatera();
}

// EDIT - öppna
function oppnaEdit(id) {
  const u = utgifter.find(x => x.id === id);
  if (!u) return;
  editId = id;
  document.getElementById("edit-rubrik").textContent = u.beskrivning + "  ·  " + u.datum;
  document.getElementById("edit-belopp").value = u.belopp;
  document.getElementById("edit-betalare").value = u.betalare_id;
  const n = personer.length;
  const expectedShare = u.belopp / n;
  const arJamnt = personer.every(p => Math.abs((u.fordelning?.[p.id] || 0) - expectedShare) < 0.001);
  setEditSplitTyp(arJamnt ? "jamnt" : "egna");
  for (const p of personer) {
    const inp = document.getElementById("edit-split-inputs-container-" + p.id);
    if (inp) inp.value = "";
  }
  if (!arJamnt) uppdateraEditEgnaInfo();
  document.getElementById("edit-modal").classList.add("visa");
}

// EDIT - spara
function sparaEdit() {
  const bel = parseFloat(document.getElementById("edit-belopp").value);
  const betalare_id = document.getElementById("edit-betalare").value;
  if (isNaN(bel) || bel <= 0) { alert("Ange ett giltigt belopp."); return; }
  const fordelning = raknaDel(bel, editSplitTyp, deltagareIds(), hamtaEgna("edit-split-inputs-container"));
  if (!fordelning) { alert("Egna kostnader överstiger totalt belopp."); return; }
  const idx = utgifter.findIndex(x => x.id === editId);
  if (idx !== -1) {
    utgifter[idx] = { ...utgifter[idx], belopp: bel, betalare_id, fordelning };
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
  lista.innerHTML = utgifter.map(u => {
    const betalare = personer.find(p => p.id === u.betalare_id);
    const betalareNamn = betalare?.namn || u.betalare_id;
    const badgeKlass = u.betalare_id === migId ? "p1" : "p2";
    const fordelningText = Object.entries(u.fordelning || {})
      .filter(([, andel]) => andel > 0)
      .map(([id, andel]) => {
        const p = personer.find(x => x.id === id);
        return esc(p?.namn || id) + ": " + andel.toFixed(2).replace(".",",") + "\u00a0kr";
      }).join(" &nbsp;·&nbsp; ");
    return `
      <div class="utgift-rad" onclick="oppnaEdit(${u.id})">
        <div class="utgift-info">
          <div class="utgift-beskrivning">${esc(u.beskrivning)}</div>
          <div class="utgift-meta">
            ${u.datum}<br>
            ${fordelningText}
          </div>
          <span class="betald-badge ${badgeKlass}">Betalt av ${esc(betalareNamn)}</span>
        </div>
        <div class="utgift-belopp">
          <div class="utgift-totalt">${u.belopp.toFixed(2).replace(".",",")} kr</div>
          <div class="edit-hint">tryck för att redigera</div>
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

  // Övriga — skulder mellan andra deltagare (inte mig)
  // Iterera varje icke-mig-person och ta par där motparten också är icke-mig och netto > 0
  // (netto > 0 = motparten är skyldig den itererade personen → visas en gång, deduplicerat)
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
    html = "Nollställer saldot och arkiverar alla utgifter.";
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
    html = rader.join("<br>") + "<br><br>Bekräfta för att reglera?";
  }
  document.getElementById("reglera-text").innerHTML = html;
  document.getElementById("reglera-modal").classList.add("visa");
}
function stangModal(id) { document.getElementById(id).classList.remove("visa"); }
function reglera() { utgifter = []; spara(); uppdatera(); stangModal("reglera-modal"); }

function sparaFil() {
  const data = { version: 2, exporterad: new Date().toISOString(), personer, utgifter };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kvitts-" + new Date().toLocaleDateString("sv-SE") + ".json";
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
      if (utgifter.length > 0 && !confirm("Detta ersätter dina nuvarande utgifter. Fortsätt?")) {
        return;
      }
      personer = nyaPersoner;
      utgifter = nyaUtgifter;
      migId = "p1";
      syncaPersonAlias();
      localStorage.setItem("kvitts_personer", JSON.stringify(personer));
      localStorage.setItem("kvitts_person_mig", migId);
      spara();
      visaApp();
    } catch (err) {
      alert("Kunde inte läsa filen: " + err.message);
    }
  };
  reader.readAsText(fil);
  event.target.value = "";
}

function spara() {
  localStorage.setItem("kvitts_utgifter", JSON.stringify(utgifter));
  document.getElementById("spara-fil-btn").style.display = utgifter.length > 0 ? "block" : "none";
}

init();
