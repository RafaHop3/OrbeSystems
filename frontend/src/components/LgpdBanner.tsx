'use client';

import { useState, useEffect } from 'react';

export default function LgpdBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem('orbesystems_lgpd_consent');
        if (!consent) setIsVisible(true);
    }, []);

    const acceptCookies = () => {
        localStorage.setItem('orbesystems_lgpd_consent', 'true');
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 w-full bg-[#0a0a0a]/90 backdrop-blur-md border-t border-neon-cyan/20 p-4 md:p-6 z-50 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
            <div className="flex-1 max-w-4xl">
                <h3 className="text-neon-cyan font-bold mb-1 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" /></svg>
                    Privacidade & Cookies (LGPD)
                </h3>
                <p className="text-gray-300 text-sm">
                    A Orbe Systems utiliza cookies e registros de processamento (incluindo Stripe) para garantir a segurança e a melhor experiência na sua conta. Ao continuar navegando, você concorda com o monitoramento e nossa Política de Privacidade.
                </p>
            </div>
            <button
                onClick={acceptCookies}
                className="px-6 py-2 bg-neon-cyan/10 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all rounded font-medium whitespace-nowrap"
            >
                Aceitar e Fechar
            </button>
        </div>
    );
}
