# Launch Plan

## Private Review

1. Push this repository as private.
2. Confirm CI passes.
3. Review README, examples, and package metadata on GitHub.
4. Confirm no private data appears in GitHub code search.

## Public Launch

1. Make the GitHub repo public.
2. Add GitHub topics:
   - `mcp`
   - `model-context-protocol`
   - `hazmat`
   - `dot`
   - `49-cfr`
   - `ecfr`
   - `dangerous-goods`
   - `logistics`
   - `chemicals`
3. Publish the npm package.
4. Publish `server.json` to the MCP Registry.
5. Submit to MCP lists and aggregators.

## Announcement Copy

```text
I built hazmat-cfr-mcp: an MCP server that lets AI agents check basic DOT hazmat shipping descriptions against public 49 CFR citations.

Example:
"UN1090, Acetone, 3, PG II"

It returns structured JSON with proper shipping name, hazard class, packing group, labels, validation warnings, and eCFR links.

No API keys. No customer data. No carrier contracts. Public 49 CFR data only.
```

## Star Mechanics

- Show a useful prompt in the first screen.
- Keep install under one minute.
- Lead with the zero-secret security model.
- Ask early users to star only if it saves them from a hazmat lookup.
