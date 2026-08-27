"""
Reproduction / validation for:
  sqlite3.OperationalError: database is locked  (SELECT vehicles WHERE tracking_id = ?)

Uses the project's real Base/Vehicle and mirrors backend.database.session's
exact engine + session configuration (sqlite+aiosqlite, pool_pre_ping,
async_sessionmaker, autoflush=False, expire_on_commit=False) against a temp DB.

To reproduce the production condition faithfully and quickly: the production
error appears when SQLite's write lock is held LONGER than the busy budget while
other operations queue (the dashboard polls every ~5s; multiple cameras' process
requests run concurrently). We model a *contended* DB by lowering the busy
timeout (connect_args timeout) so a short-but-sustained held lock is enough to
exceed it — exactly the multi-camera concurrency the task describes.

Scenario A (OLD): two writer sessions each hold ONE transaction open across the
  ENTIRE loop (add/flush, commit only at the very end) — exactly what
  process_video did before the fix — plus concurrent readers doing
  `SELECT vehicles WHERE tracking_id = ?`. Expect: OperationalError: database
  is locked on the contending writer/reader.

Scenario B (NEW): same writers but commit the transaction every iteration
  (per-frame commit). Expect: no lock.
"""

import asyncio
import tempfile
import os
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from backend.database.models import Base, Vehicle

TMP = tempfile.gettempdir()
URL_A = f"sqlite+aiosqlite:///{os.path.join(TMP, 'repro_lock_a.db')}"
URL_B = f"sqlite+aiosqlite:///{os.path.join(TMP, 'repro_lock_b.db')}"
ITERATIONS = 30
SLEEP_PER_ITER = 0.05  # stands in for per-frame inference time
BUSY_TIMEOUT = 0.3     # model a contended DB: 30s budget effectively exhausted


def make_engine(url):
    return create_async_engine(
        url, echo=False, pool_pre_ping=True,
        connect_args={"timeout": BUSY_TIMEOUT},
    )


async def setup(engine):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def reader(rid, SessionLocal, results):
    try:
        async with SessionLocal() as s:
            for _ in range(ITERATIONS * 3):
                res = await s.execute(
                    select(Vehicle).where(Vehicle.tracking_id == 999999)
                )
                res.scalar_one_or_none()
        results.append((rid, "ok", None))
    except Exception as e:
        results.append((rid, type(e).__name__, str(e)))


async def writer(rid, SessionLocal, commit_per_iter, results):
    try:
        async with SessionLocal() as s:
            for i in range(ITERATIONS):
                # distinct tracking_id per writer so no duplicate-row noise
                v = Vehicle(license_plate=f"KA{rid}{i:02d}ZZ", tracking_id=rid * 1000 + i)
                s.add(v)
                await s.flush()  # opens/continues the write transaction
                if commit_per_iter:
                    await s.commit()  # NEW: release the SQLite write lock each frame
                await asyncio.sleep(SLEEP_PER_ITER)  # inference time
            if not commit_per_iter:
                await s.commit()  # OLD: only at the very end of the whole pipeline
        results.append((f"w{rid}", "ok", None))
    except Exception as e:
        results.append((f"w{rid}", type(e).__name__, str(e)))


async def run(label, url, commit_per_iter):
    engine = make_engine(url)
    await setup(engine)
    SessionLocal = async_sessionmaker(
        bind=engine, class_=AsyncSession,
        autocommit=False, autoflush=False, expire_on_commit=False,
    )
    results = []
    # TWO concurrent writers (multi-camera process-video) + four readers
    # (dashboard polling / synchronizer) — exactly the task's concurrency.
    writers = [asyncio.create_task(writer(n, SessionLocal, commit_per_iter, results))
               for n in range(2)]
    readers = [asyncio.create_task(reader(f"r{n}", SessionLocal, results))
               for n in range(4)]
    await asyncio.gather(*writers, return_exceptions=True)
    await asyncio.gather(*readers, return_exceptions=True)
    await engine.dispose()
    locks = [r for r in results if "OperationalError" in r[1] or "locked" in str(r[2])]
    print(f"\n=== {label} (commit_per_iter={commit_per_iter}) ===")
    for r in results:
        print(f"  reader {r[0]}: {r[1]}" + (f" -> {r[2]}" if r[2] else ""))
    print(f"  LOCK ERRORS: {len(locks)} / {len(results)} readers")
    return len(locks)


async def main():
    db_a = os.path.join(TMP, "repro_lock_a.db")
    db_b = os.path.join(TMP, "repro_lock_b.db")
    for p in (db_a, db_b):
        if os.path.exists(p):
            os.remove(p)
    a = await run("SCENARIO A — transaction spans whole pipeline (OLD)", URL_A, False)
    for p in (db_a,):
        if os.path.exists(p):
            os.remove(p)
    b = await run("SCENARIO B — commit per frame (FIXED)", URL_B, True)
    print("\n=== RESULT ===")
    print(f"  OLD produced lock errors: {a > 0}")
    print(f"  FIXED produced lock errors: {b == 0}")
    assert a > 0, "Expected the OLD behavior to reproduce 'database is locked'"
    assert b == 0, "Expected the FIXED behavior to produce NO lock errors"
    print("  VALIDATION PASSED: root cause reproduced and fix confirmed.")


if __name__ == "__main__":
    asyncio.run(main())
