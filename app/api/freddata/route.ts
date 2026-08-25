// FRED macro data proxy -- 10 global series (oil, indices, rates, FX) with history
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const FRED_KEY  = process.env.FRED_API_KEY ?? '';

const SERIES: Record<string, string> = {
  // ── الأسواق العالمية (موجودة) ──
  oil:    'DCOILWTICO',
  brent:  'DCOILBRENTEU',
  natgas: 'DHHNGSP',
  vix:    'VIXCLS',
  sp500:  'SP500',
  nasdaq: 'NASDAQCOM',
  dow:    'DJIA',
  dxy:    'DTWEXBGS',
  fedrate:'DFF',
  t10:    'DGS10',
  
  // ── 🇺🇸 الاقتصاد الأمريكي (5 جديدة) ──
  cpi:       'CPIAUCSL',     // CPI - مؤشر أسعار المستهلك
  coreCpi:   'CPILFESL',     // Core CPI - بدون طعام/طاقة
  payrolls:  'PAYEMS',       // Non-Farm Payrolls
  unrate:    'UNRATE',       // معدّل البطالة
  yieldGap:  'T10Y2Y',       // منحنى العائد (10y - 2y)
  
  // ── 🇸🇦 الاقتصاد السعودي ──
  saudiGdp:      'MKTGDPSAA646NWDB',     // GDP السعوديّ (سنويّ)
  saudiCpi:      'SAUCPALTT01IXOBM',     // ✨ التضخّم الشهريّ (الصحيح!)
  saudiInflation:'SAUCPALTT01GYM',       // ✨ معدّل التضخّم السنويّ
  saudiReserves: 'TRESEGSAM194N',        // الاحتياطيّات (موجودة ✅)
};

async function fetchSeries(seriesId: string, limit: number): Promise<number[]> {
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${FRED_KEY}`
            + `&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const data = await res.json();
  const obs = Array.isArray(data?.observations) ? data.observations : [];
  const vals: number[] = [];
  for (const o of obs) {
    const v = parseFloat(o?.value);
if (!isNaN(v)) vals.push(v);
  }
  return vals.reverse();
}

export async function GET(_req: NextRequest) {
  if (!FRED_KEY) {
    return NextResponse.json({ error: 'FRED_API_KEY not set' }, { status: 500 });
  }

  const maxAge   = 43200;
  const staleAge = 86400;

  try {
const keys = Object.keys(SERIES);
const results: number[][] = [];

// Sequential fetching with delay to avoid FRED rate limiting
for (const k of keys) {
  try {
    const data = await fetchSeries(SERIES[k], 40);
    results.push(data);
  } catch (e) {
    console.error(`FRED ${k} failed:`, e);
    results.push([]);
  }
  // 100ms delay between requests
await new Promise(resolve => setTimeout(resolve, 300));
}

    const out: Record<string, any> = {};
    var anyOk = false;
    keys.forEach(function(k, i){
      var hist = results[i];
      if (hist && hist.length) {
        out[k + 'Price']   = hist[hist.length - 1];
        out[k + 'History'] = hist;
        anyOk = true;
      } else {
        out[k + 'Price']   = null;
        out[k + 'History'] = [];
      }
    });

// 🆕 احفظ قيم احتياطية معروفة (آخر مرّة عملت)
const FALLBACK_VALUES: Record<string, number> = {
  oilPrice: 97.5,
  brentPrice: 102.75,
  natgasPrice: 3.10,
  vixPrice: 15.74,
  sp500Price: 7580.06,
  nasdaqPrice: 26972.62,
  dowPrice: 51032.46,
  dxyPrice: 119.28,
  fedratePrice: 3.62,
  t10Price: 4.45,
  cpiPrice: 332.40,
  coreCpiPrice: 335.42,
  payrollsPrice: 158736,
  unratePrice: 4.3,
  yieldGapPrice: 0.47,
  saudiGdpPrice: 1239804533333.33,
  saudiCpiPrice: 117.28,
  saudiInflationPrice: 2.33,
  saudiReservesPrice: 365830.33,
};

// ✨ نُسجّل أي قيم جاءت من الاحتياطي -- لا تُعرض كبيانات FRED حيّة
const _fallbackUsed: string[] = [];
Object.keys(FALLBACK_VALUES).forEach(function(k){
  if (out[k] === null) {
    out[k] = FALLBACK_VALUES[k];
    _fallbackUsed.push(k);
  }
});
out.fallbackFields = _fallbackUsed;
out.isPartialFallback = _fallbackUsed.length > 0;

out.oilPrice = out.oilPrice ?? null;
out.vix      = out.vixPrice ?? null;

    if (!anyOk) {
      return new NextResponse(
        JSON.stringify({ error: 'FRED returned no valid data' }),
        { status: 502, headers: {
          'Cache-Control': 'public, s-maxage=300',
          'Content-Type': 'application/json; charset=utf-8',
        }}
      );
    }

// ✨ Fallback: إذا oil=null، استخدم brent أو natgas تقريبياً
if (out.oilPrice === null && out.brentPrice !== null) {
  out.oilPrice = out.brentPrice * 0.96; // WTI ≈ Brent × 0.96
}

// إذا كل النفط مفقود، استخدم آخر قيمة معروفة (97-98$)
if (out.oilPrice === null) {
  out.oilPrice = 97.5; // قيمة واقعية حاليّة
}

// تأكّد من النسخ النهائيّ
out.vix = out.vixPrice ?? null;

    out.updatedAt = new Date().toISOString();
    out.source = 'FRED';

    return new NextResponse(JSON.stringify(out), {
      status: 200,
      headers: {
        'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${staleAge}`,
        'CDN-Cache-Control': `public, max-age=${maxAge}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
    });

  } catch (err: any) {
    console.error('FRED PROXY ERROR:', err.name, '|', err.message);
    return NextResponse.json(
      { error: 'FRED proxy failed', name: err.name, message: err.message,
        stack: err.stack?.split('\n').slice(0, 5).join(' | ') },
      { status: 500 }
    );
  }
}
