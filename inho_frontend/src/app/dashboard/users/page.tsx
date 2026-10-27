'use client';

import { useState, useEffect } from 'react';
import { usersApi, businessesApi, BusinessOut, UserMe, UserCreatePayload } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

export default function UsersPage() {
    const { user: currentUser, activeBusinessId } = useAuth();
    const [users, setUsers] = useState<UserMe[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // Modal Form state
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'super_admin' | 'admin' | 'operator' | 'viewer' | 'client'>('operator');
    const [selectedBusiness, setSelectedBusiness] = useState<string>('');

    const [businesses, setBusinesses] = useState<BusinessOut[]>([]);

    const isAdmin = currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [usersData, bizData] = await Promise.all([
                usersApi.list(),
                businessesApi.list()
            ]);

            setUsers(usersData);
            setBusinesses(bizData);

            if (activeBusinessId) {
                setSelectedBusiness(activeBusinessId);
            } else if (bizData.length > 0) {
                setSelectedBusiness(bizData[0].id);
            }
        } catch (err: any) {
            setError(err?.message || 'Falha ao carregar a lista de usuários da equipe.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAdmin) {
            loadData();
        } else {
            setLoading(false);
        }
    }, [isAdmin, activeBusinessId]);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName.trim() || !email.trim() || !password.trim()) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        try {
            setSaving(true);
            const payload: UserCreatePayload = {
                full_name: fullName.trim(),
                email: email.trim(),
                password: password.trim(),
                role: role,
                is_active: true,
                business_id: role === 'admin' || role === 'super_admin' ? undefined : (selectedBusiness || undefined),
            };

            await usersApi.create(payload);
            setShowModal(false);
            setFullName('');
            setEmail('');
            setPassword('');
            setRole('operator');
            await loadData();
        } catch (err: any) {
            alert(err?.message || 'Erro ao cadastrar novo sub-usuário.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteUser = async (userToDelete: UserMe) => {
        if (userToDelete.id === currentUser?.id) {
            alert('Você não pode excluir seu próprio usuário.');
            return;
        }

        if (!confirm(`Tem certeza que deseja excluir o colaborador "${userToDelete.full_name}"?`)) {
            return;
        }

        try {
            await usersApi.delete(userToDelete.id);
            await loadData();
        } catch (err: any) {
            alert(err?.message || 'Falha ao remover o colaborador.');
        }
    };

    const getRoleBadge = (roleStr: string, roleLabel?: string) => {
        const label = roleLabel || roleStr.toUpperCase();
        if (roleStr === 'super_admin' || roleStr === 'admin') {
            return (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-inho-gold/20 text-inho-gold border border-inho-gold/40">
                    {label}
                </span>
            );
        }
        if (roleStr === 'operator') {
            return (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-700 border border-blue-500/40">
                    {label}
                </span>
            );
        }
        if (roleStr === 'viewer') {
            return (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-700 border border-purple-500/40">
                    {label}
                </span>
            );
        }
        return (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white text-zinc-300 border border-[#E2E8F0]">
                {label}
            </span>
        );
    };

    const totalUsers = users.length;
    const adminCount = users.filter((u) => u.role === 'super_admin' || u.role === 'admin').length;
    const operatorCount = users.filter((u) => u.role === 'operator').length;
    const viewerCount = users.filter((u) => u.role === 'viewer').length;

    if (!isAdmin) {
        return (
            <div className="p-8 text-center">
                <div className="glassmorphism max-w-md mx-auto p-8 rounded-2xl border border-red-500/20">
                    <h2 className="text-xl font-bold text-red-700 mb-2">Acesso Restrito</h2>
                    <p className="text-inho-muted text-sm">
                        Apenas Usuários Mestres (Administradores) possuem permissão para visualizar e gerenciar sub-usuários da equipe.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header & Main Action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold text-inho-text">Gestão de Equipe & Sub-usuários</h1>
                    <p className="text-sm text-inho-muted">
                        Cadastre funcionários e defina os níveis de permissão da sua instituição.
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-inho-gold text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-inho-gold/90 transition-all shadow-lg hover:shadow-inho-gold/20 flex items-center justify-center gap-2"
                >
                    <span>Novo Colaborador</span>
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glassmorphism p-5 rounded-2xl border border-inho-gold/20">
                    <p className="text-xs text-inho-muted uppercase font-medium">Total de Colaboradores</p>
                    <p className="text-2xl font-bold text-inho-text mt-1">{totalUsers}</p>
                </div>
                <div className="glassmorphism p-5 rounded-2xl border border-inho-gold/20">
                    <p className="text-xs text-inho-muted uppercase font-medium">Usuários Mestres (Admins)</p>
                    <p className="text-2xl font-bold text-inho-gold mt-1">{adminCount}</p>
                </div>
                <div className="glassmorphism p-5 rounded-2xl border border-blue-500/20">
                    <p className="text-xs text-inho-muted uppercase font-medium">Operadores</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">{operatorCount}</p>
                </div>
                <div className="glassmorphism p-5 rounded-2xl border border-purple-500/20">
                    <p className="text-xs text-inho-muted uppercase font-medium">Visualizadores</p>
                    <p className="text-2xl font-bold text-purple-700 mt-1">{viewerCount}</p>
                </div>
            </div>

            {/* Main Table */}
            <div className="glassmorphism rounded-2xl border border-inho-gold/20 overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center text-inho-muted">Carregando colaboradores...</div>
                ) : error ? (
                    <div className="p-8 text-center text-red-700">{error}</div>
                ) : users.length === 0 ? (
                    <div className="p-12 text-center text-inho-muted">Nenhum colaborador cadastrado.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-inho-black/40 border-b border-inho-gold/10 text-xs text-inho-muted uppercase font-semibold">
                                    <th className="py-4 px-6">Nome Completo</th>
                                    <th className="py-4 px-6">E-mail</th>
                                    <th className="py-4 px-6">Permissão ("Opção de Poder")</th>
                                    <th className="py-4 px-6">Status</th>
                                    <th className="py-4 px-6">Data de Cadastro</th>
                                    <th className="py-4 px-6 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-inho-gold/10 text-sm">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-inho-gold/5 transition-colors">
                                        <td className="py-4 px-6 font-medium text-inho-text">{u.full_name}</td>
                                        <td className="py-4 px-6 text-inho-muted">{u.email}</td>
                                        <td className="py-4 px-6">{getRoleBadge(u.role, u.role_label)}</td>
                                        <td className="py-4 px-6">
                                            {u.is_active ? (
                                                <span className="text-xs font-semibold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                                    Ativo
                                                </span>
                                            ) : (
                                                <span className="text-xs font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                                                    Inativo
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-inho-muted text-xs">
                                            {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '-'}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            {u.id !== currentUser?.id && (
                                                <button
                                                    onClick={() => handleDeleteUser(u)}
                                                    className="text-xs font-medium text-rose-400 hover:text-rose-300 hover:underline transition-all"
                                                >
                                                    Excluir
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal: Novo Colaborador */}
            {showModal && (
                <div className="fixed inset-0 z-50 bg-white backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="glassmorphism w-full max-w-lg rounded-2xl border border-inho-gold/30 p-6 space-y-6 shadow-2xl animate-fade-in">
                        <div className="flex items-center justify-between border-b border-inho-gold/10 pb-4">
                            <h2 className="text-lg font-bold text-inho-text">Cadastrar Novo Colaborador</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-inho-muted hover:text-inho-text text-xl font-bold"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-inho-muted mb-1">
                                    Nome Completo *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: João da Silva"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-inho-black/60 border border-inho-gold/20 rounded-xl px-4 py-2.5 text-inho-text text-sm focus:outline-none focus:border-inho-gold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-inho-muted mb-1">
                                    E-mail Corporativo *
                                </label>
                                <input
                                    type="email"
                                    required
                                    placeholder="exemplo@instituicao.com.br"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-inho-black/60 border border-inho-gold/20 rounded-xl px-4 py-2.5 text-inho-text text-sm focus:outline-none focus:border-inho-gold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-inho-muted mb-1">
                                    Senha Inicial *
                                </label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Mínimo 8 caracteres"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-inho-black/60 border border-inho-gold/20 rounded-xl px-4 py-2.5 text-inho-text text-sm focus:outline-none focus:border-inho-gold"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-inho-muted mb-1">
                                    Nível de Permissão ("Opção de Poder") *
                                </label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as any)}
                                    className="w-full bg-inho-black/60 border border-inho-gold/20 rounded-xl px-4 py-2.5 text-inho-text text-sm focus:outline-none focus:border-inho-gold"
                                >
                                    <option value="operator">Operador (Criação e edição de vendas, cobranças e contratos)</option>
                                    <option value="viewer">Visualizador (Acesso apenas para leitura e consultas)</option>
                                    <option value="admin">Administrador / Mestre (Acesso total + gestão de equipe)</option>
                                </select>
                            </div>

                            {role !== 'admin' && businesses.length > 0 && (
                                <div>
                                    <label className="block text-xs font-medium text-inho-muted mb-1">
                                        Empresa / Segmento Alocado *
                                    </label>
                                    <select
                                        value={selectedBusiness}
                                        onChange={(e) => setSelectedBusiness(e.target.value)}
                                        className="w-full bg-inho-black/60 border border-inho-gold/20 rounded-xl px-4 py-2.5 text-inho-text text-sm focus:outline-none focus:border-inho-gold"
                                    >
                                        {businesses.map((biz) => (
                                            <option key={biz.id} value={biz.id}>
                                                {biz.name} ({biz.category})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-inho-muted mt-1 ml-1 pl-1 border-l border-inho-gold/30">
                                        Operadores e visualizadores serão estritamente vinculados a este negócio.
                                    </p>
                                </div>
                            )}

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-inho-gold/10">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-sm text-inho-muted hover:text-inho-text transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-inho-gold text-white font-semibold px-5 py-2 rounded-xl hover:bg-inho-gold/90 transition-all text-sm disabled:opacity-50"
                                >
                                    {saving ? 'Cadastrando...' : 'Cadastrar Colaborador'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
