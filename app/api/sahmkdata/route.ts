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

  if (!SAHMK_KEY) {
    return NextResponse.json({ error: 'SAHMK_KEY not set' }, { status: 500 });
  }
  
  // ⚡ مدة الـ cache حسب نوع الـ endpoint (بالثواني)
  const cacheDuration: Record<string, number> = {
    tasi:         60,      // 1 دقيقة (سعر التاسي اللحظي)
    quote:        60,      // 1 دقيقة (سعر سهم واحد)
    quotes:       60,      // 1 دقيقة (مجموعة أسعار)
    prices:       60,      // 1 دقيقة
    gainers:      300,     // 5 دقائق (أعلى الرابحين)
    losers:       300,     // 5 دقائق (أعلى الخاسرين)
    volume:       300,     // 5 دقائق (الأعلى تداولاً)
    ohlcv:        300,     // 5 دقائق (الشموع)
    sectors:      3600,    // ساعة (القطاعات لا تتغير كثيراً)
    companies:    86400,   // 24 ساعة (قائمة الشركات)
    fundamentals: 21600,   // 6 ساعات (الأساسيات تتحدث ربعياً)
    ratios:       21600,   // 6 ساعات
    financials:   86400,   // 24 ساعة (البيانات المالية)
    dividends:    86400,   // 24 ساعة (التوزيعات)
  };

  // ─────────────────────────────────────────────
  // الكشف عن حالة السوق السعودي (KSA timezone UTC+3)
  // أيام التداول: الأحد إلى الخميس (0-4 في getDay)
  // نشاط السوق: 09:30 - 15:30 (شامل المزادات)
  // ─────────────────────────────────────────────
  function getMarketStatus() {
    const now = new Date();
    // تحويل لتوقيت الرياض (UTC+3)
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const ksa = new Date(utc + (3 * 3600000));
    const day = ksa.getDay(); // 0=أحد، 4=خميس، 5=جمعة، 6=سبت
    const hour = ksa.getHours();
    const min = ksa.getMinutes();
    const timeInMin = hour * 60 + min;
    const isWeekday = day >= 0 && day <= 4; // الأحد-الخميس
    const isMarketHours = timeInMin >= 570 && timeInMin <= 930; // 09:30-15:30
    const isOpen = isWeekday && isMarketHours;
    // حساب الوقت حتى افتتاح السوق التالي بالثواني
    let secondsUntilOpen = 0;
    if (!isOpen) {
      const next = new Date(ksa);
      next.setHours(9, 30, 0, 0);
      // إذا تجاوزنا 09:30 اليوم → اليوم التالي
      if (timeInMin >= 570) next.setDate(next.getDate() + 1);
      // تخطّي الجمعة والسبت
      while (next.getDay() === 5 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1);
      }
      secondsUntilOpen = Math.floor((next.getTime() - ksa.getTime()) / 1000);
    }
    return { isOpen, secondsUntilOpen };
  }

  const marketStatus = getMarketStatus();
  let maxAge = cacheDuration[endpoint] ?? 60;
  // إذا السوق مُغلق، أطل الـ cache حتى الافتتاح (للأسعار اللحظية فقط)
  // البيانات الأساسية (companies, sectors...) تَستخدم cache الطبيعي
  const liveEndpoints = ['tasi','quote','quotes','prices','gainers','losers','volume','ohlcv'];
  if (!marketStatus.isOpen && liveEndpoints.includes(endpoint)) {
    maxAge = Math.max(maxAge, marketStatus.secondsUntilOpen);
  }
  const staleAge = maxAge * 5; // مدة stale-while-revalidate

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
        '3Y': 1095, '5Y': 1825
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
      
      // لا نحفظ الأخطاء أبداً - فقط نسمح للمُتصفّح بإعادة المحاولة
      // 429 يُحلّ بـ retry في الـ client بدلاً من إغلاق الـ cache
      return new NextResponse(
        JSON.stringify({ error: `sahmk error ${res.status}`, detail: text }),
        {
          status: res.status,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    }

    // نأخذ النص كما هو من sahmk بدون أي محاولة لتعديل الترميز
    const text = await res.text();

    // نرجع النص الخام مباشرة (Next.js لن يحاول re-serialize)
        return new NextResponse(text, {
      status: 200,
      headers: {
        'Cache-Control': `public, s-maxage=${maxAge}, stale-while-revalidate=${staleAge}`,
        'CDN-Cache-Control': `public, max-age=${maxAge}`,
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
