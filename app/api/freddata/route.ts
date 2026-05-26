// FRED macro data proxy -- oil (WTI) + VIX
import { NextRequest, NextResponse } from 'next/server'; 

export const runtime = 'nodejs';

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const FRED_KEY  = process.env.FRED_API_KEY ?? '';

// سلاسل FRED المستخدمة (نفط WTI يومي + VIX يومي)
const SERIES: Record<string, string> = {
  oil: 'DCOILWTICO',  // Crude Oil WTI -- $/barrel, daily
  vix: 'VIXCLS',      // CBOE Volatility Index, daily
};


// جلب أحدث قيمة رقمية صالحة لسلسلة واحدة
async function fetchLatest(seriesId: string): Promise<number | null> {
  // sort_order=desc + limit=5: نأخذ آخر 5 ونتخطى الفراغات (FRED يضع "." للعطلات)
  const url = `${FRED_BASE}?series_id=${seriesId}&api_key=${FRED_KEY}`
            + `&file_type=json&sort_order=desc&limit=5`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  const obs = Array.isArray(data?.observations) ? data.observations : [];
  for (const o of obs) {
    const v = parseFloat(o?.value);
    if (!isNaN(v) && v > 0) return v;  // أول قيمة صالحة (تتخطى ".")
  }
  return null;
}

export async function GET(_req: NextRequest) {
  if (!FRED_KEY) {
    return NextResponse.json({ error: 'FRED_API_KEY not set' }, { status: 500 });
  }

  // FRED يومي → cache 12 ساعة (43200s)، stale 24 ساعة
  const maxAge   = 43200;
  const staleAge = 86400;

  try {
    const [oil, vix] = await Promise.all([
      fetchLatest(SERIES.oil),
      fetchLatest(SERIES.vix),
    ]);

    // إن فشلت كلتاهما → خطأ (المحرك سيبقى على قيم MACRO اليدوية)
    if (oil === null && vix === null) {
      return new NextResponse(
        JSON.stringify({ error: 'FRED returned no valid data' }),
        {
          status: 502,
          headers: {
            'Cache-Control': 'public, s-maxage=300',
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    }

    const body = JSON.stringify({
      oilPrice: oil,   // null إن فشلت -- العميل يتجاهل null ويبقي اليدوي
      vix: vix,
      updatedAt: new Date().toISOString(),
      source: 'FRED',
    });

    return new NextResponse(body, {
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
      {
        error: 'FRED proxy failed',
        name: err.name,
        message: err.message,
        stack: err.stack?.split('\n').slice(0, 5).join(' | '),
      },
      { status: 500 }
    );
  }
}

