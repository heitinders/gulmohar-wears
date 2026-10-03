// Browser only. The single file that touches MediaPipe. Assets come from /public/models (see scripts/fetch-pose-assets.mjs).
import type { Landmarks } from "./measures.ts";

export interface PoseDetector { detect(source: CanvasImageSource): Landmarks | null; close(): void }
export interface DecodedImage { source: CanvasImageSource; w: number; h: number }

const WASM_PATH = "/models/wasm";
const MODEL_PATH = "/models/pose_landmarker_lite.task";
const MAX_EDGE = 1600;
let pending: Promise<PoseDetector> | null = null;

// Options ported from app.js initPose (L349-362). GPU first, CPU if the GPU delegate fails to initialise.
export function loadPoseDetector(): Promise<PoseDetector> {
  if (typeof window === "undefined") return Promise.reject(new Error("pose detection runs in the browser"));
  pending ??= (async () => {
    const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
    const create = (delegate: "GPU" | "CPU") => PoseLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_PATH, delegate }, runningMode: "IMAGE", numPoses: 1,
      minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5,
    });
    const landmarker = await create("GPU").catch(() => create("CPU"));
    return {
      detect(source) { const result = landmarker.detect(source as HTMLImageElement); return result.landmarks?.[0] ?? null; },
      close() { landmarker.close(); pending = null; },
    } satisfies PoseDetector;
  })().catch(error => { pending = null; throw error; });
  return pending;
}

/** Decodes a photo and downsizes it so detection stays quick on a phone. Nothing is kept after the caller is done. */
export async function decodeImage(blob: Blob): Promise<DecodedImage> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1) return { source: bitmap, w: bitmap.width, h: bitmap.height };
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return { source: canvas, w: canvas.width, h: canvas.height };
}
