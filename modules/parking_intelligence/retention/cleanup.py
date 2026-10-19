"""
ParkTwin AI — Data Retention & Cleanup Service (Phase 5)
==========================================================
Scheduled cleanup service for pruning stale voice logs, resolved violation
episodes, and temporary ANPR snapshot crops according to privacy & retention policies.
"""

from __future__ import annotations

import logging
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger("retention_cleanup")


def cleanup_stale_episodes(
    violation_engine,
    max_age_seconds: float = 86400.0,
    now: Optional[datetime] = None,
) -> int:
    """
    Remove resolved violation episodes older than max_age_seconds.
    Active episodes are NEVER purged.
    """
    current_time = now or datetime.now(timezone.utc)
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)

    purged = 0
    # Copy keys to allow mutation during iteration
    for ep_id, ep in list(violation_engine._episodes.items()):
        if ep["state"] == "RESOLVED" and ep.get("resolved_at"):
            res_at = ep["resolved_at"]
            if isinstance(res_at, str):
                res_at = datetime.fromisoformat(res_at)
            if res_at.tzinfo is None:
                res_at = res_at.replace(tzinfo=timezone.utc)

            age = (current_time - res_at).total_seconds()
            if age > max_age_seconds:
                del violation_engine._episodes[ep_id]
                purged += 1

    return purged


def cleanup_voice_announcements(
    voice_service,
    max_age_seconds: float = 86400.0,
    now: Optional[float] = None,
) -> int:
    """Prune voice announcement log entries older than max_age_seconds."""
    current_ts = now if now is not None else time.time()
    initial_len = len(voice_service._announcement_log)

    filtered = []
    for entry in voice_service._announcement_log:
        ts_str = entry.get("timestamp")
        keep = True
        if ts_str:
            try:
                entry_dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                age = current_ts - entry_dt.timestamp()
                if age > max_age_seconds:
                    keep = False
            except Exception:
                pass
        if keep:
            filtered.append(entry)

    voice_service._announcement_log.clear()
    voice_service._announcement_log.extend(filtered)
    return initial_len - len(voice_service._announcement_log)


def cleanup_plate_crops(
    directory_path: str,
    max_age_seconds: float = 86400.0,
    now: Optional[float] = None,
) -> int:
    """Delete temporary plate crop images older than max_age_seconds."""
    d = Path(directory_path)
    if not d.exists() or not d.is_dir():
        return 0

    current_ts = now if now is not None else time.time()
    deleted = 0

    for item in d.glob("*.*"):
        if item.is_file() and item.suffix.lower() in (".jpg", ".jpeg", ".png"):
            try:
                mtime = item.stat().st_mtime
                if (current_ts - mtime) > max_age_seconds:
                    item.unlink()
                    deleted += 1
            except Exception as e:
                logger.warning(f"Could not delete stale crop {item}: {e}")

    return deleted


def run_all_retention_cleanups(
    violation_engine,
    voice_service,
    crops_dir: Optional[str] = None,
    max_age_seconds: float = 86400.0,
) -> Dict[str, int]:
    """Run full retention maintenance pass."""
    eps_pruned = cleanup_stale_episodes(violation_engine, max_age_seconds=max_age_seconds)
    voice_pruned = cleanup_voice_announcements(voice_service, max_age_seconds=max_age_seconds)
    crops_pruned = cleanup_plate_crops(crops_dir, max_age_seconds=max_age_seconds) if crops_dir else 0

    return {
        "episodes_purged": eps_pruned,
        "voice_logs_purged": voice_pruned,
        "crops_deleted": crops_pruned,
    }
