/**
 * ParkTwin AI — Authoritative Static Grounded ANPR Evidence
 * ==========================================================
 * Real pipeline execution results generated from processing
 * `test_video.mp4` through YOLOv8 + ByteTrack + PaddleOCR.
 * Source: anpr_result.json (run_id: "fd3b28581430")
 *
 * Grounding Guarantee:
 * Strictly contains actual pipeline values. Zero fabricated plates.
 */

import type { RawAnprResult } from "@/types/evidence";
import rawAnprJson from "./raw_anpr_result.json";

/**
 * Directly loaded from raw ANPR pipeline result JSON.
 * Run ID: "fd3b28581430", test_video.mp4
 */
export const GROUNDED_ANPR_RESULT: RawAnprResult = rawAnprJson as RawAnprResult;
