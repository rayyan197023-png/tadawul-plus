export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  const key  = process.env.NEXT_PUBLIC_EODHD_KEY ?? '69bf5e872dcbf8.52356857';
  
  const params = Object.fromEntries(searchParams);
  delete params.path;
  
  const q = new URLSearchParams({ ...params, api_token: key, fmt: 'json' });
  const res = await fetch(`https://eodhd.com/api${path}?${q}`);
  const data = await res.json();
  
  return Response.json(data);
}
