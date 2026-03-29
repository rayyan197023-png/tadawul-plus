import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sym = searchParams.get("sym");
  const endpoint = searchParams.get("endpoint") || "real-time";

  if (!sym) {
    return NextResponse.json({ error: "sym required" }, { status: 400 });
  }

  const KEY = process.env.EODHD_API_KEY;
  const url = `https://eodhd.com/api/${endpoint}/${sym}.SAU?api_token=${KEY}&fmt=json`;

  const res = await fetch(url);
  const data = await res.json();

  return NextResponse.json(data, {
    headers: { "Access-Control-Allow-Origin": "*" }
  });
}
