export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const body = await req.json();
    const { event_type, symbol, stock_name, sentiment, description } = body;

    // بناء الإشعار
    const title = `⚡ ${stock_name || symbol} -- ${event_type || 'حدث جديد'}`;
    const msg   = description || 'حدث جديد في السوق السعودي';

    // حفظ الحدث في KV أو نرسله للمستخدمين
    // في الوقت الحالي نرجع 200 فقط
    console.log('[Webhook]', title, msg);

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
