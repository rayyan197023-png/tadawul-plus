'use client';
/**
 * useMarketEngine — Live market simulation hook
 *
 * Extracted from الرئيسية.jsx (useMarketEngine function).
 * Provides live-updating TASI price with GBM simulation.
 * Updates every 2 seconds.
 *
 * When config.features.liveMarketData = true,
 * replace the setInterval with a real WebSocket/SSE connection.
 */

import { useState, useEffect } from 'react';

function seedRng(s) {
  let x = s;
  return () => {
    x = (x * 1664525 + 1013904223) & 0xffffffff;
    return (x >>> 0) / 0xffffffff;
  };
}

const OPEN_PRICE   = 12691.04;
const CLOSE_PRICE  = 12847.32;
const TASI_MIN     = 12500;
const TASI_MAX     = 13100;

// ── Historical data (seed — replaced by API)
function buildTodayPoints() {
  const rng = seedRng(Date.now() % 100003);
  const pts  = [OPEN_PRICE];
  for (let i = 1; i < 78; i++) {
    const prev  = pts[i - 1];
    const drift = (CLOSE_PRICE - OPEN_PRICE) / 78;
    const noise = (rng() - 0.488) * 22;
    pts.push(Math.round((prev + drift + noise) * 100) / 100);
  }
  pts[pts.length - 1] = CLOSE_PRICE;
  return pts;
}

export const HISTORICAL_SERIES = {
  year: [
    11580,11620,11750,11830,11900,11780,11650,11580,11490,11600,
    11720,11850,11940,12050,12180,12250,12310,12200,12080,11960,
    11880,11820,11760,11690,11720,11810,11950,12060,12140,12220,
    12350,12480,12560,12620,12700,12780,12820,12780,12720,12650,
    12580,12640,12720,12810,12870,12820,12760,12710,12770,12820,
    12840, CLOSE_PRICE,
  ],
  q3m: (() => {
    const rng = seedRng(9001); let v = 12580;
    return Array.from({ length: 66 }, () => {
      v += (rng() - 0.47) * 35 + 0.4;
      return Math.round(v * 100) / 100;
    }).concat([CLOSE_PRICE]);
  })(),
  month: (() => {
    const rng = seedRng(9002); let v = 12680;
    return Array.from({ length: 21 }, () => {
      v += (rng() - 0.46) * 28 + 0.8;
      return Math.round(v * 100) / 100;
    }).concat([CLOSE_PRICE]);
  })(),
  week: (() => {
    const rng  = seedRng(9003);
    const arr  = [OPEN_PRICE];
    for (let i = 1; i < 4; i++) {
      const drift = (CLOSE_PRICE - OPEN_PRICE) / 5;
      arr.push(Math.round((arr[i-1] + drift + (rng()-0.47)*25)*100)/100);
    }
    arr.push(CLOSE_PRICE);
    return arr;
  })(),
};

/**
 * Live market engine hook
 * @returns {{ current, open, todayPts, chgPts, chgVal }}
 */
export function useMarketEngine() {
  const [state, setState] = useState(() => ({
    current:  CLOSE_PRICE,
    open:     OPEN_PRICE,
    todayPts: buildTodayPoints(),
    chgPts:   +((CLOSE_PRICE - OPEN_PRICE) / OPEN_PRICE * 100).toFixed(2),
    chgVal:   +(CLOSE_PRICE - OPEN_PRICE).toFixed(2),
  }));

  useEffect(() => {
    const id = setInterval(() => {
      setState(prev => {
        const sigma  = prev.current * 0.0004;
        const rngNow = seedRng(Date.now() % 999983);
        const u1     = Math.max(1e-10, rngNow());
        const eps    = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * rngNow());
        const trend  = prev.current > CLOSE_PRICE ? -0.3 : 0.3;
        const delta  = sigma * eps + trend;
        const next   = Math.max(TASI_MIN, Math.min(TASI_MAX,
          Math.round((prev.current + delta) * 100) / 100
        ));
        return {
          current:  next,
          open:     prev.open,
          todayPts: [...prev.todayPts, next].slice(-200),
          chgPts:   +((next - prev.open) / prev.open * 100).toFixed(2),
          chgVal:   +(next - prev.open).toFixed(2),
        };
      });
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return state;
}
