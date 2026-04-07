'use client';
/**
 * MORE SCREEN — المزيد
 * Refactored from tadawul-more-tab.jsx (3064 lines)
 * Features: Rankings, Dividends, IPOs, Calendar, Settings
 */

import { useState } from 'react';
import { useStocks } from '../store';
import { useNav }    from '../store';
import { SECTORS }   from '../constants/stocksData';
import { colors }    from '../theme/tokens';

const C = colors;

const TABS = [
  { id: 'rankings',  label: 'الترتيب'   },
  { id: 'dividends', label: 'التوزيعات' },
  { id: 'ipos',      label: 'الاكتتابات'},
  { id: 'calendar',  label: 'التقويم'   },
  { id: 'settings',  label: 'الإعدادات' },
];

// ── Rankings Tab
function RankingsTab() {
  const { stocks } = useStocks();
  const { openStock } = useNav();
  const [sortBy, setSortBy] = useState('pct');

  const SORTS = [
    { k:'pct',   l:'الأداء'   },
    { k:'vol',   l:'الحجم'    },
    { k:'pe',    l:'P/E'      },
    { k:'divY',  l:'التوزيعات'},
    { k:'roe',   l:'ROE'      },
  ];

  const sorted = [...stocks].sort((a, b) => {
    switch (sortBy) {
      case 'pct':  return b.pct - a.pct;
      case 'vol':  return b.v   - a.v;
      case 'pe':   return (a.pe ?? 999) - (b.pe ?? 999);
      case 'divY': return (b.divY ?? 0) - (a.divY ?? 0);
      case 'roe':  return (b.roe ?? 0) - (a.roe ?? 0);
      default:     return b.pct - a.pct;
    }
  });

  return (
    <div>
      <div style={{ display: 'flex', overflowX: 'auto', gap: 6, padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>
        {SORTS.map(s => (
          <button key={s.k} onClick={() => setSortBy(s.k)} style={{ flexShrink: 0, padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'Cairo,sans-serif', fontSize: 11, fontWeight: 600, background: sortBy === s.k ? C.gold : C.layer2, color: sortBy === s.k ? '#000' : C.textSecondary }}>
            {s.l}
          </button>
        ))}
      </div>
      <div style={{ padding: '8px 12px' }}>
        {sorted.map((s, i) => {
          const val = sortBy === 'pct' ? s.pct.toFixed(2) + '%'
                    : sortBy === 'vol' ? (s.v / 1e6).toFixed(1) + 'M'
                    : sortBy === 'pe'  ? (s.pe  ?? '—') + 'x'
                    : sortBy === 'divY'? (s.divY ?? '—') + '%'
                    : (s.roe  ?? '—') + '%';
          const color = sortBy === 'pct' ? (s.pct >= 0 ? C.positive : C.negative) : C.gold;
          return (
            <div key={s.sym} onClick={() => openStock(s, 'more')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.line}`, cursor: 'pointer' }}>
              <span style={{ fontSize: 11, color: C.textTertiary, width: 20, flexShrink: 0 }}>{i + 1}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{s.name}</div>
                <div style={{ fontSize: 10, color: C.textTertiary }}>{s.sec}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color }}>{val}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Dividends Tab
function DividendsTab() {
  const { stocks } = useStocks();
  const divStocks = stocks.filter(s => s.divY && s.divY > 0).sort((a, b) => b.divY - a.divY);

  return (
    <div style={{ padding: '8px 12px' }}>
      <div style={{ background: C.layer1, borderRadius: 12, padding: '12px', border: `1px solid ${C.border}`, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: C.textSecondary, textAlign: 'center', lineHeight: 1.6 }}>
          أعلى الأسهم عائداً من التوزيعات في السوق السعودي
        </div>
      </div>
      {divStocks.map((s, i) => (
        <div key={s.sym} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.line}` }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.layer3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 900, color: C.gold }}>{i + 1}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{s.name}</div>
            <div style={{ fontSize: 10, color: C.textTertiary }}>{s.sec} · {s.sym}</div>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: C.positive }}>{s.divY.toFixed(1)}%</div>
            <div style={{ fontSize: 9, color: C.textTertiary }}>عائد توزيع</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── IPOs Tab
function IPOsTab() {
  const IPOS = [
    { name:'شركة نيوم للتقنية',     sec:'تقنية',         price:120, status:'قريباً', subPct:185, target:145, duration:'15–25 مارس 2026' },
    { name:'المملكة القابضة',        sec:'استثمار',       price:45,  status:'قريباً', subPct:140, target:50,  duration:'5–15 أبريل 2026' },
    { name:'الرياض للنقل',           sec:'نقل',           price:55,  status:'قريباً', subPct:null,target:68,  duration:'10–20 مايو 2026'  },
    { name:'دار الأركان',            sec:'عقارات',        price:18,  status:'مكتمل',  subPct:320, target:22,  duration:'1–10 مارس 2026'   },
    { name:'الخليج للبتروكيماويات', sec:'بتروكيم',       price:28,  status:'مكتمل',  subPct:210, target:26,  duration:'5–14 يناير 2026'  },
  ];

  return (
    <div style={{ padding: '8px 12px' }}>
      {IPOS.map((ipo, i) => {
        const isOpen = ipo.status === 'قريباً';
        const color  = isOpen ? C.positive : C.textSecondary;
        return (
          <div key={i} style={{ background: C.layer1, borderRadius: 14, padding: '14px', marginBottom: 8, border: `1px solid ${isOpen ? C.positive + '22' : C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{ background: color + '15', borderRadius: 6, padding: '2px 8px', border: `1px solid ${color}30` }}>
                <span style={{ fontSize: 10, fontWeight: 700, color }}>{ipo.status}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.textPrimary }}>{ipo.name}</div>
                <div style={{ fontSize: 10, color: C.textTertiary }}>{ipo.sec} · {ipo.duration}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              {[
                { l:'سعر الطرح', v: ipo.price + ' ر.س' },
                { l:'السعر المستهدف', v: ipo.target ? ipo.target + ' ر.س' : '—' },
                { l:'الاكتتاب', v: ipo.subPct ? ipo.subPct + '%' : '—' },
              ].map((s, j) => (
                <div key={j} style={{ background: C.layer3, borderRadius: 8, padding: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: C.textTertiary, marginBottom: 2 }}>{s.l}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textPrimary }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Calendar Tab
function CalendarTab() {
  const { stocks } = useStocks();
  const events = stocks.filter(s => s.earnDate).map(s => ({ sym: s.sym, name: s.name, date: s.earnDate, type: 'أرباح' }));

  return (
    <div style={{ padding: '8px 12px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 12, textAlign: 'right' }}>المواعيد القادمة</div>
      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: C.textTertiary }}>لا توجد مواعيد</div>
      ) : events.map((ev, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.line}` }}>
          <div style={{ background: C.gold + '15', borderRadius: 8, padding: '4px 10px', flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: C.gold }}>{ev.type}</span>
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{ev.name}</div>
            <div style={{ fontSize: 10, color: C.textTertiary }}>{ev.date}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Settings Tab
function SettingsTab() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode,      setDarkMode]      = useState(true);

  const items = [
    { l:'الإشعارات',    sub:'تنبيهات الأسعار والأخبار', val:notifications, set:setNotifications },
    { l:'الوضع الليلي', sub:'مظهر التطبيق الداكن',      val:darkMode,      set:setDarkMode },
  ];

  return (
    <div style={{ padding: '14px 12px' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: `1px solid ${C.border}` }}>
          <div onClick={() => item.set(v => !v)} style={{
            width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
            background: item.val ? C.positive : C.layer3,
            position: 'relative', transition: 'background .2s',
          }}>
            <div style={{ position: 'absolute', top: 3, left: item.val ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.3)' }} />
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{item.l}</div>
            <div style={{ fontSize: 10, color: C.textTertiary }}>{item.sub}</div>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 20, background: C.layer1, borderRadius: 12, padding: '14px', border: `1px solid ${C.border}`, textAlign: 'center' }}>
        <div style={{ fontSize: 20, marginBottom: 8 }}>📊</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: C.gold, marginBottom: 4 }}>تداول+ v2.0</div>
        <div style={{ fontSize: 11, color: C.textSecondary }}>منصة تحليل السوق السعودي</div>
        <div style={{ fontSize: 10, color: C.textTertiary, marginTop: 4 }}>مدعوم بـ Claude AI · Supabase</div>
      </div>
    </div>
  );
}

export default function MoreScreen() {
  const [activeTab, setActiveTab] = useState('rankings');

  const renderTab = () => {
    switch (activeTab) {
      case 'rankings':  return <RankingsTab />;
      case 'dividends': return <DividendsTab />;
      case 'ipos':      return <IPOsTab />;
      case 'calendar':  return <CalendarTab />;
      case 'settings':  return <SettingsTab />;
      default:          return null;
    }
  };

  return (
    <div style={{ fontFamily: "'Cairo','Segoe UI',sans-serif", direction: 'rtl', color: C.textPrimary }}>
      {/* Header */}
      <div style={{ padding: '12px 14px 0', position: 'sticky', top: 0, background: C.bg, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 10 }}>
          <div style={{ width: 3, height: 18, background: C.gold, borderRadius: 2 }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: C.textPrimary }}>المزيد</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', overflowX: 'auto', borderBottom: `1px solid ${C.border}`, scrollbarWidth: 'none' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ flexShrink: 0, padding: '10px 14px', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === t.id ? C.gold : 'transparent'}`, color: activeTab === t.id ? C.gold : C.textSecondary, fontFamily: 'Cairo,sans-serif', fontSize: 11, fontWeight: activeTab === t.id ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all .15s', minHeight: 44 }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {renderTab()}
    </div>
  );
}
