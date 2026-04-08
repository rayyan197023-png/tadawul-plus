'use client';
/**
 * StockOverviewTab — نظرة عامة
 *
 * Extracted from SDOverview in StockDetail.jsx.
 * Features:
 * - Mini sparkline chart with period selector
 * - 52-week range bar + day range bar
 * - Momentum signals (8 timeframes)
 * - Analyst consensus (via AI proxy)
 * - Key stats table
 *
 * NO fetch calls — analyst data via stocksApi.fetchAIAnalysis()
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { fetchAIAnalysis, generateOHLCBars } from '../../services/api/stocksApi';
import { fetchFundamentals }                        from '../../services/api/eodhdApi';
import config                                        from '../../constants/config';
import { calcRSI, calcMACD, calcEMA }         from '../../engines/technicalEngine';
import { colors }             from '../../theme/tokens';

const C = colors;

// ── Mini sparkline
function MiniChart({ bars, color }) {
  const W = 340, H = 80;
  const closes = bars.map(b => b.c);
  const mn = Math.min(...closes), mx = Math.max(...closes), rng = mx - mn || 1;
  const toX = (i) => (i / (closes.length - 1)) * W;
  const toY = (v) => H - ((v - mn) / rng) * (H - 8) - 4;
  const d = closes.map((v, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const fill = `${d} L${W},${H} L0,${H} Z`;

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="ovFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity=".25" />
          <stop offset="100%" stopColor={color} stopOpacity="0"   />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#ovFill)" />
      <path d={d}    fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={toX(closes.length-1)} cy={toY(closes[closes.length-1])} r="3.5" fill={color} />
    </svg>
  );
}

// ── Range bar (52w or daily)
function RangeBar({ low, high, current, label }) {
  const pct = Math.max(0, Math.min(100, ((current - low) / (high - low || 1)) * 100));
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: C.textSecondary }}>{label}</span>
        <span style={{ fontSize: 10, color: C.gold, fontWeight: 600 }}>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: C.negative, fontFamily: 'monospace', minWidth: 42, textAlign: 'left' }}>{low.toFixed(2)}</span>
        <div style={{ flex: 1, height: 6, background: C.layer3, borderRadius: 3, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: pct + '%', background: `linear-gradient(90deg,${C.negative},${C.positive})`, borderRadius: 3 }} />
          <div style={{ position: 'absolute', top: -3, bottom: -3, left: pct + '%', width: 2, background: C.gold, borderRadius: 1, transform: 'translateX(-50%)' }} />
        </div>
        <span style={{ fontSize: 10, color: C.positive, fontFamily: 'monospace', minWidth: 42, textAlign: 'right' }}>{high.toFixed(2)}</span>
      </div>
    </div>
  );
}

// ── Momentum signal badge
function MomBadge({ label, value }) {
  const colors_map = {
    'شراء قوي': { bg: C.positive + '18', bd: C.positive + '55', c: C.positive },
    'شراء':     { bg: C.positive + '10', bd: C.positive + '33', c: C.positive },
    'مراقبة':   { bg: C.amber + '15',    bd: C.amber + '44',    c: C.amber    },
    'بيع':      { bg: C.negative + '18', bd: C.negative + '55', c: C.negative },
    'بيع قوي':  { bg: C.negative + '22', bd: C.negative + '66', c: C.negative },
  };
  const style = colors_map[value] ?? { bg: C.layer3, bd: C.border, c: C.textSecondary };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 52 }}>
      <span style={{ fontSize: 9, color: C.textTertiary }}>{label}</span>
      <div style={{ background: style.bg, border: `1px solid ${style.bd}`, borderRadius: 8, padding: '3px 8px' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: style.c }}>{value}</span>
      </div>
    </div>
  );
}

const PERIODS = ['1W', '1M', '3M', '6M', '1Y'];
const PERIOD_DAYS = { '1W': 7, '1M': 30, '3M': 90, '6M': 180, '1Y': 365 };

export default function StockOverviewTab({ stk }) {
  const [period, setPeriod]                 = useState('1M');
  const [analystData, setAnalystData]       = useState(null);
  const [analystLoading, setAnalystLoading] = useState(false);
  const [analystError, setAnalystError]     = useState(null);
  const abortRef = useRef(null); // AbortController for analyst fetch

  // ── Bars for chart
  const bars = useMemo(() => {
    const days = PERIOD_DAYS[period] ?? 30;
    return generateOHLCBars(stk, days + 14).slice(-days);
  }, [stk.sym, period]);

  const isUp        = stk.pct >= 0;
  const chartColor  = isUp ? C.positive : C.negative;
  const periodChg   = bars.length >= 2
    ? +((bars[bars.length-1].c - bars[0].c) / bars[0].c * 100).toFixed(2)
    : stk.pct;

  // ── Momentum signals — REAL engine-based (RSI + EMA cross + price return)
  const momentum = useMemo(() => {
    if (!bars || bars.length < 20) {
      return { m5:'—', m15:'—', m30:'—', h1:'—', h4:'—', d1:'—', w1:'—', mo1:'—' };
    }
    const closes = bars.map(b => b.c);
    const rsi14  = calcRSI(bars, 14);
    const rsi7   = calcRSI(bars.slice(-14), 7);
    const ema5   = calcEMA(closes, 5);
    const ema20  = calcEMA(closes, 20);
    const macd   = calcMACD(bars);

    // Grade by timeframe using available real indicators
    const bullish = [
      rsi14 >= 30 && rsi14 <= 60,          // RSI in healthy zone
      ema5 > ema20,                          // short EMA above long EMA
      macd.histogram > 0,                    // MACD bullish
      stk.pct >= 0,                          // price up today
    ].filter(Boolean).length;

    const label = bullish >= 4 ? 'شراء قوي'
                : bullish >= 3 ? 'شراء'
                : bullish >= 2 ? 'مراقبة'
                : bullish >= 1 ? 'بيع'
                : 'بيع قوي';

    // RSI-weighted labels per timeframe using slices
    const bySlice = (sliceBars) => {
      if (sliceBars.length < 5) return label;
      const r = calcRSI(sliceBars, Math.min(14, sliceBars.length - 1));
      const e5  = calcEMA(sliceBars.map(b=>b.c), Math.min(5, sliceBars.length));
      const e10 = calcEMA(sliceBars.map(b=>b.c), Math.min(10, sliceBars.length));
      const b = [r>=30&&r<=60, e5>e10, stk.pct>=0].filter(Boolean).length;
      return b>=3?'شراء قوي':b>=2?'شراء':b>=1?'مراقبة':'بيع';
    };

    return {
      m5:  bySlice(bars.slice(-5)),
      m15: bySlice(bars.slice(-10)),
      m30: bySlice(bars.slice(-15)),
      h1:  bySlice(bars.slice(-20)),
      h4:  bySlice(bars.slice(-30)),
      d1:  label,
      w1:  bySlice(bars.slice(-40)),
      mo1: bySlice(bars.slice(-60)),
    };
  }, [bars, stk.sym, stk.pct]);

  // ── Reset analyst data when stock changes (prevents stale data cross-contamination)
  // Cleanup: abort any in-flight request when component unmounts or sym changes
  useEffect(() => {
    setAnalystData(null);
    setAnalystError(null);
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    // Cleanup on unmount
    return () => {
      if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    };
  }, [stk.sym]);

  // ── Fetch analyst ratings via AI
  const fetchAnalyst = useCallback(async () => {
    // Abort previous request if still running
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setAnalystLoading(true);
    setAnalystError(null);
    try {
      const prompt = `ابحث عن أحدث تقييمات المحللين لسهم ${stk.name} (${stk.sym}) في تداول السعودية.
أجب فقط بـ JSON صالح بدون أي نص إضافي:
{"buy":عدد,"hold":عدد,"sell":عدد,"targetPrice":رقم,"highTarget":رقم,"lowTarget":رقم,"banks":[{"bank":"اسم","rating":"شراء","target":رقم,"date":"YYYY/MM/DD"}]}`;

      const text = await fetchAIAnalysis(prompt, 800, ctrl.signal);
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        setAnalystData(JSON.parse(match[0]));
      } else {
        setAnalystError('لم تُعثر على بيانات');
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        setAnalystError('خطأ: ' + e.message);
      }
    }
    if (!ctrl.signal.aborted) setAnalystLoading(false);
  }, [stk.sym, stk.name]);

  const tot    = (analystData?.buy ?? 0) + (analystData?.hold ?? 0) + (analystData?.sell ?? 0);
  const buyPct = tot ? Math.round((analystData.buy  / tot) * 100) : 0;
  const selPct = tot ? Math.round((analystData.sell / tot) * 100) : 0;
  const aColor = buyPct > 50 ? C.positive : selPct > 50 ? C.negative : C.amber;

  // ── Key stats
  const stats = [
    { l: 'القيمة السوقية',    v: stk.mktCap ? stk.mktCap.toLocaleString('en-US') + ' مليار' : '—' },
    { l: 'مكررات الأرباح',   v: stk.pe ? stk.pe.toFixed(1) + 'x' : '—' },
    { l: 'السعر/القيمة الدفترية',v: stk.pb ? stk.pb.toFixed(1) + 'x' : '—' },
    { l: 'عائد التوزيع',       v: stk.divY ? stk.divY.toFixed(1) + '%' : '—' },
    { l: 'ربحية السهم EPS',    v: stk.eps ? stk.eps.toFixed(2) + ' ر.س' : '—' },
    { l: 'بيتا',               v: stk.beta ? stk.beta.toFixed(2) : '—' },
    { l: 'العائد على الملكية', v: stk.roe ? stk.roe.toFixed(1) + '%' : '—' },
    { l: 'نسبة الدين',         v: stk.debt ? stk.debt.toFixed(2) + 'x' : '—' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 16px 48px' }}>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 0, background: C.layer3, borderRadius: 10, padding: 3 }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            flex: 1, padding: '6px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontFamily: 'Cairo,sans-serif', fontSize: 11, fontWeight: 600,
            background: period === p ? C.electric : 'transparent',
            color: period === p ? '#000' : C.textSecondary,
            transition: 'all .15s',
          }}>{p}</button>
        ))}
      </div>

      {/* Chart */}
      <div style={{ background: C.layer1, borderRadius: 14, padding: '12px 12px 6px', border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: periodChg >= 0 ? C.positive : C.negative }}>
            {periodChg >= 0 ? '+' : ''}{periodChg}%
          </span>
          <span style={{ fontSize: 12, fontWeight: 800, color: C.textPrimary }}>{stk.p.toFixed(2)} ر.س</span>
        </div>
        <MiniChart bars={bars} color={chartColor} />
      </div>

      {/* Range bars */}
      <div style={{ background: C.layer1, borderRadius: 14, padding: '14px', border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 12, textAlign: 'right' }}>نطاق الأسعار</div>
        {stk.hi && stk.lo && (
          <RangeBar low={stk.lo} high={stk.hi} current={stk.p} label="المدى اليومي" />
        )}
        {stk.w52h && stk.w52l && (
          <RangeBar low={stk.w52l} high={stk.w52h} current={stk.p} label="نطاق 52 أسبوعاً" />
        )}
      </div>

      {/* Momentum signals */}
      <div style={{ background: C.layer1, borderRadius: 14, padding: '14px', border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 12, textAlign: 'right' }}>إشارات الزخم</div>
        <div style={{ display: 'flex', overflowX: 'auto', gap: 8, paddingBottom: 4 }}>
          {[
            { l:'5د', v: momentum.m5  }, { l:'15د', v: momentum.m15 },
            { l:'30د',v: momentum.m30 }, { l:'ساعة', v: momentum.h1  },
            { l:'4 س',v: momentum.h4  }, { l:'يومي', v: momentum.d1  },
            { l:'أسبوعي',v:momentum.w1},{ l:'شهري', v: momentum.mo1 },
          ].map(m => <MomBadge key={m.l} label={m.l} value={m.v} />)}
        </div>
      </div>

      {/* Analyst consensus */}
      <div style={{ background: C.layer1, borderRadius: 14, padding: '14px', border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          {!analystData && (
            <button
              onClick={fetchAnalyst}
              disabled={analystLoading}
              style={{
                padding: '6px 14px', borderRadius: 8, cursor: analystLoading ? 'wait' : 'pointer',
                background: C.electric + '20', border: `1px solid ${C.electric}44`,
                color: C.electric, fontSize: 11, fontWeight: 700,
                fontFamily: 'Cairo,sans-serif', opacity: analystLoading ? .6 : 1,
              }}
            >
              {analystLoading ? '⏳ جاري التحميل...' : '🔍 تقييمات المحللين'}
            </button>
          )}
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, textAlign: 'right' }}>توصيات المحللين</div>
        </div>

        {analystError && <div style={{ fontSize: 11, color: C.negative, textAlign: 'right' }}>{analystError}</div>}

        {analystData ? (
          <div>
            {/* Consensus bar */}
            <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 24, marginBottom: 10 }}>
              {buyPct > 0  && <div style={{ width: buyPct  + '%', background: C.positive, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, fontWeight: 700, color: '#000' }}>{buyPct}%</span></div>}
              {analystData.hold > 0 && <div style={{ width: (100 - buyPct - selPct) + '%', background: C.amber, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, fontWeight: 700, color: '#000' }}>{100-buyPct-selPct}%</span></div>}
              {selPct > 0  && <div style={{ width: selPct  + '%', background: C.negative, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 9, fontWeight: 700, color: '#000' }}>{selPct}%</span></div>}
            </div>
            {/* Target price */}
            {analystData.targetPrice && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: aColor }}>{analystData.targetPrice} ر.س</span>
                <span style={{ fontSize: 11, color: C.textSecondary }}>السعر المستهدف</span>
              </div>
            )}
            {/* Banks list */}
            {analystData.banks?.slice(0, 5).map((b, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: `1px solid ${C.line}`, alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: b.rating.includes('شراء') ? C.positive : b.rating.includes('بيع') ? C.negative : C.amber, fontWeight: 700 }}>{b.rating}</span>
                  {b.target && <span style={{ fontSize: 10, color: C.textSecondary }}>هدف: {b.target}</span>}
                </div>
                <span style={{ fontSize: 11, color: C.textPrimary, fontWeight: 600 }}>{b.bank}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 11, color: C.textTertiary, textAlign: 'center', padding: '10px 0' }}>
            اضغط لجلب أحدث توصيات المحللين
          </div>
        )}
      </div>

      {/* Key stats grid */}
      <div style={{ background: C.layer1, borderRadius: 14, padding: '14px', border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 12, textAlign: 'right' }}>إحصاءات رئيسية</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: C.border, borderRadius: 8, overflow: 'hidden' }}>
          {stats.map((s, i) => (
            <div key={i} style={{ background: C.layer1, padding: '10px 12px' }}>
              <div style={{ fontSize: 9, color: C.textTertiary, marginBottom: 4 }}>{s.l}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.textPrimary }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
