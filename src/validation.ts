import { defaultCatalog } from "./catalog.js";
import { canonicalizeHazardClass, normalizeIdNumber, normalizeName, normalizePackingGroup, uniqueSorted } from "./normalizers.js";
import { CFR_172_101, CFR_172_202 } from "./sources.js";
import type { HazmatCatalog } from "./catalog.js";
import type { HazmatEntry, StructuredShipmentDescription, ValidationIssue, ValidationResult } from "./types.js";

export function validateBasicHazmatDescription(
  input: StructuredShipmentDescription,
  catalog: HazmatCatalog = defaultCatalog,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const normalized: StructuredShipmentDescription = {
    idNumber: normalizeIdNumber(input.idNumber),
    properShippingName: input.properShippingName?.trim(),
    hazardClass: canonicalizeHazardClass(input.hazardClass),
    packingGroup: normalizePackingGroup(input.packingGroup),
    subsidiaryRisks: uniqueSorted(input.subsidiaryRisks ?? []),
  };

  if (!normalized.idNumber) {
    issues.push({
      severity: "blocker",
      field: "idNumber",
      message: "Missing or invalid UN/NA identification number.",
      citation: CFR_172_202,
    });
  }
  if (!normalized.properShippingName) {
    issues.push({
      severity: "blocker",
      field: "properShippingName",
      message: "Missing proper shipping name.",
      citation: CFR_172_101,
    });
  }
  if (!normalized.hazardClass) {
    issues.push({
      severity: "blocker",
      field: "hazardClass",
      message: "Missing or invalid hazard class/division.",
      citation: CFR_172_101,
    });
  }

  const candidates = findCandidates(normalized, catalog);
  // A single UN number can map to several rows that differ only by packing
  // group (e.g. UN1987 lists PG I, II and III). Compare against the variant
  // that matches the declared packing group rather than blindly the first row,
  // otherwise a legitimate PG II/III shipment is rejected against the PG I row.
  const matchedEntry =
    (normalized.packingGroup && candidates.find((c) => c.packingGroup === normalized.packingGroup)) ||
    candidates[0];
  if (!matchedEntry) {
    issues.push({
      severity: "warning",
      field: "cfrTable",
      message: "No matching row was found in the bundled public CFR sample dataset.",
      citation: CFR_172_101,
    });
    return { input, normalized, confidence: "none", issues, citations: [CFR_172_101, CFR_172_202] };
  }

  compareAgainstEntry(normalized, matchedEntry, issues);
  const blockerCount = issues.filter((issue) => issue.severity === "blocker").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const confidence = blockerCount > 0 ? "low" : warningCount > 0 ? "medium" : "high";
  return { input, normalized, matchedEntry, confidence, issues, citations: [matchedEntry.source, CFR_172_202] };
}

function findCandidates(input: StructuredShipmentDescription, catalog: HazmatCatalog): HazmatEntry[] {
  if (input.idNumber) {
    const byId = catalog.findById(input.idNumber);
    if (byId.length > 0) return byId;
  }
  if (input.properShippingName) return catalog.searchByName(input.properShippingName);
  return [];
}

function compareAgainstEntry(input: StructuredShipmentDescription, entry: HazmatEntry, issues: ValidationIssue[]): void {
  if (input.idNumber && input.idNumber !== entry.idNumber) {
    issues.push({
      severity: "blocker",
      field: "idNumber",
      message: `Input ID ${input.idNumber} does not match CFR sample row ${entry.idNumber}.`,
      citation: entry.source,
    });
  }
  if (input.properShippingName && normalizeName(input.properShippingName) !== normalizeName(entry.properShippingName)) {
    const aliases = entry.synonyms.map(normalizeName);
    if (!aliases.includes(normalizeName(input.properShippingName))) {
      issues.push({
        severity: "warning",
        field: "properShippingName",
        message: `Input name "${input.properShippingName}" differs from sample CFR proper shipping name "${entry.properShippingName}".`,
        citation: entry.source,
      });
    }
  }
  if (input.hazardClass && input.hazardClass !== entry.hazardClass) {
    issues.push({
      severity: "blocker",
      field: "hazardClass",
      message: `Input class ${input.hazardClass} does not match sample CFR class ${entry.hazardClass}.`,
      citation: entry.source,
    });
  }
  if (entry.packingGroup && input.packingGroup && input.packingGroup !== entry.packingGroup) {
    issues.push({
      severity: "blocker",
      field: "packingGroup",
      message: `Input packing group ${input.packingGroup} does not match sample CFR packing group ${entry.packingGroup}.`,
      citation: entry.source,
    });
  }
  if (entry.packingGroup && !input.packingGroup) {
    issues.push({
      severity: "warning",
      field: "packingGroup",
      message: `Packing group is missing; sample CFR row lists PG ${entry.packingGroup}.`,
      citation: entry.source,
    });
  }
}
