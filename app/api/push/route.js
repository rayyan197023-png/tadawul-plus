export const runtime = 'nodejs';

import { createRequire } from 'module';
const require2 = createRequire(import.meta.url);
const webpush = require2('web-push');

const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC  ?? '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE ?? '';
const VAPID_EMAIL   = 'mailto:admin@tadawul-plus.vercel.app';
const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_KEY  = process.env.NEXT_PUBLIC_SUPABASE_KEY ?? '';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
}

function sbHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  };
}

export async function POST(req) {
  try {
    const { action, subscription, title, body } = await req.json();

    if (action === 'subscribe') {
      if (!subscription?.endpoint) {
        return Response.json({ error: 'invalid subscription' }, { status: 400 });
      }
      await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
        method: 'POST',
        headers: { ...sbHeaders(), 'Prefer': 'return=minimal,resolution=ignore-duplicates' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          subscription: subscription,
        }),
      });
      console.log('[Push] subscribed:', subscription.endpoint.slice(0, 50));
      return Response.json({ ok: true });
    }

    if (action === 'notify') {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=subscription`, {
        headers: { ...sbHeaders(), 'Prefer': 'return=representation' },
      });
      const rows = await res.json();

      const payload = JSON.stringify({
        title: title || 'تداول+',
        body:  body  || 'حدث جديد في السوق',
      });

      const results = { sent: 0, failed: 0 };
      for (const row of rows) {
        try {
          await webpush.sendNotification(row.subscription, payload);
          results.sent++;
        } catch(e) {
          results.failed++;
          await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(row.subscription.endpoint)}`, {
            method: 'DELETE',
            headers: sbHeaders(),
          });
        }
      }

      console.log('[Push] notify results:', results);
      return Response.json(results);
    }

    return Response.json({ error: 'unknown action' }, { status: 400 });

  } catch(e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?select=id`, {
      headers: { ...sbHeaders(), 'Prefer': 'return=representation' },
    });
    const rows = await res.json();
    return Response.json({ 
      publicKey: VAPID_PUBLIC,
      count: Array.isArray(rows) ? rows.length : 0,
    });
  } catch(e) {
    return Response.json({ publicKey: VAPID_PUBLIC, count: 0, error: e.message });
  }
}
