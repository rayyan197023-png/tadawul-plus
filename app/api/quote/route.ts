import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sym = searchParams.get("sym");
  if (!sym) return NextResponse.json({ error: "sym required" }, { status: 400 });
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    "Accept": "application/json",
  };
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=6mo`;
    let res = await fetch(url, { headers });
    if (!res.ok) res = await fetch(url.replace("query1", "query2"), { headers });
    const data = await res.json();
    return NextResponse.json(data, { headers: { "Access-Control-Allow-Origin": "*" } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
