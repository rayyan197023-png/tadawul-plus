export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    // Market summary (TASI)
    if (path === 'market') {
      const res = await fetch('https://app.sahmk.sa/api/v1/market/summary/', {
        headers: { 'X-API-Key': 'shmk_live_3603d4afd0969c8ecebd9ab952ff33341577a5d6962aa8e9' }
      });
      const data = await res.json();
      return Response.json(data);
    }

    // Stock quotes
    const sym = searchParams.get('sym') ?? '2222';
    const syms = sym.split(',');

    const results = await Promise.all(
      syms.map(s =>
        fetch(`https://app.sahmk.sa/api/v1/quote/${s.trim()}/`, {
          headers: {
            'X-API-Key': 'shmk_live_3603d4afd0969c8ecebd9ab952ff33341577a5d6962aa​​​​​​​​​​​​​​​​
