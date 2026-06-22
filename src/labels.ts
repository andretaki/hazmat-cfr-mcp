import { defaultCatalog } from "./catalog.js";
import { normalizeIdNumber } from "./normalizers.js";
import { CFR_172_101, CFR_172_315 } from "./sources.js";
import type { HazmatCatalog } from "./catalog.js";
import type { HazmatEntry, ValidationIssue } from "./types.js";

export interface LabelRequirementResult {
  query: string;
  entry?: HazmatEntry;
  labels: string[];
  notes: string[];
  issues: ValidationIssue[];
}

export function getLabelRequirements(query: string, catalog: HazmatCatalog = defaultCatalog): LabelRequirementResult {
  const entries = normalizeIdNumber(query) ? catalog.findById(query) : catalog.searchByName(query);
  const entry = entries[0];
  if (!entry) {
    return {
      query,
      labels: [],
      notes: [],
      issues: [{ severity: "warning", field: "query", message: "No matching entry found in bundled CFR sample data.", citation: CFR_172_101 }],
    };
  }

  const notes = [
    `Hazard labels from the sample 49 CFR 172.101 row: ${entry.labels.join(", ")}.`,
    "Limited quantity markings, when applicable, are a separate analysis under 49 CFR 172.315 and Part 173.",
  ];
  return { query, entry, labels: entry.labels, notes, issues: [{ severity: "info", field: "limitedQuantity", message: "This tool reports label codes; it does not certify package marking or exception eligibility.", citation: CFR_172_315 }] };
}
