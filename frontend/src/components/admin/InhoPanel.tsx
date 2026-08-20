'use client';

import { useEffect, useState } from 'react';
import { Shield, Crown, User as UserIcon, Activity, Plus, X, Command } from 'lucide-react';

export default function InhoPanel() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [form, setForm] = useState({ email: '', full_name: '', password: '', role: 'USER' });
    const [creating, setCreating] = useState(false);

    // Inho API is completely divorced from Orbe Main URL
    const INHO_API_URL = 'https://business-api.orbesystems.com.br/api/v1';

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const token = localStorage.getItem('orbe_admin_token');
        if (!token) {
            setError('Sessão Administrativa não encontrada');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`${INHO_API_URL}/users/`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                if (res.status === 401) throw new Error('Token inválido ou sessão expirada no INHO Backend');
                if (res.status === 403) throw new Error('Sua conta Orbe Admin não tem privilégios dentro do INHO Sys');
                throw new Error(`Business API Error: ${res.status}`);
            }

            const data = await res.json();
            setUsers(data);
            setError(null);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Falha catastrófica ao sincronizar banco INHO');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        const token = localStorage.getItem('orbe_admin_token');
        try {
            const res = await fetch(`${INHO_API_URL}/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });
            if (!res.ok) throw new Error('Falha ao atualizar permições do operador');

            fetchUsers(); // Refresh silently
        } catch (err) {
            alert('Erro ao propagar elevação de painel');
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('DESEJA REALMENTE ANILIQUILAR ESTA CONTA NO ECOSSISTEMA INHO?')) return;

        const token = localStorage.getItem('orbe_admin_token');
        try {
            const res = await fetch(`${INHO_API_URL}/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Falha ao deletar conta');
            }
            setUsers(prev => prev.filter(u => u.id !== userId));
        } catch (err: any) {
            alert(err.message || 'Erro ao apagar entidade');
        }
    };

    const handleCreate = async () => {
        if (!form.email || !form.password || !form.full_name) {
            alert('PREENCHA TODOS OS DADOS DA IDENTIDADE'); return;
        }

        setCreating(true);
        const token = localStorage.getItem('orbe_admin_token');
        try {
            const res = await fetch(`${INHO_API_URL}/users/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: form.email,
                    full_name: form.full_name,
                    password: form.password,
                    role: form.role,
                    is_active: true
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Injeção falhou');
            }

            await fetchUsers();
            setShowCreateForm(false);
            setForm({ email: '', full_name: '', password: '', role: 'USER' });
        } catch (err: any) {
            alert(err.message);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="border border-green-500/30 bg-green-500/5 p-5 animate-in fade-in duration-500">
            <h2 className="text-xs font-bold border-b border-green-500/10 pb-3 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-400 uppercase tracking-widest shadow-[0_0_10px_rgba(34,197,94,0.1)]">
                    <Command size={14} className="text-green-500" /> INHO BUSINESS ADMIN
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fetchUsers()}
                        className="text-[10px] text-green-500/60 hover:text-green-400"
                    >
                        REFRESH
                    </button>
                    <span className="text-[10px] text-green-500/40 px-2 border border-green-500/20 rounded">
                        {users.length} ENTIDADES
                    </span>
                    <button
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="flex items-center gap-1 text-[10px] bg-green-500/10 text-green-400 px-3 py-1 border border-green-500/30 hover:bg-green-500/20 transition-all font-bold"
                    >
                        {showCreateForm ? <X size={10} /> : <Plus size={10} />}
                        {showCreateForm ? 'CANCEL' : 'NOVA IDENTIDADE'}
                    </button>
                </div>
            </h2>

            {error ? (
                <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-mono uppercase">
                    ERROR_CODE: {error}
                </div>
            ) : loading ? (
                <div className="flex items-center gap-3 text-green-500/60 text-xs p-4 border border-green-500/20 bg-black/40">
                    <Activity size={14} className="animate-spin" /> FETCHING CROSSED DATASTREAM...
                </div>
            ) : (
                <div className="space-y-4">

                    {showCreateForm && (
                        <div className="border border-green-500/40 bg-black/60 p-4 mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                            <input
                                type="text" placeholder="NOME COMPLETO"
                                value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
                                className="bg-transparent border-b border-green-500/30 text-green-400 text-[10px] focus:outline-none focus:border-green-400 p-2"
                            />
                            <input
                                type="email" placeholder="E-MAIL"
                                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                                className="bg-transparent border-b border-green-500/30 text-green-400 text-[10px] focus:outline-none focus:border-green-400 p-2"
                            />
                            <input
                                type="password" placeholder="SENHA INICIAL"
                                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                                className="bg-transparent border-b border-green-500/30 text-green-400 text-[10px] focus:outline-none focus:border-green-400 p-2"
                            />
                            <select
                                value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                                className="bg-black border border-green-500/30 text-green-400 text-[10px] focus:outline-none focus:border-green-400 p-2 uppercase"
                            >
                                <option value="USER">USER</option>
                                <option value="OPERATOR">OPERATOR</option>
                                <option value="MANAGER">MANAGER</option>
                                <option value="ADMIN">ADMIN</option>
                            </select>
                            <button
                                onClick={handleCreate} disabled={creating}
                                className="bg-green-500/20 text-green-400 text-[10px] font-bold border border-green-500/40 hover:bg-green-500 hover:text-black transition-colors flex items-center justify-center gap-2 uppercase tracking-wider"
                            >
                                {creating ? 'INJETANDO...' : 'EXECUTAR'}
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {users.map(u => (
                            <div key={u.id} className="border border-green-500/20 bg-black/40 p-4 hover:border-green-500/40 transition-colors">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <UserIcon size={12} className="text-green-500" />
                                        <div>
                                            <h4 className="text-sm font-bold text-white tracking-widest leading-none drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">{u.full_name || 'N/A'}</h4>
                                            <p className="text-[9px] text-green-500/50 mt-1 uppercase">{u.email}</p>
                                        </div>
                                    </div>
                                    {u.role === 'ADMIN' ? (
                                        <span className="text-[9px] text-green-400 border border-green-400/40 bg-green-400/10 px-2 py-0.5 rounded flex items-center gap-1">
                                            <Crown size={8} /> MASTER
                                        </span>
                                    ) : (
                                        <span className="text-[9px] text-green-500/50 border border-green-500/20 px-2 py-0.5 rounded">
                                            {u.role}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-green-500/10">
                                    <select
                                        value={u.role}
                                        onChange={e => handleRoleChange(u.id, e.target.value)}
                                        className="flex-1 bg-black text-[9px] text-green-500/80 border border-green-500/20 px-2 py-1 focus:outline-none uppercase"
                                    >
                                        <option value="USER">ROLE: USER</option>
                                        <option value="OPERATOR">ROLE: OPERATOR</option>
                                        <option value="MANAGER">ROLE: MANAGER</option>
                                        <option value="ADMIN">ROLE: ADMIN</option>
                                    </select>
                                    <button
                                        onClick={() => handleDelete(u.id)}
                                        className="text-[9px] text-red-500 border border-red-500/20 px-3 py-1 hover:bg-red-500 hover:text-white transition-all uppercase"
                                    >
                                        PURGE
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            )}
        </div>
    );
}
