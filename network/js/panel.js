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

  const leadLabel = { consultant: "Consultant", client: "Client", third_party: "Third-party", tbd: "TBD" };

  document.getElementById("panel-body").innerHTML = `
    ${d.id            ? row("Task ID",    `<span style="font-size:11px;letter-spacing:.08em;">${d.id}</span>`) : ""}
    ${d.tier          ? row("Tier",       cap(d.tier)) : ""}
    ${d.category      ? row("Category",   cap(d.category)) : ""}
    ${d.lead          ? row("Lead",       leadLabel[d.lead] || cap(d.lead)) : ""}
    ${d.track         ? row("Track",      d.track) : ""}
    ${d.rec_only      ? row("",           `<span class="rec-badge">Recommendation only</span>`) : ""}
    ${d.subheading    ? row("Subheading", d.subheading) : ""}
    ${d.source_sentence ? row("Source",  `<span style="font-style:italic;">${d.source_sentence}</span>`) : ""}
    ${d.notes         ? row("Notes",      d.notes) : ""}
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
    const col = CONN_COLOR[l.type] || CONN_COLOR.dependency;
    const dir = s === d.id ? "→" : "←";
    const pendingTag = l.status === "pending"
      ? `<span style="font-size:9px;color:var(--text-muted);margin-left:4px;">pending</span>` : "";
    const dash = l.type === "synergy"
      ? `style="border-left-style:dashed;border-color:${col}"` : `style="border-color:${col}"`;
    return `
      <div class="conn-item" data-id="${oid}" ${dash}>
        <div class="conn-type" style="color:var(--text)">${l.type} ${dir}${pendingTag}</div>
        ${l.label ? `<div class="conn-label">${l.label}</div>` : ""}
        <div class="conn-target">${o ? o.label.slice(0, 80) : oid}</div>
      </div>`;
  }).join("");
}

// ── Isolation mode ─────────────────────────────────────────────────────────────
function enterIsolation(d) {
  isolatedId = d.id;
  const keep = new Set([d.id]);
  window._links.forEach(l => {
    const s = typeof l.source === "object" ? l.source.id : l.source;
    const t = typeof l.target === "object" ? l.target.id : l.target;
    if (s === d.id) keep.add(t);
    if (t === d.id) keep.add(s);
  });

  nodeSel.style("display", n => keep.has(n.id) ? null : "none");
  linkSel.style("display", l => {
    const s = typeof l.source === "object" ? l.source.id : l.source;
    const t = typeof l.target === "object" ? l.target.id : l.target;
    return keep.has(s) && keep.has(t) ? null : "none";
  });

  nodeSel.classed("dimmed", false);
  linkSel.classed("dimmed", false);
  window._nodes.forEach(n => { n.fx = null; n.fy = null; });
  simulation?.force("center", d3.forceCenter(W / 2, H / 2)).alpha(0.6).restart();

  document.getElementById("isolation-label").textContent = `${keep.size} nodes isolated`;
  document.getElementById("isolation-bar").classList.add("visible");
  document.getElementById("panel").classList.remove("open");
}

function exitIsolation() {
  isolatedId = null;
  document.getElementById("isolation-bar").classList.remove("visible");
  applyFilters();
  simulation?.alpha(0.4).restart();
}

function deselect() {
  if (isolatedId) return;
  selectedId = null;
  nodeSel?.classed("dimmed", false);
  linkSel?.classed("dimmed", false);
  document.getElementById("panel").classList.remove("open");
}

function row(label, value) {
  const labelHtml = label
    ? `<div class="meta-label">${label}</div>` : "";
  return `<div class="meta-row">${labelHtml}<div class="meta-value">${value}</div></div>`;
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }
