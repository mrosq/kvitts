// Pure logic functions shared by app.js (browser) and logic.test.js (Node).
// N-personers-generalisering — se docs/features/006a-fundament-n-personer.md.

/**
 * Dela en utgift mellan deltagare.
 *
 * @param {number}   belopp      - totalt belopp
 * @param {string}   typ         - "jamnt" (alias "50") eller "egna"
 * @param {string[]} deltagare   - lista av person-id:n som delar utgiften
 * @param {Object<string,number>} [egna={}]  - endast vid typ "egna": id → egen del
 * @returns {Object<string,number> | null}   - fordelning {id: andel}, eller null
 *                                             om Σ egna > belopp (tolerans 0.001)
 */
function raknaDel(belopp, typ, deltagare, egna = {}) {
  if (!Array.isArray(deltagare) || deltagare.length === 0) return null;

  if (typ === "jamnt" || typ === "50") {
    const andel = belopp / deltagare.length;
    const fordelning = {};
    for (const id of deltagare) fordelning[id] = andel;
    return fordelning;
  }

  if (typ === "egna") {
    let summaEgna = 0;
    for (const id of deltagare) summaEgna += egna[id] || 0;
    const kvar = belopp - summaEgna;
    if (kvar < -0.001) return null;
    const delat = kvar / deltagare.length;
    const fordelning = {};
    for (const id of deltagare) fordelning[id] = (egna[id] || 0) + delat;
    return fordelning;
  }

  return null;
}

/**
 * Beräkna nettosaldo per person över en lista av utgifter.
 * Netto > 0 → personen ska få in pengar. Netto < 0 → personen är skyldig.
 *
 * @param {Array<{betalare_id: string, belopp: number, fordelning: Object<string,number>}>} utgifter
 * @param {Array<{id: string}>} personer  - alla personer som ska få en post i resultatet
 * @returns {Object<string,number>}       - {id: nettoSaldo} för varje person i `personer`
 */
function raknaUtSaldo(utgifter, personer) {
  const saldo = {};
  for (const p of personer) saldo[p.id] = 0;
  for (const u of utgifter) {
    if (u.betalare_id in saldo) saldo[u.betalare_id] += u.belopp;
    for (const id in u.fordelning) {
      if (id in saldo) saldo[id] -= u.fordelning[id];
    }
  }
  return saldo;
}

/**
 * Parvisa nettosaldon mellan "mig" och varje annan person.
 * För varje annan X: (mig betalat för X:s andel) − (X betalat för mig:s andel).
 * Positivt → X skyldig mig. Negativt → mig skyldig X.
 *
 * @param {Array<{betalare_id: string, fordelning: Object<string,number>}>} utgifter
 * @param {string} migId
 * @param {Array<{id: string}>} personer
 * @returns {Array<{id: string, netto: number}>}  - en post per person ≠ migId
 */
function raknaParSaldon(utgifter, migId, personer) {
  const par = {};
  for (const p of personer) if (p.id !== migId) par[p.id] = 0;

  for (const u of utgifter) {
    const delning = u.fordelning || {};
    if (u.betalare_id === migId) {
      for (const id in delning) {
        if (id !== migId && id in par) par[id] += delning[id];
      }
    } else if (u.betalare_id in par) {
      par[u.betalare_id] -= delning[migId] || 0;
    }
  }

  return Object.entries(par).map(([id, netto]) => ({ id, netto }));
}

/**
 * Live preview-text för "egna kostnader"-läget.
 *
 * @param {number} belopp
 * @param {Object<string,number>} egna      - {id: egen_del}
 * @param {string[]} deltagare
 * @returns {string}
 */
function egnaInfoText(belopp, egna = {}, deltagare = []) {
  if (isNaN(belopp) || belopp <= 0) return "";
  let summaEgna = 0;
  for (const id of deltagare) summaEgna += egna[id] || 0;
  const kvar = belopp - summaEgna;
  const n = deltagare.length || 1;

  if (kvar < -0.001) {
    return (
      "⚠️ Egna kostnader (" +
      summaEgna.toFixed(2).replace(".", ",") +
      " kr) överstiger totalt (" +
      belopp.toFixed(2).replace(".", ",") +
      " kr)"
    );
  }
  const delat = kvar / n;
  return (
    "Delas: " +
    kvar.toFixed(2).replace(".", ",") +
    " kr ÷ " +
    n +
    " = " +
    delat.toFixed(2).replace(".", ",") +
    " kr var"
  );
}

/**
 * Migrera en utgift från gammalt 2-personers-format till N-personers-format.
 * Idempotent — returnerar objektet oförändrat om det redan är migrerat.
 *
 * @param {Object} u  - utgift i något av formaten
 * @returns {Object}  - utgift i nytt format
 */
function migreraUtgift(u) {
  if (u.fordelning && u.betalare_id) return u;
  const { betalare, delP1, delP2, ...rest } = u;
  return {
    ...rest,
    betalare_id: betalare,
    fordelning: { p1: delP1 || 0, p2: delP2 || 0 },
  };
}

if (typeof module !== "undefined") {
  module.exports = {
    raknaDel,
    raknaUtSaldo,
    raknaParSaldon,
    egnaInfoText,
    migreraUtgift,
  };
}
