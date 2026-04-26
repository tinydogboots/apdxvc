// ── Styler — live texture controls + persistence ──────────────────────────────

const STYLER_LS_KEY = "network_styler_v1";

const SLIDERS = [
  { section: "Paper",   key: "grainOpacity",      label: "grain",    min: 0,    max: 0.4,  step: 0.01,  digits: 2 },
  { section: "Paper",   key: "latticeOpacity",    label: "dots",     min: 0,    max: 0.2,  step: 0.005, digits: 3 },
  { section: "Paper",   key: "patchiness",        label: "patches",  min: 0,    max: 1,    step: 0.05,  digits: 2 },
  { section: "Nodes",   key: "nodeWobbleWidth",   label: "width",    min: 0,    max: 1.5,  step: 0.05,  digits: 2 },
  { section: "Nodes",   key: "nodeWobbleOpacity", label: "opacity",  min: 0,    max: 0.8,  step: 0.02,  digits: 2 },
  { section: "Links",   key: "linkWobbleWidth",   label: "width",    min: 0,    max: 1.5,  step: 0.05,  digits: 2 },
  { section: "Links",   key: "linkWobbleOpacity", label: "opacity",  min: 0,    max: 0.8,  step: 0.02,  digits: 2 },
  { section: "Pyramid", key: "pyramidStipple",    label: "stipple",  min: 0.3,  max: 3,    step: 0.1,   digits: 1 },
];

// ── Persistence ──────────────────────────────────────────────────────────────
function loadSavedParams() {
  try {
    const saved = JSON.parse(localStorage.getItem(STYLER_LS_KEY) || "{}");
    Object.assign(stylerParams, saved);
  } catch {}
}
function saveParams() {
  try { localStorage.setItem(STYLER_LS_KEY, JSON.stringify(stylerParams)); } catch {}
}

// ── Apply functions ──────────────────────────────────────────────────────────
function applyPaperTexture() {
  const g = stylerParams.grainOpacity;

  // Fine grain masked by low-freq cloud turbulence → grain clusters where cloud is bright
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500'>` +
    `<filter id='n'>` +
    `<feTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='4' seed='7' stitchTiles='stitch' result='grain'/>` +
    `<feTurbulence type='fractalNoise' baseFrequency='0.007 0.005' numOctaves='2' seed='42' stitchTiles='stitch' result='cloud'/>` +
    `<feComposite in='grain' in2='cloud' operator='arithmetic' k1='2' k2='0' k3='-0.5' k4='0.1' result='masked'/>` +
    `<feColorMatrix in='masked' values='0 0 0 0 0.10  0 0 0 0 0.094  0 0 0 0 0.078  0 0 0 ${g} 0'/></filter>` +
    `<rect width='100%25' height='100%25' filter='url(%23n)'/></svg>`;

  document.body.style.backgroundImage = `url("data:image/svg+xml;utf8,${svg}")`;
  document.body.style.backgroundSize = "500px 500px";

  if (typeof drawBgCanvas === "function") drawBgCanvas();
}

function applyAll() {
  applyPaperTexture();
  if (typeof applyInkVariance === "function") applyInkVariance();
  if (typeof drawPyramidBg === "function")    drawPyramidBg();
}

// ── Panel UI ─────────────────────────────────────────────────────────────────
function buildStylerPanel() {
  const panel = document.getElementById("styler-panel");
  let lastSection = null;
  let html = `
    <div class="styler-header">
      <span>[ STYLER ]</span>
    </div>
  `;

  SLIDERS.forEach(s => {
    if (s.section !== lastSection) {
      if (lastSection) html += `</div>`;
      html += `<div class="styler-section"><div class="styler-section-label">${s.section}</div>`;
      lastSection = s.section;
    }
    const v = stylerParams[s.key];
    html += `
      <div class="styler-row">
        <label>${s.label}</label>
        <input type="range" data-key="${s.key}" min="${s.min}" max="${s.max}" step="${s.step}" value="${v}">
        <span class="value" data-value-for="${s.key}">${v.toFixed(s.digits)}</span>
      </div>
    `;
  });
  if (lastSection) html += `</div>`;

  html += `
    <div class="styler-actions">
      <button class="styler-btn" id="styler-reset">Reset</button>
      <button class="styler-btn" id="styler-copy">Copy</button>
    </div>
  `;

  panel.innerHTML = html;

  // Wire sliders
  panel.querySelectorAll("input[type=range]").forEach(input => {
    input.addEventListener("input", e => {
      const key = e.target.dataset.key;
      const slider = SLIDERS.find(s => s.key === key);
      const val = parseFloat(e.target.value);
      stylerParams[key] = val;
      panel.querySelector(`[data-value-for="${key}"]`).textContent = val.toFixed(slider.digits);
      applyAll();
      saveParams();
    });
  });

  // Reset
  document.getElementById("styler-reset").addEventListener("click", () => {
    Object.assign(stylerParams, STYLER_DEFAULTS);
    saveParams();
    buildStylerPanel();   // rebuild to reset slider positions
    applyAll();
  });

  // Copy current params as JSON
  document.getElementById("styler-copy").addEventListener("click", async (e) => {
    const text = JSON.stringify(stylerParams, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      e.target.textContent = "Copied";
      setTimeout(() => (e.target.textContent = "Copy"), 1500);
    } catch {
      window.prompt("Copy current values:", text);
    }
  });
}

// ── Toggle ───────────────────────────────────────────────────────────────────
function initStyler() {
  loadSavedParams();
  buildStylerPanel();
  applyAll();

  const toggle = document.getElementById("styler-toggle");
  const panel  = document.getElementById("styler-panel");

  toggle.addEventListener("click", () => {
    const open = panel.classList.toggle("open");
    toggle.classList.toggle("active", open);
  });

  // Close on Esc
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && panel.classList.contains("open")) {
      panel.classList.remove("open");
      toggle.classList.remove("active");
    }
  });
}

initStyler();
