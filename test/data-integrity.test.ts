import assert from "node:assert/strict";
import test from "node:test";
import { HMT_ENTRIES } from "../src/data/hmt.js";
import { SPECIAL_PROVISIONS } from "../src/data/special-provisions-generated.js";
import { decodeSpecialProvision } from "../src/special-provisions.js";

test("dataset has the expected order of magnitude (full table, not a sample)", () => {
  // The real 172.101 table has ~2,700 entries; guard against a truncated ingest.
  assert.ok(HMT_ENTRIES.length > 2500, `expected > 2500 entries, got ${HMT_ENTRIES.length}`);
  assert.ok(HMT_ENTRIES.length < 3500, `expected < 3500 entries, got ${HMT_ENTRIES.length}`);
  const withId = HMT_ENTRIES.filter((e) => e.idNumber).length;
  assert.ok(withId > 2300, `expected > 2300 entries with a UN/NA id, got ${withId}`);
  assert.ok(HMT_ENTRIES.some((e) => e.forbidden), "at least one Forbidden entry");
});

test("every entry is structurally valid", () => {
  for (const e of HMT_ENTRIES) {
    assert.ok(e.properShippingName.length > 0, "non-empty proper shipping name");
    assert.equal(typeof e.hazardClass, "string");
    if (!e.forbidden) {
      assert.match(e.idNumber ?? "", /^(UN|NA|ID)\d{4}$/, `valid id for ${e.properShippingName}`);
    }
    if (e.packingGroup !== undefined) {
      assert.ok(["I", "II", "III"].includes(e.packingGroup), `valid PG for ${e.idNumber}`);
    }
    assert.ok(Array.isArray(e.labels) && Array.isArray(e.specialProvisions));
    assert.equal(e.source.title, "49 CFR 172.101 Hazardous Materials Table");
  }
});

test("blank hazard class is limited to individually-assigned entries", () => {
  // A handful of entries (e.g. UN0190 explosive samples) carry no fixed class —
  // their classification is assigned case-by-case. Anything more signals a regression.
  const emptyClass = HMT_ENTRIES.filter((e) => !e.hazardClass);
  assert.ok(emptyClass.length <= 3, `unexpected blank-class entries: ${emptyClass.map((e) => e.idNumber).join(", ")}`);
  for (const e of emptyClass) {
    assert.ok(e.specialProvisions.length > 0, `${e.idNumber} relies on a special provision for classification`);
  }
});

test("referential integrity: every referenced special-provision code resolves", () => {
  const unresolved = new Set<string>();
  for (const e of HMT_ENTRIES) {
    for (const code of e.specialProvisions) {
      if (!decodeSpecialProvision(code).known) unresolved.add(code);
    }
  }
  assert.deepEqual([...unresolved], [], `unresolved special-provision codes: ${[...unresolved].join(", ")}`);
});

test("special provisions table is populated and non-empty", () => {
  assert.ok(Object.keys(SPECIAL_PROVISIONS).length > 300);
  for (const [code, text] of Object.entries(SPECIAL_PROVISIONS)) {
    assert.ok(text.length > 0, `provision ${code} has text`);
  }
});

// Hand-verified against the eCFR 172.101 table. Each tuple is
// [id, hazardClass, packingGroup|undefined, subsidiaryRisks, nameIncludes].
const SPOT_CHECKS: Array<[string, string, string | undefined, string[], string]> = [
  ["UN1090", "3", "II", [], "Acetone"],
  ["UN1088", "3", "II", [], "Acetal"],
  ["UN1830", "8", "II", [], "Sulfuric acid"],
  ["UN1789", "8", "II", [], "Hydrochloric acid"],
  ["UN1219", "3", "II", [], "Isoprop"],
  ["UN1824", "8", "II", [], "Sodium hydroxide solution"],
  ["UN2014", "5.1", "II", ["8"], "Hydrogen peroxide"],
  ["UN1203", "3", "II", [], "Gasoline"],
  ["UN1230", "3", "II", ["6.1"], "Methanol"],
  ["UN1791", "8", "II", [], "Hypochlorite"],
  ["UN1005", "2.3", undefined, ["8"], "Ammonia, anhydrous"],
  ["UN1294", "3", "II", [], "Toluene"],
  ["UN1114", "3", "II", [], "Benzene"],
  ["UN2031", "8", "II", ["5.1"], "Nitric acid"],
  ["UN1888", "6.1", "III", [], "Chloroform"],
  ["UN1715", "8", "II", ["3"], "Acetic anhydride"],
  ["UN1648", "3", "II", [], "Acetonitrile"],
  ["UN1098", "6.1", "I", ["3"], "Allyl alcohol"],
  ["UN1086", "2.1", undefined, [], "Vinyl chloride"],
  ["UN2789", "8", "II", ["3"], "Acetic acid"],
  ["UN1805", "8", "III", [], "Phosphoric acid"],
  ["UN2209", "8", "III", [], "Formaldehyde"],
];

test("spot-checks match the published table", () => {
  for (const [id, hazardClass, pg, subs, nameIncludes] of SPOT_CHECKS) {
    const matches = HMT_ENTRIES.filter((e) => e.idNumber === id && e.hazardClass === hazardClass);
    assert.ok(matches.length > 0, `${id} present with class ${hazardClass}`);
    const hit = matches.find((e) => e.properShippingName.includes(nameIncludes)) ?? matches[0];
    assert.ok(hit.properShippingName.includes(nameIncludes), `${id} name includes "${nameIncludes}"`);
    assert.equal(hit.packingGroup, pg, `${id} packing group`);
    assert.deepEqual(hit.subsidiaryRisks, subs, `${id} subsidiary risks`);
  }
});
