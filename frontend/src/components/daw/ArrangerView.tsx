'use client';
import { Volume2, Focus, Mic, Settings } from 'lucide-react';

const TRACKS = [
    { id: 1, name: '909 Kick', type: 'audio', color: 'bg-red-500' },
    { id: 2, name: 'Reese Bass', type: 'midi', color: 'bg-neon-blue' },
    { id: 3, name: 'Acid Lead', type: 'midi', color: 'bg-purple-500' },
];

export function ArrangerView() {
    return (
        <div className="flex h-full w-full">
            {/* Track Headers */}
            <div className="w-64 bg-[#0a0f18] border-r border-[#1e293b] flex flex-col z-10 flex-shrink-0">
                <div className="h-8 border-b border-[#1e293b] flex items-center px-4 bg-[#050608] text-[10px] text-slate-500 tracking-wider">
                    TRACKS
                </div>

                <div className="flex-1 overflow-y-auto">
                    {TRACKS.map(t => (
                        <div key={t.id} className="h-24 border-b border-[#1e293b] bg-[#0c121d] flex flex-col relative group">
                            <div className={`absolute top-0 left-0 bottom-0 w-1 ${t.color}`}></div>

                            <div className="flex justify-between items-center p-2 pl-3">
                                <span className="text-xs font-bold text-white truncate w-32">{t.name}</span>
                                <div className="flex gap-1">
                                    <button className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-[#1e293b] text-slate-300 hover:bg-yellow-500/20 hover:text-yellow-400 transition-colors">M</button>
                                    <button className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-[#1e293b] text-slate-300 hover:bg-green-500/20 hover:text-green-400 transition-colors">S</button>
                                    <button className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold bg-[#1e293b] text-slate-300 hover:bg-red-500/20 hover:text-red-400 transition-colors">R</button>
                                </div>
                            </div>

                            <div className="mt-auto p-2 pl-3 pb-3 flex items-center gap-3">
                                {/* Volume Knob Mock */}
                                <div className="flex items-center gap-1.5 flex-1">
                                    <Volume2 size={12} className="text-slate-500" />
                                    <input type="range" className="flex-1 h-1 bg-slate-800 rounded-full cursor-ew-resize appearance-none" />
                                </div>
                                {/* Pan Knob Mock */}
                                <div className="flex items-center gap-1 w-12">
                                    <div className="text-[9px] text-slate-500">L</div>
                                    <div className="w-6 h-6 rounded-full border border-slate-700 relative">
                                        <div className="absolute top-1/2 left-1/2 w-0.5 h-3 bg-neon-cyan origin-bottom -translate-x-1/2 -translate-y-full transform rotate-0"></div>
                                    </div>
                                    <div className="text-[9px] text-slate-500">R</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Timeline Area */}
            <div className="flex-1 bg-[#050608] relative overflow-hidden flex flex-col">
                {/* Ruler */}
                <div className="h-8 border-b border-[#1e293b] flex items-end px-2 bg-[#0a0f18]">
                    <div className="w-full flex justify-between text-[10px] text-slate-600 font-mono pb-1">
                        {[...Array(16)].map((_, i) => (
                            <span key={i}>{i + 1}</span>
                        ))}
                    </div>
                </div>

                {/* Grid Background */}
                <div className="absolute inset-0 top-8 pointer-events-none opacity-20" style={{
                    backgroundImage: 'linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)',
                    backgroundSize: '4rem 6rem'
                }}></div>

                {/* Playhead */}
                <div className="absolute top-0 bottom-0 left-[20%] w-px bg-red-500 z-20 shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                    <div className="absolute -top-1 -left-1.5 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-red-500"></div>
                </div>

                {/* Clips */}
                <div className="relative flex-1">
                    {/* Kick Track Clips */}
                    <div className="absolute top-0 w-full h-[6rem]">
                        <div className="absolute top-2 left-0 w-[16rem] h-[5rem] bg-red-900/40 border border-red-500/50 rounded flex items-center px-2 group cursor-pointer hover:border-red-400">
                            <span className="text-[10px] font-bold text-red-300">Basic 4/4 Kick</span>
                            {/* Waveform mock */}
                            <div className="absolute left-2 right-2 h-1/2 flex items-center opacity-70">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center justify-center gap-px">
                                        <div className="w-1 h-3 bg-red-500"></div>
                                        <div className="w-2 h-5 bg-red-500"></div>
                                        <div className="w-1 h-2 bg-red-500"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bass Track Clips */}
                    <div className="absolute top-[6rem] w-full h-[6rem]">
                        <div className="absolute top-2 left-[12rem] w-[24rem] h-[5rem] bg-blue-900/40 border border-neon-blue/50 rounded flex items-center px-2 group cursor-pointer hover:border-neon-cyan">
                            <span className="text-[10px] font-bold text-neon-blue">Rolling Bass Pattern</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
