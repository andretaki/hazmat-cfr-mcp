/**
 * Decoders for the coded legend columns of the 49 CFR 172.101 table:
 * Column 1 symbols (b), Column 10A vessel stowage categories (k), and the
 * Columns 8A-8C packaging-authorization section references.
 *
 * Symbol and stowage text is taken verbatim/condensed from 172.101 itself.
 */
import { CFR_172_101 } from "./sources.js";
import { ecfrSectionUrl } from "./data/snapshot.js";
import type { SourceCitation } from "./types.js";

/** Column 1 symbol meanings, per 49 CFR 172.101(b). */
export const SYMBOL_LEGEND: Record<string, string> = {
  "+": "Fixes the proper shipping name, hazard class and packing group for the entry without regard to whether the material meets the class or packing-group definition; indicates a known risk to humans.",
  A: "Subject to this subchapter only when offered or intended for transportation by aircraft, unless it is a hazardous substance or hazardous waste.",
  D: "Proper shipping name appropriate for domestic transportation but may be inappropriate for international transportation.",
  G: "A technical name of the hazardous material must be entered in parentheses with the basic description (generic / n.o.s. entry).",
  I: "Proper shipping name appropriate for international transportation.",
  W: "Subject to this subchapter only when offered or intended for transportation by vessel, unless it is a hazardous substance or hazardous waste.",
};

/** Column 10A vessel stowage category meanings, per 49 CFR 172.101(k). */
export const VESSEL_STOWAGE_LEGEND: Record<string, string> = {
  A: "May be stowed 'on deck' or 'under deck' on a cargo vessel or on a passenger vessel.",
  B: "May be stowed 'on deck' or 'under deck' on a cargo vessel; on a passenger vessel stowage is restricted (see 172.101(k) for the full conditions).",
  C: "Must be stowed 'on deck only' on a cargo vessel or on a passenger vessel.",
  D: "Must be stowed 'on deck only' on a cargo vessel or on a passenger vessel limited to ~25 passengers (or one per 3 m of length); prohibited on larger passenger vessels.",
  E: "May be stowed 'on deck' or 'under deck' on a cargo vessel or on a passenger vessel limited to ~25 passengers (or one per 3 m of length); prohibited on larger passenger vessels.",
  "01": "May be stowed 'on deck' in closed cargo transport units or 'under deck' on a cargo vessel (≤12 passengers) or on a passenger vessel.",
  "02": "May be stowed 'on deck' in closed cargo transport units or 'under deck' on a cargo vessel (≤12 passengers); on a passenger vessel only in closed cargo transport units.",
  "03": "May be stowed 'on deck' in closed cargo transport units or 'under deck' on a cargo vessel (≤12 passengers); prohibited on a passenger vessel.",
  "04": "May be stowed 'on deck' or 'under deck' in closed cargo transport units on a cargo vessel (≤12 passengers); prohibited on a passenger vessel.",
  "05": "May be stowed 'on deck' in closed cargo transport units on a cargo vessel (≤12 passengers); prohibited on a passenger vessel.",
};

export interface DecodedCode {
  code: string;
  known: boolean;
  meaning?: string;
  source: SourceCitation;
}

export function decodeSymbol(symbol: string): DecodedCode {
  const code = symbol.trim().toUpperCase();
  const meaning = SYMBOL_LEGEND[code];
  return { code, known: meaning !== undefined, meaning, source: CFR_172_101 };
}

export function decodeVesselStowageLocation(location: string): DecodedCode {
  const code = location.trim().toUpperCase();
  const meaning = VESSEL_STOWAGE_LEGEND[code];
  return { code, known: meaning !== undefined, meaning, source: CFR_172_101 };
}

const PACKAGING_COLUMN_LABEL = {
  exceptions: "Packaging exceptions (Column 8A)",
  nonBulk: "Non-bulk packaging authorization (Column 8B)",
  bulk: "Bulk packaging authorization (Column 8C)",
} as const;

export interface DecodedPackagingReference {
  column: keyof typeof PACKAGING_COLUMN_LABEL;
  authorized: boolean;
  note: string;
  citation?: SourceCitation;
}

/**
 * Decode a Column 8A/8B/8C value (e.g. "150", "202", "None") into the part-173
 * section it references.
 */
export function decodePackagingReference(
  column: keyof typeof PACKAGING_COLUMN_LABEL,
  code: string | undefined,
): DecodedPackagingReference {
  const label = PACKAGING_COLUMN_LABEL[column];
  if (!code || code.toLowerCase() === "none") {
    return { column, authorized: false, note: `${label}: none authorized in this column.` };
  }
  const section = `173.${code}`;
  return {
    column,
    authorized: true,
    note: `${label}: see 49 CFR ${section}.`,
    citation: {
      title: `49 CFR ${section}`,
      url: ecfrSectionUrl(section),
    },
  };
}
