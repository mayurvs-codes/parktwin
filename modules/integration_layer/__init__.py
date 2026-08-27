"""
ParkTwin AI — Integration Layer (Module 3)
=========================================
The Integration Layer is the **only** communication boundary between the
business modules (Module 1 — Vehicle Recognition, Module 2 — Parking
Intelligence) and external consumers (REST clients, WebSocket subscribers,
downstream analytics).

It deliberately contains **no business logic** — it never re-implements
detection, tracking, mapping, or occupancy. Instead it:

  - gateway/     : a single unified REST API that consumes the modules
  - adapters/    : map module outputs (ORM / records) to integration DTOs
  - events/      : an interface-based internal event bus (Redis-ready)
  - websocket/   : live push for vehicles / occupancy / sessions / events
  - sync/        : keeps Vehicle <-> Session <-> Slot <-> Event consistent
  - services/    : orchestrates the above around each business frame

Each sub-package owns a single responsibility and depends only on shared
infrastructure (``backend``) and the public APIs of Modules 1/2 — never on
their internal business code.
"""
