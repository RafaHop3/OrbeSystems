'use client';

import { useEffect, useState } from 'react';
import { Shield, Crown, User as UserIcon, Activity, Plus, X, Command } from 'lucide-react';

export default function InhoPanel({ currentUserRole }: { currentUserRole?: string }) {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showCreateForm, setShowCreateForm] = useState(false);
    const [form, setForm] = useState({ email: '', full_name: '', password: '', role: 'operator' });
    const [creating, setCreating] = useState(false);

    // Authentication State for INHO backend
    const [inhoToken, setInhoToken] = useState<string | null>(null);
    const [loginForm, setLoginForm] = useState({ email: 'admin@inho.com', password: '' });
    const [loggingIn, setLoggingIn] = useState(false);

    // Inho API is completely divorced from Orbe Main URL
    const INHO_API_URL = 'https://inho-api.orbesystems.com.br/api/v1';

    useEffect(() => {
        const savedToken = localStorage.getItem('inho_admin_token');
        if (savedToken) {
            setInhoToken(savedToken);
        } else {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (inhoToken) {
            fetchUsers(inhoToken);
        }
    }, [inhoToken]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoggingIn(true);
        setError(null);
        try {
            const res = await fetch(`${INHO_API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginForm)
            });
            if (!res.ok) {
                throw new Error('Credenciais INHO inválidas ou servidor inacessível');
            }
            const data = await res.json();
            setInhoToken(data.access_token);
            localStorage.setItem('inho_admin_token', data.access_token);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoggingIn(false);
        }
    };

    const handleLogout = () => {
        setInhoToken(null);
        setUsers([]);
        localStorage.removeItem('inho_admin_token');
    };

    const fetchUsers = async (token: string) => {
        try {
            setLoading(true);
            const res = await fetch(`${INHO_API_URL}/users/`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                if (res.status === 401) {
                    handleLogout();
                    throw new Error('Sessão INHO expirada. Faça login novamente.');
                }
                if (res.status === 403) throw new Error('Esta conta INHO não tem privilégios de administrador');
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
        if (!inhoToken) return;
        try {
            const res = await fetch(`${INHO_API_URL}/users/${userId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${inhoToken}`
                },
                body: JSON.stringify({ role: newRole })
            });
            if (!res.ok) throw new Error('Falha ao atualizar permições do operador');

            fetchUsers(inhoToken); // Refresh silently
        } catch (err) {
            alert('Erro ao propagar elevação de painel');
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('DESEJA REALMENTE ANILIQUILAR ESTA CONTA NO ECOSSISTEMA INHO?')) return;
        if (!inhoToken) return;

        try {
            const res = await fetch(`${INHO_API_URL}/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${inhoToken}` }
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
        if (!inhoToken) return;

        setCreating(true);
        try {
            const res = await fetch(`${INHO_API_URL}/users/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${inhoToken}`
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

            await fetchUsers(inhoToken);
            setShowCreateForm(false);
            setForm({ email: '', full_name: '', password: '', role: 'operator' });
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
                    {inhoToken && (
                        <>
                            <button
                                onClick={() => fetchUsers(inhoToken)}
                                className="text-[10px] text-green-500/60 hover:text-green-400"
                            >
                                REFRESH
                            </button>
                            <span className="text-[10px] text-green-500/40 px-2 border border-green-500/20 rounded">
                                {users.length} ENTIDADES
                            </span>
                            {currentUserRole === 'superadmin' && (
                                <button
                                    onClick={() => setShowCreateForm(!showCreateForm)}
                                    className="flex items-center gap-1 text-[10px] bg-green-500/10 text-green-400 px-3 py-1 border border-green-500/30 hover:bg-green-500/20 transition-all font-bold"
                                >
                                    {showCreateForm ? <X size={10} /> : <Plus size={10} />}
                                    {showCreateForm ? 'CANCEL' : 'NOVA IDENTIDADE INHO'}
                                </button>
                            )}
                            <button
                                onClick={handleLogout}
                                className="text-[10px] text-red-500/80 border border-red-500/20 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                            >
                                LOGOUT INHO
                            </button>
                        </>
                    )}
                </div>
            </h2>

            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-mono uppercase mb-4">
                    ERROR_CODE: {error}
                </div>
            )}

            {!inhoToken ? (
                <div className="flex flex-col items-center justify-center p-10 border border-green-500/20 bg-black/40">
                    <Shield size={32} className="text-green-500 mb-4" />
                    <h3 className="text-green-400 font-bold tracking-widest text-sm mb-2">INHO - AUTENTICAÇÃO NECESSÁRIA</h3>
                    <p className="text-green-500/60 text-[10px] mb-6 text-center max-w-sm">
                        O gerenciamento da equipe INHO requer um token administrativo do backend exclusivo da plataforma. Por favor, identifique-se.
                    </p>
                    <form onSubmit={handleLogin} className="flex flex-col w-full max-w-xs gap-3">
                        <input
                            type="email"
                            placeholder="E-MAIL DE ADMIN INHO"
                            value={loginForm.email}
                            onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                            className="bg-transparent border border-green-500/30 text-green-400 text-xs focus:outline-none focus:border-green-400 p-3"
                            required
                        />
                        <input
                            type="password"
                            placeholder="SENHA ADMINISTRATIVA"
                            value={loginForm.password}
                            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                            className="bg-transparent border border-green-500/30 text-green-400 text-xs focus:outline-none focus:border-green-400 p-3"
                            required
                        />
                        <button
                            type="submit"
                            disabled={loggingIn}
                            className="bg-green-500/20 text-green-400 font-bold tracking-widest text-xs p-3 hover:bg-green-500/40 transition-colors uppercase"
                        >
                            {loggingIn ? 'VERIFICANDO...' : 'INICIALIZAR LOGIN'}
                        </button>
                    </form>
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
                                <option value="admin">ASSINANTE INHO (ADMIN)</option>
                                <option value="operator">OPERADOR INHO (FUNC.)</option>
                            </select>
                            <button
                                onClick={handleCreate} disabled={creating}
                                className="bg-green-500/20 text-green-400 text-[10px] font-bold border border-green-500/40 hover:bg-green-500 hover:text-black transition-colors flex items-center justify-center gap-2 uppercase tracking-wider relative overflow-hidden group"
                            >
                                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-green-400/20 to-transparent -translate-x-full group-hover:translate-x-full duration-500"></span>
                                {creating ? 'INJETANDO MASTER (BYPASS RLS)...' : 'INJETAR DIRETAMENTE NO DB (MASTER)'}
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
                                    {(u.role === 'admin' || u.role === 'super_admin') ? (
                                        <span className="text-[9px] text-green-400 border border-green-400/40 bg-green-400/10 px-2 py-0.5 rounded flex items-center gap-1">
                                            <Crown size={8} /> {u.role === 'super_admin' ? 'SUPER ADMIN' : 'MASTER'}
                                        </span>
                                    ) : (
                                        <span className="text-[9px] text-green-500/50 border border-green-500/20 px-2 py-0.5 rounded uppercase">
                                            {u.role}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-green-500/10">
                                    {currentUserRole === 'superadmin' && (
                                        <select
                                            value={u.role}
                                            onChange={e => handleRoleChange(u.id, e.target.value)}
                                            className="flex-1 bg-black text-[9px] text-green-500/80 border border-green-500/20 px-2 py-1 focus:outline-none uppercase"
                                        >
                                            <option value="admin">ROLE: ASSINANTE INHO (ADMIN)</option>
                                            <option value="operator">ROLE: OPERADOR INHO</option>
                                        </select>
                                    )}
                                    {currentUserRole === 'superadmin' && (
                                        <button
                                            onClick={() => handleDelete(u.id)}
                                            className="text-[9px] text-red-500 border border-red-500/20 px-3 py-1 hover:bg-red-500 hover:text-white transition-all uppercase"
                                        >
                                            PURGE
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            )}
        </div>
    );
}
