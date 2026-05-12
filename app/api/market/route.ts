import { NextRequest, NextResponse } from 'next/server';

const SAHMK_BASE = 'https://app.sahmk.sa/api/v1';
const SAHMK_KEY  = process.env.SAHMK_KEY ?? '';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sym      = searchParams.get('sym')      ?? '';
  const endpoint = searchParams.get('endpoint') ?? 'quote';
  const period   = searchParams.get('period')   ?? '3M';
  const from     = searchParams.get('from')     ?? '';
  const to       = searchParams.get('to')       ?? '';

  if (!SAHMK_KEY) {
    return NextResponse.json({ error: 'SAHMK_KEY not set' }, { status: 500 });
  }

  const headers = {
    'Accept': 'application/json',
    'X-API-Key': SAHMK_KEY,
  };

  try {
    let url = '';

    if (endpoint === 'quote') {
      url = `${SAHMK_BASE}/quote/${sym}`;
    }
    else if (endpoint === 'ohlcv') {
      const daysMap: Record<string, number> = {
        '1D': 1, '1W': 7, '1M': 30,
        '3M': 90, '6M': 180, '1Y': 365
      };
      const days = daysMap[period] ?? 90;
      const fromDate = from || new Date(
        Date.now() - days * 86400000
      ).toISOString().slice(0, 10);
      const toDate = to || new Date().toISOString().slice(0, 10);
      url = `${SAHMK_BASE}/historical/${sym}?from=${fromDate}&to=${toDate}`;
    }
    else if (endpoint === 'tasi') {
      url = `${SAHMK_BASE}/indices`;
    }
    else if (endpoint === 'fundamentals') {
      url = `${SAHMK_BASE}/company/${sym}`;
    }
    else if (endpoint === 'sectors') {
      url = `${SAHMK_BASE}/sectors`;
    }
    else {
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

    const data = await res.json();
return NextResponse.json({
  _debug: { url, status: res.status },
  data,
}, {
  headers: { 'Cache-Control': 'no-store' },
});


  } catch (err: any) {
    return NextResponse.json(
      { error: 'Proxy failed', detail: err.message },
      { status: 500 }
    );
  }
}
