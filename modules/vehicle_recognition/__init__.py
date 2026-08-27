"""
ParkTwin AI — Vehicle Recognition module (Module 1)
===================================================
Business logic for vehicle recognition & ANPR: detection, multi-object tracking,
vehicle classification (type / brand / color), license-plate detection, OCR,
plate fusion, snapshot generation, and persistence of recognition results.

Each sub-package is a single business capability. Shared infrastructure
(config, database, schemas, logging) lives in ``backend``; the AI pipeline
orchestration lives in ``engine``; cross-cutting utilities live in ``shared``.
"""
