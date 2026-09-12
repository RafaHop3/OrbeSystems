export interface MelodySequence {
    id: string;
    name: string;
    bpm: number;
    preset: string;
    notes: { note: string; freq: number; duration: number }[];
}

// Frequências das notas fundamentais
const NOTES = {
    C2: 65.41, D2: 73.42, E2: 82.41, G2: 98.0, A2: 110.0, B2: 123.47,
    C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
    C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0, B4: 493.88
};

export const MELODY_PRESETS: MelodySequence[] = [
    {
        id: 'cyberArp',
        name: '🔴 Cyberpunk 2077 Arp (130 BPM)',
        bpm: 130,
        preset: 'cyberpunkLead',
        notes: [
            { note: 'E2', freq: NOTES.E2, duration: 0.2 },
            { note: 'G2', freq: NOTES.G2, duration: 0.2 },
            { note: 'B2', freq: NOTES.B2, duration: 0.2 },
            { note: 'E3', freq: NOTES.E3, duration: 0.2 },
            { note: 'D3', freq: NOTES.D3, duration: 0.2 },
            { note: 'B2', freq: NOTES.B2, duration: 0.2 },
            { note: 'G2', freq: NOTES.G2, duration: 0.2 },
            { note: 'A2', freq: NOTES.A2, duration: 0.2 }
        ]
    },
    {
        id: 'strangerSynth',
        name: '🌌 Stranger Synthwave Arp (120 BPM)',
        bpm: 120,
        preset: 'neonPluck',
        notes: [
            { note: 'C3', freq: NOTES.C3, duration: 0.25 },
            { note: 'E3', freq: NOTES.E3, duration: 0.25 },
            { note: 'G3', freq: NOTES.G3, duration: 0.25 },
            { note: 'B3', freq: NOTES.B3, duration: 0.25 },
            { note: 'C4', freq: NOTES.C4, duration: 0.25 },
            { note: 'B3', freq: NOTES.B3, duration: 0.25 },
            { note: 'G3', freq: NOTES.G3, duration: 0.25 },
            { note: 'E3', freq: NOTES.E3, duration: 0.25 }
        ]
    },
    {
        id: 'acidBassline',
        name: '☣️ Techno Acid 303 (138 BPM)',
        bpm: 138,
        preset: 'deepReeseBass',
        notes: [
            { note: 'A2', freq: NOTES.A2, duration: 0.18 },
            { note: 'A2', freq: NOTES.A2, duration: 0.18 },
            { note: 'C3', freq: NOTES.C3, duration: 0.18 },
            { note: 'A2', freq: NOTES.A2, duration: 0.18 },
            { note: 'D3', freq: NOTES.D3, duration: 0.18 },
            { note: 'C3', freq: NOTES.C3, duration: 0.18 },
            { note: 'G2', freq: NOTES.G2, duration: 0.36 }
        ]
    }
];
