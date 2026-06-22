import { CFR_SAMPLE_ENTRIES } from "./data/cfr-sample.js";
import { normalizeIdNumber, normalizeName } from "./normalizers.js";
import type { CatalogMatch, HazmatEntry, LookupResult, ValidationIssue } from "./types.js";

const STOPWORDS = new Set(["and", "or", "the", "with", "than", "acid", "solution", "aqueous", "percent", "not"]);

export class HazmatCatalog {
  private readonly entries: HazmatEntry[];

  constructor(entries: HazmatEntry[] = CFR_SAMPLE_ENTRIES) {
    this.entries = entries;
  }

  all(): HazmatEntry[] {
    return [...this.entries];
  }

  findById(idNumber: string): HazmatEntry[] {
    const normalized = normalizeIdNumber(idNumber);
    if (!normalized) return [];
    return this.entries.filter((entry) => entry.idNumber === normalized);
  }

  searchByName(query: string): HazmatEntry[] {
    return this.search(query).map((match) => match.entry);
  }

  search(query: string): CatalogMatch[] {
    const normalized = normalizeName(query);
    if (!normalized) return [];

    return this.entries
      .map((entry) => scoreEntry(entry, normalized))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || a.entry.properShippingName.localeCompare(b.entry.properShippingName))
      .map(({ entry, score, reason }) => ({ entry, score, reason }));
  }

  lookup(query: string): LookupResult {
    const issues: ValidationIssue[] = [];
    const id = normalizeIdNumber(query);
    if (id) {
      const entries = this.findById(id);
      if (entries.length > 0) {
        return {
          confidence: "high",
          query,
          entries,
          matches: entries.map((entry) => ({ entry, score: 100, reason: `exact ${id} match` })),
          issues,
        };
      }
      return {
        confidence: "none",
        query,
        entries: [],
        matches: [],
        issues: [{ severity: "warning", field: "idNumber", message: `No demo dataset row found for ${id}.` }],
      };
    }

    const matches = this.search(query);
    const entries = matches.map((match) => match.entry);
    const confidence = matches.length === 0 ? "none" : matches[0].score >= 90 ? "high" : matches[0].score >= 65 ? "medium" : "low";
    if (entries.length === 0) {
      issues.push({
        severity: "warning",
        field: "properShippingName",
        message: "No matching public CFR sample row found. Try a UN/NA number or exact proper shipping name.",
      });
    }
    return { confidence, query, entries, matches, issues };
  }
}

function scoreEntry(entry: HazmatEntry, query: string): CatalogMatch {
  const name = normalizeName(entry.properShippingName);
  if (name === query) return { entry, score: 100, reason: "exact proper shipping name match" };
  if (name.includes(query) || query.includes(name)) return { entry, score: 92, reason: "proper shipping name phrase match" };

  for (const synonym of entry.synonyms) {
    const normalizedSynonym = normalizeName(synonym);
    if (normalizedSynonym === query) return { entry, score: 95, reason: `exact synonym match: ${synonym}` };
    if (normalizedSynonym.includes(query) || query.includes(normalizedSynonym)) {
      return { entry, score: 86, reason: `synonym phrase match: ${synonym}` };
    }
  }

  const terms = query.split(" ").filter((term) => term.length > 2 && !STOPWORDS.has(term));
  const haystack = [name, ...entry.synonyms.map(normalizeName)].join(" ");
  const matchedTerms = terms.filter((term) => haystack.includes(term));
  const score = terms.length > 0 ? Math.round((matchedTerms.length / terms.length) * 72) : 0;
  return {
    entry,
    score: adjustForQualifiers(score, query, name),
    reason: matchedTerms.length > 0 ? `token match: ${matchedTerms.join(", ")}` : "no meaningful token match",
  };
}

function adjustForQualifiers(score: number, query: string, name: string): number {
  let adjusted = score;
  if (query.includes("more") && name.includes("more")) adjusted += 10;
  if (query.includes("not more") && name.includes("not more")) adjusted += 10;
  if (query.includes("more") && !query.includes("not more") && name.includes("not more")) adjusted -= 25;
  if (query.includes("not more") && !name.includes("not more")) adjusted -= 25;
  return Math.max(0, Math.min(99, adjusted));
}

export const defaultCatalog = new HazmatCatalog();
