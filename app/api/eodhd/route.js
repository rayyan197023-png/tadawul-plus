export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    
    if (!path) {
      return Response.json({ error: 'path param required' }, { status: 400 });
    }
    
    const key = process.env.NEXT_PUBLIC_EODHD_KEY ?? '69bf5e872dcbf8.52356857';
    const params = Object.fromEntries(searchParams);
    delete params.path;
    
    const q = new URLSearchParams({ ...params, api_token: key, fmt: 'json' });
    const url = `https://eodhd.com/api${path}?${q}`;
    
    const res = await fetch(url);
    const text = await res.text();
    
    return new Response(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
