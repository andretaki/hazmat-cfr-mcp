import { canonicalizeHazardClass } from "./normalizers.js";
import { CFR_177_848 } from "./sources.js";
import type { SegregationFinding } from "./types.js";

type Code = SegregationFinding["code"];

const SPECIAL_RULES: Array<{ a: string; b: string; message: string }> = [
  {
    a: "4.2",
    b: "8",
    message: "Division 4.2 materials may not be stored, loaded, or transported with Class 8 liquids.",
  },
  {
    a: "6.1",
    b: "3",
    message: "Division 6.1 PG I Hazard Zone A material may not be transported with Class 3 material.",
  },
  {
    a: "6.1",
    b: "8",
    message: "Division 6.1 PG I Hazard Zone A material may not be transported with Class 8 liquids.",
  },
  {
    a: "6.1",
    b: "5.1",
    message: "Division 6.1 PG I Hazard Zone A material may not be transported with Division 5.1 material.",
  },
];

const PAIR_RULES = new Map<string, Code>([
  [key("3", "4.2"), "O"],
  [key("3", "5.1"), "O"],
  [key("3", "5.2"), "O"],
  [key("4.1", "5.1"), "O"],
  [key("4.2", "5.1"), "O"],
  [key("4.3", "8"), "O"],
  [key("5.1", "8"), "O"],
]);

export function checkBasicSegregation(hazardClasses: string[]): SegregationFinding[] {
  const normalized = [...new Set(hazardClasses.map(canonicalizeHazardClass).filter((value): value is string => Boolean(value)))];
  const findings: SegregationFinding[] = [];

  for (let i = 0; i < normalized.length; i += 1) {
    for (let j = i + 1; j < normalized.length; j += 1) {
      const a = normalized[i];
      const b = normalized[j];
      const special = SPECIAL_RULES.find((rule) => samePair(rule.a, rule.b, a, b));
      if (special) {
        findings.push({
          pair: [a, b],
          code: "special",
          severity: "blocker",
          message: special.message,
          citation: CFR_177_848,
        });
        continue;
      }

      const code = PAIR_RULES.get(key(a, b)) ?? "none";
      findings.push({
        pair: [a, b],
        code,
        severity: code === "X" ? "blocker" : code === "O" ? "warning" : "info",
        message: explainCode(a, b, code),
        citation: CFR_177_848,
      });
    }
  }

  if (findings.length === 0) {
    findings.push({
      pair: [normalized[0] ?? "none", normalized[0] ?? "none"],
      code: "none",
      severity: "info",
      message: "Only one recognized hazard class was supplied; no pairwise segregation issue to check.",
      citation: CFR_177_848,
    });
  }

  return findings;
}

function key(a: string, b: string): string {
  return [a, b].sort((left, right) => Number.parseFloat(left) - Number.parseFloat(right)).join("|");
}

function samePair(ruleA: string, ruleB: string, a: string, b: string): boolean {
  return key(ruleA, ruleB) === key(a, b);
}

function explainCode(a: string, b: string, code: Code): string {
  if (code === "X") return `Classes ${a} and ${b} should not be loaded, transported, or stored together under the segregation table.`;
  if (code === "O") return `Classes ${a} and ${b} require separation unless leaking packages could not commingle under normal transport conditions.`;
  if (code === "*") return `Classes ${a} and ${b} require separate Class 1 compatibility-table analysis.`;
  return `No bundled segregation restriction is encoded for classes ${a} and ${b}; verify the current 49 CFR 177.848 table and special rules.`;
}
