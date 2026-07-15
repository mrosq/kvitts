const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
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
  relativTid,
  diffaNotiser,
} = require("./logic");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
function assertClose(actual, expected, msg, tolerance = 0.001) {
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `${msg}: expected ~${expected}, got ${actual}`
  );
}

const P2 = [{ id: "p1" }, { id: "p2" }];
const P3 = [{ id: "p1" }, { id: "p2" }, { id: "p3" }];
const DEL2 = ["p1", "p2"];
const DEL3 = ["p1", "p2", "p3"];

// ===========================================================================
// raknaDel — N-personers split
// ===========================================================================
describe("raknaDel", () => {
  // --- jämnt (N=2, bevarar 2-personers-beteendet) ---------------------------
  describe("jämnt, N=2", () => {
    it("delar jämnt", () => {
      const r = raknaDel(100, "jamnt", DEL2);
      assert.equal(r.p1, 50);
      assert.equal(r.p2, 50);
    });

    it("udda belopp med decimaler", () => {
      const r = raknaDel(99, "jamnt", DEL2);
      assert.equal(r.p1, 49.5);
      assert.equal(r.p2, 49.5);
    });

    it("små belopp", () => {
      const r = raknaDel(1, "jamnt", DEL2);
      assert.equal(r.p1, 0.5);
      assert.equal(r.p2, 0.5);
    });

    it("stora belopp", () => {
      const r = raknaDel(999999.98, "jamnt", DEL2);
      assertClose(r.p1, 499999.99, "p1");
      assertClose(r.p2, 499999.99, "p2");
    });

    it("noll", () => {
      const r = raknaDel(0, "jamnt", DEL2);
      assert.equal(r.p1, 0);
      assert.equal(r.p2, 0);
    });

    it("summan = beloppet", () => {
      for (const bel of [1, 3, 7.77, 100, 333.33, 0.01]) {
        const r = raknaDel(bel, "jamnt", DEL2);
        assertClose(r.p1 + r.p2, bel, `sum för ${bel}`);
      }
    });

    it("accepterar alias \"50\"", () => {
      const r = raknaDel(100, "50", DEL2);
      assert.equal(r.p1, 50);
      assert.equal(r.p2, 50);
    });
  });

  // --- jämnt (N=3) ---------------------------------------------------------
  describe("jämnt, N=3", () => {
    it("delar jämnt mellan 3", () => {
      const r = raknaDel(300, "jamnt", DEL3);
      assert.equal(r.p1, 100);
      assert.equal(r.p2, 100);
      assert.equal(r.p3, 100);
    });

    it("90/3 = 30", () => {
      const r = raknaDel(90, "jamnt", DEL3);
      assertClose(r.p1 + r.p2 + r.p3, 90, "summa");
      assertClose(r.p1, 30, "p1");
    });

    it("ojämn division ackumulerar", () => {
      const r = raknaDel(100, "jamnt", DEL3);
      assertClose(r.p1 + r.p2 + r.p3, 100, "summa");
    });
  });

  // --- egna (N=2) ----------------------------------------------------------
  describe("egna, N=2", () => {
    it("bara egna, inget delat", () => {
      const r = raknaDel(100, "egna", DEL2, { p1: 60, p2: 40 });
      assert.equal(r.p1, 60);
      assert.equal(r.p2, 40);
    });

    it("allt delat, inga egna", () => {
      const r = raknaDel(200, "egna", DEL2, { p1: 0, p2: 0 });
      assert.equal(r.p1, 100);
      assert.equal(r.p2, 100);
    });

    it("mix av egna och delat", () => {
      // bel=100, egna p1=20, p2=10 → kvar=70 → delat=35
      // p1=20+35=55, p2=10+35=45
      const r = raknaDel(100, "egna", DEL2, { p1: 20, p2: 10 });
      assertClose(r.p1, 55, "p1");
      assertClose(r.p2, 45, "p2");
    });

    it("summan = beloppet", () => {
      const r = raknaDel(150, "egna", DEL2, { p1: 30, p2: 20 });
      assertClose(r.p1 + r.p2, 150, "summa");
    });

    it("null när egna överstiger beloppet", () => {
      const r = raknaDel(100, "egna", DEL2, { p1: 60, p2: 50 });
      assert.equal(r, null);
    });

    it("egna exakt = beloppet", () => {
      const r = raknaDel(100, "egna", DEL2, { p1: 60, p2: 40 });
      assert.notEqual(r, null);
      assertClose(r.p1 + r.p2, 100, "summa");
    });

    it("liten overshoot inom tolerans", () => {
      // kvar = -0.0009 → inom 0.001-tolerans, inte null
      const r = raknaDel(100, "egna", DEL2, { p1: 50.0005, p2: 50.0004 });
      assert.notEqual(r, null);
    });

    it("en person helt utan egna", () => {
      const r = raknaDel(100, "egna", DEL2, { p1: 0, p2: 30 });
      // kvar=70, delat=35 → p1=35, p2=65
      assertClose(r.p1, 35, "p1");
      assertClose(r.p2, 65, "p2");
    });

    it("tom egna-map = allt delat jämnt", () => {
      const r = raknaDel(100, "egna", DEL2);
      assertClose(r.p1, 50, "p1");
      assertClose(r.p2, 50, "p2");
    });
  });

  // --- egna (N=3) ----------------------------------------------------------
  describe("egna, N=3", () => {
    it("en person har eget påslag, resten delas jämnt", () => {
      // bel=300, p1 egna=60 (vin), p2=0, p3=0 → kvar=240 → delat=80
      // p1=60+80=140, p2=80, p3=80
      const r = raknaDel(300, "egna", DEL3, { p1: 60 });
      assertClose(r.p1, 140, "p1");
      assertClose(r.p2, 80, "p2");
      assertClose(r.p3, 80, "p3");
      assertClose(r.p1 + r.p2 + r.p3, 300, "summa");
    });

    it("null när summa egna > beloppet även med N=3", () => {
      const r = raknaDel(100, "egna", DEL3, { p1: 50, p2: 40, p3: 30 });
      assert.equal(r, null);
    });
  });

  // --- edge cases ----------------------------------------------------------
  describe("edge cases", () => {
    it("returnerar null för tom deltagarlista", () => {
      assert.equal(raknaDel(100, "jamnt", []), null);
    });

    it("returnerar null för okänd typ", () => {
      assert.equal(raknaDel(100, "annat", DEL2), null);
    });
  });
});

// ===========================================================================
// raknaUtSaldo — N-personers nettosaldo
// ===========================================================================
describe("raknaUtSaldo", () => {
  it("tom lista → noll per person", () => {
    const s = raknaUtSaldo([], P2);
    assert.equal(s.p1, 0);
    assert.equal(s.p2, 0);
  });

  // --- bevarar 2-personers-konventionen ------------------------------------
  describe("N=2, bevarar tidigare siffror", () => {
    it("p1 betalar 100 jämnt → p2 skyldig 50", () => {
      const s = raknaUtSaldo(
        [{ betalare_id: "p1", belopp: 100, fordelning: { p1: 50, p2: 50 } }],
        P2
      );
      // Konvention tidigare: saldo > 0 ⇔ p2 skyldig p1. Nu: s.p1 > 0 ⇔ p1 ska få.
      assertClose(s.p1, 50, "p1");
      assertClose(s.p2, -50, "p2");
    });

    it("p2 betalar 100 jämnt → p1 skyldig 50", () => {
      const s = raknaUtSaldo(
        [{ betalare_id: "p2", belopp: 100, fordelning: { p1: 50, p2: 50 } }],
        P2
      );
      assertClose(s.p1, -50, "p1");
      assertClose(s.p2, 50, "p2");
    });

    it("lika motsatta betalningar nollar ut", () => {
      const s = raknaUtSaldo(
        [
          { betalare_id: "p1", belopp: 100, fordelning: { p1: 50, p2: 50 } },
          { betalare_id: "p2", belopp: 100, fordelning: { p1: 50, p2: 50 } },
        ],
        P2
      );
      assertClose(s.p1, 0, "p1");
      assertClose(s.p2, 0, "p2");
    });

    it("flera utgifter från samma betalare ackumulerar", () => {
      const s = raknaUtSaldo(
        [
          { betalare_id: "p1", belopp: 100, fordelning: { p1: 50, p2: 50 } },
          { betalare_id: "p1", belopp: 50, fordelning: { p1: 25, p2: 25 } },
        ],
        P2
      );
      assertClose(s.p1, 75, "p1 ska få 75");
      assertClose(s.p2, -75, "p2 skyldig 75");
    });

    it("realistisk vecka", () => {
      const utg = [
        { betalare_id: "p1", belopp: 450, fordelning: { p1: 225, p2: 225 } },
        { betalare_id: "p2", belopp: 380, fordelning: { p1: 190, p2: 190 } },
        { betalare_id: "p1", belopp: 120, fordelning: { p1: 60, p2: 60 } },
        { betalare_id: "p2", belopp: 240, fordelning: { p1: 120, p2: 120 } },
        // Fredag: Mikael middag 500kr, egna vin 80kr → p1:290, p2:210
        { betalare_id: "p1", belopp: 500, fordelning: { p1: 290, p2: 210 } },
      ];
      const s = raknaUtSaldo(utg, P2);
      // Tidigare: +225 -190 +60 -120 +210 = +185 (p2 skyldig p1)
      assertClose(s.p1, 185, "p1");
      assertClose(s.p2, -185, "p2");
    });

    it("nollsummespel: summan av alla saldon = 0", () => {
      const utg = [
        { betalare_id: "p1", belopp: 100, fordelning: { p1: 30, p2: 70 } },
        { betalare_id: "p2", belopp: 60, fordelning: { p1: 20, p2: 40 } },
      ];
      const s = raknaUtSaldo(utg, P2);
      assertClose(s.p1 + s.p2, 0, "summan är 0");
    });
  });

  // --- N=3 -----------------------------------------------------------------
  describe("N=3", () => {
    it("p1 betalar 90 för alla tre jämnt", () => {
      const s = raknaUtSaldo(
        [{ betalare_id: "p1", belopp: 90, fordelning: { p1: 30, p2: 30, p3: 30 } }],
        P3
      );
      assertClose(s.p1, 60, "p1 ska få 60");
      assertClose(s.p2, -30, "p2 skyldig 30");
      assertClose(s.p3, -30, "p3 skyldig 30");
      assertClose(s.p1 + s.p2 + s.p3, 0, "nollsumma");
    });

    it("blandade betalare, summan 0 även för N=3", () => {
      const utg = [
        { betalare_id: "p1", belopp: 60, fordelning: { p1: 20, p2: 20, p3: 20 } },
        { betalare_id: "p2", belopp: 30, fordelning: { p1: 10, p2: 10, p3: 10 } },
        { betalare_id: "p3", belopp: 90, fordelning: { p1: 30, p2: 30, p3: 30 } },
      ];
      const s = raknaUtSaldo(utg, P3);
      assertClose(s.p1 + s.p2 + s.p3, 0, "summa = 0");
      // p1: +60 -20 -10 -30 = 0
      // p2: -20 +30 -10 -30 = -30
      // p3: -20 -10 +90 -30 = +30
      assertClose(s.p1, 0, "p1");
      assertClose(s.p2, -30, "p2");
      assertClose(s.p3, 30, "p3");
    });
  });

  // --- flyttal -------------------------------------------------------------
  it("många små utgifter, flyttalsdrift håller sig liten", () => {
    const utg = [];
    for (let i = 0; i < 100; i++) {
      utg.push({
        betalare_id: i % 2 === 0 ? "p1" : "p2",
        belopp: 0.1,
        fordelning: { p1: 0.05, p2: 0.05 },
      });
    }
    const s = raknaUtSaldo(utg, P2);
    assertClose(s.p1, 0, "p1", 0.01);
    assertClose(s.p2, 0, "p2", 0.01);
  });
});

// ===========================================================================
// raknaParSaldon — parvis vy från mig:s perspektiv
// ===========================================================================
describe("raknaParSaldon", () => {
  it("tom lista → alla parvisa 0", () => {
    const r = raknaParSaldon([], "p1", P3);
    assert.equal(r.length, 2);
    assertClose(r.find((x) => x.id === "p2").netto, 0, "p2");
    assertClose(r.find((x) => x.id === "p3").netto, 0, "p3");
  });

  it("N=2: parvisa saldot = nettosaldot", () => {
    const utg = [
      { betalare_id: "p1", belopp: 100, fordelning: { p1: 50, p2: 50 } },
    ];
    const r = raknaParSaldon(utg, "p1", P2);
    assert.equal(r.length, 1);
    assertClose(r[0].netto, 50, "p2 skyldig p1 50");
  });

  it("mig betalade, andra personer är skyldiga sina andelar", () => {
    const utg = [
      { betalare_id: "p1", belopp: 90, fordelning: { p1: 30, p2: 30, p3: 30 } },
    ];
    const r = raknaParSaldon(utg, "p1", P3);
    assertClose(r.find((x) => x.id === "p2").netto, 30, "p2 skyldig 30");
    assertClose(r.find((x) => x.id === "p3").netto, 30, "p3 skyldig 30");
  });

  it("någon annan betalade, mig är skyldig min andel till dem", () => {
    const utg = [
      { betalare_id: "p2", belopp: 90, fordelning: { p1: 30, p2: 30, p3: 30 } },
    ];
    const r = raknaParSaldon(utg, "p1", P3);
    assertClose(r.find((x) => x.id === "p2").netto, -30, "jag skyldig p2 30");
    assertClose(r.find((x) => x.id === "p3").netto, 0, "p3 orörd (jag inte del av deras krav)");
  });

  it("blandat: kvittar mig ↔ p2, p3 orörd", () => {
    const utg = [
      // mig betalar 50 för p2
      { betalare_id: "p1", belopp: 100, fordelning: { p1: 50, p2: 50 } },
      // p2 betalar 20 för mig
      { betalare_id: "p2", belopp: 40, fordelning: { p1: 20, p2: 20 } },
    ];
    const r = raknaParSaldon(utg, "p1", P2);
    // p2 skyldig mig 50 − 20 = 30
    assertClose(r.find((x) => x.id === "p2").netto, 30, "p2 skyldig mig 30");
  });

  it("utgift som inte rör mig påverkar inte mina parvisa saldon", () => {
    const utg = [
      // p2 betalar för sig och p3 — jag är inte med
      { betalare_id: "p2", belopp: 60, fordelning: { p2: 30, p3: 30 } },
    ];
    const r = raknaParSaldon(utg, "p1", P3);
    assertClose(r.find((x) => x.id === "p2").netto, 0, "p2");
    assertClose(r.find((x) => x.id === "p3").netto, 0, "p3");
  });
});

// ===========================================================================
// egnaInfoText
// ===========================================================================
describe("egnaInfoText", () => {
  it("tomt vid 0", () => {
    assert.equal(egnaInfoText(0, {}, DEL2), "");
  });

  it("tomt vid NaN", () => {
    assert.equal(egnaInfoText(NaN, {}, DEL2), "");
  });

  it("tomt vid negativt", () => {
    assert.equal(egnaInfoText(-10, {}, DEL2), "");
  });

  it("N=2, visar delning", () => {
    const txt = egnaInfoText(100, { p1: 20, p2: 10 }, DEL2);
    // kvar = 70, delat = 35
    assert.ok(txt.includes("70,00"));
    assert.ok(txt.includes("35,00"));
    assert.ok(txt.includes("Delas"));
    assert.ok(txt.includes("÷ 2"));
  });

  it("N=3, visar delning med 3", () => {
    const txt = egnaInfoText(300, { p1: 60 }, DEL3);
    // kvar = 240, delat = 80
    assert.ok(txt.includes("240,00"));
    assert.ok(txt.includes("80,00"));
    assert.ok(txt.includes("÷ 3"));
  });

  it("varnar när egna > belopp", () => {
    const txt = egnaInfoText(100, { p1: 60, p2: 50 }, DEL2);
    assert.ok(txt.includes("överstiger"));
    assert.ok(txt.includes("110,00"));
  });

  it("allt delat (egna=0)", () => {
    const txt = egnaInfoText(200, {}, DEL2);
    assert.ok(txt.includes("200,00"));
    assert.ok(txt.includes("100,00"));
  });

  it("egna exakt = beloppet → exakt fördelning-text", () => {
    const txt = egnaInfoText(100, { p1: 50, p2: 50 }, DEL2);
    assert.ok(txt.includes("Exakt fördelning"), "ska visa Exakt fördelning");
  });

  it("exakt fördelning N=3 (hamburgare-fallet)", () => {
    const txt = egnaInfoText(420, { p1: 240, p2: 180, p3: 0 }, DEL3);
    assert.ok(txt.includes("Exakt fördelning"), "ska visa Exakt fördelning");
  });
});

// ===========================================================================
// migreraUtgift — idempotent konvertering från gammalt format
// ===========================================================================
describe("migreraUtgift", () => {
  it("konverterar gammalt 50/50-objekt", () => {
    const gammal = {
      id: 1,
      beskrivning: "Mat",
      belopp: 100,
      betalare: "p1",
      delP1: 50,
      delP2: 50,
      datum: "2026-04-18",
    };
    const ny = migreraUtgift(gammal);
    assert.equal(ny.betalare_id, "p1");
    assert.deepEqual(ny.fordelning, { p1: 50, p2: 50 });
    assert.equal(ny.belopp, 100);
    assert.equal(ny.beskrivning, "Mat");
    assert.equal(ny.datum, "2026-04-18");
    assert.equal(ny.id, 1);
    assert.equal("betalare" in ny, false);
    assert.equal("delP1" in ny, false);
    assert.equal("delP2" in ny, false);
  });

  it("konverterar egna-kostnader-objekt", () => {
    const gammal = { id: 2, belopp: 100, betalare: "p2", delP1: 70, delP2: 30 };
    const ny = migreraUtgift(gammal);
    assert.equal(ny.betalare_id, "p2");
    assert.deepEqual(ny.fordelning, { p1: 70, p2: 30 });
  });

  it("idempotent på redan migrerat objekt", () => {
    const nyttFormat = {
      id: 3,
      belopp: 100,
      betalare_id: "p1",
      fordelning: { p1: 50, p2: 50 },
    };
    const resultat = migreraUtgift(nyttFormat);
    assert.equal(resultat, nyttFormat);
  });
});

// ===========================================================================
// minimeradeOverforingar — greedy min-cash-flow
// ===========================================================================
describe("minimeradeOverforingar", () => {
  it("tom lista → inga överföringar", () => {
    assert.deepEqual(minimeradeOverforingar([], P2), []);
  });

  it("redan nollat → inga överföringar", () => {
    const utg = [
      { betalare_id: "p1", belopp: 100, fordelning: { p1: 50, p2: 50 } },
      { betalare_id: "p2", belopp: 100, fordelning: { p1: 50, p2: 50 } },
    ];
    assert.deepEqual(minimeradeOverforingar(utg, P2), []);
  });

  it("N=2, en skuld: 1 överföring", () => {
    const utg = [
      { betalare_id: "p1", belopp: 100, fordelning: { p1: 50, p2: 50 } },
    ];
    const r = minimeradeOverforingar(utg, P2);
    assert.equal(r.length, 1);
    assert.equal(r[0].fran, "p2");
    assert.equal(r[0].till, "p1");
    assertClose(r[0].belopp, 50, "belopp");
  });

  it("N=3 exempel från spec: 2 överföringar (netto +250/−50/−200)", () => {
    // p1=mig (+250), p2 (−50), p3 (−200)
    // p1 betalar 300, fördelat p1:50 p2:50 p3:200
    // → p1 netto = 300-50 = +250, p2 = 0-50 = -50, p3 = 0-200 = -200
    const utg = [
      { betalare_id: "p1", belopp: 300, fordelning: { p1: 50, p2: 50, p3: 200 } },
    ];
    const r = minimeradeOverforingar(utg, P3);
    assert.equal(r.length, 2, "ska bli 2 överföringar");
    // alla "till" ska vara p1 (den enda kreditorn)
    assert.ok(r.every(x => x.till === "p1"), "alla betalar till p1");
    const p2rad = r.find(x => x.fran === "p2");
    const p3rad = r.find(x => x.fran === "p3");
    assert.ok(p2rad, "p2 finns");
    assert.ok(p3rad, "p3 finns");
    assertClose(p2rad.belopp, 50, "p2 betalar 50");
    assertClose(p3rad.belopp, 200, "p3 betalar 200");
  });

  it("N=3 cirkulärskuld kvittas ner: max 2 överföringar", () => {
    // p1→p2: 100, p2→p3: 100, p3→p1: 100 — netto alla 0
    const utg = [
      { betalare_id: "p1", belopp: 100, fordelning: { p2: 100 } },
      { betalare_id: "p2", belopp: 100, fordelning: { p3: 100 } },
      { betalare_id: "p3", belopp: 100, fordelning: { p1: 100 } },
    ];
    const r = minimeradeOverforingar(utg, P3);
    assert.equal(r.length, 0, "netto noll → inga överföringar");
  });

  it("N=4, en person med netto 0 ignoreras", () => {
    const P4 = [{ id: "p1" }, { id: "p2" }, { id: "p3" }, { id: "p4" }];
    // p4 är inte med i något — netto 0
    const utg = [
      { betalare_id: "p1", belopp: 90, fordelning: { p1: 30, p2: 30, p3: 30 } },
    ];
    const r = minimeradeOverforingar(utg, P4);
    assert.equal(r.length, 2);
    assert.ok(r.every(x => x.fran !== "p4" && x.till !== "p4"), "p4 ska inte vara med");
  });

  it("avrundning: tredelning av 100 — summan av överföringar ≈ nettosaldo", () => {
    const utg = [
      { betalare_id: "p1", belopp: 100, fordelning: { p1: 100/3, p2: 100/3, p3: 100/3 } },
    ];
    const r = minimeradeOverforingar(utg, P3);
    const totalBetalt = r.reduce((s, x) => s + x.belopp, 0);
    // p1:s netto = +100 - 100/3 ≈ 66.67, varje annan betalar ≈ 33.33
    assertClose(totalBetalt, 200/3, "summabelopp", 0.02);
  });
});

// ===========================================================================
// minimeradeOverforingar — DETERMINISM & TIE-BREAK
// Grund för feature 017: kvittensen nycklas på (fran→till)-paret i planen,
// så planen MÅSTE vara identisk för samma input, varje anrop och varje klient.
// ===========================================================================
describe("minimeradeOverforingar determinism", () => {
  const P4 = [{ id: "p1" }, { id: "p2" }, { id: "p3" }, { id: "p4" }];
  const P5 = [{ id: "p1" }, { id: "p2" }, { id: "p3" }, { id: "p4" }, { id: "p5" }];

  it("samma input → identisk plan över upprepade anrop", () => {
    const utg = [
      { betalare_id: "p1", belopp: 300, fordelning: { p1: 75, p2: 75, p3: 75, p4: 75 } },
      { betalare_id: "p2", belopp: 100, fordelning: { p1: 25, p2: 25, p3: 25, p4: 25 } },
    ];
    const a = minimeradeOverforingar(utg, P4);
    const b = minimeradeOverforingar(utg, P4);
    const c = minimeradeOverforingar(utg, P4);
    assert.deepEqual(a, b, "anrop 1 vs 2");
    assert.deepEqual(b, c, "anrop 2 vs 3");
  });

  it("oberoende av utgifternas ordning i listan", () => {
    const u1 = { betalare_id: "p1", belopp: 300, fordelning: { p1: 75, p2: 75, p3: 75, p4: 75 } };
    const u2 = { betalare_id: "p2", belopp: 100, fordelning: { p1: 25, p2: 25, p3: 25, p4: 25 } };
    const framat = minimeradeOverforingar([u1, u2], P4);
    const bakat = minimeradeOverforingar([u2, u1], P4);
    assert.deepEqual(framat, bakat, "planen får inte bero på utgiftsordning");
  });

  it("tie-break på lika skuld är deterministisk (stabil sort bevarar personer-ordning)", () => {
    // p1 lägger ut 300 jämnt på fyra → p1 kreditor (+225), p2/p3/p4 var −75 (lika skuld).
    const utg = [
      { betalare_id: "p1", belopp: 300, fordelning: { p1: 75, p2: 75, p3: 75, p4: 75 } },
    ];
    const r = minimeradeOverforingar(utg, P4);
    // Alla tre debitorer betalar 75 till p1. Ordningen ska följa personer-listan.
    assert.deepEqual(
      r.map(x => x.fran),
      ["p2", "p3", "p4"],
      "debitorer i personer-ordning"
    );
    assert.ok(r.every(x => x.till === "p1"), "alla till p1");
    assert.ok(r.every(x => Math.abs(x.belopp - 75) < 0.01), "alla 75");
  });

  it("tie-break på lika kredit är deterministisk", () => {
    // p3 är skyldig 150, p1 och p2 är kreditorer med lika +75 vardera.
    // p1 betalar 150 fördelat: p1:0, p2:0, p3:75, ... nej — konstruera direkt:
    // p1 lägger ut 75 för p3, p2 lägger ut 75 för p3.
    const utg = [
      { betalare_id: "p1", belopp: 75, fordelning: { p3: 75 } },
      { betalare_id: "p2", belopp: 75, fordelning: { p3: 75 } },
    ];
    const r = minimeradeOverforingar(utg, P3);
    // p3 skyldig 150; kreditorer p1 och p2 (+75). Lika kredit → personer-ordning.
    assert.deepEqual(
      r.map(x => x.till),
      ["p1", "p2"],
      "kreditorer i personer-ordning"
    );
    assert.ok(r.every(x => x.fran === "p3"), "alla från p3");
  });

  it("plan-paren är stabila oavsett personer-listans interna referenser", () => {
    // Samma logiska personer men nya objekt varje gång → planen ska vara lika.
    const utg = [
      { betalare_id: "p1", belopp: 200, fordelning: { p1: 40, p2: 40, p3: 40, p4: 40, p5: 40 } },
    ];
    const a = minimeradeOverforingar(utg, P5.map(p => ({ ...p })));
    const b = minimeradeOverforingar(utg, P5.map(p => ({ ...p })));
    assert.deepEqual(a, b, "identisk plan trots nya person-objekt");
  });

  it("kreditor-identifiering: till-fältet pekar ut rätt mottagare per överföring", () => {
    // p1 (+250), p2 (−50), p3 (−200): enda kreditorn är p1.
    const utg = [
      { betalare_id: "p1", belopp: 300, fordelning: { p1: 50, p2: 50, p3: 200 } },
    ];
    const r = minimeradeOverforingar(utg, P3);
    // Ur p1:s perspektiv: p1 är kreditor för båda raderna (till === "p1").
    const somKreditor = r.filter(x => x.till === "p1");
    assert.equal(somKreditor.length, 2, "p1 är kreditor för 2 rader");
    // Ur p2:s perspektiv: p2 är debitor (fran === "p2"), aldrig kreditor.
    assert.ok(r.every(x => x.till !== "p2"), "p2 aldrig kreditor");
  });
});

// ===========================================================================
// Integration: raknaDel → raknaUtSaldo
// ===========================================================================
describe("integration: raknaDel → raknaUtSaldo", () => {
  it("två identiska utgifter av olika betalare nollar ut", () => {
    const f1 = raknaDel(200, "jamnt", DEL2);
    const f2 = raknaDel(200, "jamnt", DEL2);
    const s = raknaUtSaldo(
      [
        { betalare_id: "p1", belopp: 200, fordelning: f1 },
        { betalare_id: "p2", belopp: 200, fordelning: f2 },
      ],
      P2
    );
    assertClose(s.p1, 0, "p1");
    assertClose(s.p2, 0, "p2");
  });

  it("egna-split ger rätt nettosaldo", () => {
    const f1 = raknaDel(100, "egna", DEL2, { p1: 30, p2: 20 }); // p1:55, p2:45
    const f2 = raknaDel(80, "jamnt", DEL2);                      // p1:40, p2:40
    const s = raknaUtSaldo(
      [
        { betalare_id: "p1", belopp: 100, fordelning: f1 },
        { betalare_id: "p2", belopp: 80, fordelning: f2 },
      ],
      P2
    );
    // p1 ska få: +100 -55 -40 = +5; p2 ska få: -45 +80 -40 = -5
    assertClose(s.p1, 5, "p1");
    assertClose(s.p2, -5, "p2");
  });

  it("symmetri: byta betalare inverterar inte exakt vid ojämn split", () => {
    const f = raknaDel(100, "egna", DEL2, { p1: 30, p2: 20 }); // p1:55, p2:45
    const sP1 = raknaUtSaldo(
      [{ betalare_id: "p1", belopp: 100, fordelning: f }],
      P2
    );
    const sP2 = raknaUtSaldo(
      [{ betalare_id: "p2", belopp: 100, fordelning: f }],
      P2
    );
    assertClose(sP1.p1, 45, "p1 betalar: p1 ska få 45");
    assertClose(sP2.p2, 55, "p2 betalar: p2 ska få 55");
  });
});

describe("parseGruppSokvag", () => {
  it("plockar ut grupp-ID från /g/<id>", () => {
    assert.equal(parseGruppSokvag("/g/ABC123"), "ABC123");
  });

  it("normaliserar till versaler", () => {
    assert.equal(parseGruppSokvag("/g/abc123"), "ABC123");
  });

  it("accepterar trailing slash", () => {
    assert.equal(parseGruppSokvag("/g/K7M2X9/"), "K7M2X9");
  });

  it("returnerar null för pathnames utan grupp-prefix", () => {
    assert.equal(parseGruppSokvag("/"), null);
    assert.equal(parseGruppSokvag("/g/"), null);
    assert.equal(parseGruppSokvag("/other/ABC123"), null);
  });

  it("avvisar för korta eller för långa ID:n", () => {
    assert.equal(parseGruppSokvag("/g/AB"), null);
    assert.equal(parseGruppSokvag("/g/ABCDEFGHIJK"), null);
  });

  it("avvisar specialtecken i ID:t", () => {
    assert.equal(parseGruppSokvag("/g/ABC-12"), null);
    assert.equal(parseGruppSokvag("/g/ABC 12"), null);
  });

  it("hanterar icke-strängar utan att krascha", () => {
    assert.equal(parseGruppSokvag(null), null);
    assert.equal(parseGruppSokvag(undefined), null);
    assert.equal(parseGruppSokvag(123), null);
  });
});

describe("gruppMemberKey", () => {
  it("bygger nyckel med grupp-id:t i mitten", () => {
    assert.equal(gruppMemberKey("ABC123"), "kvitts_grupp_ABC123_member_id");
  });

  it("är unik per grupp", () => {
    assert.notEqual(gruppMemberKey("ABC123"), gruppMemberKey("XYZ789"));
  });
});

describe("normaliseraEpost", () => {
  it("lowercasar och trimmar", () => {
    assert.equal(normaliseraEpost("  Peter@Gmail.COM  "), "peter@gmail.com");
  });

  it("hanterar tom sträng", () => {
    assert.equal(normaliseraEpost(""), "");
  });

  it("hanterar undefined/null utan krasch", () => {
    assert.equal(normaliseraEpost(null), "");
    assert.equal(normaliseraEpost(undefined), "");
  });
});

describe("hashIdentitet", () => {
  it("returnerar 64-teckens hex-sträng", async () => {
    const h = await hashIdentitet("peter@gmail.com");
    assert.equal(typeof h, "string");
    assert.equal(h.length, 64);
    assert.ok(/^[0-9a-f]+$/.test(h), "ska vara hex");
  });

  it("normaliserar innan hashning — stora/små bokstäver ger samma hash", async () => {
    const h1 = await hashIdentitet("Peter@Gmail.com");
    const h2 = await hashIdentitet("  peter@gmail.com  ");
    assert.equal(h1, h2);
  });

  it("olika adresser ger olika hash", async () => {
    const h1 = await hashIdentitet("alice@example.com");
    const h2 = await hashIdentitet("bob@example.com");
    assert.notEqual(h1, h2);
  });

  it("deterministisk — samma input ger samma hash varje gång", async () => {
    const h1 = await hashIdentitet("test@kvitts.app");
    const h2 = await hashIdentitet("test@kvitts.app");
    assert.equal(h1, h2);
  });
});

describe("generateMemberToken", () => {
  it("returnerar en sträng", () => {
    assert.equal(typeof generateMemberToken(), "string");
  });

  it("är inte tom", () => {
    assert.ok(generateMemberToken().length > 0);
  });

  it("ser ut som UUID", () => {
    const t = generateMemberToken();
    assert.ok(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t),
      "ska vara UUID v4-format"
    );
  });

  it("är unik för varje anrop", () => {
    assert.notEqual(generateMemberToken(), generateMemberToken());
  });
});

// ===========================================================================
// GEMENSAM REGLERING (feature 017)
// ===========================================================================
describe("matchaPlanMotKvittenser", () => {
  const PLAN = [
    { fran: "p2", till: "p1", belopp: 100 },
    { fran: "p3", till: "p1", belopp: 200 },
  ];

  it("tom kvittens-lista → alla överföringar okvitterade", () => {
    const r = matchaPlanMotKvittenser(PLAN, []);
    assert.equal(r.length, 2);
    assert.ok(r.every((x) => x.kvitterad === false), "inga kvitterade");
    assert.ok(r.every((x) => x.stale === false), "inga stale");
  });

  it("saknad kvittens-lista (undefined) hanteras utan krasch", () => {
    const r = matchaPlanMotKvittenser(PLAN, undefined);
    assert.ok(r.every((x) => x.kvitterad === false));
  });

  it("en matchande kvittens → just den raden kvitterad", () => {
    const kv = [{ fran: "p2", till: "p1", belopp: 100 }];
    const r = matchaPlanMotKvittenser(PLAN, kv);
    const p2rad = r.find((x) => x.fran === "p2");
    const p3rad = r.find((x) => x.fran === "p3");
    assert.equal(p2rad.kvitterad, true, "p2→p1 kvitterad");
    assert.equal(p2rad.stale, false);
    assert.equal(p3rad.kvitterad, false, "p3→p1 ej kvitterad");
  });

  it("kvittens för par som inte finns i planen ignoreras", () => {
    const kv = [{ fran: "p4", till: "p1", belopp: 999 }];
    const r = matchaPlanMotKvittenser(PLAN, kv);
    assert.equal(r.length, 2, "planen oförändrad längd");
    assert.ok(r.every((x) => x.kvitterad === false), "inget matchar");
  });

  it("kvittens matchar bara på exakt (fran,till)-par, inte omvänt", () => {
    // omvänd riktning ska INTE räknas som kvittens
    const kv = [{ fran: "p1", till: "p2", belopp: 100 }];
    const r = matchaPlanMotKvittenser(PLAN, kv);
    assert.ok(r.every((x) => x.kvitterad === false), "omvänd riktning matchar ej");
  });

  it("staleness: kvittens finns men belopp ändrats → stale, ej kvitterad", () => {
    // planen säger nu 150, men kvittensen gällde 100
    const plan = [{ fran: "p2", till: "p1", belopp: 150 }];
    const kv = [{ fran: "p2", till: "p1", belopp: 100 }];
    const r = matchaPlanMotKvittenser(plan, kv);
    assert.equal(r[0].kvitterad, false, "belopp skiljer → ej kvitterad");
    assert.equal(r[0].stale, true, "flaggas för ny bekräftelse");
  });

  it("belopp inom tolerans (avrundning) räknas som kvitterad", () => {
    const plan = [{ fran: "p2", till: "p1", belopp: 100.004 }];
    const kv = [{ fran: "p2", till: "p1", belopp: 100 }];
    const r = matchaPlanMotKvittenser(plan, kv);
    assert.equal(r[0].kvitterad, true, "diff < 0.01 → kvitterad");
    assert.equal(r[0].stale, false);
  });

  it("tom plan → tom lista", () => {
    assert.deepEqual(matchaPlanMotKvittenser([], []), []);
  });
});

describe("gruppFulltReglerat", () => {
  const PLAN = [
    { fran: "p2", till: "p1", belopp: 100 },
    { fran: "p3", till: "p1", belopp: 200 },
  ];

  it("tom plan (inga skulder) → fullt reglerad", () => {
    assert.equal(gruppFulltReglerat([], []), true);
  });

  it("alla par kvitterade → true", () => {
    const kv = [
      { fran: "p2", till: "p1", belopp: 100 },
      { fran: "p3", till: "p1", belopp: 200 },
    ];
    assert.equal(gruppFulltReglerat(PLAN, kv), true);
  });

  it("ett par okvitterat → false", () => {
    const kv = [{ fran: "p2", till: "p1", belopp: 100 }];
    assert.equal(gruppFulltReglerat(PLAN, kv), false);
  });

  it("stale kvittens räknas inte som reglerad", () => {
    const kv = [
      { fran: "p2", till: "p1", belopp: 100 },
      { fran: "p3", till: "p1", belopp: 999 }, // fel belopp → stale
    ];
    assert.equal(gruppFulltReglerat(PLAN, kv), false);
  });
});

describe("debitorArkiverad", () => {
  // p2 skyldig p1 (100), p2 skyldig p3 (50), p4 skyldig p1 (200)
  const PLAN = [
    { fran: "p2", till: "p1", belopp: 100 },
    { fran: "p2", till: "p3", belopp: 50 },
    { fran: "p4", till: "p1", belopp: 200 },
  ];

  it("alla mina skulder kvitterade → arkiverad", () => {
    const kv = [
      { fran: "p2", till: "p1", belopp: 100 },
      { fran: "p2", till: "p3", belopp: 50 },
    ];
    assert.equal(debitorArkiverad(PLAN, kv, "p2"), true);
  });

  it("en av mina skulder okvitterad → ej arkiverad", () => {
    const kv = [{ fran: "p2", till: "p1", belopp: 100 }];
    assert.equal(debitorArkiverad(PLAN, kv, "p2"), false);
  });

  it("person utan skulder (bara kreditor) → arkiverad direkt", () => {
    // p1 är bara mottagare i planen → inget att vänta på
    assert.equal(debitorArkiverad(PLAN, [], "p1"), true);
  });

  it("person som varken är fran eller till → arkiverad (inget att göra)", () => {
    assert.equal(debitorArkiverad(PLAN, [], "p9"), true);
  });

  it("stale kvittens på min skuld → ej arkiverad", () => {
    const kv = [
      { fran: "p2", till: "p1", belopp: 100 },
      { fran: "p2", till: "p3", belopp: 999 }, // fel belopp → stale
    ];
    assert.equal(debitorArkiverad(PLAN, kv, "p2"), false);
  });
});

describe("minRegleringKlar", () => {
  // p2 skyldig p1 (100), p2 skyldig p3 (50), p4 skyldig p1 (200)
  const PLAN = [
    { fran: "p2", till: "p1", belopp: 100 },
    { fran: "p2", till: "p3", belopp: 50 },
    { fran: "p4", till: "p1", belopp: 200 },
  ];

  it("ren debitor: arkiveras när alla egna skulder bekräftade", () => {
    const kv = [
      { fran: "p2", till: "p1", belopp: 100 },
      { fran: "p2", till: "p3", belopp: 50 },
    ];
    // p2 äger inga inkommande → klar när egna skulder bekräftade.
    assert.equal(minRegleringKlar(PLAN, kv, "p2"), true);
  });

  it("ren debitor arkiveras även om ANDRA debitorer inte reglerat", () => {
    // p2 klar, men p4 (annan debitor) har inte reglerat → p2 arkiveras ändå.
    const kv = [
      { fran: "p2", till: "p1", belopp: 100 },
      { fran: "p2", till: "p3", belopp: 50 },
    ];
    assert.equal(minRegleringKlar(PLAN, kv, "p2"), true);
    assert.equal(minRegleringKlar(PLAN, kv, "p4"), false);
  });

  it("ren kreditor: arkiveras först när ALLA inkommande bekräftats", () => {
    // p1 är mottagare för p2→p1 och p4→p1. Bara p2→p1 bekräftad → ej klar.
    const delvis = [{ fran: "p2", till: "p1", belopp: 100 }];
    assert.equal(minRegleringKlar(PLAN, delvis, "p1"), false);
    // Båda inkommande bekräftade → p1 klar.
    const bada = [
      { fran: "p2", till: "p1", belopp: 100 },
      { fran: "p4", till: "p1", belopp: 200 },
    ];
    assert.equal(minRegleringKlar(PLAN, bada, "p1"), true);
  });

  it("blandad debitor+kreditor: arkiveras först när BÅDE skuld och inkommande klar", () => {
    // p2 är skyldig p1 (fran) och får av... nej — konstruera blandat fall:
    // p3 är kreditor (p2→p3) OCH debitor om vi lägger p3→p1. Bygg egen plan.
    const planBlandad = [
      { fran: "p2", till: "p3", belopp: 50 },  // p3 mottagare (kreditor)
      { fran: "p3", till: "p1", belopp: 30 },  // p3 avsändare (debitor)
    ];
    // Bara p3:s egen skuld (p3→p1) bekräftad, men p2→p3 ej → p3 måste stanna
    // kvar för att kunna bekräfta p2:s betalning.
    const baraEgenSkuld = [{ fran: "p3", till: "p1", belopp: 30 }];
    assert.equal(minRegleringKlar(planBlandad, baraEgenSkuld, "p3"), false);
    // Debitor-only-regeln hade felaktigt arkiverat p3 här:
    assert.equal(debitorArkiverad(planBlandad, baraEgenSkuld, "p3"), true);
    // Båda rader som rör p3 bekräftade → nu klar.
    const bada = [
      { fran: "p3", till: "p1", belopp: 30 },
      { fran: "p2", till: "p3", belopp: 50 },
    ];
    assert.equal(minRegleringKlar(planBlandad, bada, "p3"), true);
  });

  it("person utan inblandning i planen → ej klar (inget att arkivera på)", () => {
    assert.equal(minRegleringKlar(PLAN, [], "p9"), false);
  });

  it("stale kvittens som rör mig → ej klar", () => {
    const kv = [
      { fran: "p2", till: "p1", belopp: 100 },
      { fran: "p4", till: "p1", belopp: 999 }, // stale
    ];
    assert.equal(minRegleringKlar(PLAN, kv, "p1"), false);
  });
});

// ===========================================================================
// Integration 017: minimeradeOverforingar → reglerings-helpers
// Speglar spec-scenarierna (omdirigerad skuld, flera kreditorer, fullt reglerad grupp).
// ===========================================================================
describe("integration 017: plan → reglering", () => {
  const P3 = [{ id: "p1" }, { id: "p2" }, { id: "p3" }];

  it("omdirigerad skuld: kreditorn för raden är rätt person", () => {
    // p1 (+250), p2 (−50), p3 (−200) → båda betalar till p1.
    const utg = [
      { betalare_id: "p1", belopp: 300, fordelning: { p1: 50, p2: 50, p3: 200 } },
    ];
    const plan = minimeradeOverforingar(utg, P3);
    // p3 bekräftar INTE — p1 är kreditor och den som kvitterar p3:s betalning.
    const p3rad = plan.find((x) => x.fran === "p3");
    assert.equal(p3rad.till, "p1", "p1 (inte p2) är kreditor för p3:s skuld");
    // p1 kvitterar p3 → p3:s vy ska arkiveras när ALLA p3:s skulder är kvitterade
    const kv = [{ fran: "p3", till: "p1", belopp: p3rad.belopp }];
    assert.equal(debitorArkiverad(plan, kv, "p3"), true, "p3 har bara en skuld");
  });

  it("debitor med två kreditorer arkiveras först när båda kvitterat", () => {
    // p1 lägger ut 75 för p3, p2 lägger ut 75 för p3 → p3 skyldig båda.
    const utg = [
      { betalare_id: "p1", belopp: 75, fordelning: { p3: 75 } },
      { betalare_id: "p2", belopp: 75, fordelning: { p3: 75 } },
    ];
    const plan = minimeradeOverforingar(utg, P3);
    const tillP1 = plan.find((x) => x.till === "p1");
    const tillP2 = plan.find((x) => x.till === "p2");
    assert.ok(tillP1 && tillP2, "p3 skyldig både p1 och p2");

    // Bara p1 har kvitterat → p3 väntar fortfarande på p2.
    const delvis = [{ fran: "p3", till: "p1", belopp: tillP1.belopp }];
    assert.equal(debitorArkiverad(plan, delvis, "p3"), false, "väntar på p2");
    assert.equal(gruppFulltReglerat(plan, delvis), false);

    // Båda kvitterat → p3 arkiveras och gruppen är fullt reglerad.
    const bada = [
      { fran: "p3", till: "p1", belopp: tillP1.belopp },
      { fran: "p3", till: "p2", belopp: tillP2.belopp },
    ];
    assert.equal(debitorArkiverad(plan, bada, "p3"), true);
    assert.equal(gruppFulltReglerat(plan, bada), true, "hela gruppen reglerad");
  });

  it("redan nollad grupp är fullt reglerad utan kvittenser", () => {
    const utg = [
      { betalare_id: "p1", belopp: 100, fordelning: { p1: 50, p2: 50 } },
      { betalare_id: "p2", belopp: 100, fordelning: { p1: 50, p2: 50 } },
    ];
    const plan = minimeradeOverforingar(utg, [{ id: "p1" }, { id: "p2" }]);
    assert.deepEqual(plan, [], "inga överföringar");
    assert.equal(gruppFulltReglerat(plan, []), true);
  });

  it("ny utgift efter kvittens gör kvittensen stale", () => {
    // Först: p2 skyldig p1 100.
    const utg1 = [
      { betalare_id: "p1", belopp: 200, fordelning: { p1: 100, p2: 100 } },
    ];
    const plan1 = minimeradeOverforingar(utg1, [{ id: "p1" }, { id: "p2" }]);
    const kv = [{ fran: "p2", till: "p1", belopp: plan1[0].belopp }];
    assert.equal(gruppFulltReglerat(plan1, kv), true, "kvitterad mot ursprunglig plan");

    // Sedan: p1 lägger ut mer → p2:s skuld ökar → planen ändras.
    const utg2 = [
      ...utg1,
      { betalare_id: "p1", belopp: 100, fordelning: { p1: 50, p2: 50 } },
    ];
    const plan2 = minimeradeOverforingar(utg2, [{ id: "p1" }, { id: "p2" }]);
    const matchad = matchaPlanMotKvittenser(plan2, kv);
    assert.equal(matchad[0].stale, true, "gammal kvittens är nu stale");
    assert.equal(gruppFulltReglerat(plan2, kv), false, "inte längre reglerat");
  });
});

// ===========================================================================
// relativTid
// ===========================================================================
describe("relativTid", () => {
  const nu = new Date("2026-07-15T12:00:00Z").getTime();

  it("under 60 s → 'just nu'", () => {
    const iso = new Date(nu - 30_000).toISOString();
    assert.equal(relativTid(iso, nu), "just nu");
  });

  it("1–59 min → 'X min sedan'", () => {
    const iso = new Date(nu - 5 * 60_000).toISOString();
    assert.equal(relativTid(iso, nu), "5 min sedan");
  });

  it("1–23 h → 'X h sedan'", () => {
    const iso = new Date(nu - 3 * 3600_000).toISOString();
    assert.equal(relativTid(iso, nu), "3 h sedan");
  });

  it("≥ 1 dag → datum", () => {
    const iso = new Date(nu - 2 * 86400_000).toISOString();
    const txt = relativTid(iso, nu);
    assert.ok(txt.match(/^\d{4}-\d{2}-\d{2}$/), "ska vara ett datum: " + txt);
  });
});

// ===========================================================================
// diffaNotiser
// ===========================================================================
describe("diffaNotiser", () => {
  const P = [{ id: "p1", namn: "Mikael" }, { id: "p2", namn: "Anna" }];
  const UTG = [{ id: "u1", beskrivning: "Mat", belopp: 100, lagd_till_av_id: "p2" }];

  it("null snapshot → inga notiser, men nySnapshot är satt", () => {
    const { nyaNotiser, nySnapshot } = diffaNotiser(null, UTG, P, "p1");
    assert.equal(nyaNotiser.length, 0, "inga notiser vid seed");
    assert.ok(nySnapshot.utgifter["u1"], "snapshot har utgiften");
    assert.ok(nySnapshot.deltagare.includes("p1"), "snapshot har deltagare");
  });

  it("ny utgift av annan → notis", () => {
    const snapshot = { utgifter: {}, deltagare: ["p1", "p2"] };
    const { nyaNotiser } = diffaNotiser(snapshot, UTG, P, "p1");
    assert.equal(nyaNotiser.length, 1);
    assert.equal(nyaNotiser[0].typ, "ny");
    assert.ok(nyaNotiser[0].text.includes("Anna"), "namn med");
    assert.ok(nyaNotiser[0].text.includes("Mat"), "beskrivning med");
  });

  it("egen ny utgift → ingen notis", () => {
    const snapshot = { utgifter: {}, deltagare: ["p1", "p2"] };
    const egnaUtg = [{ id: "u1", beskrivning: "Mat", belopp: 100, lagd_till_av_id: "p1" }];
    const { nyaNotiser } = diffaNotiser(snapshot, egnaUtg, P, "p1");
    assert.equal(nyaNotiser.length, 0);
  });

  it("ändrad utgift av annan → notis", () => {
    const snapshot = { utgifter: { u1: { beskrivning: "Mat", belopp: 100 } }, deltagare: ["p1", "p2"] };
    const andrad = [{ id: "u1", beskrivning: "Mat", belopp: 150, lagd_till_av_id: "p2" }];
    const { nyaNotiser } = diffaNotiser(snapshot, andrad, P, "p1");
    assert.equal(nyaNotiser.length, 1);
    assert.equal(nyaNotiser[0].typ, "andrad");
  });

  it("raderad utgift → notis", () => {
    const snapshot = { utgifter: { u1: { beskrivning: "Mat", belopp: 100 } }, deltagare: ["p1", "p2"] };
    const { nyaNotiser } = diffaNotiser(snapshot, [], P, "p1");
    assert.equal(nyaNotiser.length, 1);
    assert.equal(nyaNotiser[0].typ, "raderad");
    assert.ok(nyaNotiser[0].text.includes("Mat"));
  });

  it("ny deltagare → notis, inte för mig själv", () => {
    const snapshot = { utgifter: {}, deltagare: ["p1"] };
    const { nyaNotiser } = diffaNotiser(snapshot, [], P, "p1");
    assert.equal(nyaNotiser.length, 1);
    assert.equal(nyaNotiser[0].typ, "join");
    assert.ok(nyaNotiser[0].text.includes("Anna"));
  });

  it("ingen förändring → inga notiser", () => {
    const snapshot = {
      utgifter: { u1: { beskrivning: "Mat", belopp: 100 } },
      deltagare: ["p1", "p2"],
    };
    const { nyaNotiser } = diffaNotiser(snapshot, UTG, P, "p1");
    assert.equal(nyaNotiser.length, 0);
  });

  it("nySnapshot speglar nuvarande state", () => {
    const snapshot = { utgifter: {}, deltagare: [] };
    const { nySnapshot } = diffaNotiser(snapshot, UTG, P, "p1");
    assert.deepEqual(nySnapshot.utgifter.u1, { beskrivning: "Mat", belopp: 100 });
    assert.deepEqual(nySnapshot.deltagare.sort(), ["p1", "p2"]);
  });
});

