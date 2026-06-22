/**
 * Text helpers for eCFR XML. Build-time only (used by the ingest script and its
 * tests); never imported by the shipped server, so it carries no runtime weight.
 *
 * The eCFR table cells are flat HTML fragments — no nested cells, occasional
 * inline <E>/<I> emphasis tags, and HTML entities. We only ever want the visible
 * text of a cell, so stripping tags + decoding entities is sufficient and is
 * covered by unit tests against real fixtures.
 */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  deg: "°",
  micro: "µ",
  plusmn: "±",
  times: "×",
  le: "≤",
  ge: "≥",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
};

/** Decode numeric (&#176; / &#xb0;) and the named entities eCFR actually emits. */
export function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (whole, name) => NAMED_ENTITIES[name] ?? whole);
}

function safeCodePoint(code: number): string {
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

/** Strip tags, decode entities, collapse whitespace, trim. */
export function cleanCell(html: string): string {
  const withoutTags = html.replace(/<[^>]+>/g, " ");
  return decodeEntities(withoutTags).replace(/\s+/g, " ").trim();
}

/** Split a comma-separated code list, also splitting stray space-joined codes. */
export function splitCodeList(value: string): string[] {
  return value
    .split(",")
    .flatMap((token) => token.trim().split(/\s+/))
    .map((token) => token.trim())
    .filter(Boolean);
}
