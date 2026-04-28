// ── List view — sentence-level outline with click-to-expand connections ──────

let _listBuilt = false;
let _expanded = new Set();   // keys of currently expanded sentences

// Group nodes by (tier → category → subheading → source_sentence)
// Each leaf group represents one source sentence (one or more tasks).
function _groupNodes() {
  const out = {};
  window._nodes.forEach(n => {
    const tier = n.tier || "unknown";
    const cat  = n.category || "Uncategorized";
    const sub  = n.subheading || "";
    const src  = n.source_sentence || "(no source sentence)";
    out[tier] ??= {};
    out[tier][cat] ??= {};
    out[tier][cat][sub] ??= {};
    out[tier][cat][sub][src] ??= [];
    out[tier][cat][sub][src].push(n);
  });
  return out;
}

// For a given source-sentence key, return the connected source sentences
// with their relation (depends_on / enables / synergy) aggregated from
// underlying task-level connections.
function _connectionsFor(taskList) {
  const taskIds = new Set(taskList.map(n => n.id));
  const sentenceOf = new Map(window._nodes.map(n => [n.id, n.source_sentence]));
  const ownSentence = taskList[0]?.source_sentence;

  const buckets = { depends_on: new Map(), enables: new Map(), synergy: new Map() };

  window._links.forEach(l => {
    const s = typeof l.source === "object" ? l.source.id : l.source;
    const t = typeof l.target === "object" ? l.target.id : l.target;
    const fromMine = taskIds.has(s);
    const toMine   = taskIds.has(t);
    if (!fromMine && !toMine) return;

    const otherId  = fromMine ? t : s;
    const otherSentence = sentenceOf.get(otherId);
    if (!otherSentence || otherSentence === ownSentence) return;  // skip intra-sentence

    let bucket;
    if (l.type === "synergy") {
      bucket = buckets.synergy;
    } else if (l.type === "dependency") {
      // Edge points prereq → dependent. If our task is the dependent (toMine),
      // then we depend on the other sentence. If our task is the prereq (fromMine),
      // then we enable the other sentence.
      bucket = toMine ? buckets.depends_on : buckets.enables;
    } else {
      return;
    }
    if (!bucket.has(otherSentence)) {
      bucket.set(otherSentence, { count: 0, pending: 0 });
    }
    const entry = bucket.get(otherSentence);
    entry.count++;
    if (l.status === "pending") entry.pending++;
  });

  return {
    depends_on: [...buckets.depends_on.entries()],
    enables:    [...buckets.enables.entries()],
    synergy:    [...buckets.synergy.entries()],
  };
}

const TIER_ORDER = ["foundational", "intermediate", "advanced"];

function buildListView() {
  const container = document.getElementById("list-wrap");
  if (!container) return;

  const grouped = _groupNodes();

  let html = `<div class="list-inner">`;
  TIER_ORDER.forEach(tier => {
    if (!grouped[tier]) return;
    const tierColor = TIER_COLOR[tier] || "#888";
    html += `<section class="list-tier" data-tier="${tier}">
      <h2 class="list-tier-head"><span class="list-tier-dot" style="background:${tierColor}"></span>${tier.toUpperCase()}</h2>`;

    Object.keys(grouped[tier]).sort().forEach(cat => {
      html += `<div class="list-cat"><div class="list-cat-head">${cat}</div>`;

      Object.keys(grouped[tier][cat]).sort().forEach(sub => {
        if (sub) html += `<div class="list-sub-head">${sub}</div>`;

        Object.keys(grouped[tier][cat][sub]).forEach(src => {
          const tasks = grouped[tier][cat][sub][src];
          const key = `${tier}|${cat}|${sub}|${src}`;
          const recOnly = tasks.every(t => t.rec_only);
          const leads = [...new Set(tasks.map(t => t.lead_label || t.lead).filter(Boolean))];
          html += `<div class="list-item" data-key="${encodeURIComponent(key)}" data-tier="${tier}">
            <div class="list-row">
              <span class="list-src">${src}</span>
              <span class="list-meta">${tasks.length} task${tasks.length === 1 ? "" : "s"}${recOnly ? " · rec-only" : ""}${leads.length ? " · " + leads.join(", ") : ""}</span>
            </div>
            <div class="list-expansion"></div>
          </div>`;
        });
      });

      html += `</div>`;
    });

    html += `</section>`;
  });
  html += `</div>`;

  container.innerHTML = html;
  _listBuilt = true;

  // Wire clicks
  container.querySelectorAll(".list-item").forEach(item => {
    item.querySelector(".list-row").addEventListener("click", () => _toggleExpansion(item));
  });

  applyListFilters();
}

function _toggleExpansion(item) {
  const key = decodeURIComponent(item.dataset.key);
  const exp = item.querySelector(".list-expansion");

  if (item.classList.contains("expanded")) {
    item.classList.remove("expanded");
    exp.innerHTML = "";
    _expanded.delete(key);
    return;
  }

  // Find the tasks for this key
  const [tier, cat, sub, src] = key.split("|");
  const tasks = window._nodes.filter(n =>
    (n.tier || "unknown") === tier &&
    (n.category || "Uncategorized") === cat &&
    (n.subheading || "") === sub &&
    (n.source_sentence || "(no source sentence)") === src
  );

  const conns = _connectionsFor(tasks);
  exp.innerHTML = _renderExpansion(conns, tasks);
  item.classList.add("expanded");
  _expanded.add(key);

  // Wire deep-clicks: clicking a connected sentence scrolls to + opens it
  exp.querySelectorAll("[data-jump]").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      const target = decodeURIComponent(el.dataset.jump);
      _jumpTo(target);
    });
  });

  // Wire task-clicks: clicking a task label opens the detail panel
  exp.querySelectorAll("[data-task-id]").forEach(el => {
    el.addEventListener("click", e => {
      e.stopPropagation();
      const node = window._nodes.find(n => n.id === el.dataset.taskId);
      if (node && typeof selectNode === "function") {
        selectNode(node, window._nodes, window._links);
      }
    });
  });
}

function _renderExpansion(conns, tasks) {
  const parts = [];

  if (tasks && tasks.length) {
    const items = tasks.map(t => {
      const leadDisp  = t.lead_label || t.lead || "";
      const trackDisp = (t.track || "").toLowerCase() === "single" ? "" : t.track;
      const metaBits  = [t.id, leadDisp, trackDisp, t.rec_only ? "rec-only" : ""].filter(Boolean);
      return `<li>
        <span class="list-task-label" data-task-id="${t.id}">${t.label}</span>
        <span class="list-conn-count">${metaBits.join(" · ")}</span>
      </li>`;
    }).join("");
    parts.push(`<div class="list-conn-block"><div class="list-conn-label">Tasks</div><ul>${items}</ul></div>`);
  }

  const block = (label, entries) => {
    if (!entries.length) return "";
    const items = entries.map(([sentence, meta]) => {
      const pendingTag = meta.pending > 0 ? ` <span class="list-pending">${meta.pending} pending</span>` : "";
      return `<li><span data-jump="${encodeURIComponent(sentence)}">${sentence}</span><span class="list-conn-count">×${meta.count}${pendingTag}</span></li>`;
    }).join("");
    return `<div class="list-conn-block"><div class="list-conn-label">${label}</div><ul>${items}</ul></div>`;
  };
  parts.push(block("Depends on", conns.depends_on));
  parts.push(block("Enables",    conns.enables));
  parts.push(block("Synergy",    conns.synergy));
  if (parts.every(p => !p)) return `<p class="list-no-conns">No tasks or connections.</p>`;
  return parts.join("");
}

function _jumpTo(sentence) {
  const items = document.querySelectorAll("#list-wrap .list-item");
  for (const item of items) {
    const key = decodeURIComponent(item.dataset.key);
    if (key.endsWith("|" + sentence)) {
      item.scrollIntoView({ behavior: "smooth", block: "center" });
      if (!item.classList.contains("expanded")) _toggleExpansion(item);
      item.classList.add("flash");
      setTimeout(() => item.classList.remove("flash"), 800);
      return;
    }
  }
}

// Hide/show items based on current filter state (tiers, leads, rec-only, search)
function applyListFilters() {
  if (!_listBuilt) return;
  const q = (searchQuery || "").toLowerCase();
  const items = document.querySelectorAll("#list-wrap .list-item");
  items.forEach(item => {
    const tier = item.dataset.tier;
    const tierOK = activeTiers.has(tier);
    if (!tierOK) { item.style.display = "none"; return; }

    const key = decodeURIComponent(item.dataset.key);
    const [t, cat, sub, src] = key.split("|");
    const tasks = window._nodes.filter(n =>
      (n.tier || "unknown") === t &&
      (n.category || "Uncategorized") === cat &&
      (n.subheading || "") === sub &&
      (n.source_sentence || "(no source sentence)") === src
    );

    const leadOK = tasks.some(n => activeLeads.has(n.lead));
    const recOK  = !showRecOnly || tasks.some(n => n.rec_only);
    let searchOK = !q;
    if (q) {
      searchOK = src.toLowerCase().includes(q)
              || sub.toLowerCase().includes(q)
              || tasks.some(n => n.label.toLowerCase().includes(q));
    }

    item.style.display = (leadOK && recOK && searchOK) ? "" : "none";
  });

  // Hide empty category/subheading/tier sections
  document.querySelectorAll("#list-wrap .list-cat").forEach(cat => {
    const visible = [...cat.querySelectorAll(".list-item")].some(i => i.style.display !== "none");
    cat.style.display = visible ? "" : "none";
  });
  document.querySelectorAll("#list-wrap .list-tier").forEach(t => {
    const visible = [...t.querySelectorAll(".list-item")].some(i => i.style.display !== "none");
    t.style.display = visible ? "" : "none";
  });
}
