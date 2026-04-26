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
    .attr("stroke", d => CONN_COLOR[d.type] || "#888")
    .attr("stroke-width", 1.5)
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

  nodeSel.append("circle")
    .attr("r", d => nodeR(d))
    .attr("fill", d => TIER_COLOR[d.tier] || "#888")
    .attr("stroke", d => TIER_COLOR[d.tier] || "#888")
    .attr("fill-opacity", 0.25);

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

function nodeR(d) { return 6 + Math.sqrt(d.degree || 0) * 2.5; }
