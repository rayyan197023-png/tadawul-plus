export const runtime = 'edge';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const upgrade = req.headers.get('upgrade');
  
  if (upgrade !== 'websocket') {
    return new Response('Expected websocket', { status: 426 });
  }

  const key = process.env.SAHMK_KEY ?? '';
  const upstream = `wss://app.sahmk.sa/ws/v1/stocks/?api_key=${key}`;

  return new Response(null, {
    status: 101,
    headers: {
      'X-Upstream': upstream,
    },
  });
}
