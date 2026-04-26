const CSS = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();

const TIER_COLOR = {
  foundational: CSS("--tier-foundational"),
  intermediate: CSS("--tier-intermediate"),
  advanced:     CSS("--tier-advanced"),
};
const CONN_COLOR = {
  dependency:        CSS("--conn-dependency"),
  shared_root:       CSS("--conn-shared_root"),
  enabler:           CSS("--conn-enabler"),
  tension:           CSS("--conn-tension"),
  cross_tier_bridge: CSS("--conn-cross_tier_bridge"),
};

const TIER_LAYOUT = {
  advanced:     { yFrac: 0.18, xSpan: 0.26 },
  intermediate: { yFrac: 0.50, xSpan: 0.58 },
  foundational: { yFrac: 0.80, xSpan: 0.90 },
};

let currentView   = "force";
let activeTiers   = new Set(["foundational", "intermediate", "advanced"]);
let activeConns   = new Set(["dependency", "shared_root", "enabler", "tension", "cross_tier_bridge"]);
let selectedId    = null;
let isolatedId    = null;
let searchQuery   = "";
let simulation    = null;
let nodeSel, linkSel, pyramidBg;
let W, H;
