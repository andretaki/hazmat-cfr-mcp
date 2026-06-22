# Data pipeline

The hazmat data this server serves is **generated**, not hand-maintained. It is
ingested from the official [eCFR versioner API](https://www.ecfr.gov/developers/documentation/api/v1)
and committed to the repository so that `npm install` needs no network access.

## What gets generated

Running the ingest writes three modules under `src/data/` (each carries a
`AUTO-GENERATED — DO NOT EDIT` banner):

| File | Source | Contents |
| --- | --- | --- |
| `hmt-generated.ts` | 49 CFR 172.101 | every Hazardous Materials Table row (`HMT_TABLE_ROWS`) |
| `special-provisions-generated.ts` | 49 CFR 172.102 | `code → text` map for every special provision |
| `cross-references-generated.ts` | 49 CFR 172.101 | "X, see Y" index redirects |

The curated synonym/CAS layer (`src/data/synonyms.ts`) is **not** generated — it
is maintained by hand and merged onto the table rows in `src/data/hmt.ts`.

## The pinned snapshot

`src/data/snapshot.ts` exports `ECFR_SNAPSHOT_DATE`. Every record is sourced from
the Title 49 revision in effect on that date, so results are reproducible and
citable to an exact revision.

## Refreshing the data

1. Bump `ECFR_SNAPSHOT_DATE` in `src/data/snapshot.ts`.
2. Run the ingest:
   ```bash
   npm run ingest          # uses the local raw-XML cache when present
   npm run ingest -- --fresh   # bypass the cache and re-fetch from eCFR
   ```
3. The script **fails the build** if any special-provision code referenced by the
   table does not resolve in 172.102, unless the code is listed in `KNOWN_ERRATA`
   in `scripts/ingest-ecfr.ts` (documented source inconsistencies, e.g. `IP16`).
4. Run the test suite — `test/data-integrity.test.ts` re-verifies entry counts,
   structural validity, referential integrity, and hand-checked spot-checks:
   ```bash
   npm test
   ```
5. Review the diff in `src/data/*-generated.ts`, then commit.

## How parsing works

The parsers live under `scripts/lib/` (build-time only; never shipped in `dist`):

- `parse-hmt.ts` — the 172.101 table is a single 14-column HTML table; each data
  row is a `<TR>` with exactly 14 `<TD>` cells in fixed column order. Rows are
  classified into entries (with a UN/NA id), Forbidden entries (no id), and
  "see" cross-references. They are unit-tested against `test/fixtures/hmt-sample.xml`.
- `parse-special-provisions.ts` — codes are defined across `<FP-1>`/`<FP1-2>`
  elements, code tables (IB/IP/T), and `<P>` paragraphs (TP/R). Tested against
  `test/fixtures/sp-sample.xml`.
