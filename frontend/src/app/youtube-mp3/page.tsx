'use client';

import { useState } from 'react';
import { DownloadCloud, Music, User, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function YoutubeMp3ToolPage() {
    const [artist, setArtist] = useState('');
    const [song, setSong] = useState('');

    const handleDownload = (e: React.FormEvent) => {
        e.preventDefault();
        alert(`Iniciando extração e download para: ${artist} - ${song}\n*(Backend Endpoint Pendente)*`);
    };

    return (
        <div className="min-h-screen bg-[#05020a] text-white pt-24 px-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="max-w-2xl mx-auto relative z-10">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors mb-8 text-sm uppercase tracking-widest font-bold">
                    <ArrowLeft size={16} /> Voltar ao Hub
                </Link>

                <div className="glass-magnetic rounded-3xl border border-white/10 p-8 shadow-[0_0_50px_rgba(188,19,254,0.15)] bg-black/40 backdrop-blur-xl">
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold font-grotesk text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-4">
                            YT MP3 Extractor
                        </h1>
                        <p className="text-slate-300">
                            Informe o artista e o som abaixo. Nossa ferramenta conecta diretamente ao ecossistema musical para realizar a extração para MP3 em alta qualidade.
                        </p>
                    </div>

                    <form onSubmit={handleDownload} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2 font-semibold">
                                    <User size={14} className="text-cyan-400" /> Nome do Artista
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={artist}
                                    onChange={(e) => setArtist(e.target.value)}
                                    placeholder="Ex: Daft Punk"
                                    className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2 font-semibold">
                                    <Music size={14} className="text-purple-400" /> Nome da Música
                                </label>
                                <input
                                    type="text"
                                    value={song}
                                    onChange={(e) => setSong(e.target.value)}
                                    placeholder="Ex: Harder Better"
                                    className="w-full bg-black/60 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-mono"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full group relative inline-flex items-center justify-center gap-3 bg-neon-purple hover:bg-neon-cyan text-white hover:text-black font-bold uppercase tracking-widest text-sm px-8 py-4 transition-all duration-300 overflow-hidden shadow-[0_0_20px_rgba(188,19,254,0.4)] hover:shadow-[0_0_40px_rgba(6,182,212,0.8)] rounded-lg mt-4"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                            <DownloadCloud size={18} fill="currentColor" /> Iniciar Extração
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
