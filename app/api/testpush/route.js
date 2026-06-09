export const runtime = 'nodejs';

export async function GET() {
  try {
    const res = await fetch('https://tadawul-plus.vercel.app/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'notify',
        title: '🧪 اختبار تداول+',
        body: 'هذا إشعار تجريبي من السوق السعودي',
      }),
    });
    const data = await res.json();
    return Response.json(data);
  } catch(e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
