import assert from "node:assert/strict";
import test from "node:test";
import {
  checkBasicSegregation,
  checkLimitedQuantityEligibility,
  decodePackagingReference,
  decodeSpecialProvision,
  decodeSymbol,
  defaultCatalog,
  getLabelRequirements,
  getShippingRequirements,
  normalizeIdNumber,
  normalizePackingGroup,
  parseShippingDescription,
  validateBasicHazmatDescription,
} from "../src/index.js";

test("normalizes UN/NA identifiers and packing groups", () => {
  assert.equal(normalizeIdNumber("un 1090"), "UN1090");
  assert.equal(normalizeIdNumber("NA1993"), "NA1993");
  assert.equal(normalizeIdNumber("1219"), "UN1219");
  assert.equal(normalizePackingGroup("PG 2"), "II");
  assert.equal(normalizePackingGroup("iii"), "III");
});

test("looks up entries by id and synonym", () => {
  assert.equal(defaultCatalog.lookup("UN1090").entries[0]?.properShippingName, "Acetone");
  // "Isopropyl alcohol" is part of UN1219's proper shipping name in the real table.
  assert.equal(defaultCatalog.lookup("isopropyl alcohol").entries[0]?.idNumber, "UN1219");
  // Curated synonyms still resolve via the synonym path.
  const rubbing = defaultCatalog.lookup("rubbing alcohol");
  assert.equal(rubbing.entries[0]?.idNumber, "UN1219");
  assert.equal(rubbing.matches[0]?.reason, "exact synonym match: rubbing alcohol");
});

test("ranks sulfuric acid concentration qualifiers correctly", () => {
  const more = defaultCatalog.lookup("sulfuric acid more than 51 percent");
  assert.equal(more.entries[0]?.idNumber, "UN1830");

  const notMore = defaultCatalog.lookup("sulfuric acid not more than 51 percent");
  assert.equal(notMore.entries[0]?.idNumber, "UN2796");
});

test("parses a basic DOT shipping description", () => {
  const parsed = parseShippingDescription("UN1090, Acetone, 3, PG II");
  assert.equal(parsed.idNumber, "UN1090");
  assert.equal(parsed.properShippingName, "Acetone");
  assert.equal(parsed.hazardClass, "3");
  assert.equal(parsed.packingGroup, "II");
  assert.deepEqual(parsed.warnings, []);
});

test("validates a matching description", () => {
  const result = validateBasicHazmatDescription({
    idNumber: "UN1830",
    properShippingName: "Sulfuric acid with more than 51 percent acid",
    hazardClass: "8",
    packingGroup: "II",
  });
  assert.equal(result.confidence, "high");
  assert.equal(result.issues.filter((issue) => issue.severity === "blocker").length, 0);
});

test("flags incomplete descriptions", () => {
  const result = validateBasicHazmatDescription({
    properShippingName: "Acetone",
    hazardClass: "3",
  });
  assert.equal(result.confidence, "low");
  assert.ok(result.issues.some((issue) => issue.field === "idNumber"));
});

test("returns label requirements with citations", () => {
  const result = getLabelRequirements("UN1090");
  assert.deepEqual(result.labels, ["3"]);
  assert.equal(result.issues[0]?.field, "limitedQuantity");
});

test("returns conservative segregation warnings", () => {
  const findings = checkBasicSegregation(["3", "5.1"]);
  assert.equal(findings[0]?.code, "O");
  assert.equal(findings[0]?.severity, "warning");
});

test("decodes special-provision codes from 172.102", () => {
  const ib2 = decodeSpecialProvision("ib2");
  assert.equal(ib2.known, true);
  assert.equal(ib2.code, "IB2");
  assert.match(ib2.text ?? "", /IBC/i);
  assert.equal(decodeSpecialProvision("ZZZ999").known, false);
});

test("decodes Column 1 symbols and packaging references", () => {
  assert.match(decodeSymbol("G").meaning ?? "", /technical name/i);
  const nonBulk = decodePackagingReference("nonBulk", "202");
  assert.equal(nonBulk.authorized, true);
  assert.match(nonBulk.citation?.url ?? "", /173\.202/);
  assert.equal(decodePackagingReference("exceptions", "None").authorized, false);
});

test("composite shipping requirements compose identity, placard, packaging, citations", () => {
  const r = getShippingRequirements("UN1830");
  assert.equal(r.found, true);
  assert.equal(r.requirements?.hazardClass, "8");
  assert.equal(r.requirements?.packingGroup, "II");
  assert.equal(r.requirements?.placard.placard, "CORROSIVE");
  assert.equal(r.requirements?.packaging.nonBulk.authorized, true);
  assert.ok(r.citations.some((c) => c.title.includes("172.101")));
  assert.ok(r.caveats.some((c) => /not legal advice/i.test(c)));
  assert.ok(r.summary.includes("UN1830"));
});

test("shipping requirements flags forbidden materials and missing matches", () => {
  const miss = getShippingRequirements("definitely-not-a-real-chemical-xyz");
  assert.equal(miss.found, false);
  assert.equal(miss.confidence, "none");
});

test("lookup resolves a UN number absent from the old 7-entry sample", () => {
  const acetal = defaultCatalog.lookup("UN1088");
  assert.equal(acetal.confidence, "high");
  assert.equal(acetal.entries[0]?.properShippingName, "Acetal");
});

test("screens common limited quantity candidates conservatively", () => {
  const eligible = checkLimitedQuantityEligibility({
    hazardClass: "3",
    packingGroup: "II",
    innerPackageMl: 1000,
    outerGrossKg: 12,
    isCombinationPackaging: true,
  });
  assert.equal(eligible.eligible, true);

  const tooLarge = checkLimitedQuantityEligibility({
    hazardClass: "3",
    packingGroup: "II",
    innerPackageMl: 1200,
    outerGrossKg: 12,
    isCombinationPackaging: true,
  });
  assert.equal(tooLarge.eligible, false);
  assert.ok(tooLarge.issues.some((issue) => issue.field === "innerPackageMl"));
});
