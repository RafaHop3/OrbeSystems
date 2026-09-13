import os

routes = [
    'src/app/clientes',
    'src/app/fornecedores',
    'src/app/funcionarios',
    'src/app/socios',
    
    'src/app/recebimentos/receber',
    'src/app/recebimentos/agendar',
    'src/app/recebimentos/boletos',
    'src/app/recebimentos/nfse',
    
    'src/app/pagamentos/pagar',
    'src/app/pagamentos/agendar',
    
    'src/app/caixa/inbox',
    'src/app/caixa/gestao',
    
    'src/app/relatorios/dre',
    'src/app/relatorios/receber',
    'src/app/relatorios/recebidas',
    'src/app/relatorios/aging',
    'src/app/relatorios/perdidos',
    
    'src/app/configuracoes/empresa',
    'src/app/configuracoes/categorias',
    'src/app/configuracoes/cc',
    'src/app/configuracoes/cobranca',
    'src/app/configuracoes/nfse',
    'src/app/configuracoes/api',
    'src/app/configuracoes/usuarios',
    'src/app/configuracoes/avancado',
    
    'src/app/auditoria/fechamento',
    'src/app/auditoria/contador'
]

page_template = '''"use client";
import Sidebar from "@/components/Sidebar";

export default function PlaceholderPage() {
    return (
        <div className="flex h-screen bg-[#06080A] text-[#e6edf3] font-mono selection:bg-teal-500/30 overflow-hidden relative">
            <Sidebar />
            <main className="flex-1 flex flex-col p-10 lg:p-16 relative bg-[#030406] shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-10 w-full">
                <div className="flex items-center gap-3 mb-6">
                    <h1 className="text-3xl font-bold text-white tracking-wide uppercase">MÓDULO ERP</h1>
                </div>
                <p className="text-[#8b949e]">Parte do Mega-Layout Funcional do INHO está sendo orquestrada.</p>
                <div className="mt-8 flex-1 border border-[#1a1f26]/50 rounded-xl bg-[#0A0D12] flex flex-col items-center justify-center border-dashed">
                    <div className="w-12 h-12 rounded-full border-b-2 border-teal-500 animate-spin mb-4"></div>
                    <span className="text-[#6e7681] text-sm uppercase tracking-widest font-bold">Integrando Arquitetura...</span>
                </div>
            </main>
        </div>
    );
}
'''

for r in routes:
    os.makedirs(r, exist_ok=True)
    with open(os.path.join(r, 'page.tsx'), 'w', encoding='utf-8') as f:
        f.write(page_template)

print('Rotas criadas com sucesso!')
