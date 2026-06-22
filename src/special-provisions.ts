/**
 * Decodes Column 7 special-provision codes (49 CFR 172.102) into their text.
 */
import { SPECIAL_PROVISIONS } from "./data/special-provisions-generated.js";
import { CFR_172_102 } from "./sources.js";
import type { SourceCitation } from "./types.js";

export interface DecodedSpecialProvision {
  code: string;
  known: boolean;
  text?: string;
  source: SourceCitation;
}

/** Decode a single special-provision code (case-insensitive, whitespace tolerant). */
export function decodeSpecialProvision(code: string): DecodedSpecialProvision {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, "");
  const text = SPECIAL_PROVISIONS[normalized];
  return {
    code: normalized,
    known: text !== undefined,
    text,
    source: CFR_172_102,
  };
}

/** Decode a list of codes (e.g. an entry's `specialProvisions`). */
export function decodeSpecialProvisions(codes: string[]): DecodedSpecialProvision[] {
  return codes.map(decodeSpecialProvision);
}
