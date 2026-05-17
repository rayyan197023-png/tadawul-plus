import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SAHMK_BASE = 'https://app.sahmk.sa/api/v1';
const SAHMK_KEY  = process.env.SAHMK_KEY ?? '';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sym      = searchParams.get('sym')      ?? '';
  const endpoint = searchParams.get('endpoint') ?? 'quote';
  const period   = searchParams.get('period')   ?? '3M';
  const from     = searchParams.get('from')     ?? '';
  const to       = searchParams.get('to')       ?? '';
  const symbols  = searchParams.get('symbols')  ?? '';
  const market   = searchParams.get('market')   ?? 'TASI';
  const limit    = searchParams.get('limit')    ?? '300';

  if (!SAHMK_KEY) {
    return NextResponse.json({ error: 'SAHMK_KEY not set' }, { status: 500 });
  }

  const headers = {
    'Accept': 'application/json',
    'Accept-Charset': 'utf-8',
    'X-API-Key': SAHMK_KEY,
  };

  try {
    let url = '';

    if (endpoint === 'quote') {
      url = `${SAHMK_BASE}/quote/${sym}/`;
    } else if (endpoint === 'quotes' || endpoint === 'prices') {
      url = `${SAHMK_BASE}/quotes/?symbols=${symbols}`;
    } else if (endpoint === 'ohlcv') {
      const daysMap: Record<string, number> = {
        '1D': 1, '1W': 7, '1M': 30,
        '3M': 90, '6M': 180, '1Y': 365
      };
      const days = daysMap[period] ?? 90;
      const fromDate = from || new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const toDate   = to   || new Date().toISOString().slice(0, 10);
      url = `${SAHMK_BASE}/historical/${sym}/?from=${fromDate}&to=${toDate}`;
    } else if (endpoint === 'tasi') {
      url = `${SAHMK_BASE}/market/summary/?index=TASI`;
    } else if (endpoint === 'gainers') {
      url = `${SAHMK_BASE}/market/gainers/?limit=10&index=TASI`;
    } else if (endpoint === 'losers') {
      url = `${SAHMK_BASE}/market/losers/?limit=10&index=TASI`;
    } else if (endpoint === 'volume') {
      url = `${SAHMK_BASE}/market/volume/?limit=10&index=TASI`;
    } else if (endpoint === 'sectors') {
      url = `${SAHMK_BASE}/market/sectors/?index=TASI`;
    } else if (endpoint === 'companies') {
      const offset = searchParams.get('offset') ?? '0';
      url = `${SAHMK_BASE}/companies/?market=${market}&limit=${limit}&offset=${offset}`;
    } else if (endpoint === 'fundamentals') {
      url = `${SAHMK_BASE}/company/${sym}/`;
    } else if (endpoint === 'ratios') {
      url = `${SAHMK_BASE}/analytics/ratios/${sym}/`;
    } else if (endpoint === 'financials') {
      url = `${SAHMK_BASE}/financials/${sym}/?type=all&period=annual&history=3y`;
    } else if (endpoint === 'dividends') {
      url = `${SAHMK_BASE}/dividends/${sym}/`;
    } else {
      return NextResponse.json({ error: 'Unknown endpoint' }, { status: 400 });
    }

    const res = await fetch(url, { headers });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `sahmk error ${res.status}`, detail: text },
        { status: res.status }
      );
    }

    // نأخذ النص كما هو من sahmk بدون أي محاولة لتعديل الترميز
    const text = await res.text();

    // نرجع النص الخام مباشرة (Next.js لن يحاول re-serialize)
    return new NextResponse(text, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
      },
    });

    } catch (err: any) {
    console.error('PROXY ERROR:', err.name, '|', err.message, '|', err.stack);
    return NextResponse.json(
      {
        error: 'Proxy failed',
        name: err.name,
        message: err.message,
        stack: err.stack?.split('\n').slice(0, 5).join(' | '),
      },
      { status: 500 }
    );
  }
}
