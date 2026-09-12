import { SynthPreset } from './synthPresets';

export interface AudioAnalysis {
    sub: number;
    bass: number;
    mid: number;
    high: number;
    rms: number;
    peak: boolean;
    lfo: number;
}

/**
 * Motor de processamento de áudio desacoplado para uso via singleton no Orbe Visual Studio.
 * Gerencia o contexto global (Node e Analyser), captura microfone e expõe os buffers FFT.
 */
export class AudioEngine {
    public audioContext: AudioContext | null = null;
    public analyser: AnalyserNode | null = null;
    public dataArray: Uint8Array | null = null;
    public timeArray: Uint8Array | null = null;
    private stream: MediaStream | null = null;
    public isRunning: boolean = false;
    public inputMode: 'none' | 'mic' | 'synth' = 'none';

    // Advanced Web DAW Parameters
    public bpm: number = 120;
    public sidechainDepth: number = 0.8;
    public reverbMix: number = 0.4;
    public synthCurrentVolume: number = 0.5;
    public isSequencerRunning: boolean = false;

    // Matriz Auxiliar (LFO & Peak)
    private pRms: number = 0; // Previous RMS for peak detection
    private peakHold: number = 0; // Frames to hold peak boolean
    public lfoFreq: number = 2.0; // Velocidade LFO (Hz)
    public lfoType: 'sine' | 'square' | 'saw' = 'sine';

    // Synthesizer & Effects Nodes
    private oscillator: OscillatorNode | null = null;
    private synthGain: GainNode | null = null;
    public keyboardBus: GainNode | null = null; // Bus sem sidechain
    private convolver: ConvolverNode | null = null;
    private dryGain: GainNode | null = null;
    private wetGain: GainNode | null = null;
    private drumInterval: ReturnType<typeof setTimeout> | null = null;

    // Helper: Synthetic Impulse Response (Valhalla-ish)
    private createImpulseResponse(ctx: AudioContext, duration: number, decay: number) {
        const sampleRate = ctx.sampleRate;
        const length = sampleRate * duration;
        const impulse = ctx.createBuffer(2, length, sampleRate);
        const impulseL = impulse.getChannelData(0);
        const impulseR = impulse.getChannelData(1);
        for (let i = 0; i < length; i++) {
            const n = Math.pow(1 - i / length, decay);
            impulseL[i] = (Math.random() * 2 - 1) * n;
            impulseR[i] = (Math.random() * 2 - 1) * n;
        }
        return impulse;
    }

    async startMicrophone() {
        if (typeof window === 'undefined') return;
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(this.stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 1024;
            this.analyser.smoothingTimeConstant = 0.85; // Natural smooth decay
            this.analyser.smoothingTimeConstant = 0.85; // Natural smooth decay
            source.connect(this.analyser);
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.timeArray = new Uint8Array(this.analyser.fftSize);
            this.isRunning = true;
            this.inputMode = 'mic';
        } catch (e) {
            console.error('Falha ao iniciar microfone:', e);
            alert('Não foi possível obter permissão do microfone.');
        }
    }

    stopMicrophone() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.stream = null;
        this.audioContext = null;
        this.analyser = null;
        this.isRunning = false;
        this.inputMode = 'none';
    }

    async startSynthesizer() {
        if (typeof window === 'undefined') return;
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 1024;
        this.analyser.smoothingTimeConstant = 0.85;

        // 1. Barramento do Teclado (Livre, sem sidechain)
        this.keyboardBus = this.audioContext.createGain();
        this.keyboardBus.gain.value = 0.8;
        this.keyboardBus.connect(this.analyser);

        // Cria nós do sintetizador (agora como um PAD ou drone de fundo que PODE sofrer ducking)
        this.oscillator = this.audioContext.createOscillator();
        this.synthGain = this.audioContext.createGain();

        this.oscillator.type = "sawtooth";
        this.oscillator.frequency.value = 150; // default pitch

        // ADSR Engine: Default to 0 (Silence) so it only plays on Keyboard Trigger
        this.synthGain.gain.value = 0;

        // Cria os efeitos: Reverb via Convolução
        this.convolver = this.audioContext.createConvolver();
        this.convolver.buffer = this.createImpulseResponse(this.audioContext, 4.0, 3.0); // 4sec Cauda, 3x Decay
        this.dryGain = this.audioContext.createGain();
        this.wetGain = this.audioContext.createGain();

        // Conecta o pipeline em paralelo para o Reverb Mix
        this.oscillator.connect(this.synthGain);
        this.synthGain.connect(this.dryGain);
        this.synthGain.connect(this.convolver);
        this.convolver.connect(this.wetGain);

        this.dryGain.connect(this.analyser);
        this.wetGain.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        this.updateReverbMix(this.reverbMix);

        this.oscillator.start();
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        this.timeArray = new Uint8Array(this.analyser.fftSize);
        this.isRunning = true;
        this.inputMode = 'synth';
    }

    setSynthFrequency(hz: number) {
        if (this.oscillator && this.audioContext) {
            this.oscillator.frequency.setTargetAtTime(hz, this.audioContext.currentTime, 0.05);
        }
    }

    setSynthVolume(vol: number) {
        this.synthCurrentVolume = vol;
    }

    // ── ADSR Piano Trigger ────────────────────────────────────────────────────────
    triggerNote(freq: number) {
        if (!this.oscillator || !this.synthGain || !this.audioContext) return;
        const time = this.audioContext.currentTime;

        // Glide the frequency slightly
        this.oscillator.frequency.setTargetAtTime(freq, time, 0.02);

        // ADSR Envelope: Attack (Fast ramp to max volume)
        this.synthGain.gain.cancelScheduledValues(time);
        this.synthGain.gain.setValueAtTime(this.synthGain.gain.value, time);
        this.synthGain.gain.linearRampToValueAtTime(this.synthCurrentVolume, time + 0.05); // Attack 50ms
    }

    releaseNote() {
        if (!this.synthGain || !this.audioContext) return;
        const time = this.audioContext.currentTime;

        // ADSR Envelope: Release (Ramp down to silence)
        this.synthGain.gain.cancelScheduledValues(time);
        this.synthGain.gain.setValueAtTime(this.synthGain.gain.value, time);
        this.synthGain.gain.linearRampToValueAtTime(0.001, time + 0.3); // Release 300ms
        this.synthGain.gain.setValueAtTime(0, time + 0.31);
    }
    // ─────────────────────────────────────────────────────────────────────────────

    // ── Novo Arpeggiator & Sequence Engine (Sem Sidechain) ──────────────────────
    playArpNote(frequency: number, preset: SynthPreset, duration = 0.3, startTimeOffset = 0) {
        if (!this.audioContext || !this.keyboardBus) return;

        const osc = this.audioContext.createOscillator();
        const filter = this.audioContext.createBiquadFilter();
        const env = this.audioContext.createGain();

        // Configuração
        osc.type = preset.oscType;
        const now = this.audioContext.currentTime + startTimeOffset;

        osc.frequency.setValueAtTime(frequency, now);
        osc.detune.setValueAtTime(preset.detune, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(preset.filterCutoff, now);
        filter.Q.setValueAtTime(preset.filterResonance, now);

        // Envelope
        env.gain.setValueAtTime(0, now);
        env.gain.linearRampToValueAtTime(0.8, now + Math.max(0.005, preset.attack));
        env.gain.exponentialRampToValueAtTime(Math.max(0.01, preset.sustain * 0.8), now + Math.max(0.005, preset.attack) + preset.decay);
        env.gain.exponentialRampToValueAtTime(0.0001, now + duration + preset.release);

        osc.connect(filter);
        filter.connect(env);
        env.connect(this.keyboardBus);

        osc.start(now);
        osc.stop(now + duration + preset.release + 0.1);
    }

    setSynthType(type: OscillatorType) {
        if (this.oscillator) {
            this.oscillator.type = type;
        }
    }

    updateReverbMix(wet: number) {
        this.reverbMix = wet;
        if (this.dryGain && this.wetGain && this.audioContext) {
            this.dryGain.gain.setTargetAtTime(1 - wet, this.audioContext.currentTime, 0.05);
            this.wetGain.gain.setTargetAtTime(wet, this.audioContext.currentTime, 0.05);
        }
    }

    updateSidechain(depth: number) {
        this.sidechainDepth = depth;
    }

    updateBpm(b: number) {
        this.bpm = b;
    }

    stopSynthesizer() {
        this.stopSequencer(); // Traz a bateria junto
        if (this.oscillator) {
            this.oscillator.stop();
            this.oscillator.disconnect();
        }
        if (this.synthGain) this.synthGain.disconnect();
        if (this.convolver) this.convolver.disconnect();
        if (this.dryGain) this.dryGain.disconnect();
        if (this.wetGain) this.wetGain.disconnect();

        if (this.audioContext) {
            this.audioContext.close();
        }

        this.oscillator = null;
        this.synthGain = null;
        this.convolver = null;
        this.dryGain = null;
        this.wetGain = null;
        this.audioContext = null;
        this.analyser = null;
        this.isRunning = false;
        this.inputMode = 'none';
    }

    // ── SEQUENCIADOR (Drum Machine & Sidechain) ──────────────────────────────────
    triggerKick() {
        if (!this.audioContext || !this.analyser) return;
        const time = this.audioContext.currentTime;

        // Bumbo Físico 909-style
        const kickOsc = this.audioContext.createOscillator();
        const kickGain = this.audioContext.createGain();

        kickOsc.connect(kickGain);
        kickGain.connect(this.analyser); // injeta na placa mestre de UI/3D FFT

        kickOsc.frequency.setValueAtTime(150, time);
        kickOsc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

        kickGain.gain.setValueAtTime(1, time);
        kickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        kickOsc.start(time);
        kickOsc.stop(time + 0.5);

        // Simulador de Sidechain (Ducking) no Sintetizador Principal
        if (this.synthGain && this.sidechainDepth > 0) {
            const volBase = this.synthCurrentVolume;
            const drop = volBase * (1 - this.sidechainDepth);

            this.synthGain.gain.cancelScheduledValues(time);
            this.synthGain.gain.setValueAtTime(drop, time);
            this.synthGain.gain.exponentialRampToValueAtTime(volBase, time + 0.3); // O "pulo" rápido do ducking
        }
    }

    scheduleNextDrum = () => {
        if (!this.isSequencerRunning) return;
        this.triggerKick();

        // Relógio procedural baseado em compasso 4/4
        const msPerBeat = 60000 / this.bpm;
        this.drumInterval = setTimeout(this.scheduleNextDrum, msPerBeat);
    }

    toggleSequencer() {
        if (this.isSequencerRunning) {
            this.stopSequencer();
        } else {
            // Garante que o Contexto exista, se não inicia um silence
            if (!this.audioContext) {
                this.startSynthesizer();
            }
            this.isSequencerRunning = true;
            this.scheduleNextDrum();
        }
    }

    stopSequencer() {
        this.isSequencerRunning = false;
        if (this.drumInterval) clearTimeout(this.drumInterval);
    }

    getFrequencyData(): AudioAnalysis {
        if (!this.analyser || !this.dataArray || !this.timeArray) {
            return { sub: 0, bass: 0, mid: 0, high: 0, rms: 0, peak: false, lfo: 0 };
        }

        this.analyser.getByteFrequencyData(this.dataArray as any);
        this.analyser.getByteTimeDomainData(this.timeArray as any);

        // Mapeamento matemático em bandas aproximadas via FFT
        const getAverage = (start: number, end: number) => {
            let sum = 0;
            for (let i = start; i < end; i++) {
                sum += this.dataArray![i];
            }
            return sum / (end - start) / 255.0; // Normalized 0..1
        };

        const sub = getAverage(0, 4);
        const bass = getAverage(4, 12);
        const mid = getAverage(12, 100);
        const high = getAverage(100, 250);

        // Calculation over TimeDomain for accurate Master Volume (RMS)
        let sumSquares = 0;
        for (let i = 0; i < this.timeArray.length; i++) {
            const normalized = (this.timeArray[i] / 128.0) - 1.0;
            sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / this.timeArray.length);

        // Transient / Peak Detection (Detects fast rising envelopes)
        let isPeak = false;
        if (rms > this.pRms * 1.5 && rms > 0.15) { // 1.5x aumento subido, limite mínimo de ruído
            isPeak = true;
            this.peakHold = 10; // Segura o "booleano" verdadeiro por 10 frames para UI/Eventos responderem
        }
        this.pRms = rms;

        if (this.peakHold > 0) {
            isPeak = true;
            this.peakHold--;
        }

        // LFO Autônomo baseado no AudioContext Time Centralizado
        let lfo = 0;
        const time = this.audioContext?.currentTime || performance.now() / 1000;
        if (this.lfoType === 'sine') {
            lfo = (Math.sin(time * Math.PI * 2 * this.lfoFreq) + 1) / 2; // Normaliza 0..1
        } else if (this.lfoType === 'saw') {
            lfo = (time * this.lfoFreq) % 1;
        } else if (this.lfoType === 'square') {
            lfo = Math.sin(time * Math.PI * 2 * this.lfoFreq) > 0 ? 1 : 0;
        }

        return { sub, bass, mid, high, rms, peak: isPeak, lfo };
    }
}

// Global Singleton para re-utilizar o hardware hook sem refazer requests de microfone
export const globalAudioEngine = new AudioEngine();
