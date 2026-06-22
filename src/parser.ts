import { canonicalizeHazardClass, normalizeIdNumber, normalizePackingGroup } from "./normalizers.js";
import type { ParsedShippingDescription } from "./types.js";

const ID_RE = /\b(UN|NA)\s*([0-9]{4})\b/i;
const PG_RE = /\b(?:PG|PACKING\s+GROUP)\s*(I{1,3}|1|2|3)\b/i;
const HAZARD_CLASS_RE = /\b(?:CLASS\s*)?([1-9](?:\.[1-9])?)\b/i;

export function parseShippingDescription(raw: string): ParsedShippingDescription {
  const warnings: string[] = [];
  const tokens = raw.split(",").map((token) => token.trim()).filter(Boolean);

  const idMatch = raw.match(ID_RE);
  const idNumber = idMatch ? normalizeIdNumber(`${idMatch[1]}${idMatch[2]}`) : undefined;
  if (!idNumber) warnings.push("No UN/NA identification number found.");

  const pgMatch = raw.match(PG_RE);
  let packingGroup = pgMatch ? normalizePackingGroup(pgMatch[1]) : undefined;

  let hazardClass: string | undefined;
  for (const token of tokens) {
    const cleaned = token.replace(ID_RE, "").replace(PG_RE, "").trim();
    const cls = canonicalizeHazardClass(cleaned);
    if (cls) {
      hazardClass = cls;
      break;
    }
  }
  if (!hazardClass) {
    const classMatch = raw.match(HAZARD_CLASS_RE);
    hazardClass = classMatch ? canonicalizeHazardClass(classMatch[1]) : undefined;
  }
  if (!hazardClass) warnings.push("No hazard class/division found.");

  if (!packingGroup) {
    const standalonePg = tokens
      .map((token) => normalizePackingGroup(token))
      .find((value) => value !== undefined);
    packingGroup = standalonePg;
  }
  if (!packingGroup) warnings.push("No packing group found.");

  const properShippingName = inferName(tokens, idNumber, hazardClass, packingGroup);
  if (!properShippingName) warnings.push("No proper shipping name could be inferred.");

  return {
    raw,
    idNumber,
    properShippingName,
    hazardClass,
    packingGroup,
    subsidiaryRisks: [],
    tokens,
    warnings,
  };
}

function inferName(tokens: string[], idNumber?: string, hazardClass?: string, packingGroup?: string): string | undefined {
  const cleaned = tokens
    .map((token) => token.replace(ID_RE, "").replace(PG_RE, "").trim())
    .filter((token) => token.length > 0)
    .filter((token) => canonicalizeHazardClass(token) !== hazardClass)
    .filter((token) => normalizePackingGroup(token) !== packingGroup);

  if (cleaned.length === 0) return undefined;
  const first = cleaned[0];
  if (idNumber && first.toUpperCase() === idNumber) return cleaned[1];
  return first;
}
