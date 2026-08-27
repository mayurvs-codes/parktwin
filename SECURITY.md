# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅ |
| < 1.0   | ❌ |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Instead, report them privately:

- Email: **security@example.com**
- Or use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
  if enabled on this repository.

We will acknowledge receipt within 3 business days and aim to provide a
remediation plan within 14 days, depending on severity.

Please include:

- A description of the vulnerability and its impact.
- Steps to reproduce (or a proof of concept).
- Affected version(s).

## Known Security Posture

ParkTwin AI is **production-ready for an internal / trusted-network deployment**.
The current build has the following known gaps (tracked in
[`PROJECT_MEMORY.md` §16](PROJECT_MEMORY.md#16-final-system-audit-2026-07-20)):

1. **No authentication** — every REST router and the `/integration/ws` WebSocket
   accept any client. Anyone can read live ANPR/PII data and subscribe to feeds,
   and `/integration/process-frame|process-video` run full CV+OCR on
   unauthenticated input. **Add API-key/JWT auth (and a WS token/origin check)
   before any public exposure.**
2. **Verbose internal errors** — several routers return `detail=f"...: {str(e)}"`,
   leaking DB/file/decoder internals to clients. Normalise 5xx responses and log
   raw exceptions server-side only.
3. **Weak default `secret_key`** (`"CHANGE_ME_IN_PRODUCTION"`) — low impact
   because `SECRET_KEY` is not currently used for signing/JWT/sessions; a
   `critical` log warns only when `environment=="production"`.
4. **Unpinned `torch`** (`>=2.1.0`) — pin a tested upper bound to avoid resolving
   a version with known CVEs.

## Hardening Recommendations

- Change `SECRET_KEY` to a long random value.
- Set `ENVIRONMENT=production` and restrict CORS origins in
  `configs/settings.yaml`.
- Deploy behind a reverse proxy with TLS (see
  [docs/deployment/](docs/deployment/)).
- Add authentication and rate limiting before external exposure.
- Pin the ML stack (torch, paddleocr, easyocr, ultralytics) to tested versions.
