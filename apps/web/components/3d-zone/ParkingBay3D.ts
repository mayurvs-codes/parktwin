import * as THREE from "three";
import type { ParkingBayData } from "./types";

export interface ParkingBayMeshGroup extends THREE.Group {
  bayData: ParkingBayData;
  setSelected: (selected: boolean) => void;
  setHovered: (hovered: boolean) => void;
  updateAnimation: (time: number) => void;
}

/**
 * Creates an authentic 3D parking bay with Phase 3 selection & hover states:
 * - Crisp white thermoplastic boundary lines (2.8m x 5.4m)
 * - Industrial rubber wheel stop with dual safety-yellow reflective stripes at back wall
 * - Grounded stenciled slot ID (SP-01 to SP-20) painted onto the asphalt
 * - Integrated floor LED occupancy indicator beacon at the drive aisle threshold (Green = Available, Red = Occupied, Blue = Selected)
 * - Interactive hover pad & selection highlight outline
 * - Animated floating selection pin/star marker (★ SP-xx)
 * - Invisible hit-plane for smooth raycasting
 */
export function createParkingBay3D(bay: ParkingBayData): ParkingBayMeshGroup {
  const group = new THREE.Group() as ParkingBayMeshGroup;
  group.name = `bay-${bay.id}`;
  group.bayData = bay;
  group.position.set(bay.position[0], bay.position[1], bay.position[2]);
  group.rotation.y = bay.rotationY;

  const isAvailable = bay.status === "AVAILABLE";
  const lineWidth = 0.12;
  const halfW = bay.width / 2;
  const halfL = bay.length / 2;

  let isSelected = false;
  let isHovered = false;

  // 1. Painted White Boundary Lines (Thermoplastic Parking Paint)
  const defaultLineMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#f8fafc"),
    roughness: 0.55,
    metalness: 0.08,
  });

  const selectedLineMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#38bdf8"),
    emissive: new THREE.Color("#0284c7"),
    emissiveIntensity: 0.8,
    roughness: 0.3,
  });

  const hoveredLineMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#7dd3fc"),
    roughness: 0.4,
  });

  // Left boundary line
  const sideLineGeo = new THREE.BoxGeometry(lineWidth, 0.02, bay.length);
  const leftLine = new THREE.Mesh(sideLineGeo, defaultLineMat);
  leftLine.position.set(-halfW, 0.012, 0);
  leftLine.receiveShadow = true;
  group.add(leftLine);

  // Right boundary line
  const rightLine = leftLine.clone();
  rightLine.position.set(halfW, 0.012, 0);
  group.add(rightLine);

  // Back boundary line (at the back wall, +halfL)
  const backLineGeo = new THREE.BoxGeometry(bay.width + lineWidth, 0.02, lineWidth);
  const backLine = new THREE.Mesh(backLineGeo, defaultLineMat);
  backLine.position.set(0, 0.012, halfL);
  backLine.receiveShadow = true;
  group.add(backLine);

  // 2. Parking Wheel Stop (Industrial Rubber Curb at the back wall)
  const bumperGroup = new THREE.Group();
  bumperGroup.position.set(0, 0.07, halfL - 0.75);

  const bumperWidth = 2.0;
  const bumperMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1e293b"),
    roughness: 0.85,
    metalness: 0.1,
  });
  const bumperGeo = new THREE.BoxGeometry(bumperWidth, 0.14, 0.22);
  const bumperMesh = new THREE.Mesh(bumperGeo, bumperMat);
  bumperMesh.castShadow = true;
  bumperMesh.receiveShadow = true;
  bumperGroup.add(bumperMesh);

  // Yellow Safety Reflective Stripes on Wheel Stop
  const stripeMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#eab308"),
    emissive: new THREE.Color("#ca8a04"),
    emissiveIntensity: 0.35,
    roughness: 0.4,
  });
  const stripeGeo = new THREE.BoxGeometry(0.24, 0.142, 0.222);

  const leftStripe = new THREE.Mesh(stripeGeo, stripeMat);
  leftStripe.position.x = -bumperWidth * 0.28;
  bumperGroup.add(leftStripe);

  const rightStripe = leftStripe.clone();
  rightStripe.position.x = bumperWidth * 0.28;
  bumperGroup.add(rightStripe);

  group.add(bumperGroup);

  // 3. Ground Bay Slot ID Stencil (e.g. SP-01, SP-13)
  const textCanvas = document.createElement("canvas");
  textCanvas.width = 256;
  textCanvas.height = 128;
  const tctx = textCanvas.getContext("2d");
  const isRotated = Math.abs(bay.rotationY) > 0.1;

  const renderStencil = (highlighted: boolean) => {
    if (!tctx) return;
    tctx.clearRect(0, 0, 256, 128);
    tctx.fillStyle = highlighted ? "#38bdf8" : isAvailable ? "#f1f5f9" : "#cbd5e1";
    tctx.font = "bold 64px monospace";
    tctx.textAlign = "center";
    tctx.textBaseline = "middle";

    if (isRotated) {
      tctx.save();
      tctx.translate(128, 64);
      tctx.rotate(Math.PI);
      tctx.fillText(bay.id, 0, 0);
      tctx.restore();
    } else {
      tctx.fillText(bay.id, 128, 64);
    }
  };
  renderStencil(false);

  const textTex = new THREE.CanvasTexture(textCanvas);
  const textPlaneGeo = new THREE.PlaneGeometry(1.8, 0.9);
  textPlaneGeo.rotateX(-Math.PI / 2);
  const textMat = new THREE.MeshBasicMaterial({
    map: textTex,
    transparent: true,
    opacity: isAvailable ? 0.95 : 0.85,
    depthWrite: false,
  });
  const textPlane = new THREE.Mesh(textPlaneGeo, textMat);
  textPlane.position.set(0, 0.016, isAvailable ? 0 : -halfL + 0.45);
  group.add(textPlane);

  // 4. Subtle Bay Floor Tint Pad (Available & Selection Glow)
  const padGeo = new THREE.PlaneGeometry(bay.width - 0.2, bay.length - 0.2);
  padGeo.rotateX(-Math.PI / 2);
  const padMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(isAvailable ? "#059669" : "#0f172a"),
    transparent: true,
    opacity: isAvailable ? 0.08 : 0,
    depthWrite: false,
  });
  const statusPad = new THREE.Mesh(padGeo, padMat);
  statusPad.position.set(0, 0.013, 0);
  group.add(statusPad);

  // 5. Active Selection Outline Border
  const selBorderMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#0ea5e9"),
    emissive: new THREE.Color("#38bdf8"),
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  const selBorderGroup = new THREE.Group();
  selBorderGroup.visible = false;

  const bTopGeo = new THREE.BoxGeometry(bay.width + 0.2, 0.03, 0.16);
  const bSideGeo = new THREE.BoxGeometry(0.16, 0.03, bay.length + 0.2);

  const bFront = new THREE.Mesh(bTopGeo, selBorderMat);
  bFront.position.set(0, 0.018, -halfL);
  selBorderGroup.add(bFront);

  const bBack = new THREE.Mesh(bTopGeo, selBorderMat);
  bBack.position.set(0, 0.018, halfL);
  selBorderGroup.add(bBack);

  const bLeft = new THREE.Mesh(bSideGeo, selBorderMat);
  bLeft.position.set(-halfW - 0.02, 0.018, 0);
  selBorderGroup.add(bLeft);

  const bRight = new THREE.Mesh(bSideGeo, selBorderMat);
  bRight.position.set(halfW + 0.02, 0.018, 0);
  selBorderGroup.add(bRight);

  group.add(selBorderGroup);

  // 6. Integrated Entrance Threshold Status LED Beacon (Green / Red / Blue)
  const beaconGroup = new THREE.Group();
  beaconGroup.position.set(0, 0.016, -halfL + 0.12);

  const collarGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.03, 20);
  const collarMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#090d16"),
    metalness: 0.9,
    roughness: 0.3,
  });
  const collar = new THREE.Mesh(collarGeo, collarMat);
  beaconGroup.add(collar);

  const ledGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16);
  const defaultLedColor = isAvailable ? "#22c55e" : "#ef4444";
  const defaultLedEmissive = isAvailable ? "#4ade80" : "#f87171";

  const ledMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(defaultLedColor),
    emissive: new THREE.Color(defaultLedEmissive),
    emissiveIntensity: 0.85,
    roughness: 0.2,
  });
  const led = new THREE.Mesh(ledGeo, ledMat);
  led.position.y = 0.01;
  beaconGroup.add(led);

  group.add(beaconGroup);

  // 7. Floating Selection Marker Pin / Star (★ SP-16)
  const markerGroup = new THREE.Group();
  markerGroup.position.set(0, 2.2, 0);
  markerGroup.visible = false;

  // Star Badge Sprite Canvas
  const badgeCanvas = document.createElement("canvas");
  badgeCanvas.width = 256;
  badgeCanvas.height = 96;
  const bctx = badgeCanvas.getContext("2d");
  if (bctx) {
    bctx.fillStyle = "rgba(2, 132, 199, 0.92)";
    bctx.strokeStyle = "#38bdf8";
    bctx.lineWidth = 4;
    bctx.beginPath();
    bctx.roundRect(8, 8, 240, 80, 16);
    bctx.fill();
    bctx.stroke();

    bctx.fillStyle = "#ffffff";
    bctx.font = "bold 34px monospace";
    bctx.textAlign = "center";
    bctx.textBaseline = "middle";
    bctx.fillText(`★ ${bay.id}`, 128, 48);
  }
  const badgeTex = new THREE.CanvasTexture(badgeCanvas);
  const badgeMat = new THREE.SpriteMaterial({
    map: badgeTex,
    transparent: true,
    depthTest: false,
  });
  const badgeSprite = new THREE.Sprite(badgeMat);
  badgeSprite.scale.set(1.6, 0.6, 1);
  markerGroup.add(badgeSprite);

  // Downward pointer chevron
  const chevronGeo = new THREE.ConeGeometry(0.22, 0.45, 4);
  chevronGeo.rotateX(Math.PI);
  const chevronMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#38bdf8"),
    emissive: new THREE.Color("#0284c7"),
    emissiveIntensity: 0.7,
  });
  const chevronMesh = new THREE.Mesh(chevronGeo, chevronMat);
  chevronMesh.position.set(0, -0.42, 0);
  markerGroup.add(chevronMesh);

  group.add(markerGroup);

  // 8. Invisible Hit Box for Raycasting
  const hitGeo = new THREE.PlaneGeometry(bay.width, bay.length);
  hitGeo.rotateX(-Math.PI / 2);
  const hitMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const hitPlane = new THREE.Mesh(hitGeo, hitMat);
  hitPlane.position.set(0, 0.02, 0);
  group.add(hitPlane);

  // ── State Change Handlers ──
  const updateVisualState = () => {
    if (isSelected) {
      // Lines -> Vibrant Cyan
      leftLine.material = selectedLineMat;
      rightLine.material = selectedLineMat;
      backLine.material = selectedLineMat;
      // Pad -> Glowing blue
      padMat.color.set("#0284c7");
      padMat.opacity = 0.28;
      // Outline border & floating marker
      selBorderGroup.visible = true;
      markerGroup.visible = true;
      // LED beacon -> Cyan
      ledMat.color.set("#38bdf8");
      ledMat.emissive.set("#38bdf8");
      ledMat.emissiveIntensity = 1.4;
      renderStencil(true);
      textTex.needsUpdate = true;
    } else if (isHovered && isAvailable) {
      // Hover highlight
      leftLine.material = hoveredLineMat;
      rightLine.material = hoveredLineMat;
      backLine.material = hoveredLineMat;
      padMat.color.set("#0284c7");
      padMat.opacity = 0.16;
      selBorderGroup.visible = false;
      markerGroup.visible = false;
      ledMat.color.set("#38bdf8");
      ledMat.emissive.set("#38bdf8");
      ledMat.emissiveIntensity = 1.0;
      renderStencil(true);
      textTex.needsUpdate = true;
    } else {
      // Normal state
      leftLine.material = defaultLineMat;
      rightLine.material = defaultLineMat;
      backLine.material = defaultLineMat;
      padMat.color.set(isAvailable ? "#059669" : "#0f172a");
      padMat.opacity = isAvailable ? 0.08 : 0;
      selBorderGroup.visible = false;
      markerGroup.visible = false;
      ledMat.color.set(defaultLedColor);
      ledMat.emissive.set(defaultLedEmissive);
      ledMat.emissiveIntensity = 0.85;
      renderStencil(false);
      textTex.needsUpdate = true;
    }
  };

  group.setSelected = (selected: boolean) => {
    isSelected = selected;
    updateVisualState();
  };

  group.setHovered = (hovered: boolean) => {
    isHovered = hovered;
    updateVisualState();
  };

  group.updateAnimation = (time: number) => {
    if (isSelected && markerGroup.visible) {
      markerGroup.position.y = 2.2 + Math.sin(time * 3.5) * 0.12;
      chevronMesh.rotation.y = time * 2;
    }
  };

  return group;
}
