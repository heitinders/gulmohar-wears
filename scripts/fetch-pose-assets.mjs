// Self-hosts MediaPipe's WASM and the pose model under public/models so the app never loads them from a CDN at runtime.
// Runs on postinstall. A failed download warns and exits 0 so an offline install still succeeds; the UI then shows "couldn't load".
import { cp, mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const wasmFrom = resolve(root, "node_modules/@mediapipe/tasks-vision/wasm");
const out = resolve(root, "public/models");
const modelPath = resolve(out, "pose_landmarker_lite.task");
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"; // same model as the prototype, app.js L352

await mkdir(resolve(out, "wasm"), { recursive: true });
await cp(wasmFrom, resolve(out, "wasm"), { recursive: true });

const exists = await stat(modelPath).then(() => true, () => false);
if (!exists) {
  try {
    const res = await fetch(MODEL_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(modelPath, Buffer.from(await res.arrayBuffer()));
    console.log("fetch-pose-assets: model downloaded");
  } catch (error) {
    console.warn(`fetch-pose-assets: could not download the pose model (${error.message}). Run \`npm run assets:pose\` when online.`);
  }
}
