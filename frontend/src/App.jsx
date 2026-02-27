import { useState, useEffect, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL;
const api = {
  post: async (path, body) => {
    const r = await fetch(`${API_BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const json = await r.json();
    return json.data ?? json;
  },
  get: async (path) => {
    const r = await fetch(`${API_BASE}${path}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const json = await r.json();
    return json.data ?? json;
  },
};

// ─── DESIGN SYSTEM ────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #060A12;
    --bg2: #0A0F1C;
    --surface: rgba(255,255,255,0.032);
    --surface2: rgba(255,255,255,0.055);
    --surface-hover: rgba(255,255,255,0.062);
    --border: rgba(255,255,255,0.07);
    --border-bright: rgba(255,255,255,0.14);
    --text: #E4EAF4;
    --text2: #9AAAC2;
    --muted: #5A6A88;
    --accent: #3B82F6;
    --accent2: #8B5CF6;
    --green: #10B981;
    --red: #EF4444;
    --yellow: #F59E0B;
    --cyan: #06B6D4;
    --pink: #EC4899;
    --font-display: 'Syne', sans-serif;
    --font-body: 'DM Sans', sans-serif;
    --r: 14px;
    --r-sm: 9px;
    --r-lg: 20px;
    --sidebar-w: 230px;
    --topbar-h: 58px;
    --shadow: 0 8px 40px rgba(0,0,0,0.5);
    --shadow-sm: 0 4px 20px rgba(0,0,0,0.35);
    --glow-b: 0 0 40px rgba(59,130,246,0.12);
    --glow-p: 0 0 40px rgba(139,92,246,0.12);
    --glow-g: 0 0 40px rgba(16,185,129,0.1);
    --transition: 0.2s cubic-bezier(.4,0,.2,1);
  }

  html { font-size: 16px; }
  html, body, #root {
    height: 100%;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-body);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.09); border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.16); }

  /* ── LAYOUT ── */
  .app {
    display: grid;
    grid-template-columns: var(--sidebar-w) 1fr;
    grid-template-rows: var(--topbar-h) 1fr;
    grid-template-areas: "sidebar topbar" "sidebar content";
    height: 100vh;
    overflow: hidden;
  }
  .app.sidebar-collapsed {
    grid-template-columns: 58px 1fr;
  }

  /* ── SIDEBAR ── */
  .sidebar {
    grid-area: sidebar;
    background: rgba(6,10,18,0.97);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 20;
    transition: width var(--transition), grid-template-columns var(--transition);
  }

  .sidebar-logo {
    height: var(--topbar-h);
    padding: 0 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .logo-mark {
    width: 30px; height: 30px; flex-shrink: 0;
    background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
    border-radius: 8px;
    display: grid; place-items: center;
    font-family: var(--font-display);
    font-weight: 800; font-size: 12px;
    color: #fff;
    box-shadow: 0 0 16px rgba(59,130,246,0.35);
  }
  .logo-text {
    font-family: var(--font-display);
    font-weight: 700; font-size: 14px;
    background: linear-gradient(90deg, #fff 0%, #8B9EC4 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    white-space: nowrap; overflow: hidden;
    opacity: 1; transition: opacity var(--transition);
  }
  .sidebar-collapsed .logo-text { opacity: 0; width: 0; }

  .nav-section { padding: 12px 10px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }

  .nav-group-label {
    font-size: 9.5px; font-weight: 700; letter-spacing: 0.11em;
    color: var(--muted); text-transform: uppercase;
    padding: 10px 10px 6px;
    white-space: nowrap; overflow: hidden;
    transition: opacity var(--transition);
  }
  .sidebar-collapsed .nav-group-label { opacity: 0; }

  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 10px; border-radius: var(--r-sm);
    cursor: pointer; transition: all var(--transition);
    border: 1px solid transparent;
    font-size: 13px; font-weight: 500;
    color: var(--muted);
    white-space: nowrap; overflow: hidden;
    position: relative;
    text-decoration: none;
  }
  .nav-item:hover { color: var(--text); background: var(--surface-hover); }
  .nav-item.active {
    color: #E0EAFF;
    background: linear-gradient(100deg, rgba(59,130,246,0.18) 0%, rgba(139,92,246,0.09) 100%);
    border-color: rgba(59,130,246,0.22);
  }
  .nav-item.active::before {
    content: '';
    position: absolute; left: 0; top: 20%; bottom: 20%;
    width: 2.5px;
    background: linear-gradient(180deg, #3B82F6, #8B5CF6);
    border-radius: 0 2px 2px 0;
  }
  .nav-icon { width: 18px; height: 18px; flex-shrink: 0; }
  .nav-item span.nav-label-text { transition: opacity var(--transition); }
  .sidebar-collapsed .nav-item span.nav-label-text { opacity: 0; width: 0; overflow: hidden; }

  .sidebar-footer {
    padding: 10px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }
  .sidebar-footer .nav-item { color: var(--muted); }

  /* ── TOPBAR ── */
  .topbar {
    grid-area: topbar;
    height: var(--topbar-h);
    background: rgba(6,10,18,0.92);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center;
    justify-content: space-between;
    padding: 0 20px 0 24px;
    backdrop-filter: blur(20px);
    position: sticky; top: 0; z-index: 10;
    gap: 12px;
  }
  .topbar-breadcrumb {
    display: flex; align-items: center; gap: 6px;
    font-family: var(--font-display);
    font-weight: 700; font-size: 15px;
    color: var(--text);
    white-space: nowrap;
  }
  .topbar-breadcrumb .crumb-sep { color: var(--muted); font-weight: 300; }
  .topbar-breadcrumb .crumb-module { color: var(--text2); font-size: 13px; font-weight: 500; font-family: var(--font-body); }

  .topbar-right {
    display: flex; align-items: center; gap: 8px;
    flex-shrink: 0;
  }
  .status-pill {
    display: flex; align-items: center; gap: 6px;
    padding: 5px 10px; border-radius: 99px;
    background: rgba(16,185,129,0.1);
    border: 1px solid rgba(16,185,129,0.2);
    font-size: 11.5px; font-weight: 600;
    color: #34D399;
  }
  .status-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: #10B981;
    box-shadow: 0 0 6px #10B981;
    animation: pulse-dot 2.5s ease-in-out infinite;
  }
  @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1);} 50%{opacity:.5;transform:scale(0.8);} }

  /* ── CONTENT ── */
  .content {
    grid-area: content;
    overflow-y: auto;
    background: var(--bg);
    padding: 28px;
  }

  /* ── PAGE HEADER ── */
  .page-header { margin-bottom: 28px; }
  .page-title {
    font-family: var(--font-display);
    font-weight: 800; font-size: 24px;
    background: linear-gradient(90deg, #fff 0%, #8B9EC4 80%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    line-height: 1.2; margin-bottom: 5px;
  }
  .page-sub { font-size: 13px; color: var(--muted); line-height: 1.5; }

  /* ── CARDS ── */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--r);
    padding: 20px;
    backdrop-filter: blur(12px);
    transition: border-color var(--transition), box-shadow var(--transition), transform var(--transition);
    position: relative; overflow: hidden;
  }
  .card:hover {
    border-color: var(--border-bright);
    box-shadow: var(--shadow-sm);
  }
  .card.glow-b { box-shadow: var(--glow-b); }
  .card.glow-p { box-shadow: var(--glow-p); }
  .card.glow-g { box-shadow: var(--glow-g); }

  .card-hd {
    display: flex; align-items: center; gap: 8px;
    font-family: var(--font-display);
    font-weight: 700; font-size: 13px;
    color: #C4CFDE;
    margin-bottom: 18px;
  }
  .card-hd-icon {
    width: 28px; height: 28px;
    border-radius: 7px;
    display: grid; place-items: center;
    flex-shrink: 0;
  }

  /* ── GRID ── */
  .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .g-auto { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
  .gap-sm { gap: 10px; }
  .col-span-2 { grid-column: span 2; }

  /* ── FORM ELEMENTS ── */
  .field { display: flex; flex-direction: column; gap: 6px; }
  .field + .field { margin-top: 12px; }
  .field-label {
    font-size: 11px; font-weight: 600;
    color: var(--muted);
    text-transform: uppercase; letter-spacing: 0.09em;
  }

  .input, .select {
    width: 100%;
    padding: 9px 13px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: var(--r-sm);
    color: var(--text);
    font-family: var(--font-body); font-size: 13px;
    outline: none;
    transition: all var(--transition);
    -webkit-appearance: none; appearance: none;
  }
  .input:focus, .select:focus {
    border-color: rgba(59,130,246,0.5);
    background: rgba(59,130,246,0.05);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.09);
  }
  .input::placeholder { color: var(--muted); }
  .select {
    cursor: pointer;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%235A6A88' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 11px center;
    padding-right: 32px;
  }
  .select option { background: #0D1425; }

  .inline-g { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

  /* ── SLIDER ── */
  .slider-wrap { display: flex; flex-direction: column; gap: 6px; }
  .slider-wrap + .slider-wrap { margin-top: 12px; }
  .slider-top { display: flex; align-items: center; justify-content: space-between; }
  .slider-val {
    font-size: 12px; font-weight: 700;
    color: #60A5FA;
    font-family: var(--font-display);
    background: rgba(59,130,246,0.12);
    padding: 2px 7px; border-radius: 5px;
    border: 1px solid rgba(59,130,246,0.2);
  }
  input[type=range] {
    -webkit-appearance: none; width: 100%; height: 3px;
    background: rgba(255,255,255,0.1); border-radius: 2px; outline: none;
    cursor: pointer;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none; width: 15px; height: 15px; border-radius: 50%;
    background: linear-gradient(135deg, #3B82F6, #8B5CF6);
    cursor: pointer; box-shadow: 0 0 0 3px rgba(59,130,246,0.2);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  input[type=range]::-webkit-slider-thumb:hover {
    transform: scale(1.25);
    box-shadow: 0 0 0 4px rgba(59,130,246,0.3);
  }

  /* ── BUTTONS ── */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 7px;
    padding: 9px 18px;
    border-radius: var(--r-sm);
    font-family: var(--font-body); font-weight: 600; font-size: 13px;
    cursor: pointer; border: none;
    transition: all var(--transition);
    letter-spacing: 0.01em;
    white-space: nowrap;
  }
  .btn-primary {
    background: linear-gradient(135deg, #3B82F6, #6366F1);
    color: #fff;
    box-shadow: 0 3px 14px rgba(59,130,246,0.28);
  }
  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 22px rgba(59,130,246,0.42);
  }
  .btn-primary:active:not(:disabled) { transform: translateY(0); }
  .btn-primary:disabled { opacity: 0.45; cursor: not-allowed; }
  .btn-ghost {
    background: var(--surface);
    border: 1px solid var(--border);
    color: var(--text2);
  }
  .btn-ghost:hover { background: var(--surface-hover); border-color: var(--border-bright); color: var(--text); }
  .btn-full { width: 100%; }
  .btn-group { display: flex; gap: 6px; }

  /* ── BADGES ── */
  .badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 9px; border-radius: 99px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.03em;
    border: 1px solid;
  }
  .badge-blue   { background: rgba(59,130,246,0.13); color: #60A5FA; border-color: rgba(59,130,246,0.22); }
  .badge-green  { background: rgba(16,185,129,0.13); color: #34D399; border-color: rgba(16,185,129,0.22); }
  .badge-red    { background: rgba(239,68,68,0.13); color: #F87171; border-color: rgba(239,68,68,0.22); }
  .badge-yellow { background: rgba(245,158,11,0.13); color: #FCD34D; border-color: rgba(245,158,11,0.22); }
  .badge-purple { background: rgba(139,92,246,0.13); color: #A78BFA; border-color: rgba(139,92,246,0.22); }
  .badge-cyan   { background: rgba(6,182,212,0.13); color: #22D3EE; border-color: rgba(6,182,212,0.22); }
  .badge-pink   { background: rgba(236,72,153,0.13); color: #F472B6; border-color: rgba(236,72,153,0.22); }
  .badge-sm { font-size: 9px; padding: 2px 7px; }

  /* ── RESULT PANEL ── */
  .result-panel {
    background: rgba(59,130,246,0.04);
    border: 1px solid rgba(59,130,246,0.12);
    border-radius: var(--r-sm);
    overflow: hidden;
    animation: fadeUp 0.3s ease;
  }
  @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

  .result-row {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 10px 14px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    gap: 12px;
  }
  .result-row:last-child { border-bottom: none; }
  .result-key {
    font-size: 10.5px; font-weight: 600; color: var(--muted);
    text-transform: uppercase; letter-spacing: 0.09em;
    flex-shrink: 0; padding-top: 1px;
  }
  .result-val { font-size: 13px; color: var(--text); text-align: right; line-height: 1.5; }

  .result-block {
    padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05);
    display: flex; flex-direction: column; gap: 5px;
  }
  .result-block:last-child { border-bottom: none; }

  /* ── PROGRESS BAR ── */
  .prog { height: 5px; background: rgba(255,255,255,0.07); border-radius: 99px; overflow: hidden; }
  .prog.prog-md { height: 7px; }
  .prog.prog-lg { height: 10px; }
  .prog-fill { height: 100%; border-radius: 99px; transition: width 1s cubic-bezier(.4,0,.2,1); }
  .prog-b { background: linear-gradient(90deg, #3B82F6, #6366F1); }
  .prog-g { background: linear-gradient(90deg, #10B981, #06B6D4); }
  .prog-p { background: linear-gradient(90deg, #8B5CF6, #EC4899); }
  .prog-y { background: linear-gradient(90deg, #F59E0B, #EF4444); }

  /* ── XP BAR ── */
  .xp-track {
    height: 8px; background: rgba(255,255,255,0.06);
    border-radius: 99px; overflow: hidden; position: relative;
  }
  .xp-fill {
    height: 100%;
    background: linear-gradient(90deg, #3B82F6, #8B5CF6, #EC4899);
    border-radius: 99px;
    transition: width 1.3s cubic-bezier(.4,0,.2,1);
    position: relative;
  }
  .xp-fill::after {
    content: '';
    position: absolute; right: 0; top: 0; bottom: 0;
    width: 16px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3));
    border-radius: 99px;
  }

  /* ── SPINNER ── */
  .spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.12);
    border-top-color: #3B82F6;
    border-radius: 50%;
    animation: spin 0.65s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── TOAST ── */
  .toast-container {
    position: fixed; bottom: 20px; right: 20px;
    z-index: 9999; display: flex; flex-direction: column; gap: 6px;
    pointer-events: none;
  }
  .toast {
    display: flex; align-items: center; gap: 9px;
    padding: 11px 16px; border-radius: var(--r-sm);
    font-size: 13px; font-weight: 500;
    backdrop-filter: blur(20px);
    border: 1px solid;
    animation: slideInRight 0.3s ease, fadeOutToast 0.35s ease 2.65s forwards;
    max-width: 320px;
    pointer-events: all;
    box-shadow: var(--shadow-sm);
  }
  .toast-success { background: rgba(16,185,129,0.14); border-color: rgba(16,185,129,0.28); color: #34D399; }
  .toast-error   { background: rgba(239,68,68,0.14); border-color: rgba(239,68,68,0.28); color: #F87171; }
  .toast-info    { background: rgba(59,130,246,0.14); border-color: rgba(59,130,246,0.28); color: #60A5FA; }
  @keyframes slideInRight { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }
  @keyframes fadeOutToast { to { opacity:0; transform:translateX(10px); } }

  /* ── INFO BANNER ── */
  .info-banner {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 11px 14px;
    background: rgba(59,130,246,0.06);
    border: 1px solid rgba(59,130,246,0.15);
    border-radius: var(--r-sm);
    font-size: 12.5px; color: #93C5FD; line-height: 1.6;
    margin-bottom: 16px;
  }
  .info-banner svg { flex-shrink: 0; margin-top: 1px; }

  .warn-banner {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 11px 14px;
    background: rgba(245,158,11,0.07);
    border: 1px solid rgba(245,158,11,0.18);
    border-radius: var(--r-sm);
    font-size: 12px; color: #FCD34D; line-height: 1.6;
  }

  /* ── QUIZ ── */
  .quiz-opt {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 13px; border-radius: var(--r-sm);
    border: 1px solid var(--border); cursor: pointer;
    transition: all var(--transition); margin-bottom: 7px;
    font-size: 13px; line-height: 1.4;
  }
  .quiz-opt:hover { background: var(--surface-hover); border-color: var(--border-bright); }
  .quiz-opt.sel   { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.38); color: #93C5FD; }
  .quiz-opt.ok    { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.38); }
  .quiz-opt.wrong { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.38); }
  .opt-key {
    width: 24px; height: 24px; border-radius: 6px;
    background: rgba(255,255,255,0.07); display: grid;
    place-items: center; font-size: 11px; font-weight: 700;
    flex-shrink: 0;
  }

  /* ── METRIC ── */
  .metric-val { font-family: var(--font-display); font-size: 30px; font-weight: 800; line-height: 1; }
  .metric-lbl { font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }

  /* ── STAT BIG ── */
  .stat-big { font-family: var(--font-display); font-size: 46px; font-weight: 800; line-height: 1; }
  .stat-lbl { font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 5px; }

  /* ── DIVIDER ── */
  .div { height: 1px; background: var(--border); margin: 14px 0; }

  /* ── CONTRIB ── */
  .contrib { margin-bottom: 13px; }
  .contrib-hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }
  .contrib-name { font-size: 11.5px; font-weight: 600; color: var(--text2); text-transform: uppercase; letter-spacing: 0.05em; }
  .contrib-score { font-size: 12px; font-weight: 700; font-family: var(--font-display); }

  /* ── BADGE GRID ── */
  .badge-grid { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
  .badge-pill {
    display: flex; align-items: center; gap: 5px;
    padding: 5px 10px; border-radius: 8px;
    font-size: 11.5px; font-weight: 600;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.09);
    transition: all var(--transition); cursor: default;
  }
  .badge-pill:hover { background: rgba(255,255,255,0.09); transform: translateY(-1px); }

  /* ── DIRECTION BTNS ── */
  .dir-btns { display: flex; gap: 6px; }
  .dir-btn {
    flex: 1; padding: 8px 6px;
    border-radius: var(--r-sm);
    font-size: 12px; font-weight: 700;
    cursor: pointer; border: 1px solid var(--border);
    background: var(--surface);
    color: var(--muted);
    transition: all var(--transition);
  }
  .dir-btn:hover { color: var(--text); border-color: var(--border-bright); }
  .dir-btn.active-buy   { background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.35); color: #34D399; }
  .dir-btn.active-sell  { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.35); color: #F87171; }
  .dir-btn.active-hold  { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.35); color: #FCD34D; }

  /* ── TABS ── */
  .tabs { display: flex; gap: 3px; background: rgba(255,255,255,0.04); padding: 4px; border-radius: var(--r-sm); margin-bottom: 16px; }
  .tab { flex: 1; padding: 7px 10px; border-radius: 7px; cursor: pointer; font-size: 12px; font-weight: 600; text-align: center; transition: all var(--transition); color: var(--muted); border: 1px solid transparent; }
  .tab.active { background: rgba(59,130,246,0.18); color: #60A5FA; border-color: rgba(59,130,246,0.2); }
  .tab:hover:not(.active) { color: var(--text2); background: var(--surface-hover); }

  /* ── QUIZ NAV DOTS ── */
  .q-nav { display: flex; gap: 5px; flex-wrap: wrap; }
  .q-dot {
    width: 34px; height: 34px; border-radius: 8px;
    display: grid; place-items: center;
    cursor: pointer; font-size: 12.5px; font-weight: 700;
    font-family: var(--font-display);
    transition: all var(--transition);
    border: 1px solid transparent;
  }

  /* ── SCORE CIRCLE ── */
  .score-circle {
    width: 110px; height: 110px; border-radius: 50%;
    background: conic-gradient(from 180deg, #3B82F6, #8B5CF6, #3B82F6);
    display: grid; place-items: center;
    margin: 0 auto 10px;
    box-shadow: 0 0 40px rgba(59,130,246,0.2);
    position: relative;
  }
  .score-circle::before {
    content: '';
    position: absolute; inset: 6px; border-radius: 50%;
    background: var(--bg2);
  }
  .score-inner { position: relative; z-index: 1; text-align: center; }
  .score-num { font-family: var(--font-display); font-size: 26px; font-weight: 800; color: #fff; }
  .score-denom { font-size: 10px; color: var(--muted); }

  /* ── ANSWER REVIEW ── */
  .ans-card {
    padding: 10px 12px; border-radius: var(--r-sm);
    margin-bottom: 8px;
  }
  .ans-card.ans-ok   { background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.18); }
  .ans-card.ans-bad  { background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.18); }

  /* ── METRIC MINI ── */
  .metric-mini {
    padding: 16px 18px;
    display: flex; flex-direction: column; gap: 6px;
  }

  /* ── ANIMATION ── */
  .fade-in { animation: fadeIn 0.35s ease both; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }

  /* ── EMPTY STATE ── */
  .empty {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 40px 20px; gap: 10px;
    color: var(--muted);
  }
  .empty p { font-size: 13px; text-align: center; }

  /* ── RESPONSIVE ── */
  @media (max-width: 1024px) {
    :root { --sidebar-w: 58px; }
    .logo-text, .nav-group-label { opacity: 0; width: 0; overflow: hidden; }
    .nav-item span.nav-label-text { opacity: 0; width: 0; overflow: hidden; }
    .sidebar-footer .nav-item span.nav-label-text { opacity: 0; width: 0; overflow: hidden; }
    .topbar-breadcrumb .crumb-module { display: none; }
    .g3 { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 768px) {
    :root { --sidebar-w: 0px; }
    .app { grid-template-columns: 0 1fr; }
    .sidebar { display: none; }
    .content { padding: 16px; }
    .g2, .g3, .g-auto { grid-template-columns: 1fr; }
    .topbar { padding: 0 16px; }
    .col-span-2 { grid-column: span 1; }
  }
  @media (max-width: 480px) {
    .content { padding: 12px; }
    .page-title { font-size: 20px; }
    .metric-val { font-size: 24px; }
    .stat-big { font-size: 38px; }
  }
`;

// ─── SVG ICONS ────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 16, color = "currentColor", style }) => {
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
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="nav-icon" style={style}>
      {icons[name] || null}
    </svg>
  );
};

// ─── TOAST ───────────────────────────────────────────────────────────────────
let _addToast = null;
const Toast = () => {
  const [toasts, setToasts] = useState([]);
  _addToast = (msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  };
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <Icon name={t.type === "success" ? "check" : t.type === "error" ? "x" : "info"} size={14} />
          {t.msg}
        </div>
      ))}
    </div>
  );
};
const toast = (msg, type) => _addToast?.(msg, type);

// ─── SHARED ───────────────────────────────────────────────────────────────────
const Spinner = () => <div className="spinner" />;

const Fld = ({ label, children }) => (
  <div className="field">
    <label className="field-label">{label}</label>
    {children}
  </div>
);

const Slider = ({ label, name, value, onChange, min = 0, max = 1, step = 0.01 }) => (
  <div className="slider-wrap">
    <div className="slider-top">
      <label className="field-label" style={{ margin: 0 }}>{label}</label>
      <span className="slider-val">{parseFloat(value).toFixed(2)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(name, parseFloat(e.target.value))} />
  </div>
);

const SignalBadge = ({ signal }) => {
  const map = {
    BULLISH:"badge-green", BEARISH:"badge-red", NEUTRAL:"badge-yellow",
    OVERBOUGHT:"badge-red", OVERSOLD:"badge-green",
    BUY:"badge-green", SELL:"badge-red", HOLD:"badge-yellow", WAIT:"badge-yellow",
    HIGH:"badge-blue", MEDIUM:"badge-yellow", LOW:"badge-purple",
    CORRECT:"badge-green", INCORRECT:"badge-red",
    STRONG:"badge-blue", MODERATE:"badge-yellow", WEAK:"badge-red", UNRELIABLE:"badge-red",
    ADVANCED:"badge-cyan", INTERMEDIATE:"badge-blue", BEGINNER:"badge-yellow",
    CALIBRATED:"badge-green", OVERCONFIDENT:"badge-red", UNDERCONFIDENT:"badge-purple",
  };
  return <span className={`badge ${map[signal] || "badge-blue"}`}>{signal}</span>;
};

const RRow = ({ label, value, isSignal }) => (
  <div className="result-row">
    <span className="result-key">{label}</span>
    <span className="result-val">{isSignal ? <SignalBadge signal={value} /> : value}</span>
  </div>
);

const RBlock = ({ label, children }) => (
  <div className="result-block">
    <span className="result-key">{label}</span>
    <div>{children}</div>
  </div>
);

const Empty = ({ icon = "chart", text = "Configure and run analysis" }) => (
  <div className="empty">
    <Icon name={icon} size={36} color="#2A3450" />
    <p>{text}</p>
  </div>
);

const ProgBar = ({ val, cls = "prog-b", size = "" }) => (
  <div className={`prog ${size}`}>
    <div className={`prog-fill ${cls}`} style={{ width: `${Math.min(Math.max(val, 0), 100)}%` }} />
  </div>
);

// ─── QUIZ DATA ────────────────────────────────────────────────────────────────
const QUIZ_Q = [
  { id:"q1", text:"An RSI reading of 78 indicates which condition?", opts:["Oversold","Neutral","Overbought","Trending"], ans:"C", topic:"RSI", diff:"EASY", exp:"RSI above 70 indicates overbought conditions where price momentum may be exhausted." },
  { id:"q2", text:"What is variance drag in high-volatility environments?", opts:["Transaction cost increase","Reduction in compounded returns from volatility","Moving average lag","Bid-ask spread widening"], ans:"B", topic:"VOLATILITY", diff:"MEDIUM", exp:"Variance drag is the mathematical reduction in compounded returns caused by volatility. A 20% gain then 20% loss = -4% net, not breakeven." },
  { id:"q3", text:"A risk score of 0.85 should primarily affect which parameter?", opts:["Entry timing only","Position sizing and stop-loss","Trade direction","Holding period"], ans:"B", topic:"RISK", diff:"MEDIUM", exp:"High risk scores signal elevated exposure. Primary response: reduce position size and tighten stop-loss parameters." },
];
const KEYS = ["A","B","C","D"];

// ─── PAGE: INDICATOR EXPLAINER ────────────────────────────────────────────────
const IndicatorPage = () => {
  const [form, setForm] = useState({ indicator:"RSI", value:73.5, timeframe:"1D", market_regime:"trending", current_price:"", avg_volume:"" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const analyze = async () => {
    setLoading(true);
    try {
      const extra = {};
      if (form.current_price) extra.current_price = parseFloat(form.current_price);
      if (form.avg_volume) extra.avg_volume = parseFloat(form.avg_volume);
      const res = await api.post("/education/indicator/explain", { indicator: form.indicator, value: parseFloat(form.value), context: { timeframe: form.timeframe, asset_class: "equity", market_regime: form.market_regime, extra } });
      setResult(res); toast("Analysis complete", "success");
    } catch {
      toast("Demo mode — showing sample result", "error");
      setResult({ indicator_name: form.indicator, value: form.value, market_signal:"OVERBOUGHT", interpretation:"RSI at 73.5 exceeds the overbought threshold. Upward momentum remains but exhaustion signals are present. Consider reducing long exposure or tightening stops.", trading_bias:"HOLD", confidence_hint:"MEDIUM", risk_note:"In strong trending markets RSI can remain overbought for extended periods — use price action confirmation.", definition:"The RSI is a momentum oscillator measuring speed and magnitude of price changes on a 0–100 scale." });
    }
    setLoading(false);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">Indicator Explainer</div>
        <div className="page-sub">Deterministic rule-based analysis for RSI, EMA, SMA, Volume & Volatility</div>
      </div>
      <div className="g2">
        {/* Input */}
        <div className="card glow-b">
          <div className="card-hd">
            <div className="card-hd-icon" style={{ background:"rgba(59,130,246,0.15)" }}><Icon name="chart" size={14} color="#60A5FA" /></div>
            Configuration
          </div>
          <Fld label="Indicator">
            <select className="select" value={form.indicator} onChange={e => set("indicator", e.target.value)}>
              {["RSI","EMA","SMA","Volume","Volatility"].map(i => <option key={i}>{i}</option>)}
            </select>
          </Fld>
          <div style={{ marginTop: 12 }} />
          <Fld label="Current Value">
            <input className="input" type="number" value={form.value} onChange={e => set("value", e.target.value)} placeholder="e.g. 73.5" />
          </Fld>
          <div className="inline-g" style={{ marginTop: 12 }}>
            <Fld label="Timeframe">
              <select className="select" value={form.timeframe} onChange={e => set("timeframe", e.target.value)}>
                {["1M","5M","15M","1H","4H","1D","1W"].map(t => <option key={t}>{t}</option>)}
              </select>
            </Fld>
            <Fld label="Market Regime">
              <select className="select" value={form.market_regime} onChange={e => set("market_regime", e.target.value)}>
                {["trending","ranging","volatile","unknown"].map(r => <option key={r}>{r}</option>)}
              </select>
            </Fld>
          </div>
          {(form.indicator === "EMA" || form.indicator === "SMA") && (
            <div style={{ marginTop: 12 }}>
              <Fld label="Current Price">
                <input className="input" type="number" value={form.current_price} onChange={e => set("current_price", e.target.value)} placeholder="e.g. 194.75" />
              </Fld>
            </div>
          )}
          {form.indicator === "Volume" && (
            <div style={{ marginTop: 12 }}>
              <Fld label="Average Volume">
                <input className="input" type="number" value={form.avg_volume} onChange={e => set("avg_volume", e.target.value)} placeholder="e.g. 4200000" />
              </Fld>
            </div>
          )}
          <div style={{ marginTop: 18 }}>
            <button className="btn btn-primary btn-full" onClick={analyze} disabled={loading}>
              {loading ? <><Spinner /> Analyzing…</> : <><Icon name="zap" size={14} color="#fff" /> Analyze Indicator</>}
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="card">
          <div className="card-hd">
            <div className="card-hd-icon" style={{ background:"rgba(139,92,246,0.15)" }}><Icon name="info" size={14} color="#A78BFA" /></div>
            Analysis Result
          </div>
          {result ? (
            <div className="result-panel">
              <RRow label="Indicator" value={result.indicator_name} />
              <RRow label="Signal" value={result.market_signal} isSignal />
              <RRow label="Trading Bias" value={result.trading_bias} isSignal />
              <RRow label="Confidence" value={result.confidence_hint} isSignal />
              <RBlock label="Interpretation">
                <p style={{ fontSize:12.5, color:"#CBD5E1", lineHeight:1.65 }}>{result.interpretation}</p>
              </RBlock>
              <RBlock label="Risk Note">
                <div className="warn-banner" style={{ padding:"8px 10px", margin:0 }}>
                  <p style={{ fontSize:12, lineHeight:1.6, margin:0 }}>{result.risk_note}</p>
                </div>
              </RBlock>
            </div>
          ) : <Empty />}
        </div>
      </div>
    </div>
  );
};

// ─── PAGE: AI DECISION ────────────────────────────────────────────────────────
const AIDecisionPage = () => {
  const [scores, setScores] = useState({ lstm_score:0.78, cnn_score:0.72, technical_score:0.68, sentiment_score:0.61, risk_score:0.35, confidence:0.76 });
  const [decision, setDecision] = useState("BUY");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const setS = (k, v) => setScores(p => ({ ...p, [k]: v }));

  const colors = ["prog-b","prog-g","prog-p","prog-y","prog-b"];
  const modelLabels = { lstm:"LSTM Trend", cnn:"CNN Pattern", technical:"Technical", sentiment:"Sentiment", risk:"Risk (inv.)" };

  const submit = async () => {
    setLoading(true);
    try {
      const res = await api.post("/education/ai-decision/explain", { ...scores, final_decision: decision });
      setResult(res); toast("Decision explained", "success");
    } catch {
      toast("Demo mode — showing sample result", "error");
      setResult({
        final_decision: decision, confidence: scores.confidence,
        agreement_level:"HIGH", agreement_ratio:1.0, explanation_strength:"STRONG",
        weighted_contributions: {
          lstm:{ raw_score:0.78, weight:0.3, contribution:0.234 },
          cnn:{ raw_score:0.72, weight:0.2, contribution:0.144 },
          technical:{ raw_score:0.68, weight:0.25, contribution:0.17 },
          sentiment:{ raw_score:0.61, weight:0.15, contribution:0.0915 },
          risk:{ raw_score:0.65, weight:0.1, contribution:0.065 },
        },
        reasoning_points:[
          "LSTM signals strong upside momentum (0.78)",
          "CNN identified bullish pattern formation (0.72)",
          "Technical indicators aligned bullish (0.68)",
          "News sentiment neutral-positive (0.61)",
          "Risk within acceptable bounds (0.35)",
        ],
        risk_adjustment_explanation:"Risk score 0.35 is within acceptable bounds. No material confidence penalty applied.",
      });
    }
    setLoading(false);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">AI Decision Explainer</div>
        <div className="page-sub">Decompose ensemble model contributions with weighted attribution</div>
      </div>
      <div className="g2">
        {/* Inputs */}
        <div className="card glow-p">
          <div className="card-hd">
            <div className="card-hd-icon" style={{ background:"rgba(139,92,246,0.15)" }}><Icon name="brain" size={14} color="#A78BFA" /></div>
            Model Inputs
          </div>
          <Slider label="LSTM Score" name="lstm_score" value={scores.lstm_score} onChange={setS} />
          <Slider label="CNN Score" name="cnn_score" value={scores.cnn_score} onChange={setS} />
          <Slider label="Technical Score" name="technical_score" value={scores.technical_score} onChange={setS} />
          <Slider label="Sentiment Score" name="sentiment_score" value={scores.sentiment_score} onChange={setS} />
          <Slider label="Risk Score" name="risk_score" value={scores.risk_score} onChange={setS} />
          <Slider label="Confidence" name="confidence" value={scores.confidence} onChange={setS} />
          <div style={{ marginTop: 12 }}>
            <Fld label="Final Decision">
              <select className="select" value={decision} onChange={e => setDecision(e.target.value)}>
                {["BUY","SELL","HOLD"].map(d => <option key={d}>{d}</option>)}
              </select>
            </Fld>
          </div>
          <div style={{ marginTop: 18 }}>
            <button className="btn btn-primary btn-full" onClick={submit} disabled={loading}>
              {loading ? <><Spinner /> Processing…</> : <><Icon name="brain" size={14} color="#fff" /> Explain Decision</>}
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="card">
          <div className="card-hd">
            <div className="card-hd-icon" style={{ background:"rgba(59,130,246,0.15)" }}><Icon name="trending" size={14} color="#60A5FA" /></div>
            Decision Breakdown
          </div>
          {result ? (
            <>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
                <SignalBadge signal={result.final_decision} />
                <SignalBadge signal={result.agreement_level} />
                <SignalBadge signal={result.explanation_strength} />
              </div>
              <div style={{ marginBottom:16 }}>
                {Object.entries(result.weighted_contributions).map(([model, data], i) => (
                  <div key={model} className="contrib">
                    <div className="contrib-hd">
                      <span className="contrib-name">{modelLabels[model] || model}</span>
                      <span className="contrib-score" style={{ color:"#60A5FA" }}>
                        {(data.raw_score*100).toFixed(0)}% × {(data.weight*100).toFixed(0)}% = {(data.contribution*100).toFixed(1)}%
                      </span>
                    </div>
                    <ProgBar val={data.contribution * 300} cls={colors[i]} />
                  </div>
                ))}
              </div>
              <div className="div" />
              <div style={{ fontSize:12.5, color:"#CBD5E1", lineHeight:1.7, display:"flex", flexDirection:"column", gap:4, marginBottom:12 }}>
                {result.reasoning_points?.map((pt, i) => (
                  <div key={i} style={{ display:"flex", gap:7, alignItems:"flex-start" }}>
                    <span style={{ color:"#3B82F6", flexShrink:0, marginTop:2 }}>›</span>{pt}
                  </div>
                ))}
              </div>
              <div className="warn-banner">
                <Icon name="info" size={14} color="#FCD34D" />
                <span>{result.risk_adjustment_explanation}</span>
              </div>
            </>
          ) : <Empty icon="brain" text="Configure model scores and submit" />}
        </div>
      </div>
    </div>
  );
};

// ─── PAGE: PLAYGROUND ─────────────────────────────────────────────────────────
const PlaygroundPage = () => {
  const [form, setForm] = useState({ user_prediction:"BUY", user_confidence:0.75, ai_prediction:"BUY", actual_outcome:"SELL" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    setLoading(true);
    try {
      const res = await api.post("/education/playground/evaluate", form);
      setResult(res); toast("Prediction evaluated", "success");
    } catch {
      toast("Demo mode — local evaluation", "error");
      const hit = form.user_prediction === form.actual_outcome;
      setResult({
        user_prediction: form.user_prediction, ai_prediction: form.ai_prediction,
        actual_outcome: form.actual_outcome, user_confidence: form.user_confidence,
        correctness: hit ? "CORRECT" : "INCORRECT",
        accuracy_score: hit ? 1.0 : 0.0,
        calibration_score: 0.19, calibration_level:"OVERCONFIDENT",
        bias_detection:{ type:"CALIBRATED", explanation:"No persistent directional bias detected." },
        feedback_report:{
          outcome_summary:`Your prediction (${form.user_prediction}) ${hit ? "matched" : "did not match"} the actual outcome (${form.actual_outcome}).`,
          confidence_assessment:`You stated ${(form.user_confidence*100).toFixed(0)}% confidence. Calibration: OVERCONFIDENT. Score: 0.190/1.000`,
          ai_comparison:`AI predicted ${form.ai_prediction}. ${form.user_prediction === form.ai_prediction ? "Your prediction agreed with the AI." : "Your prediction diverged from the AI."}`,
          behavioral_insight:"Overconfidence Bias detected. Confidence exceeded what was statistically warranted. Sustained overconfidence leads to under-hedged positions and concentration risk.",
          improvement_focus:"Review the confidence calibration framework. Match stated confidence to evidence, not emotional conviction.",
        },
      });
    }
    setLoading(false);
  };

  const DirPicker = ({ label, field }) => (
    <Fld label={label}>
      <div className="dir-btns">
        {["BUY","SELL","HOLD"].map(d => (
          <button key={d} className={`dir-btn ${form[field] === d ? `active-${d.toLowerCase()}` : ""}`} onClick={() => set(field, d)}>{d}</button>
        ))}
      </div>
    </Fld>
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">Prediction Playground</div>
        <div className="page-sub">Practice market calls and get behavioral finance coaching</div>
      </div>
      <div className="info-banner">
        <Icon name="info" size={14} color="#60A5FA" />
        <span>Make your directional call, set confidence, then reveal the actual outcome to receive calibration and behavioral feedback.</span>
      </div>
      <div className="g2">
        {/* Input */}
        <div className="card glow-b">
          <div className="card-hd">
            <div className="card-hd-icon" style={{ background:"rgba(16,185,129,0.15)" }}><Icon name="target" size={14} color="#34D399" /></div>
            Your Prediction
          </div>
          <DirPicker label="Your Call" field="user_prediction" />
          <div style={{ marginTop: 12 }}>
            <Slider label={`Confidence — ${(form.user_confidence*100).toFixed(0)}%`} name="user_confidence" value={form.user_confidence} onChange={(k,v) => set(k,v)} />
          </div>
          <div style={{ marginTop: 12 }}>
            <DirPicker label="AI Recommendation" field="ai_prediction" />
          </div>
          <div style={{ marginTop: 12 }}>
            <DirPicker label="Actual Market Outcome" field="actual_outcome" />
          </div>
          <div style={{ marginTop: 18 }}>
            <button className="btn btn-primary btn-full" onClick={submit} disabled={loading}>
              {loading ? <><Spinner /> Evaluating…</> : <><Icon name="zap" size={14} color="#fff" /> Evaluate Prediction</>}
            </button>
          </div>
        </div>

        {/* Output */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {result ? (
            <>
              <div className="card fade-in">
                <div className="card-hd" style={{ marginBottom:12 }}>
                  <div className="card-hd-icon" style={{ background:"rgba(16,185,129,0.15)" }}><Icon name="check" size={14} color="#34D399" /></div>
                  Outcome Summary
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
                  <SignalBadge signal={result.correctness} />
                  <SignalBadge signal={result.calibration_level} />
                  <SignalBadge signal={result.bias_detection?.type} />
                </div>
                <div className="result-panel">
                  <RRow label="Accuracy" value={result.accuracy_score === 1 ? "✓ Correct" : "✗ Incorrect"} />
                  <RRow label="Calibration Score" value={`${result.calibration_score?.toFixed(3)} / 1.000`} />
                </div>
              </div>
              <div className="card fade-in">
                <div className="card-hd" style={{ marginBottom:12 }}>
                  <div className="card-hd-icon" style={{ background:"rgba(139,92,246,0.15)" }}><Icon name="brain" size={14} color="#A78BFA" /></div>
                  Behavioral Coaching
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
                  <div style={{ padding:"9px 11px", background:"rgba(16,185,129,0.07)", borderRadius:8, border:"1px solid rgba(16,185,129,0.15)", fontSize:12.5, color:"#34D399", lineHeight:1.6 }}>
                    {result.feedback_report?.outcome_summary}
                  </div>
                  <div style={{ fontSize:12.5, color:"#94A3B8", lineHeight:1.7 }}>{result.feedback_report?.behavioral_insight}</div>
                  <div style={{ padding:"9px 11px", background:"rgba(59,130,246,0.07)", borderRadius:8, border:"1px solid rgba(59,130,246,0.15)", fontSize:12.5, color:"#93C5FD", lineHeight:1.6 }}>
                    <strong>Focus: </strong>{result.feedback_report?.improvement_focus}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="card" style={{ flex:1 }}>
              <Empty icon="target" text="Submit a prediction to receive coaching feedback" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── PAGE: STRATEGY SIM ───────────────────────────────────────────────────────
const StrategyPage = () => {
  const [form, setForm] = useState({ investment_amount:10000, predicted_change_percent:12.5, risk_score:0.35, volatility_score:0.40, scenario_type:"NORMAL" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const simulate = async () => {
    setLoading(true);
    try {
      const res = await api.post("/education/strategy/simulate", form);
      setResult(res); toast("Simulation complete", "success");
    } catch {
      toast("Demo mode — running simulation", "error");
      const inv = form.investment_amount;
      const proj = inv * (1 + form.predicted_change_percent / 100) - inv * form.volatility_score * 0.05;
      setResult({
        initial_investment: inv,
        projected_value: proj.toFixed(2),
        projected_profit_loss: (proj - inv).toFixed(2),
        risk_adjusted_value: (proj * (1 - form.risk_score * 0.3)).toFixed(2),
        worst_case_projection: (inv * (1 - form.risk_score * 0.4 - form.volatility_score * 0.25)).toFixed(2),
        volatility_impact: (inv * form.volatility_score * 0.05).toFixed(2),
        scenario_applied: form.scenario_type,
        educational_insight:"This simulation shows how risk and volatility erode compounded returns even when directional calls are correct. The risk-adjusted projection reflects realistic expected outcomes after accounting for downside probability and variance drag.",
      });
    }
    setLoading(false);
  };

  const fmt = (v, prefix = "$") => `${prefix}${parseFloat(v || 0).toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 })}`;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">Strategy Simulator</div>
        <div className="page-sub">Deterministic investment outcome modeling across market scenarios</div>
      </div>
      <div className="g2">
        {/* Params */}
        <div className="card glow-b">
          <div className="card-hd">
            <div className="card-hd-icon" style={{ background:"rgba(59,130,246,0.15)" }}><Icon name="trending" size={14} color="#60A5FA" /></div>
            Simulation Parameters
          </div>
          <Fld label="Investment Amount ($)">
            <input className="input" type="number" value={form.investment_amount} onChange={e => set("investment_amount", parseFloat(e.target.value))} />
          </Fld>
          <div style={{ marginTop:12 }}>
            <Fld label="Predicted Change (%)">
              <input className="input" type="number" value={form.predicted_change_percent} onChange={e => set("predicted_change_percent", parseFloat(e.target.value))} step="0.5" />
            </Fld>
          </div>
          <div style={{ marginTop:12 }}>
            <Slider label="Risk Score" name="risk_score" value={form.risk_score} onChange={set} />
            <Slider label="Volatility Score" name="volatility_score" value={form.volatility_score} onChange={set} />
          </div>
          <div style={{ marginTop:12 }}>
            <Fld label="Scenario">
              <select className="select" value={form.scenario_type} onChange={e => set("scenario_type", e.target.value)}>
                {["NORMAL","MARKET_CRASH","HIGH_VOLATILITY"].map(s => <option key={s}>{s}</option>)}
              </select>
            </Fld>
          </div>
          <div style={{ marginTop:18 }}>
            <button className="btn btn-primary btn-full" onClick={simulate} disabled={loading}>
              {loading ? <><Spinner /> Simulating…</> : <><Icon name="zap" size={14} color="#fff" /> Run Simulation</>}
            </button>
          </div>
        </div>

        {/* Results */}
        {result ? (
          <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            <div className="g2 gap-sm">
              {[
                { label:"Projected Value", val:result.projected_value, color:"#60A5FA" },
                { label:"Profit / Loss", val:result.projected_profit_loss, color:parseFloat(result.projected_profit_loss)>=0?"#34D399":"#F87171" },
                { label:"Risk-Adjusted", val:result.risk_adjusted_value, color:"#A78BFA" },
                { label:"Worst Case", val:result.worst_case_projection, color:"#F87171" },
              ].map(m => (
                <div key={m.label} className="card metric-mini">
                  <div className="metric-lbl">{m.label}</div>
                  <div className="metric-val" style={{ color:m.color, fontSize:22 }}>{fmt(m.val)}</div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="metric-lbl" style={{ marginBottom:6 }}>Volatility Drag</div>
              <div style={{ fontSize:14, fontWeight:700, color:"#FCD34D", marginBottom:12 }}>{fmt(result.volatility_impact)} cost to compounded returns</div>
              <div style={{ fontSize:12.5, color:"#94A3B8", lineHeight:1.75 }}>{result.educational_insight}</div>
            </div>
          </div>
        ) : (
          <div className="card">
            <Empty icon="trending" text="Configure parameters and run simulation" />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── PAGE: QUIZ ───────────────────────────────────────────────────────────────
const QuizPage = () => {
  const [cur, setCur] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const q = QUIZ_Q[cur];

  const select = (key) => { if (!submitted) setAnswers(p => ({ ...p, [q.id]: key })); };

  const submitQuiz = async () => {
    setLoading(true);
    try {
      const res = await api.post("/education/quiz/submit", { quiz_id:`session_${Date.now()}`, questions:QUIZ_Q, user_answers:Object.entries(answers).map(([question_id,selected_key])=>({question_id,selected_key})) });
      setResult(res); setSubmitted(true); toast("Quiz submitted!", "success");
    } catch {
      const correct = QUIZ_Q.filter(q => answers[q.id] === q.ans).length;
      const score = (correct / QUIZ_Q.length) * 100;
      setResult({
        score_percentage: score, correct_count: correct, incorrect_count: QUIZ_Q.length - correct,
        mastery_level: score>=80?"ADVANCED":score>=60?"INTERMEDIATE":"BEGINNER",
        points_earned: correct * 10,
        motivational_feedback: score>=80?"Exceptional performance. Advanced-level understanding demonstrated." : "Good start. Review weak topics to strengthen your foundation.",
        topic_performance:[
          { topic:"RSI", accuracy_percent:answers["q1"]==="C"?100:0, performance_band:answers["q1"]==="C"?"STRONG":"WEAK" },
          { topic:"VOLATILITY", accuracy_percent:answers["q2"]==="B"?100:0, performance_band:answers["q2"]==="B"?"STRONG":"WEAK" },
          { topic:"RISK", accuracy_percent:answers["q3"]==="B"?100:0, performance_band:answers["q3"]==="B"?"STRONG":"WEAK" },
        ],
      });
      setSubmitted(true); toast("Demo scoring applied", "info");
    }
    setLoading(false);
  };

  const reset = () => { setAnswers({}); setSubmitted(false); setResult(null); setCur(0); };

  if (result) return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">Quiz Results</div>
        <div className="page-sub">Your performance breakdown and knowledge review</div>
      </div>
      <div className="g2">
        <div className="card glow-b" style={{ textAlign:"center" }}>
          <div style={{ padding:"8px 0 20px" }}>
            <div className="score-circle">
              <div className="score-inner">
                <div className="score-num">{result.score_percentage?.toFixed(0)}</div>
                <div className="score-denom">/ 100</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:7, justifyContent:"center", flexWrap:"wrap", marginTop:4 }}>
              <SignalBadge signal={result.mastery_level} />
              <span className="badge badge-cyan">+{result.points_earned} XP</span>
            </div>
          </div>
          <div className="div" />
          <div style={{ display:"flex", justifyContent:"space-around", padding:"8px 0 4px" }}>
            <div>
              <div style={{ fontSize:26, fontWeight:800, color:"#34D399", fontFamily:"var(--font-display)" }}>{result.correct_count}</div>
              <div style={{ fontSize:11, color:"var(--muted)" }}>Correct</div>
            </div>
            <div style={{ width:1, background:"var(--border)" }} />
            <div>
              <div style={{ fontSize:26, fontWeight:800, color:"#F87171", fontFamily:"var(--font-display)" }}>{result.incorrect_count}</div>
              <div style={{ fontSize:11, color:"var(--muted)" }}>Incorrect</div>
            </div>
          </div>
          <div className="div" />
          <p style={{ fontSize:12.5, color:"#94A3B8", lineHeight:1.7, fontStyle:"italic" }}>{result.motivational_feedback}</p>
          <button className="btn btn-ghost btn-full" style={{ marginTop:16 }} onClick={reset}>Retake Quiz</button>
        </div>
        <div className="card">
          <div className="card-hd" style={{ marginBottom:14 }}>
            <div className="card-hd-icon" style={{ background:"rgba(16,185,129,0.15)" }}><Icon name="trending" size={14} color="#34D399" /></div>
            Topic Breakdown
          </div>
          {result.topic_performance?.map(tp => (
            <div key={tp.topic} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <span style={{ fontSize:12.5, fontWeight:600 }}>{tp.topic}</span>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <span style={{ fontSize:12, color:"var(--muted)" }}>{tp.accuracy_percent?.toFixed(0)}%</span>
                  <span className={`badge badge-sm ${tp.performance_band==="STRONG"?"badge-green":tp.performance_band==="DEVELOPING"?"badge-yellow":"badge-red"}`}>{tp.performance_band}</span>
                </div>
              </div>
              <ProgBar val={tp.accuracy_percent} cls={tp.performance_band==="STRONG"?"prog-g":tp.performance_band==="DEVELOPING"?"prog-y":"prog-p"} />
            </div>
          ))}
          <div className="div" />
          <div className="card-hd" style={{ marginBottom:10, fontSize:12 }}>Answer Review</div>
          {QUIZ_Q.map((q, i) => {
            const ua = answers[q.id];
            const ok = ua === q.ans;
            return (
              <div key={q.id} className={`ans-card ${ok?"ans-ok":"ans-bad"}`}>
                <div style={{ fontSize:11.5, fontWeight:700, color:ok?"#34D399":"#F87171", marginBottom:4 }}>
                  {ok?"✓":"✗"} Q{i+1}: {q.topic}
                </div>
                <div style={{ fontSize:11.5, color:"#94A3B8", lineHeight:1.5 }}>
                  Your answer: <strong>{q.opts[KEYS.indexOf(ua)] || "Unanswered"}</strong>
                  {!ok && <> · Correct: <strong style={{ color:"#34D399" }}>{q.opts[KEYS.indexOf(q.ans)]}</strong></>}
                </div>
                {!ok && <div style={{ fontSize:11, color:"#64748B", marginTop:4 }}>{q.exp}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">Quiz Engine</div>
        <div className="page-sub">Test your financial knowledge with adaptive assessments</div>
      </div>
      <div className="g2">
        {/* Question */}
        <div className="card glow-b">
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <span className="card-hd" style={{ margin:0 }}>Question {cur + 1} / {QUIZ_Q.length}</span>
            <span className={`badge ${q.diff==="EASY"?"badge-green":q.diff==="MEDIUM"?"badge-yellow":"badge-red"}`}>{q.diff}</span>
          </div>
          {/* Progress */}
          <div style={{ height:3, background:"rgba(255,255,255,0.06)", borderRadius:99, marginBottom:20 }}>
            <div style={{ height:"100%", width:`${((cur+1)/QUIZ_Q.length)*100}%`, background:"linear-gradient(90deg,#3B82F6,#8B5CF6)", borderRadius:99, transition:"width 0.4s ease" }} />
          </div>
          <p style={{ fontSize:14.5, fontWeight:600, lineHeight:1.65, color:"#E2E8F0", marginBottom:20 }}>{q.text}</p>
          {q.opts.map((opt, i) => {
            const key = KEYS[i];
            const sel = answers[q.id] === key;
            return (
              <div key={key} className={`quiz-opt ${sel?"sel":""}`} onClick={() => select(key)}>
                <span className="opt-key">{key}</span>
                <span>{opt}</span>
              </div>
            );
          })}
          <div className="btn-group" style={{ marginTop:18 }}>
            <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setCur(p => Math.max(0, p-1))} disabled={cur===0}>← Prev</button>
            {cur < QUIZ_Q.length - 1
              ? <button className="btn btn-primary" style={{ flex:1 }} onClick={() => setCur(p => p+1)}>Next →</button>
              : <button className="btn btn-primary" style={{ flex:1 }} onClick={submitQuiz} disabled={loading || Object.keys(answers).length < QUIZ_Q.length}>
                  {loading ? <Spinner /> : "Submit"}
                </button>
            }
          </div>
          {Object.keys(answers).length < QUIZ_Q.length && cur === QUIZ_Q.length-1 && (
            <p style={{ marginTop:8, fontSize:11, color:"#F87171", textAlign:"center" }}>Answer all {QUIZ_Q.length} questions first</p>
          )}
        </div>

        {/* Navigator */}
        <div className="card">
          <div className="card-hd" style={{ marginBottom:14 }}>
            <div className="card-hd-icon" style={{ background:"rgba(245,158,11,0.15)" }}><Icon name="quiz" size={14} color="#FCD34D" /></div>
            Question Navigator
          </div>
          <div className="q-nav" style={{ marginBottom:16 }}>
            {QUIZ_Q.map((_, i) => (
              <div key={i} className="q-dot" onClick={() => setCur(i)}
                style={{
                  background: answers[QUIZ_Q[i].id] ? "rgba(59,130,246,0.25)" : i===cur ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.05)",
                  border: i===cur ? "1px solid rgba(139,92,246,0.5)" : answers[QUIZ_Q[i].id] ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
                  color: answers[QUIZ_Q[i].id] ? "#60A5FA" : i===cur ? "#A78BFA" : "var(--muted)",
                }}>
                {i+1}
              </div>
            ))}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, fontSize:12, color:"var(--muted)" }}>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}><div style={{ width:10, height:10, borderRadius:3, background:"rgba(59,130,246,0.25)", border:"1px solid rgba(59,130,246,0.3)" }} />Answered</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}><div style={{ width:10, height:10, borderRadius:3, background:"rgba(139,92,246,0.25)", border:"1px solid rgba(139,92,246,0.5)" }} />Current</div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}><div style={{ width:10, height:10, borderRadius:3, background:"rgba(255,255,255,0.05)" }} />Unanswered</div>
          </div>
          <div className="div" />
          <div style={{ display:"flex", flexDirection:"column", gap:6, fontSize:12.5, color:"var(--muted)", lineHeight:1.7 }}>
            <div><strong style={{ color:"#CBD5E1" }}>Scoring: </strong>10 XP per correct answer</div>
            <div><strong style={{ color:"#CBD5E1" }}>Topics: </strong>RSI · Volatility · Risk Management</div>
            <div><strong style={{ color:"#CBD5E1" }}>Answered: </strong>{Object.keys(answers).length} / {QUIZ_Q.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── PAGE: PROGRESS ───────────────────────────────────────────────────────────
const ProgressPage = () => {
  const [progressForm, setProgressForm] = useState({ user_id:"user_42", quizzes_completed:18, quiz_scores:[86,92,78,95,88,91,84,93], predictions_made:35, correct_predictions:26, calibration_scores:[0.82,0.91,0.77,0.88,0.85], current_streak:12, max_streak_achieved:34, total_points:0, existing_badge_ids:[] });
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadDemo = () => setSnapshot({
    user_id:"user_42", total_points:845, level:"Strategist",
    current_streak:12, max_streak_achieved:34,
    quiz_average:86.67, prediction_accuracy:74.29,
    avg_calibration:0.828, engagement_score:0.709,
    learning_consistency:"HIGH", skill_maturity:"EXPERT",
    points_to_next_level:155,
    badges:[{ badge_id:"streak_silver", name:"Silver Streak", tier:"SILVER", description:"30+ consecutive days" }],
    summary_narrative:"Level: Strategist · Maturity: EXPERT · Consistency: HIGH",
  });

  useEffect(() => { loadDemo(); }, []);

  const compute = async () => {
    setLoading(true);
    try {
      const res = await api.post("/education/progress/snapshot", progressForm);
      setSnapshot(res); toast("Snapshot computed", "success");
    } catch { loadDemo(); toast("Demo data loaded", "info"); }
    setLoading(false);
  };

  const tierIcon = { GOLD:"🥇", SILVER:"🥈", BRONZE:"🥉" };
  const maturityColor = { EXPERT:"#3B82F6", PROFICIENT:"#8B5CF6", COMPETENT:"#10B981", DEVELOPING:"#F59E0B" };
  const lockedBadges = [{ name:"Gold Streak", icon:"🥇" },{ name:"Scholar", icon:"📚" },{ name:"Precision Trader", icon:"🎯" }];

  const metrics = snapshot ? [
    { label:"Quiz Average", val:snapshot.quiz_average, cls:"prog-b" },
    { label:"Prediction Accuracy", val:snapshot.prediction_accuracy, cls:"prog-g" },
    { label:"Avg Calibration", val:(snapshot.avg_calibration*100), cls:"prog-p" },
    { label:"Engagement Score", val:(snapshot.engagement_score*100), cls:"prog-y" },
  ] : [];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div className="page-title">Streak & Progress</div>
        <div className="page-sub">Gamified learning journey with XP, badges, and skill maturity</div>
      </div>

      {snapshot && (
        <>
          {/* Hero stats */}
          <div className="g3" style={{ marginBottom:16 }}>
            {[
              { label:"Current Streak", val:snapshot.current_streak, suffix:"🔥 days", grad:"linear-gradient(90deg,#F59E0B,#EF4444)" },
              { label:"Total XP", val:snapshot.total_points, suffix:snapshot.level, grad:"linear-gradient(90deg,#3B82F6,#8B5CF6)" },
            ].map((s, i) => (
              <div key={i} className="card" style={{ textAlign:"center", padding:"22px 16px" }}>
                <div className="metric-lbl" style={{ marginBottom:8 }}>{s.label}</div>
                <div className="stat-big" style={{ background:s.grad, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>{s.val}</div>
                <div className="stat-lbl">{s.suffix}</div>
              </div>
            ))}
            <div className="card" style={{ textAlign:"center", padding:"22px 16px" }}>
              <div className="metric-lbl" style={{ marginBottom:8 }}>Skill Maturity</div>
              <div style={{ fontSize:24, fontFamily:"var(--font-display)", fontWeight:800, color:maturityColor[snapshot.skill_maturity]||"#60A5FA", marginBottom:6 }}>{snapshot.skill_maturity}</div>
              <span className="badge badge-green">{snapshot.learning_consistency}</span>
            </div>
          </div>

          {/* XP Progress */}
          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <div className="card-hd" style={{ margin:0 }}>
                <div className="card-hd-icon" style={{ background:"rgba(59,130,246,0.15)" }}><Icon name="award" size={14} color="#60A5FA" /></div>
                Level Progress — {snapshot.level}
              </div>
              <span style={{ fontSize:12, color:"var(--muted)" }}>{snapshot.points_to_next_level} XP to next tier</span>
            </div>
            <div className="xp-track">
              <div className="xp-fill" style={{ width:`${Math.min(((snapshot.total_points%400)/400)*100,100)}%` }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11, color:"var(--muted)" }}>
              <span>{snapshot.total_points} XP</span>
              <span>{snapshot.total_points + snapshot.points_to_next_level} XP</span>
            </div>
          </div>

          {/* Metrics + Badges */}
          <div className="g2" style={{ marginBottom:16 }}>
            <div className="card">
              <div className="card-hd" style={{ marginBottom:14 }}>
                <div className="card-hd-icon" style={{ background:"rgba(16,185,129,0.15)" }}><Icon name="trending" size={14} color="#34D399" /></div>
                Performance Metrics
              </div>
              {metrics.map(m => (
                <div key={m.label} style={{ marginBottom:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                    <span style={{ fontSize:12.5, color:"var(--text2)", fontWeight:500 }}>{m.label}</span>
                    <span style={{ fontSize:13, fontFamily:"var(--font-display)", fontWeight:700, color:"#E2E8F0" }}>{m.val.toFixed(1)}%</span>
                  </div>
                  <ProgBar val={m.val} cls={m.cls} size="prog-md" />
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-hd" style={{ marginBottom:14 }}>
                <div className="card-hd-icon" style={{ background:"rgba(245,158,11,0.15)" }}><Icon name="award" size={14} color="#FCD34D" /></div>
                Earned Badges
              </div>
              {snapshot.badges?.length > 0 ? (
                <div className="badge-grid">
                  {snapshot.badges.map(b => (
                    <div key={b.badge_id} className="badge-pill" title={b.description}>
                      <span>{tierIcon[b.tier]||"🏅"}</span>
                      <span style={{ fontSize:11.5 }}>{b.name}</span>
                    </div>
                  ))}
                  {lockedBadges.filter(b => !snapshot.badges.find(e => e.name===b.name)).map(b => (
                    <div key={b.name} className="badge-pill" style={{ opacity:0.3, filter:"grayscale(1)" }}>
                      <span>{b.icon}</span><span style={{ fontSize:11.5 }}>{b.name}</span>
                    </div>
                  ))}
                </div>
              ) : <div style={{ color:"var(--muted)", fontSize:13 }}>No badges yet</div>}
              <div className="div" />
              <div className="card-hd" style={{ marginBottom:10, fontSize:12 }}>Streak Stats</div>
              <div className="result-panel">
                <RRow label="Current Streak" value={`${snapshot.current_streak} days 🔥`} />
                <RRow label="Personal Best" value={`${snapshot.max_streak_achieved} days ⭐`} />
              </div>
            </div>
          </div>

          {/* Recompute */}
          <div className="card">
            <div className="card-hd" style={{ marginBottom:14 }}>
              <div className="card-hd-icon" style={{ background:"rgba(59,130,246,0.15)" }}><Icon name="zap" size={14} color="#60A5FA" /></div>
              Recompute Snapshot
            </div>
            <div className="inline-g" style={{ marginBottom:14 }}>
              <Fld label="User ID">
                <input className="input" value={progressForm.user_id} onChange={e => setProgressForm(p => ({...p, user_id:e.target.value}))} />
              </Fld>
              <Fld label="Current Streak">
                <input className="input" type="number" value={progressForm.current_streak} onChange={e => setProgressForm(p => ({...p, current_streak:parseInt(e.target.value)}))} />
              </Fld>
            </div>
            <button className="btn btn-primary" onClick={compute} disabled={loading}>
              {loading ? <><Spinner /> Computing…</> : <><Icon name="zap" size={14} color="#fff" /> Recompute</>}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
const NAV = [
  { id:"indicator",   label:"Indicator Explainer", icon:"chart" },
  { id:"ai-decision", label:"AI Decision",          icon:"brain" },
  { id:"playground",  label:"Playground",           icon:"target" },
  { id:"strategy",    label:"Strategy Sim",         icon:"trending" },
  { id:"quiz",        label:"Quiz Engine",          icon:"quiz" },
  { id:"progress",    label:"Streak & Progress",    icon:"flame" },
];
const PAGE_MAP = { indicator:IndicatorPage, "ai-decision":AIDecisionPage, playground:PlaygroundPage, strategy:StrategyPage, quiz:QuizPage, progress:ProgressPage };

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState("indicator");
  const [collapsed, setCollapsed] = useState(false);
  const Page = PAGE_MAP[active] || IndicatorPage;
  const cur = NAV.find(n => n.id === active);

  return (
    <>
      <style>{styles}</style>
      <div className={`app${collapsed?" sidebar-collapsed":""}`}>

        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-mark">AI</div>
            <span className="logo-text">EduFin Platform</span>
          </div>

          <nav className="nav-section">
            <div className="nav-group-label">Modules</div>
            {NAV.map(n => (
              <div key={n.id}
                className={`nav-item ${active === n.id ? "active" : ""}`}
                onClick={() => setActive(n.id)}
                title={collapsed ? n.label : undefined}
              >
                <Icon name={n.icon} size={17} color={active===n.id?"#60A5FA":"#5A6A88"} />
                <span className="nav-label-text">{n.label}</span>
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="nav-item" onClick={() => setCollapsed(p => !p)} title="Toggle sidebar">
              <Icon name={collapsed ? "chevron" : "collapse"} size={17} color="#5A6A88" />
              <span className="nav-label-text">{collapsed ? "Expand" : "Collapse"}</span>
            </div>
          </div>
        </aside>

        {/* TOPBAR */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <span>EduFin</span>
            <span className="crumb-sep">/</span>
            <span className="crumb-module">{cur?.label}</span>
          </div>
          <div className="topbar-right">
            <div className="status-pill">
              <div className="status-dot" />
              <span>Live</span>
            </div>
            <span className="badge badge-purple" style={{ fontSize:10.5 }}>Intelligence v1.0</span>
          </div>
        </header>

        {/* CONTENT */}
        <main className="content" key={active}>
          <Page />
        </main>
      </div>
      <Toast />
    </>
  );
}