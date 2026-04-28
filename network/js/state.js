const CSS = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();

const TIER_COLOR = {
  foundational: CSS("--tier-foundational"),
  intermediate: CSS("--tier-intermediate"),
  advanced:     CSS("--tier-advanced"),
};
const CONN_COLOR = {
  dependency: CSS("--conn-dependency"),
  synergy:    CSS("--conn-synergy"),
};

const TIER_LAYOUT = {
  advanced:     { yFrac: 0.18, xSpan: 0.26 },
  intermediate: { yFrac: 0.50, xSpan: 0.58 },
  foundational: { yFrac: 0.80, xSpan: 0.90 },
};

let currentView   = "pyramid";
let activeTiers   = new Set(["foundational", "intermediate", "advanced"]);
let activeConns   = new Set(["dependency", "synergy"]);
let activeLeads   = new Set(["consultant", "client", "third_party", "tbd"]);
let showRecOnly   = false;
let selectedId    = null;
let isolatedId    = null;
let searchQuery   = "";
let simulation    = null;
let nodeSel, linkSel, pyramidBg;
let W, H;

// ── Live texture parameters (driven by the Styler panel) ──────────────────────
const STYLER_DEFAULTS = {
  grainOpacity:      0.13,
  latticeOpacity:    0.054,
  patchiness:        0.6,
  nodeWobbleWidth:   0.5,
  nodeWobbleOpacity: 0.25,
  linkWobbleWidth:   0.5,
  linkWobbleOpacity: 0.25,
  pyramidStipple:    1.0,
};
const stylerParams = { ...STYLER_DEFAULTS };
