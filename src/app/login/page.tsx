'use client';

import dynamic from 'next/dynamic';

const LoginPane = dynamic(() => import('@/features/auth/components/LoginPane'), { ssr: false });

export default function LoginPage() {
  return <LoginPane />;
}
