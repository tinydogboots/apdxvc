// ── Selection / detail panel ───────────────────────────────────────────────────
function selectNode(d, nodes, links) {
  selectedId = d.id;
  const connected = new Set([d.id]);
  links.forEach(l => {
    const s = typeof l.source === "object" ? l.source.id : l.source;
    const t = typeof l.target === "object" ? l.target.id : l.target;
    if (s === d.id) connected.add(t);
    if (t === d.id) connected.add(s);
  });

  nodeSel.classed("dimmed", n => !connected.has(n.id));
  linkSel.classed("dimmed", l => {
    const s = typeof l.source === "object" ? l.source.id : l.source;
    const t = typeof l.target === "object" ? l.target.id : l.target;
    return s !== d.id && t !== d.id;
  });

  // Show isolate button only if node has connections
  const hasConns = links.some(l => {
    const s = typeof l.source === "object" ? l.source.id : l.source;
    const t = typeof l.target === "object" ? l.target.id : l.target;
    return s === d.id || t === d.id;
  });
  const isolateBtn = document.getElementById("panel-isolate");
  isolateBtn.style.display = hasConns ? "block" : "none";
  isolateBtn.onclick = () => enterIsolation(d);

  document.getElementById("panel-dot").style.background = TIER_COLOR[d.tier] || "#888";
  document.getElementById("panel-comment").textContent  = d.label;
  document.getElementById("panel-body").innerHTML = `
    ${row("Tier",         cap(d.tier))}
    ${row("Category",     cap(d.category))}
    ${d.attrs["core problem"] ? row("Core Problem", d.attrs["core problem"]) : ""}
    ${d.attrs["concept"]      ? row("Concept",      d.attrs["concept"])      : ""}
    ${d.attrs["depends on"]   ? row("Depends On",   d.attrs["depends on"])   : ""}
    ${d.attrs["enables"]      ? row("Enables",      d.attrs["enables"])      : ""}
    <div class="connections-section">
      <div class="meta-label" style="margin-bottom:8px;">Connections</div>
      ${buildConnList(d, links)}
    </div>`;

  document.getElementById("panel").classList.add("open");

  document.querySelectorAll(".conn-item[data-id]").forEach(el => {
    el.addEventListener("click", () => {
      const t = window._nodes.find(n => n.id === el.dataset.id);
      if (t) selectNode(t, window._nodes, window._links);
    });
  });
}

function buildConnList(d, links) {
  const byId = Object.fromEntries(window._nodes.map(n => [n.id, n]));
  const rel  = links.filter(l => {
    const s = typeof l.source === "object" ? l.source.id : l.source;
    const t = typeof l.target === "object" ? l.target.id : l.target;
    return s === d.id || t === d.id;
  });
  if (!rel.length) return `<p style="color:var(--text-muted);font-size:12px;">No connections.</p>`;
  return rel.map(l => {
    const s   = typeof l.source === "object" ? l.source.id : l.source;
    const t   = typeof l.target === "object" ? l.target.id : l.target;
    const oid = s === d.id ? t : s;
    const o   = byId[oid];
    const col = CONN_COLOR[l.type] || "#888";
    const dir = s === d.id ? "→" : "←";
    return `
      <div class="conn-item" data-id="${oid}" style="border-color:${col}">
        <div class="conn-type" style="color:var(--text)">${l.type.replace(/_/g," ")} ${dir}</div>
        <div class="conn-label">${l.label}</div>
        <div class="conn-target">${o ? o.label.slice(0,80) : oid}</div>
        ${l.reason ? `<div class="conn-target" style="margin-top:4px;font-style:italic;">${l.reason}</div>` : ""}
      </div>`;
  }).join("");
}

// ── Isolation mode ─────────────────────────────────────────────────────────────
function enterIsolation(d) {
  isolatedId = d.id;

  // Collect this node + all directly connected nodes
  const keep = new Set([d.id]);
  window._links.forEach(l => {
    const s = typeof l.source === "object" ? l.source.id : l.source;
    const t = typeof l.target === "object" ? l.target.id : l.target;
    if (s === d.id) keep.add(t);
    if (t === d.id) keep.add(s);
  });

  // Hide everything outside the subgraph
  nodeSel.style("display", n => keep.has(n.id) ? null : "none");
  linkSel.style("display", l => {
    const s = typeof l.source === "object" ? l.source.id : l.source;
    const t = typeof l.target === "object" ? l.target.id : l.target;
    return keep.has(s) && keep.has(t) ? null : "none";
  });

  // Un-dim everything that's visible
  nodeSel.classed("dimmed", false);
  linkSel.classed("dimmed", false);

  // Re-centre the isolated subgraph
  window._nodes.forEach(n => { n.fx = null; n.fy = null; });
  simulation?.force("center", d3.forceCenter(W / 2, H / 2)).alpha(0.6).restart();

  // Show isolation bar
  const bar = document.getElementById("isolation-bar");
  document.getElementById("isolation-label").textContent = `${keep.size} nodes isolated`;
  bar.classList.add("visible");

  // Close panel
  document.getElementById("panel").classList.remove("open");
}

function exitIsolation() {
  isolatedId = null;
  document.getElementById("isolation-bar").classList.remove("visible");
  applyFilters();           // restore normal visibility
  simulation?.alpha(0.4).restart();
}

function deselect() {
  if (isolatedId) return;   // don't deselect while isolated — use Exit button
  selectedId = null;
  nodeSel?.classed("dimmed", false);
  linkSel?.classed("dimmed", false);
  document.getElementById("panel").classList.remove("open");
}

function row(label, value) {
  return `<div class="meta-row"><div class="meta-label">${label}</div><div class="meta-value">${value}</div></div>`;
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }
