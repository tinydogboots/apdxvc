// ── Load ───────────────────────────────────────────────────────────────────────
fetch("data/kumu_blueprint.json")
  .then(r => r.json())
  .then(data => {
    document.getElementById("loading").style.display = "none";
    init(data);
  })
  .catch(() => {
    document.getElementById("loading").textContent = "No data yet — run scripts/xlsx_to_json.py first.";
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

  // Arrow marker — open chevron, only for dependency type
  const defs = svg.append("defs");
  defs.append("marker")
    .attr("id", "arrow-dependency")
    .attr("viewBox", "0 -4 8 8").attr("refX", 18).attr("refY", 0)
    .attr("markerWidth", 6).attr("markerHeight", 6).attr("orient", "auto")
    .append("path").attr("d", "M0,-4L8,0L0,4")
    .attr("fill", "none")
    .attr("stroke", CONN_COLOR.dependency)
    .attr("stroke-width", 1.5);

  pyramidBg = g.append("g").attr("class", "pyramid-bg");
  drawPyramidBg();

  const nodes = data.elements.map(e => ({
    id:              e.id,
    label:           e.label,
    tier:            (e.attributes?.tier || "").toLowerCase().trim(),
    category:        (e.attributes?.category || "").toLowerCase().trim(),
    subheading:      e.attributes?.subheading || "",
    source_sentence: e.attributes?.source_sentence || "",
    lead:            (e.attributes?.lead || "tbd").toLowerCase().replace(/[- ]/g, "_"),
    lead_label:      e.attributes?.lead_label || "",
    track:           e.attributes?.track || "",
    rec_only:        !!(e.attributes?.recommendation_only),
    notes:           e.attributes?.notes || "",
    attrs:           e.attributes || {},
  }));

  const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));

  const links = data.connections
    .filter(c => nodeById[c.from] && nodeById[c.to])
    .map(c => ({
      source:  c.from,
      target:  c.to,
      type:    (c.attributes?.type || "dependency").toLowerCase(),
      status:  (c.attributes?.status || "confirmed").toLowerCase(),
      label:   c.label || "",
    }));

  // Degree for sizing
  const degree = {};
  links.forEach(l => {
    degree[l.source] = (degree[l.source] || 0) + 1;
    degree[l.target] = (degree[l.target] || 0) + 1;
  });
  nodes.forEach(n => { n.degree = degree[n.id] || 0; });

  // Track groups — only real parallel tracks; "Single" / "" = no clustering
  const trackGroups = {};
  nodes.forEach(n => {
    const t = (n.track || "").trim().toLowerCase();
    if (!t || t === "single") return;
    (trackGroups[n.track] = trackGroups[n.track] || []).push(n);
  });

  simulation = d3.forceSimulation(nodes)
    .force("link",    d3.forceLink(links).id(d => d.id).distance(80).strength(0.4))
    .force("charge",  d3.forceManyBody().strength(-200))
    .force("center",  d3.forceCenter(W / 2, H / 2))
    .force("collide", d3.forceCollide(d => nodeR(d) + 4))
    .force("tracks",  makeTrackForce(trackGroups));

  // Links — dependency: solid + arrow; synergy: dashed, no arrow
  linkSel = g.append("g").selectAll("line")
    .data(links).join("line")
    .attr("class", "link")
    .attr("stroke", d => CONN_COLOR[d.type] || CONN_COLOR.dependency)
    .attr("stroke-dasharray", d => d.type === "synergy" ? "4 3" : null)
    .attr("marker-end", d => d.type === "dependency" ? "url(#arrow-dependency)" : null);

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
    .attr("fill", d => TIER_COLOR[d.tier] || "#1a1814")
    .attr("stroke", "none")
    .attr("fill-opacity", d => d.rec_only ? 0.45 : 0.88);

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

// ── Helpers ────────────────────────────────────────────────────────────────────
function nodeR(d) { return 4 + Math.sqrt(d.degree || 0) * 1.8; }

// Gentle force: pull same-track nodes toward their group centroid
function makeTrackForce(trackGroups) {
  return function(alpha) {
    Object.values(trackGroups).forEach(group => {
      if (group.length < 2) return;
      const cx = d3.mean(group, n => n.x);
      const cy = d3.mean(group, n => n.y);
      group.forEach(n => {
        n.vx += (cx - n.x) * 0.015 * alpha;
        n.vy += (cy - n.y) * 0.015 * alpha;
      });
    });
  };
}

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

function applyInkVariance() {
  if (!nodeSel || !linkSel) return;
  nodeSel.select("circle")
    .attr("r",            d => nodeR(d) + wobble(d.id, stylerParams.nodeWobbleWidth * 0.5))
    .attr("fill-opacity", d => {
      const base = d.rec_only ? 0.45 : 0.88;
      return base + wobble(d.id + "o", stylerParams.nodeWobbleOpacity * 0.3);
    });
  linkSel
    .attr("stroke-width",   d => {
      // cross-tier links are thicker (source and target have different tiers)
      const s = typeof d.source === "object" ? d.source : window._nodes?.find(n => n.id === d.source);
      const t = typeof d.target === "object" ? d.target : window._nodes?.find(n => n.id === d.target);
      const crossTier = s && t && s.tier !== t.tier;
      const base = crossTier ? 1.8 : 1.0;
      return base + wobble(linkSeed(d), stylerParams.linkWobbleWidth * 0.5);
    })
    .attr("stroke-opacity", d => {
      const base = d.status === "pending" ? 0.3 : 0.7;
      return base + wobble(linkSeed(d) + "o", stylerParams.linkWobbleOpacity * 0.2);
    });
}
