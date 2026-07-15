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
  if (kvar < 0.001) {
    return "Exakt fördelning ✓";
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
 * Greedy min-cash-flow: beräknar en optimerad lista av överföringar som nollar
 * alla nettosaldon. Ger alltid ≤ N−1 överföringar.
 *
 * @param {Array} utgifter
 * @param {Array<{id: string}>} personer
 * @returns {Array<{fran: string, till: string, belopp: number}>}
 */
function minimeradeOverforingar(utgifter, personer) {
  const EPS = 0.01;
  const saldo = raknaUtSaldo(utgifter, personer);

  const kreditorer = [];
  const debitorer = [];
  for (const [id, netto] of Object.entries(saldo)) {
    if (netto > EPS) kreditorer.push({ id, netto });
    else if (netto < -EPS) debitorer.push({ id, skuld: -netto });
  }

  kreditorer.sort((a, b) => b.netto - a.netto);
  debitorer.sort((a, b) => b.skuld - a.skuld);

  const overforingar = [];
  while (kreditorer.length > 0 && debitorer.length > 0) {
    const k = kreditorer[0];
    const d = debitorer[0];
    const belopp = Math.min(k.netto, d.skuld);
    overforingar.push({
      fran: d.id,
      till: k.id,
      belopp: Math.round(belopp * 100) / 100,
    });
    k.netto -= belopp;
    d.skuld -= belopp;
    if (k.netto < EPS) kreditorer.shift();
    if (d.skuld < EPS) debitorer.shift();
  }

  return overforingar;
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

/**
 * Normalisera en e-postadress inför hashning: lowercase + trim.
 * @param {string} epost
 * @returns {string}
 */
function normaliseraEpost(epost) {
  return (epost || "").toLowerCase().trim();
}

/**
 * SHA-256-hash av en normaliserad identifierare. Returnerar hex-sträng.
 * Använder SubtleCrypto (browser) eller Node:s globalThis.crypto (Node 19+/15+).
 *
 * @param {string} identifierare  - råvärde från användaren (normaliseras internt)
 * @returns {Promise<string>}     - hex-sträng, 64 tecken
 */
async function hashIdentitet(identifierare) {
  const normaliserad = normaliseraEpost(identifierare);
  const data = new TextEncoder().encode(normaliserad);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hashBuffer);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generera ett unikt member_token (UUID v4).
 * @returns {string}
 */
function generateMemberToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback för äldre miljöer
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Plocka ut grupp-ID:t ur en pathname som "/g/ABC123".
 * Tillåter 4–10 alphanumeriska tecken (case-insensitive, normaliserar till
 * versaler). Returnerar null om pathname inte matchar.
 *
 * @param {string} pathname
 * @returns {string | null}
 */
function parseGruppSokvag(pathname) {
  if (typeof pathname !== "string") return null;
  const m = pathname.match(/^\/g\/([A-Za-z0-9]{4,10})\/?$/);
  return m ? m[1].toUpperCase() : null;
}

/**
 * localStorage-nyckel för stabil deltagar-identitet per grupp (feature 018a).
 * Skrivs vid join/skapa, läses vid återbesök på /g/<id> för tyst återanslutning
 * även när session-blobben är borta.
 *
 * @param {string} gruppId
 * @returns {string}
 */
function gruppMemberKey(gruppId) {
  return "kvitts_grupp_" + gruppId + "_member_id";
}

// ─────────────────────────────────────────────────────────────────────────────
// GEMENSAM REGLERING (feature 017)
//
// Kvittensen (en "settlement") nycklas på (fran→till)-paret i den optimerade
// betalningsplanen (minimeradeOverforingar). En kvittens innebär att kreditorn
// (till) har bekräftat att debitorn (fran) betalat `belopp`.
//
// Staleness (beslut 1): om planens belopp för ett par skiljer sig väsentligt
// från det kvitterade beloppet — t.ex. för att en ny utgift ändrat planen —
// räknas paret INTE som reglerat, utan flaggas `stale` så UI:t kan be om ny
// bekräftelse.
// ─────────────────────────────────────────────────────────────────────────────

const REGLERING_EPS = 0.01;

/**
 * Slå ihop den optimerade planen med registrerade kvittenser.
 * Varje överföring får `kvitterad` (bekräftad, belopp matchar) och `stale`
 * (kvittens finns men beloppet har ändrats → behöver bekräftas igen).
 *
 * @param {Array<{fran: string, till: string, belopp: number}>} plan
 * @param {Array<{fran: string, till: string, belopp: number}>} kvittenser
 * @returns {Array<{fran: string, till: string, belopp: number, kvitterad: boolean, stale: boolean}>}
 */
function matchaPlanMotKvittenser(plan, kvittenser) {
  const lista = Array.isArray(kvittenser) ? kvittenser : [];
  return (plan || []).map((rad) => {
    const kv = lista.find((k) => k.fran === rad.fran && k.till === rad.till);
    if (!kv) {
      return { ...rad, kvitterad: false, stale: false };
    }
    const beloppMatchar = Math.abs(Number(kv.belopp) - rad.belopp) < REGLERING_EPS;
    return {
      ...rad,
      kvitterad: beloppMatchar,
      stale: !beloppMatchar,
    };
  });
}

/**
 * Är alla överföringar i planen kvitterade? Tom plan (inga skulder) räknas
 * som fullt reglerad.
 *
 * @param {Array<{fran: string, till: string, belopp: number}>} plan
 * @param {Array<{fran: string, till: string, belopp: number}>} kvittenser
 * @returns {boolean}
 */
function gruppFulltReglerat(plan, kvittenser) {
  const matchad = matchaPlanMotKvittenser(plan, kvittenser);
  return matchad.every((rad) => rad.kvitterad);
}

/**
 * Ska en viss debitors vy arkiveras? Sant när alla överföringar där personen
 * är avsändare (`fran === migId`) är kvitterade. Har personen inga skulder
 * (bara kreditor, eller inget alls) → sant, inget att vänta på.
 *
 * @param {Array<{fran: string, till: string, belopp: number}>} plan
 * @param {Array<{fran: string, till: string, belopp: number}>} kvittenser
 * @param {string} migId
 * @returns {boolean}
 */
function debitorArkiverad(plan, kvittenser, migId) {
  const minaSkulder = matchaPlanMotKvittenser(plan, kvittenser)
    .filter((rad) => rad.fran === migId);
  return minaSkulder.every((rad) => rad.kvitterad);
}

/**
 * Ska min vy arkiveras? Sant när jag är inblandad i minst en överföring och
 * ALLA överföringar som rör mig (som avsändare `fran` eller mottagare `till`)
 * är kvitterade. Detta täcker alla roller korrekt:
 *   - Ren debitor: alla mina skulder bekräftade → arkiveras (spec: "när alla
 *     en debitors kreditorer tryckt Reglerat").
 *   - Ren kreditor: alla som är skyldiga mig är bekräftade (av mig) → arkiveras.
 *   - Blandad debitor/kreditor: arkiveras först när både mina skulder OCH de
 *     betalningar jag ska bekräfta är klara — annars skulle jag förlora
 *     möjligheten att kvittera inkommande betalningar.
 * Är jag inte inblandad alls (inga rader) → falskt, det finns inget att
 * arkivera på min inblandning ännu.
 *
 * @param {Array<{fran: string, till: string, belopp: number}>} plan
 * @param {Array<{fran: string, till: string, belopp: number}>} kvittenser
 * @param {string} migId
 * @returns {boolean}
 */
function minRegleringKlar(plan, kvittenser, migId) {
  const minaRader = matchaPlanMotKvittenser(plan, kvittenser)
    .filter((rad) => rad.fran === migId || rad.till === migId);
  if (minaRader.length === 0) return false;
  return minaRader.every((rad) => rad.kvitterad);
}

if (typeof module !== "undefined") {
  module.exports = {
    raknaDel,
    raknaUtSaldo,
    raknaParSaldon,
    egnaInfoText,
    migreraUtgift,
    minimeradeOverforingar,
    parseGruppSokvag,
    gruppMemberKey,
    normaliseraEpost,
    hashIdentitet,
    generateMemberToken,
    matchaPlanMotKvittenser,
    gruppFulltReglerat,
    debitorArkiverad,
    minRegleringKlar,
  };
}
