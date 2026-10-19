import * as THREE from "three";
import type { VehicleBodyType } from "./types";

export interface CreateVehicle3DOptions {
  color?: string;
  label?: string;
  bodyType?: VehicleBodyType;
  isTarget?: boolean;
}

export interface Vehicle3DGroup extends THREE.Group {
  setHeadlights: (active: boolean) => void;
  setBrakeLights: (active: boolean) => void;
  updateLabel: (label: string) => void;
  setLabelVisible: (visible: boolean) => void;
  bodyType: VehicleBodyType;
}

/**
 * Creates a procedural, stylized, lightweight 3D vehicle with 4 distinct body variations:
 * - SUV: Taller, boxier cabin, roof rails, high ground clearance
 * - Sedan: Sleek 3-box profile, aerodynamic roof, lower profile
 * - Hatchback: 2-box profile with steep rear hatch and sporty spoiler lip
 * - Compact: Short wheelbase, rounded urban commuter
 *
 * All variations feature:
 * - Realistic proportions and body contours
 * - Dark tinted glass windows
 * - 4 wheels with rubber tires and alloy rims
 * - Headlights with warm beam glow and ruby taillights
 * - Front and rear license plates
 * - Ground contact shadow
 */
export function createVehicle3D(options: CreateVehicle3DOptions = {}): Vehicle3DGroup {
  const {
    color = "#38bdf8",
    label = "VEH-001",
    bodyType = "sedan",
    isTarget = false,
  } = options;

  const vehicleGroup = new THREE.Group() as Vehicle3DGroup;
  vehicleGroup.name = `vehicle-${label}`;
  vehicleGroup.bodyType = bodyType;

  // ── Materials ──
  const paintMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    metalness: 0.65,
    roughness: 0.32,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#050811"),
    metalness: 0.92,
    roughness: 0.08,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#182030"),
    roughness: 0.85,
  });

  const tireMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#090d16"),
    roughness: 0.95,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#cbd5e1"),
    metalness: 0.88,
    roughness: 0.22,
  });

  const headlightMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#fef08a"),
    emissive: new THREE.Color("#fef08a"),
    emissiveIntensity: 0.45,
  });

  const taillightMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#ef4444"),
    emissive: new THREE.Color("#ef4444"),
    emissiveIntensity: 0.45,
  });

  // ── Dimensional Parameters per Body Type ──
  let totalLength = 4.4;
  let totalWidth = 1.9;
  let chassisH = 0.52;
  let groundClearance = 0.22;
  let cabinL = 2.3;
  let cabinW = 1.62;
  let cabinH = 0.52;
  let cabinZOffset = -0.15;
  let wheelRadius = 0.36;
  let wheelTrack = 1.35;

  if (bodyType === "suv") {
    totalLength = 4.45;
    totalWidth = 2.0;
    chassisH = 0.62;
    groundClearance = 0.28;
    cabinL = 2.65;
    cabinW = 1.72;
    cabinH = 0.62;
    cabinZOffset = -0.3;
    wheelRadius = 0.40;
    wheelTrack = 1.38;
  } else if (bodyType === "sedan") {
    totalLength = 4.48;
    totalWidth = 1.88;
    chassisH = 0.48;
    groundClearance = 0.20;
    cabinL = 2.32;
    cabinW = 1.58;
    cabinH = 0.48;
    cabinZOffset = -0.15;
    wheelRadius = 0.35;
    wheelTrack = 1.35;
  } else if (bodyType === "hatchback") {
    totalLength = 3.92;
    totalWidth = 1.84;
    chassisH = 0.50;
    groundClearance = 0.20;
    cabinL = 2.15;
    cabinW = 1.58;
    cabinH = 0.52;
    cabinZOffset = -0.32;
    wheelRadius = 0.34;
    wheelTrack = 1.18;
  } else if (bodyType === "compact") {
    totalLength = 3.65;
    totalWidth = 1.76;
    chassisH = 0.48;
    groundClearance = 0.18;
    cabinL = 1.98;
    cabinW = 1.52;
    cabinH = 0.50;
    cabinZOffset = -0.22;
    wheelRadius = 0.32;
    wheelTrack = 1.08;
  }

  const chassisCenterY = groundClearance + chassisH / 2;
  const cabinCenterY = groundClearance + chassisH + cabinH / 2 - 0.04;

  // 1. Lower Main Body / Chassis
  const chassisGeo = new THREE.BoxGeometry(totalWidth, chassisH, totalLength);
  const chassisMesh = new THREE.Mesh(chassisGeo, paintMat);
  chassisMesh.position.y = chassisCenterY;
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  vehicleGroup.add(chassisMesh);

  // 2. Cabin / Greenhouse (Dark Tinted Glass)
  const cabinGeo = new THREE.BoxGeometry(cabinW, cabinH, cabinL);
  const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
  cabinMesh.position.set(0, cabinCenterY, cabinZOffset);
  cabinMesh.castShadow = true;
  vehicleGroup.add(cabinMesh);

  // 3. Painted Roof Cap
  const roofCapGeo = new THREE.BoxGeometry(cabinW - 0.04, 0.08, cabinL - 0.1);
  const roofCapMesh = new THREE.Mesh(roofCapGeo, paintMat);
  roofCapMesh.position.set(0, cabinCenterY + cabinH / 2 + 0.02, cabinZOffset);
  vehicleGroup.add(roofCapMesh);

  // Roof details per type:
  if (bodyType === "suv") {
    // SUV Roof Rack Rails
    const railMat = trimMat;
    const railGeo = new THREE.BoxGeometry(0.06, 0.08, cabinL * 0.85);
    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.position.set(-cabinW * 0.42, cabinCenterY + cabinH / 2 + 0.08, cabinZOffset);
    vehicleGroup.add(leftRail);

    const rightRail = leftRail.clone();
    rightRail.position.x = cabinW * 0.42;
    vehicleGroup.add(rightRail);
  } else if (bodyType === "hatchback") {
    // Sporty Rear Hatch Spoiler
    const spoilerGeo = new THREE.BoxGeometry(cabinW * 0.95, 0.06, 0.28);
    const spoiler = new THREE.Mesh(spoilerGeo, trimMat);
    spoiler.position.set(0, cabinCenterY + cabinH / 2 + 0.04, cabinZOffset - cabinL / 2 - 0.08);
    vehicleGroup.add(spoiler);
  }

  // 4. Front & Rear Bumpers (Dark protective trim)
  const halfLen = totalLength / 2;
  const bumperGeo = new THREE.BoxGeometry(totalWidth * 0.98, chassisH * 0.5, 0.22);

  const frontBumper = new THREE.Mesh(bumperGeo, trimMat);
  frontBumper.position.set(0, groundClearance + chassisH * 0.3, halfLen + 0.08);
  vehicleGroup.add(frontBumper);

  const rearBumper = frontBumper.clone();
  rearBumper.position.set(0, groundClearance + chassisH * 0.3, -halfLen - 0.08);
  vehicleGroup.add(rearBumper);

  // 5. Side Mirrors
  const mirrorGeo = new THREE.BoxGeometry(0.22, 0.12, 0.15);
  const leftMirror = new THREE.Mesh(mirrorGeo, paintMat);
  leftMirror.position.set(-totalWidth / 2 - 0.08, chassisCenterY + chassisH * 0.45, cabinZOffset + cabinL * 0.4);
  vehicleGroup.add(leftMirror);

  const rightMirror = leftMirror.clone();
  rightMirror.position.x = totalWidth / 2 + 0.08;
  vehicleGroup.add(rightMirror);

  // 6. Recessed Headlights & Taillights
  const headlightW = totalWidth * 0.18;
  const headlightGeo = new THREE.BoxGeometry(headlightW, 0.12, 0.08);

  const leftHeadlight = new THREE.Mesh(headlightGeo, headlightMat);
  leftHeadlight.position.set(-totalWidth * 0.34, chassisCenterY + 0.05, halfLen + 0.1);
  vehicleGroup.add(leftHeadlight);

  const rightHeadlight = leftHeadlight.clone();
  rightHeadlight.position.x = totalWidth * 0.34;
  vehicleGroup.add(rightHeadlight);

  // Taillights
  const taillightW = totalWidth * 0.2;
  const taillightGeo = new THREE.BoxGeometry(taillightW, 0.10, 0.08);

  const leftTaillight = new THREE.Mesh(taillightGeo, taillightMat);
  leftTaillight.position.set(-totalWidth * 0.34, chassisCenterY + 0.08, -halfLen - 0.1);
  vehicleGroup.add(leftTaillight);

  const rightTaillight = leftTaillight.clone();
  rightTaillight.position.x = totalWidth * 0.34;
  vehicleGroup.add(rightTaillight);

  // 7. Four Wheels with Rubber Tires & Alloy Rims
  const wheelThickness = 0.26;
  const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelThickness, 24);
  tireGeo.rotateZ(Math.PI / 2);

  const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.65, wheelRadius * 0.65, wheelThickness + 0.015, 16);
  rimGeo.rotateZ(Math.PI / 2);

  const halfWidth = totalWidth / 2;
  const wheelPositions = [
    [-halfWidth - 0.02, wheelRadius, wheelTrack], // Front-Left
    [halfWidth + 0.02, wheelRadius, wheelTrack], // Front-Right
    [-halfWidth - 0.02, wheelRadius, -wheelTrack], // Rear-Left
    [halfWidth + 0.02, wheelRadius, -wheelTrack], // Rear-Right
  ];

  wheelPositions.forEach(([wx, wy, wz]) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wx!, wy!, wz!);

    const tireMesh = new THREE.Mesh(tireGeo, tireMat);
    tireMesh.castShadow = true;
    wheelGroup.add(tireMesh);

    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    wheelGroup.add(rimMesh);

    vehicleGroup.add(wheelGroup);
  });

  // 8. Ground Contact Shadow
  const shadowGeo = new THREE.PlaneGeometry(totalWidth * 1.15, totalLength * 1.08);
  shadowGeo.rotateX(-Math.PI / 2);
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = 128;
  shadowCanvas.height = 256;
  const sctx = shadowCanvas.getContext("2d");
  if (sctx) {
    const grad = sctx.createRadialGradient(64, 128, 10, 64, 128, 95);
    grad.addColorStop(0, "rgba(0,0,0,0.72)");
    grad.addColorStop(0.55, "rgba(0,0,0,0.38)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 128, 256);
  }
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
  contactShadow.position.y = 0.01;
  vehicleGroup.add(contactShadow);

  // 9. Front & Rear License Plates
  const plateCanvas = document.createElement("canvas");
  plateCanvas.width = 128;
  plateCanvas.height = 36;
  const pctx = plateCanvas.getContext("2d");
  if (pctx) {
    pctx.fillStyle = "#ffffff";
    pctx.fillRect(0, 0, 128, 36);
    pctx.fillStyle = "#090d16";
    pctx.font = "bold 18px monospace";
    pctx.textAlign = "center";
    pctx.textBaseline = "middle";
    pctx.fillText(label, 64, 18);
  }
  const plateTex = new THREE.CanvasTexture(plateCanvas);
  const plateMat = new THREE.MeshBasicMaterial({ map: plateTex });
  const plateGeo = new THREE.PlaneGeometry(0.48, 0.14);

  // Front plate
  const frontPlate = new THREE.Mesh(plateGeo, plateMat);
  frontPlate.position.set(0, groundClearance + chassisH * 0.28, halfLen + 0.2);
  vehicleGroup.add(frontPlate);

  // Rear plate
  const rearPlate = frontPlate.clone();
  rearPlate.rotation.y = Math.PI;
  rearPlate.position.set(0, groundClearance + chassisH * 0.28, -halfLen - 0.2);
  vehicleGroup.add(rearPlate);

  // 10. Floating Vehicle Badge Sprite
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 256;
  labelCanvas.height = 64;
  const lctx = labelCanvas.getContext("2d");

  const drawLabel = (text: string) => {
    if (!lctx) return;
    lctx.clearRect(0, 0, 256, 64);
    lctx.fillStyle = isTarget ? "rgba(14, 165, 233, 0.9)" : "rgba(15, 23, 42, 0.88)";
    lctx.strokeStyle = isTarget ? "#38bdf8" : "#475569";
    lctx.lineWidth = 2.5;
    const r = 8;
    lctx.beginPath();
    lctx.moveTo(r, 0);
    lctx.lineTo(256 - r, 0);
    lctx.quadraticCurveTo(256, 0, 256, r);
    lctx.lineTo(256, 64 - r);
    lctx.quadraticCurveTo(256, 64, 256 - r, 64);
    lctx.lineTo(r, 64);
    lctx.quadraticCurveTo(0, 64, 0, 64 - r);
    lctx.lineTo(0, r);
    lctx.quadraticCurveTo(0, 0, r, 0);
    lctx.closePath();
    lctx.fill();
    lctx.stroke();

    lctx.fillStyle = "#ffffff";
    lctx.font = "bold 28px monospace";
    lctx.textAlign = "center";
    lctx.textBaseline = "middle";
    lctx.fillText(text, 128, 32);
  };
  drawLabel(label);

  const labelTex = new THREE.CanvasTexture(labelCanvas);
  const labelMat = new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthTest: false });
  const labelSprite = new THREE.Sprite(labelMat);
  const spriteY = cabinCenterY + cabinH / 2 + 0.65;
  labelSprite.position.set(0, spriteY, 0);
  labelSprite.scale.set(1.4, 0.35, 1);
  labelSprite.visible = false;
  vehicleGroup.add(labelSprite);

  // Dynamic light control methods
  vehicleGroup.setHeadlights = (active: boolean) => {
    headlightMat.emissiveIntensity = active ? 1.6 : 0.45;
  };

  vehicleGroup.setBrakeLights = (active: boolean) => {
    taillightMat.emissiveIntensity = active ? 1.8 : 0.45;
  };

  vehicleGroup.updateLabel = (newLabel: string) => {
    drawLabel(newLabel);
    labelTex.needsUpdate = true;
  };

  vehicleGroup.setLabelVisible = (visible: boolean) => {
    labelSprite.visible = visible;
  };

  return vehicleGroup;
}
