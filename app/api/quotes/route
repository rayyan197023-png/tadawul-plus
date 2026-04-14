export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const syms = searchParams.get('syms'); // '2222.SR,1120.SR'
    
    if (!syms) return Response.json({ error: 'syms required' }, { status: 400 });
    
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${syms}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow`;
    
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await res.json();
    const quotes = data?.quoteResponse?.result ?? [];
    
    return Response.json(quotes.map(q => ({
      sym:  q.symbol?.replace('.SR',''),
      p:    q.regularMarketPrice,
      ch:   q.regularMarketChange,
      pct:  q.regularMarketChangePercent,
      v:    q.regularMarketVolume,
      o:    q.regularMarketOpen,
      hi:   q.regularMarketDayHigh,
      lo:   q.regularMarketDayLow,
    })));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
