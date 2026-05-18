'use client';
import { useState } from 'react';

export default function TestSahmkPage() {
  const [sym, setSym] = useState('2010');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});

  const periods = [
    '1D', '5D', '1W', '1Mo', '3Mo', '6Mo', 'YTD', '1Y', '2Y', '5Y', 'Max',
    '1m', '5m', '15m', '30m', '1H', '4H'
  ];

  const testPeriod = async (period) => {
    setLoading(p => ({...p, [period]: true}));
    try {
      const r = await fetch(`/api/sahmkdata?endpoint=ohlcv&sym=${sym}&period=${period}`);
      const data = await r.json();
      const bars = data.bars || data.data || data.ohlcv || [];
      const first = bars[0];
      const last = bars[bars.length - 1];
      setResults(prev => ({
        ...prev,
        [period]: {
          status: r.status,
          count: bars.length,
          firstDate: first?.t || first?.date || first?.time,
          lastDate: last?.t || last?.date || last?.time,
          firstPrice: first?.c || first?.close,
          lastPrice: last?.c || last?.close,
          sample: first
        }
      }));
    } catch (e) {
      setResults(prev => ({...prev, [period]: { error: e.message }}));
    }
    setLoading(p => ({...p, [period]: false}));
  };

  const testAll = async () => {
    for (const p of periods) {
      await testPeriod(p);
    }
  };

  return (
    <div style={{padding:20, fontFamily:'monospace', background:'#0a0e1a', color:'#e0e6f0', minHeight:'100vh'}}>
      <h1 style={{color:'#3b9eff'}}>🔍 sahmk OHLCV Endpoint Tester</h1>
      
      <div style={{marginBottom:20, display:'flex', gap:10, alignItems:'center'}}>
        <label>الرمز:</label>
        <input value={sym} onChange={e => setSym(e.target.value)}
          style={{padding:8, background:'#1a2235', border:'1px solid #2a3a55', color:'#fff', borderRadius:6, width:120}}/>
        <button onClick={testAll}
          style={{padding:'8px 16px', background:'#3b9eff', color:'#000', border:'none', borderRadius:6, fontWeight:700, cursor:'pointer'}}>
          🚀 اختبر الكل
        </button>
        <button onClick={() => setResults({})}
          style={{padding:'8px 16px', background:'#666', color:'#fff', border:'none', borderRadius:6, cursor:'pointer'}}>
          مسح
        </button>
      </div>

      <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
        <thead>
          <tr style={{background:'#1a2235', textAlign:'left'}}>
            <th style={{padding:8}}>الفترة</th>
            <th style={{padding:8}}>الحالة</th>
            <th style={{padding:8}}>عدد الشموع</th>
            <th style={{padding:8}}>أول تاريخ</th>
            <th style={{padding:8}}>آخر تاريخ</th>
            <th style={{padding:8}}>أول سعر</th>
            <th style={{padding:8}}>آخر سعر</th>
            <th style={{padding:8}}>الإجراء</th>
          </tr>
        </thead>
        <tbody>
          {periods.map(p => {
            const r = results[p];
            const ok = r && r.count > 0;
            const empty = r && r.count === 0;
            return (
              <tr key={p} style={{borderBottom:'1px solid #1a2235', background: ok?'#0f1f15' : empty?'#1f1515' : 'transparent'}}>
                <td style={{padding:8, fontWeight:700, color:'#3b9eff'}}>{p}</td>
                <td style={{padding:8}}>
                  {loading[p] ? '⏳' : r ? (r.error ? '❌ '+r.error : ok ? '✅' : '⚠️ فارغ') : '–'}
                </td>
                <td style={{padding:8, color: ok ? '#22c55e' : '#ef4444'}}>{r?.count ?? '–'}</td>
                <td style={{padding:8, color:'#94a3b8'}}>{r?.firstDate ?? '–'}</td>
                <td style={{padding:8, color:'#94a3b8'}}>{r?.lastDate ?? '–'}</td>
                <td style={{padding:8}}>{r?.firstPrice ?? '–'}</td>
                <td style={{padding:8}}>{r?.lastPrice ?? '–'}</td>
                <td style={{padding:8}}>
                  <button onClick={() => testPeriod(p)}
                    style={{padding:'4px 10px', background:'#1a2235', color:'#3b9eff', border:'1px solid #3b9eff', borderRadius:4, cursor:'pointer', fontSize:11}}>
                    اختبر
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {Object.keys(results).length > 0 && (
        <details style={{marginTop:20, padding:10, background:'#1a2235', borderRadius:8}}>
          <summary style={{cursor:'pointer', color:'#3b9eff'}}>📦 عينة من البيانات الخام</summary>
          <pre style={{fontSize:10, overflow:'auto', marginTop:10}}>
            {JSON.stringify(
              Object.entries(results).find(([k,v]) => v.sample)?.[1]?.sample,
              null, 2
            )}
          </pre>
        </details>
      )}
    </div>
  );
}
