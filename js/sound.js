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

    // 重装甲メカ（4面巡回傘アイアンメイデン等）へのレーザー・ショット着弾音:
    // 1985年アーケード版グラディウス特有の甲高い金属摩擦音「キーキー！ / キィィ・キィィ！」を忠実再現
    playMetalHit() {
        if (!this.initialized || this.isMuted || !this.ctx) return;
        const nowMs = Date.now();
        // レーザー連続接触時に「キー・キー・キー・キー！」と歯切れ良く連続発音するための最適間隔（52ms）
        if (this._lastMetalHitTime && (nowMs - this._lastMetalHitTime < 52)) {
            return;
        }
        this._lastMetalHitTime = nowMs;

        const now = this.ctx.currentTime;
        const totalDur = 0.088;

        // 金属的な高域共鳴を作るピーキングフィルタ（2900Hz付近を鋭く強調）
        const resonance = this.ctx.createBiquadFilter();
        resonance.type = 'peaking';
        resonance.frequency.setValueAtTime(2950, now);
        resonance.Q.setValueAtTime(3.8, now);
        resonance.gain.setValueAtTime(6.0, now);

        // 主音: 12.5%パルス波（または矩形波）による2山ピッチスイープ「キィー・キィ！」
        const osc1 = this.ctx.createOscillator();
        if (this.pulseWave125) {
            osc1.setPeriodicWave(this.pulseWave125);
        } else {
            osc1.type = 'square';
        }
        // 1山目「キィー」(0.000s〜0.042s) -> 2山目「キィ！」(0.044s〜0.088s)
        osc1.frequency.setValueAtTime(2380, now);
        osc1.frequency.linearRampToValueAtTime(3520, now + 0.018);
        osc1.frequency.linearRampToValueAtTime(2620, now + 0.042);
        osc1.frequency.setValueAtTime(2520, now + 0.044);
        osc1.frequency.linearRampToValueAtTime(3680, now + 0.064);
        osc1.frequency.linearRampToValueAtTime(2740, now + totalDur);

        // 副音: 非整数倍音（約1.38倍）の矩形波を重ねてアーケードPSG特有の硬質な金属光沢感を生成
        const osc2 = this.ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(3290, now);
        osc2.frequency.linearRampToValueAtTime(4820, now + 0.018);
        osc2.frequency.linearRampToValueAtTime(3610, now + 0.042);
        osc2.frequency.setValueAtTime(3480, now + 0.044);
        osc2.frequency.linearRampToValueAtTime(5040, now + 0.064);
        osc2.frequency.linearRampToValueAtTime(3780, now + totalDur);

        const gain1 = this.ctx.createGain();
        gain1.gain.setValueAtTime(0.42, now);
        gain1.gain.linearRampToValueAtTime(0.12, now + 0.041);
        gain1.gain.setValueAtTime(0.44, now + 0.044);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + totalDur);

        const gain2 = this.ctx.createGain();
        gain2.gain.setValueAtTime(0.24, now);
        gain2.gain.linearRampToValueAtTime(0.07, now + 0.041);
        gain2.gain.setValueAtTime(0.26, now + 0.044);
        gain2.gain.exponentialRampToValueAtTime(0.008, now + totalDur);

        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(resonance);
        gain2.connect(resonance);
        resonance.connect(this.seGain);

        osc1.start(now);
        osc1.stop(now + totalDur);
        osc2.start(now);
        osc2.stop(now + totalDur);
        this.autoClean(osc1, totalDur, osc2, gain1, gain2, resonance);
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

    // 高精度 Lookahead オーディオスケジューラー (タイミングのズレがゼロ、イントロ付きループ対応)
    startScheduler(bpm, totalSteps, scheduleCallback, loopStartStep = 0) {
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
                currentStep++;
                if (currentStep >= totalSteps) {
                    currentStep = loopStartStep;
                }
                nextStepTime += stepDuration;
            }
        }, 35);
    }

    // 16分音符ステップ配列（サブステップオフセット・同一ステップ内複数発音対応）の再生ヘルパー
    triggerStepEvents(track, step, time, stepDur, callback) {
        const evt = track[step];
        if (!evt) return;
        if (Array.isArray(evt[0])) {
            for (let i = 0; i < evt.length; i++) {
                const sub = evt[i];
                if (Array.isArray(sub) && sub[0] > 0) {
                    const midi = sub[0];
                    const lenSteps = sub[1];
                    const offsetSteps = sub[2] || 0;
                    callback(midi, time + offsetSteps * stepDur, stepDur * lenSteps, lenSteps);
                }
            }
        } else if (Array.isArray(evt) && evt[0] > 0) {
            const midi = evt[0];
            const lenSteps = evt[1];
            const offsetSteps = evt[2] || 0;
            callback(midi, time + offsetSteps * stepDur, stepDur * lenSteps, lenSteps);
        }
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

    // =========================================================================
    // 空中戦BGM: 『BEGINNING OF THE HISTORY (1985 ARCADE GRADIUS AERIAL BATTLE)』
    // 1985年本家アーケード版『グラディウス』空中戦の名曲「Beginning of the History」（東野美紀 作曲）を
    // 実機基板（Konami 005289 + AY-3-8910 PSG）の楽譜データ（120 BPM / イントロ4小節＋本編8小節ループ）
    // から全5チャンネル完全採譜・忠実再現！
    // ・0〜3小節 (Steps 0-63): 象徴的な「ミ・シ・ミ・ファ#・シ・ファ#・ミ・シ・ミ・シ・ミ・ファ#」高速アルペジオ＆シンコペーションベース (E -> D -> C -> D)
    // ・4〜11小節 (Steps 64-191, ループ区間): 16分音符2度打ちオスティナート (B-B-E-E...) に乗せて飛翔する本家主旋律！
    // =========================================================================
    playAirBgm(forceRestart = false) {
        if (!forceRestart && this.currentBgm === 'AIR') return;
        this.currentBgm = 'AIR';

        const bpm = 120;
        const totalSteps = 192;    // 全12小節 (イントロ4小節=64ステップ + 本編8小節=128ステップ)
        const loopStartStep = 64;  // 2周目以降は Step 64 (Bar 4: 本編メロディ頭) へ正確にループ！

        // 主旋律 高音パート (ch7: AY-3-8910 PSG o6 リード)
        const psgLeadHigh = [
            // Bar 0 (Steps 0-15): イントロアルペジオ 1 (on E)
            [E6,1], [B5,1], [E6,1], [Fs6,2], _, [B6,2], _, [Fs6,2], _, [E6,2], _, [B5,1], [E6,1], [B5,1], [E6,1], [Fs6,1],
            // Bar 1 (Steps 16-31): イントロアルペジオ 2 (on D)
            [E6,1], [B5,1], [E6,1], [Fs6,2], _, [B6,2], _, [Fs6,2], _, [E6,2], _, [B5,1], [E6,1], [B5,1], [E6,1], [Fs6,1],
            // Bar 2 (Steps 32-47): イントロアルペジオ 3 (on C)
            [E6,1], [B5,1], [E6,1], [Fs6,2], _, [B6,2], _, [Fs6,2], _, [E6,2], _, [B5,1], [E6,1], [B5,1], [E6,1], [Fs6,1],
            // Bar 3 (Steps 48-63): イントロアルペジオ 4 (on D)
            [E6,1], [B5,1], [E6,1], [Fs6,2], _, [B6,2], _, [Fs6,2], _, [E6,2], _, [B5,1], [E6,1], [B5,1], [E6,1], [Fs6,1],
            // Bar 4 (Steps 64-79): 本編メインテーマA1 (on E)
            [Ab5,1], [Fs5,1], [Ab5,1], [Bb5,2], _, [B5,2], _, [Bb5,2], _, [Ab5,2], _, [Fs5,1], [Ab5,1], [Fs5,1], [Ab5,1], [E5,1],
            // Bar 5 (Steps 80-95): 本編メインテーマA2 (on E)
            [Ab5,1], [Fs5,1], [Ab5,1], [Bb5,2], _, [B5,2], _, [Bb5,2], _, [Ab5,2], _, [Fs5,1], [Ab5,1], [Fs5,1], [Ab5,1], [E5,1],
            // Bar 6 (Steps 96-111): 本編展開 (on D -> A)
            [Fs5,1], [E5,1], [Fs5,1], [Ab5,2], _, [A5,2], _, [Ab5,2], _, [Fs5,2], _, [Ab5,1], [Fs5,1], [E5,1], [E5,10], _,
            // Bar 7 (Steps 112-127): ロングトーン＆ピックアップ (on A)
            _, _, _, _, _, _, _, _, [Cs5,1], [Eb5,1], [E5,1], [Fs5,2], _, [E5,1], [Eb5,1], [Cs5,1],
            // Bar 8 (Steps 128-143): 本編メインテーマB1 (on E)
            [Ab5,1], [Fs5,1], [Ab5,1], [Bb5,2], _, [B5,2], _, [Bb5,2], _, [Ab5,2], _, [Fs5,1], [Ab5,1], [Fs5,1], [Ab5,1], [E5,1],
            // Bar 9 (Steps 144-159): 本編メインテーマB2 (on E)
            [Ab5,1], [Fs5,1], [Ab5,1], [Bb5,2], _, [B5,2], _, [Bb5,2], _, [Ab5,2], _, [Fs5,1], [Ab5,1], [Fs5,1], [Ab5,1], [E5,1],
            // Bar 10 (Steps 160-175): クライマックス転調 (on D -> C)
            [Fs5,1], [E5,1], [Fs5,1], [Ab5,2], _, [A5,2], _, [Ab5,1], [Ab5,2], _, [Fs5,2], _, [Ab5,1], [E5,2], _, [E5,2],
            // Bar 11 (Steps 176-191): ターンアラウンド (on C -> Bb -> Ab)
            _, [E5,1], [Fs5,1], [E5,1], [D5,1], [D5,4], _, _, _, [D5,1], [E5,1], [D5,1], [C5,1], [C5,1], [Eb5,1], [G5,1]
        ];

        // 主旋律 中音パート (ch5: Konami 005289 波形メモリ o5 リード — ch7の1オクターブ下で分厚いユニゾンを形成)
        const sccLeadMid = [
            // Bar 0 (Steps 0-15)
            [E5,1], [B4,1], [E5,1], [Fs5,2], _, [B5,2], _, [Fs5,2], _, [E5,2], _, [B4,1], [E5,1], [B4,1], [E5,1], [Fs5,1],
            // Bar 1 (Steps 16-31)
            [E5,1], [B4,1], [E5,1], [Fs5,2], _, [B5,2], _, [Fs5,2], _, [E5,2], _, [B4,1], [E5,1], [B4,1], [E5,1], [Fs5,1],
            // Bar 2 (Steps 32-47)
            [E5,1], [B4,1], [E5,1], [Fs5,2], _, [B5,2], _, [Fs5,2], _, [E5,2], _, [B4,1], [E5,1], [B4,1], [E5,1], [Fs5,1],
            // Bar 3 (Steps 48-63)
            [E5,1], [B4,1], [E5,1], [Fs5,2], _, [B5,2], _, [Fs5,2], _, [E5,2], _, [B4,1], [E5,1], [B4,1], [E5,1], [Fs5,1],
            // Bar 4 (Steps 64-79)
            [Ab4,1], [Fs4,1], [Ab4,1], [Bb4,2], _, [B4,2], _, [Bb4,2], _, [Ab4,2], _, [Fs4,1], [Ab4,1], [Fs4,1], [Ab4,1], [E4,1],
            // Bar 5 (Steps 80-95)
            [Ab4,1], [Fs4,1], [Ab4,1], [Bb4,2], _, [B4,2], _, [Bb4,2], _, [Ab4,2], _, [Fs4,1], [Ab4,1], [Fs4,1], [Ab4,1], [E4,1],
            // Bar 6 (Steps 96-111)
            [Fs4,1], [E4,1], [Fs4,1], [Ab4,2], _, [A4,2], _, [Ab4,2], _, [Fs4,2], _, [Ab4,1], [Fs4,1], [E4,1], [E4,10], _,
            // Bar 7 (Steps 112-127)
            _, _, _, _, _, _, _, _, [Cs4,1], [Eb4,1], [E4,1], [Fs4,2], _, [E4,1], [Eb4,1], [Cs4,1],
            // Bar 8 (Steps 128-143)
            [Ab4,1], [Fs4,1], [Ab4,1], [Bb4,2], _, [B4,2], _, [Bb4,2], _, [Ab4,2], _, [Fs4,1], [Ab4,1], [Fs4,1], [Ab4,1], [E4,1],
            // Bar 9 (Steps 144-159)
            [Ab4,1], [Fs4,1], [Ab4,1], [Bb4,2], _, [B4,2], _, [Bb4,2], _, [Ab4,2], _, [Fs4,1], [Ab4,1], [Fs4,1], [Ab4,1], [E4,1],
            // Bar 10 (Steps 160-175)
            [Fs4,1], [E4,1], [Fs4,1], [Ab4,2], _, [A4,2], _, [Ab4,1], [Ab4,2], _, [Fs4,2], _, [Ab4,1], [E4,2], _, [E4,2],
            // Bar 11 (Steps 176-191)
            _, [E4,1], [Fs4,1], [E4,1], [D4,1], [D4,4], _, _, _, [D4,1], [E4,1], [D4,1], [C4,1], [C4,1], [Eb4,1], [G4,1]
        ];

        // バッキング・オスティナート 高音 (ch4: Konami 005289 o4 — イントロ5度ペダル＆本編16分2度打ち B-B-E-E)
        const sccOstinato = [
            // Bar 0 (Steps 0-15)
            [B4,2], _, [B4,4], _, _, _, [B4,4], _, _, _, [B4,4], _, _, _, [B4,2], _,
            // Bar 1 (Steps 16-31)
            [A4,2], _, [A4,4], _, _, _, [A4,4], _, _, _, [A4,4], _, _, _, [A4,2], _,
            // Bar 2 (Steps 32-47)
            [G4,2], _, [G4,4], _, _, _, [G4,4], _, _, _, [G4,4], _, _, _, [G4,2], _,
            // Bar 3 (Steps 48-63)
            [A4,2], _, [A4,4], _, _, _, [A4,4], _, _, _, [A4,4], _, _, _, [A4,2], _,
            // Bar 4 (Steps 64-79)
            [B4,1], [B4,1], [E5,1], [E5,1], [B4,1], [B4,1], [E5,1], [E5,1], [B4,1], [B4,1], [E5,1], [E5,1], [B4,1], [B4,1], [E5,1], [E5,1],
            // Bar 5 (Steps 80-95)
            [B4,1], [B4,1], [E5,1], [E5,1], [B4,1], [B4,1], [E5,1], [E5,1], [B4,1], [B4,1], [E5,1], [E5,1], [B4,1], [B4,1], [E5,1], [E5,1],
            // Bar 6 (Steps 96-111)
            [A4,1], [A4,1], [D5,1], [D5,1], [A4,1], [A4,1], [D5,1], [D5,1], [A4,1], [A4,1], [D5,1], [D5,1], [E4,1], [E4,1], [A4,1], [A4,1],
            // Bar 7 (Steps 112-127)
            [E4,1], [E4,1], [A4,1], [A4,1], [E4,1], [E4,1], [A4,1], [A4,1], [E4,1], [E4,1], [A4,1], [A4,1], [E4,1], [E4,1], [A4,1], [A4,1],
            // Bar 8 (Steps 128-143)
            [B4,1], [B4,1], [E5,1], [E5,1], [B4,1], [B4,1], [E5,1], [E5,1], [B4,1], [B4,1], [E5,1], [E5,1], [B4,1], [B4,1], [E5,1], [E5,1],
            // Bar 9 (Steps 144-159)
            [B4,1], [B4,1], [E5,1], [E5,1], [B4,1], [B4,1], [E5,1], [E5,1], [B4,1], [B4,1], [E5,1], [E5,1], [B4,1], [B4,1], [E5,1], [E5,1],
            // Bar 10 (Steps 160-175)
            [A4,1], [A4,1], [D5,1], [D5,1], [A4,1], [A4,1], [D5,1], [D5,1], [A4,1], [A4,1], [D5,1], [D5,1], [G4,1], [G4,1], [C5,1], [C5,1],
            // Bar 11 (Steps 176-191)
            [G4,1], [G4,1], [C5,1], [C5,1], [F4,1], [F4,1], [Bb4,1], [Bb4,1], [F4,1], [F4,1], [Bb4,1], [Bb4,1], [Eb4,1], [Eb4,1], [Ab4,1], [Ab4,1]
        ];

        // バッキング・オスティナート 低音 (ch6: Konami 005289 — 本編でch4の1オクターブ下を刻む)
        const psgOstinatoLow = [
            // Bar 0 (Steps 0-15)
            [B4,2], _, [B4,8], _, _, _, _, _, _, _, [B4,4], _, _, _, [B4,2], _,
            // Bar 1 (Steps 16-31)
            [A4,2], _, [A4,8], _, _, _, _, _, _, _, [A4,4], _, _, _, [A4,2], _,
            // Bar 2 (Steps 32-47)
            [G4,2], _, [G4,8], _, _, _, _, _, _, _, [G4,4], _, _, _, [G4,2], _,
            // Bar 3 (Steps 48-63)
            [A4,2], _, [A4,8], _, _, _, _, _, _, _, [A4,4], _, _, _, [A4,2], _,
            // Bar 4 (Steps 64-79)
            [B3,1], [B3,1], [E4,1], [E4,1], [B3,1], [B3,1], [E4,1], [E4,1], [B3,1], [B3,1], [E4,1], [E4,1], [B3,1], [B3,1], [E4,1], [E4,1],
            // Bar 5 (Steps 80-95)
            [B3,1], [B3,1], [E4,1], [E4,1], [B3,1], [B3,1], [E4,1], [E4,1], [B3,1], [B3,1], [E4,1], [E4,1], [B3,1], [B3,1], [E4,1], [E4,1],
            // Bar 6 (Steps 96-111)
            [A3,1], [A3,1], [D4,1], [D4,1], [A3,1], [A3,1], [D4,1], [D4,1], [A3,1], [A3,1], [D4,1], [D4,1], [E3,1], [E3,1], [A3,1], [A3,1],
            // Bar 7 (Steps 112-127)
            [E3,1], [E3,1], [A3,1], [A3,1], [E3,1], [E3,1], [A3,1], [A3,1], [E3,1], [E3,1], [A3,1], [A3,1], [E3,1], [E3,1], [A3,1], [A3,1],
            // Bar 8 (Steps 128-143)
            [B3,1], [B3,1], [E4,1], [E4,1], [B3,1], [B3,1], [E4,1], [E4,1], [B3,1], [B3,1], [E4,1], [E4,1], [B3,1], [B3,1], [E4,1], [E4,1],
            // Bar 9 (Steps 144-159)
            [B3,1], [B3,1], [E4,1], [E4,1], [B3,1], [B3,1], [E4,1], [E4,1], [B3,1], [B3,1], [E4,1], [E4,1], [B3,1], [B3,1], [E4,1], [E4,1],
            // Bar 10 (Steps 160-175)
            [A3,1], [A3,1], [D4,1], [D4,1], [A3,1], [A3,1], [D4,1], [D4,1], [A3,1], [A3,1], [D4,1], [D4,1], [G3,1], [G3,1], [C4,1], [C4,1],
            // Bar 11 (Steps 176-191)
            [G3,1], [G3,1], [C4,1], [C4,1], [F3,1], [F3,1], [Bb3,1], [Bb3,1], [F3,1], [F3,1], [Bb3,1], [Bb3,1], [Eb3,1], [Eb3,1], [Ab3,1], [Ab3,1]
        ];

        // ベースライン (ch8: AY-3-8910 PSG ベース — イントロのシンコペーションペダル＆本編の8分連打推進ベース)
        const bass = [
            // Bar 0 (Steps 0-15): E ペダル
            [E2,2], _, [E2,4], _, _, _, [E2,4], _, _, _, [E2,2], _, [E2,2], _, [E2,2], _,
            // Bar 1 (Steps 16-31): D ペダル
            [D2,2], _, [D2,4], _, _, _, [D2,4], _, _, _, [D2,2], _, [D2,2], _, [D2,2], _,
            // Bar 2 (Steps 32-47): C ペダル
            [C2,2], _, [C2,4], _, _, _, [C2,4], _, _, _, [C2,2], _, [C2,2], _, [C2,2], _,
            // Bar 3 (Steps 48-63): D ペダル
            [D2,2], _, [D2,4], _, _, _, [D2,2], _, [D2,4], _, _, _, [D2,2], _, [D2,2], _,
            // Bar 4 (Steps 64-79): E 8分連打
            [E2,2], _, [E2,2], _, [E2,2], _, [E2,2], _, [E2,2], _, [E2,2], _, [E2,2], _, [E2,2], _,
            // Bar 5 (Steps 80-95): E 8分連打
            [E2,2], _, [E2,2], _, [E2,2], _, [E2,2], _, [E2,2], _, [E2,2], _, [E2,2], _, [E2,2], _,
            // Bar 6 (Steps 96-111): D -> A
            [D2,2], _, [D2,2], _, [D2,2], _, [D2,2], _, [D2,2], _, [D2,2], _, [A1,2], _, [A1,2], _,
            // Bar 7 (Steps 112-127): A 8分連打
            [A1,2], _, [A1,2], _, [A1,2], _, [A1,2], _, [A1,2], _, [A1,2], _, [A1,2], _, [A1,2], _,
            // Bar 8 (Steps 128-143): E 8分連打
            [E2,2], _, [E2,2], _, [E2,2], _, [E2,2], _, [E2,2], _, [E2,2], _, [E2,2], _, [E2,2], _,
            // Bar 9 (Steps 144-159): E 8分連打
            [E2,2], _, [E2,2], _, [E2,2], _, [E2,2], _, [E2,2], _, [E2,2], _, [E2,2], _, [E2,2], _,
            // Bar 10 (Steps 160-175): D -> C
            [D2,2], _, [D2,2], _, [D2,2], _, [D2,2], _, [D2,2], _, [D2,2], _, [C2,2], _, [C2,2], _,
            // Bar 11 (Steps 176-191): C -> Bb -> Ab
            [C2,2], _, [C2,2], _, [Bb1,2], _, [Bb1,2], _, [Bb1,2], _, [Bb1,2], _, [Ab1,2], _, [Ab1,2], _
        ];

        this.startScheduler(bpm, totalSteps, (step, time, stepDur) => {
            // 1. 実機PSGノイズ風の軽快なパーカッション（主旋律と16分アルペジオを邪魔せず推進力を支える）
            const inIntro = (step < 64);
            const barStep = step % 16;
            if (inIntro) {
                if (barStep === 0 || barStep === 2 || barStep === 6 || barStep === 10 || barStep === 14) {
                    this.triggerKick(time, 0.42);
                    this.triggerHiHat(time, barStep === 2, 0.52);
                } else if (barStep % 2 === 0) {
                    this.triggerHiHat(time, false, 0.35);
                }
            } else {
                if (barStep % 4 === 0) {
                    this.triggerKick(time, 0.42);
                    this.triggerHiHat(time, false, 0.50);
                } else if (barStep % 4 === 2) {
                    this.triggerHiHat(time, true, 0.52);
                    if (barStep % 8 === 4) {
                        this.triggerSnare(time, 0.32);
                    }
                } else if (barStep % 2 === 1) {
                    this.triggerHiHat(time, false, 0.28);
                }
            }

            // 2. ベース (ch8: 重低音ベース + 実機o4帯域の倍音)
            this.triggerStepEvents(bass, step, time, stepDur, (midi, startTime, rawDur, lenSteps) => {
                const gate = (lenSteps <= 2) ? 0.82 : 0.88;
                const dur = rawDur * gate;
                this.triggerBass(midi, startTime, dur, 0.52);
                this.triggerHarmony(midi + 12, startTime, dur * 0.85, 0.14);
            });

            // 3. バッキング・オスティナート (ch4 & ch6: B-B-E-E 16分刻み)
            this.triggerStepEvents(sccOstinato, step, time, stepDur, (midi, startTime, rawDur, lenSteps) => {
                const gate = (lenSteps <= 1) ? 0.78 : 0.88;
                this.triggerHarmony(midi, startTime, rawDur * gate, 0.20);
            });
            this.triggerStepEvents(psgOstinatoLow, step, time, stepDur, (midi, startTime, rawDur, lenSteps) => {
                const gate = (lenSteps <= 1) ? 0.78 : 0.88;
                this.triggerArp(midi, startTime, rawDur * gate, 0.14);
            });

            // 4. 主旋律 中音 (ch5: Konami 005289 波形メモリリード)
            this.triggerStepEvents(sccLeadMid, step, time, stepDur, (midi, startTime, rawDur, lenSteps) => {
                const gate = (lenSteps <= 1) ? 0.85 : 0.92;
                const dur = rawDur * gate;
                this.triggerLead(midi, startTime, dur, 0.36);
                this.triggerBrass(midi, startTime, dur, 0.16);
            });

            // 5. 主旋律 高音 (ch7: AY-3-8910 PSG o6 リード — 1オクターブ上の煌びやかなダブリング)
            this.triggerStepEvents(psgLeadHigh, step, time, stepDur, (midi, startTime, rawDur, lenSteps) => {
                const gate = (lenSteps <= 1) ? 0.84 : 0.91;
                this.triggerHarmony(midi, startTime, rawDur * gate, 0.22);
            });
        }, loopStartStep);
    }

    // =========================================================================
    // 1面 メインBGM: 『CHALLENGER 1985 (1985 ARCADE GRADIUS STAGE 1: VOLCANO)』
    // 1985年本家アーケード版『グラディウス』1面（火山面）の不朽の名曲「Challenger 1985」（東野美紀 作曲）を
    // 実機基板（Konami 005289 + AY-3-8910 PSG）の楽譜データ（134 BPM / 変則13小節＝208ステップループ）
    // から全5チャンネル完全採譜・忠実再現！
    // ・0〜7小節 (Steps 0-127): 象徴的な16分音符スケール往復 (ch5: ド・シ・ラ・ソ・ファ・ソ・ラ・シ...) と
    //   オクターブ跳躍ギャロップベース (ch7/ch8: C -> Eb -> F -> Ab/Bb -> C -> Eb -> F -> G) に乗る有名なAメロ主旋律！
    // ・8〜12小節 (Steps 128-207): 伸びやかなBメロ高音主旋律 (ch5/ch8) ＆ 3度上昇カウンターハーモニー (ch4/ch6)！
    // =========================================================================
    playStageBgm(forceRestart = false) {
        if (!forceRestart && this.currentBgm === 'STAGE') return;
        this.currentBgm = 'STAGE';

        const bpm = 134;
        const totalSteps = 208; // 原作通り 全13小節ループ (Aパート8小節 + Bパート5小節 = 208ステップ)

        // 主旋律Aパート＆Bパート対旋律 (ch4 & ch6: Konami 005289 + PSG ユニゾンリード)
        const ch4And6 = [
            // Bar 0 (Steps 0-15): C 「ソー・ソ・ド・ファー・ミー・ド」
            [G4,4], _, _, _, [G4,3], _, _, [C5,1], [F5,2], _, [E5,4], _, _, _, [C5,2], _,
            // Bar 1 (Steps 16-31): Eb 「ソー・シ♭ー・ソラ♭シ♭ミ♭ファソ」
            [G5,3], _, _, [Bb4,1], [Bb4,6], _, _, _, _, _, [G4,1], [Ab4,1], [Bb4,1], [Eb5,1], [F5,1], [G5,1],
            // Bar 2 (Steps 32-47): F 「ドー・ラー・ドー・ファー・ラシドレ」
            [C5,3], _, _, [A4,3], _, _, [C5,4], _, _, _, [F5,2], _, [A4,1], [B4,1], [C5,1], [D5,1],
            // Bar 3 (Steps 48-63): Ab -> Bb 「ミ♭・ド・ラ♭・ミ♭・ド・ファ・レ・シ♭・レ・ファ」
            [Eb5,2], _, [C5,1], [Ab4,2], _, [Eb5,2], _, [C5,1], [F5,2], _, [D5,1], [Bb4,2], _, [D5,1], [F5,2], _,
            // Bar 4 (Steps 64-79): C 「ソー・ソ・ド・ファー・ミー・ド」
            [G4,4], _, _, _, [G4,3], _, _, [C5,1], [F5,2], _, [E5,4], _, _, _, [C5,2], _,
            // Bar 5 (Steps 80-95): Eb 「ソー・シ♭ー・ソラ♭シ♭ミ♭ファソ」
            [G5,3], _, _, [Bb4,1], [Bb4,6], _, _, _, _, _, [G4,1], [Ab4,1], [Bb4,1], [Eb5,1], [F5,1], [G5,1],
            // Bar 6 (Steps 96-111): F 「ラ・ド・ドー・ファ・ソ・ラー・ファ」
            [A5,2], _, [C5,1], [C5,3], _, _, [F5,2], _, [G5,2], _, [A5,4], _, _, _, [F5,2], _,
            // Bar 7 (Steps 112-127): G 「レー・ソーーー」
            [D5,3], _, _, [G5,1], [G5,12], _, _, _, _, _, _, _, _, _, _, _,
            // Bar 8 (Steps 128-143): Ab Bパート対旋律「ドー・ミ♭ー・ラ♭ーーー」
            [C5,3], _, _, [Eb5,3], _, _, [Ab5,10], _, _, _, _, _, _, _, _, _,
            // Bar 9 (Steps 144-159): Eb Bパート対旋律「シ♭ー・レー・ミ♭ーーー」
            [Bb4,3], _, _, [D5,3], _, _, [Eb5,10], _, _, _, _, _, _, _, _, _,
            // Bar 10 (Steps 160-175): F -> G 「ラシ♭ドファー・シドレソーー」
            [A4,1], [Bb4,1], [C5,1], [F5,5], _, _, _, _, [B4,1], [C5,1], [D5,1], [G5,5], _, _, _, _,
            // Bar 11 (Steps 176-191): Ab -> Bb 「ドレミ♭ラ♭ー・レミ♭ファシ♭・シ♭・ドーーー」
            [C5,1], [D5,1], [Eb5,1], [Ab5,5], _, _, _, _, [D5,1], [Eb5,1], [F5,1], [Bb5,1], [Bb5,2], _, [C6,10], _,
            // Bar 12 (Steps 192-207): Gsus4 -> G 「(ドーーー)・シーーー」
            _, _, _, _, _, _, _, _, [B5,8], _, _, _, _, _, _, _
        ];

        // 16分音符高速スケール往復 (Bars 0-7) ＆ Bパート主旋律 (Bars 8-12) (ch5: Konami 005289 o5)
        const ch5 = [
            // Bar 0 (Steps 0-15): C 16分スケール往復
            [C5,1], [B4,1], [A4,1], [G4,1], [F4,1], [G4,1], [A4,1], [B4,1], [C5,1], [B4,1], [A4,1], [G4,1], [F4,1], [G4,1], [A4,1], [B4,1],
            // Bar 1 (Steps 16-31): Eb 16分スケール往復
            [C5,1], [Bb4,1], [Ab4,1], [G4,1], [F4,1], [G4,1], [Ab4,1], [Bb4,1], [C5,1], [Bb4,1], [Ab4,1], [G4,1], [F4,1], [G4,1], [Ab4,1], [Bb4,1],
            // Bar 2 (Steps 32-47): F 16分スケール往復
            [C5,1], [B4,1], [A4,1], [G4,1], [F4,1], [G4,1], [A4,1], [B4,1], [C5,1], [B4,1], [A4,1], [G4,1], [F4,1], [G4,1], [A4,1], [B4,1],
            // Bar 3 (Steps 48-63): Ab -> Bb 16分スケール展開
            [C5,1], [Bb4,1], [Ab4,1], [G4,1], [F4,1], [G4,1], [Ab4,1], [Bb4,1], [C5,1], [D5,1], [Eb5,1], [D5,1], [C5,1], [Bb4,1], [Ab4,1], [Bb4,1],
            // Bar 4 (Steps 64-79): C 16分スケール往復
            [C5,1], [B4,1], [A4,1], [G4,1], [F4,1], [G4,1], [A4,1], [B4,1], [C5,1], [B4,1], [A4,1], [G4,1], [F4,1], [G4,1], [A4,1], [B4,1],
            // Bar 5 (Steps 80-95): Eb 16分スケール往復
            [C5,1], [Bb4,1], [Ab4,1], [G4,1], [F4,1], [G4,1], [Ab4,1], [Bb4,1], [C5,1], [Bb4,1], [Ab4,1], [G4,1], [F4,1], [G4,1], [Ab4,1], [Bb4,1],
            // Bar 6 (Steps 96-111): F 16分スケール往復
            [C5,1], [B4,1], [A4,1], [G4,1], [F4,1], [G4,1], [A4,1], [B4,1], [C5,1], [B4,1], [A4,1], [G4,1], [F4,1], [G4,1], [A4,1], [F4,1],
            // Bar 7 (Steps 112-127): G 16分スケール＆駆け上がり
            [D5,1], [C5,1], [B4,1], [A4,1], [G4,1], [A4,1], [B4,1], [C5,1], [D5,1], [C5,1], [B4,1], [A4,1], [G4,1], [B4,1], [D5,1], [G5,1],
            // Bar 8 (Steps 128-143): Bパート主旋律「ミ♭ー・ドー・ミ♭ーー・ドレミ♭」
            [Eb5,3], _, _, [C5,3], _, _, [Eb5,6], _, _, _, _, _, [C5,1], [D5,1], [Eb5,2], _,
            // Bar 9 (Steps 144-159): Bパート主旋律「レー・シ♭ー・ソーーー」
            [D5,3], _, _, [Bb4,3], _, _, [G4,10], _, _, _, _, _, _, _, _, _,
            // Bar 10 (Steps 160-175): Bパート主旋律「ドー・ラー・ドド・レー・シー・レレ」
            [C5,3], _, _, [A4,3], _, _, [C5,1], [C5,1], [D5,3], _, _, [B4,3], _, _, [D5,1], [D5,1],
            // Bar 11 (Steps 176-191): Bパート主旋律「ミ♭ー・ドー・ミ♭ファ・ファー・レー・ソーーー」
            [Eb5,3], _, _, [C5,3], _, _, [Eb5,1], [F5,1], [F5,3], _, _, [D5,3], _, _, [G5,18], _,
            // Bar 12 (Steps 192-207): G5 ロングトーン持続
            _, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _
        ];

        // ベースライン (ch7: AY-3-8910 PSG ギャロップベース＆Bパート16分分散和音ベース)
        const ch7Bass = [
            // Bar 0 (Steps 0-15): C ギャロップ
            [C2,2], _, [C3,1], [C3,1], [C2,2], _, [C3,1], [C3,1], [C2,2], _, [C3,1], [C3,1], [C2,2], _, [C3,1], [C3,1],
            // Bar 1 (Steps 16-31): Eb ギャロップ
            [Eb2,2], _, [Eb3,1], [Eb3,1], [Eb2,2], _, [Eb3,1], [Eb3,1], [Eb2,2], _, [Eb3,1], [Eb3,1], [Eb2,2], _, [Eb3,1], [Eb3,1],
            // Bar 2 (Steps 32-47): F ギャロップ
            [F2,2], _, [F3,1], [F3,1], [F2,2], _, [F3,1], [F3,1], [F2,2], _, [F3,1], [F3,1], [F2,2], _, [F3,1], [F3,1],
            // Bar 3 (Steps 48-63): Ab -> Bb ギャロップ
            [Ab2,2], _, [Ab3,1], [Ab3,1], [Ab2,2], _, [Ab3,1], [Ab3,1], [Bb2,2], _, [Bb3,1], [Bb3,1], [Bb2,2], _, [Bb3,1], [Bb3,1],
            // Bar 4 (Steps 64-79): C ギャロップ
            [C2,2], _, [C3,1], [C3,1], [C2,2], _, [C3,1], [C3,1], [C2,2], _, [C3,1], [C3,1], [C2,2], _, [C3,1], [C3,1],
            // Bar 5 (Steps 80-95): Eb ギャロップ
            [Eb2,2], _, [Eb3,1], [Eb3,1], [Eb2,2], _, [Eb3,1], [Eb3,1], [Eb2,2], _, [Eb3,1], [Eb3,1], [Eb2,2], _, [Eb3,1], [Eb3,1],
            // Bar 6 (Steps 96-111): F ギャロップ
            [F2,2], _, [F3,1], [F3,1], [F2,2], _, [F3,1], [F3,1], [F2,2], _, [F3,1], [F3,1], [F2,2], _, [F3,1], [F3,1],
            // Bar 7 (Steps 112-127): G ギャロップ
            [G2,2], _, [G3,1], [G3,1], [G2,2], _, [G3,1], [G3,1], [G2,2], _, [G3,1], [G3,1], [G2,2], _, [G3,1], [G3,1],
            // Bar 8 (Steps 128-143): Ab 16分アルペジオベース
            [Ab2,1], [Ab3,1], [Eb3,1], [Ab3,1], [Ab2,1], [Ab3,1], [Eb3,1], [Ab3,1], [Ab2,1], [Ab3,1], [Eb3,1], [Ab3,1], [Ab2,1], [Ab3,1], [Eb3,1], [Ab3,1],
            // Bar 9 (Steps 144-159): Eb 16分アルペジオベース
            [Eb2,1], [Eb3,1], [B2,1], [Eb3,1], [Eb2,1], [Eb3,1], [B2,1], [Eb3,1], [Eb2,1], [Eb3,1], [B2,1], [Eb3,1], [Eb2,1], [Eb3,1], [B2,1], [Eb3,1],
            // Bar 10 (Steps 160-175): F -> G 16分アルペジオベース
            [F2,1], [F3,1], [C3,1], [F3,1], [F2,1], [F3,1], [C3,1], [F3,1], [G2,1], [G3,1], [D3,1], [G3,1], [G2,1], [G3,1], [D3,1], [G3,1],
            // Bar 11 (Steps 176-191): Ab -> Bb 16分アルペジオベース
            [Ab2,1], [Ab3,1], [Eb3,1], [Ab3,1], [Ab2,1], [Ab3,1], [Eb3,1], [Ab3,1], [Bb2,1], [Bb3,1], [F3,1], [Bb3,1], [Bb2,1], [Bb3,1], [F3,1], [Bb3,1],
            // Bar 12 (Steps 192-207): G ギャロップターンアラウンド
            [G2,2], _, [G3,1], [G3,1], [G2,2], _, [G3,1], [G3,1], [G2,2], _, [G3,1], [G3,1], [G2,2], _, [G3,1], [G3,1]
        ];

        this.startScheduler(bpm, totalSteps, (step, time, stepDur) => {
            const barStep = step % 16;
            // 1. 実機PSGノイズ風の軽快なパーカッション（ギャロップリズムと疾走感を支える）
            if (barStep % 4 === 0) {
                this.triggerKick(time, 0.40);
                this.triggerHiHat(time, false, 0.50);
            } else if (barStep % 4 === 2) {
                this.triggerHiHat(time, true, 0.52);
                if (barStep % 8 === 4) {
                    this.triggerSnare(time, 0.32);
                }
            } else if (barStep % 4 === 3) {
                this.triggerHiHat(time, false, 0.35);
            }

            // 2. ベースライン (ch7 + Aパートではch8の1オクターブ上ダブリング)
            this.triggerStepEvents(ch7Bass, step, time, stepDur, (midi, startTime, rawDur, lenSteps) => {
                const gate = (lenSteps <= 1) ? 0.78 : 0.86;
                const dur = rawDur * gate;
                this.triggerBass(midi, startTime, dur, 0.52);
                if (step < 128) {
                    this.triggerHarmony(midi + 12, startTime, dur * 0.82, 0.14);
                }
            });

            // 3. ch4 & ch6: Aパート主旋律 (Steps 0-127) ／ Bパート3度対旋律 (Steps 128-207)
            this.triggerStepEvents(ch4And6, step, time, stepDur, (midi, startTime, rawDur, lenSteps) => {
                const gate = (lenSteps <= 1) ? 0.84 : 0.92;
                const dur = rawDur * gate;
                if (step < 128) {
                    this.triggerLead(midi, startTime, dur, 0.38);
                    this.triggerBrass(midi, startTime, dur, 0.18);
                } else {
                    this.triggerHarmony(midi, startTime, dur, 0.25);
                    this.triggerBrass(midi, startTime, dur, 0.14);
                }
            });

            // 4. ch5 (+ Bパートch8): Aパート16分音符スケール往復 (Steps 0-127) ／ Bパート高音主旋律 (Steps 128-207)
            this.triggerStepEvents(ch5, step, time, stepDur, (midi, startTime, rawDur, lenSteps) => {
                if (step < 128) {
                    const dur = rawDur * 0.82;
                    this.triggerHarmony(midi, startTime, dur, 0.22);
                    this.triggerArp(midi, startTime, dur, 0.14);
                } else {
                    const gate = (lenSteps <= 1) ? 0.85 : 0.92;
                    const dur = rawDur * gate;
                    this.triggerLead(midi, startTime, dur, 0.36);
                    // 原作ch8の1オクターブ上 (o6) 煌びやかなPSGユニゾンを重ねる
                    this.triggerHarmony(midi + 12, startTime, dur * 0.90, 0.22);
                    this.triggerBrass(midi, startTime, dur, 0.16);
                }
            });
        });
    }

    // =========================================================================
    // ボス戦＆1面火山噴火BGM: 『AIRCRAFT CARRIER (1985 ARCADE GRADIUS BOSS BGM)』
    // 1985年本家アーケード版『グラディウス』ボス戦BGM「Aircraft Carrier」（東野美紀 作曲）を
    // 実機基板（Konami 005289 波形メモリ2ch + AY-3-8910 PSG 3ch + パーカッション）の
    // 楽譜データ（GRADI-AC.MUS / 134 BPM / 13ステップ半音階上昇イントロ＋64ステップ無限ループ）
    // から1音1音・全5チャンネル対位法まで完全採譜！
    // =========================================================================
    _startAircraftCarrierBgm(bgmTag) {
        this.currentBgm = bgmTag;

        // 実機オリジナルテンポ: t134 (134 BPM)
        const bpm = 134;
        // イントロ13ステップ (16分音符×13個の半音階上昇 c d- d e- e f g- g a- a b- b > c)
        // ＋ 本編ループ4小節 (64ステップ) ＝ 全77ステップ (loopStartStep = 13)
        const loopStartStep = 13;
        const totalSteps = 77;

        // --- イントロ (Steps 0..12, 13ステップ): 全5チャンネル3オクターブ・ユニゾン半音階上昇 ---
        const introO4 = [
            [C4,1], [Db4,1], [D4,1], [Eb4,1], [E4,1], [F4,1],
            [Gb4,1], [G4,1], [Ab4,1], [A4,1], [Bb4,1], [B4,1], [C5,1]
        ];
        const introO3 = [
            [C3,1], [Db3,1], [D3,1], [Eb3,1], [E3,1], [F3,1],
            [Gb3,1], [G3,1], [Ab3,1], [A3,1], [Bb3,1], [B3,1], [C4,1]
        ];
        const introO2 = [
            [C2,1], [Db2,1], [D2,1], [Eb2,1], [E2,1], [F2,1],
            [Gb2,1], [G2,1], [Ab2,1], [A2,1], [Bb2,1], [B2,1], [C3,1]
        ];

        // --- ループ部 (Steps 13..76, 4小節 = 64ステップ) の基本モチーフ ---
        // f>fcd<g>fcd<a>fcd<g>fcd (16ステップ: F-F-C-D / G-F-C-D / A-F-C-D / G-F-C-D)
        const ostinatoF_o4 = [
            [F4,1], [F5,1], [C5,1], [D5,1],
            [G4,1], [F5,1], [C5,1], [D5,1],
            [A4,1], [F5,1], [C5,1], [D5,1],
            [G4,1], [F5,1], [C5,1], [D5,1]
        ];
        const ostinatoF_o3 = [
            [F3,1], [F4,1], [C4,1], [D4,1],
            [G3,1], [F4,1], [C4,1], [D4,1],
            [A3,1], [F4,1], [C4,1], [D4,1],
            [G3,1], [F4,1], [C4,1], [D4,1]
        ];

        // aagaaagaaagaaaga (16ステップ: ループ3小節目の高音反復モチーフ)
        const highA_o5 = [
            [A5,1], [A5,1], [G5,1], [A5,1],
            [A5,1], [A5,1], [G5,1], [A5,1],
            [A5,1], [A5,1], [G5,1], [A5,1],
            [A5,1], [A5,1], [G5,1], [A5,1]
        ];
        const highA_o4 = [
            [A4,1], [A4,1], [G4,1], [A4,1],
            [A4,1], [A4,1], [G4,1], [A4,1],
            [A4,1], [A4,1], [G4,1], [A4,1],
            [A4,1], [A4,1], [G4,1], [A4,1]
        ];

        // >cc<b->ccc<b->ccc<b->ccc<b->c (16ステップ: ループ4小節目の最高音クライマックス)
        const highC_o6 = [
            [C6,1], [C6,1], [Bb5,1], [C6,1],
            [C6,1], [C6,1], [Bb5,1], [C6,1],
            [C6,1], [C6,1], [Bb5,1], [C6,1],
            [C6,1], [C6,1], [Bb5,1], [C6,1]
        ];

        // シンコペーション・パルス (n16 n8 n16 = 4ステップ) ヘルパー
        const syncPulse = (n) => [[n,1], [n,2], _, [n,1]];
        const syncBar = (n1, n2, n3, n4) => [
            ...syncPulse(n1), ...syncPulse(n2), ...syncPulse(n3), ...syncPulse(n4)
        ];

        // 1. Ch4 (Konami 005289 Lead 1: 主旋律)
        const ch4Track = [
            ...introO4,
            ...ostinatoF_o4,
            ...ostinatoF_o4,
            ...highA_o5,
            ...highC_o6
        ];

        // 2. Ch5 (Konami 005289 Lead 2: ループ後半も f>fcd<g>fcd<a>fcd<g>fcd を維持する対位法パート)
        const ch5Track = [
            ...introO4,
            ...ostinatoF_o4,
            ...ostinatoF_o4,
            ...ostinatoF_o4,
            ...ostinatoF_o4
        ];

        // 3. Ch7 (AY-3-8910 PSG Sub-Octave: 1オクターブ下の厚いパルス＆4小節目C5シンコペーション)
        const ch7Track = [
            ...introO3,
            ...ostinatoF_o3,
            ...ostinatoF_o3,
            ...highA_o4,
            ...syncBar(C5, C5, C5, C5)
        ];

        // 4. Ch8 (AY-3-8910 PSG Syncopated Mid-Bass / Counter-Riff: F3 -> C3 -> C3/F4/A4 上昇リフ)
        const ch8Track = [
            ...introO3,
            ...syncBar(F3, F3, F3, F3),
            ...syncBar(C3, C3, C3, C3),
            ...syncBar(C3, C3, F4, A4),
            ...syncBar(C3, F4, A4, A4)
        ];

        // 5. Ch6 (Konami 005289 Pedal Bass: F2 シンコペーション・ペダルベース)
        const ch6Track = [
            ...introO2,
            ...syncBar(F2, F2, F2, F2),
            ...syncBar(F2, F2, F2, F2),
            ...syncBar(F2, F2, F2, F2),
            ...syncBar(F2, F2, F2, F2)
        ];

        this.startScheduler(bpm, totalSteps, (step, time, stepDur) => {
            // イントロ (step < 13) は実機エンベロープ (@e2 -> @e0) に合わせてクレッシェンド
            const isIntro = step < loopStartStep;
            const gainMult = isIntro ? (0.38 + (step / 12) * 0.62) : 1.0;

            // 1. Ch4: 主旋律リード
            const c4 = ch4Track[step];
            if (Array.isArray(c4)) {
                const [note, len] = c4;
                const dur = stepDur * len * 0.86;
                this.triggerLead(note, time, dur, 0.34 * gainMult);
                this.triggerBrass(note, time, dur, 0.20 * gainMult);
            }

            // 2. Ch5: 第2波形メモリ (ループ後半のステップ45〜76では対位法オスティナートとして独立)
            const c5 = ch5Track[step];
            if (Array.isArray(c5)) {
                const [note, len] = c5;
                const dur = stepDur * len * 0.86;
                const isCounterpart = step >= 45;
                this.triggerHarmony(note, time, dur, (isCounterpart ? 0.28 : 0.18) * gainMult);
                this.triggerArp(note, time, dur * 0.90, (isCounterpart ? 0.20 : 0.14) * gainMult);
            }

            // 3. Ch7: PSG 1オクターブ下パルス＆C5シンコペーション
            const c7 = ch7Track[step];
            if (Array.isArray(c7)) {
                const [note, len] = c7;
                const dur = stepDur * len * 0.88;
                this.triggerStrings(note, time, dur, 0.18 * gainMult);
                this.triggerArp(note, time, dur * 0.88, 0.16 * gainMult);
            }

            // 4. Ch8: PSG シンコペーション中音リフ (F3 / C3 / F4 / A4)
            const c8 = ch8Track[step];
            if (Array.isArray(c8)) {
                const [note, len] = c8;
                const dur = stepDur * len * 0.88;
                this.triggerHarmony(note, time, dur, 0.24 * gainMult);
                this.triggerBass(note, time, dur, 0.34 * gainMult);
            }

            // 5. Ch6: 波形メモリ重低音ペダルベース (F2 ff8f)
            const c6 = ch6Track[step];
            if (Array.isArray(c6)) {
                const [note, len] = c6;
                const dur = stepDur * len * 0.90;
                this.triggerBass(note, time, dur, 0.58 * gainMult);
            }

            // 6. 実機パーカッション (イントロ13ステップ休符、ループ部で c8cc8cc8cc8cc8cc & c4c4c4c8c8)
            if (!isIntro) {
                const loopStep = step - loopStartStep;
                const barStep = loopStep % 16;
                const beatStep = loopStep % 4;

                if (beatStep === 0) {
                    this.triggerKick(time, 0.62);
                    this.triggerHiHat(time, false, 0.85);
                    if (barStep === 12) {
                        this.triggerSnare(time, 0.44);
                    }
                } else if (beatStep === 2) {
                    this.triggerHiHat(time, true, 0.90);
                    if (barStep === 14) {
                        this.triggerSnare(time, 0.46);
                    }
                } else if (beatStep === 3) {
                    this.triggerHiHat(time, false, 0.80);
                }
            }
        }, loopStartStep);
    }

    playBossBgm(forceRestart = false) {
        // 1面火山噴火(VOLCANO_SURVIVAL)からボス戦(BOSS)へ移行する際は、
        // 原作同様に「Aircraft Carrier」を途切れさせずシームレスに継続再生する
        if (!forceRestart && (this.currentBgm === 'BOSS' || this.currentBgm === 'VOLCANO_SURVIVAL')) {
            this.currentBgm = 'BOSS';
            return;
        }
        this._startAircraftCarrierBgm('BOSS');
    }

    // 警告音・クリアジングルは演出の引き締めのため完全カット
    playWarningSound() {}
    playClearJingle() {}

    // =========================================================================
    // 1面 火山噴火BGM: 原作（FC/MSX/AC版グラディウス）に準拠し、
    // 1面終盤の火山噴火イベント突入から名曲『AIRCRAFT CARRIER』を演奏開始！
    // =========================================================================
    playVolcanoSurvivalBgm(forceRestart = false) {
        if (!forceRestart && (this.currentBgm === 'VOLCANO_SURVIVAL' || this.currentBgm === 'BOSS')) {
            this.currentBgm = 'VOLCANO_SURVIVAL';
            return;
        }
        this._startAircraftCarrierBgm('VOLCANO_SURVIVAL');
    }

    // =========================================================================
    // 2面 メインBGM: 『BEAT BACK (1985 ARCADE GRADIUS STAGE 2: STONEHENGE)』
    // 1985年本家アーケード版『グラディウス』2面（ストーンヘンジ面）の名曲「Beat Back」（東野美紀 作曲）を
    // 実機基板（Konami 005289 + AY-3-8910 PSG）の楽譜データ（146 BPM / 全14小節＝224ステップループ）
    // から全5チャンネル完全採譜・忠実再現！
    // ・0〜2小節: Dマイナー16分シンコペーションベース (D-D-D'-D-D-D-D-D'-D) 上の「ド・ドーーー・ドシド・ドーーー」テーマ
    // ・3〜6小節: 半音進行からEペダルへ展開する「ミ・ミ♭・レ・ミ♭・ミ・ファ〜ファ#〜」主旋律＆3度ハモリ
    // ・7〜9小節: 象徴的な高速アルペジオ＆64分/32分音符駆け上がりベース (Ab -> G -> Gb) 上の「シ♭ー・ラー・ラ♭ー」下降セクション
    // ・10〜13小節: シンコペーション・リフとターンアラウンド
    // =========================================================================
    playStage2Bgm(forceRestart = false) {
        if (!forceRestart && this.currentBgm === 'STAGE2') return;
        this.currentBgm = 'STAGE2';

        const bpm = 146;
        const totalSteps = 224; // 原作通り 全14小節ループ (224ステップ)

        // 主旋律 (ch4 & ch6: Konami 005289 + PSG リード)
        const sccLead = [
            // Bar 0 (Steps 0-15): ピックアップ「(ミ♭ーーー)・ド・ドーーー」(2周目以降はBar 13末尾のEb4が12ステップ持続)
            _, _, _, _, _, _, _, _, _, _, _, _, [C5,2], _, [C5,14], _,
            // Bar 1 (Steps 16-31): 「(ドーーー)・ドシドー」
            _, _, _, _, _, _, _, _, _, _, _, _, [C5,1], [B4,1], [C5,3], _,
            // Bar 2 (Steps 32-47): 「(ド)・低ド・ドーー・ドシド」
            _, [C4,2], _, [C4,5], _, _, _, _, _, _, _, _, [C5,1], [B4,1], [C5,2], _,
            // Bar 3 (Steps 48-63): 「ミー・ミ♭ー・レー・ミ♭ー・ミ・ファーーー」
            [E5,3], _, _, [Eb5,3], _, _, [D5,3], _, _, [Eb5,3], _, _, [E5,2], _, [F5,6], _,
            // Bar 4 (Steps 64-79): 「(ファ)・ファ#ーーー・ファ#ファファ#ー」
            _, _, _, _, [Fs5,6], _, _, _, _, _, _, _, [Fs5,1], [F5,1], [Fs5,3], _,
            // Bar 5 (Steps 80-95): 「ファ#ー・ファ#ーー・ファ#・ファ#・ラ・ラー」
            _, [Fs5,3], _, _, [Fs5,4], _, _, _, _, [Fs5,2], _, [Fs5,1], [A5,2], _, [A5,3], _,
            // Bar 6 (Steps 96-111): 「ファ#ー・ファ#ーー・ファ#・ファ#・ラ・ラシ♭」
            _, [Fs5,3], _, _, [Fs5,4], _, _, _, _, [Fs5,2], _, [Fs5,1], [A5,2], _, [A5,1], [Bb5,1],
            // Bar 7 (Steps 112-127): 「シ♭ーーーーー・シ♭・シ♭・ラ」
            [Bb5,12], _, _, _, _, _, _, _, _, _, _, _, [Bb5,1], [Bb5,2], _, [A5,1],
            // Bar 8 (Steps 128-143): 「ラーーーーー・ラ・ラ・ラ♭」
            [A5,12], _, _, _, _, _, _, _, _, _, _, _, [A5,1], [A5,2], _, [Ab5,1],
            // Bar 9 (Steps 144-159): 「ラ♭ーーーーー・ファ・ファ・ド」
            [Ab5,12], _, _, _, _, _, _, _, _, _, _, _, [F5,1], [F5,2], _, [C5,1],
            // Bar 10 (Steps 160-175): 「ドーーー・低ド・ド・ミ♭・ミ♭」
            [C5,9], _, _, _, _, _, _, _, _, [C4,2], _, [C4,1], [Eb4,2], _, [Eb4,2], _,
            // Bar 11 (Steps 176-191): 「ドー・ドー・低ド・ド・ファ#・ファ#ー」
            [C5,4], _, _, _, [C5,5], _, _, _, _, [C4,2], _, [C4,1], [Fs4,2], _, [Fs4,3], _,
            // Bar 12 (Steps 192-207): 「ファ#・ファ#・ファ#・ファファ#・ファ#ー・ファ#ファミ♭ド」
            _, [Fs4,1], [Fs4,2], _, [Fs4,2], _, [F4,1], [Fs4,1], [Fs4,4], _, _, _, [Fs4,1], [F4,1], [Eb4,1], [C4,1],
            // Bar 13 (Steps 208-223): 「ドーーーーー・ミ♭・ミ♭ーーー(Bar 0へタイ持続)」
            [C4,12], _, _, _, _, _, _, _, _, _, _, _, [Eb4,2], _, [Eb4,14], _
        ];

        // 3度・6度カウンターハーモニー (ch5: Konami 005289 第2チャンネル)
        const sccHarm = [
            // Bar 0 (Steps 0-15)
            _, _, _, _, _, _, _, _, _, _, _, _, [A5,2], _, [A5,15], _,
            // Bar 1 (Steps 16-31)
            _, _, _, _, _, _, _, _, _, _, _, _, _, [G5,1], [A5,3], _,
            // Bar 2 (Steps 32-47)
            _, [F3,2], _, [F3,5], _, _, _, _, _, _, _, _, [A4,1], [Ab4,1], [A4,2], _,
            // Bar 3 (Steps 48-63)
            [C5,3], _, _, [B4,3], _, _, [Bb4,3], _, _, [B4,3], _, _, [C5,2], _, [Cs5,6], _,
            // Bar 4 (Steps 64-79)
            _, _, _, _, [D5,6], _, _, _, _, _, _, _, [D5,1], [Cs5,1], [D5,3], _,
            // Bar 5 (Steps 80-95)
            _, [D5,3], _, _, [D5,4], _, _, _, _, [D5,2], _, [D5,1], [F5,2], _, [F5,3], _,
            // Bar 6 (Steps 96-111)
            _, [D5,3], _, _, [D5,4], _, _, _, _, [D5,2], _, [D5,1], [F5,2], _, [F5,1], [Fs5,1],
            // Bar 7 (Steps 112-127)
            [Fs5,12], _, _, _, _, _, _, _, _, _, _, _, [Fs5,1], [Fs5,2], _, [F5,1],
            // Bar 8 (Steps 128-143)
            [F5,12], _, _, _, _, _, _, _, _, _, _, _, [F5,1], [F5,2], _, [E5,1],
            // Bar 9 (Steps 144-159)
            [E5,12], _, _, _, _, _, _, _, _, _, _, _, [Cs5,1], [Cs5,2], _, [A4,1],
            // Bar 10 (Steps 160-175)
            [A4,3], _, _, [A4,6], _, _, _, _, _, [A3,2], _, [A3,1], [C4,2], _, [C4,2], _,
            // Bar 11 (Steps 176-191)
            [A4,1], [A4,8], _, _, _, _, _, _, _, [A3,2], _, [A3,1], [Eb4,2], _, [Eb4,4], _,
            // Bar 12 (Steps 192-207)
            _, _, [Eb4,2], _, [Eb4,2], _, [D4,1], [Eb4,1], [Eb4,4], _, _, _, [Eb4,1], [D4,1], [C4,1], [A3,1],
            // Bar 13 (Steps 208-223)
            [A3,12], _, _, _, _, _, _, _, _, _, _, _, [C4,2], _, [C4,14], _
        ];

        // ベース＆高速アルペジオライン (ch7 & ch8: AY-3-8910 PSG オクターブユニゾンベース)
        const bass = [
            // Bar 0 (Steps 0-15): D シンコペーションベース
            [D2,2], _, [D2,2], _, [D3,2], _, [D2,1], [D2,2], _, [D2,2], _, [D2,1], [D3,2], _, [D3,2], _,
            // Bar 1 (Steps 16-31): D シンコペーションベース
            [D2,2], _, [D2,2], _, [D3,2], _, [D2,1], [D2,2], _, [D2,2], _, [D2,1], [D3,2], _, [D3,2], _,
            // Bar 2 (Steps 32-47): D シンコペーションベース
            [D2,2], _, [D2,2], _, [D3,2], _, [D2,1], [D2,2], _, [D2,2], _, [D2,1], [D3,2], _, [D3,2], _,
            // Bar 3 (Steps 48-63): D -> Db -> C -> Db -> D -> Eb 半音うねりベース
            [D3,2], _, [D3,1], [Cs3,2], _, [Cs3,1], [C3,2], _, [C3,1], [Cs3,1], [Cs3,2], _, [D3,1], [D3,1], [Eb3,2], _,
            // Bar 4 (Steps 64-79): E シンコペーションベース
            [E2,2], _, [E2,2], _, [E3,2], _, [E2,1], [E2,2], _, [E2,2], _, [E2,1], [E3,1], [Eb3,1], [E3,2], _,
            // Bar 5 (Steps 80-95): E -> G ベース
            [E2,2], _, [E2,2], _, [E3,2], _, [E2,1], [E2,2], _, [E2,2], _, [E2,1], [G2,2], _, [G2,2], _,
            // Bar 6 (Steps 96-111): E -> G -> Ab ベース
            [E2,2], _, [E2,2], _, [E3,2], _, [E2,1], [E2,2], _, [E2,2], _, [E2,1], [G2,2], _, [G2,1], [Ab2,1],
            // Bar 7 (Steps 112-127): Ab7 16分音符＋後半32分/64分音符高速駆け上がりアルペジオ！
            [Ab2,1], [Eb3,1], [Fs3,1], [Bb3,1], [C4,1], [Eb4,1], [Fs4,1], [Eb4,1], [C4,1], [Bb3,1], [Fs3,1], [Eb3,1],
            [[Ab2,0.75,0], [Eb3,0.75,0.75]], [Fs3,0.5,0.5], [[Bb3,0.75,0], [C4,0.75,0.75]], [Eb4,0.5,0.5],
            // Bar 8 (Steps 128-143): G7 16分音符＋後半32分/64分音符高速駆け上がりアルペジオ！
            [G2,1], [D3,1], [F3,1], [A3,1], [B3,1], [D4,1], [F4,1], [D4,1], [B3,1], [G3,1], [F3,1], [D3,1],
            [[G2,0.75,0], [D3,0.75,0.75]], [F3,0.5,0.5], [[A3,0.75,0], [B3,0.75,0.75]], [D4,0.5,0.5],
            // Bar 9 (Steps 144-159): Gb7 16分音符アルペジオ -> D 突入
            [Fs2,1], [Cs3,1], [E3,1], [Ab3,1], [Bb3,1], [Cs4,1], [E4,1], [Cs4,1], [Bb3,1], [F3,1], [E3,1], [Cs3,1], [Eb2,1], [Bb2,1], [Cs3,1], [D2,3],
            // Bar 10 (Steps 160-175): D -> F シンコペーションベース
            _, _, [D2,2], _, [D3,2], _, [D2,1], [D2,2], _, [D2,2], _, [D2,1], [F2,2], _, [F2,2], _,
            // Bar 11 (Steps 176-191): D -> Ab シンコペーションベース
            [D2,2], _, [D2,2], _, [D3,2], _, [D2,1], [D2,2], _, [D2,2], _, [D2,1], [Ab2,2], _, [Ab2,2], _,
            // Bar 12 (Steps 192-207): Ab ブレイク -> D
            _, [Ab2,1], [Ab2,2], _, [Ab2,2], _, [G2,1], [Ab2,5], _, _, _, _, [Ab2,1], [G2,1], [F2,1], [D2,3],
            // Bar 13 (Steps 208-223): D ターンアラウンド・ベースフィル
            _, _, [A2,1], [C3,2], _, [D3,2], _, [C3,2], _, [D3,2], _, [C3,1], [F3,2], _, [F3,2], _
        ];

        this.startScheduler(bpm, totalSteps, (step, time, stepDur) => {
            const barStep = step % 16;
            // 1. 実機PSGノイズ風の軽快な16ビートパーカッション
            if (barStep === 0 || barStep === 6 || barStep === 10) {
                this.triggerKick(time, 0.42);
                this.triggerHiHat(time, false, 0.50);
            } else if (barStep === 4 || barStep === 12) {
                this.triggerSnare(time, 0.34);
                this.triggerHiHat(time, true, 0.52);
            } else if (barStep % 2 === 0) {
                this.triggerHiHat(time, false, 0.38);
            } else if (barStep === 7 || barStep === 15) {
                this.triggerHiHat(time, false, 0.26);
            }

            // 2. ベース＆高速アルペジオ (ch8 o2 + ch7 o3 1オクターブ上ダブリング)
            this.triggerStepEvents(bass, step, time, stepDur, (midi, startTime, rawDur, lenSteps) => {
                const gate = (lenSteps <= 1) ? 0.82 : 0.88;
                const dur = rawDur * gate;
                this.triggerBass(midi, startTime, dur, 0.52);
                this.triggerHarmony(midi + 12, startTime, dur * 0.85, 0.16);
            });

            // 3. 主旋律 (ch4 & ch6: Konami 005289 リード + PSG ユニゾン)
            this.triggerStepEvents(sccLead, step, time, stepDur, (midi, startTime, rawDur, lenSteps) => {
                const gate = (lenSteps <= 1) ? 0.84 : 0.92;
                const dur = rawDur * gate;
                this.triggerLead(midi, startTime, dur, 0.38);
                this.triggerBrass(midi, startTime, dur, 0.16);
            });

            // 4. カウンターハーモニー (ch5: Konami 005289 第2チャンネル)
            this.triggerStepEvents(sccHarm, step, time, stepDur, (midi, startTime, rawDur, lenSteps) => {
                const gate = (lenSteps <= 1) ? 0.84 : 0.91;
                const dur = rawDur * gate;
                this.triggerHarmony(midi, startTime, dur, 0.25);
            });
        });
    }

    // =========================================================================
    // 3面 メインBGM: 『BLANK MASK (1985 ARCADE GRADIUS STAGE 3: MOAI)』
    // 1985年本家アーケード版『グラディウス』3面（モアイ面）の名曲「Blank Mask」（東野美紀 作曲）を
    // 実機基板（Konami 005289 + AY-3-8910 PSG）の楽譜データ（124 BPM / 変則11小節＝176ステップループ）
    // から全5チャンネル完全採譜・忠実再現！
    // ・0〜3小節 (Steps 0-63): 独特なシンコペーション・うねりベース (G-B-C-C-B-E-B-C-A) 上の
    //   完全4度並行ハーモニー「ド・ドー・シ・シー・ドドド・ソ・シー」メインリフ！
    // ・4〜6小節 (Steps 64-111): 変拍子ポリリズム風（6拍フレーズ×2）に錯綜する神秘的なBパート展開！
    // ・7〜10小節 (Steps 112-175): メインリフ再現から Bar 10 の付点16分（1.25 : 1.25 : 1.5ステップ）キメ連打ターンアラウンド！
    // =========================================================================
    playStage3Bgm(forceRestart = false) {
        if (!forceRestart && this.currentBgm === 'STAGE3') return;
        this.currentBgm = 'STAGE3';

        const bpm = 124;
        const totalSteps = 176; // 原作通り 全11小節ループ (176ステップ)

        // 主旋律 (ch4 & ch6: Konami 005289 + PSG リード)
        const sccLead = [
            // Bar 0 (Steps 0-15): Aパート1「(ド)・ド・ドー・シ・シー・ドドド・ソ・シー」(2周目以降はBar 10末尾のC5がStep 0までタイ持続)
            _, [C5,1], [C5,3], _, _, [B4,1], [B4,3], _, _, [C5,1], [C5,1], [C5,1], [G4,2], _, [B4,3], _,
            // Bar 1 (Steps 16-31): Aパート2
            _, [C5,1], [C5,3], _, _, [B4,1], [B4,3], _, _, [C5,1], [C5,1], [C5,1], [G4,2], _, [B4,3], _,
            // Bar 2 (Steps 32-47): Aパート3
            _, [C5,1], [C5,3], _, _, [B4,1], [B4,3], _, _, [C5,1], [C5,1], [C5,1], [G4,2], _, [B4,3], _,
            // Bar 3 (Steps 48-63): Aパート4
            _, [C5,1], [C5,3], _, _, [B4,1], [B4,3], _, _, [C5,1], [C5,1], [C5,1], [G4,2], _, [B4,3], _,
            // Bar 4 (Steps 64-79): Bパート（変拍子風ポリリズム展開 1）
            _, [Eb4,1], [Eb4,2], _, [Ab4,2], _, [Fs4,1], [Ab4,2], _, [B4,2], _, [B4,1], [Cs5,3], _, _, [Eb4,1],
            // Bar 5 (Steps 80-95): Bパート（変拍子風ポリリズム展開 2）
            [Eb4,2], _, [Ab4,2], _, [Fs4,1], [Ab4,2], _, [B4,2], _, [B4,2], _, [Eb4,1], [Eb4,2], _, [Ab4,2], _,
            // Bar 6 (Steps 96-111): Bパート（変拍子風ポリリズム展開 3）
            [Fs4,1], [Ab4,2], _, [B4,2], _, [B4,1], [Cs5,3], _, _, [Eb4,1], [Eb4,2], _, [Ab4,2], _, [Fs4,1], [Ab4,2],
            // Bar 7 (Steps 112-127): A'パート再現 1
            _, [B4,2], _, [B4,2], _, [C5,1], [C5,3], _, _, [B4,1], [B4,3], _, _, [C5,1], [C5,1], [C5,1],
            // Bar 8 (Steps 128-143): A'パート再現 2
            [G4,2], _, [B4,3], _, _, [C5,1], [C5,3], _, _, [B4,1], [B4,3], _, _, [C5,1], [C5,1], [C5,1],
            // Bar 9 (Steps 144-159): A'パート再現 3
            [G4,2], _, [B4,3], _, _, [C5,1], [C5,3], _, _, [B4,2], _, [G4,2], _, [C5,1], [C5,3], _,
            // Bar 10 (Steps 160-175): 象徴的な付点16分（1.25 : 1.25 : 1.5ステップ）キメ連打ターンアラウンド！
            _, [B4,2], _, [G4,1], [C5,1.25], [B4,1.25,0.25], [C5,1.5,0.5], _,
            [B4,1.25], [G4,1.25,0.25], [B4,1.5,0.5], _, [C5,1.25], [B4,1.25,0.25], [C5,2.5,0.5], _
        ];

        // 完全4度下並行ハーモニー (ch5: Konami 005289 第2チャンネル — モアイ面特有の神秘的な4度ハモリ！)
        const sccHarm = [
            // Bar 0 (Steps 0-15)
            _, [G4,1], [G4,3], _, _, [F4,1], [F4,3], _, _, [G4,1], [G4,1], [G4,1], [D4,2], _, [F4,3], _,
            // Bar 1 (Steps 16-31)
            _, [G4,1], [G4,3], _, _, [F4,1], [F4,3], _, _, [G4,1], [G4,1], [G4,1], [D4,2], _, [F4,3], _,
            // Bar 2 (Steps 32-47)
            _, [G4,1], [G4,3], _, _, [F4,1], [F4,3], _, _, [G4,1], [G4,1], [G4,1], [D4,2], _, [F4,3], _,
            // Bar 3 (Steps 48-63)
            _, [G4,1], [G4,3], _, _, [F4,1], [F4,3], _, _, [G4,1], [G4,1], [G4,1], [D4,2], _, [F4,3], _,
            // Bar 4 (Steps 64-79)
            _, [Bb3,1], [Bb3,2], _, [Eb4,2], _, [Cs4,1], [Eb4,2], _, [G4,2], _, [G4,1], [Ab4,3], _, _, [Bb3,1],
            // Bar 5 (Steps 80-95)
            [Bb3,2], _, [Eb4,2], _, [Cs4,1], [Eb4,2], _, [Fs4,2], _, [Fs4,2], _, [Bb3,1], [Bb3,2], _, [Eb4,2], _,
            // Bar 6 (Steps 96-111)
            [Cs4,1], [Eb4,2], _, [G4,2], _, [G4,1], [Ab4,3], _, _, [Bb3,1], [Bb3,2], _, [Eb4,2], _, [Cs4,1], [Eb4,2],
            // Bar 7 (Steps 112-127)
            _, [Fs4,2], _, [Fs4,2], _, [G4,1], [G4,3], _, _, [F4,1], [F4,3], _, _, [G4,1], [G4,1], [G4,1],
            // Bar 8 (Steps 128-143)
            [D4,2], _, [F4,3], _, _, [G4,1], [G4,3], _, _, [F4,1], [F4,3], _, _, [G4,1], [G4,1], [G4,1],
            // Bar 9 (Steps 144-159)
            [D4,2], _, [F4,3], _, _, [G4,1], [G4,3], _, _, [F4,2], _, [D4,2], _, [G4,1], [G4,3], _,
            // Bar 10 (Steps 160-175)
            _, [F4,2], _, [D4,1], [G4,1.25], [F4,1.25,0.25], [G4,1.5,0.5], _,
            [F4,1.25], [D4,1.25,0.25], [F4,1.5,0.5], _, [G4,1.25], [F4,1.25,0.25], [G4,2.5,0.5], _
        ];

        // ベースライン (ch7 & ch8: AY-3-8910 PSG オクターブユニゾン・うねりベース)
        const bass = [
            // Bar 0 (Steps 0-15)
            [G2,2], _, [B2,1], [C3,1], [C3,2], _, [B2,2], _, [E3,3], _, _, [B2,1], [C3,2], _, [A2,2], _,
            // Bar 1 (Steps 16-31)
            [G2,2], _, [B2,1], [C3,1], [C3,2], _, [B2,2], _, [E3,3], _, _, [B2,1], [C3,2], _, [A2,2], _,
            // Bar 2 (Steps 32-47)
            [G2,2], _, [B2,1], [C3,1], [C3,2], _, [B2,2], _, [E3,3], _, _, [B2,1], [C3,2], _, [A2,2], _,
            // Bar 3 (Steps 48-63)
            [G2,2], _, [B2,1], [C3,1], [C3,2], _, [B2,2], _, [E3,3], _, _, [B2,1], [C3,2], _, [A2,2], _,
            // Bar 4 (Steps 64-79)
            [Bb2,2], _, [Eb3,1], [Cs3,1], [Fs3,2], _, [Cs3,2], _, [Eb3,2], _, [C3,2], _, [Bb2,2], _, [Bb2,2], _,
            // Bar 5 (Steps 80-95)
            [Eb3,1], [Cs3,1], [Fs3,2], _, [Cs3,2], _, [Eb3,2], _, [C3,2], _, [Bb2,2], _, [Eb3,1], [Cs3,1], [Fs3,2], _,
            // Bar 6 (Steps 96-111)
            [Cs3,2], _, [Eb3,2], _, [C3,2], _, [Bb2,2], _, [Bb2,2], _, [Eb3,1], [Cs3,1], [Fs3,2], _, [Cs3,2], _,
            // Bar 7 (Steps 112-127)
            [Eb3,2], _, [C3,2], _, [G2,2], _, [B2,1], [C3,1], [C3,2], _, [B2,2], _, [E3,3], _, _, [B2,1],
            // Bar 8 (Steps 128-143)
            [C3,2], _, [A2,2], _, [G2,2], _, [B2,1], [C3,1], [C3,2], _, [B2,2], _, [E3,3], _, _, [B2,1],
            // Bar 9 (Steps 144-159)
            [C3,2], _, [A2,2], _, [G2,2], _, [B2,1], [C3,1], [C3,2], _, [B2,2], _, [G2,2], _, [B2,1], [C3,1],
            // Bar 10 (Steps 160-175): 付点16分キメ連打ターンアラウンド
            [C3,2], _, [B2,2], _, [G2,1.25], [B2,1.25,0.25], [C3,1.5,0.5], _,
            [B2,1.25], [C3,1.25,0.25], [B2,1.5,0.5], _, [C3,1.25], [B2,1.25,0.25], [C3,1.5,0.5], _
        ];

        this.startScheduler(bpm, totalSteps, (step, time, stepDur) => {
            const barStep = step % 16;
            // 1. 実機PSGノイズ風の軽快なパーカッション（Bar 10のキメにも完全同期）
            if (step >= 164) {
                if (barStep === 4 || barStep === 8 || barStep === 12) {
                    this.triggerKick(time, 0.44);
                    this.triggerHiHat(time, false, 0.52);
                    this.triggerKick(time + 0.25 * stepDur * 5, 0.40);
                    this.triggerSnare(time + 0.5 * stepDur * 5, 0.36);
                }
            } else {
                if (barStep % 4 === 0) {
                    this.triggerKick(time, 0.40);
                    this.triggerHiHat(time, false, 0.48);
                } else if (barStep % 4 === 2) {
                    this.triggerHiHat(time, true, 0.50);
                    if (barStep % 8 === 4) {
                        this.triggerSnare(time, 0.32);
                    }
                } else if (barStep % 2 === 1) {
                    this.triggerHiHat(time, false, 0.28);
                }
            }

            // 2. ベースライン (ch7 o2 + ch8 o3 1オクターブ上ダブリング)
            this.triggerStepEvents(bass, step, time, stepDur, (midi, startTime, rawDur, lenSteps) => {
                const gate = (lenSteps <= 1.25) ? 0.80 : 0.86;
                const dur = rawDur * gate;
                this.triggerBass(midi, startTime, dur, 0.52);
                this.triggerHarmony(midi + 12, startTime, dur * 0.85, 0.16);
            });

            // 3. 主旋律 (ch4 & ch6: Konami 005289 リード + PSG ユニゾン)
            this.triggerStepEvents(sccLead, step, time, stepDur, (midi, startTime, rawDur, lenSteps) => {
                const gate = (lenSteps <= 1.25) ? 0.82 : 0.91;
                const dur = rawDur * gate;
                this.triggerLead(midi, startTime, dur, 0.38);
                this.triggerBrass(midi, startTime, dur, 0.16);
            });

            // 4. 完全4度下並行ハーモニー (ch5: Konami 005289 第2チャンネル)
            this.triggerStepEvents(sccHarm, step, time, stepDur, (midi, startTime, rawDur, lenSteps) => {
                const gate = (lenSteps <= 1.25) ? 0.82 : 0.90;
                const dur = rawDur * gate;
                this.triggerHarmony(midi, startTime, dur, 0.26);
            });
        });
    }

    // =========================================================================
    // 4面 メインBGM: 『FREE FLYER (1985 ARCADE GRADIUS STAGE 4: INVERTED VOLCANO)』
    // 1985年本家アーケード版『グラディウス』4面（逆火山面）の名曲「Free Flyer」（東野美紀 作曲）を
    // 実機基板（Konami 005289 + AY-3-8910 PSG）の楽譜データ（134 BPM / 変則13小節＝208ステップループ）
    // から完全採譜・忠実再現！
    // ・0〜1小節: 象徴的な「F → G → Ab → Bb (on G)」シンコペーション・ファンファーレイントロ
    // ・2〜12小節: オクターブ跳躍ベースに乗せて飛翔する「ソ・ソ・ソ・ファミドソ〜」の主旋律＆3度ハモリ
    // =========================================================================
    playStage4Bgm(forceRestart = false) {
        if (!forceRestart && this.currentBgm === 'STAGE4') return;
        this.currentBgm = 'STAGE4';

        const bpm = 134;
        const totalSteps = 208; // 原作通り 全13小節ループ (イントロ2小節 + 本編11小節 = 208ステップ)

        // 主旋律 (ch5: Konami 005289 波形メモリリード, 数値はゲート長ステップ数, -1は16分ウラ発音マーカー)
        const sccLead = [
            // Bar 0 (Steps 0-15): F -> G シンコペーション・ファンファーレ
            [C5,3], _, _, [C5,2], _, [C5,1], [C5,2], _,  [D5,2], _, [D5,6], _, _, _, _, _,
            // Bar 1 (Steps 16-31): Ab -> Bb (on G) ファンファーレ
            [Eb5,3], _, _, [Eb5,3], _, _, [F5,2], _,     [F5,8], _, _, _, _, _, _, _,
            // Bar 2 (Steps 32-47): C メインテーマ1「ソー・ソ・ソ・ファミドソ〜」
            [G5,4], _, _, _, [G5,2], _, [G5,2], _,       [F5,1], [E5,1], [C5,1], [G4,5], _, _, _, _,
            // Bar 3 (Steps 48-63): C 「ファミドソ〜 ミ・ソ・ド」
            [F4,1], [E4,1], [C4,1], [G3,5], _, _, _, _,  [E4,3], _, _, [G4,3], _, _, [C5,2], _,
            // Bar 4 (Steps 64-79): C7/Bb メインテーマ2「ソー・ソ・ソ・ファミドソ〜」
            [G5,4], _, _, _, [G5,2], _, [G5,2], _,       [F5,1], [E5,1], [C5,1], [G4,5], _, _, _, _,
            // Bar 5 (Steps 80-95): C7/Bb 「ファミドソ〜 ソ・ド・ミ」
            [F4,1], [E4,1], [C4,1], [G3,5], _, _, _, _,  [G4,3], _, _, [C5,3], _, _, [E5,2], _,
            // Bar 6 (Steps 96-111): FM7/A 「ソー・ソ・ソ・ファミドファ〜 レミ」
            [G5,4], _, _, _, [G5,2], _, [G5,2], _,       [F5,1], [E5,1], [C5,1], [F4,3], _, _, [D4,1], [E4,1],
            // Bar 7 (Steps 112-127): Dm7 -> Em7 「ファ・ミ・ファ・ソ・ファ・ソ」(32分音符シンコペーション付点装飾)
            [F4,2.5], _, [E4,2.5,0.5], _, _, [F4,3], _, _, [G4,2.5], _, [F4,2.5,0.5], _, _, [G4,3], _, _,
            // Bar 8 (Steps 128-143): Fm7 16分音符スケール駆け上がり＆駆け下がり
            [Ab4,1], [Bb4,1], [C5,1], [D5,1], [Eb5,1], [D5,1], [C5,1], [Bb4,1],
            [Ab4,1], [Bb4,1], [Ab4,1], [G4,1], [F4,1], [G4,1], [F4,1], [Eb4,1],
            // Bar 9 (Steps 144-159): Gm7 -> G7(b13) 3連符風上昇アルペジオ「レ・ファ・シ♭・ミ♭・ラ♭〜」
            [D4,3], _, _, [F4,3], _, _, [Bb4,3], _,      _, [Eb5,3], _, _, [Ab5,4], _, _, _,
            // Bar 10 (Steps 160-175): C 再現部「ソー・ソ・ソ・ファミドソ・ソド」
            [G5,4], _, _, _, [G5,2], _, [G5,2], _,       [F5,1], [E5,1], [C5,1], [G4,2], _, [G4,1], [C5,2], _,
            // Bar 11 (Steps 176-191): EbM7 -> F7 クライマックス上昇「レミ♭・ミ♭〜・ミ♭ファ・ファ〜・ファ」
            [D5,1], [Eb5,2], _, [Eb5,4], _, _, _, [Eb5,1], [F5,1], [F5,2], _, [F5,4], _, _, _, [F5,1],
            // Bar 12 (Steps 192-207): Csus4 -> C ターンアラウンド「ソ・ソ・ソ・ファソ・ソ〜・ソ〜」
            [G5,1], [G5,2], _, [G5,2], _, [F5,1], [G5,2], _, [G5,4], _, _, _, [G5,4], _, _, _
        ];

        // 副旋律・1オクターブ下ダブリング (ch7: AY-3-8910 PSG矩形波, イントロのみ3度和音内声、本編は主旋律の1オクターブ下ユニゾン)
        const psgLead = [
            // Bar 0 (Steps 0-15)
            [A4,3], _, _, [A4,2], _, [A4,1], [F4,2], _,  [B4,2], _, [B4,6], _, _, _, _, _,
            // Bar 1 (Steps 16-31)
            [C5,3], _, _, [C5,3], _, _, [D5,2], _,       [D5,8], _, _, _, _, _, _, _,
            // Bar 2 (Steps 32-47)
            [G4,4], _, _, _, [G4,2], _, [G4,2], _,       [F4,1], [E4,1], [C4,1], [G3,5], _, _, _, _,
            // Bar 3 (Steps 48-63)
            [F3,1], [E3,1], [C3,1], [G2,5], _, _, _, _,  [E3,3], _, _, [G3,3], _, _, [C4,2], _,
            // Bar 4 (Steps 64-79)
            [G4,4], _, _, _, [G4,2], _, [G4,2], _,       [F4,1], [E4,1], [C4,1], [G3,5], _, _, _, _,
            // Bar 5 (Steps 80-95)
            [F3,1], [E3,1], [C3,1], [G2,5], _, _, _, _,  [G3,3], _, _, [C4,3], _, _, [E4,2], _,
            // Bar 6 (Steps 96-111)
            [G4,4], _, _, _, [G4,2], _, [G4,2], _,       [F4,1], [E4,1], [C4,1], [F3,3], _, _, [D3,1], [E3,1],
            // Bar 7 (Steps 112-127)
            [F3,2.5], _, [E3,2.5,0.5], _, _, [F3,3], _, _, [G3,2.5], _, [F3,2.5,0.5], _, _, [G3,3], _, _,
            // Bar 8 (Steps 128-143)
            [Ab3,1], [Bb3,1], [C4,1], [D4,1], [Eb4,1], [D4,1], [C4,1], [Bb3,1],
            [Ab3,1], [Bb3,1], [Ab3,1], [G3,1], [F3,1], [G3,1], [F3,1], [Eb3,1],
            // Bar 9 (Steps 144-159)
            [D3,3], _, _, [F3,3], _, _, [Bb3,3], _,      _, [Eb4,3], _, _, [Ab4,4], _, _, _,
            // Bar 10 (Steps 160-175)
            [G4,4], _, _, _, [G4,2], _, [G4,2], _,       [F4,1], [E4,1], [C4,1], [G3,2], _, [G3,1], [C4,2], _,
            // Bar 11 (Steps 176-191)
            [D4,1], [Eb4,2], _, [Eb4,4], _, _, _, [Eb4,1], [F4,1], [F4,2], _, [F4,4], _, _, _, [F4,1],
            // Bar 12 (Steps 192-207)
            [G4,1], [G4,2], _, [G4,2], _, [F4,1], [G4,2], _, [G4,4], _, _, _, [G4,4], _, _, _
        ];

        // 3度・6度カウンターハーモニー＆高音オブリガート (ch4: Konami 005289 波形メモリ第2チャンネル)
        const sccHarm = [
            // Bar 0 (Steps 0-15)
            [F4,3], _, _, [F4,2], _, [F4,1], [F4,2], _,  [G4,2], _, [G4,6], _, _, _, _, _,
            // Bar 1 (Steps 16-31)
            [Ab4,3], _, _, [Ab4,3], _, _, [Bb4,2], _,    [Bb4,8], _, _, _, _, _, _, _,
            // Bar 2 (Steps 32-47): 1オクターブ高い「ファ・ミ・ド・ソ」キラメキ装飾！
            [E5,4], _, _, _, [E5,2], _, [E5,2], _,       [F6,1], [E6,1], [C6,1], [G5,5], _, _, _, _,
            // Bar 3 (Steps 48-63)
            [F5,1], [E5,1], [C5,1], [G4,5], _, _, _, _,  [D4,3], _, _, [E4,3], _, _, [G4,2], _,
            // Bar 4 (Steps 64-79)
            [E5,4], _, _, _, [E5,2], _, [E5,2], _,       [F6,1], [E6,1], [C6,1], [G5,5], _, _, _, _,
            // Bar 5 (Steps 80-95)
            [F5,1], [E5,1], [C5,1], [G4,5], _, _, _, _,  [C4,3], _, _, [E4,3], _, _, [G4,2], _,
            // Bar 6 (Steps 96-111)
            [C5,4], _, _, _, [C5,2], _, [C5,2], _,       [F5,1], [E5,1], [C5,1], [F4,3], _, _, [D4,1], [E4,1],
            // Bar 7 (Steps 112-127): 4分音符C4ペダル
            [C4,4], _, _, _, [C4,4], _, _, _,            [C4,4], _, _, _, [C4,4], _, _, _,
            // Bar 8 (Steps 128-143): 4分音符C4ペダル
            [C4,4], _, _, _, [C4,4], _, _, _,            [C4,4], _, _, _, [C4,4], _, _, _,
            // Bar 9 (Steps 144-159): 3連符風ハモリ上昇
            [C4,3], _, _, [C4,3], _, _, [F4,3], _,       _, [Bb4,3], _, _, [Eb5,4], _, _, _,
            // Bar 10 (Steps 160-175)
            [E5,4], _, _, _, [E5,2], _, [E5,2], _,       [F6,1], [E6,1], [C6,1], [G5,2], _, [G5,1], [C6,2], _,
            // Bar 11 (Steps 176-191)
            [F4,1], [G4,2], _, [G4,4], _, _, _, [G4,1],  [A4,1], [A4,2], _, [A4,4], _, _, _, [D5,1],
            // Bar 12 (Steps 192-207)
            [E5,1], [E5,2], _, [E5,2], _, [D5,1], [E5,2], _, [E5,4], _, _, _, [E5,4], _, _, _
        ];

        // オクターブ・バウンスベース (ch6 & ch8: 原作通り8分音符でルートと1オクターブ上を軽快に往復)
        const bass = [
            // Bar 0 (Steps 0-15): 後半からGペダル突入
            _, _, _, _, _, _, _, _,                      _, _, _, _, [G1,2], _, [G1,10], _,
            // Bar 1 (Steps 16-31): シンコペーションGペダル
            _, _, _, _, _, _, _, _,                      _, _, [G1,2], _, [G1,1], [G1,2], _, [G1,1],
            // Bar 2 (Steps 32-47): C オクターブバウンス
            [C2,2], _, [C3,2], _, [C2,2], _, [C3,2], _,  [C2,2], _, [C3,2], _, [C2,2], _, [C3,2], _,
            // Bar 3 (Steps 48-63): C オクターブバウンス
            [C2,2], _, [C3,2], _, [C2,2], _, [C3,2], _,  [C2,2], _, [C3,2], _, [C2,2], _, [C3,2], _,
            // Bar 4 (Steps 64-79): Bb オクターブバウンス
            [Bb1,2], _, [Bb2,2], _, [Bb1,2], _, [Bb2,2], _, [Bb1,2], _, [Bb2,2], _, [Bb1,2], _, [Bb2,2], _,
            // Bar 5 (Steps 80-95): Bb オクターブバウンス
            [Bb1,2], _, [Bb2,2], _, [Bb1,2], _, [Bb2,2], _, [Bb1,2], _, [Bb2,2], _, [Bb1,2], _, [Bb2,2], _,
            // Bar 6 (Steps 96-111): A オクターブバウンス
            [A1,2], _, [A2,2], _, [A1,2], _, [A2,2], _,  [A1,2], _, [A2,2], _, [A1,2], _, [A2,2], _,
            // Bar 7 (Steps 112-127): D -> E オクターブバウンス
            [D2,2], _, [D3,2], _, [D2,2], _, [D3,2], _,  [E2,2], _, [E3,2], _, [E2,2], _, [E3,2], _,
            // Bar 8 (Steps 128-143): F オクターブバウンス
            [F2,2], _, [F3,2], _, [F2,2], _, [F3,2], _,  [F2,2], _, [F3,2], _, [F2,2], _, [F3,2], _,
            // Bar 9 (Steps 144-159): G オクターブバウンス
            [G2,2], _, [G3,2], _, [G2,2], _, [G3,2], _,  [G2,2], _, [G3,2], _, [G2,2], _, [G3,2], _,
            // Bar 10 (Steps 160-175): C オクターブバウンス
            [C2,2], _, [C3,2], _, [C2,2], _, [C3,2], _,  [C2,2], _, [C3,2], _, [C2,2], _, [C3,2], _,
            // Bar 11 (Steps 176-191): Eb -> F シンコペーションオクターブ
            [Eb2,2], _, [Eb3,2], _, [Eb2,2], _, [Eb3,1], [Eb3,1], [F2,2], _, [F3,2], _, [F2,2], _, [F3,1], [F3,1],
            // Bar 12 (Steps 192-207): C キメのリズム「ドッ・ドー・ド・ドッ・ドー・ド・ドー」
            [C2,1], [C2,2], _, [C2,2], _, [C2,1], [C2,2], _, [C2,2], _, [C2,2], _, [C2,2], _, _, _
        ];

        this.startScheduler(bpm, totalSteps, (step, time, stepDur) => {
            // 1. 実機PSGノイズ風の軽快なリズムパルス（主旋律を邪魔せずアーケードの疾走感を支える）
            if (step < 32) {
                // イントロ2小節のキメアクセント
                if (step === 0 || step === 3 || step === 6 || step === 8 || step === 10 ||
                    step === 16 || step === 19 || step === 22 || step === 24) {
                    this.triggerKick(time, 0.42);
                    this.triggerHiHat(time, true, 0.55);
                } else if (step >= 26 && step % 2 === 0) {
                    this.triggerSnare(time, 0.35);
                }
            } else if (step >= 192) {
                // Bar 12: ターンアラウンドのキメ
                if (step === 192 || step === 193 || step === 195 || step === 197 || step === 198 || step === 200 || step === 204) {
                    this.triggerKick(time, 0.45);
                    this.triggerHiHat(time, false, 0.55);
                } else if (step === 206) {
                    this.triggerSnare(time, 0.38);
                }
            } else {
                // 本編 (Bars 2-11): 軽快な8ビートPSGハイハット＆控えめなパルスキック/スネア
                if (step % 4 === 0) {
                    this.triggerKick(time, 0.38);
                    this.triggerHiHat(time, false, 0.50);
                } else if (step % 4 === 2) {
                    this.triggerHiHat(time, true, 0.52);
                    if (step % 8 === 4) {
                        this.triggerSnare(time, 0.30);
                    }
                } else if (step % 2 === 1) {
                    this.triggerHiHat(time, false, 0.28);
                }
            }

            // 2. オクターブ・バウンスベース (ch6 低音 + ch8 1オクターブ上)
            const bEvt = bass[step];
            if (Array.isArray(bEvt)) {
                const bFreq = bEvt[0];
                const bSteps = bEvt[1];
                const gate = (bSteps <= 1) ? 0.80 : 0.86;
                const dur = stepDur * bSteps * gate;
                this.triggerBass(bFreq, time, dur, 0.52);
                // 原作ch8の1オクターブ上PSGベースを重ねてアーケード独特の輪郭を再現
                this.triggerHarmony(bFreq + 12, time, dur * 0.85, 0.14);
            }

            // 3. 主旋律 (ch5: Konami 005289 カスタム波形メモリリード)
            const lEvt = sccLead[step];
            if (Array.isArray(lEvt)) {
                const freq = lEvt[0];
                const lenSteps = lEvt[1];
                const offsetSteps = lEvt[2] || 0;
                const startTime = time + offsetSteps * stepDur;
                const gate = (lenSteps <= 1) ? 0.84 : 0.92;
                const dur = stepDur * lenSteps * gate;
                this.triggerLead(freq, startTime, dur, 0.38);
                this.triggerBrass(freq, startTime, dur, 0.16);
            }

            // 4. 副旋律 / 1オクターブ下ダブリング (ch7: AY-3-8910 PSG矩形波)
            const pEvt = psgLead[step];
            if (Array.isArray(pEvt)) {
                const freq = pEvt[0];
                const lenSteps = pEvt[1];
                const offsetSteps = pEvt[2] || 0;
                const startTime = time + offsetSteps * stepDur;
                const gate = (lenSteps <= 1) ? 0.82 : 0.90;
                const dur = stepDur * lenSteps * gate;
                this.triggerHarmony(freq, startTime, dur, 0.22);
            }

            // 5. カウンターハーモニー＆高音キラキラ装飾 (ch4: Konami 005289 第2チャンネル)
            const hEvt = sccHarm[step];
            if (Array.isArray(hEvt)) {
                const freq = hEvt[0];
                const lenSteps = hEvt[1];
                const offsetSteps = hEvt[2] || 0;
                const startTime = time + offsetSteps * stepDur;
                const gate = (lenSteps <= 1) ? 0.84 : 0.91;
                const dur = stepDur * lenSteps * gate;
                this.triggerHarmony(freq, startTime, dur, 0.25);
            }
        });
    }
}

// グローバルサウンドインスタンス
const Sound = new SoundManager();
if (typeof window !== 'undefined') {
    window.Sound = Sound;
}
