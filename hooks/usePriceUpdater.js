'use client';
/**
 * @module hooks/usePriceUpdater
 * @description جلب أسماء وأسعار الأسهم من sahmk API
 * - الأسماء: من /companies (مرة واحدة عند البدء)
 * - الأسعار: من /quotes (كل 30 ثانية)
 * - تاسي: من /tasi (كل 30 ثانية)
 */

import { useEffect, useRef } from 'react';
import { useStockDispatch } from '../store/stockStore';
import { useMarketDispatch, MARKET_ACTIONS } from '../store';
import { STOCKS_MAP as SEED_MAP, updateLiveStocks, STOCKS } from '../constants/stocksData';

const INTERVAL_MS = 30_000;
const CHUNK_SIZE  = 50;

// خريطة دائمة للأسماء، تُملأ مرة واحدة عند البدء
const NAMES_MAP = {};

export function usePriceUpdater(setDebug) {
  const dispatch       = useStockDispatch();
  const marketDispatch = useMarketDispatch();
  const isMounted      = useRef(true);
  const setDebugRef    = useRef(setDebug);
  const namesLoaded    = useRef(false);

  useEffect(() => {
    setDebugRef.current = setDebug;
  }, [setDebug]);

  useEffect(() => {
    isMounted.current = true;

    // ── جلب الأسماء مرة واحدة ──
    async function loadNames() {
      if (namesLoaded.current) return;
      try {
        let offset = 0;
        const limit = 300;
        let totalLoaded = 0;
        // نلف على صفحات companies حتى ننتهي (حد أقصى 5 صفحات)
        for (let page = 0; page < 5; page++) {
          const res = await fetch(`/api/sahmkdata?endpoint=companies&market=TASI&limit=${limit}&offset=${offset}`);
          if (!res.ok) break;
          const json = await res.json();
          const list = json.companies || json.data || json.results || [];
          if (!Array.isArray(list) || list.length === 0) break;

          for (const c of list) {
            const sym = String(c.symbol || c.sym || c.code || '').trim();
            const name = c.name_ar || c.name || c.name_en || c.company_name || '';
            if (sym && name) NAMES_MAP[sym] = name;
          }
          totalLoaded += list.length;
          if (list.length < limit) break;
          offset += limit;
        }
        namesLoaded.current = true;
        setDebugRef.current?.(`📛 ${Object.keys(NAMES_MAP).length} اسم محمّل`);
      } catch (e) {
        setDebugRef.current?.('فشل تحميل الأسماء: ' + e.message);
      }
    }

    // ── جلب الأسعار وتاسي ──
    async function fetchAll() {
      try {
        // ① ضمان تحميل الأسماء أولاً
        if (!namesLoaded.current) await loadNames();

        // ② أسعار الأسهم
        const syms   = STOCKS.map(s => s.sym);
        const chunks = [];
        for (let i = 0; i < syms.length; i += CHUNK_SIZE) {
          chunks.push(syms.slice(i, i + CHUNK_SIZE));
        }

        const quotesMap = {};
        for (const chunk of chunks) {
          try {
            const res  = await fetch(`/api/sahmkdata?endpoint=quotes&symbols=${chunk.join(',')}`);
            if (!res.ok) continue;
            const json = await res.json();
            const arr  = json.quotes || json.data || (Array.isArray(json) ? json : []);
            if (Array.isArray(arr)) {
              for (const q of arr) {
                const sym = String(q.symbol || q.sym || '').trim();
                if (sym && q.price > 0) quotesMap[sym] = q;
              }
            }
          } catch { /* تجاهل وكمّل */ }
        }

        if (!isMounted.current) return;

        const quotesCount = Object.keys(quotesMap).length;
        setDebugRef.current?.(`💹 ${quotesCount} سعر من أصل ${syms.length} | 📛 ${Object.keys(NAMES_MAP).length} اسم`);

        // ③ بناء قائمة كاملة لكل الـ 200 سهم
        const newStocks = STOCKS.map(seed => {
          const q   = quotesMap[seed.sym];
          const nm  = NAMES_MAP[seed.sym] || (q && (q.name_ar || q.name)) || seed.sym;

          if (q) {
            return {
              sym:      seed.sym,
              name:     nm,
              sec:      seed.sec      || '',
              sectorId: seed.sectorId || '',
              rating:   seed.rating   || 50,
              oilCorr:  seed.oilCorr  || null,
              p:        q.price,
              ch:       q.change          ?? 0,
              pct:      q.change_percent  ?? 0,
              v:        q.volume          ?? 0,
              avgV:     q.volume          ?? 0,
              hi:       q.high            || q.price,
              lo:       q.low             || q.price,
              mktCap:   null, eps:  null, pe:   null,
              pb:       null, divY: null, roe:  null,
              debt:     null, beta: null, w52h: null,
              w52l:     null, target: null,
            };
          }
          // سهم بدون quote -- نعرضه باسمه وقطاعه مع سعر 0
          return {
            sym:      seed.sym,
            name:     nm,
            sec:      seed.sec      || '',
            sectorId: seed.sectorId || '',
            rating:   seed.rating   || 50,
            oilCorr:  seed.oilCorr  || null,
            p:        0, ch: 0, pct: 0, v: 0, avgV: 0,
            hi: 0, lo: 0,
            mktCap: null, eps: null, pe: null,
            pb: null, divY: null, roe: null,
            debt: null, beta: null, w52h: null,
            w52l: null, target: null,
          };
        });

        dispatch({ type: 'SET_STOCKS', payload: newStocks });
        updateLiveStocks(newStocks);

        // ④ مؤشر تاسي
        const tasiRes = await fetch('/api/sahmkdata?endpoint=tasi');
        if (!tasiRes.ok) return;
        const tasi = await tasiRes.json();

        if (tasi?.index_value && isMounted.current) {
          marketDispatch({
            type:    MARKET_ACTIONS.SET_INDICES,
            payload: [
              {
                id:    'tasi',
                name:  'تاسي',
                value: tasi.index_value,
                pct:   tasi.index_change_percent ?? 0,
                ch:    tasi.index_change         ?? 0,
              },
              { id:'nomu', name:'نمو', value: 0, pct: 0, ch: 0 },
            ],
          });
        }

      } catch(e) {
        setDebugRef.current?.('خطأ: ' + e.message);
      }
    }

    fetchAll();
    const timer = setInterval(fetchAll, INTERVAL_MS);

    return () => {
      isMounted.current = false;
      clearInterval(timer);
    };
  }, [dispatch, marketDispatch]);
}
