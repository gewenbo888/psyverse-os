// ===== PsyVerse OS — interactions =====
(() => {
  const html = document.documentElement;

  // ---- Bilingual / theme toggles ----
  const setLang = (lang) => {
    html.setAttribute("data-lang", lang);
    document.querySelectorAll(".lang-toggle button").forEach(b => b.classList.toggle("active", b.dataset.lang === lang));
    try { localStorage.setItem("pv-lang", lang); } catch(_) {}
  };
  document.querySelectorAll(".lang-toggle button").forEach(b => b.addEventListener("click", () => setLang(b.dataset.lang)));
  try { const s = localStorage.getItem("pv-lang"); if (s) setLang(s); } catch(_) {}

  const setTheme = (t) => {
    html.setAttribute("data-theme", t);
    document.querySelectorAll(".theme-toggle button").forEach(b => b.classList.toggle("active", b.dataset.themeSet === t));
    try { localStorage.setItem("pv-theme", t); } catch(_) {}
  };
  document.querySelectorAll(".theme-toggle button").forEach(b => b.addEventListener("click", () => setTheme(b.dataset.themeSet)));
  try { const s = localStorage.getItem("pv-theme"); if (s) setTheme(s); } catch(_) {}

  // ===== Neural-universe canvas background =====
  const canvas = document.getElementById("neural-bg");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let nodes = [];
    const NODE_COUNT = Math.min(80, Math.floor((window.innerWidth * window.innerHeight) / 24000));
    const LINK_DIST = 180;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Init nodes — random positions, gentle drift, occasional pulse
    const palette = ["#61f5b3", "#4ec5ff", "#a07ad6"];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: 1 + Math.random() * 1.6,
        color: palette[i % palette.length],
        phase: Math.random() * Math.PI * 2
      });
    }

    let mouse = { x: -10000, y: -10000 };
    window.addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });

    let running = true;
    let lastT = 0;
    const animate = (t) => {
      if (!running) return;
      const dt = Math.min(t - lastT, 32);
      lastT = t;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < LINK_DIST) {
            const alpha = (1 - d / LINK_DIST) * 0.35;
            ctx.strokeStyle = `rgba(97,245,179,${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach(n => {
        // gentle drift
        n.x += n.vx * (dt / 16);
        n.y += n.vy * (dt / 16);
        n.phase += 0.02;
        if (n.x < 0 || n.x > window.innerWidth) n.vx *= -1;
        if (n.y < 0 || n.y > window.innerHeight) n.vy *= -1;

        // mouse repel
        const mdx = n.x - mouse.x, mdy = n.y - mouse.y;
        const md = Math.hypot(mdx, mdy);
        if (md < 100) {
          const f = (1 - md / 100) * 0.6;
          n.x += (mdx / md) * f;
          n.y += (mdy / md) * f;
        }

        const pulse = 0.7 + 0.3 * Math.sin(n.phase);
        ctx.fillStyle = n.color;
        ctx.globalAlpha = 0.55 * pulse;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
        // outer glow
        ctx.globalAlpha = 0.12 * pulse;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 4.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    // Pause when tab hidden — saves CPU
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) running = false;
      else { running = true; lastT = 0; requestAnimationFrame(animate); }
    });
  }

  // ===== Hero counters — illustrative animation, NOT real mainnet data =====
  const counters = [
    { id: "tps",      base: 2400,   wobble: 280  },
    { id: "proofs",   base: 18402,  wobble: 22   },
    { id: "contracts",base: 1284,   wobble: 4    },
    { id: "agents",   base: 3127,   wobble: 18   }
  ];
  const fmt = (n) => n >= 10000 ? n.toLocaleString() : Math.round(n).toString();
  const wobble = () => {
    counters.forEach(c => {
      const el = document.querySelector(`[data-counter="${c.id}"]`);
      if (!el) return;
      const target = c.base + (Math.random() - 0.5) * c.wobble;
      const cur = parseFloat(el.dataset.cur || c.base);
      const next = cur + (target - cur) * 0.15;
      el.dataset.cur = next;
      el.textContent = fmt(next);
    });
  };
  setInterval(wobble, 600);
  wobble();

  // ===== Live state graph (animated SVG state-transition diagram) =====
  const stateEl = document.getElementById("live-state");
  if (stateEl) {
    const W = 1200, H = 540;
    const tlabel = (en, zh, attrs) =>
      `<text ${attrs} lang="en">${en}</text><text ${attrs} lang="zh">${zh}</text>`;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;

    s += `<defs>
      <radialGradient id="nodeG" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#61f5b3" stop-opacity="0.9"/>
        <stop offset="60%" stop-color="#61f5b3" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#61f5b3" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="nodeC" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#4ec5ff" stop-opacity="0.9"/>
        <stop offset="60%" stop-color="#4ec5ff" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#4ec5ff" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="nodeV" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#a07ad6" stop-opacity="0.9"/>
        <stop offset="60%" stop-color="#a07ad6" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#a07ad6" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="edge" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#61f5b3" stop-opacity="0"/>
        <stop offset="50%" stop-color="#61f5b3" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#4ec5ff" stop-opacity="0"/>
      </linearGradient>
    </defs>`;

    // Six state-roots arranged in a hexagonal arc
    const stateNodes = [
      { x: 240,  y: 270, label_en: "state root", label_zh: "状态根", grad: "nodeG", sub_en: "0xa3f2…", sub_zh: "0xa3f2…" },
      { x: 420,  y: 160, label_en: "tx batch",   label_zh: "交易批次", grad: "nodeC", sub_en: "n=512",  sub_zh: "n=512" },
      { x: 600,  y: 250, label_en: "WASM exec",  label_zh: "WASM 执行", grad: "nodeC", sub_en: "Δ ledger", sub_zh: "Δ 账本" },
      { x: 780,  y: 160, label_en: "circuit",    label_zh: "电路", grad: "nodeV", sub_en: "Plonky2",  sub_zh: "Plonky2" },
      { x: 960,  y: 270, label_en: "π proof",    label_zh: "π 证明", grad: "nodeG", sub_en: "succinct", sub_zh: "简洁" },
      { x: 600,  y: 400, label_en: "next root",  label_zh: "新状态根", grad: "nodeG", sub_en: "0xb74e…", sub_zh: "0xb74e…" }
    ];
    const flowOrder = [0,1,2,3,4,5,2];

    // Draw flow arcs
    for (let i = 0; i < flowOrder.length - 1; i++) {
      const a = stateNodes[flowOrder[i]];
      const b = stateNodes[flowOrder[i+1]];
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2 - 20;
      s += `<path d="M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}"
                 fill="none" stroke="url(#edge)" stroke-width="1.4"
                 stroke-dasharray="4 6" opacity="0.85">
        <animate attributeName="stroke-dashoffset" from="0" to="-30" dur="${2.4 + i*0.3}s" repeatCount="indefinite"/>
      </path>`;
    }

    // Draw nodes
    stateNodes.forEach((n, i) => {
      s += `<circle cx="${n.x}" cy="${n.y}" r="58" fill="url(#${n.grad})">
        <animate attributeName="r" values="55;62;55" dur="${2.5 + (i % 3) * 0.4}s" repeatCount="indefinite"/>
      </circle>`;
      s += `<circle cx="${n.x}" cy="${n.y}" r="22" fill="var(--bg-2)" stroke="${n.grad === 'nodeG' ? '#61f5b3' : n.grad === 'nodeC' ? '#4ec5ff' : '#a07ad6'}" stroke-width="1.2"/>`;
      s += tlabel(n.label_en, n.label_zh,
        `x="${n.x}" y="${n.y - 4}" text-anchor="middle" font-family="Cabin Condensed, sans-serif" font-size="13" font-weight="700" fill="var(--ink)"`);
      s += tlabel(n.sub_en, n.sub_zh,
        `x="${n.x}" y="${n.y + 12}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="var(--ink-soft)" letter-spacing="0.5"`);
    });

    // Background ambient particles
    for (let i = 0; i < 60; i++) {
      const px = Math.random() * W;
      const py = Math.random() * H;
      const r = Math.random() * 1.2 + 0.4;
      s += `<circle cx="${px}" cy="${py}" r="${r}" fill="#fafafa" opacity="${(0.1 + Math.random() * 0.18).toFixed(2)}"/>`;
    }

    // Top labels
    s += tlabel("PsyVerse · live state-transition flow",
                "PsyVerse · 实时状态转移流程",
                `x="32" y="40" font-family="JetBrains Mono, monospace" font-size="11" fill="#61f5b3" letter-spacing="2"`);
    s += tlabel("illustrative · architectural schematic",
                "示意 · 架构示意图",
                `x="32" y="58" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--ink-soft)" letter-spacing="1.5" opacity="0.7"`);

    s += `</svg>`;
    stateEl.innerHTML = s;
  }

  // ===== Chain topology graph =====
  const topoEl = document.getElementById("topology");
  if (topoEl) {
    const W = 1200, H = 600;
    const tlabel = (en, zh, attrs) =>
      `<text ${attrs} lang="en">${en}</text><text ${attrs} lang="zh">${zh}</text>`;

    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;
    // Grid background
    s += `<defs>
      <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
        <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(97,245,179,0.05)" stroke-width="1"/>
      </pattern>
    </defs>`;
    s += `<rect width="${W}" height="${H}" fill="url(#grid)"/>`;

    // Coordinator at centre
    const coord = { x: 600, y: 300, label_en: "Coordinator", label_zh: "协调器" };
    // 4 realms in cardinal directions
    const realms = [
      { x: 320, y: 180, label_en: "Realm 0", label_zh: "Realm 0" },
      { x: 880, y: 180, label_en: "Realm 1", label_zh: "Realm 1" },
      { x: 320, y: 420, label_en: "Realm 2", label_zh: "Realm 2" },
      { x: 880, y: 420, label_en: "Realm 3", label_zh: "Realm 3" },
    ];
    // Validators around each realm
    const validators = [];
    realms.forEach((r, idx) => {
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + idx;
        validators.push({
          x: r.x + Math.cos(ang) * 90,
          y: r.y + Math.sin(ang) * 60,
          parent: r,
          color: i === 0 ? "#61f5b3" : i === 1 ? "#4ec5ff" : i === 2 ? "#a07ad6" : "#f0d05e"
        });
      }
    });
    // Provers (off to the right of coord)
    const provers = [
      { x: 1020, y: 280, label_en: "Prover A", label_zh: "证明者 A" },
      { x: 1080, y: 320, label_en: "Prover B", label_zh: "证明者 B" },
      { x: 1040, y: 360, label_en: "Prover C", label_zh: "证明者 C" }
    ];
    // Relayers (left of coord)
    const relayers = [
      { x: 180, y: 280, label_en: "L1 Relayer", label_zh: "L1 中继" },
      { x: 130, y: 320, label_en: "Cross-chain", label_zh: "跨链" }
    ];

    // Edges: coord ↔ realms
    realms.forEach(r => {
      s += `<line x1="${coord.x}" y1="${coord.y}" x2="${r.x}" y2="${r.y}" stroke="#61f5b3" stroke-width="1.2" opacity="0.5" stroke-dasharray="3 4">
        <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="3s" repeatCount="indefinite"/>
      </line>`;
    });
    // realm ↔ validators
    validators.forEach(v => {
      s += `<line x1="${v.parent.x}" y1="${v.parent.y}" x2="${v.x}" y2="${v.y}" stroke="${v.color}" stroke-width="0.8" opacity="0.45"/>`;
    });
    // coord ↔ provers + relayers
    [...provers, ...relayers].forEach(n => {
      s += `<line x1="${coord.x}" y1="${coord.y}" x2="${n.x}" y2="${n.y}" stroke="#a07ad6" stroke-width="0.9" opacity="0.5" stroke-dasharray="2 4">
        <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="2.6s" repeatCount="indefinite"/>
      </line>`;
    });

    // Validators
    validators.forEach(v => {
      s += `<circle cx="${v.x}" cy="${v.y}" r="5.5" fill="${v.color}" opacity="0.85"/>`;
    });
    // Provers
    provers.forEach(p => {
      s += `<rect x="${p.x - 7}" y="${p.y - 7}" width="14" height="14" fill="#a07ad6" opacity="0.85" rx="2"/>`;
      s += tlabel(p.label_en, p.label_zh, `x="${p.x + 14}" y="${p.y + 4}" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--ink-soft)"`);
    });
    // Relayers
    relayers.forEach(r => {
      s += `<polygon points="${r.x},${r.y - 7} ${r.x + 7},${r.y + 5} ${r.x - 7},${r.y + 5}" fill="#4ec5ff" opacity="0.85"/>`;
      s += tlabel(r.label_en, r.label_zh, `x="${r.x - 14}" y="${r.y + 4}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="10" fill="var(--ink-soft)"`);
    });
    // Realms
    realms.forEach(r => {
      s += `<circle cx="${r.x}" cy="${r.y}" r="28" fill="var(--bg-2)" stroke="#4ec5ff" stroke-width="1.4"/>`;
      s += tlabel(r.label_en, r.label_zh, `x="${r.x}" y="${r.y + 4}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="var(--ink)" font-weight="600"`);
    });
    // Coordinator
    s += `<circle cx="${coord.x}" cy="${coord.y}" r="60" fill="url(#nodeG)"/>`;
    s += `<circle cx="${coord.x}" cy="${coord.y}" r="38" fill="var(--bg-2)" stroke="#61f5b3" stroke-width="1.6"/>`;
    s += tlabel(coord.label_en, coord.label_zh, `x="${coord.x}" y="${coord.y - 2}" text-anchor="middle" font-family="Cabin Condensed, sans-serif" font-size="14" font-weight="700" fill="var(--ink)"`);
    s += tlabel("ψ", "ψ", `x="${coord.x}" y="${coord.y + 14}" text-anchor="middle" font-family="Cabin Condensed, sans-serif" font-size="11" fill="#61f5b3" font-weight="700"`);

    // Legend (top-left)
    s += tlabel("Topology · live (illustrative)", "拓扑 · 实时（示意）", `x="32" y="36" font-family="JetBrains Mono, monospace" font-size="11" fill="#61f5b3" letter-spacing="2"`);

    s += `</svg>`;
    topoEl.innerHTML = s;
  }

  // ===== Code panel switcher =====
  const codeTabs = document.querySelectorAll(".code-tab");
  const codePanel = document.getElementById("code-panel");
  const SAMPLES = {
    sdk: {
      en: `<span class="com">// PsyVerse SDK · TypeScript</span>
<span class="kw">import</span> { <span class="fn">Psy</span> } <span class="kw">from</span> <span class="str">"@psyverse/sdk"</span>;

<span class="kw">const</span> psy = <span class="kw">new</span> <span class="fn">Psy</span>({ realm: <span class="num">0</span>, network: <span class="str">"mainnet"</span> });

<span class="kw">const</span> proof = <span class="kw">await</span> psy.<span class="fn">prove</span>({
  <span class="typ">circuit</span>: <span class="str">"private_transfer"</span>,
  <span class="typ">witness</span>: { from, to, amount },
  <span class="typ">recursive</span>: <span class="num">true</span>,
});

<span class="kw">const</span> tx = <span class="kw">await</span> psy.<span class="fn">submit</span>(proof);
<span class="com">// → state root advances</span>`,
      zh: `<span class="com">// PsyVerse SDK · TypeScript</span>
<span class="kw">import</span> { <span class="fn">Psy</span> } <span class="kw">from</span> <span class="str">"@psyverse/sdk"</span>;

<span class="kw">const</span> psy = <span class="kw">new</span> <span class="fn">Psy</span>({ realm: <span class="num">0</span>, network: <span class="str">"mainnet"</span> });

<span class="kw">const</span> proof = <span class="kw">await</span> psy.<span class="fn">prove</span>({
  <span class="typ">circuit</span>: <span class="str">"private_transfer"</span>,
  <span class="typ">witness</span>: { from, to, amount },
  <span class="typ">recursive</span>: <span class="num">true</span>,
});

<span class="kw">const</span> tx = <span class="kw">await</span> psy.<span class="fn">submit</span>(proof);
<span class="com">// → 状态根递进</span>`
    },
    api: {
      en: `<span class="com"># Coordinator JSON-RPC · live state diff</span>
<span class="kw">curl</span> -X POST $PSY_RPC \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{
    "method": "psy_subscribeStateDiff",
    "params": ["realm:0", { "since": "head-1" }]
  }'</span>

<span class="com"># → streams every state-root transition</span>
<span class="com"># → with WASM execution trace + π proof handle</span>`,
      zh: `<span class="com"># 协调器 JSON-RPC · 实时状态差异</span>
<span class="kw">curl</span> -X POST $PSY_RPC \\
  -H <span class="str">"Content-Type: application/json"</span> \\
  -d <span class="str">'{
    "method": "psy_subscribeStateDiff",
    "params": ["realm:0", { "since": "head-1" }]
  }'</span>

<span class="com"># → 流式订阅每一次状态根转移</span>
<span class="com"># → 含 WASM 执行跟踪 + π 证明句柄</span>`
    },
    wasm: {
      en: `<span class="com">;; PsyVerse WASM contract · proof-native</span>
(<span class="kw">module</span>
  (<span class="kw">import</span> <span class="str">"psy"</span> <span class="str">"emit"</span> (<span class="kw">func</span> $emit (<span class="kw">param</span> i64)))
  (<span class="kw">import</span> <span class="str">"psy"</span> <span class="str">"prove"</span> (<span class="kw">func</span> $prove (<span class="kw">param</span> i32 i32) (<span class="kw">result</span> i32)))

  (<span class="kw">func</span> (<span class="kw">export</span> <span class="str">"transfer"</span>)
    (<span class="kw">param</span> $from i64) (<span class="kw">param</span> $to i64) (<span class="kw">param</span> $amount i64)
    <span class="com">;; witness elided — auto-derived</span>
    (<span class="fn">call</span> $emit (<span class="kw">local.get</span> $amount))))`,
      zh: `<span class="com">;; PsyVerse WASM 合约 · 原生证明</span>
(<span class="kw">module</span>
  (<span class="kw">import</span> <span class="str">"psy"</span> <span class="str">"emit"</span> (<span class="kw">func</span> $emit (<span class="kw">param</span> i64)))
  (<span class="kw">import</span> <span class="str">"psy"</span> <span class="str">"prove"</span> (<span class="kw">func</span> $prove (<span class="kw">param</span> i32 i32) (<span class="kw">result</span> i32)))

  (<span class="kw">func</span> (<span class="kw">export</span> <span class="str">"transfer"</span>)
    (<span class="kw">param</span> $from i64) (<span class="kw">param</span> $to i64) (<span class="kw">param</span> $amount i64)
    <span class="com">;; 见证省略——由协议自动派生</span>
    (<span class="fn">call</span> $emit (<span class="kw">local.get</span> $amount))))`
    },
    agent: {
      en: `<span class="com">// AI agent · verifiable inference</span>
<span class="kw">import</span> { <span class="fn">Agent</span>, <span class="fn">verify</span> } <span class="kw">from</span> <span class="str">"@psyverse/agents"</span>;

<span class="kw">const</span> agent = <span class="kw">new</span> <span class="fn">Agent</span>({
  <span class="typ">model</span>: <span class="str">"psy-llm-2"</span>,
  <span class="typ">attestation</span>: <span class="str">"zk-ml"</span>,
});

<span class="kw">const</span> { output, proof } = <span class="kw">await</span> agent.<span class="fn">infer</span>(prompt);

<span class="com">// proof binds: weights hash · input · output</span>
<span class="kw">const</span> ok = <span class="kw">await</span> <span class="fn">verify</span>(proof);
<span class="com">// → ok === true ⟹ output is the model's actual reply</span>`,
      zh: `<span class="com">// AI 代理 · 可验证推理</span>
<span class="kw">import</span> { <span class="fn">Agent</span>, <span class="fn">verify</span> } <span class="kw">from</span> <span class="str">"@psyverse/agents"</span>;

<span class="kw">const</span> agent = <span class="kw">new</span> <span class="fn">Agent</span>({
  <span class="typ">model</span>: <span class="str">"psy-llm-2"</span>,
  <span class="typ">attestation</span>: <span class="str">"zk-ml"</span>,
});

<span class="kw">const</span> { output, proof } = <span class="kw">await</span> agent.<span class="fn">infer</span>(prompt);

<span class="com">// 证明绑定：权重哈希 · 输入 · 输出</span>
<span class="kw">const</span> ok = <span class="kw">await</span> <span class="fn">verify</span>(proof);
<span class="com">// → ok === true ⟹ 输出确为模型真实回复</span>`
    },
    explorer: {
      en: `<span class="com">// State explorer query · GraphQL</span>
<span class="kw">query</span> {
  <span class="fn">stateRoot</span>(realm: <span class="num">0</span>, height: <span class="str">"latest"</span>) {
    hash
    proof { <span class="typ">scheme</span>, <span class="typ">size</span>, <span class="typ">verifyMs</span> }
    diff {
      contracts { address, slot, prev, next }
      events    { topic, payload }
    }
  }
}`,
      zh: `<span class="com">// 状态浏览器查询 · GraphQL</span>
<span class="kw">query</span> {
  <span class="fn">stateRoot</span>(realm: <span class="num">0</span>, height: <span class="str">"latest"</span>) {
    hash
    proof { <span class="typ">scheme</span>, <span class="typ">size</span>, <span class="typ">verifyMs</span> }
    diff {
      contracts { address, slot, prev, next }
      events    { topic, payload }
    }
  }
}`
    }
  };
  const setCode = (key) => {
    if (!codePanel || !SAMPLES[key]) return;
    codeTabs.forEach(t => t.classList.toggle("active", t.dataset.code === key));
    const lang = html.getAttribute("data-lang") === "zh" ? "zh" : "en";
    codePanel.innerHTML = `<pre>${SAMPLES[key][lang]}</pre>`;
  };
  codeTabs.forEach(t => t.addEventListener("click", () => setCode(t.dataset.code)));
  // Re-render code on language switch
  document.querySelectorAll(".lang-toggle button").forEach(b => b.addEventListener("click", () => {
    const active = document.querySelector(".code-tab.active");
    if (active) setCode(active.dataset.code);
  }));
  setCode("sdk");
})();
