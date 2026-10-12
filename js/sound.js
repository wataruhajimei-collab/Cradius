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
const Db1 = Cs1, Db2 = Cs2, Db3 = Cs3, Db4 = Cs4, Db5 = Cs5, Db6 = Cs6;
const Gb1 = Fs1, Gb2 = Fs2, Gb3 = Fs3, Gb4 = Fs4, Gb5 = Fs5, Gb6 = Fs6;

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
            this.unlockAudio();
            ['touchstart', 'touchend', 'click', 'keydown', 'pointerdown'].forEach(evt => {
                window.removeEventListener(evt, unlock, { capture: true });
            });
        };
        ['touchstart', 'touchend', 'click', 'keydown', 'pointerdown'].forEach(evt => {
            window.addEventListener(evt, unlock, { passive: true, capture: true });
        });
    }

    unlockAudio() {
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        // iOS Safari用Web Audioアンロックダミーバッファ
        try {
            const buf = this.ctx.createBuffer(1, 1, 22050);
            const src = this.ctx.createBufferSource();
            src.buffer = buf;
            src.connect(this.ctx.destination);
            src.start(0);
        } catch (e) {}
        // iOS Safari / iPadOS 用 Web Speech API 初回アンロック
        if (!this._speechUnlocked && typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
            this._speechUnlocked = true;
            try {
                const warm = new SpeechSynthesisUtterance('');
                warm.volume = 0;
                window.speechSynthesis.speak(warm);
            } catch (e) {}
        }
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();

            // マスターコンプレッサー（重低音ベース・ドラムを極限までブーストしても音割れさせず塊感のある音圧にまとめる）
            this.masterCompressor = this.ctx.createDynamicsCompressor();
            this.masterCompressor.threshold.setValueAtTime(-5.0, this.ctx.currentTime);
            this.masterCompressor.knee.setValueAtTime(8.0, this.ctx.currentTime);
            this.masterCompressor.ratio.setValueAtTime(6.0, this.ctx.currentTime);
            this.masterCompressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
            this.masterCompressor.release.setValueAtTime(0.09, this.ctx.currentTime);
            this.masterCompressor.connect(this.ctx.destination);

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(0.98, this.ctx.currentTime); // しっかり聴こえる大音量へブースト
            this.masterGain.connect(this.masterCompressor);

            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.setValueAtTime(0.76, this.ctx.currentTime);
            this.bgmGain.connect(this.masterGain);

            this.seGain = this.ctx.createGain();
            this.seGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
            this.seGain.connect(this.masterGain);

            // ディストーション・エレキギター用オーバードライブカーブ
            this.distortionCurve = this.createDistortionCurve(55);
            // 重低音ベース・ドラム専用アナログ・ウォームサチュレーションカーブ（お腹に響く倍音・太さを生成）
            this.bassSaturationCurve = this.createBassSaturationCurve(2.2);

            // お腹の底にズシンと響く重低音リズム＆ベース専用バス (Rhythm & Sub-Bass Bus)
            this.rhythmBus = this.ctx.createGain();
            this.rhythmBus.gain.setValueAtTime(1.15, this.ctx.currentTime);

            // 1段目: 95Hz以下の重低音サブベース・ローシェルフブースト
            this.subBassBoost = this.ctx.createBiquadFilter();
            this.subBassBoost.type = 'lowshelf';
            this.subBassBoost.frequency.setValueAtTime(95, this.ctx.currentTime);
            this.subBassBoost.gain.setValueAtTime(6.5, this.ctx.currentTime);

            // 2段目: お腹・胸に物理的に響く68Hzチェスト・パンチ共鳴ブースト
            this.chestPunchEQ = this.ctx.createBiquadFilter();
            this.chestPunchEQ.type = 'peaking';
            this.chestPunchEQ.frequency.setValueAtTime(68, this.ctx.currentTime);
            this.chestPunchEQ.Q.setValueAtTime(1.25, this.ctx.currentTime);
            this.chestPunchEQ.gain.setValueAtTime(5.0, this.ctx.currentTime);

            // 3段目: 175Hzローミッドの太さ・ボディ感補強（PCやスマホスピーカーでも分厚く響かせる）
            this.bassPunchMidEQ = this.ctx.createBiquadFilter();
            this.bassPunchMidEQ.type = 'peaking';
            this.bassPunchMidEQ.frequency.setValueAtTime(175, this.ctx.currentTime);
            this.bassPunchMidEQ.Q.setValueAtTime(1.1, this.ctx.currentTime);
            this.bassPunchMidEQ.gain.setValueAtTime(3.5, this.ctx.currentTime);

            // 4段目: アナログ・ソフトサチュレーション（低域の密度と輪郭を濃密化）
            this.rhythmSaturation = this.ctx.createWaveShaper();
            this.rhythmSaturation.curve = this.bassSaturationCurve;
            this.rhythmSaturation.oversample = 'none';

            this.rhythmBus.connect(this.subBassBoost);
            this.subBassBoost.connect(this.chestPunchEQ);
            this.chestPunchEQ.connect(this.bassPunchMidEQ);
            this.bassPunchMidEQ.connect(this.rhythmSaturation);
            this.rhythmSaturation.connect(this.bgmGain);

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

            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    createBassSaturationCurve(drive = 2.2) {
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const norm = Math.tanh(drive);
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = Math.tanh(x * drive) / norm;
        }
        return curve;
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

    // 自動ノード切断・GC回収ヘルパー（オーディオグラフの肥大化・音飛び・CPU負荷を完全防止）
    autoClean(primaryNode, durationSec, ...extraNodes) {
        if (!primaryNode) return;
        let cleaned = false;
        const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            try { primaryNode.disconnect(); } catch (e) {}
            if (extraNodes) {
                for (let i = 0; i < extraNodes.length; i++) {
                    try { if (extraNodes[i]) extraNodes[i].disconnect(); } catch (e) {}
                }
            }
        };
        try {
            primaryNode.onended = cleanup;
        } catch (e) {}
        setTimeout(cleanup, Math.max(10, Math.ceil((durationSec + 0.08) * 1000)));
    }

    // --- 効果音 (SE) ---

    // 通常ショット: ピピッ！(高音矩形波の急ピッチダウン)
    playShot() {
        if (!this.initialized || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(950, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.08);

        gain.gain.setValueAtTime(0.50, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gain);
        gain.connect(this.seGain);

        osc.start(now);
        osc.stop(now + 0.08);
        this.autoClean(osc, 0.08, gain);
    }

    // レーザー: グラディウス象徴の「みーーーーん！」
    // (12.5%パルス波 + アタック急降下 + 高音ピッチキープ + 鼻音フォルマントレゾナンス)
    playLaser() {
        if (!this.initialized || this.isMuted) return;
        const now = this.ctx.currentTime;
        const duration = 0.22;

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

        // ゲインエンベロープ（途中で衰えず、0.18sまで音圧を保ってスパッと切れる）
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.65, now);
        gain.gain.setValueAtTime(0.60, now + duration - 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.seGain);

        osc.start(now);
        osc.stop(now + duration);
        this.autoClean(osc, duration, filter, gain);
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

        gain.gain.setValueAtTime(0.45, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gain);
        gain.connect(this.seGain);

        osc.start(now);
        osc.stop(now + 0.15);
        this.autoClean(osc, 0.15, gain);
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

            gain.gain.setValueAtTime(0.45, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.08);

            osc.connect(gain);
            gain.connect(this.seGain);

            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.08);
            this.autoClean(osc, i * 0.05 + 0.08, gain);
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

            gain.gain.setValueAtTime(0.50, now + i * 0.035);
            gain.gain.linearRampToValueAtTime(0.01, now + i * 0.035 + 0.07);

            osc.connect(gain);
            gain.connect(this.seGain);

            osc.start(now + i * 0.035);
            osc.stop(now + i * 0.035 + 0.07);
            this.autoClean(osc, i * 0.035 + 0.07, gain);
        });
    }

    // ゲームスタート音: グラディウス開始時の象徴的な「タララララン！」サウンド
    // (12.5% & 25% パルス波 + 軽快なアルペジオファンファーレ + 空間残響)
    playGameStart() {
        this.unlockAudio();
        if (!this.initialized || this.isMuted) return;
        const now = this.ctx.currentTime;

        // グラディウス伝統のオープニング・アルペジオフレーズ (E minor: E5 -> B4 -> E5 -> Fs5 -> B5 -> E6)
        // 軽快かつ歯切れの良い「タ・ラ・ラ・ラ・ラ〜ン！」
        const notes = [
            { freq: 659.25, time: 0.000, dur: 0.055 }, // E5 (タ)
            { freq: 493.88, time: 0.055, dur: 0.055 }, // B4 (ラ)
            { freq: 659.25, time: 0.110, dur: 0.055 }, // E5 (ラ)
            { freq: 739.99, time: 0.165, dur: 0.055 }, // F#5 (ラ)
            { freq: 987.77, time: 0.220, dur: 0.075 }, // B5 (ラ)
            { freq: 1318.51, time: 0.295, dur: 0.450 } // E6 (ラン〜！)
        ];

        // 各音をコナミ特有のパルス波オシレーターで発音
        notes.forEach(({ freq, time, dur }) => {
            const noteStart = now + time;

            // 主音: 12.5%デューティ比の金属的なクリスプパルス波
            const osc1 = this.ctx.createOscillator();
            if (this.pulseWave125) {
                osc1.setPeriodicWave(this.pulseWave125);
            } else {
                osc1.type = 'square';
            }
            osc1.frequency.setValueAtTime(freq, noteStart);

            // 副音: 25%デューティ比、わずか+2.5Hzの微細デチューンでアーケード特有の艶やかなコーラス感
            const osc2 = this.ctx.createOscillator();
            if (this.pulseWave25) {
                osc2.setPeriodicWave(this.pulseWave25);
            } else {
                osc2.type = 'square';
            }
            osc2.frequency.setValueAtTime(freq + 2.5, noteStart);

            const gainNode = this.ctx.createGain();
            const vol = (freq > 1200) ? 0.75 : 0.65;
            gainNode.gain.setValueAtTime(vol, noteStart);

            if (freq > 1200) {
                // 最後の「ラン〜！」は豊かな余韻を持って響き渡る
                gainNode.gain.setValueAtTime(vol, noteStart + 0.15);
                gainNode.gain.exponentialRampToValueAtTime(0.001, noteStart + dur);
            } else {
                // 前半は歯切れの良いスタッカート
                gainNode.gain.setValueAtTime(vol, noteStart + dur * 0.7);
                gainNode.gain.exponentialRampToValueAtTime(0.001, noteStart + dur);
            }

            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(this.seGain);

            // 空間系ディレイへセンドして宇宙空間の広がりを付加
            if (this.delaySend) {
                gainNode.connect(this.delaySend);
            }

            osc1.start(noteStart);
            osc1.stop(noteStart + dur);
            osc2.start(noteStart);
            osc2.stop(noteStart + dur);
            this.autoClean(osc1, dur, osc2, gainNode);
        });

        // 最後のハイノート (E6) にキラキラした高域ベルチャイムの倍音 (B6 & E7) を付加
        const chimeStart = now + 0.295;
        const chimeOsc = this.ctx.createOscillator();
        const chimeGain = this.ctx.createGain();
        chimeOsc.type = 'sine';
        chimeOsc.frequency.setValueAtTime(1975.53, chimeStart); // B6
        chimeOsc.frequency.exponentialRampToValueAtTime(2637.02, chimeStart + 0.06); // E7

        chimeGain.gain.setValueAtTime(0.35, chimeStart);
        chimeGain.gain.exponentialRampToValueAtTime(0.001, chimeStart + 0.40);

        chimeOsc.connect(chimeGain);
        chimeGain.connect(this.seGain);
        if (this.delaySend) chimeGain.connect(this.delaySend);

        chimeOsc.start(chimeStart);
        chimeOsc.stop(chimeStart + 0.40);
        this.autoClean(chimeOsc, 0.40, chimeGain);
    }

    // 敵爆発音: ドカーン！ (ホワイトノイズ + 低域ピッチダウン)
    playExplosion() {
        if (!this.initialized || this.isMuted || !this.noiseBuffer) return;
        const now = this.ctx.currentTime;
        const duration = 0.28;

        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        // 低域通過フィルタ
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + duration);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.65, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.seGain);

        noise.start(now);
        this.autoClean(noise, duration, filter, gain);
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

        gain.gain.setValueAtTime(0.45, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.04);

        osc.connect(gain);
        gain.connect(this.seGain);

        osc.start(now);
        osc.stop(now + 0.04);
        this.autoClean(osc, 0.04, gain);
    }

    // ボス大爆発音: グラディウス風 超ド級・重低音連続爆発（ズドドドド…ドッカーン！）
    playBossExplode() {
        if (!this.initialized || this.isMuted) return;
        this.stopBgm(); // ボスBGMをストップして静寂と爆発の余韻を作る

        // 断末魔の叫び声（「ウワーーーー！」）が鳴っている最中は、爆発のホワイトノイズを大幅に抑えて人間の叫び声をクリアに聴かせる
        const isScreamingNow = Boolean(this._lastScreamTime && (Date.now() - this._lastScreamTime < 1800));

        // 1. 連続連鎖爆発（叫び声の最中はノイズを最小限にダッキング）
        for (let i = 0; i < 9; i++) {
            setTimeout(() => {
                if (!this.ctx) return;
                const now = this.ctx.currentTime;
                const duck = (isScreamingNow && i < 7) ? 0.08 : 1.0;
                if (this.noiseBuffer) {
                    const noise = this.ctx.createBufferSource();
                    noise.buffer = this.noiseBuffer;
                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.setValueAtTime(380, now);
                    filter.frequency.exponentialRampToValueAtTime(55, now + 0.35);

                    const gain = this.ctx.createGain();
                    gain.gain.setValueAtTime(0.35 * duck, now);
                    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.35);

                    noise.connect(filter);
                    filter.connect(gain);
                    gain.connect(this.seGain);
                    noise.start(now);
                    noise.stop(now + 0.35);
                    this.autoClean(noise, 0.35, filter, gain);
                }
                const sub = this.ctx.createOscillator();
                const subGain = this.ctx.createGain();
                sub.type = 'sine';
                sub.frequency.setValueAtTime(100 - i * 4, now);
                sub.frequency.exponentialRampToValueAtTime(32, now + 0.3);
                subGain.gain.setValueAtTime(0.25 * duck, now);
                subGain.gain.linearRampToValueAtTime(0.001, now + 0.3);
                sub.connect(subGain);
                subGain.connect(this.seGain);
                sub.start(now);
                sub.stop(now + 0.3);
                this.autoClean(sub, 0.3, subGain);
            }, i * 120);
        }

        // 2. 最後にトドメの超巨大爆発（叫び声がしっかり聴こえた後に炸裂させる）
        setTimeout(() => {
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            if (this.noiseBuffer) {
                const noise = this.ctx.createBufferSource();
                noise.buffer = this.noiseBuffer;
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(520, now);
                filter.frequency.exponentialRampToValueAtTime(40, now + 1.1);

                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0.48, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(this.seGain);
                noise.start(now);
            }
            const boom = this.ctx.createOscillator();
            const boomGain = this.ctx.createGain();
            boom.type = 'sine';
            boom.frequency.setValueAtTime(90, now);
            boom.frequency.exponentialRampToValueAtTime(25, now + 1.0);
            boomGain.gain.setValueAtTime(0.45, now);
            boomGain.gain.linearRampToValueAtTime(0.001, now + 1.0);
            boom.connect(boomGain);
            boomGain.connect(this.seGain);
            boom.start(now);
            boom.stop(now + 1.0);
            this.autoClean(boom, 1.0, boomGain);
        }, 1250);
    }

    // 物理モデル（LF声門パルス＋Klatt 4段直列カスケード声道共鳴＋声帯の苦悶かすれ・K.O.エコー）による断末魔PCMバッファ生成
    getBossScreamBuffer() {
        if (!this.ctx) return null;
        if (this._bossScreamBuffer) return this._bossScreamBuffer;

        const sr = this.ctx.sampleRate || 44100;
        const totalDur = 3.80;
        const voiceDur = 1.48;
        const len = Math.floor(sr * totalDur);
        const buf = this.ctx.createBuffer(1, len, sr);
        const out = buf.getChannelData(0);
        const dry = new Float32Array(len);

        // 2レイヤーの声道（メイン声道＋わずかにデチューンした厚みレイヤー）を合成して圧倒的な肉声の迫力を出す
        const voices = [
            { pitchMult: 1.000, formantMult: 1.00, gain: 0.72 },
            { pitchMult: 0.986, formantMult: 0.98, gain: 0.42 }
        ];

        for (let v = 0; v < voices.length; v++) {
            const vm = voices[v];
            let phase = 0;
            let cycleCount = 0;
            let jitterVal = 0;

            // 直列4段カスケード・フォルマント共鳴器の内部状態 (y[n-1], y[n-2])
            let y1_1 = 0, y1_2 = 0;
            let y2_1 = 0, y2_2 = 0;
            let y3_1 = 0, y3_2 = 0;
            let y4_1 = 0, y4_2 = 0;
            let prevGlottal = 0;

            const voiceSamples = Math.floor(sr * voiceDur);
            for (let i = 0; i < voiceSamples; i++) {
                const t = i / sr;

                // --- 1. 断末魔のピッチ推移 F0(t) ---
                // 0.00〜0.09s: 「ウッ」(210Hz -> 260Hz)
                // 0.09〜0.16s: 「ワァァーー！！」(一気に350Hzの悲鳴ピークへ跳ね上がる！)
                // 0.16〜0.78s: 苦悶の絶叫維持 (350Hz -> 285Hz)
                // 0.78〜1.48s: 力尽きて声が裏返りながら急降下 (285Hz -> 108Hz)
                let f0;
                if (t < 0.09) {
                    f0 = 210 + (t / 0.09) * 50;
                } else if (t < 0.16) {
                    const p = (t - 0.09) / 0.07;
                    f0 = 260 + p * 92;
                } else if (t < 0.78) {
                    const p = (t - 0.16) / 0.62;
                    f0 = 352 - p * 68;
                } else {
                    const p = (t - 0.78) / (voiceDur - 0.78);
                    // 断末魔の苦悶で声がガクッと落ちていく曲線
                    f0 = 284 * Math.pow(108 / 284, Math.pow(p, 0.85));
                }

                // 苦悶の激しいビブラート（6.8Hz）＋声帯の 미세なランダム揺らぎ（Jitter）
                const vibDepth = (t > 0.12) ? (11.5 + Math.sin(t * 9.0) * 3.5) : 4.0;
                const vib = Math.sin(2 * Math.PI * 6.8 * t) * vibDepth;
                // 崩れ落ちる瞬間の声の震え（0.75〜1.15s）
                const agonyTremor = (t > 0.72 && t < 1.25) ? Math.sin(2 * Math.PI * 19.0 * t) * 9.0 : 0;

                const instFreq = Math.max(75, (f0 + vib + agonyTremor) * vm.pitchMult * (1 + jitterVal));
                phase += instFreq / sr;
                if (phase >= 1.0) {
                    phase -= 1.0;
                    cycleCount++;
                    // 周期ごとに微小なピッチ揺らぎを更新（電子音感を完全に消す人間の声帯特性）
                    jitterVal = (Math.random() * 2 - 1) * 0.009;
                }

                // --- 2. LF声門パルスモデル（人間の声帯の開閉と断末魔の喉の張り詰めた声質） ---
                const Oq = 0.50; // 声門開放率
                let glottalFlow = 0;
                if (phase < Oq) {
                    const u = phase / Oq;
                    // 非対称声門パルス（急峻な声門閉鎖が人間の叫び声特有の鋭い声圧を生む）
                    glottalFlow = Math.sin(Math.PI * u) - 0.42 * Math.sin(2 * Math.PI * u);
                    // 声門が開いている瞬間だけ混じる「必死の息づかい・かすれ声」成分
                    const aspiration = (Math.random() * 2 - 1) * 0.16 * Math.sin(Math.PI * u);
                    glottalFlow += aspiration;
                } else {
                    // 閉鎖期のわずかな残響減衰
                    const c = (phase - Oq) / (1 - Oq);
                    glottalFlow = -0.08 * Math.exp(-c * 6.0);
                }

                // 声門流量の微分（唇・声道励起信号）＋胸声の基本波成分ブレンド
                let excitation = (glottalFlow - prevGlottal) * 0.65 + glottalFlow * 0.45;
                prevGlottal = glottalFlow;

                // 絶叫時の喉の張り裂けるようなサブハーモニック（周期交互の微細な強弱＝人間の悲鳴特有のガラつき）
                const diplophonia = (cycleCount % 2 === 0) ? 1.0 : 0.84;
                excitation *= diplophonia;

                // --- 3. 母音推移「ウ (/u/)」→「ワァァァーー！！ (/waaaa/)」→「アァ… (/a->o/)」 ---
                let F1, F2, F3, F4;
                if (t < 0.08) {
                    // 「ウ」
                    const p = t / 0.08;
                    F1 = 350 + p * 70;
                    F2 = 760 + p * 90;
                    F3 = 2320 + p * 80;
                    F4 = 3320;
                } else if (t < 0.15) {
                    // 「ワ！」（顎がガッと開いて母音 /a/ へ急拡大）
                    const p = (t - 0.08) / 0.07;
                    F1 = 420 + p * 480; // -> 900Hz
                    F2 = 850 + p * 560; // -> 1410Hz
                    F3 = 2400 + p * 360; // -> 2760Hz
                    F4 = 3320 + p * 180; // -> 3500Hz
                } else if (t < 0.82) {
                    // 「ァァァーー！！」（大開口の悲鳴ピーク＋顎の苦悶の震え）
                    const p = (t - 0.15) / 0.67;
                    const jawTremor = Math.sin(2 * Math.PI * 7.2 * t) * 28;
                    F1 = 900 - p * 70 + jawTremor;
                    F2 = 1410 - p * 110 + jawTremor * 1.4;
                    F3 = 2760 - p * 120;
                    F4 = 3500 - p * 80;
                } else {
                    // 「ーーーッ…」（力尽きて口が閉じていく断末魔の余韻）
                    const p = (t - 0.82) / (voiceDur - 0.82);
                    F1 = 830 - p * 340;
                    F2 = 1300 - p * 380;
                    F3 = 2640 - p * 260;
                    F4 = 3420 - p * 200;
                }

                F1 *= vm.formantMult;
                F2 *= vm.formantMult;
                F3 *= vm.formantMult;
                F4 *= vm.formantMult;

                // --- 4. Klatt 4段直列（カスケード）声道デジタル共鳴器 ---
                // Stage 1 (F1, BW1=68Hz)
                const r1 = Math.exp(-Math.PI * 68 / sr);
                const a1_1 = 2 * r1 * Math.cos(2 * Math.PI * F1 / sr);
                const a1_2 = -r1 * r1;
                const b1_0 = 1 - a1_1 - a1_2;
                const s1 = b1_0 * excitation + a1_1 * y1_1 + a1_2 * y1_2;
                y1_2 = y1_1; y1_1 = s1;

                // Stage 2 (F2, BW2=98Hz)
                const r2 = Math.exp(-Math.PI * 98 / sr);
                const a2_1 = 2 * r2 * Math.cos(2 * Math.PI * F2 / sr);
                const a2_2 = -r2 * r2;
                const b2_0 = 1 - a2_1 - a2_2;
                const s2 = b2_0 * s1 + a2_1 * y2_1 + a2_2 * y2_2;
                y2_2 = y2_1; y2_1 = s2;

                // Stage 3 (F3, BW3=155Hz)
                const r3 = Math.exp(-Math.PI * 155 / sr);
                const a3_1 = 2 * r3 * Math.cos(2 * Math.PI * F3 / sr);
                const a3_2 = -r3 * r3;
                const b3_0 = 1 - a3_1 - a3_2;
                const s3 = b3_0 * s2 + a3_1 * y3_1 + a3_2 * y3_2;
                y3_2 = y3_1; y3_1 = s3;

                // Stage 4 (F4, BW4=220Hz)
                const r4 = Math.exp(-Math.PI * 220 / sr);
                const a4_1 = 2 * r4 * Math.cos(2 * Math.PI * F4 / sr);
                const a4_2 = -r4 * r4;
                const b4_0 = 1 - a4_1 - a4_2;
                const s4 = b4_0 * s3 + a4_1 * y4_1 + a4_2 * y4_2;
                y4_2 = y4_1; y4_1 = s4;

                // --- 5. 音量エンベロープ（0秒から即座に立ち上がり、断末魔の2段のうねりを作る） ---
                let env = 1.0;
                if (t < 0.012) {
                    env = t / 0.012;
                } else if (t < 0.085) {
                    // 「ウ」から「ワ」の瞬間にわずかな子音くびれを入れて「ウ・ワ」の二音節を鮮明化
                    env = 0.88 + 0.12 * Math.sin(Math.PI * (t - 0.012) / 0.073);
                } else if (t < 0.72) {
                    env = 1.0;
                } else if (t < 0.80) {
                    // 断末魔の息継ぎ・声の裏返りアクセント
                    env = 0.78 + 0.22 * Math.cos(Math.PI * (t - 0.72) / 0.08);
                } else {
                    const p = (t - 0.80) / (voiceDur - 0.80);
                    env = Math.pow(1.0 - p, 1.45);
                }

                // カスケード出力＋第1・第2フォルマントの肉声ボディ補強
                const sample = (s4 * 1.4 + s2 * 0.75 + s1 * 0.35) * env * vm.gain;
                dry[i] += sample;
            }
        }

        // --- 6. 極端に響き渡る大宇宙要塞K.O.ロングエコー（「ウワァァーー！！ …ワァァーー！！ …ワァァーー… …ァァーー… …ァァ…」） ---
        // 原音(dry)をまずピーク正規化して声自体の密度・音圧を最大化
        let dryPeak = 0.001;
        for (let i = 0; i < len; i++) {
            const a = Math.abs(dry[i]);
            if (a > dryPeak) dryPeak = a;
        }
        const dryNorm = 1.0 / dryPeak;
        for (let i = 0; i < len; i++) {
            // 原音の声質を保ったまま太く濃密にブースト
            dry[i] = Math.tanh(dry[i] * dryNorm * 2.2) / Math.tanh(2.2);
        }

        // 8段の強烈なK.O.スタジアムエコー＋空間反射タップ（3.8秒間にわたり極端にこだまする！）
        const echoTaps = [
            { delay: 0.24, gain: 0.85 },
            { delay: 0.48, gain: 0.72 },
            { delay: 0.72, gain: 0.60 },
            { delay: 0.96, gain: 0.48 },
            { delay: 1.20, gain: 0.38 },
            { delay: 1.44, gain: 0.28 },
            { delay: 1.68, gain: 0.20 },
            { delay: 1.92, gain: 0.14 },
            { delay: 2.16, gain: 0.09 },
            // 大聖堂・要塞内部の密な空間リバーブ反射
            { delay: 0.11, gain: 0.32 },
            { delay: 0.35, gain: 0.30 },
            { delay: 0.59, gain: 0.25 },
            { delay: 0.83, gain: 0.20 },
            { delay: 1.07, gain: 0.15 }
        ];

        for (let i = 0; i < len; i++) {
            let v = dry[i] * 1.35; // 原音アタックも強力に
            for (let t = 0; t < echoTaps.length; t++) {
                const dSamples = Math.floor(echoTaps[t].delay * sr);
                if (i >= dSamples) {
                    v += dry[i - dSamples] * echoTaps[t].gain;
                }
            }
            out[i] = v;
        }

        // --- 7. 3倍の音圧感を生むクリーン・ラウドネスマキシマイズ（音割れノイズを出さずに声量を極限まで引き上げる） ---
        let maxPeak = 0.001;
        for (let i = 0; i < len; i++) {
            const a = Math.abs(out[i]);
            if (a > maxPeak) maxPeak = a;
        }
        const normGain = 0.98 / maxPeak;
        const drive = 2.6;
        const tanhNorm = Math.tanh(drive);
        for (let i = 0; i < len; i++) {
            const x = out[i] * normGain;
            out[i] = (Math.tanh(x * drive) / tanhNorm) * 0.98;
        }

        this._bossScreamBuffer = buf;
        return buf;
    }

    // ボス撃破時の断末魔の絶叫: 3倍の大声量＋極端に響き渡るロングエコーで「ウワァァァーー！！」を轟かせる
    playBossScream() {
        this.screamCount = (this.screamCount || 0) + 1;
        this.lastScreamText = 'ウワーーーー！';
        this._lastScreamTime = Date.now();
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }

        if (!this.initialized || this.isMuted || !this.ctx) return;
        const now = this.ctx.currentTime;
        const screamBuf = this.getBossScreamBuffer();
        if (!screamBuf) return;

        const src = this.ctx.createBufferSource();
        src.buffer = screamBuf;

        // 人間の声の帯域（600Hz〜2400Hz）を分厚く押し出す2段プレゼンス＆ボディブースト
        const bodyBoost = this.ctx.createBiquadFilter();
        bodyBoost.type = 'peaking';
        bodyBoost.frequency.setValueAtTime(750, now);
        bodyBoost.Q.setValueAtTime(0.85, now);
        bodyBoost.gain.setValueAtTime(6.5, now);

        const presence = this.ctx.createBiquadFilter();
        presence.type = 'peaking';
        presence.frequency.setValueAtTime(1350, now);
        presence.Q.setValueAtTime(0.95, now);
        presence.gain.setValueAtTime(7.5, now);

        // さらに外部フィードバック・ディレイ回路を重ねてエコーを極端に響かせる！
        const extDelay = this.ctx.createDelay(1.0);
        extDelay.delayTime.setValueAtTime(0.24, now);
        const extFeedback = this.ctx.createGain();
        extFeedback.gain.setValueAtTime(0.62, now);
        const extFilter = this.ctx.createBiquadFilter();
        extFilter.type = 'lowpass';
        extFilter.frequency.setValueAtTime(2800, now);
        const extWet = this.ctx.createGain();
        extWet.gain.setValueAtTime(0.85, now);

        extDelay.connect(extFilter);
        extFilter.connect(extFeedback);
        extFeedback.connect(extDelay);
        extFilter.connect(extWet);

        // 音割れを防ぎつつ従来の3倍の体感音量を実現するマキシマイズ出力段
        const limiter = this.ctx.createDynamicsCompressor();
        limiter.threshold.setValueAtTime(-3.0, now);
        limiter.knee.setValueAtTime(4.0, now);
        limiter.ratio.setValueAtTime(12.0, now);
        limiter.attack.setValueAtTime(0.001, now);
        limiter.release.setValueAtTime(0.06, now);

        const outGain = this.ctx.createGain();
        outGain.gain.setValueAtTime(5.2, now); // 従来の約3倍の大音量ゲイン！

        src.connect(bodyBoost);
        bodyBoost.connect(presence);
        presence.connect(limiter);
        presence.connect(extDelay);
        extWet.connect(limiter);
        limiter.connect(outGain);
        outGain.connect(this.ctx.destination);

        // 叫び声とロングエコーが響き渡る間、BGMを完全ミュートして断末魔を最前面に際立たせる
        if (this.bgmGain) {
            try {
                this.bgmGain.gain.cancelScheduledValues(now);
                this.bgmGain.gain.setValueAtTime(0.0, now);
                this.bgmGain.gain.setValueAtTime(0.0, now + 3.2);
                this.bgmGain.gain.linearRampToValueAtTime(0.70, now + 3.9);
            } catch (e) {}
        }

        src.start(now);
        this.autoClean(src, 4.0, bodyBoost, presence, extDelay, extFeedback, extFilter, extWet, limiter, outGain);
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
        if (this.bgmGain && this.ctx) {
            try {
                this.bgmGain.gain.cancelScheduledValues(this.ctx.currentTime);
                this.bgmGain.gain.setValueAtTime(0, this.ctx.currentTime);
                this.bgmGain.gain.setValueAtTime(0.70, this.ctx.currentTime + 0.05);
            } catch (e) {}
        }
    }

    // 高精度 Lookahead オーディオスケジューラー (タイミングのズレがゼロ)
    startScheduler(bpm, totalSteps, scheduleCallback) {
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
        this.init();

        const stepDuration = (60 / bpm) / 4; // 16分音符の長さ(秒)
        let currentStep = 0;
        let nextStepTime = 0;
        let isStarted = false;

        const startFromZero = () => {
            if (!this.ctx) return;
            currentStep = 0;
            // 最初の瞬間（わずか0.01秒後）から即座に発音開始！
            nextStepTime = this.ctx.currentTime + 0.01;
            isStarted = true;
        };

        if (this.ctx && this.ctx.state === 'running') {
            startFromZero();
        }

        this.bgmTimer = setInterval(() => {
            if (!this.initialized || this.isMuted || !this.ctx) return;

            // コンテキストがsuspended（ブラウザの自動再生ブロック中）の間は
            // ステップを進めず一時停止して待機（Step 0が空振りするのを完全に防止！）
            if (this.ctx.state === 'suspended') {
                isStarted = false;
                return;
            }

            // アンロックされた最初のTickで必ずStep 0から開始！
            if (!isStarted) {
                startFromZero();
            }

            // アンダーラン（音飛び・途切れ）防止リカバリー:
            // 描画やパーティクル処理でタイマーが遅延した場合、nextStepTimeが過去になっていたら現在時刻直後に補正
            if (nextStepTime < this.ctx.currentTime) {
                nextStepTime = this.ctx.currentTime + 0.01;
            }

            // 先読みウィンドウ（260ms）
            while (nextStepTime < this.ctx.currentTime + 0.15) {
                try {
                    scheduleCallback(currentStep, nextStepTime, stepDuration);
                } catch (e) {
                    console.error('BGM schedule error at step ' + currentStep, e);
                }
                currentStep = (currentStep + 1) % totalSteps;
                nextStepTime += stepDuration;
            }
        }, 35);
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

        let vib = null, vibGain = null;
        // ロングトーンには伸びやかなビブラートを付与
        if (dur > 0.22) {
            vib = this.ctx.createOscillator();
            vibGain = this.ctx.createGain();
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
        this.autoClean(osc, dur, gain, vib, vibGain);
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
        this.autoClean(osc, dur, gain);
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
        this.autoClean(osc, dur, gain);
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
        this.autoClean(osc1, dur, osc2, filter, gain);
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
        this.autoClean(osc1, dur, osc2, filter, gain);
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

        let vib = null, vibGain = null;
        // ロングトーンには激しく熱いギタービブラート (6.5Hz)
        if (dur > 0.20) {
            vib = this.ctx.createOscillator();
            vibGain = this.ctx.createGain();
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
        let dist = null;
        if (this.distortionCurve) {
            dist = this.ctx.createWaveShaper();
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
        this.autoClean(osc, dur, gain, filter, dist, vib, vibGain);
    }

    // ディストーション・パワーコード (ルート + 完全5度)
    triggerPowerChord(rootMidi, time, dur, gainVal = 0.24) {
        this.triggerGuitar(rootMidi, time, dur, gainVal * 0.8);
        this.triggerGuitar(rootMidi + 7, time, dur, gainVal * 0.65);
    }

    // 不協和音クラスター・スタブ (短2度・減5度トライトーン・長7度の凶悪な衝突和音)
    triggerDissonantCluster(notesArray, time, dur, gainVal = 0.22) {
        if (!notesArray || !notesArray.length) return;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1650, time);
        filter.Q.setValueAtTime(1.1, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(gainVal, time + 0.004);
        gain.gain.setValueAtTime(gainVal * 0.88, time + dur * 0.65);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        let dist = null;
        if (this.distortionCurve) {
            dist = this.ctx.createWaveShaper();
            dist.curve = this.distortionCurve;
            dist.oversample = 'none';
            filter.connect(dist);
            dist.connect(gain);
        } else {
            filter.connect(gain);
        }
        gain.connect(this.bgmGain);
        if (this.delaySend) gain.connect(this.delaySend);

        const oscs = [];
        for (let i = 0; i < notesArray.length; i++) {
            const freq = this.m2f(notesArray[i]);
            if (freq <= 0) continue;
            const osc = this.ctx.createOscillator();
            osc.type = (i % 2 === 0) ? 'sawtooth' : 'square';
            // わずかな不気味デチューンでうねりと不協和音感を増幅
            const detuneHz = (i % 2 === 0) ? 1.8 : -2.1;
            osc.frequency.setValueAtTime(freq + detuneHz, time);
            osc.connect(filter);
            osc.start(time);
            osc.stop(time + dur);
            oscs.push(osc);
        }
        if (oscs.length > 0) {
            this.autoClean(oscs[0], dur, ...oscs.slice(1), filter, dist, gain);
        }
    }

    // 重低音アナログ＆FMハイブリッド・ドライブベース (サブベース正弦波 + レゾナントSawtoothグロウ + スラップアタックパルス)
    // お腹の底にズシン！と響く極太の低音と歯切れ良いアタックを両立
    triggerBass(midi, time, dur, gainVal = 0.48) {
        const freq = this.m2f(midi);
        if (freq <= 0) return;

        const targetBus = this.rhythmBus || this.bgmGain;
        const masterBassGain = this.ctx.createGain();

        // 1. お腹の底を揺らす重低音サブベースレイヤー (Sine波)
        // G2(98Hz)以上の高音ベースノートの時は自動的に1オクターブ下のサブベース(49Hz〜)をユニゾン補強し、常に腹に響く重低音感を持続！
        const oscSub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        oscSub.type = 'sine';
        const subFreq = (freq > 95) ? (freq * 0.5) : freq;
        // 弦を弾いた瞬間の微細なピッチアタック（1.28倍→基本周波数）でゴリッとした塊感を出す
        oscSub.frequency.setValueAtTime(subFreq * 1.28, time);
        oscSub.frequency.exponentialRampToValueAtTime(subFreq, time + 0.018);
        subGain.gain.setValueAtTime(0.88, time);

        // 2. 唸るアナログ・シンセベース／エレキベース・ボディレイヤー (Sawtooth + レゾナントLPFエンベロープ)
        const oscSaw = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const sawGain = this.ctx.createGain();
        oscSaw.type = 'sawtooth';
        oscSaw.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        const peakCutoff = Math.min(3400, Math.max(520, freq * 11.0));
        const sustainCutoff = Math.max(190, freq * 3.4);
        filter.frequency.setValueAtTime(peakCutoff, time);
        filter.frequency.exponentialRampToValueAtTime(sustainCutoff, time + Math.min(0.085, dur * 0.75));
        filter.Q.setValueAtTime(3.5, time); // ブリッとした気持ちいいベースレゾナンス
        sawGain.gain.setValueAtTime(0.68, time);

        // 3. ピック／スラップのアタックバイト成分 (25%パルス波倍音)
        const oscPulse = this.ctx.createOscillator();
        const pulseGain = this.ctx.createGain();
        if (this.pulseWave25) oscPulse.setPeriodicWave(this.pulseWave25);
        else oscPulse.type = 'square';
        oscPulse.frequency.setValueAtTime(freq * 2, time);
        pulseGain.gain.setValueAtTime(0.24, time);
        pulseGain.gain.exponentialRampToValueAtTime(0.03, time + Math.min(0.06, dur * 0.7));

        oscSub.connect(subGain);
        subGain.connect(masterBassGain);

        oscSaw.connect(filter);
        filter.connect(sawGain);
        sawGain.connect(masterBassGain);

        oscPulse.connect(pulseGain);
        pulseGain.connect(masterBassGain);

        // 音圧が途中で痩せないファットなエンベロープ
        const boostedGain = gainVal * 1.25;
        masterBassGain.gain.setValueAtTime(0, time);
        masterBassGain.gain.linearRampToValueAtTime(boostedGain, time + 0.003);
        masterBassGain.gain.setValueAtTime(boostedGain * 0.90, time + Math.max(0.006, dur - 0.014));
        masterBassGain.gain.linearRampToValueAtTime(0.005, time + dur);

        masterBassGain.connect(targetBus);

        oscSub.start(time);
        oscSub.stop(time + dur);
        oscSaw.start(time);
        oscSaw.stop(time + dur);
        oscPulse.start(time);
        oscPulse.stop(time + dur);
        this.autoClean(oscSub, dur, oscSaw, oscPulse, filter, subGain, sawGain, pulseGain, masterBassGain);
    }

    // ドラム: お腹の底にズシン！！と響く超重低音・高音圧バスドラム（キック）
    // (3段ピッチエンベロープ正弦波 + チェストパンチ三角波 + ビーターアタッククリック)
    triggerKick(time, gainVal = 0.65) {
        const targetBus = this.rhythmBus || this.bgmGain;
        const dur = 0.165;

        // 1. メイン・サブベース胴鳴り (Sine波: 360Hzスナップ -> 115Hz胸アタック -> 52Hz腹落ち -> 33Hz重低音)
        const oscSub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        oscSub.type = 'sine';
        oscSub.frequency.setValueAtTime(360, time);
        oscSub.frequency.exponentialRampToValueAtTime(115, time + 0.014);
        oscSub.frequency.exponentialRampToValueAtTime(52, time + 0.065);
        oscSub.frequency.exponentialRampToValueAtTime(33, time + dur);

        // 50〜90Hzの「お腹に響く帯域」で音量をしっかりホールドしてから減衰させるのが重低音キックの秘訣！
        const kGain = gainVal * 1.28;
        subGain.gain.setValueAtTime(kGain, time);
        subGain.gain.setValueAtTime(kGain * 0.94, time + 0.055);
        subGain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        // 2. ローミッドの押し出し・チェストパンチレイヤー (Triangle波)
        const oscPunch = this.ctx.createOscillator();
        const punchGain = this.ctx.createGain();
        oscPunch.type = 'triangle';
        oscPunch.frequency.setValueAtTime(220, time);
        oscPunch.frequency.exponentialRampToValueAtTime(56, time + 0.055);
        punchGain.gain.setValueAtTime(gainVal * 0.62, time);
        punchGain.gain.exponentialRampToValueAtTime(0.001, time + 0.065);

        // 3. バスドラ・ビーターアタック（皮を叩く「ドッ！」の鮮明な輪郭）
        let click = null, clickFilter = null, clickGain = null;
        if (this.noiseBuffer) {
            click = this.ctx.createBufferSource();
            click.buffer = this.noiseBuffer;
            clickFilter = this.ctx.createBiquadFilter();
            clickFilter.type = 'lowpass';
            clickFilter.frequency.setValueAtTime(1900, time);
            clickGain = this.ctx.createGain();
            clickGain.gain.setValueAtTime(gainVal * 0.55, time);
            clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.018);
            click.connect(clickFilter);
            clickFilter.connect(clickGain);
            clickGain.connect(targetBus);
            click.start(time);
            click.stop(time + 0.018);
        }

        oscSub.connect(subGain);
        subGain.connect(targetBus);
        oscPunch.connect(punchGain);
        punchGain.connect(targetBus);

        oscSub.start(time);
        oscSub.stop(time + dur);
        oscPunch.start(time);
        oscPunch.stop(time + 0.065);
        this.autoClean(oscSub, dur, subGain, oscPunch, punchGain, click, clickFilter, clickGain);
    }

    // ドラム: 腹に響く太い胴鳴り＋鮮烈なスナッピーの爆音ロック・スネア
    triggerSnare(time, gainVal = 0.46) {
        if (!this.noiseBuffer) return;
        const targetBus = this.rhythmBus || this.bgmGain;
        const sGain = gainVal * 1.25;

        // 1. ワイドレンジ・ファットスナッピーノイズ (250Hz以下のみカット＋1300Hzアタックピーク強調)
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const hpFilter = this.ctx.createBiquadFilter();
        hpFilter.type = 'highpass';
        hpFilter.frequency.setValueAtTime(240, time);

        const bodyPeak = this.ctx.createBiquadFilter();
        bodyPeak.type = 'peaking';
        bodyPeak.frequency.setValueAtTime(1300, time);
        bodyPeak.Q.setValueAtTime(1.1, time);
        bodyPeak.gain.setValueAtTime(5.5, time);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(sGain, time);
        noiseGain.gain.setValueAtTime(sGain * 0.85, time + 0.025);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.165);

        // 2. お腹に響くスネアの太いシェル胴鳴りトーン (2階層のTriangle + Sine)
        const osc1 = this.ctx.createOscillator();
        const osc1Gain = this.ctx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(265, time);
        osc1.frequency.exponentialRampToValueAtTime(110, time + 0.075);
        osc1Gain.gain.setValueAtTime(sGain * 0.95, time);
        osc1Gain.gain.setValueAtTime(sGain * 0.80, time + 0.025);
        osc1Gain.gain.exponentialRampToValueAtTime(0.001, time + 0.085);

        const osc2 = this.ctx.createOscillator();
        const osc2Gain = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(175, time);
        osc2.frequency.exponentialRampToValueAtTime(68, time + 0.07);
        osc2Gain.gain.setValueAtTime(sGain * 0.72, time);
        osc2Gain.gain.exponentialRampToValueAtTime(0.001, time + 0.075);

        osc1.connect(osc1Gain);
        osc1Gain.connect(targetBus);
        osc2.connect(osc2Gain);
        osc2Gain.connect(targetBus);

        noise.connect(hpFilter);
        hpFilter.connect(bodyPeak);
        bodyPeak.connect(noiseGain);
        noiseGain.connect(targetBus);

        osc1.start(time);
        osc1.stop(time + 0.085);
        osc2.start(time);
        osc2.stop(time + 0.075);
        noise.start(time);
        noise.stop(time + 0.165);
        this.autoClean(noise, 0.165, hpFilter, bodyPeak, noiseGain, osc1, osc1Gain, osc2, osc2Gain);
    }

    // ボス戦専用・強靭な金属インダストリアル・リムショット／アンビル打撃パーカッション
    // (非整数倍の不協和金属クランク音 + 高圧リムショットノイズ + 重低音ボディ)
    triggerIndustrialPerc(time, pitchMult = 1.0, gainVal = 0.48) {
        const targetBus = this.rhythmBus || this.bgmGain;
        const dur = 0.095;

        // トライトーン（減5度・非調和比 1 : 1.414 : 2.09）の金属打撃オシレーター
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const clankFilter = this.ctx.createBiquadFilter();
        const clankGain = this.ctx.createGain();

        osc1.type = 'square';
        osc2.type = 'sawtooth';
        const baseF = 540 * pitchMult;
        osc1.frequency.setValueAtTime(baseF, time);
        osc1.frequency.exponentialRampToValueAtTime(baseF * 0.42, time + dur);
        osc2.frequency.setValueAtTime(baseF * 1.414, time); // トライトーン金属干渉
        osc2.frequency.exponentialRampToValueAtTime(baseF * 0.60, time + dur);

        clankFilter.type = 'bandpass';
        clankFilter.frequency.setValueAtTime(2100 * pitchMult, time);
        clankFilter.Q.setValueAtTime(2.8, time);

        clankGain.gain.setValueAtTime(gainVal * 0.85, time);
        clankGain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc1.connect(clankFilter);
        osc2.connect(clankFilter);
        clankFilter.connect(clankGain);
        clankGain.connect(targetBus);

        // 重低音パンチ（打撃の重み）
        const punchOsc = this.ctx.createOscillator();
        const punchGain = this.ctx.createGain();
        punchOsc.type = 'sine';
        punchOsc.frequency.setValueAtTime(240 * pitchMult, time);
        punchOsc.frequency.exponentialRampToValueAtTime(58, time + 0.06);
        punchGain.gain.setValueAtTime(gainVal * 0.90, time);
        punchGain.gain.exponentialRampToValueAtTime(0.001, time + 0.065);
        punchOsc.connect(punchGain);
        punchGain.connect(targetBus);

        // 鋭いリムショットノイズ
        let nSrc = null, nFilter = null, nGain = null;
        if (this.noiseBuffer) {
            nSrc = this.ctx.createBufferSource();
            nSrc.buffer = this.noiseBuffer;
            nFilter = this.ctx.createBiquadFilter();
            nFilter.type = 'bandpass';
            nFilter.frequency.setValueAtTime(3200, time);
            nFilter.Q.setValueAtTime(1.5, time);
            nGain = this.ctx.createGain();
            nGain.gain.setValueAtTime(gainVal * 0.75, time);
            nGain.gain.exponentialRampToValueAtTime(0.001, time + 0.055);
            nSrc.connect(nFilter);
            nFilter.connect(nGain);
            nGain.connect(targetBus);
            nSrc.start(time);
            nSrc.stop(time + 0.055);
        }

        osc1.start(time);
        osc1.stop(time + dur);
        osc2.start(time);
        osc2.stop(time + dur);
        punchOsc.start(time);
        punchOsc.stop(time + 0.065);
        this.autoClean(osc1, dur, osc2, clankFilter, clankGain, punchOsc, punchGain, nSrc, nFilter, nGain);
    }

    // ドラム: ハイハット (クローズ / オープン) - 切れ味と存在感を強化
    triggerHiHat(time, isOpen = false, gainMult = 1.0) {
        if (!this.noiseBuffer) return;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(6800, time);

        const gain = this.ctx.createGain();
        const dur = isOpen ? 0.12 : 0.04;
        const baseG = (isOpen ? 0.24 : 0.15) * gainMult;
        gain.gain.setValueAtTime(baseG, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);

        noise.start(time);
        noise.stop(time + dur);
        this.autoClean(noise, dur, filter, gain);
    }

    // triggerHiHatのエイリアス
    triggerHat(time, isOpen = false) {
        this.triggerHiHat(time, isOpen);
    }

    // オーケストラ打楽器: ティンパニ (重低音・音程感のある地鳴り轟音)
    triggerTimpani(midi, time, dur = 0.45, gainVal = 0.58) {
        const freq = this.m2f(midi || 38);
        if (freq <= 0) return;

        const targetBus = this.rhythmBus || this.bgmGain;
        const tGain = gainVal * 1.25;

        const osc = this.ctx.createOscillator();
        const oscSub = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * 1.85, time);
        osc.frequency.exponentialRampToValueAtTime(freq, time + 0.045);

        // 釜の重低音胴鳴り倍音
        oscSub.type = 'triangle';
        const lowFreq = (freq > 80) ? freq * 0.5 : freq;
        oscSub.frequency.setValueAtTime(lowFreq * 1.4, time);
        oscSub.frequency.exponentialRampToValueAtTime(lowFreq, time + 0.04);

        const subG = this.ctx.createGain();
        subG.gain.setValueAtTime(0.55, time);
        oscSub.connect(subG);
        subG.connect(gain);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(tGain, time + 0.005);
        gain.gain.setValueAtTime(tGain * 0.85, time + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        let hit = null, hitFilter = null, hitGain = null;
        // マレット打撃の強烈なインパクト
        if (this.noiseBuffer) {
            hit = this.ctx.createBufferSource();
            hit.buffer = this.noiseBuffer;
            hitFilter = this.ctx.createBiquadFilter();
            hitFilter.type = 'lowpass';
            hitFilter.frequency.setValueAtTime(680, time);
            hitGain = this.ctx.createGain();
            hitGain.gain.setValueAtTime(tGain * 0.75, time);
            hitGain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
            hit.connect(hitFilter);
            hitFilter.connect(hitGain);
            hitGain.connect(targetBus);
            hit.start(time);
            hit.stop(time + 0.045);
        }

        osc.connect(gain);
        gain.connect(targetBus);

        osc.start(time);
        osc.stop(time + dur);
        oscSub.start(time);
        oscSub.stop(time + dur);
        this.autoClean(osc, dur, oscSub, subG, gain, hit, hitFilter, hitGain);
    }

    // オーケストラ打楽器: クラッシュ大シンバル (バシャァァァン！！)
    triggerCymbal(time, gainVal = 0.44) {
        if (!this.noiseBuffer) return;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(7600, time);
        filter.Q.setValueAtTime(0.75, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(gainVal, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.95);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);
        if (this.delaySend) gain.connect(this.delaySend);

        noise.start(time);
        noise.stop(time + 0.95);
        this.autoClean(noise, 0.95, filter, gain);
    }

    // 打楽器: 重低音フロア＆ロートタム (腹に響く「ドコドコ！」タムアタック)
    triggerTom(midi, time, dur = 0.19, gainVal = 0.52) {
        const freq = this.m2f(midi);
        const targetBus = this.rhythmBus || this.bgmGain;
        const osc = this.ctx.createOscillator();
        const oscBody = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * 1.65, time);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.65, time + dur);

        oscBody.type = 'triangle';
        oscBody.frequency.setValueAtTime(freq * 1.2, time);
        oscBody.frequency.exponentialRampToValueAtTime(freq * 0.5, time + dur * 0.8);
        const bodyG = this.ctx.createGain();
        bodyG.gain.setValueAtTime(0.45, time);
        oscBody.connect(bodyG);
        bodyG.connect(gain);

        const tGain = gainVal * 1.25;
        gain.gain.setValueAtTime(tGain, time);
        gain.gain.setValueAtTime(tGain * 0.88, time + 0.035);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(gain);
        gain.connect(targetBus);

        osc.start(time);
        osc.stop(time + dur);
        oscBody.start(time);
        oscBody.stop(time + dur);
        this.autoClean(osc, dur, oscBody, bodyG, gain);
    }

    // 空中戦BGM: 『BEGINNING OF THE HISTORY』(グラディウス伝統・宇宙出撃空中戦テーマ フルオーケストラ荘厳大音量版！)
    playAirBgm(forceRestart = false) {
        if (!forceRestart && this.currentBgm === 'AIR') return;
        this.currentBgm = 'AIR';

        // テンポ 130 BPM (宇宙への出撃感あふれるシャープで勇壮な戦闘テンポ)
        const bpm = 130;
        const totalSteps = 256; // 16小節ループ (1小節=16ステップ)

        // === 1. 打楽器セクション (キック1, スネア2, ハイハット3/4, 大シンバル5, タム6/7/8) ===
        // 開幕1拍目から疾走ビートとシンバルを鳴らし、開始直後から圧倒的な迫力を演出！
        const dIntro0  = [5,3,1,3, 2,3,1,3, 1,3,1,3, 2,3,3,4]; // 開幕大シンバル＋疾走ビート！
        const dIntro1  = [1,3,3,3, 2,3,1,3, 1,3,1,3, 2,3,3,4]; // 推進力全開
        const dIntro2  = [5,3,3,3, 2,3,1,3, 1,3,1,3, 2,3,3,4]; // クラッシュアクセント
        const dIntro3  = [1,3,3,3, 2,3,3,3, 6,6,7,7, 8,8,2,5]; // タムロールフィルイン！
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
        const tInt0 = [E2,_,_,_, E2,_,_,_, E2,_,_,_, E2,_,_,_];
        const tInt1 = [E2,_,_,_, E2,_,_,_, E2,_,_,_, E2,_,_,_];
        const tInt2 = [E2,_,_,_, E2,_,_,_, E2,_,_,_, E2,_,_,_];
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

        const bInt0 = [E2,E3,E2,E3, E2,E3,E2,E3, E2,E3,E2,E3, E2,E3,E2,E3];
        const bInt1 = [E2,E3,E2,E3, E2,E3,E2,E3, E2,E3,E2,E3, E2,E3,E2,E3];
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
            // 0-3: イントロ (開幕から華々しいブラスアクセント！)
            brHit(B4), brHit(B4), brHit(G4), brFan1,
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
            // 0-3: イントロ (開幕から堂々たる宇宙出撃ファンファーレ！)
            B4,_,_,_, E5,_,_,_, G5,_,_,_, B5,_,_,_,
            A5,_,G5,_, Fs5,_,E5,_, Fs5,_,_,_, _,_,_,_,
            B4,_,_,_, E5,_,_,_, G5,_,_,_, B5,_,_,_,
            C6,_,B5,_, A5,_,G5,_, Fs5,_,_,_, Fs5,_,G5,_,

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
            // シンバル(5)の時も必ず重低音キックを同時発音し、1拍目の腹に響くアタックを強化！
            const d = drums[step];
            if (d === 1) {
                this.triggerKick(time, 0.68);
                this.triggerHiHat(time, false, 0.75);
            } else if (d === 2) {
                this.triggerSnare(time, 0.50);
                this.triggerHiHat(time, false, 0.75);
            } else if (d === 3) {
                this.triggerHiHat(time, false, 1.0);
            } else if (d === 4) {
                this.triggerHiHat(time, true, 1.05);
            } else if (d === 5) {
                this.triggerKick(time, 0.72);
                this.triggerCymbal(time, 0.46);
            } else if (d === 6) {
                this.triggerTom(A3, time, stepDur * 0.98, 0.56);
            } else if (d === 7) {
                this.triggerTom(F3, time, stepDur * 0.98, 0.56);
            } else if (d === 8) {
                this.triggerTom(D3, time, stepDur * 0.98, 0.58);
            }

            // 2. オーケストラ打楽器: ティンパニ (重低音轟音)
            const tp = timpani[step];
            if (tp > 0) {
                this.triggerTimpani(tp, time, stepDur * 2.4, 0.60);
            }

            // 3. お腹に響く重低音ドライブベース (タイトな推進力)
            const b = bass[step];
            if (b > 0) {
                this.triggerBass(b, time, stepDur * 1.45, 0.52);
            }

            // 4. Arpeggio
            const a = arp[step];
            if (a > 0) {
                this.triggerArp(a, time, stepDur * 0.85, 0.14);
            }

            // 5. Brass Accent
            const br1 = brass1[step];
            if (br1 > 0) {
                this.triggerBrass(br1, time, stepDur * 1.4, 0.18);
            }

            // 6. Arcade Lead (25% pulse)
            const l = lead[step];
            if (l > 0) {
                let lLen = 1;
                for (let k = 1; k < 16; k++) {
                    if (lead[(step + k) % totalSteps] === 0) lLen++;
                    else break;
                }
                const dur = stepDur * lLen * 0.95;
                this.triggerLead(l, time, dur, 0.36);
            }

            // 7. 金管対旋律・ハーモニー
            const h = harmony[step];
            if (h > 0) {
                let hLen = 1;
                for (let k = 1; k < 16; k++) {
                    if (harmony[(step + k) % totalSteps] === 0) hLen++;
                    else break;
                }
                this.triggerHarmony(h, time, stepDur * hLen * 0.95, 0.22);
            }
        });
    }

    // ステージBGM: 『SPACE BATTLE CRUISER (EXTENDED ROCK ORCHESTRA)』
    // 宇宙戦艦ヤマト戦闘シーンの熱き魂を受け継ぎ、テンポアップ(156BPM)＋熱狂のギターソロ＋炸裂のドラムソロを搭載した超大作！
    playStageBgm(forceRestart = false) {
        if (!forceRestart && this.currentBgm === 'STAGE') return;
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
            const isGtrSolo = (step >= 448 && step < 576);
            const isDrumSolo = (step >= 576 && step < 640);

            // お腹に響く重低音ドラム＆ドラムソロ特大ブースト！
            const kickGain  = isDrumSolo ? 1.05 : 0.68;
            const snareGain = isDrumSolo ? 0.92 : 0.50;
            const cymGain   = isDrumSolo ? 0.90 : 0.46;
            const tomGain   = isDrumSolo ? 0.96 : 0.58;

            // 1. ドラム & パーカッション (キック, スネア, ハット, 大シンバル, タム)
            const d = drums[step];
            if (d === 1) {
                this.triggerKick(time, kickGain);
                if (!isDrumSolo) this.triggerHiHat(time, false, 0.75);
            } else if (d === 2) {
                this.triggerSnare(time, snareGain);
                if (!isDrumSolo) this.triggerHiHat(time, false, 0.75);
            } else if (d === 3) {
                this.triggerHiHat(time, false, 1.0);
            } else if (d === 4) {
                this.triggerHiHat(time, true, 1.05);
            } else if (d === 5) {
                this.triggerKick(time, kickGain * 1.05);
                this.triggerCymbal(time, cymGain);
            } else if (d === 6) {
                this.triggerTom(A3, time, stepDur * 0.98, tomGain);
            } else if (d === 7) {
                this.triggerTom(F3, time, stepDur * 0.98, tomGain);
            } else if (d === 8) {
                this.triggerTom(D3, time, stepDur * 0.98, tomGain);
            }

            // 2. オーケストラ打楽器: ティンパニ (重低音轟音)
            const tp = timpani[step];
            if (tp > 0) {
                const tpGain = isDrumSolo ? 0.92 : 0.60;
                this.triggerTimpani(tp, time, stepDur * 2.2, tpGain);
            }

            // 3. お腹の底に響く重低音ベース (タイトな推進力)
            const b = bass[step];
            if (b > 0) {
                this.triggerBass(b, time, stepDur * 1.5, 0.54);
            }

            // 4. 金管ブラスセクション (ホルン・トロンボーン和音ヒット)
            // ギターソロ中はバッキングをダッキングしてギターを主役に
            const br1 = brass1[step];
            const br2 = brass2[step];
            const brGain1 = isGtrSolo ? 0.07 : 0.18;
            const brGain2 = isGtrSolo ? 0.06 : 0.15;
            if (br1 > 0) this.triggerBrass(br1, time, stepDur * 0.95, brGain1);
            if (br2 > 0) this.triggerBrass(br2, time, stepDur * 0.95, brGain2);

            // 5. 弦楽器ストリングス (オーケストラコードパッド)
            const str = strings[step];
            if (str > 0) {
                const strGain = isGtrSolo ? 0.07 : 0.16;
                this.triggerStrings(str, time, stepDur * 3.8, strGain);
            }

            // 6. 緊迫の16分アルペジオ
            const a = arp[step];
            if (a > 0) {
                this.triggerArp(a, time, stepDur * 0.88, 0.16);
            }

            // 7. エレキギター (熱狂のギターソロ ＆ ラストサビ・オブリガート！)
            const g = guitar[step];
            if (g > 0) {
                let gLen = 1;
                for (let k = 1; k < 16; k++) {
                    if (guitar[(step + k) % totalSteps] === 0) gLen++;
                    else break;
                }
                const bend = isGtrSolo ? (gtrBend[step - 448] || 0) : 0;
                const gtrGain = isGtrSolo ? 0.82 : 0.35;
                this.triggerGuitar(g, time, stepDur * gLen * 0.96, gtrGain, bend);
            }

            // 8. 金管ハーモニー (対旋律)
            const h = harmony[step];
            if (h > 0) {
                let hLen = 1;
                for (let k = 1; k < 8; k++) {
                    if (harmony[(step + k) % totalSteps] === 0) hLen++;
                    else break;
                }
                this.triggerBrass(h, time, stepDur * hLen * 0.9, 0.18);
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
                this.triggerBrass(l, time, dur, 0.25); // 金管リードの重厚な咆哮
                this.triggerLead(l, time, dur, 0.33);  // トップノートの抜け
            }
        });
    }

    // =========================================================================
    // ボス戦BGM: 『AIRCRAFT CARRIER : DISSONANT FORTRESS ASSAULT』
    // 176 BPM！強烈な不協和音（減5度トライトーン・短2度・減7度クラスター）と
    // 腹の底をえぐる爆音パーカッション群＆16分小刻み重低音スラップ／ファズベースが
    // 容赦なく刻み続ける、息もつかせぬ超緊迫・小刻みボスバトル曲！
    // =========================================================================
    playBossBgm(forceRestart = false) {
        if (!forceRestart && this.currentBgm === 'BOSS') return;
        this.currentBgm = 'BOSS';

        // テンポ 176 BPM (息もつかせぬ小刻み高速アサルトビート)
        const bpm = 176;
        const totalSteps = 256; // 全16小節ループ (1小節=16ステップ)

        // === 1. 独立マルチレイヤー・ヘヴィパーカッション (同時発音で圧倒的な打撃密度！) ===
        // (A) 重低音ツーバス＆シンコペーション・キック (1=通常重低音キック, 2=強アクセントキック)
        const kBarA = [2,1,0,1, 1,0,1,1, 2,1,0,1, 1,1,0,1]; // 小刻みに腹を殴る変則16分キック！
        const kBarB = [2,1,1,0, 1,1,0,1, 2,1,1,1, 0,1,1,1]; // 怒涛の連打キック
        const kBarC = [2,0,1,1, 2,0,1,1, 2,1,1,0, 2,1,1,1]; // ポリリズム・ストンプキック
        const kFill = [2,1,1,1, 2,1,1,1, 2,1,2,1, 2,2,2,2]; // 16分フル連打マシンガンツーバス！

        const kickTrack = [
            kBarA, kBarB, kBarA, kFill,
            kBarC, kBarB, kBarC, kFill,
            kBarA, kBarC, kBarB, kFill,
            kBarC, kBarB, kFill, kFill
        ].flat();

        // (B) 爆音スネア＆インダストリアル金属パーカッション
        // 1=爆音スネア, 2=インダストリアル金属アンビル打撃(Low), 3=インダストリアル金属打撃(High), 4=スネア+金属同時強打！
        const snBarA = [0,0,2,0, 4,0,0,3, 0,2,0,3, 4,0,2,1]; // 裏拍に食い込む金属パーカッション＋爆音スネア
        const snBarB = [0,3,0,2, 4,0,3,0, 2,0,3,0, 4,1,4,1]; // 小刻みな16分スネア＆アンビル乱打
        const snBarC = [4,0,2,3, 0,4,0,2, 3,0,4,0, 1,1,4,4]; // 変拍子風ポリリズム強打
        const snFill = [1,2,1,3, 4,1,2,3, 1,1,4,4, 4,4,4,4]; // 鼓膜と腹を揺らすパーカッション総攻撃フィル！

        const snarePercTrack = [
            snBarA, snBarB, snBarA, snFill,
            snBarC, snBarB, snBarC, snFill,
            snBarA, snBarC, snBarB, snFill,
            snBarC, snBarB, snFill, snFill
        ].flat();

        // (C) 小刻みタム＆重低音ティンパニ・インターロック (常に低音打楽器がウネりながら刻む！)
        // 1=HighTom(C4), 2=MidTom(Ab3), 3=LowTom(D3), 4=Timpani(D2), 5=Timpani(Ab1/減5度), 6=Timpani(Eb2/短2度)
        const tmBarA = [4,0,1,2, 0,5,2,3, 4,0,1,3, 5,6,3,3];
        const tmBarB = [5,0,2,3, 6,0,1,2, 5,4,2,3, 6,5,4,4];
        const tmBarC = [4,5,0,6, 4,5,0,6, 1,2,3,4, 5,6,4,5];
        const tmFill = [1,1,2,2, 3,3,4,4, 5,5,6,6, 4,5,6,4];

        const tomTimpTrack = [
            tmBarA, tmBarB, tmBarA, tmFill,
            tmBarC, tmBarB, tmBarC, tmFill,
            tmBarA, tmBarC, tmBarB, tmFill,
            tmBarC, tmBarB, tmFill, tmFill
        ].flat();

        // (D) 16分レーザーハイハット＆大クラッシュシンバル (1=CloseHat, 2=OpenHat, 3=CrashCymbal)
        const hcBarA = [3,1,2,1, 1,2,1,2, 1,1,2,1, 1,2,1,2];
        const hcBarB = [1,1,2,1, 1,2,1,2, 3,1,2,1, 2,1,2,2];
        const hcFill = [3,2,1,2, 3,2,1,2, 3,2,3,2, 3,3,3,3];

        const hatCymTrack = [
            hcBarA, hcBarB, hcBarA, hcFill,
            hcBarA, hcBarB, hcBarA, hcFill,
            hcBarA, hcBarB, hcBarA, hcFill,
            hcBarA, hcBarB, hcFill, hcFill
        ].flat();

        // === 2. お腹に響く16分小刻み・不協和音ドライブベース (休符なしで16分音符をマシンガン刻み！) ===
        // ルート(D)に対して短2度(Eb)・減5度トライトーン(Ab)・長7度(Cs)を小刻みに往復する凶悪ベースライン
        const bRiffA = [D1,D2,Eb1,Eb2, Ab1,Ab2,D1,Eb1, Ab1,A1,Eb2,D2, Ab1,G1,Fs1,Eb1];
        const bRiffB = [D1,Eb1,D2,Eb2, Ab1,A1,Ab2,G2,  Fs1,G1,Fs2,F2, E1,Eb1,Ab1,Eb1];
        const bRiffC = [Eb1,Eb2,E1,E2, A1,A2,Bb1,Bb2,  Ab1,Ab2,D2,Db2, C2,B1,Bb1,Eb1];
        const bRiffD = [D1,Ab1,Eb1,A1, D2,Ab2,Eb2,A2,  D1,Eb1,E1,F1,   Fs1,G1,Ab1,A1];
        const bRiffE = [F1,F2,Fs1,Fs2, B1,B2,C2,C3,    Bb1,B1,F2,E2,   Eb2,D2,Ab1,Eb1];
        const bRiffF = [E1,F1,Bb1,B1,  Eb1,E1,A1,Bb1,  D1,Eb1,Ab1,A1,  Db2,C2,B1,Eb1];

        const bass = [
            // 0-3: セクションA (トライトーン＆短2度マシンガン刻み)
            bRiffA, bRiffB, bRiffA, bRiffD,
            // 4-7: セクションB (半音上昇・変則オクターブ強襲)
            bRiffC, bRiffB, bRiffC, bRiffD,
            // 8-11: セクションC (高圧クロマチック・クライマックス)
            bRiffE, bRiffF, bRiffE, bRiffD,
            // 12-15: セクションD (狂乱のポリリズム・ディミニッシュ疾走)
            bRiffF, bRiffB, bRiffD, bRiffF
        ].flat();

        // === 3. 強烈な不協和音クラスター・ブラス＆ギター・小刻みスタブ ===
        // 16分音符で「ジャジャッ！ジャッ！ジャジャッ！」と鋭く切り裂く不協和音クラスター和音
        // コード1: D + Eb(短2度) + Ab(減5度) + Cs(長7度)
        // コード2: Eb + E(短2度) + A(減5度) + D(長7度)
        // コード3: F + Fs(短2度) + B(減5度) + E(長7度)
        // コード4: Ab + A(短2度) + D(減5度) + G(長7度)
        const chords = {
            1: [D3, Ab3, Cs4, Eb4],
            2: [Eb3, A3, D4, E4],
            3: [F3, B3, E4, Fs4],
            4: [Ab3, D4, G4, A4],
            5: [E3, Bb3, Eb4, F4]
        };

        const stBarA = [1,1,0,2, 0,1,2,0, 4,0,1,2, 0,4,2,1];
        const stBarB = [2,0,2,1, 0,4,1,2, 0,2,4,0, 1,2,4,2];
        const stBarC = [3,3,0,4, 0,3,4,0, 5,0,3,4, 0,5,4,3];
        const stBarD = [1,2,4,1, 2,4,1,2, 3,4,5,3, 4,5,1,4];

        const stabPattern = [
            stBarA, stBarB, stBarA, stBarD,
            stBarC, stBarB, stBarC, stBarD,
            stBarC, stBarD, stBarC, stBarD,
            stBarA, stBarC, stBarD, stBarD
        ].flat();

        // === 4. 16分小刻みディミニッシュ＆クロマチック・ストリングス・オスティナート ===
        const sOstA = [D4,Eb4,Ab4,A4, D4,Eb4,Ab4,A4, Eb4,E4,A4,Bb4, Ab4,G4,Eb4,D4];
        const sOstB = [Eb4,E4,A4,Bb4, Eb4,E4,A4,Bb4, F4,Fs4,B4,C5,  Bb4,A4,F4,Eb4];
        const sOstC = [F4,Fs4,B4,C5,  Ab4,A4,D5,Eb5, B4,C5,F5,Fs5,  Eb5,D5,Ab4,A4];
        const sOstD = [D4,Ab4,Eb4,A4, E4,Bb4,F4,B4,  Fs4,C5,G4,Cs5, Ab4,D5,A4,Eb5];

        const strings = [
            sOstA, sOstB, sOstA, sOstD,
            sOstB, sOstC, sOstB, sOstD,
            sOstC, sOstD, sOstC, sOstD,
            sOstD, sOstB, sOstC, sOstD
        ].flat();

        // === 5. 小刻み・不協和音ボス主旋律 (16分音符で休まず刻みまくる凶悪スタッカート・リード) ===
        // 従来の長い休符や伸ばし音を廃し、短2度・減5度・減7度を小刻みに跳躍する攻撃的フレーズ！
        const leadA1 = [D5,Eb5,D5,Ab5, A5,Ab5,Eb5,D5, Ab5,G5,Fs5,F5, Eb5,D5,Ab5,Eb5];
        const leadA2 = [D5,Eb5,F5,Fs5, Ab5,A5,C6,B5,  Bb5,A5,Ab5,G5, Fs5,F5,E5,Eb5];
        const leadA3 = [D5,Eb5,D5,Ab5, A5,Ab5,Eb5,D5, B5,Bb5,A5,Ab5, G5,Fs5,F5,Eb5];
        const leadA4 = [D5,Ab5,Eb5,A5, E5,Bb5,F5,B5,  Fs5,C6,G5,Cs6, D6,Eb6,Ab5,Eb5];

        const leadB1 = [Eb5,E5,Eb5,A5, Bb5,A5,E5,Eb5, A5,Ab5,G5,Fs5, E5,Eb5,A5,E5];
        const leadB2 = [F5,Fs5,F5,B5,  C6,B5,Fs5,F5,  B5,Bb5,A5,Ab5,Fs5,F5,B5,Fs5];
        const leadB3 = [Ab5,A5,Ab5,D6, Eb6,D6,A5,Ab5, D6,Cs6,C6,B5,  Bb5,A5,Ab5,G5];
        const leadB4 = [Fs5,G5,Ab5,A5, Bb5,B5,C6,Cs6, D6,Cs6,C6,B5,  Bb5,A5,Ab5,Eb5];

        const leadC1 = [D6,Eb6,D6,Ab5, A5,Bb5,A5,Eb5, F5,Fs5,F5,B5,  C6,Cs6,D6,Eb6];
        const leadC2 = [E6,Eb6,D6,Cs6, C6,B5,Bb5,A5,  Ab5,G5,Fs5,F5, E5,Eb5,D5,Cs5];
        const leadC3 = [D6,Ab5,Eb6,A5, E6,Bb5,F6,B5,  Fs6,C6,G6,Cs6, Ab6,D6,Eb6,Ab5];
        const leadC4 = [D6,Eb6,E6,F6,  Fs6,F6,E6,Eb6, D6,Ab5,A5,Eb5, D5,Eb5,Ab5,A5];

        const bossLead = [
            // 0-3
            ...leadA1, ...leadA2, ...leadA3, ...leadA4,
            // 4-7
            ...leadB1, ...leadB2, ...leadB3, ...leadB4,
            // 8-11
            ...leadC1, ...leadC2, ...leadC3, ...leadC4,
            // 12-15
            ...leadA4, ...leadB3, ...leadC3, ...leadC4
        ];

        // === 6. 不協和音クラッシュ対旋律 (主旋律に対して減5度トライトーン[-6]＆短2度[-1]/長7度[-11]でぶつかる凶悪ハモリ！) ===
        const bossClash = bossLead.map((note, idx) => {
            if (note <= 0) return 0;
            // 偶数ステップは減5度下(-6: トライトーン)、奇数ステップは長7度下(-11: 半音衝突)または短2度上(+1)で強烈な不協和音を作る！
            if (idx % 4 === 0) return note - 6;  // トライトーン（増4度/減5度）
            if (idx % 4 === 1) return note - 11; // 長7度（オクターブ半音衝突）
            if (idx % 4 === 2) return note - 6;  // トライトーン
            return note + 1;                     // 短2度クラスター衝突！
        });

        this.startScheduler(bpm, totalSteps, (step, time, stepDur) => {
            // 1. 重低音マルチレイヤー・ドラム＆パーカッション
            const k = kickTrack[step];
            if (k === 1) this.triggerKick(time, 0.70);
            else if (k === 2) this.triggerKick(time, 0.82);

            const sn = snarePercTrack[step];
            if (sn === 1) {
                this.triggerSnare(time, 0.56);
            } else if (sn === 2) {
                this.triggerIndustrialPerc(time, 0.95, 0.50);
            } else if (sn === 3) {
                this.triggerIndustrialPerc(time, 1.38, 0.48);
            } else if (sn === 4) {
                this.triggerSnare(time, 0.62);
                this.triggerIndustrialPerc(time, 1.15, 0.52);
            }

            const tm = tomTimpTrack[step];
            if (tm === 1) this.triggerTom(C4, time, stepDur * 0.90, 0.56);
            else if (tm === 2) this.triggerTom(Ab3, time, stepDur * 0.90, 0.58);
            else if (tm === 3) this.triggerTom(D3, time, stepDur * 0.95, 0.62);
            else if (tm === 4) this.triggerTimpani(D2, time, stepDur * 1.4, 0.64);
            else if (tm === 5) this.triggerTimpani(Ab1, time, stepDur * 1.4, 0.66);
            else if (tm === 6) this.triggerTimpani(Eb2, time, stepDur * 1.4, 0.64);

            const hc = hatCymTrack[step];
            if (hc === 1) this.triggerHiHat(time, false, 1.1);
            else if (hc === 2) this.triggerHiHat(time, true, 1.15);
            else if (hc === 3) this.triggerCymbal(time, 0.48);

            // 2. お腹をえぐる16分小刻み重低音ファズ／スラップベース (スタッカートで1音1音ズシンと刻む！)
            const b = bass[step];
            if (b > 0) {
                this.triggerBass(b, time, stepDur * 0.82, 0.62);
            }

            // 3. 不協和音クラスター・小刻みスタブ (短2度＋減5度＋長7度の凶悪コードカッティング)
            const st = stabPattern[step];
            if (st > 0 && chords[st]) {
                this.triggerDissonantCluster(chords[st], time, stepDur * 0.78, 0.24);
                // 低音ギターでもトライトーン(減5度)パワーコードを同時刻み！
                const root = chords[st][0];
                this.triggerGuitar(root, time, stepDur * 0.78, 0.22);
                this.triggerGuitar(root + 6, time, stepDur * 0.78, 0.20); // +6 = 減5度トライトーン
            }

            // 4. 16分小刻みストリングス・オスティナート
            const str = strings[step];
            if (str > 0) {
                this.triggerStrings(str, time, stepDur * 0.75, 0.16);
                this.triggerArp(str + 12, time, stepDur * 0.68, 0.13);
            }

            // 5. 小刻みスタッカート主旋律 ＋ 不協和音クラッシュ対旋律
            const l = bossLead[step];
            const c = bossClash[step];
            if (l > 0) {
                // 小刻み感を極限まで際立たせるタイトなゲートタイム (stepDur * 0.74)
                const dur = stepDur * 0.74;
                this.triggerLead(l, time, dur, 0.32);
                this.triggerBrass(l, time, dur, 0.22);
            }
            if (c > 0) {
                const dur = stepDur * 0.72;
                this.triggerHarmony(c, time, dur, 0.24);
                this.triggerBrass(c, time, dur, 0.18);
            }
        });
    }

    // 警告音・クリアジングルは演出の引き締めのため完全カット
    playWarningSound() {}
    playClearJingle() {}

    // =========================================================================
    // 1面 火山大噴火サバイバルBGM: 『VOLCANO INFERNO : SURVIVAL COUNTDOWN』
    // 170 BPM！脈拍が跳ね上がる超アップテンポ・激しいソワソワ感と緊迫のパニック新曲！
    // =========================================================================
    playVolcanoSurvivalBgm(forceRestart = false) {
        if (!forceRestart && this.currentBgm === 'VOLCANO_SURVIVAL') return;
        this.currentBgm = 'VOLCANO_SURVIVAL';

        const bpm = 170;
        const totalSteps = 128; // 全8小節ループ

        // 1. 激しいドラムビート (高速4つ打ちキック + 裏拍オープンハット + 連打スネア)
        const dSurv1 = [
            1,3,1,4, 1,2,1,3, 1,3,1,4, 1,2,2,4
        ];
        const dSurv2 = [
            1,3,1,4, 1,2,1,3, 1,3,1,4, 2,2,2,2 // スネア4連打！
        ];
        const dSurvRoll = [
            1,1,2,2, 6,6,7,7, 8,8,2,2, 5,2,5,2 // 怒涛のクラッシュ乱打！
        ];

        const drums = [
            dSurv1, dSurv2, dSurv1, dSurvRoll,
            dSurv1, dSurv2, dSurv1, dSurvRoll
        ].flat();

        // 2. 高速マシンガン・パニックベース (焦燥感あふれる半音上昇・急降下スリルリフ)
        const bSurv1 = [D2,D2,D3,D2, Eb2,Eb2,Eb3,Eb2, E2,E2,E3,E2, F2,F2,F3,F2];
        const bSurv2 = [Fs2,Fs2,Fs3,Fs2, G2,G2,G3,G2, Ab2,Ab2,Ab3,Ab2, A2,A2,A3,A2];
        const bSurv3 = [D2,D2,F2,F2, Ab2,Ab2,B2,B2, D3,D3,B2,B2, Ab2,Ab2,F2,F2];
        const bSurv4 = [D2,D2,D2,D2, Eb2,Eb2,Eb2,Eb2, E2,E2,E2,E2, F2,F2,F2,F2];

        const bass = [
            bSurv1, bSurv2, bSurv3, bSurv4,
            bSurv1, bSurv2, bSurv3, bSurv4
        ].flat();

        // 3. ソワソワする緊迫のディミニッシュ・パニックアルペジオ (16分音符クリスタルパルス)
        const aSurv1 = [D4,F4,Ab4,B4, D5,B4,Ab4,F4, D4,F4,Ab4,B4, D5,B4,Ab4,F4];
        const aSurv2 = [Eb4,Fs4,A4,C5, Eb5,C5,A4,Fs4, Eb4,Fs4,A4,C5, Eb5,C5,A4,Fs4];
        const aSurv3 = [E4,G4,Bb4,Cs5, E5,Cs5,Bb4,G4, E4,G4,Bb4,Cs5, E5,Cs5,Bb4,G4];
        const aSurv4 = [F4,Ab4,B4,D5, F5,D5,B4,Ab4, F4,Ab4,B4,D5, F5,D5,B4,Ab4];

        const arpeggio = [
            aSurv1, aSurv2, aSurv3, aSurv4,
            aSurv1, aSurv2, aSurv3, aSurv4
        ].flat();

        // 4. 緊迫ストリングス・オスティナート (息詰まるパニック刻み)
        const sSurv1 = [D4,D4,D4,D4, Eb4,Eb4,Eb4,Eb4, E4,E4,E4,E4, F4,F4,F4,F4];
        const sSurv2 = [Fs4,Fs4,Fs4,Fs4, G4,G4,G4,G4, Ab4,Ab4,Ab4,Ab4, A4,A4,A4,A4];
        const sSurv3 = [Ab4,Ab4,Ab4,Ab4, B4,B4,B4,B4, D5,D5,D5,D5, B4,B4,B4,B4];
        const sSurv4 = [D5,D5,Eb5,Eb5, E5,E5,F5,F5, Fs5,Fs5,G5,G5, Ab5,Ab5,A5,A5];

        const strings = [
            sSurv1, sSurv2, sSurv3, sSurv4,
            sSurv1, sSurv2, sSurv3, sSurv4
        ].flat();

        // 5. 緊急事態サイレン主旋律 (PSGリード + ブラスによる超緊迫パニックメロディ！)
        const lead = [
            // 0-3: 警報サイレン・激動のサバイバルリフ
            D5,_,D5,_, Ab5,_,_,_, G5,_,F5,_, D5,_,_,_,
            Eb5,_,Eb5,_, A5,_,_,_, Ab5,_,Fs5,_, Eb5,_,_,_,
            E5,_,E5,_, Bb5,_,_,_, A5,_,G5,_, E5,_,_,_,
            F5,_,F5,_, B5,_,_,_, D6,_,B5,_, Ab5,_,F5,_,

            // 4-7: クライマックス・死線脱出の咆哮
            D6,_,_,D6, C6,_,A5,_, Ab5,_,_,Ab5, G5,_,F5,_,
            D6,_,_,D6, Eb6,_,D6,_, C6,_,_,C6, B5,_,A5,_,
            D6,_,_,D6, F6,_,D6,_, B5,_,_,B5, Ab5,_,F5,_,
            D5,_,F5,_, Ab5,_,B5,_, D6,_,_,_, _,_,_,_
        ];

        this.startScheduler(bpm, totalSteps, (step, time, stepDur) => {
            // ドラム (お腹に響く高速4つ打ち＆クラッシュ同時キック！)
            const d = drums[step];
            if (d === 1) {
                this.triggerKick(time, 0.72);
                this.triggerHiHat(time, false, 0.8);
            } else if (d === 2) {
                this.triggerSnare(time, 0.54);
                this.triggerHiHat(time, false, 0.8);
            } else if (d === 3) {
                this.triggerHiHat(time, false, 1.0);
            } else if (d === 4) {
                this.triggerHiHat(time, true, 1.05);
            } else if (d === 5) {
                this.triggerKick(time, 0.76);
                this.triggerCymbal(time, 0.46);
            } else if (d === 6) {
                this.triggerTom(A3, time, stepDur * 0.98, 0.58);
            } else if (d === 7) {
                this.triggerTom(F3, time, stepDur * 0.98, 0.58);
            } else if (d === 8) {
                this.triggerTom(D3, time, stepDur * 0.98, 0.60);
            }

            // 重低音マシンガンベース
            const b = bass[step];
            if (b > 0) this.triggerBass(b, time, stepDur * 1.35, 0.56);

            // ソワソワするパニックアルペジオ
            const a = arpeggio[step];
            if (a > 0) this.triggerArp(a, time, stepDur * 0.85, 0.18);

            // 緊迫ストリングス
            const str = strings[step];
            if (str > 0) this.triggerStrings(str, time, stepDur * 0.9, 0.16);

            // 主旋律リード
            const l = lead[step];
            if (l > 0) {
                let lLen = 1;
                for (let k = 1; k < 6; k++) {
                    if (lead[(step + k) % totalSteps] === 0) lLen++;
                    else break;
                }
                const dur = stepDur * lLen * 0.92;
                this.triggerLead(l, time, dur, 0.35);
                this.triggerBrass(l, time, dur, 0.22);
            }
        });
    }

    // =========================================================================
    // 2面 メインBGM: 『MAXIMUM SPEED (1985 ARCADE GRADIUS STAGE 2 BEAT)』
    // 1985年本家アーケード版『グラディウス』2面（ストーンヘンジ面）の
    // 軽快でエッジの効いたシンコペーション16ビート・オクターブスラップベース・
    // 2声パルス波ハーモニー＆電子タムフィルを忠実にオマージュしたビート楽曲！
    // =========================================================================
    playStage2Bgm(forceRestart = false) {
        if (!forceRestart && this.currentBgm === 'STAGE2') return;
        this.currentBgm = 'STAGE2';

        // テンポ 150 BPM（本家2面『MAXIMUM SPEED』特有の歯切れ良いアップビート）
        const bpm = 150;
        const totalSteps = 256; // 全16小節ループ (1小節=16ステップ)

        // === 1. 1985アーケード風 疾走シンコペーション16ビートドラム ===
        // 1:キック, 2:スネア, 3:クローズハット, 4:オープンハット, 5:クラッシュ+キック,
        // 6:ハイタム, 7:ミドルタム, 8:ロータム, 9:キック+オープンハット(裏拍アクセント)
        const dIntro0  = [5,3,4,1, 2,3,9,3, 1,3,1,4, 2,3,2,4]; // イントロ開幕：シンコペーションビート！
        const dIntro1  = [1,3,4,1, 2,3,9,3, 6,6,7,7, 8,8,2,5]; // コナミ伝統の電子タムロール！
        const dBeatA   = [1,3,4,1, 2,3,9,3, 1,3,1,4, 2,3,4,3]; // 本家2面風バウンス16ビート
        const dBeatB   = [1,3,4,1, 2,3,9,3, 1,3,1,4, 2,3,2,4]; // ダブルスネア・ピックアップ
        const dBeatCym = [5,3,4,1, 2,3,9,3, 1,3,1,4, 2,3,4,3]; // 小節頭クラッシュ付きビート
        const dFill1   = [1,3,4,1, 2,3,2,3, 6,6,7,7, 8,8,2,5]; // フレーズ末タムフィルイン
        const dFill2   = [5,3,2,3, 1,2,9,2, 6,7,6,7, 8,8,2,5]; // ターンアラウンド・ブレイクフィル

        const drums = [
            // 0-1: イントロ（2小節の歯切れ良いリズムブレイク）
            dIntro0,  dIntro1,
            // 2-5: メインテーマA1
            dBeatCym, dBeatA,  dBeatB,   dFill1,
            // 6-9: メインテーマA2（高音展開）
            dBeatCym, dBeatA,  dBeatB,   dFill1,
            // 10-13: Bセクション（フュージョン・ブリッジ）
            dBeatCym, dBeatB,  dBeatCym, dFill1,
            // 14-15: リズムブレイク＆ターンアラウンド
            dBeatCym, dFill2
        ].flat();

        // === 2. 跳ねるオクターブ・シンコペーション・ベースライン ===
        // 本家2面『MAXIMUM SPEED』の象徴である「ボン・ボ・ボン・ボ・ボ・ボン」と跳ねる16分ベース
        const bInt0 = [A1,_,A2,A1, G1,_,A1,_, _,C2,_,D2, E2,_,G2,_];
        const bInt1 = [A1,_,A2,A1, G1,_,A1,_, F1,F2,G1,G2, E1,E2,G2,Gs2];

        const bAm   = [A1,_,A2,A1, _,A2,G1,_, A1,_,A2,A1, C2,_,D2,_];
        const bG    = [G1,_,G2,G1, _,G2,D1,_, G1,_,G2,G1, A1,_,B1,_];
        const bF    = [F1,_,F2,F1, _,F2,C2,_, F1,_,F2,F1, G1,_,A1,_];
        const bE    = [E1,_,E2,E1, _,E2,B1,_, E1,_,E2,E1, Gs1,_,B1,_];
        const bDm   = [D2,_,D3,D2, _,D3,A1,_, D2,_,D3,D2, E2,_,F2,_];

        const bF_G  = [F1,F2,_,F1, _,F2,C2,F2, G1,G2,_,G1, _,G2,D2,G2];
        const bEmAm = [E1,E2,_,E1, _,E2,B1,E2, A1,A2,_,A1, _,A2,G1,E1];
        const bDmG  = [D2,D3,_,D2, _,D3,A1,D2, G1,G2,_,G1, _,G2,A1,B1];
        const bCE   = [C2,C3,_,C2, B1,B2,_,B1, E1,E2,E1,E2, Gs1,A1,B1,E2];

        const bBrk0 = [F1,_,F2,F1, G1,_,G2,G1, E1,_,E2,E1, A1,_,G1,_];
        const bBrk1 = [D2,_,D3,D2, E2,_,E3,E2, A1,A2,G1,G2, F1,F2,E1,E2];

        const bass = [
            bInt0, bInt1,
            bAm,   bG,    bF,   bE,
            bAm,   bG,    bDm,  bE,
            bF_G,  bEmAm, bDmG, bCE,
            bBrk0, bBrk1
        ].flat();

        // === 3. 裏拍カッティング・ブラス＆シンセコード・スタブ ===
        // ビートの裏拍（ステップ2, 6, 10, 14）に歯切れよく入るコードカッティング
        const stOff = (n1, n2 = n1) => [_,_,n1,_, _,_,n1,_, _,_,n2,_, _,_,n2,_];
        const stInt0_1 = [E4,_,E4,_, D4,_,E4,_, _,G4,_,A4, B4,_,D5,_];
        const stInt1_1 = [E4,_,E4,_, D4,_,E4,_, A4,_,B4,_, Gs4,_,_,_];
        const stInt0_2 = [C4,_,C4,_, B3,_,C4,_, _,E4,_,F4, G4,_,B4,_];
        const stInt1_2 = [C4,_,C4,_, B3,_,C4,_, F4,_,G4,_, E4,_,_,_];

        const stab1 = [
            stInt0_1, stInt1_1,
            stOff(E4), stOff(D4), stOff(C4), stOff(B3),
            stOff(E4), stOff(D4), stOff(F4), stOff(E4),
            stOff(A4, B4), stOff(G4, A4), stOff(F4, G4), stOff(G4, Gs4),
            stOff(A4, B4), stInt1_1
        ].flat();

        const stab2 = [
            stInt0_2, stInt1_2,
            stOff(C4), stOff(B3), stOff(A3), stOff(Gs3),
            stOff(C4), stOff(B3), stOff(D4), stOff(B3),
            stOff(F4, G4), stOff(E4, E4), stOff(D4, D4), stOff(E4, E4),
            stOff(F4, G4), stInt1_2
        ].flat();

        // === 4. 16分音符リズミック・シーケンスパルス ===
        // ドラムのアタックを邪魔せずビートの隙間を軽快に駆け抜けるパルスシーケンス
        const seqAm  = [_,E5,A4,E5, _,E5,C5,E5, _,E5,A4,E5, _,C5,D5,E5];
        const seqG   = [_,D5,G4,D5, _,D5,B4,D5, _,D5,G4,D5, _,B4,C5,D5];
        const seqF   = [_,C5,F4,C5, _,C5,A4,C5, _,C5,F4,C5, _,A4,B4,C5];
        const seqE   = [_,B4,E4,B4, _,B4,Gs4,B4, _,B4,E4,B4, Gs4,B4,D5,E5];
        const seqDm  = [_,A4,D4,A4, _,A4,F4,A4, _,A4,D4,A4, _,F4,G4,A4];
        const seqFG  = [_,C5,F4,A4, _,C5,F5,C5, _,D5,G4,B4, _,D5,G5,D5];
        const seqEA  = [_,B4,E4,G4, _,B4,E5,B4, _,C5,A4,E4, _,A4,C5,E5];
        const seqDG  = [_,A4,D4,F4, _,A4,D5,A4, _,B4,G4,D4, _,G4,B4,D5];
        const seqCE  = [_,G4,C4,E4, _,G4,C5,G4, _,Gs4,E4,B3, E4,Gs4,B4,E5];

        const arpeggio = [
            seqAm, seqE,
            seqAm, seqG,  seqF,  seqE,
            seqAm, seqG,  seqDm, seqE,
            seqFG, seqEA, seqDG, seqCE,
            seqFG, seqCE
        ].flat();

        // === 5. 1985本家2面風 シンコペーション主旋律 (25%パルス波リード) ===
        const lead = [
            // 0-1: イントロ（ビートに乗ったリズミックなシンセモチーフ）
            A4,_,A4,_, G4,_,A4,_, _,C5,_,D5, E5,_,G5,_,
            A5,_,A5,_, G5,_,E5,_, F5,_,G5,_, E5,_,A5,B5,

            // 2-5: メインテーマA1（歯切れ良いスタッカート＋シンコペーション上昇フレーズ！）
            C6,_,C6,_, B5,_,A5,_, _,E5,_,G5, A5,_,C6,D6,
            B5,_,B5,_, A5,_,G5,_, _,D5,_,E5, G5,_,A5,B5,
            A5,_,A5,_, G5,_,F5,_, E5,_,F5,_, G5,_,A5,C6,
            B5,_,_,_,  E5,_,Gs5,_, B5,_,D6,_, C6,_,B5,_,

            // 6-9: メインテーマA2（高音へ駆け上がる快活なメロディ展開）
            C6,_,C6,_, D6,_,E6,_, _,C6,_,A5, E5,_,A5,C6,
            D6,_,D6,_, C6,_,B5,_, _,G5,_,A5, B5,_,C6,D6,
            F6,_,E6,_, D6,_,C6,_, B5,_,A5,_, G5,_,F5,E5,
            E5,_,Gs5,_, B5,_,D6,_, E6,_,_,_, _,_,E5,G5,

            // 10-13: Bセクション（フュージョン・シンコペーション・ブリッジ）
            A5,_,_,C6, _,B5,_,A5, B5,_,_,D6, _,C6,_,B5,
            G5,_,B5,_, E6,_,D6,_, C6,_,_,A5, _,G5,_,E5,
            F5,_,A5,_, D6,_,C6,_, B5,_,G5,_, A5,_,B5,D6,
            E6,_,_,E6, D6,_,C6,_, B5,_,_,_,  Gs5,_,B5,_,

            // 14-15: ターンアラウンド・ビートブレイク
            A5,_,C6,_, B5,_,D6,_, C6,_,E6,_, D6,_,C6,B5,
            A5,_,G5,_, F5,_,E5,_, A5,_,_,_,  _,_,_,_
        ];

        // === 6. コナミ伝統の2チャンネル・ツインパルス平行ハーモニー (12.5%パルス波) ===
        const harmony = [
            // 0-1: イントロ（3度下・6度下のタイトなハモリ）
            E4,_,E4,_, D4,_,E4,_, _,G4,_,A4, B4,_,D5,_,
            E5,_,E5,_, D5,_,C5,_, C5,_,D5,_, B4,_,E5,Gs5,

            // 2-5: メインテーマA1
            A5,_,A5,_, G5,_,E5,_, _,C5,_,D5, E5,_,A5,B5,
            G5,_,G5,_, F5,_,D5,_, _,B4,_,C5, D5,_,F5,G5,
            F5,_,F5,_, E5,_,C5,_, C5,_,C5,_, E5,_,F5,A5,
            Gs5,_,_,_, B4,_,E5,_, Gs5,_,B5,_, A5,_,Gs5,_,

            // 6-9: メインテーマA2
            A5,_,A5,_, B5,_,C6,_, _,A5,_,E5, C5,_,E5,A5,
            B5,_,B5,_, A5,_,G5,_, _,D5,_,F5, G5,_,A5,B5,
            D6,_,C6,_, B5,_,A5,_, G5,_,F5,_, E5,_,D5,C5,
            B4,_,E5,_, Gs5,_,B5,_, B5,_,_,_, _,_,C5,E5,

            // 10-13: Bセクション
            F5,_,_,A5, _,G5,_,F5, G5,_,_,B5, _,A5,_,G5,
            E5,_,G5,_, B5,_,B5,_, A5,_,_,E5, _,E5,_,C5,
            D5,_,F5,_, A5,_,A5,_, G5,_,D5,_, F5,_,G5,B5,
            C6,_,_,C6, B5,_,A5,_, Gs5,_,_,_, E5,_,Gs5,_,

            // 14-15: ターンアラウンド
            F5,_,A5,_, G5,_,B5,_, Gs5,_,B5,_, A5,_,E5,D5,
            C5,_,B4,_, D5,_,Gs4,_, C5,_,_,_, _,_,_,_
        ];

        this.startScheduler(bpm, totalSteps, (step, time, stepDur) => {
            // 1. お腹に響くパンチ抜群の16ビート・ドラムセクション
            const d = drums[step];
            if (d === 1) {
                this.triggerKick(time, 0.70);
                this.triggerHiHat(time, false, 0.75);
            } else if (d === 2) {
                this.triggerSnare(time, 0.52);
                this.triggerHiHat(time, false, 0.85);
            } else if (d === 3) {
                this.triggerHiHat(time, false, 1.0);
            } else if (d === 4) {
                this.triggerHiHat(time, true, 1.05);
            } else if (d === 5) {
                this.triggerKick(time, 0.75);
                this.triggerCymbal(time, 0.44);
            } else if (d === 6) {
                this.triggerTom(C4, time, stepDur * 0.95, 0.56);
            } else if (d === 7) {
                this.triggerTom(A3, time, stepDur * 0.95, 0.56);
            } else if (d === 8) {
                this.triggerTom(E3, time, stepDur * 0.95, 0.60);
            } else if (d === 9) {
                this.triggerKick(time, 0.68);
                this.triggerHiHat(time, true, 1.05);
            }

            // 2. お腹に響きつつ歯切れ良く跳ねるオクターブ・スラップ／シンセベース
            const b = bass[step];
            if (b > 0) {
                let bLen = 1;
                if (bass[(step + 1) % totalSteps] === 0) bLen = 1.35;
                this.triggerBass(b, time, stepDur * bLen * 0.86, 0.58);
            }

            // 3. 裏拍カッティング・ブラスコード・スタブ
            const st1 = stab1[step];
            const st2 = stab2[step];
            if (st1 > 0) this.triggerBrass(st1, time, stepDur * 0.72, 0.16);
            if (st2 > 0) this.triggerBrass(st2, time, stepDur * 0.72, 0.13);

            // 4. 軽快な16分リズミック・パルスシーケンス
            const a = arpeggio[step];
            if (a > 0) {
                this.triggerArp(a, time, stepDur * 0.75, 0.13);
            }

            // 5. 主旋律リード（短音はキレのあるスタッカート、長音は伸びやかに）
            const l = lead[step];
            if (l > 0) {
                let lLen = 1;
                for (let k = 1; k < 8; k++) {
                    if (lead[(step + k) % totalSteps] === 0) lLen++;
                    else break;
                }
                const gate = (lLen === 1) ? 0.75 : 0.90;
                const dur = stepDur * lLen * gate;
                this.triggerLead(l, time, dur, 0.34);
                this.triggerBrass(l, time, dur, 0.16);
            }

            // 6. ツインパルス平行ハーモニー (12.5%パルス波)
            const h = harmony[step];
            if (h > 0) {
                let hLen = 1;
                for (let k = 1; k < 8; k++) {
                    if (harmony[(step + k) % totalSteps] === 0) hLen++;
                    else break;
                }
                const gate = (hLen === 1) ? 0.75 : 0.90;
                const dur = stepDur * hLen * gate;
                this.triggerHarmony(h, time, dur, 0.22);
            }
        });
    }

    playStage3Bgm(forceRestart = false) {
        if (!forceRestart && this.currentBgm === 'STAGE3') return;
        this.currentBgm = 'STAGE3';

        const bpm = 132;
        const totalSteps = 128; // 8小節ループ

        // 1. 古代モアイ遺跡の重厚トライバル＆ヘヴィロック・ドラムビート
        const dStg3_A = [
            5,3,1,3, 2,3,1,4, 1,1,3,1, 2,3,8,4
        ];
        const dStg3_B = [
            1,3,1,4, 2,3,1,3, 1,1,2,3, 6,7,8,5
        ];
        const drums = [
            dStg3_A, dStg3_B, dStg3_A, dStg3_B,
            dStg3_A, dStg3_B, dStg3_A, dStg3_B
        ].flat();

        // 2. お腹の底にズシンと響く重低音オクターブ・うねりベース（Aマイナー）
        const bStg3_1 = [A1,A1,A2,A1, C2,A1,E2,A1, A1,A1,A2,A1, G2,E2,F2,E2];
        const bStg3_2 = [F1,F1,F2,F1, A1,F1,C2,F1, F1,F1,F2,F1, E2,C2,D2,C2];
        const bStg3_3 = [C2,C2,C3,C2, E2,C2,G2,C2, C2,C2,C3,C2, B2,G2,A2,G2];
        const bStg3_4 = [E1,E1,E2,E1, Gs1,E1,B1,E1, E2,B1,E2,Gs2, A2,G2,F2,E2];
        const bass = [
            bStg3_1, bStg3_2, bStg3_3, bStg3_4,
            bStg3_1, bStg3_2, bStg3_3, bStg3_4
        ].flat();

        // 3. 神秘的なアルペジオ（ハープ風）
        const aStg3_1 = [A4,E5,A5,C6, E6,C6,A5,E5, A4,E5,A5,C6, E6,C6,A5,E5];
        const aStg3_2 = [F4,C5,F5,A5, C6,A5,F5,C5, F4,C5,F5,A5, C6,A5,F5,C5];
        const aStg3_3 = [C4,G4,C5,E5, G5,E5,C5,G4, E4,B4,E5,G5, B5,G5,E5,B4];
        const aStg3_4 = [E4,B4,E5,G5, B5,G5,E5,B4, A4,E5,A5,C6, E6,C6,A5,E5];
        const arpeggio = [
            aStg3_1, aStg3_2, aStg3_3, aStg3_4,
            aStg3_1, aStg3_2, aStg3_3, aStg3_4
        ].flat();

        // 4. 古代遺跡の神秘を表すメロディ（モアイ面）
        const lead = [
            // 0-3: Aメロ（神秘的・浮遊感）
            A5,_,_,_, C6,_,B5,_, A5,_,_,G5, E5,_,_,_,
            F5,_,_,_, A5,_,G5,_, F5,_,_,E5, C5,_,_,_,
            E5,_,_,_, G5,_,A5,_, B5,_,_,D6, C6,_,B5,_,
            A5,_,_,_, E5,_,_,_, A5,_,_,_,  _,_,_,_,

            // 4-7: Bメロ（緊張感・壮大な古代文明）
            C6,_,_,_, B5,_,A5,_, G5,_,_,_, F5,_,E5,_,
            D5,_,F5,_, A5,_,C6,_, B5,_,_,_, A5,_,G5,_,
            F5,_,G5,_, A5,_,B5,_, C6,_,_,_, D6,_,C6,_,
            B5,_,_,_, A5,_,G5,_, A5,_,_,_,  _,_,_,_
        ];

        this.startScheduler(bpm, totalSteps, (step, time, stepDur) => {
            const d = drums[step];
            if (d === 1) {
                this.triggerKick(time, 0.70);
                this.triggerHiHat(time, false, 0.75);
            } else if (d === 2) {
                this.triggerSnare(time, 0.52);
                this.triggerHiHat(time, false, 0.75);
            } else if (d === 3) {
                this.triggerHiHat(time, false, 0.95);
            } else if (d === 4) {
                this.triggerHiHat(time, true, 1.0);
            } else if (d === 5) {
                this.triggerKick(time, 0.74);
                this.triggerCymbal(time, 0.42);
            } else if (d === 6) {
                this.triggerTom(A3, time, stepDur * 0.95, 0.56);
            } else if (d === 7) {
                this.triggerTom(F3, time, stepDur * 0.95, 0.56);
            } else if (d === 8) {
                this.triggerTom(D3, time, stepDur * 0.95, 0.60);
            }

            const b = bass[step];
            if (b > 0) this.triggerBass(b, time, stepDur * 1.4, 0.56);

            const a = arpeggio[step];
            if (a > 0) this.triggerArp(a, time, stepDur * 0.8, 0.12);

            const l = lead[step];
            if (l > 0) {
                let lLen = 1;
                for (let k = 1; k < 6; k++) {
                    if (lead[(step + k) % totalSteps] === 0) lLen++;
                    else break;
                }
                const dur = stepDur * lLen * 0.90;
                this.triggerLead(l, time, dur, 0.30);
            }
        });
    }

    // =========================================================================
    // 4面 メインBGM: 『FREE FLYER (1985 ARCADE GRADIUS STAGE 4: INVERTED VOLCANO)』
    // 1985年本家アーケード版『グラディウス』4面（逆火山面）の名曲「Free Flyer」を忠実再現！
    // 152 BPM / 飛翔感あふれるシンコペーション・パルスリード、3度ハモリ、
    // 跳ねるオクターブベース、煌びやかな16分クリスタルアルペジオ＆タムフィル！
    // =========================================================================
    playStage4Bgm(forceRestart = false) {
        if (!forceRestart && this.currentBgm === 'STAGE4') return;
        this.currentBgm = 'STAGE4';

        const bpm = 152;
        const totalSteps = 256; // 全16小節ループ (1小節=16ステップ)

        // === 1. 疾走感あふれる16ビート・アーケードドラム ===
        const dIntroA = [5,3,4,1, 2,3,9,3, 1,3,1,4, 2,3,6,7];
        const dIntroB = [5,3,4,1, 2,3,9,2, 6,6,7,7, 8,8,2,5];
        const dMainA  = [1,3,4,1, 2,3,9,3, 1,3,1,4, 2,3,4,3];
        const dMainB  = [1,3,4,1, 2,3,9,3, 1,3,1,4, 2,3,2,4];
        const dMainCym= [5,3,4,1, 2,3,9,3, 1,3,1,4, 2,3,4,3];
        const dFillA  = [1,3,4,1, 2,3,2,3, 6,6,7,7, 8,8,2,5];
        const dFillB  = [5,3,2,3, 1,2,9,2, 6,7,6,7, 8,8,2,5];

        const drums = [
            // 0-1: イントロ（Free Flyer特有の爽快なシンコペーション開幕）
            dIntroA,  dIntroB,
            // 2-5: Aメロ1（飛翔するメインテーマ）
            dMainCym, dMainA,  dMainB,   dFillA,
            // 6-9: Aメロ2（高音へ伸びる展開）
            dMainCym, dMainA,  dMainB,   dFillA,
            // 10-13: Bメロ（逆火山の緊迫感と哀愁のマイナー〜メジャー転調ブリッジ）
            dMainCym, dMainB,  dMainCym, dFillA,
            // 14-15: ターンアラウンド・クライマックス
            dMainCym, dFillB
        ].flat();

        // === 2. 跳ねるオクターブ・フライングベース (F major / D minor 進行) ===
        const bInt0 = [F1,_,F2,F1, Eb1,_,F1,_, Bb1,_,C2,_, D2,_,E2,_];
        const bInt1 = [F1,_,F2,F1, Eb1,_,F1,_, Bb1,Bb2,C2,C3, D2,C2,G1,C2];

        const bF    = [F1,_,F2,F1, _,F2,C2,_, F1,_,F2,F1, A1,_,C2,_];
        const bC    = [C2,_,C3,C2, _,C3,G1,_, C2,_,C3,C2, E2,_,G2,_];
        const bDm   = [D2,_,D3,D2, _,D3,A1,_, D2,_,D3,D2, A1,_,C2,_];
        const bBb   = [Bb1,_,Bb2,Bb1, _,Bb2,F1,_, Bb1,_,Bb2,Bb1, C2,_,D2,_];
        const bGmC  = [G1,_,G2,G1, A1,_,A2,A1, Bb1,_,B1,_, C2,C3,G2,E2];

        const bAmDm = [A1,A2,_,A1, _,A2,E2,A1, D2,D3,_,D2, _,D3,A1,D2];
        const bGmC2 = [G1,G2,_,G1, _,G2,D2,G1, C2,C3,_,C2, _,C3,G1,C2];
        const bBbA  = [Bb1,Bb2,_,Bb1, _,Bb2,F2,Bb1, A1,A2,_,A1, _,A2,E2,A1];
        const bGmC3 = [G1,G2,A1,A2, Bb1,Bb2,B1,B2, C2,C3,C2,C3, G1,A1,Bb1,C2];

        const bEnd0 = [Bb1,_,Bb2,Bb1, C2,_,C3,C2, D2,_,D3,D2, G1,_,G2,G1];
        const bEnd1 = [Bb1,Bb2,A1,A2, G1,G2,F1,F2, C2,_,C3,_, C2,G1,A1,C2];

        const bass = [
            bInt0, bInt1,
            bF,    bC,    bDm,   bBb,
            bF,    bC,    bBb,   bGmC,
            bAmDm, bGmC2, bBbA,  bGmC3,
            bEnd0, bEnd1
        ].flat();

        // === 3. 16分音符クリスタル・パルスアルペジオ ===
        const arpF   = [F4,A4,C5,F5, C5,A4,F4,C5, F4,A4,C5,F5, A5,F5,C5,A4];
        const arpC   = [E4,G4,C5,E5, C5,G4,E4,C5, E4,G4,C5,E5, G5,E5,C5,G4];
        const arpDm  = [D4,F4,A4,D5, A4,F4,D4,A4, D4,F4,A4,D5, F5,D5,A4,F4];
        const arpBb  = [D4,F4,Bb4,D5, Bb4,F4,D4,Bb4, C4,E4,G4,C5, E5,C5,G4,E4];
        const arpAD  = [E4,A4,C5,E5, C5,A4,E4,A4, F4,A4,D5,F5, D5,A4,F4,A4];
        const arpGC  = [D4,G4,Bb4,D5, Bb4,G4,D4,G4, E4,G4,C5,E5, C5,G4,E4,G4];

        const arpeggio = [
            arpF,  arpBb,
            arpF,  arpC,  arpDm, arpBb,
            arpF,  arpC,  arpBb, arpC,
            arpAD, arpGC, arpAD, arpC,
            arpBb, arpC
        ].flat();

        // === 4. 『FREE FLYER』飛翔メインメロディ (25%パルス波リード) ===
        const lead = [
            // 0-1: イントロ（Free Flyer象徴のシンコペーション・ファンファーレ）
            F5,_,F5,_, Eb5,_,F5,_, _,A5,_,Bb5, C6,_,D6,_,
            F6,_,E6,_, D6,_,C6,_, Bb5,_,C6,_, G5,_,A5,Bb5,

            // 2-5: Aメロ1（爽快に宙を舞うメインテーマ）
            C6,_,_,A5, _,F5,_,A5, G5,_,_,E5, _,C5,_,E5,
            F5,_,G5,_, A5,_,C6,_, D6,_,_,C6, _,Bb5,A5,G5,
            A5,_,_,F5, _,C5,_,F5, G5,_,_,E5, _,C5,_,G5,
            Bb5,_,A5,_, G5,_,F5,_, G5,_,_,_,  _,C5,F5,A5,

            // 6-9: Aメロ2（高音域へ翔け上がるエモーショナル展開）
            C6,_,_,D6, _,C6,_,A5, E6,_,_,D6, _,C6,_,G5,
            Bb5,_,C6,_, D6,_,E6,_, F6,_,_,E6, _,D6,C6,Bb5,
            D6,_,C6,_, Bb5,_,A5,_, G5,_,A5,_, Bb5,_,C6,D6,
            C6,_,_,_,  G5,_,A5,_, C6,_,_,_,  _,_,A5,Bb5,

            // 10-13: Bメロ（逆火山地帯のスリリングなシンコペーション・ブリッジ）
            C6,_,A5,_, E6,_,C6,_, D6,_,_,A5, _,F5,G5,A5,
            Bb5,_,G5,_, D6,_,Bb5,_, C6,_,_,G5, _,E5,F5,G5,
            D6,_,_,C6, _,Bb5,_,A5, C6,_,_,B5, _,A5,_,E5,
            G5,_,A5,_, Bb5,_,D6,_, C6,_,_,_,  _,C5,F5,G5,

            // 14-15: ターンアラウンド（ループへの華麗な帰還）
            Bb5,_,A5,_, G5,_,F5,_, A5,_,G5,_, F5,_,E5,_,
            D5,_,F5,_, Bb5,_,D6,_, C6,_,_,_,  _,_,_,_
        ];

        // === 5. ツインパルス3度・6度平行ハーモニー (12.5%パルス波) ===
        const harmony = [
            // 0-1: イントロ
            A4,_,A4,_, G4,_,A4,_, _,C5,_,D5, F5,_,F5,_,
            A5,_,G5,_, F5,_,E5,_, D5,_,E5,_, E5,_,F5,G5,

            // 2-5: Aメロ1
            A5,_,_,F5, _,C5,_,F5, E5,_,_,C5, _,G4,_,C5,
            D5,_,E5,_, F5,_,A5,_, Bb5,_,_,A5, _,G5,F5,E5,
            F5,_,_,C5, _,A4,_,C5, E5,_,_,C5, _,G4,_,E5,
            D5,_,F5,_, E5,_,D5,_, E5,_,_,_,  _,A4,C5,F5,

            // 6-9: Aメロ2
            A5,_,_,Bb5, _,A5,_,F5, C6,_,_,B5, _,G5,_,E5,
            F5,_,A5,_, Bb5,_,C6,_, D6,_,_,C6, _,Bb5,A5,G5,
            Bb5,_,A5,_, G5,_,F5,_, E5,_,F5,_, G5,_,A5,Bb5,
            A5,_,_,_,  E5,_,F5,_, G5,_,_,_,  _,_,F5,G5,

            // 10-13: Bメロ
            A5,_,E5,_, C6,_,A5,_, A5,_,_,F5, _,D5,E5,F5,
            G5,_,D5,_, Bb5,_,G5,_, G5,_,_,E5, _,C5,D5,E5,
            Bb5,_,_,A5, _,G5,_,F5, A5,_,_,Gs5, _,E5,_,C5,
            D5,_,F5,_, G5,_,Bb5,_, G5,_,_,_,  _,A4,C5,E5,

            // 14-15: ターンアラウンド
            F5,_,F5,_, E5,_,C5,_, F5,_,E5,_, D5,_,C5,_,
            Bb4,_,D5,_, F5,_,Bb5,_, G5,_,_,_, _,_,_,_
        ];

        this.startScheduler(bpm, totalSteps, (step, time, stepDur) => {
            // 1. パンチのある16ビート・ドラムセクション
            const d = drums[step];
            if (d === 1) {
                this.triggerKick(time, 0.70);
                this.triggerHiHat(time, false, 0.78);
            } else if (d === 2) {
                this.triggerSnare(time, 0.52);
                this.triggerHiHat(time, false, 0.85);
            } else if (d === 3) {
                this.triggerHiHat(time, false, 1.0);
            } else if (d === 4) {
                this.triggerHiHat(time, true, 1.05);
            } else if (d === 5) {
                this.triggerKick(time, 0.76);
                this.triggerCymbal(time, 0.44);
            } else if (d === 6) {
                this.triggerTom(C4, time, stepDur * 0.95, 0.56);
            } else if (d === 7) {
                this.triggerTom(A3, time, stepDur * 0.95, 0.56);
            } else if (d === 8) {
                this.triggerTom(F3, time, stepDur * 0.95, 0.60);
            } else if (d === 9) {
                this.triggerKick(time, 0.68);
                this.triggerHiHat(time, true, 1.05);
            }

            // 2. 重低音オクターブ・フライングベース
            const b = bass[step];
            if (b > 0) {
                let bLen = 1;
                if (bass[(step + 1) % totalSteps] === 0) bLen = 1.35;
                this.triggerBass(b, time, stepDur * bLen * 0.88, 0.58);
            }

            // 3. 16分音符クリスタル・パルスアルペジオ
            const a = arpeggio[step];
            if (a > 0) {
                this.triggerArp(a, time, stepDur * 0.78, 0.14);
            }

            // 4. 『Free Flyer』飛翔メインリード
            const l = lead[step];
            if (l > 0) {
                let lLen = 1;
                for (let k = 1; k < 8; k++) {
                    if (lead[(step + k) % totalSteps] === 0) lLen++;
                    else break;
                }
                const gate = (lLen === 1) ? 0.78 : 0.92;
                const dur = stepDur * lLen * gate;
                this.triggerLead(l, time, dur, 0.34);
                this.triggerBrass(l, time, dur, 0.16);
            }

            // 5. ツインパルス平行ハーモニー
            const h = harmony[step];
            if (h > 0) {
                let hLen = 1;
                for (let k = 1; k < 8; k++) {
                    if (harmony[(step + k) % totalSteps] === 0) hLen++;
                    else break;
                }
                const gate = (hLen === 1) ? 0.78 : 0.92;
                const dur = stepDur * hLen * gate;
                this.triggerHarmony(h, time, dur, 0.22);
            }
        });
    }
}

// グローバルサウンドインスタンス
const Sound = new SoundManager();
if (typeof window !== 'undefined') {
    window.Sound = Sound;
}
