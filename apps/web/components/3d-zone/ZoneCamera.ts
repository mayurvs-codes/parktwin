import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { CameraPreset } from "./types";

export interface ZoneCameraManager {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  setPreset: (preset: CameraPreset) => void;
  focusOnBay: (position: [number, number, number]) => void;
  startRouteFlythrough: (
    curve: THREE.CatmullRomCurve3,
    targetPosition: [number, number, number],
    onComplete?: () => void
  ) => void;
  stopRouteFlythrough: () => void;
  update: (delta: number) => void;
  currentPreset: CameraPreset;
}

const PRESET_CONFIGS: Record<CameraPreset, { position: THREE.Vector3; target: THREE.Vector3 }> = {
  PERSPECTIVE: {
    position: new THREE.Vector3(-4, 19, 23),
    target: new THREE.Vector3(0, 0.5, 0),
  },
  TOP: {
    position: new THREE.Vector3(0, 32, 0.05),
    target: new THREE.Vector3(0, 0, 0),
  },
};

export function setupZoneCamera(domElement: HTMLElement, width: number, height: number): ZoneCameraManager {
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
  camera.position.copy(PRESET_CONFIGS.PERSPECTIVE.position);

  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxPolarAngle = Math.PI / 2 - 0.04; // Keep camera strictly above floor plane
  controls.minDistance = 6;
  controls.maxDistance = 75;
  controls.target.copy(PRESET_CONFIGS.PERSPECTIVE.target);

  let currentPreset: CameraPreset = "PERSPECTIVE";
  let isTransitioning = false;
  let targetPos = PRESET_CONFIGS.PERSPECTIVE.position.clone();
  let targetLookAt = PRESET_CONFIGS.PERSPECTIVE.target.clone();

  // Navigation Flythrough State
  let isFlythrough = false;
  let flythroughProgress = 0;
  const flythroughDuration = 3.6; // seconds
  let flythroughCurve: THREE.CatmullRomCurve3 | null = null;
  let flythroughTargetBay: [number, number, number] | null = null;
  let flythroughOnComplete: (() => void) | null = null;
  const flythroughStartPos = new THREE.Vector3();
  const flythroughStartLookAt = new THREE.Vector3();

  // Cancel flythrough on user manual orbit/pan/zoom
  controls.addEventListener("start", () => {
    if (isFlythrough) {
      isFlythrough = false;
      flythroughCurve = null;
      flythroughTargetBay = null;
      if (flythroughOnComplete) {
        flythroughOnComplete();
        flythroughOnComplete = null;
      }
    }
  });

  const setPreset = (preset: CameraPreset) => {
    stopRouteFlythrough();
    currentPreset = preset;
    targetPos = PRESET_CONFIGS[preset].position.clone();
    targetLookAt = PRESET_CONFIGS[preset].target.clone();
    isTransitioning = true;
  };

  const focusOnBay = (position: [number, number, number]) => {
    stopRouteFlythrough();
    const [bx, , bz] = position;
    targetLookAt.set(bx * 0.7, 0.4, bz * 0.5);
    if (currentPreset === "PERSPECTIVE") {
      targetPos.set(bx * 0.5 - 3, 18, 22);
    } else {
      targetPos.set(bx * 0.3, 30, 0.05);
    }
    isTransitioning = true;
  };

  const startRouteFlythrough = (
    curve: THREE.CatmullRomCurve3,
    targetPosition: [number, number, number],
    onComplete?: () => void
  ) => {
    isTransitioning = false;
    isFlythrough = true;
    flythroughProgress = 0;
    flythroughCurve = curve;
    flythroughTargetBay = targetPosition;
    flythroughOnComplete = onComplete || null;

    flythroughStartPos.copy(camera.position);
    flythroughStartLookAt.copy(controls.target);
  };

  const stopRouteFlythrough = () => {
    if (isFlythrough) {
      isFlythrough = false;
      flythroughCurve = null;
      flythroughTargetBay = null;
      if (flythroughOnComplete) {
        flythroughOnComplete();
        flythroughOnComplete = null;
      }
    }
  };

  const update = (delta: number) => {
    if (isFlythrough && flythroughCurve && flythroughTargetBay) {
      flythroughProgress += delta / flythroughDuration;
      const p = Math.min(1, flythroughProgress);

      const [bx, , bz] = flythroughTargetBay;
      const isRowB = bz > 0;

      // 3-Stage Guided Navigation:
      // Stage 1 (0 -> 0.25): Smoothly ease toward drive-aisle start
      // Stage 2 (0.25 -> 0.78): Follow along route direction down the aisle
      // Stage 3 (0.78 -> 1.0): Frame destination bay clearly
      if (p < 0.25) {
        const u = p / 0.25;
        const easedU = u * u * (3 - 2 * u);
        const startOverviewPos = new THREE.Vector3(-18.5, 11.5, 9.0);
        const startOverviewLook = new THREE.Vector3(-12.0, 0.4, 0);

        camera.position.lerpVectors(flythroughStartPos, startOverviewPos, easedU);
        controls.target.lerpVectors(flythroughStartLookAt, startOverviewLook, easedU);
      } else if (p < 0.78) {
        const u = (p - 0.25) / 0.53;
        const easedU = u * u * (3 - 2 * u);
        const pt = flythroughCurve.getPointAt(easedU);
        const aheadPt = flythroughCurve.getPointAt(Math.min(1, easedU + 0.12));

        const trackingPos = new THREE.Vector3(pt.x - 3.5, 10.0, 8.5);
        const trackingLook = new THREE.Vector3(aheadPt.x, 0.5, aheadPt.z);

        camera.position.lerp(trackingPos, Math.min(1, delta * 6));
        controls.target.lerp(trackingLook, Math.min(1, delta * 6));
      } else {
        const finalCamPos = new THREE.Vector3(bx - 3.2, 10.8, isRowB ? bz + 9.2 : bz - 9.2);
        const finalLookAt = new THREE.Vector3(bx, 0.5, bz);

        camera.position.lerp(finalCamPos, Math.min(1, delta * 6));
        controls.target.lerp(finalLookAt, Math.min(1, delta * 6));
      }

      if (p >= 1) {
        const finalCamPos = new THREE.Vector3(bx - 3.2, 10.8, isRowB ? bz + 9.2 : bz - 9.2);
        const finalLookAt = new THREE.Vector3(bx, 0.5, bz);
        camera.position.copy(finalCamPos);
        controls.target.copy(finalLookAt);
        isFlythrough = false;
        if (flythroughOnComplete) {
          flythroughOnComplete();
          flythroughOnComplete = null;
        }
      }
    } else if (isTransitioning) {
      const lerpFactor = Math.min(1, delta * 5.0);
      camera.position.lerp(targetPos, lerpFactor);
      controls.target.lerp(targetLookAt, lerpFactor);

      if (camera.position.distanceTo(targetPos) < 0.1 && controls.target.distanceTo(targetLookAt) < 0.1) {
        camera.position.copy(targetPos);
        controls.target.copy(targetLookAt);
        isTransitioning = false;
      }
    }
    controls.update();
  };

  return {
    camera,
    controls,
    setPreset,
    focusOnBay,
    startRouteFlythrough,
    stopRouteFlythrough,
    update,
    get currentPreset() {
      return currentPreset;
    },
  };
}
