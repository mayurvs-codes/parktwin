import {
  ACCESS_POINT_B2,
  CANONICAL_60_SPACES,
  type DemoParkingSpace,
} from "@/components/digital-twin/demoScenarioData";

export type NavigationRouteType =
  | "DEMO_CONFIGURED_AISLE_ROUTE"
  | "DYNAMIC_GRAPH_SHORTEST_PATH";

export interface NavigationRouteStep {
  text: string;
  distanceMeters: number;
}

export interface UserNavigationRoute {
  type: NavigationRouteType;
  sourceId: string;
  destinationId: string;
  destinationLabel: string;
  zone: string;
  points: [number, number][];
  totalDistanceMeters: number;
  distanceRemainingMeters: number;
  steps: NavigationRouteStep[];
}

/**
 * Calculates deterministic aisle route between ACCESS_POINT_B2 (1105, 55)
 * and target parking bay along facility drive aisles.
 */
export function buildRouteToSpace(targetSpace: DemoParkingSpace): UserNavigationRoute {
  const points: [number, number][] = [
    [ACCESS_POINT_B2.x, ACCESS_POINT_B2.y], // [1105, 55] Entry Gateway
    [1105, 250],                            // North Junction (Top Horizontal Aisle)
  ];

  // Zone aisle traversal logic
  if (targetSpace.zone.includes("Zone A")) {
    points.push([targetSpace.x, 250]);
    points.push([targetSpace.x, targetSpace.y]);
  } else if (targetSpace.zone.includes("Zone B")) {
    if (targetSpace.orientation === "horizontal" || targetSpace.x < 560) {
      points.push([412, 250]);
      points.push([412, targetSpace.y]);
      points.push([targetSpace.x, targetSpace.y]);
    } else if (targetSpace.y < 420) {
      points.push([targetSpace.x, 250]);
      points.push([targetSpace.x, targetSpace.y]);
    } else {
      points.push([1225, 250]);
      points.push([1225, 610]);
      points.push([targetSpace.x, 610]);
      points.push([targetSpace.x, targetSpace.y]);
    }
  } else if (targetSpace.zone.includes("Zone C")) {
    points.push([1225, 250]);
    points.push([1225, 610]);
    points.push([targetSpace.x, 610]);
    points.push([targetSpace.x, targetSpace.y]);
  } else if (targetSpace.zone.includes("Zone D")) {
    points.push([1225, 250]);
    points.push([1225, 960]);
    points.push([targetSpace.x, 960]);
    points.push([targetSpace.x, targetSpace.y]);
  } else if (targetSpace.zone.includes("Zone E")) {
    points.push([1225, 250]);
    points.push([1225, 1318]);
    points.push([targetSpace.x, 1318]);
    points.push([targetSpace.x, targetSpace.y]);
  } else {
    // Zone F (West Wing)
    points.push([412, 250]);
    points.push([412, 610]);
    points.push([targetSpace.x, 610]);
    points.push([targetSpace.x, targetSpace.y]);
  }

  // 1 canvas unit ≈ 0.1 meter
  let totalDist = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    totalDist += Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 0.1;
  }
  const roundedDist = Math.max(20, Math.round(totalDist));

  return {
    type: "DEMO_CONFIGURED_AISLE_ROUTE",
    sourceId: "ACCESS_POINT_B2",
    destinationId: targetSpace.id,
    destinationLabel: `${targetSpace.id} · ${targetSpace.zone.split(" ")[0]} · B2`,
    zone: targetSpace.zone,
    points,
    totalDistanceMeters: roundedDist,
    distanceRemainingMeters: roundedDist,
    steps: [
      { text: "Enter through ACCESS_POINT_B2 gateway", distanceMeters: 12 },
      { text: "Proceed along drive corridor toward assigned aisle", distanceMeters: Math.round(roundedDist * 0.6) },
      { text: `Turn into bay ${targetSpace.id}`, distanceMeters: Math.round(roundedDist * 0.4) },
    ],
  };
}

/**
 * Calculates deterministic route from parking bay back to ACCESS_POINT_B2 gateway.
 */
export function buildRouteToExit(fromSpace: DemoParkingSpace): UserNavigationRoute {
  const points: [number, number][] = [
    [fromSpace.x, fromSpace.y],
  ];

  if (fromSpace.zone.includes("Zone A") || (fromSpace.zone.includes("Zone B") && fromSpace.orientation !== "horizontal" && fromSpace.x >= 560 && fromSpace.y < 420)) {
    points.push([fromSpace.x, 250]);
    points.push([1190, 250]);
    points.push([1190, 120]);
    points.push([ACCESS_POINT_B2.x, ACCESS_POINT_B2.y]);
  } else if (fromSpace.zone.includes("Zone B") && (fromSpace.orientation === "horizontal" || fromSpace.x < 560)) {
    points.push([412, fromSpace.y]);
    points.push([412, 250]);
    points.push([1190, 250]);
    points.push([1190, 120]);
    points.push([ACCESS_POINT_B2.x, ACCESS_POINT_B2.y]);
  } else if (fromSpace.zone.includes("Zone B") || fromSpace.zone.includes("Zone C")) {
    points.push([fromSpace.x, 610]);
    points.push([1225, 610]);
    points.push([1225, 250]);
    points.push([1190, 250]);
    points.push([1190, 120]);
    points.push([ACCESS_POINT_B2.x, ACCESS_POINT_B2.y]);
  } else if (fromSpace.zone.includes("Zone D")) {
    points.push([fromSpace.x, 960]);
    points.push([1225, 960]);
    points.push([1225, 250]);
    points.push([1190, 250]);
    points.push([1190, 120]);
    points.push([ACCESS_POINT_B2.x, ACCESS_POINT_B2.y]);
  } else if (fromSpace.zone.includes("Zone E")) {
    points.push([fromSpace.x, 1318]);
    points.push([1225, 1318]);
    points.push([1225, 250]);
    points.push([1190, 250]);
    points.push([1190, 120]);
    points.push([ACCESS_POINT_B2.x, ACCESS_POINT_B2.y]);
  } else {
    // Zone F
    points.push([fromSpace.x, 610]);
    points.push([412, 610]);
    points.push([412, 250]);
    points.push([1190, 250]);
    points.push([1190, 120]);
    points.push([ACCESS_POINT_B2.x, ACCESS_POINT_B2.y]);
  }

  let totalDist = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    totalDist += Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 0.1;
  }
  const roundedDist = Math.max(20, Math.round(totalDist));

  return {
    type: "DEMO_CONFIGURED_AISLE_ROUTE",
    sourceId: fromSpace.id,
    destinationId: "ACCESS_POINT_B2",
    destinationLabel: "ACCESS_POINT_B2 · Exit Gateway",
    zone: "B2 Vehicle Gateway",
    points,
    totalDistanceMeters: roundedDist,
    distanceRemainingMeters: roundedDist,
    steps: [
      { text: "Pull forward out of parking bay", distanceMeters: 10 },
      { text: "Follow arrows north along East Vertical Trunk", distanceMeters: Math.round(roundedDist * 0.7) },
      { text: "Pass CAM-16 barrier toward ACCESS_POINT_B2", distanceMeters: Math.round(roundedDist * 0.3) },
    ],
  };
}

/**
 * Generalized route resolver between two node IDs in the facility twin.
 * Clearly demarcates DEMO_CONFIGURED_AISLE_ROUTE vs dynamic graph algorithms.
 */
export function getRoute(
  startNodeId: string,
  destinationNodeId: string
): UserNavigationRoute | null {
  if (startNodeId === "ACCESS_POINT_B2") {
    const targetSpace = CANONICAL_60_SPACES.find((s) => s.id === destinationNodeId);
    if (!targetSpace) return null;
    return buildRouteToSpace(targetSpace);
  }

  if (destinationNodeId === "ACCESS_POINT_B2") {
    const fromSpace = CANONICAL_60_SPACES.find((s) => s.id === startNodeId);
    if (!fromSpace) return null;
    return buildRouteToExit(fromSpace);
  }

  // Between two spaces
  const from = CANONICAL_60_SPACES.find((s) => s.id === startNodeId);
  const to = CANONICAL_60_SPACES.find((s) => s.id === destinationNodeId);
  if (!from || !to) return null;

  const points: [number, number][] = [
    [from.x, from.y],
    [1105, from.y],
    [1105, to.y],
    [to.x, to.y],
  ];

  let totalDist = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    totalDist += Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 0.1;
  }
  const roundedDist = Math.max(15, Math.round(totalDist));

  return {
    type: "DEMO_CONFIGURED_AISLE_ROUTE",
    sourceId: startNodeId,
    destinationId: destinationNodeId,
    destinationLabel: `${to.id} · ${to.zone.split(" ")[0]}`,
    zone: to.zone,
    points,
    totalDistanceMeters: roundedDist,
    distanceRemainingMeters: roundedDist,
    steps: [
      { text: `Exit bay ${from.id} onto aisle`, distanceMeters: 10 },
      { text: "Transit along corridor trunk", distanceMeters: Math.round(roundedDist * 0.6) },
      { text: `Turn into bay ${to.id}`, distanceMeters: Math.round(roundedDist * 0.4) },
    ],
  };
}
