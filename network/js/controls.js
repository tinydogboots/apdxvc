// ── Filters ────────────────────────────────────────────────────────────────────
function applyFilters() {
  if (typeof applyListFilters === "function") applyListFilters();
  if (!nodeSel) return;
  const q = searchQuery.toLowerCase();
  nodeSel.style("display", d => {
    if (!activeTiers.has(d.tier)) return "none";
    if (!activeLeads.has(d.lead)) return "none";
    if (showRecOnly && !d.rec_only) return "none";
    if (q && !d.label.toLowerCase().includes(q)
           && !d.source_sentence?.toLowerCase().includes(q)
           && !d.subheading?.toLowerCase().includes(q)) return "none";
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

// ── Chip sync ─────────────────────────────────────────────────────────────────
function syncChips(attr, value, active) {
  document.querySelectorAll(`.chip[${attr}="${value}"]`).forEach(c => c.classList.toggle("active", active));
}

function bindChips(containerId, type) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.addEventListener("click", e => {
    const chip = e.target.closest(`.chip[data-${type}]`);
    if (!chip) return;
    const val = chip.dataset[type];
    let set;
    if (type === "tier") set = activeTiers;
    else if (type === "conn") set = activeConns;
    else if (type === "lead") set = activeLeads;
    else return;
    set[set.has(val) ? "delete" : "add"](val);
    syncChips(`data-${type}`, val, set.has(val));
    applyFilters();
  });
}

function bindToggle(id, setter) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("click", () => {
    const on = el.classList.toggle("active");
    setter(on);
    applyFilters();
  });
}

function bindSearch(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("input", e => {
    searchQuery = e.target.value;
    const other = id === "search-desktop" ? "search-mobile" : "search-desktop";
    const otherEl = document.getElementById(other);
    if (otherEl) otherEl.value = searchQuery;
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

// ── Bindings ──────────────────────────────────────────────────────────────────
bindChips("tier-filters-desktop", "tier");
bindChips("tier-filters-mobile",  "tier");
bindChips("conn-filters-desktop", "conn");
bindChips("conn-filters-mobile",  "conn");
bindChips("lead-filters-desktop", "lead");
bindChips("lead-filters-mobile",  "lead");
bindToggle("rec-only-desktop", v => { showRecOnly = v; });
bindToggle("rec-only-mobile",  v => { showRecOnly = v; });

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
