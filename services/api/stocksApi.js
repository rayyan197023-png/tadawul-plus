import config          from '../../constants/config';

export async function fetchAIAnalysis(prompt, maxTokens = 1200, signal = undefined) {
  const res = await fetch(config.claudeProxyUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      max_tokens: Math.min(maxTokens, 4000),
      messages:   [{ role: 'user', content: String(prompt).slice(0, 12000) }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err?.error?.message ?? `API error ${res.status}`;
    const error = new Error(msg);
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  const text = data.content?.[0]?.text ?? '';
  if (!text) throw new Error('Empty response from AI');
  return text;
}
