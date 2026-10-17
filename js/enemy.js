// ==========================================
// GRADIUS ENEMY SYSTEM
// 敵キャラクター: 大きく見やすく、ゆったりとした動きに調整
// 配色: 青みのある銀色（メタリックシルバーブルー）
// 群れ全滅でカプセル確定ドロップ
// ==========================================

class Enemy {
    constructor(x, y, isRed = false) {
        this.x = x;
        this.y = y;
        this.width = 44;
        this.height = 28;
        this.speed = 1.6; // ゆったりとした前進
        this.active = true;
        this.hp = 1;
        this.animTimer = Math.random() * 100;
        this.isRed = isRed;
        if (isRed) {
            this.bodyColor = '#ff2244';
            this.trimColor = '#ffaacc';
            this.darkColor = '#880011';
        } else {
            this.bodyColor = '#8fa8c8';
            this.trimColor = '#d2e4ff';
            this.darkColor = '#4a6080';
        }
        this.formation = null;
    }

    update() {
        this.x -= this.speed;
        this.animTimer += 0.12;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        // 機体下面の立体シャドウ
        // Fast draw

        // 上半身 (光を受けるメタリックシルバー)
        const gradTop = ctx.createLinearGradient(0, -13, 0, 0);
        gradTop.addColorStop(0.0, '#f8fafc'); // 先端ハイライト
        gradTop.addColorStop(0.3, '#cbd5e1'); // 金属光沢
        gradTop.addColorStop(0.7, '#64748b'); // スレートグレー
        gradTop.addColorStop(1.0, '#475569'); // センター稜線

        ctx.fillStyle = gradTop;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(-8, -13);
        ctx.lineTo(-16, -5);
        ctx.lineTo(-18, 0);
        ctx.lineTo(22, 0);
        ctx.closePath();
        ctx.fill();

        // 下半身 (深い影のガンメタル)
        const gradBottom = ctx.createLinearGradient(0, 0, 0, 13);
        gradBottom.addColorStop(0.0, '#334155');
        gradBottom.addColorStop(0.5, '#1e293b');
        gradBottom.addColorStop(1.0, '#0f172a');

        ctx.fillStyle = gradBottom;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(-18, 0);
        ctx.lineTo(-16, 5);
        ctx.lineTo(-8, 13);
        ctx.closePath();
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // 前縁ベベルエッジ (鋭い光沢ハイライトライン)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(-8, -13);
        ctx.stroke();

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(-8, 13);
        ctx.stroke();

        // 中央胴体装甲隆起
        const spineGrad = ctx.createLinearGradient(-6, -4, 14, 4);
        spineGrad.addColorStop(0.0, '#e2e8f0');
        spineGrad.addColorStop(0.5, '#94a3b8');
        spineGrad.addColorStop(1.0, '#334155');
        ctx.fillStyle = spineGrad;
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(2, -4);
        ctx.lineTo(-8, 0);
        ctx.lineTo(2, 4);
        ctx.closePath();
        ctx.fill();

        // パネルライン
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(2, -4);
        ctx.lineTo(2, 4);
        ctx.stroke();

        // キャノピー (曲面ガラス光沢シアン)
        const canopyGrad = ctx.createLinearGradient(0, -3, 8, 3);
        canopyGrad.addColorStop(0.0, '#ffffff');
        canopyGrad.addColorStop(0.3, '#38bdf8');
        canopyGrad.addColorStop(0.8, '#0284c7');
        canopyGrad.addColorStop(1.0, '#0369a1');
        ctx.fillStyle = canopyGrad;
        ctx.beginPath();
        ctx.ellipse(3, 0, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // キャノピーハイライト
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(2, -1.5, 2.5, 1);

        // バーニア / プラズマアフターバーナー
        const flame = 9 + Math.sin(this.animTimer * 2) * 4;
        ctx.fillStyle = 'rgba(0, 220, 255, 0.85)';
        ctx.beginPath();
        ctx.moveTo(-18, -4);
        ctx.lineTo(-18 - flame, 0);
        ctx.lineTo(-18, 4);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-18, -2);
        ctx.lineTo(-18 - flame * 0.55, 0);
        ctx.lineTo(-18, 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

class FormationBase {
    constructor(count) {
        this.totalCount = count;
        this.destroyedCount = 0;
        this.active = true;
    }

    notifyDestroyed(enemyX, enemyY) {
        this.destroyedCount++;
        if (this.destroyedCount === this.totalCount) {
            if (typeof capsules !== 'undefined') {
                capsules.push(new PowerUpCapsule(enemyX, enemyY));
            }
            if (typeof addScore === 'function') {
                addScore(500, enemyX, enemyY - 12, '#00ffff');
            }
            this.active = false;
        }
    }
}

// ------------------------------------------
// ファン編隊 (Fan: 1985年アーケード版完全準拠)
// 右端から直進飛来 → 自機のY座標方向へ斜めに「カックン」と折れ曲がり反転・交差離脱！
// 4枚羽根の風車（ピンホイール）回転スプライト（銀青 / 赤カプセル機は朱赤）
// ------------------------------------------
class Formation extends FormationBase {
    constructor(startY, count = 5, isRed = false) {
        super(count);
        this.enemies = [];

        for (let i = 0; i < count; i++) {
            const enemy = new FanEnemy(820, startY, i * 14, this, isRed);
            this.enemies.push(enemy);
            enemies.push(enemy);
        }
    }
}

class FanEnemy extends Enemy {
    constructor(x, y, delay, formation, isRed = false) {
        super(x, y, isRed);
        this.startY = y;
        this.delay = delay;
        this.formation = formation;
        this.width = 34;
        this.height = 34;
        this.time = 0;
        this.visible = (delay <= 0);
        this.phase = 'STRAIGHT'; // 'STRAIGHT' -> 'DIAG' -> 'RETURN'
        this.turnX = 250; // 画面左寄りまで直進してから折れ曲がる
        this.diagTimer = 0;
        this.vx = -3.4;
        this.vy = 0;
        this.spinAngle = 0;
    }

    update() {
        if (this.delay > 0) {
            this.delay--;
            if (this.delay <= 0) {
                this.visible = true;
                this.x = 820;
                this.y = this.startY;
            }
            return;
        }

        this.time++;
        this.animTimer += 0.22;
        this.spinAngle += 0.28; // くるくる高速回転する4枚羽根ファン

        if (this.phase === 'STRAIGHT') {
            this.x += this.vx;
            if (this.x <= this.turnX) {
                this.phase = 'DIAG';
                this.diagTimer = 0;
                // 自機のY座標側（または画面中央側）へ向かってカックンと斜めに折れ曲がる！
                let dirY = (this.y < 300) ? 1 : -1;
                if (typeof player !== 'undefined' && player) {
                    dirY = (player.y > this.y) ? 1 : -1;
                }
                this.vx = 2.2;  // 右斜め方向へ切り返す本家特有のクランク軌道
                this.vy = dirY * 2.6;
            }
        } else if (this.phase === 'DIAG') {
            this.x += this.vx;
            this.y += this.vy;
            this.diagTimer++;
            if (this.diagTimer >= 28) {
                this.phase = 'RETURN';
                this.vx = 3.6; // 右方向へ高速離脱（または水平飛行）
                this.vy = 0;
            }
        } else {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x > 860 || this.x < -80 || this.y < -60 || this.y > 660) {
                this.active = false;
            }
        }
    }

    draw(ctx) {
        if (!this.visible) return;
        ctx.save();
        const cx = Math.round(this.x + this.width / 2);
        const cy = Math.round(this.y + this.height / 2);
        ctx.translate(cx, cy);

        // 1985年アーケード版「ファン」のドット絵構造を忠実再現：
        // 4枚の風車ブレードが回転フレームに応じて切り替わるピクセルアート造形
        const frame = Math.floor(this.spinAngle * 2) % 4;
        const S = 2; // 16x16ドット×2倍 = 32x32px

        const cMain = this.isRed ? '#ef4444' : '#7dd3fc';
        const cLight = this.isRed ? '#fecdd3' : '#f0f9ff';
        const cDark = this.isRed ? '#991b1b' : '#0369a1';
        const cCore = this.isRed ? '#fde047' : '#f97316';

        ctx.rotate(frame * (Math.PI / 8));

        // 4枚の風車羽根（ピンホイールブレード）
        for (let b = 0; b < 4; b++) {
            ctx.save();
            ctx.rotate(b * (Math.PI / 2));
            // ブレード暗部ベース
            ctx.fillStyle = cDark;
            ctx.fillRect(1 * S, -7 * S, 4 * S, 5 * S);
            ctx.fillRect(2 * S, -8 * S, 3 * S, 1 * S);
            // ブレード明部
            ctx.fillStyle = cMain;
            ctx.fillRect(0 * S, -7 * S, 3 * S, 5 * S);
            // ブレード先端ハイライト
            ctx.fillStyle = cLight;
            ctx.fillRect(0 * S, -7 * S, 2 * S, 2 * S);
            ctx.restore();
        }

        // 中央の八角形リング＆コア
        ctx.fillStyle = cDark;
        ctx.fillRect(-3 * S, -3 * S, 6 * S, 6 * S);
        ctx.fillStyle = cLight;
        ctx.fillRect(-2 * S, -2 * S, 4 * S, 4 * S);
        ctx.fillStyle = cCore;
        ctx.fillRect(-1 * S, -1 * S, 2 * S, 2 * S);

        ctx.restore();
    }
}

// ------------------------------------------
// ガルン編隊 (Garun: 1985年アーケード版完全準拠)
// 上下にサイン波（正弦波）を描いてくるくるロール回転しながら飛来する円盤型戦闘機！
// ------------------------------------------
class GarunFormation extends FormationBase {
    constructor(startY, isUpward = false, count = 4, hasRed = true) {
        super(count);
        this.enemies = [];

        for (let i = 0; i < count; i++) {
            // 編隊のうち先頭または最後尾を赤いカプセルキャリアにする
            const isRed = hasRed && (i === 0 || i === count - 1);
            const enemy = new GarunEnemy(820, startY, i * 18, isUpward ? -1 : 1, this, isRed);
            this.enemies.push(enemy);
            enemies.push(enemy);
        }
    }
}

class GarunEnemy extends Enemy {
    constructor(x, y, delay, phaseDir = 1, formation = null, isRed = false) {
        super(x, y, isRed);
        this.startY = y;
        this.delay = delay;
        this.phaseDir = phaseDir || 1;
        this.formation = formation;
        this.width = 36;
        this.height = 32;
        this.time = 0;
        this.visible = (delay <= 0);
        this.speedX = -2.8;
        this.amplitude = 52;
    }

    update() {
        if (this.delay > 0) {
            this.delay--;
            if (this.delay <= 0) {
                this.visible = true;
                this.x = 820;
            }
            return;
        }

        this.time += 0.085;
        this.animTimer += 0.2;
        this.x += this.speedX;
        this.y = this.startY + Math.sin(this.time) * this.amplitude * this.phaseDir;

        if (this.x < -80) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.visible) return;
        ctx.save();
        const cx = Math.round(this.x + this.width / 2);
        const cy = Math.round(this.y + this.height / 2);
        ctx.translate(cx, cy);

        // 1985年アーケード版「ガルン」：上下蛇行に合わせて機体が縦方向にロール回転（厚みが変化）するスプライト表現！
        const roll = Math.cos(this.time); // -1.0 〜 +1.0
        const scaleY = Math.max(0.32, Math.abs(roll));
        const S = 2;

        const cLight = this.isRed ? '#fde047' : '#e0f2fe';
        const cMain  = this.isRed ? '#ef4444' : '#38bdf8';
        const cDark  = this.isRed ? '#991b1b' : '#1e3a8a';
        const cCore  = this.isRed ? '#ffffff' : '#f97316';

        // 上下ウイングポッド（ロール回転で上下に開閉する立体構造）
        ctx.save();
        ctx.scale(1, scaleY);

        // 外殻ウイング（ドット階段状のアーケードフォルム）
        ctx.fillStyle = cDark;
        ctx.fillRect(-7 * S, -7 * S, 14 * S, 14 * S);
        ctx.fillStyle = cMain;
        ctx.fillRect(-8 * S, -5 * S, 16 * S, 10 * S);
        ctx.fillRect(-5 * S, -8 * S, 10 * S, 16 * S);

        // 上下ブレードのリブハイライト
        ctx.fillStyle = cLight;
        ctx.fillRect(-6 * S, -6 * S, 10 * S, 2 * S);
        ctx.fillRect(-6 * S, 4 * S, 10 * S, 2 * S);
        ctx.restore();

        // 中央コア軸（常に厚みを持つセンタースリット＆赤熱コア）
        ctx.fillStyle = '#090d16';
        ctx.fillRect(-8 * S, -2 * S, 16 * S, 4 * S);
        ctx.fillStyle = cCore;
        ctx.fillRect(-5 * S, -1 * S, 8 * S, 2 * S);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-4 * S, -1 * S, 3 * S, 1 * S);

        ctx.restore();
    }
}

// ------------------------------------------
// ザブ小隊 (奇襲機: 2面ストーンヘンジ・ボス前ラッシュ用)
// ------------------------------------------
class ZabSquad extends FormationBase {
    constructor(spawnSide = 'ANYWHERE', targetY = 300, count = 3) {
        super(count);
        this.enemies = [];

        for (let i = 0; i < count; i++) {
            const isRed = (i === count - 1 && Math.random() < 0.55);
            const enemy = new ZabEnemy('ANYWHERE', null, this, i * 10, isRed);
            this.enemies.push(enemy);
            enemies.push(enemy);
        }
    }
}

class ZabEnemy extends Enemy {
    constructor(spawnSide = 'ANYWHERE', targetY = null, formation = null, delay = 0, isRed = false) {
        let sx, sy;
        if (typeof spawnSide === 'number' && typeof targetY === 'number') {
            sx = Math.max(40, Math.min(750, spawnSide));
            sy = Math.max(40, Math.min(530, targetY));
        } else {
            const pX = (typeof player !== 'undefined' && player) ? (player.x + player.width / 2) : -999;
            const pY = (typeof player !== 'undefined' && player) ? (player.y + player.height / 2) : -999;
            sx = 45 + Math.random() * 695;
            sy = 45 + Math.random() * 480;
            for (let attempt = 0; attempt < 10; attempt++) {
                const candX = 45 + Math.random() * 695;
                const candY = 45 + Math.random() * 480;
                if (Math.hypot(candX + 16 - pX, candY + 16 - pY) >= 115) {
                    sx = candX;
                    sy = candY;
                    break;
                }
            }
        }

        super(sx, sy, isRed);
        this.width = 32;
        this.height = 32;
        this.formation = formation;
        this.spawnSide = 'ANYWHERE';
        this.delay = delay;
        this.state = 'WARP_IN';
        this.warpTimer = 0;
        this.warpDuration = 38;
        this.vx = 0;
        this.vy = 0;
        this.rot = 0;
    }

    update() {
        if (this.delay > 0) {
            this.delay--;
            return;
        }

        this.rot += 0.15;
        if (this.state === 'WARP_IN') {
            this.warpTimer++;
            if (this.warpTimer >= this.warpDuration) {
                this.state = 'RUSH';
                if (typeof particles !== 'undefined' && typeof Particle !== 'undefined') {
                    const pColor = this.isRed ? '#ff6688' : '#00ffff';
                    for (let i = 0; i < 6; i++) {
                        particles.push(new Particle(this.x + this.width / 2, this.y + this.height / 2, pColor));
                    }
                }
                if (typeof player !== 'undefined') {
                    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
                    const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const speed = 3.6;
                    this.vx = (dx / dist) * speed;
                    this.vy = (dy / dist) * speed;
                } else {
                    this.vx = -3.5;
                }
            }
        } else {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < -80 || this.x > 880 || this.y < -80 || this.y > 680) {
                this.active = false;
            }
        }
    }

    draw(ctx) {
        if (this.delay > 0) return;
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        if (this.state === 'WARP_IN') {
            const progress = Math.min(1, this.warpTimer / this.warpDuration);
            const ringColor = this.isRed ? '#ff3366' : '#00ffff';
            const radius = Math.max(4, (1 - progress) * 40 + 6);

            ctx.strokeStyle = ringColor;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = ringColor;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
            ctx.stroke();

            ctx.globalAlpha = progress * 0.85;
            const scale = 0.25 + progress * 0.75;
            ctx.scale(scale, scale);
            ctx.rotate(this.rot);
            ctx.strokeStyle = '#ffffff';
            ctx.fillStyle = this.isRed ? 'rgba(255, 50, 100, 0.5)' : 'rgba(0, 220, 255, 0.5)';
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(15, 0);
            ctx.lineTo(0, 15);
            ctx.lineTo(-15, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.rotate(this.rot);
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 7;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;

            const facetTop = ctx.createLinearGradient(0, -15, 0, 0);
            if (this.isRed) {
                facetTop.addColorStop(0.0, '#ffffff');
                facetTop.addColorStop(0.5, '#fda4af');
                facetTop.addColorStop(1.0, '#f43f5e');
            } else {
                facetTop.addColorStop(0.0, '#ffffff');
                facetTop.addColorStop(0.5, '#cbd5e1');
                facetTop.addColorStop(1.0, '#94a3b8');
            }
            ctx.fillStyle = facetTop;
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(15, 0);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.fill();

            const facetLeft = ctx.createLinearGradient(-15, 0, 0, 0);
            if (this.isRed) {
                facetLeft.addColorStop(0.0, '#ffe4e6');
                facetLeft.addColorStop(0.6, '#e11d48');
                facetLeft.addColorStop(1.0, '#9f1239');
            } else {
                facetLeft.addColorStop(0.0, '#e2e8f0');
                facetLeft.addColorStop(0.6, '#64748b');
                facetLeft.addColorStop(1.0, '#475569');
            }
            ctx.fillStyle = facetLeft;
            ctx.beginPath();
            ctx.moveTo(-15, 0);
            ctx.lineTo(0, -15);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.fill();

            const facetRight = ctx.createLinearGradient(0, 0, 15, 0);
            if (this.isRed) {
                facetRight.addColorStop(0.0, '#9f1239');
                facetRight.addColorStop(0.7, '#881337');
                facetRight.addColorStop(1.0, '#4c0519');
            } else {
                facetRight.addColorStop(0.0, '#475569');
                facetRight.addColorStop(0.7, '#334155');
                facetRight.addColorStop(1.0, '#1e293b');
            }
            ctx.fillStyle = facetRight;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(15, 0);
            ctx.lineTo(0, 15);
            ctx.closePath();
            ctx.fill();

            const facetBottom = ctx.createLinearGradient(0, 0, 0, 15);
            if (this.isRed) {
                facetBottom.addColorStop(0.0, '#881337');
                facetBottom.addColorStop(0.6, '#4c0519');
                facetBottom.addColorStop(1.0, '#2a020d');
            } else {
                facetBottom.addColorStop(0.0, '#334155');
                facetBottom.addColorStop(0.6, '#1e293b');
                facetBottom.addColorStop(1.0, '#0f172a');
            }
            ctx.fillStyle = facetBottom;
            ctx.beginPath();
            ctx.moveTo(-15, 0);
            ctx.lineTo(0, 0);
            ctx.lineTo(0, 15);
            ctx.closePath();
            ctx.fill();

            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(0, 15);
            ctx.moveTo(-15, 0);
            ctx.lineTo(15, 0);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.strokeRect(-10, -10, 20, 20);

            const gemGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 5);
            gemGrad.addColorStop(0.0, '#ffffff');
            gemGrad.addColorStop(0.4, this.isRed ? '#fb7185' : '#38bdf8');
            gemGrad.addColorStop(1.0, this.isRed ? '#be123c' : '#0284c7');
            ctx.fillStyle = gemGrad;
            ctx.beginPath();
            ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-1, -16, 2, 2);
            ctx.fillRect(15, -1, 2, 2);
        }
        ctx.restore();
    }
}

// ------------------------------------------
// ダッカー (DuckerEnemy: 1985年アーケード版完全準拠)
// 水色（シアン）の装甲ポッド胴体＋オレンジ色の逆関節2本脚で斜面に沿ってトコトコ走り、
// 立ち止まって自機に狙いを定めて弾を発射し、また走り出す！
// ------------------------------------------
class DuckerEnemy extends Enemy {
    constructor(x, y, isCeiling, isRed = false, moveDir = -1) {
        super(x, y, isRed);
        this.width = 36;
        this.height = 34;
        this.isCeiling = isCeiling;
        this.walkCycle = 0;
        this.slopeAngle = 0;
        this.groundY = y;
        this.moveDir = moveDir; // -1: 左走行, +1: 左端から右へ追いかけてくる後方出現
        this.stopTimer = Math.floor(Math.random() * 40);
        this.hp = 1;
        this.shootCooldown = 0;
    }

    update() {
        let activeTerrain = null;
        if (typeof levelManager !== 'undefined') {
            if (levelManager.stage === 4 && window.stage4 && window.stage4.terrain && window.stage4.terrain.wallActive) {
                activeTerrain = window.stage4.terrain;
            } else if (levelManager.stage === 3 && window.stage3 && window.stage3.terrain && window.stage3.terrain.wallActive) {
                activeTerrain = window.stage3.terrain;
            } else if (levelManager.terrain && levelManager.terrain.active) {
                activeTerrain = levelManager.terrain;
            }
        }

        if (activeTerrain) {
            const terrainScroll = activeTerrain.scrollSpeed;

            this.stopTimer++;
            if (this.stopTimer > 75 && this.stopTimer < 120) {
                // 立ち止まって照準＆射撃！
                this.x -= terrainScroll;
                this.shootCooldown++;
                if (this.shootCooldown === 18) {
                    this.shoot();
                }
            } else {
                if (this.stopTimer >= 120) {
                    this.stopTimer = 0;
                    this.shootCooldown = 0;
                    // 自機を追い越したら反転して自機側へ向き直す本家AI
                    if (typeof player !== 'undefined' && player) {
                        if (this.x < player.x - 90) this.moveDir = 1;
                        else if (this.x > player.x + 220) this.moveDir = -1;
                    }
                }
                this.walkCycle += 0.32;
                this.x += (this.moveDir * 1.8) - terrainScroll;
            }

            const centerX = this.x + this.width / 2;
            const sampleDist = 14;

            if (this.isCeiling) {
                const yL = activeTerrain.getTopY(centerX - sampleDist);
                const yR = activeTerrain.getTopY(centerX + sampleDist);
                const yC = activeTerrain.getTopY(centerX);
                this.slopeAngle = Math.atan2(yR - yL, sampleDist * 2);
                this.groundY = yC;
                this.y = yC;
            } else {
                const yL = activeTerrain.getBottomY(centerX - sampleDist);
                const yR = activeTerrain.getBottomY(centerX + sampleDist);
                const yC = activeTerrain.getBottomY(centerX);
                this.slopeAngle = Math.atan2(yR - yL, sampleDist * 2);
                this.groundY = yC;
                this.y = yC - this.height;
            }
        } else {
            this.x -= this.speed;
        }
    }

    shoot() {
        if (typeof player === 'undefined' || typeof enemyBullets === 'undefined') return;
        const centerX = this.x + this.width / 2;
        const centerY = this.isCeiling ? this.groundY + 14 : this.groundY - 14;

        const dx = (player.x + player.width / 2) - centerX;
        const dy = (player.y + player.height / 2) - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        if (dist < 680) {
            const spd = 3.8;
            const bullet = new EnemyBullet(centerX, centerY, (dx / dist) * spd, (dy / dist) * spd);
            enemyBullets.push(bullet);
        }
    }

    draw(ctx) {
        ctx.save();
        const centerX = Math.round(this.x + this.width / 2);
        ctx.translate(centerX, Math.round(this.groundY));
        ctx.rotate(this.slopeAngle);
        if (this.isCeiling) ctx.scale(1, -1);
        if (this.moveDir > 0) ctx.scale(-1, 1);

        const stride = Math.sin(this.walkCycle) * 7;
        const S = 2;

        // 1985年アーケード版「ダッカー」伝統のカラーリング：
        // 通常機＝水色（シアン）ボディ＋オレンジ脚 / 赤カプセル機＝深紅ボディ＋イエロー脚
        const cBodyLight = this.isRed ? '#fecdd3' : '#e0f2fe';
        const cBodyMain  = this.isRed ? '#ef4444' : '#38bdf8';
        const cBodyDark  = this.isRed ? '#991b1b' : '#0369a1';
        const cLegMain   = this.isRed ? '#facc15' : '#f97316';
        const cLegDark   = this.isRed ? '#ca8a04' : '#c2410c';

        // 1. 奥側の逆関節脚（オレンジ暗色）
        ctx.strokeStyle = cLegDark;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(2, -16);
        ctx.lineTo(7 - stride * 0.6, -9);
        ctx.lineTo(3 - stride, -1);
        ctx.stroke();
        ctx.fillStyle = cLegDark;
        ctx.fillRect(-2 - stride, -3, 9, 3);

        // 2. 砲身付き装甲ポッド胴体（前傾姿勢のドット絵フォルム）
        // 下部シャドウ
        ctx.fillStyle = cBodyDark;
        ctx.fillRect(-7 * S, -13 * S, 14 * S, 6 * S);
        // メイン水色（または赤）ボディ
        ctx.fillStyle = cBodyMain;
        ctx.fillRect(-6 * S, -15 * S, 12 * S, 6 * S);
        ctx.fillRect(-8 * S, -12 * S, 4 * S, 3 * S); // 前方砲口ノーズ
        // 上面ハイライト
        ctx.fillStyle = cBodyLight;
        ctx.fillRect(-5 * S, -15 * S, 9 * S, 2 * S);

        // 3. 中央のオレンジ色キャノピーアイ＆砲身ディテール
        ctx.fillStyle = '#090d16';
        ctx.fillRect(-5 * S, -13 * S, 6 * S, 3 * S);
        ctx.fillStyle = cLegMain;
        ctx.fillRect(-4 * S, -12.5 * S, 4 * S, 2 * S);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3.5 * S, -12.5 * S, 1.5 * S, 1 * S);

        // 4. 手前側の逆関節脚（鮮やかなオレンジ色）
        ctx.strokeStyle = cLegMain;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(5 + stride * 0.6, -8);
        ctx.lineTo(1 + stride, -1);
        ctx.stroke();
        // 関節リベット
        ctx.fillStyle = cBodyLight;
        ctx.fillRect(3 + stride * 0.6, -10, 3, 3);
        // 足先の爪パッド
        ctx.fillStyle = cLegMain;
        ctx.fillRect(-4 + stride, -3, 10, 3);

        ctx.restore();
    }
}

// ------------------------------------------
// ダグム / スクランブルハッチ (HatcherEnemy: 1985年アーケード版完全準拠)
// 地形に埋め込まれたドーム型スクランブルハッチ。
// 左右のシャッターが観音開きに展開し、中から「ラッシュ（Rusha）」編隊が垂直発進→自機Y座標で水平突撃！
// ※ミサイルが直撃すると本家同様一撃で破壊可能！
// ------------------------------------------
class HatcherEnemy extends Enemy {
    constructor(x, y, isCeiling, isRed = false) {
        super(x, y, isRed);
        this.width = 56;
        this.height = 30;
        this.isCeiling = isCeiling;
        this.hp = 6;
        this.spawnTimer = 30;
        this.groundY = y;
        this.hatchOpen = false;
        this.openRatio = 0; // 0.0(閉) 〜 1.0(全開)
    }

    update() {
        if (typeof levelManager !== 'undefined' && levelManager.stage === 2 && typeof stonehengeStage !== 'undefined' && stonehengeStage && stonehengeStage.active) {
            this.x -= stonehengeStage.scrollSpeed;
        } else if (typeof levelManager !== 'undefined' && levelManager.stage === 4 && window.stage4 && window.stage4.terrain && window.stage4.terrain.wallActive) {
            this.x -= window.stage4.terrain.scrollSpeed;
            const centerX = this.x + this.width / 2;
            if (this.isCeiling) {
                this.groundY = window.stage4.terrain.getTopY(centerX);
                this.y = this.groundY;
            } else {
                this.groundY = window.stage4.terrain.getBottomY(centerX);
                this.y = this.groundY - this.height;
            }
        } else if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.active) {
            this.x -= levelManager.terrain.scrollSpeed;
            const centerX = this.x + this.width / 2;
            if (this.isCeiling) {
                this.groundY = levelManager.terrain.getTopY(centerX);
                this.y = this.groundY;
            } else {
                this.groundY = levelManager.terrain.getBottomY(centerX);
                this.y = this.groundY - this.height;
            }
        } else {
            this.x -= this.speed;
        }

        this.spawnTimer++;
        if (this.spawnTimer >= 70 && this.spawnTimer <= 155) {
            this.hatchOpen = true;
            this.openRatio = Math.min(1, this.openRatio + 0.12);
            // 16フレームおきに4〜5機のラッシュ（スクランブル戦闘機）を垂直発進！
            if (this.spawnTimer % 16 === 0 && this.x > 20 && this.x < 780) {
                if (typeof enemies !== 'undefined') {
                    const by = this.isCeiling ? this.groundY + 14 : this.groundY - 24;
                    enemies.push(new BlasterEnemy(this.x + this.width / 2 - 14, by, this.isCeiling));
                }
            }
        } else {
            this.hatchOpen = false;
            this.openRatio = Math.max(0, this.openRatio - 0.10);
            if (this.spawnTimer >= 210) {
                this.spawnTimer = 0;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(Math.round(this.x + this.width / 2), Math.round(this.groundY));
        if (this.isCeiling) ctx.scale(1, -1);

        // 1985年アーケード版「ダグム（ハッチ）」のドーム型金属格納庫＆赤熱コア内部
        // 1. 格納庫内部の暗黒ピット＆オレンジ赤熱発進カタパルト
        ctx.fillStyle = '#090d16';
        ctx.fillRect(-20, -24, 40, 24);

        if (this.openRatio > 0.05) {
            const glowGrad = ctx.createLinearGradient(0, -22, 0, -2);
            glowGrad.addColorStop(0.0, '#fde047');
            glowGrad.addColorStop(0.5, '#ef4444');
            glowGrad.addColorStop(1.0, '#7f1d1d');
            ctx.fillStyle = glowGrad;
            const innerW = Math.round(28 * this.openRatio);
            ctx.fillRect(-innerW / 2, -20, innerW, 18);

            // 内部メカスリット格子
            ctx.fillStyle = '#450a0a';
            for (let gy = -17; gy <= -6; gy += 5) {
                ctx.fillRect(-innerW / 2, gy, innerW, 2);
            }
        }

        // 2. 左右の台形ベースブロック（地形に密着する金属フレーム）
        const cFrameMain = this.isRed ? '#ef4444' : '#94a3b8';
        const cFrameDark = this.isRed ? '#7f1d1d' : '#334155';
        const cFrameLight = this.isRed ? '#fecdd3' : '#e2e8f0';

        // 左ベース
        ctx.fillStyle = cFrameDark;
        ctx.beginPath();
        ctx.moveTo(-28, 0);
        ctx.lineTo(-22, -16);
        ctx.lineTo(-14, -16);
        ctx.lineTo(-14, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = cFrameMain;
        ctx.fillRect(-24, -12, 8, 10);

        // 右ベース
        ctx.fillStyle = cFrameDark;
        ctx.beginPath();
        ctx.moveTo(28, 0);
        ctx.lineTo(22, -16);
        ctx.lineTo(14, -16);
        ctx.lineTo(14, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = cFrameMain;
        ctx.fillRect(16, -12, 8, 10);

        // 3. 左右に観音開きするドームシャッター扉
        const slideX = this.openRatio * 12;
        const tiltAng = this.openRatio * 0.45;

        // 左シャッター扉
        ctx.save();
        ctx.translate(-14 - slideX * 0.4, -14);
        ctx.rotate(-tiltAng);
        ctx.fillStyle = cFrameMain;
        ctx.beginPath();
        ctx.moveTo(-6, 12);
        ctx.lineTo(-4, -10);
        ctx.lineTo(14, -12);
        ctx.lineTo(14, 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = cFrameLight;
        ctx.fillRect(-2, -10, 14, 3);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-4, -10, 18, 22);
        ctx.restore();

        // 右シャッター扉
        ctx.save();
        ctx.translate(14 + slideX * 0.4, -14);
        ctx.rotate(tiltAng);
        ctx.fillStyle = cFrameMain;
        ctx.beginPath();
        ctx.moveTo(6, 12);
        ctx.lineTo(4, -10);
        ctx.lineTo(-14, -12);
        ctx.lineTo(-14, 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = cFrameLight;
        ctx.fillRect(-12, -10, 14, 3);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-14, -10, 18, 22);
        ctx.restore();

        // 接地ベースライン
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-28, -3, 56, 3);

        ctx.restore();
    }
}

// ------------------------------------------
// ラッシュ / スクランブル戦闘機 (BlasterEnemy / Rusha: 1985年アーケード版完全準拠)
// ハッチ（ダグム）から真上（天井ハッチなら真下）へ垂直に飛び出し、
// 自機（ビックバイパー）のY座標と同じ高さに到達すると直角に折れ曲がって左へ高速水平突撃する！
// ------------------------------------------
class BlasterEnemy extends Enemy {
    constructor(x, y, isCeiling) {
        super(x, y);
        this.width = 28;
        this.height = 22;
        this.hp = 1;
        this.isCeiling = isCeiling;
        this.phase = 'LAUNCH'; // 'LAUNCH' (垂直発進) -> 'RUSH' (水平突撃)
        this.speedX = -0.8;
        this.speedY = isCeiling ? 3.2 : -3.2;
        this.launchTimer = 0;
    }

    update() {
        this.animTimer += 0.25;
        if (this.phase === 'LAUNCH') {
            this.launchTimer++;
            this.x += this.speedX;
            this.y += this.speedY;

            // 自機のY座標と一致するか、一定高度に達したら水平突撃へ移行！
            let shouldTurn = (this.launchTimer >= 42);
            if (typeof player !== 'undefined' && player) {
                const py = player.y + player.height / 2;
                const cy = this.y + this.height / 2;
                if (this.isCeiling && cy >= py - 8) shouldTurn = true;
                if (!this.isCeiling && cy <= py + 8) shouldTurn = true;
            }
            if (this.launchTimer > 10 && shouldTurn) {
                this.phase = 'RUSH';
                this.speedX = -4.6;
                this.speedY = 0;
            }
        } else {
            this.x += this.speedX;
            this.y += this.speedY;
        }
    }

    draw(ctx) {
        ctx.save();
        const cx = Math.round(this.x + this.width / 2);
        const cy = Math.round(this.y + this.height / 2);
        ctx.translate(cx, cy);

        // 垂直発進中は上（または下）を向き、水平突撃時は左を向く本家「ラッシュ」スプライト！
        if (this.phase === 'LAUNCH') {
            ctx.rotate(this.isCeiling ? -Math.PI / 2 : Math.PI / 2);
        }

        const S = 2;
        // 1985年アーケード版「ラッシュ」：シャープな小型デルタ迎撃機（青白＆オレンジバーニア）
        ctx.fillStyle = '#0369a1';
        ctx.fillRect(-4 * S, -5 * S, 9 * S, 10 * S);
        ctx.fillStyle = '#7dd3fc';
        ctx.fillRect(-6 * S, -3 * S, 11 * S, 6 * S);
        ctx.fillStyle = '#f0f9ff';
        ctx.fillRect(-7 * S, -1.5 * S, 9 * S, 3 * S);

        // レーザーキャノピー（オレンジ発光）
        ctx.fillStyle = '#f97316';
        ctx.fillRect(-2 * S, -1.5 * S, 3 * S, 3 * S);

        // 後部ツインバーニア噴射
        const flame = (Math.floor(this.animTimer * 2) % 2 === 0) ? 4 : 2;
        ctx.fillStyle = '#fde047';
        ctx.fillRect(5 * S, -2 * S, flame, 4 * S);

        ctx.restore();
    }
}

// ------------------------------------------
// ルグル (RugraEnemy / Ruguru: 1985年アーケード版完全準拠)
// 前方から編隊で飛来し、自機のY座標をしつこく上下にホーミング追尾してくる標準戦闘機！
// 赤いルグルは撃破すると確実にパワーアップカプセルをドロップ！
// ------------------------------------------
class RugraEnemy extends Enemy {
    constructor(x, y, isRed = false, delay = 0) {
        super(x, y, isRed);
        this.width = 38;
        this.height = 26;
        this.delay = delay;
        this.visible = (delay <= 0);
        this.vx = -3.1;
        this.vy = 0;
    }

    update() {
        if (this.delay > 0) {
            this.delay--;
            if (this.delay <= 0) {
                this.visible = true;
                this.x = 820;
            }
            return;
        }

        this.animTimer += 0.22;
        this.x += this.vx;

        // 自機のY座標を滑らかに追尾する本家「ルグル」のホーミング挙動
        if (typeof player !== 'undefined' && player && this.x > player.x - 40) {
            const targetY = player.y + player.height / 2 - this.height / 2;
            const dy = targetY - this.y;
            if (Math.abs(dy) > 4) {
                this.vy += (dy > 0 ? 0.14 : -0.14);
                this.vy = Math.max(-2.1, Math.min(2.1, this.vy));
            } else {
                this.vy *= 0.9;
            }
        }
        this.y += this.vy;

        // 地形との干渉回避
        if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.active) {
            const cx = this.x + this.width / 2;
            const topY = levelManager.terrain.getTopY(cx);
            const botY = levelManager.terrain.getBottomY(cx);
            if (topY > 0 && this.y < topY + 8) {
                this.y = topY + 8;
                this.vy = Math.max(0, this.vy);
            }
            if (botY < 600 && this.y + this.height > botY - 8) {
                this.y = botY - 8 - this.height;
                this.vy = Math.min(0, this.vy);
            }
        }
    }

    draw(ctx) {
        if (!this.visible) return;
        ctx.save();
        const cx = Math.round(this.x + this.width / 2);
        const cy = Math.round(this.y + this.height / 2);
        ctx.translate(cx, cy);

        const S = 2;
        // 1985年アーケード版「ルグル」：二股に分かれた鋭いノーズと前進翼を持つゼロス軍主力戦闘機！
        const cLight = this.isRed ? '#fecdd3' : '#e0f2fe';
        const cMain  = this.isRed ? '#ef4444' : '#60a5fa';
        const cDark  = this.isRed ? '#991b1b' : '#1d4ed8';
        const cCore  = this.isRed ? '#fde047' : '#f97316';

        // 上下ウイング暗部
        ctx.fillStyle = cDark;
        ctx.fillRect(-5 * S, -6 * S, 11 * S, 12 * S);
        // 前方に突き出たツインノーズ＆主翼
        ctx.fillStyle = cMain;
        ctx.fillRect(-9 * S, -4 * S, 15 * S, 3 * S);
        ctx.fillRect(-9 * S, 1 * S, 15 * S, 3 * S);
        ctx.fillRect(-4 * S, -2 * S, 11 * S, 4 * S);
        // ハイライトライン
        ctx.fillStyle = cLight;
        ctx.fillRect(-8 * S, -3 * S, 10 * S, 1 * S);
        ctx.fillRect(-8 * S, 1 * S, 10 * S, 1 * S);

        // 中央コックピットコア
        ctx.fillStyle = cCore;
        ctx.fillRect(-2 * S, -1.5 * S, 4 * S, 3 * S);

        // 後部スラスター炎
        const flame = (Math.floor(this.animTimer * 2) % 2 === 0) ? 6 : 3;
        ctx.fillStyle = '#fde047';
        ctx.fillRect(6 * S, -2 * S, flame, 4 * S);

        ctx.restore();
    }
}

// ------------------------------------------
// 火山 (Volcano) ＆ 火山弾 (VolcanoRock: 大きく放物線)
// ------------------------------------------
class Volcano extends Enemy {
    constructor(x, y, isErupting = true) {
        super(x, y);
        this.width = 128;
        this.height = 84;
        this.groundY = y;
        this.burstTimer = 0;
        this.isErupting = isErupting;
        this.magmaAnim = Math.random() * 10;
        this.hp = 99999; // 破壊不能な火山地形ギミック
    }

    update() {
        if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.active) {
            this.x -= levelManager.terrain.scrollSpeed;
            this.groundY = levelManager.terrain.getBottomY(this.x + this.width / 2);
            this.y = this.groundY - this.height;
        } else {
            this.x -= this.speed;
        }

        this.magmaAnim += 0.14;

        // 1985年アーケード版：クライマックスの火山大噴火フェーズ（VOLCANO_ERUPTION）または噴火有効時に火山弾を噴出！
        const isEruptPhase = (typeof levelManager !== 'undefined' && levelManager.state === 'VOLCANO_ERUPTION');
        if ((this.isErupting || isEruptPhase) && this.x > -40 && this.x < 780) {
            this.burstTimer++;
            const interval = isEruptPhase ? 16 : 24;
            if (this.burstTimer >= interval) {
                this.burstTimer = 0;
                if (typeof enemies !== 'undefined') {
                    const count = isEruptPhase ? (Math.random() < 0.65 ? 2 : 1) : 1;
                    for (let i = 0; i < count; i++) {
                        // 火口から左右（特に左側の自機方向）へ豪快な放物線を描いて降り注ぐ火山弾！
                        const vx = (Math.random() - 0.64) * 5.2 - 0.8;
                        const vy = -(Math.random() * 4.2 + 6.4);
                        const size = Math.floor(Math.random() * 10) + 22; // 22〜32px
                        enemies.push(new VolcanoRock(
                            this.x + this.width / 2 + (Math.random() - 0.5) * 20 - size / 2,
                            this.groundY - this.height + 4,
                            vx,
                            vy,
                            size
                        ));
                    }
                    if (typeof particles !== 'undefined') {
                        for (let p = 0; p < 3; p++) {
                            particles.push(new Particle(this.x + this.width / 2, this.groundY - this.height + 4, Math.random() < 0.5 ? '#ff4400' : '#b45309'));
                        }
                    }
                }
            }
        }
    }

    checkCollision(rect) {
        if (!this.active) return false;
        if (rect.x + rect.width < this.x + 12 || rect.x > this.x + this.width - 12) return false;
        if (rect.y + rect.height < this.y + 6) return false;
        const midX = this.x + this.width / 2;
        const relX = Math.abs((rect.x + rect.width / 2) - midX);
        const topHalf = 22;
        const baseHalf = this.width / 2 - 8;
        const ratio = Math.max(0, Math.min(1, (relX - topHalf) / (baseHalf - topHalf)));
        const slopeY = (this.groundY - this.height + 6) + ratio * (this.height - 6);
        return (rect.y + rect.height >= slopeY);
    }

    draw(ctx) {
        ctx.save();
        const cx = Math.round(this.x + this.width / 2);
        const gy = Math.round(this.groundY);
        ctx.translate(cx, gy);

        const h = this.height;
        const w2 = this.width / 2;
        const isEruptPhase = (typeof levelManager !== 'undefined' && levelManager.state === 'VOLCANO_ERUPTION');

        // 1985年アーケード版1面クライマックスの「二連火山」：
        // 茶褐色〜黄土色の階段状ドット絵の稜線と縦スジの岩肌を持つ火山コーン！
        ctx.fillStyle = '#381800';
        ctx.beginPath();
        ctx.moveTo(-w2, 4);
        ctx.lineTo(-24, -h);
        ctx.lineTo(24, -h);
        ctx.lineTo(w2, 4);
        ctx.closePath();
        ctx.fill();

        // 段々になったピクセル山肌レイヤー
        const steps = 10;
        for (let i = 0; i < steps; i++) {
            const t0 = i / steps;
            const t1 = (i + 1) / steps;
            const y0 = Math.round(-h + t0 * h);
            const y1 = Math.round(-h + t1 * h) + 2;
            const hw0 = Math.round(22 + t0 * (w2 - 22));
            // 外枠の暗褐色
            ctx.fillStyle = '#5c2804';
            ctx.fillRect(-hw0, y0, hw0 * 2, y1 - y0);
            // 内側の中間茶色
            ctx.fillStyle = '#9c4c14';
            ctx.fillRect(-hw0 + 6, y0, (hw0 - 6) * 2, y1 - y0);
            // 中央ハイライト（黄土色〜オレンジブラウンの縦畝）
            ctx.fillStyle = '#d07828';
            ctx.fillRect(-hw0 + 14, y0, Math.max(8, (hw0 - 18) * 1.2), y1 - y0);
            // 縦の岩盤溝（黒褐色のストライプ）
            ctx.fillStyle = '#381800';
            for (let sx = -hw0 + 10; sx < hw0 - 8; sx += 12) {
                ctx.fillRect(sx, y0, 3, y1 - y0);
            }
        }

        // 火口リム（噴火中は赤〜黄色に明滅）
        const flash = (isEruptPhase || this.isErupting) && (Math.floor(this.magmaAnim * 2) % 2 === 0);
        ctx.fillStyle = flash ? '#f8b830' : '#d86818';
        ctx.fillRect(-24, -h, 48, 6);
        ctx.fillStyle = flash ? '#ff3300' : '#7c2400';
        ctx.fillRect(-18, -h + 2, 36, 6);
        ctx.fillStyle = '#240800';
        ctx.fillRect(-12, -h + 5, 24, 5);

        ctx.restore();
    }
}
// 超巨大火山 (SuperVolcano: 互換維持用)
// ------------------------------------------
class SuperVolcano extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.width = 210;
        this.height = 140;
        this.groundY = y;
        this.burstTimer = 0;
        this.erupting = false;
        this.magmaAnim = 0;
        this.hp = 99999;
        this.targetX = 500; // 画面中央やや右に陣取る
        this.positioned = false;
    }

    startMajorEruption() {
        this.erupting = true;
        this.burstTimer = 0;
    }

    stopEruption() {
        this.erupting = false;
    }

    update() {
        let scrollSpeed = 0;
        if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.scrollSpeed > 0) {
            scrollSpeed = levelManager.terrain.scrollSpeed;
        }

        if (!this.positioned) {
            const speed = scrollSpeed > 0 ? scrollSpeed : 2.5;
            this.x -= speed;
            if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.active) {
                this.groundY = levelManager.terrain.getBottomY(this.x + this.width / 2);
            }
            this.y = this.groundY - this.height;
            if (this.x <= this.targetX) {
                this.x = this.targetX;
                this.positioned = true;
            }
        } else if (!this.erupting) {
            let exitSpeed = Math.max(scrollSpeed, 4.5);
            if (typeof levelManager !== 'undefined' && (levelManager.state === 'BOSS' || levelManager.state === 'STAGE_CLEAR')) {
                exitSpeed = Math.max(exitSpeed, 6.0);
            }
            this.x -= exitSpeed;
            if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.active) {
                this.groundY = levelManager.terrain.getBottomY(this.x + this.width / 2);
            }
            this.y = this.groundY - this.height;
            if (this.x + this.width < -50) {
                this.active = false;
                if (typeof levelManager !== 'undefined' && levelManager.superVolcano === this) {
                    levelManager.superVolcano = null;
                }
            }
        }

        this.magmaAnim += 0.16;

        if (this.erupting) {
            this.burstTimer++;
            if (this.burstTimer > 11) {
                this.burstTimer = 0;
                if (typeof enemies !== 'undefined') {
                    const count = Math.floor(Math.random() * 4) + 3;
                    const craterY = this.groundY - this.height + 6;
                    for (let i = 0; i < count; i++) {
                        const sizes = [18, 24, 30];
                        const s = sizes[Math.floor(Math.random() * sizes.length)];
                        const vx = (Math.random() - 0.72) * 6.5 - 1.2;
                        const vy = - (Math.random() * 6.2 + 6.8);
                        const spawnX = this.x + this.width / 2 + (Math.random() - 0.5) * 45;
                        enemies.push(new VolcanoRock(spawnX, craterY, vx, vy, s));
                    }
                }
            }
        }
    }

    checkCollision(rect) {
        if (!this.active) return false;
        if (rect.x + rect.width < this.x || rect.x > this.x + this.width) return false;
        if (rect.y + rect.height < this.y) return false;
        const midX = this.x + this.width / 2;
        const relX = Math.abs((rect.x + rect.width / 2) - midX);
        const slopeY = this.groundY - this.height * (1 - Math.max(0, (relX - 40) / (this.width / 2 - 40)));
        return (rect.y + rect.height >= slopeY);
    }

    draw(ctx) {
        Volcano.prototype.draw.call(this, ctx);
    }
}

class VolcanoRock extends Enemy {
    constructor(x, y, vx, vy, size = 24) {
        super(x, y);
        this.size = size;
        this.width = size;
        this.height = size;
        this.vx = vx;
        this.vy = vy;
        this.gravity = 0.13; // 本家アーケード版のゆったりとした放物線軌道
        this.hp = 1; // ショット・レーザー・オプションで小気味よく破壊可能！
        this.rot = 0;
        this.rotSpd = (Math.random() < 0.5 ? 1 : -1) * 0.12;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.rot += this.rotSpd;

        // 画面外または上下地形接触で消滅
        if (this.y > 620 || this.x < -120 || this.x > 950) {
            this.active = false;
            return;
        }

        if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.active) {
            const cx = this.x + this.width / 2;
            const ground = levelManager.terrain.getBottomY(cx);
            const ceiling = levelManager.terrain.getTopY(cx);
            if (this.vy > 0 && this.y + this.height >= ground) {
                this.active = false;
            } else if (this.vy < 0 && ceiling > 0 && this.y <= ceiling) {
                this.active = false;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        const cx = Math.round(this.x + this.width / 2);
        const cy = Math.round(this.y + this.height / 2);
        ctx.translate(cx, cy);

        // 1985年アーケード版のドット絵「火山弾（岩塊）」：
        // 茶褐色〜オレンジ黄土色のゴツゴツしたピクセル岩塊が90度単位で回転しながら飛来する！
        const stepRot = Math.floor(this.rot * 2) * (Math.PI / 2);
        ctx.rotate(stepRot);

        const s = Math.max(2, Math.round(this.size / 12));
        // 暗褐色の外郭シルエット
        ctx.fillStyle = '#481c04';
        ctx.fillRect(-5 * s, -4 * s, 10 * s, 8 * s);
        ctx.fillRect(-4 * s, -5 * s, 8 * s, 10 * s);

        // 中間茶色の岩肌
        ctx.fillStyle = '#9c4c14';
        ctx.fillRect(-4 * s, -4 * s, 8 * s, 7 * s);
        ctx.fillRect(-3 * s, -4 * s, 7 * s, 8 * s);

        // 明部（オレンジ黄土色の細胞状ハイライト）
        ctx.fillStyle = '#df8428';
        ctx.fillRect(-3 * s, -3 * s, 3 * s, 3 * s);
        ctx.fillRect(1 * s, -2 * s, 2 * s, 3 * s);
        ctx.fillRect(-2 * s, 1 * s, 3 * s, 2 * s);

        // 最も明るい黄色のハイライトドット
        ctx.fillStyle = '#f8c850';
        ctx.fillRect(-2 * s, -3 * s, 2 * s, 1 * s);
        ctx.fillRect(1 * s, -1 * s, 1 * s, 1 * s);

        // 岩の亀裂（黒ドット）
        ctx.fillStyle = '#240c00';
        ctx.fillRect(0, -1 * s, 1 * s, 2 * s);
        ctx.fillRect(-2 * s, 0, 2 * s, 1 * s);

        ctx.restore();
    }
}

// ------------------------------------------
// 砲台 (TurretEnemy / ディー01: 1985年アーケード版完全準拠)
// 地形や浮き岩に設置された固定砲台。自機の方向に応じて段階的に砲身の角度を変え、白い敵弾を発射！
// ------------------------------------------
class TurretEnemy extends Enemy {
    constructor(x, y, isCeiling, isRed = false, parentIsland = null, relX = 0) {
        super(x, y, isRed);
        this.width = 32;
        this.height = 28;
        this.isCeiling = isCeiling;
        this.parentIsland = parentIsland;
        this.relX = relX;
        this.shootTimer = Math.floor(Math.random() * 55) + 25;
        this.hp = 1;
        this.slopeAngle = 0;
        this.groundY = y;
        this.barrelAngle = Math.PI;
    }

    update() {
        if (this.parentIsland) {
            if (!this.parentIsland.active) {
                this.active = false;
                return;
            }
            this.x = this.parentIsland.x + this.relX;
            if (this.isCeiling) {
                this.groundY = this.parentIsland.y + this.parentIsland.height;
                this.y = this.groundY;
            } else {
                this.groundY = this.parentIsland.y;
                this.y = this.groundY - this.height;
            }
            this.slopeAngle = 0;
        } else if (typeof levelManager !== 'undefined' && levelManager.stage === 2 && typeof stonehengeStage !== 'undefined' && stonehengeStage && stonehengeStage.active) {
            this.x -= stonehengeStage.scrollSpeed;
        } else if (typeof levelManager !== 'undefined' && levelManager.stage === 4 && window.stage4 && window.stage4.terrain && window.stage4.terrain.wallActive) {
            this.x -= window.stage4.terrain.scrollSpeed;
            const centerX = this.x + this.width / 2;
            const yC = this.isCeiling ? window.stage4.terrain.getTopY(centerX) : window.stage4.terrain.getBottomY(centerX);
            this.groundY = yC;
            this.y = this.isCeiling ? yC : (yC - this.height);
            this.slopeAngle = 0;
        } else if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.active) {
            this.x -= levelManager.terrain.scrollSpeed;
            const centerX = this.x + this.width / 2;
            const yC = this.isCeiling ? levelManager.terrain.getTopY(centerX) : levelManager.terrain.getBottomY(centerX);
            this.groundY = yC;
            this.y = this.isCeiling ? yC : (yC - this.height);
            this.slopeAngle = 0;
        } else {
            this.x -= this.speed;
        }

        // 自機方向への段階的砲身トラッキング（本家ディー01の5段階アングル）
        if (typeof player !== 'undefined' && player) {
            const centerX = this.x + this.width / 2;
            const centerY = this.isCeiling ? this.groundY + 12 : this.groundY - 12;
            const rawAngle = Math.atan2((player.y + player.height / 2) - centerY, (player.x + player.width / 2) - centerX);
            // 15度刻みにクォンタイズしてアーケードらしい段階旋回にする
            const step = Math.PI / 8;
            this.barrelAngle = Math.round(rawAngle / step) * step;
        }

        this.shootTimer++;
        if (this.shootTimer > 135) {
            this.shootTimer = 0;
            this.shoot();
        }
    }

    shoot() {
        if (typeof player === 'undefined' || typeof enemyBullets === 'undefined') return;
        if (this.x < 20 || this.x > 770) return;
        const centerX = this.x + this.width / 2;
        const centerY = this.isCeiling ? this.groundY + 14 : this.groundY - 14;

        const dx = (player.x + player.width / 2) - centerX;
        const dy = (player.y + player.height / 2) - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist < 640) {
            const speed = 3.2;
            const bullet = new EnemyBullet(centerX, centerY, (dx / dist) * speed, (dy / dist) * speed);
            enemyBullets.push(bullet);
        }
    }

    draw(ctx) {
        ctx.save();
        const centerX = Math.round(this.x + this.width / 2);
        const groundY = Math.round(this.groundY);
        ctx.translate(centerX, groundY);
        if (this.isCeiling) ctx.scale(1, -1);

        const S = 2;
        const cLight = this.isRed ? '#fecdd3' : '#e2e8f0';
        const cMain  = this.isRed ? '#ef4444' : '#94a3b8';
        const cDark  = this.isRed ? '#991b1b' : '#334155';
        const cCore  = this.isRed ? '#fde047' : '#38bdf8';

        // 1. 砲身（ドーム奥から段階的な角度で突き出るドット絵砲身）
        ctx.save();
        ctx.translate(0, -6 * S);
        const effectiveAngle = this.isCeiling ? -this.barrelAngle : this.barrelAngle;
        ctx.rotate(effectiveAngle);
        ctx.fillStyle = cDark;
        ctx.fillRect(2 * S, -2.5 * S, 11 * S, 5 * S);
        ctx.fillStyle = cMain;
        ctx.fillRect(2 * S, -1.5 * S, 10 * S, 3 * S);
        ctx.fillStyle = cLight;
        ctx.fillRect(3 * S, -1.5 * S, 8 * S, 1 * S);
        // 砲口リング
        ctx.fillStyle = cLight;
        ctx.fillRect(11 * S, -2.5 * S, 2 * S, 5 * S);
        ctx.restore();

        // 2. 階段状の台座マウント（接地ベース）
        ctx.fillStyle = cDark;
        ctx.fillRect(-8 * S, -3 * S, 16 * S, 3 * S);
        ctx.fillStyle = cMain;
        ctx.fillRect(-7 * S, -3 * S, 14 * S, 2 * S);

        // 3. 半円ドーム型の装甲ボディ（1985年アーケード版「ディー01」）
        ctx.fillStyle = cDark;
        ctx.fillRect(-6 * S, -8 * S, 12 * S, 5 * S);
        ctx.fillRect(-4 * S, -10 * S, 8 * S, 2 * S);
        ctx.fillStyle = cMain;
        ctx.fillRect(-5 * S, -7 * S, 10 * S, 4 * S);
        ctx.fillRect(-3 * S, -9 * S, 6 * S, 2 * S);
        ctx.fillStyle = cLight;
        ctx.fillRect(-3 * S, -8 * S, 4 * S, 2 * S);

        // 中央のセンサーアイ
        ctx.fillStyle = cCore;
        ctx.fillRect(-1.5 * S, -6 * S, 3 * S, 2 * S);

        ctx.restore();
    }
}

// 浮遊大陸用レーザー砲台 (LaserTurretEnemy: 短いレーザーを放つハイテク重砲台)
class LaserTurretEnemy extends Enemy {
    constructor(parentIsland, relX, isCeiling = false) {
        super(0, 0);
        this.parentIsland = parentIsland;
        this.relX = relX;
        this.isCeiling = isCeiling; // false: 上面, true: 下面
        this.width = 42;
        this.height = 32;
        this.hp = 3;
        this.shootTimer = Math.floor(Math.random() * 60);
        this.barrelAngle = isCeiling ? Math.PI / 2 : -Math.PI / 2;
        this.updatePosition();
    }

    updatePosition() {
        if (this.parentIsland) {
            this.x = this.parentIsland.x + this.relX;
            if (this.isCeiling) {
                // 浮遊大陸の底面
                this.groundY = this.parentIsland.y + this.parentIsland.height;
                this.y = this.groundY;
            } else {
                // 浮遊大陸の上面
                this.groundY = this.parentIsland.y;
                this.y = this.groundY - this.height;
            }
        }
    }

    update() {
        this.updatePosition();

        if (this.parentIsland && !this.parentIsland.active) {
            this.active = false;
            return;
        }

        if (this.x < -120) {
            this.active = false;
            return;
        }

        // 自機方向への砲身トラッキング
        if (typeof player !== 'undefined') {
            const centerX = this.x + this.width / 2;
            const centerY = this.isCeiling ? this.groundY + 14 : this.groundY - 14;
            const targetAngle = Math.atan2(player.y - centerY, player.x - centerX);
            this.barrelAngle = targetAngle;
        }

        this.shootTimer++;
        if (this.shootTimer > 85) {
            this.shootTimer = 0;
            this.shoot();
        }
    }

    shoot() {
        if (typeof player === 'undefined' || typeof enemyBullets === 'undefined') return;
        const centerX = this.x + this.width / 2;
        const centerY = this.isCeiling ? this.groundY + 16 : this.groundY - 16;

        const dx = (player.x + player.width / 2) - centerX;
        const dy = (player.y + player.height / 2) - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist < 750) {
            const speed = 5.2; // レーザー特有のシャープな高速弾速
            const speedX = (dx / dist) * speed;
            const speedY = (dy / dist) * speed;

            // 砲身先端から発射
            const barrelLen = 26;
            const spawnX = centerX + Math.cos(this.barrelAngle) * barrelLen;
            const spawnY = centerY + Math.sin(this.barrelAngle) * barrelLen;

            if (typeof EnemyLaser !== 'undefined') {
                enemyBullets.push(new EnemyLaser(spawnX, spawnY, speedX, speedY, '#00ffff'));
            } else {
                enemyBullets.push(new EnemyBullet(spawnX, spawnY, speedX, speedY));
            }

            // マズルフラッシュ (シアンの光彩)
            if (typeof particles !== 'undefined') {
                for (let i = 0; i < 5; i++) {
                    particles.push(new Particle(spawnX, spawnY, '#00ffff'));
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        const centerX = this.x + this.width / 2;
        ctx.translate(centerX, this.groundY);
        if (this.isCeiling) ctx.scale(1, -1);

        // --- 1. ベースマウント（高輝度シルバーチタン＆シアンLED） ---
        const baseGrad = ctx.createLinearGradient(-24, 0, 24, 0);
        baseGrad.addColorStop(0.0, '#475569');
        baseGrad.addColorStop(0.3, '#cbd5e1');
        baseGrad.addColorStop(0.5, '#f8fafc');
        baseGrad.addColorStop(0.7, '#cbd5e1');
        baseGrad.addColorStop(1.0, '#334155');
        ctx.fillStyle = baseGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 24, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // --- 2. 旋回レーザー砲身 ---
        ctx.save();
        ctx.translate(0, -12);
        const drawAngle = this.isCeiling ? -this.barrelAngle : this.barrelAngle;
        ctx.rotate(drawAngle);

        // 砲身（ダブルバレル風のハイテクレーザーキャノン: シルバー＆シアン）
        const barrelGrad = ctx.createLinearGradient(0, -6, 26, 6);
        barrelGrad.addColorStop(0.0, '#64748b');
        barrelGrad.addColorStop(0.4, '#e2e8f0');
        barrelGrad.addColorStop(0.7, '#94a3b8');
        barrelGrad.addColorStop(1.0, '#334155');
        ctx.fillStyle = barrelGrad;
        ctx.fillRect(0, -6, 26, 12);

        // レーザー集束コイル（シアンの発光ライン）
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 8;
        ctx.fillRect(6, -7, 3, 14);
        ctx.fillRect(13, -7, 3, 14);
        ctx.fillRect(20, -7, 3, 14);
        ctx.shadowBlur = 0;

        // 砲口レンズ（白熱発光）
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(26, -5, 3, 10);

        ctx.restore();

        // --- 3. コントロール砲塔ドーム（クロームシルバー＆シアン追尾アイ） ---
        const domeGrad = ctx.createRadialGradient(-4, -18, 3, 0, -12, 16);
        domeGrad.addColorStop(0.0, '#ffffff');
        domeGrad.addColorStop(0.4, '#cbd5e1');
        domeGrad.addColorStop(0.8, '#64748b');
        domeGrad.addColorStop(1.0, '#1e293b');
        ctx.fillStyle = domeGrad;
        ctx.beginPath();
        ctx.arc(0, -12, 15, Math.PI, 0);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 光学アイ (鮮烈にシアン発光するセンサーアイ)
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, -12, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // レンズ中心ハイライト
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-1, -13, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// 浮遊大陸用新キャラ砲台のエイリアス
const LaserCannonTurret = LaserTurretEnemy;

// ==========================================
// STAGE 2 新キャラ1: 古代ルーン砲台 (RuneTurret)
// 壊れない石の上に鎮座する古代遺跡の防衛装置
// ==========================================
class RuneTurret extends Enemy {
    constructor(x, y, isCeiling = false, isRed = false) {
        super(x, y, isRed);
        this.width = 38;
        this.height = 32;
        this.isCeiling = isCeiling;
        this.shootTimer = Math.floor(Math.random() * 60);
        this.hp = 1; // 軽快に撃破してカプセル獲得
        this.groundY = y;
        this.barrelAngle = isCeiling ? Math.PI / 2 : -Math.PI / 2;
    }

    update() {
        // ステージ2のスクロール速度に連動
        const scrollSpeed = (typeof stonehengeStage !== 'undefined' && stonehengeStage) ? stonehengeStage.scrollSpeed : 1.5;
        this.x -= scrollSpeed;
        if (this.x < -100) {
            this.active = false;
            return;
        }

        // 自機追尾
        if (typeof player !== 'undefined') {
            const centerX = this.x + this.width / 2;
            const centerY = this.isCeiling ? this.y + 12 : this.y + this.height - 12;
            this.barrelAngle = Math.atan2(player.y - centerY, player.x - centerX);
        }

        this.shootTimer++;
        if (this.shootTimer > 150) {
            this.shootTimer = 0;
            this.shoot();
        }
    }

    shoot() {
        if (typeof player === 'undefined' || typeof enemyBullets === 'undefined') return;
        const centerX = this.x + this.width / 2;
        const centerY = this.isCeiling ? this.y + 14 : this.y + this.height - 14;

        const dx = (player.x + player.width / 2) - centerX;
        const dy = (player.y + player.height / 2) - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist < 650) {
            const speed = 4.2;
            // 赤敵は真紅の光弾、通常は紫色の古代ルーン光弾
            const bulletColor = this.isRed ? '#ff3366' : '#c084fc';
            enemyBullets.push(new Bullet(centerX, centerY, (dx / dist) * speed, (dy / dist) * speed, bulletColor, true));
            if (typeof particles !== 'undefined') {
                for (let i = 0; i < 4; i++) {
                    particles.push(new Particle(centerX, centerY, bulletColor));
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        const centerX = this.x + this.width / 2;
        const baseY = this.isCeiling ? this.y : this.y + this.height;
        ctx.translate(centerX, baseY);
        if (this.isCeiling) ctx.scale(1, -1);

        // 古代石柱マウント
        const baseGrad = ctx.createLinearGradient(-18, 0, 18, 0);
        if (this.isRed) {
            baseGrad.addColorStop(0.0, '#4a0410');
            baseGrad.addColorStop(0.5, '#9f1239');
            baseGrad.addColorStop(1.0, '#1e0208');
        } else {
            baseGrad.addColorStop(0.0, '#1e1b4b');
            baseGrad.addColorStop(0.5, '#4338ca');
            baseGrad.addColorStop(1.0, '#0f172a');
        }
        ctx.fillStyle = baseGrad;
        ctx.fillRect(-18, -8, 36, 8);
        ctx.strokeStyle = this.isRed ? '#fb7185' : '#818cf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(-18, -8, 36, 8);

        // 回転ルーン砲頭
        ctx.save();
        ctx.translate(0, -14);
        const drawAngle = this.isCeiling ? -this.barrelAngle : this.barrelAngle;
        ctx.rotate(drawAngle);

        // 砲身
        ctx.fillStyle = this.isRed ? '#e11d48' : '#6366f1';
        ctx.fillRect(0, -4, 20, 8);
        ctx.fillStyle = this.isRed ? '#ff6b81' : '#a855f7';
        ctx.fillRect(18, -5, 3, 10);
        ctx.restore();

        // ルーンクリスタルアイ
        ctx.shadowColor = this.isRed ? '#ff2255' : '#c084fc';
        ctx.shadowBlur = 8;
        ctx.fillStyle = this.isRed ? '#ffe4e6' : '#e9d5ff';
        ctx.beginPath();
        ctx.arc(0, -14, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ==========================================
// STAGE 2 新キャラ2: 浮遊古代ストーンアイ (StoneEyeEnemy)
// モアイ・古代石像の顔ドローン。イオンリング弾を吐く！
// ==========================================
class StoneEyeEnemy extends Enemy {
    constructor(x, y, isRed = false) {
        super(x, y, isRed);
        this.width = 38;
        this.height = 42;
        this.speed = 1.4;
        this.hp = 1; // 軽快に撃破してカプセル獲得
        this.shootTimer = Math.floor(Math.random() * 50);
        this.baseY = y;
        this.floatPhase = Math.random() * Math.PI * 2;
    }

    update() {
        this.x -= this.speed;
        this.floatPhase += 0.05;
        this.y = this.baseY + Math.sin(this.floatPhase) * 25; // ふわふわ浮遊

        if (this.x < -80) {
            this.active = false;
            return;
        }

        this.shootTimer++;
        if (this.shootTimer > 120) {
            this.shootTimer = 0;
            this.shoot();
        }
    }

    shoot() {
        if (typeof player === 'undefined' || typeof enemyBullets === 'undefined') return;
        const mouthX = this.x;
        const mouthY = this.y + this.height * 0.65;

        const dx = (player.x + player.width / 2) - mouthX;
        const dy = (player.y + player.height / 2) - mouthY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist < 650) {
            const speed = 3.6;
            // イオンリング弾（口から発射！）
            if (typeof RingBullet !== 'undefined') {
                enemyBullets.push(new RingBullet(mouthX, mouthY, (dx / dist) * speed, (dy / dist) * speed, '#38bdf8'));
            } else {
                enemyBullets.push(new Bullet(mouthX, mouthY, (dx / dist) * speed, (dy / dist) * speed, '#38bdf8', true));
            }

            if (typeof particles !== 'undefined') {
                for (let i = 0; i < 5; i++) {
                    particles.push(new Particle(mouthX, mouthY, '#38bdf8'));
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // 古代石像・モアイフェイス（立体陰影）
        const grad = ctx.createLinearGradient(0, 0, this.width, this.height);
        if (this.isRed) {
            grad.addColorStop(0.0, '#fda4af');
            grad.addColorStop(0.4, '#e11d48');
            grad.addColorStop(1.0, '#4c0519');
        } else {
            grad.addColorStop(0.0, '#94a3b8');
            grad.addColorStop(0.4, '#64748b');
            grad.addColorStop(1.0, '#1e293b');
        }
        ctx.fillStyle = grad;

        // モアイ形状ポリゴン
        ctx.beginPath();
        ctx.moveTo(8, 0); // 額
        ctx.lineTo(this.width, 4); // 後頭部
        ctx.lineTo(this.width - 4, this.height); // 顎裏
        ctx.lineTo(6, this.height); // 顎先
        ctx.lineTo(2, this.height * 0.7); // 唇
        ctx.lineTo(0, this.height * 0.45); // 鼻
        ctx.lineTo(6, this.height * 0.3); // 眉間
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = this.isRed ? '#881337' : '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 巨大な目（通常シアン・赤敵は黄金ゴールド）
        ctx.shadowColor = this.isRed ? '#fbbf24' : '#00ffff';
        ctx.shadowBlur = 6;
        ctx.fillStyle = this.isRed ? '#fef08a' : '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(14, this.height * 0.32, 5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(12, 14, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 口の溝
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(3, this.height * 0.65);
        ctx.lineTo(14, this.height * 0.65);
        ctx.stroke();

        ctx.restore();
    }
}

// ==========================================
// STAGE 2 新キャラ: 丸型ワープ兵器 (WarpSphereEnemy & WarpSquad)
// 宇宙空間の至る所から光の波紋とともにワープアウトして自機を強襲する球体ドローン
// ==========================================
class WarpSquad extends FormationBase {
    constructor(count = 4) {
        super(count);
        this.enemies = [];
        
        // 自機の周囲ランダム（前方・後方・上下）にワープイン配置
        for (let i = 0; i < count; i++) {
            const rx = 120 + Math.random() * 640;
            const ry = 80 + Math.random() * 440;
            const delay = i * 16;
            const isHoming = Math.random() < 0.65;
            const enemy = new WarpSphereEnemy(rx, ry, isHoming ? 'HOMING' : 'SHOOTER', this, delay);
            this.enemies.push(enemy);
            enemies.push(enemy);
        }
    }
}

class WarpSphereEnemy extends Enemy {
    constructor(x, y, behaviorType = 'HOMING', formation = null, delay = 0) {
        super(x, y);
        this.width = 38;
        this.height = 38;
        this.behaviorType = behaviorType; // 'HOMING' (高速追撃) or 'SHOOTER' (リング弾発射)
        this.formation = formation;
        this.delay = delay;
        this.hp = 2;
        this.state = 'WARPING'; // 'WARPING' -> 'ACTIVE'
        this.warpTimer = 0;
        this.warpDuration = 45; // 約0.75秒のワープイン演出
        this.activeTimer = 0;
        this.ringAngle = Math.random() * Math.PI * 2;
        this.shootTimer = Math.floor(Math.random() * 30);
    }

    update() {
        if (this.delay > 0) {
            this.delay--;
            return;
        }

        this.ringAngle += 0.09;

        if (this.state === 'WARPING') {
            this.warpTimer++;
            if (this.warpTimer >= this.warpDuration) {
                this.state = 'ACTIVE';
                // ワープ完了時のシアン光粒子
                if (typeof particles !== 'undefined') {
                    for (let i = 0; i < 8; i++) {
                        particles.push(new Particle(this.x + this.width / 2, this.y + this.height / 2, '#00ffff'));
                    }
                }
            }
            return;
        }

        this.activeTimer++;

        if (this.behaviorType === 'HOMING') {
            // 自機に向かってスムーズに加速旋回突進
            if (typeof player !== 'undefined') {
                const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
                const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    const spd = Math.min(4.8, 1.8 + this.activeTimer * 0.035);
                    this.x += (dx / dist) * spd - 0.8;
                    this.y += (dy / dist) * spd;
                }
            } else {
                this.x -= 3.2;
            }
        } else {
            // SHOOTER: 浮遊旋回しながら古代イオンリング弾を発射
            this.x -= 1.4;
            this.y += Math.sin(this.activeTimer * 0.06) * 1.8;

            this.shootTimer++;
            if (this.shootTimer > 65) {
                this.shootTimer = 0;
                this.shoot();
            }
        }

        if (this.x < -100 || this.x > 900 || this.y < -100 || this.y > 700) {
            if (this.activeTimer > 150) this.active = false;
        }
    }

    shoot() {
        if (typeof player === 'undefined' || typeof enemyBullets === 'undefined') return;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const dx = (player.x + player.width / 2) - cx;
        const dy = (player.y + player.height / 2) - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && typeof RingBullet !== 'undefined') {
            const spd = 4.4;
            enemyBullets.push(new RingBullet(cx, cy, (dx / dist) * spd, (dy / dist) * spd, '#38bdf8'));
        }
    }

    draw(ctx) {
        if (this.delay > 0) return;
        ctx.save();
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        if (this.state === 'WARPING') {
            // ワープイン演出（空間の光彩歪み＆拡大リング）
            const progress = this.warpTimer / this.warpDuration;
            const radius = 24 * Math.sin(progress * Math.PI);

            ctx.strokeStyle = `rgba(0, 255, 255, ${Math.sin(progress * Math.PI)})`;
            ctx.lineWidth = 3;
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = `rgba(255, 255, 255, ${Math.sin(progress * Math.PI)})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
            return;
        }

        // 実体化後の丸型ワープ兵器
        // 1. 周囲を高速回転するプラズマリング
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.ringAngle);
        ctx.strokeStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 23, 9, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 2. メタリック球体本体（3D光沢スフィア）
        const sphereGrad = ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, 18);
        sphereGrad.addColorStop(0.0, '#ffffff');
        sphereGrad.addColorStop(0.25, '#38bdf8');
        sphereGrad.addColorStop(0.65, '#0369a1');
        sphereGrad.addColorStop(1.0, '#0f172a');
        ctx.fillStyle = sphereGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 3. 発光センサーアイ
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 3, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}



