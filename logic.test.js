const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { raknaDel, raknaUtSaldo, egnaInfoText } = require("./logic");

// ---------------------------------------------------------------------------
// Helper: compare floating-point values with tolerance
// ---------------------------------------------------------------------------
function assertClose(actual, expected, msg, tolerance = 0.001) {
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${msg}: expected ~${expected}, got ${actual}`
  );
}

// ===========================================================================
// raknaDel — split calculation
// ===========================================================================
describe("raknaDel", () => {
  // --- 50/50 ---------------------------------------------------------------
  describe("50/50 split", () => {
    it("splits an even amount equally", () => {
      const r = raknaDel(100, "50");
      assert.equal(r.delP1, 50);
      assert.equal(r.delP2, 50);
    });

    it("splits an odd amount equally (with decimals)", () => {
      const r = raknaDel(99, "50");
      assert.equal(r.delP1, 49.5);
      assert.equal(r.delP2, 49.5);
    });

    it("handles small amounts", () => {
      const r = raknaDel(1, "50");
      assert.equal(r.delP1, 0.5);
      assert.equal(r.delP2, 0.5);
    });

    it("handles very large amounts", () => {
      const r = raknaDel(999999.98, "50");
      assertClose(r.delP1, 499999.99, "delP1");
      assertClose(r.delP2, 499999.99, "delP2");
    });

    it("splits zero amount", () => {
      const r = raknaDel(0, "50");
      assert.equal(r.delP1, 0);
      assert.equal(r.delP2, 0);
    });

    it("delP1 + delP2 always equals total", () => {
      const amounts = [1, 3, 7.77, 100, 333.33, 0.01];
      for (const bel of amounts) {
        const r = raknaDel(bel, "50");
        assertClose(r.delP1 + r.delP2, bel, `sum for ${bel}`);
      }
    });
  });

  // --- Egna kostnader ------------------------------------------------------
  describe("egna (custom split)", () => {
    it("only personal costs, nothing shared", () => {
      // Mikael 60kr egna, Person2 40kr egna, totalt 100
      const r = raknaDel(100, "egna", 60, 40);
      assert.equal(r.delP1, 60);
      assert.equal(r.delP2, 40);
    });

    it("all shared, no personal costs", () => {
      // egna = 0/0 => hela beloppet delas 50/50
      const r = raknaDel(200, "egna", 0, 0);
      assert.equal(r.delP1, 100);
      assert.equal(r.delP2, 100);
    });

    it("mix of personal and shared costs", () => {
      // Totalt 100, Mikael egna 20, Person2 egna 10 => kvar = 70, delat = 35
      // delP1 = 20+35 = 55, delP2 = 10+35 = 45
      const r = raknaDel(100, "egna", 20, 10);
      assertClose(r.delP1, 55, "delP1");
      assertClose(r.delP2, 45, "delP2");
    });

    it("delP1 + delP2 equals total amount", () => {
      const r = raknaDel(150, "egna", 30, 20);
      assertClose(r.delP1 + r.delP2, 150, "sum");
    });

    it("returns null when personal costs exceed total", () => {
      const r = raknaDel(100, "egna", 60, 50);
      assert.equal(r, null);
    });

    it("allows personal costs exactly equal to total", () => {
      // kvar = 0, exactly at boundary
      const r = raknaDel(100, "egna", 60, 40);
      assert.notEqual(r, null);
      assertClose(r.delP1 + r.delP2, 100, "sum");
    });

    it("handles tiny overshoot within tolerance", () => {
      // kvar = 100 - 50.0005 - 50.0004 = -0.0009 => within 0.001 tolerance, should NOT be null
      const r = raknaDel(100, "egna", 50.0005, 50.0004);
      assert.notEqual(r, null);
    });

    it("handles one person paying nothing personal", () => {
      const r = raknaDel(100, "egna", 0, 30);
      // kvar = 70, delat = 35 => delP1 = 35, delP2 = 65
      assertClose(r.delP1, 35, "delP1");
      assertClose(r.delP2, 65, "delP2");
    });
  });
});

// ===========================================================================
// raknaUtSaldo — balance summation (THE critical function)
// ===========================================================================
describe("raknaUtSaldo", () => {
  it("returns 0 for no expenses", () => {
    assert.equal(raknaUtSaldo([]), 0);
  });

  // --- Single expenses -----------------------------------------------------
  it("Mikael pays 50/50 => person2 owes their half", () => {
    const saldo = raknaUtSaldo([
      { betalare: "p1", delP1: 50, delP2: 50 },
    ]);
    assertClose(saldo, 50, "saldo");
  });

  it("Person2 pays 50/50 => Mikael owes their half", () => {
    const saldo = raknaUtSaldo([
      { betalare: "p2", delP1: 50, delP2: 50 },
    ]);
    assertClose(saldo, -50, "saldo");
  });

  // --- Cancelling out ------------------------------------------------------
  it("equal opposite payments cancel out to zero", () => {
    const saldo = raknaUtSaldo([
      { betalare: "p1", delP1: 50, delP2: 50 },
      { betalare: "p2", delP1: 50, delP2: 50 },
    ]);
    assertClose(saldo, 0, "saldo");
  });

  // --- Multiple expenses ---------------------------------------------------
  it("multiple expenses from same payer accumulate", () => {
    const saldo = raknaUtSaldo([
      { betalare: "p1", delP1: 50, delP2: 50 },
      { betalare: "p1", delP1: 25, delP2: 25 },
    ]);
    // person2 owes 50 + 25 = 75
    assertClose(saldo, 75, "saldo");
  });

  it("net balance with mixed payers", () => {
    const saldo = raknaUtSaldo([
      { betalare: "p1", delP1: 50, delP2: 50 },   // +50
      { betalare: "p2", delP1: 30, delP2: 70 },   // -30
      { betalare: "p1", delP1: 20, delP2: 80 },   // +80
    ]);
    // 50 - 30 + 80 = 100
    assertClose(saldo, 100, "saldo");
  });

  // --- Custom split scenarios ----------------------------------------------
  it("custom split: Mikael pays, uneven shares", () => {
    // Mikael pays 100kr. delP1=70 (his share), delP2=30 (person2's share)
    const saldo = raknaUtSaldo([
      { betalare: "p1", delP1: 70, delP2: 30 },
    ]);
    // person2 owes Mikael 30
    assertClose(saldo, 30, "saldo");
  });

  it("custom split: person2 pays, uneven shares", () => {
    // Person2 pays 100kr. delP1=70 (Mikael's share), delP2=30 (person2's share)
    const saldo = raknaUtSaldo([
      { betalare: "p2", delP1: 70, delP2: 30 },
    ]);
    // Mikael owes person2 70
    assertClose(saldo, -70, "saldo");
  });

  // --- Realistic scenario --------------------------------------------------
  it("realistic week of shared expenses", () => {
    const utgifter = [
      // Monday: Mikael buys groceries 450kr, 50/50
      { betalare: "p1", delP1: 225, delP2: 225 },
      // Tuesday: Person2 pays restaurant 380kr, 50/50
      { betalare: "p2", delP1: 190, delP2: 190 },
      // Wednesday: Mikael pays taxi 120kr, 50/50
      { betalare: "p1", delP1: 60, delP2: 60 },
      // Thursday: Person2 buys film tickets 240kr, 50/50
      { betalare: "p2", delP1: 120, delP2: 120 },
      // Friday: Mikael buys dinner 500kr, custom split (his wine 80kr extra)
      // egnaP1=80, shared=420, delat=210 => delP1=290, delP2=210
      { betalare: "p1", delP1: 290, delP2: 210 },
    ];
    // Saldo: +225 - 190 + 60 - 120 + 210 = 185
    const saldo = raknaUtSaldo(utgifter);
    assertClose(saldo, 185, "weekly saldo");
  });

  // --- Edge cases ----------------------------------------------------------
  it("all expenses paid by one person", () => {
    const saldo = raknaUtSaldo([
      { betalare: "p1", delP1: 50, delP2: 50 },
      { betalare: "p1", delP1: 100, delP2: 100 },
      { betalare: "p1", delP1: 25, delP2: 25 },
    ]);
    // person2 owes 50 + 100 + 25 = 175
    assertClose(saldo, 175, "saldo");
  });

  it("many small expenses don't accumulate floating point errors significantly", () => {
    // 100 small expenses of 0.10kr each, alternating payers, 50/50
    const utgifter = [];
    for (let i = 0; i < 100; i++) {
      utgifter.push({
        betalare: i % 2 === 0 ? "p1" : "p2",
        delP1: 0.05,
        delP2: 0.05,
      });
    }
    // 50 times +0.05 and 50 times -0.05 => should be ~0
    const saldo = raknaUtSaldo(utgifter);
    assertClose(saldo, 0, "floating point saldo", 0.01);
  });

  it("single expense where one person owes everything", () => {
    // Person2 had their own cost for the full amount
    const saldo = raknaUtSaldo([
      { betalare: "p1", delP1: 0, delP2: 100 },
    ]);
    assertClose(saldo, 100, "saldo");
  });
});

// ===========================================================================
// egnaInfoText — live preview text
// ===========================================================================
describe("egnaInfoText", () => {
  it("returns empty string for zero amount", () => {
    assert.equal(egnaInfoText(0, 0, 0), "");
  });

  it("returns empty string for NaN amount", () => {
    assert.equal(egnaInfoText(NaN, 0, 0), "");
  });

  it("returns empty string for negative amount", () => {
    assert.equal(egnaInfoText(-10, 0, 0), "");
  });

  it("shows shared split info for valid inputs", () => {
    const txt = egnaInfoText(100, 20, 10);
    // kvar = 70, delat = 35
    assert.ok(txt.includes("70,00"), "should contain remaining amount");
    assert.ok(txt.includes("35,00"), "should contain split amount");
    assert.ok(txt.includes("Delas"), "should contain 'Delas'");
  });

  it("shows warning when personal costs exceed total", () => {
    const txt = egnaInfoText(100, 60, 50);
    assert.ok(txt.includes("överstiger"), "should warn about exceeding");
    assert.ok(txt.includes("110,00"), "should show total personal costs");
  });

  it("handles all amount going to shared (egna = 0)", () => {
    const txt = egnaInfoText(200, 0, 0);
    assert.ok(txt.includes("200,00"), "should show full amount as shared");
    assert.ok(txt.includes("100,00"), "should show half");
  });

  it("handles personal costs exactly equal to total", () => {
    const txt = egnaInfoText(100, 50, 50);
    // kvar = 0, delat = 0
    assert.ok(txt.includes("Delas"), "should show split info, not warning");
    assert.ok(txt.includes("0,00"), "shared amount is 0");
  });
});

// ===========================================================================
// Integration: raknaDel + raknaUtSaldo together
// ===========================================================================
describe("integration: raknaDel -> raknaUtSaldo", () => {
  it("two identical expenses by different payers cancel out", () => {
    const del1 = raknaDel(200, "50");
    const del2 = raknaDel(200, "50");
    const saldo = raknaUtSaldo([
      { betalare: "p1", ...del1 },
      { betalare: "p2", ...del2 },
    ]);
    assertClose(saldo, 0, "should cancel out");
  });

  it("custom splits produce correct net balance", () => {
    // Mikael pays 100, egna: p1=30, p2=20 => delP1=55, delP2=45
    const del1 = raknaDel(100, "egna", 30, 20);
    // Person2 pays 80, 50/50 => delP1=40, delP2=40
    const del2 = raknaDel(80, "50");

    const saldo = raknaUtSaldo([
      { betalare: "p1", ...del1 },
      { betalare: "p2", ...del2 },
    ]);
    // +45 (person2 owes from first) - 40 (Mikael owes from second) = +5
    assertClose(saldo, 5, "net saldo");
  });

  it("person who pays nothing personal but pays bill gets correct credit", () => {
    // Mikael pays 100, egna: p1=0, p2=100. kvar=0 => delP1=0, delP2=100
    const del = raknaDel(100, "egna", 0, 100);
    assertClose(del.delP1, 0, "delP1");
    assertClose(del.delP2, 100, "delP2");

    const saldo = raknaUtSaldo([{ betalare: "p1", ...del }]);
    // person2 owes Mikael 100 (full amount since it was all person2's cost)
    assertClose(saldo, 100, "saldo");
  });

  it("symmetry: swapping payer inverts the saldo", () => {
    const del = raknaDel(100, "egna", 30, 20);

    const saldoP1Pays = raknaUtSaldo([{ betalare: "p1", ...del }]);
    const saldoP2Pays = raknaUtSaldo([{ betalare: "p2", ...del }]);

    // When p1 pays: saldo = +delP2 = +45
    // When p2 pays: saldo = -delP1 = -55
    // These should NOT be negatives of each other (unless 50/50) because the shares are different
    assertClose(saldoP1Pays, 45, "p1 pays");
    assertClose(saldoP2Pays, -55, "p2 pays");
    // But sum should equal total: |45| + |55| = 100
    assertClose(Math.abs(saldoP1Pays) + Math.abs(saldoP2Pays), 100, "sum of absolutes");
  });
});
