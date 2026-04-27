// ── Background canvas — organic dot field via value-noise FBM ─────────────────

let _bgCanvas = null;

function _h(x, y) {
  let n = (x * 1619 + y * 31337 + 12345) | 0;
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
  return ((n ^ (n >>> 16)) >>> 0) / 0xffffffff;
}
function _sm(t) { return t * t * (3 - 2 * t); }
function _lp(a, b, t) { return a + (b - a) * t; }
function _vn(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  return _lp(
    _lp(_h(ix, iy),   _h(ix + 1, iy),   _sm(fx)),
    _lp(_h(ix, iy + 1), _h(ix + 1, iy + 1), _sm(fx)),
    _sm(fy)
  );
}

// Fractional brownian motion — combines octaves for organic large-scale shapes
function _fbm(x, y) {
  return _vn(x * 0.003, y * 0.003) * 0.55
       + _vn(x * 0.007, y * 0.007) * 0.28
       + _vn(x * 0.018, y * 0.018) * 0.17;
}

function drawBgCanvas() {
  if (!_bgCanvas) {
    _bgCanvas = document.createElement("canvas");
    _bgCanvas.id = "bg-canvas";
    _bgCanvas.style.cssText =
      "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;";
    const terrainBg = document.getElementById("terrain-bg");
    if (terrainBg) terrainBg.insertAdjacentElement("afterend", _bgCanvas);
    else document.body.prepend(_bgCanvas);
  }

  const W = window.innerWidth, H = window.innerHeight;
  _bgCanvas.width  = W;
  _bgCanvas.height = H;
  const ctx = _bgCanvas.getContext("2d");

  const lOpacity = stylerParams.latticeOpacity ?? 0.054;
  const patch    = stylerParams.patchiness    ?? 0.6;

  ctx.fillStyle = "#efebe1";

  // threshold: how high the FBM field must be to place a dot.
  // low patchiness → lower threshold → broader, more even coverage
  // high patchiness → higher threshold → concentrated dense clusters, large empty voids
  const threshold = 0.32 + patch * 0.28;  // range 0.32–0.60

  const GRID = 22;
  for (let px = 0; px < W + GRID; px += GRID) {
    for (let py = 0; py < H + GRID; py += GRID) {
      const d = _fbm(px, py);
      if (d < threshold) continue;

      const s  = (d - threshold) / (1 - threshold);   // 0–1 within active zone
      const jx = (_h(px, py + 133)  - 0.5) * 9;
      const jy = (_h(px + 271, py)  - 0.5) * 9;
      const r  = 0.35 + s * 0.75;                     // dot radius 0.35–1.1 px
      ctx.globalAlpha = lOpacity * (0.35 + s * 0.65);
      ctx.beginPath();
      ctx.arc(px + jx, py + jy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

window.addEventListener("resize", () => {
  if (typeof drawBgCanvas === "function" && typeof stylerParams !== "undefined") drawBgCanvas();
});
