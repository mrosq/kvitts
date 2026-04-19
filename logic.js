// Pure logic functions shared by app.js (browser) and logic.test.js (Node).

/**
 * Calculate each person's share of an expense.
 * @param {number} belopp  - total expense
 * @param {string} typ     - "50" for even split, "egna" for custom
 * @param {number} egnaP1  - Mikael's personal portion (only used when typ === "egna")
 * @param {number} egnaP2  - Person 2's personal portion (only used when typ === "egna")
 * @returns {{ delP1: number, delP2: number } | null}  null when egna exceeds total
 */
function raknaDel(belopp, typ, egnaP1 = 0, egnaP2 = 0) {
  if (typ === "50") return { delP1: belopp / 2, delP2: belopp / 2 };
  const kvar = belopp - egnaP1 - egnaP2;
  if (kvar < -0.001) return null;
  const delat = kvar / 2;
  return { delP1: egnaP1 + delat, delP2: egnaP2 + delat };
}

/**
 * Calculate the balance across a list of expenses.
 * Positive = person 2 owes Mikael. Negative = Mikael owes person 2.
 * @param {{ betalare: string, delP1: number, delP2: number }[]} utgifter
 * @returns {number}
 */
function raknaUtSaldo(utgifter) {
  let saldo = 0;
  for (const u of utgifter) {
    saldo += u.betalare === "p1" ? u.delP2 : -u.delP1;
  }
  return saldo;
}

/**
 * Info text shown during custom split entry.
 * @param {number} bel     - total expense
 * @param {number} egnaP1  - Mikael's personal portion
 * @param {number} egnaP2  - Person 2's personal portion
 * @returns {string}
 */
function egnaInfoText(bel, egnaP1, egnaP2) {
  const kvar = bel - egnaP1 - egnaP2;
  if (isNaN(bel) || bel <= 0) return "";
  if (kvar < -0.001)
    return (
      "⚠️ Egna kostnader (" +
      (egnaP1 + egnaP2).toFixed(2).replace(".", ",") +
      " kr) överstiger totalt (" +
      bel.toFixed(2).replace(".", ",") +
      " kr)"
    );
  const delat = kvar / 2;
  return (
    "Delas: " +
    kvar.toFixed(2).replace(".", ",") +
    " kr ÷ 2 = " +
    delat.toFixed(2).replace(".", ",") +
    " kr var"
  );
}

if (typeof module !== "undefined") module.exports = { raknaDel, raknaUtSaldo, egnaInfoText };
