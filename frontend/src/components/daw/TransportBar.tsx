'use client';
import { Play, Square, Settings2, Volume2, FastForward, Rewind } from 'lucide-react';

export function TransportBar({ isPlaying, setIsPlaying, bpm, setBpm }: any) {
    return (
        <div className="h-14 bg-[#0a0f18] border-b border-[#1e293b] flex items-center px-4 justify-between select-none">
            <div className="flex items-center gap-6">
                <div className="flex gap-2 text-neon-cyan font-bold tracking-widest text-sm items-center mr-4">
                    <span className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse"></span>
                    ORBE STUDIO
                </div>

                {/* Playback Controls */}
                <div className="flex items-center gap-1 bg-[#050608] p-1 border border-[#1e293b] rounded">
                    <button className="p-1.5 hover:bg-white/10 rounded text-slate-400">
                        <Rewind size={16} fill="currentColor" />
                    </button>
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`p-1.5 rounded transition-colors ${isPlaying ? 'bg-neon-cyan text-black shadow-glow-cyan' : 'hover:bg-white/10 text-emerald-400'}`}
                    >
                        {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    </button>
                    <button className="p-1.5 hover:bg-white/10 rounded text-slate-400">
                        <Square size={16} fill="currentColor" />
                    </button>
                    <button className="p-1.5 hover:bg-white/10 rounded text-slate-400">
                        <FastForward size={16} fill="currentColor" />
                    </button>
                </div>

                {/* Metronome & BPM */}
                <div className="flex items-center gap-4 border border-[#1e293b] bg-[#050608] rounded px-3 py-1.5 text-xs font-mono">
                    <div className="flex items-center gap-2 cursor-ns-resize group">
                        <span className="text-slate-500">BPM</span>
                        <span className="text-neon-blue font-bold group-hover:text-white transition-colors">{bpm}</span>
                    </div>
                    <div className="w-px h-4 bg-[#1e293b]"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500">SIGN</span>
                        <span className="text-white">4/4</span>
                    </div>
                </div>

                {/* Global Position */}
                <div className="font-mono text-sm bg-black px-4 py-1.5 text-emerald-500 border border-emerald-900 rounded-sm shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]">
                    001 : 01 : 000
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Master Volume */}
                <div className="flex items-center gap-3">
                    <Volume2 size={16} className="text-slate-400" />
                    <input type="range" className="w-24 accent-neon-blue cursor-ew-resize" min="0" max="100" defaultValue="80" />
                </div>
                <button className="p-2 bg-[#1e293b] hover:bg-neon-blue/20 hover:text-neon-blue rounded text-slate-400 transition-colors">
                    <Settings2 size={16} />
                </button>
            </div>
        </div>
    );
}
