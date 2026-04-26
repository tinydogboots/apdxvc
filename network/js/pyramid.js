// ── Pyramid bg ─────────────────────────────────────────────────────────────────
function drawPyramidBg() {
  if (!pyramidBg) return;
  pyramidBg.selectAll("*").remove();

  const cx = W / 2;
  const apexY  = H * 0.06;
  const baseHW = (W * TIER_LAYOUT.foundational.xSpan) / 2;
  const baseY  = H * 0.92;

  pyramidBg.append("polygon")
    .attr("points", `${cx},${apexY} ${cx - baseHW},${baseY} ${cx + baseHW},${baseY}`)
    .attr("fill", "none").attr("stroke", "#ffffff0d").attr("stroke-width", 1);

  const tierColors = { advanced: CSS("--tier-advanced"), intermediate: CSS("--tier-intermediate"), foundational: CSS("--tier-foundational") };

  ["advanced", "intermediate", "foundational"].forEach(tier => {
    const ly   = TIER_LAYOUT[tier];
    const halfW = (W * ly.xSpan) / 2;
    const y    = H * ly.yFrac;

    pyramidBg.append("line")
      .attr("x1", cx - halfW).attr("y1", y).attr("x2", cx + halfW).attr("y2", y)
      .attr("stroke", tierColors[tier]).attr("stroke-width", 1).attr("stroke-opacity", 0.2);

    pyramidBg.append("text")
      .attr("x", cx - halfW - 8).attr("y", y + 4)
      .attr("text-anchor", "end").attr("font-size", "11px")
      .attr("font-family", "-apple-system, sans-serif")
      .attr("fill", tierColors[tier]).attr("fill-opacity", 0.7)
      .text(tier.charAt(0).toUpperCase() + tier.slice(1));
  });

  const topHW = (W * TIER_LAYOUT.advanced.xSpan) / 2;
  const topY  = H * TIER_LAYOUT.advanced.yFrac - 30;
  const botY  = H * TIER_LAYOUT.foundational.yFrac + 30;

  pyramidBg.append("line")
    .attr("x1", cx).attr("y1", topY).attr("x2", cx).attr("y2", botY)
    .attr("stroke", "#ffffff08").attr("stroke-width", 1).attr("stroke-dasharray", "4 4");

  const labelY = H * TIER_LAYOUT.advanced.yFrac - 20;
  [
    { text: "Signage & Wayfinding", x: cx - topHW / 2 },
    { text: "Brand Expression",     x: cx + topHW / 2 },
  ].forEach(({ text, x }) => {
    pyramidBg.append("text")
      .attr("x", x).attr("y", labelY).attr("text-anchor", "middle")
      .attr("font-size", "10px").attr("font-family", "-apple-system, sans-serif")
      .attr("fill", "#ffffff35").attr("letter-spacing", "0.07em")
      .text(text.toUpperCase());
  });
}

// ── Layout switching ───────────────────────────────────────────────────────────
function setLayout(view) {
  currentView = view;
  document.getElementById("canvas-wrap").classList.toggle("pyramid-mode", view === "pyramid");
  if (!simulation) return;

  window._nodes.forEach(n => { n.fx = null; n.fy = null; });
  simulation.stop();
  simulation
    .force("link",    d3.forceLink(window._links).id(d => d.id).distance(view === "pyramid" ? 60 : 80).strength(0.3))
    .force("charge",  d3.forceManyBody().strength(view === "pyramid" ? -80 : -200))
    .force("center",  view === "pyramid" ? null : d3.forceCenter(W / 2, H / 2))
    .force("collide", d3.forceCollide(d => nodeR(d) + (view === "pyramid" ? 3 : 4)));

  if (view === "pyramid") {
    simulation
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
  } else {
    simulation.force("tierY", null).force("catX", null);
  }

  simulation.alpha(0.8).restart();
}
