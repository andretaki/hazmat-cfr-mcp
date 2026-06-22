# Contributing

Contributions are welcome when they keep the project public-data-only and citation-first.

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
