# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability or potential privacy leak in Health OS / `rep-gym-companion`, please report it responsibly.

**Do not open public GitHub issues for security vulnerabilities.**

### Disclosure Channels
1. **GitHub Private Vulnerability Reporting**: Use the "Report a vulnerability" button under the **Security** tab of this repository.
2. **Direct Contact**: Contact repository owner directly via the contact channel listed in [`CODEOWNERS`](file:///Users/lancer3d/Mohamed%20Hosny/rep-gym-companion/.github/CODEOWNERS).

### What to Include
When submitting a report, please include:
- A clear description of the vulnerability and its potential impact.
- Steps to reproduce or a minimal proof of concept (PoC).
- Whether any user data, Notion integration tokens, pairing secrets, or encryption keys are exposed.
- Any suggested mitigations or patches.

---

## Security Architecture & Recovery

This application is built around local-first privacy and end-to-end secret protection:
- **Local Storage**: Biometric/health metrics are kept in client-side IndexedDB/LocalStorage and encrypted backup envelopes.
- **Worker & Sync**: Zero third-party telemetry; Cloudflare Workers act as authenticated reverse proxies for Notion and sync mechanisms.
- **Incident Procedures**: Refer to [`docs/SECURITY_AND_PRIVACY.md`](file:///Users/lancer3d/Mohamed%20Hosny/rep-gym-companion/docs/SECURITY_AND_PRIVACY.md) and [`docs/OPERATIONS.md`](file:///Users/lancer3d/Mohamed%20Hosny/rep-gym-companion/docs/OPERATIONS.md) for credential rotation and emergency response playbooks.
