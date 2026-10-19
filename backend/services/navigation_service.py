"""
ParkTwin — Graph Navigation Service (Canonical Digital Twin)
=============================================================
Uses the canonical Digital Twin navigation graph from twinConfig.ts
Connects access point, driving lanes, junctions, and parking slots.
"""

from typing import Dict, List, Any, Optional
import heapq

# Import canonical navigation graph from Digital Twin config
# This mirrors the TypeScript NAV_NODES and NAV_EDGES from apps/web/components/digital-twin/twinConfig.ts
NAV_NODES = {
    "ACCESS_POINT_B2": {"name": "B2 Access Point", "x": 706, "y": 138, "type": "access_point"},
    "NORTH_JUNCTION": {"name": "North Junction", "x": 706, "y": 180, "type": "junction"},
    "UPPER_WEST_JUNCTION": {"name": "Upper West Junction", "x": 706, "y": 800, "type": "junction"},
    "MID_WEST_JUNCTION": {"name": "Mid West Junction", "x": 706, "y": 1361, "type": "junction"},
    "LOWER_MID_JUNCTION": {"name": "Lower Mid Junction", "x": 706, "y": 1420, "type": "junction"},
    "SOUTH_JUNCTION": {"name": "South Junction", "x": 792, "y": 1567, "type": "junction"},
    "WEST_TRUNK_NORTH": {"name": "West Trunk North", "x": 438, "y": 180, "type": "aisle"},
    "WEST_TRUNK_SOUTH": {"name": "West Trunk South", "x": 438, "y": 1585, "type": "aisle"},
    "EAST_UPPER_JUNCTION": {"name": "East Upper Junction", "x": 815, "y": 180, "type": "junction"},
    "EAST_MID_JUNCTION": {"name": "East Mid Junction", "x": 815, "y": 857, "type": "junction"},
    "EAST_LOWER_JUNCTION": {"name": "East Lower Junction", "x": 815, "y": 1417, "type": "junction"},
    "EAST_SOUTH_JUNCTION": {"name": "East South Junction", "x": 815, "y": 1585, "type": "junction"},
    # Runtime parking slots (P01-P10) - mapped to physical spaces
    "P01": {"name": "Slot P01", "x": 648, "y": 720, "type": "slot"},
    "P02": {"name": "Slot P02", "x": 706, "y": 720, "type": "slot"},
    "P03": {"name": "Slot P03", "x": 763, "y": 720, "type": "slot"},
    "P04": {"name": "Slot P04", "x": 821, "y": 720, "type": "slot"},
    "P05": {"name": "Slot P05", "x": 830, "y": 720, "type": "slot"},
    "P06": {"name": "Slot P06", "x": 476, "y": 1480, "type": "slot"},
    "P07": {"name": "Slot P07", "x": 591, "y": 1480, "type": "slot"},
    "P08": {"name": "Slot P08", "x": 648, "y": 1480, "type": "slot"},
    "P09": {"name": "Slot P09", "x": 706, "y": 1480, "type": "slot"},
    "P10": {"name": "Slot P10", "x": 830, "y": 1480, "type": "slot"},
}

# Bidirectional edges with distances in meters (approximate from PDF coordinates)
# 1 canonical unit ≈ 1 PDF point ≈ ~0.5m (rough approximation)
# Edges reference the DRIVE_AISLES from twinConfig.ts
NAV_EDGES = [
    # North entry trunk (aisle_north_entry)
    ("ACCESS_POINT_B2", "NORTH_JUNCTION", 21.0),
    # West vertical trunk (aisle_vertical_west) - main artery
    ("NORTH_JUNCTION", "UPPER_WEST_JUNCTION", 310.0),
    ("UPPER_WEST_JUNCTION", "MID_WEST_JUNCTION", 561.0),
    ("MID_WEST_JUNCTION", "LOWER_MID_JUNCTION", 59.0),
    ("LOWER_MID_JUNCTION", "WEST_TRUNK_SOUTH", 165.0),
    # West trunk horizontal connections
    ("NORTH_JUNCTION", "WEST_TRUNK_NORTH", 268.0),  # upper_west_aisle
    ("WEST_TRUNK_NORTH", "UPPER_WEST_JUNCTION", 310.0),  # mid_west_aisle
    ("UPPER_WEST_JUNCTION", "LOWER_MID_JUNCTION", 561.0),  # mid_west_aisle
    ("LOWER_MID_JUNCTION", "WEST_TRUNK_SOUTH", 165.0),  # lower_mid_aisle
    # East vertical trunk (avoiding ramp_core_east)
    ("NORTH_JUNCTION", "EAST_UPPER_JUNCTION", 109.0),  # aisle_vertical_east_north
    ("EAST_UPPER_JUNCTION", "EAST_MID_JUNCTION", 677.0),  # aisle_vertical_east_mid
    ("EAST_MID_JUNCTION", "EAST_LOWER_JUNCTION", 560.0),  # aisle_vertical_east_mid
    ("EAST_LOWER_JUNCTION", "EAST_SOUTH_JUNCTION", 168.0),  # aisle_vertical_east_south
    # South exit connectors
    ("WEST_TRUNK_SOUTH", "SOUTH_JUNCTION", 354.0),  # aisle_horizontal_lower
    ("EAST_SOUTH_JUNCTION", "SOUTH_JUNCTION", 23.0),  # south_exit_aisle
    # Slot connections from junctions/aisles
    # Zone A/B slots from upper west junction
    ("UPPER_WEST_JUNCTION", "P01", 100.0),
    ("UPPER_WEST_JUNCTION", "P02", 100.0),
    ("UPPER_WEST_JUNCTION", "P03", 100.0),
    ("UPPER_WEST_JUNCTION", "P04", 100.0),
    ("UPPER_WEST_JUNCTION", "P05", 100.0),
    # Zone C/D slots from mid west junction
    ("MID_WEST_JUNCTION", "P06", 100.0),
    ("MID_WEST_JUNCTION", "P07", 100.0),
    ("MID_WEST_JUNCTION", "P08", 100.0),
    ("MID_WEST_JUNCTION", "P09", 100.0),
    ("MID_WEST_JUNCTION", "P10", 100.0),
]

# Synchronize with canonical shared/facility_geometry.json
def _sync_with_canonical_geometry() -> None:
    import json
    from pathlib import Path
    
    # Try finding shared/facility_geometry.json
    candidates = [
        Path(__file__).resolve().parents[2] / "shared" / "facility_geometry.json",
        Path(__file__).resolve().parents[2] / "apps" / "web" / "config" / "facility_geometry.json",
    ]
    for geo_path in candidates:
        if geo_path.exists():
            try:
                with open(geo_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for bay in data.get("bays", []):
                    bay_id = bay.get("id")
                    alias = bay.get("alias")
                    pos = bay.get("canvas", {})
                    name = bay.get("name", bay_id)
                    
                    # Associate with nav nodes
                    if bay_id and bay_id not in NAV_NODES:
                        # Find closest or matching junction
                        num = int(bay_id.split("-")[1]) if "-" in bay_id else 1
                        ref_p = f"P{num:02d}" if num <= 10 else "P06"
                        ref_coords = NAV_NODES.get(ref_p, {"x": pos.get("x", 600), "y": pos.get("y", 400)})
                        NAV_NODES[bay_id] = {
                            "name": f"Space {bay_id}",
                            "x": ref_coords["x"],
                            "y": ref_coords["y"],
                            "type": "slot",
                        }
                        # Connect edge
                        junction = "UPPER_WEST_JUNCTION" if num <= 5 or (17 <= num <= 20) else "MID_WEST_JUNCTION"
                        NAV_EDGES.append((junction, bay_id, 100.0))
                break
            except Exception:
                pass

_sync_with_canonical_geometry()


class NavigationGraph:
    def __init__(self):
        self.adj: Dict[str, List[tuple[str, float]]] = {k: [] for k in NAV_NODES}
        for u, v, w in NAV_EDGES:
            self.adj[u].append((v, w))
            self.adj[v].append((u, w))

    def shortest_path(self, start: str, end: str) -> Optional[Dict[str, Any]]:
        start = start.upper()
        end = end.upper()
        if start in ("ENTRY_GATE", "ENTRY", "ACCESS_POINT"):
            start = "ACCESS_POINT_B2"
        if end in ("ENTRY_GATE", "ENTRY", "ACCESS_POINT"):
            end = "ACCESS_POINT_B2"
        if start not in NAV_NODES or end not in NAV_NODES:
            return None

        # Dijkstra
        pq = [(0.0, start, [start])]
        visited = set()

        while pq:
            cost, u, path = heapq.heappop(pq)
            if u == end:
                waypoints = [{"id": n, "name": NAV_NODES[n]["name"], "x": NAV_NODES[n]["x"], "y": NAV_NODES[n]["y"]} for n in path]
                directions = self._generate_directions(path)
                return {
                    "source": start,
                    "destination": end,
                    "distance_meters": round(cost, 1),
                    "path": path,
                    "waypoints": waypoints,
                    "directions": directions,
                }

            if u in visited:
                continue
            visited.add(u)

            for v, weight in self.adj[u]:
                if v not in visited:
                    heapq.heappush(pq, (cost + weight, v, path + [v]))

        return None

    def _generate_directions(self, path: List[str]) -> List[str]:
        steps = []
        for i, node in enumerate(path):
            if i == 0:
                steps.append(f"Start at {NAV_NODES[node]['name']}")
            elif i == len(path) - 1:
                steps.append(f"Arrive at destination {NAV_NODES[node]['name']}")
            else:
                steps.append(f"Proceed through {NAV_NODES[node]['name']}")
        return steps


_nav_graph = NavigationGraph()

def compute_route(source: str = "ENTRY_GATE", destination: str = "P02") -> Optional[Dict[str, Any]]:
    return _nav_graph.shortest_path(source, destination)


async def compute_vehicle_route(
    db,  # AsyncSession
    vehicle_id_or_plate: str,
    source: str = "ENTRY_GATE",
) -> Optional[Dict[str, Any]]:
    """Resolve vehicle's assigned slot and calculate Dijkstra shortest path."""
    from sqlalchemy import select, or_
    from backend.database.models import Vehicle
    from modules.parking_intelligence.storage.models import ParkingSession

    import uuid as _uuid
    parsed_uuid = None
    try:
        parsed_uuid = _uuid.UUID(vehicle_id_or_plate)
    except (ValueError, AttributeError):
        pass

    conds = [
        Vehicle.prototype_id == vehicle_id_or_plate.upper(),
        Vehicle.license_plate == vehicle_id_or_plate.upper(),
    ]
    if parsed_uuid:
        conds.append(Vehicle.id == parsed_uuid)

    v_res = await db.execute(select(Vehicle).where(or_(*conds)))
    veh = v_res.scalars().first()

    dest_slot = None
    if veh:
        # 2. Check active parking session
        sess_conds = [
            ParkingSession.vehicle_id == veh.id,
            ParkingSession.license_plate == veh.license_plate,
        ]
        if veh.tracking_id is not None:
            sess_conds.append(ParkingSession.tracking_id == veh.tracking_id)

        sess_res = await db.execute(
            select(ParkingSession).where(
                or_(*sess_conds),
                ParkingSession.is_active == True,
            )
        )
        sess = sess_res.scalars().first()
        if sess and sess.slot_id:
            dest_slot = sess.slot_id
        elif hasattr(veh, "parking_slot") and veh.parking_slot:
            dest_slot = veh.parking_slot

    if not dest_slot:
        # Fallback to checking session directly by plate if vehicle not found
        sess_res = await db.execute(
            select(ParkingSession).where(
                or_(
                    ParkingSession.license_plate == vehicle_id_or_plate.upper(),
                    ParkingSession.session_uid.ilike(f"%{vehicle_id_or_plate}%"),
                ),
                ParkingSession.is_active == True,
            )
        )
        sess = sess_res.scalars().first()
        if sess and sess.slot_id:
            dest_slot = sess.slot_id

    if not dest_slot:
        return None

    route = compute_route(source=source, destination=dest_slot)
    if not route:
        return None

    route["vehicle_id"] = (
        veh.prototype_id
        if (veh and veh.prototype_id)
        else (str(veh.id) if veh else vehicle_id_or_plate)
    )
    route["license_plate"] = veh.license_plate if veh else vehicle_id_or_plate
    route["destination_slot"] = dest_slot
    return route

