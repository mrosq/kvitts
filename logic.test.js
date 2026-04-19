const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  raknaDel,
  raknaUtSaldo,
  raknaParSaldon,
  egnaInfoText,
  migreraUtgift,
} = require("./logic");

// ---------------------------------------------------------------------------
// Helpers
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

  it("egna exakt = beloppet", () => {
    const txt = egnaInfoText(100, { p1: 50, p2: 50 }, DEL2);
    assert.ok(txt.includes("Delas"));
    assert.ok(txt.includes("0,00"));
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
