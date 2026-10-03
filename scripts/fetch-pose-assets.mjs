// Self-hosts MediaPipe's WASM and the pose model under public/models so the app never loads them from a CDN at runtime.
// On postinstall a failed download warns and exits 0 so an offline install still succeeds; the UI then shows "couldn't load".
// Strict mode (--strict, run by prebuild, or whenever CI or VERCEL is set) exits 1 instead, because public/models is
// gitignored and a deploy without the model would send every customer to "We couldn't load the measuring tool".
import { cp, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const wasmFrom = resolve(root, "node_modules/@mediapipe/tasks-vision/wasm");
const out = resolve(root, "public/models");
const wasmOut = resolve(out, "wasm");
const modelPath = resolve(out, "pose_landmarker_lite.task");
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"; // same model as the prototype, app.js L352
const strict = process.argv.includes("--strict") || !!process.env.CI || !!process.env.VERCEL;

const sizeOf = path => stat(path).then(s => s.size, () => 0);

await mkdir(wasmOut, { recursive: true });
try {
  await cp(wasmFrom, wasmOut, { recursive: true });
} catch (error) {
  console.warn(`fetch-pose-assets: could not copy the MediaPipe WASM (${error.message}).`);
}

if (!(await sizeOf(modelPath))) {
  try {
    const res = await fetch(MODEL_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(modelPath, Buffer.from(await res.arrayBuffer()));
    console.log("fetch-pose-assets: model downloaded");
  } catch (error) {
    console.warn(`fetch-pose-assets: could not download the pose model (${error.message}). Run \`npm run assets:pose\` when online.`);
  }
}

const missing = [];
if (!(await sizeOf(modelPath))) missing.push("public/models/pose_landmarker_lite.task");
const wasmFiles = await readdir(wasmOut).catch(() => []);
if (!wasmFiles.some(f => f.endsWith(".wasm"))) missing.push("public/models/wasm/*.wasm");
if (missing.length) {
  const message = `fetch-pose-assets: missing ${missing.join(" and ")}.`;
  if (strict) {
    console.error(`${message} Refusing to build without the pose assets.`);
    process.exit(1);
  }
  console.warn(`${message} The measuring tool will not load until \`npm run assets:pose\` succeeds.`);
}
