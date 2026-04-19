let person1 = "";
let person2 = "";
let splitTyp = "50";
let editSplitTyp = "50";
let utgifter = [];
let valtDatum = new Date();
let editId = null;

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

// INIT
function init() {
  migreraGamlaNycklar();
  const sparadP2 = localStorage.getItem("kvitts_person2");
  if (sparadP2) {
    person1 = localStorage.getItem("kvitts_person1") || "Mikael";
    person2 = sparadP2;
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

function sparaSetup() {
  const v = document.getElementById("setup-namn").value.trim();
  if (!v) return;
  person2 = v;
  localStorage.setItem("kvitts_person2", person2);
  utgifter = [];
  visaApp();
}

function visaApp() {
  document.querySelectorAll(".intro-skarm").forEach(el => el.style.display = "none");
  document.getElementById("app").style.display = "block";
  document.getElementById("app-subtitle").textContent = person1 + " & " + person2;
  document.getElementById("p1-option").textContent = person1;
  document.getElementById("edit-p1-option").textContent = person1;
  document.getElementById("p2-option").textContent = person2;
  document.getElementById("split-p1-label").textContent = person1 + "s egna (kr)";
  document.getElementById("split-p2-label").textContent = person2 + "s egna (kr)";
  document.getElementById("edit-split-p1-label").textContent = person1 + "s egna (kr)";
  document.getElementById("edit-split-p2-label").textContent = person2 + "s egna (kr)";
  resetDatum();
  uppdatera();
  document.getElementById("spara-fil-btn").style.display = utgifter.length > 0 ? "block" : "none";
}

// SPLIT-TYP
function setSplitTyp(typ) {
  splitTyp = typ;
  document.getElementById("toggle-50").classList.toggle("aktiv", typ === "50");
  document.getElementById("toggle-egna").classList.toggle("aktiv", typ === "egna");
  document.getElementById("split-inputs-wrapper").style.display = typ === "egna" ? "block" : "none";
  if (typ === "egna") uppdateraEgnaInfo();
}
function setEditSplitTyp(typ) {
  editSplitTyp = typ;
  document.getElementById("edit-toggle-50").classList.toggle("aktiv", typ === "50");
  document.getElementById("edit-toggle-egna").classList.toggle("aktiv", typ === "egna");
  document.getElementById("edit-split-inputs-wrapper").style.display = typ === "egna" ? "block" : "none";
  if (typ === "egna") uppdateraEditEgnaInfo();
}

// EGNA-INFO (live preview)
function uppdateraEgnaInfo() {
  const bel = parseFloat(document.getElementById("belopp").value) || 0;
  const e1 = parseFloat(document.getElementById("split-p1").value) || 0;
  const e2 = parseFloat(document.getElementById("split-p2").value) || 0;
  document.getElementById("egna-info").textContent = egnaInfoText(bel, e1, e2);
}
function uppdateraEditEgnaInfo() {
  const bel = parseFloat(document.getElementById("edit-belopp").value) || 0;
  const e1 = parseFloat(document.getElementById("edit-split-p1").value) || 0;
  const e2 = parseFloat(document.getElementById("edit-split-p2").value) || 0;
  document.getElementById("edit-egna-info").textContent = egnaInfoText(bel, e1, e2);
}

// LÄGG TILL
function laggTillUtgift() {
  const besk = document.getElementById("beskrivning").value.trim();
  const bel = parseFloat(document.getElementById("belopp").value);
  const betalare = document.getElementById("betalare").value;
  if (!besk || isNaN(bel) || bel <= 0) { alert("Fyll i beskrivning och belopp."); return; }
  const egnaP1 = parseFloat(document.getElementById("split-p1").value) || 0;
  const egnaP2 = parseFloat(document.getElementById("split-p2").value) || 0;
  const result = raknaDel(bel, splitTyp, egnaP1, egnaP2);
  if (!result) { alert("Egna kostnader överstiger totalt belopp."); return; }
  const {delP1, delP2} = result;
  utgifter.unshift({ id: Date.now(), beskrivning: besk, belopp: bel, betalare, delP1, delP2, datum: datumTillStr(valtDatum) });
  spara();
  document.getElementById("beskrivning").value = "";
  document.getElementById("belopp").value = "";
  document.getElementById("split-p1").value = "";
  document.getElementById("split-p2").value = "";
  document.getElementById("egna-info").textContent = "";
  setSplitTyp("50");
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
  document.getElementById("edit-betalare").value = u.betalare;
  const ar5050 = Math.abs(u.delP1 - u.delP2) < 0.001 && Math.abs(u.delP1 - u.belopp/2) < 0.001;
  if (ar5050) {
    setEditSplitTyp("50");
    document.getElementById("edit-split-p1").value = "";
    document.getElementById("edit-split-p2").value = "";
  } else {
    setEditSplitTyp("egna");
    document.getElementById("edit-split-p1").value = "";
    document.getElementById("edit-split-p2").value = "";
    uppdateraEditEgnaInfo();
  }
  document.getElementById("edit-modal").classList.add("visa");
}

// EDIT - spara
function sparaEdit() {
  const bel = parseFloat(document.getElementById("edit-belopp").value);
  const betalare = document.getElementById("edit-betalare").value;
  if (isNaN(bel) || bel <= 0) { alert("Ange ett giltigt belopp."); return; }
  const egnaP1 = parseFloat(document.getElementById("edit-split-p1").value) || 0;
  const egnaP2 = parseFloat(document.getElementById("edit-split-p2").value) || 0;
  const result = raknaDel(bel, editSplitTyp, egnaP1, egnaP2);
  if (!result) { alert("Egna kostnader överstiger totalt belopp."); return; }
  const {delP1, delP2} = result;
  const idx = utgifter.findIndex(x => x.id === editId);
  if (idx !== -1) {
    utgifter[idx] = { ...utgifter[idx], belopp: bel, betalare, delP1, delP2 };
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
  const saldo = raknaUtSaldo(utgifter);
  const totalt = utgifter.reduce((s, u) => s + u.belopp, 0);
  const kortEl = document.getElementById("saldo-kort");
  const belEl = document.getElementById("saldo-belopp");
  const txtEl = document.getElementById("saldo-text");
  const totaltEl = document.getElementById("saldo-totalt");

  belEl.textContent = Math.abs(saldo).toFixed(2).replace(".",",") + " kr";
  if (Math.abs(saldo) < 0.01) {
    kortEl.className = "saldo-kort noll";
    txtEl.textContent = "Ni är quitt! 🎉";
    totaltEl.textContent = totalt > 0 ? "Totalt " + totalt.toFixed(2).replace(".",",") + " kr i utgifter" : "";
  } else if (saldo > 0) {
    kortEl.className = "saldo-kort";
    txtEl.textContent = person2 + " är skyldig " + person1;
    totaltEl.textContent = "av totalt " + totalt.toFixed(2).replace(".",",") + " kr i utgifter";
  } else {
    kortEl.className = "saldo-kort";
    txtEl.textContent = person1 + " är skyldig " + person2;
    totaltEl.textContent = "av totalt " + totalt.toFixed(2).replace(".",",") + " kr i utgifter";
  }

  const lista = document.getElementById("historik-lista");
  if (utgifter.length === 0) {
    lista.innerHTML = '<div class="tom-historik">Inga utgifter ännu.</div>';
    return;
  }
  lista.innerHTML = utgifter.map(u => {
    const betalareNamn = u.betalare === "p1" ? person1 : person2;
    const badgeKlass = u.betalare === "p1" ? "p1" : "p2";
    return `
      <div class="utgift-rad" onclick="oppnaEdit(${u.id})">
        <div class="utgift-info">
          <div class="utgift-beskrivning">${esc(u.beskrivning)}</div>
          <div class="utgift-meta">
            ${u.datum}<br>
            ${esc(person1)}: ${u.delP1.toFixed(2).replace(".",",")} kr &nbsp;·&nbsp; ${esc(person2)}: ${u.delP2.toFixed(2).replace(".",",")} kr
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

function visaRegleraModal() {
  const saldo = raknaUtSaldo(utgifter);
  let txt = "Nollställer saldot och arkiverar alla utgifter.";
  if (Math.abs(saldo) >= 0.01) {
    const vem = saldo > 0 ? person2 + " betalar " + person1 : person1 + " betalar " + person2;
    txt = vem + " " + Math.abs(saldo).toFixed(2).replace(".",",") + " kr för att reglera. Bekräfta?";
  }
  document.getElementById("reglera-text").textContent = txt;
  document.getElementById("reglera-modal").classList.add("visa");
}
function stangModal(id) { document.getElementById(id).classList.remove("visa"); }
function reglera() { utgifter = []; spara(); uppdatera(); stangModal("reglera-modal"); }
function sparaFil() {
  const data = { version: 1, exporterad: new Date().toISOString(), person2, utgifter };
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
      if (typeof data.person2 !== "string" || !Array.isArray(data.utgifter)) {
        alert("Filen ser inte ut som en giltig Kvitts-fil.");
        return;
      }
      if (utgifter.length > 0 && !confirm("Detta ersätter dina nuvarande utgifter. Fortsätt?")) {
        return;
      }
      person2 = data.person2;
      utgifter = data.utgifter;
      localStorage.setItem("kvitts_person2", person2);
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
