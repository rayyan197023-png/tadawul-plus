// FRED macro data proxy -- oil (WTI) + VIX  [+ history for global markets]
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';
const FRED_KEY  = process.env.FRED_API_KEY ?? '';

const SERIES: Record<string, string> = {
  oil: 'DCOILWTICO',
  vix: 'VIXCLS',
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
    const [oilHist, vixHist] = await Promise.all([
      fetchSeries(SERIES.oil, 40),
      fetchSeries(SERIES.vix, 40),
    ]);

    const oil = oilHist.length ? oilHist[oilHist.length - 1] : null;
    const vix = vixHist.length ? vixHist[vixHist.length - 1] : null;

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
      oilPrice: oil,
      vix: vix,
      oilHistory: oilHist,
      vixHistory: vixHist,
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
