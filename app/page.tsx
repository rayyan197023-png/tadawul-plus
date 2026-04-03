'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';

const AppShell = dynamic(() => import('../AppShell'), { 
  ssr: false,
  loading: () => <div style={{color:'white',padding:20}}>جاري التحميل...</div>
});

export default function Home() {
  useEffect(() => {
    window.onerror = (msg, src, line) => {
      document.body.innerHTML = '<div style="color:red;padding:20px;font-size:12px">' + msg + ' | ' + src + ':' + line + '</div>';
    };
  }, []);
  
  return <AppShell />;
}
