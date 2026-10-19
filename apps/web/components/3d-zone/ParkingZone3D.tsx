"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import {
  Compass,
  RotateCcw,
  Eye,
  Car,
  ArrowLeft,
  Info,
  CheckCircle2,
  Navigation,
  Sparkles,
  Lock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ParkingBayData, CameraPreset } from "./types";
import { createVehicle3D } from "./Vehicle3D";
import { createParkingBay3D, type ParkingBayMeshGroup } from "./ParkingBay3D";
import { createZoneEnvironment } from "./Environment3D";
import { setupZoneCamera, type ZoneCameraManager } from "./ZoneCamera";
import { createZoneRoute3D, type ZoneRouteGroup } from "./ZoneRoute3D";

// ── 20 Parking Spaces: Exactly 12 Occupied + 8 Available ──
const PARKING_LOT_BAYS: ParkingBayData[] = [
  // Row A (North Row: 10 spaces, all occupied SP-01 to SP-10) — Strictly Green or Red only
  {
    id: "SP-01",
    label: "01",
    position: [-14.4, 0, -6.2],
    rotationY: Math.PI,
    width: 2.8,
    length: 5.4,
    status: "OCCUPIED",
    vehicle: { id: "VEH-001", color: "#ef4444", model: "Cyber SUV", bodyType: "suv" },
  },
  {
    id: "SP-02",
    label: "02",
    position: [-11.2, 0, -6.2],
    rotationY: Math.PI,
    width: 2.8,
    length: 5.4,
    status: "OCCUPIED",
    vehicle: { id: "VEH-002", color: "#10b981", model: "Executive Sedan", bodyType: "sedan" },
  },
  {
    id: "SP-03",
    label: "03",
    position: [-8.0, 0, -6.2],
    rotationY: Math.PI,
    width: 2.8,
    length: 5.4,
    status: "OCCUPIED",
    vehicle: { id: "VEH-003", color: "#ef4444", model: "Urban Compact", bodyType: "compact" },
  },
  {
    id: "SP-04",
    label: "04",
    position: [-4.8, 0, -6.2],
    rotationY: Math.PI,
    width: 2.8,
    length: 5.4,
    status: "OCCUPIED",
    vehicle: { id: "VEH-004", color: "#10b981", model: "Sport Hatchback", bodyType: "hatchback" },
  },
  {
    id: "SP-05",
    label: "05",
    position: [-1.6, 0, -6.2],
    rotationY: Math.PI,
    width: 2.8,
    length: 5.4,
    status: "OCCUPIED",
    vehicle: { id: "VEH-005", color: "#ef4444", model: "Grand Crossover", bodyType: "suv" },
  },
  {
    id: "SP-06",
    label: "06",
    position: [1.6, 0, -6.2],
    rotationY: Math.PI,
    width: 2.8,
    length: 5.4,
    status: "OCCUPIED",
    vehicle: { id: "VEH-006", color: "#10b981", model: "Aero Sedan", bodyType: "sedan" },
  },
  {
    id: "SP-07",
    label: "07",
    position: [4.8, 0, -6.2],
    rotationY: Math.PI,
    width: 2.8,
    length: 5.4,
    status: "OCCUPIED",
    vehicle: { id: "VEH-007", color: "#ef4444", model: "Eco Hatch", bodyType: "hatchback" },
  },
  {
    id: "SP-08",
    label: "08",
    position: [8.0, 0, -6.2],
    rotationY: Math.PI,
    width: 2.8,
    length: 5.4,
    status: "OCCUPIED",
    vehicle: { id: "VEH-008", color: "#10b981", model: "Prestige Sedan", bodyType: "sedan" },
  },
  {
    id: "SP-09",
    label: "09",
    position: [11.2, 0, -6.2],
    rotationY: Math.PI,
    width: 2.8,
    length: 5.4,
    status: "OCCUPIED",
    vehicle: { id: "VEH-009", color: "#ef4444", model: "Explorer SUV", bodyType: "suv" },
  },
  {
    id: "SP-10",
    label: "10",
    position: [14.4, 0, -6.2],
    rotationY: Math.PI,
    width: 2.8,
    length: 5.4,
    status: "OCCUPIED",
    vehicle: { id: "VEH-010", color: "#ef4444", model: "City Compact", bodyType: "compact" },
  },

  // Row B (South Row: 2 occupied SP-11, SP-12 + 8 available SP-13 to SP-20)
  {
    id: "SP-11",
    label: "11",
    position: [-14.4, 0, 6.2],
    rotationY: 0,
    width: 2.8,
    length: 5.4,
    status: "OCCUPIED",
    vehicle: { id: "VEH-011", color: "#10b981", model: "Hybrid SUV", bodyType: "suv" },
  },
  {
    id: "SP-12",
    label: "12",
    position: [-11.2, 0, 6.2],
    rotationY: 0,
    width: 2.8,
    length: 5.4,
    status: "OCCUPIED",
    vehicle: { id: "VEH-012", color: "#10b981", model: "Touring Sedan", bodyType: "sedan" },
  },
  {
    id: "SP-13",
    label: "13",
    position: [-8.0, 0, 6.2],
    rotationY: 0,
    width: 2.8,
    length: 5.4,
    status: "AVAILABLE",
  },
  {
    id: "SP-14",
    label: "14",
    position: [-4.8, 0, 6.2],
    rotationY: 0,
    width: 2.8,
    length: 5.4,
    status: "AVAILABLE",
  },
  {
    id: "SP-15",
    label: "15",
    position: [-1.6, 0, 6.2],
    rotationY: 0,
    width: 2.8,
    length: 5.4,
    status: "AVAILABLE",
  },
  {
    id: "SP-16",
    label: "16",
    position: [1.6, 0, 6.2],
    rotationY: 0,
    width: 2.8,
    length: 5.4,
    status: "AVAILABLE",
  },
  {
    id: "SP-17",
    label: "17",
    position: [4.8, 0, 6.2],
    rotationY: 0,
    width: 2.8,
    length: 5.4,
    status: "AVAILABLE",
  },
  {
    id: "SP-18",
    label: "18",
    position: [8.0, 0, 6.2],
    rotationY: 0,
    width: 2.8,
    length: 5.4,
    status: "AVAILABLE",
  },
  {
    id: "SP-19",
    label: "19",
    position: [11.2, 0, 6.2],
    rotationY: 0,
    width: 2.8,
    length: 5.4,
    status: "AVAILABLE",
  },
  {
    id: "SP-20",
    label: "20",
    position: [14.4, 0, 6.2],
    rotationY: 0,
    width: 2.8,
    length: 5.4,
    status: "AVAILABLE",
  },
];

export function ParkingZone3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraManagerRef = useRef<ZoneCameraManager | null>(null);
  const bayMeshMapRef = useRef<Map<string, ParkingBayMeshGroup>>(new Map());
  const sceneRef = useRef<THREE.Scene | null>(null);
  const activeRouteRef = useRef<ZoneRouteGroup | null>(null);

  const [activePreset, setActivePreset] = useState<CameraPreset>("PERSPECTIVE");
  const [inspectedSlot, setInspectedSlot] = useState<ParkingBayData | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Exact 20 space breakdown: 12 occupied, 8 available
  const totalCount = PARKING_LOT_BAYS.length;
  const occupiedCount = PARKING_LOT_BAYS.filter((b) => b.status === "OCCUPIED").length;
  // If user confirms a space locally, available count decreases to 7
  const availableCount = isConfirmed ? 7 : 8;

  // Sync 3D bay selection state whenever selectedSlotId changes
  useEffect(() => {
    bayMeshMapRef.current.forEach((mesh, id) => {
      mesh.setSelected(id === selectedSlotId);
    });
  }, [selectedSlotId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Atmosphere
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color("#050811");
    scene.fog = new THREE.FogExp2("#050811", 0.012);

    // 2. Camera & Orbit Controls
    const cameraManager = setupZoneCamera(container, width, height);
    cameraManagerRef.current = cameraManager;

    // 3. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // 4. Indoor Parking Facility Lighting
    const ambientLight = new THREE.AmbientLight("#94a3b8", 1.25);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight("#f8fafc", 1.5);
    keyLight.position.set(-6, 32, 12);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 80;
    keyLight.shadow.camera.left = -24;
    keyLight.shadow.camera.right = 24;
    keyLight.shadow.camera.top = 24;
    keyLight.shadow.camera.bottom = -24;
    keyLight.shadow.bias = -0.0003;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight("#475569", 0.6);
    fillLight.position.set(14, 24, -12);
    scene.add(fillLight);

    // Subtle Floor Grid Helper
    const grid = new THREE.GridHelper(50, 50, 0x1e293b, 0x0f172a);
    grid.position.y = -0.01;
    scene.add(grid);

    // 5. Physical Architecture Environment
    const environment = createZoneEnvironment();
    scene.add(environment);

    // 6. Build the 20 Parking Bays and 12 Parked Vehicles
    const clickableObjects: THREE.Object3D[] = [];
    const bayMeshes: ParkingBayMeshGroup[] = [];
    bayMeshMapRef.current.clear();

    PARKING_LOT_BAYS.forEach((bay) => {
      // 3D Parking Bay
      const bayMesh = createParkingBay3D(bay);
      scene.add(bayMesh);
      clickableObjects.push(bayMesh);
      bayMeshes.push(bayMesh);
      bayMeshMapRef.current.set(bay.id, bayMesh);

      // If occupied, add parked procedural 3D vehicle
      if (bay.status === "OCCUPIED" && bay.vehicle) {
        const car = createVehicle3D({
          color: bay.vehicle.color,
          label: bay.vehicle.id,
          bodyType: bay.vehicle.bodyType || "sedan",
          isTarget: false,
        });
        car.position.set(bay.position[0], 0, bay.position[2]);
        car.rotation.y = bay.rotationY; // Aligns vehicle with bay heading
        // Link bay data to car for easy clicking
        (car as unknown as { bayData: ParkingBayData }).bayData = bay;
        scene.add(car);
        clickableObjects.push(car);
      }
    });

    // 7. Raycasting for Clicking & Hovering Parking Bays
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraManager.camera);
      const intersects = raycaster.intersectObjects(clickableObjects, true);

      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0]!.object;
        while (obj && !("bayData" in obj)) {
          obj = obj.parent;
        }
        if (obj && "bayData" in obj) {
          const target = obj as unknown as { bayData: ParkingBayData };
          setInspectedSlot(target.bayData);
        }
      }
    };
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);

    // Desktop hover effect
    let currentHoveredMesh: ParkingBayMeshGroup | null = null;

    const handlePointerMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraManager.camera);
      const intersects = raycaster.intersectObjects(clickableObjects, true);

      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0]!.object;
        while (obj && !("bayData" in obj)) {
          obj = obj.parent;
        }
        if (obj && "bayData" in obj) {
          const target = obj as unknown as { bayData: ParkingBayData };
          if (target.bayData.status === "AVAILABLE") {
            renderer.domElement.style.cursor = "pointer";
            const bayMesh = bayMeshMapRef.current.get(target.bayData.id);
            if (bayMesh && bayMesh !== currentHoveredMesh) {
              currentHoveredMesh?.setHovered(false);
              bayMesh.setHovered(true);
              currentHoveredMesh = bayMesh;
            }
          } else {
            renderer.domElement.style.cursor = "not-allowed";
            if (currentHoveredMesh) {
              currentHoveredMesh.setHovered(false);
              currentHoveredMesh = null;
            }
          }
          return;
        }
      }

      renderer.domElement.style.cursor = "grab";
      if (currentHoveredMesh) {
        currentHoveredMesh.setHovered(false);
        currentHoveredMesh = null;
      }
    };
    renderer.domElement.addEventListener("pointermove", handlePointerMove);

    // 8. Animation Loop
    let animId: number;
    let lastTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      cameraManager.update(delta);
      const timeSec = now / 1000;
      bayMeshes.forEach((mesh) => mesh.updateAnimation(timeSec));
      if (activeRouteRef.current) {
        activeRouteRef.current.updateAnimation(delta);
      }
      renderer.render(scene, cameraManager.camera);
    };

    animate();

    // 9. Resize Listener
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraManager.camera.aspect = w / h;
      cameraManager.camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      if (activeRouteRef.current && sceneRef.current) {
        sceneRef.current.remove(activeRouteRef.current);
        activeRouteRef.current.dispose();
        activeRouteRef.current = null;
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleCameraPreset = (preset: CameraPreset) => {
    setActivePreset(preset);
    cameraManagerRef.current?.setPreset(preset);
  };

  const handleResetCamera = () => {
    setActivePreset("PERSPECTIVE");
    cameraManagerRef.current?.setPreset("PERSPECTIVE");
  };

  // Phase 3 & 4 Selection & Navigation Handlers
  const handleSelectSlot = (slot: ParkingBayData) => {
    if (slot.status !== "AVAILABLE") return;
    if (isNavigating) {
      handleExitNavigation();
    }
    setSelectedSlotId(slot.id);
    setIsConfirmed(false);
    setInspectedSlot(slot);
    cameraManagerRef.current?.focusOnBay(slot.position);
  };

  const handleConfirmSlot = () => {
    if (!selectedSlotId) return;
    setIsConfirmed(true);
  };

  const handleStartNavigation = () => {
    if (!selectedSlotData || !sceneRef.current || !cameraManagerRef.current) return;

    if (activeRouteRef.current) {
      sceneRef.current.remove(activeRouteRef.current);
      activeRouteRef.current.dispose();
      activeRouteRef.current = null;
    }

    const route = createZoneRoute3D(selectedSlotData.position, selectedSlotData.id);
    sceneRef.current.add(route);
    activeRouteRef.current = route;

    setIsNavigating(true);
    setInspectedSlot(null);

    cameraManagerRef.current.startRouteFlythrough(
      route.curve,
      selectedSlotData.position
    );
  };

  const handleExitNavigation = () => {
    if (activeRouteRef.current && sceneRef.current) {
      sceneRef.current.remove(activeRouteRef.current);
      activeRouteRef.current.dispose();
      activeRouteRef.current = null;
    }
    cameraManagerRef.current?.stopRouteFlythrough();
    setIsNavigating(false);
  };

  const handleChangeSlot = () => {
    handleExitNavigation();
    setSelectedSlotId(null);
    setIsConfirmed(false);
    setInspectedSlot(null);
  };

  const selectedSlotData = selectedSlotId
    ? PARKING_LOT_BAYS.find((b) => b.id === selectedSlotId)
    : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050811] select-none">
      {/* ── 3D WebGL Canvas ── */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* ── Compact Top Bar Header ── */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pointer-events-none">
        {/* Left: Brand + Status Counters */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          {/* Back to Dashboard */}
          <Link
            href="/user/dashboard"
            className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-300 hover:text-white bg-slate-950/90 border border-slate-700/80 px-3 py-2.5 rounded-xl shadow-xl hover:bg-slate-900 transition-colors backdrop-blur-xl"
            title="Return to Main Dashboard"
          >
            <ArrowLeft className="h-4 w-4 text-sky-400" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>

          {/* Title Badge */}
          <div className="flex items-center gap-2.5 rounded-xl border border-sky-500/30 bg-slate-950/90 px-3 py-2 backdrop-blur-xl shadow-xl">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Compass className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold tracking-wider text-white">
                  PARKTWIN AI
                </span>
                <span className="text-[10px] text-slate-500">·</span>
                <span className="text-xs font-mono text-sky-400 font-semibold">
                  3D PARKING LOT
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                CARPARKING-01 · LEVEL B2 · ZONE C
              </span>
            </div>
          </div>

          {/* Real-time Status Counters */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 rounded-xl px-2.5 py-1.5 backdrop-blur-xl shadow-xl">
            <Badge variant="outline" className="border-slate-700 bg-slate-900/60 text-slate-300 font-mono text-[11px] px-2 py-0.5">
              {totalCount} TOTAL
            </Badge>
            <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-400 font-mono text-[11px] px-2 py-0.5">
              ● {occupiedCount} OCCUPIED
            </Badge>
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-mono text-[11px] px-2 py-0.5">
              ● {availableCount} AVAILABLE
            </Badge>
            {isNavigating && selectedSlotId ? (
              <Badge variant="outline" className="border-sky-400 bg-sky-500/25 text-sky-200 font-mono text-[11px] px-2.5 py-0.5 animate-pulse flex items-center gap-1.5 shadow-lg shadow-sky-500/20">
                <Navigation className="h-3 w-3 text-sky-400" />
                <span>NAVIGATING ({selectedSlotId})</span>
              </Badge>
            ) : selectedSlotId ? (
              <Badge variant="outline" className="border-sky-500/40 bg-sky-500/15 text-sky-300 font-mono text-[11px] px-2 py-0.5 animate-pulse">
                ★ 1 SELECTED ({selectedSlotId})
              </Badge>
            ) : null}
          </div>
        </div>

        {/* Right: Camera View Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-950/90 border border-slate-700/80 rounded-xl p-1 shadow-xl backdrop-blur-xl">
          <Button
            size="sm"
            variant={activePreset === "TOP" ? "default" : "ghost"}
            onClick={() => handleCameraPreset("TOP")}
            className={`h-8 text-xs font-mono gap-1 px-3 ${
              activePreset === "TOP"
                ? "bg-sky-500 text-white hover:bg-sky-600 shadow-md shadow-sky-500/20"
                : "text-slate-300 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>TOP VIEW</span>
          </Button>

          <Button
            size="sm"
            variant={activePreset === "PERSPECTIVE" ? "default" : "ghost"}
            onClick={() => handleCameraPreset("PERSPECTIVE")}
            className={`h-8 text-xs font-mono gap-1 px-3 ${
              activePreset === "PERSPECTIVE"
                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/20"
                : "text-slate-300 hover:text-white hover:bg-slate-900"
            }`}
          >
            <Car className="h-3.5 w-3.5 text-emerald-300" />
            <span>PERSPECTIVE</span>
          </Button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetCamera}
            className="h-8 text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-900 gap-1 px-2.5"
            title="Reset camera angle"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>RESET</span>
          </Button>
        </div>
      </div>

      {/* ── Slot Inspector Card (Bottom-Left) ── */}
      {inspectedSlot && (
        <div className="absolute bottom-10 left-6 z-30 pointer-events-none max-w-xs w-full animate-in fade-in zoom-in-95">
          <div className="pointer-events-auto rounded-xl border border-slate-700/80 bg-slate-950/95 p-3.5 backdrop-blur-xl shadow-2xl space-y-2.5 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-wide">
                  🅿️ {inspectedSlot.id}
                </span>
                <Badge
                  className={`text-[10px] ${
                    inspectedSlot.id === selectedSlotId
                      ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                      : inspectedSlot.status === "OCCUPIED"
                      ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  }`}
                >
                  {inspectedSlot.id === selectedSlotId
                    ? "★ SELECTED"
                    : inspectedSlot.status === "OCCUPIED"
                    ? "🔴 OCCUPIED"
                    : "🟢 AVAILABLE"}
                </Badge>
              </div>
              <button
                onClick={() => setInspectedSlot(null)}
                className="text-xs text-slate-500 hover:text-white px-1"
                aria-label="Close inspector"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-1 text-slate-300">
              <div className="text-slate-400 flex items-center justify-between">
                <span>Location: Zone C · Level B2</span>
                <span className="text-[10px] text-slate-500">2.8m × 5.4m</span>
              </div>

              {inspectedSlot.status === "OCCUPIED" ? (
                <div className="space-y-1 pt-1">
                  <div className="text-amber-400">
                    Parked: <strong>{inspectedSlot.vehicle?.id}</strong> (
                    {inspectedSlot.vehicle?.model} · {inspectedSlot.vehicle?.bodyType?.toUpperCase() || "CAR"})
                  </div>
                  <div className="text-rose-400/90 text-[11px] flex items-center gap-1 font-semibold">
                    <Lock className="h-3 w-3" />
                    <span>This space is unavailable.</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="text-emerald-400 font-medium">
                    Space is open and ready for parking
                  </div>
                  {inspectedSlot.id === selectedSlotId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleChangeSlot}
                      className="w-full h-8 text-xs font-mono border-sky-500/50 bg-sky-950/40 text-sky-300 hover:bg-sky-900/50 hover:text-sky-200"
                    >
                      CHANGE SELECTION
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleSelectSlot(inspectedSlot)}
                      className="w-full h-8 text-xs font-mono bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-lg shadow-emerald-600/20"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>SELECT SPACE</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Navigation Status Card (Bottom-Right) ── */}
      {isNavigating && selectedSlotData ? (
        <div className="absolute bottom-10 right-6 z-30 pointer-events-none max-w-xs w-full animate-in fade-in slide-in-from-bottom-4">
          <div className="pointer-events-auto rounded-xl border border-sky-500/60 bg-slate-950/95 p-4 backdrop-blur-xl shadow-2xl space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Navigation className="h-4 w-4 text-sky-400 animate-pulse" />
                NAVIGATING
              </span>
              <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[10px]">
                ACTIVE
              </Badge>
            </div>

            <div className="space-y-1 text-xs text-slate-300">
              <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Destination</div>
              <div className="text-xl font-bold text-white flex items-center gap-2">
                <span>🅿️ {selectedSlotData.id}</span>
              </div>
              <div className="text-[12px] text-slate-300 pt-1 leading-relaxed">
                Follow the highlighted route to your parking bay.
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <Button
                size="sm"
                onClick={handleExitNavigation}
                className="w-full h-8 text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 shadow-md gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                <span>EXIT NAVIGATION</span>
              </Button>
            </div>
          </div>
        </div>
      ) : selectedSlotData ? (
        /* ── Selection & Confirmation Card (Bottom-Right) ── */
        <div className="absolute bottom-10 right-6 z-30 pointer-events-none max-w-sm w-full animate-in fade-in slide-in-from-bottom-4">
          <div className="pointer-events-auto rounded-xl border border-sky-500/40 bg-slate-950/95 p-4 backdrop-blur-xl shadow-2xl space-y-3 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {isConfirmed ? "SPACE CONFIRMED" : "YOUR PARKING SELECTION"}
              </span>
              <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[10px]">
                {selectedSlotData.id}
              </Badge>
            </div>

            {!isConfirmed ? (
              <>
                <div className="space-y-1 text-xs text-slate-300">
                  <div className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>🅿️ {selectedSlotData.id}</span>
                    <span className="text-emerald-400 text-xs font-normal">● Available</span>
                  </div>
                  <div className="text-slate-400">Carparking-01 · Level B2 · Zone C</div>
                  <div className="text-[11px] text-slate-500">Standard Parking Stall (2.8m × 5.4m)</div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={handleConfirmSlot}
                    className="flex-1 h-9 text-xs font-mono font-bold bg-sky-500 hover:bg-sky-600 text-white gap-1.5 shadow-lg shadow-sky-500/25"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>CONFIRM SPACE</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleChangeSlot}
                    className="h-9 text-xs font-mono border-slate-700 text-slate-300 hover:text-white hover:bg-slate-900"
                  >
                    CHANGE
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>✓ SPACE SELECTED</span>
                  </div>
                  <div className="text-white font-semibold">
                    Your parking space {selectedSlotData.id} is ready.
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Zone C · Level B2 · Ground stenciled bay
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <Button
                    size="sm"
                    onClick={handleStartNavigation}
                    className="w-full h-9 text-xs font-mono font-bold bg-sky-500 hover:bg-sky-600 text-white gap-1.5 shadow-lg shadow-sky-500/25 transition-all"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    <span>NAVIGATE TO {selectedSlotData.id}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleChangeSlot}
                    className="w-full h-8 text-xs font-mono border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  >
                    Change Space
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Subtle Controls Helper Hint ── */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden sm:flex items-center gap-2 text-[10px] font-mono text-slate-400 bg-slate-950/70 px-3 py-1 rounded-md backdrop-blur-sm border border-slate-800/50">
        <Info className="h-3 w-3 text-slate-400" />
        <span>Click available space to select · Drag to rotate · Scroll to zoom</span>
      </div>
    </div>
  );
}
