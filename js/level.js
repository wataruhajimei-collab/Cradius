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

class LevelManager {
    constructor(canvasWidth, canvasHeight) {
        this.starfield = new Starfield(canvasWidth, canvasHeight);
        this.terrain = new Terrain(canvasWidth, canvasHeight);
        this.time = 0;
        this.state = 'WAVES'; // WAVES -> BOSS_WARNING -> BOSS -> CLEAR
        this.boss = null;
    }

    update(dt) {
        this.starfield.update();
        this.terrain.update();
        
        if (this.state === 'WAVES') {
            this.time += dt;
            
            // 40秒経過で地形が出現（たっぷりの空中戦フェーズから陸地・メイン戦へ突入）
            if (this.time > 40000 && !this.terrain.active && this.terrain.topPoints.length === 0) {
                this.terrain.start();
                if (typeof Sound !== 'undefined') {
                    Sound.playStageBgm(); // 陸地出現！最高に溌剌としたメインBGMへ劇的転換！
                }
            }

            // 130秒経過で地形生成を終了（約90秒間の地形洞窟戦を経て離脱へ）
            if (this.time > 130000 && this.terrain.generating) {
                this.terrain.stopGenerating();
            }

            // 145秒経過（約2分25秒）でボス戦へ直結突入（安っぽいWARNINGや警告音はカットし、グラディウス本来の演出へ）
            if (this.time > 145000) {
                this.state = 'BOSS';
                this.time = 0;
                this.terrain.active = false;
                if (typeof Sound !== 'undefined') Sound.playBossBgm();
                if (typeof Boss !== 'undefined') {
                    this.boss = new Boss(this.starfield.width, this.starfield.height / 2 - 50);
                }
            }
        } else if (this.state === 'BOSS') {
            if (this.boss) {
                this.boss.update();
                if (!this.boss.active) {
                    this.state = 'CLEAR';
                }
            }
        }
    }

    draw(ctx) {
        this.starfield.draw(ctx);
        this.terrain.draw(ctx);
        
        if (this.state === 'BOSS' && this.boss) {
            this.boss.draw(ctx);
        }
    }
}
