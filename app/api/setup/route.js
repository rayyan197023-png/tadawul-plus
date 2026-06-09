export const runtime = 'nodejs';

const SAHMK_BASE = 'https://app.sahmk.sa/api/v1';
const SAHMK_KEY  = process.env.SAHMK_KEY ?? '';

export async function GET() {
  if (!SAHMK_KEY) {
    return Response.json({ error: 'no key' }, { status: 500 });
  }

  try {
    const res = await fetch(`${SAHMK_BASE}/webhooks/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': SAHMK_KEY,
      },
      body: JSON.stringify({
        url: 'https://tadawul-plus.vercel.app/api/webhook',
        name: 'Tadawul Plus Events',
      }),
    });

    const data = await res.json();
    return Response.json({ status: res.status, data });

  } catch(e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
