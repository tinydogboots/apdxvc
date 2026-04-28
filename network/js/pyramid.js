// ── Pyramid bg ─────────────────────────────────────────────────────────────────
function drawPyramidBg() {
  if (!pyramidBg) return;
  pyramidBg.selectAll("*").remove();

  const cx     = W / 2;
  const apexY  = H * 0.06;
  const baseHW = (W * TIER_LAYOUT.foundational.xSpan) / 2;
  const baseY  = H * 0.92;

  const inkFaint   = "#1a181418";
  const inkHairline = "#1a18142a";
  const monoStack  = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace';

  // Pyramid outline — two ink hairlines
  pyramidBg.append("polygon")
    .attr("points", `${cx},${apexY} ${cx - baseHW},${baseY} ${cx + baseHW},${baseY}`)
    .attr("fill", "none")
    .attr("stroke", inkFaint)
    .attr("stroke-width", 1);

  const tierColors = {
    advanced:     CSS("--tier-advanced"),
    intermediate: CSS("--tier-intermediate"),
    foundational: CSS("--tier-foundational"),
  };

  // stipple patterns per tier — slight variance for hand-drawn feel
  // gap is multiplied by stylerParams.pyramidStipple so the Styler can scale density
  const sm = stylerParams.pyramidStipple;
  const stipples = {
    advanced:     `1 ${(3.2 * sm).toFixed(2)}`,
    intermediate: `1.2 ${(2.8 * sm).toFixed(2)}`,
    foundational: `0.8 ${(3 * sm).toFixed(2)}`,
  };

  ["advanced", "intermediate", "foundational"].forEach((tier, i) => {
    const ly    = TIER_LAYOUT[tier];
    const halfW = (W * ly.xSpan) / 2;
    const y     = H * ly.yFrac;

    // tier band — stippled hairline, organic broken pattern
    pyramidBg.append("line")
      .attr("x1", cx - halfW).attr("y1", y)
      .attr("x2", cx + halfW).attr("y2", y)
      .attr("stroke", tierColors[tier])
      .attr("stroke-width", 0.9)
      .attr("stroke-opacity", 0.45)
      .attr("stroke-dasharray", stipples[tier])
      .attr("stroke-linecap", "round");

    // tier label — bracket-decorated mono caps
    const code = String(i + 1).padStart(2, "0");
    pyramidBg.append("text")
      .attr("x", cx - halfW - 10).attr("y", y + 3)
      .attr("text-anchor", "end")
      .attr("font-size", "9px")
      .attr("font-family", monoStack)
      .attr("font-weight", "700")
      .attr("letter-spacing", "0.12em")
      .attr("fill", "#1a1814")
      .attr("fill-opacity", 0.55)
      .text(`[${code}] ${tier.toUpperCase()}`);
  });

  // Centre axis — dotted vertical
  const topHW = (W * TIER_LAYOUT.advanced.xSpan) / 2;
  const topY  = H * TIER_LAYOUT.advanced.yFrac - 32;
  const botY  = H * TIER_LAYOUT.foundational.yFrac + 30;

  pyramidBg.append("line")
    .attr("x1", cx).attr("y1", topY)
    .attr("x2", cx).attr("y2", botY)
    .attr("stroke", inkHairline)
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "1 4");

  // Category column labels — small mono caps
  const labelY = H * TIER_LAYOUT.advanced.yFrac - 22;
  [
    { text: "SIGNAGE & WAYFINDING", x: cx - topHW / 2 },
    { text: "BRAND EXPRESSION",     x: cx + topHW / 2 },
  ].forEach(({ text, x }) => {
    pyramidBg.append("text")
      .attr("x", x).attr("y", labelY)
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("font-family", monoStack)
      .attr("font-weight", "500")
      .attr("letter-spacing", "0.18em")
      .attr("fill", "#1a181466")
      .text(text);
  });
}

// ── Layout switching ───────────────────────────────────────────────────────────
function setLayout(view) {
  currentView = view;

  const canvasWrap = document.getElementById("canvas-wrap");
  const listWrap   = document.getElementById("list-wrap");

  // Show/hide the two view containers
  canvasWrap.style.display = view === "list" ? "none" : "";
  listWrap.style.display   = view === "list" ? "block" : "none";
  canvasWrap.classList.toggle("pyramid-mode", view === "pyramid");

  if (view === "list") {
    simulation?.stop();
    if (typeof buildListView === "function") buildListView();
    return;
  }

  // Pyramid view — apply tier/category forces
  if (!simulation) return;
  window._nodes.forEach(n => { n.fx = null; n.fy = null; });
  simulation.stop();
  simulation
    .force("link",    d3.forceLink(window._links).id(d => d.id).distance(60).strength(0.3))
    .force("charge",  d3.forceManyBody().strength(-80))
    .force("center",  null)
    .force("collide", d3.forceCollide(d => nodeR(d) + 3))
    .force("tierY", d3.forceY(d => {
      const cfg = TIER_LAYOUT[d.tier];
      return cfg ? H * cfg.yFrac : H / 2;
    }).strength(0.6))
    .force("catX", d3.forceX(d => {
      const cfg  = TIER_LAYOUT[d.tier];
      const halfW = cfg ? (W * cfg.xSpan) / 2 : W * 0.4;
      const isWayfinding = d.category.includes("wayfinding") || d.category.includes("signage");
      return isWayfinding ? W / 2 - halfW * 0.35 : W / 2 + halfW * 0.35;
    }).strength(0.35));

  simulation.alpha(0.8).restart();
}
