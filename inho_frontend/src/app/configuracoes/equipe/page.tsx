'use client';
import React, { useState, useEffect } from 'react';
import { Users, Plus, X, Lock, Shield, Mail } from 'lucide-react';

export default function EquipeAcessosPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('OPERATOR');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('orbe_token') || '';
            const res = await fetch('http://localhost:8000/api/v1/users/', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error(error);
        }
        setIsLoading(false);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('orbe_token') || '';
            const payload = {
                email,
                password,
                role
            };

            const res = await fetch('http://localhost:8000/api/v1/users/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Usuário criado com sucesso!");
                setIsModalOpen(false);
                fetchUsers(); // Refresh list
                setEmail('');
                setPassword('');
            } else {
                const err = await res.json();
                alert(`Erro ao criar: ${err.detail || 'Verifique as permissões'}`);
            }
        } catch (error) {
            console.error(error);
            alert("Erro de conexão ao criar usuário");
        }
        setIsSubmitting(false);
    };

    return (
        <div className="flex-1 min-h-screen bg-[#020406] text-[#b3b9c5] p-6 font-sans">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center bg-[#06080A] p-6 rounded-xl border border-[#1a1f26]">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-teal-500/10 rounded-lg">
                            <Shield className="text-teal-400" size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-wide">Gestão de Equipe & Acessos</h1>
                            <p className="text-sm text-gray-500 mt-1">Convidar e gerenciar operadores do sistema INHO</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-md font-semibold transition-colors shadow-[0_0_15px_rgba(20,184,166,0.2)]"
                    >
                        <Plus size={18} />
                        Convidar Acesso
                    </button>
                </div>

                {/* Table */}
                <div className="bg-[#06080A] rounded-xl border border-[#1a1f26] overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#12161c] border-b border-[#1a1f26] text-xs uppercase tracking-wider text-gray-400">
                                <th className="px-6 py-4 font-semibold">Credencial (E-mail)</th>
                                <th className="px-6 py-4 font-semibold">Nível de Acesso (Role)</th>
                                <th className="px-6 py-4 font-semibold">Status de Verificação</th>
                                <th className="px-6 py-4 font-semibold text-right">Data de Criação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1a1f26]">
                            {isLoading ? (
                                <tr><td colSpan={4} className="p-8 text-center"><div className="animate-spin w-8 h-8 mx-auto border-2 border-teal-500 border-t-transparent rounded-full" /></td></tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        Nenhum usuário secundário encontrado no momento.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user, idx) => (
                                    <tr key={idx} className="hover:bg-[#0a0d12] transition-colors group">
                                        <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs border border-gray-700">
                                                <Users size={14} className="text-gray-400" />
                                            </div>
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${user.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-green-500 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded textxs">Ativo</span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-500 text-sm">
                                            {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#0A0D12] w-full max-w-lg rounded-2xl shadow-2xl border border-[#1a1f26] overflow-hidden flex flex-col">

                        <div className="px-6 py-5 border-b border-[#1a1f26] flex items-center justify-between bg-[#12161c]">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Shield className="text-teal-400" size={20} />
                                Nova Credencial de Acesso
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-6">

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                        <Mail size={14} /> E-mail (Login)
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-[#06080A] border border-[#2a2f38] text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-teal-500 transition-colors"
                                        placeholder="operador@franquia.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                        <Lock size={14} /> Senha Inicial
                                    </label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-[#06080A] border border-[#2a2f38] text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-teal-500 transition-colors"
                                        placeholder="Digite a senha provisória"
                                    />
                                    <p className="text-[10px] text-gray-500 mt-1">O usuário terá a oportunidade de redefinir ou será forçado a utilizar na entrada.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                        <Shield size={14} /> Nível de Acesso
                                    </label>
                                    <select
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full bg-[#06080A] border border-[#2a2f38] text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-teal-500 transition-colors appearance-none"
                                    >
                                        <option value="OPERATOR">🟢 Operador (Acesso Limitado, PDV e CRM Pessoal)</option>
                                        <option value="ADMIN">🟣 Administrador Master (Acesso Total)</option>
                                    </select>
                                </div>

                            </div>

                            <div className="pt-4 border-t border-[#1a1f26] flex justify-end">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-8 py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-teal-500/20 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'CRIANDO...' : 'SALVAR E AUTORIZAR ACESSO'}
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
