/**
 * Highway/rail placarding by hazard class, per 49 CFR 172.504 Tables 1 and 2.
 *
 * Conservative, class-level helper: it returns the placard name and the quantity
 * threshold for a hazard class/division. It deliberately does NOT resolve mixed-load
 * ("DANGEROUS"), subsidiary-hazard, or aggregate-weight decisions — those depend on
 * the whole shipment and must be reviewed against the regulation.
 */
import { canonicalizeHazardClass } from "./normalizers.js";
import { CFR_172_504 } from "./sources.js";
import type { SourceCitation } from "./types.js";

export type PlacardThreshold = "any-quantity" | "454-kg-aggregate" | "none";

export interface PlacardResult {
  hazardClass: string;
  placard?: string;
  threshold: PlacardThreshold;
  note: string;
  citation: SourceCitation;
}

/** Table 1 — placard required in ANY quantity. */
const TABLE_1: Record<string, string> = {
  "1.1": "EXPLOSIVES 1.1",
  "1.2": "EXPLOSIVES 1.2",
  "1.3": "EXPLOSIVES 1.3",
  "2.3": "POISON GAS",
  "4.3": "DANGEROUS WHEN WET",
  "7": "RADIOACTIVE",
};

/** Table 2 — placard required at 454 kg (1,001 lb) or more aggregate gross weight. */
const TABLE_2: Record<string, string> = {
  "1.4": "EXPLOSIVES 1.4",
  "1.5": "EXPLOSIVES 1.5",
  "1.6": "EXPLOSIVES 1.6",
  "2.1": "FLAMMABLE GAS",
  "2.2": "NON-FLAMMABLE GAS",
  "3": "FLAMMABLE",
  "4.1": "FLAMMABLE SOLID",
  "4.2": "SPONTANEOUSLY COMBUSTIBLE",
  "5.1": "OXIDIZER",
  "5.2": "ORGANIC PEROXIDE",
  "6.1": "POISON",
  "8": "CORROSIVE",
  "9": "CLASS 9",
};

/** Class-specific caveats where the table outcome is conditional. */
const CONDITIONS: Record<string, string> = {
  "5.2": "Temperature-controlled Type B organic peroxide must be placarded ORGANIC PEROXIDE in any quantity (Table 1).",
  "6.1": "Material poisonous by inhalation must be placarded POISON INHALATION HAZARD in any quantity (Table 1).",
  "7": "Required for the RADIOACTIVE Yellow-III label, and for certain LSA/SCO and exclusive-use shipments.",
  "9": "Class 9 placarding is required for bulk packagings; see § 172.504(f)(9).",
  "6.2": "Division 6.2 (infectious substances) has no placard specified in 172.504.",
};

export function getPlacard(hazardClass: string): PlacardResult {
  const cls = canonicalizeHazardClass(hazardClass) ?? hazardClass.trim();
  const base = { hazardClass: cls, citation: CFR_172_504 };
  const condition = CONDITIONS[cls] ? ` ${CONDITIONS[cls]}` : "";

  if (cls in TABLE_1) {
    return { ...base, placard: TABLE_1[cls], threshold: "any-quantity", note: `Placard required in any quantity.${condition}` };
  }
  if (cls === "6.2") {
    return { ...base, threshold: "none", note: CONDITIONS["6.2"] };
  }
  if (cls in TABLE_2) {
    return {
      ...base,
      placard: TABLE_2[cls],
      threshold: "454-kg-aggregate",
      note: `Placard required at 454 kg (1,001 lb) or more aggregate gross weight.${condition}`,
    };
  }
  return {
    ...base,
    threshold: "none",
    note: `No 172.504 placard rule found for hazard class "${cls}". Verify the class/division.`,
  };
}
