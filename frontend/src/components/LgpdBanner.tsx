'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const CONSENT_KEY = 'orbesystems_lgpd_consent';

export default function LgpdBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
        try {
            const consent = localStorage.getItem(CONSENT_KEY);
            if (!consent) setIsVisible(true);
        } catch {
            // localStorage indisponível: exibe o aviso normalmente.
            setIsVisible(true);
        }
    }, []);

    // 'true' = todos (valor legado preservado) | 'essential' = apenas essenciais
    const saveConsent = (level: 'true' | 'essential') => {
        try {
            localStorage.setItem(CONSENT_KEY, level);
        } catch {
            // Sem persistência: apenas fecha o aviso nesta sessão.
        }
        setIsVisible(false);
    };

    if (!hasMounted) return null;
    if (!isVisible) return null;

    return (
        <aside
            aria-label="Controle de privacidade e cookies (LGPD)"
            className="fixed bottom-0 left-0 w-full bg-[#0a0a0a]/95 backdrop-blur-md border-t border-neon-cyan/20 p-4 md:p-6 z-50 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
        >
            <div className="flex-1 max-w-4xl">
                <h3 className="text-neon-cyan font-bold mb-1 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" /></svg>
                    Privacidade &amp; Cookies (LGPD)
                </h3>
                <p className="text-gray-300 text-sm">
                    Usamos cookies estritamente necessários para a segurança da sessão e, com a sua permissão,
                    telemetria anônima de uso e desempenho. Você pode aceitar todos ou manter apenas os essenciais.
                    Saiba mais na nossa{' '}
                    <Link href="/privacidade" className="text-neon-cyan underline underline-offset-2 hover:text-white">
                        Política de Privacidade
                    </Link>{' '}
                    e nos{' '}
                    <Link href="/termos" className="text-neon-cyan underline underline-offset-2 hover:text-white">
                        Termos de Uso
                    </Link>.
                </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                    type="button"
                    onClick={() => saveConsent('essential')}
                    className="px-5 py-2 bg-transparent border border-slate-600 text-slate-200 hover:border-slate-300 hover:text-white transition-all rounded font-medium whitespace-nowrap"
                >
                    Apenas Essenciais
                </button>
                <button
                    type="button"
                    onClick={() => saveConsent('true')}
                    className="px-6 py-2 bg-neon-cyan/10 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all rounded font-medium whitespace-nowrap"
                >
                    Aceitar Todos
                </button>
            </div>
        </aside>
    );
}
