export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sym = searchParams.get('sym') ?? '2222';
    const syms = sym.split(',');

    const results = await Promise.all(
      syms.map(s =>
        fetch(`https://app.sahmk.sa/api/v1/quote/${s.trim()}/`, {
          headers: {
            'X-API-Key': 'shmk_live_3603d4afd0969c8ecebd9ab952ff33341577a5d6962aa8e9',
          },
        }).then(r => r.json()).catch(() => null)
      )
    );

    return Response.json(results.filter(Boolean).map(q => ({
      sym:  q.symbol,
      p:    q.price,
      ch:   q.change,
      pct:  q.change_percent,
      v:    q.volume,
      o:    q.open,
      hi:   q.high,
      lo:   q.low,
      prev: q.previous_close,
    })));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
