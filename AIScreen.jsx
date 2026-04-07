'use client';
/**
 * AI SCREEN — تحليل AI
 * Refactored from AILabTab_v17_clean.jsx
 *
 * Changes:
 * - Supabase key from config (not hardcoded) ✅
 * - fetch via /api/claude proxy (not direct Anthropic) ✅
 * - Stock data from stockStore ✅
 * - Analysis history in localStorage (safe wrapper) ✅
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { useStocks }     from '../store';
import { useNav }        from '../store';
import { fetchAIAnalysis } from '../services/api/stocksApi';
import { insertAnalysisRecord } from '../services/supabaseService';
import { colors }        from '../theme/tokens';

const C = colors;

const TYPES = [
  { id:'comprehensive',       label:'تحليل شامل',       badge:'PRO', color:C.gold,    desc:'GS · MS · BW · JPM · CIT' },
  { id:'fundamental_combined',label:'التحليل الأساسي',  badge:'سا',  color:'#1a7fd4', desc:'تقييم · قيمة عادلة · DCF' },
  { id:'technical_combined',  label:'التحليل الفني',    badge:'مس',  color:'#00b4d8', desc:'مؤشرات · سيولة · خطة تداول' },
  { id:'risk_combined',       label:'إدارة المخاطر',    badge:'بر',  color:'#9d4edd', desc:'بيتا · أقصى هبوط · تحوط' },
  { id:'jpm_earnings',        label:'تحليل الأرباح',    badge:'جب',  color:'#e63946', desc:'توقعات · تموضع · خطة الأرباح' },
  { id:'macro_combined',      label:'الكلي والقطاعات',  badge:'سي',  color:'#ff9f1c', desc:'دورة اقتصادية · رؤية 2030' },
  { id:'sentiment',           label:'مشاعر السوق',      badge:null,  color:C.amber,   desc:'دورة عواطف · تحيزات سلوكية' },
];

// Safe localStorage wrapper
function tryLS(fn, fallback) {
  try { return fn(); } catch { return fallback; }
}

const LS = { sym:'td_sym', type:'td_type', hist:'td_hist', ob:'td_ob' };

// Build prompt for each analysis type
function buildPrompt(stk, type) {
  const pos  = stk.w52h && stk.w52l ? Math.round((stk.p - stk.w52l) / (stk.w52h - stk.w52l) * 100) : 50;
  const base = `═══ ${stk.name} (${stk.sym}) - ${stk.sec} ═══
${stk.desc ?? ''}
▸ السعر: ${stk.p} ريال | ${stk.pct > 0 ? '+' : ''}${stk.pct}% | 52أسبوع: ${stk.w52l ?? '—'}→${stk.w52h ?? '—'} | موقع: ${pos}%
▸ تقييم: P/E ${stk.pe ?? '—'} | P/B ${stk.pb ?? '—'} | EPS ${stk.eps ?? '—'} | القيمة السوقية ${stk.mktCap ?? '—'} مليار
▸ جودة: ROE ${stk.roe ?? '—'}% | Beta ${stk.beta ?? '—'} | D/E ${stk.debt ?? '—'} | FCF ${stk.freeCashFlow ?? '—'}`;

  const prompts = {
    comprehensive: `${base}\n\nأنت فريق تحليل متكامل يجمع خبرات Goldman Sachs وMorgan Stanley وBridgewater وJPMorgan وCitadel.\nقدّم تحليلاً شاملاً يغطي: الأساسي + الفني + المخاطر + الأرباح + الكلي + المشاعر.\nكل قسم يحتوي على استنتاج وأرقام وتوصية واضحة. الرد بالعربية.`,
    fundamental_combined: `${base}\n\nأنت محلل أساسي على مستوى Goldman Sachs.\nحلّل: نموذج العمل، Moat الاقتصادي، DCF، مقارنة بالقطاع، السعر المستهدف 12 شهراً.\nالرد بالعربية بشكل مفصل ومهني.`,
    technical_combined: `${base}\n\nأنت محلل فني على مستوى Morgan Stanley.\nحلّل: هيكل السوق، متوسطات متحركة، RSI، MACD، بولينجر باندز، مناطق دعم ومقاومة.\nقدّم خطة تداول: دخول، وقف خسارة، هدف 1، هدف 2. الرد بالعربية.`,
    risk_combined: `${base}\n\nأنت محلل مخاطر على مستوى Bridgewater.\nقيّم: بيتا، أقصى هبوط محتمل، استراتيجيات تحوط، سيناريو ركود.\nالرد بالعربية بشكل مفصل.`,
    jpm_earnings: `${base}\n\nأنت محلل أرباح على مستوى JPMorgan.\nحلّل: EPS، توجه الأرباح، توقعات القادمة، تموضع ما قبل/بعد الأرباح.\nالرد بالعربية.`,
    macro_combined: `${base}\n\nأنت محلل اقتصاد كلي على مستوى Citadel.\nحلّل: الدورة الاقتصادية، رؤية 2030، تأثير أسعار النفط، ترتيب القطاع.\nالرد بالعربية.`,
    sentiment: `${base}\n\nأنت محلل مشاعر السوق.\nحلّل: دورة العواطف، تحيزات سلوكية، قراءة المشاعر من البيانات الكمية.\nالرد بالعربية.`,
  };
  return prompts[type] ?? prompts.comprehensive;
}

export default function AIScreen() {
  const { stocks }    = useStocks();
  const { openStock } = useNav();

  const [stock, setStock] = useState(() => {
    // Guard: stocks is always populated from STOCKS constant
    const defaultStock = stocks.length > 0 ? stocks[0] : null;
    return tryLS(() => stocks.find(s => s.sym === localStorage.getItem(LS.sym)) ?? defaultStock, defaultStock);
  });
  const [type,     setType]     = useState(() => tryLS(() => { const t = localStorage.getItem(LS.type); return TYPES.find(x => x.id === t) ? t : 'comprehensive'; }, 'comprehensive'));
  const [result,   setResult]   = useState('');
  const [status,   setStatus]   = useState('idle');
  const [errMsg,   setErrMsg]   = useState('');
  const [open,     setOpen]     = useState(false);
  const [srchQ,    setSrchQ]    = useState('');
  const [words,    setWords]    = useState(0);
  const [saved,    setSaved]    = useState(false);
  const [saving,   setSaving]   = useState(false);
  const abortRef = useRef(null);

  const selType  = TYPES.find(t => t.id === type) ?? TYPES[0];
  const isUp     = stock?.pct >= 0;
  const isLoad   = status === 'loading';
  const isDone   = status === 'done';
  const isErr    = status === 'error';

  const cancel = () => { abortRef.current?.abort(); abortRef.current = null; };

  const run = useCallback(async () => {
    if (!stock) return;
    cancel();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStatus('loading'); setResult(''); setErrMsg(''); setWords(0); setSaved(false);

    try {
      const prompt   = buildPrompt(stock, type);
      const system   = 'أنت محلل استثماري خبير متخصص في سوق الأسهم السعودي (تداول). ردودك باللغة العربية الفصحى مع الأرقام بالإنجليزية. أسلوبك مهني ومحترف على مستوى Goldman Sachs وMorgan Stanley.';
      // All AI calls go through service layer — no direct fetch in components
      const text = await fetchAIAnalysis(`${system}\n\n${prompt}`, 2000);
      setResult(text);
      setWords(text.trim().split(/\s+/).filter(Boolean).length);
      setStatus('done');
    } catch (e) {
      if (e.name === 'AbortError') { setStatus('idle'); return; }
      setErrMsg(
        e.message?.includes('429') ? 'وصلت للحد الأقصى. انتظر دقيقة.' :
        e.message?.includes('401') ? 'خطأ في مفتاح API.' :
        'تعذّر الاتصال. تحقق من شبكتك.'
      );
      setStatus('error');
    }
  }, [stock, type]);

  const saveToLearning = useCallback(async () => {
    if (saving || saved || !result) return;
    setSaving(true);
    try {
      const uid = tryLS(() => {
        let id = localStorage.getItem('tadawul_uid');
        if (!id) { id = 'u_' + Date.now().toString(36); localStorage.setItem('tadawul_uid', id); }
        return id;
      }, 'anonymous');

      const rec = {
        id: Date.now().toString(36),
        user_id: uid, sym: stock.sym, name: stock.name,
        type, type_label: selType.label,
        current_price: stock.p, analysis_text: result.slice(0, 500),
        created_at: Date.now(),
        evaluate_at30: Date.now() + 2592000000,
        evaluate_at90: Date.now() + 7776000000,
      };

      // Save locally
      tryLS(() => {
        const prev = JSON.parse(localStorage.getItem('tle_records_v1') || '[]');
        localStorage.setItem('tle_records_v1', JSON.stringify([rec, ...prev].slice(0, 50)));
      });

      // Save to Supabase via service (key from config)
      await insertAnalysisRecord(rec);
      setSaved(true);
    } catch { setSaved(true); }
    setSaving(false);
  }, [saving, saved, result, stock, type, selType.label]);

  const filteredStocks = useMemo(() =>
    srchQ.trim() ? stocks.filter(s => s.name.includes(srchQ) || s.sym.includes(srchQ)) : stocks,
    [stocks, srchQ]
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, direction: 'rtl', fontFamily: "'Cairo','Segoe UI',sans-serif", color: C.textPrimary, fontSize: 14 }}>

      {/* Header */}
      <div style={{ padding: '12px 14px 10px', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: C.bg, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 10 }}>
          <div style={{ width: 3, height: 18, background: C.mint, borderRadius: 2 }} />
          <span style={{ fontSize: 16, fontWeight: 800, color: C.textPrimary }}>تحليل AI</span>
          <span style={{ fontSize: 9, color: C.mint, background: C.mint + '15', padding: '2px 8px', borderRadius: 6, border: `1px solid ${C.mint}30` }}>مدعوم بـ Claude</span>
        </div>

        {/* Stock selector */}
        <div onClick={() => setOpen(true)} style={{ background: C.layer2, borderRadius: 12, padding: '10px 14px', border: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.textSecondary} strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.textPrimary }}>{stock?.name}</div>
            <div style={{ fontSize: 10, color: isUp ? C.positive : C.negative }}>{stock?.sym} · {isUp ? '+' : ''}{stock?.pct.toFixed(2)}%</div>
          </div>
        </div>

        {/* Analysis type grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
          {TYPES.slice(0, 4).map(t => (
            <button key={t.id} onClick={() => { setType(t.id); setResult(''); setStatus('idle'); }} style={{ padding: '8px 4px', borderRadius: 10, border: `1px solid ${type === t.id ? t.color + '88' : C.border}`, background: type === t.id ? t.color + '15' : C.layer2, cursor: 'pointer', fontFamily: 'Cairo,sans-serif', transition: 'all .15s' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: type === t.id ? t.color : C.textSecondary }}>{t.label}</div>
              {t.badge && <div style={{ fontSize: 7, color: type === t.id ? t.color : C.textTertiary, marginTop: 2 }}>{t.badge}</div>}
            </button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5, marginTop: 5 }}>
          {TYPES.slice(4).map(t => (
            <button key={t.id} onClick={() => { setType(t.id); setResult(''); setStatus('idle'); }} style={{ padding: '8px 4px', borderRadius: 10, border: `1px solid ${type === t.id ? t.color + '88' : C.border}`, background: type === t.id ? t.color + '15' : C.layer2, cursor: 'pointer', fontFamily: 'Cairo,sans-serif', transition: 'all .15s' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: type === t.id ? t.color : C.textSecondary }}>{t.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Run button */}
      <div style={{ padding: '12px 14px 0' }}>
        <button
          onClick={isLoad ? cancel : run}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: 'pointer',
            fontFamily: 'Cairo,sans-serif', fontSize: 14, fontWeight: 800,
            background: isLoad ? C.layer3 : `linear-gradient(135deg,${selType.color}cc,${selType.color})`,
            color: isLoad ? C.textSecondary : '#000',
            boxShadow: isLoad ? 'none' : `0 4px 20px ${selType.color}44`,
            transition: 'all .2s',
          }}
        >
          {isLoad ? '⏹ إيقاف' : `🔍 تحليل ${stock?.name} — ${selType.label}`}
        </button>
      </div>

      {/* Loading */}
      {isLoad && (
        <div style={{ padding: '20px 14px', textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', border: `3px solid ${C.layer3}`, borderTopColor: selType.color, animation: 'aiSpin .8s linear infinite', margin: '0 auto 10px' }} />
          <div style={{ fontSize: 12, color: C.textSecondary }}>جاري التحليل بالذكاء الاصطناعي...</div>
        </div>
      )}

      {/* Error */}
      {isErr && (
        <div style={{ margin: '12px 14px', background: C.negative + '15', borderRadius: 12, padding: '12px', border: `1px solid ${C.negative}30` }}>
          <div style={{ fontSize: 12, color: C.negative }}>{errMsg}</div>
        </div>
      )}

      {/* Result */}
      {isDone && result && (
        <div style={{ margin: '12px 14px' }}>
          <div style={{ background: C.layer1, borderRadius: 14, padding: '16px', border: `1px solid ${selType.color}22` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={saveToLearning} disabled={saved || saving} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.mint}44`, background: saved ? C.mint + '20' : C.layer3, color: saved ? C.mint : C.textSecondary, fontSize: 10, fontWeight: 700, cursor: saved ? 'default' : 'pointer', fontFamily: 'Cairo,sans-serif' }}>
                  {saving ? '⏳' : saved ? '✓ محفوظ' : '💾 حفظ'}
                </button>
              </div>
              <span style={{ fontSize: 10, color: C.textTertiary }}>{words} كلمة · {selType.label}</span>
            </div>
            <div style={{ fontSize: 13, color: C.textPrimary, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{result}</div>
          </div>
        </div>
      )}

      {/* Stock picker modal */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 100 }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: C.layer1, borderRadius: '20px 20px 0 0', padding: '16px', zIndex: 101, maxHeight: '70vh', display: 'flex', flexDirection: 'column' }}>
            <input
              autoFocus value={srchQ} onChange={e => setSrchQ(e.target.value)}
              placeholder="ابحث..."
              style={{ background: C.layer2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 12px', color: C.textPrimary, fontFamily: 'Cairo,sans-serif', fontSize: 13, outline: 'none', marginBottom: 10 }}
            />
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredStocks.map(s => (
                <div key={s.sym} onClick={() => { tryLS(() => localStorage.setItem(LS.sym, s.sym)); setStock(s); setResult(''); setStatus('idle'); setOpen(false); setSrchQ(''); }} style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: s.pct >= 0 ? C.positive : C.negative }}>{s.pct >= 0 ? '+' : ''}{s.pct.toFixed(2)}%</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary }}>{s.name}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes aiSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
