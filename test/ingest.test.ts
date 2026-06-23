import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import test from "node:test";
import { parseHmt } from "../scripts/lib/parse-hmt.js";
import { parseSpecialProvisions } from "../scripts/lib/parse-special-provisions.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => readFileSync(join(HERE, "fixtures", name), "utf8");

const hmt = parseHmt(fixture("hmt-sample.xml"));

test("parseHmt: extracts normal entries with all columns", () => {
  const acetone = hmt.entries.find((e) => e.idNumber === "UN1090");
  assert.ok(acetone, "UN1090 present");
  assert.equal(acetone!.properShippingName, "Acetone");
  assert.equal(acetone!.hazardClass, "3");
  assert.equal(acetone!.packingGroup, "II");
  assert.deepEqual(acetone!.labels, ["3"]);
  assert.deepEqual(acetone!.specialProvisions, ["IB2", "T4", "TP1"]);
  assert.equal(acetone!.packaging.exceptions, "150");
  assert.equal(acetone!.packaging.nonBulk, "202");
  assert.equal(acetone!.packaging.bulk, "242");
  assert.equal(acetone!.quantityLimitations.cargoAircraftOnly, "60 L");
  assert.equal(acetone!.vesselStowage.location, "B");
  assert.equal(acetone!.forbidden, false);
});

test("parseHmt: derives subsidiary risks from secondary labels", () => {
  const anhydride = hmt.entries.find((e) => e.idNumber === "UN1715");
  assert.deepEqual(anhydride!.labels, ["8", "3"]);
  assert.deepEqual(anhydride!.subsidiaryRisks, ["3"]);
  assert.equal(anhydride!.vesselStowage.other, "40, 53, 58");
});

test("parseHmt: captures Column 1 symbols (G)", () => {
  const adsorbed = hmt.entries.find((e) => e.idNumber === "UN3511");
  assert.deepEqual(adsorbed!.symbols, ["G"]);
});

test("parseHmt: keeps Forbidden entries without an id", () => {
  const forbidden = hmt.entries.find((e) => e.forbidden);
  assert.ok(forbidden, "a forbidden entry exists");
  assert.equal(forbidden!.idNumber, undefined);
  assert.equal(forbidden!.hazardClass, "Forbidden");
  assert.match(forbidden!.properShippingName, /Acetyl acetone peroxide/);
});

test("parseHmt: routes 'see' rows to cross-references, not entries", () => {
  assert.equal(hmt.entries.some((e) => e.properShippingName.includes("Accellerene")), false);
  const xref = hmt.crossReferences.find((x) => x.term === "Accellerene");
  assert.ok(xref, "Accellerene cross-reference captured");
  assert.equal(xref!.seeAlso, "p-Nitrosodimethylaniline");
});

test("parseHmt: keeps every packing-group variant of a multi-PG entry", () => {
  const variants = hmt.entries.filter((e) => e.idNumber === "UN1987");
  assert.equal(variants.length, 3, "UN1987 has PG I, II and III rows");
  assert.deepEqual(
    variants.map((e) => e.packingGroup),
    ["I", "II", "III"],
  );
  // Continuation rows inherit identity from the primary row…
  for (const v of variants) {
    assert.equal(v.properShippingName, "Alcohols, n.o.s.");
    assert.equal(v.hazardClass, "3");
    assert.equal(v.forbidden, false);
  }
  // …but carry their own per-row packaging / quantity columns.
  const pgIII = variants.find((e) => e.packingGroup === "III")!;
  assert.equal(pgIII.packaging.nonBulk, "203");
  assert.equal(pgIII.quantityLimitations.passengerAircraftRail, "60 L");
  assert.deepEqual(pgIII.specialProvisions, ["172", "B1", "IB3", "T4", "TP1", "TP29"]);
});

test("parseHmt: skips blank rows", () => {
  assert.equal(hmt.skippedRows, 1);
});

const sp = parseSpecialProvisions(fixture("sp-sample.xml"));
const spByCode = new Map(sp.provisions.map((p) => [p.code, p.text]));

test("parseSpecialProvisions: reads FP-1, FP1-2, R/TP paragraphs and tables", () => {
  assert.match(spByCode.get("A3") ?? "", /combination packagings/);
  assert.match(spByCode.get("148") ?? "", /most recent version/);
  assert.match(spByCode.get("398") ?? "", /butylene/); // <FP1-2>
  assert.match(spByCode.get("R1") ?? "", /molten sulfur/); // <P> R code
  assert.match(spByCode.get("TP1") ?? "", /degree of filling/); // <P> TP code
  assert.match(spByCode.get("IB2") ?? "", /Metal \(31A/); // IB table, continuation merged
  assert.match(spByCode.get("IB2") ?? "", /Additional Requirement/);
});

test("parseSpecialProvisions: labels multi-column T-code rows", () => {
  const t4 = spByCode.get("T4") ?? "";
  assert.match(t4, /Minimum test pressure \(bar\): 2\.65/);
  assert.match(t4, /Pressure-relief requirements: Normal/);
  assert.doesNotMatch(t4, /See §/); // header reference notes stripped
});

test("parseSpecialProvisions: FP-1 definition wins over a colliding table footnote", () => {
  // A numeric code ("1") is a real FP-1 special provision AND appears as a
  // leading footnote token inside an IB table. The FP-1 text must win, and the
  // collision must be reported so a future ordering regression is loud.
  const xml = `
    <FP-1>1 Real special provision one — poisonous by inhalation.</FP-1>
    <TABLE>
      <TR><TD>IB1</TD><TD>Authorized non-bulk packaging.</TD></TR>
      <TR><TD>1 Flexible plastic (51H) large packagings footnote.</TD></TR>
    </TABLE>`;
  const parsed = parseSpecialProvisions(xml);
  const byCode = new Map(parsed.provisions.map((p) => [p.code, p.text]));
  assert.match(byCode.get("1") ?? "", /poisonous by inhalation/);
  assert.doesNotMatch(byCode.get("1") ?? "", /Flexible plastic/);
  assert.ok(
    parsed.collisions.some((c) => c.code === "1" && c.kept === "fp" && c.ignored === "table"),
    "collision recorded with FP-1 kept",
  );
});
