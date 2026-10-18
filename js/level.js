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

        // 1985年アーケード版＆参照画像 完全再現のStage 1地形プロファイル：
        // 序盤（seg 0-30）は上下とも波打つ金茶色の岩帯と「赤ドーム・青ドーム2基・緑の針葉樹林」が並ぶ高原地帯。
        // 中盤（seg 31-65）は高低差のある山岳起伏と浮き岩・ダッカー・ジャンパー地帯。
        // 後半（seg 66-85）は再びドーム＆森林谷を経て、終盤（seg 86-102）の二連火山・スクロール停止大噴火へ！
        this.topProfile = [
            // seg 0-30: 序盤高原エリア（参照画像の波打つ金茶色天井帯 y=26〜42）
            0, 0, 18, 30, 38, 34, 28, 36, 42, 34, 28, 36, 40, 32, 26,
            34, 40, 34, 28, 36, 42, 36, 28, 34, 40, 34, 26, 18, 0, 0, 0,
            // seg 31-47: 中盤・第1浮き岩＆山岳エリア
            0, 22, 36, 48, 54, 44, 34, 28, 36, 48, 58, 50, 38, 24, 0, 0,
            // seg 48-65: 中盤・第2洞窟＆浮き岩エリア
            0, 24, 40, 56, 64, 54, 40, 32, 42, 56, 62, 50, 36, 24, 0, 0, 0, 0,
            // seg 66-85: 後半・第2ドーム＆森林高原エリア（参照画像スタイルの天井帯）
            0, 22, 34, 40, 32, 28, 36, 42, 34, 28, 36, 40, 32, 24, 16, 0, 0, 0, 0, 0,
            // seg 86-102: クライマックス・二連火山エリア（天井は開けて火山弾が降り注ぐ）
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            // seg 103-114: 宇宙空間への脱出（ビッグコア戦へ）
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        ];

        this.bottomProfile = [
            // seg 0-30: 序盤高原エリア（パワーメーター y=568 のすぐ上に金茶色の地表 y=534〜546 が広がる！）
            600, 568, 548, 538, 536, 536, 538, 542, 544, 538, 536, 536, 536, 538, 538,
            538, 540, 544, 538, 536, 536, 538, 536, 536, 538, 542, 546, 542, 538, 536, 538,
            // seg 31-47: 中盤・起伏のある岩山と谷（ダッカー＆ジャンパー＆浮き岩）
            534, 518, 492, 472, 484, 512, 534, 540, 536, 514, 482, 468, 488, 518, 536, 540,
            // seg 48-65: 中盤・第2岩山＆浮き岩エリア
            536, 516, 488, 470, 482, 510, 534, 538, 536, 518, 490, 476, 496, 522, 536, 540, 538, 536,
            // seg 66-85: 後半・第2ドーム＆森林高原エリア
            536, 536, 538, 542, 538, 536, 536, 538, 538, 542, 538, 536, 536, 538, 542, 544, 540, 538, 536, 538,
            // seg 86-102: 二連火山が鎮座する平坦な大地、その後宇宙空間へ抜ける
            538, 538, 538, 538, 538, 538, 538, 538, 538, 538, 540, 546, 558, 578, 600, 600, 600,
            // seg 103-114
            600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600
        ];

        // 1985年アーケード版＆参照画像 完全再現のStage 1 敵＆地上物配置テーブル
        this.spawns = [
            // --- 序盤（seg 3-30）：参照画像の「赤ドーム＋水色ドーム2基＋緑の森林＋銀青二股機」完全再現！ ---
            { seg: 4,  type: 'HATCHER', isCeiling: false, isRed: true },   // 左の赤ドーム基地
            { seg: 7,  type: 'RUGRA',   y: 250, count: 3, hasRed: false }, // 右から飛来する銀青ツインノーズ機
            { seg: 8,  type: 'HATCHER', isCeiling: false, isRed: false },  // 中央の水色ドーム基地 #1
            { seg: 10, type: 'HATCHER', isCeiling: false, isRed: false },  // 右隣の水色ドーム基地 #2
            { seg: 12, type: 'TREES',   count: 10 },                       // 右端の緑の針葉樹林（森林クラスター）！
            { seg: 15, type: 'FAN',     y: 170, isRed: true },
            { seg: 16, type: 'TURRET',  isCeiling: false, isRed: false },
            { seg: 17, type: 'DUCKER',  isCeiling: false, isRed: true },
            { seg: 19, type: 'HATCHER', isCeiling: false, isRed: true },   // 赤ドーム基地
            { seg: 21, type: 'HATCHER', isCeiling: true,  isRed: false },  // 天井ドーム基地
            { seg: 22, type: 'GARUN',   y: 250, count: 5 },
            { seg: 23, type: 'HATCHER', isCeiling: false, isRed: false },  // 水色ドーム基地
            { seg: 25, type: 'TREES',   count: 8 },                        // 第2の緑の針葉樹林
            { seg: 27, type: 'DUCKER_BACK', isCeiling: false, isRed: true },
            { seg: 29, type: 'RUGRA',   y: 230, count: 4, hasRed: true },

            // --- 中盤前半（seg 31-47）：岩山起伏＆第1浮き岩・ダッカー・ジャンパー ---
            { seg: 33, type: 'TURRET',  isCeiling: false, isRed: false },
            { seg: 35, type: 'ISLAND',  y: 250, w: 168, h: 52, hasRedTurret: true },
            { seg: 37, type: 'DUCKER',  isCeiling: true,  isRed: false },
            { seg: 39, type: 'JUMPER',  isCeiling: false, isRed: false },
            { seg: 41, type: 'FAN',     y: 370, isRed: true },
            { seg: 43, type: 'TURRET',  isCeiling: false, isRed: true },
            { seg: 45, type: 'JUMPER',  isCeiling: false, isRed: true },

            // --- 中盤後半（seg 48-65）：第2洞窟＆浮き岩エリア ---
            { seg: 48, type: 'GARUN',   y: 270, count: 5 },
            { seg: 50, type: 'TURRET',  isCeiling: false, isRed: true },
            { seg: 52, type: 'DUCKER_BACK', isCeiling: false, isRed: false },
            { seg: 54, type: 'HATCHER', isCeiling: true,  isRed: false },
            { seg: 55, type: 'ISLAND',  y: 240, w: 176, h: 54, hasRedTurret: false },
            { seg: 57, type: 'RUGRA',   y: 180, count: 4, hasRed: true },
            { seg: 59, type: 'TURRET',  isCeiling: false, isRed: false },
            { seg: 61, type: 'DUCKER',  isCeiling: false, isRed: true },
            { seg: 63, type: 'JUMPER',  isCeiling: false, isRed: false },

            // --- 後半（seg 66-85）：第2ドーム＆森林高原エリア ---
            { seg: 67, type: 'HATCHER', isCeiling: false, isRed: true },
            { seg: 69, type: 'FAN',     y: 165, isRed: true },
            { seg: 70, type: 'HATCHER', isCeiling: false, isRed: false },
            { seg: 72, type: 'HATCHER', isCeiling: false, isRed: false },
            { seg: 74, type: 'TREES',   count: 9 },
            { seg: 76, type: 'DUCKER_BACK', isCeiling: false, isRed: true },
            { seg: 78, type: 'GARUN',   y: 250, count: 5 },
            { seg: 80, type: 'HATCHER', isCeiling: true,  isRed: false },
            { seg: 82, type: 'JUMPER',  isCeiling: false, isRed: false },
            { seg: 84, type: 'RUGRA',   y: 280, count: 4, hasRed: true },

            // --- クライマックス：本家1面名物「二連火山」配置 (seg 89 & 94) ---
            { seg: 87, type: 'TURRET',  isCeiling: false, isRed: true },
            { seg: 89, type: 'VOLCANO_TWIN' }, // 第1火山
            { seg: 94, type: 'VOLCANO_TWIN' }  // 第2火山（2基並んだ火山が画面中央右に来るとスクロール停止＆大噴火！）
        ];

        Terrain._initTexture();
    }

    static _initTexture() {
        if (Terrain._pattern) return;
        const patCanvas = document.createElement('canvas');
        patCanvas.width = 64;
        patCanvas.height = 64;
        const pctx = patCanvas.getContext('2d');

        // 参照画像の「金茶色（ゴールデンオーカー）の粒状・海綿状ドット岩肌」を2x2pxディザで緻密に生成！
        // （レンガブロックではなく、有機的に入り組んだ金茶・黄土・焦げ茶の岩肌テクスチャ）
        pctx.fillStyle = '#8c5008';
        pctx.fillRect(0, 0, 64, 64);

        const palette = ['#482000', '#683404', '#8c5008', '#ac6810', '#c88018', '#e09c24', '#f0b834'];
        for (let py = 0; py < 64; py += 2) {
            for (let px = 0; px < 64; px += 2) {
                // 周期的な有機ノイズで塊感と粒状ディザを両立
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
                    enemies.push(new DuckerEnemy(x, gy, sp.isCeiling, !!sp.isRed, false));
                } else if (sp.type === 'DUCKER_BACK' && typeof DuckerEnemy !== 'undefined') {
                    const backX = 4;
                    const gy = sp.isCeiling ? this.getTopY(backX) : this.getBottomY(backX);
                    enemies.push(new DuckerEnemy(backX, gy, sp.isCeiling, !!sp.isRed, true));
                } else if (sp.type === 'JUMPER' && typeof JumperEnemy !== 'undefined') {
                    const gy = sp.isCeiling ? topY : bottomY;
                    enemies.push(new JumperEnemy(x, gy, sp.isCeiling, !!sp.isRed));
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
                    const isl = new FloatingIsland(x, sp.y, sp.w || 168, sp.h || 56, this.scrollSpeed, !!sp.hasRedTurret);
                    this.floatingIslands.push(isl);
                } else if (sp.type === 'VOLCANO_TWIN' && typeof Volcano !== 'undefined') {
                    const v = new Volcano(x - 64, bottomY, false);
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

    // 参照画像右下の「緑の針葉樹林（ドット絵コニカルツリー群）」を地面上に描画
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

        // 1. 地上の緑の針葉樹林クラスターを描画（地表リムのすぐ奥に根元が馴染むよう配置）
        this.drawTreeClusters(ctx);

        // 2. 前景の粒状ゴールデンオーカー岩盤ポリゴンを描画
        if (Terrain._pattern) {
            if (typeof DOMMatrix !== 'undefined') {
                Terrain._pattern.setTransform(new DOMMatrix().translate(Math.round(this.textureOffsetX), 0));
            }
            ctx.fillStyle = Terrain._pattern;
        } else {
            ctx.fillStyle = '#b87414';
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

        // 3. 地表＆天井の粒状ゴールデンオーカー縁取りリム（参照画像の波打つ明部クラスト＆暗部シャドウ）
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
                ctx.fillStyle = '#582800';
                ctx.fillRect(bx, by - 1, bw, 8);
                ctx.fillStyle = '#c88018';
                ctx.fillRect(bx, by, bw, 5);
                ctx.fillStyle = '#f0b834';
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
                ctx.fillStyle = '#582800';
                ctx.fillRect(tx, ty - 7, tw, 8);
                ctx.fillStyle = '#c88018';
                ctx.fillRect(tx, ty - 5, tw, 4);
                ctx.fillStyle = '#f0b834';
                ctx.fillRect(tx + 1, ty - 2, Math.max(2, tw - 2), 2);
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
