import { defaultCatalog } from "./catalog.js";
import { normalizeIdNumber, normalizePackingGroup } from "./normalizers.js";
import { CFR_172_101, CFR_172_315 } from "./sources.js";
import type { HazmatCatalog } from "./catalog.js";
import type { HazmatEntry, PackingGroup, ValidationIssue } from "./types.js";

export interface LabelRequirementResult {
  query: string;
  entry?: HazmatEntry;
  labels: string[];
  notes: string[];
  issues: ValidationIssue[];
}

export function getLabelRequirements(query: string, packingGroup?: string, catalog: HazmatCatalog = defaultCatalog): LabelRequirementResult {
  const entries = normalizeIdNumber(query) ? catalog.findById(query) : catalog.searchByName(query);
  // A UN number can map to several packing-group variants; honour an explicit
  // packing group, otherwise fall back to the first row.
  const requestedPg = normalizePackingGroup(packingGroup);
  const entry = (requestedPg && entries.find((e) => e.packingGroup === requestedPg)) || entries[0];
  if (!entry) {
    return {
      query,
      labels: [],
      notes: [],
      issues: [{ severity: "warning", field: "query", message: "No matching entry found in bundled CFR sample data.", citation: CFR_172_101 }],
    };
  }

  const notes = [
    `Hazard labels from the 49 CFR 172.101 row${entry.packingGroup ? ` (PG ${entry.packingGroup})` : ""}: ${entry.labels.join(", ")}.`,
    "Limited quantity markings, when applicable, are a separate analysis under 49 CFR 172.315 and Part 173.",
  ];
  const variantPgs = entries.map((e) => e.packingGroup).filter((pg): pg is PackingGroup => Boolean(pg));
  if (variantPgs.length > 1) {
    notes.push(`This material has multiple packing group variants (${variantPgs.join(", ")}); labels shown are for PG ${entry.packingGroup ?? "?"}. Pass a packing group to select another variant.`);
  }
  return { query, entry, labels: entry.labels, notes, issues: [{ severity: "info", field: "limitedQuantity", message: "This tool reports label codes; it does not certify package marking or exception eligibility.", citation: CFR_172_315 }] };
}
