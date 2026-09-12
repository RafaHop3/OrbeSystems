export interface SynthPreset {
    id: string;
    name: string;
    oscType: OscillatorType;
    detune: number;
    filterCutoff: number;
    filterResonance: number;
    attack: number;
    decay: number;
    sustain: number;
    release: number;
}

export const SYNTH_PRESETS: Record<string, SynthPreset> = {
    cyberpunkLead: {
        id: 'cyberpunkLead',
        name: '⚡ Cyberpunk Saw Lead',
        oscType: 'sawtooth',
        detune: 12,
        filterCutoff: 3200,
        filterResonance: 4.5,
        attack: 0.02, // Ataque imediato (sem delay/sidechain)
        decay: 0.3,
        sustain: 0.7,
        release: 0.4
    },
    neonPluck: {
        id: 'neonPluck',
        name: '✨ Neon Dream Pluck',
        oscType: 'triangle',
        detune: 0,
        filterCutoff: 5000,
        filterResonance: 8.0,
        attack: 0.005,
        decay: 0.18,
        sustain: 0.1,
        release: 0.2
    },
    deepReeseBass: {
        id: 'deepReeseBass',
        name: '🌌 Deep Space Reese Bass',
        oscType: 'sawtooth',
        detune: 25, // Unison detune para peso espacial
        filterCutoff: 650,
        filterResonance: 2.0,
        attack: 0.04,
        decay: 0.5,
        sustain: 0.9,
        release: 0.6
    },
    vangelisBlade: {
        id: 'vangelisBlade',
        name: '🪐 Blade Runner Brass',
        oscType: 'sawtooth',
        detune: 8,
        filterCutoff: 1800,
        filterResonance: 3.2,
        attack: 0.25, // Entrada cinematográfica suave
        decay: 0.4,
        sustain: 0.8,
        release: 0.8
    }
};
