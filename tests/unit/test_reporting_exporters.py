"""
Unit tests — Reporting Engine exporters + storage (Module 5)
===========================================================
Verifies JSON / CSV / PDF exporters render a ``ReportView`` correctly and that
the storage layer persists + retrieves report records.
"""

import csv
import io
import json
import os

import pytest

from modules.reporting.exporters import get_exporter, available_formats, ensure_format
from modules.reporting.models import ReportView, Panel
from modules.reporting.storage import ReportStore
from modules.reporting.types import FORMAT_JSON, FORMAT_CSV, FORMAT_PDF
from modules.reporting.utils import new_report_id


def _sample_view() -> ReportView:
    return ReportView(
        report_type="parking_summary",
        title="Parking Summary",
        generated_at="2026-01-01T10:00:00",
        meta={"formats": ["json"]},
        panels=[
            Panel(kind="metrics", title="Facility Overview", metrics=[
                {"label": "Total Slots", "value": 5}, {"label": "Occupied", "value": 2},
            ]),
            Panel(kind="table", title="Recent Sessions", columns=["plate", "slot"],
                  headers={"plate": "Plate", "slot": "Slot"}, rows=[
                {"plate": "KA01AB1234", "slot": "slot_1"},
                {"plate": "KA02CD5678", "slot": "slot_2"},
            ]),
            Panel(kind="list", title="Notes", items=["a", "b"]),
        ],
    )


def test_formats_available():
    assert set(available_formats()) >= {FORMAT_JSON, FORMAT_CSV, FORMAT_PDF}


def test_ensure_format_rejects_bad():
    with pytest.raises(ValueError):
        ensure_format("docx")


def test_json_exporter():
    data = get_exporter(FORMAT_JSON).export(_sample_view())
    assert isinstance(data, bytes)
    parsed = json.loads(data.decode("utf-8"))
    assert parsed["report_type"] == "parking_summary"
    assert parsed["panels"][0]["kind"] == "metrics"
    assert len(parsed["panels"]) == 3


def test_csv_exporter():
    data = get_exporter(FORMAT_CSV).export(_sample_view())
    text = data.decode("utf-8")
    assert "Parking Summary" in text
    assert "Facility Overview" in text
    assert "Recent Sessions" in text
    # Parse the CSV to confirm it is well-formed.
    reader = list(csv.reader(io.StringIO(text)))
    assert any("Total Slots" in (row[0] if row else "") for row in reader)
    assert any("KA01AB1234" in r for r in reader)


def test_pdf_exporter():
    data = get_exporter(FORMAT_PDF).export(_sample_view())
    assert isinstance(data, bytes)
    assert data[:4] == b"%PDF"
    assert b"%%EOF" in data


@pytest.mark.asyncio
async def test_storage_roundtrip(tmp_path):
    db_path = str(tmp_path / "reports.db")
    store = ReportStore(db_path)
    await store.init()
    rec = await store.create(
        report_type="parking_summary",
        generated_at="2026-01-01T10:00:00",
        status="generated",
        file_path="/tmp/x.json",
        fmt="json",
        content={"report_type": "parking_summary", "sections": []},
        meta={"formats": ["json"]},
    )
    rid = rec["id"]
    assert rid

    got = await store.get(rid)
    assert got is not None
    assert got["type"] == "parking_summary"
    assert got["status"] == "generated"

    await store.update(rid, status="regenerating")
    got = await store.get(rid)
    assert got["status"] == "regenerating"

    listing = await store.list()
    assert len(listing) == 1

    hist = await store.list(order="DESC")
    assert hist[0]["id"] == rid

    await store.delete(rid)
    assert await store.get(rid) is None
    await store.close()


@pytest.mark.asyncio
async def test_storage_regenerate_keeps_id(tmp_path):
    store = ReportStore(str(tmp_path / "r.db"))
    await store.init()
    r1 = await store.create(report_type="occupancy", generated_at="t1", status="generated")
    rid = r1["id"]
    await store.update(rid, generated_at="t2", status="generated", content={"x": 1})
    r2 = await store.get(rid)
    assert r2["id"] == rid
    assert r2["generated_at"] == "t2"
    await store.close()
