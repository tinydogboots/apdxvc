// ── Filters ────────────────────────────────────────────────────────────────────
function applyFilters() {
  if (!nodeSel) return;
  const q = searchQuery.toLowerCase();
  nodeSel.style("display", d => {
    if (!activeTiers.has(d.tier)) return "none";
    if (q && !d.label.toLowerCase().includes(q) && !d.attrs["core problem"]?.toLowerCase().includes(q)) return "none";
    return null;
  });
  linkSel.style("display", l => {
    if (!activeConns.has(l.type)) return "none";
    const s = typeof l.source === "object" ? l.source : window._nodes?.find(n => n.id === l.source);
    const t = typeof l.target === "object" ? l.target : window._nodes?.find(n => n.id === l.target);
    if (s && !activeTiers.has(s.tier)) return "none";
    if (t && !activeTiers.has(t.tier)) return "none";
    return null;
  });
}

// Sync chip state across desktop + mobile sets
function syncChips(attr, value, active) {
  document.querySelectorAll(`.chip[${attr}="${value}"]`).forEach(c => c.classList.toggle("active", active));
}

function bindChips(containerId, type) {
  document.getElementById(containerId).addEventListener("click", e => {
    const chip = e.target.closest(`.chip[data-${type}]`);
    if (!chip) return;
    const val = chip.dataset[type];
    const set = type === "tier" ? activeTiers : activeConns;
    set[set.has(val) ? "delete" : "add"](val);
    syncChips(`data-${type}`, val, set.has(val));
    applyFilters();
  });
}

function bindSearch(id) {
  document.getElementById(id).addEventListener("input", e => {
    searchQuery = e.target.value;
    document.getElementById(id === "search-desktop" ? "search-mobile" : "search-desktop").value = searchQuery;
    applyFilters();
  });
}

// ── View toggle ────────────────────────────────────────────────────────────────
document.querySelectorAll(".view-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".view-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    setLayout(btn.dataset.view);
  });
});

// ── Filter & search bindings ───────────────────────────────────────────────────
bindChips("tier-filters-desktop", "tier");
bindChips("tier-filters-mobile",  "tier");
bindChips("conn-filters-desktop", "conn");
bindChips("conn-filters-mobile",  "conn");

bindSearch("search-desktop");
bindSearch("search-mobile");

document.getElementById("panel-close").addEventListener("click", deselect);
document.getElementById("exit-isolation").addEventListener("click", exitIsolation);
document.getElementById("canvas-wrap").querySelector("svg")?.addEventListener("click", deselect);

// ── Filter drawer ──────────────────────────────────────────────────────────────
document.getElementById("open-drawer").addEventListener("click", () => {
  document.getElementById("filter-drawer").classList.add("open");
});

document.getElementById("drawer-overlay").addEventListener("click", () => {
  document.getElementById("filter-drawer").classList.remove("open");
});

// ── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener("resize", () => {
  const wrap = document.getElementById("canvas-wrap");
  W = wrap.clientWidth;
  H = wrap.clientHeight;
  d3.select("#canvas").attr("width", W).attr("height", H);
  drawPyramidBg();
  if (currentView === "pyramid") setLayout("pyramid");
  else simulation?.force("center", d3.forceCenter(W / 2, H / 2)).alpha(0.3).restart();
});
