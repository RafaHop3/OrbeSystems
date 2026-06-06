'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ImortalRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/imortal');
  }, [router]);

  return (
    <div className="min-h-screen bg-terminal-bg flex items-center justify-center font-mono text-xs text-terminal-muted">
      Redirecionando para /imortal...
    </div>
  );
}
