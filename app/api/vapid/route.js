export const runtime = 'nodejs';

export async function GET() {
  const webpush = await import('web-push');
  const keys = webpush.generateVAPIDKeys();
  return Response.json(keys);
}
