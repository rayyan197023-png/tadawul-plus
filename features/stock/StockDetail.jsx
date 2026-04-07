'use client';
/**
 * STOCK DETAIL — Main Container
 * Refactored from StockDetail.jsx (5532 lines → clean architecture)
 * Tabs: Overview | Technical | Fundamental | Engines | Shareholders
 */

import { useState, useRef, useCallback } from 'react';
import { useNav }           from '../../store';
import StockHeader           from './StockHeader';
import StockOverviewTab      from './StockOverviewTab';
import StockTechnicalTab     from './StockTechnicalTab';
import StockFundamentalTab   from './StockFundamentalTab';
import StockEnginesTab       from './StockEnginesTab';
import StockShareholdersTab  from './StockShareholdersTab';
import { colors }            from '../../theme/tokens';

const C = colors;

const TABS = [
  { id: 'overview',     label: 'نظرة عامة' },
  { id: 'technical',    label: 'تقني'       },
  { id: 'fundamental',  label: 'الأساسي'    },
  { id: 'engines',      label: 'محركات'     },
  { id: 'shareholders', label: 'كبار الملاك'},
];

export default function StockDetail({ stk, onClose }) {
  const { closeStock }    = useNav();
  const [activeTab, setActiveTab] = useState('overview');
  const scrollRef  = useRef(null);
  const tabBarRef  = useRef(null);
  const swipeStart = useRef(null);

  const handleClose = useCallback(() => {
    if (onClose) onClose(); else closeStock();
  }, [onClose, closeStock]);

  const goTab = useCallback((id) => {
    if (id === activeTab) return;
    setActiveTab(id);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    const btn = tabBarRef.current?.querySelector(`[data-tab="${id}"]`);
    btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeTab]);

  const handleTouchStart = useCallback((e) => {
    let el = e.target;
    while (el && el !== e.currentTarget) {
      if (el.tagName === 'CANVAS') return;
      const ox = window.getComputedStyle(el).overflowX;
      if ((ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth) return;
      el = el.parentElement;
    }
    swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!swipeStart.current) return;
    const dx = e.changedTouches[0].clientX - swipeStart.current.x;
    const dy = Math.abs(e.changedTouches[0].clientY - swipeStart.current.y);
    swipeStart.current = null;
    if (Math.abs(dx) < 60 || dy > 40) return;
    const ids = TABS.map(t => t.id);
    const idx = ids.indexOf(activeTab);
    if (dx > 0 && idx < ids.length - 1) goTab(ids[idx + 1]);
    if (dx < 0 && idx > 0)              goTab(ids[idx - 1]);
  }, [activeTab, goTab]);

  const renderTab = () => {
    switch (activeTab) {
      case 'overview':     return <StockOverviewTab    stk={stk} />;
      case 'technical':    return <StockTechnicalTab   stk={stk} />;
      case 'fundamental':  return <StockFundamentalTab stk={stk} />;
      case 'engines':      return <StockEnginesTab      stk={stk} />;
      case 'shareholders': return <StockShareholdersTab  stk={stk} />;
      default:             return null;
    }
  };

  if (!stk) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: `linear-gradient(180deg,${C.layer2} 0%,${C.bg} 100%)`, display: 'flex', flexDirection: 'column', maxWidth: 480, margin: '0 auto', direction: 'rtl', fontFamily: "'Cairo','Segoe UI',sans-serif" }}>
      <StockHeader stk={stk} onClose={handleClose} />

      {/* Tab bar */}
      <div ref={tabBarRef} style={{ display: 'flex', overflowX: 'auto', flexShrink: 0, borderBottom: `1px solid ${C.border}55`, scrollbarWidth: 'none' }}>
        {TABS.map((tab) => {
          const isAct = activeTab === tab.id;
          return (
            <button key={tab.id} data-tab={tab.id} onClick={() => goTab(tab.id)} style={{ padding: '11px 14px', flexShrink: 0, background: isAct ? C.electric + '0a' : 'transparent', border: 'none', borderBottom: `2px solid ${isAct ? C.electric : 'transparent'}`, color: isAct ? C.electric : C.textSecondary, fontSize: 11, fontWeight: isAct ? 800 : 500, fontFamily: 'Cairo,sans-serif', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color .2s, border-color .2s', minHeight: 44 }}>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div ref={scrollRef} style={{ overflowY: 'auto', flex: 1, WebkitOverflowScrolling: 'touch' }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <div key={activeTab} style={{ animation: 'sdTabIn .22s cubic-bezier(.16,1,.3,1) both' }}>
          {renderTab()}
        </div>
      </div>

      <style>{`
        @keyframes sdTabIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sdSpin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
