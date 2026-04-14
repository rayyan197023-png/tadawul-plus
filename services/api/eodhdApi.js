export async function fetchRealTimeQuote(sym, signal) {
  return null;
}

export async function fetchBulkQuotes(syms, signal) {
  return [];
}

export async function fetchOHLCHistory(sym, params, signal) {
  return [];
}

export async function fetchFundamentals(sym, signal) {
  return null;
}

export async function fetchTASIIndex(signal) {
  return null;
}

export function periodToEODHDParams(period) {
  const now = new Date();
  const fmt  = d => d.toISOString().slice(0,10);
  const sub  = (d, days) => { const x=new Date(d); x.setDate(x.getDate()-days); return x; };
  switch(period) {
    case '1D':  return { from: fmt(sub(now,1)),   to: fmt(now), period:'d' };
    case '1W':  return { from: fmt(sub(now,7)),   to: fmt(now), period:'d'​​​​​​​​​​​​​​​​
