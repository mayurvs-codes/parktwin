# syntax=docker/dockerfile:1

# ===========================================================================
# ParkTwin AI — Caddy reverse proxy image
# ---------------------------------------------------------------------------
# Copies the Caddyfile into the official Caddy image (default /etc/caddy/Caddyfile).
# Caddy auto-obtains + renews TLS for ${DOMAIN}. ${DOMAIN}/${EMAIL} come from env.
# ===========================================================================

FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443
