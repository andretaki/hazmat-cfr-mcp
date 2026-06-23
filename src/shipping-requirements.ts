/**
 * Composite "what does it take to ship this?" answer.
 *
 * Resolves a query to a 49 CFR 172.101 entry and assembles identity, labels,
 * decoded special provisions, decoded packaging references, vessel stowage,
 * placarding, and citations into a single structured result with a readable
 * summary. It composes existing helpers — no data is re-derived here.
 */
import { defaultCatalog } from "./catalog.js";
import { decodePackagingReference, decodeSymbol, decodeVesselStowageLocation } from "./legends.js";
import { getPlacard } from "./placarding.js";
import { decodeSpecialProvisions } from "./special-provisions.js";
import { CFR_172_101 } from "./sources.js";
import type { Confidence, HazmatEntry, SourceCitation } from "./types.js";

const NOT_LEGAL_ADVICE =
  "Informational aid based on public 49 CFR text — not legal advice or a compliance certification. Verify against the current eCFR.";

function dedupeCitations(citations: SourceCitation[]): SourceCitation[] {
  const seen = new Set<string>();
  const out: SourceCitation[] = [];
  for (const c of citations) {
    if (c && !seen.has(c.url)) {
      seen.add(c.url);
      out.push(c);
    }
  }
  return out;
}

function composeEntry(entry: HazmatEntry) {
  const placard = getPlacard(entry.hazardClass);
  const packaging = {
    exceptions: decodePackagingReference("exceptions", entry.packaging.exceptions),
    nonBulk: decodePackagingReference("nonBulk", entry.packaging.nonBulk),
    bulk: decodePackagingReference("bulk", entry.packaging.bulk),
  };
  const specialProvisions = decodeSpecialProvisions(entry.specialProvisions);
  const vesselStowage = entry.vesselStowage.location
    ? { ...decodeVesselStowageLocation(entry.vesselStowage.location), other: entry.vesselStowage.other }
    : undefined;

  return {
    composed: {
      idNumber: entry.idNumber,
      properShippingName: entry.properShippingName,
      hazardClass: entry.hazardClass,
      packingGroup: entry.packingGroup,
      forbidden: entry.forbidden ?? false,
      symbols: (entry.symbols ?? []).map(decodeSymbol),
      subsidiaryRisks: entry.subsidiaryRisks,
      labels: entry.labels,
      synonyms: entry.synonyms,
      cas: entry.cas,
      specialProvisions,
      packaging,
      quantityLimitationsAircraft: entry.quantityLimitations,
      vesselStowage,
      placard,
      limitedQuantity: ["3", "8"].includes(entry.hazardClass)
        ? "May qualify as a limited quantity — use check_limited_quantity_eligibility with package details to screen."
        : "Limited-quantity screening in this server currently covers Class 3 and Class 8 only.",
    },
    citations: dedupeCitations([
      CFR_172_101,
      placard.citation,
      ...specialProvisions.map((p) => p.source),
      packaging.exceptions.citation,
      packaging.nonBulk.citation,
      packaging.bulk.citation,
    ].filter(Boolean) as SourceCitation[]),
  };
}

export interface ShippingRequirementsResult {
  query: string;
  found: boolean;
  confidence: Confidence;
  requirements?: ReturnType<typeof composeEntry>["composed"];
  alternatives?: Array<{ idNumber?: string; properShippingName: string }>;
  caveats: string[];
  citations: SourceCitation[];
  summary: string;
}

export function getShippingRequirements(query: string): ShippingRequirementsResult {
  const lookup = defaultCatalog.lookup(query);
  if (lookup.entries.length === 0) {
    return {
      query,
      found: false,
      confidence: "none",
      caveats: [NOT_LEGAL_ADVICE],
      citations: [CFR_172_101],
      summary: `No 49 CFR 172.101 entry found for "${query}". Try a UN/NA number or exact proper shipping name.`,
    };
  }

  const entry = lookup.entries[0];
  const { composed, citations } = composeEntry(entry);

  const caveats = [NOT_LEGAL_ADVICE];
  if (composed.forbidden) {
    caveats.unshift("⚠ This material is FORBIDDEN for transportation under 49 CFR 172.101.");
  }
  if (composed.placard.threshold !== "none") {
    caveats.push("Placarding shown is by hazard class only; aggregate-weight, mixed-load (DANGEROUS), and subsidiary-hazard placards require reviewing the full shipment.");
  }

  const id = composed.idNumber ?? "(forbidden — no ID)";
  const pg = composed.packingGroup ? `, PG ${composed.packingGroup}` : "";
  const placardStr = composed.placard.placard
    ? ` Placard: ${composed.placard.placard} (${composed.placard.threshold}).`
    : "";
  const nonBulk = composed.packaging.nonBulk.authorized ? ` Non-bulk packaging: ${composed.packaging.nonBulk.note.replace(/^.*?: /, "")}` : "";
  const summary = composed.forbidden
    ? `${composed.properShippingName} is FORBIDDEN for transportation (49 CFR 172.101).`
    : `${id} ${composed.properShippingName} — Class ${composed.hazardClass}${pg}. Labels: ${composed.labels.join(", ") || "none"}.${placardStr}${nonBulk}`;

  return {
    query,
    found: true,
    confidence: lookup.confidence,
    requirements: composed,
    alternatives: lookup.entries.slice(1, 4).map((e) => ({ idNumber: e.idNumber, properShippingName: e.properShippingName })),
    caveats,
    citations,
    summary,
  };
}
