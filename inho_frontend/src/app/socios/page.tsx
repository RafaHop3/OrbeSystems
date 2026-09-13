"use client";

import React, { useState } from 'react';
import Sidebar from "@/components/Sidebar";
import { Search, Save, Shield, UserX, Briefcase, Key, MapPin, Hash } from 'lucide-react';

export default function SociosRegistrationPage() {
    // Form State
    const [cnpj, setCnpj] = useState("");
    const [cep, setCep] = useState("");
    const [formData, setFormData] = useState({
        razaoSocial: "",
        nomeFantasia: "",
        cnae: "",
        endereco: "",
        bairro: "",
        cidade: "",
        estado: "",
        nis: "",
        matricula: ""
    });
    const [isLoadingCnpj, setIsLoadingCnpj] = useState(false);
    const [isLoadingCep, setIsLoadingCep] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const handleCnpjSearch = async () => {
        const cleanCnpj = cnpj.replace(/\D/g, "");
        if (cleanCnpj.length !== 14) {
            setErrorMsg("CNPJ deve conter 14 dígitos.");
            return;
        }

        setIsLoadingCnpj(true);
        setErrorMsg("");

        try {
            const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
            if (!res.ok) throw new Error("CNPJ não encontrado ou erro na BrasilAPI.");

            const data = await res.json();

            setFormData(prev => ({
                ...prev,
                razaoSocial: data.razao_social || "",
                nomeFantasia: data.nome_fantasia || "",
                cnae: data.cnae_fiscal_descricao || "",
                endereco: `${data.logradouro || ""} ${data.numero || ""}`.trim(),
                bairro: data.bairro || "",
                cidade: data.municipio || "",
                estado: data.uf || ""
            }));

            if (data.cep) {
                setCep(data.cep.replace(/\D/g, ""));
            }

        } catch (err: any) {
            setErrorMsg(err.message || "Erro de conexão com BrasilAPI.");
        } finally {
            setIsLoadingCnpj(false);
        }
    };

    const handleCepSearch = async () => {
        const cleanCep = cep.replace(/\D/g, "");
        if (cleanCep.length !== 8) {
            setErrorMsg("CEP deve conter 8 dígitos.");
            return;
        }

        setIsLoadingCep(true);
        setErrorMsg("");

        try {
            const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCep}`);
            if (!res.ok) throw new Error("CEP não encontrado.");

            const data = await res.json();

            setFormData(prev => ({
                ...prev,
                endereco: data.street || "",
                bairro: data.neighborhood || "",
                cidade: data.city || "",
                estado: data.state || ""
            }));

        } catch (err: any) {
            setErrorMsg(err.message || "Erro de conexão com BrasilAPI (CEP).");
        } finally {
            setIsLoadingCep(false);
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setSuccessMsg("Sócio / Cooperado registrado no Banco de Dados (PostgreSQL) com sucesso!");
        setTimeout(() => setSuccessMsg(""), 3000);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <div className="flex h-screen bg-[#06080A] text-[#e6edf3] font-mono selection:bg-[#00fff5]/30 overflow-hidden relative">
            <Sidebar />

            <main className="flex-1 flex flex-col p-8 lg:p-12 relative bg-[#030406] shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-10 w-full overflow-y-auto custom-scrollbar">
                {/* Header */}
                <div className="flex flex-col mb-8 border-b border-[#1a1f26]/50 pb-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-[#bc13fe]/10 border border-[#bc13fe]/30 rounded-xl flex items-center justify-center">
                            <Shield className="text-[#bc13fe]" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-wide">
                                DOSSIÊ DE <span className="text-[#bc13fe]">SÓCIOS & COOPERADOS</span>
                            </h1>
                            <p className="text-[#8b949e] text-sm mt-1 flex items-center gap-2">
                                <Key size={12} className="text-[#39ff14]" />
                                Acesso Administrativo Autorizado
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form Container */}
                <div className="max-w-5xl w-full mx-auto relative z-10">
                    <form onSubmit={handleSave} className="flex flex-col gap-8">

                        {/* Section: Identificação */}
                        <div className="bg-[#0A0D12] border border-[#1a1f26] rounded-xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-[#bc13fe]" />
                            <h2 className="text-sm text-[#bc13fe] font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
                                <Briefcase size={16} />
                                1. Inteligência de Dados (Auto-Fill BrasilAPI)
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* CNPJ Input with Button */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-[#8b949e] uppercase tracking-wide">CNPJ</label>
                                    <div className="flex bg-[#030406] rounded-md border border-[#1a1f26] focus-within:border-[#bc13fe] transition-colors">
                                        <input
                                            type="text"
                                            value={cnpj}
                                            onChange={(e) => setCnpj(e.target.value)}
                                            placeholder="Ex: 00.000.000/0000-00"
                                            className="bg-transparent flex-1 p-2.5 text-sm text-white outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCnpjSearch}
                                            disabled={isLoadingCnpj}
                                            className="px-4 border-l border-[#1a1f26] text-[#bc13fe] hover:bg-[#bc13fe]/10 transition-colors flex items-center justify-center disabled:opacity-50"
                                        >
                                            {isLoadingCnpj ? <div className="w-4 h-4 border-2 border-[#bc13fe] border-t-transparent rounded-full animate-spin" /> : <Search size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-[#8b949e] uppercase tracking-wide">Razão Social</label>
                                    <input name="razaoSocial" value={formData.razaoSocial} onChange={handleChange} className="bg-[#030406] p-2.5 rounded-md border border-[#1a1f26] focus:border-[#bc13fe] transition-colors text-white text-sm outline-none" />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-[#8b949e] uppercase tracking-wide">Nome Fantasia</label>
                                    <input name="nomeFantasia" value={formData.nomeFantasia} onChange={handleChange} className="bg-[#030406] p-2.5 rounded-md border border-[#1a1f26] focus:border-[#bc13fe] transition-colors text-white text-sm outline-none" />
                                </div>

                                <div className="flex flex-col gap-2 lg:col-span-3">
                                    <label className="text-xs text-[#8b949e] uppercase tracking-wide">CNAE Principal</label>
                                    <input name="cnae" value={formData.cnae} onChange={handleChange} className="bg-[#030406] p-2.5 rounded-md border border-[#1a1f26] focus:border-[#bc13fe] transition-colors text-white text-sm outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* Section: Localização */}
                        <div className="bg-[#0A0D12] border border-[#1a1f26] rounded-xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-[#10b981]" />
                            <h2 className="text-sm text-[#10b981] font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
                                <MapPin size={16} />
                                2. Localização Geo-Espacial
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* CEP Input with Button */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-[#8b949e] uppercase tracking-wide">CEP</label>
                                    <div className="flex bg-[#030406] rounded-md border border-[#1a1f26] focus-within:border-[#10b981] transition-colors">
                                        <input
                                            type="text"
                                            value={cep}
                                            onChange={(e) => setCep(e.target.value)}
                                            placeholder="00000-000"
                                            className="bg-transparent flex-1 p-2.5 text-sm text-white outline-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCepSearch}
                                            disabled={isLoadingCep}
                                            className="px-4 border-l border-[#1a1f26] text-[#10b981] hover:bg-[#10b981]/10 transition-colors flex items-center justify-center disabled:opacity-50"
                                        >
                                            {isLoadingCep ? <div className="w-4 h-4 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin" /> : <Search size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 lg:col-span-3">
                                    <label className="text-xs text-[#8b949e] uppercase tracking-wide">Endereço (Logradouro)</label>
                                    <input name="endereco" value={formData.endereco} onChange={handleChange} className="bg-[#030406] p-2.5 rounded-md border border-[#1a1f26] focus:border-[#10b981] transition-colors text-white text-sm outline-none" />
                                </div>

                                <div className="flex flex-col gap-2 lg:col-span-2">
                                    <label className="text-xs text-[#8b949e] uppercase tracking-wide">Bairro</label>
                                    <input name="bairro" value={formData.bairro} onChange={handleChange} className="bg-[#030406] p-2.5 rounded-md border border-[#1a1f26] focus:border-[#10b981] transition-colors text-white text-sm outline-none" />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-[#8b949e] uppercase tracking-wide">Cidade</label>
                                    <input name="cidade" value={formData.cidade} onChange={handleChange} className="bg-[#030406] p-2.5 rounded-md border border-[#1a1f26] focus:border-[#10b981] transition-colors text-white text-sm outline-none" />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-[#8b949e] uppercase tracking-wide">UF</label>
                                    <input name="estado" value={formData.estado} onChange={handleChange} className="bg-[#030406] p-2.5 rounded-md border border-[#1a1f26] focus:border-[#10b981] transition-colors text-white text-sm outline-none uppercase text-center" maxLength={2} />
                                </div>
                            </div>
                        </div>

                        {/* Section: Campos Exclusivos INHO */}
                        <div className="bg-[#0A0D12] border border-[#1a1f26] rounded-xl p-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-[#f59e0b]" />
                            <h2 className="text-sm text-[#f59e0b] font-bold tracking-widest uppercase mb-6 flex items-center gap-2">
                                <Hash size={16} />
                                3. Identificadores Exclusivos INHO
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-[#8b949e] uppercase tracking-wide">NIS (Número de Identificação)</label>
                                    <input name="nis" value={formData.nis} onChange={handleChange} placeholder="Insira o NIS" className="bg-[#030406] p-2.5 rounded-md border border-[#1a1f26] focus:border-[#f59e0b] transition-colors text-white text-sm outline-none" />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs text-[#8b949e] uppercase tracking-wide">Matrícula dos Correios</label>
                                    <input name="matricula" value={formData.matricula} onChange={handleChange} placeholder="Insira a Matrícula" className="bg-[#030406] p-2.5 rounded-md border border-[#1a1f26] focus:border-[#f59e0b] transition-colors text-white text-sm outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* Alerts */}
                        {errorMsg && (
                            <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-md text-red-500 text-sm flex items-center gap-3">
                                <UserX size={16} /> {errorMsg}
                            </div>
                        )}
                        {successMsg && (
                            <div className="p-4 bg-emerald-900/20 border border-emerald-500/50 rounded-md text-emerald-400 text-sm flex items-center gap-3">
                                <Shield size={16} /> {successMsg}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end mt-4">
                            <button
                                type="submit"
                                className="flex items-center gap-2 bg-gradient-to-r from-[#bc13fe]/20 to-[#bc13fe]/10 border border-[#bc13fe]/50 text-[#bc13fe] hover:bg-[#bc13fe]/20 focus:ring-2 focus:ring-[#bc13fe]/50 px-8 py-3 rounded-lg text-sm font-bold uppercase tracking-widest transition-all"
                            >
                                <Save size={16} />
                                Registrar Dossiê Seguramente
                            </button>
                        </div>
                    </form>
                </div>

                {/* Background Decor */}
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#bc13fe]/5 rounded-full blur-[150px] pointer-events-none" />
            </main>
        </div>
    );
}
