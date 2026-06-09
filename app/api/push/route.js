export const runtime = 'nodejs';

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC  ?? '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE ?? '';

// حفظ subscriptions في الذاكرة (مؤقت)
const subscriptions = new Map();

export async function POST(req) {
  try {
    const { action, subscription, notification } = await req.json();

    if (action === 'subscribe') {
      subscriptions.set(subscription.endpoint, subscription);
      return Response.json({ ok: true });
    }

    if (action === 'notify') {
      // إرسال لجميع المشتركين
      const results = [];
      for (const sub of subscriptions.values()) {
        results.push(sub.endpoint);
      }
      return Response.json({ sent: results.length });
    }

    return Response.json({ error: 'unknown action' }, { status: 400 });
  } catch(e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ 
    publicKey: VAPID_PUBLIC,
    count: subscriptions.size 
  });
}
