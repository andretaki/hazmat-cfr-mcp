# hazmat-cfr-mcp

Public 49 CFR hazmat tools for AI agents.

[![CI](https://github.com/andretaki/hazmat-cfr-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/andretaki/hazmat-cfr-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/hazmat-cfr-mcp.svg)](https://www.npmjs.com/package/hazmat-cfr-mcp)
[![MCP](https://img.shields.io/badge/MCP-stdio-blue)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Give Claude, Cursor, Codex, and other MCP clients a DOT hazmat lookup and validation tool backed by public 49 CFR citations.

Ask an agent:

> Is `UN1090, Acetone, 3, PG II` a complete basic hazmat shipping description?

It can return the proper shipping name, hazard class, packing group, label codes, validation warnings, and CFR citations in structured JSON.

Use it two ways:

- `hazmat-cfr-mcp`: MCP stdio server for agents
- `hazmat-cfr`: local CLI for humans, tests, and scripts

No API keys. No customer data. No carrier contracts. No NMFC. Public CFR citations only.

## 10-Second Try

```bash
npx -y hazmat-cfr-mcp --help
npx -y hazmat-cfr validate "UN1090, Acetone, 3, PG II"
```

Expected shape:

```json
{
  "confidence": "high",
  "matchedEntry": {
    "idNumber": "UN1090",
    "properShippingName": "Acetone",
    "hazardClass": "3",
    "packingGroup": "II",
    "labels": ["3"]
  },
  "issues": [],
  "citations": [
    { "title": "49 CFR 172.101 Hazardous Materials Table" }
  ]
}
```

## Why This Exists

Foundation models are weak at regulated shipping details. They may know what acetone is, but they should not guess whether a shipping description is complete or which CFR table field backs a label requirement.

This MCP server gives agents a small, explicit, cited hazmat tool surface:

- public 49 CFR lookup
- UN/NA number normalization
- basic shipping-description parsing
- label-code lookup
- conservative segregation warnings
- source explanations with eCFR links

## Install And Run

```bash
git clone https://github.com/YOUR_ORG/hazmat-cfr-mcp.git
cd hazmat-cfr-mcp
npm install
npm run build
npm run demo
```

Run as an MCP stdio server:

```bash
npx hazmat-cfr-mcp
```

Run the CLI:

```bash
npx hazmat-cfr lookup UN1090
npx hazmat-cfr validate "UN1090, Acetone, 3, PG II"
npx hazmat-cfr segregation 3 5.1 8
npx hazmat-cfr lq 3 II 1000 12 true
```

Local development:

```bash
npm run dev
npm run cli -- lookup UN1090
```

## Status

This is an early public-data-first MCP server. The current dataset is intentionally small and cited; the tool contracts, tests, CLI, and registry metadata are ready for broader CFR coverage.

Star the repo if you want agents that answer hazmat questions with citations instead of guesses.

## MCP Client Config

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

For a local checkout:

```json
{
  "mcpServers": {
    "hazmat-cfr": {
      "command": "node",
      "args": ["/absolute/path/to/hazmat-cfr-mcp/dist/server.js"]
    }
  }
}
```

## Tools

### `lookup_hazmat_entry`

Look up a public CFR sample row by UN/NA number or proper shipping name. Results include match scores and reasons so agents can distinguish exact ID matches from fuzzy name matches.

```json
{ "query": "UN1090" }
```

### `classify_shipping_description`

Parse free text into structured hazmat fields, then validate it.

```json
{ "text": "UN1090, Acetone, 3, PG II" }
```

### `validate_basic_hazmat_description`

Validate structured fields against the bundled public sample data.

```json
{
  "idNumber": "UN1830",
  "properShippingName": "Sulfuric acid with more than 51 percent acid",
  "hazardClass": "8",
  "packingGroup": "II"
}
```

### `get_label_requirements`

Return hazard label codes and caveats.

```json
{ "query": "acetone" }
```

### `check_basic_segregation`

Return conservative pairwise segregation findings for hazard classes.

```json
{ "hazardClasses": ["3", "5.1", "8"] }
```

### `check_limited_quantity_eligibility`

Conservative candidate screen for common Class 3/Class 8 liquid limited-quantity workflows.

```json
{
  "hazardClass": "3",
  "packingGroup": "II",
  "innerPackageMl": 1000,
  "outerGrossKg": 12,
  "isCombinationPackaging": true
}
```

This is intentionally not a compliance certification. It tells the agent whether the inputs look like an LQ candidate and returns review caveats with CFR citations.

### `explain_cfr_source`

Explain which public source backs a field or rule.

```json
{ "topic": "proper shipping name" }
```

## Example Prompts

- "Use hazmat-cfr to check whether `UN1090, Acetone, 3, PG II` is complete."
- "Look up sulfuric acid over 51 percent and tell me the label code and packing group."
- "Parse this shipping description and list missing fields: `Acetone flammable liquid`."
- "Check basic segregation warnings for Class 3, Class 5.1, and Class 8."
- "Is a Class 3 PG II liquid in 1 L inners and a 12 kg combination outer a limited quantity candidate?"

## Demo Output

```bash
npm run demo
```

The demo runs:

- Acetone / UN1090
- Sulfuric acid / UN1830
- an incomplete description that returns validation warnings

## Data Boundary

The bundled dataset is a small hand-curated public-data seed for demos and tests. It cites:

- 49 CFR 172.101 Hazardous Materials Table
- 49 CFR 172.202 shipping-paper description requirements
- 49 CFR 172.315 limited quantity markings
- 49 CFR 173.2a multiple-hazard classification
- 49 CFR 177.848 highway/rail segregation

Public source entry point:

```text
https://www.ecfr.gov/current/title-49/subtitle-B/chapter-I/subchapter-C/part-172/subpart-B/section-172.101
```

The long-term data path is an importer that regenerates normalized rows from public eCFR/government sources. The first version deliberately keeps the dataset small so the server, tool contracts, tests, and safety boundary are clear.

## MCP Registry

This repo includes:

- `server.json`
- `mcpName` in `package.json`
- GitHub Actions workflow for npm + MCP Registry publishing

The MCP Registry requires package metadata to match registry metadata. See `docs/LAUNCH.md` for the private-first release checklist.

## Non-Goals

This project is not:

- legal advice
- a replacement for trained hazmat employees
- a full compliance certification engine
- NMFC classification
- carrier contract or tariff analysis
- customer-specific shipping advice
- a store/product/order-data system

No private customer data, proprietary carrier terms, contract rates, NMFC tables, or internal business records belong in this repo.

## Long-Term Shape

The code is intentionally split into a reusable core and a thin MCP adapter:

```text
src/catalog.ts       lookup and search
src/parser.ts        shipping-description parser
src/validation.ts    deterministic validation issues
src/labels.ts        label-code helper
src/limited-quantity.ts conservative LQ candidate screen
src/segregation.ts   conservative compatibility checks
src/server.ts        MCP transport and tool registration
src/cli.ts           command-line interface
```

That keeps the package usable as:

- an MCP server today
- a future TypeScript library
- a CLI validator
- a public CFR data importer target

Library use after build:

```ts
import { defaultCatalog, validateBasicHazmatDescription } from "hazmat-cfr-mcp";

const lookup = defaultCatalog.lookup("UN1090");
const validation = validateBasicHazmatDescription({
  idNumber: "UN1090",
  properShippingName: "Acetone",
  hazardClass: "3",
  packingGroup: "II",
});
```

## Roadmap

- Full public eCFR table importer with provenance snapshots
- Better proper-shipping-name variant handling
- More complete 177.848 segregation matrix
- Expand limited quantity helper beyond common Class 3/Class 8 liquid cases
- CLI subcommand aliases and shell completions
- JSON Schema output contracts for every tool
- Example screenshots/GIF for MCP clients

## Safety

Before publishing:

```bash
npm test
npm run typecheck
npm run scan:secrets
```

`scan:secrets` is intentionally simple and local. For a release, also run a full scanner such as gitleaks or trufflehog on the clean repo.

## License

MIT
