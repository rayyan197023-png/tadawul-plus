'use client';
/**
 * TADAWUL NAV
 *
 * Bottom navigation bar — connected to navStore.
 * Spring animation preserved exactly from TadawulNav_v9.jsx.
 * Icons: lucide-react (same as original).
 *
 * Changes from original:
 * - State lifted to navStore (no local useState for active tab)
 * - TABS imported from constants/navigation.js
 * - useSpring imported from hooks/useSpring.js
 * - Icons injected via TABS definition (see below)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Home, TrendingUp, BarChart3, PieChart,
  Newspaper, Sparkles, LayoutGrid,
} from 'lucide-react';

import { useSpring }  from '../../hooks/useSpring';
import { useNav }     from '../../store';
import { TABS }       from '../../constants/navigation';

// Attach icons to tabs (icons can't be serialized in constants)
const ICON_MAP = {
  home:      Home,
  stocks:    TrendingUp,
  analysis:  BarChart3,
  portfolio: PieChart,
  news:      Newspaper,
  ai:        Sparkles,
  more:      LayoutGrid,
};

const TABS_WITH_ICONS = TABS.map(t => ({ ...t, Icon: ICON_MAP[t.id] }));

// ── Color palette (matches tokens.js)
const C = {
  ink:    '#06080f',
  deep:   '#090c16',
  layer1: '#16202e',
  layer3: '#222d4a',
  gold:   '#f0c050',
  mint:   '#1ee68a',
  coral:  '#ff5f6a',
  ash:    '#5a6e94',
};

/* ══════════════════════════════════════════════
   NavTab — individual tab button
   Spring physics: scale + liftY + ripple + GPU hint
══════════════════════════════════════════════ */
function NavTab({ tab, isActive, onPress, tabRef }) {
  const [pressed, setPressed]   = useState(false);
  const [ripples, setRipples]   = useState([]);
  const ridRef   = useRef(0);
  const pressRaf = useRef(null);

  const liftTarget  = isActive ? -5   : pressed ? 1.5 : 0;
  const scaleTarget = isActive ? 1.18 : pressed ? 0.90 : 1;

  const [gpuHint, setGpuHint]   = useState(false);
  const gpuSettleCount          = useRef(0);

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

  const renderLift  = useSpring(liftTarget,  { stiffness: 390, damping: 27, onSettle: handleIconSettle });
  const renderScale = useSpring(scaleTarget, { stiffness: 400, damping: 22, onSettle: handleIconSettle });

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
    if (navigator.vibrate) navigator.vibrate(6);
  }, [tab.id, onPress]);

  const handlePointerLeave = useCallback(() => {
    cancelAnimationFrame(pressRaf.current);
    setPressed(false);
  }, []);

  const { Icon } = tab;

  return (
    <button
      ref={tabRef}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      style={{
        flex: 1, minWidth: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'flex-end',
        paddingTop: 8, paddingBottom: 12, gap: 4,
        background: 'none', border: 'none', cursor: 'pointer',
        borderRadius: 18, position: 'relative', overflow: 'hidden',
        WebkitTapHighlightColor: 'transparent', outline: 'none',
        touchAction: 'manipulation', userSelect: 'none',
        willChange: gpuHint ? 'transform' : 'auto',
      }}
    >
      {/* Ambient glow bg */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 18, pointerEvents: 'none',
        background: isActive
          ? `radial-gradient(ellipse 90% 80% at 50% 35%, ${tab.glowBg} 0%, transparent 75%)`
          : 'transparent',
        transition: 'background 0.5s ease',
      }} />

      {/* Ripples */}
      {ripples.map(r => (
        <div key={r.id} style={{
          position: 'absolute',
          left: r.x - 32, top: r.y - 32, width: 64, height: 64,
          borderRadius: '50%',
          background: `${tab.accent}15`,
          pointerEvents: 'none',
          animation: 'navRipple 0.7s cubic-bezier(0.2,0.8,0.3,1) forwards',
        }} />
      ))}

      {/* Icon container */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transform: `scale(${renderScale}) translateY(${renderLift}px)`,
        transformOrigin: 'center center',
        willChange: gpuHint ? 'transform' : 'auto',
      }}>
        <div style={{
          position: 'relative',
          width: 44, height: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 14,
          background: isActive
            ? tab.isAI
              ? 'linear-gradient(150deg, rgba(30,230,138,0.22) 0%, rgba(30,230,138,0.08) 100%)'
              : `linear-gradient(150deg, ${tab.accent}28 0%, ${tab.accent}10 100%)`
            : 'transparent',
          border: isActive
            ? tab.isAI
              ? '1.5px solid rgba(30,230,138,0.45)'
              : `1.5px solid ${tab.accent}35`
            : '1.5px solid transparent',
          boxShadow: isActive
            ? tab.isAI
              ? '0 6px 24px rgba(30,230,138,0.35), 0 0 0 1px rgba(30,230,138,0.1), inset 0 1px 0 rgba(30,230,138,0.2)'
              : `0 6px 24px ${tab.glow}, 0 0 0 1px ${tab.accent}10, inset 0 1px 0 ${tab.accent}25`
            : 'none',
          transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
        }}>
          <Icon
            size={20}
            color={isActive
              ? tab.isAI ? C.mint : tab.accent
              : tab.isAI ? 'rgba(30,230,138,0.6)' : 'rgba(240,192,80,0.35)'}
            strokeWidth={tab.id === 'portfolio' ? (isActive ? 2.0 : 1.6) : (isActive ? 2.1 : 1.6)}
            style={{
              display: 'block',
              transition: 'color 0.25s ease',
              filter: isActive
                ? tab.isAI
                  ? 'drop-shadow(0 0 6px rgba(30,230,138,0.8)) drop-shadow(0 0 12px rgba(30,230,138,0.3))'
                  : `drop-shadow(0 0 5px ${tab.glow})`
                : 'none',
              animation: !isActive && tab.isAI ? 'aiNavShimmer 2.4s ease-in-out infinite' : 'none',
            }}
          />

          {/* Badge */}
          {tab.badge && (
            <div style={{
              position: 'absolute', top: 0, left: 0, zIndex: 2,
              minWidth: 17, height: 17, borderRadius: 9,
              background: `linear-gradient(135deg, ${C.coral}, #ff3d5a)`,
              border: `2px solid ${C.ink}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 800, color: '#fff',
              boxShadow: '0 2px 8px rgba(255,95,106,0.6)',
              letterSpacing: '-0.02em', padding: '0 3px', lineHeight: 1,
              transform: `scale(${1 / Math.max(renderScale, 0.5)})`,
              transformOrigin: 'top left',
            }}>
              {tab.badge}
            </div>
          )}
        </div>
      </div>

      {/* Label */}
      <span style={{
        fontSize: isActive ? 10 : 9,
        fontWeight: isActive ? 700 : 500,
        color: isActive
          ? tab.isAI ? C.mint : tab.accent
          : tab.isAI ? 'rgba(30,230,138,0.55)' : 'rgba(240,192,80,0.4)',
        letterSpacing: '0.015em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
        fontFamily: "'SF Arabic','Geeza Pro','Helvetica Neue',Tahoma,sans-serif",
        textShadow: isActive ? `0 0 10px ${tab.glow}` : 'none',
        transform: isActive ? 'scale(1.09)' : 'scale(1)',
        transformOrigin: 'center center',
        display: 'block',
        willChange: gpuHint ? 'transform' : 'auto',
        transition: 'color 0.25s ease, text-shadow 0.25s ease, transform 0.22s cubic-bezier(0.2,0,0,1)',
      }}>
        {tab.label}
      </span>
    </button>
  );
}

/* ══════════════════════════════════════════════
   TadawulNav — main export
   Connected to navStore via useNav()
══════════════════════════════════════════════ */
export default function TadawulNav() {
  const { activeTab: active, setTab } = useNav();

  const [indicatorX,       setIndicatorX]       = useState(null);
  const [indicatorReady,   setIndicatorReady]   = useState(false);
  const [indicatorGpuHint, setIndicatorGpuHint] = useState(false);
  const [indicatorAccent,  setIndicatorAccent]  = useState(TABS_WITH_ICONS[0].accent);
  const [indicatorGlow,    setIndicatorGlow]    = useState(TABS_WITH_ICONS[0].glow);

  const pendingAccent = useRef(TABS_WITH_ICONS[0].accent);
  const pendingGlow   = useRef(TABS_WITH_ICONS[0].glow);
  const settleGen     = useRef(0);
  const expectedGen   = useRef(0);
  const tabRefs       = useRef({});
  const navRef        = useRef(null);

  const activeTabDef = TABS_WITH_ICONS.find(t => t.id === active) ?? TABS_WITH_ICONS[0];

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
    settleGen.current   += 1;
    expectedGen.current  = settleGen.current;
    const tab = TABS_WITH_ICONS.find(t => t.id === active);
    pendingAccent.current = tab.accent;
    pendingGlow.current   = tab.glow;
    setIndicatorGpuHint(true);
  }, [active]);

  const springX    = useSpring(indicatorX ?? 0, {
    stiffness: 350, damping: 30,
    onSettle: handleIndicatorSettle,
  });

  const handlePress = useCallback((id) => setTab(id), [setTab]);

  return (
    <div
      ref={navRef}
      style={{
        position: 'relative',
        display: 'flex',
        padding: '4px 0 max(16px, env(safe-area-inset-bottom, 16px))',
      }}
    >
      {/* Gold indicator */}
      {indicatorX !== null && (
        <div style={{
          position: 'absolute', top: -1,
          left: springX,
          transform: 'translateX(-50%)',
          width: 48, height: 4,
          borderRadius: '0 0 6px 6px',
          background: `linear-gradient(90deg, transparent, ${C.gold}60 20%, ${C.gold} 50%, ${C.gold}60 80%, transparent)`,
          boxShadow: `0 0 20px rgba(240,192,80,0.5), 0 0 40px rgba(240,192,80,0.15), 0 4px 8px rgba(240,192,80,0.4)`,
          transition: 'opacity 0.25s ease',
          opacity: indicatorReady ? 1 : 0,
          pointerEvents: 'none',
          willChange: indicatorGpuHint ? 'transform' : 'auto',
        }} />
      )}

      {TABS_WITH_ICONS.map(tab => (
        <NavTab
          key={tab.id}
          tab={tab}
          isActive={active === tab.id}
          onPress={handlePress}
          tabRef={el => { tabRefs.current[tab.id] = el; }}
        />
      ))}

      <style>{`
        @keyframes navRipple {
          0%   { transform: scale(0.2); opacity: 1; }
          100% { transform: scale(4);   opacity: 0; }
        }
        @keyframes aiNavShimmer {
          0%,100% { opacity: 0.7; }
          50%      { opacity: 1;   }
        }
      `}</style>
    </div>
  );
}

// Export activeTabDef helper for AppShell
export { TABS_WITH_ICONS };
