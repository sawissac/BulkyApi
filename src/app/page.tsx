'use client';

import dynamic from 'next/dynamic';

const BulkyApp = dynamic(() => import('./BulkyApp'), { ssr: false });

export default function Home() {
  return <BulkyApp />;
}
