# hazmat-cfr-mcp

The complete 49 CFR 172.101 Hazardous Materials Table, as an MCP tool for AI agents — every field cited to a pinned eCFR revision.

[![CI](https://github.com/andretaki/hazmat-cfr-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/andretaki/hazmat-cfr-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/hazmat-cfr-mcp.svg)](https://www.npmjs.com/package/hazmat-cfr-mcp)
[![MCP](https://img.shields.io/badge/MCP-stdio-blue)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

![hazmat-cfr-mcp demo](https://raw.githubusercontent.com/andretaki/hazmat-cfr-mcp/main/demo.gif)

Give Claude, Cursor, Codex, and other MCP clients a DOT hazmat lookup, classification, and validation tool backed by the **entire** Hazardous Materials Table — not a sample.

Ask an agent:

> Can I ship 60 L of acetone on a cargo-only aircraft? What are its label, packing, and special-provision requirements?

It returns the proper shipping name, hazard class, packing group, label codes, packaging references, aircraft limits, vessel stowage, **decoded special provisions**, and CFR citations — in structured JSON.

Use it two ways:

- `hazmat-cfr-mcp` — MCP stdio server for agents
- `hazmat-cfr` — local CLI for humans, tests, and scripts

No API keys. No customer data. No carrier contracts. No NMFC. Public CFR only.

## What's in the box

- **~2,700 Hazardous Materials Table entries** (49 CFR 172.101) — every UN/NA entry plus Forbidden materials, ingested directly from the official eCFR.
- **Special-provision decoding** — all ~420 Column 7 codes (49 CFR 172.102: numeric, A, B, IB, IP, N, R, T, TP, W) expanded into their regulatory text.
- **Legend decoding** — Column 1 symbols (`+ A D G I W`), Column 10A vessel stowage categories, and Columns 8A–8C packaging references resolved to part-173 sections.
- **Pinned to a dated eCFR snapshot** so every answer is reproducible and citable to an exact revision.
- **A curated synonym/CAS layer** so "IPA", "muriatic acid", or "bleach" resolve — kept clearly separate from regulatory data.

## 10-second try

```bash
npx -y hazmat-cfr-mcp --help
npx -y hazmat-cfr lookup UN1088          # not in any "sample" — the whole table is here
npx -y hazmat-cfr decode-sp IB2 T8 A3
```

## Why this exists

Foundation models are weak at regulated shipping details. They may know what acetone is, but they should not guess whether a shipping description is complete, what `IB2` means, or which CFR field backs a label requirement.

This server gives agents an explicit, cited, **complete** hazmat tool surface so they answer with the regulation instead of a hallucination.

## Accuracy & verification

This is a compliance-adjacent tool, so correctness is enforced by the build, not by hope:

- The dataset is **generated** from the eCFR versioner API and committed to the repo (see [docs/data-pipeline.md](docs/data-pipeline.md)). It is never hand-edited.
- The ingest **fails** if any special-provision code referenced by the table does not resolve in 172.102 (documented source errata, e.g. `IP16`, are resolved to an explicit "referenced but not defined" note — never fabricated).
- `test/data-integrity.test.ts` re-checks entry counts, structural validity, referential integrity, and ~22 hand-verified spot-checks on every run.
- The parsers are unit-tested against fixtures in `test/fixtures/`.

> ⚠️ **Disclaimer.** This is an informational aid that surfaces public CFR text. It is **not legal advice**, not a compliance certification, and not a substitute for a trained hazmat employee. Always verify any shipping decision against the current [eCFR](https://www.ecfr.gov/current/title-49).

## Install and run

```bash
npx hazmat-cfr-mcp            # MCP stdio server
npx hazmat-cfr lookup UN1090  # CLI
```

From a clone:

```bash
git clone https://github.com/andretaki/hazmat-cfr-mcp.git
cd hazmat-cfr-mcp
npm install
npm run build
npm run demo
```

CLI:

```bash
npx hazmat-cfr lookup UN1090
npx hazmat-cfr validate "UN1090, Acetone, 3, PG II"
npx hazmat-cfr segregation 3 5.1 8
npx hazmat-cfr lq 3 II 1000 12 true
npx hazmat-cfr decode-sp IB2 T8 A3
npx hazmat-cfr decode-pkg nonBulk 202
```

## MCP client config

```json
{
  "mcpServers": {
    "hazmat-cfr": {
      "command": "npx",
      "args": ["hazmat-cfr-mcp"]
    }
  }
}
```

For a local checkout, point `command` at `node` and `args` at `dist/server.js`.

## Tools

| Tool | Purpose |
| --- | --- |
| `lookup_hazmat_entry` | Look up by UN/NA number or proper shipping name; returns matching entries with decoded symbols and special provisions. |
| `classify_shipping_description` | Parse free text into structured fields, then validate it. |
| `validate_basic_hazmat_description` | Validate structured fields against the full 172.101 table. |
| `get_label_requirements` | Return hazard label codes and caveats. |
| `check_basic_segregation` | Conservative pairwise segregation findings (49 CFR 177.848 subset). |
| `check_limited_quantity_eligibility` | Conservative Class 3/Class 8 LQ-candidate screen. |
| `decode_special_provision` | Expand Column 7 codes (e.g. `IB2`, `T8`, `A3`) into 49 CFR 172.102 text. |
| `decode_packaging_reference` | Resolve a Column 8A/8B/8C value to its part-173 section. |
| `explain_cfr_source` | Explain which public CFR source backs a field or rule. |

Example call:

```json
{ "query": "UN1090" }
```

## Library use

```ts
import { defaultCatalog, decodeSpecialProvisions, ECFR_SNAPSHOT_DATE } from "hazmat-cfr-mcp";

const acetone = defaultCatalog.lookup("UN1090");
const provisions = decodeSpecialProvisions(acetone.entries[0].specialProvisions);
console.log(`Backed by eCFR snapshot ${ECFR_SNAPSHOT_DATE}`);
```

## Refreshing the data

```bash
# bump ECFR_SNAPSHOT_DATE in src/data/snapshot.ts, then:
npm run ingest -- --fresh
npm test
```

See [docs/data-pipeline.md](docs/data-pipeline.md) for the full pipeline.

## Non-goals

Not legal advice; not a replacement for trained hazmat employees; not a full compliance certification engine; not NMFC classification; not carrier contract/tariff analysis. No private customer data, contract rates, or internal business records belong in this repo.

## Safety

```bash
npm test
npm run typecheck
npm run scan:secrets
```

## Maintainer

Andre Taki — [Alliance Chemical](https://alliancechemical.com) — andre@alliancechemical.com

## License

MIT — the underlying 49 CFR text is a public-domain work of the U.S. government.
