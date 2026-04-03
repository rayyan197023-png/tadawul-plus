'use client';

import dynamic from 'next/dynamic';

const AppShell = dynamic(() => import('../components/AppShell'), {
  ssr: false,
  loading: () => <div style={{color:'white',padding:20}}>جاري التحميل...</div>
});

export default function Home() {
  return <AppShell />;
}
