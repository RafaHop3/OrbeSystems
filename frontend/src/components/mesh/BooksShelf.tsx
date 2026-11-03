"use client";

import React, { useState } from 'react';
import { Book, Search, Plus, QrCode, Shield, CheckCircle2, AlertTriangle, Sparkles, BookOpen } from 'lucide-react';

interface BookItem {
  id?: string;
  isbn13: string;
  title: string;
  authors: string[];
  cover_url?: string;
  source?: string;
  policy?: 'display_only' | 'first_degree' | 'second_degree' | 'local_mesh';
  h3_cell?: string;
}

const SEED_PREVIEWS: BookItem[] = [
  {
    isbn13: "9788573264081",
    title: "Dom Casmurro",
    authors: ["Machado de Assis"],
    policy: "local_mesh",
    h3_cell: "Bairro Bom Fim",
    cover_url: "https://books.google.com/books/content?id=s1gVAAAAYAAJ&printsec=frontcover&img=1&zoom=1"
  },
  {
    isbn13: "9788535902778",
    title: "Memórias Póstumas de Brás Cubas",
    authors: ["Machado de Assis"],
    policy: "first_degree",
    h3_cell: "Moinhos de Vento",
  },
  {
    isbn13: "9788572323499",
    title: "Mensagem",
    authors: ["Fernando Pessoa"],
    policy: "display_only",
    h3_cell: "Centro Histórico",
  }
];

export default function BooksShelf() {
  const [isbnInput, setIsbnInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [shelf, setShelf] = useState<BookItem[]>(SEED_PREVIEWS);
  const [scannedResult, setScannedResult] = useState<BookItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedPolicy, setSelectedPolicy] = useState<'display_only' | 'first_degree' | 'second_degree' | 'local_mesh'>('local_mesh');

  const handleSearchIsbn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isbnInput.trim()) return;

    setIsSearching(true);
    setErrorMsg(null);
    setScannedResult(null);

    try {
      const cleanIsbn = isbnInput.replace(/[-\s]/g, '');
      const res = await fetch(`/api/proxy/api/books/isbn/${cleanIsbn}`);
      
      if (!res.ok) {
        if (res.status === 404) throw new Error("Obra não localizada nas bases Google Books / OpenLibrary.");
        if (res.status === 422) throw new Error("ISBN com formato ou dígito verificador inválido.");
        throw new Error("Não foi possível consultar o catálogo no momento.");
      }

      const data = await res.json();
      setScannedResult(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Erro ao consultar ISBN");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddToShelf = () => {
    if (!scannedResult) return;
    const newItem: BookItem = {
      ...scannedResult,
      policy: selectedPolicy,
      h3_cell: "Malha Ativa"
    };
    setShelf([newItem, ...shelf]);
    setScannedResult(null);
    setIsbnInput('');
  };

  return (
    <div className="space-y-6">
      {/* Header da Estante */}
      <div className="p-6 rounded-2xl bg-[#070b14]/90 border border-slate-800 shadow-[0_0_40px_rgba(0,255,245,0.05)] backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-neon-cyan font-mono text-xs mb-1">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>ESTANTE P2P DESCENTRALIZADA // PROTOCOLO LIVRE</span>
          </div>
          <h2 className="text-xl font-bold font-tilt-neon text-white">
            Mesh Social Books &amp; Circulação Física
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Catalogação instantânea via ISBN-13, políticas granulares de empréstimo (Exibição, Amigos, Malha Local), validação por QR Code e proteção de privacidade via H3.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Passaporte Imutável</span>
          </div>
        </div>
      </div>

      {/* Barra de Busca / Catalogação */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <form onSubmit={handleSearchIsbn} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Digite o código de barras ISBN-13 ou ISBN-10 (ex: 9788573264081)..."
              value={isbnInput}
              onChange={(e) => setIsbnInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-neon-cyan transition-colors font-mono"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-5 py-2.5 rounded-xl bg-neon-cyan/10 border border-neon-cyan/40 hover:bg-neon-cyan/20 text-neon-cyan text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSearching ? (
              <span className="w-4 h-4 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>Buscar Obra</span>
          </button>
        </form>

        {errorMsg && (
          <div className="mt-3 p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal / Card de Resultado de Busca */}
        {scannedResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-neon-cyan/30 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-16 rounded bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                {scannedResult.cover_url ? (
                  <img src={scannedResult.cover_url} alt={scannedResult.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : (
                  <Book className="w-6 h-6 text-slate-500" />
                )}
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{scannedResult.title}</h4>
                <p className="text-xs text-slate-400">{scannedResult.authors?.join(', ')}</p>
                <span className="inline-block mt-1 text-[10px] font-mono text-neon-cyan bg-neon-cyan/10 px-2 py-0.5 rounded border border-neon-cyan/20">
                  ISBN: {scannedResult.isbn13} {'//'} Fonte: {scannedResult.source}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <select
                value={selectedPolicy}
                onChange={(e: any) => setSelectedPolicy(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-neon-cyan w-full sm:w-auto"
              >
                <option value="display_only">Apenas Exibição</option>
                <option value="first_degree">1º Grau (Amigos)</option>
                <option value="second_degree">2º Grau (Amigos de Amigos)</option>
                <option value="local_mesh">Malha Local (P2P Aberto)</option>
              </select>
              <button
                type="button"
                onClick={handleAddToShelf}
                className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Adicionar ao Meu Acervo</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Grid de Livros na Estante */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {shelf.map((book, idx) => (
          <div
            key={idx}
            className="p-4 rounded-2xl bg-[#090d18]/80 border border-slate-800 hover:border-neon-cyan/40 transition-all flex flex-col justify-between group shadow-lg"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded">
                  {book.policy === 'local_mesh' && 'Malha Local'}
                  {book.policy === 'first_degree' && '1º Grau'}
                  {book.policy === 'second_degree' && '2º Grau'}
                  {book.policy === 'display_only' && 'Exibição'}
                </span>
                <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-ping" />
                  {book.h3_cell || "Disponível"}
                </span>
              </div>

              <div className="flex gap-3 mb-3">
                <div className="w-14 h-20 rounded-lg bg-slate-800/80 border border-slate-700/80 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <BookOpen className="w-6 h-6 text-slate-500" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-neon-cyan transition-colors line-clamp-2">
                    {book.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">{book.authors?.join(', ')}</p>
                  <p className="text-[10px] font-mono text-slate-500 mt-2">ISBN {book.isbn13}</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <button
                type="button"
                className="text-[11px] font-mono text-neon-cyan hover:underline flex items-center gap-1"
                onClick={() => alert(`Handshake QR para ${book.title}: Empréstimo tokenizado via Ed25519.`)}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Solicitar P2P</span>
              </button>
              <span className="text-[10px] font-mono text-slate-500">Guardiao: 100%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
