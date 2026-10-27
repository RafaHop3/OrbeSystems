'use client';

import { useEffect, useState } from 'react';
import { FileText, CheckCircle2, Loader2, ShieldCheck, Download } from 'lucide-react';
import { billingApi, BillingInvoice } from '@/lib/api';

export default function NfsePage() {
  const [invoices, setInvoices] = useState<BillingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [emittedIds, setEmittedIds] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const data = await billingApi.list();
      setInvoices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleEmitNfse(inv: BillingInvoice) {
    const rps = `NFS-${new Date().getFullYear()}-${inv.id.slice(0, 6).toUpperCase()}`;
    setEmittedIds((prev) => ({ ...prev, [inv.id]: rps }));
  }

  function handleDownloadXml(inv: BillingInvoice) {
    const rps = emittedIds[inv.id] || `NFS-${inv.id.slice(0, 6).toUpperCase()}`;
    const gross = Number(inv.amount);
    const iss = (gross * 0.05).toFixed(2);
    const irrf = (gross * 0.015).toFixed(2);
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CompNfse>
  <Nfse>
    <InfNfse Id="${rps}">
      <Numero>${rps}</Numero>
      <DataEmissao>${new Date().toISOString()}</DataEmissao>
      <Servico>
        <Valores>
          <ValorServicos>${gross.toFixed(2)}</ValorServicos>
          <ValorIss>${iss}</ValorIss>
          <ValorIr>${irrf}</ValorIr>
          <ValorLiquidoNfse>${(gross - Number(iss) - Number(irrf)).toFixed(2)}</ValorLiquidoNfse>
        </Valores>
        <Discriminacao>${inv.description || 'Prestação de Serviços / Cooperativa'}</Discriminacao>
      </Servico>
      <TomadorServico>
        <RazaoSocial>${inv.customer_name}</RazaoSocial>
        <CpfCnpj>${inv.customer_doc || '00000000000'}</CpfCnpj>
      </TomadorServico>
    </InfNfse>
  </Nfse>
</CompNfse>`;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rps}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-8 font-sans text-[#0F172A]">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-terminal-border pb-5">
          <div>
            <div className="flex items-center gap-2 text-neon-green text-xs font-bold uppercase tracking-widest mb-1">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              Recebimentos • Módulo Fiscal & Retenções
            </div>
            <h1 className="text-2xl font-extrabold tracking-wide flex items-center gap-3">
              Notas Fiscais de Serviço (NFS-e)
              <FileText size={22} className="text-neon-green" />
            </h1>
            <p className="text-xs text-[#64748B] mt-1">
              Emissão de RPS/NFS-e vinculada às faturas com cálculo automático de retenção fiscal (ISS 5% e IRRF 1,5%).
            </p>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neon-green/10 border border-neon-green/30 text-neon-green text-xs font-bold">
            <ShieldCheck size={16} /> Padrão ABRASF Nacional
          </div>
        </div>

        <div className="bg-white shadow-sm border border-terminal-border rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F1F5F9] border-b border-terminal-border text-[#64748B] uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Tomador</th>
                <th className="px-6 py-4">Competência</th>
                <th className="px-6 py-4 text-right">Valor Bruto</th>
                <th className="px-6 py-4 text-right">Retenção (ISS + IR)</th>
                <th className="px-6 py-4 text-right">Líquido NFS-e</th>
                <th className="px-6 py-4">Status Fiscal</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-[#64748B]">
                    <Loader2 className="animate-spin mx-auto mb-2" size={20} /> Carregando faturas...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#64748B]">
                    Nenhuma fatura disponível para emissão de NFS-e.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const gross = Number(inv.amount);
                  const ret = gross * 0.065;
                  const net = gross - ret;
                  const rps = emittedIds[inv.id];
                  return (
                    <tr key={inv.id} className="hover:bg-[#F1F5F9] transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#0F172A]">{inv.customer_name}</div>
                        <div className="text-[10px] text-[#64748B]">{inv.customer_doc || 'CPF/CNPJ sob consulta'}</div>
                      </td>
                      <td className="px-6 py-4">{new Date(inv.due_date).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4 text-right font-bold">
                        R$ {gross.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right text-amber-700">
                        - R$ {ret.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-neon-green">
                        R$ {net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        {rps ? (
                          <span className="px-2 py-0.5 rounded bg-neon-green/10 text-neon-green border border-neon-green/30 font-bold text-[10px] inline-flex items-center gap-1">
                            <CheckCircle2 size={11} /> {rps}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] border border-terminal-border font-bold text-[10px]">
                            AGUARDANDO RPS
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {!rps ? (
                          <button
                            onClick={() => handleEmitNfse(inv)}
                            className="px-3 py-1.5 rounded-lg bg-neon-green/15 border border-neon-green/40 text-neon-green hover:bg-neon-green/25 font-bold text-[10px] uppercase"
                          >
                            Emitir NFS-e
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDownloadXml(inv)}
                            className="px-3 py-1.5 rounded-lg bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/25 font-bold text-[10px] uppercase inline-flex items-center gap-1"
                          >
                            <Download size={12} /> Baixar XML
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
