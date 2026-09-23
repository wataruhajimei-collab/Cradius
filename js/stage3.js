// ==========================================
// CRADIUS STAGE 3: MOAI PLANET（巨石惑星・モアイ面）
// 原作グラディウス完全再現：起伏ある古代岩山洞窟、
// 前向き＆背後を急襲する後ろ向きモアイ、
// 口から連射される「撃ち落とし可能なイオンリング弾幕」、
// 地形を這うダッカー、空中奇襲のザブ、
// そして前面4シールド完全破壊型「ビッグコア」との死闘！
// ==========================================

class MoaiEnemy {
    constructor(x, y, side = 'bottom', facing = 'left') {
        this.x = x;
        this.y = y; // 接地面Y座標
        this.side = side; // 'bottom' | 'top' | 'island'
        this.facing = facing; // 'left' (前向き) | 'right' (後ろ向き：背後急襲)
        
        this.width = 54;
        this.height = 76;
        this.hp = 8;
        this.maxHp = 8;
        this.active = true;
        this.flashTimer = 0;

        // 口の開閉＆イオンリング連射制御
        this.mouthOpenProgress = 0; // 0 (閉じ) 〜 1 (全開)
        this.isFiring = false;
        this.shootCooldown = 40 + Math.floor(Math.random() * 60);
        this.burstLeft = 0;      // 1回の攻撃での残り連射数 (3〜4発)
        this.burstInterval = 0;  // 連射間のフレーム間隔
        this.chargeGlow = 0;     // 口内のエネルギーチャージ発光
    }

    update(scrollSpeed, player) {
        this.x -= scrollSpeed;
        if (this.flashTimer > 0) this.flashTimer--;

        // 画面外（左端より大きく通過）で消滅
        if (this.x < -120) {
            this.active = false;
            return;
        }

        // 自機との位置関係に応じた射撃AI
        const isFacingPlayer = (this.facing === 'left' && player && player.x < this.x + 80) ||
                               (this.facing === 'right' && player && player.x > this.x - 60);

        if (!this.isFiring) {
            this.shootCooldown--;
            // 自機が射程内にいてクールダウン完了で口を開け始める
            if (this.shootCooldown <= 0 && isFacingPlayer && this.x < 850 && this.x > -40) {
                this.isFiring = true;
                this.burstLeft = (Math.random() < 0.4) ? 4 : 3; // 3〜4連射！
                this.burstInterval = 12;
            }
        }

        // 口の開閉アニメーション
        if (this.isFiring) {
            if (this.mouthOpenProgress < 1.0) {
                this.mouthOpenProgress = Math.min(1.0, this.mouthOpenProgress + 0.12);
                this.chargeGlow = this.mouthOpenProgress;
            } else {
                // 口全開：イオンリング弾の連射処理
                this.burstInterval--;
                if (this.burstInterval <= 0) {
                    this.burstInterval = 13; // 次の弾までの間隔
                    this._fireIonRing(player);
                    this.burstLeft--;

                    if (this.burstLeft <= 0) {
                        this.isFiring = false;
                        this.shootCooldown = 75 + Math.floor(Math.random() * 65);
                    }
                }
            }
        } else {
            // 口を閉じる
            if (this.mouthOpenProgress > 0) {
                this.mouthOpenProgress = Math.max(0, this.mouthOpenProgress - 0.08);
                this.chargeGlow = this.mouthOpenProgress;
            }
        }
    }

    _fireIonRing(player) {
        if (typeof enemyBullets === 'undefined') return;

        // 口の中心座標を算出（開いた口の中央から飛び出す）
        const isCeil = (this.side === 'top');
        const jawOffset = this.mouthOpenProgress * 6;
        const mouthX = (this.facing === 'left') ? this.x + 8 : this.x + this.width - 8;
        const mouthY = isCeil ? this.y + 52 + jawOffset : this.y - (this.height - 52 - jawOffset);

        // 自機への狙い撃ち＋スプレッド
        let targetX = player ? player.x + player.width / 2 : mouthX - 300;
        let targetY = player ? player.y + player.height / 2 : mouthY;

        let dx = targetX - mouthX;
        let dy = targetY - mouthY;

        // 向きの制約（前向きなら左方向へ、後ろ向きなら右方向へ）
        if (this.facing === 'left' && dx > -20) dx = -120;
        if (this.facing === 'right' && dx < 20) dx = 120;

        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 4.3; // 鋭く迫るイオンリング弾
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;

        const ringColor = (Math.random() < 0.25) ? '#00e5ff' : '#38bdf8';

        if (typeof RingBullet !== 'undefined') {
            enemyBullets.push(new RingBullet(mouthX, mouthY, vx, vy, ringColor));
        } else if (typeof Bullet !== 'undefined') {
            enemyBullets.push(new Bullet(mouthX, mouthY, vx, vy, ringColor, true));
        }

        if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') {
            Sound.playBossHit();
        }
    }

    hit(damage = 1) {
        this.hp -= damage;
        this.flashTimer = 7;

        if (this.hp <= 0) {
            this.active = false;
            const cx = this.x + this.width / 2;
            const cy = (this.side === 'top') ? this.y + this.height / 2 : this.y - this.height / 2;

            // 豪快な岩石破片エフェクト（古代巨石が砕け散る！）
            if (typeof particles !== 'undefined') {
                for (let i = 0; i < 16; i++) {
                    const color = (Math.random() < 0.5) ? '#64748b' : ((Math.random() < 0.5) ? '#94a3b8' : '#334155');
                    particles.push(new Particle(
                        cx + (Math.random() - 0.5) * 32,
                        cy + (Math.random() - 0.5) * 32,
                        color
                    ));
                }
            }

            if (typeof createExplosion === 'function') {
                createExplosion(cx, cy, '#00ffee');
                createExplosion(cx, cy, '#ffaa00');
                createExplosion(cx, cy, '#ffffff');
            }
            if (typeof Sound !== 'undefined' && typeof Sound.playExplosion === 'function') {
                Sound.playExplosion();
            }

            // 35%の確率でパワーアップカプセルをドロップ！
            if (Math.random() < 0.35 && typeof capsules !== 'undefined' && typeof PowerUpCapsule !== 'undefined') {
                capsules.push(new PowerUpCapsule(cx, cy));
            }
            return true;
        }
        return false;
    }

    getBounds() {
        const by = (this.side === 'top') ? this.y : this.y - this.height;
        return {
            x: this.x,
            y: by,
            width: this.width,
            height: this.height
        };
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();

        const isCeil = (this.side === 'top');
        const isRight = (this.facing === 'right');
        const isFlash = (this.flashTimer > 0);

        const bx = this.x;
        const by = isCeil ? this.y : this.y - this.height;
        const w = this.width;
        const h = this.height;

        ctx.translate(bx + w / 2, by + h / 2);
        // 上下反転（天井モアイ）＆ 左右反転（後ろ向きモアイ）
        ctx.scale(isRight ? -1 : 1, isCeil ? -1 : 1);
        ctx.translate(-(bx + w / 2), -(by + h / 2));

        // 巨石グラデーション（重厚な石の陰影）
        const stoneGrad = ctx.createLinearGradient(bx, by, bx + w, by + h);
        if (isFlash) {
            stoneGrad.addColorStop(0.0, '#ffffff');
            stoneGrad.addColorStop(0.5, '#ff9999');
            stoneGrad.addColorStop(1.0, '#ffffff');
        } else {
            stoneGrad.addColorStop(0.0, '#94a3b8'); // ハイライト石肌
            stoneGrad.addColorStop(0.35, '#64748b'); // スレートグレー
            stoneGrad.addColorStop(0.75, '#475569');
            stoneGrad.addColorStop(1.0, '#1e293b'); // 深い玄武岩影
        }
        ctx.fillStyle = stoneGrad;

        // 1. モアイ頭部・後頭部ベースポリゴン
        const jawDrop = this.mouthOpenProgress * 11;
        ctx.beginPath();
        ctx.moveTo(bx + w - 4, by + h);       // 首元後ろ
        ctx.lineTo(bx + w - 4, by + 18);      // 後頭部
        ctx.lineTo(bx + w - 14, by + 2);      // 頭頂部後ろ
        ctx.lineTo(bx + 18, by + 2);          // 頭頂部前
        ctx.lineTo(bx + 6, by + 16);          // 眉の上
        ctx.lineTo(bx + 2, by + 24);          // 眉毛先端
        ctx.lineTo(bx + 12, by + 26);         // 眉下のくぼみ（目の位置）
        ctx.lineTo(bx + 2, by + 46);          // 鼻先（長く鋭い）
        ctx.lineTo(bx + 12, by + 48);         // 鼻の下端
        ctx.lineTo(bx + 14, by + 52);         // 上唇
        ctx.lineTo(bx + 8, by + 55 + jawDrop); // 下唇
        ctx.lineTo(bx + 8, by + 68 + jawDrop); // 顎先端
        ctx.lineTo(bx + 20, by + h);           // 首元前
        ctx.closePath();
        ctx.fill();

        // 輪郭線
        ctx.strokeStyle = isFlash ? '#ffffff' : '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 2. 彫りの深い目（陰影）
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(bx + 12, by + 25);
        ctx.lineTo(bx + 28, by + 25);
        ctx.lineTo(bx + 26, by + 32);
        ctx.lineTo(bx + 13, by + 32);
        ctx.closePath();
        ctx.fill();

        // 3. モアイの耳（側頭部の長い矩形石板）
        ctx.fillStyle = isFlash ? '#ffffff' : '#475569';
        ctx.fillRect(bx + w - 14, by + 22, 6, 26);
        ctx.strokeStyle = isFlash ? '#ffffff' : '#1e293b';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(bx + w - 14, by + 22, 6, 26);

        // 4. 口の空洞＆イオンエネルギーチャージ発光（口の奥で凝縮！）
        if (this.mouthOpenProgress > 0.05) {
            const mouthH = Math.max(2, jawDrop);
            // 口内の暗黒空洞
            ctx.fillStyle = '#030712';
            ctx.beginPath();
            ctx.moveTo(bx + 14, by + 52);
            ctx.lineTo(bx + 28, by + 52);
            ctx.lineTo(bx + 28, by + 54 + mouthH);
            ctx.lineTo(bx + 8, by + 54 + mouthH);
            ctx.closePath();
            ctx.fill();

            // 口内の凝縮されたイオンリングエネルギー球
            const glowR = 2 + this.chargeGlow * 5;
            ctx.save();
            ctx.shadowColor = '#00ffee';
            ctx.shadowBlur = 10 * this.chargeGlow;
            ctx.fillStyle = `rgba(0, 255, 238, ${0.5 + this.chargeGlow * 0.5})`;
            ctx.beginPath();
            ctx.arc(bx + 16, by + 52 + mouthH * 0.5, glowR, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 5. 石肌の立体ハイライトライン・チゼル彫刻痕
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(bx + 18, by + 4);
        ctx.lineTo(bx + 8, by + 16);
        ctx.lineTo(bx + 4, by + 24);
        ctx.moveTo(bx + 14, by + 28);
        ctx.lineTo(bx + 4, by + 46);
        // 顎のハイライト
        ctx.moveTo(bx + 10, by + 66 + jawDrop);
        ctx.lineTo(bx + 20, by + h - 2);
        ctx.stroke();

        // 6. ダメージ残量ドット
        if (this.hp < this.maxHp) {
            for (let i = 0; i < this.maxHp; i++) {
                ctx.fillStyle = (i < this.hp) ? '#00ffee' : 'rgba(255,255,255,0.15)';
                ctx.fillRect(bx + 6 + i * 5, by + h - 4, 3, 2);
            }
        }

        ctx.restore();
    }
}

// ==========================================
// 浮遊石島クラス（中空に浮かぶ古代メサ・岩山）
// ==========================================
class FloatingRockIsland {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.active = true;
    }

    update(scrollSpeed) {
        this.x -= scrollSpeed;
        if (this.x + this.width < -100) {
            this.active = false;
        }
    }

    checkCollision(rect) {
        if (!this.active) return false;
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

        const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        grad.addColorStop(0.0, '#64748b');
        grad.addColorStop(0.3, '#475569');
        grad.addColorStop(0.8, '#334155');
        grad.addColorStop(1.0, '#1e293b');
        ctx.fillStyle = grad;

        // 台形岩石形状
        ctx.beginPath();
        ctx.moveTo(this.x + 15, this.y);
        ctx.lineTo(this.x + this.width - 15, this.y);
        ctx.lineTo(this.x + this.width, this.y + this.height * 0.4);
        ctx.lineTo(this.x + this.width - 25, this.y + this.height);
        ctx.lineTo(this.x + 25, this.y + this.height);
        ctx.lineTo(this.x, this.y + this.height * 0.4);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 岩のクレバス・ハイライト
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x + 20, this.y + 2);
        ctx.lineTo(this.x + this.width - 20, this.y + 2);
        ctx.stroke();

        ctx.restore();
    }
}

// ==========================================
// MoaiTerrain クラス（起伏ある古代岩山地形とモアイ統括）
// ==========================================
class MoaiTerrain {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.scrollSpeed = 1.8;

        this.baseTopY = 70;
        this.baseBottomY = canvasHeight - 70;

        this.active = false;
        this.wallActive = false;
        this.wallTransition = 0; // 0 -> 1

        // 地形輪郭セグメント
        this.terrainStep = 30; // 30px刻みで滑らかな起伏
        this.topHeights = [];
        this.bottomHeights = [];

        // 敵モアイ群
        this.moais = [];
        // 中空浮島
        this.floatingIslands = [];

        // 星空（背景用）
        this.stars = [];
        for (let i = 0; i < 90; i++) {
            this.stars.push({
                x: Math.random() * canvasWidth,
                y: Math.random() * canvasHeight,
                speed: Math.random() * 2.2 + 0.6,
                size: Math.random() * 2.0 + 0.6,
                brightness: Math.random() * 0.7 + 0.3
            });
        }

        // 神秘的な星雲
        this.nebulae = [
            { x: 180, y: 180, rx: 140, ry: 75, color: 'rgba(70, 30, 140, 0.18)' },
            { x: 560, y: 340, rx: 160, ry: 85, color: 'rgba(25, 75, 160, 0.16)' },
            { x: 340, y: 460, rx: 120, ry: 60, color: 'rgba(95, 25, 120, 0.14)' }
        ];

        this.distance = 0;
        this.nextSpawnX = canvasWidth + 20;
    }

    start() {
        this.active = true;
        this.wallActive = false;
        this.wallTransition = 0;
        this.moais = [];
        this.floatingIslands = [];
        this.distance = 0;

        // 地形ノード初期化（開幕から起伏ある古代岩山を生成！）
        const count = Math.ceil(this.width / this.terrainStep) + 12;
        this.topHeights = [];
        this.bottomHeights = [];
        for (let i = 0; i < count; i++) {
            const d = i * this.terrainStep;
            const hillTop = Math.sin(d * 0.007) * 35 + Math.sin(d * 0.018) * 20;
            const hillBot = Math.cos(d * 0.006) * 45 + Math.sin(d * 0.015) * 25;
            this.topHeights.push(Math.max(45, Math.min(170, this.baseTopY + hillTop)));
            this.bottomHeights.push(Math.min(this.height - 45, Math.max(this.height - 185, this.baseBottomY - hillBot)));
        }
    }

    startWalls() {
        this.wallActive = true;
        this.wallTransition = 0;
    }

    getTopY(x) {
        if (!this.wallActive) return 0;
        const clampedTransition = Math.max(0, Math.min(1, this.wallTransition));
        const idx = Math.floor(x / this.terrainStep);
        if (idx < 0) return (this.topHeights[0] || this.baseTopY) * clampedTransition;
        if (idx >= this.topHeights.length - 1) return (this.topHeights[this.topHeights.length - 1] || this.baseTopY) * clampedTransition;

        const t = (x % this.terrainStep) / this.terrainStep;
        const y0 = this.topHeights[idx];
        const y1 = this.topHeights[idx + 1];
        const rawY = y0 + (y1 - y0) * t;
        return rawY * clampedTransition;
    }

    getBottomY(x) {
        if (!this.wallActive) return this.height;
        const clampedTransition = Math.max(0, Math.min(1, this.wallTransition));
        const idx = Math.floor(x / this.terrainStep);
        let rawY = this.baseBottomY;
        if (idx < 0) {
            rawY = this.bottomHeights[0] || this.baseBottomY;
        } else if (idx >= this.bottomHeights.length - 1) {
            rawY = this.bottomHeights[this.bottomHeights.length - 1] || this.baseBottomY;
        } else {
            const t = (x % this.terrainStep) / this.terrainStep;
            const y0 = this.bottomHeights[idx];
            const y1 = this.bottomHeights[idx + 1];
            rawY = y0 + (y1 - y0) * t;
        }
        return this.height - (this.height - rawY) * clampedTransition;
    }

    checkCollision(rect) {
        if (!this.active || !this.wallActive || this.wallTransition < 0.3) return false;

        const cx = rect.x + rect.width / 2;
        const topY = this.getTopY(cx);
        if (rect.y < topY) return true;

        const bottomY = this.getBottomY(cx);
        if (rect.y + rect.height > bottomY) return true;

        // 浮島との衝突
        for (let i = 0; i < this.floatingIslands.length; i++) {
            if (this.floatingIslands[i].checkCollision(rect)) return true;
        }

        return false;
    }

    update(dt = 16.6) {
        if (!this.active) return;
        this.distance += this.scrollSpeed;

        // 1. 星空と星雲
        this.stars.forEach(s => {
            s.x -= s.speed;
            if (s.x < 0) {
                s.x = this.width;
                s.y = Math.random() * this.height;
            }
        });
        this.nebulae.forEach(n => {
            n.x -= 0.35;
            if (n.x + n.rx < 0) n.x = this.width + n.rx;
        });

        if (!this.wallActive) return;

        // 岩壁出現イージング
        if (this.wallTransition < 1.0) {
            this.wallTransition = Math.min(1.0, this.wallTransition + 0.015);
        }

        // 2. 地形スクロール＆新規地形波形生成
        const shiftX = this.scrollSpeed;
        const nodesToShift = Math.floor(shiftX / this.terrainStep);
        if (nodesToShift > 0) {
            for (let i = 0; i < nodesToShift; i++) {
                this.topHeights.shift();
                this.bottomHeights.shift();

                // 原作グラディウス特有の波打つ岩山地形（山頂・谷・平坦地）
                const d = this.distance + this.width;
                const hillTop = Math.sin(d * 0.007) * 35 + Math.sin(d * 0.018) * 20;
                const hillBot = Math.cos(d * 0.006) * 45 + Math.sin(d * 0.015) * 25;

                this.topHeights.push(Math.max(45, Math.min(170, this.baseTopY + hillTop)));
                this.bottomHeights.push(Math.min(this.height - 45, Math.max(this.height - 185, this.baseBottomY - hillBot)));
            }
        }

        // 3. モアイ像の更新
        const curPlayer = (typeof player !== 'undefined') ? player : null;
        this.moais.forEach(m => m.update(this.scrollSpeed, curPlayer));
        this.moais = this.moais.filter(m => m.active);

        // 4. 浮島の更新
        this.floatingIslands.forEach(island => island.update(this.scrollSpeed));
        this.floatingIslands = this.floatingIslands.filter(i => i.active);
    }

    spawnMoai(side, facing, xOffset = 0) {
        const x = this.width + 30 + xOffset;
        let y = (side === 'top') ? this.getTopY(x) : this.getBottomY(x);
        this.moais.push(new MoaiEnemy(x, y, side, facing));
    }

    spawnFloatingIsland(xOffset = 0, y = 280, w = 160, h = 55, spawnMoais = true) {
        const x = this.width + 30 + xOffset;
        const island = new FloatingRockIsland(x, y, w, h);
        this.floatingIslands.push(island);

        if (spawnMoais) {
            // 島の上に前向きモアイ
            this.moais.push(new MoaiEnemy(x + 25, y, 'island', 'left'));
            // 島の下に後ろ向き（背後急襲）天井モアイ
            this.moais.push(new MoaiEnemy(x + w - 75, y + h, 'top', 'right'));
        }
    }

    handleBulletCollisions(playerBullets) {
        if (!this.wallActive) return;

        // 1. プレイヤー弾 vs モアイ像
        playerBullets.forEach(bullet => {
            if (!bullet.active) return;

            for (let i = this.moais.length - 1; i >= 0; i--) {
                const m = this.moais[i];
                if (!m.active) continue;

                const bounds = m.getBounds();
                if (checkCollision(bullet, bounds)) {
                    if (typeof Laser !== 'undefined' && bullet instanceof Laser) {
                        m.hit(2);
                    } else {
                        bullet.active = false;
                        m.hit(1);
                    }
                    if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') {
                        Sound.playBossHit();
                    }
                    break;
                }
            }
        });

        // 2. ★★★ 原作再現：自機弾 vs イオンリング弾（撃ち落とし可能！）★★★
        if (typeof enemyBullets !== 'undefined') {
            playerBullets.forEach(pBullet => {
                if (!pBullet.active) return;

                enemyBullets.forEach(eBullet => {
                    if (!eBullet.active) return;
                    if (typeof RingBullet !== 'undefined' && eBullet instanceof RingBullet) {
                        if (checkCollision(pBullet, eBullet)) {
                            eBullet.active = false;
                            if (typeof Laser === 'undefined' || !(pBullet instanceof Laser)) {
                                pBullet.active = false;
                            }
                            if (typeof createExplosion === 'function') {
                                createExplosion(eBullet.x + eBullet.width / 2, eBullet.y + eBullet.height / 2, '#38bdf8');
                            }
                            if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') {
                                Sound.playBossHit();
                            }
                        }
                    }
                });
            });
        }
    }

    draw(ctx) {
        ctx.save();

        // 1. 深淵の宇宙背景グラデーション
        const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
        bgGrad.addColorStop(0.0, '#030718');
        bgGrad.addColorStop(0.5, '#0a1032');
        bgGrad.addColorStop(1.0, '#150624');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        // 2. 星雲
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

        // 3. 星々
        this.stars.forEach(s => {
            ctx.globalAlpha = s.brightness;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(s.x, s.y, s.size, s.size);
        });
        ctx.globalAlpha = 1.0;

        // 4. 起伏ある古代岩山洞窟の描画
        if (this.wallActive && this.wallTransition > 0.02) {
            this._drawCeiling(ctx);
            this._drawFloor(ctx);

            // 中空浮島
            this.floatingIslands.forEach(island => island.draw(ctx));

            // モアイ像群
            this.moais.forEach(m => m.draw(ctx));
        }

        ctx.restore();
    }

    _drawCeiling(ctx) {
        ctx.save();
        const clampedTransition = Math.max(0, Math.min(1, this.wallTransition));

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.width, 0);

        for (let x = this.width; x >= 0; x -= 20) {
            const y = this.getTopY(x);
            ctx.lineTo(x, y);
        }
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, 0, 0, 180 * clampedTransition);
        grad.addColorStop(0.0, '#1e293b');
        grad.addColorStop(0.5, '#334155');
        grad.addColorStop(0.9, '#475569');
        grad.addColorStop(1.0, '#1a2430');
        ctx.fillStyle = grad;
        ctx.fill();

        // エッジシャープライン
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let x = 0; x <= this.width; x += 20) {
            const y = this.getTopY(x);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // 天井岩肌の岩脈・クレバスライン
        ctx.strokeStyle = 'rgba(100, 180, 240, 0.22)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 30; x <= this.width; x += 60) {
            const y = this.getTopY(x);
            ctx.moveTo(x, 0);
            ctx.lineTo(x - 14, y * 0.45);
            ctx.lineTo(x + 6, y - 4);
        }
        ctx.stroke();

        ctx.restore();
    }

    _drawFloor(ctx) {
        ctx.save();
        const clampedTransition = Math.max(0, Math.min(1, this.wallTransition));

        ctx.beginPath();
        ctx.moveTo(0, this.height);
        ctx.lineTo(this.width, this.height);

        for (let x = this.width; x >= 0; x -= 20) {
            const y = this.getBottomY(x);
            ctx.lineTo(x, y);
        }
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, this.height - 180 * clampedTransition, 0, this.height);
        grad.addColorStop(0.0, '#1a2430');
        grad.addColorStop(0.2, '#475569');
        grad.addColorStop(0.65, '#334155');
        grad.addColorStop(1.0, '#1e293b');
        ctx.fillStyle = grad;
        ctx.fill();

        // エッジシャープライン
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        for (let x = 0; x <= this.width; x += 20) {
            const y = this.getBottomY(x);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // 地面の岩脈・クレバスライン
        ctx.strokeStyle = 'rgba(100, 180, 240, 0.22)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 40; x <= this.width; x += 60) {
            const y = this.getBottomY(x);
            ctx.moveTo(x, this.height);
            ctx.lineTo(x + 14, (this.height + y) * 0.55);
            ctx.lineTo(x - 6, y + 4);
        }
        ctx.stroke();

        ctx.restore();
    }
}

// ==========================================
// Stage3 クラス（ステージ全体進行統括）
// ==========================================
class Stage3 {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;

        this.state = 'STAGE';
        this.stageTime = 0;

        this.terrain = new MoaiTerrain(canvasWidth, canvasHeight);
        this.boss = null;

        this.active = true;
        this.stageClearTimer = 0;
        this.preBossStarted = false;
        this.preBossTimer = 0;

        // 飛ぶ敵・空中編隊スポーン
        this.flyingTimer = 0;
        this.moaiWaveTimer = 0;
        this.duckerTimer = 0;
    }

    start() {
        this.state = 'STAGE';
        this.stageTime = 0;
        this.active = true;
        this.stageClearTimer = 0;
        this.preBossStarted = false;
        this.preBossTimer = 0;
        this.boss = null;
        this.flyingTimer = 0;
        this.moaiWaveTimer = 0;
        this.duckerTimer = 0;
        this.terrain.start();
    }

    update(dt) {
        if (!this.active) return;

        if (this.state === 'STAGE') {
            this.stageTime += dt;
            this.terrain.update(dt);

            // 1. 開幕13秒経過でモアイ洞窟（岩山地形）出現！
            if (this.stageTime >= 13000 && !this.terrain.wallActive) {
                this.terrain.startWalls();
            }

            // 2. 空中敵編隊（カプセル補給と牽制）
            this.updateFlyingEnemies(dt);

            // 3. 原作グラディウス式 モアイ＆地形ウェーブ生成（13秒〜78秒）
            if (this.stageTime >= 14000 && this.stageTime < 78000) {
                this.updateMoaiWaves(dt);
            }

            // 4. 地形を這うダッカー歩行砲台の生成
            if (this.stageTime >= 24000 && this.stageTime < 76000) {
                this.updateDuckers(dt);
            }

            // 5. 80秒経過で洞窟を抜け、静寂のボス前（PRE_BOSS）へ！
            if (this.stageTime >= 80000) {
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
            this.terrain.update(dt); // 星空は流れる

            // 約3.5秒の緊迫した警報ののちビッグコア出現！
            if (this.preBossTimer >= 3500) {
                this.state = 'BOSS';
                this._spawnBoss();
            }

        } else if (this.state === 'BOSS') {
            this.terrain.update(dt); // 星空

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
            this.terrain.update(dt);
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

    updateMoaiWaves(dt) {
        this.moaiWaveTimer += dt;

        // 難易度と進行度に応じた出現インターバル
        let interval = 2200;
        if (this.stageTime > 55000) interval = 1500; // クライマックスは高密度！

        if (this.moaiWaveTimer >= interval) {
            this.moaiWaveTimer = 0;

            const roll = Math.random();

            // フェーズ別の原作再現配置
            if (this.stageTime < 32000) {
                // 前半：前向きモアイ（天井・床）
                const side = (roll < 0.5) ? 'bottom' : 'top';
                this.terrain.spawnMoai(side, 'left');
            } else if (this.stageTime < 52000) {
                // 中盤：前向き＋背後急襲の後ろ向きモアイ！
                if (roll < 0.35) {
                    this.terrain.spawnMoai('bottom', 'left');
                    this.terrain.spawnMoai('top', 'right', 60); // ★背後急襲モアイ！
                } else if (roll < 0.70) {
                    this.terrain.spawnMoai('top', 'left');
                    this.terrain.spawnMoai('bottom', 'right', 50); // ★背後急襲モアイ！
                } else {
                    // 中空浮島とモアイのコンビネーション
                    this.terrain.spawnFloatingIsland(0, 260, 170, 50, true);
                }
            } else {
                // 後半（モアイラッシュ）：激しい弾幕を誇る密集地帯！
                if (roll < 0.40) {
                    // 天井・床ダブル前向きモアイ
                    this.terrain.spawnMoai('bottom', 'left');
                    this.terrain.spawnMoai('top', 'left', 30);
                } else if (roll < 0.75) {
                    // 浮島＋挟み撃ちモアイ
                    this.terrain.spawnFloatingIsland(0, 270, 160, 50, true);
                    this.terrain.spawnMoai('bottom', 'left', 180);
                } else {
                    // 背後急襲ダブルモアイ
                    this.terrain.spawnMoai('bottom', 'right');
                    this.terrain.spawnMoai('top', 'right', 40);
                }
            }
        }
    }

    updateDuckers(dt) {
        if (typeof enemies === 'undefined' || typeof DuckerEnemy === 'undefined') return;
        this.duckerTimer += dt;
        if (this.duckerTimer >= 4800) {
            this.duckerTimer = 0;
            const isCeil = Math.random() < 0.45;
            const spawnX = this.width + 20;
            const spawnY = isCeil ? this.terrain.getTopY(spawnX) : this.terrain.getBottomY(spawnX);
            const isRed = Math.random() < 0.5; // 50%でカプセル持ち
            enemies.push(new DuckerEnemy(spawnX, spawnY, isCeil, isRed));
        }
    }

    updateFlyingEnemies(dt) {
        this.flyingTimer += dt;
        // 飛ぶ敵をドンドン出現させてカプセル獲得と難易度を高める
        if (this.flyingTimer < 1100) return;
        this.flyingTimer = 0;

        const roll = Math.random();
        const safeY = this.terrain.wallActive
            ? Math.random() * (this.terrain.baseBottomY - this.terrain.baseTopY - 140) + this.terrain.baseTopY + 70
            : Math.random() * (this.height - 240) + 120;

        if (roll < 0.40) {
            // ペング編隊（全滅でカプセル！）
            if (typeof Formation !== 'undefined') {
                new Formation(safeY, 4);
            }
        } else if (roll < 0.70) {
            // ガルン編隊
            if (typeof GarunFormation !== 'undefined') {
                new GarunFormation(safeY, Math.random() < 0.5, 4);
            }
        } else if (roll < 0.90) {
            // ザブ奇襲隊（空間ワープ強襲！）
            if (typeof ZabSquad !== 'undefined') {
                const sides = ['FRONT', 'TOP', 'BOTTOM', 'BACK'];
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
        if (this.terrain) {
            this.terrain.draw(ctx);
        }

        // 開幕タイトル表示（0〜4秒）
        if (this.state === 'STAGE' && this.stageTime < 4200) {
            const alpha = Math.min(1, Math.sin((this.stageTime / 4200) * Math.PI));
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
            ctx.fillText('SHOOT DOWN INCOMING ION RINGS!', this.width / 2, this.height / 2 + 10);

            ctx.restore();
        }

        // 洞窟接近警告（11〜13秒）
        if (this.state === 'STAGE' && this.stageTime >= 11000 && this.stageTime < 13000) {
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
                ctx.fillText('DESTROY 4 SHIELD BARRIERS TO EXPOSE REACTOR!', this.width / 2, this.height / 2 + 15);
                ctx.restore();
            }
        }

        // ボスの描画
        if (this.state === 'BOSS' && this.boss) {
            this.boss.draw(ctx);
        }

        // 栄光の全クリア（STAGE 3 ALL CLEAR!）
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
window.MoaiEnemy = MoaiEnemy;
window.FloatingRockIsland = FloatingRockIsland;
window.MoaiTerrain = MoaiTerrain;
window.Stage3 = Stage3;
let stage3 = null;
window.stage3 = stage3;
