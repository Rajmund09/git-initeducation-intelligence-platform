import { useState, useEffect, useCallback, lazy, Suspense } from "react";

// ─── TYPES ──────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL;
// ─── API SERVICE ─────────────────────────────────────────────────────────────
const api = {
  post: async (path, body) => {
    const r = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
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

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #070B14;
    --surface: rgba(255,255,255,0.035);
    --surface-hover: rgba(255,255,255,0.06);
    --border: rgba(255,255,255,0.07);
    --border-bright: rgba(255,255,255,0.15);
    --text: #E8EDF5;
    --muted: #6B7A9A;
    --accent: #3B82F6;
    --accent2: #8B5CF6;
    --green: #10B981;
    --red: #EF4444;
    --yellow: #F59E0B;
    --cyan: #06B6D4;
    --font-display: 'Syne', sans-serif;
    --font-body: 'DM Sans', sans-serif;
    --radius: 16px;
    --radius-sm: 10px;
    --shadow: 0 8px 32px rgba(0,0,0,0.4);
    --glow-blue: 0 0 40px rgba(59,130,246,0.15);
    --glow-purple: 0 0 40px rgba(139,92,246,0.15);
  }

  html, body, #root { height: 100%; background: var(--bg); color: var(--text); font-family: var(--font-body); }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }

  .app { display: flex; height: 100vh; overflow: hidden; }

  /* SIDEBAR */
  .sidebar {
    width: 240px; flex-shrink: 0;
    background: rgba(7,11,20,0.95);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    padding: 0; position: relative; z-index: 10;
    backdrop-filter: blur(20px);
    transition: width 0.3s cubic-bezier(.4,0,.2,1);
  }
  .sidebar.collapsed { width: 64px; }

  .sidebar-logo {
    padding: 20px 20px 16px;
    display: flex; align-items: center; gap: 10px;
    border-bottom: 1px solid var(--border);
  }
  .logo-mark {
    width: 32px; height: 32px; flex-shrink: 0;
    background: linear-gradient(135deg, #3B82F6, #8B5CF6);
    border-radius: 8px; display: grid; place-items: center;
    font-family: var(--font-display); font-weight: 800; font-size: 14px; color: #fff;
  }
  .logo-text {
    font-family: var(--font-display); font-weight: 700; font-size: 15px;
    background: linear-gradient(90deg, #fff, #94A3B8);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    white-space: nowrap; overflow: hidden;
  }

  .nav-section { padding: 16px 12px 8px; flex: 1; overflow-y: auto; }
  .nav-label {
    font-size: 9px; font-weight: 600; letter-spacing: 0.12em;
    color: var(--muted); text-transform: uppercase;
    padding: 0 8px 8px; white-space: nowrap; overflow: hidden;
  }
  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 10px; border-radius: var(--radius-sm);
    cursor: pointer; transition: all 0.18s ease;
    margin-bottom: 2px; border: 1px solid transparent;
    position: relative; overflow: hidden;
    font-size: 13px; font-weight: 500; color: var(--muted);
    white-space: nowrap;
  }
  .nav-item:hover { color: var(--text); background: var(--surface-hover); }
  .nav-item.active {
    color: #fff;
    background: linear-gradient(90deg, rgba(59,130,246,0.2), rgba(139,92,246,0.1));
    border-color: rgba(59,130,246,0.25);
  }
  .nav-item.active::before {
    content: ''; position: absolute; left: 0; top: 0; bottom: 0;
    width: 2px; background: linear-gradient(180deg, #3B82F6, #8B5CF6);
  }
  .nav-icon { width: 20px; height: 20px; flex-shrink: 0; opacity: 0.8; }
  .nav-item.active .nav-icon { opacity: 1; }

  /* MAIN */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

  .topbar {
    height: 56px; flex-shrink: 0;
    background: rgba(7,11,20,0.9);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px;
    backdrop-filter: blur(20px);
  }
  .topbar-left { display: flex; align-items: center; gap: 12px; }
  .topbar-title { font-family: var(--font-display); font-weight: 700; font-size: 16px; }
  .topbar-right { display: flex; align-items: center; gap: 10px; }

  .badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 20px;
    font-size: 11px; font-weight: 600; letter-spacing: 0.04em;
  }
  .badge-blue { background: rgba(59,130,246,0.15); color: #60A5FA; border: 1px solid rgba(59,130,246,0.25); }
  .badge-green { background: rgba(16,185,129,0.15); color: #34D399; border: 1px solid rgba(16,185,129,0.25); }
  .badge-red { background: rgba(239,68,68,0.15); color: #F87171; border: 1px solid rgba(239,68,68,0.25); }
  .badge-yellow { background: rgba(245,158,11,0.15); color: #FCD34D; border: 1px solid rgba(245,158,11,0.25); }
  .badge-purple { background: rgba(139,92,246,0.15); color: #A78BFA; border: 1px solid rgba(139,92,246,0.25); }
  .badge-cyan { background: rgba(6,182,212,0.15); color: #22D3EE; border: 1px solid rgba(6,182,212,0.25); }

  .status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); box-shadow: 0 0 6px var(--green); animation: pulse-dot 2s infinite; }
  @keyframes pulse-dot { 0%,100%{opacity:1;} 50%{opacity:0.4;} }

  .content { flex: 1; overflow-y: auto; padding: 24px; }

  /* SECTION HEADER */
  .section-header { margin-bottom: 24px; }
  .section-title {
    font-family: var(--font-display); font-weight: 800; font-size: 26px;
    background: linear-gradient(90deg, #fff 0%, #94A3B8 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    margin-bottom: 6px;
  }
  .section-sub { font-size: 13px; color: var(--muted); font-weight: 400; }

  /* CARDS */
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 20px;
    backdrop-filter: blur(12px);
    transition: all 0.22s ease;
    position: relative; overflow: hidden;
  }
  .card:hover { border-color: var(--border-bright); box-shadow: var(--shadow); transform: translateY(-1px); }
  .card-glow-blue { box-shadow: var(--glow-blue); }
  .card-glow-purple { box-shadow: var(--glow-purple); }

  .card-title {
    font-family: var(--font-display); font-weight: 700; font-size: 14px;
    margin-bottom: 16px; color: #CBD5E1; display: flex; align-items: center; gap: 8px;
  }

  /* GRID */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .grid-auto { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }

  /* INPUTS */
  .input-group { margin-bottom: 14px; }
  .input-label { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; display: block; }
  .input, .select {
    width: 100%; padding: 10px 14px;
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text); font-family: var(--font-body); font-size: 13px;
    outline: none; transition: all 0.18s ease;
    -webkit-appearance: none; appearance: none;
  }
  .input:focus, .select:focus { border-color: rgba(59,130,246,0.5); background: rgba(59,130,246,0.05); box-shadow: 0 0 0 3px rgba(59,130,246,0.08); }
  .select { cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236B7A9A' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 36px; }
  .select option { background: #0F172A; }

  /* SLIDER */
  .slider-group { margin-bottom: 14px; }
  .slider-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .slider-val { font-size: 12px; font-weight: 700; color: #60A5FA; font-family: var(--font-display); }
  input[type=range] {
    -webkit-appearance: none; width: 100%; height: 4px;
    background: rgba(255,255,255,0.1); border-radius: 2px; outline: none;
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%;
    background: linear-gradient(135deg, #3B82F6, #8B5CF6);
    cursor: pointer; box-shadow: 0 0 8px rgba(59,130,246,0.5);
    transition: transform 0.15s ease;
  }
  input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.2); }

  /* BUTTON */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    padding: 10px 20px; border-radius: var(--radius-sm);
    font-family: var(--font-body); font-weight: 600; font-size: 13px;
    cursor: pointer; border: none; transition: all 0.2s ease; letter-spacing: 0.02em;
  }
  .btn-primary {
    background: linear-gradient(135deg, #3B82F6, #6366F1);
    color: #fff; box-shadow: 0 4px 16px rgba(59,130,246,0.3);
  }
  .btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(59,130,246,0.45); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-ghost { background: var(--surface); border: 1px solid var(--border); color: var(--text); }
  .btn-ghost:hover { background: var(--surface-hover); border-color: var(--border-bright); }
  .btn-full { width: 100%; }

  /* RESULT PANEL */
  .result-panel {
    background: rgba(59,130,246,0.05);
    border: 1px solid rgba(59,130,246,0.15);
    border-radius: var(--radius-sm); padding: 16px;
    animation: fadeSlideIn 0.35s ease;
  }
  @keyframes fadeSlideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }

  .result-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
  .result-row:last-child { border-bottom: none; }
  .result-key { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; flex-shrink: 0; margin-right: 12px; padding-top: 1px; }
  .result-val { font-size: 13px; color: var(--text); text-align: right; line-height: 1.5; }

  /* PROGRESS BAR */
  .prog-bar { height: 6px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; margin-top: 4px; }
  .prog-fill { height: 100%; border-radius: 3px; transition: width 1s cubic-bezier(.4,0,.2,1); }
  .prog-blue { background: linear-gradient(90deg, #3B82F6, #6366F1); }
  .prog-green { background: linear-gradient(90deg, #10B981, #06B6D4); }
  .prog-purple { background: linear-gradient(90deg, #8B5CF6, #EC4899); }
  .prog-yellow { background: linear-gradient(90deg, #F59E0B, #EF4444); }

  /* SPINNER */
  .spinner { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.15); border-top-color: #3B82F6; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* TOAST */
  .toast-container { position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 8px; }
  .toast {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: var(--radius-sm);
    font-size: 13px; font-weight: 500;
    backdrop-filter: blur(16px); border: 1px solid;
    animation: slideInRight 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
    max-width: 320px;
  }
  .toast-success { background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.3); color: #34D399; }
  .toast-error { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3); color: #F87171; }
  @keyframes slideInRight { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
  @keyframes fadeOut { to { opacity:0; transform:translateX(20px); } }

  /* QUIZ */
  .quiz-option {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 14px; border-radius: var(--radius-sm);
    border: 1px solid var(--border); cursor: pointer;
    transition: all 0.18s ease; margin-bottom: 8px;
    font-size: 13px;
  }
  .quiz-option:hover { background: var(--surface-hover); border-color: var(--border-bright); }
  .quiz-option.selected { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.4); color: #93C5FD; }
  .quiz-option.correct { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.4); }
  .quiz-option.wrong { background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.4); }
  .option-key { width: 22px; height: 22px; border-radius: 6px; background: rgba(255,255,255,0.08); display: grid; place-items: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }

  /* STREAK */
  .stat-big { font-family: var(--font-display); font-size: 42px; font-weight: 800; line-height: 1; }
  .stat-label { font-size: 11px; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; }

  .badge-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .badge-item {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 10px; border-radius: 8px;
    font-size: 11px; font-weight: 600;
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
    transition: all 0.18s ease;
  }
  .badge-item:hover { background: rgba(255,255,255,0.09); transform: scale(1.03); }

  .xp-bar { height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden; position: relative; }
  .xp-fill { height: 100%; background: linear-gradient(90deg, #3B82F6, #8B5CF6, #EC4899); border-radius: 4px; transition: width 1.2s cubic-bezier(.4,0,.2,1); }

  /* DIVIDER */
  .divider { height: 1px; background: var(--border); margin: 16px 0; }

  /* CONTRIBUTION BARS */
  .contrib-row { margin-bottom: 10px; }
  .contrib-meta { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 11px; }
  .contrib-name { color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
  .contrib-score { color: var(--text); font-weight: 700; font-family: var(--font-display); }

  /* METRIC CARD */
  .metric { padding: 16px; }
  .metric-val { font-family: var(--font-display); font-size: 28px; font-weight: 800; }
  .metric-change { font-size: 11px; margin-top: 2px; }

  /* TAB */
  .tabs { display: flex; gap: 4px; background: rgba(255,255,255,0.04); padding: 4px; border-radius: var(--radius-sm); margin-bottom: 16px; }
  .tab { flex: 1; padding: 7px; border-radius: 7px; cursor: pointer; font-size: 12px; font-weight: 600; text-align: center; transition: all 0.18s ease; color: var(--muted); }
  .tab.active { background: rgba(59,130,246,0.2); color: #60A5FA; }

  @media (max-width: 900px) {
    .sidebar { width: 64px; }
    .logo-text, .nav-label, .nav-item span { display: none; }
    .grid-2, .grid-3 { grid-template-columns: 1fr; }
  }
  @media (max-width: 600px) {
    .content { padding: 12px; }
    .topbar { padding: 0 12px; }
  }

  .fade-in { animation: fadeIn 0.4s ease; }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }

  .number-ticker { display: inline-block; transition: all 0.5s ease; }
`;

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 18, color = "currentColor" }) => {
  const icons = {
    chart: <path d="M3 3v18h18M7 16l4-4 4 4 5-5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
    brain: <path d="M12 2C8 2 5 5 5 9c0 2.4 1.1 4.5 2.8 5.9L7 20h10l-.8-5.1C17.9 13.5 19 11.4 19 9c0-4-3-7-7-7zm0 0v20M8 12h8" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none"/>,
    target: <><circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" fill="none"/><circle cx="12" cy="12" r="6" stroke={color} strokeWidth="1.8" fill="none"/><circle cx="12" cy="12" r="2" stroke={color} strokeWidth="1.8" fill="none"/></>,
    trending: <path d="M22 7l-9 9-4-4-6 6M22 7h-5M22 7v5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
    quiz: <path d="M8 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8l-5-5H8zM15 3v5h5M10 11h4M10 15h4M10 7h1" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none"/>,
    flame: <path d="M8.5 14.5A4 4 0 0012 18a4 4 0 004-4c0-1.5-.5-2.5-1-3.5-1 1-2 1-3 0.5C11 12 10 12.5 8.5 14.5zM12 2s-5 4-5 9a5 5 0 0010 0c0-5-5-9-5-9z" stroke={color} strokeWidth="1.8" strokeLinecap="round" fill="none"/>,
    zap: <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
    check: <path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
    x: <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"/>,
    info: <><circle cx="12" cy="12" r="10" stroke={color} strokeWidth="1.8" fill="none"/><path d="M12 16v-4M12 8h.01" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"/></>,
    menu: <path d="M4 6h16M4 12h16M4 18h16" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"/>,
    award: <><circle cx="12" cy="8" r="6" stroke={color} strokeWidth="1.8" fill="none"/><path d="M9 17l-3 6 6-2 6 2-3-6" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="nav-icon">
      {icons[name] || null}
    </svg>
  );
};

// ─── TOAST ───────────────────────────────────────────────────────────────────
let addToastFn = null;
const Toast = () => {
  const [toasts, setToasts] = useState([]);
  addToastFn = (msg, type = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  };
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <Icon name={t.type === "success" ? "check" : "x"} size={14} />
          {t.msg}
        </div>
      ))}
    </div>
  );
};
const toast = (msg, type) => addToastFn?.(msg, type);

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────
const Spinner = () => <div className="spinner" />;

const SliderInput = ({ label, name, value, onChange, min = 0, max = 1, step = 0.01 }) => (
  <div className="slider-group">
    <div className="slider-row">
      <span className="input-label" style={{ margin: 0 }}>{label}</span>
      <span className="slider-val">{parseFloat(value).toFixed(2)}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(name, parseFloat(e.target.value))} />
  </div>
);

const SignalBadge = ({ signal }) => {
  const map = {
    BULLISH: "badge-green", BEARISH: "badge-red", NEUTRAL: "badge-yellow",
    OVERBOUGHT: "badge-red", OVERSOLD: "badge-green",
    BUY: "badge-green", SELL: "badge-red", HOLD: "badge-yellow", WAIT: "badge-yellow",
    HIGH: "badge-blue", MEDIUM: "badge-yellow", LOW: "badge-purple",
    CORRECT: "badge-green", INCORRECT: "badge-red",
    STRONG: "badge-blue", MODERATE: "badge-yellow", WEAK: "badge-red", UNRELIABLE: "badge-red",
  };
  return <span className={`badge ${map[signal] || "badge-blue"}`}>{signal}</span>;
};

const ResultRow = ({ label, value, isSignal }) => (
  <div className="result-row">
    <span className="result-key">{label}</span>
    <span className="result-val">
      {isSignal ? <SignalBadge signal={value} /> : value}
    </span>
  </div>
);

// ─── MOCK QUIZ DATA ───────────────────────────────────────────────────────────
const QUIZ_QUESTIONS = [
  {
    question_id: "q1", question_text: "An RSI reading of 78 indicates which condition?",
    options: ["Oversold", "Neutral", "Overbought", "Trending"],
    correct_option_key: "C", topic: "RSI", difficulty: "EASY",
    explanation: "RSI above 70 indicates overbought conditions where price momentum may be exhausted.",
  },
  {
    question_id: "q2", question_text: "What is variance drag in high-volatility environments?",
    options: ["Transaction cost increase", "Reduction in compounded returns from volatility", "Moving average lag", "Bid-ask spread widening"],
    correct_option_key: "B", topic: "VOLATILITY", difficulty: "MEDIUM",
    explanation: "Variance drag is the mathematical reduction in compounded returns caused by volatility. A 20% gain then 20% loss = -4% net, not breakeven.",
  },
  {
    question_id: "q3", question_text: "A risk score of 0.85 should primarily affect which parameter?",
    options: ["Entry timing only", "Position sizing and stop-loss", "Trade direction", "Holding period"],
    correct_option_key: "B", topic: "RISK", difficulty: "MEDIUM",
    explanation: "High risk scores signal elevated exposure. Primary response: reduce position size and tighten stop-loss parameters.",
  },
];

// ─── PAGES ───────────────────────────────────────────────────────────────────

// 1. INDICATOR EXPLAINER
const IndicatorPage = () => {
  const [form, setForm] = useState({ indicator: "RSI", value: 73.5, timeframe: "1D", market_regime: "trending", current_price: "", avg_volume: "" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = async () => {
    setLoading(true);
    try {
      const extra = {};
      if (form.current_price) extra.current_price = parseFloat(form.current_price);
      if (form.avg_volume) extra.avg_volume = parseFloat(form.avg_volume);
      const res = await api.post("/education/indicator/explain", {
        indicator: form.indicator, value: parseFloat(form.value),
        context: { timeframe: form.timeframe, asset_class: "equity", market_regime: form.market_regime, extra },
      });
      setResult(res);
      toast("Indicator analyzed successfully", "success");
    } catch (e) {
      toast("API unavailable — showing demo data", "error");
      setResult({ indicator_name: form.indicator, value: form.value, market_signal: "OVERBOUGHT", interpretation: "RSI at 73.5 exceeds the overbought threshold. Upward momentum remains but exhaustion signals are present.", trading_bias: "HOLD", confidence_hint: "MEDIUM", risk_note: "In strong trending markets RSI can remain overbought for extended periods.", definition: "The RSI is a momentum oscillator that measures speed and magnitude of price changes on a 0–100 scale." });
    }
    setLoading(false);
  };

  return (
    <div className="fade-in">
      <div className="section-header">
        <div className="section-title">Indicator Explainer</div>
        <div className="section-sub">Deterministic rule-based analysis for RSI, EMA, SMA, Volume & Volatility</div>
      </div>
      <div className="grid-2">
        <div className="card card-glow-blue">
          <div className="card-title"><Icon name="chart" size={16} /> Configuration</div>
          <div className="input-group">
            <label className="input-label">Indicator</label>
            <select className="select" value={form.indicator} onChange={e => setForm(p => ({...p, indicator: e.target.value}))}>
              {["RSI","EMA","SMA","Volume","Volatility"].map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Current Value</label>
            <input className="input" type="number" value={form.value} onChange={e => setForm(p => ({...p, value: e.target.value}))} placeholder="e.g. 73.5" />
          </div>
          <div className="grid-2" style={{gap:10}}>
            <div className="input-group">
              <label className="input-label">Timeframe</label>
              <select className="select" value={form.timeframe} onChange={e => setForm(p => ({...p, timeframe: e.target.value}))}>
                {["1M","5M","15M","1H","4H","1D","1W"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Market Regime</label>
              <select className="select" value={form.market_regime} onChange={e => setForm(p => ({...p, market_regime: e.target.value}))}>
                {["trending","ranging","volatile","unknown"].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          {(form.indicator === "EMA" || form.indicator === "SMA") && (
            <div className="input-group">
              <label className="input-label">Current Price (for signal)</label>
              <input className="input" type="number" value={form.current_price} onChange={e => setForm(p => ({...p, current_price: e.target.value}))} placeholder="e.g. 194.75" />
            </div>
          )}
          {form.indicator === "Volume" && (
            <div className="input-group">
              <label className="input-label">Average Volume</label>
              <input className="input" type="number" value={form.avg_volume} onChange={e => setForm(p => ({...p, avg_volume: e.target.value}))} placeholder="e.g. 4200000" />
            </div>
          )}
          <button className="btn btn-primary btn-full" onClick={analyze} disabled={loading}>
            {loading ? <Spinner /> : <Icon name="zap" size={15} />} {loading ? "Analyzing..." : "Analyze Indicator"}
          </button>
        </div>

        <div className="card">
          <div className="card-title"><Icon name="info" size={16} /> Analysis Result</div>
          {result ? (
            <div className="result-panel">
              <ResultRow label="Indicator" value={result.indicator_name} />
              <ResultRow label="Signal" value={result.market_signal} isSignal />
              <ResultRow label="Bias" value={result.trading_bias} isSignal />
              <ResultRow label="Confidence" value={result.confidence_hint} isSignal />
              <div className="result-row" style={{flexDirection:"column", alignItems:"flex-start", gap:6}}>
                <span className="result-key">Interpretation</span>
                <span style={{fontSize:12, color:"#CBD5E1", lineHeight:1.6}}>{result.interpretation}</span>
              </div>
              <div className="result-row" style={{flexDirection:"column", alignItems:"flex-start", gap:6}}>
                <span className="result-key">Risk Note</span>
                <span style={{fontSize:12, color:"#FCD34D", lineHeight:1.6}}>{result.risk_note}</span>
              </div>
            </div>
          ) : (
            <div style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:200, color:"var(--muted)"}}>
              <Icon name="chart" size={32} color="#334155" />
              <p style={{marginTop:12, fontSize:13}}>Configure and run analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 2. AI DECISION EXPLAINER
const AIDecisionPage = () => {
  const [scores, setScores] = useState({ lstm_score: 0.78, cnn_score: 0.72, technical_score: 0.68, sentiment_score: 0.61, risk_score: 0.35, confidence: 0.76 });
  const [decision, setDecision] = useState("BUY");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setScores(p => ({...p, [k]: v}));

  const submit = async () => {
    setLoading(true);
    try {
      const res = await api.post("/education/ai-decision/explain", { ...scores, final_decision: decision });
      setResult(res);
      toast("AI decision explained", "success");
    } catch {
      toast("Demo mode — API offline", "error");
      setResult({
        final_decision: decision, confidence: scores.confidence,
        agreement_level: "HIGH", agreement_ratio: 1.0, explanation_strength: "STRONG",
        weighted_contributions: { lstm:{raw_score:0.78,weight:0.3,contribution:0.234}, cnn:{raw_score:0.72,weight:0.2,contribution:0.144}, technical:{raw_score:0.68,weight:0.25,contribution:0.17}, sentiment:{raw_score:0.61,weight:0.15,contribution:0.0915}, risk:{raw_score:0.65,weight:0.1,contribution:0.065} },
        reasoning_points: ["LSTM signals strong upside momentum (0.78)", "CNN identified bullish formation (0.72)", "Technical indicators aligned bullish (0.68)", "News sentiment neutral (0.61)", "Risk within acceptable bounds (0.35)"],
        risk_adjustment_explanation: "Risk score 0.35 is within acceptable bounds. No material confidence penalty applied.",
      });
    }
    setLoading(false);
  };

  const colors = ["prog-blue","prog-green","prog-purple","prog-yellow","prog-blue"];
  const modelLabels = { lstm:"LSTM Trend", cnn:"CNN Pattern", technical:"Technical", sentiment:"Sentiment", risk:"Risk (inv.)" };

  return (
    <div className="fade-in">
      <div className="section-header">
        <div className="section-title">AI Decision Explainer</div>
        <div className="section-sub">Decompose ensemble model contributions with weighted attribution</div>
      </div>
      <div className="grid-2">
        <div className="card card-glow-purple">
          <div className="card-title"><Icon name="brain" size={16} /> Model Inputs</div>
          <SliderInput label="LSTM Score" name="lstm_score" value={scores.lstm_score} onChange={set} />
          <SliderInput label="CNN Score" name="cnn_score" value={scores.cnn_score} onChange={set} />
          <SliderInput label="Technical Score" name="technical_score" value={scores.technical_score} onChange={set} />
          <SliderInput label="Sentiment Score" name="sentiment_score" value={scores.sentiment_score} onChange={set} />
          <SliderInput label="Risk Score" name="risk_score" value={scores.risk_score} onChange={set} />
          <SliderInput label="Confidence" name="confidence" value={scores.confidence} onChange={set} />
          <div className="input-group">
            <label className="input-label">Final Decision</label>
            <select className="select" value={decision} onChange={e => setDecision(e.target.value)}>
              {["BUY","SELL","HOLD"].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-full" onClick={submit} disabled={loading}>
            {loading ? <Spinner /> : <Icon name="brain" size={15} />} {loading ? "Processing..." : "Explain Decision"}
          </button>
        </div>

        <div className="card">
          <div className="card-title"><Icon name="trending" size={16} /> Decision Breakdown</div>
          {result ? (
            <>
              <div style={{display:"flex", gap:8, marginBottom:16, flexWrap:"wrap"}}>
                <SignalBadge signal={result.final_decision} />
                <SignalBadge signal={result.agreement_level} />
                <SignalBadge signal={result.explanation_strength} />
              </div>
              <div style={{marginBottom:16}}>
                {Object.entries(result.weighted_contributions).map(([model, data], i) => (
                  <div key={model} className="contrib-row">
                    <div className="contrib-meta">
                      <span className="contrib-name">{modelLabels[model] || model}</span>
                      <span className="contrib-score">{(data.raw_score*100).toFixed(0)}% × {(data.weight*100).toFixed(0)}% = <span style={{color:"#60A5FA"}}>{(data.contribution*100).toFixed(1)}%</span></span>
                    </div>
                    <div className="prog-bar">
                      <div className={`prog-fill ${colors[i]}`} style={{width:`${data.contribution*300}%`}} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="divider" />
              <div style={{fontSize:12, color:"#CBD5E1", lineHeight:1.7}}>
                {result.reasoning_points?.map((p, i) => (
                  <div key={i} style={{display:"flex", gap:6, marginBottom:4}}>
                    <span style={{color:"#3B82F6", flexShrink:0}}>›</span>{p}
                  </div>
                ))}
              </div>
              <div style={{marginTop:12, padding:"10px 12px", background:"rgba(245,158,11,0.08)", borderRadius:8, border:"1px solid rgba(245,158,11,0.15)", fontSize:11, color:"#FCD34D", lineHeight:1.6}}>
                {result.risk_adjustment_explanation}
              </div>
            </>
          ) : (
            <div style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:200, color:"var(--muted)"}}>
              <Icon name="brain" size={32} color="#334155" />
              <p style={{marginTop:12, fontSize:13}}>Configure model scores and submit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 3. PREDICTION PLAYGROUND
const PlaygroundPage = () => {
  const [form, setForm] = useState({ user_prediction: "BUY", user_confidence: 0.75, ai_prediction: "BUY", actual_outcome: "SELL" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(p => ({...p, [k]: v}));

  const submit = async () => {
    setLoading(true);
    try {
      const res = await api.post("/education/playground/evaluate", form);
      setResult(res);
      toast("Prediction evaluated", "success");
    } catch {
      toast("Demo mode — API offline", "error");
      setResult({
        user_prediction: form.user_prediction, ai_prediction: form.ai_prediction,
        actual_outcome: form.actual_outcome, user_confidence: form.user_confidence,
        correctness: form.user_prediction === form.actual_outcome ? "CORRECT" : "INCORRECT",
        accuracy_score: form.user_prediction === form.actual_outcome ? 1.0 : 0.0,
        calibration_score: 0.19, calibration_level: "OVERCONFIDENT",
        bias_detection: { type: "CALIBRATED", explanation: "No persistent directional bias detected." },
        feedback_report: {
          outcome_summary: `Your prediction (${form.user_prediction}) ${form.user_prediction === form.actual_outcome ? "matched" : "did not match"} the actual outcome (${form.actual_outcome}).`,
          confidence_assessment: `You stated ${(form.user_confidence*100).toFixed(0)}% confidence. Calibration: OVERCONFIDENT. Score: 0.190/1.000`,
          ai_comparison: `AI predicted ${form.ai_prediction}. ${form.user_prediction === form.ai_prediction ? "Your prediction agreed with the AI." : "Your prediction diverged from the AI."}`,
          behavioral_insight: "Overconfidence Bias detected. Confidence exceeded what was statistically warranted. Sustained overconfidence leads to under-hedged positions and concentration risk.",
          improvement_focus: "Review the confidence calibration framework. Match stated confidence to evidence, not emotional conviction.",
        },
      });
    }
    setLoading(false);
  };

  const DirectionPicker = ({ label, field }) => (
    <div className="input-group">
      <label className="input-label">{label}</label>
      <div style={{display:"flex", gap:6}}>
        {["BUY","SELL","HOLD"].map(d => (
          <button key={d} className={`btn ${form[field] === d ? "btn-primary" : "btn-ghost"}`}
            style={{flex:1, fontSize:12, padding:"8px 4px"}} onClick={() => set(field, d)}>
            {d}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fade-in">
      <div className="section-header">
        <div className="section-title">Prediction Playground</div>
        <div className="section-sub">Practice market calls and get behavioral finance coaching</div>
      </div>

      <div style={{marginBottom:12, padding:"10px 14px", background:"rgba(59,130,246,0.06)", borderRadius:10, border:"1px solid rgba(59,130,246,0.15)", fontSize:12, color:"#93C5FD"}}>
        <Icon name="info" size={13} /> Make your directional call, set your confidence, then reveal the actual outcome to receive calibration feedback.
      </div>

      <div className="grid-2">
        <div className="card card-glow-blue">
          <div className="card-title"><Icon name="target" size={16} /> Your Prediction</div>
          <DirectionPicker label="Your Call" field="user_prediction" />
          <SliderInput label={`Confidence — ${(form.user_confidence*100).toFixed(0)}%`} name="user_confidence" value={form.user_confidence} onChange={(k,v) => set(k,v)} />
          <DirectionPicker label="AI Recommendation" field="ai_prediction" />
          <DirectionPicker label="Actual Market Outcome" field="actual_outcome" />
          <button className="btn btn-primary btn-full" onClick={submit} disabled={loading}>
            {loading ? <Spinner /> : <Icon name="zap" size={15} />} {loading ? "Evaluating..." : "Evaluate Prediction"}
          </button>
        </div>

        <div style={{display:"flex", flexDirection:"column", gap:12}}>
          {result && (
            <>
              <div className="card" style={{animation:"fadeSlideIn 0.35s ease"}}>
                <div className="card-title">Outcome Summary</div>
                <div style={{display:"flex", gap:8, marginBottom:12}}>
                  <SignalBadge signal={result.correctness} />
                  <SignalBadge signal={result.calibration_level} />
                </div>
                <ResultRow label="Accuracy" value={result.accuracy_score === 1 ? "✓ Correct" : "✗ Incorrect"} />
                <ResultRow label="Calibration Score" value={`${result.calibration_score?.toFixed(3)} / 1.000`} />
                <ResultRow label="Bias Type" value={result.bias_detection?.type} isSignal />
              </div>
              <div className="card" style={{animation:"fadeSlideIn 0.45s ease"}}>
                <div className="card-title">Behavioral Coaching</div>
                <div style={{fontSize:12, color:"#CBD5E1", lineHeight:1.7, display:"flex", flexDirection:"column", gap:10}}>
                  <div style={{padding:"8px 10px", background:"rgba(16,185,129,0.07)", borderRadius:7, border:"1px solid rgba(16,185,129,0.15)", color:"#34D399"}}>
                    {result.feedback_report?.outcome_summary}
                  </div>
                  <div>{result.feedback_report?.behavioral_insight}</div>
                  <div style={{padding:"8px 10px", background:"rgba(59,130,246,0.07)", borderRadius:7, border:"1px solid rgba(59,130,246,0.15)", color:"#93C5FD"}}>
                    <strong>Focus: </strong>{result.feedback_report?.improvement_focus}
                  </div>
                </div>
              </div>
            </>
          )}
          {!result && (
            <div className="card" style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:200, color:"var(--muted)"}}>
              <Icon name="target" size={32} color="#334155" />
              <p style={{marginTop:12, fontSize:13}}>Submit a prediction to receive feedback</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 4. STRATEGY SIMULATOR
const StrategyPage = () => {
  const [form, setForm] = useState({ investment_amount: 10000, predicted_change_percent: 12.5, risk_score: 0.35, volatility_score: 0.40, scenario_type: "NORMAL" });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(p => ({...p, [k]: v}));

  const simulate = async () => {
    setLoading(true);
    try {
      const res = await api.post("/education/strategy/simulate", form);
      setResult(res);
      toast("Simulation complete", "success");
    } catch {
      toast("Demo mode — API offline", "error");
      const inv = form.investment_amount;
      const proj = inv * (1 + form.predicted_change_percent / 100) - inv * form.volatility_score * 0.05;
      setResult({
        initial_investment: inv, projected_value: proj.toFixed(2), projected_profit_loss: (proj - inv).toFixed(2),
        risk_adjusted_value: (proj * (1 - form.risk_score * 0.3)).toFixed(2),
        worst_case_projection: (inv * (1 - form.risk_score * 0.4 - form.volatility_score * 0.25)).toFixed(2),
        volatility_impact: (inv * form.volatility_score * 0.05).toFixed(2),
        scenario_applied: form.scenario_type,
        educational_insight: "This simulation demonstrates how risk and volatility reduce compounded returns even when the directional call is correct. The risk-adjusted projection reflects realistic expected outcomes after accounting for downside probability.",
      });
    }
    setLoading(false);
  };

  const MetricCard = ({ label, value, color = "var(--text)", prefix = "$" }) => (
    <div className="card metric">
      <div style={{fontSize:11, color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8}}>{label}</div>
      <div className="metric-val" style={{color}}>{prefix}{parseFloat(value || 0).toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
    </div>
  );

  return (
    <div className="fade-in">
      <div className="section-header">
        <div className="section-title">Strategy Simulator</div>
        <div className="section-sub">Deterministic investment outcome modeling across market scenarios</div>
      </div>

      <div className="grid-2" style={{marginBottom:16}}>
        <div className="card card-glow-blue">
          <div className="card-title"><Icon name="trending" size={16} /> Simulation Parameters</div>
          <div className="input-group">
            <label className="input-label">Investment Amount ($)</label>
            <input className="input" type="number" value={form.investment_amount} onChange={e => set("investment_amount", parseFloat(e.target.value))} />
          </div>
          <div className="input-group">
            <label className="input-label">Predicted Change (%)</label>
            <input className="input" type="number" value={form.predicted_change_percent} onChange={e => set("predicted_change_percent", parseFloat(e.target.value))} step="0.5" />
          </div>
          <SliderInput label="Risk Score" name="risk_score" value={form.risk_score} onChange={set} />
          <SliderInput label="Volatility Score" name="volatility_score" value={form.volatility_score} onChange={set} />
          <div className="input-group">
            <label className="input-label">Scenario</label>
            <select className="select" value={form.scenario_type} onChange={e => set("scenario_type", e.target.value)}>
              {["NORMAL","MARKET_CRASH","HIGH_VOLATILITY"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <button className="btn btn-primary btn-full" onClick={simulate} disabled={loading}>
            {loading ? <Spinner /> : <Icon name="zap" size={15} />} {loading ? "Simulating..." : "Run Simulation"}
          </button>
        </div>

        <div>
          {result ? (
            <div style={{display:"flex", flexDirection:"column", gap:10}}>
              <div className="grid-2" style={{gap:10}}>
                <MetricCard label="Projected Value" value={result.projected_value} color="#60A5FA" />
                <MetricCard label="Profit / Loss" value={result.projected_profit_loss} color={parseFloat(result.projected_profit_loss) >= 0 ? "#34D399" : "#F87171"} />
              </div>
              <div className="grid-2" style={{gap:10}}>
                <MetricCard label="Risk-Adjusted" value={result.risk_adjusted_value} color="#A78BFA" />
                <MetricCard label="Worst Case" value={result.worst_case_projection} color="#F87171" />
              </div>
              <div className="card">
                <div style={{fontSize:11, color:"var(--muted)", fontWeight:600, textTransform:"uppercase", marginBottom:8}}>Volatility Drag</div>
                <div style={{fontSize:13, color:"#FCD34D", marginBottom:12}}>${parseFloat(result.volatility_impact || 0).toLocaleString()} cost to compounded returns</div>
                <div style={{fontSize:12, color:"#94A3B8", lineHeight:1.7}}>{result.educational_insight}</div>
              </div>
            </div>
          ) : (
            <div className="card" style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", minHeight:200, color:"var(--muted)"}}>
              <Icon name="trending" size={32} color="#334155" />
              <p style={{marginTop:12, fontSize:13}}>Configure parameters and run simulation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 5. QUIZ ENGINE
const QuizPage = () => {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const q = QUIZ_QUESTIONS[current];
  const keys = ["A", "B", "C", "D"];

  const select = (key) => {
    if (submitted) return;
    setAnswers(p => ({...p, [q.question_id]: key}));
  };

  const submitQuiz = async () => {
    setLoading(true);
    try {
      const res = await api.post("/education/quiz/submit", {
        quiz_id: `session_${Date.now()}`,
        questions: QUIZ_QUESTIONS,
        user_answers: Object.entries(answers).map(([question_id, selected_key]) => ({ question_id, selected_key })),
      });
      setResult(res);
      setSubmitted(true);
      toast("Quiz evaluated!", "success");
    } catch {
      const correct = QUIZ_QUESTIONS.filter(q => answers[q.question_id] === q.correct_option_key).length;
      const score = (correct / QUIZ_QUESTIONS.length) * 100;
      setResult({
        score_percentage: score, correct_count: correct, incorrect_count: QUIZ_QUESTIONS.length - correct,
        mastery_level: score >= 80 ? "ADVANCED" : score >= 60 ? "INTERMEDIATE" : "BEGINNER",
        points_earned: correct * 10,
        motivational_feedback: score >= 80 ? "Exceptional performance. Advanced-level understanding demonstrated." : "Good start. Review weak topics to build mastery.",
        topic_performance: [
          { topic: "RSI", accuracy_percent: answers["q1"] === "C" ? 100 : 0, performance_band: answers["q1"] === "C" ? "STRONG" : "WEAK" },
          { topic: "VOLATILITY", accuracy_percent: answers["q2"] === "B" ? 100 : 0, performance_band: answers["q2"] === "B" ? "STRONG" : "WEAK" },
          { topic: "RISK", accuracy_percent: answers["q3"] === "B" ? 100 : 0, performance_band: answers["q3"] === "B" ? "STRONG" : "WEAK" },
        ],
      });
      setSubmitted(true);
      toast("Demo mode — local scoring", "error");
    }
    setLoading(false);
  };

  const reset = () => { setAnswers({}); setSubmitted(false); setResult(null); setCurrent(0); setShowExplanation(false); };

  const bandColor = { STRONG: "badge-green", DEVELOPING: "badge-yellow", WEAK: "badge-red" };

  return (
    <div className="fade-in">
      <div className="section-header">
        <div className="section-title">Quiz Engine</div>
        <div className="section-sub">Test your financial knowledge with adaptive assessments</div>
      </div>

      {!result ? (
        <div className="grid-2">
          <div className="card card-glow-blue">
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
              <div className="card-title" style={{margin:0}}>Question {current + 1} of {QUIZ_QUESTIONS.length}</div>
              <span className={`badge badge-${q.difficulty === "EASY" ? "green" : q.difficulty === "MEDIUM" ? "yellow" : "red"}`}>{q.difficulty}</span>
            </div>
            <div style={{height:3, background:"rgba(255,255,255,0.06)", borderRadius:2, marginBottom:16}}>
              <div style={{height:"100%", width:`${((current+1)/QUIZ_QUESTIONS.length)*100}%`, background:"linear-gradient(90deg,#3B82F6,#8B5CF6)", borderRadius:2, transition:"width 0.4s ease"}} />
            </div>
            <p style={{fontSize:15, fontWeight:600, marginBottom:20, lineHeight:1.6, color:"#E2E8F0"}}>{q.question_text}</p>
            {q.options.map((opt, i) => {
              const key = keys[i];
              const isSelected = answers[q.question_id] === key;
              return (
                <div key={key} className={`quiz-option ${isSelected ? "selected" : ""}`} onClick={() => select(key)}>
                  <span className="option-key">{key}</span>
                  <span style={{fontSize:13}}>{opt}</span>
                </div>
              );
            })}
            <div style={{display:"flex", gap:8, marginTop:16}}>
              <button className="btn btn-ghost" style={{flex:1}} onClick={() => setCurrent(p => Math.max(0, p-1))} disabled={current === 0}>← Prev</button>
              {current < QUIZ_QUESTIONS.length - 1 ? (
                <button className="btn btn-primary" style={{flex:1}} onClick={() => setCurrent(p => p+1)}>Next →</button>
              ) : (
                <button className="btn btn-primary" style={{flex:1}} onClick={submitQuiz} disabled={loading || Object.keys(answers).length < QUIZ_QUESTIONS.length}>
                  {loading ? <Spinner /> : "Submit Quiz"}
                </button>
              )}
            </div>
            {Object.keys(answers).length < QUIZ_QUESTIONS.length && current === QUIZ_QUESTIONS.length-1 && (
              <div style={{marginTop:10, fontSize:11, color:"#F87171", textAlign:"center"}}>Answer all questions before submitting</div>
            )}
          </div>

          <div className="card">
            <div className="card-title">Question Navigator</div>
            <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:16}}>
              {QUIZ_QUESTIONS.map((_, i) => (
                <div key={i} onClick={() => setCurrent(i)}
                  style={{width:36, height:36, borderRadius:8, display:"grid", placeItems:"center", cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"var(--font-display)", background: answers[QUIZ_QUESTIONS[i].question_id] ? "rgba(59,130,246,0.3)" : i === current ? "rgba(139,92,246,0.3)" : "rgba(255,255,255,0.06)", border: i === current ? "1px solid rgba(139,92,246,0.6)" : "1px solid transparent", color: answers[QUIZ_QUESTIONS[i].question_id] ? "#60A5FA" : "var(--muted)", transition:"all 0.18s ease"}}>
                  {i+1}
                </div>
              ))}
            </div>
            <div style={{fontSize:12, color:"var(--muted)"}}>
              <div style={{display:"flex", gap:8, alignItems:"center", marginBottom:6}}>
                <div style={{width:10, height:10, borderRadius:2, background:"rgba(59,130,246,0.3)"}} /> Answered
              </div>
              <div style={{display:"flex", gap:8, alignItems:"center"}}>
                <div style={{width:10, height:10, borderRadius:2, background:"rgba(255,255,255,0.06)"}} /> Unanswered
              </div>
            </div>
            <div className="divider" />
            <div style={{fontSize:12, color:"var(--muted)", lineHeight:1.7}}>
              <div><strong style={{color:"#CBD5E1"}}>Scoring:</strong> 10 points per correct answer</div>
              <div style={{marginTop:4}}><strong style={{color:"#CBD5E1"}}>Topics:</strong> RSI · Volatility · Risk Management</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="fade-in">
          <div className="grid-2" style={{marginBottom:16}}>
            <div className="card card-glow-blue">
              <div style={{textAlign:"center", padding:"8px 0 16px"}}>
                <div style={{fontSize:48, fontFamily:"var(--font-display)", fontWeight:800, background:"linear-gradient(90deg,#3B82F6,#8B5CF6)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>{result.score_percentage?.toFixed(0)}%</div>
                <div style={{fontSize:13, color:"var(--muted)", marginTop:4}}>Quiz Score</div>
                <div style={{display:"flex", gap:8, justifyContent:"center", marginTop:12}}>
                  <SignalBadge signal={result.mastery_level} />
                  <span className="badge badge-cyan">+{result.points_earned} XP</span>
                </div>
              </div>
              <div className="divider" />
              <div style={{display:"flex", justifyContent:"space-around", textAlign:"center"}}>
                <div><div style={{fontSize:22, fontWeight:700, color:"#34D399", fontFamily:"var(--font-display)"}}>{result.correct_count}</div><div style={{fontSize:11, color:"var(--muted)"}}>Correct</div></div>
                <div><div style={{fontSize:22, fontWeight:700, color:"#F87171", fontFamily:"var(--font-display)"}}>{result.incorrect_count}</div><div style={{fontSize:11, color:"var(--muted)"}}>Incorrect</div></div>
              </div>
              <div className="divider" />
              <div style={{fontSize:12, color:"#94A3B8", lineHeight:1.7, fontStyle:"italic"}}>{result.motivational_feedback}</div>
              <button className="btn btn-ghost btn-full" style={{marginTop:16}} onClick={reset}>Retake Quiz</button>
            </div>

            <div className="card">
              <div className="card-title">Topic Breakdown</div>
              {result.topic_performance?.map(tp => (
                <div key={tp.topic} style={{marginBottom:14}}>
                  <div style={{display:"flex", justifyContent:"space-between", marginBottom:6}}>
                    <span style={{fontSize:12, fontWeight:600}}>{tp.topic}</span>
                    <div style={{display:"flex", gap:6, alignItems:"center"}}>
                      <span style={{fontSize:12, color:"var(--muted)"}}>{tp.accuracy_percent?.toFixed(0)}%</span>
                      <span className={`badge ${bandColor[tp.performance_band]}`} style={{fontSize:9, padding:"2px 7px"}}>{tp.performance_band}</span>
                    </div>
                  </div>
                  <div className="prog-bar">
                    <div className={`prog-fill ${tp.performance_band === "STRONG" ? "prog-green" : tp.performance_band === "DEVELOPING" ? "prog-yellow" : "prog-purple"}`} style={{width:`${tp.accuracy_percent}%`}} />
                  </div>
                </div>
              ))}

              <div className="divider" />
              <div className="card-title" style={{marginBottom:12}}>Answer Review</div>
              {QUIZ_QUESTIONS.map((q, i) => {
                const userAns = answers[q.question_id];
                const correct = userAns === q.correct_option_key;
                return (
                  <div key={q.question_id} style={{marginBottom:12, padding:"10px 12px", borderRadius:8, background: correct ? "rgba(16,185,129,0.07)" : "rgba(239,68,68,0.07)", border: `1px solid ${correct ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`}}>
                    <div style={{fontSize:11, fontWeight:700, color: correct ? "#34D399" : "#F87171", marginBottom:4, display:"flex", gap:6}}>
                      {correct ? "✓" : "✗"} Q{i+1}: {q.topic}
                    </div>
                    <div style={{fontSize:11, color:"#94A3B8", lineHeight:1.5}}>
                      Your answer: <strong>{q.options[["A","B","C","D"].indexOf(userAns)] || "Unanswered"}</strong>
                      {!correct && <> · Correct: <strong style={{color:"#34D399"}}>{q.options[["A","B","C","D"].indexOf(q.correct_option_key)]}</strong></>}
                    </div>
                    {!correct && <div style={{fontSize:11, color:"#64748B", marginTop:4}}>{q.explanation}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 6. STREAK & PROGRESS
const ProgressPage = () => {
  const [streakForm, setStreakForm] = useState({ current_streak: 12, max_streak: 34, last_active_date: "", timezone_label: "Asia/Kolkata", grace_period: true, record_activity: false });
  const [progressForm, setProgressForm] = useState({ user_id: "user_42", quizzes_completed: 18, quiz_scores: [86,92,78,95,88,91,84,93], predictions_made: 35, correct_predictions: 26, calibration_scores: [0.82,0.91,0.77,0.88,0.85], current_streak: 12, max_streak_achieved: 34, total_points: 0, existing_badge_ids: [] });
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadDemoData = () => {
    setSnapshot({
      user_id: "user_42", total_points: 845, level: "Strategist",
      current_streak: 12, max_streak_achieved: 34,
      quiz_average: 86.67, prediction_accuracy: 74.29,
      avg_calibration: 0.828, engagement_score: 0.709,
      learning_consistency: "HIGH", skill_maturity: "EXPERT",
      points_to_next_level: 155,
      badges: [
        { badge_id: "streak_silver", name: "Silver Streak", tier: "SILVER", description: "30+ consecutive days" },
      ],
      summary_narrative: "Current Level: Strategist. Skill Maturity: EXPERT. Learning Consistency: HIGH.",
    });
  };

  useEffect(() => { loadDemoData(); }, []);

  const compute = async () => {
    setLoading(true);
    try {
      const res = await api.post("/education/progress/snapshot", progressForm);
      setSnapshot(res);
      toast("Progress snapshot computed", "success");
    } catch {
      loadDemoData();
      toast("Demo mode — showing sample data", "error");
    }
    setLoading(false);
  };

  const tierColor = { GOLD: "badge-yellow", SILVER: "badge-blue", BRONZE: "#CD7F32" };
  const tierIcon = { GOLD: "🥇", SILVER: "🥈", BRONZE: "🥉" };

  const maturityColor = { EXPERT: "#3B82F6", PROFICIENT: "#8B5CF6", COMPETENT: "#10B981", DEVELOPING: "#F59E0B" };

  return (
    <div className="fade-in">
      <div className="section-header">
        <div className="section-title">Streak & Progress</div>
        <div className="section-sub">Gamified learning journey with XP, badges, and skill maturity</div>
      </div>

      {snapshot && (
        <>
          {/* Hero stats */}
          <div className="grid-3" style={{marginBottom:16}}>
            <div className="card card-glow-blue" style={{textAlign:"center"}}>
              <div style={{fontSize:11, color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8}}>Current Streak</div>
              <div className="stat-big" style={{background:"linear-gradient(90deg,#F59E0B,#EF4444)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>{snapshot.current_streak}</div>
              <div className="stat-label">🔥 days</div>
            </div>
            <div className="card" style={{textAlign:"center"}}>
              <div style={{fontSize:11, color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8}}>Total XP</div>
              <div className="stat-big" style={{background:"linear-gradient(90deg,#3B82F6,#8B5CF6)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent"}}>{snapshot.total_points}</div>
              <div className="stat-label">{snapshot.level}</div>
            </div>
            <div className="card" style={{textAlign:"center"}}>
              <div style={{fontSize:11, color:"var(--muted)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:8}}>Skill Maturity</div>
              <div style={{fontSize:22, fontFamily:"var(--font-display)", fontWeight:800, color: maturityColor[snapshot.skill_maturity] || "#60A5FA", marginBottom:4}}>{snapshot.skill_maturity}</div>
              <div style={{display:"flex", gap:6, justifyContent:"center"}}>
                <span className="badge badge-green">{snapshot.learning_consistency} CONSISTENCY</span>
              </div>
            </div>
          </div>

          {/* XP Progress */}
          <div className="card" style={{marginBottom:16}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
              <div className="card-title" style={{margin:0}}>Level Progress — {snapshot.level}</div>
              <span style={{fontSize:12, color:"var(--muted)"}}>{snapshot.points_to_next_level} XP to next level</span>
            </div>
            <div className="xp-bar">
              <div className="xp-fill" style={{width:`${Math.min(((snapshot.total_points % 400) / 400) * 100, 100)}%`}} />
            </div>
            <div style={{display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11, color:"var(--muted)"}}>
              <span>{snapshot.total_points} XP</span>
              <span>{snapshot.total_points + snapshot.points_to_next_level} XP</span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid-2" style={{marginBottom:16}}>
            <div className="card">
              <div className="card-title">Performance Metrics</div>
              {[
                { label: "Quiz Average", val: snapshot.quiz_average, suffix: "%", color: "prog-blue" },
                { label: "Prediction Accuracy", val: snapshot.prediction_accuracy, suffix: "%", color: "prog-green" },
                { label: "Avg Calibration", val: (snapshot.avg_calibration * 100).toFixed(1), suffix: "%", color: "prog-purple" },
                { label: "Engagement Score", val: (snapshot.engagement_score * 100).toFixed(1), suffix: "%", color: "prog-yellow" },
              ].map(m => (
                <div key={m.label} style={{marginBottom:14}}>
                  <div style={{display:"flex", justifyContent:"space-between", marginBottom:5}}>
                    <span style={{fontSize:12, color:"var(--muted)", fontWeight:600}}>{m.label}</span>
                    <span style={{fontSize:13, fontFamily:"var(--font-display)", fontWeight:700, color:"#E2E8F0"}}>{m.val}{m.suffix}</span>
                  </div>
                  <div className="prog-bar">
                    <div className={`prog-fill ${m.color}`} style={{width:`${m.val}%`}} />
                  </div>
                </div>
              ))}
            </div>

            <div className="card">
              <div className="card-title"><Icon name="award" size={15} /> Earned Badges</div>
              {snapshot.badges?.length > 0 ? (
                <div className="badge-grid">
                  {snapshot.badges.map(b => (
                    <div key={b.badge_id} className="badge-item" title={b.description}>
                      <span>{tierIcon[b.tier] || "🏅"}</span>
                      <span>{b.name}</span>
                    </div>
                  ))}
                  {/* Locked badges for visual richness */}
                  {[{ name:"Gold Streak", icon:"🥇" },{ name:"Scholar", icon:"📚" },{ name:"Precision Trader", icon:"🎯" }]
                    .filter(b => !snapshot.badges.find(earned => earned.name === b.name))
                    .map(b => (
                      <div key={b.name} className="badge-item" style={{opacity:0.35, filter:"grayscale(1)"}}>
                        <span>{b.icon}</span><span>{b.name}</span>
                      </div>
                    ))
                  }
                </div>
              ) : <div style={{color:"var(--muted)", fontSize:13}}>No badges earned yet</div>}

              <div className="divider" />
              <div className="card-title" style={{marginBottom:10}}>Streak Stats</div>
              <div className="result-row">
                <span className="result-key">Current</span>
                <span className="result-val">{snapshot.current_streak} days 🔥</span>
              </div>
              <div className="result-row">
                <span className="result-key">Personal Best</span>
                <span className="result-val">{snapshot.max_streak_achieved} days ⭐</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Recompute Progress Snapshot</div>
            <div className="grid-2" style={{gap:10}}>
              <div className="input-group">
                <label className="input-label">User ID</label>
                <input className="input" value={progressForm.user_id} onChange={e => setProgressForm(p => ({...p, user_id: e.target.value}))} />
              </div>
              <div className="input-group">
                <label className="input-label">Current Streak</label>
                <input className="input" type="number" value={progressForm.current_streak} onChange={e => setProgressForm(p => ({...p, current_streak: parseInt(e.target.value)}))} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={compute} disabled={loading}>
              {loading ? <Spinner /> : <Icon name="zap" size={15} />} {loading ? "Computing..." : "Recompute Snapshot"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ─── NAVIGATION CONFIG ───────────────────────────────────────────────────────
const NAV = [
  { id: "indicator", label: "Indicator Explainer", icon: "chart" },
  { id: "ai-decision", label: "AI Decision", icon: "brain" },
  { id: "playground", label: "Playground", icon: "target" },
  { id: "strategy", label: "Strategy Sim", icon: "trending" },
  { id: "quiz", label: "Quiz Engine", icon: "quiz" },
  { id: "progress", label: "Streak & Progress", icon: "flame" },
];

const PAGE_MAP = {
  "indicator": IndicatorPage,
  "ai-decision": AIDecisionPage,
  "playground": PlaygroundPage,
  "strategy": StrategyPage,
  "quiz": QuizPage,
  "progress": ProgressPage,
};

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState("indicator");
  const [collapsed, setCollapsed] = useState(false);

  const Page = PAGE_MAP[active] || IndicatorPage;
  const currentNav = NAV.find(n => n.id === active);

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        {/* SIDEBAR */}
        <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
          <div className="sidebar-logo">
            <div className="logo-mark">AI</div>
            <div className="logo-text">EduFin Platform</div>
          </div>
          <div className="nav-section">
            {!collapsed && <div className="nav-label">Modules</div>}
            {NAV.map(n => (
              <div key={n.id} className={`nav-item ${active === n.id ? "active" : ""}`} onClick={() => setActive(n.id)}>
                <Icon name={n.icon} size={18} color={active === n.id ? "#60A5FA" : "currentColor"} />
                <span>{n.label}</span>
              </div>
            ))}
          </div>

          <div style={{padding:"12px 12px 16px", borderTop:"1px solid var(--border)"}}>
            <div className="nav-item" onClick={() => setCollapsed(p => !p)}>
              <Icon name="menu" size={18} />
              <span>{collapsed ? "Expand" : "Collapse"}</span>
            </div>
          </div>
        </div>

        {/* MAIN */}
        <div className="main">
          <div className="topbar">
            <div className="topbar-left">
              <div className="topbar-title">{currentNav?.label}</div>
            </div>
            <div className="topbar-right">
              <div className="status-dot" />
              <span style={{fontSize:12, color:"var(--muted)"}}>API Connected</span>
              <span className="badge badge-blue">v1.0.0</span>
              <span className="badge badge-purple">Education Intelligence</span>
            </div>
          </div>

          <div className="content">
            <Page />
          </div>
        </div>
      </div>
      <Toast />
    </>
  );
}