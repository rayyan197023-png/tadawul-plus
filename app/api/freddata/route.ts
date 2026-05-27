// FRED macro data proxy -- 10 global series (oil, indices, rates, FX) with history
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const FRED_KEY  = process.env.FRED_API_KEY ?? '';

const SERIES: Record<string, string> = {
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
    if (!isNaN(v) && v > 0) vals.push(v);
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
    const results = await Promise.all(
      keys.map(function(k){ return fetchSeries(SERIES[k], 40); })
    );

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
