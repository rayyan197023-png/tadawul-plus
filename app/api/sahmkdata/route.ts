// sahmk-proxy -- النسخة الكاملة مع WebSocket + Webhooks
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const SAHMK_BASE = 'https://app.sahmk.sa/api/v1';
const SAHMK_KEY  = process.env.SAHMK_KEY ?? '';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sym        = searchParams.get('sym')        ?? '';
  const endpoint   = searchParams.get('endpoint')   ?? 'quote';
  const period     = searchParams.get('period')     ?? '3M';
  const from       = searchParams.get('from')       ?? '';
  const to         = searchParams.get('to')         ?? '';
  const symbols    = searchParams.get('symbols')    ?? '';
  const market     = searchParams.get('market')     ?? 'TASI';
  const limit      = searchParams.get('limit')      ?? '300';
  const interval   = searchParams.get('interval')   ?? '60m';
  const metrics    = searchParams.get('metrics')    ?? 'extended';
  const history    = searchParams.get('history')    ?? '5y';
  const type       = searchParams.get('type')       ?? 'all';
  const importance = searchParams.get('importance') ?? '';
  // ✨ تحقق من الرمز -- يمنع تغيير المسار عبر قيم مثل ../
  if (sym && !/^[0-9]{4}$/.test(sym)) {
    return NextResponse.json({ error: 'رمز غير صالح' }, { status: 400 });
  }
    // ✨ تحقق من قائمة الرموز -- أربعة أرقام مفصولة بفواصل فقط
  if (symbols && !/^[0-9]{4}(,[0-9]{4})*$/.test(symbols)) {
    return NextResponse.json({ error: 'قائمة رموز غير صالحة' }, { status: 400 });
  }
  if (!SAHMK_KEY) {
    return NextResponse.json({ error: 'SAHMK_KEY not set' }, { status: 500 });
  }

  const cacheDuration: Record<string, number> = {
    tasi:         0,
    quote:        0,
    quotes:       0,
    prices:       0,
    gainers:      30,
    losers:       30,
    volume:       30,
    value:        30,
    ohlcv:        60,
    sectors:      60,
    companies:    86400,
    fundamentals: 21600,
    ratios:       21600,
    financials:   86400,
    dividends:    86400,
    fair_value:   3600,
    analysts:     3600,
    events:       300,
    signals:      60,
    intraday:     0,
    compare:      300,
  };

  const maxAge   = cacheDuration[endpoint] ?? 0;
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
      const days     = daysMap[period] ?? 90;
      const fromDate = from || new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const toDate   = to   || new Date().toISOString().slice(0, 10);
      url = `${SAHMK_BASE}/historical/${sym}/?from=${fromDate}&to=${toDate}`;

    } else if (endpoint === 'intraday') {
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

    } else if (endpoint === 'value') {
      url = `${SAHMK_BASE}/market/value/?limit=20&index=TASI`;

    } else if (endpoint === 'sectors') {
      url = `${SAHMK_BASE}/market/sectors/?index=TASI`;

    } else if (endpoint === 'companies') {
      const offset = searchParams.get('offset') ?? '0';
      url = `${SAHMK_BASE}/companies/?market=${market}&limit=${limit}&offset=${offset}`;

    } else if (endpoint === 'fundamentals') {
      url = `${SAHMK_BASE}/company/${sym}/`;

    } else if (endpoint === 'ratios') {
      url = `${SAHMK_BASE}/analytics/ratios/${sym}/?history=${history}&period=${period === '3M' ? 'quarterly' : 'annual'}&metrics=${metrics}`;

    } else if (endpoint === 'financials') {
      const finPeriod = searchParams.get('fin_period') ?? 'annual';
      url = `${SAHMK_BASE}/financials/${sym}/?type=${type}&period=${finPeriod}&history=${history}&metrics=${metrics}`;

    } else if (endpoint === 'dividends') {
      url = `${SAHMK_BASE}/dividends/${sym}/?limit=${limit}`;

    } else if (endpoint === 'fair_value') {
      url = `${SAHMK_BASE}/analytics/fair-value/${sym}/`;

    } else if (endpoint === 'analysts') {
      url = `${SAHMK_BASE}/analytics/consensus/${sym}/`;

    } else if (endpoint === 'events') {
      const evType = searchParams.get('ev_type') ?? '';
      let evUrl = `${SAHMK_BASE}/events/?symbol=${sym}&limit=${limit}`;
      if (importance) evUrl += `&importance=${importance}`;
      if (evType)     evUrl += `&type=${evType}`;
      url = evUrl;

    } else if (endpoint === 'liquidity') {
      url = `${SAHMK_BASE}/quote/${sym}/`;

    } else if (endpoint === 'signals') {
      url = `${SAHMK_BASE}/analytics/signals/${sym}/`;

    } else if (endpoint === 'compare') {
      url = `${SAHMK_BASE}/analytics/compare/?symbols=${symbols}&metrics=${metrics}`;

    } else {
      return NextResponse.json({ error: 'Unknown endpoint' }, { status: 400 });
    }

    const res = await fetch(url, { headers, cache: 'no-store' });

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
      { error: 'Proxy failed', name: err.name, message: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!SAHMK_KEY) {
    return NextResponse.json({ error: 'SAHMK_KEY not set' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'register_webhook') {
      const { url: webhookUrl, name } = body;
      if (!webhookUrl) {
        return NextResponse.json({ error: 'url is required' }, { status: 400 });
      }

      const res = await fetch(`${SAHMK_BASE}/webhooks/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': SAHMK_KEY,
        },
        body: JSON.stringify({ url: webhookUrl, name: name ?? 'Tadawul Plus Hook' }),
      });

      const data = await res.text();
      return new NextResponse(data, {
        status: res.status,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json(
      { error: 'Proxy failed', message: err.message },
      { status: 500 }
    );
  }
}

