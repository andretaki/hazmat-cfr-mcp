# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] - 2026-06-22

### Added
- Maintainer contact and Alliance Chemical attribution (`author` in `package.json`,
  README maintainer line).

## [0.2.1] - 2026-06-22

### Fixed
- Shortened the `server.json` description to the MCP Registry's 100-character limit so the
  server publishes to the registry.

## [0.2.0] - 2026-06-22

### Added
- Complete **49 CFR 172.101 Hazardous Materials Table** (~2,700 entries, including Forbidden
  materials), ingested from the eCFR versioner API and pinned to a dated snapshot.
- Decoding of all ~420 **49 CFR 172.102 special-provision codes** into their regulatory text.
- Legend decoding for Column 1 symbols, Column 10A vessel stowage, and Columns 8A–8C packaging
  references; new tools `decode_special_provision` and `decode_packaging_reference` (+ CLI
  `decode-sp`/`decode-pkg`).
- Curated synonym/CAS overlay, kept separate from regulatory data.
- Ingest pipeline (`scripts/ingest-ecfr.ts`) with a referential-integrity gate; data-integrity
  and parser tests; `docs/data-pipeline.md`.

### Changed
- Catalog now loads the full generated dataset with id indexing; lookup scoring is word-boundary
  and numeric aware (fixes e.g. "sulfur" matching "sulfuric acid").
- README rewritten around the full dataset; added a not-legal-advice disclaimer.

### Removed
- The 7-entry sample dataset (`src/data/cfr-sample.ts`).

## [0.1.0] - 2026-06-21

### Added
- Initial MCP server: 7-entry sample dataset, parser, validation, labels, segregation, and
  limited-quantity screening with public CFR citations.

[0.2.2]: https://github.com/andretaki/hazmat-cfr-mcp/releases/tag/v0.2.2
[0.2.1]: https://github.com/andretaki/hazmat-cfr-mcp/releases/tag/v0.2.1
[0.2.0]: https://github.com/andretaki/hazmat-cfr-mcp/releases/tag/v0.2.0
[0.1.0]: https://github.com/andretaki/hazmat-cfr-mcp/releases/tag/v0.1.0
