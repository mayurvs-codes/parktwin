# Reverse Proxy

ParkTwin AI is served behind a reverse proxy that terminates TLS and forwards to
the backend and frontend. Both **Nginx** and **Caddy** are provided as
deployable, configurable configurations.

## Routing model (same-origin, `/api` prefix)

The frontend and backend share one origin. The proxy:

- forwards **`/api/*`** → backend (`http://backend:8000/`), **stripping** the
  `/api` prefix, so the backend sees its normal routes (`/integration`,
  `/health`, `/analytics`, `/reports`, `/cameras`, `/vehicles`, `/parking`).
- forwards **everything else (`/*`)** → frontend (`http://frontend:3000`, the
  Next.js SPA).

Because the browser talks to a single origin, there is **no CORS** and **no mixed
content**, and frontend page routes (`/analytics`, `/reports`, …) never collide
with backend API routes. The frontend's `NEXT_PUBLIC_API_BASE` is built as
`https://<domain>/api` (the WebSocket becomes `wss://<domain>/api/integration/ws`).

> The backend's CORS middleware **drops `*`** and builds an explicit origin list
> from `configs/settings.yaml` (`api.cors_origins`). With the same-origin proxy
> this is not exercised; if you later split origins, configure
> `api.cors_origins` or terminate CORS at the proxy.

## Provided configurations

| Path | Use |
|------|-----|
| `docker/reverse-proxy/nginx/Dockerfile` | Nginx image |
| `docker/reverse-proxy/nginx/default.conf.template` | Nginx config (rendered with `${DOMAIN}`) |
| `docker/reverse-proxy/nginx/parktwin.conf.example` | Standalone host-oriented Nginx example |
| `docker/reverse-proxy/caddy/Dockerfile` | Caddy image |
| `docker/reverse-proxy/caddy/Caddyfile` | Caddy config (uses `{$DOMAIN}` / `{$EMAIL}`) |

Both are wired into the production Compose — Nginx by default, Caddy via the
`docker-compose.prod.caddy.yml` override.

## Nginx (containerised)

The template is rendered at container start (official nginx image `envsubst`),
substituting only `${DOMAIN}`. It provides:

- **HTTPS** (`listen 443 ssl`, TLS 1.2/1.3, modern ciphers) + HTTP→HTTPS redirect.
- **WebSocket** forwarding on `/api/integration/ws` (`Upgrade`/`Connection`
  headers, `proxy_read_timeout 3600s`).
- **Compression** (`gzip` for text/json/js/css/svg/woff2).
- **Security headers**: `Strict-Transport-Security`, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **Static caching**: `/_next/static/` → `Cache-Control: immutable` (1y).
- **Configurable certificates**: paths `/etc/nginx/certs/fullchain.pem` +
  `privkey.pem` mounted from the `certs` volume — no hardcoded certs/domains.

A commented HTTP-only server block is included for trusted-network testing
without a certificate.

### Provisioning Nginx certs

```bash
# Example with certbot (standalone), then mount into the `certs` volume:
certbot certonly --standalone -d parktwin.example.com
# Copy live/ fullchain.pem + privkey.pem into the volume mounted at /etc/nginx/certs
```

## Caddy (containerised, auto-TLS)

```caddy
{$DOMAIN:parktwin.example.com} {
    encode gzip
    header { Strict-Transport-Security … ; X-Content-Type-Options "nosniff" ; … }
    @nextstatic path /_next/static/*
    header @nextstatic Cache-Control "public, max-age=31536000, immutable"
    handle_path /api/* { reverse_proxy backend:8000 }   # strips /api
    handle            { reverse_proxy frontend:3000 }
}
```

Caddy obtains and renews Let's Encrypt certificates automatically from
`{$DOMAIN}` / `{$EMAIL}`. WebSocket upgrades are handled transparently.
`handle_path /api/*` strips the prefix before forwarding.

For **local / internal** testing without a public domain, set `DOMAIN=localhost`
and add `tls internal` inside the site block (self-signed cert).

## Standalone host usage

For Nginx directly on a host, copy `docker/reverse-proxy/nginx/parktwin.conf.example`
to `/etc/nginx/conf.d/`, replace `parktwin.example.com` and the cert paths, and
`nginx -t && systemctl reload nginx`. The Caddyfile can be used directly with
`caddy run --config docker/reverse-proxy/caddy/Caddyfile` after exporting
`DOMAIN` / `EMAIL`.

## Tips

- Block `/docs` and `/redoc` at the proxy if you do not want the API docs public.
- Keep generous `proxy_read_timeout` on `/api/` so idle WebSocket connections
  survive.
- Forward `X-Forwarded-*` so any future client-IP logging is correct.
