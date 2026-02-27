import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { create } from "zustand";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, ReferenceLine
} from "recharts";
import {
  LayoutDashboard, TrendingUp, Brain, Gamepad2, MessageSquare,
  X, Send, ChevronDown, ChevronUp, Bell, Settings, Search,
  ArrowUpRight, ArrowDownRight, Zap, Shield, Target, Award,
  Activity, BarChart2, PieChart, Layers, AlertTriangle, CheckCircle,
  XCircle, Plus, Minus, RefreshCw, Wifi, WifiOff, Star, Trophy,
  Flame, BookOpen, TrendingDown, Eye, EyeOff, ChevronRight,
  Clock, DollarSign, Percent, Hash, Filter, Download, MoreHorizontal
} from "lucide-react";

// ─── ZUSTAND STORE ────────────────────────────────────────────────────────────
const useStore = create((set, get) => ({
  balance: 124850.75,
  pnl: 3247.50,
  pnlPercent: 2.67,
  xp: 7840,
  xpMax: 10000,
  rank: "Strategist",
  streak: 12,
  longestStreak: 19,
  positions: [],
  trades: [],
  biasHistory: [],
  apiConnected: true,
  activeModule: "dashboard",
  chatOpen: false,
  chatMessages: [
    { role: "assistant", content: "Welcome to EduFin Intelligence. I'm your AI trading coach. How can I help you today?", ts: Date.now() - 60000 }
  ],
  toasts: [],
  confidenceSlider: 65,
  openPositions: [
    { id: 1, symbol: "NIFTY50", type: "LONG", entry: 22145, qty: 50, pnl: 1250, status: "open" },
    { id: 2, symbol: "BANKNIFTY", type: "SHORT", entry: 47820, qty: 25, pnl: -380, status: "open" }
  ],
  setModule: (m) => set({ activeModule: m }),
  setChatOpen: (v) => set({ chatOpen: v }),
  addMessage: (msg) => set((s) => ({ chatMessages: [...s.chatMessages, { ...msg, ts: Date.now() }] })),
  addToast: (toast) => {
    const id = Date.now();
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
  setConfidence: (v) => set({ confidenceSlider: v }),
  addTrade: (trade) => {
    const trades = [trade, ...get().trades].slice(0, 50);
    const biasHistory = [...get().biasHistory];
    const biases = detectBiases(trade, get());
    if (biases.length) biasHistory.unshift({ ...trade, biases, ts: Date.now() });
    set({ trades, biasHistory: biasHistory.slice(0, 20) });
  },
  updateBalance: (delta) => set((s) => ({ balance: s.balance + delta, pnl: s.pnl + delta })),
  addXP: (pts) => set((s) => {
    let xp = s.xp + pts;
    if (xp >= s.xpMax) xp = s.xpMax;
    return { xp };
  }),
}));

function detectBiases(trade, state) {
  const biases = [];
  if (trade.confidence > 85) biases.push("Overconfidence");
  if (trade.candlesHeld < 3) biases.push("Early Exit");
  const recent = state.trades.slice(0, 3);
  if (recent.length >= 2 && recent[0]?.pnl < 0 && recent[1]?.pnl < 0) biases.push("Revenge Trading");
  if (recent.length >= 3 && recent.every(t => t.direction === trade.direction)) biases.push("Herding");
  if (recent[0]?.pnl > 0 && trade.qty > (recent[0]?.qty || 0)) biases.push("FOMO");
  return biases;
}

// ─── OHLC DATA GENERATOR ─────────────────────────────────────────────────────
function generateOHLC(count = 120, base = 22000, volatility = 80) {
  const data = [];
  let close = base;
  const now = Math.floor(Date.now() / 1000);
  for (let i = count; i >= 0; i--) {
    const open = close;
    const change = (Math.random() - 0.48) * volatility;
    close = Math.max(open + change, 1000);
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(50000 + Math.random() * 200000);
    data.push({ time: now - i * 300, open: +open.toFixed(2), high: +high.toFixed(2), low: +low.toFixed(2), close: +close.toFixed(2), volume });
  }
  return data;
}

// ─── WEEKLY PNL DATA ──────────────────────────────────────────────────────────
const weeklyPnl = [
  { day: "Mon", pnl: 1240, ai: 1580 },
  { day: "Tue", pnl: -320, ai: 240 },
  { day: "Wed", pnl: 2100, ai: 1920 },
  { day: "Thu", pnl: 880, ai: 1100 },
  { day: "Fri", pnl: 3247, ai: 2800 },
  { day: "Sat", pnl: 620, ai: 900 },
  { day: "Sun", pnl: 0, ai: 0 },
];

const biasData = [
  { week: "W1", overconf: 3, fomo: 1, herd: 2 },
  { week: "W2", overconf: 2, fomo: 3, herd: 1 },
  { week: "W3", overconf: 1, fomo: 2, herd: 4 },
  { week: "W4", overconf: 4, fomo: 1, herd: 2 },
];

const monthlyPerf = [
  { month: "Sep", return: 4.2 }, { month: "Oct", return: -1.8 },
  { month: "Nov", return: 6.7 }, { month: "Dec", return: 2.1 },
  { month: "Jan", return: 8.4 }, { month: "Feb", return: 2.67 },
];

// ─── STREAK HEATMAP DATA ──────────────────────────────────────────────────────
function generateStreakData() {
  const data = [];
  for (let w = 0; w < 52; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      week.push(Math.random() > 0.3 ? Math.floor(Math.random() * 5) : 0);
    }
    data.push(week);
  }
  return data;
}
const streakData = generateStreakData();

// ─── RANK TIERS ───────────────────────────────────────────────────────────────
const RANKS = [
  { name: "Novice", min: 0, max: 1000, color: "#6B7280" },
  { name: "Analyst", min: 1000, max: 3000, color: "#3B82F6" },
  { name: "Trader", min: 3000, max: 6000, color: "#8B5CF6" },
  { name: "Strategist", min: 6000, max: 10000, color: "#F59E0B" },
  { name: "Institutional Mind", min: 10000, max: 20000, color: "#EC4899" },
];

// ─── INDICATORS DATA ──────────────────────────────────────────────────────────
const indicators = [
  {
    name: "RSI (14)", value: "67.4", signal: "BULLISH", bias: "Neutral", confidence: 72,
    risk: "Approaching overbought territory. Watch for divergence near 70-75.",
    interpretation: "RSI is in bullish momentum zone. The current reading suggests sustained buying pressure without extreme conditions."
  },
  {
    name: "MACD (12,26,9)", value: "+2.4 / +0.8", signal: "BULLISH", bias: "Slight Bullish", confidence: 68,
    risk: "Histogram expansion moderate. Signal line crossing could indicate momentum shift.",
    interpretation: "MACD line above signal line with positive histogram. Trend momentum is upward but watch for deceleration."
  },
  {
    name: "Bollinger Bands", value: "22,148 (Mid)", signal: "NEUTRAL", bias: "Mean Reversion", confidence: 55,
    risk: "Price near middle band. No clear directional edge. Breakout watch required.",
    interpretation: "Price consolidating near 20-period MA. Band width narrowing suggests volatility compression, breakout imminent."
  },
  {
    name: "Volume Profile", value: "2.1M (1.4x avg)", signal: "BULLISH", bias: "Institutional", confidence: 81,
    risk: "High volume on up-moves is bullish confirmation. Sustaining above VPOC critical.",
    interpretation: "Above-average volume on upward price action suggests institutional accumulation. Value area high at 22,320."
  },
];

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs shadow-2xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === 'number' && p.value < 100 && p.value > -100 ? p.value.toFixed(1) + '%' : '₹' + p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

// ─── SKELETON LOADER ──────────────────────────────────────────────────────────
const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 rounded-xl ${className}`} />
);

// ─── GLASS CARD ───────────────────────────────────────────────────────────────
const GlassCard = ({ children, className = "", glow = false }) => (
  <div className={`bg-gray-900/80 backdrop-blur-xl border border-gray-800/60 rounded-2xl ${glow ? 'shadow-[0_0_30px_rgba(99,102,241,0.12)]' : 'shadow-lg'} ${className}`}>
    {children}
  </div>
);

// ─── BADGE ────────────────────────────────────────────────────────────────────
const BiasBadge = ({ bias }) => {
  const colors = {
    "Overconfidence": "bg-red-500/20 text-red-400 border-red-500/30",
    "Early Exit": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "Revenge Trading": "bg-orange-500/20 text-orange-400 border-orange-500/30",
    "Herding": "bg-purple-500/20 text-purple-400 border-purple-500/30",
    "FOMO": "bg-pink-500/20 text-pink-400 border-pink-500/30",
    "Loss Aversion": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${colors[bias] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
      {bias}
    </span>
  );
};

// ─── TOP NAVBAR ───────────────────────────────────────────────────────────────
const TopNavbar = () => {
  const { apiConnected, addToast, balance, pnl, pnlPercent } = useStore();
  return (
    <div className="h-14 bg-gray-950/90 backdrop-blur-xl border-b border-gray-800/50 flex items-center px-6 gap-4 sticky top-0 z-40">
      <div className="flex items-center gap-2 mr-4">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
          <Zap size={14} className="text-white" />
        </div>
        <span className="font-bold text-white text-sm tracking-tight">EduFin<span className="text-blue-400">Intelligence</span></span>
      </div>

      <div className="flex-1 max-w-xs relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input className="w-full bg-gray-800/60 border border-gray-700/50 rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-gray-800" placeholder="Search instruments, indicators..." />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1 bg-gray-800/40 rounded-xl px-3 py-1.5 border border-gray-700/50">
        <span className="text-xs text-gray-400">Portfolio</span>
        <span className="text-sm font-bold text-white ml-1">₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        <span className={`text-xs ml-1 font-semibold ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {pnl >= 0 ? '+' : ''}₹{pnl.toLocaleString()} ({pnlPercent}%)
        </span>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-800/40 border border-gray-700/50">
        <div className={`w-1.5 h-1.5 rounded-full ${apiConnected ? 'bg-emerald-400 shadow-[0_0_6px_#34d399]' : 'bg-red-400'} animate-pulse`} />
        <span className="text-xs text-gray-400">{apiConnected ? 'Connected' : 'Offline'}</span>
      </div>

      <button onClick={() => addToast({ type: 'info', message: 'No new notifications' })} className="relative p-2 rounded-xl hover:bg-gray-800 transition-colors">
        <Bell size={15} className="text-gray-400" />
        <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-500 rounded-full" />
      </button>

      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center cursor-pointer">
        <span className="text-xs font-bold text-white">AK</span>
      </div>
    </div>
  );
};

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const Sidebar = () => {
  const { activeModule, setModule, xp, xpMax, rank } = useStore();
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "indicators", label: "Indicators", icon: BarChart2 },
    { id: "ai-decision", label: "AI Decision", icon: Brain },
    { id: "simulation", label: "Simulation", icon: TrendingUp },
    { id: "gamification", label: "Progress", icon: Trophy },
  ];
  const rankInfo = RANKS.find(r => r.name === rank) || RANKS[3];
  return (
    <div className="w-[220px] min-h-screen bg-gray-950/90 border-r border-gray-800/50 flex flex-col py-4 backdrop-blur-xl">
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => (
          <motion.button
            key={id}
            onClick={() => setModule(id)}
            whileTap={{ scale: 0.97 }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeModule === id
                ? 'bg-gradient-to-r from-blue-600/20 to-violet-600/20 text-white border border-blue-500/20'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
            }`}
          >
            <Icon size={16} className={activeModule === id ? 'text-blue-400' : ''} />
            {label}
            {activeModule === id && <div className="ml-auto w-1 h-4 rounded-full bg-gradient-to-b from-blue-400 to-violet-500" />}
          </motion.button>
        ))}
      </nav>

      <div className="px-3 pb-2">
        <div className="bg-gray-900/80 rounded-2xl p-3 border border-gray-800/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${rankInfo.color}20` }}>
              <Trophy size={13} style={{ color: rankInfo.color }} />
            </div>
            <div>
              <p className="text-xs font-bold text-white">{rank}</p>
              <p className="text-xs text-gray-500">{xp.toLocaleString()} XP</p>
            </div>
          </div>
          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(xp / xpMax) * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
            />
          </div>
          <p className="text-xs text-gray-600 mt-1">{xp.toLocaleString()} / {xpMax.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
};

// ─── TOAST SYSTEM ─────────────────────────────────────────────────────────────
const ToastSystem = () => {
  const { toasts, removeToast } = useStore();
  const icons = { success: CheckCircle, error: XCircle, warning: AlertTriangle, info: Activity };
  const colors = { success: 'text-emerald-400 border-emerald-500/30', error: 'text-red-400 border-red-500/30', warning: 'text-yellow-400 border-yellow-500/30', info: 'text-blue-400 border-blue-500/30' };
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map(t => {
          const Icon = icons[t.type] || Activity;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`flex items-center gap-3 bg-gray-900/95 backdrop-blur-xl border rounded-xl px-4 py-3 shadow-2xl text-sm ${colors[t.type] || 'text-gray-300 border-gray-700'}`}
            >
              <Icon size={15} />
              <span className="text-white">{t.message}</span>
              <button onClick={() => removeToast(t.id)} className="ml-2 opacity-50 hover:opacity-100"><X size={13} /></button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

// ─── AI CHATBOT ───────────────────────────────────────────────────────────────
const AIChatbot = () => {
  const { chatOpen, setChatOpen, chatMessages, addMessage } = useStore();
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);

  const aiResponses = [
    "Based on the current RSI at 67.4, I recommend a cautious bullish stance. The momentum is strong, but position sizing should be conservative.",
    "Your recent overconfidence bias detected in the last 3 trades. Consider reducing position size by 20% until the pattern normalizes.",
    "NIFTY is showing institutional accumulation patterns. Volume profile VPOC at 22,180 is the key level to watch.",
    "Your win rate this week is 68%. You're trending well. Focus on holding winners longer — your average hold time is below 4 candles.",
    "The Bollinger Band squeeze on the 1H chart suggests a major breakout within 2-3 sessions. Watch for volume confirmation.",
  ];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, typing]);

  const handleSend = () => {
    if (!input.trim()) return;
    addMessage({ role: "user", content: input });
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      addMessage({ role: "assistant", content: aiResponses[Math.floor(Math.random() * aiResponses.length)] });
    }, 1200 + Math.random() * 800);
  };

  return (
    <>
      <motion.button
        onClick={() => setChatOpen(!chatOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-[0_0_30px_rgba(99,102,241,0.4)] flex items-center justify-center"
      >
        <AnimatePresence mode="wait">
          {chatOpen
            ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X size={20} className="text-white" /></motion.div>
            : <motion.div key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><MessageSquare size={20} className="text-white" /></motion.div>
          }
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="fixed bottom-24 right-6 z-50 w-[360px] h-[520px] bg-gray-950/95 backdrop-blur-2xl border border-gray-800/60 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-gray-800/50 flex items-center gap-3 bg-gradient-to-r from-blue-600/10 to-violet-600/10">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                <Brain size={16} className="text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">EduFin AI Coach</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-xs text-gray-400">Active • Analyzing your portfolio</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-800">
              {chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-br-sm'
                      : 'bg-gray-800/80 text-gray-200 rounded-bl-sm border border-gray-700/50'
                  }`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {typing && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gray-800/80 rounded-2xl rounded-bl-sm w-fit border border-gray-700/50">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }} className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                  ))}
                </motion.div>
              )}
              <div ref={endRef} />
            </div>

            <div className="p-3 border-t border-gray-800/50">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about your trades, biases, strategy..."
                  className="flex-1 bg-gray-800/60 border border-gray-700/50 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                />
                <button onClick={handleSend} className="p-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:opacity-90 transition-opacity">
                  <Send size={15} className="text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ─── DASHBOARD MODULE ────────────────────────────────────────────────────────
const DashboardModule = () => {
  const { balance, pnl, pnlPercent, openPositions } = useStore();
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setTimeout(() => setLoaded(true), 600); }, []);

  const stats = [
    { label: "Accuracy", value: "68.4%", sub: "+2.1% WoW", up: true, icon: Target, color: "text-emerald-400" },
    { label: "Confidence Cal.", value: "74.2%", sub: "-0.3% WoW", up: false, icon: Shield, color: "text-blue-400" },
    { label: "AI Beat Rate", value: "61.5%", sub: "+4.2% WoW", up: true, icon: Brain, color: "text-violet-400" },
    { label: "Sharpe Ratio", value: "2.14", sub: "Excellent", up: true, icon: TrendingUp, color: "text-amber-400" },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold text-white">Portfolio Overview</h1>
          <p className="text-sm text-gray-500">Friday, 27 Feb 2026 • Market Open</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:bg-gray-750 transition-colors">
            <Filter size={12} /> Filter
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:bg-gray-750 transition-colors">
            <Download size={12} /> Export
          </button>
        </div>
      </div>

      {/* Portfolio Balance Card */}
      {!loaded ? <Skeleton className="h-[140px]" /> : (
        <GlassCard className="p-5" glow>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Total Portfolio Value</p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-black text-white tracking-tight"
              >
                ₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </motion.p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 text-emerald-400 text-sm font-semibold">
                  <ArrowUpRight size={15} />
                  +₹{pnl.toLocaleString()} ({pnlPercent}%) today
                </div>
                <span className="text-xs text-gray-600">vs yesterday</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">Open Positions</p>
              <p className="text-2xl font-bold text-white">{openPositions.length}</p>
              <p className="text-xs text-gray-500">2 active trades</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {openPositions.map(p => (
              <div key={p.id} className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white">{p.symbol}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.type === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{p.type}</span>
                </div>
                <p className="text-xs text-gray-500">Entry: ₹{p.entry.toLocaleString()} · Qty: {p.qty}</p>
                <p className={`text-sm font-bold mt-1 ${p.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {p.pnl >= 0 ? '+' : ''}₹{p.pnl.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((s, i) => (
          !loaded ? <Skeleton key={i} className="h-24" /> : (
            <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <GlassCard className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <div className={`flex items-center gap-1 text-xs mt-1 ${s.up ? 'text-emerald-400' : 'text-red-400'}`}>
                      {s.up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                      {s.sub}
                    </div>
                  </div>
                  <div className={`p-2 rounded-xl bg-gray-800/80`}>
                    <s.icon size={15} className={s.color} />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Weekly P&L — AI vs You</h3>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-lg">7D</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={weeklyPnl}>
              <defs>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 0 ? '' : '-'}${Math.abs(v/1000).toFixed(1)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="pnl" stroke="#3B82F6" strokeWidth={2} fill="url(#pnlGrad)" name="You" dot={false} />
              <Area type="monotone" dataKey="ai" stroke="#8B5CF6" strokeWidth={2} fill="url(#aiGrad)" name="AI" dot={false} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-blue-500 rounded" /><span className="text-xs text-gray-500">Your P&L</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-violet-500 rounded border-dashed" /><span className="text-xs text-gray-500">AI Model</span></div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Behavioral Bias Trends</h3>
            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-lg">4W</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={biasData} barSize={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="week" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="overconf" fill="#EF4444" radius={[3, 3, 0, 0]} name="Overconf." />
              <Bar dataKey="fomo" fill="#F59E0B" radius={[3, 3, 0, 0]} name="FOMO" />
              <Bar dataKey="herd" fill="#8B5CF6" radius={[3, 3, 0, 0]} name="Herding" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
    </div>
  );
};

// ─── INDICATORS MODULE ────────────────────────────────────────────────────────
const IndicatorsModule = () => (
  <div className="p-6 space-y-4">
    <div className="flex items-center justify-between mb-2">
      <h1 className="text-xl font-bold text-white">Indicator Research</h1>
      <span className="text-xs text-gray-500 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-xl">NIFTY50 · Spot · 1H</span>
    </div>
    <div className="grid grid-cols-2 gap-4">
      {indicators.map((ind, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
          <GlassCard className="p-5 h-full" glow={ind.confidence > 75}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-white">{ind.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Value: <span className="text-blue-400 font-semibold">{ind.value}</span></p>
              </div>
              <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                ind.signal === 'BULLISH' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' :
                ind.signal === 'BEARISH' ? 'bg-red-500/15 text-red-400 border-red-500/25' :
                'bg-gray-700/50 text-gray-300 border-gray-600/50'
              }`}>{ind.signal}</div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Confidence</span>
                  <span className="text-white font-semibold">{ind.confidence}%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${ind.confidence}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                    className={`h-full rounded-full ${ind.confidence >= 75 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : ind.confidence >= 60 ? 'bg-gradient-to-r from-blue-500 to-violet-500' : 'bg-gradient-to-r from-yellow-500 to-orange-500'}`}
                  />
                </div>
              </div>

              <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/40">
                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Trading Bias</p>
                <p className="text-xs font-semibold text-blue-300">{ind.bias}</p>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <p className="text-xs text-amber-400 mb-1 font-medium flex items-center gap-1"><AlertTriangle size={11} /> Risk Note</p>
                <p className="text-xs text-gray-300 leading-relaxed">{ind.risk}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1.5 uppercase tracking-wider">Interpretation</p>
                <p className="text-xs text-gray-300 leading-relaxed">{ind.interpretation}</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      ))}
    </div>
  </div>
);

// ─── AI DECISION MODULE ───────────────────────────────────────────────────────
const AIDecisionModule = () => {
  const [userSignal, setUserSignal] = useState("HOLD");
  const aiSignal = "BUY";
  const aiConfidence = 78;
  const userConfidence = 65;
  const gap = aiConfidence - userConfidence;

  const biases = [
    { name: "Overconfidence", score: 42, desc: "You've overestimated win probability in 3 of last 5 trades" },
    { name: "Loss Aversion", score: 68, desc: "Detected early exit pattern — cutting winners prematurely" },
    { name: "Herding", score: 35, desc: "Following market direction without independent analysis" },
    { name: "FOMO", score: 55, desc: "Position size increased after 2 consecutive wins last week" },
  ];

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-white mb-4">AI Decision Engine</h1>

      <div className="grid grid-cols-3 gap-4">
        {/* Signal Comparison */}
        <GlassCard className="p-5 col-span-2" glow>
          <h3 className="text-sm font-bold text-white mb-5">Signal Comparison — NIFTY50 · 1H</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">AI Model Signal</p>
              <motion.div
                animate={{ boxShadow: ['0 0 20px rgba(16,185,129,0.2)', '0 0 40px rgba(16,185,129,0.4)', '0 0 20px rgba(16,185,129,0.2)'] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="w-24 h-24 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3"
              >
                <div>
                  <TrendingUp size={32} className="text-emerald-400 mx-auto mb-1" />
                  <p className="text-xs font-black text-emerald-400">{aiSignal}</p>
                </div>
              </motion.div>
              <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${aiConfidence}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                />
              </div>
              <p className="text-lg font-black text-emerald-400 mt-2">{aiConfidence}%</p>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Your Signal</p>
              <div className="flex gap-2 justify-center mb-3">
                {["BUY", "HOLD", "SELL"].map(s => (
                  <button key={s} onClick={() => setUserSignal(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      userSignal === s
                        ? s === 'BUY' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : s === 'SELL' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-gray-600/40 text-gray-300 border border-gray-500/30'
                        : 'bg-gray-800 text-gray-500 border border-gray-700/50 hover:text-gray-300'
                    }`}
                  >{s}</button>
                ))}
              </div>
              <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${userConfidence}%` }}
                  transition={{ duration: 1 }}
                  className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full"
                />
              </div>
              <p className="text-lg font-black text-blue-400 mt-2">{userConfidence}%</p>
            </div>
          </div>

          <div className="mt-5 p-4 bg-gray-800/50 rounded-xl border border-gray-700/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Confidence Gap</span>
              <span className={`text-xs font-bold ${gap > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>+{gap}% AI advantage</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.abs(gap) / 40 * 100}%` }}
                transition={{ duration: 1 }}
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">The AI model has 13% higher signal confidence based on multi-factor analysis</p>
          </div>
        </GlassCard>

        {/* Behavior Score */}
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Behavioral Score</h3>
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="48" fill="none" stroke="#1F2937" strokeWidth="10" />
                <motion.circle
                  cx="60" cy="60" r="48" fill="none"
                  stroke="url(#scoreGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 48}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 48 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 48 * (1 - 0.62) }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3B82F6" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white">62</span>
                <span className="text-xs text-gray-500">/100</span>
              </div>
            </div>
            <p className="text-sm font-bold text-white mt-3">Average Trader</p>
            <p className="text-xs text-gray-500 text-center mt-1">Work on discipline to reach Elite tier</p>
          </div>
        </GlassCard>
      </div>

      {/* Bias Cards */}
      <div className="grid grid-cols-4 gap-3">
        {biases.map((b, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <GlassCard className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-white">{b.name}</p>
                <span className={`text-xs font-bold ${b.score > 60 ? 'text-red-400' : b.score > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>{b.score}</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${b.score}%` }}
                  transition={{ duration: 1, delay: i * 0.1 }}
                  className={`h-full rounded-full ${b.score > 60 ? 'bg-red-500' : b.score > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                />
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{b.desc}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ─── TRADING SIMULATION ───────────────────────────────────────────────────────
const SimulationModule = () => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const { addToast, addTrade, addXP, updateBalance, confidenceSlider, setConfidence } = useStore();

  const [timeframe, setTimeframe] = useState("5m");
  const [position, setPosition] = useState(null);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(22148.50);
  const [qty, setQty] = useState(25);
  const [showOutcome, setShowOutcome] = useState(null);
  const [candles, setCandles] = useState([]);
  const [biasWarning, setBiasWarning] = useState(null);

  const ohlcData = useMemo(() => generateOHLC(120, 22000, 80), []);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const { createChart } = window.LightweightCharts || {};
    if (!createChart) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 320,
      layout: { background: { color: "transparent" }, textColor: "#9CA3AF" },
      grid: { vertLines: { color: "#1F2937" }, horzLines: { color: "#1F2937" } },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: "#374151" },
      timeScale: { borderColor: "#374151", timeVisible: true },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10B981", downColor: "#EF4444",
      borderUpColor: "#10B981", borderDownColor: "#EF4444",
      wickUpColor: "#10B981", wickDownColor: "#EF4444",
    });
    candleSeries.setData(ohlcData);

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeries.setData(ohlcData.map(d => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)"
    })));

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    setCurrentPrice(ohlcData[ohlcData.length - 1].close);
    setCandles(ohlcData);

    const obs = new ResizeObserver(() => {
      if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    });
    obs.observe(chartContainerRef.current);
    return () => { chart.remove(); obs.disconnect(); };
  }, [ohlcData]);

  const handleTrade = (direction) => {
    if (position) {
      addToast({ type: "warning", message: "Close existing position first" });
      return;
    }
    if (confidenceSlider > 85) setBiasWarning("Overconfidence detected — high confidence increases cognitive bias risk");
    else setBiasWarning(null);

    const entry = currentPrice;
    const newPos = { direction, entry, qty, confidence: confidenceSlider, candleEntry: candles.length, ts: Date.now() };
    setPosition(newPos);
    addToast({ type: "success", message: `${direction} ${qty} units @ ₹${entry.toLocaleString()} | Conf: ${confidenceSlider}%` });
  };

  const closePosition = () => {
    if (!position) return;
    const exit = currentPrice + (Math.random() - 0.48) * 120;
    const pnl = position.direction === "BUY"
      ? (exit - position.entry) * position.qty
      : (position.entry - exit) * position.qty;
    const trade = {
      ...position, exit: +exit.toFixed(2), pnl: +pnl.toFixed(2),
      direction: position.direction, candlesHeld: candles.length - position.candleEntry,
    };

    setShowOutcome(trade);
    setTradeHistory(prev => [trade, ...prev].slice(0, 20));
    addTrade(trade);
    updateBalance(pnl);
    addXP(pnl > 0 ? 120 : 30);
    setPosition(null);
    addToast({ type: pnl > 0 ? "success" : "error", message: `Trade closed: ${pnl > 0 ? '+' : ''}₹${pnl.toFixed(2)}` });
    setTimeout(() => setShowOutcome(null), 3000);
  };

  const unrealizedPnL = position
    ? ((position.direction === "BUY" ? currentPrice - position.entry : position.entry - currentPrice) * position.qty).toFixed(2)
    : null;

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      <div className="flex-1 flex flex-col p-5 gap-4 overflow-y-auto">
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-black text-white">NIFTY50</span>
            <span className="text-xl font-black text-emerald-400">₹{currentPrice.toLocaleString()}</span>
            <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-lg">+0.42%</span>
          </div>
          <div className="flex gap-1">
            {["1m", "5m", "15m", "1H", "1D"].map(tf => (
              <button key={tf} onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${timeframe === tf ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'}`}
              >{tf}</button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <GlassCard className="overflow-hidden">
          <div ref={chartContainerRef} className="w-full" style={{ height: 320 }} />
        </GlassCard>

        {/* Bias Warning */}
        <AnimatePresence>
          {biasWarning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-500/10 border border-red-500/25 rounded-xl p-3 flex items-center gap-2"
            >
              <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-300">{biasWarning}</p>
              <button onClick={() => setBiasWarning(null)} className="ml-auto"><X size={12} className="text-red-400" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Outcome Toast */}
        <AnimatePresence>
          {showOutcome && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`${showOutcome.pnl >= 0 ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-red-500/15 border-red-500/30'} border rounded-xl p-4 text-center`}
            >
              <p className="text-xs text-gray-400 mb-1">Trade Result</p>
              <p className={`text-2xl font-black ${showOutcome.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {showOutcome.pnl >= 0 ? '+' : ''}₹{showOutcome.pnl.toFixed(2)}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trading Controls */}
        <GlassCard className="p-5">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400">Confidence Level</label>
                  <span className={`text-xs font-bold ${confidenceSlider > 85 ? 'text-red-400' : confidenceSlider > 65 ? 'text-amber-400' : 'text-emerald-400'}`}>{confidenceSlider}%</span>
                </div>
                <input
                  type="range" min={20} max={100} value={confidenceSlider}
                  onChange={e => setConfidence(+e.target.value)}
                  className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Cautious</span>
                  <span>{confidenceSlider > 85 ? '⚠️ Overconfidence Risk' : 'Calibrated'}</span>
                  <span>Aggressive</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-2">Quantity</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQty(Math.max(1, qty - 5))} className="p-1.5 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-colors"><Minus size={13} className="text-gray-300" /></button>
                  <span className="text-white font-bold w-12 text-center">{qty}</span>
                  <button onClick={() => setQty(qty + 5)} className="p-1.5 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 transition-colors"><Plus size={13} className="text-gray-300" /></button>
                  <span className="text-xs text-gray-500 ml-2">≈ ₹{(currentPrice * qty).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <motion.button
                onClick={() => handleTrade("BUY")}
                disabled={!!position}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <TrendingUp size={16} /> BUY / LONG
              </motion.button>
              <motion.button
                onClick={() => handleTrade("SELL")}
                disabled={!!position}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
              >
                <TrendingDown size={16} /> SELL / SHORT
              </motion.button>
              {position && (
                <motion.button
                  onClick={closePosition}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-xl bg-gray-700 border border-gray-600 text-white font-bold text-sm hover:bg-gray-600 transition-colors"
                >
                  Close Position
                </motion.button>
              )}
            </div>
          </div>

          {position && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-gray-800/60 rounded-xl border border-gray-700/40 grid grid-cols-4 gap-4"
            >
              <div>
                <p className="text-xs text-gray-500">Direction</p>
                <p className={`text-sm font-bold ${position.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>{position.direction}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Entry</p>
                <p className="text-sm font-bold text-white">₹{position.entry.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Qty</p>
                <p className="text-sm font-bold text-white">{position.qty}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Unrealized P&L</p>
                <p className={`text-sm font-bold ${+unrealizedPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {+unrealizedPnL >= 0 ? '+' : ''}₹{unrealizedPnL}
                </p>
              </div>
            </motion.div>
          )}
        </GlassCard>
      </div>

      {/* Trade History Panel */}
      <div className="w-[280px] border-l border-gray-800/50 bg-gray-950/50 p-4 overflow-y-auto">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Clock size={14} className="text-gray-400" /> Trade History</h3>
        {tradeHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Activity size={24} className="text-gray-700 mb-2" />
            <p className="text-xs text-gray-600">No trades yet</p>
            <p className="text-xs text-gray-700">Execute your first trade</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tradeHistory.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`p-3 rounded-xl border ${t.pnl >= 0 ? 'bg-emerald-500/8 border-emerald-500/20' : 'bg-red-500/8 border-red-500/20'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-bold ${t.direction === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>{t.direction}</span>
                  <span className={`text-xs font-black ${t.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {t.pnl >= 0 ? '+' : ''}₹{t.pnl.toFixed(0)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">Entry ₹{t.entry} → Exit ₹{t.exit}</p>
                <p className="text-xs text-gray-600 mt-0.5">Conf: {t.confidence}% · {t.qty} units</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── GAMIFICATION MODULE ──────────────────────────────────────────────────────
const GamificationModule = () => {
  const { xp, xpMax, rank, streak, longestStreak } = useStore();
  const [unlockedBadge, setUnlockedBadge] = useState(null);

  const badges = [
    { name: "First Trade", icon: "🎯", unlocked: true, desc: "Completed first simulation" },
    { name: "Streak Master", icon: "🔥", unlocked: true, desc: "7-day trading streak" },
    { name: "AI Challenger", icon: "🤖", unlocked: true, desc: "Beat AI prediction 5 times" },
    { name: "Risk Manager", icon: "🛡️", unlocked: true, desc: "0 overconfident trades in a week" },
    { name: "Bias Buster", icon: "🧠", unlocked: false, desc: "Eliminate all cognitive biases" },
    { name: "Institutional", icon: "🏛️", unlocked: false, desc: "Reach Institutional Mind rank" },
  ];

  const heatColors = ["#111827", "#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa"];

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-white mb-2">Progress & Achievements</h1>

      {/* Rank + XP */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard className="p-5 col-span-2" glow>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-600/20 border border-amber-500/30 flex items-center justify-center">
              <Trophy size={28} className="text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Current Rank</p>
              <p className="text-2xl font-black text-white">{rank}</p>
              <p className="text-xs text-amber-400 font-semibold mt-0.5">{xp.toLocaleString()} / {xpMax.toLocaleString()} XP</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-gray-500 mb-1">Next Rank</p>
              <p className="text-sm font-bold text-violet-400">Institutional Mind</p>
              <p className="text-xs text-gray-600">{(xpMax - xp).toLocaleString()} XP needed</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>XP Progress</span>
              <span>{Math.round((xp / xpMax) * 100)}%</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(xp / xpMax) * 100}%` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-amber-500 relative"
              >
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/30 rounded-full animate-pulse" />
              </motion.div>
            </div>
            <div className="flex justify-between mt-3">
              {RANKS.map((r, i) => (
                <div key={i} className="text-center">
                  <div className={`w-2.5 h-2.5 rounded-full mx-auto mb-1 ${r.name === rank ? 'ring-2 ring-offset-2 ring-offset-gray-900' : ''}`}
                    style={{ backgroundColor: r.color, boxShadow: r.name === rank ? `0 0 8px ${r.color}` : 'none' }}
                  />
                  <p className="text-xs text-gray-600" style={{ color: r.name === rank ? r.color : '#4B5563', fontSize: 9 }}>{r.name.split(' ')[0]}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        <div className="space-y-3">
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame size={18} className="text-orange-400" />
              <p className="text-sm font-bold text-white">Streak</p>
            </div>
            <p className="text-3xl font-black text-orange-400">{streak}</p>
            <p className="text-xs text-gray-500">Current days</p>
            <div className="mt-2 pt-2 border-t border-gray-800">
              <p className="text-xs text-gray-500">Longest: <span className="text-white font-bold">{longestStreak} days</span></p>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star size={18} className="text-yellow-400" />
              <p className="text-sm font-bold text-white">Monthly</p>
            </div>
            <p className="text-3xl font-black text-emerald-400">+8.4%</p>
            <p className="text-xs text-gray-500">Best month return</p>
          </GlassCard>
        </div>
      </div>

      {/* Heatmap */}
      <GlassCard className="p-5">
        <h3 className="text-sm font-bold text-white mb-4">Activity Heatmap — Last 52 Weeks</h3>
        <div className="flex gap-1 overflow-x-auto pb-2">
          {streakData.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => (
                <motion.div
                  key={di}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: (wi * 7 + di) * 0.001 }}
                  title={`${day} trades`}
                  className="w-3 h-3 rounded-sm cursor-pointer hover:ring-1 hover:ring-blue-400 hover:ring-offset-1 hover:ring-offset-gray-900"
                  style={{ backgroundColor: heatColors[day] || heatColors[0] }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-gray-600">Less</span>
          {heatColors.map((c, i) => <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />)}
          <span className="text-xs text-gray-600">More</span>
        </div>
      </GlassCard>

      {/* Monthly Performance */}
      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Monthly Returns</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={monthlyPerf} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
              <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
              <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs">
                  <p className="text-gray-400">{label}</p>
                  <p className={`font-bold ${payload[0].value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{payload[0].value}%</p>
                </div>
              ) : null} />
              <ReferenceLine y={0} stroke="#374151" />
              <Bar dataKey="return" radius={[4, 4, 0, 0]}
                fill="#3B82F6"
                label={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Badges */}
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold text-white mb-4">Achievement Badges</h3>
          <div className="grid grid-cols-3 gap-3">
            {badges.map((b, i) => (
              <motion.button
                key={i}
                onClick={() => { if (b.unlocked) { setUnlockedBadge(b); setTimeout(() => setUnlockedBadge(null), 2000); } }}
                whileHover={b.unlocked ? { scale: 1.08 } : {}}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${
                  b.unlocked
                    ? 'bg-gray-800/60 border-gray-700/50 cursor-pointer hover:border-blue-500/40'
                    : 'bg-gray-900/40 border-gray-800/30 opacity-40 cursor-not-allowed'
                }`}
              >
                <span className="text-xl">{b.icon}</span>
                <p className="text-xs font-semibold text-gray-300 text-center leading-tight">{b.name}</p>
                {!b.unlocked && <div className="text-gray-600"><EyeOff size={10} /></div>}
              </motion.button>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Badge Unlock Animation */}
      <AnimatePresence>
        {unlockedBadge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-gray-900/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-8 text-center shadow-[0_0_60px_rgba(245,158,11,0.3)]">
              <motion.span
                animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.3, 1] }}
                transition={{ duration: 0.5 }}
                className="text-5xl block mb-3"
              >{unlockedBadge.icon}</motion.span>
              <p className="text-amber-400 font-black text-lg">{unlockedBadge.name}</p>
              <p className="text-gray-400 text-sm mt-1">{unlockedBadge.desc}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── LOAD LIGHTWEIGHT CHARTS ──────────────────────────────────────────────────
const LWCLoader = ({ children }) => {
  const [loaded, setLoaded] = useState(!!window.LightweightCharts);
  useEffect(() => {
    if (window.LightweightCharts) { setLoaded(true); return; }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js";
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
  }, []);
  return loaded ? children : (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-gray-400">
        <RefreshCw size={16} className="animate-spin" />
        <span className="text-sm">Loading chart engine...</span>
      </div>
    </div>
  );
};

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const { activeModule } = useStore();

  const modules = {
    dashboard: <DashboardModule />,
    indicators: <IndicatorsModule />,
    "ai-decision": <AIDecisionModule />,
    simulation: <LWCLoader><SimulationModule /></LWCLoader>,
    gamification: <GamificationModule />,
  };

  return (
    <div className="min-h-screen bg-[#0B1220] text-white" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Background texture */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl" />
      </div>

      <TopNavbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-56px)] relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {modules[activeModule]}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AIChatbot />
      <ToastSystem />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 999px; }
        ::-webkit-scrollbar-thumb:hover { background: #4B5563; }
      `}</style>
    </div>
  );
}