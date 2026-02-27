import { useState, useEffect, useRef, useCallback } from "react";

const API_BASE = (typeof window !== "undefined" && window.__API_BASE__) ? window.__API_BASE__ : "";
const api = {
  post: async (path, body) => {
    const r = await fetch(`${API_BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const json = await r.json();
    return json.data ?? json;
  },
};

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #060A12; --bg2: #0A0F1C; --bg3: #0D1526;
    --surface: rgba(255,255,255,0.032); --surface2: rgba(255,255,255,0.055);
    --surface-hover: rgba(255,255,255,0.06);
    --border: rgba(255,255,255,0.07); --border-bright: rgba(255,255,255,0.14);
    --text: #E4EAF4; --text2: #9AAAC2; --muted: #5A6A88;
    --blue: #3B82F6; --violet: #8B5CF6; --green: #10B981; --red: #EF4444;
    --yellow: #F59E0B; --cyan: #06B6D4; --pink: #EC4899;
    --font-d: 'Syne', sans-serif; --font-b: 'DM Sans', sans-serif; --font-m: 'JetBrains Mono', monospace;
    --r: 14px; --r-sm: 9px; --r-lg: 20px;
    --sidebar-w: 230px; --topbar-h: 58px;
    --shadow: 0 8px 40px rgba(0,0,0,0.5); --shadow-sm: 0 4px 20px rgba(0,0,0,0.35);
    --glow-b: 0 0 40px rgba(59,130,246,0.12); --glow-p: 0 0 40px rgba(139,92,246,0.12);
    --glow-g: 0 0 40px rgba(16,185,129,0.1);
    --t: 0.2s cubic-bezier(.4,0,.2,1);
  }
  html, body, #root { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font-b); -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.09); border-radius: 99px; }

  /* LAYOUT */
  .app { display: grid; grid-template-columns: var(--sidebar-w) 1fr; grid-template-rows: var(--topbar-h) 1fr; grid-template-areas: "sidebar topbar" "sidebar content"; height: 100vh; overflow: hidden; }
  .app.sc { grid-template-columns: 58px 1fr; }

  /* SIDEBAR */
  .sidebar { grid-area: sidebar; background: rgba(6,10,18,0.97); border-right: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; z-index: 20; }
  .sb-logo { height: var(--topbar-h); padding: 0 16px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
  .logo-mark { width: 30px; height: 30px; flex-shrink: 0; background: linear-gradient(135deg,#3B82F6,#8B5CF6); border-radius: 8px; display: grid; place-items: center; font-family: var(--font-d); font-weight: 800; font-size: 12px; color: #fff; box-shadow: 0 0 16px rgba(59,130,246,0.35); }
  .logo-txt { font-family: var(--font-d); font-weight: 700; font-size: 14px; background: linear-gradient(90deg,#fff,#8B9EC4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; white-space: nowrap; overflow: hidden; transition: opacity var(--t); }
  .sc .logo-txt { opacity:0; width:0; }
  .nav-sec { padding: 12px 10px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
  .nav-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: 0.11em; color: var(--muted); text-transform: uppercase; padding: 10px 10px 6px; white-space: nowrap; overflow: hidden; transition: opacity var(--t); }
  .sc .nav-lbl { opacity:0; }
  .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: var(--r-sm); cursor: pointer; transition: all var(--t); border: 1px solid transparent; font-size: 13px; font-weight: 500; color: var(--muted); white-space: nowrap; overflow: hidden; position: relative; }
  .nav-item:hover { color: var(--text); background: var(--surface-hover); }
  .nav-item.active { color: #E0EAFF; background: linear-gradient(100deg,rgba(59,130,246,0.18),rgba(139,92,246,0.09)); border-color: rgba(59,130,246,0.22); }
  .nav-item.active::before { content:''; position: absolute; left:0; top:20%; bottom:20%; width:2.5px; background: linear-gradient(180deg,#3B82F6,#8B5CF6); border-radius: 0 2px 2px 0; }
  .nav-icon { width: 18px; height: 18px; flex-shrink: 0; }
  .nlbl { transition: opacity var(--t); }
  .sc .nlbl { opacity:0; width:0; overflow:hidden; }
  .sb-foot { padding: 10px; border-top: 1px solid var(--border); flex-shrink: 0; }

  /* TOPBAR */
  .topbar { grid-area: topbar; height: var(--topbar-h); background: rgba(6,10,18,0.92); border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; padding: 0 20px 0 24px; backdrop-filter: blur(20px); gap: 12px; z-index: 10; }
  .tb-bread { display: flex; align-items: center; gap: 6px; font-family: var(--font-d); font-weight: 700; font-size: 15px; color: var(--text); white-space: nowrap; }
  .tb-bread .sep { color: var(--muted); font-weight: 300; }
  .tb-bread .mod { color: var(--text2); font-size: 13px; font-weight: 500; font-family: var(--font-b); }
  .tb-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .status-pill { display: flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 99px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); font-size: 11.5px; font-weight: 600; color: #34D399; }
  .sdot { width: 6px; height: 6px; border-radius: 50%; background: #10B981; box-shadow: 0 0 6px #10B981; animation: pdot 2.5s ease-in-out infinite; }
  @keyframes pdot { 0%,100%{opacity:1;transform:scale(1);}50%{opacity:.5;transform:scale(0.8);} }

  /* CONTENT */
  .content { grid-area: content; overflow-y: auto; background: var(--bg); padding: 28px; }

  /* PAGE */
  .ph { margin-bottom: 24px; }
  .pt { font-family: var(--font-d); font-weight: 800; font-size: 24px; background: linear-gradient(90deg,#fff,#8B9EC4 80%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; line-height: 1.2; margin-bottom: 4px; }
  .ps { font-size: 13px; color: var(--muted); line-height: 1.5; }

  /* CARDS */
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r); padding: 20px; backdrop-filter: blur(12px); transition: border-color var(--t), box-shadow var(--t); position: relative; overflow: hidden; }
  .card:hover { border-color: var(--border-bright); }
  .card.gb { box-shadow: var(--glow-b); }
  .card.gp { box-shadow: var(--glow-p); }
  .card.gg { box-shadow: var(--glow-g); }
  .chd { display: flex; align-items: center; gap: 8px; font-family: var(--font-d); font-weight: 700; font-size: 13px; color: #C4CFDE; margin-bottom: 18px; }
  .chi { width: 28px; height: 28px; border-radius: 7px; display: grid; place-items: center; flex-shrink: 0; }

  /* GRIDS */
  .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .g4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
  .gg-sm { gap: 10px; }
  .ig { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

  /* FORMS */
  .fld { display: flex; flex-direction: column; gap: 6px; }
  .fld+.fld { margin-top: 12px; }
  .fl { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.09em; }
  .input,.select { width: 100%; padding: 9px 13px; background: rgba(255,255,255,0.04); border: 1px solid var(--border); border-radius: var(--r-sm); color: var(--text); font-family: var(--font-b); font-size: 13px; outline: none; transition: all var(--t); -webkit-appearance: none; appearance: none; }
  .input:focus,.select:focus { border-color: rgba(59,130,246,0.5); background: rgba(59,130,246,0.05); box-shadow: 0 0 0 3px rgba(59,130,246,0.09); }
  .input::placeholder { color: var(--muted); }
  .select { cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%235A6A88' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 11px center; padding-right: 32px; }
  .select option { background: #0D1425; }
  .mono { font-family: var(--font-m); }

  /* SLIDERS */
  .sw { display: flex; flex-direction: column; gap: 6px; }
  .sw+.sw { margin-top: 12px; }
  .st { display: flex; align-items: center; justify-content: space-between; }
  .sv { font-size: 12px; font-weight: 700; color: #60A5FA; font-family: var(--font-d); background: rgba(59,130,246,0.12); padding: 2px 7px; border-radius: 5px; border: 1px solid rgba(59,130,246,0.2); }
  input[type=range] { -webkit-appearance: none; width: 100%; height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; outline: none; cursor: pointer; }
  input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 15px; height: 15px; border-radius: 50%; background: linear-gradient(135deg,#3B82F6,#8B5CF6); cursor: pointer; box-shadow: 0 0 0 3px rgba(59,130,246,0.2); transition: transform 0.15s ease; }
  input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.25); }

  /* BUTTONS */
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 9px 18px; border-radius: var(--r-sm); font-family: var(--font-b); font-weight: 600; font-size: 13px; cursor: pointer; border: none; transition: all var(--t); white-space: nowrap; }
  .btn-p { background: linear-gradient(135deg,#3B82F6,#6366F1); color: #fff; box-shadow: 0 3px 14px rgba(59,130,246,0.28); }
  .btn-p:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(59,130,246,0.42); }
  .btn-p:disabled { opacity: 0.45; cursor: not-allowed; }
  .btn-g { background: var(--surface); border: 1px solid var(--border); color: var(--text2); }
  .btn-g:hover { background: var(--surface-hover); border-color: var(--border-bright); color: var(--text); }
  .btn-buy { background: linear-gradient(135deg,#065f46,#047857); color: #34D399; border: 1px solid rgba(16,185,129,0.3); font-weight: 700; font-size: 14px; padding: 12px 24px; }
  .btn-buy:hover { background: linear-gradient(135deg,#047857,#059669); box-shadow: 0 0 20px rgba(16,185,129,0.25); transform: translateY(-1px); }
  .btn-sell { background: linear-gradient(135deg,#7f1d1d,#991b1b); color: #F87171; border: 1px solid rgba(239,68,68,0.3); font-weight: 700; font-size: 14px; padding: 12px 24px; }
  .btn-sell:hover { background: linear-gradient(135deg,#991b1b,#b91c1c); box-shadow: 0 0 20px rgba(239,68,68,0.25); transform: translateY(-1px); }
  .btn-full { width: 100%; }
  .btng { display: flex; gap: 6px; }

  /* BADGES */
  .badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 99px; font-size: 11px; font-weight: 700; letter-spacing: 0.03em; border: 1px solid; }
  .bb { background: rgba(59,130,246,0.13); color: #60A5FA; border-color: rgba(59,130,246,0.22); }
  .bg { background: rgba(16,185,129,0.13); color: #34D399; border-color: rgba(16,185,129,0.22); }
  .br { background: rgba(239,68,68,0.13); color: #F87171; border-color: rgba(239,68,68,0.22); }
  .by { background: rgba(245,158,11,0.13); color: #FCD34D; border-color: rgba(245,158,11,0.22); }
  .bpu { background: rgba(139,92,246,0.13); color: #A78BFA; border-color: rgba(139,92,246,0.22); }
  .bc { background: rgba(6,182,212,0.13); color: #22D3EE; border-color: rgba(6,182,212,0.22); }
  .bsm { font-size: 9px; padding: 2px 7px; }

  /* RESULT */
  .rp { background: rgba(59,130,246,0.04); border: 1px solid rgba(59,130,246,0.12); border-radius: var(--r-sm); overflow: hidden; animation: fup 0.3s ease; }
  @keyframes fup { from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)} }
  .rr { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); gap: 12px; }
  .rr:last-child { border-bottom: none; }
  .rk { font-size: 10.5px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.09em; flex-shrink: 0; }
  .rv { font-size: 13px; color: var(--text); text-align: right; line-height: 1.5; }
  .rb { padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 5px; }
  .rb:last-child { border-bottom: none; }

  /* PROGRESS */
  .prog { height: 5px; background: rgba(255,255,255,0.07); border-radius: 99px; overflow: hidden; }
  .prog.md { height: 7px; } .prog.lg { height: 10px; }
  .pf { height: 100%; border-radius: 99px; transition: width 1s cubic-bezier(.4,0,.2,1); }
  .pb { background: linear-gradient(90deg,#3B82F6,#6366F1); }
  .pg { background: linear-gradient(90deg,#10B981,#06B6D4); }
  .pp { background: linear-gradient(90deg,#8B5CF6,#EC4899); }
  .py { background: linear-gradient(90deg,#F59E0B,#EF4444); }

  /* XP */
  .xpt { height: 8px; background: rgba(255,255,255,0.06); border-radius: 99px; overflow: hidden; position: relative; }
  .xpf { height: 100%; background: linear-gradient(90deg,#3B82F6,#8B5CF6,#EC4899); border-radius: 99px; transition: width 1.3s cubic-bezier(.4,0,.2,1); position: relative; }
  .xpf::after { content:''; position: absolute; right:0; top:0; bottom:0; width:16px; background: linear-gradient(90deg,transparent,rgba(255,255,255,0.3)); border-radius: 99px; }

  /* SPINNER */
  .spin { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.12); border-top-color: #3B82F6; border-radius: 50%; animation: sp 0.65s linear infinite; flex-shrink: 0; }
  @keyframes sp { to{transform:rotate(360deg)} }

  /* TOAST */
  .tc { position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 6px; pointer-events: none; }
  .toast { display: flex; align-items: center; gap: 9px; padding: 11px 16px; border-radius: var(--r-sm); font-size: 13px; font-weight: 500; backdrop-filter: blur(20px); border: 1px solid; animation: sir 0.3s ease, fot 0.35s ease 2.65s forwards; max-width: 320px; pointer-events: all; box-shadow: var(--shadow-sm); }
  .ts { background: rgba(16,185,129,0.14); border-color: rgba(16,185,129,0.28); color: #34D399; }
  .te { background: rgba(239,68,68,0.14); border-color: rgba(239,68,68,0.28); color: #F87171; }
  .ti { background: rgba(59,130,246,0.14); border-color: rgba(59,130,246,0.28); color: #60A5FA; }
  @keyframes sir { from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)} }
  @keyframes fot { to{opacity:0;transform:translateX(10px)} }

  /* BANNERS */
  .ib { display: flex; align-items: flex-start; gap: 10px; padding: 11px 14px; background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.15); border-radius: var(--r-sm); font-size: 12.5px; color: #93C5FD; line-height: 1.6; margin-bottom: 16px; }
  .wb { display: flex; align-items: flex-start; gap: 10px; padding: 11px 14px; background: rgba(245,158,11,0.07); border: 1px solid rgba(245,158,11,0.18); border-radius: var(--r-sm); font-size: 12px; color: #FCD34D; line-height: 1.6; }

  /* QUIZ */
  .qo { display: flex; align-items: center; gap: 10px; padding: 11px 13px; border-radius: var(--r-sm); border: 1px solid var(--border); cursor: pointer; transition: all var(--t); margin-bottom: 7px; font-size: 13px; line-height: 1.4; }
  .qo:hover { background: var(--surface-hover); border-color: var(--border-bright); }
  .qo.sel { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.38); color: #93C5FD; }
  .ok-key { width: 24px; height: 24px; border-radius: 6px; background: rgba(255,255,255,0.07); display: grid; place-items: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
  .qdot { width: 34px; height: 34px; border-radius: 8px; display: grid; place-items: center; cursor: pointer; font-size: 12.5px; font-weight: 700; font-family: var(--font-d); transition: all var(--t); border: 1px solid transparent; }

  /* MISC */
  .mv { font-family: var(--font-d); font-size: 30px; font-weight: 800; line-height: 1; }
  .ml { font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
  .sb { font-family: var(--font-d); font-size: 46px; font-weight: 800; line-height: 1; }
  .sl { font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 5px; }
  .div { height: 1px; background: var(--border); margin: 14px 0; }
  .cb { margin-bottom: 13px; }
  .ch2 { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
  .cn { font-size: 11.5px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.05em; }
  .cs { font-size: 12px; font-weight: 700; font-family: var(--font-d); }
  .bpill { display: flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 8px; font-size: 11.5px; font-weight: 600; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.09); transition: all var(--t); cursor: default; }
  .bpill:hover { background: rgba(255,255,255,0.09); transform: translateY(-1px); }
  .bgrid { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
  .dbtns { display: flex; gap: 6px; }
  .dbtn { flex: 1; padding: 8px 6px; border-radius: var(--r-sm); font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid var(--border); background: var(--surface); color: var(--muted); transition: all var(--t); }
  .dbtn:hover { color: var(--text); border-color: var(--border-bright); }
  .dbtn.ab { background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.35); color: #34D399; }
  .dbtn.as { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.35); color: #F87171; }
  .dbtn.ah { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.35); color: #FCD34D; }
  .sc-circle { width: 110px; height: 110px; border-radius: 50%; background: conic-gradient(from 180deg,#3B82F6,#8B5CF6,#3B82F6); display: grid; place-items: center; margin: 0 auto 10px; box-shadow: 0 0 40px rgba(59,130,246,0.2); position: relative; }
  .sc-circle::before { content:''; position: absolute; inset: 6px; border-radius: 50%; background: var(--bg2); }
  .sc-in { position: relative; z-index: 1; text-align: center; }
  .sc-n { font-family: var(--font-d); font-size: 26px; font-weight: 800; color: #fff; }
  .sc-d { font-size: 10px; color: var(--muted); }
  .ac { padding: 10px 12px; border-radius: var(--r-sm); margin-bottom: 8px; }
  .ao { background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.18); }
  .ab2 { background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.18); }
  .mmini { padding: 16px 18px; display: flex; flex-direction: column; gap: 6px; }
  .fade-in { animation: fin 0.35s ease both; }
  @keyframes fin { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
  .empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; gap: 10px; color: var(--muted); }
  .empty p { font-size: 13px; text-align: center; }

  /* ── INDICATOR EXPLAINER ENHANCEMENTS ── */
  .ind-gauge-wrap { display: flex; flex-direction: column; align-items: center; padding: 16px 0 8px; }
  .ind-gauge { position: relative; width: 160px; height: 80px; }
  .gauge-val { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); font-family: var(--font-d); font-size: 28px; font-weight: 800; color: #fff; line-height: 1; }
  .gauge-lbl { font-size: 10px; color: var(--muted); margin-top: 4px; text-align: center; text-transform: uppercase; letter-spacing: 0.1em; }
  .signal-card { padding: 14px 16px; border-radius: 12px; border: 1px solid; margin-bottom: 10px; display: flex; align-items: center; gap: 12px; transition: all var(--t); }
  .signal-card:hover { transform: translateX(2px); }
  .signal-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .ind-tabs { display: flex; gap: 3px; background: rgba(255,255,255,0.04); padding: 4px; border-radius: var(--r-sm); margin-bottom: 16px; }
  .ind-tab { flex: 1; padding: 7px 10px; border-radius: 7px; cursor: pointer; font-size: 12px; font-weight: 600; text-align: center; transition: all var(--t); color: var(--muted); border: 1px solid transparent; }
  .ind-tab.a { background: rgba(59,130,246,0.18); color: #60A5FA; border-color: rgba(59,130,246,0.2); }
  .ind-tab:hover:not(.a) { color: var(--text2); background: var(--surface-hover); }
  .zone-bar { height: 10px; border-radius: 99px; overflow: hidden; background: linear-gradient(90deg,#EF4444 0%,#F59E0B 20%,#10B981 40%,#10B981 60%,#F59E0B 80%,#EF4444 100%); position: relative; margin: 8px 0 4px; }
  .zone-needle { position: absolute; top: -4px; width: 3px; height: 18px; background: #fff; border-radius: 99px; transform: translateX(-50%); box-shadow: 0 0 8px rgba(255,255,255,0.6); transition: left 1s cubic-bezier(.4,0,.2,1); }
  .zone-labels { display: flex; justify-content: space-between; font-size: 10px; color: var(--muted); }
  .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .detail-row:last-child { border-bottom: none; }
  .detail-key { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
  .detail-val { font-size: 13px; color: var(--text); font-family: var(--font-m); }

  /* ── TRADING PLAYGROUND ── */
  .playground-layout { display: grid; grid-template-columns: 1fr 300px; gap: 16px; height: calc(100vh - 200px); min-height: 580px; }
  .chart-panel { display: flex; flex-direction: column; gap: 0; background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r); overflow: hidden; }
  .chart-topbar { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-bottom: 1px solid var(--border); background: rgba(0,0,0,0.3); flex-shrink: 0; flex-wrap: wrap; }
  .chart-symbol { font-family: var(--font-d); font-weight: 800; font-size: 16px; color: #fff; }
  .chart-price { font-family: var(--font-m); font-size: 20px; font-weight: 600; }
  .chart-change { font-size: 12px; font-weight: 700; padding: 2px 8px; border-radius: 6px; }
  .tf-btns { display: flex; gap: 2px; margin-left: auto; }
  .tf-btn { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; border: 1px solid transparent; color: var(--muted); background: transparent; transition: all var(--t); font-family: var(--font-m); }
  .tf-btn.a { background: rgba(59,130,246,0.2); color: #60A5FA; border-color: rgba(59,130,246,0.3); }
  .tf-btn:hover:not(.a) { color: var(--text); background: var(--surface-hover); }
  .chart-wrap { flex: 1; position: relative; cursor: crosshair; overflow: hidden; min-height: 0; }
  canvas { display: block; }
  .crosshair-tooltip { position: absolute; pointer-events: none; background: rgba(10,15,28,0.95); border: 1px solid var(--border-bright); border-radius: 8px; padding: 8px 12px; font-size: 11.5px; font-family: var(--font-m); color: var(--text); white-space: nowrap; z-index: 10; box-shadow: var(--shadow-sm); }
  .crosshair-tooltip .th { color: var(--muted); font-size: 10px; margin-bottom: 4px; }
  .crosshair-tooltip .tr { display: flex; gap: 8px; margin-bottom: 2px; }
  .crosshair-tooltip .tk { color: var(--muted); }
  .crosshair-tooltip .tv { color: var(--text); }
  .chart-bottom { padding: 10px 16px; border-top: 1px solid var(--border); background: rgba(0,0,0,0.2); display: flex; align-items: center; gap: 16px; flex-shrink: 0; flex-wrap: wrap; }
  .ohlc-val { display: flex; gap: 4px; align-items: center; font-size: 11.5px; font-family: var(--font-m); }
  .ohlc-k { color: var(--muted); }
  .crosshair-lines { position: absolute; inset: 0; pointer-events: none; }

  /* RIGHT PANEL */
  .right-panel { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; }
  .trade-form { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r); padding: 16px; }
  .price-display { background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; text-align: center; margin-bottom: 12px; }
  .price-big { font-family: var(--font-m); font-size: 22px; font-weight: 600; }
  .pnl-display { padding: 10px 14px; border-radius: 10px; text-align: center; margin-bottom: 10px; }
  .pnl-positive { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); }
  .pnl-negative { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); }
  .pnl-num { font-family: var(--font-m); font-size: 18px; font-weight: 700; }
  .trade-hist { background: var(--bg2); border: 1px solid var(--border); border-radius: var(--r); padding: 14px; flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .hist-list { overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
  .hist-item { padding: 8px 10px; border-radius: 8px; font-size: 11.5px; }
  .hist-item.win { background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.15); }
  .hist-item.loss { background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.15); }
  .hist-row { display: flex; justify-content: space-between; align-items: center; }
  .conf-wrap { margin: 10px 0; }
  .conf-bar-bg { height: 6px; background: rgba(255,255,255,0.08); border-radius: 99px; overflow: hidden; margin-top: 4px; }
  .conf-bar-fill { height: 100%; border-radius: 99px; transition: width var(--t); }
  .signal-alert { padding: 8px 12px; border-radius: 8px; font-size: 11.5px; display: flex; gap: 8px; align-items: flex-start; animation: fin 0.3s ease; margin-bottom: 8px; }
  .signal-alert.bull { background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); color: #34D399; }
  .signal-alert.bear { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #F87171; }
  .signal-alert.neut { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); color: #FCD34D; }
  .qty-ctrl { display: flex; align-items: center; gap: 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--border); border-radius: 8px; padding: 4px; }
  .qty-btn { width: 28px; height: 28px; border-radius: 6px; border: none; background: var(--surface); color: var(--text); cursor: pointer; font-size: 16px; display: grid; place-items: center; transition: all var(--t); }
  .qty-btn:hover { background: var(--surface-hover); color: #60A5FA; }
  .qty-val { flex: 1; text-align: center; font-family: var(--font-m); font-weight: 700; font-size: 14px; }

  /* ── GITHUB HEATMAP ── */
  .heatmap-wrap { overflow-x: auto; padding-bottom: 8px; }
  .heatmap-grid { display: flex; gap: 3px; }
  .hm-col { display: flex; flex-direction: column; gap: 3px; }
  .hm-cell { width: 12px; height: 12px; border-radius: 2px; cursor: pointer; transition: transform 0.1s ease; flex-shrink: 0; }
  .hm-cell:hover { transform: scale(1.4); z-index: 1; position: relative; }
  .hm-month-labels { display: flex; gap: 3px; margin-bottom: 4px; padding-left: 24px; }
  .hm-month { font-size: 10px; color: var(--muted); font-weight: 500; }
  .hm-day-labels { display: flex; flex-direction: column; gap: 3px; margin-right: 6px; padding-top: 0px; }
  .hm-day { font-size: 10px; color: var(--muted); height: 12px; display: flex; align-items: center; }
  .hm-row { display: flex; align-items: flex-start; gap: 0; }
  .hm-tooltip { position: fixed; background: rgba(10,15,28,0.95); border: 1px solid var(--border-bright); border-radius: 8px; padding: 7px 11px; font-size: 11.5px; color: var(--text); pointer-events: none; z-index: 1000; white-space: nowrap; box-shadow: var(--shadow-sm); }
  .streak-summary { display: flex; gap: 16px; flex-wrap: wrap; margin-top: 14px; }
  .streak-stat { display: flex; flex-direction: column; gap: 2px; }
  .streak-stat-val { font-family: var(--font-d); font-size: 22px; font-weight: 800; }
  .streak-stat-lbl { font-size: 10.5px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
  .contrib-legend { display: flex; align-items: center; gap: 5px; margin-top: 10px; }
  .legend-lbl { font-size: 10.5px; color: var(--muted); }

  @media (max-width: 1100px) {
    .playground-layout { grid-template-columns: 1fr; height: auto; }
    .right-panel { flex-direction: row; flex-wrap: wrap; overflow-y: visible; }
    .trade-form { flex: 1; min-width: 240px; }
    .trade-hist { flex: 1; min-width: 240px; min-height: 200px; }
  }
  @media (max-width: 1024px) {
    :root { --sidebar-w: 58px; }
    .logo-txt, .nav-lbl { opacity:0; width:0; overflow:hidden; }
    .nlbl { opacity:0; width:0; overflow:hidden; }
    .tb-bread .mod { display: none; }
    .g3 { grid-template-columns: 1fr 1fr; }
    .g4 { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 768px) {
    :root { --sidebar-w: 0px; }
    .app { grid-template-columns: 0 1fr; }
    .sidebar { display: none; }
    .content { padding: 14px; }
    .g2,.g3,.g4 { grid-template-columns: 1fr; }
    .topbar { padding: 0 14px; }
    .playground-layout { grid-template-columns: 1fr; }
  }
  @media (max-width: 480px) {
    .content { padding: 10px; }
    .pt { font-size: 20px; }
  }
`;

// ─── ICONS ────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = "currentColor" }) => {
  const p = { stroke: color, strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", fill: "none" };
  const icons = {
    chart:    <><path d="M3 3v18h18" {...p}/><path d="M7 16l4-5 4 4 5-6" {...p}/></>,
    brain:    <><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" {...p}/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" {...p}/></>,
    target:   <><circle cx="12" cy="12" r="10" {...p}/><circle cx="12" cy="12" r="6" {...p}/><circle cx="12" cy="12" r="2" {...p}/></>,
    trending: <><path d="M22 7l-9 9-4-4-6 6" {...p}/><path d="M17 7h5v5" {...p}/></>,
    quiz:     <><path d="M9 11l3 3L22 4" {...p}/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" {...p}/></>,
    flame:    <><path d="M8.5 14.5A4.5 4.5 0 0 0 12 18a4.5 4.5 0 0 0 4.5-4.5c0-1.5-.5-3-1.5-4-1 1.5-2.083 2.5-3.5 2.5-1.5 0-2.5-1-3-3 0 0-1.5 2 0 4.5" {...p}/><path d="M12 2s-5 5-5 10a7 7 0 0014 0c0-5-5-10-5-10" {...p}/></>,
    zap:      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" {...p}/>,
    check:    <path d="M20 6L9 17l-5-5" {...p}/>,
    x:        <path d="M18 6L6 18M6 6l12 12" {...p}/>,
    info:     <><circle cx="12" cy="12" r="10" {...p}/><path d="M12 16v-4M12 8h.01" {...p}/></>,
    menu:     <path d="M4 6h16M4 12h16M4 18h16" {...p}/>,
    award:    <><circle cx="12" cy="8" r="6" {...p}/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" {...p}/></>,
    chevron:  <path d="M9 18l6-6-6-6" {...p}/>,
    collapse: <path d="M15 18l-6-6 6-6" {...p}/>,
    plus:     <path d="M12 5v14M5 12h14" {...p}/>,
    minus:    <path d="M5 12h14" {...p}/>,
    arrow_up: <path d="M12 19V5M5 12l7-7 7 7" {...p}/>,
    alert:    <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" {...p}/><path d="M12 9v4M12 17h.01" {...p}/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" className="nav-icon">{icons[name]||null}</svg>;
};

// ─── TOAST ────────────────────────────────────────────────────────────────────
let _addToast = null;
const Toast = () => {
  const [toasts, setToasts] = useState([]);
  _addToast = (msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  };
  return (
    <div className="tc">
      {toasts.map(t => (
        <div key={t.id} className={`toast t${t.type[0]}`}>
          <Icon name={t.type==="success"?"check":t.type==="error"?"x":"info"} size={14} />
          {t.msg}
        </div>
      ))}
    </div>
  );
};
const toast = (msg, type) => _addToast?.(msg, type);

// ─── SHARED ───────────────────────────────────────────────────────────────────
const Spinner = () => <div className="spin"/>;
const Fld = ({ label, children }) => <div className="fld"><label className="fl">{label}</label>{children}</div>;
const Slider = ({ label, name, value, onChange, min=0, max=1, step=0.01 }) => (
  <div className="sw">
    <div className="st"><label className="fl" style={{margin:0}}>{label}</label><span className="sv">{parseFloat(value).toFixed(2)}</span></div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(name, parseFloat(e.target.value))}/>
  </div>
);
const SignalBadge = ({ signal }) => {
  const map = { BULLISH:"bg", BEARISH:"br", NEUTRAL:"by", OVERBOUGHT:"br", OVERSOLD:"bg", BUY:"bg", SELL:"br", HOLD:"by", WAIT:"by", HIGH:"bb", MEDIUM:"by", LOW:"bpu", CORRECT:"bg", INCORRECT:"br", STRONG:"bb", MODERATE:"by", WEAK:"br", UNRELIABLE:"br", ADVANCED:"bc", INTERMEDIATE:"bb", BEGINNER:"by", CALIBRATED:"bg", OVERCONFIDENT:"br", UNDERCONFIDENT:"bpu" };
  return <span className={`badge ${map[signal]||"bb"}`}>{signal}</span>;
};
const RRow = ({ label, value, isSignal }) => <div className="rr"><span className="rk">{label}</span><span className="rv">{isSignal?<SignalBadge signal={value}/>:value}</span></div>;
const RBlock = ({ label, children }) => <div className="rb"><span className="rk">{label}</span><div>{children}</div></div>;
const Empty = ({ icon="chart", text="Configure and run analysis" }) => <div className="empty"><Icon name={icon} size={36} color="#2A3450"/><p>{text}</p></div>;
const ProgBar = ({ val, cls="pb", size="" }) => <div className={`prog ${size}`}><div className={`pf ${cls}`} style={{width:`${Math.min(Math.max(val,0),100)}%`}}/></div>;

// ─── QUIZ DATA ────────────────────────────────────────────────────────────────
const QUIZ_Q = [
  { id:"q1", text:"An RSI reading of 78 indicates which condition?", opts:["Oversold","Neutral","Overbought","Trending"], ans:"C", topic:"RSI", diff:"EASY", exp:"RSI above 70 indicates overbought conditions where price momentum may be exhausted." },
  { id:"q2", text:"What is variance drag in high-volatility environments?", opts:["Transaction cost increase","Reduction in compounded returns from volatility","Moving average lag","Bid-ask spread widening"], ans:"B", topic:"VOLATILITY", diff:"MEDIUM", exp:"Variance drag is the mathematical reduction in compounded returns caused by volatility. A 20% gain then 20% loss = -4% net, not breakeven." },
  { id:"q3", text:"A risk score of 0.85 should primarily affect which parameter?", opts:["Entry timing only","Position sizing and stop-loss","Trade direction","Holding period"], ans:"B", topic:"RISK", diff:"MEDIUM", exp:"High risk scores signal elevated exposure. Primary response: reduce position size and tighten stop-loss parameters." },
];
const KEYS = ["A","B","C","D"];

// ════════════════════════════════════════════════════════════════════
// PAGE 1: INDICATOR EXPLAINER — ENHANCED
// ════════════════════════════════════════════════════════════════════
const INDICATOR_DEFS = {
  RSI: {
    name: "Relative Strength Index",
    desc: "Momentum oscillator measuring speed and magnitude of price changes on a 0–100 scale.",
    zones: [{ label: "Oversold", range: [0,30], color: "#10B981" }, { label: "Neutral", range: [30,70], color: "#F59E0B" }, { label: "Overbought", range: [70,100], color: "#EF4444" }],
    min: 0, max: 100, unit: "",
    getSignal: (v) => v >= 70 ? { signal:"OVERBOUGHT", bias:"HOLD", conf:"MEDIUM", color:"#EF4444" } : v <= 30 ? { signal:"OVERSOLD", bias:"BUY", conf:"HIGH", color:"#10B981" } : { signal:"NEUTRAL", bias:"HOLD", conf:"LOW", color:"#F59E0B" },
    interpretation: (v) => v >= 70 ? `RSI at ${v} is in overbought territory. Upward momentum shows signs of exhaustion. Consider reducing longs or awaiting price action confirmation before adding.` : v <= 30 ? `RSI at ${v} signals oversold conditions. Selling pressure may be exhausted. A reversal or bounce from support levels is statistically probable.` : `RSI at ${v} is in neutral territory. No extreme conditions present. Follow the prevailing trend and wait for decisive momentum to enter positions.`,
    risk: (v) => v >= 80 ? "Extreme overbought — RSI can diverge significantly before reversing in strong trends." : v <= 20 ? "Deeply oversold — watch for capitulation and volume spike as reversal signals." : "Neutral zone — RSI alone is insufficient. Combine with price structure and volume.",
    tips: ["RSI divergence (price makes new high, RSI doesn't) is a powerful reversal signal", "In trending markets, overbought can stay overbought for extended periods", "Best used on daily/weekly timeframes for trend analysis"]
  },
  EMA: {
    name: "Exponential Moving Average",
    desc: "Trend-following indicator giving more weight to recent prices for faster response to trends.",
    zones: [],
    min: 0, max: 10000, unit: "$",
    getSignal: (v, p) => !p ? { signal:"NEUTRAL", bias:"HOLD", conf:"LOW", color:"#F59E0B" } : p > v ? { signal:"BULLISH", bias:"BUY", conf:"HIGH", color:"#10B981" } : { signal:"BEARISH", bias:"SELL", conf:"HIGH", color:"#EF4444" },
    interpretation: (v, p) => !p ? `EMA at ${v}. Enter current price to determine signal relative to the average.` : p > v ? `Price (${p}) is above EMA (${v}). Bullish alignment — trend is upward. Price is using EMA as dynamic support.` : `Price (${p}) is below EMA (${v}). Bearish alignment — trend is downward. EMA acting as dynamic resistance.`,
    risk: (v, p) => "EMA is a lagging indicator. Signals confirm trend but may be late at reversals. Combine with momentum oscillators.",
    tips: ["20 EMA = short-term trend", "50 EMA = medium-term trend", "200 EMA = long-term trend (key institutional level)", "Golden cross (50>200 EMA) = major bullish signal"]
  },
  SMA: {
    name: "Simple Moving Average",
    desc: "Arithmetic mean of prices over N periods, providing a smooth trend baseline.",
    zones: [],
    min: 0, max: 10000, unit: "$",
    getSignal: (v, p) => !p ? { signal:"NEUTRAL", bias:"HOLD", conf:"LOW", color:"#F59E0B" } : p > v ? { signal:"BULLISH", bias:"BUY", conf:"MEDIUM", color:"#10B981" } : { signal:"BEARISH", bias:"SELL", conf:"MEDIUM", color:"#EF4444" },
    interpretation: (v, p) => !p ? `SMA at ${v}. Enter current price to see trend direction.` : p > v ? `Price (${p}) above SMA (${v}) — bullish trend intact. Support at ${v}.` : `Price (${p}) below SMA (${v}) — bearish trend dominant. Resistance at ${v}.`,
    risk: (v) => "SMA reacts slower than EMA. In choppy markets, price crossing SMA creates false signals. Always confirm with volume.",
    tips: ["SMA smooths noise but lags price", "Multiple SMA levels create support/resistance zones", "Volume confirmation on SMA crossovers is critical"]
  },
  Volume: {
    name: "Volume Analysis",
    desc: "Measures conviction behind price moves — the fuel of any sustainable trend.",
    zones: [{ label: "Weak", range: [0,0.8], color: "#EF4444" }, { label: "Average", range: [0.8,1.5], color: "#F59E0B" }, { label: "Strong", range: [1.5,3], color: "#10B981" }],
    min: 0, max: 5000000, unit: "",
    getSignal: (v, avg) => { const r = avg ? v/avg : 1; return r >= 1.5 ? { signal:"HIGH", bias:"BUY", conf:"HIGH", color:"#10B981" } : r <= 0.8 ? { signal:"LOW", bias:"WAIT", conf:"LOW", color:"#EF4444" } : { signal:"MEDIUM", bias:"HOLD", conf:"MEDIUM", color:"#F59E0B" }; },
    interpretation: (v, avg) => avg ? `Volume ${(v/avg).toFixed(2)}x average. ${v > avg*1.5 ? "Institutional activity detected — high conviction move." : v < avg*0.8 ? "Below-average volume — low conviction. Suspect false breakouts." : "Average volume — moderate conviction."}` : `Volume at ${v.toLocaleString()}. Enter average volume to calculate relative strength.`,
    risk: (v) => "Volume analysis alone is insufficient. Relate volume to price action: rising price + rising volume = confirmed trend. Rising price + falling volume = divergence warning.",
    tips: ["Volume precedes price at major turning points", "Breakouts on 2x+ average volume are highly reliable", "Volume climax (extreme spike) often marks exhaustion"]
  },
  Volatility: {
    name: "Volatility (ATR-derived)",
    desc: "Measures market uncertainty and price swing amplitude — critical for position sizing.",
    zones: [{ label: "Low Vol", range: [0,0.3], color: "#10B981" }, { label: "Normal", range: [0.3,0.7], color: "#F59E0B" }, { label: "High Vol", range: [0.7,1], color: "#EF4444" }],
    min: 0, max: 1, unit: "",
    getSignal: (v) => v >= 0.7 ? { signal:"HIGH", bias:"WAIT", conf:"HIGH", color:"#EF4444" } : v <= 0.3 ? { signal:"LOW", bias:"BUY", conf:"MEDIUM", color:"#10B981" } : { signal:"MEDIUM", bias:"HOLD", conf:"MEDIUM", color:"#F59E0B" },
    interpretation: (v) => v >= 0.7 ? `High volatility (${v}). Market is in an uncertain, wide-swinging state. Reduce position size by 40-60%. Wider stop-losses required. Breakouts may be unreliable.` : v <= 0.3 ? `Low volatility (${v}). Coiling price action — compression often precedes explosive moves. Ideal for breakout setups with defined risk.` : `Moderate volatility (${v}). Normal trading conditions. Standard position sizing and stop placement apply.`,
    risk: (v) => v >= 0.7 ? "Extreme volatility significantly increases variance drag on compounded returns." : "Low volatility may lead to false sense of security. Large moves can emerge suddenly.",
    tips: ["VIX > 30 = high fear, potential opportunity", "Volatility clustering: high vol begets high vol", "Bollinger Band width is a visual volatility proxy"]
  }
};

// Semi-circular gauge component
const SemiGauge = ({ value, min, max, color, label }) => {
  const pct = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const angle = pct * 180 - 90;
  const r = 66, cx = 80, cy = 76;
  const toXY = (deg) => {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const start = toXY(-90), end = toXY(90);
  const needleEnd = toXY(angle);
  const arcPath = `M ${start.x} ${start.y} A ${r} ${r} 0 1 1 ${end.x} ${end.y}`;
  const filledPct = pct;
  // Arc for fill
  const fillEnd = toXY(-90 + 180 * filledPct);
  const largeArc = filledPct > 0.5 ? 1 : 0;
  const fillPath = filledPct > 0 ? `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x} ${fillEnd.y}` : "";

  return (
    <div className="ind-gauge-wrap">
      <svg width="160" height="88" viewBox="0 0 160 88">
        {/* Track */}
        <path d={arcPath} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" strokeLinecap="round"/>
        {/* Fill */}
        {fillPath && <path d={fillPath} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" style={{filter:`drop-shadow(0 0 6px ${color}66)`}}/>}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y} stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
        <circle cx={cx} cy={cy} r="5" fill="#fff" stroke={color} strokeWidth="2"/>
        {/* Zone markers */}
        {[0,0.3,0.7,1].map((p,i) => {
          const pt = toXY(-90 + 180*p);
          return <circle key={i} cx={pt.x} cy={pt.y} r="2.5" fill="rgba(255,255,255,0.25)"/>;
        })}
      </svg>
      <div className="gauge-val" style={{color}}>{typeof value === "number" && value < 100 ? value.toFixed(1) : value}</div>
      <div className="gauge-lbl">{label}</div>
    </div>
  );
};

const IndicatorPage = () => {
  const [indicator, setIndicator] = useState("RSI");
  const [value, setValue] = useState(73.5);
  const [currentPrice, setCurrentPrice] = useState("");
  const [avgVolume, setAvgVolume] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("analysis");

  const def = INDICATOR_DEFS[indicator];
  const secVal = indicator === "Volume" ? parseFloat(avgVolume) || null : indicator === "EMA" || indicator === "SMA" ? parseFloat(currentPrice) || null : null;
  const liveSignal = def.getSignal(parseFloat(value) || 0, secVal);

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await api.post("/education/indicator/explain", {
        indicator, value: parseFloat(value),
        context: { timeframe: "1D", asset_class: "equity", market_regime: "trending" }
      });
      setResult(res); toast("Analysis complete", "success");
    } catch {
      toast("Demo mode — showing analysis", "error");
      setResult({
        indicator_name: indicator, value,
        market_signal: liveSignal.signal, trading_bias: liveSignal.bias,
        confidence_hint: liveSignal.conf,
        interpretation: def.interpretation(parseFloat(value)||0, secVal),
        risk_note: def.risk(parseFloat(value)||0, secVal),
      });
    }
    setLoading(false);
  };

  const v = parseFloat(value) || 0;
  const sig = def.getSignal(v, secVal);
  const needlePos = def.min === 0 && def.max === 100 ? `${v}%` :
    def.max === 1 ? `${v*100}%` : "50%";

  return (
    <div className="fade-in">
      <div className="ph">
        <div className="pt">Indicator Explainer</div>
        <div className="ps">Real-time signal analysis with visual gauges, zone mapping, and institutional-grade interpretation</div>
      </div>
      <div className="g2" style={{gap:16}}>
        {/* LEFT: config + gauge */}
        <div style={{display:"flex", flexDirection:"column", gap:16}}>
          <div className="card gb">
            <div className="chd"><div className="chi" style={{background:"rgba(59,130,246,0.15)"}}><Icon name="chart" size={14} color="#60A5FA"/></div>Indicator Setup</div>
            {/* Indicator tabs */}
            <div className="ind-tabs">
              {["RSI","EMA","SMA","Volume","Volatility"].map(i => (
                <div key={i} className={`ind-tab ${indicator===i?"a":""}`} onClick={() => { setIndicator(i); setResult(null); }}>{i}</div>
              ))}
            </div>
            <div style={{fontSize:12, color:"var(--muted)", marginBottom:14, lineHeight:1.5}}>{def.desc}</div>
            <Fld label={`${indicator} Value${def.unit ? ` (${def.unit})` : ""}`}>
              <input className="input mono" type="number" value={value} onChange={e => { setValue(e.target.value); setResult(null); }} placeholder={`e.g. ${indicator==="RSI"?"73.5":indicator==="Volatility"?"0.65":"22450"}`}/>
            </Fld>
            {(indicator === "EMA" || indicator === "SMA") && (
              <div style={{marginTop:12}}><Fld label="Current Price"><input className="input mono" type="number" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} placeholder="e.g. 22680"/></Fld></div>
            )}
            {indicator === "Volume" && (
              <div style={{marginTop:12}}><Fld label="Average Volume (baseline)"><input className="input mono" type="number" value={avgVolume} onChange={e => setAvgVolume(e.target.value)} placeholder="e.g. 4200000"/></Fld></div>
            )}
            <div style={{marginTop:18}}>
              <button className="btn btn-p btn-full" onClick={analyze} disabled={loading}>
                {loading ? <><Spinner/>Analyzing…</> : <><Icon name="zap" size={14} color="#fff"/>Deep Analysis</>}
              </button>
            </div>
          </div>

          {/* Live Signal Card */}
          <div className="card" style={{background:`${sig.color}08`, border:`1px solid ${sig.color}25`}}>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8}}>
              <span style={{fontSize:11, fontWeight:700, color:"var(--muted)", textTransform:"uppercase", letterSpacing:"0.1em"}}>Live Signal</span>
              <div style={{width:8, height:8, borderRadius:"50%", background:sig.color, boxShadow:`0 0 8px ${sig.color}`}}/>
            </div>
            <div style={{fontSize:26, fontFamily:"var(--font-d)", fontWeight:800, color:sig.color, marginBottom:4}}>{sig.signal}</div>
            <div style={{display:"flex", gap:6}}>
              <SignalBadge signal={sig.bias}/>
              <SignalBadge signal={sig.conf}/>
            </div>
          </div>

          {/* Tips card */}
          <div className="card" style={{background:"rgba(139,92,246,0.04)", border:"1px solid rgba(139,92,246,0.12)"}}>
            <div className="chd" style={{marginBottom:12}}><div className="chi" style={{background:"rgba(139,92,246,0.15)"}}><Icon name="brain" size={14} color="#A78BFA"/></div>Pro Tips</div>
            <div style={{display:"flex", flexDirection:"column", gap:7}}>
              {def.tips.map((tip,i) => (
                <div key={i} style={{display:"flex", gap:8, fontSize:12, color:"#94A3B8", lineHeight:1.5}}>
                  <span style={{color:"#8B5CF6", flexShrink:0, marginTop:1}}>▸</span>{tip}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: gauge + result */}
        <div style={{display:"flex", flexDirection:"column", gap:16}}>
          {/* Gauge Visual */}
          <div className="card">
            <div className="chd" style={{marginBottom:8}}><div className="chi" style={{background:"rgba(59,130,246,0.15)"}}><Icon name="target" size={14} color="#60A5FA"/></div>Visual Gauge</div>
            <SemiGauge value={v} min={def.min} max={def.max} color={sig.color} label={def.name}/>
            {/* Zone bar for RSI/Volatility */}
            {(indicator === "RSI" || indicator === "Volatility") && (
              <div style={{marginTop:8, padding:"0 8px"}}>
                <div style={{fontSize:11, color:"var(--muted)", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600}}>Zone Map</div>
                <div className="zone-bar">
                  <div className="zone-needle" style={{left: indicator === "RSI" ? `${v}%` : `${v*100}%`}}/>
                </div>
                <div className="zone-labels">
                  {indicator === "RSI" ? <><span style={{color:"#10B981"}}>0 Oversold</span><span style={{color:"#F59E0B"}}>50 Neutral</span><span style={{color:"#EF4444"}}>100 Overbought</span></> : <><span style={{color:"#10B981"}}>0 Low</span><span style={{color:"#F59E0B"}}>0.5 Normal</span><span style={{color:"#EF4444"}}>1.0 High</span></>}
                </div>
              </div>
            )}
          </div>

          {/* Analysis Result */}
          <div className="card" style={{flex:1}}>
            <div className="chd" style={{marginBottom:12}}>
              <div className="chi" style={{background:"rgba(139,92,246,0.15)"}}><Icon name="info" size={14} color="#A78BFA"/></div>
              <div className="ind-tabs" style={{flex:1, marginBottom:0}}>
                {["analysis","details"].map(t => <div key={t} className={`ind-tab ${tab===t?"a":""}`} onClick={() => setTab(t)} style={{textTransform:"capitalize"}}>{t}</div>)}
              </div>
            </div>
            {tab === "analysis" ? (
              result ? (
                <div className="rp">
                  <RRow label="Indicator" value={result.indicator_name}/>
                  <RRow label="Signal" value={result.market_signal} isSignal/>
                  <RRow label="Bias" value={result.trading_bias} isSignal/>
                  <RRow label="Confidence" value={result.confidence_hint} isSignal/>
                  <RBlock label="Interpretation">
                    <p style={{fontSize:12.5, color:"#CBD5E1", lineHeight:1.65}}>{result.interpretation}</p>
                  </RBlock>
                  <RBlock label="Risk Note">
                    <div className="wb" style={{padding:"8px 10px", margin:0}}>
                      <p style={{fontSize:12, lineHeight:1.6, margin:0}}>{result.risk_note}</p>
                    </div>
                  </RBlock>
                </div>
              ) : (
                <div>
                  <div style={{padding:"12px 0", display:"flex", flexDirection:"column", gap:10}}>
                    <div className="detail-row">
                      <span className="detail-key">Current Reading</span>
                      <span className="detail-val" style={{color:sig.color}}>{v}{indicator==="RSI"?" / 100":""}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-key">Signal Strength</span>
                      <span className="detail-val">{sig.conf}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-key">Recommended Action</span>
                      <span className="detail-val"><SignalBadge signal={sig.bias}/></span>
                    </div>
                  </div>
                  <div style={{padding:"12px", background:"rgba(255,255,255,0.03)", borderRadius:8, border:"1px solid var(--border)", fontSize:12.5, color:"#94A3B8", lineHeight:1.65}}>
                    {def.interpretation(v, secVal)}
                  </div>
                  <div style={{marginTop:10}}>
                    <div className="wb">
                      <Icon name="alert" size={14} color="#FCD34D"/>
                      <span>{def.risk(v, secVal)}</span>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div style={{display:"flex", flexDirection:"column", gap:8}}>
                <div className="detail-row"><span className="detail-key">Full Name</span><span className="detail-val" style={{fontSize:12}}>{def.name}</span></div>
                <div className="detail-row"><span className="detail-key">Scale</span><span className="detail-val" style={{fontFamily:"var(--font-m)"}}>{def.min} – {def.max}{def.unit}</span></div>
                <div className="detail-row"><span className="detail-key">Category</span><span className="detail-val">{indicator==="RSI"||indicator==="Volatility"?"Oscillator":"Trend / Overlay"}</span></div>
                <div className="detail-row"><span className="detail-key">Best Timeframe</span><span className="detail-val">{indicator==="RSI"?"1D / 4H":"1D / 1W"}</span></div>
                {def.zones.length > 0 && (
                  <div style={{marginTop:8}}>
                    <div className="rk" style={{marginBottom:8}}>Signal Zones</div>
                    <div style={{display:"flex", flexDirection:"column", gap:6}}>
                      {def.zones.map((z,i) => (
                        <div key={i} style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 10px", background:`${z.color}10`, borderRadius:8, border:`1px solid ${z.color}22`}}>
                          <div style={{display:"flex", alignItems:"center", gap:8}}>
                            <div style={{width:8, height:8, borderRadius:"50%", background:z.color}}/>
                            <span style={{fontSize:12, fontWeight:600, color:z.color}}>{z.label}</span>
                          </div>
                          <span style={{fontFamily:"var(--font-m)", fontSize:11, color:"var(--muted)"}}>{z.range[0]} – {z.range[1]}{def.max<=1?" (×avg)":""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// PAGE 2: AI DECISION — KEEP AS IS (GOOD)
// ════════════════════════════════════════════════════════════════════
const AIDecisionPage = () => {
  const [scores, setScores] = useState({ lstm_score:0.78, cnn_score:0.72, technical_score:0.68, sentiment_score:0.61, risk_score:0.35, confidence:0.76 });
  const [decision, setDecision] = useState("BUY");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const setS = (k, v) => setScores(p => ({...p, [k]:v}));
  const colors = ["pb","pg","pp","py","pb"];
  const modelLabels = { lstm:"LSTM Trend", cnn:"CNN Pattern", technical:"Technical", sentiment:"Sentiment", risk:"Risk (inv.)" };
  const submit = async () => {
    setLoading(true);
    try {
      const res = await api.post("/education/ai-decision/explain", {...scores, final_decision:decision});
      setResult(res); toast("Decision explained","success");
    } catch {
      toast("Demo mode","error");
      setResult({ final_decision:decision, confidence:scores.confidence, agreement_level:"HIGH", agreement_ratio:1.0, explanation_strength:"STRONG", weighted_contributions:{ lstm:{raw_score:0.78,weight:0.3,contribution:0.234}, cnn:{raw_score:0.72,weight:0.2,contribution:0.144}, technical:{raw_score:0.68,weight:0.25,contribution:0.17}, sentiment:{raw_score:0.61,weight:0.15,contribution:0.0915}, risk:{raw_score:0.65,weight:0.1,contribution:0.065} }, reasoning_points:["LSTM signals strong upside momentum (0.78)","CNN identified bullish pattern formation (0.72)","Technical indicators aligned bullish (0.68)","News sentiment neutral-positive (0.61)","Risk within acceptable bounds (0.35)"], risk_adjustment_explanation:"Risk score 0.35 is within acceptable bounds. No material confidence penalty applied." });
    }
    setLoading(false);
  };
  return (
    <div className="fade-in">
      <div className="ph"><div className="pt">AI Decision Explainer</div><div className="ps">Decompose ensemble model contributions with weighted attribution</div></div>
      <div className="g2">
        <div className="card gp">
          <div className="chd"><div className="chi" style={{background:"rgba(139,92,246,0.15)"}}><Icon name="brain" size={14} color="#A78BFA"/></div>Model Inputs</div>
          <Slider label="LSTM Score" name="lstm_score" value={scores.lstm_score} onChange={setS}/>
          <Slider label="CNN Score" name="cnn_score" value={scores.cnn_score} onChange={setS}/>
          <Slider label="Technical Score" name="technical_score" value={scores.technical_score} onChange={setS}/>
          <Slider label="Sentiment Score" name="sentiment_score" value={scores.sentiment_score} onChange={setS}/>
          <Slider label="Risk Score" name="risk_score" value={scores.risk_score} onChange={setS}/>
          <Slider label="Confidence" name="confidence" value={scores.confidence} onChange={setS}/>
          <div style={{marginTop:12}}><Fld label="Final Decision"><select className="select" value={decision} onChange={e=>setDecision(e.target.value)}>{["BUY","SELL","HOLD"].map(d=><option key={d}>{d}</option>)}</select></Fld></div>
          <div style={{marginTop:18}}><button className="btn btn-p btn-full" onClick={submit} disabled={loading}>{loading?<><Spinner/>Processing…</>:<><Icon name="brain" size={14} color="#fff"/>Explain Decision</>}</button></div>
        </div>
        <div className="card">
          <div className="chd"><div className="chi" style={{background:"rgba(59,130,246,0.15)"}}><Icon name="trending" size={14} color="#60A5FA"/></div>Decision Breakdown</div>
          {result ? (
            <>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}><SignalBadge signal={result.final_decision}/><SignalBadge signal={result.agreement_level}/><SignalBadge signal={result.explanation_strength}/></div>
              <div style={{marginBottom:16}}>{Object.entries(result.weighted_contributions).map(([model,data],i)=>(
                <div key={model} className="cb">
                  <div className="ch2"><span className="cn">{modelLabels[model]||model}</span><span className="cs" style={{color:"#60A5FA"}}>{(data.raw_score*100).toFixed(0)}%×{(data.weight*100).toFixed(0)}%=<span style={{color:"#60A5FA"}}>{(data.contribution*100).toFixed(1)}%</span></span></div>
                  <ProgBar val={data.contribution*300} cls={colors[i]}/>
                </div>
              ))}</div>
              <div className="div"/>
              <div style={{fontSize:12.5,color:"#CBD5E1",lineHeight:1.7,display:"flex",flexDirection:"column",gap:4,marginBottom:12}}>{result.reasoning_points?.map((pt,i)=><div key={i} style={{display:"flex",gap:7,alignItems:"flex-start"}}><span style={{color:"#3B82F6",flexShrink:0,marginTop:2}}>›</span>{pt}</div>)}</div>
              <div className="wb"><Icon name="info" size={14} color="#FCD34D"/><span>{result.risk_adjustment_explanation}</span></div>
            </>
          ) : <Empty icon="brain" text="Configure model scores and submit"/>}
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// PAGE 3: PREDICTION PLAYGROUND — INTERACTIVE TRADING TERMINAL
// ════════════════════════════════════════════════════════════════════

// Generate realistic OHLCV candle data
function genCandles(count=120, base=22000, vol=85, seed=42) {
  const candles = [];
  let close = base, rng = seed;
  const rand = () => { rng = (rng * 16807 + 0) % 2147483647; return (rng - 1) / 2147483646; };
  for (let i = 0; i < count; i++) {
    const open = close;
    const change = (rand() - 0.49) * vol * 2;
    close = Math.max(open + change, base * 0.7);
    const hi = Math.max(open, close) + rand() * vol * 0.7;
    const lo = Math.min(open, close) - rand() * vol * 0.7;
    const volume = 300000 + rand() * 800000;
    candles.push({ open, high: hi, low: lo, close, volume, time: i });
  }
  return candles;
}

const TIMEFRAMES = ["1m","5m","15m","1H","4H"];

const CandleChart = ({ candles, crosshair, onMouseMove, onMouseLeave, openTrade, width, height }) => {
  const canvasRef = useRef(null);
  const volCanvasRef = useRef(null);

  const MAIN_H = Math.floor(height * 0.78);
  const VOL_H = height - MAIN_H - 4;
  const PAD = { l: 8, r: 72, t: 12, b: 4 };
  const chartW = width - PAD.l - PAD.r;

  // Calculate visible range
  const visible = candles.slice(-80);
  const priceMin = Math.min(...visible.map(c => c.low)) * 0.9995;
  const priceMax = Math.max(...visible.map(c => c.high)) * 1.0005;
  const volMax = Math.max(...visible.map(c => c.volume));
  const candleW = Math.max(2, Math.floor(chartW / visible.length) - 1);

  const toX = (i) => PAD.l + (i + 0.5) * (chartW / visible.length);
  const toY = (p) => PAD.t + (1 - (p - priceMin) / (priceMax - priceMin)) * (MAIN_H - PAD.t - PAD.b);
  const toVolY = (v) => VOL_H - (v / volMax) * (VOL_H - 2);
  const toPrice = (y) => priceMin + (1 - (y - PAD.t) / (MAIN_H - PAD.t - PAD.b)) * (priceMax - priceMin);
  const toIdx = (x) => Math.max(0, Math.min(visible.length - 1, Math.floor((x - PAD.l) / (chartW / visible.length))));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, MAIN_H);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, MAIN_H);
    bgGrad.addColorStop(0, "#0A0F1C");
    bgGrad.addColorStop(1, "#060A12");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, MAIN_H);

    // Grid lines
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = PAD.t + i * (MAIN_H - PAD.t - PAD.b) / 5;
      ctx.beginPath(); ctx.moveTo(PAD.l, y); ctx.lineTo(width - PAD.r, y); ctx.stroke();
      const price = priceMax - i * (priceMax - priceMin) / 5;
      ctx.fillStyle = "rgba(90,106,136,0.8)";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(price.toFixed(0), width - PAD.r + 4, y + 3);
    }

    // Vertical grid
    for (let i = 0; i < visible.length; i += 10) {
      const x = toX(i);
      ctx.strokeStyle = "rgba(255,255,255,0.025)";
      ctx.beginPath(); ctx.moveTo(x, PAD.t); ctx.lineTo(x, MAIN_H - PAD.b); ctx.stroke();
    }

    // Open trade line
    if (openTrade) {
      const oy = toY(openTrade.price);
      const isLong = openTrade.type === "LONG";
      ctx.strokeStyle = isLong ? "rgba(52,211,153,0.6)" : "rgba(248,113,113,0.6)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(PAD.l, oy); ctx.lineTo(width - PAD.r, oy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = isLong ? "#065f46" : "#7f1d1d";
      ctx.strokeStyle = isLong ? "#34D399" : "#F87171";
      ctx.lineWidth = 1;
      const lx = PAD.l + 4;
      ctx.fillRect(lx, oy - 9, 56, 17);
      ctx.strokeRect(lx, oy - 9, 56, 17);
      ctx.fillStyle = isLong ? "#34D399" : "#F87171";
      ctx.font = "bold 9px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${isLong?"LONG":"SHORT"} ${openTrade.price.toFixed(0)}`, lx + 4, oy + 3);
    }

    // Candles
    visible.forEach((c, i) => {
      const x = toX(i);
      const o = toY(c.open), cl = toY(c.close), hi = toY(c.high), lo = toY(c.low);
      const isBull = c.close >= c.open;
      const bull = "#26a69a", bear = "#ef5350";
      const color = isBull ? bull : bear;

      // Wick
      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, hi); ctx.lineTo(x, lo); ctx.stroke();

      // Body
      const bodyTop = Math.min(o, cl), bodyH = Math.max(Math.abs(cl - o), 1);
      ctx.fillStyle = isBull ? bull : bear;
      ctx.fillRect(x - candleW/2, bodyTop, candleW, bodyH);
    });

    // Crosshair
    if (crosshair && crosshair.x > PAD.l && crosshair.x < width - PAD.r) {
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(crosshair.x, PAD.t); ctx.lineTo(crosshair.x, MAIN_H - PAD.b); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD.l, crosshair.y); ctx.lineTo(width - PAD.r, crosshair.y); ctx.stroke();
      ctx.setLineDash([]);
      // Price label on right
      const p = toPrice(crosshair.y);
      ctx.fillStyle = "#3B82F6";
      ctx.fillRect(width - PAD.r + 1, crosshair.y - 9, PAD.r - 2, 18);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(p.toFixed(0), width - PAD.r + 4, crosshair.y + 3);
    }

    // Current price line
    const last = visible[visible.length - 1];
    if (last) {
      const py = toY(last.close);
      const isUp = last.close >= last.open;
      ctx.strokeStyle = isUp ? "rgba(38,166,154,0.5)" : "rgba(239,83,80,0.5)";
      ctx.lineWidth = 1; ctx.setLineDash([2,3]);
      ctx.beginPath(); ctx.moveTo(PAD.l, py); ctx.lineTo(width - PAD.r, py); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = isUp ? "#26a69a" : "#ef5350";
      ctx.fillRect(width - PAD.r + 1, py - 9, PAD.r - 2, 18);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(last.close.toFixed(0), width - PAD.r + 4, py + 3);
    }

  }, [candles, crosshair, openTrade, width, MAIN_H]);

  // Volume canvas
  useEffect(() => {
    const canvas = volCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, VOL_H);
    ctx.fillStyle = "#060A12";
    ctx.fillRect(0, 0, width, VOL_H);
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD.l, 0); ctx.lineTo(PAD.l, VOL_H); ctx.stroke();

    visible.forEach((c, i) => {
      const x = toX(i);
      const vh = VOL_H - toVolY(c.volume);
      const isBull = c.close >= c.open;
      ctx.fillStyle = isBull ? "rgba(38,166,154,0.45)" : "rgba(239,83,80,0.45)";
      ctx.fillRect(x - candleW/2, toVolY(c.volume), candleW, vh);
    });
    // Crosshair on vol
    if (crosshair && crosshair.x > PAD.l) {
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1; ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(crosshair.x, 0); ctx.lineTo(crosshair.x, VOL_H); ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [candles, crosshair, width, VOL_H]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const idx = toIdx(x);
    const c = visible[idx];
    if (c) onMouseMove({ x, y, candle: c, idx, price: toPrice(y) });
  };

  return (
    <div style={{display:"flex",flexDirection:"column",flex:1}}>
      <div style={{position:"relative",cursor:"crosshair"}} onMouseMove={handleMouseMove} onMouseLeave={onMouseLeave}>
        <canvas ref={canvasRef} width={width} height={MAIN_H} style={{display:"block"}}/>
      </div>
      <div style={{height:4, background:"rgba(255,255,255,0.04)"}}/>
      <div style={{position:"relative"}} onMouseMove={handleMouseMove} onMouseLeave={onMouseLeave}>
        <canvas ref={volCanvasRef} width={width} height={VOL_H} style={{display:"block"}}/>
        <div style={{position:"absolute",right:4,top:2,fontSize:9,color:"var(--muted)",fontFamily:"var(--font-m)",letterSpacing:"0.1em"}}>VOLUME</div>
      </div>
    </div>
  );
};

const PlaygroundPage = () => {
  const chartContainerRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: 440 });
  const [tf, setTf] = useState("5m");
  const [candles, setCandles] = useState(() => genCandles(120, 22000, 85));
  const [crosshair, setCrosshair] = useState(null);
  const [hoveredCandle, setHoveredCandle] = useState(null);
  const [openTrade, setOpenTrade] = useState(null);
  const [trades, setTrades] = useState([]);
  const [qty, setQty] = useState(10);
  const [confidence, setConfidence] = useState(65);
  const [pnlRunning, setPnlRunning] = useState(null);
  const [signal, setSignal] = useState(null);

  const lastCandle = candles[candles.length - 1];
  const currentPrice = lastCandle?.close || 22000;

  // Resize observer
  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        setDims({ w: e.contentRect.width || 800, h: Math.max(380, e.contentRect.height || 440) });
      }
    });
    if (chartContainerRef.current) obs.observe(chartContainerRef.current);
    return () => obs.disconnect();
  }, []);

  // Simulate live price updates
  useEffect(() => {
    const id = setInterval(() => {
      setCandles(prev => {
        const last = prev[prev.length - 1];
        const change = (Math.random() - 0.495) * 35;
        const newClose = Math.max(last.close + change, 19000);
        const newHigh = Math.max(last.high, newClose);
        const newLow = Math.min(last.low, newClose);
        const updated = [...prev.slice(0, -1), { ...last, close: newClose, high: newHigh, low: newLow }];
        if (Math.random() < 0.15) {
          return [...updated, { open: newClose, high: newClose + Math.random()*20, low: newClose - Math.random()*20, close: newClose, volume: 200000 + Math.random()*600000, time: last.time+1 }];
        }
        return updated;
      });
    }, 800);
    return () => clearInterval(id);
  }, []);

  // Update running PnL
  useEffect(() => {
    if (!openTrade) { setPnlRunning(null); return; }
    const diff = currentPrice - openTrade.price;
    const pnl = (openTrade.type === "LONG" ? diff : -diff) * openTrade.qty;
    setPnlRunning(pnl);
  }, [currentPrice, openTrade]);

  // AI signal based on recent candles
  useEffect(() => {
    const recent = candles.slice(-10);
    if (recent.length < 5) return;
    const closes = recent.map(c => c.close);
    const avg5 = closes.slice(-5).reduce((a,b)=>a+b,0)/5;
    const avg10 = closes.reduce((a,b)=>a+b,0)/10;
    const lastClose = closes[closes.length-1];
    if (lastClose > avg5 && avg5 > avg10) setSignal({ type:"bull", text:"Strong uptrend detected. 5-MA crossed above 10-MA." });
    else if (lastClose < avg5 && avg5 < avg10) setSignal({ type:"bear", text:"Downtrend confirmed. Price below moving averages." });
    else setSignal({ type:"neut", text:"Consolidation phase. Await directional breakout." });
  }, [candles.length]);

  const handleMouseMove = useCallback((data) => {
    setCrosshair({ x: data.x, y: data.y });
    setHoveredCandle(data);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCrosshair(null);
    setHoveredCandle(null);
  }, []);

  const placeTrade = (type) => {
    if (openTrade) { toast("Close existing position first", "error"); return; }
    if (confidence > 85) toast("⚠️ Overconfidence bias detected!", "error");
    setOpenTrade({ type, price: currentPrice, qty, confidence, entryTime: Date.now() });
    toast(`${type} ${qty} units @ ₹${currentPrice.toFixed(2)}`, "success");
  };

  const closeTrade = () => {
    if (!openTrade) return;
    const diff = currentPrice - openTrade.price;
    const pnl = (openTrade.type === "LONG" ? diff : -diff) * openTrade.qty;
    const trade = { ...openTrade, exitPrice: currentPrice, pnl, exitTime: Date.now() };
    setTrades(p => [trade, ...p].slice(0, 15));
    setOpenTrade(null);
    toast(`Closed: ${pnl >= 0 ? "+" : ""}₹${pnl.toFixed(2)}`, pnl >= 0 ? "success" : "error");
  };

  const displayC = hoveredCandle?.candle || lastCandle;
  const confColor = confidence > 85 ? "#EF4444" : confidence > 65 ? "#F59E0B" : "#10B981";

  return (
    <div className="fade-in">
      <div className="ph">
        <div className="pt">Prediction Playground</div>
        <div className="ps">Interactive trading terminal — analyze live candlestick charts and practice real market decisions</div>
      </div>
      <div className="playground-layout">
        {/* CHART PANEL */}
        <div className="chart-panel">
          {/* Top bar */}
          <div className="chart-topbar">
            <span className="chart-symbol">NIFTY50</span>
            <span className="chart-price mono" style={{color: currentPrice >= (candles[candles.length-2]?.close||currentPrice) ? "#26a69a":"#ef5350"}}>
              ₹{currentPrice.toFixed(2)}
            </span>
            <span className="chart-change" style={{background: currentPrice>22000?"rgba(38,166,154,0.15)":"rgba(239,83,80,0.15)", color:currentPrice>22000?"#26a69a":"#ef5350"}}>
              {currentPrice > 22000 ? "+" : ""}{((currentPrice/22000-1)*100).toFixed(2)}%
            </span>
            {signal && (
              <div className={`signal-alert ${signal.type}`} style={{margin:0, padding:"4px 10px", fontSize:11}}>
                <Icon name={signal.type==="bull"?"trending":signal.type==="bear"?"arrow_up":"info"} size={11}/> {signal.text}
              </div>
            )}
            <div className="tf-btns">
              {TIMEFRAMES.map(t => <button key={t} className={`tf-btn ${tf===t?"a":""}`} onClick={()=>setTf(t)}>{t}</button>)}
            </div>
          </div>

          {/* Canvas chart */}
          <div ref={chartContainerRef} className="chart-wrap" style={{flex:1, minHeight:0, position:"relative"}}>
            {dims.w > 0 && (
              <CandleChart
                candles={candles} crosshair={crosshair}
                onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}
                openTrade={openTrade} width={dims.w} height={dims.h}
              />
            )}
            {/* Crosshair tooltip */}
            {hoveredCandle && crosshair && (
              <div className="crosshair-tooltip" style={{
                left: crosshair.x > dims.w/2 ? crosshair.x - 170 : crosshair.x + 12,
                top: Math.min(crosshair.y + 10, dims.h - 110)
              }}>
                <div className="th">NIFTY50 · {tf}</div>
                {["O","H","L","C"].map((k,i) => {
                  const vals = [hoveredCandle.candle?.open, hoveredCandle.candle?.high, hoveredCandle.candle?.low, hoveredCandle.candle?.close];
                  const colors = ["#9AAAC2","#34D399","#F87171","#E4EAF4"];
                  return <div key={k} className="tr"><span className="tk">{k}</span><span className="tv" style={{color:colors[i]}}>{vals[i]?.toFixed(2)}</span></div>;
                })}
                <div className="tr"><span className="tk">Vol</span><span className="tv">{((hoveredCandle.candle?.volume||0)/1000).toFixed(0)}K</span></div>
              </div>
            )}
          </div>

          {/* OHLC bottom bar */}
          <div className="chart-bottom">
            {[["O",displayC?.open,"#9AAAC2"],["H",displayC?.high,"#34D399"],["L",displayC?.low,"#F87171"],["C",displayC?.close,"#E4EAF4"]].map(([k,v,c])=>(
              <div key={k} className="ohlc-val"><span className="ohlc-k">{k}</span><span style={{color:c}}>{v?.toFixed(2)}</span></div>
            ))}
            <div className="ohlc-val" style={{marginLeft:"auto"}}><span className="ohlc-k">VOL</span><span>{((displayC?.volume||0)/1000).toFixed(0)}K</span></div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          {/* Trade Form */}
          <div className="trade-form">
            <div className="chd" style={{marginBottom:12}}><div className="chi" style={{background:"rgba(59,130,246,0.15)"}}><Icon name="target" size={14} color="#60A5FA"/></div>Execute Trade</div>

            <div className="price-display">
              <div style={{fontSize:10,color:"var(--muted)",marginBottom:2,textTransform:"uppercase",letterSpacing:"0.1em"}}>Market Price</div>
              <div className="price-big" style={{color: pnlRunning===null? "#E4EAF4": pnlRunning>=0?"#34D399":"#F87171"}}>
                ₹{currentPrice.toFixed(2)}
              </div>
            </div>

            {/* Running PnL */}
            {openTrade && pnlRunning !== null && (
              <div className={`pnl-display ${pnlRunning>=0?"pnl-positive":"pnl-negative"}`}>
                <div style={{fontSize:10,color:"var(--muted)",marginBottom:2,textTransform:"uppercase",letterSpacing:"0.1em"}}>{openTrade.type} · Unrealized P&L</div>
                <div className="pnl-num" style={{color:pnlRunning>=0?"#34D399":"#F87171"}}>
                  {pnlRunning>=0?"+":""} ₹{pnlRunning.toFixed(2)}
                </div>
              </div>
            )}

            {/* Confidence */}
            <div className="conf-wrap">
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span className="fl">Confidence</span>
                <span style={{fontSize:12,fontWeight:700,color:confColor,fontFamily:"var(--font-m)"}}>{confidence}%</span>
              </div>
              <input type="range" min={10} max={100} value={confidence} onChange={e=>setConfidence(+e.target.value)}/>
              {confidence > 85 && (
                <div style={{fontSize:10.5,color:"#F87171",marginTop:4,display:"flex",gap:5,alignItems:"center"}}>
                  <Icon name="alert" size={11} color="#F87171"/> Overconfidence bias risk
                </div>
              )}
            </div>

            {/* Qty */}
            <div style={{marginBottom:12}}>
              <div className="fl" style={{marginBottom:6}}>Quantity</div>
              <div className="qty-ctrl">
                <button className="qty-btn" onClick={()=>setQty(q=>Math.max(1,q-1))}><Icon name="minus" size={14}/></button>
                <span className="qty-val">{qty}</span>
                <button className="qty-btn" onClick={()=>setQty(q=>q+5)}><Icon name="plus" size={14}/></button>
                <span style={{fontSize:11,color:"var(--muted)",paddingRight:8,marginLeft:4}}>≈ ₹{(currentPrice*qty).toLocaleString("en-IN",{maximumFractionDigits:0})}</span>
              </div>
            </div>

            {!openTrade ? (
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <button className="btn btn-buy" onClick={()=>placeTrade("LONG")}>▲ BUY</button>
                <button className="btn btn-sell" onClick={()=>placeTrade("SHORT")}>▼ SELL</button>
              </div>
            ) : (
              <div>
                <div style={{padding:"8px 10px",borderRadius:8,background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.2)",marginBottom:8,fontSize:12}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"var(--muted)"}}>Entry</span><span className="mono" style={{color:"#60A5FA"}}>₹{openTrade.price.toFixed(2)}</span></div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><span style={{color:"var(--muted)"}}>Type</span><span style={{color:openTrade.type==="LONG"?"#34D399":"#F87171",fontWeight:700}}>{openTrade.type}</span></div>
                </div>
                <button className="btn btn-g btn-full" onClick={closeTrade} style={{borderColor:"rgba(239,68,68,0.3)",color:"#F87171"}}>✕ Close Position</button>
              </div>
            )}
          </div>

          {/* Trade History */}
          <div className="trade-hist">
            <div className="chd" style={{marginBottom:0}}><div className="chi" style={{background:"rgba(245,158,11,0.15)"}}><Icon name="chart" size={14} color="#FCD34D"/></div>Trade History</div>
            <div className="hist-list">
              {trades.length === 0 ? (
                <div style={{textAlign:"center",padding:"20px 0",color:"var(--muted)",fontSize:12}}>No trades yet</div>
              ) : trades.map((t, i) => (
                <div key={i} className={`hist-item ${t.pnl>=0?"win":"loss"}`}>
                  <div className="hist-row">
                    <span style={{fontWeight:700,color:t.type==="LONG"?"#34D399":"#F87171"}}>{t.type}</span>
                    <span style={{fontFamily:"var(--font-m)",fontWeight:700,color:t.pnl>=0?"#34D399":"#F87171"}}>{t.pnl>=0?"+":""}{t.pnl.toFixed(2)}</span>
                  </div>
                  <div className="hist-row" style={{marginTop:3}}>
                    <span style={{color:"var(--muted)"}}>₹{t.price.toFixed(0)} → ₹{t.exitPrice.toFixed(0)}</span>
                    <span style={{color:"var(--muted)"}}>Conf:{t.confidence}%</span>
                  </div>
                </div>
              ))}
            </div>
            {trades.length > 0 && (
              <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid var(--border)",display:"flex",justifyContent:"space-between",fontSize:12}}>
                <span style={{color:"var(--muted)"}}>Total P&L</span>
                <span className="mono" style={{fontWeight:700,color:trades.reduce((a,t)=>a+t.pnl,0)>=0?"#34D399":"#F87171"}}>
                  {trades.reduce((a,t)=>a+t.pnl,0)>=0?"+":" "}₹{trades.reduce((a,t)=>a+t.pnl,0).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// PAGE 4: STRATEGY SIM
// ════════════════════════════════════════════════════════════════════
const StrategyPage = () => {
  const [form, setForm] = useState({ investment_amount:10000, predicted_change_percent:12.5, risk_score:0.35, volatility_score:0.40, scenario_type:"NORMAL" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({...p,[k]:v}));
  const simulate = async () => {
    setLoading(true);
    try {
      const res = await api.post("/education/strategy/simulate", form);
      setResult(res); toast("Simulation complete","success");
    } catch {
      toast("Demo mode","error");
      const inv = form.investment_amount;
      const proj = inv * (1 + form.predicted_change_percent/100) - inv * form.volatility_score * 0.05;
      setResult({ initial_investment:inv, projected_value:proj.toFixed(2), projected_profit_loss:(proj-inv).toFixed(2), risk_adjusted_value:(proj*(1-form.risk_score*0.3)).toFixed(2), worst_case_projection:(inv*(1-form.risk_score*0.4-form.volatility_score*0.25)).toFixed(2), volatility_impact:(inv*form.volatility_score*0.05).toFixed(2), scenario_applied:form.scenario_type, educational_insight:"This simulation shows how risk and volatility erode compounded returns even when directional calls are correct. The risk-adjusted projection reflects realistic expected outcomes after accounting for downside probability and variance drag." });
    }
    setLoading(false);
  };
  const fmt = (v) => `$${parseFloat(v||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  return (
    <div className="fade-in">
      <div className="ph"><div className="pt">Strategy Simulator</div><div className="ps">Deterministic investment outcome modeling across market scenarios</div></div>
      <div className="g2">
        <div className="card gb">
          <div className="chd"><div className="chi" style={{background:"rgba(59,130,246,0.15)"}}><Icon name="trending" size={14} color="#60A5FA"/></div>Simulation Parameters</div>
          <Fld label="Investment Amount ($)"><input className="input" type="number" value={form.investment_amount} onChange={e=>set("investment_amount",parseFloat(e.target.value))}/></Fld>
          <div style={{marginTop:12}}><Fld label="Predicted Change (%)"><input className="input" type="number" value={form.predicted_change_percent} onChange={e=>set("predicted_change_percent",parseFloat(e.target.value))} step="0.5"/></Fld></div>
          <div style={{marginTop:12}}><Slider label="Risk Score" name="risk_score" value={form.risk_score} onChange={set}/><Slider label="Volatility Score" name="volatility_score" value={form.volatility_score} onChange={set}/></div>
          <div style={{marginTop:12}}><Fld label="Scenario"><select className="select" value={form.scenario_type} onChange={e=>set("scenario_type",e.target.value)}>{["NORMAL","MARKET_CRASH","HIGH_VOLATILITY"].map(s=><option key={s}>{s}</option>)}</select></Fld></div>
          <div style={{marginTop:18}}><button className="btn btn-p btn-full" onClick={simulate} disabled={loading}>{loading?<><Spinner/>Simulating…</>:<><Icon name="zap" size={14} color="#fff"/>Run Simulation</>}</button></div>
        </div>
        {result ? (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div className="g2 gg-sm">
              {[{label:"Projected Value",val:result.projected_value,color:"#60A5FA"},{label:"Profit / Loss",val:result.projected_profit_loss,color:parseFloat(result.projected_profit_loss)>=0?"#34D399":"#F87171"},{label:"Risk-Adjusted",val:result.risk_adjusted_value,color:"#A78BFA"},{label:"Worst Case",val:result.worst_case_projection,color:"#F87171"}].map(m=>(
                <div key={m.label} className="card mmini"><div className="ml">{m.label}</div><div className="mv" style={{color:m.color,fontSize:22}}>{fmt(m.val)}</div></div>
              ))}
            </div>
            <div className="card">
              <div className="ml" style={{marginBottom:6}}>Volatility Drag</div>
              <div style={{fontSize:14,fontWeight:700,color:"#FCD34D",marginBottom:12}}>{fmt(result.volatility_impact)} cost to returns</div>
              <div style={{fontSize:12.5,color:"#94A3B8",lineHeight:1.75}}>{result.educational_insight}</div>
            </div>
          </div>
        ) : <div className="card"><Empty icon="trending" text="Configure parameters and run simulation"/></div>}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// PAGE 5: QUIZ
// ════════════════════════════════════════════════════════════════════
const QuizPage = () => {
  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const q = QUIZ_Q[cur];
  const select = (key) => { if (!submitted) setAnswers(p=>({...p,[q.id]:key})); };
  const submitQuiz = async () => {
    setLoading(true);
    try {
      const res = await api.post("/education/quiz/submit",{quiz_id:`session_${Date.now()}`,questions:QUIZ_Q,user_answers:Object.entries(answers).map(([question_id,selected_key])=>({question_id,selected_key}))});
      setResult(res); setSubmitted(true); toast("Quiz submitted!","success");
    } catch {
      const correct = QUIZ_Q.filter(q=>answers[q.id]===q.ans).length;
      const score = (correct/QUIZ_Q.length)*100;
      setResult({ score_percentage:score, correct_count:correct, incorrect_count:QUIZ_Q.length-correct, mastery_level:score>=80?"ADVANCED":score>=60?"INTERMEDIATE":"BEGINNER", points_earned:correct*10, motivational_feedback:score>=80?"Exceptional performance. Advanced-level understanding demonstrated.":"Good start. Review weak topics to strengthen your foundation.", topic_performance:[{topic:"RSI",accuracy_percent:answers["q1"]==="C"?100:0,performance_band:answers["q1"]==="C"?"STRONG":"WEAK"},{topic:"VOLATILITY",accuracy_percent:answers["q2"]==="B"?100:0,performance_band:answers["q2"]==="B"?"STRONG":"WEAK"},{topic:"RISK",accuracy_percent:answers["q3"]==="B"?100:0,performance_band:answers["q3"]==="B"?"STRONG":"WEAK"}] });
      setSubmitted(true); toast("Demo scoring applied","info");
    }
    setLoading(false);
  };
  const reset = () => { setAnswers({}); setSubmitted(false); setResult(null); setCur(0); };
  if (result) return (
    <div className="fade-in">
      <div className="ph"><div className="pt">Quiz Results</div><div className="ps">Your performance breakdown</div></div>
      <div className="g2">
        <div className="card gb" style={{textAlign:"center"}}>
          <div style={{padding:"8px 0 20px"}}>
            <div className="sc-circle"><div className="sc-in"><div className="sc-n">{result.score_percentage?.toFixed(0)}</div><div className="sc-d">/ 100</div></div></div>
            <div style={{display:"flex",gap:7,justifyContent:"center",flexWrap:"wrap",marginTop:4}}><SignalBadge signal={result.mastery_level}/><span className="badge bc">+{result.points_earned} XP</span></div>
          </div>
          <div className="div"/>
          <div style={{display:"flex",justifyContent:"space-around",padding:"8px 0 4px"}}>
            <div><div style={{fontSize:26,fontWeight:800,color:"#34D399",fontFamily:"var(--font-d)"}}>{result.correct_count}</div><div style={{fontSize:11,color:"var(--muted)"}}>Correct</div></div>
            <div style={{width:1,background:"var(--border)"}}/>
            <div><div style={{fontSize:26,fontWeight:800,color:"#F87171",fontFamily:"var(--font-d)"}}>{result.incorrect_count}</div><div style={{fontSize:11,color:"var(--muted)"}}>Incorrect</div></div>
          </div>
          <div className="div"/>
          <p style={{fontSize:12.5,color:"#94A3B8",lineHeight:1.7,fontStyle:"italic"}}>{result.motivational_feedback}</p>
          <button className="btn btn-g btn-full" style={{marginTop:16}} onClick={reset}>Retake Quiz</button>
        </div>
        <div className="card">
          <div className="chd" style={{marginBottom:14}}><div className="chi" style={{background:"rgba(16,185,129,0.15)"}}><Icon name="trending" size={14} color="#34D399"/></div>Topic Breakdown</div>
          {result.topic_performance?.map(tp=>(
            <div key={tp.topic} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:12.5,fontWeight:600}}>{tp.topic}</span>
                <div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:12,color:"var(--muted)"}}>{tp.accuracy_percent?.toFixed(0)}%</span><span className={`badge bsm ${tp.performance_band==="STRONG"?"bg":tp.performance_band==="DEVELOPING"?"by":"br"}`}>{tp.performance_band}</span></div>
              </div>
              <ProgBar val={tp.accuracy_percent} cls={tp.performance_band==="STRONG"?"pg":tp.performance_band==="DEVELOPING"?"py":"pp"}/>
            </div>
          ))}
          <div className="div"/>
          <div className="chd" style={{marginBottom:10,fontSize:12}}>Answer Review</div>
          {QUIZ_Q.map((q,i)=>{const ua=answers[q.id];const ok=ua===q.ans;return(
            <div key={q.id} className={`ac ${ok?"ao":"ab2"}`}>
              <div style={{fontSize:11.5,fontWeight:700,color:ok?"#34D399":"#F87171",marginBottom:4}}>{ok?"✓":"✗"} Q{i+1}: {q.topic}</div>
              <div style={{fontSize:11.5,color:"#94A3B8",lineHeight:1.5}}>Your: <strong>{q.opts[KEYS.indexOf(ua)]||"Unanswered"}</strong>{!ok&&<> · Correct: <strong style={{color:"#34D399"}}>{q.opts[KEYS.indexOf(q.ans)]}</strong></>}</div>
              {!ok&&<div style={{fontSize:11,color:"#64748B",marginTop:4}}>{q.exp}</div>}
            </div>
          );})}
        </div>
      </div>
    </div>
  );
  return (
    <div className="fade-in">
      <div className="ph"><div className="pt">Quiz Engine</div><div className="ps">Test your financial knowledge</div></div>
      <div className="g2">
        <div className="card gb">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span className="chd" style={{margin:0}}>Q {cur+1}/{QUIZ_Q.length}</span>
            <span className={`badge ${q.diff==="EASY"?"bg":q.diff==="MEDIUM"?"by":"br"}`}>{q.diff}</span>
          </div>
          <div style={{height:3,background:"rgba(255,255,255,0.06)",borderRadius:99,marginBottom:20}}>
            <div style={{height:"100%",width:`${((cur+1)/QUIZ_Q.length)*100}%`,background:"linear-gradient(90deg,#3B82F6,#8B5CF6)",borderRadius:99,transition:"width 0.4s ease"}}/>
          </div>
          <p style={{fontSize:14.5,fontWeight:600,lineHeight:1.65,color:"#E2E8F0",marginBottom:20}}>{q.text}</p>
          {q.opts.map((opt,i)=>{const key=KEYS[i];const sel=answers[q.id]===key;return(
            <div key={key} className={`qo ${sel?"sel":""}`} onClick={()=>select(key)}>
              <span className="ok-key">{key}</span><span>{opt}</span>
            </div>
          );})}
          <div className="btng" style={{marginTop:18}}>
            <button className="btn btn-g" style={{flex:1}} onClick={()=>setCur(p=>Math.max(0,p-1))} disabled={cur===0}>← Prev</button>
            {cur<QUIZ_Q.length-1?<button className="btn btn-p" style={{flex:1}} onClick={()=>setCur(p=>p+1)}>Next →</button>:<button className="btn btn-p" style={{flex:1}} onClick={submitQuiz} disabled={loading||Object.keys(answers).length<QUIZ_Q.length}>{loading?<Spinner/>:"Submit"}</button>}
          </div>
        </div>
        <div className="card">
          <div className="chd" style={{marginBottom:14}}><div className="chi" style={{background:"rgba(245,158,11,0.15)"}}><Icon name="quiz" size={14} color="#FCD34D"/></div>Navigator</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:16}}>
            {QUIZ_Q.map((_,i)=>(
              <div key={i} className="qdot" onClick={()=>setCur(i)} style={{background:answers[QUIZ_Q[i].id]?"rgba(59,130,246,0.25)":i===cur?"rgba(139,92,246,0.25)":"rgba(255,255,255,0.05)",border:i===cur?"1px solid rgba(139,92,246,0.5)":answers[QUIZ_Q[i].id]?"1px solid rgba(59,130,246,0.3)":"1px solid transparent",color:answers[QUIZ_Q[i].id]?"#60A5FA":i===cur?"#A78BFA":"var(--muted)"}}>{i+1}</div>
            ))}
          </div>
          <div className="div"/>
          <div style={{fontSize:12.5,color:"var(--muted)",lineHeight:1.8}}>
            <div><strong style={{color:"#CBD5E1"}}>Scoring: </strong>10 XP per correct</div>
            <div><strong style={{color:"#CBD5E1"}}>Answered: </strong>{Object.keys(answers).length}/{QUIZ_Q.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
// PAGE 6: STREAK & PROGRESS — GITHUB-STYLE HEATMAP
// ════════════════════════════════════════════════════════════════════

// Generate a full year of contribution data (52 weeks × 7 days)
function genYearData() {
  const weeks = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364);
  // Make sure we start on Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());
  let currentStreak = 0, maxStreak = 0, tempStreak = 0;
  const allDays = [];
  for (let w = 0; w < 53; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w*7 + d);
      const isFuture = date > today;
      let count = 0;
      if (!isFuture) {
        const rand = Math.random();
        if (rand > 0.35) count = Math.floor(Math.random() * 8) + 1;
        // Simulate recent active streak
        const daysAgo = Math.floor((today - date) / 86400000);
        if (daysAgo <= 12 && daysAgo >= 0) count = Math.floor(Math.random()*5)+3;
        if (daysAgo === 0) count = Math.floor(Math.random()*4)+4;
      }
      week.push({ count, date: new Date(date), isFuture });
      allDays.push(count);
    }
    weeks.push(week);
  }
  // Calculate streaks from allDays
  let best = 0, cur = 0;
  for (const c of allDays.slice(-90)) {
    if (c > 0) { cur++; best = Math.max(best, cur); } else cur = 0;
  }
  return { weeks, currentStreak: Math.min(cur, 12), maxStreak: Math.max(best, 19) };
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const HeatmapCell = ({ day, onHover, onLeave }) => {
  const getColor = (count) => {
    if (day.isFuture || count === 0) return "rgba(255,255,255,0.06)";
    if (count <= 2) return "#0e4429";
    if (count <= 4) return "#006d32";
    if (count <= 6) return "#26a641";
    return "#39d353";
  };
  return (
    <div
      className="hm-cell"
      style={{background: getColor(day.count), border: day.count > 0 && !day.isFuture ? "1px solid rgba(255,255,255,0.08)" : "1px solid transparent"}}
      onMouseEnter={e => onHover(e, day)}
      onMouseLeave={onLeave}
    />
  );
};

const ProgressPage = () => {
  const [yearData] = useState(() => genYearData());
  const [tooltip, setTooltip] = useState(null);
  const [snapshot, setSnapshot] = useState({
    total_points: 845, level: "Strategist",
    quiz_average: 86.67, prediction_accuracy: 74.29,
    avg_calibration: 0.828, engagement_score: 0.709,
    learning_consistency: "HIGH", skill_maturity: "EXPERT",
    points_to_next_level: 155,
    badges: [{ badge_id:"streak_silver", name:"Silver Streak", tier:"SILVER", description:"30+ consecutive days" }],
  });
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("user_42");

  // Calculate month labels positions
  const monthLabels = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 364);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  for (let w = 0; w < 53; w++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + w*7);
    if (d.getDate() <= 7) monthLabels.push({ week: w, label: MONTHS[d.getMonth()] });
  }

  const totalContribs = yearData.weeks.flat().reduce((a, d) => a + d.count, 0);
  const activeDays = yearData.weeks.flat().filter(d => !d.isFuture && d.count > 0).length;

  const handleHover = (e, day) => {
    if (day.isFuture) return;
    const rect = e.target.getBoundingClientRect();
    setTooltip({ x: rect.left + rect.width/2, y: rect.top - 8, day });
  };

  const compute = async () => {
    setLoading(true);
    try {
      await api.post("/education/progress/snapshot", { user_id: userId });
    } catch {}
    toast("Demo data loaded", "info");
    setLoading(false);
  };

  const maturityColor = { EXPERT:"#3B82F6", PROFICIENT:"#8B5CF6", COMPETENT:"#10B981", DEVELOPING:"#F59E0B" };
  const metrics = [
    { label:"Quiz Average", val:snapshot.quiz_average, cls:"pb" },
    { label:"Prediction Accuracy", val:snapshot.prediction_accuracy, cls:"pg" },
    { label:"Avg Calibration", val:snapshot.avg_calibration*100, cls:"pp" },
    { label:"Engagement Score", val:snapshot.engagement_score*100, cls:"py" },
  ];
  const lockedBadges = [{ name:"Gold Streak", icon:"🥇" }, { name:"Scholar", icon:"📚" }, { name:"Precision Trader", icon:"🎯" }];

  return (
    <div className="fade-in">
      <div className="ph"><div className="pt">Streak & Progress</div><div className="ps">Gamified learning journey with XP, badges, and GitHub-style activity tracking</div></div>

      {/* Hero */}
      <div className="g3" style={{marginBottom:16}}>
        {[
          { label:"Current Streak", val:yearData.currentStreak, suffix:"🔥 days", grad:"linear-gradient(90deg,#F59E0B,#EF4444)" },
          { label:"Total XP", val:snapshot.total_points, suffix:snapshot.level, grad:"linear-gradient(90deg,#3B82F6,#8B5CF6)" },
        ].map((s,i)=>(
          <div key={i} className="card" style={{textAlign:"center",padding:"22px 16px"}}>
            <div className="ml" style={{marginBottom:8}}>{s.label}</div>
            <div className="sb" style={{background:s.grad,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{s.val}</div>
            <div className="sl">{s.suffix}</div>
          </div>
        ))}
        <div className="card" style={{textAlign:"center",padding:"22px 16px"}}>
          <div className="ml" style={{marginBottom:8}}>Skill Maturity</div>
          <div style={{fontSize:24,fontFamily:"var(--font-d)",fontWeight:800,color:maturityColor[snapshot.skill_maturity]||"#60A5FA",marginBottom:6}}>{snapshot.skill_maturity}</div>
          <span className="badge bg">{snapshot.learning_consistency}</span>
        </div>
      </div>

      {/* XP Progress */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div className="chd" style={{margin:0}}><div className="chi" style={{background:"rgba(59,130,246,0.15)"}}><Icon name="award" size={14} color="#60A5FA"/></div>Level Progress — {snapshot.level}</div>
          <span style={{fontSize:12,color:"var(--muted)"}}>{snapshot.points_to_next_level} XP to next tier</span>
        </div>
        <div className="xpt"><div className="xpf" style={{width:`${Math.min(((snapshot.total_points%400)/400)*100,100)}%`}}/></div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,color:"var(--muted)"}}><span>{snapshot.total_points} XP</span><span>{snapshot.total_points+snapshot.points_to_next_level} XP</span></div>
      </div>

      {/* GITHUB HEATMAP */}
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div className="chd" style={{margin:0}}><div className="chi" style={{background:"rgba(57,211,83,0.15)"}}><Icon name="flame" size={14} color="#39d353"/></div>Activity Overview</div>
          <div style={{display:"flex",gap:12,fontSize:12,color:"var(--muted)"}}>
            <span><strong style={{color:"var(--text)"}}>{totalContribs}</strong> total sessions</span>
            <span><strong style={{color:"var(--text)"}}>{activeDays}</strong> active days</span>
          </div>
        </div>

        <div className="heatmap-wrap">
          {/* Month labels */}
          <div style={{display:"flex",marginBottom:4,paddingLeft:30}}>
            <div style={{display:"flex",gap:0,position:"relative",width:"100%"}}>
              {monthLabels.map((m,i) => (
                <div key={i} style={{position:"absolute",left:`${(m.week/53)*100}%`,fontSize:10,color:"var(--muted)",fontWeight:500,whiteSpace:"nowrap"}}>{m.label}</div>
              ))}
            </div>
          </div>
          <div style={{height:14}}/>

          <div className="hm-row">
            {/* Day labels */}
            <div className="hm-day-labels">
              {["","Mon","","Wed","","Fri",""].map((d,i) => (
                <div key={i} className="hm-day">{d}</div>
              ))}
            </div>
            {/* Cells grid */}
            <div className="heatmap-grid">
              {yearData.weeks.map((week, wi) => (
                <div key={wi} className="hm-col">
                  {week.map((day, di) => (
                    <HeatmapCell key={di} day={day} onHover={handleHover} onLeave={() => setTooltip(null)}/>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="contrib-legend">
          <span className="legend-lbl">Less</span>
          {["rgba(255,255,255,0.06)","#0e4429","#006d32","#26a641","#39d353"].map((c,i) => (
            <div key={i} className="hm-cell" style={{background:c,border:"1px solid rgba(255,255,255,0.08)",flexShrink:0}}/>
          ))}
          <span className="legend-lbl">More</span>
        </div>

        {/* Streak Summary */}
        <div className="streak-summary">
          <div className="streak-stat">
            <div className="streak-stat-val" style={{background:"linear-gradient(90deg,#F59E0B,#EF4444)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{yearData.currentStreak}</div>
            <div className="streak-stat-lbl">Current streak</div>
          </div>
          <div className="streak-stat">
            <div className="streak-stat-val" style={{color:"#60A5FA"}}>{yearData.maxStreak}</div>
            <div className="streak-stat-lbl">Longest streak</div>
          </div>
          <div className="streak-stat">
            <div className="streak-stat-val" style={{color:"#34D399"}}>{activeDays}</div>
            <div className="streak-stat-lbl">Active days</div>
          </div>
          <div className="streak-stat">
            <div className="streak-stat-val" style={{color:"#A78BFA"}}>{totalContribs}</div>
            <div className="streak-stat-lbl">Total sessions</div>
          </div>
        </div>
      </div>

      {/* Metrics + Badges */}
      <div className="g2" style={{marginBottom:16}}>
        <div className="card">
          <div className="chd" style={{marginBottom:14}}><div className="chi" style={{background:"rgba(16,185,129,0.15)"}}><Icon name="trending" size={14} color="#34D399"/></div>Performance Metrics</div>
          {metrics.map(m => (
            <div key={m.label} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <span style={{fontSize:12.5,color:"var(--text2)",fontWeight:500}}>{m.label}</span>
                <span style={{fontSize:13,fontFamily:"var(--font-d)",fontWeight:700,color:"#E2E8F0"}}>{m.val.toFixed(1)}%</span>
              </div>
              <ProgBar val={m.val} cls={m.cls} size="md"/>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="chd" style={{marginBottom:14}}><div className="chi" style={{background:"rgba(245,158,11,0.15)"}}><Icon name="award" size={14} color="#FCD34D"/></div>Earned Badges</div>
          <div className="bgrid">
            {snapshot.badges.map(b=>(
              <div key={b.badge_id} className="bpill" title={b.description}><span>{b.tier==="GOLD"?"🥇":b.tier==="SILVER"?"🥈":"🥉"}</span><span style={{fontSize:11.5}}>{b.name}</span></div>
            ))}
            {lockedBadges.filter(b=>!snapshot.badges.find(e=>e.name===b.name)).map(b=>(
              <div key={b.name} className="bpill" style={{opacity:0.3,filter:"grayscale(1)"}}><span>{b.icon}</span><span style={{fontSize:11.5}}>{b.name}</span></div>
            ))}
          </div>
          <div className="div"/>
          <div className="chd" style={{marginBottom:10,fontSize:12}}>Streak Stats</div>
          <div className="rp">
            <RRow label="Current Streak" value={`${yearData.currentStreak} days 🔥`}/>
            <RRow label="Personal Best" value={`${yearData.maxStreak} days ⭐`}/>
          </div>
        </div>
      </div>

      {/* Recompute */}
      <div className="card">
        <div className="chd" style={{marginBottom:14}}><div className="chi" style={{background:"rgba(59,130,246,0.15)"}}><Icon name="zap" size={14} color="#60A5FA"/></div>Recompute Snapshot</div>
        <div className="ig" style={{marginBottom:14}}>
          <Fld label="User ID"><input className="input" value={userId} onChange={e=>setUserId(e.target.value)}/></Fld>
          <Fld label="Current Streak"><input className="input" type="number" defaultValue={yearData.currentStreak}/></Fld>
        </div>
        <button className="btn btn-p" onClick={compute} disabled={loading}>{loading?<><Spinner/>Computing…</>:<><Icon name="zap" size={14} color="#fff"/>Recompute</>}</button>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="hm-tooltip" style={{left:tooltip.x,top:tooltip.y,transform:"translate(-50%,-100%)"}}>
          <strong style={{color:"#39d353"}}>{tooltip.day.count} session{tooltip.day.count!==1?"s":""}</strong> on {tooltip.day.date.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
        </div>
      )}
    </div>
  );
};

// ─── NAV + APP ────────────────────────────────────────────────────────────────
const NAV = [
  { id:"indicator",   label:"Indicator Explainer", icon:"chart" },
  { id:"ai-decision", label:"AI Decision",          icon:"brain" },
  { id:"playground",  label:"Trading Playground",  icon:"target" },
  { id:"strategy",    label:"Strategy Sim",         icon:"trending" },
  { id:"quiz",        label:"Quiz Engine",          icon:"quiz" },
  { id:"progress",    label:"Streak & Progress",    icon:"flame" },
];
const PAGE_MAP = { indicator:IndicatorPage, "ai-decision":AIDecisionPage, playground:PlaygroundPage, strategy:StrategyPage, quiz:QuizPage, progress:ProgressPage };

export default function App() {
  const [active, setActive] = useState("indicator");
  const [collapsed, setCollapsed] = useState(false);
  const Page = PAGE_MAP[active] || IndicatorPage;
  const cur = NAV.find(n => n.id === active);
  return (
    <>
      <style>{styles}</style>
      <div className={`app${collapsed?" sc":""}`}>
        <aside className="sidebar">
          <div className="sb-logo">
            <div className="logo-mark">AI</div>
            <span className="logo-txt">EduFin Platform</span>
          </div>
          <nav className="nav-sec">
            <div className="nav-lbl">Modules</div>
            {NAV.map(n => (
              <div key={n.id} className={`nav-item ${active===n.id?"active":""}`} onClick={()=>setActive(n.id)} title={collapsed?n.label:undefined}>
                <Icon name={n.icon} size={17} color={active===n.id?"#60A5FA":"#5A6A88"}/>
                <span className="nlbl">{n.label}</span>
              </div>
            ))}
          </nav>
          <div className="sb-foot">
            <div className="nav-item" onClick={()=>setCollapsed(p=>!p)}>
              <Icon name={collapsed?"chevron":"collapse"} size={17} color="#5A6A88"/>
              <span className="nlbl">{collapsed?"Expand":"Collapse"}</span>
            </div>
          </div>
        </aside>
        <header className="topbar">
          <div className="tb-bread">
            <span>EduFin</span>
            <span className="sep">/</span>
            <span className="mod">{cur?.label}</span>
          </div>
          <div className="tb-right">
            <div className="status-pill"><div className="sdot"/><span>Live</span></div>
            <span className="badge bpu" style={{fontSize:10.5}}>Intelligence v1.0</span>
          </div>
        </header>
        <main className="content" key={active}><Page/></main>
      </div>
      <Toast/>
    </>
  );
}