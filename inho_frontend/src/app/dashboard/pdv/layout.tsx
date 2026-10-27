'use client';

import { PDVProvider } from './PDVContext';

export default function PDVLayout({ children }: { children: React.ReactNode }) {
    return <PDVProvider>{children}</PDVProvider>;
}
