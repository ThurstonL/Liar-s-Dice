export class SoundManager {
    private context: AudioContext | null = null;
    private enabled: boolean = true;

    private getContext(): AudioContext {
        if (!this.context) {
            this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (this.context.state === 'suspended') {
            this.context.resume();
        }
        return this.context;
    }

    playRoll() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const count = 5;

            // Create a rattling sound
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();

                    osc.type = 'square';
                    osc.frequency.setValueAtTime(100 + Math.random() * 50, ctx.currentTime);

                    gain.gain.setValueAtTime(0.1, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start();
                    osc.stop(ctx.currentTime + 0.05);
                }, i * 40);
            }
        } catch (e) {
            console.error('Audio play failed', e);
        }
    }

    playWin() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();

            const playNote = (freq: number, time: number) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, time);

                gain.gain.setValueAtTime(0.2, time);
                gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(time);
                osc.stop(time + 0.3);
            };

            const now = ctx.currentTime;
            playNote(523.25, now);       // C5
            playNote(659.25, now + 0.1); // E5
            playNote(783.99, now + 0.2); // G5
            playNote(1046.50, now + 0.3); // C6
        } catch (e) {
            console.error('Audio play failed', e);
        }
    }

    playLose() {
        if (!this.enabled) return;
        try {
            const ctx = this.getContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.3);

            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        } catch (e) {
            console.error('Audio play failed', e);
        }
    }
}

export const soundManager = new SoundManager();
