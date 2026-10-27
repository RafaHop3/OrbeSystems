'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { auditApi } from '@/lib/api';

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const data = await auditApi.listAllLogs().catch(() => auditApi.listMyLogs());
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-emerald-700 border border-green-500/20">Criou</span>;
      case 'UPDATE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-700 border border-blue-500/20">Editou</span>;
      case 'DELETE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-700 border border-red-500/20">Excluiu</span>;
      case 'LOGIN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-700 border border-purple-500/20">Login</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-inho-dark text-inho-muted border border-inho-border">{action}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-inho-black p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-inho-muted hover:text-inho-text transition-colors p-2 rounded-lg hover:bg-inho-dark">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-inho-text flex items-center gap-2">
                Registro de Auditoria (Audit Trail)
                <Shield size={22} className="text-inho-gold" />
              </h1>
              <p className="text-xs text-inho-muted mt-1">
                Histórico imutável de ações executadas por Usuários Mestres e Operadores no sistema.
              </p>
            </div>
          </div>
        </div>

        <div className="glassmorphism rounded-2xl border border-inho-border overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-inho-text">
              <thead className="bg-inho-dark/80 border-b border-inho-border text-inho-muted font-mono text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-6 py-4">Data &amp; Hora</th>
                  <th className="px-6 py-4">Usuário &amp; Função</th>
                  <th className="px-6 py-4">Ação</th>
                  <th className="px-6 py-4">Entidade Afetada</th>
                  <th className="px-6 py-4">IP / Origem</th>
                  <th className="px-6 py-4">Detalhes das Alterações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-inho-border/40">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="w-6 h-6 border-2 border-inho-gold border-t-transparent rounded-full animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-inho-muted font-mono text-xs">
                      Nenhum registro de auditoria encontrado.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-inho-dark/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-[#0F172A] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-[#0F172A] text-xs">{log.user_name || log.user_id || 'Sistema'}</p>
                        {log.user_role && (
                          <span className="inline-block mt-0.5 text-[9px] font-mono text-inho-gold bg-inho-gold/10 px-1.5 py-0.5 rounded border border-inho-gold/20">
                            {log.user_role}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        <span className="text-[#0F172A] font-bold">{log.entity}</span>
                        {log.entity_id && (
                          <span className="block text-[10px] text-inho-muted truncate max-w-[140px]" title={log.entity_id}>
                            ID: {log.entity_id}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-inho-muted">
                        {log.ip_address || '127.0.0.1'}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-[#0F172A] max-w-xs break-all">
                        {log.detail ? (
                          <span className="bg-[#F1F5F9] p-1.5 rounded border border-inho-border block text-[10px]">
                            {log.detail}
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
