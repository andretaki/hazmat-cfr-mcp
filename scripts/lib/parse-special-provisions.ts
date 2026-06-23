/**
 * Parser for 49 CFR 172.102 special provisions.
 *
 * Build-time only. Provision codes are defined across three structures in the
 * section XML, all of which we capture:
 *   1. <FP-1> elements — numeric, A, B, N, R, W provisions ("A3 For combination…").
 *   2. Code tables — "Table 1 IB Codes", "Table 2 IP Codes", and the portable-tank
 *      "T" codes table; first cell is the code, the rest is the description, with
 *      empty-code continuation rows appended to the preceding code.
 *   3. <P> paragraphs — the "TP" portable-tank special provisions ("TP1 The maximum…").
 *
 * Codes are deduped first-wins in that priority order. T50/T75 are described only
 * in prose, so they are added explicitly. The data-integrity test asserts that
 * every code referenced by the HMT resolves here.
 */
import { cleanCell } from "./ecfr-text.js";

export interface SpecialProvision {
  code: string;
  text: string;
}

/**
 * A code defined by more than one source group with differing text. First-wins
 * (FP > tables > paragraphs > explicit) keeps the higher-priority definition;
 * the collision is recorded so a future source/order change is loud, not silent.
 * Real example: numeric codes "1"/"2" are real FP provisions AND appear as IB
 * table footnotes — the FP definition must always win.
 */
export interface SpecialProvisionCollision {
  code: string;
  kept: string;
  ignored: string;
}

export interface ParsedSpecialProvisions {
  provisions: SpecialProvision[];
  collisions: SpecialProvisionCollision[];
}

/** Leading-token shape for a valid special-provision code. */
const CODE_RE = /^(IB\d+|IP\d+|TP\d+|[ABNRTW]\d+|\d+)(?=\s|$)/;

function splitLeadingCode(text: string): SpecialProvision | undefined {
  const match = text.match(CODE_RE);
  if (!match) return undefined;
  const code = match[1];
  const body = text.slice(code.length).trim();
  if (!body) return undefined;
  return { code, text: body };
}

function fromFpElements(xml: string): SpecialProvision[] {
  // Numeric/letter provisions live in <FP-1>; a handful of later additions
  // (e.g. 398) live in <FP1-2> sub-paragraphs. Both begin with the code token.
  return [...xml.matchAll(/<(FP-1|FP1-2)>([\s\S]*?)<\/\1>/g)]
    .map((m) => splitLeadingCode(cleanCell(m[2])))
    .filter((p): p is SpecialProvision => p !== undefined);
}

/** Trim eCFR header decorations like "(bar)(2)" and "(See § 178…)". */
function cleanHeaderLabel(label: string): string {
  return label
    // Drop "(See § 178.274(d))"-style reference notes (one level of nested parens).
    .replace(/\(\s*See[^()]*(?:\([^()]*\)[^()]*)*\)/g, "")
    .replace(/\(\d+\)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Join a code row's value cells, labelling them when the table has a header. */
function describeRow(valueCells: string[], headers: string[]): string {
  if (headers.length > 2) {
    const parts = valueCells
      .map((value, i) => {
        const label = cleanHeaderLabel(headers[i + 1] ?? "");
        if (!value) return "";
        return label ? `${label}: ${value}` : value;
      })
      .filter(Boolean);
    if (parts.length) return parts.join("; ");
  }
  return valueCells.filter(Boolean).join(" — ").trim();
}

function fromTables(xml: string): SpecialProvision[] {
  const out: SpecialProvision[] = [];
  for (const tableMatch of xml.matchAll(/<TABLE\b[\s\S]*?<\/TABLE>/g)) {
    let current: SpecialProvision | undefined;
    let headers: string[] = [];
    for (const trMatch of tableMatch[0].matchAll(/<TR>([\s\S]*?)<\/TR>/g)) {
      const cells = [...trMatch[1].matchAll(/<T[DH]\b[^>]*>([\s\S]*?)<\/T[DH]>/g)].map((m) => cleanCell(m[1]));
      if (cells.length === 0) continue;
      const first = cells[0];
      if (CODE_RE.test(first)) {
        if (current) out.push(current);
        const code = first.match(CODE_RE)![1];
        const inlineRest = first.slice(code.length).trim();
        const desc = describeRow(cells.slice(1), headers);
        current = { code, text: desc || inlineRest };
      } else if (!current) {
        // Header row (precedes the first code row). Last header wins.
        headers = cells;
      } else if (first || cells.slice(1).some(Boolean)) {
        const extra = cells.filter(Boolean).join(" ").trim();
        if (extra) current.text = `${current.text} ${extra}`.trim();
      }
    }
    if (current) out.push(current);
  }
  return out;
}

function fromParagraphs(xml: string): SpecialProvision[] {
  return [...xml.matchAll(/<P>([\s\S]*?)<\/P>/g)]
    .map((m) => splitLeadingCode(cleanCell(m[1])))
    .filter((p): p is SpecialProvision => p !== undefined)
    // The TP (portable tank) and R (rail) families are defined in <P> paragraphs;
    // everything else here is prose that merely begins with a number — exclude it.
    .filter((p) => /^(TP|R)\d+$/.test(p.code));
}

const EXPLICIT: SpecialProvision[] = [
  {
    code: "T50",
    text: "Portable tank instruction for non-refrigerated liquefied compressed gases. See the gas portable-tank requirements in 49 CFR 172.102(c)(7) and the T50 table.",
  },
  {
    code: "T75",
    text: "Portable tank instruction for refrigerated liquefied gases. See 49 CFR 172.102(c)(7).",
  },
];

export function parseSpecialProvisions(xml: string): ParsedSpecialProvisions {
  const byCode = new Map<string, string>();
  const sourceOf = new Map<string, string>();
  const collisions: SpecialProvisionCollision[] = [];
  // Priority order: FP elements, then tables, then TP/R paragraphs, then explicit
  // prose codes. First definition wins; a later source that redefines an existing
  // code with DIFFERENT text from a DIFFERENT group is recorded as a collision so
  // an ordering regression surfaces instead of silently corrupting a definition.
  const groups: Array<readonly [string, SpecialProvision[]]> = [
    ["fp", fromFpElements(xml)],
    ["table", fromTables(xml)],
    ["paragraph", fromParagraphs(xml)],
    ["explicit", EXPLICIT],
  ];
  for (const [group, provisions] of groups) {
    for (const { code, text } of provisions) {
      if (!byCode.has(code)) {
        byCode.set(code, text);
        sourceOf.set(code, group);
      } else if (sourceOf.get(code) !== group && byCode.get(code) !== text) {
        collisions.push({ code, kept: sourceOf.get(code)!, ignored: group });
      }
    }
  }
  const provisions = [...byCode.entries()]
    .map(([code, text]) => ({ code, text }))
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  return { provisions, collisions };
}
