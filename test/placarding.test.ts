import assert from "node:assert/strict";
import test from "node:test";
import { getPlacard } from "../src/placarding.js";

test("Table 1 classes placard in any quantity", () => {
  const poisonGas = getPlacard("2.3");
  assert.equal(poisonGas.placard, "POISON GAS");
  assert.equal(poisonGas.threshold, "any-quantity");

  assert.equal(getPlacard("4.3").placard, "DANGEROUS WHEN WET");
  assert.equal(getPlacard("1.1").placard, "EXPLOSIVES 1.1");
});

test("Table 2 classes placard at 454 kg aggregate", () => {
  const flammable = getPlacard("3");
  assert.equal(flammable.placard, "FLAMMABLE");
  assert.equal(flammable.threshold, "454-kg-aggregate");

  const corrosive = getPlacard("8");
  assert.equal(corrosive.placard, "CORROSIVE");
  assert.equal(corrosive.threshold, "454-kg-aggregate");
});

test("conditional classes carry a caveat note", () => {
  assert.match(getPlacard("6.1").note, /inhalation/i); // PIH is any-quantity (Table 1)
  assert.match(getPlacard("5.2").note, /temperature-controlled/i);
  assert.equal(getPlacard("6.2").threshold, "none");
});

test("unknown class returns no placard rule", () => {
  const none = getPlacard("99");
  assert.equal(none.threshold, "none");
  assert.equal(none.placard, undefined);
});

test("every placard result cites 172.504", () => {
  for (const cls of ["2.3", "3", "8", "6.2", "99"]) {
    assert.match(getPlacard(cls).citation.title, /172\.504/);
  }
});
