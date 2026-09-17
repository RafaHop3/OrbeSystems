'use client';
import { AudioLines, Wand2 } from 'lucide-react';

export function HendryxAI() {
    return (
        <div className="w-80 h-full bg-[#050608] border-l border-[#1e293b] flex flex-col z-20 shadow-[-10px_0_20px_rgba(0,0,0,0.5)] flex-shrink-0">
            <div className="h-14 border-b border-[#1e293b] flex items-center px-4 justify-between bg-[#0a0f18]">
                <div className="flex items-center gap-3">
                    <Wand2 size={16} className="text-neon-purple animate-pulse" />
                    <span className="font-grotesk font-bold text-xs tracking-widest text-white">HENDRYX AI</span>
                </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
                <h3 className="text-xl font-outfit font-black uppercase text-neon-purple tracking-widest mb-6">Generative Engine</h3>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">Scale & Root</label>
                        <select className="w-full bg-[#131a28] border border-[#1e293b] rounded p-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-neon-purple appearance-none">
                            <option>F# Minor</option>
                            <option>D Lydian</option>
                            <option>C Harmonic Minor</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">Rhythm Density</label>
                        <input type="range" className="w-full accent-neon-purple" min="1" max="100" defaultValue="70" />
                        <div className="flex justify-between text-[8px] font-mono text-slate-600">
                            <span>SPARSE</span>
                            <span>COMPLEX</span>
                        </div>
                    </div>

                    <button className="w-full py-4 mt-4 bg-neon-purple/10 border border-neon-purple rounded text-neon-purple text-xs font-bold tracking-widest hover:bg-neon-purple hover:text-black transition-colors shadow-[0_0_15px_rgba(168,85,247,0.4)] flex justify-center items-center gap-3">
                        <AudioLines size={16} />
                        GENERATE PATTERN
                    </button>
                </div>

                {/* Console / Status */}
                <div className="mt-8 border border-slate-800 rounded bg-black p-3 h-48 overflow-y-auto">
                    <div className="font-mono text-[9px] text-emerald-500 mb-1">&gt; hendryx module loaded</div>
                    <div className="font-mono text-[9px] text-slate-400 mb-1">&gt; parsing context timeline...</div>
                    <div className="font-mono text-[9px] text-slate-400 mb-1">&gt; waiting for generation trigger</div>
                </div>
            </div>
        </div>
    );
}
