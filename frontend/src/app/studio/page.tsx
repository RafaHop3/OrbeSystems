'use client';
import { useState } from 'react';
import { TransportBar } from '@/components/daw/TransportBar';
import { ArrangerView } from '@/components/daw/ArrangerView';
import { BottomController } from '@/components/daw/BottomController';
import { HendryxAI } from '@/components/daw/HendryxAI';

export default function OrbeStudioDAW() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [bpm, setBpm] = useState(138);

    return (
        <div className="flex flex-col h-screen w-full bg-[#050608] text-slate-300 font-mono overflow-hidden">
            {/* 1. TRANSPORT BAR */}
            <TransportBar isPlaying={isPlaying} setIsPlaying={setIsPlaying} bpm={bpm} setBpm={setBpm} />

            <div className="flex flex-1 overflow-hidden relative">
                <div className="flex flex-col flex-1 border-r border-[#1e293b] w-full relative">
                    {/* 3. ARRANGER VIEW (Timeline & Headers) */}
                    <div className="flex-1 overflow-hidden flex flex-col border-b border-[#131a28]">
                        <ArrangerView />
                    </div>

                    {/* 4. BOTTOM DOCK (Piano Roll / Step Sequencer) */}
                    <div className="h-1/2 overflow-hidden flex flex-col bg-[#090c14]">
                        <BottomController />
                    </div>
                </div>

                {/* 5. HENDRYX AI */}
                <HendryxAI />
            </div>
        </div>
    );
}
