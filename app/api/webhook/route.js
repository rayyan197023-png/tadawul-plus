export const runtime = 'nodejs';

const SAHMK_BASE = 'https://app.sahmk.sa/api/v1';
const SAHMK_KEY  = process.env.SAHMK_KEY ?? '';

export async function POST(req) {
  try {
    const body = await req.json();
    const { event_type, symbol, stock_name, sentiment, description } = body;

    const title = `⚡ ${stock_name || symbol} -- ${event_type || 'حدث جديد'}`;
    const msg   = description || 'حدث جديد في السوق السعودي';

    console.log('[Webhook]', title, msg);

    // إرسال Push Notification لجميع المشتركين
    if (SAHMK_KEY) {
      try {
        const subsRes = await fetch(`${SAHMK_BASE}/push-subscriptions`, {
          headers: { 'X-API-Key': SAHMK_KEY }
        });
      } catch(e) {}
    }
// إرسال Push Notification
try {
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://tadawul-plus.vercel.app'}/api/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'notify',
      title: title,
      body: msg,
    }),
  });
} catch(e) {}

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
