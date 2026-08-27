# HTTPS

Always serve ParkTwin AI over HTTPS in any non-local environment. TLS should be
terminated at the **reverse proxy** (see [Reverse proxy](reverse-proxy.md)); the
FastAPI app itself speaks plain HTTP behind it.

## Recommendations

- **Use a real certificate** from Let's Encrypt (Caddy automates this) or your
  organisation's CA. Avoid self-signed certs for production.
- **Redirect HTTP → HTTPS** at the proxy (HSTS optional but recommended).
- **Secure protocols only:** TLS 1.2+; disable old protocols and weak ciphers.
- **WebSocket over `wss://`.** The client connects to
  `wss://<host>/integration/ws?channel=...`; ensure the proxy forwards the
  `Upgrade`/`Connection` headers.
- **HSTS** header once HTTPS is confirmed working:
  `Strict-Transport-Security: max-age=63072000; includeSubDomains`.

## Example (Nginx)

```nginx
server {
    listen 80;
    server_name parking.example.com;
    return 301 https://$host$request_uri;   # force HTTPS
}
```

## Frontend

The Next.js frontend (`apps/web`) reads `NEXT_PUBLIC_API_BASE`. Set it to the
**HTTPS** origin of your backend (e.g. `https://parking.example.com`) so the
browser talks to the API over a secure origin. Mixed-content (HTTPS page → HTTP
API) is blocked by browsers.
