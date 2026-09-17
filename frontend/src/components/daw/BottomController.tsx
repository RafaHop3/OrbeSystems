'use client';
import { useState } from 'react';

export function BottomController() {
    const [activeTab, setActiveTab] = useState('sequence');

    return (
        <div className="flex flex-col h-full w-full">
            {/* Tabs */}
            <div className="flex bg-[#050608] border-b border-[#131a28]">
                {['Piano Roll', 'Sequencer', 'Mixer/FX'].map((tab, i) => (
                    <button
                        key={i}
                        onClick={() => setActiveTab(['piano', 'sequence', 'mixer'][i])}
                        className={`px-6 py-2 text-xs font-bold font-mono tracking-widest border-r border-[#1e293b] hover:bg-[#131a28] transition-colors ${activeTab === ['piano', 'sequence', 'mixer'][i]
                                ? 'bg-[#1e293b] text-neon-cyan border-b-2 border-b-neon-cyan'
                                : 'text-slate-500'
                            }`}
                    >
                        {tab.toUpperCase()}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-hidden relative">
                {/* Step Sequencer Mode */}
                {activeTab === 'sequence' && (
                    <div className="flex flex-col h-full p-4 overflow-y-auto">
                        {['Kick', 'Snare/Clap', 'Hi-Hat (C)', 'Hi-Hat (O)'].map((drum, trackIdx) => (
                            <div key={trackIdx} className="flex items-center gap-4 mb-2">
                                <span className="w-24 text-[10px] font-bold text-slate-400">{drum}</span>
                                <div className="flex gap-1 flex-1">
                                    {[...Array(16)].map((_, stepIdx) => (
                                        <button
                                            key={stepIdx}
                                            className={`h-12 flex-1 rounded border overflow-hidden ${(trackIdx === 0 && (stepIdx % 4 === 0)) || (trackIdx === 1 && stepIdx % 8 === 4)
                                                    ? 'border-neon-cyan bg-neon-cyan shadow-[0_0_10px_rgba(0,242,254,0.5)]'
                                                    : 'border-[#1e293b] bg-black hover:border-slate-700'
                                                }`}
                                        ></button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Piano Roll Mode */}
                {activeTab === 'piano' && (
                    <div className="flex h-full w-full">
                        {/* Keys */}
                        <div className="w-16 h-[800px] bg-[#050608] border-r border-[#1e293b] flex flex-col">
                            {/* Mock Keys - Not fully 128 */}
                            {[...Array(24)].map((_, i) => (
                                <div key={i} className={`w-full flex-1 border-b border-black flex items-center justify-end pr-1 text-[8px] font-mono text-black ${[1, 3, 5, 8, 10].includes(i % 12) ? 'bg-slate-900 border-l-[8px] border-l-black ml-2 h-4' : 'bg-slate-200 h-6'
                                    }`}>
                                    {i % 12 === 0 && `C${4 - Math.floor(i / 12)}`}
                                </div>
                            ))}
                        </div>
                        {/* Grid */}
                        <div className="flex-1 h-[800px] overflow-scroll relative"
                            style={{
                                backgroundImage: 'linear-gradient(to bottom, #1e293b 1px, transparent 1px), linear-gradient(to right, #1e293b 1px, transparent 1px)',
                                backgroundSize: '100% 24px, 4rem 100%'
                            }}>
                            {/* Mock Note */}
                            <div className="absolute top-[24px] left-[4rem] w-[12rem] h-[22px] rounded bg-emerald-500/80 border border-emerald-400"></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
