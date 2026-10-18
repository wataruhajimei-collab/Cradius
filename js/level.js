class Starfield {
    constructor(canvasWidth, canvasHeight) {
        this.stars = [];
        this.width = canvasWidth;
        this.height = canvasHeight;
        // 1985年アーケード版＆参照画像のカラフルな微小ドット星々（赤・青・黄・シアン・白）
        const palette = ['#ffffff', '#ffffff', '#ff4848', '#4888ff', '#ffe048', '#58e8ff', '#ff88c8'];
        for (let i = 0; i < 110; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * (this.height - 36),
                speed: Math.random() * 1.4 + 0.35,
                size: Math.random() < 0.78 ? 1 : 2,
                color: palette[i % palette.length],
                blinkOffset: Math.random() * 100
            });
        }
    }

    update() {
        this.stars.forEach(star => {
            star.x -= star.speed;
            star.blinkOffset += 0.08;
            if (star.x < 0) {
                star.x = this.width;
                star.y = Math.random() * (this.height - 36);
            }
        });
    }

    draw(ctx) {
        ctx.save();
        this.stars.forEach(star => {
            if (Math.sin(star.blinkOffset) < -0.75) return;
            ctx.fillStyle = star.color;
            ctx.fillRect(Math.round(star.x), Math.round(star.y), star.size, star.size);
        });
        ctx.restore();
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
        this.baseScrollSpeed = 1.5;
        this.textureOffsetX = 0;
        this.bgOffsetX = 0;
        this.active = false;
        this.generating = false;
        this.currentSegIndex = 0;
        this.spawnIndex = 0;
        this.floatingIslands = [];
        this.twinVolcanoes = [];
        this.treeClusters = [];
        this.isCrimsonPalette = false;

        // 1985年アーケード版＆参照画像 (media_1792284490223_685b672c.jpg, sakura_03.png, sakura_04.png) 完全再現のStage 1地形プロファイル：
        // 序盤（seg 0-30）は上下とも波打つ金茶色の岩帯と「赤ドーム・水色ドーム2基・緑の針葉樹林」が並ぶ高原地帯。
        // 中盤（seg 31-65）は高低差のある山岳起伏と、巨大ひし形浮き岩（左斜面に5連水色ドーム＋天井ダグム＆2連砲台：sakura_03.png）。
        // 後半（seg 66-84）は再びドーム＆ジャンパー＆森林谷を経て、終盤（seg 85-102）の深紅パレット変化＋二連火山＋緑の樹海大噴火（sakura_04.png）へ！
        this.topProfile = [
            // seg 0-30: 序盤高原エリア（参照画像の波打つ金茶色天井帯 y=26〜42）
            0, 0, 18, 30, 38, 34, 28, 36, 42, 34, 28, 36, 40, 32, 26,
            34, 40, 34, 28, 36, 42, 36, 28, 34, 40, 34, 26, 28, 32, 36, 32,
            // seg 31-47: 中盤・山岳エリア＆第1ひし形浮き岩エリア (sakura_03.png: 天井ダグム＋2連砲台が配置される天井帯)
            28, 32, 36, 40, 36, 32, 28, 34, 38, 34, 28, 32, 36, 30, 26, 28,
            // seg 48-65: 中盤・第2岩山＆第2ひし形浮き岩エリア
            32, 38, 44, 48, 40, 34, 30, 34, 38, 34, 30, 34, 38, 32, 28, 32, 36, 30,
            // seg 66-84: 後半・第2ドーム＆ジャンパー＆森林高原エリア
            28, 34, 40, 32, 28, 36, 42, 34, 28, 36, 40, 32, 28, 34, 38, 34, 30, 28, 32,
            // seg 85-102: クライマックス・二連火山エリア（sakura_04.png：天井も深紅の岩帯 y=28〜36 が続く！）
            34, 32, 30, 34, 36, 32, 28, 32, 36, 34, 30, 28, 32, 30, 24, 14, 0, 0,
            // seg 103-114: 宇宙空間への脱出（ビッグコア戦へ）
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        ];

        this.bottomProfile = [
            // seg 0-30: 序盤高原エリア（パワーメーター y=568 のすぐ上に金茶色の地表 y=536〜544 が広がる！）
            600, 568, 548, 538, 536, 536, 538, 542, 544, 538, 536, 536, 536, 538, 538,
            538, 540, 544, 538, 536, 536, 538, 536, 536, 538, 542, 544, 540, 538, 536, 538,
            // seg 31-47: 中盤・岩山とひし形浮き岩エリア (sakura_03.png)
            534, 518, 496, 482, 504, 528, 536, 538, 536, 536, 538, 536, 520, 498, 518, 536,
            // seg 48-65: 中盤・第2岩山＆浮き岩エリア
            536, 516, 492, 476, 496, 522, 536, 538, 536, 536, 538, 536, 524, 534, 536, 540, 538, 536,
            // seg 66-84: 後半・第2ドーム＆森林高原エリア
            536, 536, 538, 542, 538, 536, 536, 538, 538, 542, 538, 536, 536, 538, 540, 538, 536, 538, 538,
            // seg 85-102: 二連火山と緑の樹海が広がる平坦な大地 (sakura_04.png)、その後宇宙空間へ抜ける
            538, 538, 538, 538, 538, 538, 538, 538, 538, 538, 538, 540, 546, 558, 578, 600, 600, 600,
            // seg 103-114
            600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600
        ];

        // 1985年アーケード版＆参照画像 完全再現のStage 1 敵＆地上物配置テーブル
        this.spawns = [
            // --- 序盤（seg 3-30）：参照画像 (media_1792284490223_685b672c.jpg) の「赤ドーム＋水色ドーム2基＋緑の森林＋ルグル」完全再現！ ---
            { seg: 4,  type: 'DOME',    isCeiling: false, isRed: true },   // 左の赤ドーム
            { seg: 7,  type: 'RUGRA',   y: 250, count: 3, hasRed: false }, // 右から飛来する銀青ツインノーズ機（ルグル）
            { seg: 8,  type: 'DOME',    isCeiling: false, isRed: false },  // 中央の水色ドーム #1
            { seg: 10, type: 'DOME',    isCeiling: false, isRed: false },  // 右隣の水色ドーム #2
            { seg: 12, type: 'TREES',   count: 11 },                       // 右端の緑の針葉樹林（森林クラスター）！
            { seg: 14, type: 'JUMPER',  isCeiling: false, isRed: false },  // 森林の上を飛び跳ねるジャンパー (step_160_1.jpg)
            { seg: 15, type: 'FAN',     y: 170, isRed: true },
            { seg: 16, type: 'TURRET',  isCeiling: false, isRed: false },
            { seg: 17, type: 'DUCKER',  isCeiling: false, isRed: true },
            { seg: 19, type: 'DOME',    isCeiling: false, isRed: true },   // 赤ドーム
            { seg: 21, type: 'HATCHER', isCeiling: false, isRed: false },  // 地上大型スクランブルハッチ「ダグム」(dagumu.jpg)
            { seg: 22, type: 'GARUN',   y: 250, count: 5 },
            { seg: 24, type: 'DOME',    isCeiling: false, isRed: false },
            { seg: 25, type: 'TREES',   count: 9 },                        // 第2の緑の針葉樹林
            { seg: 26, type: 'JUMPER',  isCeiling: false, isRed: true },   // 赤ジャンパー
            { seg: 28, type: 'DUCKER_BACK', isCeiling: false, isRed: true },
            { seg: 29, type: 'RUGRA',   y: 230, count: 4, hasRed: true },

            // --- 中盤前半（seg 31-47）：sakura_03.png 完全再現（天井ダグム＋天井2連砲台＋中央の巨大ひし形浮き岩＆5連ドーム＋地上赤・水色ドーム） ---
            { seg: 33, type: 'TURRET',  isCeiling: false, isRed: false },
            { seg: 36, type: 'HATCHER', isCeiling: true,  isRed: false },  // sakura_03.png 左上の天井ダグム基地
            { seg: 38, type: 'TURRET',  isCeiling: true,  isRed: false },  // sakura_03.png 天井ダグム右隣の天井ディー01砲台 #1
            { seg: 39, type: 'TURRET',  isCeiling: true,  isRed: false },  // sakura_03.png 天井ディー01砲台 #2
            { seg: 38, type: 'DOME',    isCeiling: false, isRed: true },   // sakura_03.png 地上の赤ドーム
            { seg: 40, type: 'DOME',    isCeiling: false, isRed: false },  // sakura_03.png 地上の水色ドーム
            { seg: 41, type: 'ISLAND',  y: 162, w: 156, h: 248, hasRedTurret: true }, // sakura_03.png 中央の巨大ひし形浮き岩（左面に5連水色ドーム）！
            { seg: 43, type: 'FAN',     y: 115, isRed: true },
            { seg: 45, type: 'DUCKER',  isCeiling: false, isRed: true },

            // --- 中盤後半（seg 48-65）：第2岩山＆ひし形浮き岩エリア ---
            { seg: 48, type: 'GARUN',   y: 270, count: 5 },
            { seg: 50, type: 'TURRET',  isCeiling: false, isRed: true },
            { seg: 52, type: 'DUCKER_BACK', isCeiling: false, isRed: false },
            { seg: 54, type: 'HATCHER', isCeiling: true,  isRed: false },
            { seg: 56, type: 'ISLAND',  y: 166, w: 152, h: 240, hasRedTurret: false },
            { seg: 58, type: 'RUGRA',   y: 120, count: 4, hasRed: true },
            { seg: 60, type: 'TURRET',  isCeiling: false, isRed: false },
            { seg: 62, type: 'DUCKER',  isCeiling: false, isRed: true },
            { seg: 64, type: 'JUMPER',  isCeiling: false, isRed: false },

            // --- 後半（seg 66-84）：第2ドーム＆ダグム＆森林高原エリア ---
            { seg: 67, type: 'DOME',    isCeiling: false, isRed: true },
            { seg: 69, type: 'FAN',     y: 165, isRed: true },
            { seg: 70, type: 'HATCHER', isCeiling: false, isRed: false },
            { seg: 72, type: 'DOME',    isCeiling: false, isRed: false },
            { seg: 74, type: 'TREES',   count: 10 },
            { seg: 75, type: 'JUMPER',  isCeiling: false, isRed: true },
            { seg: 77, type: 'DUCKER_BACK', isCeiling: false, isRed: true },
            { seg: 79, type: 'GARUN',   y: 250, count: 5 },
            { seg: 81, type: 'HATCHER', isCeiling: true,  isRed: false },
            { seg: 83, type: 'RUGRA',   y: 260, count: 4, hasRed: true },

            // --- クライマックス（seg 85-98）：sakura_04.png 完全再現「深紅の二連火山＋麓を埋め尽くす緑の針葉樹海」！ ---
            { seg: 85, type: 'TREES',   count: 42 }, // 二連火山の麓一面に広がる連続した緑の針葉樹林 (sakura_04.png)
            { seg: 86, type: 'TURRET',  isCeiling: false, isRed: true },
            { seg: 88, type: 'VOLCANO_TWIN' }, // 第1火山（左峰）
            { seg: 93, type: 'VOLCANO_TWIN' }  // 第2火山（右峰：2基並んだ火山が画面中央右に来ると深紅パレット変化＆スクロール停止大噴火！）
        ];

        Terrain._initTexture();
    }

    static _initTexture() {
        if (Terrain._pattern && Terrain._crimsonPattern) return;

        const createRockPattern = (baseColor, palette) => {
            const patCanvas = document.createElement('canvas');
            patCanvas.width = 64;
            patCanvas.height = 64;
            const pctx = patCanvas.getContext('2d');

            pctx.fillStyle = baseColor;
            pctx.fillRect(0, 0, 64, 64);

            for (let py = 0; py < 64; py += 2) {
                for (let px = 0; px < 64; px += 2) {
                    const n1 = Math.sin(px * 0.296 + py * 0.196) + Math.cos(px * 0.196 - py * 0.392);
                    const n2 = Math.sin((px + 12) * 0.589) * Math.cos((py + 8) * 0.589);
                    const dither = ((px + py) % 4 === 0) ? 0.35 : -0.25;
                    const val = n1 * 0.55 + n2 * 0.65 + dither;
                    let idx = Math.floor((val + 1.8) / 3.6 * palette.length);
                    idx = Math.max(0, Math.min(palette.length - 1, idx));
                    pctx.fillStyle = palette[idx];
                    pctx.fillRect(px, py, 2, 2);
                }
            }

            const dummyCanvas = document.createElement('canvas');
            const dctx = dummyCanvas.getContext('2d');
            return dctx.createPattern(patCanvas, 'repeat');
        };

        // 1. 通常時：金茶色（ゴールデンオーカー）の粒状・海綿状ドット岩肌 (media_1792284490223_685b672c.jpg / sakura_03.png)
        Terrain._pattern = createRockPattern('#8c5008', [
            '#482000', '#683404', '#8c5008', '#ac6810', '#c88018', '#e09c24', '#f0b834'
        ]);

        // 2. 火山噴火クライマックス時：深紅（クリムゾンレッド）の粒状ドット岩肌 (sakura_04.png)
        Terrain._crimsonPattern = createRockPattern('#980c28', [
            '#38020c', '#600418', '#880824', '#b00c30', '#d81840', '#f02854', '#ff6888'
        ]);
    }

    start() {
        this.active = true;
        this.generating = true;
        this.scrollSpeed = this.baseScrollSpeed;
        this.textureOffsetX = 0;
        this.bgOffsetX = 0;
        this.currentSegIndex = 0;
        this.spawnIndex = 0;
        this.isCrimsonPalette = false;
        this.topPoints = [];
        this.bottomPoints = [];
        this.floatingIslands = [];
        this.twinVolcanoes = [];
        this.treeClusters = [];
        let currentX = this.width;
        this.topPoints.push({ x: currentX, y: 0 });
        this.bottomPoints.push({ x: currentX, y: this.height });
    }

    stopGenerating() {
        this.generating = false;
    }

    update() {
        if (!this.active) return;

        // 二連火山クライマックスに差し掛かったら1985年AC版 (sakura_04.png) の深紅パレットへ遷移
        if (this.currentSegIndex >= 88 || (typeof levelManager !== 'undefined' && (levelManager.state === 'VOLCANO_ERUPTION' || levelManager.state === 'BOSS_ENTRY'))) {
            this.isCrimsonPalette = true;
        }

        // スクロール更新
        this.topPoints.forEach(p => p.x -= this.scrollSpeed);
        this.bottomPoints.forEach(p => p.x -= this.scrollSpeed);
        this.textureOffsetX -= this.scrollSpeed;
        this.bgOffsetX -= this.scrollSpeed;

        // 緑の針葉樹林クラスターのスクロール更新
        this.treeClusters.forEach(tc => {
            tc.x -= this.scrollSpeed;
        });
        this.treeClusters = this.treeClusters.filter(tc => tc.x + tc.count * 14 > -60);

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
                this.treeClusters = [];
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
                    enemies.push(new DuckerEnemy(x, gy, sp.isCeiling, !!sp.isRed, -1));
                } else if (sp.type === 'DUCKER_BACK' && typeof DuckerEnemy !== 'undefined') {
                    const backX = 4;
                    const gy = sp.isCeiling ? this.getTopY(backX) : this.getBottomY(backX);
                    enemies.push(new DuckerEnemy(backX, gy, sp.isCeiling, !!sp.isRed, 1));
                } else if (sp.type === 'JUMPER' && typeof JumperEnemy !== 'undefined') {
                    const gy = sp.isCeiling ? topY : bottomY;
                    enemies.push(new JumperEnemy(x, gy, sp.isCeiling, !!sp.isRed));
                } else if (sp.type === 'DOME' && typeof DomeEnemy !== 'undefined') {
                    const gy = sp.isCeiling ? topY : bottomY;
                    enemies.push(new DomeEnemy(x, gy, sp.isCeiling, !!sp.isRed));
                } else if (sp.type === 'HATCHER' && typeof HatcherEnemy !== 'undefined') {
                    const gy = sp.isCeiling ? topY : bottomY;
                    enemies.push(new HatcherEnemy(x, gy, sp.isCeiling, !!sp.isRed));
                } else if (sp.type === 'TREES') {
                    this.treeClusters.push({
                        x: x,
                        count: sp.count || 8,
                        seed: segIdx * 17
                    });
                } else if (sp.type === 'ISLAND' && typeof FloatingIsland !== 'undefined') {
                    const isl = new FloatingIsland(x, sp.y, sp.w || 156, sp.h || 248, this.scrollSpeed, !!sp.hasRedTurret);
                    this.floatingIslands.push(isl);
                } else if (sp.type === 'VOLCANO_TWIN' && typeof Volcano !== 'undefined') {
                    const v = new Volcano(x - 82, bottomY, false);
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

    // 参照画像右下＆sakura_04.pngの「緑の針葉樹林（ドット絵コニカルツリー群）」を地面上に描画
    drawTreeClusters(ctx) {
        for (let c = 0; c < this.treeClusters.length; c++) {
            const tc = this.treeClusters[c];
            for (let i = 0; i < tc.count; i++) {
                const tx = Math.round(tc.x + i * 11);
                if (tx < -24 || tx > this.width + 24) continue;
                const gy = Math.round(this.getBottomY(tx + 6));
                if (gy >= 590) continue;

                // 木ごとの自然な高さバリエーション (22〜30px)
                const h = 23 + ((tc.seed + i * 7) % 8);
                const topY = gy - h;

                // 1. 樹冠の暗緑色ベースシルエット（円錐状のピクセルツリー）
                ctx.fillStyle = '#245000';
                ctx.fillRect(tx + 4, topY, 4, 4);
                ctx.fillRect(tx + 2, topY + 4, 8, 6);
                ctx.fillRect(tx + 1, topY + 10, 10, 7);
                ctx.fillRect(tx, topY + 17, 12, h - 17);

                // 2. 中間の鮮やかなリーフグリーン
                ctx.fillStyle = '#589808';
                ctx.fillRect(tx + 4, topY + 1, 3, 3);
                ctx.fillRect(tx + 2, topY + 4, 6, 6);
                ctx.fillRect(tx + 1, topY + 10, 8, 7);
                ctx.fillRect(tx + 1, topY + 17, 9, h - 18);

                // 3. 左側・頂部のイエローグリーン太陽光ハイライト（参照画像の明るい黄緑エッジ）
                ctx.fillStyle = '#98d018';
                ctx.fillRect(tx + 4, topY + 1, 2, 3);
                ctx.fillRect(tx + 2, topY + 4, 4, 5);
                ctx.fillRect(tx + 1, topY + 10, 5, 6);
                ctx.fillRect(tx + 1, topY + 17, 5, h - 19);

                ctx.fillStyle = '#c8f038';
                ctx.fillRect(tx + 4, topY + 2, 1, 2);
                ctx.fillRect(tx + 3, topY + 5, 2, 3);
                ctx.fillRect(tx + 2, topY + 11, 2, 4);
                ctx.fillRect(tx + 2, topY + 18, 2, 4);
            }
        }
    }

    draw(ctx) {
        if (this.topPoints.length < 2) return;

        ctx.save();

        // 1. 二連火山（sakura_04.png：麓の緑の樹海の背後にそびえ立つ急峻な火山）を先に描画
        if (this.twinVolcanoes && this.twinVolcanoes.length > 0) {
            this.twinVolcanoes.forEach(v => {
                if (v && v.active) {
                    v._drawnByTerrain = true;
                    v.draw(ctx);
                }
            });
        }

        // 2. 地上の緑の針葉樹林クラスターを描画（火山の麓の手前・地表リムのすぐ奥に配置：sakura_04.png & 参照画像完全準拠）
        this.drawTreeClusters(ctx);

        // 3. 前景の粒状ゴールデンオーカー（噴火時はクリムゾンレッド）岩盤ポリゴンを描画
        const activePat = this.isCrimsonPalette ? Terrain._crimsonPattern : Terrain._pattern;
        if (activePat) {
            if (typeof DOMMatrix !== 'undefined') {
                activePat.setTransform(new DOMMatrix().translate(Math.round(this.textureOffsetX), 0));
            }
            ctx.fillStyle = activePat;
        } else {
            ctx.fillStyle = this.isCrimsonPalette ? '#b81038' : '#b87414';
        }

        // 天井ポリゴン（参照画像の丸みを帯びた波状ローブで描画）
        ctx.beginPath();
        ctx.moveTo(this.topPoints[0].x, 0);
        for (let i = 0; i < this.topPoints.length - 1; i++) {
            const p1 = this.topPoints[i];
            const p2 = this.topPoints[i + 1];
            const subSteps = 4;
            for (let s = 0; s <= subSteps; s++) {
                const t = s / subSteps;
                const sx = Math.round(p1.x + (p2.x - p1.x) * t);
                let sy = p1.y + (p2.y - p1.y) * t;
                if (sy > 4) {
                    sy += Math.sin(t * Math.PI) * 3.5;
                }
                ctx.lineTo(sx, Math.round(sy));
            }
        }
        ctx.lineTo(this.topPoints[this.topPoints.length - 1].x, 0);
        ctx.closePath();
        ctx.fill();

        // 地面ポリゴン（参照画像のなだらかな波状地表で描画）
        ctx.beginPath();
        ctx.moveTo(this.bottomPoints[0].x, this.height);
        for (let i = 0; i < this.bottomPoints.length - 1; i++) {
            const p1 = this.bottomPoints[i];
            const p2 = this.bottomPoints[i + 1];
            const subSteps = 4;
            for (let s = 0; s <= subSteps; s++) {
                const t = s / subSteps;
                const sx = Math.round(p1.x + (p2.x - p1.x) * t);
                let sy = p1.y + (p2.y - p1.y) * t;
                if (sy < 595) {
                    sy -= Math.sin(t * Math.PI) * 3.0;
                }
                ctx.lineTo(sx, Math.round(sy));
            }
        }
        ctx.lineTo(this.bottomPoints[this.bottomPoints.length - 1].x, this.height);
        ctx.closePath();
        ctx.fill();

        // 2. 地表＆天井の縁取りリム（通常時は金茶色、火山噴火時は深紅クリムゾン）
        const rimShadow = this.isCrimsonPalette ? '#480414' : '#582800';
        const rimMid    = this.isCrimsonPalette ? '#c81038' : '#c88018';
        const rimHigh   = this.isCrimsonPalette ? '#ff6888' : '#f0b834';

        for (let i = 0; i < this.bottomPoints.length - 1; i++) {
            const p1 = this.bottomPoints[i];
            const p2 = this.bottomPoints[i + 1];
            if (p1.y >= 598 && p2.y >= 598) continue;
            const steps = 8;
            for (let s = 0; s < steps; s++) {
                const t = s / steps;
                const bx = Math.round(p1.x + (p2.x - p1.x) * t);
                const bw = Math.ceil((p2.x - p1.x) / steps) + 1;
                const lobe = (p1.y < 595 && p2.y < 595) ? Math.round(Math.sin(t * Math.PI) * 3.0) : 0;
                const by = Math.round(p1.y + (p2.y - p1.y) * t) - lobe;
                ctx.fillStyle = rimShadow;
                ctx.fillRect(bx, by - 1, bw, 8);
                ctx.fillStyle = rimMid;
                ctx.fillRect(bx, by, bw, 5);
                ctx.fillStyle = rimHigh;
                ctx.fillRect(bx + 1, by, Math.max(2, bw - 2), 2);
            }
        }

        for (let i = 0; i < this.topPoints.length - 1; i++) {
            const p1 = this.topPoints[i];
            const p2 = this.topPoints[i + 1];
            if (p1.y <= 2 && p2.y <= 2) continue;
            const steps = 8;
            for (let s = 0; s < steps; s++) {
                const t = s / steps;
                const tx = Math.round(p1.x + (p2.x - p1.x) * t);
                const tw = Math.ceil((p2.x - p1.x) / steps) + 1;
                const lobe = (p1.y > 4 && p2.y > 4) ? Math.round(Math.sin(t * Math.PI) * 3.5) : 0;
                const ty = Math.round(p1.y + (p2.y - p1.y) * t) + lobe;
                ctx.fillStyle = rimShadow;
                ctx.fillRect(tx, ty - 7, tw, 8);
                ctx.fillStyle = rimMid;
                ctx.fillRect(tx, ty - 5, tw, 4);
                ctx.fillStyle = rimHigh;
                ctx.fillRect(tx + 1, ty - 2, Math.max(2, tw - 2), 2);
            }
        }

        // 3. 中空の「巨大ひし形浮き岩 (FloatingIsland: sakura_03.png)」を描画
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

// 1985年アーケード版 1面中盤の「巨大ひし形浮き岩 (FloatingIsland: sakura_03.png)」完全再現：
// 画面中央に浮かぶ縦長のひし形（ダイヤモンド形状）の金茶色岩塊で、左側の斜面に5基の水色ドームが横向きに張り付いている！
class FloatingIsland {
    constructor(x, y, width = 156, height = 248, scrollSpeed = 1.5, hasRedTurret = false) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.scrollSpeed = scrollSpeed;
        this.active = true;
        this.turrets = [];

        // sakura_03.png 完全準拠：ひし形浮き岩の左側（前面）の上下斜面に沿って5基の横向きドームを配置！
        if (typeof DomeEnemy !== 'undefined' && typeof enemies !== 'undefined') {
            const halfH = Math.round(this.height / 2);
            const halfW = Math.round(this.width / 2);
            const domeOffsets = [
                { fracY: 0.18, isRed: false },
                { fracY: 0.34, isRed: hasRedTurret },
                { fracY: 0.50, isRed: false },
                { fracY: 0.66, isRed: false },
                { fracY: 0.82, isRed: false }
            ];
            domeOffsets.forEach(d => {
                const relY = Math.round(this.height * d.fracY) - 15;
                const distFromMid = Math.abs(d.fracY - 0.5) * 2; // 0 (中央左端) 〜 1 (上下頂点)
                const leftEdgeX = Math.round(distFromMid * halfW);
                const relX = leftEdgeX - 34;
                const dome = new DomeEnemy(
                    this.x + relX,
                    this.y + relY,
                    false,
                    d.isRed,
                    this,
                    relX,
                    relY,
                    'LEFT_WALL'
                );
                this.turrets.push(dome);
                enemies.push(dome);
            });
        }
    }

    update() {
        this.x -= this.scrollSpeed;
        if (this.x + this.width < -160) {
            this.active = false;
        }
    }

    checkCollision(rect) {
        if (!this.active) return false;
        // ひし形（ダイヤモンド形状）の正確なポリゴン当たり判定
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const rx = Math.max(16, this.width / 2 - 8);
        const ry = Math.max(24, this.height / 2 - 10);

        const testPoints = [
            { x: rect.x + 4, y: rect.y + rect.height / 2 },
            { x: rect.x + rect.width - 4, y: rect.y + rect.height / 2 },
            { x: rect.x + rect.width / 2, y: rect.y + 3 },
            { x: rect.x + rect.width / 2, y: rect.y + rect.height - 3 }
        ];
        for (let i = 0; i < testPoints.length; i++) {
            const p = testPoints[i];
            if (Math.abs(p.x - cx) / rx + Math.abs(p.y - cy) / ry <= 1.0) {
                return true;
            }
        }
        return false;
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();

        const cx = Math.round(this.x + this.width / 2);
        const cy = Math.round(this.y + this.height / 2);
        const hw = Math.round(this.width / 2);
        const hh = Math.round(this.height / 2);

        // 1. 粒状ゴールデンオーカーのひし形岩盤ポリゴン (sakura_03.png)
        if (Terrain._pattern) {
            ctx.fillStyle = Terrain._pattern;
        } else {
            ctx.fillStyle = '#a86810';
        }

        ctx.beginPath();
        ctx.moveTo(cx, cy - hh);
        ctx.lineTo(cx + hw, cy);
        ctx.lineTo(cx, cy + hh);
        ctx.lineTo(cx - hw, cy);
        ctx.closePath();
        ctx.fill();

        // 2. ひし形外周のゴツゴツした階段状ピクセルリム＆明暗シェーディング
        const steps = 16;
        for (let i = 0; i < steps; i++) {
            const t = i / steps;
            const dy = Math.round(t * hh);
            const spanX = Math.round((1 - t) * hw);
            const bandH = Math.ceil(hh / steps) + 2;

            // 上半分の左右エッジ
            ctx.fillStyle = '#582800';
            ctx.fillRect(cx - spanX - 2, cy - dy - bandH, 10, bandH);
            ctx.fillRect(cx + spanX - 8, cy - dy - bandH, 10, bandH);
            ctx.fillStyle = '#e09c24';
            ctx.fillRect(cx - spanX, cy - dy - bandH, 6, bandH);
            ctx.fillRect(cx + spanX - 5, cy - dy - bandH, 5, bandH);
            ctx.fillStyle = '#f8c848';
            ctx.fillRect(cx - spanX + 1, cy - dy - bandH, 3, Math.max(2, bandH - 2));

            // 下半分の左右エッジ
            ctx.fillStyle = '#482000';
            ctx.fillRect(cx - spanX - 2, cy + dy, 10, bandH);
            ctx.fillRect(cx + spanX - 8, cy + dy, 10, bandH);
            ctx.fillStyle = '#c88018';
            ctx.fillRect(cx - spanX, cy + dy, 6, bandH);
            ctx.fillRect(cx + spanX - 5, cy + dy, 5, bandH);
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

        // 1985年アーケード版 1面開幕の宇宙空中戦スケジュール（ファン・ルグル・ガルンがテンポよく飛来し、10.5秒で地上エリアへ突入！）
        this.airWaves = [
            { time: 400,  type: 'FAN',   y: 130, isRed: true },
            { time: 2300, type: 'FAN',   y: 420, isRed: true },
            { time: 4200, type: 'RUGRA', y: 240, count: 4, hasRed: true },
            { time: 6200, type: 'FAN',   y: 150, isRed: true },
            { time: 8100, type: 'GARUN', y: 270, count: 5 }
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

                // 10.5秒経過で「Challenger 1985」BGMとともにドーム基地＆緑の針葉樹林・火山連山地帯へ突入！
                if (this.time >= 10500) {
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
        this.terrain.treeClusters = [];
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
