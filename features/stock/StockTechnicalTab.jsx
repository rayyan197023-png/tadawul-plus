'use client';
/**
 * StockTechnicalTab — تحليل تقني
 *
 * All calculations from technicalEngine.js — NO inline math.
 * Displays: MAs, RSI, MACD, Bollinger, Market Structure, IVWAP
 */

import { useMemo }            from 'react';
import { generateOHLCBars }   from '../../services/api/stocksApi';
import {
  calcRSI, calcATR, calcMACD,
  calcBollingerBands, calcMarketStructure, calcIVWAP,
  calcVWAP, calcEMA,
} from '../../engines/technicalEngine';
import { classifyLiquidity, calcVPVR, detectVolumeSpikes, calcRelativeVolume, calcLiquidityScore } from '../../engines/liquidityEngine';
import { colors } from '../../theme/tokens';

const C = colors;

function StatRow({ label, value, color, sub }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.line}` }}>
      <div style={{ textAlign: 'left' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: color ?? C.textPrimary }}>{value}</span>
        {sub && <span style={{ fontSize: 9, color: C.textTertiary, marginRight: 6 }}>{sub}</span>}
      </div>
      <span style={{ fontSize: 11, color: C.textSecondary }}>{label}</span>
    </div>
  );
}

function SectionTitle({ title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 8px' }}>
      <div style={{ width: 3, height: 16, background: C.electric, borderRadius: 2 }} />
      <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{title}</span>
    </div>
  );
}

function SignalBadge({ value, label }) {
  const isUp  = value === 'شراء' || value?.includes('صاعد') || value?.includes('إيجابي');
  const isDown= value === 'بيع'  || value?.includes('هابط') || value?.includes('سلبي');
  const color = isUp ? C.positive : isDown ? C.negative : C.amber;

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.line}` }}>
      <div style={{ background: color + '15', border: `1px solid ${color}44`, borderRadius: 8, padding: '3px 10px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{value}</span>
      </div>
      <span style={{ fontSize: 11, color: C.textSecondary }}>{label}</span>
    </div>
  );
}

// RSI visual gauge
function RSIGauge({ value }) {
  const color = value >= 70 ? C.negative : value <= 30 ? C.positive : value >= 55 ? C.amber : C.electric;
  const label = value >= 70 ? 'تشبع شراء' : value <= 30 ? 'تشبع بيع' : value >= 55 ? 'زخم إيجابي' : 'محايد';
  const pct   = value;

  return (
    <div style={{ background: C.layer1, borderRadius: 12, padding: '12px 14px', border: `1px solid ${C.border}`, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ background: color + '15', borderRadius: 8, padding: '2px 10px', border: `1px solid ${color}44` }}>
          <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
        </div>
        <span style={{ fontSize: 22, fontWeight: 900, color, fontFamily: 'monospace' }}>{value}</span>
      </div>
      <div style={{ height: 8, background: C.layer3, borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
        {/* Zones */}
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '30%', background: C.positive + '30' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '30%', background: C.negative + '30' }} />
        {/* Indicator */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: pct + '%', width: 3, background: color, transform: 'translateX(-50%)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 8, color: C.positive }}>30 تشبع بيع</span>
        <span style={{ fontSize: 9, color: C.textTertiary }}>RSI(14)</span>
        <span style={{ fontSize: 8, color: C.negative }}>تشبع شراء 70</span>
      </div>
    </div>
  );
}

export default function StockTechnicalTab({ stk }) {
  const bars = useMemo(() => generateOHLCBars(stk, 80), [stk.sym]);

  const analysis = useMemo(() => {
    if (!bars.length) return null;
    const closes = bars.map(b => b.c);

    const rsi14    = calcRSI(bars, 14);
    const rsi7     = calcRSI(bars.slice(-30), 7);
    const atr14    = calcATR(bars, 14);
    const macd     = calcMACD(bars);
    const bb       = calcBollingerBands(bars);
    const ms       = calcMarketStructure(bars);
    const ivwap    = calcIVWAP(bars, stk);
    const vwap     = calcVWAP(bars);

    // Moving averages
    const ma20s    = closes.length >= 20 ? +(closes.slice(-20).reduce((a,b) => a+b,0) / 20).toFixed(2) : null;
    const ma50s    = closes.length >= 50 ? +(closes.slice(-50).reduce((a,b) => a+b,0) / 50).toFixed(2) : null;
    const ema20    = closes.length >= 20 ? +calcEMA(closes, 20).toFixed(2) : null;
    const ema50    = closes.length >= 50 ? +calcEMA(closes, 50).toFixed(2) : null;

    const p = stk.p;
    const maSignal = ema20 && ema50 ? (ema20 > ema50 ? 'صاعد (EMA20 > EMA50)' : 'هابط (EMA20 < EMA50)') : '—';

    // ATR %
    const atrPct = p > 0 ? +(atr14 / p * 100).toFixed(2) : 0;

    // Support/Resistance from BB
    const support    = +bb.lower.toFixed(2);
    const resistance = +bb.upper.toFixed(2);
    const mid        = +bb.middle.toFixed(2);

    const liq   = classifyLiquidity(bars, stk);
    const liqScore = calcLiquidityScore(bars);
    const vpvr  = calcVPVR(bars, 12);
    const rvol  = calcRelativeVolume(bars, 20);

    return { rsi14, rsi7, atr14, atrPct, macd, bb, ms, ivwap, vwap: +vwap.toFixed(2), ma20s, ma50s, ema20, ema50, maSignal, support, resistance, liq, vpvr, rvol };
  }, [bars, stk.sym]);

  if (!analysis) return <div style={{ padding: 20, color: C.textSecondary, textAlign: 'center' }}>جاري الحساب...</div>;

  const { rsi14, rsi7, atr14, atrPct, macd, bb, ms, ivwap, vwap, ma20s, ma50s, ema20, ema50, maSignal, support, resistance } = analysis;

  return (
    <div style={{ padding: '14px 16px 48px', direction: 'rtl' }}>

      {/* RSI */}
      <SectionTitle title="مؤشر القوة النسبية RSI" />
      <RSIGauge value={rsi14} />
      <StatRow label="RSI (7)" value={rsi7} color={rsi7 >= 70 ? C.negative : rsi7 <= 30 ? C.positive : C.textPrimary} />

      {/* MACD */}
      <SectionTitle title="MACD" />
      <div style={{ background: C.layer1, borderRadius: 12, padding: '12px 14px', border: `1px solid ${C.border}` }}>
        {[
          { l: 'MACD',      v: macd.macd.toFixed(4),      c: macd.macd > 0 ? C.positive : C.negative },
          { l: 'Signal',    v: macd.signal.toFixed(4),    c: C.amber },
          { l: 'Histogram', v: macd.histogram.toFixed(4), c: macd.histogram > 0 ? C.positive : C.negative },
          { l: 'الإشارة',   v: macd.trend === 'bullish' ? 'صاعد ✓' : 'هابط', c: macd.trend === 'bullish' ? C.positive : C.negative },
        ].map((r, i) => <StatRow key={i} label={r.l} value={r.v} color={r.c} />)}
      </div>

      {/* Bollinger Bands */}
      <SectionTitle title="بولينجر باندز" />
      <div style={{ background: C.layer1, borderRadius: 12, padding: '12px 14px', border: `1px solid ${C.border}` }}>
        <StatRow label="الشريط العلوي"  value={bb.upper.toFixed(2)}  color={C.negative} />
        <StatRow label="المتوسط (SMA20)" value={bb.middle.toFixed(2)} color={C.amber} />
        <StatRow label="الشريط السفلي"  value={bb.lower.toFixed(2)}  color={C.positive} />
        <StatRow label="عرض الشريط"     value={bb.bandwidth.toFixed(2) + '%'} />
        <StatRow label="موقع السعر"     value={bb.bandwidth > 0 ? (((stk.p - bb.lower) / (bb.upper - bb.lower) * 100)).toFixed(0) + '%' : '—'} color={C.gold} />
      </div>

      {/* Moving Averages */}
      <SectionTitle title="المتوسطات المتحركة" />
      <div style={{ background: C.layer1, borderRadius: 12, padding: '12px 14px', border: `1px solid ${C.border}` }}>
        <SignalBadge label="الاتجاه (EMA)" value={maSignal} />
        {ma20s && <StatRow label="SMA20" value={ma20s} color={stk.p > ma20s ? C.positive : C.negative} sub={stk.p > ma20s ? '↑ فوق' : '↓ تحت'} />}
        {ma50s && <StatRow label="SMA50" value={ma50s} color={stk.p > ma50s ? C.positive : C.negative} sub={stk.p > ma50s ? '↑ فوق' : '↓ تحت'} />}
        {ema20  && <StatRow label="EMA20" value={ema20}  color={stk.p > ema20  ? C.positive : C.negative} />}
        {ema50  && <StatRow label="EMA50" value={ema50}  color={stk.p > ema50  ? C.positive : C.negative} />}
      </div>

      {/* VWAP */}
      <SectionTitle title="VWAP المؤسسي" />
      <div style={{ background: C.layer1, borderRadius: 12, padding: '12px 14px', border: `1px solid ${C.border}` }}>
        <StatRow label="VWAP الجلسة"    value={vwap}                  color={stk.p > vwap ? C.positive : C.negative} />
        <StatRow label="VWAP أسبوعي"   value={ivwap.vwW}             color={stk.p > ivwap.vwW ? C.positive : C.negative} />
        <StatRow label="VWAP شهري"     value={ivwap.vwM}             color={stk.p > ivwap.vwM ? C.positive : C.negative} />
        <StatRow label="AVWAP"          value={ivwap.avwap}           color={stk.p > ivwap.avwap ? C.positive : C.negative} />
        <SignalBadge label="التقييم"    value={ivwap.label} />
      </div>

      {/* Market Structure */}
      <SectionTitle title="هيكل السوق" />
      <div style={{ background: C.layer1, borderRadius: 12, padding: '12px 14px', border: `1px solid ${C.border}` }}>
        <SignalBadge label="الاتجاه"    value={ms.trend} />
        <StatRow label="BOS/CHOCH"     value={ms.bos ? (ms.choch ? 'CHOCH' : 'BOS') : 'لا'} color={ms.bosBull ? C.positive : ms.bosBear ? C.negative : C.textSecondary} />
        <StatRow label="HH/HL"         value={`${ms.hhC}/${ms.hlC}`} color={C.positive} />
        <StatRow label="LH/LL"         value={`${ms.lhC}/${ms.llC}`} color={C.negative} />
        <SignalBadge label="التقييم"   value={ms.label} />
      </div>

      {/* ATR / Volatility */}
      <SectionTitle title="التذبذب والمخاطر" />
      <div style={{ background: C.layer1, borderRadius: 12, padding: '12px 14px', border: `1px solid ${C.border}` }}>
        <StatRow label="ATR (14)"      value={atr14.toFixed(3)} />
        <StatRow label="ATR %"         value={atrPct + '%'}    color={atrPct > 2 ? C.negative : atrPct < 1 ? C.positive : C.amber} />
        <StatRow label="دعم (BB)"      value={support}         color={C.positive} />
        <StatRow label="مقاومة (BB)"   value={resistance}      color={C.negative} />
        <StatRow label="وقف الخسارة المقترح" value={(stk.p - atr14 * 1.5).toFixed(2)} color={C.negative} sub="1.5 × ATR" />
        <StatRow label="هدف 1"         value={(stk.p + atr14 * 2).toFixed(2)}   color={C.positive} sub="2 × ATR" />
        <StatRow label="هدف 2"         value={(stk.p + atr14 * 3.5).toFixed(2)} color={C.positive} sub="3.5 × ATR" />
      </div>

      {/* Liquidity Engine */}
      <SectionTitle title="خريطة السيولة المؤسسية" />
      <div style={{ background: C.layer1, borderRadius: 12, padding: '12px 14px', border: `1px solid ${C.border}` }}>
        <SignalBadge label="تصنيف السيولة"  value={analysis.liq.label} />
        <StatRow label="CMF"              value={analysis.liq.cmf?.toFixed(3) ?? '—'} color={analysis.liq.cmf > 0 ? C.positive : C.negative} />
        <StatRow label="نسبة الحجم"       value={analysis.liq.volumeRatio + 'x'} color={analysis.liq.volumeRatio >= 1.5 ? C.positive : C.textSecondary} />
        <StatRow label="OBV Z-Score"      value={analysis.liq.obvZ?.toFixed(2) ?? '—'} color={analysis.liq.obvZ > 1 ? C.positive : analysis.liq.obvZ < -1 ? C.negative : C.textSecondary} />
        <StatRow label="الحجم النسبي"     value={analysis.rvol.label} color={analysis.liq.volumeRatio >= 2 ? C.amber : C.textSecondary} />
      </div>

      {/* VPVR — Volume Profile */}
      <SectionTitle title="ملف الحجم (VPVR)" />
      <div style={{ background: C.layer1, borderRadius: 12, padding: '12px 14px', border: `1px solid ${C.border}` }}>
        {analysis.vpvr.filter(v => v.pct > 20).slice(0, 5).map((v, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
            <div style={{ flex:1, height:6, background:C.layer3, borderRadius:3, overflow:'hidden' }}>
              <div style={{ width:v.pct+'%', height:'100%', background: v.isPOC ? C.gold : C.electric, borderRadius:3 }} />
            </div>
            <span style={{ fontSize:10, fontFamily:'monospace', color: v.isPOC ? C.gold : C.textPrimary, minWidth:48 }}>
              {v.price} {v.isPOC ? '← POC' : ''}
            </span>
          </div>
        ))}
        <div style={{ fontSize:9, color:C.textTertiary, marginTop:4, textAlign:'right' }}>POC = نقطة تحكم السيولة</div>
      </div>

    </div>
  );
}
