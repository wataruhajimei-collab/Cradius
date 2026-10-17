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
        this.textureOffsetX = 0;
        this.active = false;
        this.generating = false;
        this.currentSegIndex = 0;
        this.spawnIndex = 0;

        // 1985年アーケード版『グラディウス』Stage 1（火山面）完全再現プロファイルデータ
        // 天井 (Top Y) & 床 (Bottom Y) - 全140セグメント (全長5600px)
        this.topProfile = [
            // 進入部 (seg 0-6): なだらかに天井が迫る
            0, 10, 25, 45, 55, 60, 60,
            // 第1丘陵 (seg 7-15): なだらかな起伏
            60, 65, 75, 80, 75, 65, 60, 60, 65,
            // 谷間と窪み (seg 16-27): 天井が少し低くなり、また広がる
            75, 90, 110, 125, 110, 85, 70, 65, 70, 80, 75, 70,
            // 第1火山エリア (seg 28-42): 火山対岸の天井（安定した岩盤と天井砲台）
            70, 70, 75, 85, 90, 85, 75, 70, 70, 75, 80, 75, 70, 70, 70,
            // 中間洞窟・山脈エリア (seg 43-60): 天井の岩嘴が下に迫り出す最狭部
            75, 95, 125, 150, 155, 130, 95, 80, 90, 120, 145, 140, 105, 85, 75, 70, 75, 80,
            // 第2火山エリア (seg 61-75): 2基目火山の対岸天井
            85, 90, 85, 75, 70, 70, 75, 80, 75, 70, 70, 75, 80, 75, 70,
            // 後半丘陵エリア (seg 76-95): 波打つ岩肌
            75, 85, 105, 115, 100, 80, 70, 75, 90, 105, 95, 75, 70, 70, 75, 80, 75, 70, 65, 60,
            // 終盤エリア・脱出部 (seg 96-112): 天井が徐々に高くなり、消滅
            55, 50, 40, 30, 20, 10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            // 宇宙空間 (seg 113-140): 星空のみ
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
        ];
        this.bottomProfile = [
            // 進入部 (seg 0-6): なだらかに地面が隆起
            600, 580, 550, 525, 510, 500, 490,
            // 第1丘陵 (seg 7-15): なだらかな第1の丘
            470, 440, 420, 420, 450, 480, 500, 510, 490,
            // 谷間と窪み (seg 16-27): ハッチャーが鎮座する窪みと第2の丘
            470, 450, 480, 510, 525, 510, 480, 450, 435, 450, 480, 500,
            // 第1火山エリア (seg 28-42): なだらかに山が盛り上がり、頂上に火口（seg 33-35: Y=375）！
            510, 490, 460, 420, 390, 375, 375, 375, 400, 440, 475, 505, 520, 520, 500,
            // 中間洞窟・山脈エリア (seg 43-60): 起伏に富む丘陵と段差
            470, 440, 420, 430, 460, 490, 510, 490, 460, 430, 415, 430, 465, 495, 515, 510, 485, 460,
            // 第2火山エリア (seg 61-75): 再び雄大な山がそびえ、頂上に火口（seg 64-66: Y=365）！
            440, 410, 380, 365, 365, 365, 390, 430, 470, 500, 515, 520, 510, 485, 460,
            // 後半丘陵エリア (seg 76-95): 連続する起伏
            435, 420, 445, 475, 500, 515, 490, 460, 435, 435, 465, 495, 515, 500, 470, 445, 460, 490, 510, 520,
            // 終盤エリア・脱出部 (seg 96-112): 地面が低くなり、平坦になって消滅
            525, 530, 540, 550, 560, 575, 590, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600,
            // 宇宙空間 (seg 113-140): 星空のみ
            600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600, 600
        ];

        // 1985年アーケード版敵配置テーブル
        this.spawns = [
            { seg: 8, type: 'TURRET', isCeiling: true, isRed: false },
            { seg: 10, type: 'TURRET', isCeiling: false, isRed: true }, // 赤砲台 → カプセル！
            { seg: 12, type: 'DUCKER', isCeiling: false },
            { seg: 14, type: 'HATCHER', isCeiling: false },
            { seg: 18, type: 'TURRET', isCeiling: true, isRed: false },
            { seg: 20, type: 'HATCHER', isCeiling: true },
            { seg: 22, type: 'TURRET', isCeiling: false, isRed: false },
            { seg: 24, type: 'GARUN', y: 260 },
            { seg: 26, type: 'DUCKER', isCeiling: false },
            { seg: 30, type: 'TURRET', isCeiling: true, isRed: false },
            { seg: 34, type: 'VOLCANO_1' }, // ★第1火山！山頂 Y: 375
            { seg: 38, type: 'TURRET', isCeiling: true, isRed: true }, // 赤砲台 → カプセル！
            { seg: 44, type: 'TURRET', isCeiling: false, isRed: false },
            { seg: 46, type: 'DUCKER', isCeiling: false },
            { seg: 49, type: 'HATCHER', isCeiling: true },
            { seg: 51, type: 'GARUN', y: 300 },
            { seg: 53, type: 'TURRET', isCeiling: false, isRed: true }, // 赤砲台 → カプセル！
            { seg: 55, type: 'TURRET', isCeiling: true, isRed: false },
            { seg: 58, type: 'ZAB' },
            { seg: 62, type: 'TURRET', isCeiling: true, isRed: false },
            { seg: 65, type: 'VOLCANO_2' }, // ★第2火山！山頂 Y: 365
            { seg: 69, type: 'DUCKER', isCeiling: true },
            { seg: 71, type: 'TURRET', isCeiling: false, isRed: false },
            { seg: 76, type: 'HATCHER', isCeiling: false },
            { seg: 79, type: 'TURRET', isCeiling: true, isRed: false },
            { seg: 82, type: 'DUCKER', isCeiling: false },
            { seg: 85, type: 'GARUN', y: 250 },
            { seg: 88, type: 'TURRET', isCeiling: false, isRed: true }, // 赤砲台 → カプセル！
            { seg: 91, type: 'TURRET', isCeiling: true, isRed: false },
            { seg: 94, type: 'ZAB' },
            { seg: 98, type: 'DUCKER', isCeiling: false },
            { seg: 101, type: 'TURRET', isCeiling: false, isRed: false }
        ];

        Terrain._initTexture();
    }

    static _initTexture() {
        if (Terrain._pattern) return;
        const patCanvas = document.createElement('canvas');
        patCanvas.width = 64;
        patCanvas.height = 64;
        const pctx = patCanvas.getContext('2d');

        // 砂岩・火山岩のベースカラー
        pctx.fillStyle = '#8a6438';
        pctx.fillRect(0, 0, 64, 64);

        // 水平・斜めの地層クラックと陰影
        pctx.fillStyle = '#6e4c24';
        for (let y = 4; y < 64; y += 16) {
            pctx.fillRect(0, y, 64, 3);
            pctx.fillRect((y * 3) % 64, y - 4, 18, 4);
        }

        // ハイライト地層（サンドベージュ）
        pctx.fillStyle = '#a67d4b';
        for (let y = 10; y < 64; y += 16) {
            pctx.fillRect(0, y, 64, 2);
            pctx.fillRect(((y + 12) * 5) % 64, y + 2, 14, 3);
        }

        // 微細な火山岩ドット（粒状感）
        pctx.fillStyle = '#543615';
        for (let i = 0; i < 40; i++) {
            const rx = (i * 17) % 64;
            const ry = (i * 29) % 64;
            pctx.fillRect(rx, ry, 2, 2);
        }
        pctx.fillStyle = '#bc9058';
        for (let i = 0; i < 30; i++) {
            const rx = (i * 23 + 7) % 64;
            const ry = (i * 19 + 5) % 64;
            pctx.fillRect(rx, ry, 2, 2);
        }

        const dummyCanvas = document.createElement('canvas');
        const dctx = dummyCanvas.getContext('2d');
        Terrain._pattern = dctx.createPattern(patCanvas, 'repeat');
    }

    start() {
        this.active = true;
        this.generating = true;
        this.textureOffsetX = 0;
        this.currentSegIndex = 0;
        this.spawnIndex = 0;
        this.topPoints = [];
        this.bottomPoints = [];
        let currentX = this.width;
        this.topPoints.push({ x: currentX, y: 0 });
        this.bottomPoints.push({ x: currentX, y: this.height });
    }

    stopGenerating() {
        this.generating = false;
    }

    update() {
        if (!this.active) return;

        // スクロール
        this.topPoints.forEach(p => p.x -= this.scrollSpeed);
        this.bottomPoints.forEach(p => p.x -= this.scrollSpeed);
        this.textureOffsetX -= this.scrollSpeed;

        // 画面外のポイントを削除（描画用に1つ手前まで残す）
        while (this.topPoints.length > 2 && this.topPoints[1].x < 0) {
            this.topPoints.shift();
            this.bottomPoints.shift();
        }

        // 新規生成が停止し、全ての地形ポイントが画面左に抜けたら非アクティブ化
        if (!this.generating) {
            if (this.topPoints.length <= 2 && this.topPoints[this.topPoints.length - 1].x < 0) {
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

                    // セグメントごとの敵スポーン判定
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
            const sp = this.spawns[this.spawnIndex];
            if (sp.seg === segIdx) {
                if (sp.type === 'TURRET' && typeof TurretEnemy !== 'undefined') {
                    const gy = sp.isCeiling ? topY : bottomY;
                    enemies.push(new TurretEnemy(x, gy, sp.isCeiling, !!sp.isRed));
                } else if (sp.type === 'DUCKER' && typeof DuckerEnemy !== 'undefined') {
                    const gy = sp.isCeiling ? topY : bottomY;
                    enemies.push(new DuckerEnemy(x, gy, sp.isCeiling, false));
                } else if (sp.type === 'HATCHER' && typeof HatcherEnemy !== 'undefined') {
                    const gy = sp.isCeiling ? topY : bottomY;
                    enemies.push(new HatcherEnemy(x, gy, sp.isCeiling));
                } else if (sp.type === 'VOLCANO_1' || sp.type === 'VOLCANO_2') {
                    if (typeof Volcano !== 'undefined') {
                        // 火山を山頂に設置（幅110pxの火山を中央配置）
                        enemies.push(new Volcano(x - 55, bottomY, true));
                    }
                } else if (sp.type === 'GARUN' && typeof GarunFormation !== 'undefined') {
                    new GarunFormation(sp.y, Math.random() < 0.5, 4);
                } else if (sp.type === 'ZAB' && typeof ZabSquad !== 'undefined') {
                    new ZabSquad('ANYWHERE', null, 3);
                }
            }
            this.spawnIndex++;
        }
    }

    draw(ctx) {
        if (this.topPoints.length < 2) return;

        ctx.save();
        if (Terrain._pattern) {
            if (typeof DOMMatrix !== 'undefined') {
                Terrain._pattern.setTransform(new DOMMatrix().translate(this.textureOffsetX, 0));
            }
            ctx.fillStyle = Terrain._pattern;
        } else {
            ctx.fillStyle = '#8a6438';
        }

        // 天井ポリゴン
        ctx.beginPath();
        ctx.moveTo(this.topPoints[0].x, 0);
        this.topPoints.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(this.topPoints[this.topPoints.length - 1].x, 0);
        ctx.closePath();
        ctx.fill();

        // 地面ポリゴン
        ctx.beginPath();
        ctx.moveTo(this.bottomPoints[0].x, this.height);
        this.bottomPoints.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(this.bottomPoints[this.bottomPoints.length - 1].x, this.height);
        ctx.closePath();
        ctx.fill();

        // 重厚な火山岩輪郭エッジ（濃茶）
        ctx.strokeStyle = '#221105';
        ctx.lineWidth = 2.5;

        // 天井ライン
        ctx.beginPath();
        this.topPoints.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // 地面ライン
        ctx.beginPath();
        this.bottomPoints.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // 地面上面のハイライトライン（明るいサンドゴールド）
        ctx.strokeStyle = 'rgba(235, 185, 120, 0.65)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        this.bottomPoints.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x, p.y - 1);
            else ctx.lineTo(p.x, p.y - 1);
        });
        ctx.stroke();

        ctx.restore();
    }

    getTopY(x) {
        if (this.topPoints.length < 2) return 0;
        for (let i = 0; i < this.topPoints.length - 1; i++) {
            const p1 = this.topPoints[i];
            const p2 = this.topPoints[i+1];
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
            const p2 = this.bottomPoints[i+1];
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
        if (rect.y < yTopLeft || rect.y < yTopRight) return true;

        const yBottomLeft = this.getBottomY(rect.x);
        const yBottomRight = this.getBottomY(rect.x + rect.width);
        if (rect.y + rect.height > yBottomLeft || rect.y + rect.height > yBottomRight) return true;

        return false;
    }
    
    getGroundY(x) {
        return this.getBottomY(x);
    }
}

// 浮遊大陸 (FloatingIsland: 空中に浮かぶ巨大岩石島 & 4門のレーザー砲台)
class FloatingIsland {
    constructor(x, y, width, height, scrollSpeed = 1.5) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.scrollSpeed = scrollSpeed;
        this.active = true;
        this.turrets = [];

        // 浮遊大陸に4つのレーザー砲台を設置（上面に2基、下面に2基）
        if (typeof LaserTurretEnemy !== 'undefined' && typeof enemies !== 'undefined') {
            const relX1 = width * 0.22;
            const relX2 = width * 0.68;
            
            // 上面レーザー砲台 2基
            const tTop1 = new LaserTurretEnemy(this, relX1, false);
            const tTop2 = new LaserTurretEnemy(this, relX2, false);
            // 下面レーザー砲台 2基
            const tBottom1 = new LaserTurretEnemy(this, relX1, true);
            const tBottom2 = new LaserTurretEnemy(this, relX2, true);

            this.turrets.push(tTop1, tTop2, tBottom1, tBottom2);
            enemies.push(tTop1, tTop2, tBottom1, tBottom2);
        }
    }

    update() {
        this.x -= this.scrollSpeed;
        if (this.x + this.width < -150) {
            this.active = false;
        }
        // 浮遊大陸上の砲台の位置を確実に毎フレーム同期
        this.turrets.forEach(t => {
            if (t.active) t.updatePosition();
        });
    }

    checkCollision(rect) {
        if (!this.active) return false;
        // 自機または弾との矩形衝突判定
        return (
            rect.x < this.x + this.width &&
            rect.x + rect.width > this.x &&
            rect.y < this.y + this.height &&
            rect.y + rect.height > this.y
        );
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();

        const w = this.width;
        const h = this.height;
        const bevelX = 35;
        const bevelY = 20;

        // 立体感を際立たせるドロップシャドウ
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = -5;
        ctx.shadowOffsetY = 6;

        // 多層岩石グラデーション（浮遊大陸のローカル座標 this.x, this.y に100%固定・ズレ皆無！）
        const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + h);
        grad.addColorStop(0.0, '#9a6332'); // 陽光を浴びる上部岩盤
        grad.addColorStop(0.2, '#7a4b22');
        grad.addColorStop(0.5, '#563314'); // 地層の中央部
        grad.addColorStop(0.8, '#39200b');
        grad.addColorStop(1.0, '#1c0f05'); // 深い底面シャドウ
        ctx.fillStyle = grad;

        // アーケード・グラディウス特有の重厚なオクタゴナル浮遊岩盤ポリゴン
        ctx.beginPath();
        ctx.moveTo(this.x + bevelX, this.y);
        ctx.lineTo(this.x + w - bevelX, this.y);
        ctx.lineTo(this.x + w, this.y + bevelY);
        ctx.lineTo(this.x + w - 12, this.y + h - bevelY);
        ctx.lineTo(this.x + w - bevelX - 10, this.y + h);
        ctx.lineTo(this.x + bevelX + 10, this.y + h);
        ctx.lineTo(this.x, this.y + h - bevelY);
        ctx.lineTo(this.x + 12, this.y + bevelY);
        ctx.closePath();
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // 重厚な外郭エッジライン
        ctx.strokeStyle = '#180d04';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 上部・側面エッジの光沢ハイライトライン
        ctx.strokeStyle = 'rgba(255, 235, 190, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + bevelX, this.y + 2);
        ctx.lineTo(this.x + w - bevelX, this.y + 2);
        ctx.lineTo(this.x + w - 2, this.y + bevelY);
        ctx.stroke();

        // 内部地層ライン（岩肌の横縞クラック）
        ctx.strokeStyle = 'rgba(30, 15, 5, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.x + 20, this.y + h * 0.35);
        ctx.lineTo(this.x + w * 0.4, this.y + h * 0.38);
        ctx.lineTo(this.x + w - 25, this.y + h * 0.32);
        ctx.moveTo(this.x + 35, this.y + h * 0.68);
        ctx.lineTo(this.x + w * 0.55, this.y + h * 0.65);
        ctx.lineTo(this.x + w - 30, this.y + h * 0.72);
        ctx.stroke();

        // 4基のレーザー砲台が設置される「金属製マウントベース（砲台台座）」を島に直接描画！
        const relX1 = w * 0.22 + 21; // 砲台センター (42px幅の中心)
        const relX2 = w * 0.68 + 21;
        const mountW = 44;
        const mountH = 7;

        // 上面マウント 2箇所
        this.drawMountBase(ctx, this.x + relX1, this.y - 2, mountW, mountH, false);
        this.drawMountBase(ctx, this.x + relX2, this.y - 2, mountW, mountH, false);
        // 下面マウント 2箇所
        this.drawMountBase(ctx, this.x + relX1, this.y + h - 5, mountW, mountH, true);
        this.drawMountBase(ctx, this.x + relX2, this.y + h - 5, mountW, mountH, true);

        ctx.restore();
    }

    drawMountBase(ctx, cx, y, w, h, isCeil) {
        ctx.save();
        const baseGrad = ctx.createLinearGradient(cx - w/2, y, cx + w/2, y);
        baseGrad.addColorStop(0.0, '#334155');
        baseGrad.addColorStop(0.3, '#cbd5e1');
        baseGrad.addColorStop(0.7, '#64748b');
        baseGrad.addColorStop(1.0, '#1e293b');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(cx - w/2, y, w, h);

        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(cx - w/2, y, w, h);

        // シアンLEDインジケーターランプ
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(cx - 10, y + 2, 4, 3);
        ctx.fillRect(cx + 6, y + 2, 4, 3);
        ctx.restore();
    }
}

class LevelManager {
    constructor(canvasWidth, canvasHeight) {
        this.starfield = new Starfield(canvasWidth, canvasHeight);
        this.terrain = new Terrain(canvasWidth, canvasHeight);
        this.time = 0;
        this.state = 'AIR_BATTLE'; // AIR_BATTLE -> TERRAIN -> PRE_BOSS -> BOSS -> STAGE_CLEAR -> STAGE2
        this.stage = 1;
        this.boss = null;
        this.preBossTimer = 0;
        this.preBossZabWave = 0;
        this.stageClearTimer = 0;

        // 空中戦ファン編隊スケジュール（本家アーケード完全再現：7編隊・全滅で赤カプセル）
        this.airWaveTimes = [800, 3200, 5600, 8000, 10400, 12800, 15200];
        this.airWaveYs = [150, 420, 200, 380, 250, 340, 290];
        this.airWaveSpawned = 0;
    }

    update(dt) {
        this.starfield.update();

        if (this.stage === 1) {
            this.time += dt;

            if (this.state === 'AIR_BATTLE') {
                // 空中戦フェーズ（0〜約17.5秒: 7編隊の赤いファンが順次飛来しカプセル補給）
                if (this.airWaveSpawned < this.airWaveTimes.length) {
                    if (this.time >= this.airWaveTimes[this.airWaveSpawned]) {
                        const y = this.airWaveYs[this.airWaveSpawned];
                        if (typeof Formation !== 'undefined') {
                            new Formation(y, 4, true); // 赤ファン4機編隊（全滅で赤カプセル確定）
                        }
                        this.airWaveSpawned++;
                    }
                }

                // 17.5秒経過で地上戦フェーズへ突入！
                if (this.time >= 17500) {
                    this.state = 'TERRAIN';
                    this.terrain.start();
                    if (typeof Sound !== 'undefined' && typeof Sound.playStageBgm === 'function') {
                        Sound.playStageBgm(); // Challenger 1985 へ華麗に切り替え！
                    }
                }
            } else if (this.state === 'TERRAIN') {
                // 地上戦フェーズ（本家完全再現の固定地形マップ＋砲台・ダッカー・ハッチャー・2基の連続噴火火山）
                this.terrain.update();

                // 地形がすべて画面左に抜け去ったら、ボス前宇宙空間へ移行！
                if (!this.terrain.active && this.terrain.currentSegIndex >= this.terrain.topProfile.length) {
                    this.state = 'PRE_BOSS';
                    this.preBossTimer = 0;
                    this.preBossZabWave = 0;
                    if (typeof Sound !== 'undefined' && typeof Sound.playBossBgm === 'function') {
                        Sound.playBossBgm(); // Aircraft Carrier へ切り替え！
                    }
                }
            } else if (this.state === 'PRE_BOSS') {
                // ボス前宇宙戦フェーズ（約7秒間のボス前ザブラッシュ！）
                this.preBossTimer += dt;

                // 約1.8秒おきにザブ小隊がワープ突撃
                if (this.preBossTimer > (this.preBossZabWave + 1) * 1800 && this.preBossZabWave < 3) {
                    this.preBossZabWave++;
                    if (typeof ZabSquad !== 'undefined') {
                        new ZabSquad('ANYWHERE', null, 3);
                    }
                }

                // 約7秒経過でビッグコア登場！
                if (this.preBossTimer >= 7000) {
                    this.state = 'BOSS';
                    if (typeof Boss !== 'undefined') {
                        this.boss = new Boss(this.starfield.width, 220);
                    }
                }
            } else if (this.state === 'BOSS') {
                // ビッグコア戦
                if (this.boss) {
                    this.boss.update();
                    if (!this.boss.active) {
                        this.state = 'STAGE_CLEAR';
                        this.stageClearTimer = 0;
                    }
                }
            } else if (this.state === 'STAGE_CLEAR') {
                this.stageClearTimer += dt;
                // 本家グラディウス同様、自機の自由操作を維持したまま約3秒後にステージ2へ突入！
                if (this.stageClearTimer > 3000) {
                    this.startStage2();
                }
            }
        } else if (this.stage === 2) {
            // ステージ2: ストーンヘンジ面の更新
            if (typeof stonehengeStage !== 'undefined' && stonehengeStage) {
                stonehengeStage.update(dt);
                // STAGE_CLEAR / ALL_CLEAR 後 3 秒でステージ3へ遷移
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
            // ステージ3: モアイ面の更新
            if (window.stage3) {
                window.stage3.update(dt);
                // STAGE_CLEAR / ALL_CLEAR 後 3 秒でステージ4（逆火山面）へ遷移
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
            // ステージ4: 逆火山面の更新
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
        this.preBossTimer = 0;
        this.preBossZabWave = 0;
        this.stageClearTimer = 0;
        this.airWaveSpawned = 0;
        this.terrain.active = false;
        this.terrain.generating = false;
        this.terrain.topPoints = [];
        this.terrain.bottomPoints = [];
        this.terrain.scrollSpeed = 1.5;

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

        // 1面の火山や火山弾、残存敵を一掃
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
            Sound.playAirBgm(); // 2面開幕も原作通り宇宙空中戦BGM（Beginning of the History）からスタート！
        }
    }

    startStage3() {
        if (this.stage === 3 && window.stage3 && window.stage3.active) return; // 二重呼び出し防止
        this.stage = 3;
        this.state = 'STAGE3';
        this.time = 0;
        this.boss = null;

        // ステージ2の残骸を完全クリア
        if (typeof stonehengeStage !== 'undefined' && stonehengeStage) {
            stonehengeStage.active = false;
        }

        // 敵・弾をリセット
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
        if (this.stage === 4 && window.stage4 && window.stage4.active) return; // 二重呼び出し防止
        this.stage = 4;
        this.state = 'STAGE4';
        this.time = 0;
        this.boss = null;

        // 前ステージの残骸をクリア
        this.terrain.active = false;
        this.terrain.topPoints = [];
        this.terrain.bottomPoints = [];
        if (typeof stonehengeStage !== 'undefined' && stonehengeStage) {
            stonehengeStage.active = false;
        }
        if (window.stage3) {
            window.stage3.active = false;
        }

        // 敵・弾をリセット
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
            // 地形との衝突判定
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

            // ステージクリア演出テキスト
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
