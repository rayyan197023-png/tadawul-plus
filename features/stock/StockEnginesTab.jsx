'use client';
/**
 * StockEnginesTab — محركات التحليل
 *
 * Displays full engine output:
 * - Radar 8-layer breakdown
 * - DCF valuation
 * - Factor model (Quality / Value / Momentum / Growth)
 * - Earnings quality
 * - Macro impact
 * - Trade plan (stop / targets / R:R)
 */

import { useMemo }                 from 'react';
import { generateOHLCBars }        from '../../services/api/stocksApi';
import { calcRadarScore }          from '../../engines/radarEngine';
import {
  calcDCF, calcFactorModel,
  calcEarningsQuality, calcMacroImpact,
} from '../../engines/stockAnalysisEngine';
import { colors } from '../../theme/tokens';

const C = colors;

// ── Radar ring
function RadarRing({ score, size = 80 }) {
  const color  = score >= 68 ? C.positive : score >= 48 ? C.amber : C.negative;
  const r = (size - 10) / 2, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash  = (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.layer3} strokeWidth="7" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4} strokeLinecap="round" />
      <text x={cx} y={cy + 6} textAnchor="middle" fill={color}
        fontSize="16" fontWeight="900" fontFamily="monospace">{score}</text>
    </svg>
  );
}

// ── Layer bar
function LayerBar({ layer, maxScore = 20 }) {
  const pct   = Math.min(100, (layer.score / maxScore) * 100);
  const color = pct >= 75 ? C.positive : pct >= 45 ? C.amber : C.negative;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: color, fontWeight: 700 }}>{layer.label2 ?? ''}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, color: C.textTertiary }}>{layer.score}/{maxScore}</span>
          <span style={{ fontSize: 11, color: C.textPrimary, fontWeight: 700 }}>{layer.label}</span>
        </div>
      </div>
      <div style={{ height: 5, background: C.layer3, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 3, transition: 'width .5s' }} />
      </div>
      {/* AI Signals — from radar engine */}
      {(radar.signals ?? []).length > 0 && (
        <Section title="إشارات تقنية" color={C.electric}>
          {(radar.signals ?? []).map((sig, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 0',
              borderBottom: i < (radar.signals.length - 1) ? `1px solid ${C.line}` : 'none',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: sig.type === 'bullish' ? C.positive : C.negative }} />
              <span style={{ fontSize: 11, color: sig.type === 'bullish' ? C.positive : C.negative, fontWeight: 600 }}>
                {sig.msg}
              </span>
            </div>
          ))}
        </Section>
      )}

      {/* DCF Confidence Range */}
      {dcf.bullCase && (
        <Section title="نطاق الثقة — DCF" color={C.textTertiary}>
          <Row label="الحالة المتفائلة (+20%)"  value={dcf.bullCase + ' ر.س'} color={C.positive} />
          <Row label="الحالة المتشائمة (-20%)" value={dcf.bearCase + ' ر.س'} color={C.negative} />
          <Row label="WACC المُستخدم"            value={(dcf.wacc * 100).toFixed(1) + '%'} />
          <Row label="معدل النمو المُعدَّل"      value={dcf.g1Used + '%'} />
        </Section>
      )}

    </div>
  );
}

// ── Score pill
function ScorePill({ label, value, color, sub }) {
  return (
    <div style={{ background: color + '12', borderRadius: 10, padding: '10px 12px', border: `1px solid ${color}25`, textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 900, color, fontFamily: 'monospace', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 9, color: C.textTertiary, marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 9, color, marginTop: 2, fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

function Section({ title, color = C.electric, children }) {
  return (
    <div style={{ background: C.layer1, borderRadius: 14, padding: '14px', border: `1px solid ${color}20`, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <div style={{ width: 3, height: 16, background: color, borderRadius: 2 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${C.line}` }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: color ?? C.textPrimary }}>{value}</span>
      <span style={{ fontSize: 11, color: C.textSecondary }}>{label}</span>
    </div>
  );
}

export default function StockEnginesTab({ stk }) {
  const bars = useMemo(() => generateOHLCBars(stk, 80), [stk.sym]);

  const { radar, dcf, factor, earnings, macro } = useMemo(() => ({
    radar:    calcRadarScore(stk, bars),
    dcf:      calcDCF(stk),
    factor:   calcFactorModel(stk, bars),
    earnings: calcEarningsQuality(stk),
    macro:    calcMacroImpact(stk),
  }), [stk.sym, bars]);

  const radarColor   = radar.totalScore >= 68 ? C.positive : radar.totalScore >= 48 ? C.amber : C.negative;
  const scoreColor   = s => s >= 75 ? C.positive : s >= 50 ? C.amber : C.negative;
  const ratingLabel  = radar.totalScore >= 68 ? 'شراء قوي' : radar.totalScore >= 48 ? 'مراقبة' : 'تجنب';

  return (
    <div style={{ padding: '14px 16px 48px', direction: 'rtl', fontFamily: "'Cairo','Segoe UI',sans-serif" }}>

      {/* Radar Score Summary */}
      <Section title="رادار الفرصة — 8 طبقات" color={radarColor}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 14 }}>
          <RadarRing score={radar.totalScore} size={80} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: radarColor, marginBottom: 4 }}>{ratingLabel}</div>
            <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.6 }}>
              الاتجاه: <span style={{ color: C.textPrimary, fontWeight: 600 }}>{radar.regime ?? '—'}</span>
            </div>
            <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.6 }}>
              وقف الخسارة: <span style={{ color: C.negative, fontFamily: 'monospace' }}>{radar.stopLoss}</span>
            </div>
            <div style={{ fontSize: 11, color: C.textSecondary, lineHeight: 1.6 }}>
              هدف 1: <span style={{ color: C.positive, fontFamily: 'monospace' }}>{radar.targets?.[0]}</span>
              {' | '}هدف 2: <span style={{ color: C.positive, fontFamily: 'monospace' }}>{radar.targets?.[1]}</span>
            </div>
          </div>
        </div>
        {/* Layer breakdown */}
        {(radar.layers ?? []).map((l, i) => <LayerBar key={i} layer={l} />)}
      </Section>

      {/* Factor Model */}
      <Section title="نموذج العوامل الرباعي" color={scoreColor(factor.composite)}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <ScorePill label="الجودة"  value={factor.quality}   color={scoreColor(factor.quality)} />
          <ScorePill label="القيمة"  value={factor.value}     color={scoreColor(factor.value)} />
          <ScorePill label="الزخم"   value={factor.momentum}  color={scoreColor(factor.momentum)} />
          <ScorePill label="النمو"   value={factor.growth}    color={scoreColor(factor.growth)} />
        </div>
        <div style={{ background: scoreColor(factor.composite) + '15', borderRadius: 10, padding: '10px 14px', textAlign: 'center', border: `1px solid ${scoreColor(factor.composite)}30` }}>
          <span style={{ fontSize: 22, fontWeight: 900, color: scoreColor(factor.composite), fontFamily: 'monospace' }}>{factor.composite}</span>
          <span style={{ fontSize: 12, color: scoreColor(factor.composite), marginRight: 8, fontWeight: 700 }}>{factor.label}</span>
        </div>
      </Section>

      {/* DCF */}
      <Section title="تقييم DCF — القيمة العادلة" color={dcf.intrinsicValue ? (dcf.upside > 0 ? C.positive : C.negative) : C.textTertiary}>
        {dcf.intrinsicValue ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
              <ScorePill label="السعر الحالي"   value={stk.p.toFixed(2)}           color={C.textPrimary} />
              <ScorePill label="القيمة العادلة" value={dcf.intrinsicValue}          color={dcf.upside > 0 ? C.positive : C.negative} />
              <ScorePill label="الهامش"          value={(dcf.upside > 0 ? '+' : '') + dcf.upside + '%'}  color={dcf.upside > 0 ? C.positive : C.negative} sub={dcf.upside > 20 ? 'فرصة ✓' : dcf.upside > 0 ? 'قريب' : 'مبالغ فيه'} />
            </div>
            <div style={{ background: C.layer2, borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: dcf.upside > 0 ? C.positive : C.negative }}>{dcf.rating}</span>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', color: C.textTertiary, padding: '10px 0' }}>بيانات غير كافية للـ DCF</div>
        )}
      </Section>

      {/* Earnings Quality */}
      <Section title="جودة الأرباح" color={scoreColor(earnings.score)}>
        <Row label="التقييم"           value={earnings.label}        color={scoreColor(earnings.score)} />
        {earnings.consistency != null && <Row label="ثبات الأرباح"   value={earnings.consistency + '%'} color={earnings.consistency > 70 ? C.positive : C.amber} />}
        {stk.freeCashFlow != null      && <Row label="التدفق الحر/سهم" value={(stk.freeCashFlow > 0 ? '+' : '') + stk.freeCashFlow + ' ر.س'} color={stk.freeCashFlow > 0 ? C.positive : C.negative} />}
      </Section>

      {/* Macro Impact */}
      <Section title="تأثير البيئة الاقتصادية" color={macro.overallImpact > 0 ? C.positive : C.negative}>
        <Row label="تأثير النفط"         value={(macro.oilImpact > 0 ? '+' : '') + macro.oilImpact + '%'}   color={macro.oilImpact > 0 ? C.positive : C.negative} />
        <Row label="تأثير الفائدة"        value={(macro.rateImpact > 0 ? '+' : '') + macro.rateImpact + '%'} color={macro.rateImpact > 0 ? C.positive : C.negative} />
        <Row label="سعر النفط الحالي"     value={macro.oilPrice + ' $'} />
        <div style={{ background: C.layer2, borderRadius: 10, padding: '8px 12px', marginTop: 8, textAlign: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: macro.overallImpact > 0 ? C.positive : C.negative }}>{macro.label}</span>
        </div>
      </Section>

      {/* Trade Plan */}
      <Section title="خطة التداول" color={C.gold}>
        <Row label="السعر الحالي"   value={stk.p.toFixed(2) + ' ر.س'} />
        <Row label="وقف الخسارة"    value={radar.stopLoss + ' ر.س'}    color={C.negative} />
        <Row label="هدف 1 (2×ATR)"  value={(radar.targets?.[0] ?? '—') + ' ر.س'} color={C.positive} />
        <Row label="هدف 2 (3.5×ATR)" value={(radar.targets?.[1] ?? '—') + ' ر.س'} color={C.positive} />
        {radar.stopLoss && radar.targets?.[0] && (
          <>
            <Row label="نسبة المخاطرة/المكافأة"
              value={'1 : ' + ((radar.targets[0] - stk.p) / (stk.p - radar.stopLoss)).toFixed(2)}
              color={C.gold} />
            {stk.target && (
              <Row label="هدف المحللين"
                value={stk.target + ' ر.س (' + ((stk.target - stk.p) / stk.p * 100 > 0 ? '+' : '') + ((stk.target - stk.p) / stk.p * 100).toFixed(1) + '%)'}
                color={stk.target > stk.p ? C.positive : C.negative} />
            )}
          </>
        )}
      </Section>

    </div>
  );
}
