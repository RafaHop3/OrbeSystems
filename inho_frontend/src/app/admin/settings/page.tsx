'use client';

import { useAuth } from '@/lib/AuthContext';
import { Settings, Shield, Bell, Key, Database, Monitor } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AdminSettings() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    // Mock settings categories
    const settingsCategories = [
        { title: 'Preferências do Sistema', icon: Monitor, description: 'Temas, fuso horário e regionalização' },
        { title: 'Segurança & MFA', icon: Shield, description: 'Duplo Fator de Autenticação, Logs e Auditoria' },
        { title: 'Notificações', icon: Bell, description: 'Fluxo de alertas por E-mail e WhatsApp' },
        { title: 'Chaves API', icon: Key, description: 'Gerenciamento de chaves para integrações externas' },
        { title: 'Backup & Banco de Dados', icon: Database, description: 'Políticas de retenção e Snapshots' }
    ];

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-terminal-bg p-8 flex items-center justify-center font-sans">
                <div className="text-center">
                    <Shield size={48} className="mx-auto text-red-500 mb-4" />
                    <h2 className="text-xl font-bold text-red-700">Acesso Negado</h2>
                    <p className="text-terminal-muted mt-2">Você não possui permissões administrativas.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-terminal-bg p-8 font-sans">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-8 border-b border-terminal-border pb-6">
                    <Link href="/dashboard" className="p-2 bg-terminal-dark/50 hover:bg-terminal-dark rounded-xl border border-terminal-border transition-colors">
                        <ArrowLeft className="text-terminal-muted hover:text-terminal-bright" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-black text-terminal-bright flex items-center gap-3 uppercase tracking-widest">
                            <Settings className="text-neon-purple w-8 h-8" />
                            Configurações
                        </h1>
                        <p className="text-terminal-muted text-xs mt-1">Gerencie os parâmetros globais da Instância Orbe</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {settingsCategories.map((cat, i) => (
                        <div key={i} className="glassmorphism p-6 rounded-2xl border border-terminal-border hover:border-neon-purple/50 transition-colors cursor-pointer group">
                            <div className="w-12 h-12 bg-neon-purple/10 text-neon-purple rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <cat.icon size={24} />
                            </div>
                            <h3 className="text-terminal-bright font-bold mb-2 uppercase text-sm tracking-wide">{cat.title}</h3>
                            <p className="text-terminal-muted text-xs leading-relaxed">{cat.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
