'use client';
/**
 * StockFundamentalTab — الأساسي
 * All calculations from stockAnalysisEngine.js — NO inline math.
 */

import { useMemo }                  from 'react';
import { generateOHLCBars }         from '../../services/api/stocksApi';
import {
  calcDCF, calcFactorModel,
  calcEarningsQuality, calcMacroImpact,
} from '../../engines/stockAnalysisEngine';
import { colors } from '../../theme/tokens';

const C = colors;

function Section({ title, children }) {
  return (
    <div style={{ background: C.layer1, borderRadius: 14, padding: '14px', border: `1px solid ${C.border}`, marginBottom: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, marginBottom: 12, textAlign: 'right' }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, color, sub }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: `1px solid ${C.line}` }}>
      <div style={{ textAlign: 'left' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: color ?? C.textPrimary }}>{value}</span>
        {sub && <div style={{ fontSize: 9, color: C.textTertiary }}>{sub}</div>}
      </div>
      <span style={{ fontSize: 11, color: C.textSecondary }}>{label}</span>
    </div>
  );
}

function ScoreBar({ label, value, color }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{value}/100</span>
        <span style={{ fontSize: 11, color: C.textSecondary }}>{label}</span>
      </div>
      <div style={{ height: 6, background: C.layer3, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: value + '%', height: '100%', background: color, borderRadius: 3, transition: 'width .5s' }} />
      </div>
    </div>
  );
}

export default function StockFundamentalTab({ stk }) {
  const bars = useMemo(() => generateOHLCBars(stk, 60), [stk.sym]);

  const analysis = useMemo(() => ({
    dcf:      calcDCF(stk),
    factor:   calcFactorModel(stk, bars),
    earnings: calcEarningsQuality(stk),
    macro:    calcMacroImpact(stk),
  }), [stk.sym, bars]);

  const { dcf, factor, earnings, macro } = analysis;
  const scoreColor = s => s >= 75 ? C.positive : s >= 50 ? C.amber : C.negative;

  return (
    <div style={{ padding: '14px 16px 48px', direction: 'rtl' }}>

      {/* DCF Valuation */}
      <Section title="تقييم التدفقات النقدية DCF">
        {dcf.intrinsicValue ? (
          <>
            <Row label="القيمة العادلة" value={dcf.intrinsicValue + ' ر.س'}
              color={dcf.upside > 0 ? C.positive : C.negative} />
            <Row label="السعر الحالي" value={stk.p.toFixed(2) + ' ر.س'} />
            <Row label="هامش الأمان"
              value={(dcf.upside > 0 ? '+' : '') + dcf.upside + '%'}
              color={dcf.upside > 0 ? C.positive : C.negative}
              sub={dcf.upside > 30 ? 'مقيّم بأقل من قيمته' : dcf.upside > 0 ? 'قريب من القيمة' : 'مقيّم بأكثر من قيمته'} />
            <div style={{ marginTop: 10, background: scoreColor(Math.max(0, 50 + dcf.upside)) + '15', borderRadius: 10, padding: '8px 12px', border: `1px solid ${scoreColor(Math.max(0, 50 + dcf.upside))}30` }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor(Math.max(0, 50 + dcf.upside)) }}>{dcf.rating}</span>
            </div>
          </>
        ) : (
          <div style={{ fontSize: 11, color: C.textTertiary, textAlign: 'center', padding: '8px 0' }}>بيانات غير كافية للتقييم</div>
        )}
      </Section>

      {/* Factor Model */}
      <Section title="نموذج العوامل الرباعي">
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ background: scoreColor(factor.composite) + '20', borderRadius: 10, padding: '4px 14px', border: `1px solid ${scoreColor(factor.composite)}40` }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: scoreColor(factor.composite) }}>{factor.composite}</span>
              <span style={{ fontSize: 10, color: scoreColor(factor.composite), marginRight: 4 }}>{factor.label}</span>
            </div>
            <span style={{ fontSize: 12, color: C.textSecondary }}>التقييم المركّب</span>
          </div>
        </div>
        <ScoreBar label="الجودة"  value={factor.quality}  color={scoreColor(factor.quality)} />
        <ScoreBar label="القيمة"  value={factor.value}    color={scoreColor(factor.value)} />
        <ScoreBar label="الزخم"   value={factor.momentum} color={scoreColor(factor.momentum)} />
        <ScoreBar label="النمو"   value={factor.growth}   color={scoreColor(factor.growth)} />
      </Section>

      {/* Earnings Quality */}
      <Section title="جودة الأرباح">
        <Row label="تقييم جودة الأرباح" value={earnings.label}
          color={earnings.score >= 70 ? C.positive : earnings.score >= 50 ? C.amber : C.negative} />
        {stk.eps_q1 && (
          <>
            <Row label="EPS Q1" value={stk.eps_q1?.toFixed(2) + ' ر.س'} />
            <Row label="EPS Q2" value={stk.eps_q2?.toFixed(2) + ' ر.س'} />
            <Row label="EPS Q3" value={stk.eps_q3?.toFixed(2) + ' ر.س'} />
            <Row label="ثبات الأرباح" value={earnings.consistency + '%'} color={earnings.consistency > 70 ? C.positive : C.amber} />
          </>
        )}
        {stk.freeCashFlow && (
          <Row label="التدفق النقدي الحر/سهم" value={stk.freeCashFlow.toFixed(2) + ' ر.س'}
            color={stk.freeCashFlow > 0 ? C.positive : C.negative} />
        )}
      </Section>

      {/* Macro Impact */}
      <Section title="تأثير البيئة الاقتصادية">
        <Row label="تأثير أسعار النفط"
          value={(macro.oilImpact > 0 ? '+' : '') + macro.oilImpact + '%'}
          color={macro.oilImpact > 0 ? C.positive : C.negative}
          sub={`ارتباط النفط: ${((stk.oilCorr ?? 0) * 100).toFixed(0)}%`} />
        <Row label="تأثير أسعار الفائدة"
          value={(macro.rateImpact > 0 ? '+' : '') + macro.rateImpact + '%'}
          color={macro.rateImpact > 0 ? C.positive : C.negative} />
        <Row label="سعر النفط الحالي"
          value={macro.oilPrice + ' $'} />
        <div style={{ marginTop: 10, background: C.layer3, borderRadius: 10, padding: '8px 12px' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: macro.overallImpact > 0 ? C.positive : C.negative }}>
            {macro.label}
          </span>
        </div>
      </Section>

      {/* Full financials */}
      <Section title="المؤشرات المالية الكاملة">
        {[
          { l: 'القيمة السوقية',         v: stk.mktCap ? stk.mktCap.toLocaleString('en') + ' مليار' : '—' },
          { l: 'مكررات الأرباح (P/E)',   v: stk.pe   ? stk.pe.toFixed(1)   + 'x' : '—' },
          { l: 'السعر/القيمة الدفترية',  v: stk.pb   ? stk.pb.toFixed(1)   + 'x' : '—' },
          { l: 'ربحية السهم (EPS)',       v: stk.eps  ? stk.eps.toFixed(2)  + ' ر.س' : '—' },
          { l: 'عائد التوزيع',           v: stk.divY ? stk.divY.toFixed(1) + '%' : '—' },
          { l: 'العائد على الملكية ROE',  v: stk.roe  ? stk.roe.toFixed(1)  + '%' : '—', c: stk.roe > 15 ? C.positive : C.amber },
          { l: 'نسبة الدين/الملكية',     v: stk.debt ? stk.debt.toFixed(2) + 'x' : '—', c: stk.debt > 0.5 ? C.negative : C.positive },
          { l: 'نمو الأرباح',            v: stk.epsGrw ? '+' + stk.epsGrw.toFixed(1) + '%' : '—', c: C.positive },
          { l: 'نمو الإيرادات',          v: stk.revGrw ? '+' + stk.revGrw.toFixed(1) + '%' : '—', c: C.positive },
          { l: 'بيتا',                   v: stk.beta ? stk.beta.toFixed(2) : '—' },
        ].map((r, i) => (
          <Row key={i} label={r.l} value={r.v} color={r.c} />
        ))}
      </Section>

    </div>
  );
}
