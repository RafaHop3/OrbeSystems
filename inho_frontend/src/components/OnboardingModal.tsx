import React, { useState } from 'react';
import { Building2, Save, X } from 'lucide-react';
import { businessesApi } from '@/lib/api';

interface OnboardingModalProps {
    isOpen: boolean;
    onComplete: () => void;
    userName: string;
}

export default function OnboardingModal({ isOpen, onComplete, userName }: OnboardingModalProps) {
    const [bName, setBName] = useState(`Empresa de ${userName}`);
    const [bCategory, setBCategory] = useState<'COOPERATIVA' | 'VAREJO' | 'SERVICOS' | 'OUTROS'>('COOPERATIVA');
    const [bCnpj, setBCnpj] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');
        try {
            await businessesApi.create({
                name: bName,
                category: bCategory,
                cnpj: bCnpj || undefined
            });
            onComplete(); // Closes modal and refreshes dashboard
        } catch (err: any) {
            setErrorMsg(err.message || 'Erro ao criar seu Negócio.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inho-black/80 backdrop-blur-md">
            <div className="bg-inho-dark border border-inho-border p-8 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden">

                {/* Glow decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-inho-gold/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-inho-blue/10 border border-inho-blue/20 flex items-center justify-center text-inho-blue">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-inho-text">Bem-vindo, {userName.split(' ')[0]}!</h2>
                        <p className="text-sm font-mono text-inho-muted">Vamos configurar seu Perfil INHO</p>
                    </div>
                </div>

                {errorMsg && (
                    <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-700 p-3 rounded-xl text-sm font-bold shadow-lg">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                    <div>
                        <label className="block text-xs font-mono uppercase text-inho-muted mb-2 tracking-wider">
                            Nome do Negócio / Cooperativa
                        </label>
                        <input
                            type="text"
                            required
                            value={bName}
                            onChange={(e) => setBName(e.target.value)}
                            className="w-full bg-inho-black border border-inho-border rounded-xl px-4 py-3 text-inho-text focus:outline-none focus:border-inho-blue/50"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-mono uppercase text-inho-muted mb-2 tracking-wider">
                                Categoria de Negócio
                            </label>
                            <select
                                value={bCategory}
                                onChange={(e) => setBCategory(e.target.value as any)}
                                className="w-full bg-inho-black border border-inho-border rounded-xl px-4 py-3 text-inho-text focus:outline-none focus:border-inho-blue/50 font-bold appearance-none cursor-pointer"
                            >
                                <option value="COOPERATIVA">💎 Cooperativa</option>
                                <option value="VAREJO">🛍️ Varejo / Loja</option>
                                <option value="SERVICOS">🛠️ Prestação de Serviços</option>
                                <option value="OUTROS">🌐 Outros Faturamentos</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-mono uppercase text-inho-muted mb-2 tracking-wider">
                                CNPJ (Opcional)
                            </label>
                            <input
                                type="text"
                                value={bCnpj}
                                onChange={(e) => setBCnpj(e.target.value)}
                                placeholder="00.000.000/0001-00"
                                className="w-full bg-inho-black border border-inho-border rounded-xl px-4 py-3 text-inho-text focus:outline-none focus:border-inho-blue/50"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-4 flex items-center justify-center gap-2 py-4 rounded-xl font-black uppercase text-sm tracking-widest text-[#0F172A] transition-all
                       bg-gradient-to-r from-inho-blue to-inho-green hover:shadow-[0_0_20px_rgba(14,165,233,0.3)] disabled:opacity-50"
                    >
                        {loading ? 'Inicializando Infraestrutura...' : (
                            <><Save size={18} /> Injetar Negócio B2B2C</>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
