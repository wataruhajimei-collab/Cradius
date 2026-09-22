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
        this.textureOffsetX = 0; // 滑らかなテクスチャスクロール用オフセット
        this.active = false;
        this.generating = false;
        this.targetTopY = 50;
        this.targetBottomY = canvasHeight - 50;
    }

    start() {
        this.active = true;
        this.generating = true;
        this.textureOffsetX = 0;
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
        this.textureOffsetX -= this.scrollSpeed; // 1px単位で滑らかに左へ移動

        // 画面外のポイントを削除（描画用に1つ手前まで残す）
        while (this.topPoints.length > 2 && this.topPoints[1].x < 0) {
            this.topPoints.shift();
            this.bottomPoints.shift();
        }

        // 新規生成が停止し、全ての地形が左に抜けたら非アクティブ化
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
                
                // 徐々に高さを変えて滑らかな岩肌を作る
                this.targetTopY += (Math.random() - 0.5) * 50;
                if (this.targetTopY < 20) this.targetTopY = 20;
                if (this.targetTopY > 150) this.targetTopY = 150;

                this.targetBottomY += (Math.random() - 0.5) * 50;
                if (this.targetBottomY > this.height - 20) this.targetBottomY = this.height - 20;
                if (this.targetBottomY < this.height - 150) this.targetBottomY = this.height - 150;

                this.topPoints.push({ x: lastX, y: this.targetTopY });
                this.bottomPoints.push({ x: lastX, y: this.targetBottomY });

                // 地形上の敵・ギミックのスポーン判定
                if (typeof enemies !== 'undefined') {
                    const roll = Math.random();
                    // 砲台 (青銀 / たまに赤)
                    if (roll < 0.08) {
                        const isRed = Math.random() < 0.15;
                        enemies.push(new TurretEnemy(lastX, this.targetTopY, true, isRed));
                    } else if (roll < 0.16) {
                        const isRed = Math.random() < 0.15;
                        enemies.push(new TurretEnemy(lastX, this.targetBottomY, false, isRed));
                    }
                    // ダッカー（歩行ロボット: 地面または天井）
                    else if (roll < 0.22) {
                        const isCeil = Math.random() < 0.5;
                        const isRed = Math.random() < 0.15;
                        const gy = isCeil ? this.targetTopY : this.targetBottomY;
                        if (typeof DuckerEnemy !== 'undefined') {
                            enemies.push(new DuckerEnemy(lastX, gy, isCeil, isRed));
                        }
                    }
                    // ハッチャー（母艦）
                    else if (roll < 0.26) {
                        const isCeil = Math.random() < 0.5;
                        const gy = isCeil ? this.targetTopY : this.targetBottomY;
                        if (typeof HatcherEnemy !== 'undefined') {
                            enemies.push(new HatcherEnemy(lastX, gy, isCeil, false));
                        }
                    }
                    // 火山（地面クレーター）
                    else if (roll < 0.29) {
                        if (typeof Volcano !== 'undefined') {
                            enemies.push(new Volcano(lastX, this.targetBottomY));
                        }
                    }
                }
            }
        }
    }

    draw(ctx) {
        if (this.topPoints.length < 2) return;

        ctx.save();
        if (typeof images !== 'undefined' && images.terrain && images.terrain.complete) {
            const pattern = ctx.createPattern(images.terrain, 'repeat');
            if (typeof DOMMatrix !== 'undefined') {
                pattern.setTransform(new DOMMatrix().translate(this.textureOffsetX, 0));
            }
            ctx.fillStyle = pattern;
        } else {
            ctx.fillStyle = '#664422';
        }

        ctx.strokeStyle = '#221100';
        ctx.lineWidth = 2;

        // 天井
        ctx.beginPath();
        ctx.moveTo(this.topPoints[0].x, 0);
        this.topPoints.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(this.topPoints[this.topPoints.length - 1].x, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 地面
        ctx.beginPath();
        ctx.moveTo(this.bottomPoints[0].x, this.height);
        this.bottomPoints.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(this.bottomPoints[this.bottomPoints.length - 1].x, this.height);
        ctx.closePath();
        ctx.fill();
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
        this.state = 'WAVES'; // WAVES -> BOSS -> STAGE_CLEAR -> STAGE2
        this.stage = 1;
        this.boss = null;
        this.floatingIslands = [];
        this.islandSpawnTimes = [26000, 41000, 56000]; // 途中に3つ浮遊大陸を設置
        this.islandSpawnedCount = 0;
        this.volcanoSpawned = false; // ボス直前の火山噴火フラグ
        this.stageClearTimer = 0;
    }

    update(dt) {
        this.starfield.update();

        if (this.stage === 1) {
            this.terrain.update();

            // 浮遊大陸の更新
            this.floatingIslands.forEach(island => island.update());
            this.floatingIslands = this.floatingIslands.filter(island => island.active);
            
            if (this.state === 'WAVES') {
                this.time += dt;
                
                // 20秒経過で地上地形が出現（空中戦からスムーズに地形戦へ突入）
                if (this.time > 20000 && !this.terrain.active && this.terrain.topPoints.length === 0) {
                    this.terrain.start();
                    if (typeof Sound !== 'undefined') {
                        Sound.playStageBgm(); // 陸地出現！最高に溌剌としたメインBGMへ劇的転換！
                    }
                }

                // 途中に3つの浮遊大陸を順次出現（各島に4つのレーザー砲台）
                if (this.islandSpawnedCount < 3 && this.time > this.islandSpawnTimes[this.islandSpawnedCount]) {
                    const idx = this.islandSpawnedCount;
                    // 島ごとに高さを変えてルートの戦略性を生む
                    const heights = [200, 310, 230];
                    const widths = [270, 290, 310];
                    const thicks = [70, 80, 75];
                    const island = new FloatingIsland(
                        this.starfield.width + 50,
                        heights[idx],
                        widths[idx],
                        thicks[idx],
                        this.terrain.scrollSpeed
                    );
                    this.floatingIslands.push(island);
                    this.islandSpawnedCount++;
                }

                // 66秒経過でボス直前の名物「ダブルボルケーノ（巨大火山2基）」が出現して大噴火！
                if (this.time > 66000 && !this.volcanoSpawned && typeof Volcano !== 'undefined') {
                    this.volcanoSpawned = true;
                    // 地上のダブルボルケーノ（激しい連続噴火モード）
                    const v1 = new Volcano(this.starfield.width + 50, this.terrain.getBottomY(this.starfield.width + 50), true);
                    const v2 = new Volcano(this.starfield.width + 240, this.terrain.getBottomY(this.starfield.width + 240), true);
                    enemies.push(v1, v2);
                }

                // 76秒経過で地形生成を終了（火山地帯を抜けてボス前の静寂へ）
                if (this.time > 76000 && this.terrain.generating) {
                    this.terrain.stopGenerating();
                }

                // 84秒経過（約1分24秒）でボス戦へ突入（2倍ビッグコア）
                if (this.time > 84000) {
                    this.state = 'BOSS';
                    this.time = 0;
                    this.terrain.active = false;
                    if (typeof Sound !== 'undefined') Sound.playBossBgm();
                    if (typeof Boss !== 'undefined') {
                        this.boss = new Boss(this.starfield.width, 200);
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
                // 自機を前進加速させてステージクリア演出
                if (typeof player !== 'undefined') {
                    player.x += 3.5;
                }
                // 約3秒後にステージ2（ストーンヘンジ面）へ突入
                if (this.stageClearTimer > 3000) {
                    this.startStage2();
                }
            }
        } else if (this.stage === 2) {
            // ステージ2: ストーンヘンジ面の更新
            if (typeof stonehengeStage !== 'undefined' && stonehengeStage) {
                stonehengeStage.update(dt);
            }
        }
    }

    startStage2() {
        this.stage = 2;
        this.state = 'STAGE2';
        this.time = 0;
        this.boss = null;
        this.floatingIslands = [];
        this.terrain.active = false;
        this.terrain.topPoints = [];
        this.terrain.bottomPoints = [];

        if (typeof player !== 'undefined') {
            player.x = 80;
            player.y = this.starfield.height / 2 - 10;
        }

        if (typeof StonehengeStage !== 'undefined') {
            stonehengeStage = new StonehengeStage(this.starfield.width, this.starfield.height);
            stonehengeStage.start();
        }
        if (typeof Sound !== 'undefined') {
            Sound.playAirBgm(true); // ステージ2専用の疾走感あふれる楽曲へ
        }
    }

    checkCollision(rect) {
        if (this.stage === 1) {
            // 地形との衝突
            if (this.terrain && this.terrain.checkCollision(rect)) return true;
            // 浮遊大陸との衝突
            for (let i = 0; i < this.floatingIslands.length; i++) {
                if (this.floatingIslands[i].checkCollision(rect)) return true;
            }
        } else if (this.stage === 2) {
            if (typeof stonehengeStage !== 'undefined' && stonehengeStage) {
                return stonehengeStage.checkCollision(rect);
            }
        }
        return false;
    }

    draw(ctx) {
        if (this.stage === 1) {
            this.starfield.draw(ctx);
            this.terrain.draw(ctx);
            
            // 浮遊大陸の描画
            this.floatingIslands.forEach(island => island.draw(ctx));
            
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
        }
    }
}
