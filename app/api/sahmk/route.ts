import { NextRequest, NextResponse } from 'next/server';

const SAHMK_BASE = 'https://api.sahmk.sa/v1';
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

  try {
    let url = '';

    // ── أسعار حية
    if (endpoint === 'quote') {
      url = `${SAHMK_BASE}/quotes?symbols=${sym}&apikey=${SAHMK_KEY}`;
    }
    // ── شموع OHLCV تاريخية
    else if (endpoint === 'ohlcv') {
      const today = new Date().toISOString().slice(0, 10);
      const daysMap: Record<string, number> = {
        '1D': 1, '1W': 7, '1M': 30,
        '3M': 90, '6M': 180, '1Y': 365
      };
      const days = daysMap[period] ?? 90;
      const fromDate = from || new Date(
        Date.now() - days * 86400000
      ).toISOString().slice(0, 10);
      const toDate = to || today;
      url = `${SAHMK_BASE}/historical?symbol=${sym}&from=${fromDate}&to=${toDate}&apikey=${SAHMK_KEY}`;
    }
    // ── بيانات تاسي
    else if (endpoint === 'tasi') {
      url = `${SAHMK_BASE}/indices?apikey=${SAHMK_KEY}`;
    }
    // ── أساسيات الشركة (P/E, EPS)
    else if (endpoint === 'fundamentals') {
      url = `${SAHMK_BASE}/fundamentals?symbol=${sym}&apikey=${SAHMK_KEY}`;
    }
    // ── القطاعات
    else if (endpoint === 'sectors') {
      url = `${SAHMK_BASE}/sectors?apikey=${SAHMK_KEY}`;
    }
    else {
      return NextResponse.json({ error: 'Unknown endpoint' }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `sahmk error ${res.status}`, detail: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=60' },
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: 'Proxy failed', detail: err.message },
      { status: 500 }
    );
  }
}
