'use client';
/**
 * TADAWUL NAV — شريط التنقل السفلي
 * v10 · Nav Bar Only (no demo content)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNav } from '../../store';
import { useHaptic } from '../../hooks/useHaptic';
import { Home, TrendingUp, BarChart3, PieChart, Newspaper, Sparkles, LayoutGrid } from 'lucide-react';

const C = {
  ink:      "#06080f",
  deep:     "#090c16",
  layer1:   "#16202e",
  layer3:   "#222d4a",
  ash:      "#5a6e94",
  gold:     "#f0c050",
  electric: "#4d9fff",
  plasma:   "#a78bfa",
  mint:     "#1ee68a",
  coral:    "#ff5f6a",
  amber:    "#fbbf24",
  teal:     "#22d3ee",
  rose:     "#f43f8a",
};

const TABS = [
  { id:"home",      label:"الرئيسية", Icon:Home,      accent:C.gold, glow:"rgba(240,192,80,0.4)", glowBg:"rgba(240,192,80,0.07)" },
  { id:"stocks",    label:"الأسهم",   Icon:TrendingUp, accent:C.gold, glow:"rgba(240,192,80,0.4)", glowBg:"rgba(240,192,80,0.07)" },
  { id:"analysis",  label:"التحليل",  Icon:BarChart3,  accent:C.gold, glow:"rgba(240,192,80,0.4)", glowBg:"rgba(240,192,80,0.07)" },
  { id:"portfolio", label:"المحفظة",  Icon:PieChart,   accent:C.gold, glow:"rgba(240,192,80,0.4)", glowBg:"rgba(240,192,80,0.07)" },
  { id:"news",      label:"الأخبار",  Icon:Newspaper,  accent:C.gold, glow:"rgba(240,192,80,0.4)", glowBg:"rgba(240,192,80,0.07)" },
  { id:"ai",        label:"تحليل AI", Icon:Sparkles,   accent:C.mint, glow:"rgba(30,230,138,0.4)", glowBg:"rgba(30,230,138,0.07)", isAI:true },
  { id:"more",      label:"المزيد",   Icon:LayoutGrid, accent:C.gold, glow:"rgba(240,192,80,0.4)", glowBg:"rgba(240,192,80,0.07)" },
    { id:"backtest", label:"مختبر الاستراتيجيات", Icon:LayoutGrid, accent:C.gold, glow:"rgba(240,192,80,0.4)", glowBg:"rgba(240,192,80,0.07)", hidden:true },
      { id:"rebalancing", label:"توازن المحفظة", Icon:LayoutGrid, accent:C.electric, glow:"rgba(77,159,255,0.4)", glowBg:"rgba(77,159,255,0.07)", hidden:true },
];

function useSpring(target, { stiffness = 320, damping = 28, mass = 1, onSettle } = {}) {
  const val       = useRef(target);
  const vel       = useRef(0);
  const raf       = useRef(null);
  const lastTs    = useRef(null);
  const targetRef = useRef(target);
  const settleRef = useRef(onSettle);
  const [disp, setDisp] = useState(target);

  useEffect(() => { settleRef.current = onSettle; }, [onSettle]);
  useEffect(() => { targetRef.current = target;   }, [target]);

  const tick = useRef(null);
  useEffect(() => {
    tick.current = (ts) => {
      const dt = lastTs.current
        ? Math.min((ts - lastTs.current) / 1000, 0.064)
        : 1 / 60;
      lastTs.current = ts;
      const t     = targetRef.current;
      const dx    = val.current - t;
      const force = -stiffness * dx - damping * vel.current;
      vel.current += (force / mass) * dt;
      val.current += vel.current * dt;
      const maxVel = Math.abs(t - val.current) * 60;
      if (Math.abs(vel.current) > maxVel) vel.current *= 0.85;
      if (Math.abs(val.current - t) < 0.004 && Math.abs(vel.current) < 0.004) {
        val.current = t; vel.current = 0; lastTs.current = null; raf.current = null;
        setDisp(t);
        settleRef.current?.();
        return;
      }
      setDisp(val.current);
      raf.current = requestAnimationFrame(tick.current);
    };
  }, [stiffness, damping, mass]);

  useEffect(() => {
    if (Math.abs(val.current - target) < 0.004 && Math.abs(vel.current) < 0.004) return;
    if (!raf.current) { lastTs.current = null; raf.current = requestAnimationFrame(tick.current); }
  }, [target]);

  useEffect(() => {
    raf.current = requestAnimationFrame(tick.current);
    return () => { cancelAnimationFrame(raf.current); raf.current = null; };
  }, []); // eslint-disable-line

  return disp;
}

function NavTab({ tab, isActive, onPress, tabRef }) {
  const [pressed, setPressed] = useState(false);
  const [ripples, setRipples] = useState([]);
  const ridRef   = useRef(0);
  const pressRaf = useRef(null);

  const liftTarget  = isActive ? -5    : pressed ? 1.5 : 0;
  const scaleTarget = isActive ? 1.18  : pressed ? 0.90 : 1;

  const [gpuHint, setGpuHint] = useState(false);
  const gpuSettleCount = useRef(0);

  const handleIconSettle = useCallback(() => {
    gpuSettleCount.current += 1;
    if (gpuSettleCount.current >= 2) {
      gpuSettleCount.current = 0;
      if (!isActive && !pressed) setGpuHint(false);
    }
  }, [isActive, pressed]);

  useEffect(() => {
    if (isActive || pressed) {
      gpuSettleCount.current = 0;
      setGpuHint(true);
    }
  }, [isActive, pressed]);

  const liftYTracked  = useSpring(liftTarget,  { stiffness: 390, damping: 27, onSettle: handleIconSettle });
  const scaleTracked  = useSpring(scaleTarget, { stiffness: 400, damping: 22, onSettle: handleIconSettle });

  const handlePointerDown = useCallback((e) => {
    cancelAnimationFrame(pressRaf.current);
    pressRaf.current = requestAnimationFrame(() => setPressed(true));
    const rect = e.currentTarget.getBoundingClientRect();
    const rid  = ridRef.current++;
    setRipples(r => [...r, { id: rid, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples(r => r.filter(rp => rp.id !== rid)), 700);
  }, []);

  const handlePointerUp = useCallback(() => {
    cancelAnimationFrame(pressRaf.current);
    setPressed(false);
    onPress(tab.id);
  }, [tab.id, onPress]);

  const handlePointerLeave = useCallback(() => {
    cancelAnimationFrame(pressRaf.current);
    setPressed(false);
  }, []);

  return (
    <button
      ref={tabRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      style={{
        flex: 1, minWidth: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-end",
        paddingTop: 8, paddingBottom: 12, gap: 4,
        background: "none", border: "none", cursor: "pointer",
        borderRadius: 18, position: "relative", overflow: "hidden",
        WebkitTapHighlightColor: "transparent", outline: "none",
        touchAction: "manipulation", userSelect: "none",
        willChange: gpuHint ? "transform" : "auto",
      }}
    >
      <div style={{
        position: "absolute", inset: 0, borderRadius: 18, pointerEvents: "none",
        background: isActive
          ? `radial-gradient(ellipse 90% 80% at 50% 35%, ${tab.glowBg} 0%, transparent 75%)`
          : "transparent",
        transition: "background 0.5s ease",
      }} />

      {ripples.map(r => (
        <div key={r.id} style={{
          position: "absolute",
          left: r.x - 32, top: r.y - 32, width: 64, height: 64,
          borderRadius: "50%", background: `${tab.accent}15`, pointerEvents: "none",
          animation: "rippleSpread 0.7s cubic-bezier(0.2,0.8,0.3,1) forwards",
        }} />
      ))}

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: `scale(${scaleTracked}) translateY(${liftYTracked}px)`,
        transformOrigin: "center center",
        willChange: gpuHint ? "transform" : "auto",
      }}>
        <div style={{
          position: "relative",
          width: 44, height: 40,
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 14,
          background: isActive
            ? tab.isAI
              ? "linear-gradient(150deg, rgba(30,230,138,0.22) 0%, rgba(30,230,138,0.08) 100%)"
              : `linear-gradient(150deg, ${tab.accent}28 0%, ${tab.accent}10 100%)`
            : "transparent",
          border: isActive
            ? tab.isAI
              ? "1.5px solid rgba(30,230,138,0.45)"
              : `1.5px solid ${tab.accent}35`
            : "1.5px solid transparent",
          boxShadow: isActive
            ? tab.isAI
              ? "0 6px 24px rgba(30,230,138,0.35), 0 0 0 1px rgba(30,230,138,0.1), inset 0 1px 0 rgba(30,230,138,0.2)"
              : `0 6px 24px ${tab.glow}, 0 0 0 1px ${tab.accent}10, inset 0 1px 0 ${tab.accent}25`
            : "none",
          transition: "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
          overflow: "visible",
        }}>
          <tab.Icon
            size={20}
            color={isActive
              ? tab.isAI ? C.mint : tab.accent
              : tab.isAI ? "rgba(30,230,138,0.6)" : "rgba(240,192,80,0.35)"}
            strokeWidth={tab.id === "portfolio" ? (isActive ? 2.0 : 1.6) : (isActive ? 2.1 : 1.6)}
            style={{
              display: "block",
              transition: "color 0.25s ease, stroke-width 0.25s ease",
              filter: isActive
                ? tab.isAI
                  ? "drop-shadow(0 0 6px rgba(30,230,138,0.8)) drop-shadow(0 0 12px rgba(30,230,138,0.3))"
                  : `drop-shadow(0 0 5px ${tab.glow})`
                : "none",
              animation: !isActive && tab.isAI ? "aiShimmer 2.4s ease-in-out infinite" : "none",
            }}
          />

          {tab.badge && (
            <div style={{
              position: "absolute", top: 0, left: 0, zIndex: 2,
              minWidth: 17, height: 17, borderRadius: 9,
              background: `linear-gradient(135deg, ${C.coral}, #ff3d5a)`,
              border: `2px solid ${C.ink}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 800, color: "#fff",
              boxShadow: "0 2px 8px rgba(255,95,106,0.6)",
              letterSpacing: "-0.02em", padding: "0 3px", lineHeight: 1,
              transform: `scale(${1 / Math.max(scaleTracked, 0.5)})`,
              transformOrigin: "top left",
            }}>
              {tab.badge}
            </div>
          )}
        </div>
      </div>

      <span style={{
        fontSize: isActive ? 10 : 9,
        fontWeight: isActive ? 700 : 500,
        color: isActive
          ? tab.isAI ? C.mint : tab.accent
          : tab.isAI ? "rgba(30,230,138,0.55)" : "rgba(240,192,80,0.4)",
        letterSpacing: "0.015em",
        lineHeight: 1,
        whiteSpace: "nowrap",
        fontFamily: "'Cairo', 'SF Arabic', 'Geeza Pro', 'Helvetica Neue', Tahoma, sans-serif",
        textShadow: isActive ? `0 0 10px ${tab.glow}` : "none",
        transform: isActive ? "scale(1.09)" : "scale(1)",
        transformOrigin: "center center",
        display: "block",
        willChange: gpuHint ? "transform" : "auto",
        transition: "color 0.25s ease, text-shadow 0.25s ease, transform 0.22s cubic-bezier(0.2,0,0,1)",
      }}>
        {tab.label}
      </span>
    </button>
  );
}

export default function TadawulNav() {
const { activeTab: active, setTab } = useNav();
  const haptic = useHaptic();
  const [indicatorX,      setIndicatorX]      = useState(null);
  const [indicatorReady,  setIndicatorReady]  = useState(false);
  const [indicatorGpuHint, setIndicatorGpuHint] = useState(false);
  const [indicatorAccent, setIndicatorAccent] = useState(TABS[0].accent);
  const [indicatorGlow,   setIndicatorGlow]   = useState(TABS[0].glow);
  const pendingAccent = useRef(TABS[0].accent);
  const pendingGlow   = useRef(TABS[0].glow);
  const settleGen     = useRef(0);
  const expectedGen   = useRef(0);
  const tabRefs = useRef({});
  const navRef  = useRef(null);
  const activeTab = TABS.find(t => t.id === active);

  const handleIndicatorSettle = useCallback(() => {
    if (settleGen.current !== expectedGen.current) return;
    setIndicatorAccent(pendingAccent.current);
    setIndicatorGlow(pendingGlow.current);
    setIndicatorGpuHint(false);
  }, []);

  useEffect(() => {
    const el  = tabRefs.current[active];
    const nav = navRef.current;
    if (!el || !nav) return;
    const tR = el.getBoundingClientRect();
    const nR = nav.getBoundingClientRect();
    setIndicatorX(tR.left - nR.left + tR.width / 2);
    if (!indicatorReady) setTimeout(() => setIndicatorReady(true), 30);
    settleGen.current  += 1;
    expectedGen.current = settleGen.current;
    const tab = TABS.find(t => t.id === active);
    pendingAccent.current = tab.accent;
    pendingGlow.current   = tab.glow;
    setIndicatorGpuHint(true);
  }, [active]);

  useEffect(() => {
    document.body.style.overscrollBehavior = "none";
    return () => { document.body.style.overscrollBehavior = ""; };
  }, []);

  const springX = useSpring(indicatorX ?? 0, {
    stiffness: 350, damping: 30,
    onSettle: handleIndicatorSettle,
  });

  const handlePress = useCallback((id) => {
    haptic.tap();
    setTab(id);
  }, [setTab, haptic]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Glass background */}
      <div style={{
        position: "absolute", inset: 0,
        borderRadius: "24px 24px 0 0", overflow: "hidden",
        pointerEvents: "none",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(180deg, #090c16ee 0%, #06080ff8 60%, #06080fff 100%)`,
        }} />
        <div style={{
          position: "absolute", inset: 0, opacity: 0.5,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`,
          backgroundSize: "300px 300px",
        }} />
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent 0%, ${C.gold}20 10%, ${C.gold}60 35%, ${C.gold}90 50%, ${C.gold}60 65%, ${C.gold}20 90%, transparent 100%)`,
        }} />
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 40,
          background: `linear-gradient(180deg, ${activeTab.glowBg} 0%, transparent 100%)`,
          transition: "background 0.5s ease",
        }} />
      </div>

      {/* Indicator */}
      {indicatorX !== null && (
        <div style={{
          position: "absolute", top: -1,
          left: springX,
          transform: "translateX(-50%)",
          width: 48, height: 4,
          borderRadius: "0 0 6px 6px",
          background: `linear-gradient(90deg, transparent, ${C.gold}60 20%, ${C.gold} 50%, ${C.gold}60 80%, transparent)`,
          boxShadow: `0 0 20px rgba(240,192,80,0.5), 0 0 40px rgba(240,192,80,0.15), 0 4px 8px rgba(240,192,80,0.4)`,
          opacity: indicatorReady ? 1 : 0,
          transition: "opacity 0.25s ease",
          pointerEvents: "none",
          willChange: indicatorGpuHint ? "transform" : "auto",
        }} />
      )}

      {/* Tabs */}
      <div
        ref={navRef}
        style={{
          position: "relative", display: "flex",
          padding: "4px 0 max(16px, env(safe-area-inset-bottom, 16px))",
          direction: "rtl",
        }}
      >
        {TABS.filter(t => !t.hidden).map(tab => (
          <NavTab
            key={tab.id}
            tab={tab}
            isActive={active === tab.id}
            onPress={handlePress}
            tabRef={el => { tabRefs.current[tab.id] = el; }}
          />
        ))}
      </div>

      <style>{`
        @keyframes rippleSpread {
          0%   { transform: scale(0.2); opacity: 1; }
          100% { transform: scale(4);   opacity: 0; }
        }
        @keyframes aiShimmer {
          0%   { opacity: 0.7; }
          50%  { opacity: 1;   }
          100% { opacity: 0.7; }
        }
        *, *::before, *::after { box-sizing: border-box; }
        html, body { overscroll-behavior: none; }
        button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
      `}</style>
    </div>
  );
}
