'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const CONSENT_KEY = 'orbesystems_lgpd_consent';
const CONSENT_PREFS_KEY = 'orbesystems_lgpd_preferences';

export interface LgpdPreferences {
    essential: true;
    analytics: boolean;
    functional: boolean;
    updatedAt: string;
}

export default function LgpdBanner() {
    const [isVisible, setIsVisible] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const [showGranular, setShowGranular] = useState(false);
    const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
    const [functionalEnabled, setFunctionalEnabled] = useState(true);

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

    // 'true' = todos (valor legado preservado) | 'essential' = apenas essenciais | 'granular' = customizado
    const saveConsent = (level: 'true' | 'essential' | 'granular') => {
        const prefs: LgpdPreferences = {
            essential: true,
            analytics: level === 'true' ? true : level === 'essential' ? false : analyticsEnabled,
            functional: level === 'true' ? true : level === 'essential' ? false : functionalEnabled,
            updatedAt: new Date().toISOString(),
        };

        // Mantém compatibilidade 100% com AnalyticsTracker ('true' se analytics estiver ativo)
        const legacyValue = prefs.analytics ? 'true' : 'essential';

        try {
            localStorage.setItem(CONSENT_KEY, legacyValue);
            localStorage.setItem(CONSENT_PREFS_KEY, JSON.stringify(prefs));
            window.dispatchEvent(new CustomEvent('orbe:lgpd-consent-updated', { detail: prefs }));
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
            className="fixed bottom-0 left-0 w-full bg-[#0a0a0a]/95 backdrop-blur-md border-t border-neon-cyan/20 p-4 md:p-6 z-50 flex flex-col gap-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]"
        >
            <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1 max-w-4xl">
                    <h3 className="text-neon-cyan font-bold mb-1 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" /></svg>
                        Privacidade &amp; Consentimento Granular de Cookies (LGPD)
                    </h3>
                    <p className="text-gray-300 text-sm">
                        Usamos cookies estritamente necessários para a segurança da sessão e, com a sua permissão,
                        telemetria anônima de desempenho e preferências funcionais. Você pode personalizar seu aceite granularmente.
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
                        onClick={() => setShowGranular(prev => !prev)}
                        className="px-4 py-2 bg-transparent border border-neon-cyan/40 text-neon-cyan/90 hover:border-neon-cyan hover:text-neon-cyan transition-all rounded font-mono text-xs uppercase tracking-wider whitespace-nowrap"
                    >
                        {showGranular ? 'Ocultar Opções' : 'Personalizar'}
                    </button>
                    <button
                        type="button"
                        onClick={() => saveConsent('essential')}
                        className="px-5 py-2 bg-transparent border border-slate-600 text-slate-200 hover:border-slate-300 hover:text-white transition-all rounded font-medium whitespace-nowrap text-sm"
                    >
                        Apenas Essenciais
                    </button>
                    {showGranular ? (
                        <button
                            type="button"
                            onClick={() => saveConsent('granular')}
                            className="px-6 py-2 bg-neon-cyan/20 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all rounded font-medium whitespace-nowrap text-sm"
                        >
                            Salvar Preferências
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => saveConsent('true')}
                            className="px-6 py-2 bg-neon-cyan/10 border border-neon-cyan text-neon-cyan hover:bg-neon-cyan hover:text-black transition-all rounded font-medium whitespace-nowrap text-sm"
                        >
                            Aceitar Todos
                        </button>
                    )}
                </div>
            </div>

            {showGranular && (
                <div className="max-w-7xl w-full mx-auto pt-3 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="p-3 rounded bg-black/60 border border-slate-800 flex items-center justify-between gap-3">
                        <div>
                            <div className="text-white font-bold">1. Estritamente Necessários</div>
                            <div className="text-slate-400 text-[11px]">Autenticação JWT, proteção CSRF/WAF e sessão segura.</div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] uppercase">
                            Sempre Ativo
                        </span>
                    </div>

                    <label className="p-3 rounded bg-black/60 border border-slate-800 flex items-center justify-between gap-3 cursor-pointer hover:border-neon-cyan/40 transition-colors">
                        <div>
                            <div className="text-white font-bold">2. Analíticos &amp; Telemetria</div>
                            <div className="text-slate-400 text-[11px]">Métricas anônimas de rota e saúde operacional (SIEM/Performance).</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={analyticsEnabled}
                            onChange={e => setAnalyticsEnabled(e.target.checked)}
                            className="h-4 w-4 accent-[#00fff5] rounded cursor-pointer"
                        />
                    </label>

                    <label className="p-3 rounded bg-black/60 border border-slate-800 flex items-center justify-between gap-3 cursor-pointer hover:border-neon-cyan/40 transition-colors">
                        <div>
                            <div className="text-white font-bold">3. Funcionais &amp; HUD</div>
                            <div className="text-slate-400 text-[11px]">Persistência local de preferências visuais e estado de workspace.</div>
                        </div>
                        <input
                            type="checkbox"
                            checked={functionalEnabled}
                            onChange={e => setFunctionalEnabled(e.target.checked)}
                            className="h-4 w-4 accent-[#00fff5] rounded cursor-pointer"
                        />
                    </label>
                </div>
            )}
        </aside>
    );
}
