"""
Architecture regression tests — D5 Phase 8 (final hardening).

These tests GUARANTEE the ownership invariant established across D5 Phases 4–7:

    Module 2 (parking_intelligence) is the SOLE authoritative owner of
    parking-slot assignment. No production code may derive slot ownership
    from Module 1 (vehicle_recognition) — neither from ``TrackManager`` nor
    from ``VehicleRecord.slot``. Module 3 (integration_layer) performs
    composition only; Module 4 (analytics) and Module 5 (reporting) are
    consumers only.

The suite is intentionally self-defending: it scans production source so a
silent re-introduction of Module 1 slot ownership fails the build, not just a
unit assertion on one function.

No ML weights, no database, no network — pure static + introspection checks
plus one isolated composition test against the real IntegrationService.
"""

from __future__ import annotations

import ast
import inspect
import re
from pathlib import Path
from typing import List, Set

from modules.integration_layer.adapters.vehicle_adapter import record_to_live
from modules.parking_intelligence import ParkingIntelligenceEngine
from modules.vehicle_recognition.tracking.track_manager import TrackManager

# ── Source scan helpers ───────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).resolve().parents[2]
PROD_DIRS = [REPO_ROOT / "modules", REPO_ROOT / "engine", REPO_ROOT / "backend"]
_EXCLUDE = {"__pycache__", "node_modules", ".git", "tests", "scripts", "docs", "frontend"}


def _prod_py_files() -> List[Path]:
    files: List[Path] = []
    for d in PROD_DIRS:
        if not d.exists():
            continue
        for p in d.rglob("*.py"):
            if any(part in _EXCLUDE for part in p.parts):
                continue
            files.append(p)
    return files


def _read(p: Path) -> str:
    return p.read_text(encoding="utf-8", errors="ignore")


# Slot-ownership surface that must NEVER exist on TrackManager (removed in D5 P7).
FORBIDDEN_TRACKMANAGER_MEMBERS: Set[str] = {
    "_init_slots",
    "_assign_slot",
    "_slot_assignments",
    "_occupied_slots",
    "_available_slots",
    "get_slot",
    "assign_slot",
    "release_slot",
    "occupied_slots",
    "available_slots",
}


class TestTrackManagerOwnsNoSlots:
    """TrackManager tracks only — no slot/occupancy bookkeeping (D5 Phase 7)."""

    def test_no_forbidden_slot_members(self):
        members = {name for name, _ in inspect.getmembers(TrackManager)}
        leaked = FORBIDDEN_TRACKMANAGER_MEMBERS & members
        assert not leaked, f"TrackManager still exposes slot ownership: {sorted(leaked)}"

    def test_stats_excludes_slot_keys(self):
        tm = TrackManager()
        assert set(tm.stats.keys()) == {"cameras", "total_active_tracks"}

    def test_only_tracking_state_attributes(self):
        tm = TrackManager()
        state_attrs = {
            name
            for name, val in vars(tm).items()
            if not name.startswith("__")
        }
        # Exactly the two tracking-only dicts; no slot/occupancy state.
        assert state_attrs == {"_trackers", "_entry_times"}


class TestModule2IsSoleSlotOwner:
    """Composition / public paths must source slot ownership from Module 2 only."""

    def test_record_to_live_ignores_record_slot_without_assignment(self):
        # A record carrying a Module 1 slot must NOT report it as owned when
        # Module 2 provides no assignment.
        class _Rec:
            tracking_id = 1
            slot = "P99"  # Module 1-only slot — must be ignored

            def to_api_dict(self):
                return {"tracking_id": self.tracking_id, "slot": self.slot,
                        "occupied": self.slot is not None}

        out = record_to_live([_Rec()])
        assert out[0]["slot"] is None
        assert out[0]["occupied"] is False

    def test_record_to_live_uses_module2_assignment(self):
        class _Rec:
            tracking_id = 7
            slot = "P99"  # must be overridden by Module 2

            def to_api_dict(self):
                return {"tracking_id": self.tracking_id, "slot": self.slot,
                        "occupied": self.slot is not None}

        assignment = {"camera_id": "cam", "assignments": {"7": "P07"}}
        out = record_to_live([_Rec()], assignment)
        assert out[0]["slot"] == "P07"
        assert out[0]["occupied"] is True


class TestNoProductionSlotOwnershipFromModule1:
    """Static guarantee: no production code writes/derives slot ownership from M1."""

    def _assignment_writes(self) -> List[str]:
        # `rec.slot =`, `record.slot =`, `vehicle.slot =` style ownership writes.
        pat = re.compile(r"\.\ slot\s*=")
        hits: List[str] = []
        for p in _prod_py_files():
            for i, line in enumerate(_read(p).splitlines(), 1):
                if pat.search(line):
                    hits.append(f"{p.relative_to(REPO_ROOT)}:{i}: {line.strip()}")
        return hits

    def test_no_slot_ownership_writes_in_production(self):
        hits = self._assignment_writes()
        assert not hits, (
            "Production code still writes slot ownership to a record/vehicle "
            f"(Module 1 ownership regression):\n" + "\n".join(hits)
        )

    def test_snapshot_uses_module2_slot_authoritatively(self):
        # engine/pipeline.py draws annotations; Module 2 (slot_for) must be
        # consulted BEFORE any Module 1 rec.slot fallback.
        src = _read(REPO_ROOT / "engine" / "pipeline.py")
        m_for = src.find("slot_for(int(rec.tracking_id))")
        m_fb = src.find("slot = rec.slot")
        assert m_for != -1, "snapshot no longer consults Module 2 slot_for()"
        assert m_fb != -1, "snapshot Module 1 fallback missing (unexpected)"
        assert m_for < m_fb, "snapshot consults Module 1 before Module 2 (ownership order reversed)"


class TestDependencyDirections:
    """M1↔M2 must stay decoupled; M4/M5 must not import M1."""

    def test_m1_does_not_import_m2(self):
        bad = [
            str(p.relative_to(REPO_ROOT)) + ":" + str(i)
            for p in _prod_py_files()
            if "vehicle_recognition" in p.parts
            for i, line in enumerate(_read(p).splitlines(), 1)
            if re.search(r"import .*parking_intelligence|from modules\.parking_intelligence", line)
        ]
        assert not bad, f"Module 1 imports Module 2 (illegal): {bad}"

    def test_m2_does_not_import_m1(self):
        bad = [
            str(p.relative_to(REPO_ROOT)) + ":" + str(i)
            for p in _prod_py_files()
            if "parking_intelligence" in p.parts
            for i, line in enumerate(_read(p).splitlines(), 1)
            if re.search(r"import .*vehicle_recognition|from modules\.vehicle_recognition", line)
        ]
        assert not bad, f"Module 2 imports Module 1 (illegal): {bad}"

    def test_analytics_reporting_do_not_import_m1(self):
        bad = []
        for mod in ("analytics", "reporting"):
            for p in _prod_py_files():
                if mod in p.parts:
                    for i, line in enumerate(_read(p).splitlines(), 1):
                        if re.search(r"import .*vehicle_recognition|from modules\.vehicle_recognition", line):
                            bad.append(f"{p.relative_to(REPO_ROOT)}:{i}")
        assert not bad, f"Analytics/Report import Module 1 (must consume via Integration): {bad}"


class _FakeSlotAssignment:
    assignments = {1: "P01"}


class _FakeRecord:
    def __init__(self, tracking_id, slot=None):
        self.tracking_id = tracking_id
        self.slot = slot

    def to_api_dict(self):
        return {"tracking_id": self.tracking_id, "slot": self.slot,
                "occupied": self.slot is not None}


class TestIntegrationCompositionBoundary:
    """Isolated composition test: IntegrationService.handle_frame returns
    Module-2-owned vehicles, never the Module 1 record slot."""

    async def test_handle_frame_returns_module2_owned_vehicles(self, monkeypatch):
        from modules.integration_layer.events.memory_bus import InMemoryEventBus
        from modules.integration_layer import services as m3_services
        from modules.integration_layer.services.integration_service import IntegrationService

        # handle_frame is otherwise fully faked; only list_sessions touches the
        # real DB. Isolate this composition test from DB setup.
        async def _fake_list_sessions(*a, **k):
            return []

        monkeypatch.setattr(m3_services.integration_service.parking_crud, "list_sessions", _fake_list_sessions)

        class _RecordingWS:
            def __init__(self):
                self.calls = []

            async def connect(self, *a, **k):
                pass

            async def disconnect(self, *a, **k):
                pass

            async def broadcast(self, channel, message):
                self.calls.append((channel, message))

            def channel_counts(self):
                return {}

        class _FakeEvents:
            def __init__(self):
                self._buffer = []

            def count(self):
                return 0

        class _FakeEngine:
            initialized = True

            def __init__(self):
                self._events = _FakeEvents()

            async def ingest_frame(self, db, camera_id, records):
                return {"assignment": _FakeSlotAssignment()}

            async def occupancy_summary(self, db, camera_id=None):
                return {"total_slots": 1, "occupied_slots": 1}

            async def statistics(self, db):
                return {}

        class _FakeSync:
            async def reconcile(self, db, camera_id=None):
                return {}

        svc = IntegrationService(
            event_bus=InMemoryEventBus(),
            ws_manager=_RecordingWS(),
            synchronizer=_FakeSync(),
            parking_engine=_FakeEngine(),
        )

        records = [_FakeRecord(tracking_id=1, slot="P99"), _FakeRecord(tracking_id=2, slot=None)]
        # A minimal fake DB that satisfies the awaited calls.
        fake_db = _FakeDB()
        result = await svc.handle_frame(fake_db, "camera_01", records)

        vehicles = result["vehicles"]
        # Track 1: owned by Module 2 (P01), NOT the record's own P99.
        assert vehicles[0]["slot"] == "P01"
        assert vehicles[0]["occupied"] is True
        # Track 2: no Module 2 assignment -> unoccupied, never derived from M1.
        assert vehicles[1]["slot"] is None
        assert vehicles[1]["occupied"] is False


class _FakeDB:
    """Stand-in AsyncSession: handle_frame only awaits ensure_initialized,
    which is a no-op because the fake engine reports initialized=True, plus
    occupancy/sync coroutines that are themselves faked."""

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False
