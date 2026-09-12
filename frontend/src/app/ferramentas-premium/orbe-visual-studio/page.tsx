"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Settings, Download, Play, Square, Activity, Volume2, AudioLines, Music, Radio, Box, Drum, Layers, Sparkles } from "lucide-react";
import { OrbeVisualizer } from "@/components/visual-studio/OrbeVisualizer";
import { globalAudioEngine, AudioAnalysis } from "@/components/visual-studio/AudioEngine";
import { SYNTH_PRESETS, SynthPreset } from "@/components/visual-studio/synthPresets";
import { MELODY_PRESETS, MelodySequence } from "@/components/visual-studio/melodiesBank";

export interface RouteRule {
    id: string;
    source: 'sub' | 'bass' | 'mid' | 'high' | 'peak' | 'rms' | 'lfo';
    target: 'meshScale' | 'vertexNoise' | 'wireframeThickness' | 'rotationSpeed' | 'bloomIntensity' | 'chromaticAberration' | 'hueShift' | 'cameraShake' | 'cameraFov' | 'particleVelocity' | 'particleBurst';
    amount: number;
    smooth: 'linear' | 'fast_decay' | 'slow_decay';
    invert: boolean;
    active: boolean;
}

export default function OrbeVisualStudioPage() {
    const [isMicActive, setIsMicActive] = useState(false);
    const [isSynthActive, setIsSynthActive] = useState(false);
    const [isSequencerActive, setIsSequencerActive] = useState(false);
    const [activeTab, setActiveTab] = useState<'synth' | 'routing' | 'mesh' | 'export'>('synth');

    const [bloomColor, setBloomColor] = useState("#00ffcc");
    const [sensitivity, setSensitivity] = useState(1.2);
    const [geometry, setGeometry] = useState<'icosahedron' | 'sphere' | 'box' | 'torus'>('icosahedron');

    // Zen Mode (Tecla H)
    const [isZenMode, setIsZenMode] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'h' || e.key === 'H') setIsZenMode(prev => !prev);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Post-Processing Stack (TAB 3)
    const [postFX, setPostFX] = useState({
        bloom: true, bokeh: false, godrays: false, vignette: true, kaleidoscope: false,
        noise: false, glitch: false, pixelate: false, ascii: false, scanlines: false
    });

    // Routing Matrix (TAB 2)
    const [routings, setRoutings] = useState<RouteRule[]>([]);

    const [selectedPresetId, setSelectedPresetId] = useState<string>('cyberpunkLead');
    const [activeMelodyId, setActiveMelodyId] = useState<string | null>(null);
    const [isPlayingSequence, setIsPlayingSequence] = useState(false);
    const melodyTimeouts = useRef<NodeJS.Timeout[]>([]);

    const togglePlaySequence = (mel: MelodySequence) => {
        if (activeMelodyId === mel.id && isPlayingSequence) {
            melodyTimeouts.current.forEach(clearTimeout);
            melodyTimeouts.current = [];
            setIsPlayingSequence(false);
            setActiveMelodyId(null);
            return;
        }

        melodyTimeouts.current.forEach(clearTimeout);
        melodyTimeouts.current = [];
        setIsPlayingSequence(true);
        setActiveMelodyId(mel.id);

        const playLoop = () => {
            if (!globalAudioEngine.audioContext) return;
            const preset = SYNTH_PRESETS[mel.preset] || SYNTH_PRESETS['cyberpunkLead'];
            let timeOffset = 0;
            const beatDuration = 60 / mel.bpm;

            mel.notes.forEach(note => {
                const noteDurationSecs = note.duration * (beatDuration * 2);
                globalAudioEngine.playArpNote(note.freq, preset, noteDurationSecs, timeOffset);
                timeOffset += noteDurationSecs;
            });

            const nextCycleId = setTimeout(playLoop, timeOffset * 1000);
            melodyTimeouts.current.push(nextCycleId);
        };
        playLoop();
    };

    const loadRoutingPreset = (presetName: string) => {
        if (presetName === 'Supermassive Core') {
            setRoutings([
                { id: 'R1', source: 'bass', target: 'meshScale', amount: 75, smooth: 'linear', invert: false, active: true },
                { id: 'R2', source: 'bass', target: 'cameraShake', amount: 30, smooth: 'fast_decay', invert: false, active: true },
                { id: 'R3', source: 'high', target: 'bloomIntensity', amount: 60, smooth: 'linear', invert: false, active: true },
                { id: 'R4', source: 'mid', target: 'rotationSpeed', amount: 40, smooth: 'slow_decay', invert: false, active: true }
            ]);
        } else if (presetName === 'Cyber Glitch') {
            setRoutings([
                { id: 'R1', source: 'peak', target: 'chromaticAberration', amount: 100, smooth: 'fast_decay', invert: false, active: true },
                { id: 'R2', source: 'high', target: 'particleBurst', amount: 85, smooth: 'fast_decay', invert: false, active: true },
                { id: 'R3', source: 'bass', target: 'hueShift', amount: 50, smooth: 'linear', invert: false, active: true }
            ]);
        } else if (presetName === 'Fluid Nebula') {
            setRoutings([
                { id: 'R1', source: 'rms', target: 'vertexNoise', amount: 60, smooth: 'slow_decay', invert: false, active: true },
                { id: 'R2', source: 'lfo', target: 'cameraFov', amount: 40, smooth: 'linear', invert: false, active: true },
                { id: 'R3', source: 'high', target: 'wireframeThickness', amount: 30, smooth: 'slow_decay', invert: false, active: true }
            ]);
        } else if (presetName === 'Clear') {
            setRoutings([]);
        }
    };

    // Configurações do Sintetizador e DAW
    const [synthFreq, setSynthFreq] = useState(150);
    const [synthType, setSynthType] = useState<OscillatorType>('sawtooth');
    const [bpm, setBpm] = useState(128);
    const [reverbMix, setReverbMix] = useState(0.4);
    const [sidechainDepth, setSidechainDepth] = useState(0.8);
    const [currentPreset, setCurrentPreset] = useState("Custom");

    // Audio state feedback for UI meters
    const [audioMeters, setAudioMeters] = useState<AudioAnalysis>({ sub: 0, bass: 0, mid: 0, high: 0, rms: 0, peak: false, lfo: 0 });
    const meterLoopRef = useRef<number>();

    // VST Piano Notes Mapped (C4 to B4)
    const pianoNotes = [
        { label: "C", f: 261.63, isBlack: false }, { label: "C#", f: 277.18, isBlack: true },
        { label: "D", f: 293.66, isBlack: false }, { label: "D#", f: 311.13, isBlack: true },
        { label: "E", f: 329.63, isBlack: false },
        { label: "F", f: 349.23, isBlack: false }, { label: "F#", f: 369.99, isBlack: true },
        { label: "G", f: 392.00, isBlack: false }, { label: "G#", f: 415.30, isBlack: true },
        { label: "A", f: 440.00, isBlack: false }, { label: "A#", f: 466.16, isBlack: true },
        { label: "B", f: 493.88, isBlack: false }
    ];

    // Presets Master (Web VST Logic)
    const loadPreset = (name: string) => {
        setCurrentPreset(name);
        if (name === "Cyberpunk Bass") {
            setSynthType("square"); setBpm(105); setSidechainDepth(0.9); setReverbMix(0.3); setSensitivity(1.8);
        } else if (name === "Valhalla Pad") {
            setSynthType("sine"); setBpm(80); setSidechainDepth(0.2); setReverbMix(0.9); setSensitivity(0.8);
        } else if (name === "Distortion Lead") {
            setSynthType("sawtooth"); setBpm(140); setSidechainDepth(0.6); setReverbMix(0.5); setSensitivity(1.5);
        }
    };

    useEffect(() => {
        // UI Meter loop (only for the dashboard panels, the Canvas has its own useFrame sync)
        const updateMeters = () => {
            if (globalAudioEngine.isRunning) {
                setAudioMeters(globalAudioEngine.getFrequencyData());
            }
            meterLoopRef.current = requestAnimationFrame(updateMeters);
        };
        updateMeters();

        return () => {
            if (meterLoopRef.current) cancelAnimationFrame(meterLoopRef.current);
        };
    }, []);

    const toggleMic = async () => {
        if (!isMicActive) {
            if (isSynthActive) toggleSynth(); // Desliga o synth se ligar microfone
            await globalAudioEngine.startMicrophone();
            setIsMicActive(true);
        } else {
            globalAudioEngine.stopMicrophone();
            setIsMicActive(false);
            setAudioMeters({ sub: 0, bass: 0, mid: 0, high: 0, rms: 0, peak: false, lfo: 0 }); // Reset UI
        }
    };

    const toggleSynth = async () => {
        if (!isSynthActive) {
            if (isMicActive) toggleMic(); // Desliga microfone se ligar synth
            await globalAudioEngine.startSynthesizer();
            globalAudioEngine.setSynthFrequency(synthFreq);
            globalAudioEngine.setSynthType(synthType);
            globalAudioEngine.updateBpm(bpm);
            globalAudioEngine.updateReverbMix(reverbMix);
            globalAudioEngine.updateSidechain(sidechainDepth);
            setIsSynthActive(true);
        } else {
            globalAudioEngine.stopSynthesizer();
            setIsSynthActive(false);
            setIsSequencerActive(false); // desliga bateria tbm
            setAudioMeters({ sub: 0, bass: 0, mid: 0, high: 0, rms: 0, peak: false, lfo: 0 }); // Reset UI
        }
    };

    const toggleSequencer = () => {
        globalAudioEngine.toggleSequencer();
        setIsSequencerActive(!isSequencerActive);
        if (!isSynthActive && !isSequencerActive) {
            setIsSynthActive(true); // O sequenciador liga o contexto de audio geral
        }
    };

    // Atualiza o engine quando os sliders do DAW mudam
    useEffect(() => {
        if (isSynthActive || isSequencerActive) {
            globalAudioEngine.setSynthFrequency(synthFreq);
        }
    }, [synthFreq, isSynthActive, isSequencerActive]);

    useEffect(() => {
        globalAudioEngine.setSynthType(synthType);
    }, [synthType]);

    useEffect(() => {
        globalAudioEngine.updateBpm(bpm);
    }, [bpm]);

    useEffect(() => {
        globalAudioEngine.updateReverbMix(reverbMix);
    }, [reverbMix]);

    useEffect(() => {
        globalAudioEngine.updateSidechain(sidechainDepth);
    }, [sidechainDepth]);

    return (
        <div className="flex h-screen w-full bg-[#0d1117] text-[#c9d1d9] overflow-hidden font-sans">

            {/* ── Esquerda: Preview do Node ────────────────────────────────────── */}
            <div className="flex-1 relative flex flex-col border-r border-[#30363d]">
                <div className="absolute top-0 left-0 w-full p-4 flex items-center justify-between z-10 bg-gradient-to-b from-[#0d1117] to-transparent pointer-events-none">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-md">
                            <Activity size={20} className="text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-wide">ORBE VISUAL STUDIO</h1>
                            <p className="text-xs text-[#8b949e]">Engine de Áudio-Reatividade em Tempo Real (Phase 1)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 pointer-events-auto">
                        <div className="hidden md:block text-[9px] text-[#8b949e] uppercase font-bold mr-2 bg-[#0d1117] border border-[#30363d] px-2 py-1 rounded">
                            Press [H] for Zen Mode
                        </div>
                        <button className="flex items-center gap-2 bg-[#21262d] hover:bg-[#30363d] px-4 py-2 rounded-md text-sm border border-[#30363d] transition-colors">
                            <Settings size={16} /> Parâmetros
                        </button>
                        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-md text-sm font-semibold text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all">
                            <Download size={16} /> Export Code
                        </button>
                    </div>
                </div>

                {/* Viewport 3D (React Three Fiber) */}
                <div className="flex-1 bg-black overflow-hidden relative">
                    <OrbeVisualizer
                        bloomColor={bloomColor}
                        sensitivity={sensitivity}
                        geometry={geometry}
                        postFX={postFX}
                        routings={routings}
                    />

                    {/* Overlays de Gravação / Indicadores */}
                    {isMicActive && (
                        <div className="absolute bottom-6 left-6 flex items-center gap-3 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-full animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                            <span className="text-xs text-red-400 font-bold uppercase tracking-widest">Listening...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Direita: Painel de Controle (Studio Interface) ─────────────────── */}
            <div className={`w-[450px] bg-[#161b22] flex-col overflow-y-auto border-l border-[#30363d] z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] ${isZenMode ? 'hidden' : 'flex'}`}>

                {/* ── TAB NAVIGATION HEADER ── */}
                <div className="flex border-b border-[#30363d] sticky top-0 bg-[#161b22] z-30">
                    <button onClick={() => setActiveTab('synth')} className={`flex-1 p-3 text-[10px] font-bold uppercase transition focus:outline-none flex flex-col items-center gap-1 ${activeTab === 'synth' ? 'border-b-2 border-purple-500 text-white bg-[#0d1117]' : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'}`}>
                        <Music size={14} /> Synth / DAW
                    </button>
                    <button onClick={() => setActiveTab('routing')} className={`flex-1 p-3 text-[10px] font-bold uppercase transition focus:outline-none flex flex-col items-center gap-1 ${activeTab === 'routing' ? 'border-b-2 border-green-500 text-white bg-[#0d1117]' : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'}`}>
                        <Activity size={14} /> Routing Matrix
                    </button>
                    <button onClick={() => setActiveTab('mesh')} className={`flex-1 p-3 text-[10px] font-bold uppercase transition focus:outline-none flex flex-col items-center gap-1 ${activeTab === 'mesh' ? 'border-b-2 border-blue-500 text-white bg-[#0d1117]' : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'}`}>
                        <Box size={14} /> FX & Mesh
                    </button>
                    <button onClick={() => setActiveTab('export')} className={`flex-1 p-3 text-[10px] font-bold uppercase transition focus:outline-none flex flex-col items-center gap-1 ${activeTab === 'export' ? 'border-b-2 border-orange-500 text-white bg-[#0d1117]' : 'text-[#8b949e] hover:text-white hover:bg-[#21262d]'}`}>
                        <Download size={14} /> Deploy
                    </button>
                </div>

                {/* TAB 1: SYNTH & DAW (Wrapped) */}
                <div className={`flex-col ${activeTab === 'synth' ? 'flex' : 'hidden'}`}>
                    {/* Playback & Input */}
                    <div className="p-6 border-b border-[#30363d]">
                        <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                            <Volume2 size={16} className="text-gray-400" /> Input de Áudio
                        </h2>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={toggleMic}
                                className={`flex items-center justify-center gap-2 py-3 rounded-md font-bold transition-all border ${isMicActive
                                    ? 'bg-red-500/10 border-red-500/50 text-red-400 hover:bg-red-500/20'
                                    : 'bg-[#0d1117] border-[#30363d] text-[#8b949e] hover:bg-[#21262d] hover:text-[#c9d1d9]'
                                    }`}
                            >
                                {isMicActive ? <MicOff size={18} /> : <Mic size={18} />}
                                {isMicActive ? 'Parar Microfone' : 'Habilitar Microfone'}
                            </button>
                            <button
                                onClick={toggleSynth}
                                className={`flex items-center justify-center gap-2 py-3 rounded-md font-bold transition-all border ${isSynthActive
                                    ? 'bg-purple-500/10 border-purple-500/50 text-purple-400 hover:bg-purple-500/20'
                                    : 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/20'
                                    }`}
                            >
                                {isSynthActive ? <Square size={18} /> : <Music size={18} />}
                                {isSynthActive ? 'Desligar Sintetizador' : 'Habilitar Sintetizador'}
                            </button>
                        </div>

                        {/* VST PRO PANEL: Sintetizador & DAW Parâmetros Avançados */}
                        <div className={`transition-all overflow-hidden bg-[#0d1117] relative ${isSynthActive || isSequencerActive ? 'h-auto opacity-100 border-b border-[#30363d]' : 'h-0 opacity-0'}`}>
                            <div className="p-4 flex flex-col gap-4">

                                {/* VST HEADER: PRESETS */}
                                <div className="flex items-center justify-between border-b border-[#30363d] pb-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                                        <Layers size={14} className="text-purple-400" /> ORBE SYNTH V1
                                    </div>
                                    <select
                                        className="bg-[#21262d] border border-[#30363d] text-xs text-[#c9d1d9] rounded p-1 outline-none focus:border-purple-500 font-semibold"
                                        value={currentPreset}
                                        onChange={(e) => loadPreset(e.target.value)}
                                    >
                                        <option value="Custom">Custom State...</option>
                                        <option value="Cyberpunk Bass">Cyberpunk Bass</option>
                                        <option value="Valhalla Pad">Valhalla Pad</option>
                                        <option value="Distortion Lead">Distortion Lead</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {/* VST RACK: OSCILLATOR */}
                                    <div className="bg-[#161b22] border border-[#30363d] rounded-md p-3 shadow-inner">
                                        <h3 className="text-[10px] uppercase text-[#8b949e] font-bold mb-3 flex items-center justify-between">
                                            Oscillator
                                            <div className="flex gap-1">
                                                {['sawtooth', 'square', 'sine', 'triangle'].map(wave => (
                                                    <button key={wave} onClick={() => setSynthType(wave as OscillatorType)}
                                                        className={`w-3 h-3 rounded-full border transition-all ${synthType === wave ? 'border-purple-400 bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'border-[#30363d] bg-[#0d1117]'}`}
                                                        title={wave}
                                                    />
                                                ))}
                                            </div>
                                        </h3>
                                        <label className="text-[10px] font-semibold text-[#c9d1d9] mb-1 flex justify-between">Base Pitch <span className="text-purple-400">{synthFreq}Hz</span></label>
                                        <input type="range" min="50" max="1500" step="10" value={synthFreq} onChange={e => setSynthFreq(parseInt(e.target.value))} className="w-full accent-purple-500" />
                                    </div>

                                    {/* VST RACK: FX UNIT */}
                                    <div className="bg-[#161b22] border border-[#30363d] rounded-md p-3 shadow-inner">
                                        <h3 className="text-[10px] uppercase text-[#8b949e] font-bold mb-3">FX / Space</h3>
                                        <label className="text-[10px] font-semibold text-[#c9d1d9] mb-1 flex justify-between">
                                            Valhalla Reverb <span className="text-blue-400">{Math.round(reverbMix * 100)}%</span>
                                        </label>
                                        <input type="range" min="0" max="1" step="0.05" value={reverbMix} onChange={e => setReverbMix(parseFloat(e.target.value))} className="w-full accent-blue-500 mb-2" />

                                        <label className="text-[10px] font-semibold text-[#c9d1d9] mb-1 flex justify-between">
                                            Sidechain Duck <span className="text-pink-400">{Math.round(sidechainDepth * 100)}%</span>
                                        </label>
                                        <input type="range" min="0" max="1" step="0.1" value={sidechainDepth} onChange={e => setSidechainDepth(parseFloat(e.target.value))} className="w-full accent-pink-500" />
                                    </div>
                                </div>

                                {/* VST RACK: SEQUENCER */}
                                <div className="bg-[#161b22] border border-[#30363d] rounded-md p-3 flex gap-4 items-center">
                                    <button onClick={toggleSequencer} className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-full transition-all border-2 ${isSequencerActive ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-[#0d1117] border-[#30363d] text-[#8b949e]'}`}>
                                        <Drum size={16} />
                                    </button>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-semibold text-[#c9d1d9] mb-1 flex justify-between uppercase">Global BPM <span className="text-orange-400 font-bold">{bpm}</span></label>
                                        <input type="range" min="60" max="180" step="1" value={bpm} onChange={e => setBpm(parseInt(e.target.value))} className="w-full accent-orange-500" />
                                    </div>
                                </div>

                                {/* 1. SELETOR DE PRESETS DE TIMBRE */}
                                <div className="bg-[#161b22] border border-[#30363d] rounded-md p-3 mt-2">
                                    <label className="text-[10px] uppercase font-bold text-[#8b949e] tracking-wider">
                                        Timbre do Teclado (Preset)
                                    </label>
                                    <select
                                        value={selectedPresetId}
                                        onChange={(e) => setSelectedPresetId(e.target.value)}
                                        className="w-full mt-2 bg-[#0d1117] text-[#c9d1d9] text-[10px] p-2 rounded border border-[#30363d] outline-none"
                                    >
                                        {Object.values(SYNTH_PRESETS).map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* 2. PLAYER DE MELODIAS AUTOMATIZADAS */}
                                <div className="bg-[#161b22] border border-[#30363d] rounded-md p-3 mt-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] uppercase font-bold text-[#8b949e] tracking-wider">
                                            Cyber Arps & Melodias
                                        </label>
                                        {isPlayingSequence && (
                                            <span className="flex h-2 w-2 relative">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {MELODY_PRESETS.map((mel) => (
                                            <button
                                                key={mel.id}
                                                onClick={() => togglePlaySequence(mel)}
                                                className={`flex items-center justify-between p-2 rounded text-[10px] uppercase font-bold border transition ${activeMelodyId === mel.id && isPlayingSequence
                                                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400'
                                                    : 'bg-[#0d1117] border-[#30363d] hover:border-gray-500 text-[#c9d1d9]'
                                                    }`}
                                            >
                                                <span>{mel.name}</span>
                                                <span>{activeMelodyId === mel.id && isPlayingSequence ? '⏹ STOP' : '▶ PLAY'}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* VST RACK: KEYBOARD (PIANO ROLL) */}
                                <div className="bg-[#0d1117] border border-[#30363d] rounded-b-md h-24 mt-2 flex relative overflow-hidden select-none shadow-[inset_0_12px_15px_-10px_rgba(0,0,0,0.8)]">
                                    {pianoNotes.map((note) => {
                                        const whiteKeys = pianoNotes.filter(n => !n.isBlack);
                                        const whiteIndex = whiteKeys.findIndex(n => n.label === note.label.replace('#', ''));

                                        return (
                                            <div
                                                key={note.f}
                                                onMouseDown={() => globalAudioEngine.playArpNote(note.f, SYNTH_PRESETS[selectedPresetId], 0.3)}
                                                className={`cursor-pointer transition-colors active:bg-cyan-500 flex flex-col justify-end pb-2 items-center text-[8px] font-bold ${note.isBlack
                                                    ? "bg-[#1f242c] text-[#8b949e] border border-[#30363d] hover:bg-[#30363d] h-[60%] absolute top-0 w-[8%] z-10 shadow-xl rounded-b"
                                                    : "bg-[#c9d1d9] border-r border-[#30363d] text-black hover:bg-white h-full flex-1 relative z-0 rounded-b-sm"
                                                    }`}
                                                style={note.isBlack ? { left: `calc(${(whiteIndex * (100 / 7))}% + ${(100 / 14) - 4}%)` } : {}}
                                            >
                                                {note.label}
                                            </div>
                                        )
                                    })}
                                </div>
                                <p className="text-[9px] text-center text-[#8b949e]">Orbe Synth Engine v1.0 (Interactive Mapped Keyboard)</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Spectrum Meters */}
                <div className="p-6 border-b border-[#30363d]">
                    <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                        <AudioLines size={16} className="text-blue-400" /> Espectro (FFT Data)
                    </h2>
                    <div className="space-y-4">
                        {/* SUB / BASS */}
                        <div>
                            <div className="flex justify-between text-xs text-[#8b949e] mb-1">
                                <span>Grave / Bass (60-250Hz)</span>
                                <span>{(audioMeters.bass * 100).toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-[#0d1117] h-2 rounded-full overflow-hidden border border-[#30363d]">
                                <div className="h-full bg-blue-500 transition-all duration-75" style={{ width: `${Math.min(100, audioMeters.bass * 100)}%` }}></div>
                            </div>
                        </div>
                        {/* MID */}
                        <div>
                            <div className="flex justify-between text-xs text-[#8b949e] mb-1">
                                <span>Médio / Mid (250Hz-2kHz)</span>
                                <span>{(audioMeters.mid * 100).toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-[#0d1117] h-2 rounded-full overflow-hidden border border-[#30363d]">
                                <div className="h-full bg-teal-500 transition-all duration-75" style={{ width: `${Math.min(100, audioMeters.mid * 100)}%` }}></div>
                            </div>
                        </div>
                        {/* HIGH */}
                        <div>
                            <div className="flex justify-between text-xs text-[#8b949e] mb-1">
                                <span>Agudo / Treble (2kHz+)</span>
                                <span>{(audioMeters.high * 100).toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-[#0d1117] h-2 rounded-full overflow-hidden border border-[#30363d]">
                                <div className="h-full bg-purple-500 transition-all duration-75" style={{ width: `${Math.min(100, audioMeters.high * 100)}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Efeitos e Shaders */}
                <div className="p-6">
                    <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                        <Settings size={16} className="text-gray-400" /> Shaders & Node Mix
                    </h2>

                    <div className="space-y-6">
                        {/* Sensibilidade */}
                        <div>
                            <label className="flex justify-between text-xs font-semibold text-[#c9d1d9] mb-2">
                                Fator de Ataque (Sensibilidade) <span className="text-blue-400">{sensitivity.toFixed(1)}x</span>
                            </label>
                            <input
                                type="range" min="0.1" max="5.0" step="0.1"
                                value={sensitivity}
                                onChange={e => setSensitivity(parseFloat(e.target.value))}
                                className="w-full accent-blue-500"
                            />
                            <p className="text-[10px] text-[#8b949e] mt-2 leading-relaxed">Controla o quão violenta é a resposta da malha ao volume captado no buffer FFT. Usa curvas de Bézier/Lerp dinâmicas.</p>
                        </div>

                        {/* Topologia / Geometria */}
                        <div>
                            <label className="flex justify-between text-xs font-semibold text-[#c9d1d9] mb-2">
                                Topologia da Malha (Geometria 3D)
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'icosahedron', label: 'Icosaedro', icon: <Activity size={14} /> },
                                    { id: 'torus', label: 'Torus Knot', icon: <Radio size={14} /> },
                                    { id: 'sphere', label: 'Esfera Densa', icon: <OrbeIcon /> },
                                    { id: 'box', label: 'Gaiola Cúbica', icon: <Box size={14} /> }
                                ].map(g => (
                                    <button
                                        key={g.id}
                                        onClick={() => setGeometry(g.id as any)}
                                        className={`flex items-center gap-2 justify-center py-2 px-3 text-xs border rounded-md transition-all ${geometry === g.id ? 'border-blue-500 text-blue-400 bg-blue-500/10' : 'border-[#30363d] text-[#8b949e] hover:border-gray-500'}`}
                                    >
                                        {g.icon} {g.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Cor de Bloom */}
                        <div>
                            <label className="block text-xs font-semibold text-[#c9d1d9] mb-2">Matrix Color (Glow / Escala)</label>
                            <div className="flex gap-2">
                                {['#00ffcc', '#ff0055', '#bb00ff', '#ffffff'].map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setBloomColor(c)}
                                        className={`w-10 h-10 rounded-md border-2 transition-all ${bloomColor === c ? 'border-white shadow-[0_0_10px_rgba(255,255,255,0.3)]' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* TAB 2: ROUTING MATRIX */}
                <div className={`p-6 flex-col min-h-screen ${activeTab === 'routing' ? 'flex' : 'hidden'}`}>
                    <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                        <Activity size={16} className="text-green-400" /> Matriz de Modulação
                    </h2>

                    {/* Quick Presets */}
                    <div className="flex flex-col gap-2 mb-6">
                        <p className="text-xs text-[#8b949e]">Quick Routing Presets:</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => loadRoutingPreset('Supermassive Core')} className="text-[9px] text-[#c9d1d9] uppercase font-bold py-2 bg-[#21262d] hover:bg-[#30363d] rounded border border-[#30363d]">Supermassive</button>
                            <button onClick={() => loadRoutingPreset('Cyber Glitch')} className="text-[9px] text-[#c9d1d9] uppercase font-bold py-2 bg-[#21262d] hover:bg-[#30363d] rounded border border-[#30363d]">Cyber Glitch</button>
                            <button onClick={() => loadRoutingPreset('Fluid Nebula')} className="text-[9px] text-[#c9d1d9] uppercase font-bold py-2 bg-[#21262d] hover:bg-[#30363d] rounded border border-[#30363d]">Fluid Nebula</button>
                            <button onClick={() => loadRoutingPreset('Clear')} className="text-[9px] uppercase font-bold py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded border border-red-500/30">Clear Matrix</button>
                        </div>
                    </div>

                    {/* Roteamento Ativo */}
                    <div className="space-y-3">
                        {routings.length === 0 && (
                            <div className="text-xs text-center p-6 border border-dashed border-[#30363d] rounded text-[#8b949e]">
                                Selecione um Preset acima para injetar ligações neurais sonoras.
                            </div>
                        )}
                        {routings.map(route => (
                            <div key={route.id} className={`bg-[#0d1117] border rounded p-3 flex flex-col gap-3 transition-opacity ${route.active ? 'border-[#30363d] opacity-100' : 'border-red-500/30 opacity-50'}`}>
                                <div className="flex justify-between items-center border-b border-[#21262d] pb-2">
                                    <div className="text-[9px] font-bold uppercase text-[#8b949e]">Slot {route.id}</div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setRoutings(prev => prev.map(r => r.id === route.id ? { ...r, active: !r.active } : r))}
                                            className={`w-3 h-3 rounded-full ${route.active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}
                                        />
                                        <button onClick={() => setRoutings(prev => prev.filter(r => r.id !== route.id))} className="text-red-500 hover:text-red-400 text-xs font-bold leading-none w-3 flex items-center justify-center">×</button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        <select
                                            className="bg-[#161b22] text-[#c9d1d9] text-[9px] uppercase font-bold p-1 rounded flex-1 border border-[#30363d] outline-none"
                                            value={route.source}
                                            onChange={(e) => setRoutings(prev => prev.map(r => r.id === route.id ? { ...r, source: e.target.value as any } : r))}
                                        >
                                            <option value="sub">Sub (20-60Hz)</option>
                                            <option value="bass">Bass/Kick (60-250Hz)</option>
                                            <option value="mid">Mid/Snare (250Hz-2kHz)</option>
                                            <option value="high">Treble/Hats (2k-16k)</option>
                                            <option value="peak">Transient (Peak)</option>
                                            <option value="rms">Master (RMS)</option>
                                            <option value="lfo">LFO 1 (Free)</option>
                                        </select>
                                        <span className="text-[#8b949e] text-xs">→</span>
                                        <select
                                            className="bg-[#161b22] text-[#c9d1d9] text-[9px] uppercase font-bold p-1 rounded flex-1 border border-[#30363d] outline-none"
                                            value={route.target}
                                            onChange={(e) => setRoutings(prev => prev.map(r => r.id === route.id ? { ...r, target: e.target.value as any } : r))}
                                        >
                                            <option value="meshScale">Mesh Scale</option>
                                            <option value="vertexNoise">Mesh Turbulence</option>
                                            <option value="wireframeThickness">Wire Width</option>
                                            <option value="rotationSpeed">Rotation Speed</option>
                                            <option value="bloomIntensity">Glow Bloom</option>
                                            <option value="chromaticAberration">RGB Glitch</option>
                                            <option value="hueShift">Hue Chroma</option>
                                            <option value="cameraShake">Camera Shake</option>
                                            <option value="cameraFov">Camera Fov</option>
                                            <option value="particleVelocity">Particle Velocity</option>
                                            <option value="particleBurst">Burst Explosion</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-2 items-center mt-1">
                                        <span className="text-[9px] font-bold text-[#8b949e] w-12 shrink-0">VAL: {(route.amount > 0 ? '+' : '')}{route.amount}%</span>
                                        <div className="flex-1 relative flex items-center h-3">
                                            <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-red-500/50 z-0 h-3" />
                                            <input
                                                type="range"
                                                min="-100"
                                                max="100"
                                                value={route.amount}
                                                onChange={(e) => setRoutings(prev => prev.map(r => r.id === route.id ? { ...r, amount: parseInt(e.target.value) } : r))}
                                                className="w-full relative z-10 appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:bg-[#21262d] [&::-webkit-slider-runnable-track]:rounded-sm [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 cursor-pointer"
                                            />
                                        </div>
                                        <select
                                            className="text-[8px] uppercase px-1 py-1 shrink-0 bg-[#161b22] rounded border border-[#30363d] text-[#c9d1d9] outline-none"
                                            value={route.smooth}
                                            onChange={(e) => setRoutings(prev => prev.map(r => r.id === route.id ? { ...r, smooth: e.target.value as any } : r))}
                                        >
                                            <option value="linear">LINEAR</option>
                                            <option value="fast_decay">FAST_DECAY</option>
                                            <option value="slow_decay">SLOW_DECAY</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={() => setRoutings(prev => [...prev, { id: `R${Math.random().toString(36).substring(2, 6).toUpperCase()}`, source: 'rms', target: 'meshScale', amount: 50, smooth: 'linear', invert: false, active: true }])}
                            className="w-full py-2 mt-2 border border-dashed border-[#30363d] text-[#8b949e] text-[9px] font-bold uppercase rounded hover:bg-[#21262d] transition-colors"
                        >
                            + Adicionar Rota Direta
                        </button>
                    </div>
                </div>

                {/* TAB 3: SHADERS & MESH LAB */}
                <div className={`p-6 flex-col min-h-screen ${activeTab === 'mesh' ? 'flex' : 'hidden'}`}>
                    <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                        <Layers size={16} className="text-blue-400" /> Post-Processing FX & Topologia
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Coluna 1: Cinematic Optics */}
                        <div className="bg-[#0d1117] rounded-md border border-[#30363d] p-4 flex flex-col gap-2">
                            <h3 className="text-[10px] text-[#8b949e] font-bold uppercase mb-2">Cinematic Optics</h3>
                            {[
                                { id: 'bloom', label: 'UNREAL BLOOM (Luzes NEON)' },
                                { id: 'bokeh', label: 'DEPTH OF FIELD (BOKEH)' },
                                { id: 'godrays', label: 'VOLUMETRIC GOD RAYS' },
                                { id: 'vignette', label: 'VIGNETTE & LENS DIRT' },
                                { id: 'kaleidoscope', label: 'KALEIDOSCOPE MIRROR' },
                            ].map(fx => (
                                <button
                                    key={fx.id}
                                    onClick={() => setPostFX(p => ({ ...p, [fx.id]: !(p as any)[fx.id] }))}
                                    className={`flex items-center justify-between p-2 rounded transition-colors border ${(postFX as any)[fx.id] ? 'bg-blue-500/10 border-blue-500/50 text-white' : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:bg-[#21262d]'}`}
                                >
                                    <span className="text-[9px] font-bold uppercase">{fx.label}</span>
                                    <div className={`w-2 h-2 rounded-sm ${(postFX as any)[fx.id] ? 'bg-blue-500' : 'bg-[#30363d]'}`} />
                                </button>
                            ))}
                        </div>

                        {/* Coluna 2: Retro & Cyberpunk FX */}
                        <div className="bg-[#0d1117] rounded-md border border-[#30363d] p-4 flex flex-col gap-2">
                            <h3 className="text-[10px] text-[#8b949e] font-bold uppercase mb-2">Retro & Cyberpunk FX</h3>
                            {[
                                { id: 'ascii', label: 'ASCII MATRIX MODE' },
                                { id: 'scanlines', label: 'CRT & SCANLINES' },
                                { id: 'noise', label: 'FILM NOISE / DITHER' },
                                { id: 'glitch', label: 'RGB GLITCH SHIFT' },
                                { id: 'pixelate', label: 'VOXEL / PIXELATE' },
                            ].map(fx => (
                                <button
                                    key={fx.id}
                                    onClick={() => setPostFX(p => ({ ...p, [fx.id]: !(p as any)[fx.id] }))}
                                    className={`flex items-center justify-between p-2 rounded transition-colors border ${(postFX as any)[fx.id] ? 'bg-orange-500/10 border-orange-500/50 text-white' : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:bg-[#21262d]'}`}
                                >
                                    <span className="text-[9px] font-bold uppercase">{fx.label}</span>
                                    <div className={`w-2 h-2 rounded-sm ${(postFX as any)[fx.id] ? 'bg-orange-500' : 'bg-[#30363d]'}`} />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* TAB 4: DEPLOY */}
                <div className={`p-6 flex-col min-h-screen ${activeTab === 'export' ? 'flex' : 'hidden'}`}>
                    <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                        <Download size={16} className="text-orange-400" /> Exportação & Deploy Master
                    </h2>

                    {/* Gravador de Vídeo */}
                    <div className="bg-[#161b22] border border-[#30363d] rounded p-4 mb-4">
                        <h3 className="text-xs uppercase font-bold text-[#c9d1d9] mb-2 flex items-center gap-2">
                            <Activity size={14} className="text-red-500" /> Renderização de Vídeo GPU
                        </h3>
                        <p className="text-[10px] text-[#8b949e] mb-4">Grave a cena 3D atual em tempo real usando o canvas stream direto do WebGL para gerar clipes e Music Videos HD.</p>
                        <button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] p-3 rounded flex justify-center items-center gap-2 transition-all shadow-[0_0_15px_rgba(220,38,38,0.5)] uppercase tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> START 15s HD RECORD
                        </button>
                    </div>

                    {/* Exportador JSON e JSX */}
                    <div className="bg-[#161b22] border border-[#30363d] rounded p-4">
                        <h3 className="text-xs uppercase font-bold text-[#c9d1d9] mb-2 flex items-center gap-2">
                            <Box size={14} className="text-blue-500" /> Gerador de Código React
                        </h3>
                        <p className="text-[10px] text-[#8b949e] mb-4">Exporte toda a Matriz de Roteamento, os Hooks de Áudio e o componente WebGL em um único pacote modular para injetar na sua aplicação principal.</p>

                        <div className="flex gap-2">
                            <button className="flex-1 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] font-bold text-[9px] p-2 rounded transition-colors uppercase">
                                Exportar Projeto (.Zip)
                            </button>
                            <button className="flex-1 bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] border border-[#30363d] font-bold text-[9px] p-2 rounded transition-colors uppercase">
                                Baixar JSON Preset
                            </button>
                        </div>
                    </div>
                    <p className="text-[9px] text-[#8b949e] text-center mt-6">Code Snippet Engine v1.1.2 - Deploy Framework atrelado ao motor principal.</p>
                </div>
            </div>
        </div>
    );
}

// Simple Helper Icon
function OrbeIcon() {
    return <div className="w-3 h-3 rounded-full border-2 border-current" />;
}
