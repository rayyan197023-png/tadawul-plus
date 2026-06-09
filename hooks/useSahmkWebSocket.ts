import { useEffect, useRef, useCallback, useState } from 'react';

const WS_URL = 'wss://app.sahmk.sa/ws/v1/stocks/';

type QuoteUpdate = {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
  updated_at: string;
};

type WSStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useSahmkWebSocket(
  apiKey: string,
  symbols: string[],
  onQuote: (q: QuoteUpdate) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<WSStatus>('disconnected');

  const connect = useCallback(() => {
    if (!apiKey || symbols.length === 0) return;

    setStatus('connecting');
    const ws = new WebSocket(`${WS_URL}?api_key=${apiKey}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus('connected');
      const chunks = chunkArray(symbols, 20);
      chunks.forEach((chunk) => {
        ws.send(JSON.stringify({ action: 'subscribe', symbols: chunk }));
      });
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'quote':
            onQuote(msg.data as QuoteUpdate);
            break;
          case 'subscribed':
            console.log('[WS] subscribed:', msg.symbols);
            break;
          case 'pong':
            break;
          case 'error':
            console.error('[WS] error:', msg.message);
            break;
        }
      } catch (e) {
        console.error('[WS] parse error', e);
      }
    };

    ws.onerror = () => setStatus('error');

    ws.onclose = () => {
      setStatus('disconnected');
      setTimeout(connect, 5000);
    };
  }, [apiKey, symbols.join(','), onQuote]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: 'ping' }));
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const updateSymbols = useCallback((newSymbols: string[]) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ action: 'unsubscribe', symbols }));
    const chunks = chunkArray(newSymbols, 20);
    chunks.forEach((chunk) => {
      wsRef.current!.send(JSON.stringify({ action: 'subscribe', symbols: chunk }));
    });
  }, [symbols]);

  useEffect(() => {
    connect();
    return () => { wsRef.current?.close(); };
  }, [connect]);

  return { status, updateSymbols };
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
