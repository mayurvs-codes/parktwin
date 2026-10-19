import * as THREE from "three";

export interface ZoneRouteGroup extends THREE.Group {
  curve: THREE.CatmullRomCurve3;
  updateAnimation: (delta: number) => void;
  dispose: () => void;
  slotId: string;
}

/**
 * Creates a visual 3D navigation route from the parking-zone entrance to
 * the exact center of the selected parking bay.
 *
 * Trajectory:
 * 1. Vehicle starting position at the West central drive aisle entrance (-16.5, 0.05, 0)
 * 2. Forward travel along the drive aisle centerline (Z = 0)
 * 3. Smooth right-angle / curved turn into the parking row
 * 4. Termination at the exact center of the destination stall (tx, 0.05, tz)
 *
 * Visual Features:
 * - Bright cyan/blue route ribbon (#00f0ff / #38bdf8) with subtle underglow
 * - Flowing animated chevrons pointing in the direction of travel
 * - Discrete 3D ground arrow markers spaced along the curve
 * - Aisle entrance START marker
 * - Destination target pad, expanding pulse ring, beacon beam, and floating ★ SP-XX billboard
 */
export function createZoneRoute3D(
  targetPosition: [number, number, number],
  slotId: string
): ZoneRouteGroup {
  const group = new THREE.Group() as ZoneRouteGroup;
  group.name = `zone-route-${slotId}`;
  group.slotId = slotId;

  const [tx, , tz] = targetPosition;
  const isRowB = tz > 0; // Row B bays (SP-11 to SP-20) are at Z = 6.2, Row A at Z = -6.2

  // 1. Reusable Trajectory Curve Generation
  const startX = -16.5;
  const turnRadius = 1.8;
  const preTurnX = Math.max(startX + 1.2, tx - turnRadius);

  const waypoints: THREE.Vector3[] = [
    new THREE.Vector3(startX, 0.048, 0),
    new THREE.Vector3(preTurnX, 0.048, 0),
    new THREE.Vector3(tx - 0.45, 0.048, isRowB ? 1.4 : -1.4),
    new THREE.Vector3(tx, 0.048, isRowB ? 3.4 : -3.4),
    new THREE.Vector3(tx, 0.048, tz),
  ];

  const curve = new THREE.CatmullRomCurve3(waypoints, false, "centripetal", 0.25);
  group.curve = curve;

  // Track all disposables for clean cleanup on exit
  const disposables: { dispose: () => void }[] = [];

  // Color Palette
  const cyanPrimary = "#00f0ff";
  const cyanEmissive = "#0284c7";
  const cyanBorder = "#38bdf8";

  // 2. Animated Chevron Flow Texture for Route Ribbon
  const arrowCanvas = document.createElement("canvas");
  arrowCanvas.width = 512;
  arrowCanvas.height = 64;
  const actx = arrowCanvas.getContext("2d");
  if (actx) {
    actx.fillStyle = "rgba(0, 0, 0, 0)";
    actx.fillRect(0, 0, 512, 64);

    // Glowing border lines on ribbon edges
    actx.strokeStyle = "rgba(0, 240, 255, 0.85)";
    actx.lineWidth = 4;
    actx.beginPath();
    actx.moveTo(0, 4);
    actx.lineTo(512, 4);
    actx.moveTo(0, 60);
    actx.lineTo(512, 60);
    actx.stroke();

    // Directional chevrons pointing along the route
    actx.fillStyle = "#00f0ff";
    actx.shadowColor = "#00f0ff";
    actx.shadowBlur = 10;

    for (let i = 0; i < 4; i++) {
      const cx = 64 + i * 128;
      actx.beginPath();
      actx.moveTo(cx - 28, 14);
      actx.lineTo(cx + 18, 32);
      actx.lineTo(cx - 28, 50);
      actx.lineTo(cx - 10, 32);
      actx.closePath();
      actx.fill();
    }
  }

  const arrowTexture = new THREE.CanvasTexture(arrowCanvas);
  arrowTexture.wrapS = THREE.RepeatWrapping;
  arrowTexture.wrapT = THREE.ClampToEdgeWrapping;
  const curveLength = curve.getLength();
  const repeatCount = Math.max(3, Math.round(curveLength / 1.6));
  arrowTexture.repeat.set(repeatCount, 1);
  disposables.push(arrowTexture);

  // 3. Ground Route Ribbon Geometry
  const ribbonWidth = 0.52;
  const points = curve.getSpacedPoints(Math.max(60, Math.round(curveLength * 4)));
  const ribbonGeo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const tangent = curve.getTangent(i / (points.length - 1)).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    const pLeft = p.clone().addScaledVector(normal, ribbonWidth / 2);
    const pRight = p.clone().addScaledVector(normal, -ribbonWidth / 2);

    positions.push(pLeft.x, pLeft.y, pLeft.z);
    positions.push(pRight.x, pRight.y, pRight.z);

    const u = i / (points.length - 1);
    uvs.push(u, 0);
    uvs.push(u, 1);

    if (i < points.length - 1) {
      const idx = i * 2;
      indices.push(idx, idx + 1, idx + 2);
      indices.push(idx + 1, idx + 3, idx + 2);
    }
  }

  ribbonGeo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  ribbonGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  ribbonGeo.setIndex(indices);
  ribbonGeo.computeVertexNormals();
  disposables.push(ribbonGeo);

  const ribbonMat = new THREE.MeshBasicMaterial({
    map: arrowTexture,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  disposables.push(ribbonMat);

  const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
  group.add(ribbonMesh);

  // 4. Subtle Base Glow Ribbon underneath
  const underGlowGeo = new THREE.BufferGeometry();
  const underPositions: number[] = [];
  const underIndices: number[] = [];
  const underWidth = 0.82;

  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const tangent = curve.getTangent(i / (points.length - 1)).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    const pLeft = p.clone().addScaledVector(normal, underWidth / 2);
    const pRight = p.clone().addScaledVector(normal, -underWidth / 2);

    underPositions.push(pLeft.x, pLeft.y - 0.005, pLeft.z);
    underPositions.push(pRight.x, pRight.y - 0.005, pRight.z);

    if (i < points.length - 1) {
      const idx = i * 2;
      underIndices.push(idx, idx + 1, idx + 2);
      underIndices.push(idx + 1, idx + 3, idx + 2);
    }
  }
  underGlowGeo.setAttribute("position", new THREE.Float32BufferAttribute(underPositions, 3));
  underGlowGeo.setIndex(underIndices);
  disposables.push(underGlowGeo);

  const underGlowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#0284c7"),
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  disposables.push(underGlowMat);
  const underGlowMesh = new THREE.Mesh(underGlowGeo, underGlowMat);
  group.add(underGlowMesh);

  // 5. Discrete 3D Ground Arrow Markers along Route
  const arrowSpacing = 2.2;
  const numMarkers = Math.max(3, Math.floor(curveLength / arrowSpacing));
  const chevronShape = new THREE.Shape();
  chevronShape.moveTo(-0.16, -0.2);
  chevronShape.lineTo(0, 0.2);
  chevronShape.lineTo(0.16, -0.2);
  chevronShape.lineTo(0, -0.09);
  chevronShape.closePath();

  const arrowMarkerGeo = new THREE.ShapeGeometry(chevronShape);
  arrowMarkerGeo.rotateX(-Math.PI / 2);
  disposables.push(arrowMarkerGeo);

  const arrowMarkerMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#ffffff"),
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  disposables.push(arrowMarkerMat);

  for (let i = 1; i <= numMarkers; i++) {
    const t = i / (numMarkers + 1);
    const pt = curve.getPointAt(t);
    const tangent = curve.getTangentAt(t).normalize();

    const arrowMarker = new THREE.Mesh(arrowMarkerGeo, arrowMarkerMat);
    arrowMarker.position.set(pt.x, pt.y + 0.004, pt.z);
    const angle = Math.atan2(tangent.x, tangent.z);
    arrowMarker.rotation.y = angle;
    group.add(arrowMarker);
  }

  // 6. Drive Aisle Route Start Marker
  const startGroup = new THREE.Group();
  startGroup.position.set(startX, 0.05, 0);

  const startRingGeo = new THREE.RingGeometry(0.48, 0.62, 32);
  startRingGeo.rotateX(-Math.PI / 2);
  disposables.push(startRingGeo);

  const startRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(cyanBorder),
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  disposables.push(startRingMat);
  const startRing = new THREE.Mesh(startRingGeo, startRingMat);
  startGroup.add(startRing);

  // Start Canvas Stencil: "START"
  const startCanvas = document.createElement("canvas");
  startCanvas.width = 128;
  startCanvas.height = 64;
  const sctx = startCanvas.getContext("2d");
  if (sctx) {
    sctx.fillStyle = "#38bdf8";
    sctx.font = "bold 26px monospace";
    sctx.textAlign = "center";
    sctx.textBaseline = "middle";
    sctx.fillText("START", 64, 32);
  }
  const startTex = new THREE.CanvasTexture(startCanvas);
  disposables.push(startTex);
  const startLabelGeo = new THREE.PlaneGeometry(0.9, 0.45);
  startLabelGeo.rotateX(-Math.PI / 2);
  disposables.push(startLabelGeo);
  const startLabelMat = new THREE.MeshBasicMaterial({
    map: startTex,
    transparent: true,
    depthWrite: false,
  });
  disposables.push(startLabelMat);
  const startLabelMesh = new THREE.Mesh(startLabelGeo, startLabelMat);
  startLabelMesh.position.set(0, 0.002, 0);
  startGroup.add(startLabelMesh);

  group.add(startGroup);

  // 7. Destination Parking Bay Marker (Pad + Pulsing Ring + Beam + Floating Billboard)
  const destGroup = new THREE.Group();
  destGroup.position.set(tx, 0.05, tz);

  // (a) Glowing Circular Destination Pad
  const destPadGeo = new THREE.CircleGeometry(1.15, 32);
  destPadGeo.rotateX(-Math.PI / 2);
  disposables.push(destPadGeo);

  const destPadMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(cyanEmissive),
    transparent: true,
    opacity: 0.38,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  disposables.push(destPadMat);
  const destPad = new THREE.Mesh(destPadGeo, destPadMat);
  destGroup.add(destPad);

  // Pad Border Ring
  const destBorderGeo = new THREE.RingGeometry(1.05, 1.15, 32);
  destBorderGeo.rotateX(-Math.PI / 2);
  disposables.push(destBorderGeo);

  const destBorderMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(cyanBorder),
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  disposables.push(destBorderMat);
  const destBorder = new THREE.Mesh(destBorderGeo, destBorderMat);
  destGroup.add(destBorder);

  // (b) Animated Expanding Target Pulse Ring
  const pulseRingGeo = new THREE.RingGeometry(1.15, 1.25, 32);
  pulseRingGeo.rotateX(-Math.PI / 2);
  disposables.push(pulseRingGeo);

  const pulseRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(cyanPrimary),
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  disposables.push(pulseRingMat);
  const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
  destGroup.add(pulseRing);

  // (c) Vertical Beacon Beam
  const beamGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.6, 12);
  disposables.push(beamGeo);
  const beamMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(cyanBorder),
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  disposables.push(beamMat);
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = 1.3;
  destGroup.add(beam);

  // (d) Overhead Floating Destination Marker Billboard (★ SP-XX / DESTINATION)
  const destBillboardGroup = new THREE.Group();
  destBillboardGroup.position.y = 2.7;

  const destCanvas = document.createElement("canvas");
  destCanvas.width = 320;
  destCanvas.height = 128;
  const dctx = destCanvas.getContext("2d");
  if (dctx) {
    dctx.fillStyle = "rgba(2, 132, 199, 0.95)";
    dctx.strokeStyle = "#38bdf8";
    dctx.lineWidth = 5;
    dctx.beginPath();
    dctx.roundRect(10, 10, 300, 108, 20);
    dctx.fill();
    dctx.stroke();

    dctx.fillStyle = "#ffffff";
    dctx.font = "bold 44px monospace";
    dctx.textAlign = "center";
    dctx.textBaseline = "middle";
    dctx.fillText(`★ ${slotId}`, 160, 48);

    dctx.fillStyle = "#bae6fd";
    dctx.font = "bold 22px monospace";
    dctx.fillText("DESTINATION", 160, 90);
  }

  const destTex = new THREE.CanvasTexture(destCanvas);
  disposables.push(destTex);

  const destSpriteMat = new THREE.SpriteMaterial({
    map: destTex,
    transparent: true,
    depthTest: false,
  });
  disposables.push(destSpriteMat);

  const destSprite = new THREE.Sprite(destSpriteMat);
  destSprite.scale.set(2.2, 0.88, 1);
  destBillboardGroup.add(destSprite);
  destGroup.add(destBillboardGroup);

  group.add(destGroup);

  // 8. Animation Loop Handler
  let elapsed = 0;
  group.updateAnimation = (delta: number) => {
    elapsed += delta;

    // Chevron forward flow
    arrowTexture.offset.x -= delta * 0.75;

    // Destination expanding pulse ring (loops every 1.4s)
    const pulseProgress = (elapsed % 1.4) / 1.4;
    const pulseScale = 1.0 + pulseProgress * 0.45;
    pulseRing.scale.set(pulseScale, pulseScale, pulseScale);
    pulseRingMat.opacity = Math.max(0, 0.85 * (1 - pulseProgress));

    // Floating destination billboard gentle bobbing
    destBillboardGroup.position.y = 2.7 + Math.sin(elapsed * 2.8) * 0.12;
  };

  // 9. Clean Disposal
  group.dispose = () => {
    disposables.forEach((d) => d.dispose());
  };

  return group;
}
