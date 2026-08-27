# syntax=docker/dockerfile:1

# ===========================================================================
# ParkTwin AI — Nginx reverse proxy image
# ---------------------------------------------------------------------------
# Copies the *.template into /etc/nginx/templates; the official nginx image
# renders it to /etc/nginx/conf.d at start, substituting ${DOMAIN} from the
# container environment.
# ===========================================================================

FROM nginx:1.27-alpine

# Remove the default site so only our rendered config is served.
RUN rm -f /etc/nginx/conf.d/default.conf

COPY default.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80 443
