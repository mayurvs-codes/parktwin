"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  Compass,
  RotateCcw,
  Eye,
  Car,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ParkingBayData, CameraPreset } from "@/components/3d-zone/types";
import { createVehicle3D, type Vehicle3DGroup } from "@/components/3d-zone/Vehicle3D";
import { createParkingBay3D, type ParkingBayMeshGroup } from "@/components/3d-zone/ParkingBay3D";
import { createZoneEnvironment } from "@/components/3d-zone/Environment3D";
import { setupZoneCamera, type ZoneCameraManager } from "@/components/3d-zone/ZoneCamera";
import { createZoneRoute3D, type ZoneRouteGroup } from "@/components/3d-zone/ZoneRoute3D";
import { useSharedDemoState } from "@/store/useSharedDemoState";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { useDigitalTwinStore } from "@/store/useDigitalTwinStore";
import { CANONICAL_BAYS } from "./facilityGeometry";

export interface UnifiedTwinCanvas3DProps {
  onSlotSelect?: (slotId: string) => void;
  highlightSlotId?: string | null;
}

export function UnifiedTwinCanvas3D({ onSlotSelect, highlightSlotId }: UnifiedTwinCanvas3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraManagerRef = useRef<ZoneCameraManager | null>(null);
  const bayMeshMapRef = useRef<Map<string, ParkingBayMeshGroup>>(new Map());
  const vehicleMeshMapRef = useRef<Map<string, Vehicle3DGroup>>(new Map());
  const activeRouteRef = useRef<ZoneRouteGroup | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  // Canonical Store Subscriptions
  const sharedSpaces = useSharedDemoState((s) => s.spaces);
  const sharedSelectedSpaceId = useSharedDemoState((s) => s.selectedSpaceId);
  const selectSharedSpace = useSharedDemoState((s) => s.selectSpace);
  const sharedViolation = useSharedDemoState((s) => s.violation);

  const activeAssignedSpaceId = useUserPortalStore((s) => s.assignedSpaceId);
  const journeyStep = useUserPortalStore((s) => s.journeyStep);
  const selectSlotInDigitalTwinStore = useDigitalTwinStore((s) => s.selectSlot);

  const selectedSlotId = highlightSlotId || sharedSelectedSpaceId || activeAssignedSpaceId || null;

  const [activePreset, setActivePreset] = useState<CameraPreset>("PERSPECTIVE");
  const [hoveredBayId, setHoveredBayId] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(60);

  // Initialize Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#050811");
    scene.fog = new THREE.FogExp2("#050811", 0.012);
    sceneRef.current = scene;

    // 2. Camera Manager (OrbitControls + Presets)
    const cameraManager = setupZoneCamera(container, width, height);
    cameraManagerRef.current = cameraManager;

    // 3. Renderer with performance optimizations
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const mainSun = new THREE.DirectionalLight(0xdbeafe, 1.35);
    mainSun.position.set(-8, 22, 14);
    mainSun.castShadow = true;
    mainSun.shadow.mapSize.width = 1024;
    mainSun.shadow.mapSize.height = 1024;
    mainSun.shadow.camera.near = 0.5;
    mainSun.shadow.camera.far = 60;
    mainSun.shadow.camera.left = -22;
    mainSun.shadow.camera.right = 22;
    mainSun.shadow.camera.top = 18;
    mainSun.shadow.camera.bottom = -18;
    scene.add(mainSun);

    const blueFill = new THREE.DirectionalLight(0x0284c7, 0.4);
    blueFill.position.set(12, 14, -14);
    scene.add(blueFill);

    // 5. Environment
    const env = createZoneEnvironment();
    scene.add(env);

    // 6. Build 20 Canonical Parking Bays from authoritative geometry
    const bayMeshMap = new Map<string, ParkingBayMeshGroup>();
    const vehicleMeshMap = new Map<string, Vehicle3DGroup>();

    const targetBays = CANONICAL_BAYS;
    targetBays.forEach((bay) => {
      const bayData: ParkingBayData = {
        id: bay.id,
        label: bay.id.replace("SP-", ""),
        position: bay.position_3d,
        rotationY: bay.orientation === "vertical" ? (bay.position_3d[2] < 0 ? Math.PI : 0) : Math.PI / 2,
        width: bay.dimensions_meters.width,
        length: bay.dimensions_meters.length,
        status: "AVAILABLE",
        verified: bay.verified,
        confidence: bay.confidence,
      };

      const bayGroup = createParkingBay3D(bayData);
      bayMeshMap.set(bay.id, bayGroup);
      scene.add(bayGroup);
    });
    bayMeshMapRef.current = bayMeshMap;
    vehicleMeshMapRef.current = vehicleMeshMap;

    // 7. Raycasting for Click / Hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getRaycastHit = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, cameraManager.camera);

      const hitPlanes: THREE.Object3D[] = [];
      bayMeshMap.forEach((bg) => {
        bg.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material.transparent && child.material.opacity === 0) {
            hitPlanes.push(child);
          }
        });
      });

      const intersects = raycaster.intersectObjects(hitPlanes, false);
      if (intersects.length > 0 && intersects[0]?.object.parent) {
        return intersects[0].object.parent as ParkingBayMeshGroup;
      }
      return null;
    };

    let hoveredGroup: ParkingBayMeshGroup | null = null;
    const handleMouseMove = (event: MouseEvent) => {
      const hit = getRaycastHit(event);
      if (hit !== hoveredGroup) {
        if (hoveredGroup) hoveredGroup.setHovered(false);
        if (hit) hit.setHovered(true);
        hoveredGroup = hit;
        setHoveredBayId(hit ? hit.bayData.id : null);
        renderer.domElement.style.cursor = hit ? "pointer" : "default";
      }
    };

    const handleClick = (event: MouseEvent) => {
      const hit = getRaycastHit(event);
      if (hit) {
        const slotId = hit.bayData.id;
        selectSharedSpace(slotId);
        selectSlotInDigitalTwinStore(slotId);
        onSlotSelect?.(slotId);
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener("mousemove", handleMouseMove);
    dom.addEventListener("click", handleClick);

    // 8. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraManager.camera.aspect = w / h;
      cameraManager.camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // 9. Animation Loop
    let animId: number;
    let lastTime = performance.now();
    let frameCount = 0;
    let fpsTimer = 0;

    const animate = (currentTime: number) => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // FPS tracking
      frameCount++;
      fpsTimer += delta;
      if (fpsTimer >= 1.0) {
        setFps(Math.round(frameCount / fpsTimer));
        frameCount = 0;
        fpsTimer = 0;
      }

      cameraManager.update(delta);
      if (env.updateAnimation) env.updateAnimation(delta);

      bayMeshMap.forEach((bg) => bg.updateAnimation(currentTime / 1000));
      if (activeRouteRef.current) activeRouteRef.current.updateAnimation(delta);

      renderer.render(scene, cameraManager.camera);
    };
    animId = requestAnimationFrame(animate);

    // Teardown
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      dom.removeEventListener("mousemove", handleMouseMove);
      dom.removeEventListener("click", handleClick);

      if (container.contains(dom)) {
        container.removeChild(dom);
      }
      renderer.dispose();
      bayMeshMap.clear();
      vehicleMeshMap.clear();
      sceneRef.current = null;
    };
  }, [selectSharedSpace, selectSlotInDigitalTwinStore, onSlotSelect]);

  // Reactive State Synchronization with Canonical Store
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const bayMeshMap = bayMeshMapRef.current;
    const vehicleMeshMap = vehicleMeshMapRef.current;

    // Update bays & vehicle meshes based on sharedSpaces
    Object.entries(sharedSpaces).forEach(([id, space]) => {
      const bayGroup = bayMeshMap.get(id);
      if (!bayGroup) return;

      const isSelected = id === selectedSlotId;
      bayGroup.setSelected(isSelected);

      const isOccupied = space.status === "OCCUPIED" || space.status === "VIOLATION";
      const isViolation = space.status === "VIOLATION" || (sharedViolation?.active && sharedViolation.actualSpaceId === id);

      const vehMesh = vehicleMeshMap.get(id);

      if (isOccupied) {
        if (!vehMesh) {
          const bodyType = id.endsWith("1") || id.endsWith("5") ? "suv" : id.endsWith("2") || id.endsWith("8") ? "sedan" : "compact";
          const carColor = isViolation ? "#f43f5e" : (space.color || "#10b981");
          const vehGroup = createVehicle3D({
            color: carColor,
            label: space.plate || space.vehicleId || `VEH-${id.replace("SP-", "")}`,
            bodyType,
          });

          // Place vehicle inside bay
          vehGroup.position.set(bayGroup.position.x, 0, bayGroup.position.z);
          vehGroup.rotation.y = bayGroup.rotation.y;
          scene.add(vehGroup);
          vehicleMeshMap.set(id, vehGroup);
        } else {
          vehMesh.visible = true;
        }
      } else {
        if (vehMesh) {
          scene.remove(vehMesh);
          vehicleMeshMap.delete(id);
        }
      }
    });

    // Clean up active route or attach route if selected slot is target
    if (selectedSlotId && (journeyStep === "NAVIGATING_TO_SPACE" || journeyStep === "SPACE_ASSIGNED")) {
      const targetBay = bayMeshMap.get(selectedSlotId);
      if (targetBay) {
        if (activeRouteRef.current?.slotId !== selectedSlotId) {
          if (activeRouteRef.current) {
            scene.remove(activeRouteRef.current);
            activeRouteRef.current.dispose();
            activeRouteRef.current = null;
          }
          const route = createZoneRoute3D(
            [targetBay.position.x, targetBay.position.y, targetBay.position.z],
            selectedSlotId
          );
          scene.add(route);
          activeRouteRef.current = route;
        }
      }
    } else {
      if (activeRouteRef.current) {
        scene.remove(activeRouteRef.current);
        activeRouteRef.current.dispose();
        activeRouteRef.current = null;
      }
    }
  }, [sharedSpaces, selectedSlotId, sharedViolation, journeyStep]);

  // Handle Preset Camera Changes
  const handlePreset = (preset: CameraPreset) => {
    setActivePreset(preset);
    cameraManagerRef.current?.setPreset(preset);
  };

  const handleResetCamera = () => {
    cameraManagerRef.current?.setPreset("PERSPECTIVE");
    setActivePreset("PERSPECTIVE");
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-[#050811] rounded-xl overflow-hidden border border-slate-800 shadow-2xl select-none">
      {/* ── 3D Viewport Controls Overlay ── */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-700/60 backdrop-blur">
        <Button
          size="sm"
          variant={activePreset === "PERSPECTIVE" ? "default" : "ghost"}
          onClick={() => handlePreset("PERSPECTIVE")}
          className="h-7 px-2.5 text-xs font-mono font-semibold"
        >
          <Eye className="h-3.5 w-3.5 mr-1" />
          Perspective
        </Button>
        <Button
          size="sm"
          variant={activePreset === "TOP" ? "default" : "ghost"}
          onClick={() => handlePreset("TOP")}
          className="h-7 px-2.5 text-xs font-mono font-semibold"
        >
          <Compass className="h-3.5 w-3.5 mr-1" />
          Overhead Top
        </Button>
        <div className="w-px h-4 bg-slate-700 mx-0.5" />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleResetCamera}
          className="h-7 px-2 text-xs text-slate-400 hover:text-white"
          title="Reset Camera View"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* ── Real-time Status Badges Top-Right ── */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        <Badge
          variant="outline"
          className="bg-slate-900/80 border-slate-700/60 text-slate-300 font-mono text-[10px] backdrop-blur"
        >
          {fps} FPS · Three.js
        </Badge>
        {selectedSlotId && (
          <Badge className="bg-sky-600/90 text-white font-mono text-xs border-sky-400/50 backdrop-blur shadow">
            Selected: {selectedSlotId}
          </Badge>
        )}
      </div>

      {/* ── Hovered Bay Info Card Bottom-Left ── */}
      {hoveredBayId && (
        <div className="absolute bottom-3 left-3 z-10 bg-slate-900/90 border border-slate-700/80 rounded-lg p-2.5 text-xs font-mono text-slate-200 shadow-xl backdrop-blur flex items-center gap-3">
          <Car className="h-4 w-4 text-sky-400 shrink-0" />
          <div>
            <div className="font-bold text-white flex items-center gap-1.5">
              <span>Bay {hoveredBayId}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                sharedSpaces[hoveredBayId]?.status === "AVAILABLE"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : sharedSpaces[hoveredBayId]?.status === "RESERVED"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
              }`}>
                {sharedSpaces[hoveredBayId]?.status || "AVAILABLE"}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              {sharedSpaces[hoveredBayId]?.plate ? `Vehicle: ${sharedSpaces[hoveredBayId]?.plate}` : "2.8m × 5.4m Standard Stall"}
            </div>
          </div>
        </div>
      )}

      {/* ── Main WebGL Three.js Container ── */}
      <div ref={containerRef} className="w-full h-full min-h-[460px] flex-1 cursor-grab active:cursor-grabbing" />
    </div>
  );
}
