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

/**
 * Build the per-row columns that vary between packing-group variants of the
 * same entry (PG, labels, special provisions, packaging, quantities, stowage).
 * Identity columns (name, class, id, symbols) are supplied by the caller so a
 * continuation row can inherit them from its primary row.
 */
function rowColumns(cells: string[]): Omit<ParsedHmtEntry, "idNumber" | "properShippingName" | "hazardClass" | "forbidden" | "symbols"> {
  const labels = splitCodeList(cells[COL.labels]);
  return {
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
  };
}

export function parseHmt(xml: string): ParsedHmt {
  const entries: ParsedHmtEntry[] = [];
  const crossReferences: CrossReference[] = [];
  let skippedRows = 0;
  // The most recent primary entry (one with an id), used as the identity
  // carrier for the blank-name continuation rows that follow it.
  let carrier: ParsedHmtEntry | undefined;

  for (const cells of extractDataRows(xml)) {
    const name = cells[COL.name];
    const hazardClass = cells[COL.hazardClass];
    const id = cells[COL.idNumber].toUpperCase();
    const isForbidden = hazardClass.toLowerCase() === "forbidden";

    if (!ID_RE.test(id) && !isForbidden) {
      // No id and not Forbidden. Three possibilities, in priority order:
      //   1. "term, see preferred-name" cross-reference (name carries text).
      //   2. A continuation row of a multi-packing-group entry: the source
      //      table states the name/class/id only once, then lists each
      //      additional packing group on its own row with blank identity
      //      cells. These MUST inherit identity from the carrier above —
      //      dropping them silently loses 500+ PG variants (see UN1987).
      //   3. A genuine blank spacer row.
      const seeMatch = name.match(SEE_RE);
      const cols = rowColumns(cells);
      if (seeMatch) {
        crossReferences.push({ term: seeMatch[1].trim(), seeAlso: seeMatch[2].trim() });
      } else if (name === "" && cols.packingGroup && carrier) {
        entries.push({
          idNumber: carrier.idNumber,
          properShippingName: carrier.properShippingName,
          hazardClass: carrier.hazardClass,
          forbidden: carrier.forbidden,
          symbols: carrier.symbols,
          ...cols,
        });
      } else {
        skippedRows += 1;
      }
      continue;
    }

    const symbols = cells[COL.symbols]
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s) => SYMBOL_RE.test(s));

    const entry: ParsedHmtEntry = {
      idNumber: ID_RE.test(id) ? id : undefined,
      properShippingName: name,
      hazardClass,
      forbidden: isForbidden,
      symbols,
      ...rowColumns(cells),
    };
    entries.push(entry);
    // Only a row with an id can carry identity to later continuation rows;
    // a Forbidden row (no id) must not absorb the blank rows that follow it.
    if (entry.idNumber) carrier = entry;
  }

  return { entries, crossReferences, skippedRows };
}
