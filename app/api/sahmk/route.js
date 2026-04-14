export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sym = searchParams.get('sym') ?? '2222';
    
    const res = await fetch(
      `https://app.sahmk.sa/api/v1/quote/${sym}/`,
      {
        headers: {
          'X-API-Key': 'shmk_live_3603d4afd0969c8ecebd9ab952ff33341577a5d6962aa8e9',
        },
      }
    );
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
