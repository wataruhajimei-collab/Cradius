// ==========================================
// CRADIUS STAGE 3: MOAI PLANET（巨石惑星・モアイ面）
// 原作グラディウス完全再現：起伏ある古代岩山洞窟、
// 前向き＆背後を急襲する後ろ向きモアイ、
// 口から連射される「撃ち落とし可能なイオンリング弾幕」、
// 地形を這うダッカー、空中奇襲のザブ、
// そして前面4シールド完全破壊型「ビッグコア」との死闘！
// ==========================================

class MoaiEnemy {
    constructor(x, y, side = 'bottom', facing = 'left', posture = 'standing') {
        this.x = x;
        this.y = y; // 接地面Y座標
        this.side = side;       // 'bottom' | 'top' | 'island'
        this.facing = facing;   // 'left' (前向き) | 'right' (後ろ向き：背後急襲)
        this.posture = posture; // 'standing' (立ち姿) | 'lying' (横たわり姿)

        if (this.posture === 'lying') {
            this.width = 138;
            this.height = 88;
        } else {
            this.width = 92;
            this.height = 134;
        }

        this.hp = 6;
        this.maxHp = 6;
        this.active = true;
        this.flashTimer = 0;
        this.laserHitCooldown = 0;

        // 口の開閉＆イオンリング連射制御
        this.mouthOpenProgress = 0; // 0 (閉じ) 〜 1 (全開)
        this.isFiring = false;
        this.shootCooldown = 35 + Math.floor(Math.random() * 55);
        this.burstLeft = 0;      // 1回の攻撃での残り連射数 (3〜4発)
        this.burstInterval = 0;  // 連射間のフレーム間隔
        this.chargeGlow = 0;     // 口内のエネルギーチャージ発光
    }

    update(scrollSpeed, player, terrain) {
        this.x -= scrollSpeed;
        if (this.flashTimer > 0) this.flashTimer--;
        if (this.laserHitCooldown > 0) this.laserHitCooldown--;

        // 地形のスクロールに合わせて岩盤の接地面Y座標を追従
        if (terrain && terrain.wallActive && (this.side === 'bottom' || this.side === 'top')) {
            const centerX = this.x + this.width / 2;
            if (this.side === 'top') {
                this.y = terrain.getTopY(centerX);
            } else {
                this.y = terrain.getBottomY(centerX);
            }
        }

        // 画面外（左端より大きく通過）で消滅
        if (this.x + this.width < -140) {
            this.active = false;
            return;
        }

        // 自機との位置関係に応じた射撃AI
        const isFacingPlayer = (this.facing === 'left' && player && player.x < this.x + 140) ||
                               (this.facing === 'right' && player && player.x > this.x - 100);

        if (!this.isFiring) {
            this.shootCooldown--;
            // 自機が射程内にいてクールダウン完了で口を開け始める
            if (this.shootCooldown <= 0 && isFacingPlayer && this.x < 840 && this.x > -60) {
                this.isFiring = true;
                this.burstLeft = (Math.random() < 0.4) ? 4 : 3; // 3〜4連射！
                this.burstInterval = 14;
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
                    this.burstInterval = 15; // 次の弾までの間隔
                    this._fireIonRing(player);
                    this.burstLeft--;

                    if (this.burstLeft <= 0) {
                        this.isFiring = false;
                        this.shootCooldown = 70 + Math.floor(Math.random() * 60);
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

    _getMouthCenter() {
        const mouthRect = this.getMouthBounds();
        return {
            x: mouthRect.x + mouthRect.width / 2,
            y: mouthRect.y + mouthRect.height / 2
        };
    }

    _fireIonRing(player) {
        if (typeof enemyBullets === 'undefined') return;

        const mouthPos = this._getMouthCenter();
        const mouthX = mouthPos.x;
        const mouthY = mouthPos.y;

        // 自機への狙い撃ち
        let targetX = player ? player.x + player.width / 2 : mouthX - 300;
        let targetY = player ? player.y + player.height / 2 : mouthY;

        let dx = targetX - mouthX;
        let dy = targetY - mouthY;

        // 向きの制約（前向きなら左方向へ、後ろ向きなら右方向へ）
        if (this.facing === 'left' && dx > -20) dx = -120;
        if (this.facing === 'right' && dx < 20) dx = 120;

        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const speed = 4.0; // 迫力ある大きなイオンリング弾
        const vx = (dx / dist) * speed;
        const vy = (dy / dist) * speed;

        const ringColor = (Math.random() < 0.3) ? '#00e5ff' : '#38bdf8';

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
            const bounds = this.getBounds();
            const cx = bounds.x + bounds.width / 2;
            const cy = bounds.y + bounds.height / 2;

            // 豪快な岩石破片エフェクト（古代巨石が砕け散る！）
            if (typeof particles !== 'undefined') {
                for (let i = 0; i < 22; i++) {
                    const color = (Math.random() < 0.5) ? '#8b7355' : ((Math.random() < 0.5) ? '#94a3b8' : '#475569');
                    particles.push(new Particle(
                        cx + (Math.random() - 0.5) * 50,
                        cy + (Math.random() - 0.5) * 50,
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

            // 40%の確率でパワーアップカプセルをドロップ！
            if (Math.random() < 0.40 && typeof capsules !== 'undefined' && typeof PowerUpCapsule !== 'undefined') {
                capsules.push(new PowerUpCapsule(cx, cy));
            }
            return true;
        }
        return false;
    }

    // モアイ全体の当たり判定（自機との衝突・口以外の弾弾き用）
    getBounds() {
        const isCeil = (this.side === 'top' || this.side === 'island_top');
        const by = isCeil ? this.y : this.y - this.height;
        return {
            x: this.x + 6,
            y: by + 4,
            width: this.width - 12,
            height: this.height - 8
        };
    }

    // ★弱点である「口」の当たり判定（口を撃たないと壊れない設定）
    getMouthBounds() {
        const isCeil = (this.side === 'top' || this.side === 'island_top');
        const isRight = (this.facing === 'right');
        const by = isCeil ? this.y : this.y - this.height;

        if (this.posture === 'lying') {
            // 横たわりモアイ：顔が上（天井時は下）を向き、顎・口が前方に位置する
            const mx = isRight ? (this.x + this.width - 62) : (this.x + 8);
            const my = isCeil ? (by + this.height - 52) : (by + 6);
            return {
                x: mx,
                y: my,
                width: 54,
                height: 46
            };
        } else {
            // 立ちモアイ：前方の口周辺エリア
            const mx = isRight ? (this.x + this.width - 52) : (this.x - 4);
            const my = isCeil ? (by + 16) : (by + this.height - 62);
            return {
                x: mx,
                y: my,
                width: 56,
                height: 46
            };
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();

        const isCeil = (this.side === 'top' || this.side === 'island_top');
        const isRight = (this.facing === 'right');
        const isFlash = (this.flashTimer > 0);

        const bx = this.x;
        const by = isCeil ? this.y : this.y - this.height;
        const w = this.width;
        const h = this.height;

        ctx.translate(bx + w / 2, by + h / 2);
        ctx.scale(isRight ? -1 : 1, isCeil ? -1 : 1);
        ctx.translate(-(bx + w / 2), -(by + h / 2));

        if (this.posture === 'lying') {
            this._drawLyingMoai(ctx, bx, by, w, h, isFlash);
        } else {
            this._drawStandingMoai(ctx, bx, by, w, h, isFlash);
        }

        ctx.restore();
    }

    // 1. 立ちモアイ（重厚な岩盤に深く埋め込まれた巨大モアイ像）
    _drawStandingMoai(ctx, bx, by, w, h, isFlash) {
        const jawDrop = this.mouthOpenProgress * 15;

        // --- A. 背面・足元を覆う重厚な埋没岩盤（モアイと一体化した古代岩塊） ---
        const rockGrad = ctx.createLinearGradient(bx + 20, by + 20, bx + w + 18, by + h + 18);
        rockGrad.addColorStop(0.0, '#64748b');
        rockGrad.addColorStop(0.45, '#334155');
        rockGrad.addColorStop(1.0, '#0f172a');
        ctx.fillStyle = rockGrad;

        ctx.beginPath();
        ctx.moveTo(bx - 12, by + h + 16);
        ctx.lineTo(bx + 4, by + h - 26);
        ctx.lineTo(bx + 22, by + h - 42);
        ctx.lineTo(bx + w - 26, by + 14);
        ctx.lineTo(bx + w + 8, by + 36);
        ctx.lineTo(bx + w + 18, by + h - 18);
        ctx.lineTo(bx + w + 24, by + h + 16);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // --- B. モアイ本体の重厚な石肌グラデーション ---
        const stoneGrad = ctx.createLinearGradient(bx, by, bx + w, by + h);
        if (isFlash) {
            stoneGrad.addColorStop(0.0, '#ffffff');
            stoneGrad.addColorStop(0.5, '#ffaa88');
            stoneGrad.addColorStop(1.0, '#ffffff');
        } else {
            stoneGrad.addColorStop(0.0, '#cbd5e1'); // 明るい石肌ハイライト
            stoneGrad.addColorStop(0.28, '#94a3b8'); // 風化花崗岩
            stoneGrad.addColorStop(0.65, '#475569'); // 重厚なスレート岩
            stoneGrad.addColorStop(1.0, '#1e293b'); // 深部玄武岩の影
        }
        ctx.fillStyle = stoneGrad;

        // 巨大モアイ頭部シルエット
        ctx.beginPath();
        ctx.moveTo(bx + w - 8, by + h + 8);          // 首元後ろ（岩盤に埋没）
        ctx.lineTo(bx + w - 6, by + 24);             // 後頭部
        ctx.lineTo(bx + w - 22, by + 4);             // 頭頂部後ろ
        ctx.lineTo(bx + 26, by + 4);                 // 頭頂部前
        ctx.lineTo(bx + 10, by + 24);                // 額
        ctx.lineTo(bx + 2, by + 36);                 // 大きく突き出た眉庇
        ctx.lineTo(bx + 18, by + 41);                // 彫りの深い眼窩くぼみ
        ctx.lineTo(bx + 2, by + 74);                 // 巨大な鷲鼻の先端
        ctx.lineTo(bx + 18, by + 78);                // 鼻の下
        ctx.lineTo(bx + 20, by + 85);                // 上唇
        ctx.lineTo(bx + 10, by + 90 + jawDrop);      // 下唇
        ctx.lineTo(bx + 12, by + 112 + jawDrop);     // 頑強な顎先端
        ctx.lineTo(bx + 32, by + h + 8);             // 首元前（岩盤に埋没）
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = isFlash ? '#ffffff' : '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // --- C. 彫りの深い眼窩（重厚な黒影） ---
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.moveTo(bx + 17, by + 39);
        ctx.lineTo(bx + 44, by + 38);
        ctx.lineTo(bx + 40, by + 51);
        ctx.lineTo(bx + 19, by + 50);
        ctx.closePath();
        ctx.fill();

        // --- D. モアイの巨大な長耳（側頭部の重厚なレリーフ） ---
        ctx.fillStyle = isFlash ? '#ffffff' : '#475569';
        ctx.fillRect(bx + w - 26, by + 34, 11, 46);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.8;
        ctx.strokeRect(bx + w - 26, by + 34, 11, 46);

        // --- E. 口の空洞＆弱点コア発光（口を撃つとダメージ！） ---
        const mouthH = Math.max(5, jawDrop + 4);
        ctx.fillStyle = '#030712';
        ctx.beginPath();
        ctx.moveTo(bx + 18, by + 84);
        ctx.lineTo(bx + 46, by + 84);
        ctx.lineTo(bx + 46, by + 86 + mouthH);
        ctx.lineTo(bx + 10, by + 86 + mouthH);
        ctx.closePath();
        ctx.fill();

        // 口内のエネルギー球（弱点ガイドとしても機能）
        const glowR = 4 + this.chargeGlow * 8;
        ctx.save();
        ctx.shadowColor = '#00ffee';
        ctx.shadowBlur = 8 + 10 * this.chargeGlow;
        ctx.fillStyle = isFlash ? '#ffffff' : `rgba(56, 189, 248, ${0.45 + this.chargeGlow * 0.55})`;
        ctx.beginPath();
        ctx.arc(bx + 26, by + 85 + mouthH * 0.5, glowR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // --- F. 手前側の埋没岩盤（モアイの首元をガッチリと抱き込む前景岩塊） ---
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(bx - 8, by + h + 16);
        ctx.lineTo(bx + 8, by + h - 18);
        ctx.lineTo(bx + 36, by + h - 26);
        ctx.lineTo(bx + 58, by + h - 12);
        ctx.lineTo(bx + w + 14, by + h - 28);
        ctx.lineTo(bx + w + 20, by + h + 16);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 彫刻エッジハイライト
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx + 26, by + 7);
        ctx.lineTo(bx + 12, by + 24);
        ctx.lineTo(bx + 5, by + 36);
        ctx.moveTo(bx + 20, by + 44);
        ctx.lineTo(bx + 5, by + 73);
        ctx.stroke();
    }

    // 2. 横たわりモアイ（重厚な岩盤に横向きに埋没した巨大モアイ像）
    _drawLyingMoai(ctx, bx, by, w, h, isFlash) {
        const jawOpen = this.mouthOpenProgress * 14;

        // --- A. 背面の重厚な岩盤ベッド ---
        const rockGrad = ctx.createLinearGradient(bx, by + 20, bx, by + h + 16);
        rockGrad.addColorStop(0.0, '#64748b');
        rockGrad.addColorStop(0.5, '#334155');
        rockGrad.addColorStop(1.0, '#0f172a');
        ctx.fillStyle = rockGrad;

        ctx.beginPath();
        ctx.moveTo(bx - 16, by + h + 16);
        ctx.lineTo(bx - 6, by + 38);
        ctx.lineTo(bx + 35, by + 24);
        ctx.lineTo(bx + w - 18, by + 18);
        ctx.lineTo(bx + w + 14, by + 42);
        ctx.lineTo(bx + w + 20, by + h + 16);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // --- B. 横たわる巨大モアイ本体（顔が上〜斜め前方を向く） ---
        const stoneGrad = ctx.createLinearGradient(bx, by, bx + w, by + h);
        if (isFlash) {
            stoneGrad.addColorStop(0.0, '#ffffff');
            stoneGrad.addColorStop(0.5, '#ffaa88');
            stoneGrad.addColorStop(1.0, '#ffffff');
        } else {
            stoneGrad.addColorStop(0.0, '#cbd5e1');
            stoneGrad.addColorStop(0.35, '#94a3b8');
            stoneGrad.addColorStop(0.75, '#475569');
            stoneGrad.addColorStop(1.0, '#1e293b');
        }
        ctx.fillStyle = stoneGrad;

        ctx.beginPath();
        ctx.moveTo(bx + 4, by + h + 6);               // 顎下（岩盤内）
        ctx.lineTo(bx + 4, by + 28 - jawOpen * 0.5);  // 顎先端（左側）
        ctx.lineTo(bx + 24, by + 20 - jawOpen * 0.5); // 下唇
        ctx.lineTo(bx + 34, by + 28);                 // 口の奥
        ctx.lineTo(bx + 44, by + 18);                 // 上唇
        ctx.lineTo(bx + 54, by + 4);                  // 高く突き出た鼻先
        ctx.lineTo(bx + 82, by + 18);                 // 眉下の深い眼窩
        ctx.lineTo(bx + 92, by + 4);                  // 眉庇の突起
        ctx.lineTo(bx + 114, by + 10);                // 額
        ctx.lineTo(bx + w - 4, by + 28);              // 頭頂部（右側）
        ctx.lineTo(bx + w - 2, by + h + 6);           // 後頭部（岩盤内）
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = isFlash ? '#ffffff' : '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // --- C. 眼窩の深い影 ---
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.moveTo(bx + 76, by + 17);
        ctx.lineTo(bx + 90, by + 12);
        ctx.lineTo(bx + 92, by + 28);
        ctx.lineTo(bx + 74, by + 28);
        ctx.closePath();
        ctx.fill();

        // --- D. 横向きの長耳レリーフ ---
        ctx.fillStyle = isFlash ? '#ffffff' : '#475569';
        ctx.fillRect(bx + 62, by + 44, 48, 12);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(bx + 62, by + 44, 48, 12);

        // --- E. 口の空洞＆弱点コア発光 ---
        const mouthW = Math.max(6, jawOpen + 6);
        ctx.fillStyle = '#030712';
        ctx.beginPath();
        ctx.moveTo(bx + 24 - jawOpen * 0.4, by + 20);
        ctx.lineTo(bx + 44, by + 18);
        ctx.lineTo(bx + 42, by + 42);
        ctx.lineTo(bx + 24 - jawOpen * 0.4, by + 38);
        ctx.closePath();
        ctx.fill();

        const glowR = 4.5 + this.chargeGlow * 7.5;
        ctx.save();
        ctx.shadowColor = '#00ffee';
        ctx.shadowBlur = 8 + 10 * this.chargeGlow;
        ctx.fillStyle = isFlash ? '#ffffff' : `rgba(56, 189, 248, ${0.45 + this.chargeGlow * 0.55})`;
        ctx.beginPath();
        ctx.arc(bx + 33, by + 26, glowR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // --- F. 手前側を覆う重厚な埋没岩盤 ---
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(bx - 12, by + h + 16);
        ctx.lineTo(bx + 2, by + h - 22);
        ctx.lineTo(bx + 45, by + h - 30);
        ctx.lineTo(bx + 92, by + h - 18);
        ctx.lineTo(bx + w + 8, by + h - 28);
        ctx.lineTo(bx + w + 16, by + h + 16);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.stroke();
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
        this.scrollSpeed = 2.0;

        this.baseTopY = 76;
        this.baseBottomY = canvasHeight - 76;

        this.active = false;
        this.wallActive = false;
        this.wallTransition = 0; // 0 -> 1

        // 地形輪郭セグメント（サブピクセルスクロール対応）
        this.terrainStep = 30;
        this.scrollOffset = 0;
        this.generatedWorldX = 0;
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

    _computeTerrainHeights(d) {
        const hillTop = Math.sin(d * 0.008) * 44 + Math.sin(d * 0.022) * 26 + Math.cos(d * 0.048) * 14;
        const hillBot = Math.cos(d * 0.007) * 48 + Math.sin(d * 0.020) * 28 + Math.sin(d * 0.044) * 15;
        return {
            top: Math.max(38, Math.min(185, this.baseTopY + hillTop)),
            bottom: Math.min(this.height - 38, Math.max(this.height - 195, this.baseBottomY - hillBot))
        };
    }

    start() {
        this.active = true;
        this.wallActive = false;
        this.wallTransition = 0;
        this.moais = [];
        this.floatingIslands = [];
        this.distance = 0;
        this.scrollOffset = 0;
        this.generatedWorldX = 0;

        // 地形ノード初期化（起伏ある古代岩山を生成！）
        const count = Math.ceil(this.width / this.terrainStep) + 16;
        this.topHeights = [];
        this.bottomHeights = [];
        for (let i = 0; i < count; i++) {
            const d = i * this.terrainStep;
            this.generatedWorldX = d;
            const h = this._computeTerrainHeights(d);
            this.topHeights.push(h.top);
            this.bottomHeights.push(h.bottom);
        }
    }

    startWalls() {
        this.wallActive = true;
        this.wallTransition = 0;
    }

    getTopY(x) {
        if (!this.wallActive) return 0;
        const clampedTransition = Math.max(0, Math.min(1, this.wallTransition));
        const exactIdx = (x + this.scrollOffset) / this.terrainStep;
        const idx = Math.floor(exactIdx);
        if (idx < 0) return (this.topHeights[0] || this.baseTopY) * clampedTransition;
        if (idx >= this.topHeights.length - 1) return (this.topHeights[this.topHeights.length - 1] || this.baseTopY) * clampedTransition;

        const t = exactIdx - idx;
        const y0 = this.topHeights[idx];
        const y1 = this.topHeights[idx + 1];
        const rawY = y0 + (y1 - y0) * t;
        return rawY * clampedTransition;
    }

    getBottomY(x) {
        if (!this.wallActive) return this.height;
        const clampedTransition = Math.max(0, Math.min(1, this.wallTransition));
        const exactIdx = (x + this.scrollOffset) / this.terrainStep;
        const idx = Math.floor(exactIdx);
        let rawY = this.baseBottomY;
        if (idx < 0) {
            rawY = this.bottomHeights[0] || this.baseBottomY;
        } else if (idx >= this.bottomHeights.length - 1) {
            rawY = this.bottomHeights[this.bottomHeights.length - 1] || this.baseBottomY;
        } else {
            const t = exactIdx - idx;
            const y0 = this.bottomHeights[idx];
            const y1 = this.bottomHeights[idx + 1];
            rawY = y0 + (y1 - y0) * t;
        }
        return this.height - (this.height - rawY) * clampedTransition;
    }

    checkCollision(rect) {
        if (!this.active || !this.wallActive || this.wallTransition < 0.3) return false;

        const isRing = (typeof RingBullet !== 'undefined' && rect instanceof RingBullet);
        const isEnemyShot = Boolean(rect.isEnemy || isRing);

        // イオンリング弾がモアイの口から発射された直後（口内・顎付近を抜けるまでの数フレーム）は消滅させない
        if (isRing && typeof rect.framesAlive === 'number' && rect.framesAlive <= 6) {
            return false;
        }

        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;
        const topY = this.getTopY(cx);
        const bottomY = this.getBottomY(cx);

        if (isEnemyShot) {
            // 本家グラディウス準拠：イオンリング弾・敵弾は岩盤地形（天井・床・浮島）に当たると消滅する！
            const r = isRing ? 6 : 3;
            if (cy - r < topY) return true;
            if (cy + r > bottomY) return true;

            const shotCore = { x: cx - r, y: cy - r, width: r * 2, height: r * 2 };
            for (let i = 0; i < this.floatingIslands.length; i++) {
                if (this.floatingIslands[i].checkCollision(shotCore)) return true;
            }
            // モアイ像自身の当たり判定では敵弾・イオンリングを消滅させない（発射即消滅の防止）
            return false;
        }

        if (rect.y < topY) return true;
        if (rect.y + rect.height > bottomY) return true;

        // 浮島との衝突
        for (let i = 0; i < this.floatingIslands.length; i++) {
            if (this.floatingIslands[i].checkCollision(rect)) return true;
        }

        // モアイ本体との衝突（自機など）
        for (let i = 0; i < this.moais.length; i++) {
            const m = this.moais[i];
            if (!m.active) continue;
            const mb = m.getBounds();
            if (
                rect.x < mb.x + mb.width &&
                rect.x + rect.width > mb.x &&
                rect.y < mb.y + mb.height &&
                rect.y + rect.height > mb.y
            ) {
                return true;
            }
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

        // 岩壁せり上がりイージング
        if (this.wallTransition < 1.0) {
            this.wallTransition = Math.min(1.0, this.wallTransition + 0.015);
        }

        // 2. 天井・床の滑らかな左スクロール＆新規地形波形生成
        this.scrollOffset += this.scrollSpeed;
        while (this.scrollOffset >= this.terrainStep) {
            this.scrollOffset -= this.terrainStep;
            this.topHeights.shift();
            this.bottomHeights.shift();

            this.generatedWorldX += this.terrainStep;
            const h = this._computeTerrainHeights(this.generatedWorldX);
            this.topHeights.push(h.top);
            this.bottomHeights.push(h.bottom);
        }

        // 3. モアイ像の更新（地形スクロールと同期）
        const curPlayer = (typeof player !== 'undefined') ? player : null;
        this.moais.forEach(m => m.update(this.scrollSpeed, curPlayer, this));
        this.moais = this.moais.filter(m => m.active);

        // 4. 浮島の更新
        this.floatingIslands.forEach(island => island.update(this.scrollSpeed));
        this.floatingIslands = this.floatingIslands.filter(i => i.active);
    }

    spawnMoai(side, facing, xOffset = 0, posture = 'standing') {
        const x = this.width + 40 + xOffset;
        let y = (side === 'top') ? this.getTopY(x + 45) : this.getBottomY(x + 45);
        this.moais.push(new MoaiEnemy(x, y, side, facing, posture));
    }

    spawnFloatingIsland(xOffset = 0, y = 280, w = 210, h = 56, spawnMoais = true) {
        const x = this.width + 40 + xOffset;
        const island = new FloatingRockIsland(x, y, w, h);
        this.floatingIslands.push(island);

        if (spawnMoais) {
            const topPosture = (Math.random() < 0.45) ? 'lying' : 'standing';
            // 島の上にモアイ
            this.moais.push(new MoaiEnemy(x + 20, y + 6, 'island', 'left', topPosture));
            // 島の下に後ろ向き（背後急襲）逆さモアイ
            this.moais.push(new MoaiEnemy(x + w - 105, y + h - 6, 'island_top', 'right', 'standing'));
        }
    }

    handleBulletCollisions(playerBullets) {
        if (!this.wallActive) return;

        // 1. ★★★ 原作再現：自機弾 vs イオンリング弾（撃ち落とし可能！）★★★
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

        // 2. プレイヤー弾 vs モアイ像（★口を撃たないと壊れない設定！）
        playerBullets.forEach(bullet => {
            if (!bullet.active) return;
            const isLaser = (typeof Laser !== 'undefined' && bullet instanceof Laser);

            for (let i = this.moais.length - 1; i >= 0; i--) {
                const m = this.moais[i];
                if (!m.active) continue;

                const mouthBounds = m.getMouthBounds();
                const bodyBounds = m.getBounds();

                // A. 弱点の「口」に命中した場合のみダメージ！
                if (checkCollision(bullet, mouthBounds)) {
                    if (isLaser) {
                        if (m.laserHitCooldown <= 0) {
                            m.laserHitCooldown = 9;
                            m.hit(2);
                            if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') {
                                Sound.playBossHit();
                            }
                        }
                    } else {
                        bullet.active = false;
                        m.hit(1);
                        if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') {
                            Sound.playBossHit();
                        }
                        break;
                    }
                }
                // B. 口以外の硬い岩盤・頭部ボディに当たった場合はノーダメージで弾かれる！
                else if (checkCollision(bullet, bodyBounds)) {
                    if (!isLaser) {
                        bullet.active = false;
                        if (typeof particles !== 'undefined' && typeof Particle !== 'undefined') {
                            particles.push(new Particle(bullet.x, bullet.y, '#94a3b8'));
                        }
                        break;
                    }
                }
            }
        });
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

        // 4. 起伏ある古代岩山洞窟と巨大モアイ群の描画
        if (this.wallActive && this.wallTransition > 0.02) {
            // 中空浮島
            this.floatingIslands.forEach(island => island.draw(ctx));

            // モアイ像群（岩盤に深く根ざすよう地形エッジと一体描画）
            this.moais.forEach(m => m.draw(ctx));

            // スクロールする天井岩盤と床岩盤
            this._drawCeiling(ctx);
            this._drawFloor(ctx);
        }

        ctx.restore();
    }

    _drawCeiling(ctx) {
        ctx.save();
        const clampedTransition = Math.max(0, Math.min(1, this.wallTransition));

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.width, 0);

        for (let i = this.topHeights.length - 1; i >= 0; i--) {
            const x = i * this.terrainStep - this.scrollOffset;
            if (x < -this.terrainStep || x > this.width + this.terrainStep) continue;
            const y = this.topHeights[i] * clampedTransition;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(0, this.getTopY(0));
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, 0, 0, 185 * clampedTransition);
        grad.addColorStop(0.0, '#0f172a');
        grad.addColorStop(0.45, '#334155');
        grad.addColorStop(0.85, '#64748b');
        grad.addColorStop(1.0, '#1e293b');
        ctx.fillStyle = grad;
        ctx.fill();

        // エッジシャープライン
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < this.topHeights.length; i++) {
            const x = i * this.terrainStep - this.scrollOffset;
            if (x < -this.terrainStep || x > this.width + this.terrainStep) continue;
            const y = this.topHeights[i] * clampedTransition;
            if (!started) {
                ctx.moveTo(x, y);
                started = true;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // スクロールと完全同期して流れる天井岩脈・クレバスライン
        const crevasseShift = this.distance % 60;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = -crevasseShift; x <= this.width + 60; x += 60) {
            const y = this.getTopY(x);
            ctx.moveTo(x, 0);
            ctx.lineTo(x - 16, y * 0.5);
            ctx.lineTo(x + 8, y - 3);
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

        for (let i = this.bottomHeights.length - 1; i >= 0; i--) {
            const x = i * this.terrainStep - this.scrollOffset;
            if (x < -this.terrainStep || x > this.width + this.terrainStep) continue;
            const rawY = this.bottomHeights[i];
            const y = this.height - (this.height - rawY) * clampedTransition;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(0, this.getBottomY(0));
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, this.height - 190 * clampedTransition, 0, this.height);
        grad.addColorStop(0.0, '#1e293b');
        grad.addColorStop(0.18, '#64748b');
        grad.addColorStop(0.60, '#334155');
        grad.addColorStop(1.0, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fill();

        // エッジシャープライン
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < this.bottomHeights.length; i++) {
            const x = i * this.terrainStep - this.scrollOffset;
            if (x < -this.terrainStep || x > this.width + this.terrainStep) continue;
            const rawY = this.bottomHeights[i];
            const y = this.height - (this.height - rawY) * clampedTransition;
            if (!started) {
                ctx.moveTo(x, y);
                started = true;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // スクロールと完全同期して流れる地面の岩脈・クレバスライン
        const crevasseShift = this.distance % 60;
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let x = 30 - crevasseShift; x <= this.width + 60; x += 60) {
            const y = this.getBottomY(x);
            ctx.moveTo(x, this.height);
            ctx.lineTo(x + 16, (this.height + y) * 0.52);
            ctx.lineTo(x - 8, y + 3);
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

            // 1. 開幕10秒経過でモアイ洞窟（岩山地形）出現＆スクロール開始！
            if (this.stageTime >= 10000 && !this.terrain.wallActive) {
                this.terrain.startWalls();
            }

            // 2. 空中敵編隊（カプセル補給と牽制）
            this.updateFlyingEnemies(dt);

            // 3. 原作グラディウス式 モアイ＆地形ウェーブ生成（11秒〜78秒）
            if (this.stageTime >= 11000 && this.stageTime < 78000) {
                this.updateMoaiWaves(dt);
            }

            // 4. 地形を這うダッカー歩行砲台の生成
            if (this.stageTime >= 22000 && this.stageTime < 76000) {
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
            // 自機を右端に押し付けず、そのままの自由操作を維持
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
        let interval = 2300;
        if (this.stageTime > 52000) interval = 1650;

        if (this.moaiWaveTimer >= interval) {
            this.moaiWaveTimer = 0;

            const roll = Math.random();

            // 立ちモアイ(standing)・横たわりモアイ(lying)、前向き(left)・後ろ向き(right)を多彩に配置！
            if (this.stageTime < 30000) {
                // 前半：立ち前向き＆横たわりモアイの登場
                if (roll < 0.35) {
                    this.terrain.spawnMoai('bottom', 'left', 0, 'standing');
                } else if (roll < 0.65) {
                    this.terrain.spawnMoai('top', 'left', 0, 'standing');
                } else if (roll < 0.85) {
                    this.terrain.spawnMoai('bottom', 'left', 0, 'lying');
                } else {
                    this.terrain.spawnMoai('top', 'right', 0, 'lying');
                }
            } else if (this.stageTime < 52000) {
                // 中盤：前向き＋後ろ向き、立ち＋横たわり、浮島との複合配置
                if (roll < 0.28) {
                    this.terrain.spawnMoai('bottom', 'left', 0, 'standing');
                    this.terrain.spawnMoai('top', 'right', 70, 'standing'); // 背後急襲
                } else if (roll < 0.55) {
                    this.terrain.spawnMoai('top', 'left', 0, 'standing');
                    this.terrain.spawnMoai('bottom', 'right', 60, 'lying'); // 横たわり背後急襲
                } else if (roll < 0.78) {
                    this.terrain.spawnMoai('bottom', 'left', 0, 'lying');
                    this.terrain.spawnMoai('top', 'left', 90, 'standing');
                } else {
                    this.terrain.spawnFloatingIsland(0, 270, 210, 56, true);
                }
            } else {
                // 後半（モアイラッシュ）：巨石モアイ密集地帯！
                if (roll < 0.30) {
                    this.terrain.spawnMoai('bottom', 'left', 0, 'standing');
                    this.terrain.spawnMoai('top', 'left', 50, 'lying');
                } else if (roll < 0.60) {
                    this.terrain.spawnFloatingIsland(0, 275, 210, 56, true);
                    this.terrain.spawnMoai('bottom', 'right', 170, 'standing');
                } else if (roll < 0.82) {
                    this.terrain.spawnMoai('bottom', 'right', 0, 'lying');
                    this.terrain.spawnMoai('top', 'left', 60, 'standing');
                } else {
                    this.terrain.spawnMoai('bottom', 'right', 0, 'standing');
                    this.terrain.spawnMoai('top', 'right', 55, 'lying');
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
                ctx.font = 'bold 26px "Courier New", monospace';
                ctx.fillStyle = '#ff2266';
                ctx.shadowColor = '#ff0044';
                ctx.shadowBlur = 16;
                ctx.fillText('WARNING : BIO-MOAI BRAIN CORE APPROACHING!', this.width / 2, this.height / 2 - 30);
                ctx.font = 'bold 17px "Courier New", monospace';
                ctx.fillStyle = '#ffcc00';
                ctx.fillText('DESTROY 4 ORGAN BARRIERS TO EXPOSE THE CEREBRAL BRAIN CORE!', this.width / 2, this.height / 2 + 15);
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
