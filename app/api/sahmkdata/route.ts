// force redeploy
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
  const interval = searchParams.get('interval') ?? '60m';

  if (!SAHMK_KEY) {
    return NextResponse.json({ error: 'SAHMK_KEY not set' }, { status: 500 });
  }

  // ⚡ مدة الـ cache حسب نوع الـ endpoint (بالثواني)
  // الباقة الاحترافية: أسعار لحظية = 0 cache
  const cacheDuration: Record<string, number> = {
    tasi:         0,       // لحظي -- بدون cache
    quote:        0,       // لحظي -- بدون cache
    quotes:       0,       // لحظي -- بدون cache
    prices:       0,       // لحظي -- بدون cache
    gainers:      30,      // 30 ثانية
    losers:       30,      // 30 ثانية
    volume:       30,      // 30 ثانية
    ohlcv:        60,      // دقيقة (intraday 60m)
    sectors:      60,      // دقيقة
    companies:    86400,   // 24 ساعة
    fundamentals: 21600,   // 6 ساعات
    ratios:       21600,   // 6 ساعات
    financials:   86400,   // 24 ساعة
    dividends:    86400,   // 24 ساعة
    // ── جديد: باقة احترافية ──
    fair_value:   3600,    // السعر العادل -- ساعة
    analysts:     3600,    // إجماع المحللين -- ساعة
    events:       300,     // أحداث الأسهم AI -- 5 دقائق
    signals:      60,      // إشارات متقدمة -- دقيقة
    intraday:     0,       // بيانات intraday لحظية
  };

  const maxAge = cacheDuration[endpoint] ?? 0;
  const staleAge = maxAge > 0 ? maxAge * 3 : 0;

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
        '3M': 90, '6M': 180, '1Y': 365,
        '3Y': 1095, '5Y': 1825,
      };
      const days = daysMap[period] ?? 90;
      const fromDate = from || new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const toDate   = to   || new Date().toISOString().slice(0, 10);
      url = `${SAHMK_BASE}/historical/${sym}/?from=${fromDate}&to=${toDate}`;

    } else if (endpoint === 'intraday') {
      // ── جديد: بيانات Intraday بـ 60m (حتى 90 يوم) ──
      const fromDate = from || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const toDate   = to   || new Date().toISOString().slice(0, 10);
      url = `${SAHMK_BASE}/historical/${sym}/?from=${fromDate}&to=${toDate}&interval=${interval}`;

    } else if (endpoint === 'tasi') {
      url = `${SAHMK_BASE}/market/summary/?index=TASI`;

    } else if (endpoint === 'gainers') {
      url = `${SAHMK_BASE}/market/gainers/?limit=20&index=TASI`;

    } else if (endpoint === 'losers') {
      url = `${SAHMK_BASE}/market/losers/?limit=20&index=TASI`;

    } else if (endpoint === 'volume') {
      url = `${SAHMK_BASE}/market/volume/?limit=20&index=TASI`;

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
      url = `${SAHMK_BASE}/financials/${sym}/?type=all&period=annual&history=5y`;

    } else if (endpoint === 'dividends') {
      url = `${SAHMK_BASE}/dividends/${sym}/`;

    // ── Endpoints جديدة -- الباقة الاحترافية ──
    } else if (endpoint === 'fair_value') {
      url = `${SAHMK_BASE}/analytics/fair-value/${sym}/`;

    } else if (endpoint === 'analysts') {
      url = `${SAHMK_BASE}/analytics/consensus/${sym}/`;

    } else if (endpoint === 'events') {
      url = `${SAHMK_BASE}/events/${sym}/`;

    } else if (endpoint === 'signals') {
      url = `${SAHMK_BASE}/analytics/signals/${sym}/`;

    } else {
      return NextResponse.json({ error: 'Unknown endpoint' }, { status: 400 });
    }

    const res = await fetch(url, {
      headers,
      // لا يوجد timeout مصطنع -- الباقة الاحترافية سريعة
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      return new NextResponse(
        JSON.stringify({ error: `sahmk error ${res.status}`, detail: text }),
        {
          status: res.status,
          headers: {
            'Cache-Control': 'no-store',
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    }

    const text = await res.text();

    // الأسعار اللحظية: no-cache كامل
    const cacheHeader = maxAge === 0
      ? 'no-store, no-cache, must-revalidate'
      : `public, s-maxage=${maxAge}, stale-while-revalidate=${staleAge}`;

    return new NextResponse(text, {
      status: 200,
      headers: {
        'Cache-Control': cacheHeader,
        'Content-Type': 'application/json; charset=utf-8',
      },
    });

  } catch (err: any) {
    return NextResponse.json(
      {
        error: 'Proxy failed',
        name: err.name,
        message: err.message,
      },
      { status: 500 }
    );
  }
}
