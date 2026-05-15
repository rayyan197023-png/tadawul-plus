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
function mapCompanyData(data) {
  if (!data) return {};
  return {
    mktCap: data.market_cap    ?? null,
    pe:     data.pe_ratio      ?? null,
    pb:     data.pb_ratio      ?? null,
    eps:    data.eps           ?? null,
    beta:   data.beta          ?? null,
    w52h:   data.week52_high   ?? null,
    w52l:   data.week52_low    ?? null,
    divY:   data.dividend_yield ?? null,
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
    debt:         r.debt_ratio            ?? null,
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
    const [company, ratios] = await Promise.allSettled([
      sahmkFetch(`/company/${symbol}/`),
      sahmkFetch(`/analytics/ratios/${symbol}/`),
    ]);

    const companyData = company.status === 'fulfilled'
      ? mapCompanyData(company.value)
      : {};

    const ratiosData = ratios.status === 'fulfilled'
      ? mapRatiosData(ratios.value)
      : {};

    return { ...companyData, ...ratiosData };

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
