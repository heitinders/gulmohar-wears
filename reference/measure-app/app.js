/**
 * Gulmohar Wears · Find Your Fit — Customer Mode + Gulmohar Studio
 * Client-side only. All measures / try-ons are DRAFT for tailor check.
 *
 * Circumference formulas (v2 — tighter):
 *   frontFullWidth F (cm) at bust/waist/hip line.
 *   Front-only: circ ≈ F * π * DEPTH_K  (DEPTH_K 0.92–1.05; default 0.95)
 *     Treats silhouette width as near-diameter with slight oval correction.
 *   With side depth D (full anterior–posterior cm):
 *     a=F/2, b=D/2 → circ ≈ 2π * sqrt((a²+b²)/2)  (RMS ellipse perimeter)
 *   Sanity clamp vs height anthropometry: ±15% (was ±35%).
 *   Optional tape calibration: one real bust OR waist scales all girths; lengths unchanged.
 */

import {
  FilesetResolver,
  PoseLandmarker,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/+esm";

const WA_NUMBER = "+91 86998 41800";
const WA_ME = "918699841800"; // wa.me digits, no +
const INV_KEY = "gulmohar_inventory_v1";
const CLIENTS_KEY = "gulmohar_clients_v2";
const TAILOR_LEARN_KEY = "gulmohar_tailor_learn_v2";
const MODE_KEY = "gulmohar_app_mode_v1";
const STUDIO_PIN = "gulmohar";
const MAX_CLIENTS = 50;
const DRAFT_BADGE = "DRAFT — tailor to verify";
const SIX_MONTHS_MS = 182 * 24 * 60 * 60 * 1000;

const FIT_LABELS = { fitted: "Fitted", regular: "Regular", relaxed: "Relaxed" };
const SLEEVE_LABELS = {
  full: "Full sleeve",
  "three-quarter": "¾ sleeve",
  cap: "Cap sleeve",
  sleeveless: "Sleeveless",
};
const NECKLINE_LABELS = {
  round: "Round",
  v: "V-neck",
  boat: "Boat",
  collar: "Collar",
};
/** Ease cm (internal) added to body measures when matching ready chart. UI shows inches. */
const FIT_EASE = { fitted: -1.0, regular: 0, relaxed: 2.5 };

const VERIFY_FIELDS = [
  ["bust", "Bust"],
  ["waist", "Waist"],
  ["hip", "Hip"],
  ["shoulder", "Shoulder"],
  ["acrossBack", "Across back"],
  ["armhole", "Armhole"],
  ["sleeve", "Sleeve length"],
  ["kameez", "Kameez length"],
  ["neck", "Neck"],
  ["salwar", "Bottom length"],
  ["thigh", "Thigh"],
  ["knee", "Knee"],
  ["ankle", "Ankle / opening"],
];
const OCCASION_LABELS = {
  KC: "Karva Chauth (KC)",
  wedding: "Wedding",
  roka: "Roka",
  festive: "Festive",
  other: "Other",
};

/** Suit styles — adjust kameez defaults, bottom emphasis, WhatsApp labels */
const STYLES = {
  punjabi: {
    id: "punjabi",
    label: "Classic Punjabi suit",
    kameezRatio: 0.45,
    salwarRatio: 0.60,
    kameezHint: "Classic suit — mid-thigh kameez default (~45% of height). Salwar length emphasized.",
    kameezLenHint: "If blank, ~45% of height (mid-thigh classic suit).",
    kameezPlaceholder: "Leave blank for mid-thigh default",
    bottomLabel: "Bottom (salwar)",
    bottomRows: [
      ["salwar", "Salwar length"],
      ["thigh", "Thigh"],
      ["knee", "Knee"],
      ["ankle", "Bottom / ankle opening"],
    ],
    waBottomTitle: "Bottom (salwar)",
    waKameezLen: "Kameez length",
  },
  anarkali: {
    id: "anarkali",
    label: "Anarkali",
    kameezRatio: 0.58,
    salwarRatio: 0.58,
    kameezHint: "Anarkali — longer flare kameez (~58% of height, calf/near-floor). Churidar/salwar under emphasized less than length.",
    kameezLenHint: "If blank, ~58% of height (calf / near-floor Anarkali).",
    kameezPlaceholder: "Leave blank for Anarkali length default",
    bottomLabel: "Bottom (churidar / salwar under Anarkali)",
    bottomRows: [
      ["salwar", "Churidar / salwar length"],
      ["thigh", "Thigh"],
      ["knee", "Knee"],
      ["ankle", "Ankle / churidar opening"],
    ],
    waBottomTitle: "Bottom (under Anarkali)",
    waKameezLen: "Anarkali length",
  },
  sharara: {
    id: "sharara",
    label: "Sharara",
    kameezRatio: 0.48,
    salwarRatio: 0.62,
    kameezHint: "Sharara — mid kameez (~48% height). Sharara length, thigh & flare opening emphasized.",
    kameezLenHint: "If blank, ~48% of height (sharara set kameez).",
    kameezPlaceholder: "Leave blank for sharara kameez default",
    bottomLabel: "Bottom (sharara) — length & flare",
    bottomRows: [
      ["salwar", "Sharara length"],
      ["thigh", "Thigh (flare start)"],
      ["knee", "Knee"],
      ["ankle", "Flare / bottom opening"],
    ],
    waBottomTitle: "Bottom (sharara)",
    waKameezLen: "Kameez length (sharara set)",
  },
  farshi: {
    id: "farshi",
    label: "Farshi",
    kameezRatio: 0.52,
    salwarRatio: 0.66,
    kameezHint: "Farshi — longer kurti (~52% height) + floor-length farshi. Bottom length & opening emphasized.",
    kameezLenHint: "If blank, ~52% of height (farshi set kurti).",
    kameezPlaceholder: "Leave blank for farshi kurti default",
    bottomLabel: "Bottom (farshi / floor length)",
    bottomRows: [
      ["salwar", "Farshi length (near floor)"],
      ["thigh", "Thigh"],
      ["knee", "Knee"],
      ["ankle", "Farshi / floor opening"],
    ],
    waBottomTitle: "Bottom (farshi)",
    waKameezLen: "Kurti / kameez length (farshi)",
  },
};

/** Ready-stock bands (inches). Gulmohar heaviest ready stock: M/L 38–40″ bust. */
const SIZE_CHART = [
  { size: "S", bustMin: 34, bustMax: 36, waistMin: 26, waistMax: 28, hipMin: 36, hipMax: 38 },
  { size: "M", bustMin: 36, bustMax: 38, waistMin: 28, waistMax: 30, hipMin: 38, hipMax: 40 },
  { size: "L", bustMin: 38, bustMax: 40, waistMin: 30, waistMax: 32, hipMin: 40, hipMax: 42 },
  { size: "XL", bustMin: 40, bustMax: 42, waistMin: 32, waistMax: 34, hipMin: 42, hipMax: 44 },
];

// MediaPipe Pose landmark indices
const LM = {
  NOSE: 0,
  L_SHOULDER: 11,
  R_SHOULDER: 12,
  L_ELBOW: 13,
  R_ELBOW: 14,
  L_WRIST: 15,
  R_WRIST: 16,
  L_HIP: 23,
  R_HIP: 24,
  L_KNEE: 25,
  R_KNEE: 26,
  L_ANKLE: 27,
  R_ANKLE: 28,
  L_HEEL: 29,
  R_HEEL: 30,
  L_FOOT: 31,
  R_FOOT: 32,
};

/** Anthropometric ratios vs height (adult female-leaning; Punjabi suit clients). Weak fallback. */
const RATIOS = {
  bust: 0.515,
  waist: 0.40,
  hip: 0.54,
  shoulder: 0.229,
  acrossBack: 0.20,
  armhole: 0.24, // sleeve circ proxy
  sleeve: 0.31,
  kameez: 0.45,
  neck: 0.205,
  salwar: 0.60, // waist-to-floor ~0.62 minus hem ease
  thigh: 0.34,
  knee: 0.22,
  ankle: 0.14,
};

const state = {
  step: 0,
  name: "",
  styleId: "punjabi",
  heightCm: null,
  kameezOverride: null,
  frontFile: null,
  sideFile: null,
  frontImg: null,
  sideImg: null,
  frontLandmarks: null,
  sideLandmarks: null,
  measures: null,
  mode: "none", // landmarks | hybrid | ratio
  demo: false,
  poseLandmarker: null,
  poseReady: false,
  poseError: null,
  inventory: [],
  clients: [],
  activeClientId: null,
  tryonClientImg: null,
  tryonClientLandmarks: null,
  selectedInvId: null,
  lastTryonDataUrl: null,
  rawMeasures: null, // pre-calibration snapshot
  calibration: null, // { field, tapeCm, scale, lengthTapeCm? }
  scaleWarnings: [], // e.g. feet cropped
  confidence: null, // per-field { bust: 88, ... }
  poseQuality: null, // { ok, hard, issues: [] }
  fit: "regular",
  sleeve: "full",
  neckline: "round",
  kameezLenNote: "",
  orderSize: "MTM",
  tailorLearn: { global: {}, clients: {}, applyGlobal: true, applyClient: true },
  pendingProfileId: null,
  forceEstimate: false,
  verifiedMeasures: null, // last tailor-verified snapshot for active client
};

// —— DOM helpers ——
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2600);
}

function setStatus(id, text, cls = "") {
  const el = $(id);
  if (!el) return;
  el.className = "status-line" + (cls ? " " + cls : "");
  el.innerHTML = text || "";
}

// —— Mode + Tabs ——
function isStudio() {
  return document.body.classList.contains("studio-mode");
}

function setAppMode(mode) {
  const studio = mode === "studio";
  document.body.classList.toggle("studio-mode", studio);
  try { localStorage.setItem(MODE_KEY, studio ? "studio" : "customer"); } catch {}
  const navC = $("#nav-customer");
  const navS = $("#nav-studio");
  if (navC) navC.hidden = studio;
  if (navS) navS.hidden = !studio;
  const sc = $("#settings-customer-view");
  const ss = $("#settings-studio-view");
  if (sc) sc.hidden = studio;
  if (ss) ss.hidden = !studio;
  // Refresh labels that depend on mode
  if ($("#inv-gallery")) renderInventory();
  if ($("#clients-list")) renderClients();
}

function updateFitProgress(phase) {
  const order = ["measure", "photos", "fit", "tryon"];
  const idx = order.indexOf(phase);
  $$(".fit-progress .fit-step").forEach((el) => {
    const p = el.dataset.fitPhase;
    const i = order.indexOf(p);
    el.classList.toggle("on", i === idx);
    el.classList.toggle("done", i >= 0 && i < idx);
  });
}

function switchTab(name) {
  // Customer cannot open studio-only tabs
  if (!isStudio() && (name === "tailor" || name === "orders")) {
    name = "home";
  }
  // In customer mode, tryon is reached via My Fit progress — still allowed
  $$(".nav-tab").forEach((b) => {
    const on = b.dataset.tab === name;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on ? "true" : "false");
  });
  $$(".tab-panel").forEach((p) => {
    const on = p.id === `tab-${name}`;
    p.classList.toggle("active", on);
    if (on) p.removeAttribute("hidden");
    else p.setAttribute("hidden", "");
  });
  if (name === "inventory") renderInventory();
  if (name === "clients") renderClients();
  if (name === "orders") renderOrders();
  if (name === "tailor") {
    refreshTailorClientSelect();
    renderTailorVerify();
    renderBiasSummary();
  }
  if (name === "tryon") {
    syncTryonFromMeasure();
    renderInvPicker();
    updateFitProgress("tryon");
  }
  if (name === "measure") {
    // map current step to progress phase
    const n = state.step ?? 1;
    if (n <= 1) updateFitProgress("measure");
    else if (n <= 3) updateFitProgress("photos");
    else updateFitProgress("fit");
  }
  if (name === "home") {
    // leave progress alone
  }
}

// —— Measure flow screens ——
function goStep(n) {
  state.step = n;
  // Skip intro (0) in customer flow — Home replaces it; keep for studio back-compat
  $$("#tab-measure .screen").forEach((s) => {
    s.classList.toggle("active", Number(s.dataset.step) === n);
  });
  $$("#progress .dot").forEach((d) => {
    const s = Number(d.dataset.step);
    d.classList.toggle("on", s === n);
    d.classList.toggle("done", s < n);
  });
  if (n <= 1) updateFitProgress("measure");
  else if (n <= 3) updateFitProgress("photos");
  else updateFitProgress("fit");
}

// —— MediaPipe init ——
async function initPose() {
  if (state.poseReady || state.poseError === "loading") return state.poseLandmarker;
  state.poseError = "loading";
  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
    );
    state.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        delegate: "GPU",
      },
      runningMode: "IMAGE",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
    });
    state.poseReady = true;
    state.poseError = null;
    return state.poseLandmarker;
  } catch (err) {
    console.warn("MediaPipe init failed, will use ratio fallback:", err);
    state.poseError = String(err?.message || err);
    state.poseReady = false;
    state.poseLandmarker = null;
    return null;
  }
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Bake to canvas so preview/src survives revokeObjectURL
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const out = new Image();
      out.onload = () => resolve(out);
      out.onerror = () => reject(new Error("Could not bake image"));
      out.src = c.toDataURL("image/jpeg", 0.92);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load image"));
    };
    img.src = url;
  });
}

function detectPose(img) {
  if (!state.poseLandmarker) return null;
  try {
    const result = state.poseLandmarker.detect(img);
    if (result?.landmarks?.length) return result.landmarks[0];
    return null;
  } catch (e) {
    console.warn("detect failed", e);
    return null;
  }
}

/** Pixel distance between two normalized landmarks on an image */
function lmDist(lm, a, b, imgW, imgH) {
  const dx = (lm[a].x - lm[b].x) * imgW;
  const dy = (lm[a].y - lm[b].y) * imgH;
  return Math.hypot(dx, dy);
}

function mid(lm, a, b) {
  return {
    x: (lm[a].x + lm[b].x) / 2,
    y: (lm[a].y + lm[b].y) / 2,
    z: ((lm[a].z || 0) + (lm[b].z || 0)) / 2,
  };
}

function lerpPt(p, q, t) {
  return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t };
}

/** Girth (circumference) keys — scaled by tape calibration. */
const GIRTH_KEYS = ["bust", "waist", "hip", "neck", "armhole", "thigh", "knee", "ankle"];
/** Length / width keys — NOT scaled by girth tape (unless length tape entered). */
const LENGTH_KEYS = ["shoulder", "acrossBack", "sleeve", "kameez", "salwar"];
const DEPTH_K_FRONT = 0.95; // front-only: F * π * k (k in 0.92–1.05)
const CLAMP_LO = 0.85; // ±15% vs height ratio
const CLAMP_HI = 1.15;

function lmVis(lm, idx) {
  const p = lm?.[idx];
  if (!p) return 0;
  if (typeof p.visibility === "number") return p.visibility;
  if (typeof p.presence === "number") return p.presence;
  return 1; // assume ok if model omits visibility
}

/**
 * Scale: prefer nose→ankle/heel when feet are fully in frame.
 * Nose is ~7% below crown → nose-to-heel ≈ height * 0.93.
 * If feet look cropped / low-visibility, fall back to nose→hip (≈36% height) or
 * biacromial shoulder vs height ratio, and push a warning.
 * Returns { cmPerPx, method, warning }.
 */
function cmPerPxFromHeight(lm, imgW, imgH, heightCm) {
  const noseY = lm[LM.NOSE].y;
  const ankleY = Math.max(lm[LM.L_ANKLE].y, lm[LM.R_ANKLE].y);
  const heelY = Math.max(lm[LM.L_HEEL]?.y ?? 0, lm[LM.R_HEEL]?.y ?? 0);
  const footY = Math.max(lm[LM.L_FOOT]?.y ?? 0, lm[LM.R_FOOT]?.y ?? 0);
  const bottomY = Math.max(ankleY, heelY, footY);

  const ankleVis = Math.min(lmVis(lm, LM.L_ANKLE), lmVis(lm, LM.R_ANKLE));
  const heelVis = Math.min(lmVis(lm, LM.L_HEEL), lmVis(lm, LM.R_HEEL));
  const footVis = Math.min(lmVis(lm, LM.L_FOOT), lmVis(lm, LM.R_FOOT));
  const feetVis = Math.max(ankleVis, heelVis, footVis);

  // Cropped if bottom landmark sits well above image bottom, or visibility is weak
  const feetNearBottom = bottomY >= 0.88;
  const feetOk = feetNearBottom && feetVis >= 0.45 && bottomY <= 0.995;

  if (feetOk) {
    const spanPx = Math.abs(bottomY - noseY) * imgH;
    if (spanPx >= 10) {
      return {
        cmPerPx: (heightCm * 0.93) / spanPx,
        method: "nose-heel",
        warning: null,
      };
    }
  }

  // Fallback 1: nose → mid-hip (~36% of stature for adult female)
  const hipMid = mid(lm, LM.L_HIP, LM.R_HIP);
  const torsoPx = Math.abs(hipMid.y - noseY) * imgH;
  if (torsoPx >= 10) {
    return {
      cmPerPx: (heightCm * 0.36) / torsoPx,
      method: "nose-hip-fallback",
      warning:
        "Feet look cropped or unclear — scaled from torso vs height. Retake with full feet in frame.",
    };
  }

  // Fallback 2: shoulder width vs anthropometric ratio
  const shoulderPx = lmDist(lm, LM.L_SHOULDER, LM.R_SHOULDER, imgW, imgH);
  if (shoulderPx >= 5) {
    return {
      cmPerPx: (heightCm * RATIOS.shoulder) / shoulderPx,
      method: "shoulder-fallback",
      warning:
        "Could not use full-body scale — using shoulder vs height. Retake full-body with feet visible.",
    };
  }

  return { cmPerPx: null, method: "none", warning: "Could not derive scale from pose." };
}

function horizWidthCm(lm, leftIdx, rightIdx, imgW, imgH, cmPerPx) {
  return lmDist(lm, leftIdx, rightIdx, imgW, imgH) * cmPerPx;
}

/**
 * Girth from front silhouette width F (full cm) and optional full depth D.
 * Front-only: F * π * DEPTH_K_FRONT (default 0.95).
 * With side: RMS ellipse 2π * sqrt((a²+b²)/2), a=F/2, b=D/2.
 */
function girthCircumference(frontFullWidth, depthFull = null, depthK = DEPTH_K_FRONT) {
  const F = Math.max(frontFullWidth, 0);
  if (!F) return 0;
  if (depthFull != null && depthFull > 0) {
    const a = F / 2;
    const b = depthFull / 2;
    return 2 * Math.PI * Math.sqrt((a * a + b * b) / 2);
  }
  const k = Math.min(1.05, Math.max(0.92, depthK));
  return F * Math.PI * k;
}

/** @deprecated use girthCircumference — kept for thigh helper compatibility */
function ellipseCirc(halfWidth, halfDepth) {
  return girthCircumference(halfWidth * 2, halfDepth * 2);
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

/** Internal engine stays in cm; UI boundary uses inches (Punjabi tailor convention). */
const CM_PER_IN = 2.54;
function cmToIn(cm) {
  if (cm == null || !isFinite(cm)) return null;
  return round1(cm / CM_PER_IN);
}
function inToCm(inches) {
  if (inches == null || !isFinite(inches)) return null;
  return inches * CM_PER_IN;
}
/** Format an internal cm value for display as inches (e.g. 36.5″). */
function fmtIn(cm) {
  const v = cmToIn(cm);
  return v == null ? "—" : `${v}″`;
}

function getStyle() {
  return STYLES[state.styleId] || STYLES.punjabi;
}

function ratioMeasures(heightCm, kameezOverride, styleId = state.styleId) {
  const H = heightCm;
  const style = STYLES[styleId] || STYLES.punjabi;
  const kameezRatio = style.kameezRatio || RATIOS.kameez;
  const salwarRatio = style.salwarRatio || RATIOS.salwar;
  const salwar = Math.max(0, H * salwarRatio - 2); // −2 cm hem ease
  return {
    bust: round1(H * RATIOS.bust),
    waist: round1(H * RATIOS.waist),
    hip: round1(H * RATIOS.hip),
    shoulder: round1(H * RATIOS.shoulder),
    acrossBack: round1(H * RATIOS.acrossBack),
    armhole: round1(H * RATIOS.armhole),
    sleeve: round1(H * RATIOS.sleeve),
    kameez: round1(kameezOverride || H * kameezRatio),
    neck: round1(H * RATIOS.neck),
    salwar: round1(salwar),
    thigh: round1(H * RATIOS.thigh),
    knee: round1(H * RATIOS.knee),
    ankle: round1(H * RATIOS.ankle),
    sources: Object.fromEntries(
      ["bust","waist","hip","shoulder","acrossBack","armhole","sleeve","kameez","neck","salwar","thigh","knee","ankle"]
        .map((k) => [k, "ratio"])
    ),
  };
}

/** Legacy bust-only map — kept for callers; prefer recommendSize(). */
function mapReadySize(bustCm) {
  const rec = recommendSize({ bust: bustCm });
  return {
    size: rec.size,
    bustIn: rec.bustIn,
    bustCm: bustCm != null && isFinite(bustCm) ? round1(bustCm) : null,
    note: rec.note,
  };
}

/** Smarter size: bust+waist+hip vs chart, with fit ease. */
function recommendSize(measures, fit = state.fit || "regular") {
  const m = measures || {};
  if (!m.bust || !isFinite(m.bust)) {
    return {
      size: "—",
      bustIn: null,
      mtm: true,
      note: "No bust draft yet.",
      reasons: [],
      closest: null,
      line: "No size yet.",
    };
  }
  const ease = FIT_EASE[fit] ?? 0;
  const bustIn = (m.bust + ease) / 2.54;
  const waistIn = m.waist != null ? (m.waist + ease) / 2.54 : null;
  const hipIn = m.hip != null ? (m.hip + ease) / 2.54 : null;

  function scoreBand(band) {
    let score = 0;
    let ok = 0;
    const midB = (band.bustMin + band.bustMax) / 2;
    score += Math.abs(bustIn - midB);
    ok += bustIn >= band.bustMin - 0.15 && bustIn <= band.bustMax + 0.15 ? 1 : 0;
    if (waistIn != null) {
      const midW = (band.waistMin + band.waistMax) / 2;
      score += Math.abs(waistIn - midW) * 0.85;
      ok += waistIn >= band.waistMin - 0.2 && waistIn <= band.waistMax + 0.2 ? 1 : 0;
    }
    if (hipIn != null) {
      const midH = (band.hipMin + band.hipMax) / 2;
      score += Math.abs(hipIn - midH) * 0.9;
      ok += hipIn >= band.hipMin - 0.2 && hipIn <= band.hipMax + 0.2 ? 1 : 0;
    }
    return { band, score, ok };
  }

  const ranked = SIZE_CHART.map(scoreBand).sort((a, b) => a.score - b.score || b.ok - a.ok);
  const best = ranked[0];
  let size = best.band.size;
  const reasons = [];
  let mtm = false;

  // Outside overall bust range → Custom
  if (bustIn < 34 - 0.2 || bustIn > 42 + 0.2) {
    size = "Custom";
    mtm = true;
    reasons.push("Bust outside S–XL ready band");
  }

  const band = SIZE_CHART.find((b) => b.size === (size === "Custom" ? best.band.size : size)) || best.band;
  const closest = size === "Custom" ? best.band.size : size;

  function overIn(valIn, maxIn) {
    if (valIn == null) return 0;
    if (valIn <= maxIn) return 0;
    return round1(valIn - maxIn);
  }
  function underIn(valIn, minIn) {
    if (valIn == null) return 0;
    if (valIn >= minIn) return 0;
    return round1(minIn - valIn);
  }

  const hipOver = overIn(hipIn, band.hipMax);
  const waistOver = overIn(waistIn, band.waistMax);
  const bustOver = overIn(bustIn, band.bustMax);
  const hipUnder = underIn(hipIn, band.hipMin);
  const waistUnder = underIn(waistIn, band.waistMin);

  // MTM if overflow ≥ ~0.8 in (~2 cm physical)
  if (hipOver >= 0.8) {
    mtm = true;
    reasons.push(`hip needs +${hipOver}″ vs ${closest} chart`);
  }
  if (waistOver >= 0.8) {
    mtm = true;
    reasons.push(`waist needs +${waistOver}″ vs ${closest} chart`);
  }
  if (bustOver >= 0.8 && size !== "Custom") {
    mtm = true;
    reasons.push(`bust needs +${bustOver}″ vs ${closest} chart`);
  }
  if (hipUnder >= 1.2 || waistUnder >= 1.2) {
    reasons.push("some girths below chart — still check fit preference");
  }

  if (fit === "relaxed" && size !== "Custom" && !mtm) {
    reasons.push("Relaxed fit — room built into advice");
  }
  if (fit === "fitted" && size !== "Custom") {
    reasons.push("Fitted — little ease; MTM if between sizes");
    // If near upper edge of band, lean MTM
    if (bustIn > band.bustMax - 0.4) {
      mtm = true;
      reasons.push("near top of bust band — MTM safer for fitted");
    }
  }

  let note;
  if (size === "Custom") {
    note = "Outside ready-stock band → Custom / MTM stitch recommended.";
  } else if (mtm) {
    note = `Closest Gulmohar size is ${closest}; MTM recommended because ${reasons.filter((r) => r.includes("needs")).join("; ") || "fit needs adjustment"}.`;
  } else if (closest === "L" || closest === "M") {
    note = `Closest ready size ${closest} — within Gulmohar’s heaviest ready-stock focus (M/L 38–40″).`;
  } else {
    note = `Closest ready size ${closest} — still DRAFT; re-tape before cut.`;
  }

  const line = mtm || size === "Custom"
    ? `Your closest Gulmohar size is ${closest}; MTM recommended${reasons.length ? " because " + reasons.filter((r) => r.includes("needs") || r.includes("outside") || r.includes("near top")).join("; ") : ""}.`
    : `Your closest Gulmohar size is ${closest} (ready stock possible).`;

  return {
    size: mtm && size !== "Custom" ? closest : size,
    closest,
    mtm: mtm || size === "Custom",
    bustIn: round1(bustIn),
    waistIn: waistIn != null ? round1(waistIn) : null,
    hipIn: hipIn != null ? round1(hipIn) : null,
    easeCm: ease,
    easeIn: cmToIn(ease),
    fit,
    reasons,
    note,
    line,
    hipOver,
    waistOver,
    bustOver,
  };
}

function landmarkMeasures(frontLm, frontImg, sideLm, sideImg, heightCm, kameezOverride) {
  const fw = frontImg.naturalWidth || frontImg.width;
  const fh = frontImg.naturalHeight || frontImg.height;
  const scaleInfo = cmPerPxFromHeight(frontLm, fw, fh, heightCm);
  const cmPerPx = scaleInfo.cmPerPx;
  const base = ratioMeasures(heightCm, kameezOverride);
  const warnings = [];
  if (scaleInfo.warning) warnings.push(scaleInfo.warning);

  if (!cmPerPx) {
    return { ...base, mode: "ratio", scaleMethod: scaleInfo.method, warnings, sources: { ...base.sources } };
  }

  // Shoulder width (biacromial proxy)
  const shoulder = horizWidthCm(frontLm, LM.L_SHOULDER, LM.R_SHOULDER, fw, fh, cmPerPx);
  const acrossBack = shoulder * 0.88;

  // Bust / waist lines along shoulder→hip (chest ~22%, natural waist ~48%)
  const lBust = lerpPt(frontLm[LM.L_SHOULDER], frontLm[LM.L_HIP], 0.22);
  const rBust = lerpPt(frontLm[LM.R_SHOULDER], frontLm[LM.R_HIP], 0.22);
  const bustFrontW =
    Math.hypot((lBust.x - rBust.x) * fw, (lBust.y - rBust.y) * fh) * cmPerPx;

  const lWaist = lerpPt(frontLm[LM.L_SHOULDER], frontLm[LM.L_HIP], 0.48);
  const rWaist = lerpPt(frontLm[LM.R_SHOULDER], frontLm[LM.R_HIP], 0.48);
  const waistFrontW =
    Math.hypot((lWaist.x - rWaist.x) * fw, (lWaist.y - rWaist.y) * fh) * cmPerPx;

  // Hip: landmark hip width (no artificial ease — was +8% and over-sized)
  const hipFrontW = horizWidthCm(frontLm, LM.L_HIP, LM.R_HIP, fw, fh, cmPerPx);

  let bustDepth = null;
  let waistDepth = null;
  let hipDepth = null;
  let usedSide = false;

  if (sideLm && sideImg) {
    const sw = sideImg.naturalWidth || sideImg.width;
    const sh = sideImg.naturalHeight || sideImg.height;
    const sideScale = cmPerPxFromHeight(sideLm, sw, sh, heightCm);
    const sideCm = sideScale.cmPerPx || cmPerPx;
    if (sideScale.warning) warnings.push("Side: " + sideScale.warning);

    // Profile torso thickness: x-span of nose/shoulders/hips on side view
    const xs = [LM.NOSE, LM.L_SHOULDER, LM.R_SHOULDER, LM.L_HIP, LM.R_HIP].map((i) => sideLm[i].x);
    const depthPx = (Math.max(...xs) - Math.min(...xs)) * sw;
    const torsoDepthCm = depthPx * sideCm;
    // Clamp side depth to plausible fraction of height (chest depth ~12–22% stature)
    const depthClamped = Math.min(heightCm * 0.22, Math.max(heightCm * 0.10, torsoDepthCm));
    if (torsoDepthCm < heightCm * 0.08 || torsoDepthCm > heightCm * 0.28) {
      warnings.push("Side depth looked extreme — clamped to body norms.");
    }
    bustDepth = depthClamped * 1.05;
    waistDepth = depthClamped * 0.92;
    hipDepth = depthClamped * 1.08;
    usedSide = true;
  }

  const bust = girthCircumference(bustFrontW, bustDepth);
  const waist = girthCircumference(waistFrontW, waistDepth);
  const hip = girthCircumference(hipFrontW, hipDepth);

  // Sleeve length: shoulder to wrist (avg L/R)
  const sleeveL = lmDist(frontLm, LM.L_SHOULDER, LM.L_WRIST, fw, fh) * cmPerPx;
  const sleeveR = lmDist(frontLm, LM.R_SHOULDER, LM.R_WRIST, fw, fh) * cmPerPx;
  const sleeve = (sleeveL + sleeveR) / 2;

  // Armhole / sleeve circ proxy from upper-arm width
  const upperArm =
    (lmDist(frontLm, LM.L_SHOULDER, LM.L_ELBOW, fw, fh) * cmPerPx) * 0.22;
  const armhole = Math.max(upperArm * 2 * Math.PI * 0.55, heightCm * 0.22);

  // Kameez length: shoulder mid to mid-thigh, or style/override
  const shoulderMid = mid(frontLm, LM.L_SHOULDER, LM.R_SHOULDER);
  const hipMid = mid(frontLm, LM.L_HIP, LM.R_HIP);
  const kneeMid = mid(frontLm, LM.L_KNEE, LM.R_KNEE);
  const midThigh = lerpPt(hipMid, kneeMid, 0.45);
  let kameez =
    Math.hypot((shoulderMid.x - midThigh.x) * fw, (shoulderMid.y - midThigh.y) * fh) * cmPerPx;
  if (kameezOverride) {
    kameez = kameezOverride;
  } else {
    const style = getStyle();
    if (style.kameezRatio && style.kameezRatio > 0.46) {
      kameez = heightCm * style.kameezRatio;
    }
  }

  const neck = shoulder * 0.38 * Math.PI * 0.55;

  const ankleMid = mid(frontLm, LM.L_ANKLE, LM.R_ANKLE);
  const salwarRaw =
    Math.hypot((hipMid.x - ankleMid.x) * fw, (hipMid.y - ankleMid.y) * fh) * cmPerPx - 2;

  // Thigh circ from hip width fraction (ellipse via girth helper)
  const thigh = girthCircumference(hipFrontW * 0.48, usedSide ? hipDepth * 0.7 : null);
  const kneeW = horizWidthCm(frontLm, LM.L_KNEE, LM.R_KNEE, fw, fh, cmPerPx);
  const kneeCirc = heightCm * RATIOS.knee * 0.5 + kneeW * 0.15;
  const ankleW = horizWidthCm(frontLm, LM.L_ANKLE, LM.R_ANKLE, fw, fh, cmPerPx);
  const ankleCirc = Math.max(heightCm * 0.12, (ankleW / 2) * 0.55 * Math.PI);

  const out = {
    bust: round1(bust),
    waist: round1(waist),
    hip: round1(hip),
    shoulder: round1(shoulder),
    acrossBack: round1(acrossBack),
    armhole: round1(armhole),
    sleeve: round1(sleeve),
    kameez: round1(kameez),
    neck: round1(Math.max(neck, heightCm * 0.18)),
    salwar: round1(Math.max(salwarRaw, heightCm * ((getStyle().salwarRatio || 0.6) - 0.02))),
    thigh: round1(thigh),
    knee: round1(Math.max(kneeCirc, heightCm * 0.18)),
    ankle: round1(ankleCirc),
    sources: {},
    scaleMethod: scaleInfo.method,
    warnings,
  };

  const landmarkKeys = [
    "bust","waist","hip","shoulder","acrossBack","armhole","sleeve","kameez","neck","salwar","thigh","knee","ankle"
  ];
  for (const k of landmarkKeys) {
    // Tighter sanity clamp vs ratio ±15%
    const r = base[k];
    if (out[k] < r * CLAMP_LO || out[k] > r * CLAMP_HI || !isFinite(out[k])) {
      out[k] = r;
      out.sources[k] = "ratio-clamped";
    } else {
      out.sources[k] = usedSide ? "landmark+side" : "landmark";
    }
  }
  return { ...out, mode: usedSide ? "landmarks" : "hybrid" };
}

// —— Pose quality / retake detection ——
function assessPoseQuality(frontLm, sideLm) {
  const issues = [];
  let hard = false;

  if (!frontLm) {
    issues.push({ tip: "No front pose detected — retake front full-body photo", side: "front", hard: true });
    return { ok: false, hard: true, issues };
  }

  const nose = frontLm[LM.NOSE];
  const lAnk = frontLm[LM.L_ANKLE];
  const rAnk = frontLm[LM.R_ANKLE];
  const lFoot = frontLm[LM.L_FOOT];
  const rFoot = frontLm[LM.R_FOOT];
  const bottomY = Math.max(lAnk.y, rAnk.y, lFoot?.y || 0, rFoot?.y || 0);
  const feetVis = Math.max(
    Math.min(lmVis(frontLm, LM.L_ANKLE), lmVis(frontLm, LM.R_ANKLE)),
    Math.min(lmVis(frontLm, LM.L_FOOT), lmVis(frontLm, LM.R_FOOT))
  );

  // Full body / stand farther
  const span = bottomY - nose.y;
  if (span < 0.55) {
    issues.push({ tip: "Stand farther back — full body (head to feet) should fill the frame", side: "front", hard: true });
    hard = true;
  }
  if (bottomY < 0.82 || feetVis < 0.4) {
    issues.push({ tip: "Feet cropped or unclear — include full feet in frame", side: "front", hard: true });
    hard = true;
  }
  if (nose.y > 0.18) {
    issues.push({ tip: "Move back / lower phone — head is cut off or too low in frame", side: "front", hard: false });
  }

  // Arms blocking waist
  const lWri = frontLm[LM.L_WRIST];
  const rWri = frontLm[LM.R_WRIST];
  const lHip = frontLm[LM.L_HIP];
  const rHip = frontLm[LM.R_HIP];
  const lSho = frontLm[LM.L_SHOULDER];
  const rSho = frontLm[LM.R_SHOULDER];
  const hipMidX = (lHip.x + rHip.x) / 2;
  const torsoHalf = Math.abs(lHip.x - rHip.x) / 2 || 0.08;
  const wristNearTorso = (w) => Math.abs(w.x - hipMidX) < torsoHalf * 1.15;
  const wristAtWaistY = (w) => w.y > (lSho.y + lHip.y) / 2 && w.y < lHip.y + 0.05;
  if (
    (wristNearTorso(lWri) && wristAtWaistY(lWri)) ||
    (wristNearTorso(rWri) && wristAtWaistY(rWri))
  ) {
    issues.push({ tip: "Arms blocking waist — hold arms ~6–8 in away from torso", side: "front", hard: true });
    hard = true;
  }

  // Shoulder visibility
  if (lmVis(frontLm, LM.L_SHOULDER) < 0.5 || lmVis(frontLm, LM.R_SHOULDER) < 0.5) {
    issues.push({ tip: "Shoulders unclear — face camera, even lighting, fitted clothes", side: "front", hard: false });
  }

  // Side photo checks
  if (sideLm) {
    const sxs = [LM.NOSE, LM.L_SHOULDER, LM.R_SHOULDER, LM.L_HIP, LM.R_HIP].map((i) => sideLm[i].x);
    const depth = Math.max(...sxs) - Math.min(...sxs);
    const shoulderSpread = Math.abs(sideLm[LM.L_SHOULDER].x - sideLm[LM.R_SHOULDER].x);
    // Frontal-looking side: shoulders still wide in x
    if (shoulderSpread > 0.12 && depth < 0.14) {
      issues.push({ tip: "Side photo looks frontal — turn 90° for a true profile", side: "side", hard: true });
      hard = true;
    } else if (shoulderSpread > 0.18) {
      issues.push({ tip: "Side photo looks frontal — turn fully to the side", side: "side", hard: true });
      hard = true;
    }
    const sBottom = Math.max(sideLm[LM.L_ANKLE].y, sideLm[LM.R_ANKLE].y);
    if (sBottom < 0.82) {
      issues.push({ tip: "Side: feet cropped — include full feet, same distance as front", side: "side", hard: false });
    }
  } else {
    issues.push({ tip: "No side photo — bust/waist/hip depth weaker without profile", side: "side", hard: false });
  }

  return { ok: !hard, hard, issues };
}

function renderRetakePanel(quality) {
  const panel = $("#retake-panel");
  const list = $("#retake-list");
  const hardNote = $("#retake-hard-note");
  const actions = $("#retake-actions");
  const forceBtn = $("#btn-force-estimate");
  if (!panel || !list) return;
  if (!quality || !quality.issues?.length) {
    panel.hidden = true;
    list.innerHTML = "";
    if (hardNote) hardNote.hidden = true;
    if (actions) actions.hidden = true;
    if (forceBtn) forceBtn.hidden = true;
    return;
  }
  panel.hidden = false;
  list.innerHTML = quality.issues
    .map((i) => `<li class="${i.hard ? "hard" : ""}">${escapeHtml(i.tip)}</li>`)
    .join("");
  if (hardNote) hardNote.hidden = !quality.hard;
  if (actions) actions.hidden = false;
  if (forceBtn) forceBtn.hidden = !quality.hard;
}

/** Per-field confidence 0–100 from pose, side, clamp, calibration. */
function computeConfidence(measures, frontLm, sideLm, quality) {
  const conf = {};
  const sources = measures?.sources || {};
  const calibrated = !!(measures?.calibrated || state.calibration);
  const hasSide = !!(sideLm && measures?.mode === "landmarks");
  const baseVis = (idx) => (frontLm ? lmVis(frontLm, idx) : 0.3);

  const fieldMeta = {
    bust: { vis: () => (baseVis(LM.L_SHOULDER) + baseVis(LM.R_SHOULDER) + baseVis(LM.L_HIP) + baseVis(LM.R_HIP)) / 4, sideBoost: 12 },
    waist: { vis: () => (baseVis(LM.L_HIP) + baseVis(LM.R_HIP) + baseVis(LM.L_SHOULDER) + baseVis(LM.R_SHOULDER)) / 4, sideBoost: 12 },
    hip: { vis: () => (baseVis(LM.L_HIP) + baseVis(LM.R_HIP)) / 2, sideBoost: 10 },
    shoulder: { vis: () => (baseVis(LM.L_SHOULDER) + baseVis(LM.R_SHOULDER)) / 2, sideBoost: 0 },
    acrossBack: { vis: () => (baseVis(LM.L_SHOULDER) + baseVis(LM.R_SHOULDER)) / 2, sideBoost: 0 },
    armhole: { vis: () => (baseVis(LM.L_SHOULDER) + baseVis(LM.L_ELBOW)) / 2, sideBoost: 0 },
    sleeve: { vis: () => (baseVis(LM.L_WRIST) + baseVis(LM.R_WRIST) + baseVis(LM.L_SHOULDER)) / 3, sideBoost: 0 },
    kameez: { vis: () => (baseVis(LM.L_SHOULDER) + baseVis(LM.L_HIP) + baseVis(LM.L_KNEE)) / 3, sideBoost: 0 },
    neck: { vis: () => (baseVis(LM.NOSE) + baseVis(LM.L_SHOULDER) + baseVis(LM.R_SHOULDER)) / 3, sideBoost: 0 },
    salwar: { vis: () => (baseVis(LM.L_HIP) + baseVis(LM.L_ANKLE) + baseVis(LM.R_ANKLE)) / 3, sideBoost: 0 },
    thigh: { vis: () => (baseVis(LM.L_HIP) + baseVis(LM.L_KNEE)) / 2, sideBoost: 6 },
    knee: { vis: () => (baseVis(LM.L_KNEE) + baseVis(LM.R_KNEE)) / 2, sideBoost: 0 },
    ankle: { vis: () => (baseVis(LM.L_ANKLE) + baseVis(LM.R_ANKLE)) / 2, sideBoost: 0 },
  };

  let qualityPenalty = 0;
  if (quality?.hard) qualityPenalty = 18;
  else if (quality?.issues?.length) qualityPenalty = 8;

  for (const key of Object.keys(fieldMeta)) {
    const meta = fieldMeta[key];
    let c = 42 + meta.vis() * 38;
    const src = sources[key] || "ratio";
    if (src === "ratio" || measures?.mode === "ratio") c = Math.min(c, 55);
    if (src === "ratio-clamped") c -= 14;
    if (src === "landmark") c += 6;
    if (src === "landmark+side") c += 10;
    if (hasSide) c += meta.sideBoost;
    if (calibrated && GIRTH_KEYS.includes(key)) c = Math.min(96, c + 18);
    if (calibrated && sources[key] === "calibrated") c = Math.min(97, Math.max(c, 90));
    c -= qualityPenalty;
    if (!frontLm) c = Math.min(c, 48);
    conf[key] = Math.max(25, Math.min(97, Math.round(c)));
  }
  return conf;
}

function confidenceClass(pct) {
  if (pct >= 85) return "conf-high";
  if (pct >= 70) return "conf-mid";
  return "conf-low";
}

// —— Tailor learn / bias ——
function loadTailorLearn() {
  try {
    const raw = JSON.parse(localStorage.getItem(TAILOR_LEARN_KEY) || "{}");
    state.tailorLearn = {
      global: raw.global || {},
      clients: raw.clients || {},
      applyGlobal: raw.applyGlobal !== false,
      applyClient: raw.applyClient !== false,
    };
  } catch {
    state.tailorLearn = { global: {}, clients: {}, applyGlobal: true, applyClient: true };
  }
}

function saveTailorLearn() {
  try {
    localStorage.setItem(TAILOR_LEARN_KEY, JSON.stringify(state.tailorLearn));
  } catch (e) {
    toast("Could not save tailor learning");
    console.warn(e);
  }
}

function getBiasForField(field, clientId = state.activeClientId) {
  const learn = state.tailorLearn;
  if (learn.applyClient && clientId && learn.clients[clientId]?.[field]) {
    const e = learn.clients[clientId][field];
    if (e.count >= 1) return { avg: e.sum / e.count, count: e.count, scope: "client" };
  }
  if (learn.applyGlobal && learn.global[field]) {
    const e = learn.global[field];
    if (e.count >= 1) return { avg: e.sum / e.count, count: e.count, scope: "global" };
  }
  return null;
}

function applyLearnedBias(measures) {
  if (!measures) return measures;
  const out = { ...measures, sources: { ...(measures.sources || {}) } };
  const applied = [];
  for (const [key] of VERIFY_FIELDS) {
    if (out[key] == null || !isFinite(out[key])) continue;
    const bias = getBiasForField(key);
    if (!bias || Math.abs(bias.avg) < 0.15) continue;
    // bias = AI - tailor ⇒ corrected ≈ AI - bias
    out[key] = round1(out[key] - bias.avg);
    out.sources[key] = (out.sources[key] || "landmark") + "+bias";
    applied.push(`${key} ${bias.avg >= 0 ? "+" : ""}${fmtIn(bias.avg)} (${bias.scope})`);
  }
  if (applied.length) {
    out.warnings = [...(out.warnings || []), "Applied learned tailor bias: " + applied.slice(0, 4).join(", ")];
  }
  return out;
}

function recordTailorDeltas(aiMeasures, corrections, clientId) {
  const learn = state.tailorLearn;
  const now = new Date().toISOString();
  function bump(bucket, field, delta) {
    if (!bucket[field]) bucket[field] = { sum: 0, count: 0, last: null };
    bucket[field].sum += delta;
    bucket[field].count += 1;
    bucket[field].last = now;
  }
  let n = 0;
  for (const [key] of VERIFY_FIELDS) {
    const ai = aiMeasures?.[key];
    const corr = corrections[key];
    if (ai == null || corr == null || !isFinite(ai) || !isFinite(corr)) continue;
    const delta = round1(ai - corr); // positive ⇒ AI usually high
    bump(learn.global, key, delta);
    if (clientId) {
      if (!learn.clients[clientId]) learn.clients[clientId] = {};
      bump(learn.clients[clientId], key, delta);
    }
    n++;
  }
  saveTailorLearn();
  return n;
}

function biasLabel(field) {
  const b = getBiasForField(field, null);
  const clientB = state.activeClientId ? getBiasForField(field, state.activeClientId) : null;
  const use = clientB || b;
  if (!use) return "—";
  const sign = use.avg >= 0 ? "+" : "";
  return `AI usually ${sign}${fmtIn(use.avg)} (n=${use.count}${use.scope === "client" ? ", client" : ""})`;
}

function renderBiasSummary() {
  const list = $("#bias-list");
  if (!list) return;
  const rows = VERIFY_FIELDS.map(([key, label]) => {
    const g = state.tailorLearn.global[key];
    if (!g || !g.count) return null;
    const avg = g.sum / g.count;
    const sign = avg >= 0 ? "+" : "";
    return `<div class="bias-row"><span>${escapeHtml(label)}</span><em>AI usually ${sign}${fmtIn(avg)}</em> <span class="muted">n=${g.count}</span></div>`;
  }).filter(Boolean);
  list.innerHTML = rows.length ? rows.join("") : "No corrections yet.";
  const ag = $("#bias-apply-global");
  const ac = $("#bias-apply-client");
  if (ag) ag.checked = state.tailorLearn.applyGlobal !== false;
  if (ac) ac.checked = state.tailorLearn.applyClient !== false;
}

function refreshTailorClientSelect() {
  const sel = $("#tailor-client-select");
  if (!sel) return;
  const cur = sel.value;
  const opts = ['<option value="">Global / current session</option>'];
  for (const c of state.clients) {
    opts.push(`<option value="${escapeAttr(c.id)}">${escapeHtml(c.name || "Unnamed")}</option>`);
  }
  sel.innerHTML = opts.join("");
  if (cur && [...sel.options].some((o) => o.value === cur)) sel.value = cur;
  else if (state.activeClientId) sel.value = state.activeClientId;
}

function renderTailorVerify() {
  const wrap = $("#tailor-verify-table");
  if (!wrap) return;
  const m = state.measures || state.rawMeasures;
  if (!m) {
    wrap.innerHTML = `<p class="hint">Load a client or run Measure first — then enter tailor corrections here.</p>`;
    return;
  }
  wrap.innerHTML = VERIFY_FIELDS.map(([key, label]) => {
    const aiIn = m[key] != null ? cmToIn(m[key]) : "";
    const verified = state.verifiedMeasures?.[key];
    const valIn = verified != null ? cmToIn(verified) : "";
    return `<div class="tailor-row" data-field="${escapeAttr(key)}">
      <div class="tailor-label">${escapeHtml(label)}</div>
      <div class="tailor-ai">AI <strong>${aiIn !== "" ? aiIn : "—"}</strong> ″</div>
      <label class="tailor-corr">Tailor
        <input type="number" inputmode="decimal" step="0.1" min="4" max="79" data-corr="${escapeAttr(key)}" value="${valIn !== "" ? escapeAttr(String(valIn)) : ""}" placeholder="in" />
      </label>
      <div class="tailor-bias">${escapeHtml(biasLabel(key))}</div>
    </div>`;
  }).join("");
}

function saveTailorCorrections() {
  const m = state.measures || state.rawMeasures;
  if (!m) {
    toast("No AI draft to compare");
    return;
  }
  const corrections = {};
  let filled = 0;
  $$("[data-corr]").forEach((inp) => {
    const key = inp.dataset.corr;
    const vIn = parseFloat(inp.value);
    // User enters inches; store cm for engine/bias
    if (vIn && vIn > 4 && vIn < 79) {
      corrections[key] = round1(inToCm(vIn));
      filled++;
    }
  });
  if (!filled) {
    toast("Enter at least one corrected measurement");
    return;
  }
  const clientId = $("#tailor-client-select")?.value || state.activeClientId || null;
  const n = recordTailorDeltas(m, corrections, clientId || null);
  state.verifiedMeasures = { ...(state.verifiedMeasures || {}), ...corrections };

  // Persist verified measures onto client profile
  if (clientId) {
    const client = state.clients.find((c) => c.id === clientId);
    if (client) {
      client.verifiedMeasures = { ...(client.verifiedMeasures || {}), ...corrections };
      client.verifiedAt = new Date().toISOString();
      // Optionally update working measures to tailor values for saved profile
      if (client.measures) {
        for (const [k, v] of Object.entries(corrections)) {
          client.measures[k] = v;
          if (!client.measures.sources) client.measures.sources = {};
          client.measures.sources[k] = "tailor-verified";
        }
      }
      client.updatedAt = new Date().toISOString();
      saveClients();
    }
  }
  renderBiasSummary();
  renderTailorVerify();
  toast(`Saved ${n} correction${n === 1 ? "" : "s"} — bias updated`);
}

function measuresAgeMs(client) {
  const t = client?.verifiedAt || client?.measuresUpdatedAt || client?.updatedAt;
  if (!t) return null;
  return Date.now() - new Date(t).getTime();
}

function isMeasuresStale(client) {
  const age = measuresAgeMs(client);
  return age != null && age > SIX_MONTHS_MS;
}

// —— Render results ——
const KAMEEZ_ROWS = [
  ["bust", "Bust"],
  ["waist", "Waist"],
  ["hip", "Hip"],
  ["shoulder", "Shoulder width"],
  ["acrossBack", "Across back"],
  ["armhole", "Armhole / sleeve circ (proxy)"],
  ["sleeve", "Sleeve length"],
  ["kameez", "Kameez / kurti length"],
  ["neck", "Neck (round, approx)"],
];
const BOTTOM_ROWS = [
  ["salwar", "Salwar / sharara length"],
  ["thigh", "Thigh"],
  ["knee", "Knee"],
  ["ankle", "Bottom / ankle opening"],
];

function sourceLabel(src) {
  if (!src) return "ratio draft (weaker)";
  if (src === "landmark" || src === "landmark+side") return "pose landmark";
  if (src.includes("bias")) return "pose + learned bias";
  if (src === "ratio-clamped") return "ratio (landmark out of range)";
  if (src === "calibrated") return "calibrated to your tape";
  if (src === "tailor-verified") return "tailor verified";
  if (src === "saved-profile") return "saved profile";
  return "ratio draft (weaker)";
}

function fillTable(tableEl, rows, measures) {
  const raw = state.rawMeasures;
  const calibrated = !!(state.calibration && state.calibration.scale);
  const conf = state.confidence || {};
  tableEl.innerHTML = rows
    .map(([key, label]) => {
      const src = measures.sources[key] || "ratio";
      const cur = measures[key];
      const before = raw && calibrated && raw[key] != null ? raw[key] : null;
      const changed = before != null && Math.abs(before - cur) >= 0.05;
      const beforeHtml = changed
        ? `<span class="before-val" title="Before tape calibration">${cmToIn(before)} → </span>`
        : "";
      const pct = conf[key];
      const confHtml =
        pct != null
          ? `<span class="conf-pill ${confidenceClass(pct)}" title="Measurement confidence">Confidence ${pct}%</span>`
          : "";
      return `<tr>
        <td class="name">${label}<span class="source-tag">${sourceLabel(src)}</span>${confHtml}</td>
        <td class="val">${beforeHtml}${fmtIn(cur)}</td>
        <td class="badge-cell"><span class="badge">${DRAFT_BADGE}</span></td>
      </tr>`;
    })
    .join("");
}

/** Apply one tape measure: scale all girths; optional length scales length fields. */
function applyTapeCalibration(field, tapeCm, lengthTapeCm = null) {
  if (!state.measures) return false;
  if (!state.rawMeasures) {
    state.rawMeasures = { ...state.measures, sources: { ...(state.measures.sources || {}) } };
  }
  const raw = state.rawMeasures;
  const estimated = raw[field];
  if (!estimated || !isFinite(estimated) || estimated <= 0) {
    toast("No estimated value for that field");
    return false;
  }
  // tapeCm is already converted from user inches at the UI boundary
  if (!tapeCm || tapeCm < 40 || tapeCm > 160) {
    toast("Enter a realistic tape value (~16–63 in)");
    return false;
  }
  const scale = tapeCm / estimated;
  if (scale < 0.7 || scale > 1.4) {
    toast("Tape differs too much from estimate — check the number (inches)");
    return false;
  }

  const next = { ...raw, sources: { ...raw.sources } };
  for (const k of GIRTH_KEYS) {
    if (raw[k] != null && isFinite(raw[k])) {
      next[k] = round1(raw[k] * scale);
      next.sources[k] = "calibrated";
    }
  }
  next[field] = round1(tapeCm);
  next.sources[field] = "calibrated";

  let lengthScale = null;
  if (lengthTapeCm && lengthTapeCm > 20 && lengthTapeCm < 180 && raw.kameez) {
    lengthScale = lengthTapeCm / raw.kameez;
    if (lengthScale >= 0.7 && lengthScale <= 1.4) {
      for (const k of ["kameez", "sleeve", "salwar"]) {
        if (raw[k] != null) {
          next[k] = round1(raw[k] * lengthScale);
          next.sources[k] = "calibrated";
        }
      }
      next.kameez = round1(lengthTapeCm);
    } else {
      lengthScale = null;
    }
  }

  next.mode = raw.mode;
  next.scaleMethod = raw.scaleMethod;
  next.warnings = [...(raw.warnings || [])];
  next.calibrated = true;

  state.calibration = {
    field,
    tapeCm: round1(tapeCm),
    scale: round1(scale * 1000) / 1000,
    lengthTapeCm: lengthScale ? round1(lengthTapeCm) : null,
  };
  state.measures = next;
  return true;
}

function clearTapeCalibration() {
  if (!state.rawMeasures) return;
  state.measures = {
    ...state.rawMeasures,
    sources: { ...state.rawMeasures.sources },
    calibrated: false,
  };
  state.calibration = null;
}

function updateCalibUI() {
  const note = $("#calib-note");
  const pill = $("#calib-pill");
  const c = state.calibration;
  if (c && c.scale) {
    const pct = round1((c.scale - 1) * 100);
    const dir = pct >= 0 ? `+${pct}%` : `${pct}%`;
    if (note) {
      note.innerHTML = `<strong>Calibrated to your tape</strong> — ${c.field} set to <em>${fmtIn(c.tapeCm)}</em> (scale ${c.scale}× / ${dir} on girths). Lengths unchanged${c.lengthTapeCm ? ` except kameez/sleeve/salwar scaled to ${fmtIn(c.lengthTapeCm)}` : ""}.`;
    }
    if (pill) {
      pill.hidden = false;
      pill.textContent = `Calibrated to your tape (${c.field} ${fmtIn(c.tapeCm)})`;
    }
  } else {
    if (note) {
      note.innerHTML =
        "Enter <strong>one</strong> real tape (bust or waist). All girths scale; kameez/sleeve/salwar stay pose/height-based unless you also enter a length.";
    }
    if (pill) pill.hidden = true;
  }
}

function showResults() {
  const m = state.measures;
  const style = getStyle();
  const pill = $("#mode-pill");
  if (m.calibrated) {
    pill.textContent = "Calibrated to your tape + photo draft";
    pill.classList.remove("weak");
  } else if (m.mode === "landmarks") {
    pill.textContent = "Pose landmarks + height (front & side)";
    pill.classList.remove("weak");
  } else if (m.mode === "hybrid") {
    pill.textContent = "Pose landmarks + height (front only)";
    pill.classList.remove("weak");
  } else {
    pill.textContent = "Ratio draft (weaker) — height only";
    pill.classList.add("weak");
  }

  const warnEl = $("#scale-warnings");
  if (warnEl) {
    const warns = m.warnings || state.scaleWarnings || [];
    if (warns.length) {
      warnEl.hidden = false;
      warnEl.innerHTML = warns.map((w) => `<div>⚠️ ${w}</div>`).join("");
    } else {
      warnEl.hidden = true;
      warnEl.innerHTML = "";
    }
  }

  const date = new Date().toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  $("#results-meta").innerHTML = `<strong>${state.name || "Client"}</strong> · Height ${fmtIn(state.heightCm)} · ${date}`;

  const stylePill = $("#style-pill");
  if (stylePill) stylePill.textContent = `Style: ${style.label}`;

  applyFitUI();
  const rec = recommendSize(m, state.fit);
  const sized = mapReadySize(m.bust);
  const sizeEl = $("#size-estimate");
  if (sizeEl) {
    const inStr = rec.bustIn != null ? `${rec.bustIn}″` : "—";
    const tag = rec.mtm ? "MTM recommended" : `Ready ${rec.size}`;
    const easeIn = rec.easeIn != null ? rec.easeIn : cmToIn(rec.easeCm);
    const easeStr = easeIn == null ? "0″" : `${easeIn >= 0 ? "+" : ""}${easeIn}″`;
    sizeEl.innerHTML = `
      <div class="size-big">${escapeHtml(rec.line)}</div>
      <div class="size-sub">Draft bust ${inStr} · Fit: ${escapeHtml(FIT_LABELS[state.fit] || state.fit)} (ease ${easeStr}) · <em>${escapeHtml(tag)}</em></div>
      <div class="size-note">${escapeHtml(rec.note)}</div>`;
    sizeEl.dataset.size = rec.mtm ? "MTM" : rec.size;
  }
  const sizeNote = $("#size-note");
  if (sizeNote) {
    sizeNote.innerHTML = rec.mtm
      ? "Bust + waist + hip vs chart (with fit ease). <strong>MTM</strong> when girths exceed ready band. Chart is a <strong>draft guide only</strong>."
      : `Bust + waist + hip vs chart. Gulmohar ready stock is heaviest in <strong>M / L (38–40″)</strong>. Re-tape before cut.`;
  }
  // Prefill try-on order size chip from recommendation
  if (rec.mtm || rec.size === "Custom") state.orderSize = "MTM";
  else if (["S", "M", "L", "XL"].includes(rec.size)) state.orderSize = rec.size;
  applyOrderSizeUI();

  updateCalibUI();
  fillTable($("#table-kameez"), KAMEEZ_ROWS, m);
  const bottomLabel = $("#bottom-section-label");
  if (bottomLabel) bottomLabel.textContent = style.bottomLabel;
  fillTable($("#table-bottom"), style.bottomRows || BOTTOM_ROWS, m);
  if (typeof refreshBriefPreview === "function") refreshBriefPreview();
  goStep(4);
}

function buildWhatsAppCard() {
  const m = state.measures;
  const style = getStyle();
  const rec = recommendSize(m, state.fit);
  const date = new Date().toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const conf = state.confidence || {};
  const line = (label, key) => {
    const c = conf[key] != null ? ` · conf ${conf[key]}%` : "";
    return `${label}: ${fmtIn(m[key])} (draft${c})`;
  };
  const bottomLines = (style.bottomRows || BOTTOM_ROWS).map(([key, label]) => line(label, key));
  const fitLine = `Fit: ${FIT_LABELS[state.fit] || state.fit} · Sleeve: ${SLEEVE_LABELS[state.sleeve] || state.sleeve} · Neckline: ${NECKLINE_LABELS[state.neckline] || state.neckline}${state.kameezLenNote ? " · Length note: " + state.kameezLenNote : ""}`;
  return [
    "Gulmohar Wear — Measurement DRAFT",
    `Client: ${state.name || "—"}`,
    `Style: ${style.label}`,
    fitLine,
    `Height: ${fmtIn(state.heightCm)}`,
    `Date: ${date}`,
    `Mode: ${m.mode}`,
    `Size advice: ${rec.line}`,
    state.calibration
      ? `Calibration: ${state.calibration.field} tape ${fmtIn(state.calibration.tapeCm)} (girths ×${state.calibration.scale}) — calibrated to your tape`
      : "Calibration: none — enter one tape measure in app for ~±0.5–1 in girths",
    "",
    "Kameez / upper",
    line("Bust", "bust"),
    line("Waist", "waist"),
    line("Hip", "hip"),
    line("Shoulder", "shoulder"),
    line("Across back", "acrossBack"),
    line("Armhole / sleeve circ", "armhole"),
    line("Sleeve length", "sleeve"),
    line(style.waKameezLen || "Kameez length", "kameez"),
    line("Neck", "neck"),
    "",
    style.waBottomTitle || "Bottom",
    ...bottomLines,
    "",
    state.calibration
      ? "⚠️ Girths calibrated to client tape; still DRAFT — tailor to verify before cutting."
      : "⚠️ All measures are AI photo estimates. Tailor must verify before cutting.",
    "Ready-stock size is a draft guide only — not a cut sheet.",
    `WhatsApp: ${WA_NUMBER}`,
  ].join("\n");
}

function openWhatsAppText(text) {
  const url = `https://wa.me/${WA_ME}?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Prefer Web Share with image when available; else wa.me text + manual attach note. */
async function sendWhatsApp(text, imageDataUrl = null) {
  if (imageDataUrl && navigator.share) {
    try {
      const blob = await (await fetch(imageDataUrl)).blob();
      const file = new File([blob], "gulmohar-tryon-draft.png", { type: "image/png" });
      const payload = { text, files: [file], title: "Gulmohar Wear draft" };
      if (!navigator.canShare || navigator.canShare(payload)) {
        await navigator.share(payload);
        toast("Shared — pick WhatsApp if listed");
        return;
      }
    } catch (err) {
      // User cancel or unsupported — fall through to wa.me
      if (err && err.name === "AbortError") return;
    }
  }
  openWhatsAppText(text);
  if (imageDataUrl) {
    toast("WhatsApp opened — attach the PNG manually (wa.me cannot attach images)");
  } else {
    toast("Opening WhatsApp…");
  }
}


// —— Order brief ——
function readBriefFields() {
  return {
    fabric: ($("#brief-fabric")?.value || "").trim(),
    occasion: ($("#brief-occasion")?.value || "").trim(),
    city: ($("#brief-city")?.value || "").trim(),
    deadline: ($("#brief-deadline")?.value || "").trim(),
    notes: ($("#brief-notes")?.value || "").trim(),
  };
}

function setBriefFields(brief = {}) {
  if ($("#brief-fabric")) $("#brief-fabric").value = brief.fabric || "";
  if ($("#brief-occasion")) $("#brief-occasion").value = brief.occasion || "";
  if ($("#brief-city")) $("#brief-city").value = brief.city || "";
  if ($("#brief-deadline")) $("#brief-deadline").value = brief.deadline || "";
  if ($("#brief-notes")) $("#brief-notes").value = brief.notes || "";
}

function formatDeadline(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso + "T12:00:00");
    return d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function occasionLabel(code) {
  if (!code) return "—";
  return OCCASION_LABELS[code] || code;
}

function buildOrderBrief() {
  const m = state.measures;
  if (!m) return "No measurement draft yet.";
  const style = getStyle();
  const rec = recommendSize(m, state.fit);
  const brief = readBriefFields();
  const date = new Date().toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const conf = state.confidence || {};
  const line = (label, key) => {
    const c = conf[key] != null ? ` · conf ${conf[key]}%` : "";
    return `${label}: ${fmtIn(m[key])} (draft${c})`;
  };
  const bottomLines = (style.bottomRows || BOTTOM_ROWS).map(([key, label]) => line(label, key));
  const fitLine = `Fit: ${FIT_LABELS[state.fit] || state.fit} · Sleeve: ${SLEEVE_LABELS[state.sleeve] || state.sleeve} · Neckline: ${NECKLINE_LABELS[state.neckline] || state.neckline}${state.kameezLenNote ? " · Length note: " + state.kameezLenNote : ""}`;
  return [
    "Gulmohar Wear — ORDER BRIEF (DRAFT)",
    `Client: ${state.name || "—"}`,
    `Style: ${style.label}`,
    fitLine,
    `Height: ${fmtIn(state.heightCm)}`,
    `Date: ${date}`,
    `Size advice: ${rec.line}`,
    "",
    "Order details",
    `Fabric preference: ${brief.fabric || "—"}`,
    `Occasion: ${occasionLabel(brief.occasion)}`,
    `Delivery city: ${brief.city || "—"}`,
    `Deadline: ${formatDeadline(brief.deadline)}`,
    `Notes: ${brief.notes || "—"}`,
    "",
    "Kameez / upper",
    line("Bust", "bust"),
    line("Waist", "waist"),
    line("Hip", "hip"),
    line("Shoulder", "shoulder"),
    line("Across back", "acrossBack"),
    line("Armhole / sleeve circ", "armhole"),
    line("Sleeve length", "sleeve"),
    line(style.waKameezLen || "Kameez length", "kameez"),
    line("Neck", "neck"),
    "",
    style.waBottomTitle || "Bottom",
    ...bottomLines,
    "",
    "⚠️ All measures are AI photo estimates. Tailor must verify before cutting.",
    "Ready-stock size & order brief are drafts — not a cut sheet.",
    `WhatsApp: ${WA_NUMBER}`,
  ].join("\n");
}

function refreshBriefPreview() {
  const el = $("#brief-preview");
  if (!el) return;
  if (!state.measures) {
    el.innerHTML = "";
    return;
  }
  const brief = readBriefFields();
  const rec = recommendSize(state.measures, state.fit);
  const style = getStyle();
  const sizeTag = rec.mtm ? `MTM (closest ${rec.closest})` : rec.size;
  el.innerHTML = `
    <div class="brief-preview-card">
      <strong>Preview</strong>
      <div>${escapeHtml(state.name || "Client")} · ${escapeHtml(style.label)} · ${escapeHtml(FIT_LABELS[state.fit] || "")} · <em>${escapeHtml(sizeTag)}</em></div>
      <div class="brief-preview-meta">
        ${brief.fabric ? "Fabric: " + escapeHtml(brief.fabric) + " · " : ""}
        ${brief.occasion ? escapeHtml(occasionLabel(brief.occasion)) + " · " : ""}
        ${brief.city ? escapeHtml(brief.city) + " · " : ""}
        ${brief.deadline ? "Due " + escapeHtml(formatDeadline(brief.deadline)) : ""}
      </div>
      ${brief.notes ? `<p class="brief-notes-prev">${escapeHtml(brief.notes)}</p>` : ""}
    </div>`;
}

function printOrderBrief() {
  const text = buildOrderBrief();
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) {
    toast("Pop-up blocked — allow pop-ups to print");
    return;
  }
  const safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  w.document.write(`<!DOCTYPE html><html><head><title>Gulmohar Order Brief</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body{font-family:system-ui,sans-serif;padding:24px;max-width:640px;margin:0 auto;color:#111;line-height:1.45}
      h1{font-size:1.1rem;color:#F15A24;margin:0 0 12px}
      pre{white-space:pre-wrap;font-size:0.92rem;background:#faf8f6;padding:16px;border-radius:12px;border:1px solid #e8e4e0}
      .actions{margin:16px 0;display:flex;gap:8px;flex-wrap:wrap}
      button{padding:10px 16px;border-radius:10px;border:1px solid #e8e4e0;background:#F15A24;color:#fff;font-weight:650;cursor:pointer}
      button.secondary{background:#fff;color:#111}
      @media print{.actions{display:none}}
    </style></head><body>
    <h1>Gulmohar Wear · Order brief (DRAFT)</h1>
    <div class="actions">
      <button onclick="window.print()">Print / Save PDF</button>
      <button class="secondary" onclick="window.close()">Close</button>
    </div>
    <pre>${safe}</pre>
    <p style="font-size:0.8rem;color:#666">DRAFT — tailor to verify before cutting. WhatsApp +91 86998 41800</p>
    </body></html>`);
  w.document.close();
}

// —— Saved clients (localStorage) ——
function loadClients() {
  try {
    state.clients = JSON.parse(localStorage.getItem(CLIENTS_KEY) || "[]");
    if (!Array.isArray(state.clients)) state.clients = [];
  } catch {
    state.clients = [];
  }
}

function saveClients() {
  try {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(state.clients));
  } catch (e) {
    toast("Could not save clients (storage full?)");
    console.warn(e);
  }
}

function snapshotMeasures(m) {
  if (!m) return null;
  const out = { mode: m.mode };
  for (const k of Object.keys(m)) {
    if (k === "sources") continue;
    out[k] = m[k];
  }
  if (m.sources) out.sources = { ...m.sources };
  return out;
}

function saveCurrentClient() {
  if (!state.measures || !state.heightCm) {
    toast("Estimate measurements first");
    return;
  }
  const typed = ($("#input-name")?.value || "").trim();
  const name = typed || state.name || "Unnamed client";
  const displayName = name;
  state.name = name === "Unnamed client" ? "" : name;
  if ($("#input-name")) $("#input-name").value = state.name;
  const style = getStyle();
  syncFitFromUI();
  const rec = recommendSize(state.measures, state.fit);
  const brief = readBriefFields();
  const now = new Date().toISOString();

  let client = null;
  if (state.activeClientId) {
    client = state.clients.find((c) => c.id === state.activeClientId) || null;
  }
  // Match by exact name (case-insensitive) if no active id
  if (!client && displayName && displayName !== "Unnamed client") {
    client = state.clients.find(
      (c) => (c.name || "").trim().toLowerCase() === displayName.trim().toLowerCase()
    ) || null;
  }

  const payload = {
    name: displayName === "Unnamed client" ? "Unnamed client" : displayName,
    heightCm: state.heightCm,
    styleId: state.styleId,
    styleLabel: style.label,
    kameezOverride: state.kameezOverride,
    fit: state.fit,
    sleeve: state.sleeve,
    neckline: state.neckline,
    kameezLenNote: state.kameezLenNote,
    measures: snapshotMeasures(state.measures),
    rawMeasures: state.rawMeasures ? snapshotMeasures(state.rawMeasures) : null,
    calibration: state.calibration ? { ...state.calibration } : null,
    confidence: state.confidence ? { ...state.confidence } : null,
    verifiedMeasures: state.verifiedMeasures ? { ...state.verifiedMeasures } : (client?.verifiedMeasures || null),
    verifiedAt: client?.verifiedAt || null,
    weightNote: client?.weightNote || "",
    measuresUpdatedAt: now,
    readySize: rec.mtm ? "MTM" : rec.size,
    readyClosest: rec.closest,
    readyBustIn: rec.bustIn,
    readyBustCm: state.measures.bust,
    sizeAdvice: rec.line,
    brief,
    updatedAt: now,
  };

  if (client) {
    Object.assign(client, payload);
    state.activeClientId = client.id;
    // Move to front
    state.clients = [client, ...state.clients.filter((c) => c.id !== client.id)];
  } else {
    if (state.clients.length >= MAX_CLIENTS) {
      // Drop oldest (last in list after sort by updatedAt desc we keep newest first)
      state.clients = state.clients
        .slice()
        .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
        .slice(0, MAX_CLIENTS - 1);
    }
    const id = "cli_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    client = { id, createdAt: now, ...payload };
    state.clients.unshift(client);
    state.activeClientId = id;
  }

  // Cap at MAX
  if (state.clients.length > MAX_CLIENTS) {
    state.clients = state.clients.slice(0, MAX_CLIENTS);
  }
  saveClients();
  renderClients();
  toast(`Saved “${payload.name}”`);
}

function deleteClient(id) {
  state.clients = state.clients.filter((c) => c.id !== id);
  if (state.activeClientId === id) state.activeClientId = null;
  saveClients();
  renderClients();
  toast("Client deleted");
}

function openProfileChooser(id) {
  const client = state.clients.find((c) => c.id === id);
  if (!client) {
    toast("Client not found");
    return;
  }
  state.pendingProfileId = id;
  const body = $("#profile-modal-body");
  const title = $("#profile-modal-title");
  if (title) title.textContent = client.name || "Client profile";
  const stale = isMeasuresStale(client);
  const age = measuresAgeMs(client);
  const ageDays = age != null ? Math.round(age / (24 * 60 * 60 * 1000)) : null;
  const hasMeasures = !!(client.measures || client.verifiedMeasures);
  const when = client.verifiedAt || client.measuresUpdatedAt || client.updatedAt;
  const whenStr = when
    ? new Date(when).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", year: "numeric", month: "short", day: "numeric" })
    : "—";
  const bits = [
    client.styleLabel || STYLES[client.styleId]?.label || "",
    client.heightCm != null ? fmtIn(client.heightCm) : "",
    client.readySize ? `Size ${client.readySize}` : "",
    client.fit ? FIT_LABELS[client.fit] || client.fit : "",
  ].filter(Boolean);
  if (body) {
    body.innerHTML = `
      <p class="screen-sub" style="margin:0 0 8px;">${escapeHtml(bits.join(" · "))}</p>
      <p class="hint">Last measures: <strong>${escapeHtml(whenStr)}</strong>${ageDays != null ? ` (${ageDays} days ago)` : ""}</p>
      ${stale ? `<div class="stale-flag">⚠️ Measures older than 6 months — re-measure recommended (body may have changed).</div>` : ""}
      ${client.weightNote ? `<p class="hint">Weight note: ${escapeHtml(client.weightNote)}</p>` : ""}
      ${hasMeasures ? `<p class="hint">Use saved measures to skip photos, or re-measure with new front/side shots.</p>` : `<p class="hint">No saved measures yet — re-measure to capture.</p>`}
    `;
  }
  const wn = $("#profile-weight-note");
  if (wn) wn.value = client.weightNote || "";
  const useBtn = $("#btn-use-saved");
  if (useBtn) useBtn.disabled = !hasMeasures;
  $("#profile-modal").hidden = false;
}

function closeProfileChooser() {
  $("#profile-modal").hidden = true;
  state.pendingProfileId = null;
}

function applyClientBasics(client) {
  state.activeClientId = client.id;
  state.name = client.name === "Unnamed client" ? "" : (client.name || "");
  state.heightCm = client.heightCm;
  state.styleId = STYLES[client.styleId] ? client.styleId : "punjabi";
  state.kameezOverride = client.kameezOverride || null;
  state.fit = client.fit || "regular";
  state.sleeve = client.sleeve || "full";
  state.neckline = client.neckline || "round";
  state.kameezLenNote = client.kameezLenNote || "";
  state.verifiedMeasures = client.verifiedMeasures ? { ...client.verifiedMeasures } : null;
  state.demo = false;
  state.frontFile = null;
  state.sideFile = null;
  clearFront();
  clearSide();
  if ($("#input-name")) $("#input-name").value = state.name;
  if ($("#input-height")) $("#input-height").value = client.heightCm != null ? cmToIn(client.heightCm) : "";
  if ($("#input-kameez-len")) {
    $("#input-kameez-len").value = client.kameezOverride != null ? cmToIn(client.kameezOverride) : "";
  }
  if ($("#fit-kameez-note")) $("#fit-kameez-note").value = state.kameezLenNote;
  applyStyleUI();
  applyFitUI();
  setBriefFields(client.brief || {});
}

function useSavedMeasures(id) {
  const client = state.clients.find((c) => c.id === id);
  if (!client) return;
  applyClientBasics(client);
  // Prefer tailor-verified values over raw AI draft
  const base = client.measures
    ? { ...client.measures, sources: { ...(client.measures.sources || {}) } }
    : null;
  if (base && client.verifiedMeasures) {
    for (const [k, v] of Object.entries(client.verifiedMeasures)) {
      base[k] = v;
      base.sources[k] = "tailor-verified";
    }
  }
  if (base) {
    for (const k of Object.keys(base.sources || {})) {
      if (base.sources[k] !== "tailor-verified") base.sources[k] = "saved-profile";
    }
  }
  state.measures = base;
  state.rawMeasures = client.rawMeasures
    ? { ...client.rawMeasures, sources: { ...(client.rawMeasures.sources || {}) } }
    : base
      ? { ...base, sources: { ...(base.sources || {}) } }
      : null;
  state.calibration = client.calibration ? { ...client.calibration } : null;
  state.confidence = client.confidence ? { ...client.confidence } : null;
  state.scaleWarnings = isMeasuresStale(client)
    ? ["Saved measures older than 6 months — consider re-measure."]
    : [];
  if (client.weightNote) {
    state.scaleWarnings.push("Weight/body note on file: " + client.weightNote);
  }
  const cf = $("#calib-field");
  const cv = $("#calib-tape");
  const cl = $("#calib-length");
  if (cf && state.calibration?.field) cf.value = state.calibration.field;
  if (cv) cv.value = state.calibration?.tapeCm != null ? cmToIn(state.calibration.tapeCm) : "";
  if (cl) cl.value = state.calibration?.lengthTapeCm != null ? cmToIn(state.calibration.lengthTapeCm) : "";
  closeProfileChooser();
  switchTab("measure");
  if (state.measures) {
    showResults();
    toast(`Using saved measures for ${client.name}`);
  } else {
    goStep(1);
    toast("No measures saved — please re-measure");
  }
}

function remeasureClient(id) {
  const client = state.clients.find((c) => c.id === id);
  if (!client) return;
  applyClientBasics(client);
  state.measures = null;
  state.rawMeasures = null;
  state.calibration = null;
  state.confidence = null;
  state.scaleWarnings = [];
  state.forceEstimate = false;
  closeProfileChooser();
  switchTab("measure");
  goStep(1);
  toast(`Re-measure ${client.name} — new photos`);
}

function loadClientIntoMeasure(id) {
  openProfileChooser(id);
}

function renderClients() {
  const list = $("#clients-list");
  const empty = $("#clients-empty");
  const count = $("#clients-count");
  if (!list) return;
  const clients = state.clients
    .slice()
    .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  if (count) count.textContent = String(clients.length);
  if (!clients.length) {
    list.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;
  list.innerHTML = clients
    .map((c) => {
      const when = c.updatedAt
        ? new Date(c.updatedAt).toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "—";
      const occ = c.brief?.occasion ? occasionLabel(c.brief.occasion) : "";
      const city = c.brief?.city || "";
      const stale = isMeasuresStale(c);
      const metaBits = [
        c.styleLabel || (STYLES[c.styleId]?.label || c.styleId || ""),
        c.heightCm != null ? fmtIn(c.heightCm) : "",
        c.readySize ? `Size ${c.readySize}` : "",
        c.fit ? (FIT_LABELS[c.fit] || c.fit) : "",
        occ,
        city,
      ].filter(Boolean);
      return `<div class="client-card ${stale ? "stale" : ""}" data-client-id="${escapeAttr(c.id)}">
        <div class="client-card-body">
          <strong>${escapeHtml(c.name || "Unnamed")}</strong>
          <div class="client-meta">${escapeHtml(metaBits.join(" · "))}</div>
          ${stale ? `<div class="stale-flag">⚠️ Measures &gt; 6 months — re-measure recommended</div>` : ""}
          ${c.weightNote ? `<div class="client-meta">Note: ${escapeHtml(c.weightNote)}</div>` : ""}
          <div class="client-when">Updated ${escapeHtml(when)} IST</div>
        </div>
        <div class="client-actions">
          <button type="button" class="btn btn-primary btn-sm" data-load-client="${escapeAttr(c.id)}">Open</button>
          <button type="button" class="btn btn-ghost btn-sm" data-del-client="${escapeAttr(c.id)}" title="Delete">Delete</button>
        </div>
      </div>`;
    })
    .join("");
}

async function processMeasurements(opts = {}) {
  const force = !!(opts.force || state.forceEstimate);
  setStatus("#process-status", '<span class="spinner"></span>Loading pose model…', "busy");
  $("#btn-process").disabled = true;

  await initPose();

  let frontLm = null;
  let sideLm = null;

  if (state.frontImg && state.poseLandmarker) {
    setStatus("#process-status", '<span class="spinner"></span>Reading front pose…', "busy");
    frontLm = detectPose(state.frontImg);
    state.frontLandmarks = frontLm;
  }
  if (state.sideImg && state.poseLandmarker) {
    setStatus("#process-status", '<span class="spinner"></span>Reading side pose…', "busy");
    sideLm = detectPose(state.sideImg);
    state.sideLandmarks = sideLm;
  }

  // Retake-photo detection — block hard issues unless forced
  const quality = assessPoseQuality(frontLm, sideLm);
  state.poseQuality = quality;
  renderRetakePanel(quality);

  if (quality.hard && !force) {
    setStatus("#process-status", "Fix photo issues above, or force estimate (weaker).", "warn");
    $("#btn-process").disabled = false;
    toast("Retake suggested — see tips above");
    return;
  }

  const override = state.kameezOverride;
  state.calibration = null;
  state.rawMeasures = null;
  state.scaleWarnings = [];
  state.forceEstimate = false;
  syncFitFromUI();

  if (frontLm) {
    let result = landmarkMeasures(
      frontLm,
      state.frontImg,
      sideLm,
      state.sideImg,
      state.heightCm,
      override
    );
    // Soft pose tips become warnings too
    for (const iss of quality.issues || []) {
      if (!iss.hard) result.warnings = [...(result.warnings || []), iss.tip];
    }
    if (force && quality.hard) {
      result.warnings = [...(result.warnings || []), "Forced estimate despite pose quality issues — expect larger error."];
    }
    result = applyLearnedBias(result);
    state.measures = result;
    state.mode = result.mode;
    state.scaleWarnings = result.warnings || [];
    state.rawMeasures = { ...result, sources: { ...result.sources } };
    state.confidence = computeConfidence(result, frontLm, sideLm, quality);
    if (result.warnings?.length) toast(result.warnings[0]);
  } else {
    let result = ratioMeasures(state.heightCm, override);
    result.mode = "ratio";
    result.warnings = quality.issues?.map((i) => i.tip) || [];
    result = applyLearnedBias(result);
    state.measures = result;
    state.mode = "ratio";
    state.rawMeasures = { ...result, sources: { ...result.sources } };
    state.confidence = computeConfidence(result, frontLm, sideLm, quality);
    if (state.frontImg && !frontLm) {
      toast("No pose found — using height ratios (weaker)");
    } else if (state.poseError && state.poseError !== "loading") {
      toast("Pose model unavailable — ratio draft");
    }
  }

  setStatus("#process-status", "");
  $("#btn-process").disabled = false;
  showResults();
}

// —— Inventory (localStorage) ——
function loadInventory() {
  try {
    state.inventory = JSON.parse(localStorage.getItem(INV_KEY) || "[]");
  } catch {
    state.inventory = [];
  }
}

function saveInventory() {
  try {
    localStorage.setItem(INV_KEY, JSON.stringify(state.inventory));
  } catch (e) {
    toast("Storage full — try smaller images");
    console.warn(e);
  }
}

function fileToDataUrl(file, maxSide = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      const scale = Math.min(1, maxSide / Math.max(w, h));
      w = Math.round(w * scale);
      h = Math.round(h * scale);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    img.src = url;
  });
}

function renderInventory() {
  const gal = $("#inv-gallery");
  const empty = $("#inv-empty");
  if (!gal) return;
  $("#inv-count").textContent = String(state.inventory.length);
  if (!state.inventory.length) {
    gal.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;
  const studio = isStudio();
  gal.innerHTML = state.inventory
    .map(
      (item) => `<div class="inv-card" data-id="${item.id}" data-pick-collection="${item.id}">
        ${studio ? `<button type="button" class="del" data-del="${item.id}" title="Remove">×</button>` : ""}
        <img src="${item.image}" alt="${escapeAttr(item.name)}" />
        <div class="meta">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.style)} · ${escapeHtml(item.colour)}${item.sku ? " · " + escapeHtml(item.sku) : ""}</span>
        </div>
      </div>`
    )
    .join("");
}

function renderOrders() {
  const list = $("#orders-list");
  const empty = $("#orders-empty");
  if (!list) return;
  const withBrief = (state.clients || []).filter((c) => {
    const b = c.brief || {};
    return b.fabric || b.occasion || b.city || b.deadline || b.notes;
  });
  if (!withBrief.length) {
    list.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;
  list.innerHTML = withBrief
    .map((c) => {
      const b = c.brief || {};
      const bits = [
        b.fabric && `Fabric: ${escapeHtml(b.fabric)}`,
        b.occasion && `Occasion: ${escapeHtml(occasionLabel(b.occasion))}`,
        b.city && `City: ${escapeHtml(b.city)}`,
        b.deadline && `Deadline: ${escapeHtml(formatDeadline(b.deadline))}`,
      ].filter(Boolean);
      return `<div class="client-card">
        <div class="name">${escapeHtml(c.name || "Client")}</div>
        <div class="meta">${bits.join(" · ") || "Brief saved"}</div>
        <div class="actions">
          <button type="button" class="btn btn-secondary" data-order-open="${c.id}">Open client</button>
        </div>
      </div>`;
    })
    .join("");
}

function renderInvPicker() {
  const picker = $("#inv-picker");
  const no = $("#tryon-no-inv");
  if (!state.inventory.length) {
    picker.innerHTML = "";
    no.hidden = false;
    updateTryonBtn();
    return;
  }
  no.hidden = true;
  picker.innerHTML = state.inventory
    .map(
      (item) => `<button type="button" class="inv-card ${state.selectedInvId === item.id ? "selected" : ""}" data-pick="${item.id}">
        <img src="${item.image}" alt="${escapeAttr(item.name)}" />
        <div class="meta">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.style)} · ${escapeHtml(item.colour)}</span>
        </div>
      </button>`
    )
    .join("");
  updateTryonBtn();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

// —— Try-on composite ——
function syncTryonFromMeasure() {
  if (state.frontImg && !state.tryonClientImg) {
    state.tryonClientImg = state.frontImg;
    state.tryonClientLandmarks = state.frontLandmarks;
    const prev = $("#tryon-client-preview");
    prev.src = state.frontImg.src;
    prev.hidden = false;
    $("#tryon-ph").hidden = true;
    $("#tryon-client-zone").classList.add("has-img");
    $("#tryon-reuse-hint").hidden = false;
    updateTryonBtn();
  }
}

function updateTryonBtn() {
  $("#btn-tryon-run").disabled = !(state.tryonClientImg && state.selectedInvId);
}

/**
 * Pose-aligned overlay:
 * - Detect pose on client photo
 * - Scale garment so its width ≈ shoulderWidth * 2.35 (covers torso + sleeve ease)
 * - Position top at shoulderY - 0.08*garmentH, horizontally centered on shoulder mid
 * - Draw with soft alpha; watermark already in DOM
 */
async function runTryOn() {
  const item = state.inventory.find((i) => i.id === state.selectedInvId);
  if (!item || !state.tryonClientImg) return;

  setStatus("#tryon-status", '<span class="spinner"></span>Preparing try-on…', "busy");
  $("#btn-tryon-run").disabled = true;

  await initPose();

  let lm = state.tryonClientLandmarks;
  if (!lm && state.poseLandmarker) {
    lm = detectPose(state.tryonClientImg);
    state.tryonClientLandmarks = lm;
  }

  const client = state.tryonClientImg;
  const cw = client.naturalWidth || client.width;
  const ch = client.naturalHeight || client.height;

  const garment = await loadImageFromDataUrl(item.image);

  const canvas = $("#tryon-canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(client, 0, 0, cw, ch);

  let gx, gy, gw, gh;
  if (lm) {
    const ls = lm[LM.L_SHOULDER];
    const rs = lm[LM.R_SHOULDER];
    const lh = lm[LM.L_HIP];
    const rh = lm[LM.R_HIP];
    const shoulderMidX = ((ls.x + rs.x) / 2) * cw;
    const shoulderY = ((ls.y + rs.y) / 2) * ch;
    const hipY = ((lh.y + rh.y) / 2) * ch;
    const shoulderW = Math.abs(ls.x - rs.x) * cw;
    // Garment width: ~2.4× shoulder (anarkali flare)
    gw = shoulderW * 2.45;
    const torsoH = Math.abs(hipY - shoulderY);
    // Length: shoulder to below hip — anarkali/sharara longer
    const style = (item.style || "").toLowerCase();
    let lengthFactor = 2.8;
    if (style.includes("anarkali") || style.includes("farshi")) lengthFactor = 3.6;
    if (style.includes("sharara")) lengthFactor = 3.4;
    gh = Math.max(torsoH * lengthFactor, gw * 1.35);
    // Preserve garment aspect if taller
    const aspect = garment.naturalHeight / garment.naturalWidth;
    if (gh / gw < aspect * 0.85) gh = gw * aspect;
    gx = shoulderMidX - gw / 2;
    gy = shoulderY - gh * 0.08;
  } else {
    // Center overlay fallback
    gw = cw * 0.55;
    const aspect = garment.naturalHeight / garment.naturalWidth;
    gh = gw * aspect;
    gx = (cw - gw) / 2;
    gy = ch * 0.18;
    toast("No pose — centered overlay (weaker)");
  }

  // Soften garment: draw with opacity; attempt simple white-ish keying
  const gCanvas = document.createElement("canvas");
  gCanvas.width = Math.max(1, Math.round(gw));
  gCanvas.height = Math.max(1, Math.round(gh));
  const gctx = gCanvas.getContext("2d");
  gctx.drawImage(garment, 0, 0, gCanvas.width, gCanvas.height);
  chromaKeySoftWhite(gctx, gCanvas.width, gCanvas.height);

  ctx.save();
  ctx.globalAlpha = 0.88;
  ctx.drawImage(gCanvas, gx, gy, gw, gh);
  ctx.restore();

  // Corner brand stamp
  ctx.fillStyle = "rgba(17,17,17,0.55)";
  ctx.fillRect(0, 0, cw, Math.max(28, ch * 0.04));
  ctx.fillStyle = "#fff";
  ctx.font = `600 ${Math.max(12, Math.round(ch * 0.018))}px system-ui,sans-serif`;
  ctx.fillText("Gulmohar Wear · DRAFT try-on", 12, Math.max(18, ch * 0.028));

  state.lastTryonDataUrl = canvas.toDataURL("image/png");
  $("#tryon-result-wrap").hidden = false;
  setStatus("#tryon-status", "Draft preview ready — drape & fit not exact.", "");
  $("#btn-tryon-run").disabled = false;
  updateTryonBtn();
}

function chromaKeySoftWhite(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    // Near-white / light gray → transparent
    if (max > 230 && min > 210) {
      d[i + 3] = 0;
    } else if (max > 200 && min > 180) {
      d[i + 3] = Math.round(d[i + 3] * 0.35);
    }
  }
  ctx.putImageData(img, 0, 0);
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function buildTryonShareNote() {
  const item = state.inventory.find((i) => i.id === state.selectedInvId);
  const date = new Date().toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const style = getStyle();
  return [
    "Gulmohar Wear — Virtual Try-on DRAFT",
    `Client: ${state.name || "—"}`,
    state.styleId ? `Client style pick: ${style.label}` : null,
    item ? `Suit: ${item.name} (${item.style}, ${item.colour})` : "Suit: —",
    item?.sku ? `SKU: ${item.sku}` : null,
    `Date: ${date}`,
    "",
    "⚠️ DRAFT preview — fabric drape & fit not exact.",
    "Pose-aligned overlay for colour/silhouette vibe only.",
    state.measures
      ? "Measurement draft also available — tailor must verify before cutting."
      : null,
    "Attach try-on PNG manually if it is not in this chat.",
    `WhatsApp: ${WA_NUMBER}`,
    "Wear the bloom.",
  ]
    .filter(Boolean)
    .join("\n");
}

// —— Photo handlers ——
async function onFrontFile(file) {
  if (!file) return;
  state.frontFile = file;
  state.frontImg = await loadImageFromFile(file);
  state.frontLandmarks = null;
  state.poseQuality = null;
  state.forceEstimate = false;
  renderRetakePanel(null);
  const prev = $("#preview-front");
  prev.src = state.frontImg.src;
  prev.hidden = false;
  $("#ph-front").hidden = true;
  $("#zone-front").classList.add("has-img");
  $("#btn-clear-front").disabled = false;
  $("#btn-to-side").disabled = false;
}

async function onSideFile(file) {
  if (!file) return;
  state.sideFile = file;
  state.sideImg = await loadImageFromFile(file);
  state.sideLandmarks = null;
  state.poseQuality = null;
  state.forceEstimate = false;
  renderRetakePanel(null);
  const prev = $("#preview-side");
  prev.src = state.sideImg.src;
  prev.hidden = false;
  $("#ph-side").hidden = true;
  $("#zone-side").classList.add("has-img");
  $("#btn-clear-side").disabled = false;
  $("#btn-process").disabled = !state.heightCm;
}

function clearFront() {
  state.frontFile = state.frontImg = state.frontLandmarks = null;
  $("#preview-front").hidden = true;
  $("#preview-front").removeAttribute("src");
  $("#ph-front").hidden = false;
  $("#zone-front").classList.remove("has-img");
  $("#btn-clear-front").disabled = true;
  $("#btn-to-side").disabled = true;
  $("#file-front").value = "";
}

function clearSide() {
  state.sideFile = state.sideImg = state.sideLandmarks = null;
  $("#preview-side").hidden = true;
  $("#preview-side").removeAttribute("src");
  $("#ph-side").hidden = false;
  $("#zone-side").classList.remove("has-img");
  $("#btn-clear-side").disabled = true;
  $("#btn-process").disabled = true;
  $("#file-side").value = "";
}

function syncFitFromUI() {
  const fitBtn = $("#fit-grid .style-chip.active");
  const sleeveBtn = $("#sleeve-grid .style-chip.active");
  const neckBtn = $("#neckline-grid .style-chip.active");
  if (fitBtn?.dataset.fit) state.fit = fitBtn.dataset.fit;
  if (sleeveBtn?.dataset.sleeve) state.sleeve = sleeveBtn.dataset.sleeve;
  if (neckBtn?.dataset.neckline) state.neckline = neckBtn.dataset.neckline;
  const note = $("#fit-kameez-note");
  if (note) state.kameezLenNote = (note.value || "").trim();
}

function applyFitUI() {
  $$("#fit-grid .style-chip").forEach((btn) => {
    const on = btn.dataset.fit === state.fit;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
  $$("#sleeve-grid .style-chip").forEach((btn) => {
    const on = btn.dataset.sleeve === state.sleeve;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
  $$("#neckline-grid .style-chip").forEach((btn) => {
    const on = btn.dataset.neckline === state.neckline;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
  if ($("#fit-kameez-note") && state.kameezLenNote != null) {
    $("#fit-kameez-note").value = state.kameezLenNote;
  }
}

function applyOrderSizeUI() {
  $$("#order-size-grid .style-chip").forEach((btn) => {
    const on = btn.dataset.orderSize === state.orderSize;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
  const hint = $("#order-tryon-size-hint");
  if (hint) {
    if (state.orderSize === "MTM") {
      hint.textContent = "MTM uses the measurement draft + fit preference when available.";
    } else {
      hint.textContent = `Ready size ${state.orderSize} — still confirm tape before cut.`;
    }
  }
}

function buildTryonOrderMessage() {
  const item = state.inventory.find((i) => i.id === state.selectedInvId);
  const rec = state.measures ? recommendSize(state.measures, state.fit) : null;
  const date = new Date().toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const m = state.measures;
  const sizeChoice = state.orderSize || "MTM";
  const lines = [
    "Gulmohar Wear — TRY-ON ORDER",
    `Client: ${state.name || "—"}`,
    item ? `Piece: ${item.name}` : "Piece: —",
    item ? `Style/colour: ${item.style} · ${item.colour}` : null,
    item?.sku ? `SKU: ${item.sku}` : null,
    `Order: ${sizeChoice === "MTM" ? "Made-to-measure (MTM)" : "Ready size " + sizeChoice}`,
    rec ? `AI size advice: ${rec.line}` : null,
    `Fit: ${FIT_LABELS[state.fit] || state.fit} · Sleeve: ${SLEEVE_LABELS[state.sleeve] || state.sleeve} · Neckline: ${NECKLINE_LABELS[state.neckline] || state.neckline}`,
    state.kameezLenNote ? `Kameez length note: ${state.kameezLenNote}` : null,
    state.heightCm ? `Height: ${fmtIn(state.heightCm)}` : null,
    `Date: ${date}`,
    "",
  ];
  if (m) {
    lines.push("Measures summary (DRAFT)");
    lines.push(`Bust ${fmtIn(m.bust)} · Waist ${fmtIn(m.waist)} · Hip ${fmtIn(m.hip)} · Shoulder ${fmtIn(m.shoulder)} · Kameez ${fmtIn(m.kameez)}`);
    if (state.calibration) {
      lines.push(`Calibrated to tape (${state.calibration.field} ${fmtIn(state.calibration.tapeCm)})`);
    }
  } else {
    lines.push("No measurement draft attached — please confirm size / schedule measure.");
  }
  const brief = readBriefFields();
  if (brief.fabric || brief.occasion || brief.city || brief.deadline || brief.notes) {
    lines.push("");
    lines.push("Order brief");
    if (brief.fabric) lines.push(`Fabric: ${brief.fabric}`);
    if (brief.occasion) lines.push(`Occasion: ${occasionLabel(brief.occasion)}`);
    if (brief.city) lines.push(`City: ${brief.city}`);
    if (brief.deadline) lines.push(`Deadline: ${formatDeadline(brief.deadline)}`);
    if (brief.notes) lines.push(`Notes: ${brief.notes}`);
  }
  lines.push("");
  lines.push("⚠️ DRAFT — tailor to verify before cutting. Attach try-on PNG if not included.");
  lines.push(`WhatsApp: ${WA_NUMBER}`);
  lines.push("Wear the bloom.");
  return lines.filter((x) => x != null).join("\n");
}

function applyStyleUI() {
  const style = getStyle();
  $$("#style-grid .style-chip").forEach((btn) => {
    const on = btn.dataset.style === state.styleId;
    btn.classList.toggle("active", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
  const hint = $("#style-hint");
  if (hint) hint.textContent = style.kameezHint;
  const kh = $("#kameez-len-hint");
  if (kh) kh.textContent = style.kameezLenHint;
  const inp = $("#input-kameez-len");
  if (inp) inp.placeholder = style.kameezPlaceholder || "Leave blank for style default";
}

function restart() {
  state.name = "";
  state.styleId = "punjabi";
  state.heightCm = null;
  state.kameezOverride = null;
  state.measures = null;
  state.rawMeasures = null;
  state.calibration = null;
  state.confidence = null;
  state.poseQuality = null;
  state.verifiedMeasures = null;
  state.scaleWarnings = [];
  state.demo = false;
  state.activeClientId = null;
  state.fit = "regular";
  state.sleeve = "full";
  state.neckline = "round";
  state.kameezLenNote = "";
  state.orderSize = "MTM";
  state.forceEstimate = false;
  clearFront();
  clearSide();
  renderRetakePanel(null);
  $("#input-name").value = "";
  $("#input-height").value = "";
  $("#input-kameez-len").value = "";
  const cf = $("#calib-field");
  const cv = $("#calib-tape");
  const cl = $("#calib-length");
  if (cf) cf.value = "bust";
  if (cv) cv.value = "";
  if (cl) cl.value = "";
  setBriefFields({});
  const bp = $("#brief-preview");
  if (bp) bp.innerHTML = "";
  applyStyleUI();
  applyFitUI();
  applyOrderSizeUI();
  if (isStudio()) {
    goStep(1);
    switchTab("measure");
  } else {
    goStep(1);
    switchTab("home");
  }
}

// —— Wire events ——
function init() {
  loadInventory();
  loadClients();
  loadTailorLearn();
  applyFitUI();
  applyOrderSizeUI();

  // Restore mode
  let savedMode = "customer";
  try { savedMode = localStorage.getItem(MODE_KEY) || "customer"; } catch {}
  setAppMode(savedMode === "studio" ? "studio" : "customer");
  goStep(1);
  if (isStudio()) switchTab("measure");
  else switchTab("home");

  $$(".nav-tab").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  function startFit(demo) {
    state.demo = !!demo;
    switchTab("measure");
    goStep(1);
  }

  $("#btn-start")?.addEventListener("click", () => startFit(false));
  $("#btn-start-inner")?.addEventListener("click", () => startFit(false));
  $("#btn-demo")?.addEventListener("click", () => startFit(true));

  document.querySelectorAll("[data-goto-home]").forEach((btn) => {
    btn.addEventListener("click", () => switchTab("home"));
  });

  // Settings / Studio gate
  const openSettings = () => {
    const m = $("#settings-modal");
    if (!m) return;
    setAppMode(isStudio() ? "studio" : "customer");
    const pinRow = $("#studio-pin-row");
    const pinHint = $("#studio-pin-hint");
    if (pinRow) pinRow.hidden = true;
    if (pinHint) pinHint.hidden = true;
    m.hidden = false;
  };
  const closeSettings = () => {
    const m = $("#settings-modal");
    if (m) m.hidden = true;
  };
  $("#btn-settings")?.addEventListener("click", openSettings);
  $("#btn-foot-studio")?.addEventListener("click", openSettings);
  $("#btn-settings-close")?.addEventListener("click", closeSettings);
  $("#btn-enter-studio")?.addEventListener("click", () => {
    const pinRow = $("#studio-pin-row");
    const pinHint = $("#studio-pin-hint");
    if (pinRow) pinRow.hidden = false;
    if (pinHint) pinHint.hidden = false;
    $("#studio-pin")?.focus();
  });
  $("#btn-studio-pin-ok")?.addEventListener("click", () => {
    const v = ($("#studio-pin")?.value || "").trim().toLowerCase();
    if (v !== STUDIO_PIN) {
      toast("Incorrect PIN");
      return;
    }
    setAppMode("studio");
    $("#settings-modal").hidden = true;
    if ($("#studio-pin")) $("#studio-pin").value = "";
    switchTab("clients");
    toast("Gulmohar Studio");
  });
  $("#btn-exit-studio")?.addEventListener("click", () => {
    setAppMode("customer");
    $("#settings-modal").hidden = true;
    switchTab("home");
    toast("Customer Mode");
  });

  $("#btn-collection-tryon")?.addEventListener("click", () => {
    switchTab("tryon");
  });

  $("#orders-list")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-order-open]");
    if (!btn) return;
    const id = btn.dataset.orderOpen;
    const client = (state.clients || []).find((c) => c.id === id);
    if (!client) return;
    switchTab("clients");
    openProfileChooser(id);
  });

  // Style pick chips
  $("#style-grid")?.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-style]");
    if (!chip) return;
    state.styleId = chip.dataset.style;
    applyStyleUI();
  });
  applyStyleUI();

  $$("[data-back]").forEach((b) => {
    b.addEventListener("click", () => goStep(Number(b.dataset.back)));
  });

  $("#btn-to-front").addEventListener("click", () => {
    const hIn = parseFloat($("#input-height").value);
    // User enters inches; engine stores cm
    if (!hIn || hIn < 47 || hIn > 87) {
      toast("Enter a valid height (47–87 in · typical adult 55–73)");
      return;
    }
    state.heightCm = inToCm(hIn);
    state.name = ($("#input-name").value || "").trim();
    const kIn = parseFloat($("#input-kameez-len").value);
    state.kameezOverride = kIn && kIn > 0 ? inToCm(kIn) : null;

    if (state.demo) {
      let result = ratioMeasures(state.heightCm, state.kameezOverride);
      result.mode = "ratio";
      result.warnings = [];
      result = applyLearnedBias(result);
      state.calibration = null;
      state.measures = result;
      state.rawMeasures = { ...result, sources: { ...result.sources } };
      state.confidence = computeConfidence(result, null, null, null);
      showResults();
      return;
    }
    goStep(2);
  });

  
  // Click / tap photo zones to open file picker (desktop-friendly)
  $("#zone-front").addEventListener("click", () => $("#file-front").click());
  $("#zone-side").addEventListener("click", () => $("#file-side").click());

  
  // --- Live camera (getUserMedia) ---
  let camStream = null;
  let camFacing = "user"; // front
  let camTarget = null; // "front" | "side" | "tryon"

  async function stopCamera() {
    if (camStream) {
      camStream.getTracks().forEach((t) => t.stop());
      camStream = null;
    }
    const v = $("#camera-video");
    if (v) v.srcObject = null;
  }

  async function startCameraStream() {
    const status = $("#camera-status");
    status.textContent = "Starting camera…";
    await stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      status.textContent = "Camera API not available in this browser. Use Upload instead.";
      return false;
    }
    try {
      camStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: camFacing },
          width: { ideal: 1280 },
          height: { ideal: 1920 },
        },
      });
      const v = $("#camera-video");
      v.srcObject = camStream;
      v.classList.toggle("facing-env", camFacing === "environment");
      status.textContent = camFacing === "user" ? "Front camera" : "Back camera";
      return true;
    } catch (err) {
      console.error(err);
      status.textContent =
        "Camera blocked or unavailable (" + (err.name || "error") + "). Allow camera permission, or use Upload.";
      return false;
    }
  }

  async function openCameraModal(target) {
    camTarget = target;
    $("#camera-title").textContent =
      target === "side" ? "Side photo" : target === "tryon" ? "Try-on photo" : "Front photo";
    $("#camera-modal").hidden = false;
    camFacing = "user";
    await startCameraStream();
  }

  async function closeCameraModal() {
    $("#camera-modal").hidden = true;
    await stopCamera();
    camTarget = null;
  }

  $("#btn-cam-close")?.addEventListener("click", () => closeCameraModal());
  $("#btn-cam-flip")?.addEventListener("click", async () => {
    camFacing = camFacing === "user" ? "environment" : "user";
    await startCameraStream();
  });
  $("#btn-cam-shot")?.addEventListener("click", async () => {
    const v = $("#camera-video");
    const c = $("#camera-canvas");
    if (!v.videoWidth) {
      $("#camera-status").textContent = "Camera not ready yet — wait a second.";
      return;
    }
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext("2d");
    // Mirror front camera so preview matches selfie
    if (camFacing === "user") {
      ctx.translate(c.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0);
    const blob = await new Promise((res) => c.toBlob(res, "image/jpeg", 0.92));
    if (!blob) {
      $("#camera-status").textContent = "Could not capture frame.";
      return;
    }
    const file = new File([blob], camTarget + "-capture.jpg", { type: "image/jpeg" });
    const target = camTarget;
    await closeCameraModal();
    if (target === "front") await onFrontFile(file);
    else if (target === "side") await onSideFile(file);
    else if (target === "tryon") {
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = $("#tryon-file");
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });

  $("#btn-cam-front")?.addEventListener("click", () => openCameraModal("front"));
  $("#btn-cam-side")?.addEventListener("click", () => openCameraModal("side"));
  $("#btn-cam-tryon")?.addEventListener("click", () => openCameraModal("tryon"));


  $("#file-front").addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (f) await onFrontFile(f);
  });
  $("#file-side").addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (f) await onSideFile(f);
  });
  $("#btn-clear-front").addEventListener("click", clearFront);
  $("#btn-clear-side").addEventListener("click", clearSide);
  $("#btn-to-side").addEventListener("click", () => goStep(3));
  $("#btn-process").addEventListener("click", () => processMeasurements());

  $("#btn-calib-apply")?.addEventListener("click", () => {
    if (!state.measures) {
      toast("Estimate first");
      return;
    }
    const field = $("#calib-field")?.value || "bust";
    // User enters inches; engine calibrates in cm
    const tapeIn = parseFloat($("#calib-tape")?.value);
    const lenIn = parseFloat($("#calib-length")?.value);
    const tape = tapeIn && tapeIn > 0 ? inToCm(tapeIn) : null;
    const lengthTape = lenIn && lenIn > 0 ? inToCm(lenIn) : null;
    if (applyTapeCalibration(field, tape, lengthTape)) {
      showResults();
      toast("Calibrated to your tape");
    }
  });
  $("#btn-calib-clear")?.addEventListener("click", () => {
    clearTapeCalibration();
    const cv = $("#calib-tape");
    const cl = $("#calib-length");
    if (cv) cv.value = "";
    if (cl) cl.value = "";
    showResults();
    toast("Calibration cleared");
  });

  $("#btn-copy").addEventListener("click", async () => {
    const text = buildWhatsAppCard();
    try {
      await navigator.clipboard.writeText(text);
      toast("WhatsApp card copied");
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      toast("WhatsApp card copied");
    }
  });

  $("#btn-wa-send")?.addEventListener("click", () => {
    if (!state.measures) {
      toast("No measurement draft yet");
      return;
    }
    sendWhatsApp(buildWhatsAppCard());
  });

  $("#btn-print").addEventListener("click", () => window.print());
  $("#btn-restart").addEventListener("click", restart);
  $("#btn-goto-tryon").addEventListener("click", () => {
    switchTab("tryon");
  });

  // Inventory form
  $("#inv-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = $("#inv-file").files?.[0];
    const name = $("#inv-name").value.trim();
    const style = $("#inv-style").value;
    const colour = $("#inv-colour").value.trim();
    const sku = $("#inv-sku").value.trim();
    if (!file || !name || !colour) {
      toast("Image, name, and colour required");
      return;
    }
    try {
      const image = await fileToDataUrl(file);
      state.inventory.unshift({
        id: "inv_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name,
        style,
        colour,
        sku,
        image,
        addedAt: new Date().toISOString(),
      });
      saveInventory();
      $("#inv-form").reset();
      renderInventory();
      toast("Added to inventory");
    } catch {
      toast("Could not add image");
    }
  });

  $("#inv-gallery").addEventListener("click", (e) => {
    const del = e.target.closest("[data-del]");
    if (del) {
      const id = del.dataset.del;
      state.inventory = state.inventory.filter((i) => i.id !== id);
      if (state.selectedInvId === id) state.selectedInvId = null;
      saveInventory();
      renderInventory();
      toast("Removed");
      return;
    }
    const pick = e.target.closest("[data-pick-collection]");
    if (pick && !isStudio()) {
      state.selectedInvId = pick.dataset.pickCollection;
      switchTab("tryon");
      renderInvPicker();
      toast("Suit selected — generate try-on");
    }
  });

  $("#inv-picker").addEventListener("click", (e) => {
    const card = e.target.closest("[data-pick]");
    if (!card) return;
    state.selectedInvId = card.dataset.pick;
    renderInvPicker();
  });

  $("#tryon-file").addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    state.tryonClientImg = await loadImageFromFile(f);
    state.tryonClientLandmarks = null;
    const prev = $("#tryon-client-preview");
    prev.src = state.tryonClientImg.src;
    prev.hidden = false;
    $("#tryon-ph").hidden = true;
    $("#tryon-client-zone").classList.add("has-img");
    $("#tryon-reuse-hint").hidden = true;
    updateTryonBtn();
  });

  $("#btn-tryon-run").addEventListener("click", () => runTryOn());

  $("#btn-tryon-download").addEventListener("click", () => {
    if (!state.lastTryonDataUrl) return;
    const a = document.createElement("a");
    a.href = state.lastTryonDataUrl;
    a.download = `gulmohar-tryon-draft-${Date.now()}.png`;
    a.click();
  });

  $("#btn-tryon-copy-note").addEventListener("click", async () => {
    const text = buildTryonShareNote();
    try {
      await navigator.clipboard.writeText(text);
      toast("Share note copied");
    } catch {
      toast("Copy failed — select text manually");
    }
  });

  $("#btn-tryon-wa")?.addEventListener("click", async () => {
    const text = buildTryonShareNote();
    // Prefer share API with PNG; wa.me text fallback + manual attach note
    await sendWhatsApp(text, state.lastTryonDataUrl || null);
  });

  // Order brief fields → live preview
  ["brief-fabric", "brief-occasion", "brief-city", "brief-deadline", "brief-notes"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => refreshBriefPreview());
    el.addEventListener("change", () => refreshBriefPreview());
  });

  $("#btn-brief-wa")?.addEventListener("click", () => {
    if (!state.measures) {
      toast("No measurement draft yet");
      return;
    }
    sendWhatsApp(buildOrderBrief());
  });

  $("#btn-brief-copy")?.addEventListener("click", async () => {
    if (!state.measures) {
      toast("No measurement draft yet");
      return;
    }
    const text = buildOrderBrief();
    try {
      await navigator.clipboard.writeText(text);
      toast("Order brief copied");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      toast("Order brief copied");
    }
  });

  $("#btn-brief-print")?.addEventListener("click", () => {
    if (!state.measures) {
      toast("No measurement draft yet");
      return;
    }
    printOrderBrief();
  });

  $("#btn-save-client")?.addEventListener("click", () => saveCurrentClient());

  $("#btn-clients-refresh")?.addEventListener("click", () => {
    loadClients();
    renderClients();
    toast("Clients refreshed");
  });

  $("#clients-list")?.addEventListener("click", (e) => {
    const loadBtn = e.target.closest("[data-load-client]");
    if (loadBtn) {
      loadClientIntoMeasure(loadBtn.dataset.loadClient);
      return;
    }
    const delBtn = e.target.closest("[data-del-client]");
    if (delBtn) {
      const id = delBtn.dataset.delClient;
      const c = state.clients.find((x) => x.id === id);
      const label = c?.name || "this client";
      if (confirm(`Delete saved client “${label}”?`)) deleteClient(id);
    }
  });

  // Profile chooser modal
  $("#btn-profile-close")?.addEventListener("click", () => closeProfileChooser());
  $("#btn-use-saved")?.addEventListener("click", () => {
    if (state.pendingProfileId) useSavedMeasures(state.pendingProfileId);
  });
  $("#btn-remeasure")?.addEventListener("click", () => {
    if (state.pendingProfileId) remeasureClient(state.pendingProfileId);
  });
  $("#btn-save-weight-note")?.addEventListener("click", () => {
    const id = state.pendingProfileId || state.activeClientId;
    if (!id) {
      toast("No client selected");
      return;
    }
    const client = state.clients.find((c) => c.id === id);
    if (!client) return;
    client.weightNote = ($("#profile-weight-note")?.value || "").trim();
    client.updatedAt = new Date().toISOString();
    saveClients();
    renderClients();
    const bodyRefresh = state.pendingProfileId;
    if (bodyRefresh) openProfileChooser(id);
    toast("Weight note saved");
  });

  // Fit preference chips
  $("#fit-grid")?.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-fit]");
    if (!chip) return;
    state.fit = chip.dataset.fit;
    applyFitUI();
    if (state.measures) showResults();
  });
  $("#sleeve-grid")?.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-sleeve]");
    if (!chip) return;
    state.sleeve = chip.dataset.sleeve;
    applyFitUI();
    if (typeof refreshBriefPreview === "function") refreshBriefPreview();
  });
  $("#neckline-grid")?.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-neckline]");
    if (!chip) return;
    state.neckline = chip.dataset.neckline;
    applyFitUI();
    if (typeof refreshBriefPreview === "function") refreshBriefPreview();
  });
  $("#fit-kameez-note")?.addEventListener("input", () => {
    state.kameezLenNote = ($("#fit-kameez-note").value || "").trim();
  });

  // Retake / force estimate
  $("#btn-retake-front")?.addEventListener("click", () => goStep(2));
  $("#btn-retake-side")?.addEventListener("click", () => goStep(3));
  $("#btn-force-estimate")?.addEventListener("click", () => {
    state.forceEstimate = true;
    processMeasurements({ force: true });
  });

  // Tailor tab
  $("#btn-tailor-save")?.addEventListener("click", () => saveTailorCorrections());
  $("#btn-tailor-load-current")?.addEventListener("click", () => {
    if (!state.measures && !state.rawMeasures) {
      toast("No current draft — run Measure or open a client first");
      return;
    }
    renderTailorVerify();
    toast("Loaded current draft into tailor form");
  });
  $("#bias-apply-global")?.addEventListener("change", (e) => {
    state.tailorLearn.applyGlobal = !!e.target.checked;
    saveTailorLearn();
  });
  $("#bias-apply-client")?.addEventListener("change", (e) => {
    state.tailorLearn.applyClient = !!e.target.checked;
    saveTailorLearn();
  });
  $("#tailor-client-select")?.addEventListener("change", () => {
    const id = $("#tailor-client-select").value;
    if (id) {
      state.activeClientId = id;
      const c = state.clients.find((x) => x.id === id);
      if (c?.verifiedMeasures) state.verifiedMeasures = { ...c.verifiedMeasures };
      if (c?.measures && !state.measures) {
        state.measures = { ...c.measures, sources: { ...(c.measures.sources || {}) } };
      }
    }
    renderTailorVerify();
    renderBiasSummary();
  });

  // Try-on order
  $("#order-size-grid")?.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-order-size]");
    if (!chip) return;
    state.orderSize = chip.dataset.orderSize;
    applyOrderSizeUI();
  });
  $("#btn-tryon-order")?.addEventListener("click", async () => {
    if (!state.selectedInvId) {
      toast("Pick a suit first");
      return;
    }
    const text = buildTryonOrderMessage();
    await sendWhatsApp(text, state.lastTryonDataUrl || null);
  });

  // Warm-load MediaPipe in background (non-blocking)
  initPose().then(() => {
    if (state.poseReady) console.info("MediaPipe Pose ready");
  });
}

init();
