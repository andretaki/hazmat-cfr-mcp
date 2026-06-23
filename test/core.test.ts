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

test("does not mistake a bare hazard-class digit for a packing group", () => {
  // "3" is the hazard class, not packing group III. Without an explicit PG the
  // parser must report none rather than inventing one.
  const parsed = parseShippingDescription("UN1090, Acetone, 3");
  assert.equal(parsed.hazardClass, "3");
  assert.equal(parsed.packingGroup, undefined);
  // The proper shipping name must still be inferred when no packing group is given.
  assert.equal(parsed.properShippingName, "Acetone");
  assert.equal(parsed.idNumber, "UN1090");
  assert.ok(parsed.warnings.includes("No packing group found."));
  assert.ok(!parsed.warnings.includes("No proper shipping name could be inferred."));
});

test("still parses a bare Roman-numeral packing group token", () => {
  const parsed = parseShippingDescription("UN1090, Acetone, 3, II");
  assert.equal(parsed.hazardClass, "3");
  assert.equal(parsed.packingGroup, "II");
});

test("still parses an explicit PG-prefixed Arabic packing group", () => {
  const parsed = parseShippingDescription("UN1830, Sulfuric acid, 8, PG 2");
  assert.equal(parsed.hazardClass, "8");
  assert.equal(parsed.packingGroup, "II");
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

test("validates a non-default packing group of a multi-PG entry", () => {
  // UN1987 (Alcohols, n.o.s.) is listed in 172.101 with PG I, II and III.
  // A legitimate PG III shipment must not be rejected just because PG I is
  // the first row in the table.
  const result = validateBasicHazmatDescription({
    idNumber: "UN1987",
    properShippingName: "Alcohols, n.o.s.",
    hazardClass: "3",
    packingGroup: "III",
  });
  assert.equal(result.matchedEntry?.packingGroup, "III");
  assert.equal(
    result.issues.filter((i) => i.severity === "blocker" && i.field === "packingGroup").length,
    0,
    "PG III is a valid variant and must not blocker",
  );
});

test("blocks a packing group that no variant of the entry allows", () => {
  // UN1090 (Acetone) is PG II only — PG I must still be flagged.
  const result = validateBasicHazmatDescription({
    idNumber: "UN1090",
    properShippingName: "Acetone",
    hazardClass: "3",
    packingGroup: "I",
  });
  assert.ok(
    result.issues.some((i) => i.severity === "blocker" && i.field === "packingGroup"),
    "PG I is not valid for UN1090",
  );
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

test("label requirements select the requested packing group variant", () => {
  const pgII = getLabelRequirements("UN1987", "II");
  assert.equal(pgII.entry?.packingGroup, "II");
  const pgIII = getLabelRequirements("UN1987", "III");
  assert.equal(pgIII.entry?.packingGroup, "III");
});

test("label requirements note that other packing-group variants exist", () => {
  const result = getLabelRequirements("UN1987");
  assert.ok(
    result.notes.some((n) => /packing group/i.test(n) && /variant/i.test(n)),
    "a note mentions the other packing-group variants",
  );
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

test("shipping requirements select the requested packing group variant", () => {
  // UN1987 (Alcohols, n.o.s.) has PG I, II and III with different special
  // provisions and packaging codes. Asking for PG III must return PG III data.
  const pgIII = getShippingRequirements("UN1987", "III");
  assert.equal(pgIII.requirements?.packingGroup, "III");
  assert.ok(
    pgIII.requirements?.specialProvisions.some((p) => p.code === "TP29"),
    "PG III special provisions returned",
  );
  const pgII = getShippingRequirements("UN1987", "II");
  assert.equal(pgII.requirements?.packingGroup, "II");
  assert.ok(pgII.requirements?.specialProvisions.some((p) => p.code === "TP28"));
});

test("shipping requirements warn and expose PG when variant is ambiguous", () => {
  const r = getShippingRequirements("UN1987");
  assert.ok(
    r.caveats.some((c) => /packing group/i.test(c) && /variant/i.test(c)),
    "caveat names the multi-variant situation",
  );
  assert.ok(
    r.alternatives?.every((a) => a.packingGroup !== undefined),
    "alternatives carry their packing group",
  );
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
