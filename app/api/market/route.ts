import { NextRequest, NextResponse } from 'next/server';

const SAHMK_BASE = 'https://app.sahmk.sa/api/v1';
const _VERSION = '2.0'; // force redeploy
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
    'X-API-Key': SAHMK_KEY,
  };

  try {
    let url = '';

    // ── سعر سهم واحد
    if (endpoint === 'quote') {
      url = `${SAHMK_BASE}/quote/${sym}/`;
    }
    // ── أسعار متعددة (طلب واحد)
    else if (endpoint === 'quotes') {
      url = `${SAHMK_BASE}/quotes/?symbols=${symbols}`;
    }
    // ── شموع OHLCV
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
      url = `${SAHMK_BASE}/historical/${sym}/?from=${fromDate}&to=${toDate}`;
    }
    // ── تاسي
    else if (endpoint === 'tasi') {
      url = `${SAHMK_BASE}/market/summary/?index=TASI`;
    }
    // ── أعلى الرابحين
    else if (endpoint === 'gainers') {
      url = `${SAHMK_BASE}/market/gainers/?limit=10&index=TASI`;
    }
    // ── أعلى الخاسرين
    else if (endpoint === 'losers') {
      url = `${SAHMK_BASE}/market/losers/?limit=10&index=TASI`;
    }
    // ── الأكثر تداولاً
    else if (endpoint === 'volume') {
      url = `${SAHMK_BASE}/market/volume/?limit=10&index=TASI`;
    }
    // ── القطاعات
    else if (endpoint === 'sectors') {
      url = `${SAHMK_BASE}/market/sectors/?index=TASI`;
    }
    // ── قائمة الشركات
    else if (endpoint === 'companies') {
      url = `${SAHMK_BASE}/companies/?market=${market}&limit=${limit}`;
    }
    // ── أساسيات الشركة
    else if (endpoint === 'fundamentals') {
      url = `${SAHMK_BASE}/company/${sym}/`;
    }
    // ── بيانات مالية
    else if (endpoint === 'financials') {
      url = `${SAHMK_BASE}/financials/${sym}/?type=all&period=annual&history=3y`;
    }
    // ── توزيعات أرباح
    else if (endpoint === 'dividends') {
      url = `${SAHMK_BASE}/dividends/${sym}/`;
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
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: 'Proxy failed', detail: err.message },
      { status: 500 }
    );
  }
}
