/**
 * Pinned eCFR snapshot.
 *
 * Every record in the generated datasets is sourced from the Title 49 revision
 * in effect on this date. Bump this constant and re-run `npm run ingest` to
 * refresh the data (see docs/data-pipeline.md). Keeping it pinned makes every
 * lookup reproducible and citable to an exact revision of the regulation.
 */
export const ECFR_SNAPSHOT_DATE = "2026-06-17";

/** eCFR versioner "full content" endpoint for a single Title 49 section. */
export function ecfrSectionXmlUrl(section: string, date: string = ECFR_SNAPSHOT_DATE): string {
  const params = new URLSearchParams({
    subtitle: "B",
    chapter: "I",
    subchapter: "C",
    part: section.split(".")[0],
    section,
  });
  return `https://www.ecfr.gov/api/versioner/v1/full/${date}/title-49.xml?${params.toString()}`;
}

/** Human-facing eCFR "current" URL for a Title 49 section (for citations). */
export function ecfrSectionUrl(section: string): string {
  const part = section.split(".")[0];
  return `https://www.ecfr.gov/current/title-49/section-${section}`;
}
