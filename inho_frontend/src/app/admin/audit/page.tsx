"use client";

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Activity, Search } from 'lucide-react';

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const data = await adminApi.getAuditLogs(0, 200);
        setLogs(data);
      } catch (error) {
        console.error("Erro ao carregar auditoria", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('pt-BR');
  };

  const getActionColor = (action: string) => {
    if (action.includes('DELETE') || action.includes('FAILED')) return 'text-red-700 bg-red-400/10 border-red-400/20';
    if (action.includes('CREATE')) return 'text-emerald-700 bg-green-400/10 border-green-400/20';
    if (action.includes('UPDATE')) return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    return 'text-blue-700 bg-blue-400/10 border-blue-400/20';
  };

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-[#0F172A] mb-2 flex items-center gap-2">
          <Activity className="text-purple-700" /> Trilha de Auditoria
        </h1>
        <p className="text-[#64748B]">Log imutável de todas as ações de segurança ocorridas no sistema.</p>
      </header>

      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xl p-6">
        <div className="flex items-center gap-3 bg-white border border-[#E2E8F0] rounded-xl px-4 py-2 mb-6 focus-within:border-purple-500/50 transition-colors">
          <Search className="w-5 h-5 text-gray-500" />
          <input 
            type="text" 
            placeholder="Buscar por ID de usuário ou recurso... (Simulação Visual)"
            className="bg-transparent border-none outline-none text-[#0F172A] w-full placeholder-gray-600"
            disabled
          />
        </div>

        {loading ? (
          <div className="text-[#64748B]">Extraindo blocos de auditoria...</div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {logs.map((log) => (
              <div key={log.id} className="p-4 bg-white border border-[#E2E8F0] rounded-xl hover:border-[#E2E8F0] transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-mono border ${getActionColor(log.action)}`}>
                      {log.action}
                    </span>
                    <span className="text-sm text-[#0F172A] font-mono">{log.resource || 'SYSTEM'}</span>
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(log.created_at)}</span>
                </div>
                <p className="text-sm text-[#64748B] mb-2">
                  <span className="text-gray-500">Actor:</span> {log.user_id || 'System Anonymous'}
                </p>
                {log.details && (
                  <div className="bg-white rounded p-3 text-xs font-mono text-[#64748B] border border-[#E2E8F0]">
                    {log.details}
                  </div>
                )}
                {log.ip_address && (
                  <p className="text-xs text-gray-600 mt-2 text-right">IP: {log.ip_address}</p>
                )}
              </div>
            ))}
            
            {logs.length === 0 && (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500">Nenhum log de segurança registrado até o momento.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
