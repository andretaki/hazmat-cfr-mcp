# Contributing

Contributions are welcome when they keep the project public-data-only and citation-first.

## Scope — what this project will and won't do

**In scope:** public 49 CFR data (Title 49 hazmat), source citations, deterministic and
structured tool output, parsing/validation of basic shipping descriptions.

**Out of scope (please don't open PRs for these):** NMFC classification, carrier/tariff or
contract-rate logic, customer/order/product data, and anything that amounts to **legal advice
or a compliance certification**. This server is an informational aid; it must never present
itself as authoritative for a shipping decision.

## Generated data — never hand-edit

`src/data/*-generated.ts` are produced by `npm run ingest` from the eCFR versioner API and are
marked `AUTO-GENERATED`. Never edit them by hand — change the parser or `ECFR_SNAPSHOT_DATE` and
regenerate. See [docs/data-pipeline.md](docs/data-pipeline.md). A monthly `eCFR drift check`
workflow re-ingests automatically and opens a PR when the regulation changes.

## Releasing

1. Bump `version` in `package.json` **and** `server.json` (keep them equal).
2. Update `CHANGELOG.md`.
3. Tag `vX.Y.Z` and push the tag — the publish workflow handles npm + the MCP Registry.

## Ground Rules

- Use public regulatory sources only.
- Include source citations for new data.
- Do not add NMFC tables, private carrier terms, customer data, order data, product catalog exports, or secrets.
- Keep tool outputs structured and deterministic.
- Add tests for parsing, validation, and data edge cases.

## Local Checks

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run scan:secrets
```

## Good First Issues

- Add more cited public 49 CFR sample rows.
- Improve proper-shipping-name matching.
- Expand conservative segregation examples.
- Add public-data importer scaffolding.
