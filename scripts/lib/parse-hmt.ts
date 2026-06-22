/**
 * Parser for the 49 CFR 172.101 Hazardous Materials Table.
 *
 * Build-time only. The table is a single 14-column HTML table inside the section
 * XML. Every data row is a <TR> with exactly 14 <TD> cells in a fixed column
 * order (header rows use <TH> and other tables in the document have different
 * column counts, so "14 TD cells" cleanly isolates HMT data rows). Verified
 * against the live fixture in test/fixtures and by the data-integrity test.
 */
import { cleanCell, splitCodeList } from "./ecfr-text.js";
import type { PackingGroup } from "../../src/types.js";

/** Column order of the 172.101 table (0-based TD index). */
const COL = {
  symbols: 0,
  name: 1,
  hazardClass: 2,
  idNumber: 3,
  packingGroup: 4,
  labels: 5,
  specialProvisions: 6,
  pkgExceptions: 7,
  pkgNonBulk: 8,
  pkgBulk: 9,
  qtyPassengerAircraftRail: 10,
  qtyCargoAircraftOnly: 11,
  vesselLocation: 12,
  vesselOther: 13,
} as const;

export interface ParsedHmtEntry {
  idNumber?: string;
  properShippingName: string;
  hazardClass: string;
  forbidden: boolean;
  symbols: string[];
  packingGroup?: PackingGroup;
  subsidiaryRisks: string[];
  labels: string[];
  specialProvisions: string[];
  packaging: { exceptions?: string; nonBulk?: string; bulk?: string };
  quantityLimitations: { passengerAircraftRail?: string; cargoAircraftOnly?: string };
  vesselStowage: { location?: string; other?: string };
}

export interface CrossReference {
  term: string;
  seeAlso: string;
}

export interface ParsedHmt {
  entries: ParsedHmtEntry[];
  crossReferences: CrossReference[];
  skippedRows: number;
}

const ID_RE = /^(UN|NA|ID)\d{4}$/i;
const SEE_RE = /^(.*?),?\s+see\s+(.+)$/i;
const SYMBOL_RE = /^[+ADGIW]$/;

function normalizePackingGroup(value: string): PackingGroup | undefined {
  const v = value.trim().toUpperCase();
  if (v === "I" || v === "II" || v === "III") return v;
  return undefined;
}

function blankToUndef(value: string): string | undefined {
  return value ? value : undefined;
}

/** Extract the 14 cell strings of every HMT data row. */
function extractDataRows(xml: string): string[][] {
  const rows: string[][] = [];
  const trRe = /<TR>([\s\S]*?)<\/TR>/g;
  let match: RegExpExecArray | null;
  while ((match = trRe.exec(xml)) !== null) {
    const cells = [...match[1].matchAll(/<TD\b[^>]*>([\s\S]*?)<\/TD>/g)].map((m) => cleanCell(m[1]));
    if (cells.length === 14) rows.push(cells);
  }
  return rows;
}

export function parseHmt(xml: string): ParsedHmt {
  const entries: ParsedHmtEntry[] = [];
  const crossReferences: CrossReference[] = [];
  let skippedRows = 0;

  for (const cells of extractDataRows(xml)) {
    const name = cells[COL.name];
    const hazardClass = cells[COL.hazardClass];
    const id = cells[COL.idNumber].toUpperCase();
    const isForbidden = hazardClass.toLowerCase() === "forbidden";

    if (!ID_RE.test(id) && !isForbidden) {
      // No identification number and not a forbidden entry: either a
      // "term, see preferred-name" cross-reference, or a blank spacer row.
      const seeMatch = name.match(SEE_RE);
      if (seeMatch) {
        crossReferences.push({ term: seeMatch[1].trim(), seeAlso: seeMatch[2].trim() });
      } else {
        skippedRows += 1;
      }
      continue;
    }

    const symbols = cells[COL.symbols]
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s) => SYMBOL_RE.test(s));
    const labels = splitCodeList(cells[COL.labels]);

    entries.push({
      idNumber: ID_RE.test(id) ? id : undefined,
      properShippingName: name,
      hazardClass,
      forbidden: isForbidden,
      symbols,
      packingGroup: normalizePackingGroup(cells[COL.packingGroup]),
      subsidiaryRisks: labels.slice(1),
      labels,
      specialProvisions: splitCodeList(cells[COL.specialProvisions]),
      packaging: {
        exceptions: blankToUndef(cells[COL.pkgExceptions]),
        nonBulk: blankToUndef(cells[COL.pkgNonBulk]),
        bulk: blankToUndef(cells[COL.pkgBulk]),
      },
      quantityLimitations: {
        passengerAircraftRail: blankToUndef(cells[COL.qtyPassengerAircraftRail]),
        cargoAircraftOnly: blankToUndef(cells[COL.qtyCargoAircraftOnly]),
      },
      vesselStowage: {
        location: blankToUndef(cells[COL.vesselLocation]),
        other: blankToUndef(cells[COL.vesselOther]),
      },
    });
  }

  return { entries, crossReferences, skippedRows };
}
