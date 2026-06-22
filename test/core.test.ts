import assert from "node:assert/strict";
import test from "node:test";
import {
  checkBasicSegregation,
  checkLimitedQuantityEligibility,
  defaultCatalog,
  getLabelRequirements,
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

test("looks up demo CFR entries by id and synonym", () => {
  assert.equal(defaultCatalog.lookup("UN1090").entries[0]?.properShippingName, "Acetone");
  assert.equal(defaultCatalog.lookup("isopropyl alcohol").entries[0]?.idNumber, "UN1219");
  assert.equal(defaultCatalog.lookup("isopropyl alcohol").matches[0]?.reason, "exact synonym match: isopropyl alcohol");
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
