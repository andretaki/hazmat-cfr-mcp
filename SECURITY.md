# Security Policy

## Supported Versions

Security fixes are applied to the latest released version.

## Reporting A Vulnerability

Please report vulnerabilities through GitHub Security Advisories once this repository is public.

If advisories are not available, open a minimal issue that says a private security report is needed, without including exploit details.

## Security Model

`hazmat-cfr-mcp` is intentionally low-permission:

- no API keys required
- no network calls at runtime
- no customer data
- no carrier contracts or rate data
- no NMFC data
- no filesystem writes from MCP tools

The server returns structured output from bundled public-data samples and CFR citations. It is not a legal or compliance certification engine.
