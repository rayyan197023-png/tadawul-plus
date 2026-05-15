/**
 * @module services/api/sahmkFundamentalsApi
 * @description جلب البيانات الأساسية الحقيقية من sahmk.sa
 * يُحدِّث STOCKS_MAP تلقائياً عند تحميل التطبيق
 */

const SAHMK_BASE = 'https://app.sahmk.sa/api/v1';
const SAHMK_KEY = process.env.NEXT_PUBLIC_SAHMK_KEY ?? '';

// ─── Helper: جلب مع timeout ─────────────────────────
async function sahmkFetch(path) {
  const res = await fetch(`${SAHMK_BASE}${path}`, {
    headers: { 'X-API-Key': SAHMK_KEY },
    next: { revalidate: 86400 }, // cache يوم كامل
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ─── تحويل بيانات company إلى شكل STOCKS ───────────
function mapCompanyData(data) {
  if (!data) return {};
  return {
    mktCap:  data.market_cap        ?? null,
    pe:      data.pe_ratio          ?? null,
    pb:      data.pb_ratio          ?? null,
    eps:     data.eps               ?? null,
    beta:    data.beta              ?? null,
    w52h:    data.week52_high       ?? null,
    w52l:    data.week52_low        ?? null,
    divY:    data.dividend_yield    ?? null,
  };
}

// ─── تحويل بيانات financials إلى شكل STOCKS ─────────
function mapFinancialsData(data) {
  if (!data) return {};

  const income = data.income_statements?.[0] ?? {};

  return {
    freeCashFlow: income.net_income    ?? null,
    revGrw:       income.total_revenue ?? null,
    oilCorr:      null,
    target:       null,
  };
}

// ════════════════════════════════════════════════════
// الدالة الرئيسية: جلب fundamentals لسهم واحد
// ════════════════════════════════════════════════════

export async function fetchFundamentals(symbol) {
  try {
    const [company, financials] = await Promise.allSettled([
      sahmkFetch(`/company/${symbol}/`),
      sahmkFetch(`/financials/${symbol}/?type=all&period=annual&history=3y&result=latest`),
    ]);

    const companyData = company.status === 'fulfilled'
      ? mapCompanyData(company.value)
      : {};

    const financialsData = financials.status === 'fulfilled'
      ? mapFinancialsData(financials.value)
      : {};

    return { ...companyData, ...financialsData };

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
