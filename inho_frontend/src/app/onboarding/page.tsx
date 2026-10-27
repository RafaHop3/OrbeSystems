'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { businessesApi } from '@/lib/api';
import { Building2, Hotel, ArrowRight, Loader2, Plus } from 'lucide-react';
import { GlassButton } from '@/components/ui/glass-button';

export default function OnboardingPage() {
    const router = useRouter();
    const { user, activeBusinessId, setActiveBusinessId } = useAuth();

    const [businesses, setBusinesses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    // 1. If operator, they shouldn't even be here. (Middleware prevents it, but double check)
    useEffect(() => {
        if (user && user.role === 'operator') {
            router.replace('/dashboard');
        }
    }, [user, router]);

    // 2. Fetch existing businesses
    useEffect(() => {
        const fetchBiz = async () => {
            try {
                const data = await businessesApi.list();
                setBusinesses(data);
            } catch (e: any) {
                setError(e.message || 'Falha ao buscar empresas.');
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchBiz();
    }, [user]);

    const handleSelect = (id: string) => {
        setActiveBusinessId(id);
        router.push('/dashboard');
    };

    const handleCreateInho = async () => {
        setCreating(true);
        setError('');
        try {
            const data = await businessesApi.create({
                name: 'INHO',
                category: 'COOPERATIVA'
            });
            setActiveBusinessId(data.id);
            router.push('/dashboard');
        } catch (e: any) {
            setError(e.message || 'Falha ao criar cooperativa.');
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-inho-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-inho-gold animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-inho-black relative flex flex-col items-center justify-center p-6 overflow-hidden">
            {/* Background Decorators */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-inho-gold/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-4xl relative z-10 animate-fade-in text-center">
                <h1 className="text-4xl lg:text-5xl font-black text-[#0F172A] mb-4 tracking-tight">
                    Setup do seu <span className="bg-inho-gold-gradient text-transparent bg-clip-text">Ecossistema</span>
                </h1>
                <p className="text-inho-muted max-w-xl mx-auto mb-12 text-sm lg:text-base">
                    Escolha o tipo de ambiente operacional que deseja inicializar na provedora Orbe Systems. Operadores criados ficarão estritamente restritos à matriz escolhida.
                </p>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-sm animate-slide-up">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-3xl mx-auto">
                    {/* Card 1: Cooperativa (Ativo) */}
                    <div className="glassmorphism p-8 rounded-3xl border border-inho-gold/30 hover:border-inho-gold transition-all duration-300 group text-left relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-inho-gold/10 blur-[50px] -translate-y-1/2 translate-x-1/2 rounded-full" />

                        <div className="w-14 h-14 rounded-2xl bg-inho-gold/10 flex items-center justify-center mb-6 text-inho-gold border border-inho-gold/20">
                            <Building2 size={28} />
                        </div>

                        <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Cooperativa Base (INHO)</h2>
                        <p className="text-inho-muted text-sm mb-8 flex-1">
                            Painel completo de gestão de PDVs, Contratos de Investidores Anjos e faturamento customizado.
                        </p>

                        {businesses.some(b => b.category === 'COOPERATIVA') ? (
                            <div className="flex flex-col gap-3">
                                <span className="text-xs font-mono text-inho-gold uppercase tracking-wider">Módulos Ativos Encontrados:</span>
                                {businesses.filter(b => b.category === 'COOPERATIVA').map(b => (
                                    <button
                                        key={b.id}
                                        onClick={() => handleSelect(b.id)}
                                        className="flex justify-between items-center bg-[#FAF8F2] border border-[#E5DEC9] p-4 rounded-xl hover:bg-inho-gold/10 hover:border-inho-gold/30 transition-all font-semibold text-[#0F172A]"
                                    >
                                        <span>{b.name}</span>
                                        <ArrowRight size={16} className="opacity-50" />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <GlassButton
                                onClick={handleCreateInho}
                                disabled={creating}
                                glowColor="gold"
                                className="w-full flex justify-center py-4 text-sm mt-auto"
                            >
                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus size={16} /> Inicializar Cooperativa</>}
                            </GlassButton>
                        )}
                    </div>

                    {/* Card 2: Hotelaria (Breve) */}
                    <div className="glassmorphism outline-none p-8 rounded-3xl border border-[#E5DEC9] opacity-50 cursor-not-allowed group text-left relative overflow-hidden flex flex-col">
                        <div className="w-14 h-14 rounded-2xl bg-[#FAF8F2] flex items-center justify-center mb-6 text-[#64748B] border border-[#E5DEC9]">
                            <Hotel size={28} />
                        </div>

                        <h2 className="text-2xl font-bold text-[#64748B] mb-2">Hotelaria / Genérico</h2>
                        <p className="text-[#64748B] text-sm mb-8 flex-1">
                            Módulo de gestão de reservas, tarifação diária e check-ins temporários. Este módulo ainda não foi implementado.
                        </p>

                        <button disabled className="mt-auto w-full py-4 text-sm font-semibold rounded-xl bg-[#FAF8F2] text-[#64748B] border border-[#E5DEC9] uppercase tracking-widest text-[10px]">
                            Em Breve
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
