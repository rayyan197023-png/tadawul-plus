'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const AppShell = dynamic(() => import('./AppShell'), {
  ssr: false,
  loading: () => <div style={{color:'white',padding:20,fontFamily:'Cairo',direction:'rtl'}}>جاري التحميل...</div>
});

export default function Home() {
  const [err, setErr] = useState(null);

  useEffect(() => {
    const handler = (e) => setErr(e.message || String(e.reason || e.error || ''));
    window.addEventListener('error', handler);
    window.addEventListener('unhandledrejection', handler);
    return () => {
      window.removeEventListener('error', handler);
      window.removeEventListener('unhandledrejection', handler);
    };
  }, []);

  if (err) return (
    <div style={{
      background:'#06080f', color:'#ff5f6a', padding:20,
      fontFamily:'Cairo,sans-serif', direction:'rtl',
      minHeight:'100dvh', fontSize:13, lineHeight:1.8
    }}>
      <div style={{fontSize:18, marginBottom:12}}>⚠️ خطأ في التطبيق</div>
      <div style={{background:'#1a0a0a', padding:12, borderRadius:8, wordBreak:'break-all'}}>
        {err}
      </div>
      <button onClick={()=>setErr(null)} style={{
        marginTop:16, padding:'8px 20px', background:'#f0c050',
        border:'none', borderRadius:8, fontFamily:'Cairo', cursor:'pointer'
      }}>إعادة المحاولة</button>
    </div>
  );

  return <AppShell />;
}