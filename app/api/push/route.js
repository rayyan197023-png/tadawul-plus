export const runtime = 'nodejs';

import webpush from 'web-push';

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC  ?? '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE ?? '';
const VAPID_EMAIL   = 'mailto:admin@tadawul-plus.vercel.app';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

// حفظ subscriptions (مؤقت في الذاكرة)
const subscriptions = new Map();

export async function POST(req) {
  try {
    const { action, subscription, title, body } = await req.json();

    // اشتراك جديد
    if (action === 'subscribe') {
      if (!subscription?.endpoint) {
        return Response.json({ error: 'invalid subscription' }, { status: 400 });
      }
      subscriptions.set(subscription.endpoint, subscription);
      console.log('[Push] subscribed:', subscription.endpoint.slice(0, 50));
      return Response.json({ ok: true, count: subscriptions.size });
    }

    // إرسال إشعار لجميع المشتركين
    if (action === 'notify') {
      const payload = JSON.stringify({
        title: title || 'تداول+',
        body:  body  || 'حدث جديد في السوق',
      });

      const results = { sent: 0, failed: 0 };
      for (const sub of subscriptions.values()) {
        try {
          await webpush.sendNotification(sub, payload);
          results.sent++;
        } catch(e) {
          results.failed++;
          subscriptions.delete(sub.endpoint);
        }
      }
      return Response.json(results);
    }

    return Response.json({ error: 'unknown action' }, { status: 400 });

  } catch(e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return Response.json({ 
    publicKey: VAPID_PUBLIC,
    count: subscriptions.size,
  });
}
