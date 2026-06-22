/**
 * Assembles the runtime catalog: the generated 49 CFR 172.101 table rows,
 * enriched with the curated synonym/CAS overlay and tagged with the source
 * citation. This is the dataset the catalog and MCP tools operate on.
 */
import { CFR_172_101 } from "../sources.js";
import type { HazmatEntry } from "../types.js";
import { HMT_TABLE_ROWS } from "./hmt-generated.js";
import { SYNONYM_OVERLAY } from "./synonyms.js";

export const HMT_ENTRIES: HazmatEntry[] = HMT_TABLE_ROWS.map((row) => {
  const overlay = row.idNumber ? SYNONYM_OVERLAY[row.idNumber] : undefined;
  return {
    ...row,
    synonyms: overlay?.synonyms ?? [],
    cas: overlay?.cas,
    source: CFR_172_101,
  };
});
