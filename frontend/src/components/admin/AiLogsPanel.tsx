'use client';

import { useEffect, useState } from 'react';
import { Activity, Bot, MessageSquare, Clock } from 'lucide-react';

interface ChatLog {
    id: string;
    session_id: string | null;
    user_message: string;
    ai_response: string;
    timestamp: string;
}

export default function AiLogsPanel() {
    const [logs, setLogs] = useState<ChatLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchLogs = async () => {
        try {
            const token = localStorage.getItem('orbe_admin_token');
            const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
            const res = await fetch(`${BACKEND_URL}/api/admin/chat-logs`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Falha ao carregar logs');
            const data = await res.json();
            setLogs(data);
        } catch (err: any) {
            setError(err.message || 'Erro de conexão');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 10000); // refresh every 10s
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="border border-neon-cyan/20 bg-neon-cyan/5 p-5 min-h-[400px] flex items-center justify-center">
                <div className="flex items-center gap-4 text-neon-cyan/60 animate-pulse">
                    <Activity size={24} />
                    <span className="font-mono text-sm tracking-widest uppercase">Decriptando Logs da Matrix...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="border border-red-500/20 bg-red-500/5 p-5">
                <div className="text-red-500 font-mono text-xs uppercase tracking-wider mb-2">ERRO CRÍTICO</div>
                <p className="text-red-500/70 text-[10px]">{error}</p>
            </div>
        );
    }

    return (
        <div className="border border-neon-cyan/20 bg-neon-cyan/5 p-5">
            <h2 className="text-xs font-bold border-b border-neon-cyan/10 pb-3 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-neon-cyan uppercase">
                    <Bot size={14} /> AI CONVERSATION INTERCEPT
                </div>
                <span className="text-[10px] text-neon-cyan/40 px-2 border border-neon-cyan/20 rounded">
                    {logs.length} RECORDS
                </span>
            </h2>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-neon-cyan/20">
                {logs.length === 0 ? (
                    <div className="text-center py-10 text-neon-cyan/40 text-[10px] font-mono uppercase">
                        Nenhuma conversa registrada ainda.
                    </div>
                ) : (
                    logs.map(log => (
                        <div key={log.id} className="border border-neon-cyan/10 bg-black/40 p-4 font-mono">
                            <div className="flex items-center justify-between mb-3 text-[9px] text-neon-cyan/40 border-b border-neon-cyan/10 pb-2">
                                <span className="flex items-center gap-1"><Clock size={10} /> {new Date(log.timestamp).toLocaleString()}</span>
                                <span>ID: {log.id.split('-')[0]}</span>
                            </div>

                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <MessageSquare size={12} className="text-neon-purple mt-0.5 shrink-0" />
                                    <div className="text-[11px] text-white/80">
                                        <span className="text-neon-purple font-bold">User:</span> {log.user_message}
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Bot size={12} className="text-neon-cyan mt-0.5 shrink-0" />
                                    <div className="text-[11px] text-neon-cyan/80">
                                        <span className="text-neon-cyan font-bold">AI:</span> {log.ai_response}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
