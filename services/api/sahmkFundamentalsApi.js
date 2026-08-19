/**
 * @module services/api/sahmkFundamentalsApi
 * @description جلب البيانات الأساسية الحقيقية من sahmk.sa
 * يُحدِّث STOCKS_MAP تلقائياً عند تحميل التطبيق
 */

async function sahmkFetch(endpoint, sym) {
  const res = await fetch(`/api/sahmkdata?endpoint=${endpoint}&sym=${sym}`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── تحويل بيانات company إلى شكل STOCKS ───────────
// ─── تحويل بيانات company إلى شكل STOCKS ───────────
function mapCompanyData(data) {
  // ✨ الحقول داخل data.fundamentals لا في data مباشرة (مؤكد بالاختبار)
  const f = (data && data.fundamentals) ? data.fundamentals : null;
  if (!f) return {};
  return {
    mktCap: f.market_cap != null ? f.market_cap / 1e9 : null,  // بالمليار
    pe:     f.pe_ratio != null ? f.pe_ratio : null,
    pb:     f.price_to_book != null ? f.price_to_book : null,
    eps:    f.eps != null ? f.eps : (f.eps_ttm != null ? f.eps_ttm : null),
    bookValue: f.book_value != null ? f.book_value : null,
    beta:   f.beta != null ? f.beta : null,
    sector_beta: f.beta != null ? f.beta : null,
    w52h:   f.fifty_two_week_high != null ? f.fifty_two_week_high : null,
    w52l:   f.fifty_two_week_low != null ? f.fifty_two_week_low : null,
    shares: f.shares_outstanding != null ? f.shares_outstanding : null,
    // ✨ القيمة العادلة وإجماع المحللين -- يغنيان عن تقديرات DCF المفترضة
    fairPrice: (data.valuation && data.valuation.fair_price != null) ? data.valuation.fair_price : null,
    target:    (data.analysts && data.analysts.target_mean != null) ? data.analysts.target_mean : null,
    consensus: (data.analysts && data.analysts.consensus) ? data.analysts.consensus : null,
  };
}

function mapRatiosData(data) {
  if (!data || !data.ratios || !data.ratios[0]) return {};
  const r  = data.ratios[0].ratios      ?? {};
  const km = data.ratios[0].key_metrics ?? {};
  return {
    roe:          r.roe                   ?? null,
    roa:          r.roa                   ?? null,
    netMargin:    r.net_margin            ?? null,
    // ✨ debt_ratio غير موجود في الاستجابة -- نشتقه: 1 − (حقوق الملكية ÷ الأصول)
    debt: (km.total_assets > 0 && km.stockholders_equity != null)
            ? +(1 - km.stockholders_equity / km.total_assets).toFixed(3)
            : null,
    revGrw:       r.revenue_growth_yoy    ?? null,
    epsGrw:       r.net_income_growth_yoy ?? null,
    freeCashFlow: km.operating_cash_flow  ?? null,
    oilCorr:      null,
    target:       null,
  };
}

// ════════════════════════════════════════════════════
// الدالة الرئيسية: جلب fundamentals لسهم واحد
// ════════════════════════════════════════════════════

export async function fetchFundamentals(symbol) {
  try {

    // ✨ كاش موحّد بمفتاح واحد -- 200 مفتاح منفصل يستنفد localStorage
    var _all = {};
    try { _all = JSON.parse(localStorage.getItem('tp_fund_all') || '{}'); } catch (e) {}
    var _hit = _all[symbol];
    if (_hit && (Date.now() - _hit.t) < 7 * 86400000) return _hit.d;

    const [company, ratios] = await Promise.allSettled([
      sahmkFetch('fundamentals', symbol),
      sahmkFetch('ratios', symbol),
    ]);

    const companyData = company.status === 'fulfilled'
      ? mapCompanyData(company.value)
      : {};

    const ratiosData = ratios.status === 'fulfilled'
      ? mapRatiosData(ratios.value)
      : {};

    var _out = { ...companyData, ...ratiosData };
    try { localStorage.setItem(_ck, JSON.stringify({ t: Date.now(), d: _out })); } catch (e) {}
    return _out;

  } catch (e) {
    console.warn(`[sahmkFundamentals] ${symbol}:`, e.message);
    return {};
  }
}

// ════════════════════════════════════════════════════
// جلب fundamentals لعدة أسهم وتحديث STOCKS_MAP
// ════════════════════════════════════════════════════

export async function loadFundamentalsIntoStocks(STOCKS_MAP, symbols) {
  if (!symbols || symbols.length === 0) return;

  const BATCH_SIZE = 5;

  for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
    const batch = symbols.slice(i, i + BATCH_SIZE);

    await Promise.allSettled(
      batch.map(async (sym) => {
        const data = await fetchFundamentals(sym);
        if (STOCKS_MAP[sym]) {
          Object.assign(STOCKS_MAP[sym], data);
        }
      })
    );

    // تأخير بين الدفعات
    if (i + BATCH_SIZE < symbols.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
}
