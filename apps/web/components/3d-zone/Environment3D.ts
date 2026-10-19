import * as THREE from "three";

export interface ZoneEnvironmentGroup extends THREE.Group {
  updateAnimation?: (delta: number) => void;
}

/**
 * Creates the physical indoor parking facility environment:
 * 1. Realistic concrete floor slab with expansion joints and asphalt drive aisle
 * 2. Structural rectangular concrete columns with safety hazard collars and column ID plaques
 * 3. Low concrete perimeter barrier walls keeping the scene open
 * 4. Overhead transverse structural ceiling beams & linear LED troffer light fixtures
 * 5. Authentic static road markings (dashed centerline, directional lane arrows, speed stencil)
 * 6. Suspended facility parking sign (ZONE C · LEVEL B2)
 */
export function createZoneEnvironment(): ZoneEnvironmentGroup {
  const envGroup = new THREE.Group() as ZoneEnvironmentGroup;
  envGroup.name = "parking-zone-environment";

  // ── Materials ──
  const columnMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#253247"), // Slightly lighter than floor
    roughness: 0.82,
    metalness: 0.15,
  });

  const wallMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1e293b"),
    roughness: 0.85,
    metalness: 0.1,
  });

  const wallCapMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#334155"),
    roughness: 0.7,
    metalness: 0.2,
  });

  const beamMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#161f2e"),
    roughness: 0.75,
    metalness: 0.35,
  });

  // ── 1. Main Floor Slab & Drive Aisle ──
  // Base concrete floor (38m x 22m)
  const floorGeo = new THREE.PlaneGeometry(38, 22);
  floorGeo.rotateX(-Math.PI / 2);

  // Procedural concrete texture with expansion joint grid seams
  const floorCanvas = document.createElement("canvas");
  floorCanvas.width = 512;
  floorCanvas.height = 512;
  const fctx = floorCanvas.getContext("2d");
  if (fctx) {
    fctx.fillStyle = "#0c121e";
    fctx.fillRect(0, 0, 512, 512);

    // Subtle concrete expansion joints (seam grid)
    fctx.strokeStyle = "rgba(30, 41, 59, 0.4)";
    fctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += 128) {
      fctx.beginPath();
      fctx.moveTo(i, 0);
      fctx.lineTo(i, 512);
      fctx.stroke();

      fctx.beginPath();
      fctx.moveTo(0, i);
      fctx.lineTo(512, i);
      fctx.stroke();
    }
  }
  const floorTex = new THREE.CanvasTexture(floorCanvas);
  floorTex.wrapS = THREE.RepeatWrapping;
  floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(4, 2);

  const mainFloorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.9,
    metalness: 0.1,
  });
  const floorMesh = new THREE.Mesh(floorGeo, mainFloorMat);
  floorMesh.position.y = 0;
  floorMesh.receiveShadow = true;
  envGroup.add(floorMesh);

  // Central Drive Aisle Asphalt Surface (Width: 7.2m, Length: 38m)
  // Positioned between Z = -3.6 and Z = +3.6
  const aisleGeo = new THREE.PlaneGeometry(38, 7.2);
  aisleGeo.rotateX(-Math.PI / 2);

  // Asphalt texture with subtle tire tracks
  const aisleCanvas = document.createElement("canvas");
  aisleCanvas.width = 512;
  aisleCanvas.height = 256;
  const actx = aisleCanvas.getContext("2d");
  if (actx) {
    actx.fillStyle = "#080c14"; // Deep dark asphalt
    actx.fillRect(0, 0, 512, 256);

    // Subtle faint tire tracks running lengthwise
    actx.fillStyle = "rgba(4, 7, 12, 0.5)";
    actx.fillRect(0, 50, 512, 40);
    actx.fillRect(0, 166, 512, 40);
  }
  const aisleTex = new THREE.CanvasTexture(aisleCanvas);
  aisleTex.wrapS = THREE.RepeatWrapping;
  aisleTex.repeat.set(2, 1);

  const aisleMat = new THREE.MeshStandardMaterial({
    map: aisleTex,
    roughness: 0.82,
    metalness: 0.08,
  });
  const aisleMesh = new THREE.Mesh(aisleGeo, aisleMat);
  aisleMesh.position.set(0, 0.005, 0);
  aisleMesh.receiveShadow = true;
  envGroup.add(aisleMesh);

  // ── 2. Static Road Markings on Drive Aisle ──
  // (a) Dashed Centerline
  const centerLineMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#cbd5e1"),
    roughness: 0.6,
  });
  for (let x = -16.5; x <= 16.5; x += 3.0) {
    const dashGeo = new THREE.BoxGeometry(1.6, 0.015, 0.14);
    const dash = new THREE.Mesh(dashGeo, centerLineMat);
    dash.position.set(x, 0.01, 0);
    dash.receiveShadow = true;
    envGroup.add(dash);
  }

  // (b) Drive Aisle Outer Boundary Lines (Separating aisle from parking bays)
  const edgeLineGeo = new THREE.BoxGeometry(36, 0.015, 0.12);
  const northEdgeLine = new THREE.Mesh(edgeLineGeo, centerLineMat);
  northEdgeLine.position.set(0, 0.01, -3.5);
  northEdgeLine.receiveShadow = true;
  envGroup.add(northEdgeLine);

  const southEdgeLine = new THREE.Mesh(edgeLineGeo, centerLineMat);
  southEdgeLine.position.set(0, 0.01, 3.5);
  southEdgeLine.receiveShadow = true;
  envGroup.add(southEdgeLine);

  // (c) Painted Directional Arrows (Static physical pavement paint)
  const createPaintedArrow = (x: number, z: number) => {
    const arrowCanvas = document.createElement("canvas");
    arrowCanvas.width = 256;
    arrowCanvas.height = 128;
    const ctx = arrowCanvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "rgba(226, 232, 240, 0.75)";
      ctx.beginPath();
      // Arrow shaft
      ctx.rect(30, 52, 110, 24);
      // Arrow head
      ctx.moveTo(140, 32);
      ctx.lineTo(210, 64);
      ctx.lineTo(140, 96);
      ctx.closePath();
      ctx.fill();
    }
    const arrowTex = new THREE.CanvasTexture(arrowCanvas);
    const arrowGeo = new THREE.PlaneGeometry(2.4, 1.2);
    arrowGeo.rotateX(-Math.PI / 2);
    const arrowMat = new THREE.MeshBasicMaterial({
      map: arrowTex,
      transparent: true,
      depthWrite: false,
    });
    const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
    arrowMesh.position.set(x, 0.012, z);
    return arrowMesh;
  };
  envGroup.add(createPaintedArrow(-8.0, 0));
  envGroup.add(createPaintedArrow(6.0, 0));

  // (d) Static Ground Speed Stencil: "10" km/h
  const speedCanvas = document.createElement("canvas");
  speedCanvas.width = 256;
  speedCanvas.height = 128;
  const sctx = speedCanvas.getContext("2d");
  if (sctx) {
    sctx.strokeStyle = "rgba(203, 213, 225, 0.55)";
    sctx.lineWidth = 8;
    sctx.beginPath();
    sctx.arc(128, 64, 50, 0, Math.PI * 2);
    sctx.stroke();

    sctx.fillStyle = "rgba(203, 213, 225, 0.65)";
    sctx.font = "bold 52px monospace";
    sctx.textAlign = "center";
    sctx.textBaseline = "middle";
    sctx.fillText("10", 128, 64);
  }
  const speedTex = new THREE.CanvasTexture(speedCanvas);
  const speedGeo = new THREE.PlaneGeometry(2.2, 1.1);
  speedGeo.rotateX(-Math.PI / 2);
  const speedMat = new THREE.MeshBasicMaterial({
    map: speedTex,
    transparent: true,
    depthWrite: false,
  });
  const speedMesh = new THREE.Mesh(speedGeo, speedMat);
  speedMesh.position.set(-1.0, 0.012, 0);
  envGroup.add(speedMesh);

  // ── 3. Structural Concrete Columns ──
  // Hazard stripe texture for column base
  const hazardCanvas = document.createElement("canvas");
  hazardCanvas.width = 256;
  hazardCanvas.height = 64;
  const hctx = hazardCanvas.getContext("2d");
  if (hctx) {
    hctx.fillStyle = "#eab308"; // Safety yellow
    hctx.fillRect(0, 0, 256, 64);
    hctx.fillStyle = "#0f172a"; // Dark stripe
    for (let i = -64; i < 320; i += 32) {
      hctx.beginPath();
      hctx.moveTo(i, 0);
      hctx.lineTo(i + 16, 0);
      hctx.lineTo(i + 16 - 32, 64);
      hctx.lineTo(i - 32, 64);
      hctx.closePath();
      hctx.fill();
    }
  }
  const hazardTex = new THREE.CanvasTexture(hazardCanvas);
  hazardTex.wrapS = THREE.RepeatWrapping;
  hazardTex.repeat.set(2, 1);
  const hazardMat = new THREE.MeshStandardMaterial({
    map: hazardTex,
    roughness: 0.5,
    metalness: 0.1,
  });

  // 6 Structural Columns positioned at grid boundary lines (never blocking any parking bay entrance)
  const columnPositions: { pos: [number, number, number]; id: string }[] = [
    // North Row (Z = -3.7 line, placed at zone ends and the exact midpoint between SP-05 and SP-06)
    { pos: [-16.2, 3.0, -3.7], id: "C-01" },
    { pos: [0.0, 3.0, -3.7], id: "C-02" },
    { pos: [16.2, 3.0, -3.7], id: "C-03" },
    // South Row (Z = +3.7 line, placed at zone ends and the exact midpoint between SP-15 and SP-16)
    { pos: [-16.2, 3.0, 3.7], id: "D-01" },
    { pos: [0.0, 3.0, 3.7], id: "D-02" },
    { pos: [16.2, 3.0, 3.7], id: "D-03" },
  ];

  const colGeo = new THREE.BoxGeometry(0.55, 6.0, 0.55);
  const collarGeo = new THREE.BoxGeometry(0.58, 0.75, 0.58);

  columnPositions.forEach(({ pos: [cx, cy, cz], id }) => {
    // Column pillar shaft
    const colMesh = new THREE.Mesh(colGeo, columnMat);
    colMesh.position.set(cx, cy, cz);
    colMesh.castShadow = true;
    colMesh.receiveShadow = true;
    envGroup.add(colMesh);

    // Hazard safety collar at base
    const collarMesh = new THREE.Mesh(collarGeo, hazardMat);
    collarMesh.position.set(cx, 0.38, cz);
    envGroup.add(collarMesh);

    // Stenciled Column ID plaque
    const idCanvas = document.createElement("canvas");
    idCanvas.width = 128;
    idCanvas.height = 64;
    const ictx = idCanvas.getContext("2d");
    if (ictx) {
      ictx.fillStyle = "#0f172a";
      ictx.fillRect(0, 0, 128, 64);
      ictx.strokeStyle = "#38bdf8";
      ictx.lineWidth = 4;
      ictx.strokeRect(2, 2, 124, 60);

      ictx.fillStyle = "#38bdf8";
      ictx.font = "bold 32px monospace";
      ictx.textAlign = "center";
      ictx.textBaseline = "middle";
      ictx.fillText(id, 64, 32);
    }
    const idTex = new THREE.CanvasTexture(idCanvas);
    const idGeo = new THREE.PlaneGeometry(0.48, 0.24);
    const idMat = new THREE.MeshBasicMaterial({ map: idTex });
    const idMesh = new THREE.Mesh(idGeo, idMat);

    // Face towards drive aisle
    const isNorth = cz < 0;
    idMesh.position.set(cx, 2.4, cz + (isNorth ? 0.29 : -0.29));
    if (!isNorth) {
      idMesh.rotation.y = Math.PI;
    }
    envGroup.add(idMesh);
  });

  // ── 4. Low Concrete Perimeter Barrier Walls ──
  // Keeps the scene visually open while establishing realistic physical boundary edges
  const wallHeight = 0.85;
  const wallThickness = 0.26;

  // (a) North rear perimeter barrier (behind Row A bays at Z = -9.2)
  const northWallGeo = new THREE.BoxGeometry(34.0, wallHeight, wallThickness);
  const northWall = new THREE.Mesh(northWallGeo, wallMat);
  northWall.position.set(0, wallHeight / 2, -9.2);
  northWall.castShadow = true;
  northWall.receiveShadow = true;
  envGroup.add(northWall);

  const northWallCap = new THREE.Mesh(
    new THREE.BoxGeometry(34.2, 0.08, wallThickness + 0.06),
    wallCapMat
  );
  northWallCap.position.set(0, wallHeight + 0.04, -9.2);
  envGroup.add(northWallCap);

  // (b) South rear perimeter barrier (behind Row B bays at Z = +9.2)
  const southWall = new THREE.Mesh(northWallGeo, wallMat);
  southWall.position.set(0, wallHeight / 2, 9.2);
  southWall.castShadow = true;
  southWall.receiveShadow = true;
  envGroup.add(southWall);

  const southWallCap = northWallCap.clone();
  southWallCap.position.z = 9.2;
  envGroup.add(southWallCap);

  // (c) End stub walls (framing the perimeter while leaving the 7m central drive aisle completely open)
  const stubWallGeo = new THREE.BoxGeometry(wallThickness, wallHeight, 5.5);
  // West North stub
  const wNorthStub = new THREE.Mesh(stubWallGeo, wallMat);
  wNorthStub.position.set(-17.0, wallHeight / 2, -6.4);
  envGroup.add(wNorthStub);

  // West South stub
  const wSouthStub = new THREE.Mesh(stubWallGeo, wallMat);
  wSouthStub.position.set(-17.0, wallHeight / 2, 6.4);
  envGroup.add(wSouthStub);

  // East North stub
  const eNorthStub = new THREE.Mesh(stubWallGeo, wallMat);
  eNorthStub.position.set(17.0, wallHeight / 2, -6.4);
  envGroup.add(eNorthStub);

  // East South stub
  const eSouthStub = new THREE.Mesh(stubWallGeo, wallMat);
  eSouthStub.position.set(17.0, wallHeight / 2, 6.4);
  envGroup.add(eSouthStub);

  // ── 5. Overhead Transverse Ceiling Beams & Linear Lights ──
  // High-clearance structural rafters at Y = 6.0m that do not block sightlines
  const beamXs = [-16.2, 0.0, 16.2];
  const beamGeo = new THREE.BoxGeometry(0.3, 0.35, 18.4);

  beamXs.forEach((bx) => {
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(bx, 6.0, 0);
    beam.castShadow = false; // Avoid harsh diagonal bars on ground
    envGroup.add(beam);
  });

  // Overhead Linear LED Garage Light Fixtures suspended along the drive aisle
  const trofferMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0f172a"),
    roughness: 0.5,
  });
  const trofferLightMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#f8fafc"),
    emissive: new THREE.Color("#f1f5f9"),
    emissiveIntensity: 1.2,
  });

  const trofferGeo = new THREE.BoxGeometry(2.4, 0.08, 0.28);
  const trofferLensGeo = new THREE.BoxGeometry(2.3, 0.02, 0.22);

  const lightXs = [-8.0, 8.0];
  lightXs.forEach((lx) => {
    // Housing
    const troffer = new THREE.Mesh(trofferGeo, trofferMat);
    troffer.position.set(lx, 5.85, 0);
    envGroup.add(troffer);

    // Glowing lens
    const lens = new THREE.Mesh(trofferLensGeo, trofferLightMat);
    lens.position.set(lx, 5.80, 0);
    envGroup.add(lens);

    // Actual soft downward garage light
    const garageLight = new THREE.PointLight("#e2e8f0", 0.65, 14, 1.4);
    garageLight.position.set(lx, 5.6, 0);
    envGroup.add(garageLight);
  });

  // ── 6. Overhead Facility Signage (Suspended Gantry Sign) ──
  const signCanvas = document.createElement("canvas");
  signCanvas.width = 512;
  signCanvas.height = 128;
  const sctx2 = signCanvas.getContext("2d");
  if (sctx2) {
    sctx2.fillStyle = "#0c1524";
    sctx2.fillRect(0, 0, 512, 128);

    // Cyan border frame
    sctx2.strokeStyle = "#0ea5e9";
    sctx2.lineWidth = 6;
    sctx2.strokeRect(6, 6, 500, 116);

    // Blue Parking "P" Box
    sctx2.fillStyle = "#0284c7";
    sctx2.beginPath();
    sctx2.roundRect(24, 24, 80, 80, 12);
    sctx2.fill();

    sctx2.fillStyle = "#ffffff";
    sctx2.font = "bold 56px sans-serif";
    sctx2.textAlign = "center";
    sctx2.textBaseline = "middle";
    sctx2.fillText("P", 64, 64);

    // Text: PARKING · LEVEL B2
    sctx2.fillStyle = "#ffffff";
    sctx2.font = "bold 36px sans-serif";
    sctx2.textAlign = "left";
    sctx2.fillText("LEVEL B2 · ZONE C", 130, 48);

    // Subtitle: SP-01 TO SP-20
    sctx2.fillStyle = "#38bdf8";
    sctx2.font = "bold 22px monospace";
    sctx2.fillText("BAYS SP-01 → SP-20", 130, 88);
  }
  const signTex = new THREE.CanvasTexture(signCanvas);
  const signMat = new THREE.MeshBasicMaterial({ map: signTex });

  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), signMat);
  // Suspended at the West entrance of the drive aisle, high clearance
  signMesh.position.set(-13.0, 5.1, 0);
  envGroup.add(signMesh);

  // Back side of the sign
  const signBack = signMesh.clone();
  signBack.rotation.y = Math.PI;
  envGroup.add(signBack);

  // Sign suspension rods
  const rodMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
  const rodGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.9);
  const leftRod = new THREE.Mesh(rodGeo, rodMat);
  leftRod.position.set(-14.4, 5.55, 0);
  envGroup.add(leftRod);

  const rightRod = leftRod.clone();
  rightRod.position.x = -11.6;
  envGroup.add(rightRod);

  return envGroup;
}
