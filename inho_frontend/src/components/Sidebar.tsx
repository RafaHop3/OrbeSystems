'use client';
import { useAuth } from '@/contexts/AuthContext';
import {
    LogOut, LayoutDashboard, Users, MessageSquare, Briefcase,
    Wallet, Receipt, FileText, BarChart3, Fingerprint, Calendar, Settings,
    ShoppingCart, Store, Calculator, HandCoins
} from 'lucide-react';
import Link from 'next/link';

export default function Sidebar() {
    const { user, logout } = useAuth();

    return (
        <aside className="w-64 h-screen bg-gray-900 overflow-y-auto text-white flex flex-col border-r border-gray-800 scrollbar-thin scrollbar-thumb-gray-700">
            <div className="flex-1">
                <div className="p-6 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
                    <h2 className="text-2xl font-bold tracking-tight text-blue-500">INHO/Orbe</h2>
                    {/* Identity moved to Sticky Footer */}
                </div>

                <nav className="p-4 space-y-1 text-sm font-medium">
                    <Link href="/" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                        <LayoutDashboard size={18} /><span>Dashboard</span>
                    </Link>

                    <div className="pt-4 pb-2 px-3 text-[10px] uppercase text-gray-500 font-bold tracking-wider">Vendas & PDV</div>
                    <Link href="/pdv" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                        <Store size={18} /><span>Terminal PDV</span>
                    </Link>
                    <Link href="/vendas" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                        <ShoppingCart size={18} /><span>Vendas & Pedidos</span>
                    </Link>

                    <div className="pt-4 pb-2 px-3 text-[10px] uppercase text-gray-500 font-bold tracking-wider">Financeiro</div>
                    <Link href="/caixa" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                        <Calculator size={18} /><span>Abrir Caixa</span>
                    </Link>
                    <Link href="/receber" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                        <HandCoins size={18} /><span>Contas a Receber</span>
                    </Link>
                    <Link href="/pagar" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                        <Wallet size={18} /><span>Contas a Pagar</span>
                    </Link>
                    <Link href="/cobrancas" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                        <Receipt size={18} /><span>Cobranças & Boletos</span>
                    </Link>
                    <Link href="/nfse" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                        <FileText size={18} /><span>Notas Fiscais (NFSe)</span>
                    </Link>
                    <Link href="/relatorios" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                        <BarChart3 size={18} /><span>Relatórios Financeiros</span>
                    </Link>

                    <div className="pt-4 pb-2 px-3 text-[10px] uppercase text-gray-500 font-bold tracking-wider">CRM & Contatos</div>
                    <Link href="/clientes" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                        <Users size={18} /><span>Clientes & Sócios</span>
                    </Link>
                    <Link href="/fornecedores" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                        <Briefcase size={18} /><span>Fornecedores</span>
                    </Link>
                    <Link href="/contratos" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                        <FileText size={18} /><span>Contratos</span>
                    </Link>

                    <div className="pt-4 pb-2 px-3 text-[10px] uppercase text-gray-500 font-bold tracking-wider">Ferramentas Hub</div>
                    <Link href="/vendas/whatsapp" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                        <MessageSquare size={18} /><span>Disparador WhatsApp</span>
                    </Link>
                    <Link href="/agendamentos" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                        <Calendar size={18} /><span>Agendamentos</span>
                    </Link>
                    <Link href="/auditoria" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                        <Fingerprint size={18} /><span>Auditoria de Logs</span>
                    </Link>
                    <Link href="/inteligencia" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors">
                        <BarChart3 size={18} /><span>Inteligência BI</span>
                    </Link>

                </nav>
            </div>

            <div className="p-4 border-t border-gray-800 bg-gray-900 sticky bottom-0 flex flex-col gap-2">
                <div className="mb-2 p-3 bg-gray-800/50 rounded-lg text-center overflow-hidden">
                    <p className="text-sm font-bold text-white truncate shadow-sm">
                        {user?.fullName ? user.fullName : 'Carregando...'}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5 truncate tracking-widest">{user?.email}</p>
                </div>
                <Link href="/configuracoes" className="flex mb-2 w-full items-center gap-3 p-3 text-gray-300 rounded-lg hover:bg-gray-800 transition-colors">
                    <Settings size={18} />
                    <span className="text-sm font-medium">Configurações</span>
                </Link>
                <button onClick={logout} className="flex w-full items-center gap-3 p-3 text-red-400 rounded-lg hover:bg-red-400/10 transition-colors">
                    <LogOut size={18} />
                    <span className="text-sm font-medium">Sair do Sistema</span>
                </button>
            </div>
        </aside>
    );
}
