import sqlite3
import uuid
from datetime import datetime

con = sqlite3.connect("parktwin.db")
cur = con.cursor()

# 1. Update vehicles table columns if missing
cols = [c[1] for c in cur.execute('PRAGMA table_info("vehicles")').fetchall()]
if "prototype_id" not in cols:
    cur.execute('ALTER TABLE "vehicles" ADD COLUMN prototype_id VARCHAR(32)')
    print("Added prototype_id to vehicles table")
if "status" not in cols:
    cur.execute('ALTER TABLE "vehicles" ADD COLUMN status VARCHAR(32) DEFAULT "parked"')
    print("Added status to vehicles table")

# 2. Seed cameras: CAM-01, CAM-02, CAM-03
cameras_data = [
    ("CAM-01", "B2 Entrance Gate", "/videos/cam1_entry_gate.mp4", "entrance", "ONLINE", 25),
    ("CAM-02", "B2 Parking Bays", "/videos/cam2_parking_bay.mp4", "parking", "ONLINE", 25),
    ("CAM-03", "B2 Exit Ramp", "/videos/cam3_exit_ramp.mp4", "exit", "ONLINE", 25),
]

for cid, name, url, zone, status, fps in cameras_data:
    existing = cur.execute('SELECT id FROM "cameras" WHERE camera_id = ?', (cid,)).fetchone()
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    if existing:
        cur.execute(
            'UPDATE "cameras" SET name = ?, url = ?, zone = ?, status = ?, fps_target = ?, is_enabled = 1, updated_at = ? WHERE camera_id = ?',
            (name, url, zone, status, fps, now_str, cid)
        )
    else:
        new_id = uuid.uuid4().hex
        cur.execute(
            'INSERT INTO "cameras" (id, camera_id, name, url, zone, status, fps_target, is_enabled, meta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, "{}", ?)',
            (new_id, cid, name, url, zone, status, fps, now_str)
        )
print("Seeded CAM-01, CAM-02, CAM-03")

# 3. Seed slots: P01 to P10
slots_data = [
    ("P01", "CAM-02", "Zone A", "FREE", [100, 100, 160, 220]),
    ("P02", "CAM-02", "Zone A", "FREE", [170, 100, 230, 220]),
    ("P03", "CAM-02", "Zone A", "FREE", [240, 100, 300, 220]),
    ("P04", "CAM-02", "Zone A", "FREE", [310, 100, 370, 220]),
    ("P05", "CAM-02", "Zone A", "FREE", [380, 100, 440, 220]),
    ("P06", "CAM-03", "Zone B", "FREE", [100, 240, 160, 360]),
    ("P07", "CAM-03", "Zone B", "FREE", [170, 240, 230, 360]),
    ("P08", "CAM-03", "Zone B", "FREE", [240, 240, 300, 360]),
    ("P09", "CAM-03", "Zone B", "FREE", [310, 240, 370, 360]),
    ("P10", "CAM-03", "Zone B", "FREE", [380, 240, 440, 360]),
]

import json
for sid, cid, zone, state, pos in slots_data:
    existing = cur.execute('SELECT id FROM "parking_slots" WHERE slot_id = ?', (sid,)).fetchone()
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    pos_json = json.dumps(pos)
    if existing:
        cur.execute(
            'UPDATE "parking_slots" SET camera_id = ?, zone = ?, state = ?, position = ?, updated_at = ? WHERE slot_id = ?',
            (cid, zone, state, pos_json, now_str, sid)
        )
    else:
        new_id = uuid.uuid4().hex
        cur.execute(
            'INSERT INTO "parking_slots" (id, slot_id, camera_id, zone, state, is_reserved, position, meta, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, "{}", ?)',
            (new_id, sid, cid, zone, state, pos_json, now_str)
        )
print("Seeded slots P01 to P10")

con.commit()
con.close()
