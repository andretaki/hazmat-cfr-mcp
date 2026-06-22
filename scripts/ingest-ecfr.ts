/**
 * Ingest 49 CFR 172.101 (Hazardous Materials Table) and 172.102 (Special
 * Provisions) from the eCFR versioner API at the pinned snapshot date, and
 * regenerate the committed data modules under src/data/.
 *
 * Usage:  npm run ingest            (uses ECFR_SNAPSHOT_DATE)
 *         npm run ingest -- --fresh (bypass the local raw-XML cache)
 *
 * Raw XML is cached under scripts/.cache (gitignored) so re-runs are fast and
 * don't hammer eCFR. The build fails if any special-provision code referenced by
 * the table cannot be resolved — dangling references must never ship.
 */
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ECFR_SNAPSHOT_DATE, ecfrSectionXmlUrl } from "../src/data/snapshot.js";
import { parseHmt } from "./lib/parse-hmt.js";
import { parseSpecialProvisions } from "./lib/parse-special-provisions.js";

/**
 * Special-provision codes the 172.101 table references but 172.102 never defines.
 * Verified by hand against the live eCFR. Each is resolved to an explanatory note
 * (see below) instead of breaking the build or being dropped.
 *   IP16 — cited by UN3375 (ammonium nitrate emulsion) but absent from 172.102.
 */
const KNOWN_ERRATA = new Set<string>(["IP16"]);

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..");
const CACHE = join(HERE, ".cache");
const DATA = join(REPO, "src", "data");
const fresh = process.argv.includes("--fresh");

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function fetchSection(section: string): Promise<string> {
  const cachePath = join(CACHE, `cfr-${section}-${ECFR_SNAPSHOT_DATE}.xml`);
  if (!fresh && (await exists(cachePath))) {
    return readFile(cachePath, "utf8");
  }
  const url = ecfrSectionXmlUrl(section);
  process.stdout.write(`Fetching ${section} from eCFR (${ECFR_SNAPSHOT_DATE})…\n`);
  const res = await fetch(url, { signal: AbortSignal.timeout(120_000), headers: { Accept: "application/xml" } });
  if (!res.ok) throw new Error(`eCFR fetch for ${section} failed: ${res.status} ${res.statusText}`);
  const xml = await res.text();
  if (xml.length < 10_000) throw new Error(`eCFR returned suspiciously small payload for ${section} (${xml.length} bytes)`);
  await mkdir(CACHE, { recursive: true });
  await writeFile(cachePath, xml, "utf8");
  return xml;
}

const BANNER = (section: string) =>
  `// AUTO-GENERATED — DO NOT EDIT BY HAND.\n` +
  `// Source: 49 CFR ${section} via the eCFR versioner API, snapshot ${ECFR_SNAPSHOT_DATE}.\n` +
  `// Regenerate with: npm run ingest\n`;

async function main(): Promise<void> {
  const [hmtXml, spXml] = await Promise.all([fetchSection("172.101"), fetchSection("172.102")]);

  const { entries, crossReferences, skippedRows } = parseHmt(hmtXml);
  const { provisions } = parseSpecialProvisions(spXml);
  const provisionCodes = new Set(provisions.map((p) => p.code));

  // Referential integrity: every special-provision code referenced by the table
  // must resolve in 172.102. A dangling reference is a hard failure — UNLESS it is
  // a documented eCFR inconsistency (a code the table cites that the regulation
  // never defines). Those are listed here after manual verification and resolved
  // to an honest note so lookups never fabricate or silently drop a provision.
  const referenced = new Set<string>();
  for (const e of entries) for (const c of e.specialProvisions) referenced.add(c);
  const missing = [...referenced].filter((c) => !provisionCodes.has(c)).sort();

  const unexpected = missing.filter((c) => !KNOWN_ERRATA.has(c));
  const errata = missing.filter((c) => KNOWN_ERRATA.has(c));
  for (const code of errata) {
    provisions.push({
      code,
      text: `Referenced by the 49 CFR 172.101 table but not defined in 49 CFR 172.102 at the ${ECFR_SNAPSHOT_DATE} snapshot. This is a known inconsistency in the source regulation — verify against the current eCFR.`,
    });
  }
  provisions.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

  const withId = entries.filter((e) => e.idNumber).length;
  const forbidden = entries.filter((e) => e.forbidden).length;
  process.stdout.write(
    `\nParsed:\n` +
      `  HMT entries:          ${entries.length} (${withId} with UN/NA, ${forbidden} forbidden)\n` +
      `  cross-references:     ${crossReferences.length}\n` +
      `  skipped blank rows:   ${skippedRows}\n` +
      `  special provisions:   ${provisions.length}\n` +
      `  referenced SP codes:  ${referenced.size}\n` +
      `  documented errata:    ${errata.length}${errata.length ? ` (${errata.join(", ")})` : ""}\n` +
      `  unexpected unresolved:${unexpected.length}\n`,
  );

  if (unexpected.length > 0) {
    process.stderr.write(`\nUNEXPECTED unresolved special-provision codes:\n  ${unexpected.join(", ")}\n`);
    throw new Error(
      `${unexpected.length} special-provision code(s) referenced by the table do not resolve in 172.102 ` +
        `and are not in the documented errata list. Investigate the parser before shipping.`,
    );
  }

  const hmtFile =
    BANNER("172.101") +
    `import type { HazmatTableRow } from "../types.js";\n\n` +
    `export const HMT_TABLE_ROWS: HazmatTableRow[] = [\n` +
    entries.map((e) => `  ${JSON.stringify(stripUndefined(e))},`).join("\n") +
    `\n];\n`;

  const spFile =
    BANNER("172.102") +
    `export const SPECIAL_PROVISIONS: Record<string, string> = {\n` +
    provisions.map((p) => `  ${JSON.stringify(p.code)}: ${JSON.stringify(p.text)},`).join("\n") +
    `\n};\n`;

  const xrefFile =
    BANNER("172.101") +
    `export interface CrossReference { term: string; seeAlso: string; }\n\n` +
    `export const CROSS_REFERENCES: CrossReference[] = [\n` +
    crossReferences.map((c) => `  ${JSON.stringify(c)},`).join("\n") +
    `\n];\n`;

  await writeFile(join(DATA, "hmt-generated.ts"), hmtFile, "utf8");
  await writeFile(join(DATA, "special-provisions-generated.ts"), spFile, "utf8");
  await writeFile(join(DATA, "cross-references-generated.ts"), xrefFile, "utf8");
  process.stdout.write(`\nWrote src/data/{hmt,special-provisions,cross-references}-generated.ts ✅\n`);
}

/** Drop undefined-valued keys so the generated JSON stays compact. */
function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

main().catch((err) => {
  process.stderr.write(`\nIngest failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
