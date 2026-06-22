import type { PackingGroup } from "./types.js";

const ROMAN_PACKING_GROUPS: Record<string, PackingGroup> = {
  "1": "I",
  I: "I",
  "2": "II",
  II: "II",
  "3": "III",
  III: "III",
};

export function normalizeIdNumber(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value.trim().toUpperCase().replace(/\s+/g, "");
  const match = cleaned.match(/^(UN|NA)?(\d{4})$/);
  if (!match) return undefined;
  const prefix = match[1] ?? "UN";
  return `${prefix}${match[2]}`;
}

export function normalizePackingGroup(value: string | null | undefined): PackingGroup | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toUpperCase().replace(/^PG\s*/i, "");
  return ROMAN_PACKING_GROUPS[normalized];
}

export function normalizeName(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[^\w\s.%()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function canonicalizeHazardClass(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const match = value.trim().match(/^(\d)(?:\.(\d))?$/);
  if (!match) return undefined;
  return match[2] ? `${match[1]}.${match[2]}` : match[1];
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
