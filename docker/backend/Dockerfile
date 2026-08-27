# syntax=docker/dockerfile:1

# ===========================================================================
# ParkTwin AI — Backend container (Module 1: Vehicle Recognition & ANPR)
# ---------------------------------------------------------------------------
# Containerises the existing repository WITHOUT changing application
# behaviour. The same code that runs locally runs here; only the runtime
# packaging differs.
#
# Python 3.12 (not 3.13): the ML stack (torch / paddlepaddle / paddleocr /
# easyocr) ships reliable manylinux wheels for 3.12. The project only
# requires >=3.10.
#
# Build-cache strategy
# --------------------
# * System deps, the heavy ML dependency install, the small runtime extras,
#   and the test tooling are each in their OWN layer. Editing application
#   code or tests therefore never invalidates the torch/paddleocr download.
# * pip uses a BuildKit cache mount (--mount=type=cache). The ML wheels are
#   downloaded ONCE and reused across rebuilds. The cache lives OUTSIDE the
#   image layers, so the final image stays lean (no need for PIP_NO_CACHE_DIR).
# * The editable install (`pip install -e .`) is REQUIRED: the config loader
#   resolves the repo root via Path(__file__).parents[3]
#   (backend/core/config/loader.py -> /app). Keeping the source on disk at
#   /app preserves that resolution exactly as in local development.
# ===========================================================================

# ---- Build arguments ------------------------------------------------------
# UID/GID for the (non-root) runtime user. Default 10001 for production.
# In dev, docker compose passes the host UID/GID so bind-mounted volumes are
# owned by the same user and remain writable.
ARG APP_UID=10001
ARG APP_GID=10001
ARG PYTHON_VERSION=3.12

FROM python:${PYTHON_VERSION}-slim

# ARGs are stage-scoped; re-declare so they are usable after FROM.
ARG APP_UID
ARG APP_GID

# ---- System libraries -----------------------------------------------------
# opencv-headless, paddleocr, easyocr and torch need a handful of shared
# libraries at runtime. Installing only what is required keeps the image lean.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libgl1 \
        libsm6 \
        libxext6 \
        libxrender1 \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# ---- Python environment ---------------------------------------------------
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# ---- Build backend (no build isolation; reused via cache) -----------------
# Pre-install the build backend so `pip install -e .` does not spin up an
# isolated environment and re-download setuptools/wheel on every build.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip setuptools wheel

# ---- Application source (packages + metadata) -----------------------------
# Copy project metadata and the importable packages first so dependency
# installation is cached independently of test/asset changes. README.md is
# copied too because pyproject.toml references it as the project readme.
COPY pyproject.toml ./
COPY README.md ./
COPY backend ./backend
COPY engine ./engine
COPY modules ./modules
COPY shared ./shared
COPY configs ./configs

# ---- Python dependencies (heavy, change rarely) ---------------------------
# Editable install: installs the declared ML stack into site-packages and
# links the project source in place (keeps /app/backend/.../loader.py on disk
# so config-root resolution keeps working). --no-build-isolation reuses the
# build backend we just installed.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-build-isolation -e .

# ---- Runtime extras (small; declared separately for caching) --------------
# Also listed in pyproject.toml; installed explicitly here so the image is
# self-sufficient even before `pip install -e .` resolves them.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-build-isolation aiosqlite python-multipart Pillow

# ---- Remaining files: tests, scripts, docs, env examples ------------------
COPY . .

# ---- Test tooling (dev image; cheap layer, isolated from ML deps) ---------
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-build-isolation pytest pytest-asyncio

# ---- Runtime directories (also mounted as volumes in dev/prod) -------------
# /app/data and /app/reports_output are created here (and owned by appuser by
# the chown below) so that named volumes mounted at these paths in production
# are populated by Docker with the correct (non-root) ownership on first mount.
RUN mkdir -p /app/backend/logs /app/backend/outputs /app/backend/uploads /app/backend/snapshots \
             /app/models /app/datasets /app/data /app/reports_output /app/logs

# ---- Non-root user --------------------------------------------------------
# Run as a dedicated, unprivileged user. The whole app tree is owned by it so
# the service can write its SQLite DB, logs and outputs.
# --create-home gives appuser a writable $HOME (/home/appuser). PaddleOCR and
# EasyOCR download their inference model caches into $HOME at runtime, so the
# directory MUST exist and be owned by the runtime user (v1.0.1 inference fix).
RUN groupadd --gid "${APP_GID}" appgroup \
    && useradd --uid "${APP_UID}" --gid appgroup --create-home --shell /usr/sbin/nologin appuser \
    && chown -R appuser:appgroup /app /home/appuser
USER appuser

# ---- Health check ---------------------------------------------------------
# GET /health returns HTTP 200 once the service is listening (DB connection is
# best-effort and does not block the 200). The slim image has no curl, so we
# probe with python's stdlib.
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD python -c "import sys,urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5).status == 200 else 1)"

EXPOSE 8000

# Default launch. Overridden by docker compose for dev (same command).
CMD ["uvicorn", "backend.app.app:app", "--host", "0.0.0.0", "--port", "8000"]
