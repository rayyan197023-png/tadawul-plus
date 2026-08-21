'use client';
import { useEffect, useRef } from 'react';
import { useStockDispatch } from '../store/stockStore';
import { useMarketDispatch, MARKET_ACTIONS } from '../store';
import { STOCKS_MAP as SEED_MAP, updateLiveStocks, STOCKS } from '../constants/stocksData';

const INTERVAL_MS = 15_000;
const CHUNK_SIZE  = 50;
const NAMES_MAP = {};
const SHORT_OVERRIDES = {
 "2010": "سابك",
 "2222": "أرامكو",
 "1120": "الراجحي",
 "2230": "الكيميائية",
};

function shortenName(name, sym) {
 if (SHORT_OVERRIDES[sym]) return SHORT_OVERRIDES[sym];
 if (!name) return sym;
 let n = String(name)
   .replace(/الشركة\s*/g, "")
   .replace(/السعودية\s*/g, "")
   .replace(/القابضة\s*/g, "")
   .replace(/للتأمين التعاوني\s*/g, "")
   .replace(/مجموعة\s*/g, "")
   .replace(/\s+/g, " ")
   .trim();
 return n.length >= 2 ? n : name;
}

export function usePriceUpdater() {
 const dispatch       = useStockDispatch();
 const marketDispatch = useMarketDispatch();
 const isMounted      = useRef(true);
 const namesLoaded    = useRef(false);

 useEffect(() => {
   isMounted.current = true;

   async function loadNames() {
     if (namesLoaded.current) return;
     try {
       let offset = 0;
       const limit = 300;
       for (let page = 0; page < 5; page++) {
         const res = await fetch(`/api/sahmkdata?endpoint=companies&market=TASI&limit=${limit}&offset=${offset}`);
         if (!res.ok) break;
         const json = await res.json();
         const list = json.results || json.companies || json.data || (Array.isArray(json) ? json : []);
         if (!Array.isArray(list) || list.length === 0) break;
         for (const c of list) {
           const sym = String(c.symbol || c.sym || c.code || '').trim();
           const name = c.name_ar || c.name || c.name_en || c.company_name || '';
           if (sym && name) NAMES_MAP[sym] = name;
         }
         if (list.length < limit) break;
         offset += limit;
       }
       namesLoaded.current = true;
     } catch (e) {}
   }

   async function fetchAll() {
     try {
       if (!namesLoaded.current) await loadNames();

       const syms   = STOCKS.map(s => s.sym);
       const chunks = [];
       for (let i = 0; i < syms.length; i += CHUNK_SIZE) {
         chunks.push(syms.slice(i, i + CHUNK_SIZE));
       }

       const quotesMap = {};
       for (const chunk of chunks) {
         try {
           const res = await fetch(`/api/sahmkdata?endpoint=quotes&symbols=${chunk.join(',')}`);
           if (!res.ok) continue;
           const json = await res.json();
           const arr  = json.quotes || json.data || (Array.isArray(json) ? json : []);
           if (Array.isArray(arr)) {
             for (const q of arr) {
               const sym = String(q.symbol || q.sym || '').trim();
               if (sym && q.price > 0) quotesMap[sym] = q;
             }
           }
         } catch {}
       }

       if (!isMounted.current) return;

       const newStocks = [];
       for (const seed of STOCKS) {
         const q = quotesMap[seed.sym];
         if (!q) continue;
         let nm = NAMES_MAP[seed.sym] || q.name_ar || q.name || seed.sym;
         nm = shortenName(nm, seed.sym);
         newStocks.push({
           sym:      seed.sym,
           name:     nm,
           sec:      seed.sec      || '',
           sectorId: seed.sectorId || '',
           rating:   seed.rating   || 50,
           oilCorr:  seed.oilCorr  || null,
           p:        q.price,
           ch:       q.change_percent  ?? 0,
           pct:      q.change_percent  ?? 0,
           v:        q.volume          ?? 0,
           avgV:     q.volume          ?? 0,
           hi:       q.high            || q.price,
           lo:       q.low             || q.price,
           // ✨ نحافظ على الأساسيات المحقونة في seed بدل مسحها كل 15 ثانية
           mktCap: seed.mktCap ?? null, eps: seed.eps ?? null, pe: seed.pe ?? null,
           pb: seed.pb ?? null, divY: seed.divY ?? null, roe: seed.roe ?? null,
           debt: seed.debt ?? null, beta: seed.beta ?? null,
           bookValue: seed.bookValue ?? null, netMargin: seed.netMargin ?? null,
           epsGrw: seed.epsGrw ?? null, revGrw: seed.revGrw ?? null,
           w52h: seed.w52h ?? null, w52l: seed.w52l ?? null, target: seed.target ?? null,
         });
       }

       dispatch({ type: 'SET_STOCKS', payload: newStocks });
       updateLiveStocks(newStocks);

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
       console.warn('[usePriceUpdater]', e.message);
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
