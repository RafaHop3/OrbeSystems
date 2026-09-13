'use client';
import React, { useState, useEffect } from 'react';
import { Building, Save, FileText, FileSignature, Briefcase } from 'lucide-react';

export default function MeuNegocioPage() {
    const [businessId, setBusinessId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [cnpj, setCnpj] = useState('');
    const [municipalReg, setMunicipalReg] = useState('');
    const [stateReg, setStateReg] = useState('');

    useEffect(() => {
        fetchBusiness();
    }, []);

    const fetchBusiness = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('orbe_token') || '';
            let API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://inho-api.orbesystems.com.br';

            if (typeof window !== 'undefined' && window.location.protocol === 'https:' && API_URL.startsWith('http://')) {
                API_URL = API_URL.replace('http://', 'https://');
            }

            const res = await fetch(`${API_URL}/api/v1/businesses/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    const b = data[0];
                    setBusinessId(b.id);
                    setName(b.name || '');
                    setCnpj(b.cnpj || '');
                    setMunicipalReg(b.municipal_registration || '');
                    setStateReg(b.state_registration || '');
                }
            }
        } catch (error) {
            console.error(error);
        }
        setIsLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!businessId) return;

        setIsSaving(true);
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('orbe_token') || '';
            const payload = {
                name,
                cnpj,
                municipal_registration: municipalReg,
                state_registration: stateReg
            };

            let API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://inho-api.orbesystems.com.br';

            if (typeof window !== 'undefined' && window.location.protocol === 'https:' && API_URL.startsWith('http://')) {
                API_URL = API_URL.replace('http://', 'https://');
            }

            const res = await fetch(`${API_URL}/api/v1/businesses/${businessId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Dados da empresa atualizados com sucesso!");
                fetchBusiness();
            } else {
                const err = await res.json();
                alert(`Erro ao salvar: ${err.detail || 'Falha na comunicação'}`);
            }
        } catch (error) {
            console.error(error);
            alert("Erro de conexão ao salvar configurações");
        }
        setIsSaving(false);
    };

    return (
        <div className="flex-1 min-h-screen bg-[#020406] text-[#b3b9c5] p-6 font-sans">
            <div className="max-w-4xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center bg-[#06080A] p-6 rounded-xl border border-[#1a1f26]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/10 rounded-lg">
                            <Building className="text-[#bc13fe]" size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-wide">Minha Empresa / Cooperativa</h1>
                            <p className="text-sm text-gray-500 mt-1">Configure os dados abertos do seu negócio central para emissões e notas</p>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="bg-[#06080A] rounded-xl border border-[#1a1f26] p-12 text-center">
                        <div className="animate-spin w-8 h-8 mx-auto border-2 border-purple-500 border-t-transparent rounded-full" />
                        <p className="mt-4 text-gray-500 text-sm font-mono tracking-widest">OBTENDO INFRAESTRUTURA DO NEGÓCIO...</p>
                    </div>
                ) : (
                    <div className="bg-[#06080A] rounded-xl border border-[#1a1f26] overflow-hidden">
                        <div className="p-6 border-b border-[#1a1f26] bg-[#12161c]">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Briefcase className="text-[#bc13fe]" size={20} />
                                Detalhes Fiscais e Institucionais
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Essas informações poderão aparecer nos relatórios e PDF dos clientes.</p>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* NOME FANTASIA */}
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <Building size={14} /> Nome da Empresa / Cooperativa
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-[#020406] border border-[#2a2f38] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-purple-500 transition-colors placeholder:text-gray-600"
                                        placeholder="Ex: Minha Empresa Inovadora LTDA"
                                    />
                                </div>

                                {/* CNPJ */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <FileText size={14} /> CNPJ
                                    </label>
                                    <input
                                        type="text"
                                        value={cnpj}
                                        onChange={(e) => setCnpj(e.target.value)}
                                        className="w-full bg-[#020406] border border-[#2a2f38] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-purple-500 transition-colors placeholder:text-gray-600 font-mono"
                                        placeholder="00.000.000/0000-00"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">Documento raiz associado à cooperativa.</p>
                                </div>

                                <div className="hidden md:block"></div> {/* Espaçador estrutural */}

                                {/* INSCRIÇÃO MUNICIPAL */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <FileSignature size={14} /> Inscrição Municipal (IM)
                                    </label>
                                    <input
                                        type="text"
                                        value={municipalReg}
                                        onChange={(e) => setMunicipalReg(e.target.value)}
                                        className="w-full bg-[#020406] border border-[#2a2f38] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-purple-500 transition-colors placeholder:text-gray-600"
                                        placeholder="Número da IM (se houver)"
                                    />
                                </div>

                                {/* INSCRIÇÃO ESTADUAL */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <FileSignature size={14} /> Inscrição Estadual (IE)
                                    </label>
                                    <input
                                        type="text"
                                        value={stateReg}
                                        onChange={(e) => setStateReg(e.target.value)}
                                        className="w-full bg-[#020406] border border-[#2a2f38] text-white px-4 py-3 rounded-lg focus:outline-none focus:border-purple-500 transition-colors placeholder:text-gray-600"
                                        placeholder="Número da IE (se houver)"
                                    />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-[#1a1f26] flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSaving || !businessId}
                                    className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition-colors shadow-[0_0_15px_rgba(188,19,254,0.3)] flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Save size={18} />
                                    {isSaving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
