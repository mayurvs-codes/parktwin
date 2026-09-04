"""
ParkTwin — Graph Navigation Service
===================================
Lightweight, deterministic shortest-path routing for parking facility navigation.
Connects camera zones, driving lanes, junctions, and parking slots P01–P10.
"""

from typing import Dict, List, Any, Optional
import heapq

# Canonical Map Graph Nodes & Normalized Coordinates (for 2D spatial view)
NAV_NODES = {
    "ENTRY_GATE": {"name": "Entry Gate (CAM-01)", "x": 60, "y": 190, "type": "entry"},
    "MAIN_LANE": {"name": "Main Driving Lane", "x": 180, "y": 190, "type": "lane"},
    "JUNCTION_A": {"name": "Junction Row A", "x": 220, "y": 120, "type": "junction"},
    "JUNCTION_B": {"name": "Junction Row B", "x": 220, "y": 260, "type": "junction"},
    "AISLE_A": {"name": "Aisle Row A (CAM-02)", "x": 380, "y": 120, "type": "aisle"},
    "AISLE_B": {"name": "Aisle Row B (CAM-02)", "x": 380, "y": 260, "type": "aisle"},
    "EXIT_RAMP": {"name": "Exit Ramp (CAM-03)", "x": 620, "y": 190, "type": "exit"},
    
    # Bay A Slots (P01 - P05)
    "P01": {"name": "Slot P01", "x": 290, "y": 80, "type": "slot"},
    "P02": {"name": "Slot P02", "x": 350, "y": 80, "type": "slot"},
    "P03": {"name": "Slot P03", "x": 410, "y": 80, "type": "slot"},
    "P04": {"name": "Slot P04", "x": 470, "y": 80, "type": "slot"},
    "P05": {"name": "Slot P05", "x": 530, "y": 80, "type": "slot"},
    
    # Bay B Slots (P06 - P10)
    "P06": {"name": "Slot P06", "x": 290, "y": 300, "type": "slot"},
    "P07": {"name": "Slot P07", "x": 350, "y": 300, "type": "slot"},
    "P08": {"name": "Slot P08", "x": 410, "y": 300, "type": "slot"},
    "P09": {"name": "Slot P09", "x": 470, "y": 300, "type": "slot"},
    "P10": {"name": "Slot P10", "x": 530, "y": 300, "type": "slot"},
}

# Bidirectional edges with distances in meters
NAV_EDGES = [
    ("ENTRY_GATE", "MAIN_LANE", 12.0),
    ("MAIN_LANE", "JUNCTION_A", 8.0),
    ("MAIN_LANE", "JUNCTION_B", 8.0),
    ("JUNCTION_A", "AISLE_A", 15.0),
    ("JUNCTION_B", "AISLE_B", 15.0),
    ("AISLE_A", "EXIT_RAMP", 25.0),
    ("AISLE_B", "EXIT_RAMP", 25.0),
    
    # Aisle A to Slots P01-P05
    ("AISLE_A", "P01", 5.0),
    ("AISLE_A", "P02", 7.0),
    ("AISLE_A", "P03", 9.0),
    ("AISLE_A", "P04", 11.0),
    ("AISLE_A", "P05", 13.0),
    
    # Aisle B to Slots P06-P10
    ("AISLE_B", "P06", 5.0),
    ("AISLE_B", "P07", 7.0),
    ("AISLE_B", "P08", 9.0),
    ("AISLE_B", "P09", 11.0),
    ("AISLE_B", "P10", 13.0),
]


class NavigationGraph:
    def __init__(self):
        self.adj: Dict[str, List[tuple[str, float]]] = {k: [] for k in NAV_NODES}
        for u, v, w in NAV_EDGES:
            self.adj[u].append((v, w))
            self.adj[v].append((u, w))

    def shortest_path(self, start: str, end: str) -> Optional[Dict[str, Any]]:
        start = start.upper()
        end = end.upper()
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
