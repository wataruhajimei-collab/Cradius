// ==========================================
// CRADIUS STAGE 3: MOAI PLANET（モアイ面）
// 神秘の宇宙古代文明惑星！
// 美しい青紫の星雲、口からイオンリング弾を放つ巨石モアイ像群、
// そして伝説の機械要塞「ビッグコア」との決戦！
// ==========================================

class MoaiTerrain {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;

        this.scrollSpeed = 1.8;
        this.topY = 85;                   // 天井岩壁の下端Y
        this.bottomY = canvasHeight - 85; // 地面岩壁の上端Y

        this.active = false;      // 背景・星空全体の稼働フラグ
        this.wallActive = false;  // 天井・地面の岩壁とモアイの出現フラグ
        this.generating = true;   // 新規モアイ・凸凹の生成フラグ

        // 埋め込みモアイ像リスト
        // 各要素: { x, y, side: 'top'|'bottom', hp: 3, maxHp: 3, flashTimer: 0, shootTimer: 0, mouthOpen: false }
        this.moais = [];
        this.moaiSpawnTimer = 0;

        // 地形の凸凹ポイント
        this.topVariations = [];
        this.bottomVariations = [];
        this.variationSpawnTimer = 0;

        // 星空（背景用：開幕から高速に流れる！）
        this.stars = [];
        for (let i = 0; i < 90; i++) {
            this.stars.push({
                x: Math.random() * canvasWidth,
                y: Math.random() * canvasHeight,
                speed: Math.random() * 2.0 + 0.6,
                size: Math.random() * 2.0 + 0.6,
                brightness: Math.random() * 0.7 + 0.3
            });
        }

        // 神秘的な星雲エフェクト（古代宇宙の深淵）
        this.nebulae = [
            { x: 180, y: 180, rx: 140, ry: 75, color: 'rgba(70, 30, 140, 0.18)' },
            { x: 560, y: 340, rx: 160, ry: 85, color: 'rgba(25, 75, 160, 0.16)' },
            { x: 340, y: 460, rx: 120, ry: 60, color: 'rgba(95, 25, 120, 0.14)' },
            { x: 720, y: 150, rx: 110, ry: 55, color: 'rgba(35, 95, 150, 0.14)' }
        ];

        // 岩壁出現時のイージング（0 -> 1）
        this.wallTransition = 0;
    }

    start() {
        this.active = true;
        this.wallActive = false;
        this.generating = true;
        this.moais = [];
        this.topVariations = [];
        this.bottomVariations = [];
        this.wallTransition = 0;
        this.moaiSpawnTimer = 0;
        this.variationSpawnTimer = 0;
    }

    startWalls() {
        this.wallActive = true;
        this.generating = true;
        this.moaiSpawnTimer = 0;
        this.variationSpawnTimer = 0;

        // 岩壁開始直後から前方にいくつかのモアイを先行配置
        this.moais.push({
            x: this.width + 40,
            y: this.bottomY,
            side: 'bottom',
            hp: 3,
            maxHp: 3,
            flashTimer: 0,
            shootTimer: 30,
            mouthOpen: false
        });
        this.moais.push({
            x: this.width + 240,
            y: this.topY,
            side: 'top',
            hp: 3,
            maxHp: 3,
            flashTimer: 0,
            shootTimer: 60,
            mouthOpen: false
        });
    }

    stopGenerating() {
        this.generating = false;
    }

    update() {
        if (!this.active) return;

        // 1. 星空のスクロール（常に動く！）
        this.stars.forEach(s => {
            s.x -= s.speed;
            if (s.x < 0) {
                s.x = this.width;
                s.y = Math.random() * this.height;
            }
        });

        // 2. 星雲のパララックススクロール
        this.nebulae.forEach(n => {
            n.x -= 0.35;
            if (n.x + n.rx < 0) {
                n.x = this.width + n.rx;
            }
        });

        // 岩壁が出現していない場合はここまで
        if (!this.wallActive) return;

        // 岩壁出現アニメーション（スムーズに上下から迫り出す）
        if (this.wallTransition < 1.0) {
            this.wallTransition = Math.min(1.0, this.wallTransition + 0.02);
        }

        // 3. 凸凹ポイントのスクロール
        this.topVariations.forEach(v => v.x -= this.scrollSpeed);
        this.bottomVariations.forEach(v => v.x -= this.scrollSpeed);
        this.topVariations = this.topVariations.filter(v => v.x + v.width > -20);
        this.bottomVariations = this.bottomVariations.filter(v => v.x + v.width > -20);

        // 4. モアイ像のスクロール
        this.moais.forEach(m => {
            m.x -= this.scrollSpeed;
        });
        this.moais = this.moais.filter(m => m.x + 60 > -20);

        // 5. 新規凸凹・モアイの生成
        if (this.generating) {
            // 凸凹生成
            this.variationSpawnTimer++;
            if (this.variationSpawnTimer >= 180) {
                this.variationSpawnTimer = 0;
                const side = Math.random() < 0.5 ? 'top' : 'bottom';
                const vHeight = Math.floor(Math.random() * 26) + 10;
                const vWidth = 80 + Math.floor(Math.random() * 70);
                const vObj = { x: this.width + 20, height: vHeight, width: vWidth, side };
                if (side === 'top') this.topVariations.push(vObj);
                else this.bottomVariations.push(vObj);
            }

            // モアイ像生成（テンポ良く上下から登場！）
            this.moaiSpawnTimer++;
            if (this.moaiSpawnTimer >= 110) {
                this.moaiSpawnTimer = 0;
                const side = Math.random() < 0.5 ? 'top' : 'bottom';
                const my = side === 'top' ? this.topY : this.bottomY;
                this.moais.push({
                    x: this.width + 50,
                    y: my,
                    side: side,
                    hp: 3,
                    maxHp: 3,
                    flashTimer: 0,
                    shootTimer: Math.floor(Math.random() * 40),
                    mouthOpen: false
                });
            }
        }

        // 6. 各モアイの射撃＆アニメーション処理
        this.moais.forEach(m => {
            if (m.flashTimer > 0) m.flashTimer--;

            // 口の開閉＆発射タイマー
            m.shootTimer++;
            // 発射直前の20フレームは口を開ける！
            if (m.shootTimer >= 85) {
                m.mouthOpen = true;
            } else {
                m.mouthOpen = false;
            }

            // 発射！
            if (m.shootTimer >= 105) {
                m.shootTimer = 0;
                m.mouthOpen = false;
                this._shootMoai(m);
            }
        });
    }

    _shootMoai(m) {
        if (typeof enemyBullets === 'undefined') return;
        // モアイの口から左方向へ3〜4方向に回転イオンリング弾を発射！
        const isTop = m.side === 'top';
        const cx = m.x + 24;
        const cy = isTop ? m.y + 45 : m.y - 45;

        const angles = isTop
            ? [0.15, 0.40, 0.65]  // 天井側：斜め下〜前方
            : [-0.15, -0.40, -0.65]; // 地面側：斜め上〜前方

        angles.forEach(ang => {
            const spd = 3.8;
            const vx = -Math.cos(ang) * spd;
            const vy = Math.sin(ang) * spd;
            const color = (Math.random() < 0.3) ? '#ffaa00' : '#00ffee';

            if (typeof RingBullet !== 'undefined') {
                enemyBullets.push(new RingBullet(cx, cy, vx, vy, color));
            } else if (typeof Bullet !== 'undefined') {
                enemyBullets.push(new Bullet(cx, cy, vx, vy, color, true));
            }
        });

        if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') {
            Sound.playBossHit();
        }
    }

    // 地形・岩壁との当たり判定
    checkCollision(rect) {
        if (!this.active || !this.wallActive || this.wallTransition < 0.5) return false;

        const curTopY = this.getTopY(rect.x + rect.width / 2);
        if (rect.y < curTopY) return true;

        const curBottomY = this.getBottomY(rect.x + rect.width / 2);
        if (rect.y + rect.height > curBottomY) return true;

        return false;
    }

    getTopY(x) {
        const targetTop = this.topY;
        let effectiveTop = targetTop * this.wallTransition;
        for (const v of this.topVariations) {
            if (x >= v.x && x <= v.x + v.width) {
                effectiveTop = Math.max(effectiveTop, (targetTop + v.height) * this.wallTransition);
            }
        }
        return effectiveTop;
    }

    getBottomY(x) {
        const targetBottom = this.bottomY;
        let effectiveBottom = this.height - (this.height - targetBottom) * this.wallTransition;
        for (const v of this.bottomVariations) {
            if (x >= v.x && x <= v.x + v.width) {
                effectiveBottom = Math.min(effectiveBottom, this.height - (this.height - targetBottom + v.height) * this.wallTransition);
            }
        }
        return effectiveBottom;
    }

    hitMoai(moaiIndex, damage) {
        const m = this.moais[moaiIndex];
        if (!m) return;

        m.hp -= damage;
        m.flashTimer = 7;

        if (m.hp <= 0) {
            const isTop = m.side === 'top';
            const cx = m.x + 25;
            const cy = isTop ? m.y + 35 : m.y - 35;

            if (typeof createExplosion === 'function') {
                createExplosion(cx, cy, '#00ffee');
                createExplosion(cx, cy, '#ffaa00');
            }
            if (typeof Sound !== 'undefined' && typeof Sound.playExplosion === 'function') {
                Sound.playExplosion();
            }

            // 35%の確率でカプセルをドロップ！
            if (Math.random() < 0.35 && typeof capsules !== 'undefined' && typeof PowerUpCapsule !== 'undefined') {
                capsules.push(new PowerUpCapsule(cx, cy));
            }

            this.moais.splice(moaiIndex, 1);
        }
    }

    // プレイヤーの弾とモアイ像の当たり判定
    handleBulletCollisions(playerBullets) {
        if (!this.wallActive) return;

        playerBullets.forEach(bullet => {
            if (!bullet.active) return;

            for (let i = this.moais.length - 1; i >= 0; i--) {
                const m = this.moais[i];
                const mw = 52;
                const mh = 70;
                const isTop = m.side === 'top';
                const my = isTop ? m.y : m.y - mh;

                const bounds = { x: m.x, y: my, width: mw, height: mh };
                if (checkCollision(bullet, bounds)) {
                    if (typeof Laser !== 'undefined' && bullet instanceof Laser) {
                        this.hitMoai(i, 2); // レーザーは大ダメージ
                    } else {
                        bullet.active = false;
                        this.hitMoai(i, 1);
                    }
                    if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') {
                        Sound.playBossHit();
                    }
                    break;
                }
            }
        });
    }

    draw(ctx) {
        ctx.save();

        // 1. 宇宙空間の深淵グラデーション（濃紺〜青紫）
        const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
        bgGrad.addColorStop(0.0, '#030820');
        bgGrad.addColorStop(0.45, '#0a1038');
        bgGrad.addColorStop(1.0, '#180730');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        // 2. 星雲エフェクト
        this.nebulae.forEach(n => {
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(n.x, n.y, n.rx, n.ry, 0, 0, Math.PI * 2);
            const eg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, Math.max(n.rx, n.ry));
            eg.addColorStop(0, n.color);
            eg.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = eg;
            ctx.fill();
            ctx.restore();
        });

        // 3. 星々（輝く星の海）
        this.stars.forEach(s => {
            ctx.globalAlpha = s.brightness;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(s.x, s.y, s.size, s.size);
        });
        ctx.globalAlpha = 1.0;

        // 岩壁が出現している場合のみ岩壁とモアイを描画
        if (this.wallActive && this.wallTransition > 0.01) {
            this._drawTopWall(ctx);
            this._drawBottomWall(ctx);

            this.moais.forEach(m => {
                this._drawMoai(ctx, m);
            });
        }

        ctx.restore();
    }

    _drawTopWall(ctx) {
        ctx.save();
        const curTop = this.topY * this.wallTransition;

        const wallGrad = ctx.createLinearGradient(0, 0, 0, curTop);
        wallGrad.addColorStop(0.0, '#243242');
        wallGrad.addColorStop(0.65, '#334455');
        wallGrad.addColorStop(1.0, '#182430');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0, 0, this.width, curTop);

        // 凸凹
        ctx.fillStyle = '#2b3a4a';
        this.topVariations.forEach(v => {
            const h = v.height * this.wallTransition;
            ctx.fillRect(v.x, curTop, v.width, h);
            ctx.strokeStyle = 'rgba(100, 160, 220, 0.4)';
            ctx.lineWidth = 1;
            ctx.strokeRect(v.x, curTop, v.width, h);
        });

        // エッジライン
        ctx.strokeStyle = 'rgba(70, 140, 200, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, curTop);
        ctx.lineTo(this.width, curTop);
        ctx.stroke();

        ctx.restore();
    }

    _drawBottomWall(ctx) {
        ctx.save();
        const wallH = (this.height - this.bottomY) * this.wallTransition;
        const curBottom = this.height - wallH;

        const wallGrad = ctx.createLinearGradient(0, curBottom, 0, this.height);
        wallGrad.addColorStop(0.0, '#182430');
        wallGrad.addColorStop(0.35, '#334455');
        wallGrad.addColorStop(1.0, '#243242');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0, curBottom, this.width, wallH);

        // 凸凹
        ctx.fillStyle = '#2b3a4a';
        this.bottomVariations.forEach(v => {
            const h = v.height * this.wallTransition;
            ctx.fillRect(v.x, curBottom - h, v.width, h);
            ctx.strokeStyle = 'rgba(100, 160, 220, 0.4)';
            ctx.lineWidth = 1;
            ctx.strokeRect(v.x, curBottom - h, v.width, h);
        });

        // エッジライン
        ctx.strokeStyle = 'rgba(70, 140, 200, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, curBottom);
        ctx.lineTo(this.width, curBottom);
        ctx.stroke();

        ctx.restore();
    }

    _drawMoai(ctx, m) {
        ctx.save();
        const isTop = m.side === 'top';
        const isFlash = m.flashTimer > 0;
        const mw = 52;
        const mh = 70;
        const mx = m.x;
        const my = isTop ? m.y : m.y - mh;

        ctx.save();
        if (isTop) {
            // 天井側：上下反転（顔が下向き）
            ctx.translate(mx + mw / 2, my + mh / 2);
            ctx.scale(1, -1);
            ctx.translate(-(mx + mw / 2), -(my + mh / 2));
        }

        // 石像グラデーション
        const stoneGrad = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
        if (isFlash) {
            stoneGrad.addColorStop(0.0, '#ffffff');
            stoneGrad.addColorStop(0.5, '#cce8ff');
            stoneGrad.addColorStop(1.0, '#ffffff');
        } else {
            stoneGrad.addColorStop(0.0, '#94a3b8');
            stoneGrad.addColorStop(0.4, '#64748b');
            stoneGrad.addColorStop(1.0, '#334155');
        }
        ctx.fillStyle = stoneGrad;

        // 頭部輪郭
        ctx.beginPath();
        ctx.moveTo(mx + 8, my);
        ctx.lineTo(mx + mw - 8, my);
        ctx.lineTo(mx + mw - 3, my + mh * 0.45);
        ctx.lineTo(mx + 3, my + mh * 0.45);
        ctx.closePath();
        ctx.fill();

        // 胴体下部
        ctx.beginPath();
        ctx.moveTo(mx + 4, my + mh * 0.45);
        ctx.lineTo(mx + mw - 4, my + mh * 0.45);
        ctx.lineTo(mx + mw - 6, my + mh);
        ctx.lineTo(mx + 6, my + mh);
        ctx.closePath();
        ctx.fill();

        // 輪郭線
        ctx.strokeStyle = isFlash ? '#ffffff' : '#1e293b';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // 目（シアン発光）
        const eyeY = my + mh * 0.22;
        const eyeColor = isFlash ? '#ffffff' : '#00ffee';
        ctx.fillStyle = eyeColor;
        ctx.shadowColor = eyeColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(mx + mw * 0.3, eyeY, 5, 4, 0, 0, Math.PI * 2);
        ctx.ellipse(mx + mw * 0.7, eyeY, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 鼻
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(mx + mw * 0.4, my + mh * 0.30, mw * 0.2, mh * 0.09);

        // 口（開閉アニメーション！）
        const mouthY = my + mh * 0.42;
        const mouthH = m.mouthOpen ? 12 : 3;
        const mouthColor = m.mouthOpen ? '#00ffee' : '#0f172a';
        if (m.mouthOpen) {
            ctx.shadowColor = '#00ffee';
            ctx.shadowBlur = 14;
        }
        ctx.fillStyle = mouthColor;
        ctx.beginPath();
        ctx.ellipse(mx + mw / 2, mouthY, mw * 0.26, mouthH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 耳（横の突起）
        ctx.fillStyle = isFlash ? '#ffffff' : '#475569';
        ctx.fillRect(mx - 3, my + mh * 0.12, 5, mh * 0.22);
        ctx.fillRect(mx + mw - 2, my + mh * 0.12, 5, mh * 0.22);

        // HPドット表示
        for (let i = 0; i < m.hp; i++) {
            ctx.fillStyle = '#00ffee';
            ctx.fillRect(mx + 8 + i * 12, my + mh + 3, 8, 3);
        }

        ctx.restore();
        ctx.restore();
    }
}

// ==========================================
// Stage3 クラス（ステージ全体統括）
// ==========================================

class Stage3 {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;

        this.state = 'STAGE';
        this.stageTime = 0;

        this.terrain = new MoaiTerrain(canvasWidth, canvasHeight);
        this.boss = null;

        this.flyingEnemyTimer = 0;
        this.flyingEnemyInterval = 1000;

        this.active = true;
        this.stageClearTimer = 0;
        this.preBossStarted = false;
        this.preBossTimer = 0;
    }

    start() {
        this.state = 'STAGE';
        this.stageTime = 0;
        this.active = true;
        this.stageClearTimer = 0;
        this.preBossStarted = false;
        this.preBossTimer = 0;
        this.boss = null;
        this.terrain.start();
    }

    update(dt) {
        if (!this.active) return;

        if (this.state === 'STAGE') {
            this.stageTime += dt;

            // 1. 背景・星空・地形の更新（開幕から常時稼働！）
            this.terrain.update();

            // 2. 15秒（15000ms）経過でモアイ洞窟（岩壁＆モアイ）出現！
            if (this.stageTime >= 15000 && !this.terrain.wallActive) {
                this.terrain.startWalls();
            }

            // 3. 飛行敵編隊のスポーン
            this.updateFlyingEnemies(dt);

            // 4. 65秒経過でモアイ生成停止（洞窟を抜ける）
            if (this.stageTime >= 65000 && this.terrain.generating) {
                this.terrain.stopGenerating();
            }

            // 5. 73秒経過で静寂のボス前フェーズへ突入！
            if (this.stageTime >= 73000) {
                this.state = 'PRE_BOSS';
                this.preBossTimer = 0;
            }

        } else if (this.state === 'PRE_BOSS') {
            if (!this.preBossStarted) {
                this.preBossStarted = true;
                this.preBossTimer = 0;
                this.terrain.wallActive = false; // 壁を消去して宇宙空間へ
                if (typeof Sound !== 'undefined' && typeof Sound.playBossBgm === 'function') {
                    Sound.playBossBgm();
                }
            }

            this.preBossTimer += dt;
            this.terrain.update(); // 星空は流れる

            // 約3.5秒の緊迫した静寂のあと、ビッグコア登場！
            if (this.preBossTimer >= 3500) {
                this.state = 'BOSS';
                this._spawnBoss();
            }

        } else if (this.state === 'BOSS') {
            this.terrain.update(); // 背景星空

            if (this.boss) {
                this.boss.update();
                if (!this.boss.active) {
                    this.state = 'ALL_CLEAR';
                    this.stageClearTimer = 0;
                    if (typeof Sound !== 'undefined' && typeof Sound.playStageBgm === 'function') {
                        Sound.playStageBgm();
                    }
                }
            }

        } else if (this.state === 'ALL_CLEAR') {
            this.terrain.update();
            this.stageClearTimer += dt;
            // 自機が栄光のハイパードライブ加速で右へ離脱！
            if (typeof player !== 'undefined' && player) {
                player.x += 4.5;
            }
        }
    }

    _spawnBoss() {
        const bossClass = (typeof BigCoreBoss !== 'undefined') ? BigCoreBoss :
                          (typeof window.BigCoreBoss !== 'undefined') ? window.BigCoreBoss :
                          (typeof Boss !== 'undefined') ? Boss : null;
        if (bossClass) {
            this.boss = new bossClass(this.width, this.height / 2);
        }
    }

    updateFlyingEnemies(dt) {
        this.flyingEnemyTimer += dt;
        if (this.flyingEnemyTimer < this.flyingEnemyInterval) return;

        this.flyingEnemyTimer = 0;
        this.flyingEnemyInterval = 900 + Math.random() * 500;

        const roll = Math.random();
        const safeY = this.terrain.wallActive
            ? Math.random() * (this.terrain.bottomY - this.terrain.topY - 120) + this.terrain.topY + 60
            : Math.random() * (this.height - 240) + 120;

        if (roll < 0.42) {
            if (typeof Formation !== 'undefined') {
                new Formation(safeY, 4);
            }
        } else if (roll < 0.72) {
            if (typeof GarunFormation !== 'undefined') {
                const isUp = Math.random() < 0.5;
                new GarunFormation(safeY, isUp, 4);
            }
        } else if (roll < 0.90) {
            if (typeof ZabSquad !== 'undefined') {
                const sides = ['TOP', 'BOTTOM', 'BACK', 'FRONT'];
                const side = sides[Math.floor(Math.random() * sides.length)];
                new ZabSquad(side, safeY, 3);
            }
        } else {
            if (typeof RugraEnemy !== 'undefined' && typeof enemies !== 'undefined') {
                enemies.push(new RugraEnemy(this.width, safeY));
            }
        }
    }

    checkCollision(rect) {
        if (this.terrain && this.terrain.wallActive) {
            return this.terrain.checkCollision(rect);
        }
        return false;
    }

    handleBulletCollisions(playerBullets) {
        if (this.terrain && this.terrain.wallActive) {
            this.terrain.handleBulletCollisions(playerBullets);
        }
    }

    draw(ctx) {
        // 背景・星空・モアイ洞窟の描画
        if (this.terrain) {
            this.terrain.draw(ctx);
        }

        // 開幕演出テキスト（開始4秒間）
        if (this.state === 'STAGE' && this.stageTime < 4000) {
            const alpha = Math.min(1, Math.sin((this.stageTime / 4000) * Math.PI));
            ctx.save();
            ctx.textAlign = 'center';

            ctx.font = 'bold 36px "Courier New", monospace';
            ctx.fillStyle = `rgba(0, 255, 238, ${alpha})`;
            ctx.shadowColor = '#0088ff';
            ctx.shadowBlur = 16;
            ctx.fillText('STAGE 3 : MOAI PLANET', this.width / 2, this.height / 2 - 40);

            ctx.font = 'bold 18px "Courier New", monospace';
            ctx.fillStyle = `rgba(255, 220, 100, ${alpha})`;
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur = 8;
            ctx.fillText('BEWARE OF ANCIENT ION RING CANNONS!', this.width / 2, this.height / 2 + 10);

            ctx.restore();
        }

        // 警告演出（洞窟突入前の13〜15秒）
        if (this.state === 'STAGE' && this.stageTime >= 13000 && this.stageTime < 15000) {
            const pulse = (Math.floor(Date.now() / 200) % 2 === 0);
            if (pulse) {
                ctx.save();
                ctx.textAlign = 'center';
                ctx.font = 'bold 22px "Courier New", monospace';
                ctx.fillStyle = '#ffaa00';
                ctx.shadowColor = '#ff6600';
                ctx.shadowBlur = 12;
                ctx.fillText('WARNING: ANCIENT MOAI TEMPLE APPROACHING!', this.width / 2, 50);
                ctx.restore();
            }
        }

        // ボス前警告演出
        if (this.state === 'PRE_BOSS') {
            const pulse = (Math.floor(Date.now() / 180) % 2 === 0);
            if (pulse) {
                ctx.save();
                ctx.textAlign = 'center';
                ctx.font = 'bold 28px "Courier New", monospace';
                ctx.fillStyle = '#ff3300';
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 16;
                ctx.fillText('WARNING : BIG CORE APPROACHING!', this.width / 2, this.height / 2 - 30);
                ctx.font = 'bold 18px "Courier New", monospace';
                ctx.fillStyle = '#ffcc00';
                ctx.fillText('DESTROY 4 SHIELD CORES TO EXPOSE REACTOR!', this.width / 2, this.height / 2 + 15);
                ctx.restore();
            }
        }

        // ボスの描画
        if (this.state === 'BOSS' && this.boss) {
            this.boss.draw(ctx);
        }

        // 栄光の全クリア（ALL MISSIONS COMPLETED!）
        if (this.state === 'ALL_CLEAR') {
            ctx.save();
            ctx.textAlign = 'center';

            ctx.font = 'bold 44px "Courier New", monospace';
            ctx.fillStyle = '#ffea00';
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 20;
            ctx.fillText('STAGE 3 ALL CLEAR!', this.width / 2, this.height / 2 - 80);

            ctx.font = 'bold 26px "Courier New", monospace';
            ctx.fillStyle = '#00ffee';
            ctx.shadowColor = '#0088ff';
            ctx.shadowBlur = 12;
            ctx.fillText('CONGRATULATIONS!', this.width / 2, this.height / 2 - 20);

            ctx.font = 'bold 20px "Courier New", monospace';
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 0;
            ctx.fillText('ALL MISSIONS COMPLETED!', this.width / 2, this.height / 2 + 30);

            ctx.font = 'bold 18px "Courier New", monospace';
            ctx.fillStyle = '#ffcc00';
            ctx.fillText('SPECIAL MISSION BONUS : 100,000 PTS', this.width / 2, this.height / 2 + 70);

            ctx.restore();
        }
    }
}

// グローバル公開
window.MoaiTerrain = MoaiTerrain;
window.Stage3 = Stage3;
let stage3 = null;
window.stage3 = stage3;
