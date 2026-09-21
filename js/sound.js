// MIDIノート定数 (全オクターブ完全網羅)
const _ = 0; // 休符
const C1 = 24, Cs1 = 25, D1 = 26, Eb1 = 27, E1 = 28, F1 = 29, Fs1 = 30, G1 = 31, Gs1 = 32, A1 = 33, Bb1 = 34, B1 = 35;
const C2 = 36, Cs2 = 37, D2 = 38, Eb2 = 39, E2 = 40, F2 = 41, Fs2 = 42, G2 = 43, Gs2 = 44, A2 = 45, Bb2 = 46, B2 = 47;
const C3 = 48, Cs3 = 49, D3 = 50, Eb3 = 51, E3 = 52, F3 = 53, Fs3 = 54, G3 = 55, Gs3 = 56, A3 = 57, Bb3 = 58, B3 = 59;
const C4 = 60, Cs4 = 61, D4 = 62, Eb4 = 63, E4 = 64, F4 = 65, Fs4 = 66, G4 = 67, Gs4 = 68, A4 = 69, Bb4 = 70, B4 = 71;
const C5 = 72, Cs5 = 73, D5 = 74, Eb5 = 75, E5 = 76, F5 = 77, Fs5 = 78, G5 = 79, Gs5 = 80, A5 = 81, Bb5 = 82, B5 = 83;
const C6 = 84, Cs6 = 85, D6 = 86, Eb6 = 87, E6 = 88, F6 = 89, Fs6 = 90, G6 = 91, Gs6 = 92, A6 = 93, Bb6 = 94, B6 = 95, C7 = 96;
const Ds1 = Eb1, Ds2 = Eb2, Ds3 = Eb3, Ds4 = Eb4, Ds5 = Eb5, Ds6 = Eb6;
const Ab1 = Gs1, Ab2 = Gs2, Ab3 = Gs3, Ab4 = Gs4, Ab5 = Gs5, Ab6 = Gs6;

class SoundManager {
    constructor() {
        this.ctx = null;
        this.initialized = false;
        this.currentBgm = null;
        this.bgmTimer = null;
        this.bgmStep = 0;
        this.isMuted = false;

        // 音量マスターゲイン
        this.masterGain = null;
        this.bgmGain = null;
        this.seGain = null;

        // iOS Safari等のユーザーインタラクション解除
        const unlock = () => {
            this.init();
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            window.removeEventListener('touchstart', unlock);
            window.removeEventListener('touchend', unlock);
            window.removeEventListener('click', unlock);
            window.removeEventListener('keydown', unlock);
        };
        window.addEventListener('touchstart', unlock, { passive: true });
        window.addEventListener('touchend', unlock, { passive: true });
        window.addEventListener('click', unlock, { passive: true });
        window.addEventListener('keydown', unlock, { passive: true });
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.setValueAtTime(0.22, this.ctx.currentTime);
            this.bgmGain.connect(this.masterGain);

            this.seGain = this.ctx.createGain();
            this.seGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
            this.seGain.connect(this.masterGain);

            // パルス波（デューティ比12.5% & 25%）の生成（コナミカスタム波形メモリ・PSGの倍音再現）
            try {
                this.pulseWave125 = this.createPulseWave(0.125, 48);
                this.pulseWave25 = this.createPulseWave(0.25, 48);
            } catch (e) {
                console.warn('Custom PeriodicWave not supported, falling back to square wave:', e);
            }

            // 空間系ディレイエフェクト（宇宙空間の広がり・矩形波倶楽部の艶やかなエコーを再現）
            this.delayNode = this.ctx.createDelay();
            this.delayNode.delayTime.setValueAtTime(0.195, this.ctx.currentTime); // 154BPM 付点8分ディレイ

            this.delayFeedback = this.ctx.createGain();
            this.delayFeedback.gain.setValueAtTime(0.26, this.ctx.currentTime);

            this.delayFilter = this.ctx.createBiquadFilter();
            this.delayFilter.type = 'lowpass';
            this.delayFilter.frequency.setValueAtTime(3600, this.ctx.currentTime); // 温かみのあるハイダンプ

            this.delaySend = this.ctx.createGain();
            this.delaySend.gain.setValueAtTime(0.30, this.ctx.currentTime);

            this.delaySend.connect(this.delayNode);
            this.delayNode.connect(this.delayFilter);
            this.delayFilter.connect(this.delayFeedback);
            this.delayFeedback.connect(this.delayNode);
            this.delayFilter.connect(this.bgmGain);

            // ノイズバッファのキャッシュ（ドラムスネア・ハイハット・爆発用）
            const noiseLen = Math.floor(this.ctx.sampleRate * 0.8);
            this.noiseBuffer = this.ctx.createBuffer(1, noiseLen, this.ctx.sampleRate);
            const ndata = this.noiseBuffer.getChannelData(0);
            for (let i = 0; i < noiseLen; i++) {
                ndata[i] = Math.random() * 2 - 1;
            }

            // ディストーション・エレキギター用オーバードライブカーブ
            this.distortionCurve = this.createDistortionCurve(55);

            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    createDistortionCurve(amount = 50) {
        const k = amount;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    createPulseWave(duty = 0.125, harmonics = 48) {
        const real = new Float32Array(harmonics);
        const imag = new Float32Array(harmonics);
        for (let n = 1; n < harmonics; n++) {
            imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
        }
        return this.ctx.createPeriodicWave(real, imag, { disableNormalization: false });
    }

    // --- 効果音 (SE) ---

    // 通常ショット: ピピッ！(高音矩形波の急ピッチダウン)
    playShot() {
        if (!this.initialized || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(this.seGain);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    // レーザー: グラディウス象徴の「みーーーーん！」
    // (12.5%パルス波 + アタック急降下 + 高音ピッチキープ + 鼻音フォルマントレゾナンス)
    playLaser() {
        if (!this.initialized || this.isMuted) return;
        const now = this.ctx.currentTime;
        const duration = 0.20;

        const osc = this.ctx.createOscillator();
        if (this.pulseWave125) {
            osc.setPeriodicWave(this.pulseWave125);
        } else {
            osc.type = 'square';
        }

        // アタック: 0〜0.018s で 2600Hz から 1280Hz に急降下（「ッミ」というアタック立ち上がり）
        // サステイン: その後はピッチを落とさず 1280Hz でピンと張った高周波を完全キープ！
        osc.frequency.setValueAtTime(2600, now);
        osc.frequency.exponentialRampToValueAtTime(1280, now + 0.018);
        osc.frequency.setValueAtTime(1280, now + duration);

        // フォルマントフィルター（「イ」「ミ」の母音・鼻音共鳴を 2800Hz / Q=4.0 でブースト）
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.setValueAtTime(2800, now);
        filter.Q.setValueAtTime(4.0, now);
        filter.gain.setValueAtTime(8, now);

        // ゲインエンベロープ（途中で衰えず、0.16sまで音圧を保ってスパッと切れる）
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.32, now);
        gain.gain.setValueAtTime(0.30, now + duration - 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.seGain);

        osc.start(now);
        osc.stop(now + duration);
    }

    // ミサイル: ヒュオオ… (下降音)
    playMissile() {
        if (!this.initialized || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(this.seGain);

        osc.start(now);
        osc.stop(now + 0.15);
    }

    // カプセル取得音: ティロリン♪ (上昇アルペジオ)
    playCapsule() {
        if (!this.initialized || this.isMuted) return;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        const now = this.ctx.currentTime;

        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + i * 0.05);

            gain.gain.setValueAtTime(0.15, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.08);

            osc.connect(gain);
            gain.connect(this.seGain);

            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.08);
        });
    }

    // パワーアップ決定音: ピロロロッ！(スピード感のある高音アルペジオ)
    playPowerUp() {
        if (!this.initialized || this.isMuted) return;
        const notes = [440, 554.37, 659.25, 880, 1108.73];
        const now = this.ctx.currentTime;

        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, now + i * 0.035);

            gain.gain.setValueAtTime(0.2, now + i * 0.035);
            gain.gain.linearRampToValueAtTime(0.01, now + i * 0.035 + 0.07);

            osc.connect(gain);
            gain.connect(this.seGain);

            osc.start(now + i * 0.035);
            osc.stop(now + i * 0.035 + 0.07);
        });
    }

    // 敵爆発音: ドカーン！ (ホワイトノイズ + 低域ピッチダウン)
    playExplosion() {
        if (!this.initialized || this.isMuted || !this.noiseBuffer) return;
        const now = this.ctx.currentTime;
        const duration = 0.25;

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        // 低域通過フィルタ
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.seGain);

        noise.start(now);
    }

    // 敵・遮蔽板破壊音（playExplosionのエイリアス＆金属破砕音）
    playEnemyExplode() {
        this.playExplosion();
    }

    playShieldBreak() {
        this.playExplosion();
    }

    // ボス被弾音: チチッ！(金属音)
    playBossHit() {
        if (!this.initialized || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.04);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.04);

        osc.connect(gain);
        gain.connect(this.seGain);

        osc.start(now);
        osc.stop(now + 0.04);
    }

    // ボス大爆発音: ドガガガバーン！
    playBossExplode() {
        if (!this.initialized || this.isMuted) return;
        for (let i = 0; i < 6; i++) {
            setTimeout(() => this.playExplosion(), i * 80);
        }
    }

    // --- BGM エンジン (本格 KONAMI 矩形波倶楽部スタイル) ---

    m2f(midi) {
        return midi > 0 ? 440 * Math.pow(2, (midi - 69) / 12) : 0;
    }

    stopBgm() {
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
        this.currentBgm = null;
        this.bgmStep = 0;
    }

    // 高精度 Lookahead オーディオスケジューラー (タイミングのズレがゼロ)
    startScheduler(bpm, totalSteps, scheduleCallback) {
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
        this.init();

        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const stepDuration = (60 / bpm) / 4; // 16分音符の長さ(秒)
        let currentStep = 0;
        let nextStepTime = this.ctx.currentTime + 0.05;

        this.bgmTimer = setInterval(() => {
            if (!this.initialized || this.isMuted) return;

            // アンダーラン（音飛び・途切れ）防止リカバリー:
            // 描画やパーティクル処理でタイマーが遅延した場合、nextStepTimeが過去になっていたら安全に現在時刻直後に補正
            if (nextStepTime < this.ctx.currentTime) {
                nextStepTime = this.ctx.currentTime + 0.015;
            }

            // 先読みウィンドウを 120ms から 260ms に拡大（ゲームループの負荷に左右されず途切れない高安定再生）
            while (nextStepTime < this.ctx.currentTime + 0.26) {
                try {
                    scheduleCallback(currentStep, nextStepTime, stepDuration);
                } catch (e) {
                    console.error('BGM schedule error at step ' + currentStep, e);
                }
                currentStep = (currentStep + 1) % totalSteps;
                nextStepTime += stepDuration;
            }
        }, 25);
    }

    // --- シンセサイズ発音系 ---

    // リードシンセ (25%パルス波 + ビブラート + ディレイ)
    triggerLead(midi, time, dur, gainVal = 0.26) {
        const freq = this.m2f(midi);
        if (freq <= 0) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        if (this.pulseWave25) osc.setPeriodicWave(this.pulseWave25);
        else osc.type = 'square';

        osc.frequency.setValueAtTime(freq, time);

        // ロングトーンには伸びやかなビブラートを付与
        if (dur > 0.22) {
            const vib = this.ctx.createOscillator();
            const vibGain = this.ctx.createGain();
            vib.frequency.setValueAtTime(5.8, time);
            vibGain.gain.setValueAtTime(0, time);
            vibGain.gain.setValueAtTime(0, time + 0.12);
            vibGain.gain.linearRampToValueAtTime(freq * 0.018, time + 0.26);
            vib.connect(vibGain);
            vibGain.connect(osc.frequency);
            vib.start(time);
            vib.stop(time + dur);
        }

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(gainVal, time + 0.008);
        gain.gain.setValueAtTime(gainVal * 0.9, time + dur - 0.02);
        gain.gain.linearRampToValueAtTime(0.001, time + dur);

        osc.connect(gain);
        gain.connect(this.bgmGain);
        if (this.delaySend) gain.connect(this.delaySend);

        osc.start(time);
        osc.stop(time + dur);
    }

    // ハーモニー / 対旋律 (12.5%パルス波)
    triggerHarmony(midi, time, dur, gainVal = 0.16) {
        const freq = this.m2f(midi);
        if (freq <= 0) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        if (this.pulseWave125) osc.setPeriodicWave(this.pulseWave125);
        else osc.type = 'square';

        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(gainVal, time + 0.008);
        gain.gain.setValueAtTime(gainVal * 0.85, time + dur - 0.02);
        gain.gain.linearRampToValueAtTime(0.001, time + dur);

        osc.connect(gain);
        gain.connect(this.bgmGain);
        if (this.delaySend) gain.connect(this.delaySend);

        osc.start(time);
        osc.stop(time + dur);
    }

    // アルペジオ (16分音符クリスタルパルス)
    triggerArp(midi, time, dur, gainVal = 0.12) {
        const freq = this.m2f(midi);
        if (freq <= 0) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        if (this.pulseWave125) osc.setPeriodicWave(this.pulseWave125);
        else osc.type = 'square';

        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(gainVal, time);
        gain.gain.exponentialRampToValueAtTime(0.002, time + dur);

        osc.connect(gain);
        gain.connect(this.bgmGain);
        if (this.delaySend) gain.connect(this.delaySend);

        osc.start(time);
        osc.stop(time + dur);
    }

    // オーケストラ金管ブラス (デチューンSawtooth × 2 + フィルターエンベロープ)
    triggerBrass(midi, time, dur, gainVal = 0.18) {
        const freq = this.m2f(midi);
        if (freq <= 0) return;

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(freq, time);
        osc2.frequency.setValueAtTime(freq * 1.004, time); // 微小デチューンで壮大な厚み

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, time);
        filter.frequency.linearRampToValueAtTime(3400, time + 0.04);
        filter.frequency.exponentialRampToValueAtTime(1600, time + dur);
        filter.Q.setValueAtTime(2.5, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(gainVal, time + 0.02);
        gain.gain.setValueAtTime(gainVal * 0.85, time + dur - 0.03);
        gain.gain.linearRampToValueAtTime(0.001, time + dur);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);
        if (this.delaySend) gain.connect(this.delaySend);

        osc1.start(time);
        osc1.stop(time + dur);
        osc2.start(time);
        osc2.stop(time + dur);
    }

    // オーケストラ弦楽器ストリングス (Sawtooth + Triangle + ソフトアタック)
    triggerStrings(midi, time, dur, gainVal = 0.14) {
        const freq = this.m2f(midi);
        if (freq <= 0) return;

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(freq, time);
        osc2.frequency.setValueAtTime(freq * 1.003, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2800, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(gainVal, time + 0.05); // 滑らかな立ち上がり
        gain.gain.setValueAtTime(gainVal * 0.9, time + dur - 0.04);
        gain.gain.linearRampToValueAtTime(0.001, time + dur);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);
        if (this.delaySend) gain.connect(this.delaySend);

        osc1.start(time);
        osc1.stop(time + dur);
        osc2.start(time);
        osc2.stop(time + dur);
    }

    // ディストーション・エレキギター (Sawtooth + Overdrive + キャビネットEQ + チョーキング/ビブラート)
    triggerGuitar(midi, time, dur, gainVal = 0.22, bendSemitones = 0) {
        const freq = this.m2f(midi);
        if (freq <= 0) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';

        // チョーキング (ピッチベンド)
        if (bendSemitones !== 0) {
            const targetFreq = freq * Math.pow(2, bendSemitones / 12);
            osc.frequency.setValueAtTime(freq, time);
            osc.frequency.linearRampToValueAtTime(targetFreq, time + dur * 0.45);
            osc.frequency.setValueAtTime(targetFreq, time + dur);
        } else {
            osc.frequency.setValueAtTime(freq, time);
        }

        // ロングトーンには激しく熱いギタービブラート (6.5Hz)
        if (dur > 0.20) {
            const vib = this.ctx.createOscillator();
            const vibGain = this.ctx.createGain();
            vib.frequency.setValueAtTime(6.5, time);
            vibGain.gain.setValueAtTime(0, time);
            vibGain.gain.setValueAtTime(0, time + 0.10);
            vibGain.gain.linearRampToValueAtTime(freq * 0.024, time + 0.25);
            vib.connect(vibGain);
            vibGain.connect(osc.frequency);
            vib.start(time);
            vib.stop(time + dur);
        }

        // ギターアンプ・キャビネットシミュレーター (2600Hz レゾナンス)
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'peaking';
        filter.frequency.setValueAtTime(2600, time);
        filter.Q.setValueAtTime(1.8, time);
        filter.gain.setValueAtTime(7, time);

        // オーバードライブ歪み
        if (this.distortionCurve) {
            const dist = this.ctx.createWaveShaper();
            dist.curve = this.distortionCurve;
            dist.oversample = 'none'; // 高速軽量化（CPU負荷激減で音飛び防止）
            osc.connect(dist);
            dist.connect(filter);
        } else {
            osc.connect(filter);
        }

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(gainVal, time + 0.012);
        gain.gain.setValueAtTime(gainVal * 0.88, time + dur - 0.02);
        gain.gain.linearRampToValueAtTime(0.001, time + dur);

        filter.connect(gain);
        gain.connect(this.bgmGain);
        if (this.delaySend) gain.connect(this.delaySend);

        osc.start(time);
        osc.stop(time + dur);
    }

    // ディストーション・パワーコード (ルート + 完全5度)
    triggerPowerChord(rootMidi, time, dur, gainVal = 0.24) {
        this.triggerGuitar(rootMidi, time, dur, gainVal * 0.8);
        this.triggerGuitar(rootMidi + 7, time, dur, gainVal * 0.65);
    }

    // ドライブベース (三角波 + パルス波オクターブ上)
    triggerBass(midi, time, dur, gainVal = 0.30) {
        const freq = this.m2f(midi);
        if (freq <= 0) return;

        const oscTri = this.ctx.createOscillator();
        const oscPulse = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        oscTri.type = 'triangle';
        oscTri.frequency.setValueAtTime(freq, time);

        if (this.pulseWave25) oscPulse.setPeriodicWave(this.pulseWave25);
        else oscPulse.type = 'square';
        oscPulse.frequency.setValueAtTime(freq * 2, time);

        const pulseGain = this.ctx.createGain();
        pulseGain.gain.setValueAtTime(0.08, time);

        oscPulse.connect(pulseGain);
        pulseGain.connect(gain);
        oscTri.connect(gain);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(gainVal, time + 0.005);
        gain.gain.setValueAtTime(gainVal * 0.85, time + dur - 0.015);
        gain.gain.linearRampToValueAtTime(0.01, time + dur);

        gain.connect(this.bgmGain);

        oscTri.start(time);
        oscTri.stop(time + dur);
        oscPulse.start(time);
        oscPulse.stop(time + dur);
    }

    // ドラム: パンチのあるサイン波キック
    triggerKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(145, time);
        osc.frequency.exponentialRampToValueAtTime(36, time + 0.08);

        gain.gain.setValueAtTime(0.38, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(time);
        osc.stop(time + 0.09);
    }

    // ドラム: 切れ味鋭いノイズ+トーンスネア
    triggerSnare(time) {
        if (!this.noiseBuffer) return;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2400, time);
        filter.Q.setValueAtTime(1.6, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.24, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

        // トーン成分
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(190, time);
        osc.frequency.exponentialRampToValueAtTime(65, time + 0.05);
        oscGain.gain.setValueAtTime(0.18, time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

        osc.connect(oscGain);
        oscGain.connect(this.bgmGain);
        osc.start(time);
        osc.stop(time + 0.05);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);

        noise.start(time);
        noise.stop(time + 0.12);
    }

    // ドラム: ハイハット (クローズ / オープン)
    triggerHiHat(time, isOpen = false) {
        if (!this.noiseBuffer) return;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7500, time);

        const gain = this.ctx.createGain();
        const dur = isOpen ? 0.11 : 0.035;
        gain.gain.setValueAtTime(isOpen ? 0.15 : 0.09, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);

        noise.start(time);
        noise.stop(time + dur);
    }

    // triggerHiHatのエイリアス
    triggerHat(time, isOpen = false) {
        this.triggerHiHat(time, isOpen);
    }

    // オーケストラ打楽器: ティンパニ (重低音・音程感のある轟音)
    triggerTimpani(midi, time, dur = 0.42) {
        const freq = this.m2f(midi || 38);
        if (freq <= 0) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * 1.9, time);
        osc.frequency.exponentialRampToValueAtTime(freq, time + 0.05);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.44, time + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        // マレット打撃の短いインパクト
        if (this.noiseBuffer) {
            const hit = this.ctx.createBufferSource();
            hit.buffer = this.noiseBuffer;
            const hitFilter = this.ctx.createBiquadFilter();
            hitFilter.type = 'lowpass';
            hitFilter.frequency.setValueAtTime(550, time);
            const hitGain = this.ctx.createGain();
            hitGain.gain.setValueAtTime(0.28, time);
            hitGain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
            hit.connect(hitFilter);
            hitFilter.connect(hitGain);
            hitGain.connect(this.bgmGain);
            hit.start(time);
            hit.stop(time + 0.04);
        }

        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(time);
        osc.stop(time + dur);
    }

    // オーケストラ打楽器: クラッシュ大シンバル (バシャァァァン！！)
    triggerCymbal(time) {
        if (!this.noiseBuffer) return;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(8000, time);
        filter.Q.setValueAtTime(0.9, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.95);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);
        if (this.delaySend) gain.connect(this.delaySend);

        noise.start(time);
        noise.stop(time + 0.95);
    }

    // 打楽器: ロートタム (トコトコピッチベンド)
    triggerTom(midi, time, dur = 0.16) {
        const freq = this.m2f(midi);
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * 1.5, time);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.7, time + dur);

        gain.gain.setValueAtTime(0.32, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(time);
        osc.stop(time + dur);
    }

    // 空中戦BGM: 『BEGINNING OF THE HISTORY』(グラディウス伝統・宇宙出撃空中戦テーマ フルオーケストラ荘厳大音量版！)
    playAirBgm() {
        if (this.currentBgm === 'AIR') return;
        this.currentBgm = 'AIR';

        // テンポ 130 BPM (宇宙への出撃感あふれるシャープで勇壮な戦闘テンポ)
        const bpm = 130;
        const totalSteps = 256; // 16小節ループ (1小節=16ステップ)

        // === 1. 打楽器セクション (キック1, スネア2, ハイハット3/4, 大シンバル5, タム6/7/8) ===
        const dIntro0  = [5,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]; // 出撃合図の大シンバル＋重低音キック！
        const dIntro1  = [1,3,3,3, 2,3,3,3, 1,3,1,3, 2,3,3,4]; // 疾走開始
        const dIntro2  = [1,3,3,3, 2,3,3,3, 1,3,1,3, 2,3,3,4]; // 推進力アップ
        const dIntro3  = [5,3,3,3, 2,3,3,3, 6,6,7,7, 8,8,2,5]; // シンバル＋迫真のタムロール！
        const dBeatCym = [5,3,3,3, 2,3,3,3, 1,3,1,3, 2,3,3,4]; // 小節頭シンバル付き疾走ビート
        const dBeat    = [1,3,3,3, 2,3,3,3, 1,3,1,3, 2,3,3,4]; // スタンダード疾走ビート
        const dFill    = [1,3,3,3, 2,3,3,3, 6,6,7,7, 8,8,2,5]; // タムロールフィルイン

        const drums = [
            dIntro0,  dIntro1, dIntro2, dIntro3,   // 0-3: 緊迫の宇宙出撃イントロ
            dBeatCym, dBeat,   dBeat,   dFill,     // 4-7: メロディA (宇宙を駆ける勇姿)
            dBeatCym, dBeat,   dBeat,   dFill,     // 8-11: メロディB (高音展開)
            dBeatCym, dBeat,   dBeatCym,dIntro3    // 12-15: クライマックス & ループ
        ].flat();

        // === 2. オーケストラ打楽器: ティンパニ (重低音・地鳴りのような轟音) ===
        const tInt0 = [E2,_,_,_, _,_,_,_, E2,_,_,_, _,_,_,_];
        const tInt1 = [E2,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_];
        const tInt2 = [E2,_,_,_, _,_,_,_, E2,_,_,_, _,_,_,_];
        const tInt3 = [B1,_,B1,_, B1,_,B1,_, B1,B1,B1,B1, B1,_,_,_];
        const tEm   = [E2,_,_,_, _,_,_,_, E2,_,_,_, _,_,_,_];
        const tD    = [D2,_,_,_, _,_,_,_, D2,_,_,_, _,_,_,_];
        const tC    = [C2,_,_,_, _,_,_,_, C2,_,_,_, _,_,_,_];
        const tB    = [B1,_,_,_, _,_,_,_, B1,_,_,_, _,_,_,_];
        const tAm   = [A1,_,_,_, _,_,_,_, A1,_,_,_, _,_,_,_];
        const tG    = [G1,_,_,_, _,_,_,_, G1,_,_,_, _,_,_,_];

        const timpani = [
            tInt0, tInt1, tInt2, tInt3,
            tEm,   tD,    tC,    tB,
            tEm,   tD,    tC,    tB,
            tAm,   tD,    tG,    tInt3
        ].flat();

        // === 3. 重厚な8分オクターブ連打＆パルスベース (推進力抜群) ===
        const bEm = [E2,E3,E2,E3, E2,E3,E2,E3, E2,E3,E2,E3, E2,E3,E2,E3];
        const bD  = [D2,D3,D2,D3, D2,D3,D2,D3, D2,D3,D2,D3, D2,D3,D2,D3];
        const bC  = [C2,C3,C2,C3, C2,C3,C2,C3, C2,C3,C2,C3, C2,C3,C2,C3];
        const bB  = [B1,B2,B1,B2, B1,B2,B1,B2, B1,B2,B1,B2, B1,B2,B1,B2];
        const bAm = [A1,A2,A1,A2, A1,A2,A1,A2, A1,A2,A1,A2, A1,A2,A1,A2];
        const bG  = [G1,G2,G1,G2, G1,G2,G1,G2, G1,G2,G1,G2, G1,G2,G1,G2];

        const bInt0 = [E2,_,_,_, _,_,_,_, E2,_,_,_, _,_,_,_];
        const bInt1 = [E2,_,E2,_, E2,_,E2,_, E2,_,E2,_, E2,E2,E2,E2];
        const bInt2 = [E2,E3,E2,E3, E2,E3,E2,E3, E2,E3,E2,E3, E2,E3,E2,E3];
        const bInt3 = [B1,B2,B1,B2, B1,B2,B1,B2, B1,B1,B1,B1, Ds2,Ds2,Fs2,A2];

        const bass = [
            bInt0, bInt1, bInt2, bInt3,
            bEm,   bD,    bC,    bB,
            bEm,   bD,    bC,    bB,
            bAm,   bD,    bG,    bInt3
        ].flat();

        // === 4. 弦楽器ストリングス (荘厳なオーケストラ3声コードパッド) ===
        // 1小節に2回（ステップ0と8）トリガーし、豊かに持続するレガート和音
        const sBar = (n1, n2 = n1) => [n1,_,_,_, _,_,_,_, n2,_,_,_, _,_,_,_];

        const strings1 = [
            // 0-3: イントロ (深遠な大宇宙の広がり)
            sBar(B3), sBar(B3), sBar(B4), sBar(Fs4),
            // 4-7: メロディA (Em -> D -> C -> B7)
            sBar(B4), sBar(A4), sBar(G4), sBar(Fs4),
            // 8-11: メロディB (高音域へ突き抜けるストリングス)
            sBar(E5), sBar(D5), sBar(C5), sBar(B4),
            // 12-15: クライマックス (Am7 -> D7 -> G -> B7)
            sBar(C5), sBar(C5), sBar(B4), sBar(A4)
        ].flat();

        const strings2 = [
            sBar(G3), sBar(G3), sBar(G4), sBar(Ds4),
            sBar(G4), sBar(Fs4),sBar(E4), sBar(Ds4),
            sBar(B4), sBar(A4), sBar(G4), sBar(Fs4),
            sBar(A4), sBar(Fs4),sBar(G4), sBar(Ds4)
        ].flat();

        const strings3 = [
            sBar(E3), sBar(E3), sBar(E4), sBar(B3),
            sBar(E4), sBar(D4), sBar(C4), sBar(B3),
            sBar(G4), sBar(Fs4),sBar(E4), sBar(Ds4),
            sBar(E4), sBar(D4), sBar(D4), sBar(B3)
        ].flat();

        // === 5. 金管ブラス和音アクセント (ホルン＆トロンボーンの重厚な咆哮) ===
        const brHit = (n) => [n,_,_,_, _,_,n,_, _,_,n,_, _,_,_,_];
        const brFan1 = [B3,_,Ds4,_, Fs4,_,B4,_, B4,_,Ds5,_, Fs5,_,_,_];
        const brFan2 = [Fs3,_,B3,_, Ds4,_,Fs4,_, Fs4,_,B4,_, Ds5,_,_,_];

        const brass1 = [
            // 0-3: イントロ (3小節目に出撃ファンファーレ！)
            brHit(G3), brHit(G3), brHit(G4), brFan1,
            // 4-7: メロディA
            brHit(G4), brHit(Fs4), brHit(E4), brHit(Ds4),
            // 8-11: メロディB
            brHit(B4), brHit(A4),  brHit(G4), brHit(Fs4),
            // 12-15: クライマックス
            brHit(C5), brHit(D5),  brHit(B4), brFan1
        ].flat();

        const brass2 = [
            brHit(E3), brHit(E3), brHit(E4), brFan2,
            brHit(E4), brHit(D4),  brHit(C4), brHit(B3),
            brHit(G4), brHit(Fs4), brHit(E4), brHit(Ds4),
            brHit(A4), brHit(Fs4), brHit(G4), brFan2
        ].flat();

        // === 6. グラディウス伝統：きらめく16分音符リディアン・アルペジオ！ ===
        const aEm = [E5,B4,E5,Fs5, B5,Fs5,E5,B4, E5,B4,E5,Fs5, E5,B4,E5,Fs5];
        const aD  = [D5,A4,D5,E5,  A5,E5,D5,A4,  D5,A4,D5,E5,  D5,A4,D5,E5];
        const aC  = [C5,G4,C5,D5,  G5,D5,C5,G4,  C5,G4,C5,D5,  C5,G4,C5,D5];
        const aB  = [B4,Fs4,B4,Cs5, Fs5,Cs5,B4,Fs4, B4,Fs4,B4,Ds5, Fs5,Ds5,B4,Ds5];
        const aAm = [A4,E4,A4,B4,  E5,B4,A4,E4,  A4,E4,A4,B4,  C5,B4,A4,E4];
        const aG  = [G4,D4,G4,A4,  D5,A4,G4,D4,  G4,D4,G4,A4,  B4,A4,G4,D4];

        const arp = [
            ...aEm, ...aEm, ...aEm, ...aB,
            ...aEm, ...aD,  ...aC,  ...aB,
            ...aEm, ...aD,  ...aC,  ...aB,
            ...aAm, ...aD,  ...aG,  ...aB
        ];

        // === 7. 勇壮な宇宙主旋律 (PSGリード + 金管ブラスによるデュアル強力リード！) ===
        const lead = [
            // 0-3: イントロ (オーケストラとアルペジオが先行、3小節末に導入フレーズ)
            _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
            _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
            _,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,
            _,_,_,_, _,_,_,_, _,_,_,_, Fs5,_,G5,_,

            // 4-7: メロディA (宇宙を駆ける勇壮な旋律)
            A5,_,_,_, _,_,G5,_, Fs5,_,_,_, E5,_,_,_,
            Fs5,_,_,_, _,_,E5,_, D5,_,_,_, E5,_,_,_,
            G5,_,_,_, Fs5,_,_,_, E5,_,_,_, D5,_,_,_,
            B4,_,Cs5,_, Ds5,_,E5,_, Fs5,_,G5,_, A5,_,B5,_,

            // 8-11: メロディB (高音オクターブで突き抜ける展開)
            B5,_,_,_, _,_,A5,_, G5,_,_,_, Fs5,_,_,_,
            E5,_,_,_, _,_,Fs5,_, G5,_,_,_, A5,_,_,_,
            B5,_,_,_, C6,_,_,_, B5,_,A5,_, G5,_,Fs5,_,
            E5,_,_,_, _,_,_,_, _,_,_,_, Fs5,_,G5,_,

            // 12-15: メロディC (緊迫のクライマックス・高速フレーズ)
            A5,_,_,A5, G5,_,Fs5,_, E5,_,_,E5, Fs5,_,G5,_,
            Fs5,_,_,Fs5, E5,_,D5,_, E5,_,_,E5, Fs5,_,A5,_,
            G5,_,_,G5, Fs5,_,E5,_, D5,_,_,D5, E5,_,G5,_,
            Fs5,_,G5,_, A5,_,B5,_, C6,_,B5,_, A5,_,Fs5,_
        ];

        // === 8. 金管対旋律・ハーモニー ===
        const harmony = [
            // 0-7: イントロ & メロディAはリードを引き立てる
            ...new Array(128).fill(0),
            // 8-11: メロディB (3度下ハーモニー)
            G5,_,_,_, _,_,Fs5,_, E5,_,_,_, D5,_,_,_,
            C5,_,_,_, _,_,D5,_,  E5,_,_,_, Fs5,_,_,_,
            G5,_,_,_, A5,_,_,_,  G5,_,Fs5,_, E5,_,D5,_,
            C5,_,_,_, _,_,_,_,   _,_,_,_,  Ds5,_,E5,_,
            // 12-15: メロディC (重厚な対旋律)
            Fs5,_,_,Fs5, E5,_,D5,_,  C5,_,_,C5, D5,_,E5,_,
            D5,_,_,D5,   C5,_,B4,_,  C5,_,_,C5, D5,_,Fs5,_,
            E5,_,_,E5,   D5,_,C5,_,  B4,_,_,B4, C5,_,E5,_,
            Ds5,_,E5,_,  Fs5,_,G5,_, A5,_,G5,_, Fs5,_,Ds5,_
        ];

        this.startScheduler(bpm, totalSteps, (step, time, stepDur) => {
            // 1. ドラム & パーカッション (キック, スネア, ハット, 大シンバル, タム)
            const d = drums[step];
            if (d === 1) this.triggerKick(time);
            else if (d === 2) this.triggerSnare(time);
            else if (d === 3) this.triggerHiHat(time, false);
            else if (d === 4) this.triggerHiHat(time, true);
            else if (d === 5) this.triggerCymbal(time);
            else if (d === 6) this.triggerTom(A3, time, stepDur * 0.95);
            else if (d === 7) this.triggerTom(F3, time, stepDur * 0.95);
            else if (d === 8) this.triggerTom(D3, time, stepDur * 0.95);

            // 2. オーケストラ打楽器: ティンパニ (重低音轟音)
            const tp = timpani[step];
            if (tp > 0) {
                this.triggerTimpani(tp, time, stepDur * 2.4);
            }

            // 3. 重低音ドライブベース (タイトな推進力)
            const b = bass[step];
            if (b > 0) {
                this.triggerBass(b, time, stepDur * 1.5, 0.32);
            }

            // 4. 弦楽器ストリングス (荘厳なオーケストラ3声コードパッド)
            const s1 = strings1[step];
            const s2 = strings2[step];
            const s3 = strings3[step];
            if (s1 > 0) this.triggerStrings(s1, time, stepDur * 7.8, 0.16);
            if (s2 > 0) this.triggerStrings(s2, time, stepDur * 7.8, 0.14);
            if (s3 > 0) this.triggerStrings(s3, time, stepDur * 7.8, 0.12);

            // 5. 金管ブラスセクション (アクセント和音 & 出撃ファンファーレ)
            const br1 = brass1[step];
            const br2 = brass2[step];
            if (br1 > 0) this.triggerBrass(br1, time, stepDur * 1.6, 0.18);
            if (br2 > 0) this.triggerBrass(br2, time, stepDur * 1.6, 0.15);

            // 6. きらめく16分アルペジオ
            const a = arp[step];
            if (a > 0) {
                this.triggerArp(a, time, stepDur * 0.85, 0.12);
            }

            // 7. 勇壮な主旋律 (PSGリード + 金管ブラスによるデュアル強力リード！)
            const l = lead[step];
            if (l > 0) {
                let lLen = 1;
                for (let k = 1; k < 16; k++) {
                    if (lead[(step + k) % totalSteps] === 0) lLen++;
                    else break;
                }
                const dur = stepDur * lLen * 0.95;
                this.triggerLead(l, time, dur, 0.28);
                this.triggerBrass(l, time, dur, 0.20);
            }

            // 8. 金管対旋律・ハーモニー
            const h = harmony[step];
            if (h > 0) {
                let hLen = 1;
                for (let k = 1; k < 16; k++) {
                    if (harmony[(step + k) % totalSteps] === 0) hLen++;
                    else break;
                }
                this.triggerHarmony(h, time, stepDur * hLen * 0.95, 0.18);
            }
        });
    }

    // ステージBGM: 『SPACE BATTLE CRUISER (EXTENDED ROCK ORCHESTRA)』
    // 宇宙戦艦ヤマト戦闘シーンの熱き魂を受け継ぎ、テンポアップ(156BPM)＋熱狂のギターソロ＋炸裂のドラムソロを搭載した超大作！
    playStageBgm() {
        if (this.currentBgm === 'STAGE') return;
        this.currentBgm = 'STAGE';

        // テンポ 156 BPM (高揚感そのままに疾走感を倍増！)
        const bpm = 156;
        const totalSteps = 768; // 全48小節 (1小節=16ステップ) の壮大なプログレッシブ・シンフォニック・ロック！

        // === 1. 打楽器セクション (キック1, スネア2, ハイハット3/4, 大シンバル5, タム6/7/8) ===
        const dRoll   = [5,1,1,1, 2,2,2,2, 6,6,7,7, 8,8,2,5];
        const dHeavy  = [5,0,0,0, 2,0,0,0, 1,0,0,0, 6,7,8,5];
        const dBeat   = [5,3,3,3, 2,3,1,3, 1,3,3,3, 2,3,1,4];
        const dBeatStd= [1,3,3,3, 2,3,1,3, 1,3,3,3, 2,3,1,4];
        const dFill   = [1,3,2,2, 6,6,7,7, 8,8,2,2, 2,2,2,5];
        const dClimax = [5,1,2,2, 1,1,2,2, 6,7,8,2, 5,0,0,0];

        // ギターソロ用ロックビート
        const dGtrCym = [5,3,1,3, 2,3,1,3, 1,3,1,3, 2,3,2,4];
        const dGtrBeat= [1,3,1,3, 2,3,1,3, 1,3,1,3, 2,3,2,4];
        const dGtrFill= [1,1,2,2, 6,7,8,2, 6,7,8,2, 5,5,5,5];

        // 【ドラムソロセクション！】
        const dSolo1  = [5,1,1,1, 2,1,1,1, 2,1,2,1, 2,2,2,2]; // 16分ツーバス連打＋スネアロール
        const dSolo2  = [5,6,6,6, 7,7,7,7, 8,8,8,8, 2,2,5,5]; // ロートタム怒涛の乱れ打ち！
        const dSolo3  = [1,1,2,2, 1,1,2,2, 6,6,7,7, 8,8,2,5]; // ツーバス＋タムコンビネーション
        const dSolo4  = [6,7,8,2, 6,7,8,2, 2,2,2,2, 5,5,5,5]; // 炸裂の大フィルイン＆シンバル連打！

        const drums = [
            // 0-3: 緊迫の出撃・主砲発射イントロ！
            dRoll, dHeavy, dBeat, dClimax,
            // 4-11: Aメロ (大艦隊砲撃戦)
            dBeat, dBeatStd, dBeatStd, dFill,
            dBeat, dBeatStd, dBeatStd, dFill,
            // 12-19: Bメロ (コスモタイガー発進)
            dBeat, dBeatStd, dBeatStd, dBeatStd,
            dBeat, dBeatStd, dBeatStd, dFill,
            // 20-27: サビ (最大戦速・大決戦クライマックス)
            dBeat, dBeatStd, dBeatStd, dBeatStd,
            dBeat, dBeatStd, dBeatStd, dFill,
            // 28-35: 【熱狂のエレキギターソロセクション！】(8小節)
            dGtrCym, dGtrBeat, dGtrBeat, dFill,
            dGtrCym, dGtrBeat, dGtrBeat, dGtrFill,
            // 36-39: 【炸裂のドラムソロセクション！】(4小節)
            dSolo1, dSolo2, dSolo3, dSolo4,
            // 40-47: 【全開ラストサビ＆大決戦フィナーレ！】(8小節)
            dBeat, dBeatStd, dBeatStd, dBeatStd,
            dBeat, dBeatStd, dHeavy, dClimax
        ].flat();

        // === 2. オーケストラ打楽器: ティンパニ (地鳴りのような重低音轟音) ===
        const tRoll = [D2,D2,D2,D2, D2,D2,D2,D2, D2,D2,F2,F2, A1,A1,D2,D2];
        const tHit1 = [D2,_,_,_, _,_,_,_, A1,_,_,_, _,_,_,_];
        const tHit2 = [Bb1,_,_,_, _,_,_,_, C2,_,_,_, _,_,_,_];
        const tHitA = [A1,_,_,_, Cs2,_,_,_, E2,_,_,_, A1,_,_,_];
        const tFill = [D2,_,D2,_, F2,_,G2,_, A1,A1,A1,A1, D2,_,_,_];

        const timpani = [
            // 0-3: イントロ
            tRoll, tHit1, tHit2, tRoll,
            // 4-11: Aメロ
            tHit1, tHit2, tHit1, tFill,
            tHit1, tHit2, tHit1, tRoll,
            // 12-19: Bメロ
            tHit2, tHit1, tHit2, tHitA,
            tHit2, tHit1, tHit2, tRoll,
            // 20-27: サビ
            tHit1, tHit2, tHit1, tHitA,
            tHit1, tHit2, tHit1, tRoll,
            // 28-35: ギターソロ (コードを低音で重厚に支える)
            tHit1, tHit2, tHit1, tFill,
            tHit1, tHit2, tHit1, tRoll,
            // 36-39: ドラムソロ (ドラムと激しく掛け合うティンパニ！)
            tHit1, tFill, tRoll, tRoll,
            // 40-47: ラストサビ
            tHit1, tHit2, tHit1, tHitA,
            tHit1, tHit2, tRoll, tRoll
        ].flat();

        // === 3. 重厚な16分オクターブ連打＆パルスベース (推進力抜群) ===
        const bDm  = [D2,D2,D3,D2, D2,D2,D3,D2, F2,_,G2,_, A2,_,D2,_];
        const bBb  = [Bb1,Bb1,Bb2,Bb1, Bb1,Bb1,Bb2,Bb1, D2,_,F2,_, Bb1,_,A1,_];
        const bC   = [C2,C2,C3,C2, C2,C2,C3,C2, E2,_,G2,_, C2,_,Bb1,_];
        const bF   = [F2,F2,F3,F2, F2,F2,F3,F2, A2,_,C3,_, F2,_,E2,_];
        const bAm  = [A2,A2,A3,A2, A2,A2,A3,A2, C3,_,E3,_, A2,_,G2,_];
        const bGm  = [G2,G2,G3,G2, G2,G2,G3,G2, Bb2,_,D3,_, G2,_,F2,_];
        const bA7  = [A2,A2,A3,A2, A2,A2,A3,A2, Cs3,_,E3,_, G3,_,A2,_];

        const bInt0 = [D2,D2,D2,D2, D2,D2,D2,D2, D2,D2,D2,D2, D2,D2,D2,D2];
        const bInt1 = [D2,_,_,_, D2,_,_,_, D2,_,_,_, D2,_,_,_];
        const bInt2 = [Bb1,_,_,_, Bb1,_,_,_, C2,_,_,_, C2,_,_,_];
        const bInt3 = [A1,A1,A1,A1, A1,A1,A1,A1, Cs2,Cs2,Cs2,Cs2, E2,E2,G2,A2];
        const bRest = [_,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_];

        const bass = [
            // 0-3: イントロ
            bInt0, bInt1, bInt2, bInt3,
            // 4-11: Aメロ
            bDm, bBb, bC, bDm, bGm, bA7, bDm, bDm,
            // 12-19: Bメロ
            bF, bC, bDm, bAm, bBb, bF, bGm, bA7,
            // 20-27: サビ
            bDm, bBb, bGm, bA7, bDm, bBb, bGm, bA7,
            // 28-35: ギターソロ (疾走ベースライン)
            bDm, bBb, bC, bDm, bGm, bA7, bDm, bDm,
            // 36-39: ドラムソロ (ドラム単独ブレイクのためベース休止)
            bRest, bRest, bRest, bRest,
            // 40-47: ラストサビ
            bDm, bBb, bGm, bA7, bDm, bBb, bGm, bA7
        ].flat();

        // === 4. 金管ブラス和音ヒット (ホルン・トロンボーン群の咆哮) ===
        const brDm1 = [F3,_,F3,_, _,_,F3,_, F3,_,_,_, F3,_,_,_];
        const brDm2 = [A3,_,A3,_, _,_,A3,_, A3,_,_,_, A3,_,_,_];
        const brBb1 = [D3,_,D3,_, _,_,D3,_, D3,_,_,_, D3,_,_,_];
        const brBb2 = [F3,_,F3,_, _,_,F3,_, F3,_,_,_, F3,_,_,_];
        const brC1  = [E3,_,E3,_, _,_,E3,_, E3,_,_,_, E3,_,_,_];
        const brC2  = [G3,_,G3,_, _,_,G3,_, G3,_,_,_, G3,_,_,_];
        const brF1  = [A3,_,A3,_, _,_,A3,_, A3,_,_,_, A3,_,_,_];
        const brF2  = [C4,_,C4,_, _,_,C4,_, C4,_,_,_, C4,_,_,_];
        const brGm1 = [D3,_,D3,_, _,_,D3,_, D3,_,_,_, D3,_,_,_];
        const brGm2 = [G3,_,G3,_, _,_,G3,_, G3,_,_,_, G3,_,_,_];
        const brA71 = [Cs3,_,Cs3,_, _,_,Cs3,_, Cs3,_,_,_, Cs3,_,_,_];
        const brA72 = [E3,_,E3,_, _,_,E3,_, E3,_,_,_, E3,_,_,_];
        const brR   = [_,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_];

        const brass1 = [
            // 0-3: イントロ
            brDm1, brDm1, brBb1, brA71,
            // 4-11: Aメロ
            brDm1, brBb1, brC1, brDm1, brGm1, brA71, brDm1, brDm1,
            // 12-19: Bメロ
            brF1, brC1, brDm1, brA71, brBb1, brF1, brGm1, brA71,
            // 20-27: サビ
            brDm1, brBb1, brGm1, brA71, brDm1, brBb1, brGm1, brA71,
            // 28-35: ギターソロ
            brDm1, brBb1, brC1, brDm1, brGm1, brA71, brDm1, brDm1,
            // 36-39: ドラムソロ
            brR, brR, brR, brR,
            // 40-47: ラストサビ
            brDm1, brBb1, brGm1, brA71, brDm1, brBb1, brGm1, brA71
        ].flat();

        const brass2 = [
            brDm2, brDm2, brBb2, brA72,
            brDm2, brBb2, brC2, brDm2, brGm2, brA72, brDm2, brDm2,
            brF2, brC2, brDm2, brA72, brBb2, brF2, brGm2, brA72,
            brDm2, brBb2, brGm2, brA72, brDm2, brBb2, brGm2, brA72,
            brDm2, brBb2, brC2, brDm2, brGm2, brA72, brDm2, brDm2,
            brR, brR, brR, brR,
            brDm2, brBb2, brGm2, brA72, brDm2, brBb2, brGm2, brA72
        ].flat();

        // === 5. 弦楽器ストリングス (オーケストラコードパッド) ===
        const sDm = [A4,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_];
        const sBb = [Bb4,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_];
        const sC  = [C5,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_];
        const sF  = [F5,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_];
        const sAm = [A4,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_];
        const sGm = [G4,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_];
        const sA7 = [A4,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_];
        const sR  = [_,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_];

        const strings = [
            sDm, sDm, sBb, sA7,
            sDm, sBb, sC, sDm, sGm, sA7, sDm, sDm,
            sF, sC, sDm, sAm, sBb, sF, sGm, sA7,
            sDm, sBb, sGm, sA7, sDm, sBb, sGm, sA7,
            // 28-35: ギターソロ
            sDm, sBb, sC, sDm, sGm, sA7, sDm, sDm,
            // 36-39: ドラムソロ
            sR, sR, sR, sR,
            // 40-47: ラストサビ
            sDm, sBb, sGm, sA7, sDm, sBb, sGm, sA7
        ].flat();

        // === 6. 緊迫のオーケストラル・ストリングス風16分アルペジオ ===
        const aDm  = [D4,F4,A4,D5, F5,D5,A4,F4, D4,F4,A4,D5, F5,D5,A4,F4];
        const aBb  = [Bb3,D4,F4,Bb4, D5,Bb4,F4,D4, Bb3,D4,F4,Bb4, D5,Bb4,F4,D4];
        const aC   = [C4,E4,G4,C5, E5,C5,G4,E4, C4,E4,G4,C5, E5,C5,G4,E4];
        const aF   = [F3,A3,C4,F4, A4,F4,C4,A3, F3,A3,C4,F4, A4,F4,C4,A3];
        const aAm  = [A3,C4,E4,A4, C5,A4,E4,C4, A3,C4,E4,A4, C5,A4,E4,C4];
        const aGm  = [G3,Bb3,D4,G4, Bb4,G4,D4,Bb3, G3,Bb3,D4,G4, Bb4,G4,D4,Bb3];
        const aA7  = [A3,Cs4,E4,A4, Cs5,A4,E4,Cs4, A3,Cs4,E4,A4, G4,E4,Cs4,A3];
        const aR   = [_,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_];

        const arp = [
            ...aDm, ...aDm, ...aBb, ...aA7,
            ...aDm, ...aBb, ...aC,  ...aDm, ...aGm, ...aA7, ...aDm, ...aDm,
            ...aF,  ...aC,  ...aDm, ...aAm, ...aBb, ...aF,  ...aGm, ...aA7,
            ...aDm, ...aBb, ...aGm, ...aA7, ...aDm, ...aBb, ...aGm, ...aA7,
            // 28-35: ギターソロ中はエレキギターを際立たせるため休止
            ...aR,  ...aR,  ...aR,  ...aR,  ...aR,  ...aR,  ...aR,  ...aR,
            // 36-39: ドラムソロ中休止
            ...aR,  ...aR,  ...aR,  ...aR,
            // 40-47: ラストサビで大復活
            ...aDm, ...aBb, ...aGm, ...aA7, ...aDm, ...aBb, ...aGm, ...aA7
        ];

        // === 7. 熱狂のエレキギターソロ (28-35小節) & ラストサビ・オブリガート (40-47小節) ===
        // 哭きのチョーキング、速弾きアルペジオ、タッピング、激しいビブラート！
        const gtrSolo = [
            // 28: Dm (急上昇からA5チョーキング哭きのロングトーン！)
            D5,_,F5,_, G5,_,A5,_, A5,_,_,_, _,_,_,_,
            // 29: Bb (高音オクターブ・エモーショナルフレーズ)
            D6,_,_,_, C6,_,Bb5,_, A5,_,Bb5,_, C6,_,D6,_,
            // 30: C (ブルーススケール高速下降リック)
            E6,_,D6,_, C6,_,A5,_, Gs5,_,G5,_, F5,_,D5,_,
            // 31: Dm (急上昇・C6からD6への絶叫チョーキング！)
            F5,_,G5,_, A5,_,C6,_, D6,_,_,_, _,_,_,_,
            // 32: Gm (情熱的なメロディライン)
            D6,_,_,_, _,_,C6,_, Bb5,_,_,_, A5,_,_,_,
            // 33: A7 (緊迫の上昇スイープアルペジオ)
            E5,_,G5,_, A5,_,Cs6,_, E6,_,_,_, G6,_,_,_,
            // 34: Dm (最高音F6への強烈なチョーキング＆ロングビブラート！)
            F6,_,_,_, _,_,E6,_, D6,_,_,_, Cs6,_,_,_,
            // 35: Dm (ピックスクラッチ＆下降フレーズからドラムソロへパス！)
            D6,_,A5,_, F5,_,D5,_, Cs5,_,E5,_, A4,_,_,_
        ];

        // チョーキング指定 (半音数): 0はストレート、2は1音ベンド
        const gtrBend = [
            0,0,0,0, 0,0,0,0, 2,0,0,0, 0,0,0,0, // 28: A5チョーキング
            0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
            0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
            0,0,0,0, 0,0,0,0, 2,0,0,0, 0,0,0,0, // 31: D6チョーキング
            0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
            0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0,
            2,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, // 34: F6チョーキング
            0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0
        ];

        const gtrObbligato = [
            // 40-47: ラストサビで主旋律と絡み合う熱いオブリガート
            F5,_,_,_, A5,_,_,_, D6,_,_,_, F6,_,_,_,
            E6,_,_,E6, F6,_,G6,_, F6,_,_,_, _,_,_,_,
            D6,_,_,_, C6,_,_,_, Bb5,_,C6,_, D6,_,_,_,
            C6,_,_,_, Bb5,_,A5,_, Bb5,_,_,_, F5,_,_,_,
            F5,_,_,_, A5,_,_,_, D6,_,_,_, F6,_,_,_,
            G6,_,_,_, F6,_,E6,_, F6,_,_,_, D6,_,_,_,
            E6,_,_,_, D6,_,Cs6,_, D6,_,_,_, _,_,_,_,
            D6,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_
        ];

        const guitar = [
            ...new Array(448).fill(0), // 0-27: バッキング
            ...gtrSolo,                 // 28-35: ギターソロ！
            ...new Array(64).fill(0),  // 36-39: ドラムソロ中はブレイク
            ...gtrObbligato             // 40-47: ラストサビ・オブリガート
        ];

        // === 8. 勇壮・哀愁・決死の主旋律 (PSGリード + 金管ブラスリード) ===
        const leadVerseA = [
            D5,_,_,_, F5,_,_,_, A5,_,_,_, D6,_,_,_,
            Cs6,_,_,Cs6, D6,_,E6,_, D6,_,_,_, _,_,_,_,
            A5,_,_,_, G5,_,_,_, F5,_,G5,_, A5,_,_,_,
            G5,_,_,_, F5,_,E5,_, F5,_,_,_, D5,_,_,_,

            D5,_,_,_, F5,_,_,_, G5,_,_,_, A5,_,_,_,
            Bb5,_,_,_, A5,_,G5,_, A5,_,_,_, F5,_,_,_,
            G5,_,_,_, F5,_,E5,_, F5,_,_,_, D5,_,_,_,
            Cs5,_,D5,_, E5,_,F5,_, G5,_,A5,_, Bb5,_,Cs6,_
        ];

        const leadVerseB = [
            C6,_,_,_, _,_,B5,_, Bb5,_,_,_, A5,_,_,_,
            G5,_,_,_, _,_,A5,_, Bb5,_,_,_, C6,_,_,_,
            D6,_,_,_, _,_,Cs6,_, C6,_,_,_, B5,_,_,_,
            A5,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,

            F5,_,_,F5, G5,_,_,G5, A5,_,_,A5, C6,_,_,_,
            Bb5,_,_,Bb5, A5,_,_,A5, G5,_,_,_, F5,_,G5,_,
            A5,_,_,_, D6,_,_,_, Cs6,_,_,_, E6,_,_,_,
            D6,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_
        ];

        const leadChorus = [
            D6,_,_,_, A5,_,_,_, F5,_,G5,_, A5,_,_,_,
            Bb5,_,_,_, G5,_,_,_, E5,_,F5,_, G5,_,_,_,
            A5,_,_,_, F5,_,_,_, D5,_,E5,_, F5,_,_,_,
            E5,_,_,_, Cs5,_,_,_, D5,_,_,_, _,_,_,_,

            D6,_,_,_, A5,_,_,_, F5,_,G5,_, A5,_,_,_,
            Bb5,_,_,_, D6,_,_,_, C6,_,_,_, Bb5,_,_,_,
            A5,_,_,_, G5,_,F5,_, E5,_,_,_, F5,_,G5,_,
            A5,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_
        ];

        const leadIntro = [
            D5,_,_,_, D5,_,_,_, D5,_,_,_, _,_,_,_,
            A5,_,_,_, _,_,_,_, Gs5,_,_,_, G5,_,_,_,
            F5,_,_,_, E5,_,_,_, D5,_,_,_, Cs5,_,_,_,
            D5,_,F5,_, A5,_,D6,_, Cs6,_,_,_, E6,_,_,_
        ];

        const lead = [
            // 0-3: イントロ
            ...leadIntro,
            // 4-11: Aメロ
            ...leadVerseA,
            // 12-19: Bメロ
            ...leadVerseB,
            // 20-27: サビ
            ...leadChorus,
            // 28-39: ギターソロ＆ドラムソロ中はブレイク！
            ...new Array(192).fill(0),
            // 40-47: ラストサビ（全開フィナーレ）
            ...leadChorus
        ];

        // === 9. 金管ハーモニー (対旋律) ===
        const harmChorus = [
            Bb5,_,_,_, F5,_,_,_, D5,_,E5,_, F5,_,_,_,
            G5,_,_,_, E5,_,_,_, Cs5,_,D5,_, E5,_,_,_,
            F5,_,_,_, D5,_,_,_, Bb4,_,C5,_, D5,_,_,_,
            Cs5,_,_,_, A4,_,_,_, Bb4,_,_,_, _,_,_,_,

            Bb5,_,_,_, F5,_,_,_, D5,_,E5,_, F5,_,_,_,
            G5,_,_,_, Bb5,_,_,_, A5,_,_,_, G5,_,_,_,
            F5,_,_,_, E5,_,D5,_, Cs5,_,_,_, D5,_,E5,_,
            F5,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_
        ];

        const harmVerseB = [
            A5,_,_,_, _,_,G5,_, G5,_,_,_, F5,_,_,_,
            E5,_,_,_, _,_,F5,_, G5,_,_,_, A5,_,_,_,
            Bb5,_,_,_, _,_,A5,_, A5,_,_,_, Gs5,_,_,_,
            F5,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_,

            D5,_,_,D5, E5,_,_,E5, F5,_,_,F5, A5,_,_,_,
            G5,_,_,G5, F5,_,_,F5, E5,_,_,_, D5,_,E5,_,
            F5,_,_,_, Bb5,_,_,_, A5,_,_,_, Cs6,_,_,_,
            A5,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_
        ];

        const harmony = [
            ...new Array(192).fill(0), // 0-11: イントロ & Aメロ
            ...harmVerseB,             // 12-19: Bメロ
            ...harmChorus,             // 20-27: サビ
            ...new Array(192).fill(0), // 28-39: ギター＆ドラムソロ中ブレイク
            ...harmChorus              // 40-47: ラストサビ
        ];

        this.startScheduler(bpm, totalSteps, (step, time, stepDur) => {
            // 1. ドラム & パーカッション (キック, スネア, ハット, 大シンバル, タム)
            const d = drums[step];
            if (d === 1) this.triggerKick(time);
            else if (d === 2) this.triggerSnare(time);
            else if (d === 3) this.triggerHiHat(time, false);
            else if (d === 4) this.triggerHiHat(time, true);
            else if (d === 5) this.triggerCymbal(time);
            else if (d === 6) this.triggerTom(A3, time, stepDur * 0.95);
            else if (d === 7) this.triggerTom(F3, time, stepDur * 0.95);
            else if (d === 8) this.triggerTom(D3, time, stepDur * 0.95);

            // 2. オーケストラ打楽器: ティンパニ (重低音轟音)
            const tp = timpani[step];
            if (tp > 0) {
                this.triggerTimpani(tp, time, stepDur * 2.2);
            }

            // 3. 重低音ベース (タイトな推進力)
            const b = bass[step];
            if (b > 0) {
                this.triggerBass(b, time, stepDur * 1.6);
            }

            // 4. 金管ブラスセクション (ホルン・トロンボーン和音ヒット)
            const br1 = brass1[step];
            const br2 = brass2[step];
            if (br1 > 0) this.triggerBrass(br1, time, stepDur * 0.95, 0.16);
            if (br2 > 0) this.triggerBrass(br2, time, stepDur * 0.95, 0.14);

            // 5. 弦楽器ストリングス (オーケストラコードパッド)
            const str = strings[step];
            if (str > 0) {
                this.triggerStrings(str, time, stepDur * 3.8, 0.15);
            }

            // 6. 緊迫の16分アルペジオ
            const a = arp[step];
            if (a > 0) {
                this.triggerArp(a, time, stepDur * 0.88);
            }

            // 7. エレキギター (熱狂のギターソロ ＆ ラストサビ・オブリガート！)
            const g = guitar[step];
            if (g > 0) {
                let gLen = 1;
                for (let k = 1; k < 16; k++) {
                    if (guitar[(step + k) % totalSteps] === 0) gLen++;
                    else break;
                }
                const bend = (step >= 448 && step < 576) ? (gtrBend[step - 448] || 0) : 0;
                this.triggerGuitar(g, time, stepDur * gLen * 0.96, 0.25, bend);
            }

            // 8. 金管ハーモニー (対旋律)
            const h = harmony[step];
            if (h > 0) {
                let hLen = 1;
                for (let k = 1; k < 8; k++) {
                    if (harmony[(step + k) % totalSteps] === 0) hLen++;
                    else break;
                }
                this.triggerBrass(h, time, stepDur * hLen * 0.9, 0.13);
            }

            // 9. 主旋律 (重厚金管ブラスリード + 輝かしいPSGリードのデュアル発音！)
            const l = lead[step];
            if (l > 0) {
                let lLen = 1;
                for (let k = 1; k < 8; k++) {
                    if (lead[(step + k) % totalSteps] === 0) lLen++;
                    else break;
                }
                const dur = stepDur * lLen * 0.92;
                this.triggerBrass(l, time, dur, 0.22); // 金管リードの重厚な咆哮
                this.triggerLead(l, time, dur);        // トップノートの抜け
            }
        });
    }

    // ボス戦BGM: 『AIRCRAFT CARRIER (HEAVY ORCHESTRA & METAL)』
    // 巨大要塞ビッグコアとの死闘！楽器を容赦なく大量投入した超高速168BPMのヘヴィメタル・シンフォニー！
    playBossBgm() {
        if (this.currentBgm === 'BOSS') return;
        this.currentBgm = 'BOSS';

        // テンポ 168 BPM (超緊迫の高速ボスバトル)
        const bpm = 168;
        const totalSteps = 128; // 全8小節ループ (1小節=16ステップ)

        // === 1. 容赦ないヘヴィメタル・ドラム (ツーバス連打、スネア、大シンバル、タムロール) ===
        const dBeatMetal = [
            5,3,1,3, 2,3,1,3, 1,1,1,1, 2,3,2,4  // 16分ツーバス高速キック連打！
        ];
        const dDriveMetal = [
            1,3,1,3, 2,3,1,3, 1,1,1,1, 2,3,2,4
        ];
        const dMetalFill = [
            1,1,2,2, 6,6,7,7, 8,8,2,2, 2,2,5,5  // 怒涛のタムロール＆シンバル乱打！
        ];

        const drums = [
            dBeatMetal, dDriveMetal, dDriveMetal, dMetalFill, // 0-3
            dBeatMetal, dDriveMetal, dDriveMetal, dMetalFill  // 4-7
        ].flat();

        // === 2. オーケストラ打楽器: ティンパニ (不吉な地鳴り轟音) ===
        const tBoss1 = [D2,_,_,_, _,_,_,_, Gs1,_,_,_, _,_,_,_];
        const tBoss2 = [A1,_,_,_, _,_,_,_, F2,_,_,_, _,_,_,_];
        const tBossRoll = [D2,D2,D2,D2, D2,D2,D2,D2, Gs1,Gs1,A1,A1, D2,_,_,_];

        const timpani = [
            tBoss1, tBoss2, tBoss1, tBossRoll,
            tBoss1, tBoss2, tBoss1, tBossRoll
        ].flat();

        // === 3. 重低音スラッシュメタル・ファズベース (トライトーン・減5度の凶悪リフ) ===
        const bBoss1 = [D2,D2,D3,D2, F2,F2,F3,F2, Gs2,Gs2,Gs3,Gs2, G2,G2,F2,F2];
        const bBoss2 = [D2,D2,D3,D2, F2,F2,F3,F2, A2,A2,Gs2,Gs2,   G2,G2,F2,F2];
        const bBoss3 = [D2,D2,D2,D2, F2,F2,F2,F2, Gs2,Gs2,Gs2,Gs2, A2,A2,A2,A2];

        const bass = [
            bBoss1, bBoss2, bBoss1, bBoss3,
            bBoss1, bBoss2, bBoss1, bBoss3
        ].flat();

        // === 4. ディストーションギター・パワーコードリフ (ザクザク刻むスラッシュメタル！) ===
        const gRiff1 = [D3,_,D3,_, F3,_,D3,_, Gs3,_,_,_, G3,_,F3,_];
        const gRiff2 = [D3,_,D3,_, F3,_,D3,_, A3,_,_,_,  Gs3,_,F3,_];
        const gRiff3 = [D3,D3,D3,D3, F3,F3,F3,F3, Gs3,Gs3,Gs3,Gs3, A3,A3,A3,A3];

        const guitarRiff = [
            gRiff1, gRiff2, gRiff1, gRiff3,
            gRiff1, gRiff2, gRiff1, gRiff3
        ].flat();

        // === 5. 金管ブラス・オーケストラヒット (「ジャン！ジャン！」と炸裂する不協和音) ===
        const brHitD  = [D4,_,D4,_, _,_,D4,_, D4,_,_,_, D4,_,_,_];
        const brHitGs = [Gs4,_,Gs4,_, _,_,Gs4,_, Gs4,_,_,_, Gs4,_,_,_];
        const brHitA  = [A4,_,A4,_, _,_,A4,_, A4,_,_,_, A4,_,_,_];

        const brass1 = [
            brHitD,  brHitGs, brHitD,  brHitA,
            brHitD,  brHitGs, brHitD,  brHitA
        ].flat();

        const brass2 = [
            brHitGs, brHitD,  brHitGs, brHitD,
            brHitGs, brHitD,  brHitGs, brHitD
        ].flat();

        // === 6. 弦楽器ストリングス (緊迫の16分オスティナート) ===
        const strOst1 = [D4,F4,Gs4,A4, D4,F4,Gs4,A4, D4,F4,Gs4,A4, D4,F4,Gs4,A4];
        const strOst2 = [Gs4,A4,C5,D5, Gs4,A4,C5,D5, Gs4,A4,C5,D5, Gs4,A4,C5,D5];

        const strings = [
            strOst1, strOst2, strOst1, strOst2,
            strOst1, strOst2, strOst1, strOst2
        ].flat();

        // === 7. ビッグコア凶悪主旋律 (PSGリード＋金管ブラス＋オクターブギターのトリプルユニゾン！) ===
        const bossLead = [
            // 0-3: Aメロ (減5度の不吉なリフ)
            D5,_,D5,_, F5,_,D5,_, Gs5,_,G5,_, F5,_,D5,_,
            D5,_,D5,_, F5,_,D5,_, A5,_,Gs5,_, G5,_,F5,_,
            D5,_,D5,_, F5,_,D5,_, Gs5,_,G5,_, F5,_,D5,_,
            D5,_,F5,_, Gs5,_,A5,_, D6,_,_,_, _,_,_,_,

            // 4-7: Bメロ (高音オクターブで襲い来る要塞の脅威)
            D6,_,_,D6, C6,_,A5,_, Gs5,_,_,Gs5, G5,_,F5,_,
            D6,_,_,D6, C6,_,A5,_, A5,_,_,A5,   Gs5,_,F5,_,
            D6,_,_,D6, C6,_,A5,_, Gs5,_,_,Gs5, G5,_,F5,_,
            D5,_,F5,_, Gs5,_,A5,_, D6,_,_,_,   _,_,_,_
        ];

        this.startScheduler(bpm, totalSteps, (step, time, stepDur) => {
            // 1. ドラム & パーカッション (ツーバス, スネア, ハット, 大シンバル, タム)
            const d = drums[step];
            if (d === 1) this.triggerKick(time);
            else if (d === 2) this.triggerSnare(time);
            else if (d === 3) this.triggerHiHat(time, false);
            else if (d === 4) this.triggerHiHat(time, true);
            else if (d === 5) this.triggerCymbal(time);
            else if (d === 6) this.triggerTom(A3, time, stepDur * 0.95);
            else if (d === 7) this.triggerTom(F3, time, stepDur * 0.95);
            else if (d === 8) this.triggerTom(D3, time, stepDur * 0.95);

            // 2. オーケストラ打楽器: ティンパニ (重低音轟音)
            const tp = timpani[step];
            if (tp > 0) {
                this.triggerTimpani(tp, time, stepDur * 2.2);
            }

            // 3. ヘヴィ・ファズベース (超重低音)
            const b = bass[step];
            if (b > 0) {
                this.triggerBass(b, time, stepDur * 1.5, 0.38);
            }

            // 4. ディストーションギター・パワーコードリフ (ザクザク刻む重厚メタル)
            const gr = guitarRiff[step];
            if (gr > 0) {
                this.triggerPowerChord(gr, time, stepDur * 1.5, 0.26);
            }

            // 5. 金管ブラス・オーケストラヒット (ガツンと響く「ジャン！ジャン！」)
            const br1 = brass1[step];
            const br2 = brass2[step];
            if (br1 > 0) this.triggerBrass(br1, time, stepDur * 0.9, 0.22);
            if (br2 > 0) this.triggerBrass(br2, time, stepDur * 0.9, 0.18);

            // 6. 弦楽器ストリングス (16分緊迫オスティナート刻み)
            const str = strings[step];
            if (str > 0) {
                this.triggerStrings(str, time, stepDur * 0.95, 0.16);
            }

            // 7. ビッグコア主旋律 (ハイゲインPSGリード + 重厚金管ブラスのデュアル凶悪猛撃！)
            const l = bossLead[step];
            if (l > 0) {
                let lLen = 1;
                for (let k = 1; k < 8; k++) {
                    if (bossLead[(step + k) % totalSteps] === 0) lLen++;
                    else break;
                }
                const dur = stepDur * lLen * 0.94;
                this.triggerLead(l, time, dur, 0.32);
                this.triggerBrass(l, time, dur, 0.24);
            }
        });
    }

    // WARNING警報音 (ピロピロピロ…！)
    playWarningSound() {
        if (this.currentBgm === 'WARNING') return;
        this.stopBgm();
        this.currentBgm = 'WARNING';
        this.init();

        let toggle = false;
        this.bgmTimer = setInterval(() => {
            if (!this.initialized || this.isMuted) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'square';
            osc.frequency.setValueAtTime(toggle ? 960 : 720, now);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.12);

            osc.connect(gain);
            gain.connect(this.bgmGain);

            osc.start(now);
            osc.stop(now + 0.12);

            toggle = !toggle;
        }, 130);
    }

    // ステージクリア ファンファーレ
    playClearJingle() {
        this.stopBgm();
        this.currentBgm = 'CLEAR';
        this.init();

        const notes = [
            { f: 523.25, d: 0.15 }, // C5
            { f: 587.33, d: 0.15 }, // D5
            { f: 659.25, d: 0.15 }, // E5
            { f: 783.99, d: 0.3 },  // G5
            { f: 659.25, d: 0.15 }, // E5
            { f: 783.99, d: 0.6 }   // G5 (長音)
        ];

        let offset = 0;
        notes.forEach(n => {
            setTimeout(() => {
                if (!this.initialized || this.isMuted) return;
                const now = this.ctx.currentTime;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'square';
                osc.frequency.setValueAtTime(n.f, now);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.linearRampToValueAtTime(0.01, now + n.d);

                osc.connect(gain);
                gain.connect(this.seGain);

                osc.start(now);
                osc.stop(now + n.d);
            }, offset * 1000);
            offset += n.d;
        });
    }
}

// グローバルサウンドインスタンス
const Sound = new SoundManager();
