export type IdPrefix = "UN" | "NA";
export type PackingGroup = "I" | "II" | "III";
export type Confidence = "high" | "medium" | "low" | "none";
export type Severity = "info" | "warning" | "blocker";

export interface SourceCitation {
  title: string;
  url: string;
  note?: string;
}

export interface PackagingReferences {
  exceptions?: string;
  nonBulk?: string;
  bulk?: string;
}

export interface QuantityLimitations {
  passengerAircraftRail?: string;
  cargoAircraftOnly?: string;
}

export interface VesselStowage {
  location?: string;
  other?: string;
}

export interface HazmatEntry {
  idNumber: string;
  properShippingName: string;
  hazardClass: string;
  packingGroup?: PackingGroup;
  subsidiaryRisks: string[];
  labels: string[];
  specialProvisions: string[];
  packaging: PackagingReferences;
  quantityLimitations: QuantityLimitations;
  vesselStowage: VesselStowage;
  synonyms: string[];
  source: SourceCitation;
}

export interface ParsedShippingDescription {
  raw: string;
  idNumber?: string;
  properShippingName?: string;
  hazardClass?: string;
  packingGroup?: PackingGroup;
  subsidiaryRisks: string[];
  tokens: string[];
  warnings: string[];
}

export interface ValidationIssue {
  severity: Severity;
  field: string;
  message: string;
  citation?: SourceCitation;
}

export interface LookupResult {
  confidence: Confidence;
  query: string;
  entries: HazmatEntry[];
  matches: CatalogMatch[];
  issues: ValidationIssue[];
}

export interface CatalogMatch {
  entry: HazmatEntry;
  score: number;
  reason: string;
}

export interface StructuredShipmentDescription {
  idNumber?: string;
  properShippingName?: string;
  hazardClass?: string;
  packingGroup?: string;
  subsidiaryRisks?: string[];
}

export interface ValidationResult {
  input: StructuredShipmentDescription;
  confidence: Confidence;
  matchedEntry?: HazmatEntry;
  normalized?: StructuredShipmentDescription;
  issues: ValidationIssue[];
  citations: SourceCitation[];
}

export interface SegregationFinding {
  pair: [string, string];
  code: "X" | "O" | "*" | "special" | "none";
  severity: Severity;
  message: string;
  citation: SourceCitation;
}

export interface LimitedQuantityInput {
  hazardClass: string;
  packingGroup?: string;
  innerPackageMl?: number;
  innerPackageKg?: number;
  outerGrossKg?: number;
  isCombinationPackaging?: boolean;
}

export interface LimitedQuantityResult {
  eligible: boolean;
  mode: "limited_quantity_candidate" | "full_hazmat_or_review";
  normalized: {
    hazardClass?: string;
    packingGroup?: PackingGroup;
    innerPackageMl?: number;
    outerGrossKg?: number;
    isCombinationPackaging?: boolean;
  };
  issues: ValidationIssue[];
  citation: SourceCitation;
}
