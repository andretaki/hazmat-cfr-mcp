import { canonicalizeHazardClass, normalizePackingGroup } from "./normalizers.js";
import { CFR_173_150, CFR_173_154 } from "./sources.js";
import type { LimitedQuantityInput, LimitedQuantityResult, PackingGroup, SourceCitation, ValidationIssue } from "./types.js";

const OUTER_GROSS_KG_CAP = 30;
const INNER_ML_CAP_BY_PG: Record<Exclude<PackingGroup, "I">, number> = {
  II: 1000,
  III: 5000,
};

export function checkLimitedQuantityEligibility(input: LimitedQuantityInput): LimitedQuantityResult {
  const hazardClass = canonicalizeHazardClass(input.hazardClass);
  const packingGroup = normalizePackingGroup(input.packingGroup);
  const innerPackageMl = input.innerPackageMl ?? (input.innerPackageKg !== undefined ? input.innerPackageKg * 1000 : undefined);
  const outerGrossKg = input.outerGrossKg;
  const issues: ValidationIssue[] = [];
  const citation = citationForClass(hazardClass);

  if (!hazardClass) {
    issues.push({ severity: "blocker", field: "hazardClass", message: "Missing or unsupported hazard class." });
  } else if (!["3", "8"].includes(hazardClass)) {
    issues.push({
      severity: "warning",
      field: "hazardClass",
      message: "Limited quantity helper currently supports common Class 3 and Class 8 liquid workflows only.",
      citation,
    });
  }

  if (!packingGroup) {
    issues.push({ severity: "blocker", field: "packingGroup", message: "Packing group is required for this limited quantity helper.", citation });
  } else if (packingGroup === "I") {
    issues.push({ severity: "blocker", field: "packingGroup", message: "PG I is not treated as limited-quantity eligible by this conservative helper.", citation });
  }

  if (innerPackageMl === undefined || !Number.isFinite(innerPackageMl) || innerPackageMl <= 0) {
    issues.push({ severity: "blocker", field: "innerPackageMl", message: "Inner package volume or weight is required.", citation });
  }
  if (outerGrossKg === undefined || !Number.isFinite(outerGrossKg) || outerGrossKg <= 0) {
    issues.push({ severity: "blocker", field: "outerGrossKg", message: "Outer gross package weight is required.", citation });
  }
  if (input.isCombinationPackaging !== true) {
    issues.push({ severity: "blocker", field: "isCombinationPackaging", message: "Limited quantity relief generally assumes combination packaging; set true only after package review.", citation });
  }

  if (packingGroup && packingGroup !== "I" && innerPackageMl !== undefined) {
    const cap = INNER_ML_CAP_BY_PG[packingGroup];
    if (innerPackageMl > cap) {
      issues.push({
        severity: "blocker",
        field: "innerPackageMl",
        message: `Inner package ${innerPackageMl} mL exceeds conservative ${cap} mL cap for PG ${packingGroup}.`,
        citation,
      });
    }
  }

  if (outerGrossKg !== undefined && outerGrossKg > OUTER_GROSS_KG_CAP) {
    issues.push({
      severity: "blocker",
      field: "outerGrossKg",
      message: `Outer gross package ${outerGrossKg} kg exceeds ${OUTER_GROSS_KG_CAP} kg cap.`,
      citation,
    });
  }

  if (issues.length === 0) {
    issues.push({
      severity: "info",
      field: "scope",
      message: "Candidate only: verify special provisions, material-specific exceptions, package performance, markings, mode, and current CFR text before shipping.",
      citation,
    });
  }

  const eligible = issues.every((issue) => issue.severity !== "blocker");
  return {
    eligible,
    mode: eligible ? "limited_quantity_candidate" : "full_hazmat_or_review",
    normalized: {
      hazardClass,
      packingGroup,
      innerPackageMl,
      outerGrossKg,
      isCombinationPackaging: input.isCombinationPackaging,
    },
    issues,
    citation,
  };
}

function citationForClass(hazardClass: string | undefined): SourceCitation {
  if (hazardClass === "8") return CFR_173_154;
  return CFR_173_150;
}
