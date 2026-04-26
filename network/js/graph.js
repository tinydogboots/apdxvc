// ── Load ───────────────────────────────────────────────────────────────────────
fetch("data/kumu_blueprint.json")
  .then(r => r.json())
  .then(data => {
    document.getElementById("loading").style.display = "none";
    init(data);
  })
  .catch(() => {
    document.getElementById("loading").textContent = "No data yet — run the Colab notebook first.";
  });

// ── Init ───────────────────────────────────────────────────────────────────────
function init(data) {
  const wrap = document.getElementById("canvas-wrap");
  const svg  = d3.select("#canvas");
  W = wrap.clientWidth;
  H = wrap.clientHeight;
  svg.attr("width", W).attr("height", H);

  const g = svg.append("g");
  svg.call(d3.zoom().scaleExtent([0.08, 6]).on("zoom", e => g.attr("transform", e.transform)));

  // Arrow markers
  const defs = svg.append("defs");
  Object.entries(CONN_COLOR).forEach(([type, color]) => {
    defs.append("marker")
      .attr("id", `arrow-${type}`)
      .attr("viewBox", "0 -4 8 8").attr("refX", 18).attr("refY", 0)
      .attr("markerWidth", 6).attr("markerHeight", 6).attr("orient", "auto")
      .append("path").attr("d", "M0,-4L8,0L0,4").attr("fill", color);
  });

  pyramidBg = g.append("g").attr("class", "pyramid-bg");
  drawPyramidBg();

  const nodes = data.elements.map(e => ({
    id:       e.id,
    label:    e.label,
    tier:     (e.attributes?.tier || e.type || "").toLowerCase().trim(),
    category: (e.attributes?.category || "").toLowerCase().trim(),
    attrs:    e.attributes || {},
  }));

  const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));

  const links = data.connections
    .filter(c => nodeById[c.from] && nodeById[c.to])
    .map(c => ({
      source: c.from, target: c.to,
      type:   (c.attributes?.type || "").toLowerCase(),
      label:  c.label || "",
      reason: c.attributes?.reason || "",
    }));

  const degree = {};
  links.forEach(l => {
    degree[l.source] = (degree[l.source] || 0) + 1;
    degree[l.target] = (degree[l.target] || 0) + 1;
  });
  nodes.forEach(n => { n.degree = degree[n.id] || 0; });

  simulation = d3.forceSimulation(nodes)
    .force("link",    d3.forceLink(links).id(d => d.id).distance(80).strength(0.4))
    .force("charge",  d3.forceManyBody().strength(-200))
    .force("center",  d3.forceCenter(W / 2, H / 2))
    .force("collide", d3.forceCollide(d => nodeR(d) + 4));

  linkSel = g.append("g").selectAll("line")
    .data(links).join("line")
    .attr("class", "link")
    .attr("stroke", d => CONN_COLOR[d.type] || "#1a1814")
    .attr("marker-end", d => `url(#arrow-${d.type})`);

  nodeSel = g.append("g").selectAll("g")
    .data(nodes).join("g")
    .attr("class", "node")
    .call(d3.drag()
      .on("start", (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on("drag",  (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on("end",   (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
    )
    .on("click", (e, d) => { e.stopPropagation(); selectNode(d, nodes, links); });

  // hollow ink circles — paper aesthetic
  nodeSel.append("circle")
    .attr("r", d => nodeR(d))
    .attr("fill", CSS("--bg"))
    .attr("stroke", d => TIER_COLOR[d.tier] || "#1a1814");

  // stroke-width / stroke-opacity variance applied here so the Styler can re-call
  applyInkVariance();

  simulation.on("tick", () => {
    linkSel
      .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    nodeSel.attr("transform", d => `translate(${d.x},${d.y})`);
  });

  svg.on("click", deselect);

  window._nodes = nodes;
  window._links = links;
  applyFilters();
}

function nodeR(d) { return 4 + Math.sqrt(d.degree || 0) * 1.8; }

// Deterministic per-element ink-bleed variance — same id always gets the same
// stroke-width/opacity offset, so the texture is stable across re-renders but
// looks like ink absorbing unevenly into paper.
function inkHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function wobble(seed, range) {
  return ((inkHash(seed) % 1000) / 1000 - 0.5) * range;
}
function linkSeed(l) {
  const s = typeof l.source === "object" ? l.source.id : l.source;
  const t = typeof l.target === "object" ? l.target.id : l.target;
  return s + ">" + t;
}

// Re-apply the per-element variance based on current stylerParams. Called on
// initial render and on every Styler slider change.
function applyInkVariance() {
  if (!nodeSel || !linkSel) return;
  nodeSel.select("circle")
    .attr("stroke-width",   d => 1.1 + wobble(d.id, stylerParams.nodeWobbleWidth))
    .attr("stroke-opacity", d => 0.85 + wobble(d.id + "o", stylerParams.nodeWobbleOpacity));
  linkSel
    .attr("stroke-width",   d => 1.0 + wobble(linkSeed(d), stylerParams.linkWobbleWidth))
    .attr("stroke-opacity", d => 0.7 + wobble(linkSeed(d) + "o", stylerParams.linkWobbleOpacity));
}
