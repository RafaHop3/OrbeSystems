// Orbe Audio Engine
// Singleton instance handling Web Audio API nodes, scheduling, and loop intervals
let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

export const AudioEngine = {
    init() {
        if (typeof window !== 'undefined' && !audioCtx) {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            masterGain = audioCtx.createGain();
            masterGain.connect(audioCtx.destination);
            masterGain.gain.value = 0.8;
            console.log("[DAW] Audio Engine Initialized", audioCtx.state);
        }
    },

    getContext() {
        return audioCtx;
    },

    setMasterVolume(val: number) { // 0 to 100
        if (masterGain) {
            masterGain.gain.value = val / 100;
        }
    },

    resume() {
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }
};
