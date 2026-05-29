// src/app/api/yahoo/route.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * Yahoo Finance Historical Data Proxy
 * 
 * يحلّ مشكلة CORS بجلب البيانات من خادم Vercel بدل المتصفّح.
 * 
 * مثال للاستخدام من العميل:
 *   /api/yahoo?symbol=2222.SR&range=10y
 * 
 * المدخلات:
 *   - symbol: رمز السهم بصيغة Yahoo (مثل 2222.SR)
 *   - range: 1y | 2y | 5y | 10y | max
 *   - interval: 1d (افتراضي) أو 1wk أو 1mo
 * 
 * المخرجات: JSON من Yahoo Chart API
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const range = searchParams.get('range') || '10y';
  const interval = searchParams.get('interval') || '1d';

  // التحقّق من المدخلات
  if (!symbol) {
    return NextResponse.json(
      { error: 'symbol مطلوب' },
      { status: 400 }
    );
  }

  // التحقّق من صيغة الرمز (يجب أن ينتهي بـ .SR للسوق السعودي)
  if (!symbol.match(/^[0-9]{4}\.SR$/i)) {
    return NextResponse.json(
      { error: 'الرمز يجب أن يكون بصيغة XXXX.SR' },
      { status: 400 }
    );
  }

  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`;
    
    const response = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      // تخزين مؤقّت لمدّة ساعة (نفس البيانات لا تتغيّر)
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Yahoo رفض الطلب: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'فشل الاتصال بـ Yahoo: ' + (error.message || 'خطأ غير معروف') },
      { status: 500 }
    );
  }
}
