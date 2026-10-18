class Starfield {
    constructor(canvasWidth, canvasHeight) {
        this.stars = [];
        this.width = canvasWidth;
        this.height = canvasHeight;
        
        for (let i = 0; i < 100; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                speed: Math.random() * 2 + 0.5,
                size: Math.random() * 2 + 1
            });
        }
    }

    update() {
        this.stars.forEach(star => {
            star.x -= star.speed;
            if (star.x < 0) {
                star.x = this.width;
                star.y = Math.random() * this.height;
            }
        });
    }

    draw(ctx) {
        ctx.fillStyle = '#ffffff';
        this.stars.forEach(star => {
            ctx.globalAlpha = star.speed / 2.5;
            ctx.fillRect(star.x, star.y, star.size, star.size);
        });
        ctx.globalAlpha = 1.0;
    }
}

class Terrain {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.segmentWidth = 40;
        this.topPoints = [];
        this.bottomPoints = [];
        this.scrollSpeed = 1.5;
        this.baseScrollSpeed = 1.5; // arcade original approx 1.5 px per frame
        // ... later in code (line 729) will use baseScrollSpeed
        this.textureOffsetX = 0;
        this.bgOffsetX = 0;
        this.active = false;
        this.generating = false;
        this.currentSegIndex = 0;
        this.spawnIndex = 0;
        this.floatingIslands = [];
        this.twinVolcanoes = [];

        // 1985年アーケード版『グラディウス』Stage 1 の地形：
        // 参照画面の通り、地面・天井は画面端に張り付く「薄い」金茶色の岩帯で、起伏はなだらか。
        // 画面の大半は宇宙空間のまま。背景の山脈は存在しない。
        this.topProfile = [
            // seg 0-14: 天井なし
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            // seg 15-31: 薄い天井帯（ハッチ・砲台）
            0, 0, 24, 30, 34, 32, 28, 26, 30, 34, 38, 34, 28, 24, 0, 0, 0,
            // seg 32-47: 天井なし
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            // seg 48-65: 薄い天井帯
            0, 0, 22, 28, 32, 36, 34, 30, 26, 28, 32, 36, 34, 28, 22, 0, 0, 0,
            // seg 66-85: 天井なし
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            // seg 86-102: 二連火山エリア（天井なし）
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            // seg 103-114: 宇宙空間への脱出
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        ];
        this.bottomProfile = [
            // seg 0-14: 地面が下端からせり上がり、薄い地表へ
            600, 590, 575, 560, 560, 556, 552, 548, 546, 550, 556, 560, 562, 560, 556,
            // seg 15-31
            552, 548, 544, 544, 548, 554, 560, 562, 558, 552, 548, 546, 550, 556, 560, 560, 558,
            // seg 32-47
            556, 552, 548, 548, 552, 558, 562, 562, 558, 552, 546, 542, 544, 550, 556, 560,
            // seg 48-65
            556, 550, 544, 540, 540, 544, 550, 556, 560, 560, 556, 550, 544, 540, 542, 548, 554, 558,
            // seg 66-85
            556, 552, 548, 546, 550, 556, 560, 562, 560, 556, 552, 548, 546, 548, 554, 558, 560, 558, 556, 554,
            // seg 86-102: 二連火山が載る平坦な台地、その後地面が消える
            552, 548, 546, 546, 546, 546, 546, 546, 546, 546, 548, 552, 560, 580, 600, 600, 600,
            // seg 103-114
            600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600
        ];

        // 1985年アーケード版 Stage 1 完全再現の敵＆ギミック配置テーブル
        // ディー01(TURRET)、ダッカー(DUCKER / 後方奇襲DUCKER_BACK)、ジャンパー(JUMPER)、
        // ハッチ/ダグム(HATCHER)、ルグル編隊(RUGRA)、ガルン編隊(GARUN)、ファン編隊(FAN)、
        // 浮き岩(ISLAND)、そして終盤の二連火山(VOLCANO_TWIN)！
        this.spawns = [
            // --- 序盤：連山進入＆ディー01・ダッカー・ルグル ---
            { seg: 4,  type: 'TURRET', isCeiling: false, isRed: false },
            { seg: 6,  type: 'TURRET', isCeiling: false, isRed: true },  // 赤ディー01（カプセル）
            { seg: 7,  type: 'RUGRA',  y: 220, count: 4, hasRed: true },
            { seg: 9,  type: 'DUCKER', isCeiling: false, isRed: false },
            { seg: 11, type: 'TURRET', isCeiling: false, isRed: false },
            { seg: 13, type: 'HATCHER', isCeiling: false, isRed: false }, // 地上ハッチ（ルシャ発進）
            { seg: 14, type: 'FAN',    y: 180, isRed: true },

            // --- 第1洞窟：天井岩盤・後方ダッカー奇襲・ガルン ---
            { seg: 16, type: 'TURRET', isCeiling: true,  isRed: false },
            { seg: 17, type: 'DUCKER_BACK', isCeiling: false, isRed: true }, // 左後方から追いかけてくる赤ダッカー！
            { seg: 19, type: 'TURRET', isCeiling: false, isRed: false },
            { seg: 21, type: 'HATCHER', isCeiling: true,  isRed: false }, // 天井ハッチ
            { seg: 22, type: 'GARUN',  y: 260, count: 5 },
            { seg: 24, type: 'TURRET', isCeiling: false, isRed: true },  // 赤ディー01
            { seg: 26, type: 'DUCKER', isCeiling: false, isRed: false },
            { seg: 28, type: 'JUMPER', isCeiling: false, isRed: false }, // 飛び跳ねて3WAY弾を撃つジャンパー！
            { seg: 30, type: 'RUGRA',  y: 280, count: 4, hasRed: true },

            // --- 第1浮き岩エリア (seg 33-46) ---
            { seg: 33, type: 'ISLAND', y: 245, w: 168, h: 56, hasRedTurret: true },
            { seg: 35, type: 'TURRET', isCeiling: false, isRed: false },
            { seg: 37, type: 'DUCKER', isCeiling: true,  isRed: false },
            { seg: 39, type: 'HATCHER', isCeiling: false, isRed: false },
            { seg: 41, type: 'FAN',    y: 390, isRed: true },
            { seg: 43, type: 'JUMPER', isCeiling: false, isRed: true },  // 赤ジャンパー
            { seg: 45, type: 'TURRET', isCeiling: true,  isRed: false },

            // --- 中盤狭隘エリア＆第2浮き岩 (seg 48-65) ---
            { seg: 48, type: 'GARUN',  y: 280, count: 5 },
            { seg: 50, type: 'TURRET', isCeiling: false, isRed: true },
            { seg: 52, type: 'DUCKER_BACK', isCeiling: false, isRed: false }, // 後方奇襲ダッカー
            { seg: 54, type: 'HATCHER', isCeiling: true,  isRed: false },
            { seg: 55, type: 'ISLAND', y: 235, w: 184, h: 60, hasRedTurret: false },
            { seg: 57, type: 'RUGRA',  y: 170, count: 4, hasRed: true },
            { seg: 59, type: 'TURRET', isCeiling: false, isRed: false },
            { seg: 61, type: 'DUCKER', isCeiling: false, isRed: true },
            { seg: 63, type: 'JUMPER', isCeiling: false, isRed: false },
            { seg: 65, type: 'TURRET', isCeiling: true,  isRed: false },

            // --- 後半ハッチ＆第3浮き岩エリア (seg 66-85) ---
            { seg: 67, type: 'HATCHER', isCeiling: false, isRed: false },
            { seg: 69, type: 'FAN',    y: 160, isRed: true },
            { seg: 71, type: 'ISLAND', y: 250, w: 168, h: 56, hasRedTurret: true },
            { seg: 73, type: 'TURRET', isCeiling: false, isRed: false },
            { seg: 75, type: 'DUCKER_BACK', isCeiling: false, isRed: true },
            { seg: 77, type: 'GARUN',  y: 250, count: 5 },
            { seg: 79, type: 'HATCHER', isCeiling: true,  isRed: false },
            { seg: 81, type: 'JUMPER', isCeiling: false, isRed: false },
            { seg: 83, type: 'RUGRA',  y: 300, count: 4, hasRed: true },
            { seg: 85, type: 'TURRET', isCeiling: true,  isRed: false },

            // --- クライマックス：本家1面名物「二連火山」配置 (seg 89 & 94) ---
            { seg: 87, type: 'TURRET', isCeiling: false, isRed: true },
            { seg: 89, type: 'VOLCANO_TWIN' }, // 第1火山
            { seg: 94, type: 'VOLCANO_TWIN' }  // 第2火山（2基並んだ火山が画面中央右に来るとスクロール停止＆大噴火！）
        ];

        this.spawns = this.spawns.filter(s => s.type !== 'ISLAND');
        Terrain._initTexture();
    }

    static _initTexture() {
        if (Terrain._pattern) return;
        const patCanvas = document.createElement('canvas');
        patCanvas.width = 64;
        patCanvas.height = 64;
        const pctx = patCanvas.getContext('2d');

        // 1985年アーケード版『グラディウス』1面特有の「細胞状・塊状の茶褐色ドット絵岩盤」テクスチャ！
        // 最暗部（黒茶色の隙間・亀裂）
        pctx.fillStyle = '#4a2c00';
        pctx.fillRect(0, 0, 64, 64);

        // 塊状の岩セル（16x16および16x12の丸みを帯びたピクセル岩塊）を互い違いに敷き詰める
        const cells = [
            { x: 0,  y: 0,  w: 30, h: 14 },
            { x: 32, y: 2,  w: 30, h: 14 },
            { x: 14, y: 16, w: 32, h: 14 },
            { x: 48, y: 16, w: 16, h: 14 },
            { x: 0,  y: 16, w: 12, h: 14 },
            { x: 2,  y: 32, w: 28, h: 14 },
            { x: 32, y: 30, w: 30, h: 16 },
            { x: 16, y: 48, w: 30, h: 14 },
            { x: 48, y: 48, w: 16, h: 14 },
            { x: 0,  y: 48, w: 14, h: 14 }
        ];

        cells.forEach(c => {
            // 暗褐色ベース
            pctx.fillStyle = '#8a5a10';
            pctx.fillRect(c.x + 2, c.y, c.w - 4, c.h);
            pctx.fillRect(c.x, c.y + 2, c.w, c.h - 4);
            // 中間茶色（赤茶〜黄土色）
            pctx.fillStyle = '#b8801c';
            pctx.fillRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
            // 明部オレンジブラウン
            pctx.fillStyle = '#d8a030';
            pctx.fillRect(c.x + 4, c.y + 2, c.w - 8, c.h - 6);
            // ハイライトドット（黄土色）
            pctx.fillStyle = '#f0c850';
            pctx.fillRect(c.x + 6, c.y + 3, Math.max(4, c.w - 14), 2);
            // 内部のドット亀裂
            pctx.fillStyle = '#3a2400';
            pctx.fillRect(c.x + Math.floor(c.w / 2), c.y + Math.floor(c.h / 2), 4, 2);
        });

        const dummyCanvas = document.createElement('canvas');
        const dctx = dummyCanvas.getContext('2d');
        Terrain._pattern = dctx.createPattern(patCanvas, 'repeat');
    }

    start() {
        this.active = true;
        this.generating = true;
        this.scrollSpeed = this.baseScrollSpeed;
        this.textureOffsetX = 0;
        this.bgOffsetX = 0;
        this.currentSegIndex = 0;
        this.spawnIndex = 0;
        this.topPoints = [];
        this.bottomPoints = [];
        this.floatingIslands = [];
        this.twinVolcanoes = [];
        let currentX = this.width;
        this.topPoints.push({ x: currentX, y: 0 });
        this.bottomPoints.push({ x: currentX, y: this.height });
    }

    stopGenerating() {
        this.generating = false;
    }

    update() {
        if (!this.active) return;

        // スクロール更新
        this.topPoints.forEach(p => p.x -= this.scrollSpeed);
        this.bottomPoints.forEach(p => p.x -= this.scrollSpeed);
        this.textureOffsetX -= this.scrollSpeed;
        // 背景の山は地形に固定されて同じ速度で左へ流れる（遅いと地面に対して右へ滑って見える）
        this.bgOffsetX -= this.scrollSpeed;

        // 浮き岩の更新
        this.floatingIslands.forEach(isl => {
            isl.scrollSpeed = this.scrollSpeed;
            isl.update();
        });
        this.floatingIslands = this.floatingIslands.filter(isl => isl.active);

        // 画面外のポイントを削除（描画用に1つ手前まで残す）
        while (this.topPoints.length > 2 && this.topPoints[1].x < -40) {
            this.topPoints.shift();
            this.bottomPoints.shift();
        }

        // 新規生成が停止し、全ての地形ポイントと浮き岩が画面左に抜けたら非アクティブ化
        if (!this.generating) {
            if (this.topPoints.length <= 2 && this.topPoints[this.topPoints.length - 1].x < 0 && this.floatingIslands.length === 0) {
                this.active = false;
                this.topPoints = [];
                this.bottomPoints = [];
                return;
            }
        }

        // 右側に足りないポイントを生成（generating中のみ）
        if (this.generating) {
            let lastX = this.topPoints.length > 0 ? this.topPoints[this.topPoints.length - 1].x : this.width;
            while (lastX < this.width + this.segmentWidth) {
                lastX += this.segmentWidth;

                if (this.currentSegIndex < this.topProfile.length) {
                    const topY = this.topProfile[this.currentSegIndex];
                    const bottomY = this.bottomProfile[this.currentSegIndex];

                    this.topPoints.push({ x: lastX, y: topY });
                    this.bottomPoints.push({ x: lastX, y: bottomY });

                    // セグメントごとの敵＆ギミックスポーン判定
                    this.checkSpawnsForSeg(this.currentSegIndex, lastX, topY, bottomY);

                    this.currentSegIndex++;
                } else {
                    // 全セグメントの生成完了！
                    this.generating = false;
                    break;
                }
            }
        }
    }

    checkSpawnsForSeg(segIdx, x, topY, bottomY) {
        if (typeof enemies === 'undefined') return;

        while (this.spawnIndex < this.spawns.length && this.spawns[this.spawnIndex].seg <= segIdx) {
            let sp = this.spawns[this.spawnIndex];
            if (sp.isCeiling && topY < 8) sp = Object.assign({}, sp, { isCeiling: false });
            if (sp.seg === segIdx) {
                if (sp.type === 'TURRET' && typeof TurretEnemy !== 'undefined') {
                    const gy = sp.isCeiling ? topY : bottomY;
                    enemies.push(new TurretEnemy(x, gy, sp.isCeiling, !!sp.isRed));
                } else if (sp.type === 'DUCKER' && typeof DuckerEnemy !== 'undefined') {
                    const gy = sp.isCeiling ? topY : bottomY;
                    enemies.push(new DuckerEnemy(x, gy, sp.isCeiling, !!sp.isRed, false));
                } else if (sp.type === 'DUCKER_BACK' && typeof DuckerEnemy !== 'undefined') {
                    // 1985年アーケード版名物：画面左端（自機の後方）から猛スピードで駆け上がってくる奇襲ダッカー！
                    const backX = 4;
                    const gy = sp.isCeiling ? this.getTopY(backX) : this.getBottomY(backX);
                    enemies.push(new DuckerEnemy(backX, gy, sp.isCeiling, !!sp.isRed, true));
                } else if (sp.type === 'JUMPER' && typeof JumperEnemy !== 'undefined') {
                    const gy = sp.isCeiling ? topY : bottomY;
                    enemies.push(new JumperEnemy(x, gy, sp.isCeiling, !!sp.isRed));
                } else if (sp.type === 'HATCHER' && typeof HatcherEnemy !== 'undefined') {
                    const gy = sp.isCeiling ? topY : bottomY;
                    enemies.push(new HatcherEnemy(x, gy, sp.isCeiling, !!sp.isRed));
                } else if (sp.type === 'ISLAND' && typeof FloatingIsland !== 'undefined') {
                    const isl = new FloatingIsland(x, sp.y, sp.w || 168, sp.h || 56, this.scrollSpeed, !!sp.hasRedTurret);
                    this.floatingIslands.push(isl);
                } else if (sp.type === 'VOLCANO_TWIN' && typeof Volcano !== 'undefined') {
                    const v = new Volcano(x - 64, bottomY, false); // 噴火はスクロール停止時に一斉開始！
                    enemies.push(v);
                    this.twinVolcanoes.push(v);
                } else if (sp.type === 'GARUN' && typeof GarunFormation !== 'undefined') {
                    new GarunFormation(sp.y || 260, true, sp.count || 5);
                } else if (sp.type === 'RUGRA' && typeof RugraEnemy !== 'undefined') {
                    const cnt = sp.count || 4;
                    const baseY = sp.y || 240;
                    for (let i = 0; i < cnt; i++) {
                        const ry = baseY + (i - 1.5) * 34;
                        enemies.push(new RugraEnemy(x + 20, ry, sp.hasRed && i === 0, i * 14));
                    }
                } else if (sp.type === 'FAN' && typeof Formation !== 'undefined') {
                    new Formation(sp.y || 180, 5, sp.isRed !== false);
                }
            }
            this.spawnIndex++;
        }
    }

    // 1985年アーケード版 Stage 1 象徴の「背景の火山連山（山脈）」を描画
    // （本家通り、背景の連山は当たり判定を持たない遠景・中景のドット絵山脈として前景岩盤の背後にそびえ立つ）
    drawArcadeMountainRange(ctx) {
        if (this.bottomPoints.length < 2) return;
        const firstX = this.bottomPoints[0].x;
        const lastX = this.bottomPoints[this.bottomPoints.length - 1].x;
        const period = 320;
        const startIdx = Math.floor((firstX - this.bgOffsetX) / period) - 1;
        const endIdx = Math.ceil((lastX - this.bgOffsetX) / period) + 1;

        for (let idx = startIdx; idx <= endIdx; idx++) {
            const baseWorldX = idx * period + this.bgOffsetX;
            if (baseWorldX + period < firstX + 60 || baseWorldX > lastX - 80) continue;

            // 大小2つのカルデラ火山峰を持つ1985年アーケード版特有の連山シルエット
            const peaks = [
                { cx: baseWorldX + 95,  w: 170, h: 125, craterW: 36 },
                { cx: baseWorldX + 240, w: 140, h: 96,  craterW: 28 }
            ];

            peaks.forEach(pk => {
                // 背景山岳は固定したベースラインで描画し、上下揺れを防止
                const baseY = 600; // 遠景山岳の基準高さ（画面外下部）
                const topY = baseY - pk.h;
                const halfW = pk.w / 2;
                const halfC = pk.craterW / 2;

                // 段々になったドット絵の稜線と縦スジの岩肌
                const steps = 12;
                for (let s = 0; s < steps; s++) {
                    const t0 = s / steps;
                    const t1 = (s + 1) / steps;
                    const y0 = Math.round(topY + t0 * pk.h);
                    const y1 = Math.round(topY + t1 * pk.h) + 2;
                    const hw = Math.round(halfC + t0 * (halfW - halfC));

                    // 外側の暗褐色シャドウ
                    ctx.fillStyle = '#3a2400';
                    ctx.fillRect(Math.round(pk.cx - hw), y0, hw * 2, y1 - y0);
                    // 山肌の中間茶色
                    ctx.fillStyle = '#6c2c08';
                    ctx.fillRect(Math.round(pk.cx - hw + 6), y0, Math.max(0, (hw - 6) * 2), y1 - y0);
                    // 中央の黄土色ハイライト
                    ctx.fillStyle = '#9c4814';
                    ctx.fillRect(Math.round(pk.cx - hw * 0.55), y0, Math.round(hw * 1.1), y1 - y0);
                    // 縦方向の岩盤ストライプ溝
                    ctx.fillStyle = '#4a2c00';
                    for (let sx = -hw + 12; sx < hw - 10; sx += 14) {
                        ctx.fillRect(Math.round(pk.cx + sx), y0, 3, y1 - y0);
                    }
                }
                // カルデラ火口縁の明部
                ctx.fillStyle = '#c86820';
                ctx.fillRect(Math.round(pk.cx - halfC), Math.round(topY), pk.craterW, 4);
                ctx.fillStyle = '#240800';
                ctx.fillRect(Math.round(pk.cx - halfC + 6), Math.round(topY + 2), pk.craterW - 12, 4);
            });
        }
    }

    draw(ctx) {
        if (this.topPoints.length < 2) return;

        ctx.save();

        // 1. 背後の1985年アーケード版「火山連山（ドット絵山脈）」を描画
        // （本家に背景山脈は無い）

        // 2. 前景の細胞状・塊状火山岩盤ポリゴンを描画
        if (Terrain._pattern) {
            if (typeof DOMMatrix !== 'undefined') {
                Terrain._pattern.setTransform(new DOMMatrix().translate(Math.round(this.textureOffsetX), 0));
            }
            ctx.fillStyle = Terrain._pattern;
        } else {
            ctx.fillStyle = '#b8801c';
        }

        // 天井ポリゴン（ドット絵らしい階段状ステップエッジで描画）
        ctx.beginPath();
        ctx.moveTo(this.topPoints[0].x, 0);
        for (let i = 0; i < this.topPoints.length; i++) {
            const p = this.topPoints[i];
            if (i > 0) {
                const prev = this.topPoints[i - 1];
                const midX = Math.round((prev.x + p.x) / 2);
                ctx.lineTo(midX, Math.round(prev.y));
                ctx.lineTo(midX, Math.round(p.y));
            }
            ctx.lineTo(Math.round(p.x), Math.round(p.y));
        }
        ctx.lineTo(this.topPoints[this.topPoints.length - 1].x, 0);
        ctx.closePath();
        ctx.fill();

        // 地面ポリゴン（ドット絵らしい階段状ステップエッジで描画）
        ctx.beginPath();
        ctx.moveTo(this.bottomPoints[0].x, this.height);
        for (let i = 0; i < this.bottomPoints.length; i++) {
            const p = this.bottomPoints[i];
            if (i > 0) {
                const prev = this.bottomPoints[i - 1];
                const midX = Math.round((prev.x + p.x) / 2);
                ctx.lineTo(midX, Math.round(prev.y));
                ctx.lineTo(midX, Math.round(p.y));
            }
            ctx.lineTo(Math.round(p.x), Math.round(p.y));
        }
        ctx.lineTo(this.bottomPoints[this.bottomPoints.length - 1].x, this.height);
        ctx.closePath();
        ctx.fill();

        // 3. 岩盤境界のピクセル岩塊リム（黄土色ハイライト＆暗褐色エッジ）
        for (let i = 0; i < this.bottomPoints.length - 1; i++) {
            const p1 = this.bottomPoints[i];
            const p2 = this.bottomPoints[i + 1];
            if (p1.y >= 598 && p2.y >= 598) continue;
            const steps = 4;
            for (let s = 0; s < steps; s++) {
                const bx = Math.round(p1.x + (p2.x - p1.x) * (s / steps));
                const bw = Math.ceil((p2.x - p1.x) / steps) + 1;
                const by = Math.round(p1.y + (p2.y - p1.y) * (s / steps));
                ctx.fillStyle = '#3a2400';
                ctx.fillRect(bx, by - 2, bw, 10);
                ctx.fillStyle = '#d8a030';
                ctx.fillRect(bx + 1, by, bw - 2, 6);
                ctx.fillStyle = '#f8dc70';
                ctx.fillRect(bx + 2, by, Math.max(2, bw - 4), 2);
            }
        }

        for (let i = 0; i < this.topPoints.length - 1; i++) {
            const p1 = this.topPoints[i];
            const p2 = this.topPoints[i + 1];
            if (p1.y <= 2 && p2.y <= 2) continue;
            const steps = 4;
            for (let s = 0; s < steps; s++) {
                const tx = Math.round(p1.x + (p2.x - p1.x) * (s / steps));
                const tw = Math.ceil((p2.x - p1.x) / steps) + 1;
                const ty = Math.round(p1.y + (p2.y - p1.y) * (s / steps));
                ctx.fillStyle = '#3a2400';
                ctx.fillRect(tx, ty - 8, tw, 10);
                ctx.fillStyle = '#b8801c';
                ctx.fillRect(tx + 1, ty - 6, tw - 2, 5);
                ctx.fillStyle = '#d8a030';
                ctx.fillRect(tx + 2, ty - 3, Math.max(2, tw - 4), 2);
            }
        }

        // 4. 中空の「浮き岩 (FloatingIsland)」を描画
        this.floatingIslands.forEach(isl => isl.draw(ctx));

        ctx.restore();
    }

    getTopY(x) {
        if (this.topPoints.length < 2) return 0;
        for (let i = 0; i < this.topPoints.length - 1; i++) {
            const p1 = this.topPoints[i];
            const p2 = this.topPoints[i + 1];
            if (x >= p1.x && x <= p2.x) {
                const t = (x - p1.x) / (p2.x - p1.x);
                return p1.y + t * (p2.y - p1.y);
            }
        }
        return 0;
    }

    getBottomY(x) {
        if (this.bottomPoints.length < 2) return this.height;
        for (let i = 0; i < this.bottomPoints.length - 1; i++) {
            const p1 = this.bottomPoints[i];
            const p2 = this.bottomPoints[i + 1];
            if (x >= p1.x && x <= p2.x) {
                const t = (x - p1.x) / (p2.x - p1.x);
                return p1.y + t * (p2.y - p1.y);
            }
        }
        return this.height;
    }

    checkCollision(rect) {
        if (!this.active || this.topPoints.length < 2) return false;

        const yTopLeft = this.getTopY(rect.x);
        const yTopRight = this.getTopY(rect.x + rect.width);
        if ((yTopLeft > 4 && rect.y < yTopLeft) || (yTopRight > 4 && rect.y < yTopRight)) return true;

        const yBottomLeft = this.getBottomY(rect.x);
        const yBottomRight = this.getBottomY(rect.x + rect.width);
        if (rect.y + rect.height > yBottomLeft || rect.y + rect.height > yBottomRight) return true;

        // 浮き岩との衝突判定
        for (let i = 0; i < this.floatingIslands.length; i++) {
            if (this.floatingIslands[i].checkCollision(rect)) return true;
        }

        // 二連火山の山体との衝突判定
        for (let i = 0; i < this.twinVolcanoes.length; i++) {
            const v = this.twinVolcanoes[i];
            if (v && v.active && typeof v.checkCollision === 'function' && v.checkCollision(rect)) {
                return true;
            }
        }

        return false;
    }

    getGroundY(x) {
        return this.getBottomY(x);
    }
}

// 1985年アーケード版 1面の「浮き岩 (FloatingIsland)」：
// 中空に浮かぶ塊状の茶褐色火山岩島で、上下にディー01砲台（TurretEnemy）が設置されている！
class FloatingIsland {
    constructor(x, y, width, height, scrollSpeed = 1.6, hasRedTurret = false) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.scrollSpeed = scrollSpeed;
        this.active = true;
        this.turrets = [];

        if (typeof TurretEnemy !== 'undefined' && typeof enemies !== 'undefined') {
            const relX1 = Math.round(width * 0.22);
            const relX2 = Math.round(width * 0.64);

            // 上面にディー01砲台 2基（うち1基は赤カプセル砲台）
            const tTop1 = new TurretEnemy(this.x + relX1, this.y, false, hasRedTurret, this, relX1);
            const tTop2 = new TurretEnemy(this.x + relX2, this.y, false, false, this, relX2);
            // 下面にディー01砲台 1基
            const relXBot = Math.round(width * 0.44);
            const tBot1 = new TurretEnemy(this.x + relXBot, this.y + this.height, true, false, this, relXBot);

            this.turrets.push(tTop1, tTop2, tBot1);
            enemies.push(tTop1, tTop2, tBot1);
        }
    }

    update() {
        this.x -= this.scrollSpeed;
        if (this.x + this.width < -150) {
            this.active = false;
        }
    }

    checkCollision(rect) {
        if (!this.active) return false;
        return (
            rect.x < this.x + this.width - 6 &&
            rect.x + rect.width > this.x + 6 &&
            rect.y < this.y + this.height - 4 &&
            rect.y + rect.height > this.y + 4
        );
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();

        const x = Math.round(this.x);
        const y = Math.round(this.y);
        const w = Math.round(this.width);
        const h = Math.round(this.height);

        // 1985年アーケード版特有のゴツゴツした細胞状・塊状の浮き岩をドット絵で描画
        ctx.fillStyle = '#3a2400';
        ctx.fillRect(x + 8, y, w - 16, h);
        ctx.fillRect(x, y + 8, w, h - 16);

        ctx.fillStyle = '#8a5a10';
        ctx.fillRect(x + 10, y + 2, w - 20, h - 4);
        ctx.fillRect(x + 4, y + 8, w - 8, h - 16);

        // 内部の塊状岩セル
        const cols = Math.max(3, Math.floor(w / 28));
        const rows = 2;
        const cw = Math.floor((w - 16) / cols);
        const ch = Math.floor((h - 8) / rows);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cx = x + 8 + c * cw + (r % 2 === 1 ? 4 : -2);
                const cy = y + 4 + r * ch;
                ctx.fillStyle = '#b8801c';
                ctx.fillRect(cx + 2, cy + 2, cw - 4, ch - 4);
                ctx.fillStyle = '#d8a030';
                ctx.fillRect(cx + 4, cy + 3, cw - 8, ch - 8);
                ctx.fillStyle = '#f8dc70';
                ctx.fillRect(cx + 6, cy + 4, Math.max(4, cw - 12), 2);
            }
        }

        ctx.restore();
    }
}

class LevelManager {
    constructor(canvasWidth, canvasHeight) {
        this.starfield = new Starfield(canvasWidth, canvasHeight);
        this.terrain = new Terrain(canvasWidth, canvasHeight);
        this.time = 0;
        // 1985年アーケード版1面進行フロー：
        // AIR_BATTLE (宇宙空中戦) -> TERRAIN (火山地帯進攻) -> VOLCANO_ERUPTION (二連火山・スクロール停止大噴火) -> BOSS_ENTRY -> BOSS (ビッグコア) -> STAGE_CLEAR
        this.state = 'AIR_BATTLE';
        this.stage = 1;
        this.boss = null;
        this.eruptionTimer = 0;
        this.bossEntryTimer = 0;
        this.stageClearTimer = 0;

        // 1985年アーケード版 1面開幕の宇宙空中戦スケジュール（ファン・ルグル・ガルンが交互に飛来！）
        this.airWaves = [
            { time: 600,   type: 'FAN',   y: 130, isRed: true },
            { time: 2800,  type: 'FAN',   y: 430, isRed: true },
            { time: 4900,  type: 'RUGRA', y: 230, count: 4, hasRed: true },
            { time: 6800,  type: 'FAN',   y: 145, isRed: true },
            { time: 8900,  type: 'GARUN', y: 270, count: 5 },
            { time: 11100, type: 'FAN',   y: 420, isRed: true },
            { time: 13200, type: 'RUGRA', y: 290, count: 4, hasRed: true },
            { time: 15100, type: 'FAN',   y: 165, isRed: true }
        ];
        this.airWaveSpawned = 0;
    }

    update(dt) {
        this.starfield.update();

        if (this.stage === 1) {
            this.time += dt;

            if (this.state === 'AIR_BATTLE') {
                // 開幕の宇宙空中戦（ファン5機編隊・ルグル追尾編隊・ガルン螺旋編隊）
                while (this.airWaveSpawned < this.airWaves.length && this.time >= this.airWaves[this.airWaveSpawned].time) {
                    const wv = this.airWaves[this.airWaveSpawned];
                    if (wv.type === 'FAN' && typeof Formation !== 'undefined') {
                        new Formation(wv.y, 5, wv.isRed);
                    } else if (wv.type === 'RUGRA' && typeof RugraEnemy !== 'undefined' && typeof enemies !== 'undefined') {
                        for (let i = 0; i < (wv.count || 4); i++) {
                            enemies.push(new RugraEnemy(820, wv.y + (i - 1.5) * 34, wv.hasRed && i === 0, i * 14));
                        }
                    } else if (wv.type === 'GARUN' && typeof GarunFormation !== 'undefined') {
                        new GarunFormation(wv.y, true, wv.count || 5);
                    }
                    this.airWaveSpawned++;
                }

                // 17.2秒経過で「Challenger 1985」BGMとともに火山連山地帯へ突入！
                if (this.time >= 17200) {
                    this.state = 'TERRAIN';
                    this.terrain.start();
                    if (typeof Sound !== 'undefined' && typeof Sound.playStageBgm === 'function') {
                        Sound.playStageBgm();
                    }
                }
            } else if (this.state === 'TERRAIN') {
                this.terrain.update();

                // 本家1面クライマックス：終盤の二連火山が画面中央〜右（第1火山 X <= 410）に到達したらスクロール停止＆大噴火開始！
                if (this.terrain.twinVolcanoes && this.terrain.twinVolcanoes.length >= 2) {
                    const v1 = this.terrain.twinVolcanoes[0];
                    if (v1 && v1.active && v1.x <= 410) {
                        this.state = 'VOLCANO_ERUPTION';
                        this.eruptionTimer = 0;
                        this.terrain.scrollSpeed = 0; // スクロール完全停止！
                        this.terrain.twinVolcanoes.forEach(v => {
                            if (v) v.isErupting = true;
                        });
                        if (typeof Sound !== 'undefined') {
                            if (typeof Sound.playVolcanoSurvivalBgm === 'function') {
                                Sound.playVolcanoSurvivalBgm();
                            } else if (typeof Sound.playBossBgm === 'function') {
                                Sound.playBossBgm();
                            }
                        }
                    }
                }

                // 万一火山をスキップして地形が抜けきった場合のフォールバック
                if (!this.terrain.active && this.terrain.currentSegIndex >= this.terrain.topProfile.length) {
                    this.state = 'BOSS';
                    if (typeof Boss !== 'undefined') {
                        this.boss = new Boss(this.starfield.width, 220);
                    }
                }
            } else if (this.state === 'VOLCANO_ERUPTION') {
                // 1985年アーケード版名物：スクロールが停止した状態で二連火山から無数の火山弾が放物線を描いて降り注ぐ！
                this.terrain.update();
                this.eruptionTimer += dt;

                // 約10.5秒間噴火を耐え抜くと、噴火が収まり再びスクロール開始！
                if (this.eruptionTimer >= 10500) {
                    this.terrain.twinVolcanoes.forEach(v => {
                        if (v) v.isErupting = false;
                    });
                    this.terrain.scrollSpeed = 2.4; // 地形が左へ退場していく
                    this.state = 'BOSS_ENTRY';
                    this.bossEntryTimer = 0;
                }
            } else if (this.state === 'BOSS_ENTRY') {
                // 火山地帯を抜けて暗黒の宇宙空間へ出ると、そのままビッグコアが右から登場！
                this.terrain.update();
                this.bossEntryTimer += dt;

                if (!this.terrain.active || this.bossEntryTimer >= 4200) {
                    this.terrain.active = false;
                    this.state = 'BOSS';
                    if (typeof Sound !== 'undefined' && typeof Sound.playBossBgm === 'function') {
                        Sound.playBossBgm();
                    }
                    if (typeof Boss !== 'undefined') {
                        this.boss = new Boss(this.starfield.width, 220);
                    }
                }
            } else if (this.state === 'BOSS') {
                if (this.boss) {
                    this.boss.update();
                    if (!this.boss.active) {
                        this.state = 'STAGE_CLEAR';
                        this.stageClearTimer = 0;
                    }
                }
            } else if (this.state === 'STAGE_CLEAR') {
                this.stageClearTimer += dt;
                if (this.stageClearTimer > 3000) {
                    this.startStage2();
                }
            }
        } else if (this.stage === 2) {
            if (typeof stonehengeStage !== 'undefined' && stonehengeStage) {
                stonehengeStage.update(dt);
                if (stonehengeStage.state === 'STAGE_CLEAR' || stonehengeStage.state === 'ALL_CLEAR') {
                    if (!this.stage2ClearTimer) this.stage2ClearTimer = 0;
                    this.stage2ClearTimer += dt;
                    if (this.stage2ClearTimer > 3000 && this.stage === 2) {
                        this.stage2ClearTimer = 0;
                        this.startStage3();
                    }
                }
            }
        } else if (this.stage === 3) {
            if (window.stage3) {
                window.stage3.update(dt);
                if (window.stage3.state === 'STAGE_CLEAR' || window.stage3.state === 'ALL_CLEAR') {
                    if (!this.stage3ClearTimer) this.stage3ClearTimer = 0;
                    this.stage3ClearTimer += dt;
                    if (this.stage3ClearTimer > 3000 && this.stage === 3) {
                        this.stage3ClearTimer = 0;
                        this.startStage4();
                    }
                }
            }
        } else if (this.stage === 4) {
            if (window.stage4) {
                window.stage4.update(dt);
            }
        }
    }

    startStage1() {
        this.stage = 1;
        this.state = 'AIR_BATTLE';
        this.time = 0;
        this.boss = null;
        this.eruptionTimer = 0;
        this.bossEntryTimer = 0;
        this.stageClearTimer = 0;
        this.airWaveSpawned = 0;
        this.terrain.active = false;
        this.terrain.generating = false;
        this.terrain.topPoints = [];
        this.terrain.bottomPoints = [];
        this.terrain.floatingIslands = [];
        this.terrain.twinVolcanoes = [];
        this.terrain.scrollSpeed = this.terrain.baseScrollSpeed;

        if (typeof stonehengeStage !== 'undefined' && stonehengeStage) {
            stonehengeStage.active = false;
        }
        if (window.stage3) {
            window.stage3.active = false;
        }
        if (window.stage4) {
            window.stage4.active = false;
        }

        if (typeof enemies !== 'undefined') enemies.length = 0;
        if (typeof enemyBullets !== 'undefined') enemyBullets.length = 0;

        if (typeof player !== 'undefined') {
            if (typeof player.vx !== 'undefined') player.vx = 0;
            if (typeof player.vy !== 'undefined') player.vy = 0;
        }

        if (typeof Sound !== 'undefined' && typeof Sound.playAirBgm === 'function') {
            Sound.playAirBgm();
        }
    }

    startStage2() {
        this.stage = 2;
        this.state = 'STAGE2';
        this.time = 0;
        this.boss = null;
        this.terrain.active = false;
        this.terrain.topPoints = [];
        this.terrain.bottomPoints = [];
        this.terrain.floatingIslands = [];
        this.terrain.twinVolcanoes = [];

        if (typeof enemies !== 'undefined' && Array.isArray(enemies)) {
            enemies = enemies.filter(e => {
                if (typeof Volcano !== 'undefined' && e instanceof Volcano) return false;
                if (typeof VolcanoRock !== 'undefined' && e instanceof VolcanoRock) return false;
                return e.active;
            });
            window.enemies = enemies;
        }

        if (typeof StonehengeStage !== 'undefined') {
            stonehengeStage = new StonehengeStage(this.starfield.width, this.starfield.height);
            window.stonehengeStage = stonehengeStage;
            stonehengeStage.start();
        }
        if (typeof Sound !== 'undefined' && typeof Sound.playAirBgm === 'function') {
            Sound.playAirBgm();
        }
    }

    startStage3() {
        if (this.stage === 3 && window.stage3 && window.stage3.active) return;
        this.stage = 3;
        this.state = 'STAGE3';
        this.time = 0;
        this.boss = null;

        if (typeof stonehengeStage !== 'undefined' && stonehengeStage) {
            stonehengeStage.active = false;
        }

        if (typeof enemies !== 'undefined') enemies.length = 0;
        if (typeof enemyBullets !== 'undefined') enemyBullets.length = 0;

        if (typeof player !== 'undefined') {
            if (typeof player.vx !== 'undefined') player.vx = 0;
            if (typeof player.vy !== 'undefined') player.vy = 0;
        }

        const stage3Class = (typeof Stage3 !== 'undefined') ? Stage3 : window.Stage3;
        if (stage3Class) {
            try {
                const st3 = new stage3Class(this.starfield.width, this.starfield.height);
                window.stage3 = st3;
                st3.start();
            } catch (err) {
                console.error('Stage3 initialization error:', err);
            }
        }
        if (typeof Sound !== 'undefined' && typeof Sound.playAirBgm === 'function') {
            try {
                Sound.playAirBgm();
            } catch (serr) {
                console.warn('Sound playAirBgm error:', serr);
            }
        }
    }

    startStage4() {
        if (this.stage === 4 && window.stage4 && window.stage4.active) return;
        this.stage = 4;
        this.state = 'STAGE4';
        this.time = 0;
        this.boss = null;

        this.terrain.active = false;
        this.terrain.topPoints = [];
        this.terrain.bottomPoints = [];
        this.terrain.floatingIslands = [];
        this.terrain.twinVolcanoes = [];
        if (typeof stonehengeStage !== 'undefined' && stonehengeStage) {
            stonehengeStage.active = false;
        }
        if (window.stage3) {
            window.stage3.active = false;
        }

        if (typeof enemies !== 'undefined') enemies.length = 0;
        if (typeof enemyBullets !== 'undefined') enemyBullets.length = 0;

        if (typeof player !== 'undefined') {
            if (typeof player.vx !== 'undefined') player.vx = 0;
            if (typeof player.vy !== 'undefined') player.vy = 0;
        }

        const stage4Class = (typeof Stage4 !== 'undefined') ? Stage4 : window.Stage4;
        if (stage4Class) {
            try {
                const st4 = new stage4Class(this.starfield.width, this.starfield.height);
                window.stage4 = st4;
                st4.start();
            } catch (err) {
                console.error('Stage4 initialization error:', err);
            }
        }
        if (typeof Sound !== 'undefined' && typeof Sound.playAirBgm === 'function') {
            try {
                Sound.playAirBgm();
            } catch (serr) {
                console.warn('Sound playAirBgm error:', serr);
            }
        }
    }

    checkCollision(rect) {
        if (this.stage === 1) {
            if (this.terrain && this.terrain.checkCollision(rect)) return true;
        } else if (this.stage === 2) {
            if (typeof stonehengeStage !== 'undefined' && stonehengeStage) {
                return stonehengeStage.checkCollision(rect);
            }
        } else if (this.stage === 3) {
            if (window.stage3) {
                return window.stage3.checkCollision(rect);
            }
        } else if (this.stage === 4) {
            if (window.stage4) {
                return window.stage4.checkCollision(rect);
            }
        }
        return false;
    }

    draw(ctx) {
        if (this.stage === 1) {
            this.starfield.draw(ctx);
            if (this.terrain.active) {
                this.terrain.draw(ctx);
            }

            if (this.state === 'BOSS' && this.boss) {
                this.boss.draw(ctx);
            }

            if (this.state === 'STAGE_CLEAR') {
                ctx.save();
                ctx.font = 'bold 36px "Courier New", monospace';
                ctx.fillStyle = '#ffea00';
                ctx.textAlign = 'center';
                ctx.shadowColor = '#ff8800';
                ctx.shadowBlur = 12;
                ctx.fillText('STAGE 1 CLEAR', this.starfield.width / 2, this.starfield.height / 2 - 40);
                ctx.restore();
            }
        } else if (this.stage === 2) {
            if (typeof stonehengeStage !== 'undefined' && stonehengeStage) {
                stonehengeStage.draw(ctx);
            }
        } else if (this.stage === 3) {
            if (window.stage3) {
                window.stage3.draw(ctx);
            }
        } else if (this.stage === 4) {
            if (window.stage4) {
                window.stage4.draw(ctx);
            }
        }
    }
}
