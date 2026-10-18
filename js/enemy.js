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

        // 1985年アーケード版「ファン (fan_arcade.jpg)」完全再現：
        // 丸みを帯びた3枚羽根（トリプルブレード）の銀青ラベンダー風車が滑らかに高速回転するドット造形
        const cLight = this.isRed ? '#ffd8d8' : '#e4ecff';
        const cMain  = this.isRed ? '#f04848' : '#8898c8';
        const cDark  = this.isRed ? '#981820' : '#485888';

        ctx.rotate(this.spinAngle);

        // 3枚の曲面風車ブレード（120度間隔）
        for (let b = 0; b < 3; b++) {
            ctx.save();
            ctx.rotate((b * Math.PI * 2) / 3);
            // ブレード外周シャドウ
            ctx.fillStyle = cDark;
            ctx.fillRect(-4, -14, 9, 11);
            ctx.fillRect(-2, -16, 6, 3);
            // ブレード中間メタリック層
            ctx.fillStyle = cMain;
            ctx.fillRect(-3, -14, 7, 9);
            ctx.fillRect(-5, -11, 3, 6);
            // ブレード先端・曲面ハイライト
            ctx.fillStyle = cLight;
            ctx.fillRect(-2, -13, 4, 5);
            ctx.fillRect(-4, -10, 2, 3);
            ctx.restore();
        }

        // 中央の丸いハブ＆ダークアイ（fan_arcade.jpgの中心孔）
        ctx.fillStyle = cMain;
        ctx.fillRect(-5, -5, 10, 10);
        ctx.fillStyle = cLight;
        ctx.fillRect(-4, -4, 6, 3);
        ctx.fillStyle = '#101424';
        ctx.fillRect(-2, -2, 4, 4);

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

        const stride = Math.round(Math.sin(this.walkCycle) * 5);

        // 1985年アーケード版「ダッカー (step_159_1.jpg)」完全再現：
        // 斜め45度に突き出たオレンジ（赤機は紅）の連装砲身レール＋白＆ブルーのメカポッド胴体＋2本の脚と接地ローラーパッド
        const cRailDark  = this.isRed ? '#881018' : '#884000';
        const cRailMain  = this.isRed ? '#e82838' : '#e08018';
        const cRailLight = this.isRed ? '#ff98a8' : '#f8c848';
        const cPodBlue   = this.isRed ? '#c82038' : '#3888e8';
        const cPodWhite  = '#e8f0ff';

        // 1. 奥側の脚＆接地パッド
        ctx.fillStyle = '#486898';
        ctx.fillRect(1 - stride, -12, 3, 10);
        ctx.fillStyle = cRailMain;
        ctx.fillRect(-3 - stride, -3, 9, 3);

        // 2. 中央の白＆ブルー装甲ポッド胴体
        ctx.fillStyle = '#203868';
        ctx.fillRect(-10, -21, 20, 11);
        ctx.fillStyle = cPodBlue;
        ctx.fillRect(-9, -20, 18, 9);
        ctx.fillStyle = cPodWhite;
        ctx.fillRect(-7, -19, 13, 5);
        // 中央の青いセンサースリット
        ctx.fillStyle = '#183058';
        ctx.fillRect(-5, -17, 7, 3);

        // 3. 斜め左上45度に構えた大型連装砲身レール (step_159_1.jpg の象徴的シルエット)
        ctx.fillStyle = cRailDark;
        ctx.fillRect(-16, -29, 14, 5);
        ctx.fillRect(-12, -25, 14, 5);
        ctx.fillStyle = cRailMain;
        ctx.fillRect(-15, -28, 12, 3);
        ctx.fillRect(-11, -24, 12, 3);
        ctx.fillStyle = cRailLight;
        ctx.fillRect(-14, -28, 8, 2);
        ctx.fillRect(-9, -23, 8, 1);

        // 4. 手前側の脚＆接地ホイールパッド
        ctx.fillStyle = cPodWhite;
        ctx.fillRect(-2 + stride, -13, 4, 10);
        ctx.fillStyle = cPodBlue;
        ctx.fillRect(-1 + stride, -12, 2, 8);
        ctx.fillStyle = cRailMain;
        ctx.fillRect(-5 + stride, -3, 10, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3 + stride, -3, 4, 1);

        ctx.restore();
    }
}

// ------------------------------------------
// 小型ストライプドーム (DomeEnemy: 参照画像 media_1792284490223_685b672c.jpg & sakura_03.png の赤ドーム・水色ドーム完全再現)
// 地表や中盤のひし形浮き岩の左斜面に設置されている縦縞ベース＋半円ドーム構造物。
// 破壊すると100点（赤ドームはカプセル確定ドロップ）、さらに一定間隔で自機方向へ敵弾を発射！
// ------------------------------------------
class DomeEnemy extends Enemy {
    constructor(x, y, isCeiling = false, isRed = false, parentIsland = null, relX = 0, relY = 0, mountSide = 'FLOOR') {
        super(x, y, isRed);
        this.width = 40;
        this.height = 30;
        this.isCeiling = isCeiling;
        this.parentIsland = parentIsland;
        this.relX = relX;
        this.relY = relY;
        this.mountSide = mountSide; // 'FLOOR', 'CEILING', 'LEFT_WALL' (sakura_03.png の浮き岩側面5連ドーム)
        this.hp = 1;
        this.groundY = y;
        this.shootTimer = Math.floor(Math.random() * 80) + 40;
    }

    update() {
        if (this.parentIsland) {
            if (!this.parentIsland.active) {
                this.active = false;
                return;
            }
            this.x = this.parentIsland.x + this.relX;
            this.y = this.parentIsland.y + this.relY;
            this.groundY = this.y + this.height;
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

        this.shootTimer++;
        if (this.shootTimer >= 150) {
            this.shootTimer = 0;
            if (typeof player !== 'undefined' && typeof enemyBullets !== 'undefined' && this.x > 40 && this.x < 760) {
                const cx = this.x + this.width / 2;
                const cy = this.y + this.height / 2;
                const dx = (player.x + player.width / 2) - cx;
                const dy = (player.y + player.height / 2) - cy;
                const dist = Math.hypot(dx, dy) || 1;
                if (dist < 620) {
                    enemyBullets.push(new EnemyBullet(cx, cy, (dx / dist) * 3.2, (dy / dist) * 3.2));
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        if (this.mountSide === 'LEFT_WALL') {
            // sakura_03.png：中央の巨大ひし形浮き岩の左斜面に横向き（左向き）に5基張り付く水色ドーム！
            const cx = Math.round(this.x + this.width);
            const cy = Math.round(this.y + this.height / 2);
            ctx.translate(cx, cy);
            ctx.rotate(-Math.PI / 2);
        } else {
            ctx.translate(Math.round(this.x + this.width / 2), Math.round(this.groundY));
            if (this.isCeiling) ctx.scale(1, -1);
        }

        // 参照画像の「赤ドーム」「水色ドーム」をドット単位で完全再現！
        // 1. 最下部の接地フランジ台座 (y = -4 〜 0)
        if (this.isRed) {
            ctx.fillStyle = '#284898';
            ctx.fillRect(-19, -4, 38, 4);
            ctx.fillStyle = '#6898e8';
            ctx.fillRect(-15, -4, 30, 2);
            ctx.fillStyle = '#d8e8ff';
            ctx.fillRect(-9, -3, 6, 2);
            ctx.fillRect(3, -3, 6, 2);
        } else {
            ctx.fillStyle = '#885408';
            ctx.fillRect(-19, -4, 38, 4);
            ctx.fillStyle = '#d89824';
            ctx.fillRect(-15, -4, 30, 2);
            ctx.fillStyle = '#f8d860';
            ctx.fillRect(-10, -3, 6, 2);
            ctx.fillRect(3, -3, 6, 2);
        }

        // 2. 縦ストライプ円筒ベース (y = -13 〜 -4)
        ctx.fillStyle = '#080c18';
        ctx.fillRect(-17, -13, 34, 9);

        const stripeX = [-14, -9, -4, 1, 6, 11];
        stripeX.forEach((sx, idx) => {
            ctx.fillStyle = (idx === 1 || idx === 3 || idx === 4) ? '#f0f8ff' : (this.isRed ? '#e84838' : '#58c8d8');
            ctx.fillRect(sx, -12, 3, 7);
            ctx.fillStyle = this.isRed ? '#5878c8' : '#388898';
            ctx.fillRect(sx + 2, -12, 1, 7);
        });

        // 3. ドーム中間の水平リング帯 (y = -15 〜 -13)
        ctx.fillStyle = '#182030';
        ctx.fillRect(-18, -15, 36, 2);
        ctx.fillStyle = this.isRed ? '#b83020' : '#287888';
        ctx.fillRect(-16, -14, 32, 1);

        // 4. 上部の半円球ドームキャップ (y = -28 〜 -15)
        const cEdge = this.isRed ? '#b82818' : '#207888';
        const cMid  = this.isRed ? '#ec5838' : '#48b8c8';
        const cHigh = this.isRed ? '#ff9878' : '#88e8f0';
        const cTop  = this.isRed ? '#fff0e8' : '#e0ffff';

        ctx.fillStyle = cEdge;
        ctx.fillRect(-17, -19, 34, 4);
        ctx.fillStyle = cMid;
        ctx.fillRect(-14, -19, 28, 4);

        ctx.fillStyle = cEdge;
        ctx.fillRect(-15, -23, 30, 4);
        ctx.fillStyle = cMid;
        ctx.fillRect(-12, -23, 24, 4);
        ctx.fillStyle = cHigh;
        ctx.fillRect(-8, -23, 16, 3);

        ctx.fillStyle = cMid;
        ctx.fillRect(-11, -26, 22, 3);
        ctx.fillStyle = cHigh;
        ctx.fillRect(-8, -26, 16, 3);
        ctx.fillStyle = cTop;
        ctx.fillRect(-5, -25, 10, 2);

        ctx.fillStyle = cHigh;
        ctx.fillRect(-7, -28, 14, 2);
        ctx.fillStyle = cTop;
        ctx.fillRect(-4, -28, 8, 2);

        ctx.restore();
    }
}

// ------------------------------------------
// ダグム / 大型スクランブルハッチ基地 (HatcherEnemy: dagumu.jpg & sakura_03.png 左上天井ハッチ完全再現)
// 天井や地面に埋め込まれた青銀＋オレンジ発光スリットの大型ワイド基地。
// 中央ハッチが開き、迎撃機「ラッシュ (BlasterEnemy)」が次々と垂直発進して自機の高さで水平突撃！
// ------------------------------------------
class HatcherEnemy extends Enemy {
    constructor(x, y, isCeiling, isRed = false) {
        super(x, y, isRed);
        this.width = 66;
        this.height = 28;
        this.isCeiling = isCeiling;
        this.hp = 4;
        this.spawnTimer = Math.floor(Math.random() * 25) + 20;
        this.groundY = y;
        this.hatchOpen = false;
        this.openRatio = 0;
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
        if (this.spawnTimer >= 45 && this.spawnTimer <= 135) {
            this.hatchOpen = true;
            this.openRatio = Math.min(1, this.openRatio + 0.14);
            // 20フレームおきにダグム中央格納庫から迎撃機「ラッシュ」を垂直発進！
            if (this.spawnTimer % 20 === 0 && this.x > 30 && this.x < 770) {
                if (typeof enemies !== 'undefined') {
                    const by = this.isCeiling ? this.groundY + 14 : this.groundY - 26;
                    enemies.push(new BlasterEnemy(this.x + this.width / 2 - 14, by, this.isCeiling));
                }
            }
        } else {
            this.hatchOpen = false;
            this.openRatio = Math.max(0, this.openRatio - 0.10);
            if (this.spawnTimer >= 190) {
                this.spawnTimer = 0;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(Math.round(this.x + this.width / 2), Math.round(this.groundY));
        if (this.isCeiling) ctx.scale(1, -1);

        // 1985年アーケード版「ダグム (dagumu.jpg / sakura_03.png)」完全再現：
        // ワイドな青銀メタリック台形ベース＋左右の縦型オレンジ発光スリット群＋中央発進格納庫
        const cBaseDark = this.isRed ? '#681018' : '#183868';
        const cBaseMain = this.isRed ? '#b82838' : '#3868a8';
        const cBaseHigh = this.isRed ? '#ff98a8' : '#98c8f8';
        const cRimWhite = '#e8f4ff';

        // 1. 接地ワイドフランジ (y = -8 〜 0)
        ctx.fillStyle = cBaseDark;
        ctx.fillRect(-32, -8, 64, 8);
        ctx.fillStyle = cBaseMain;
        ctx.fillRect(-30, -7, 60, 6);
        ctx.fillStyle = cRimWhite;
        ctx.fillRect(-28, -5, 56, 2);

        // 2. 中段・上段の台形装甲ブロック (y = -24 〜 -8)
        ctx.fillStyle = cBaseDark;
        ctx.fillRect(-26, -18, 52, 10);
        ctx.fillRect(-20, -25, 40, 7);
        ctx.fillStyle = cBaseMain;
        ctx.fillRect(-24, -17, 48, 9);
        ctx.fillRect(-18, -24, 36, 6);
        ctx.fillStyle = cBaseHigh;
        ctx.fillRect(-22, -16, 44, 3);
        ctx.fillRect(-16, -23, 32, 2);

        // 3. 左右に並ぶオレンジ＆ホワイトの縦型エネルギースリット (dagumu.jpg の特徴的ディテール)
        const ventPositions = [-21, -15, -9, 7, 13, 19];
        ventPositions.forEach((vx, idx) => {
            ctx.fillStyle = '#101420';
            ctx.fillRect(vx - 1, -21, 4, 13);
            ctx.fillStyle = (idx % 2 === 0) ? '#f88818' : '#f8d838';
            ctx.fillRect(vx, -20, 2, 11);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(vx, -18, 1, 5);
        });

        // 4. 中央の発進ベイ＆左右スライドハッチ扉
        const bayOpenW = Math.round(this.openRatio * 14);
        ctx.fillStyle = '#080c14';
        ctx.fillRect(-3 - bayOpenW / 2, -25, 6 + bayOpenW, 19);
        if (this.openRatio > 0.05) {
            ctx.fillStyle = '#d84800';
            ctx.fillRect(-bayOpenW / 2, -23, bayOpenW, 14);
            ctx.fillStyle = '#ffe860';
            ctx.fillRect(-Math.max(1, bayOpenW / 4), -21, Math.max(2, bayOpenW / 2), 10);
        }
        // ハッチ扉のエッジフレーム
        ctx.fillStyle = cRimWhite;
        ctx.fillRect(-5 - bayOpenW / 2, -26, 2, 18);
        ctx.fillRect(3 + bayOpenW / 2, -26, 2, 18);

        ctx.restore();
    }
}

// ------------------------------------------
// ラッシュ (BlasterEnemy / Rush: dagumu.jpg のダグムから発進する小型迎撃戦闘機完全再現)
// ダグムの中央格納庫から垂直に浮上（または降下）し、自機のY座標に並んだ瞬間に水平方向へ高速突撃！
// ------------------------------------------
class BlasterEnemy extends Enemy {
    constructor(x, y, isCeiling) {
        super(x, y);
        this.width = 28;
        this.height = 18;
        this.hp = 1;
        this.isCeiling = isCeiling;
        this.phase = 'LAUNCH'; // 'LAUNCH' (垂直発進) -> 'RUSH' (水平突撃)
        this.speedX = -0.8;
        this.speedY = isCeiling ? 2.5 : -2.5;
        this.launchTimer = 0;
    }

    update() {
        this.animTimer += 0.25;
        if (this.phase === 'LAUNCH') {
            this.launchTimer++;
            this.x += this.speedX;
            this.y += this.speedY;

            let shouldTurn = (this.launchTimer >= 52);
            if (typeof player !== 'undefined' && player) {
                const py = player.y + player.height / 2;
                const cy = this.y + this.height / 2;
                if (this.isCeiling && cy >= py - 6) shouldTurn = true;
                if (!this.isCeiling && cy <= py + 6) shouldTurn = true;
            }
            if (this.launchTimer > 10 && shouldTurn) {
                this.phase = 'RUSH';
                this.speedX = -4.4;
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

        // 1985年アーケード版「ラッシュ (dagumu.jpg)」完全再現：
        // 白銀＆ブルーグレーの双翼デルタカウル＋中央の鮮やかな赤オレンジ色コックピットコア
        // 1. 上下のシルバーブルーウイング
        ctx.fillStyle = '#385888';
        ctx.fillRect(-10, -8, 20, 16);
        ctx.fillStyle = '#88a8d8';
        ctx.fillRect(-12, -6, 22, 12);
        ctx.fillStyle = '#e8f4ff';
        ctx.fillRect(-8, -7, 14, 3);
        ctx.fillRect(-8, 4, 14, 3);

        // 2. 中央スリット＆オレンジレッドのエンジンコア
        ctx.fillStyle = '#101828';
        ctx.fillRect(-13, -3, 24, 6);
        ctx.fillStyle = '#e84818';
        ctx.fillRect(-9, -2, 14, 4);
        ctx.fillStyle = '#f8b830';
        ctx.fillRect(-6, -1, 8, 2);

        // 3. 後部スラスターハイライト
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(9, -2, 4, 4);

        ctx.restore();
    }
}

// ------------------------------------------
// ルグル (RugraEnemy / Ruguru: 参照画像の右側に飛来する銀青ツインノーズ戦闘機完全再現)
// 前方から飛来し、自機のY座標を追尾する丸みを帯びた二股カウル戦闘機！
// ------------------------------------------
class RugraEnemy extends Enemy {
    constructor(x, y, isRed = false, delay = 0) {
        super(x, y, isRed);
        this.width = 40;
        this.height = 28;
        this.delay = delay;
        this.visible = (delay <= 0);
        this.vx = -2.9;
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

        if (typeof player !== 'undefined' && player && this.x > player.x - 40) {
            const targetY = player.y + player.height / 2 - this.height / 2;
            const dy = targetY - this.y;
            if (Math.abs(dy) > 4) {
                this.vy += (dy > 0 ? 0.13 : -0.13);
                this.vy = Math.max(-2.0, Math.min(2.0, this.vy));
            } else {
                this.vy *= 0.9;
            }
        }
        this.y += this.vy;

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

        // 参照画像右側の「丸みを帯びた銀青色の上下カウル＋中央水平ゴールドバー」の敵機を完全再現！
        const cDark  = this.isRed ? '#881820' : '#405888';
        const cMain  = this.isRed ? '#e84848' : '#88a8d8';
        const cLight = this.isRed ? '#ffd0d0' : '#dce8ff';
        const cBar   = this.isRed ? '#ffe850' : '#d8a830';

        // 上部ラウンドカウル
        ctx.fillStyle = cDark;
        ctx.fillRect(-10, -11, 22, 8);
        ctx.fillStyle = cMain;
        ctx.fillRect(-14, -9, 24, 6);
        ctx.fillRect(-8, -12, 16, 3);
        ctx.fillStyle = cLight;
        ctx.fillRect(-6, -11, 12, 3);

        // 下部ラウンドカウル
        ctx.fillStyle = cDark;
        ctx.fillRect(-10, 3, 22, 8);
        ctx.fillStyle = cMain;
        ctx.fillRect(-14, 3, 24, 6);
        ctx.fillRect(-8, 9, 16, 3);
        ctx.fillStyle = cLight;
        ctx.fillRect(-6, 8, 12, 3);

        // 中央のスリット＆水平ゴールドコアバー＋後部ノーズ
        ctx.fillStyle = '#0c1020';
        ctx.fillRect(-16, -3, 30, 6);
        ctx.fillStyle = cBar;
        ctx.fillRect(-18, -2, 18, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-16, -1, 10, 2);
        // 後部ホワイトノズル突起
        ctx.fillStyle = cLight;
        ctx.fillRect(10, -2, 6, 4);

        ctx.restore();
    }
}

// ------------------------------------------
// 火山 (Volcano: sakura_04.png の二連火山＆深紅パレット変化完全再現)
// ＆ 火山弾 (VolcanoRock: 黄金オレンジ＆白熱ハイライトの丸い溶岩塊)
// ------------------------------------------
class Volcano extends Enemy {
    constructor(x, y, isErupting = true) {
        super(x, y);
        this.width = 164;
        this.height = 128;
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

        const isEruptPhase = (typeof levelManager !== 'undefined' && levelManager.state === 'VOLCANO_ERUPTION');
        if ((this.isErupting || isEruptPhase) && this.x > -40 && this.x < 780) {
            this.burstTimer++;
            const interval = isEruptPhase ? 15 : 24;
            if (this.burstTimer >= interval) {
                this.burstTimer = 0;
                if (typeof enemies !== 'undefined') {
                    const count = isEruptPhase ? (Math.random() < 0.7 ? 2 : 1) : 1;
                    for (let i = 0; i < count; i++) {
                        const vx = (Math.random() - 0.62) * 5.6 - 0.7;
                        const vy = -(Math.random() * 4.5 + 6.6);
                        const size = Math.floor(Math.random() * 8) + 22;
                        enemies.push(new VolcanoRock(
                            this.x + this.width / 2 + (Math.random() - 0.5) * 18 - size / 2,
                            this.groundY - this.height + 6,
                            vx,
                            vy,
                            size
                        ));
                    }
                    if (typeof particles !== 'undefined') {
                        for (let p = 0; p < 3; p++) {
                            particles.push(new Particle(this.x + this.width / 2, this.groundY - this.height + 6, Math.random() < 0.5 ? '#ff2048' : '#ffa018'));
                        }
                    }
                }
            }
        }
    }

    checkCollision(rect) {
        if (!this.active) return false;
        if (rect.x + rect.width < this.x + 14 || rect.x > this.x + this.width - 14) return false;
        if (rect.y + rect.height < this.y + 8) return false;
        const midX = this.x + this.width / 2;
        const relX = Math.abs((rect.x + rect.width / 2) - midX);
        const topHalf = 18;
        const baseHalf = this.width / 2 - 10;
        const ratio = Math.max(0, Math.min(1, (relX - topHalf) / (baseHalf - topHalf)));
        const slopeY = (this.groundY - this.height + 8) + ratio * (this.height - 8);
        return (rect.y + rect.height >= slopeY);
    }

    draw(ctx) {
        ctx.save();
        const cx = Math.round(this.x + this.width / 2);
        const gy = Math.round(this.groundY);
        ctx.translate(cx, gy);

        const h = this.height;
        const w2 = this.width / 2;
        // 1985年アーケード版（sakura_04.png）：噴火フェーズに入ると火山と大地が鮮烈なクリムゾンレッド（深紅）に染まる！
        const isCrimson = (typeof levelManager !== 'undefined' &&
            (levelManager.state === 'VOLCANO_ERUPTION' || levelManager.state === 'BOSS_ENTRY' ||
             (levelManager.terrain && levelManager.terrain.isCrimsonPalette)));

        const cShadow = isCrimson ? '#480414' : '#442400';
        const cDark   = isCrimson ? '#880828' : '#784408';
        const cMid    = isCrimson ? '#c81038' : '#b87414';
        const cHigh   = isCrimson ? '#f02858' : '#e09c24';
        const cRim    = isCrimson ? '#ff7898' : '#f8c848';

        // 1. 急峻な円錐台形のゴツゴツしたドット火山山体 (sakura_04.png)
        ctx.fillStyle = cShadow;
        ctx.beginPath();
        ctx.moveTo(-w2, 4);
        ctx.lineTo(-18, -h);
        ctx.lineTo(18, -h);
        ctx.lineTo(w2, 4);
        ctx.closePath();
        ctx.fill();

        const steps = 14;
        for (let i = 0; i < steps; i++) {
            const t0 = i / steps;
            const t1 = (i + 1) / steps;
            const y0 = Math.round(-h + t0 * h);
            const y1 = Math.round(-h + t1 * h) + 2;
            const hw0 = Math.round(16 + Math.pow(t0, 0.92) * (w2 - 16));
            // 外縁の鋸歯状クラスト（左右のギザギザした溶岩稜線）
            const jag = (i % 2 === 0) ? 4 : 0;
            ctx.fillStyle = cDark;
            ctx.fillRect(-hw0 - jag, y0, (hw0 + jag) * 2, y1 - y0);
            ctx.fillStyle = cMid;
            ctx.fillRect(-hw0 + 5, y0, (hw0 - 5) * 2, y1 - y0);
            ctx.fillStyle = cHigh;
            ctx.fillRect(-hw0 + 12, y0, Math.max(8, (hw0 - 14) * 1.3), y1 - y0);
            // 左右斜面の明部ハイライトドット
            ctx.fillStyle = cRim;
            ctx.fillRect(-hw0 - jag, y0, 4, Math.max(2, y1 - y0 - 2));
            ctx.fillRect(hw0 + jag - 4, y0, 4, Math.max(2, y1 - y0 - 2));

            // 縦方向の溶岩溝・岩肌クレバス
            ctx.fillStyle = cShadow;
            for (let sx = -hw0 + 9; sx < hw0 - 7; sx += 11) {
                ctx.fillRect(sx + ((i % 2) * 3), y0, 3, y1 - y0);
            }
        }

        // 2. 火口クレーターのリム（sakura_04.png のシャープな火口）
        ctx.fillStyle = cRim;
        ctx.fillRect(-18, -h, 36, 4);
        ctx.fillStyle = cMid;
        ctx.fillRect(-14, -h + 2, 28, 4);
        ctx.fillStyle = '#180408';
        ctx.fillRect(-10, -h + 3, 20, 4);

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

        // 1985年アーケード版のドット絵「火山弾（sakura_04.png）」完全再現：
        // 黄金オレンジ〜アンバーの丸みを帯びた溶岩塊の中に、白熱したホワイト＆イエローの斑点が輝く！
        const stepRot = Math.floor(this.rot * 2) * (Math.PI / 2);
        ctx.rotate(stepRot);

        const s = Math.max(2, Math.round(this.size / 12));
        // 1. 暗갈色の円形ドット外郭
        ctx.fillStyle = '#581c00';
        ctx.fillRect(-5 * s, -3 * s, 10 * s, 6 * s);
        ctx.fillRect(-3 * s, -5 * s, 6 * s, 10 * s);
        ctx.fillRect(-4 * s, -4 * s, 8 * s, 8 * s);

        // 2. 鮮やかなゴールデンオレンジの溶岩肌
        ctx.fillStyle = '#d86808';
        ctx.fillRect(-4 * s, -3 * s, 8 * s, 6 * s);
        ctx.fillRect(-3 * s, -4 * s, 6 * s, 8 * s);

        // 3. ブライトアンバーの隆起セル
        ctx.fillStyle = '#f8a018';
        ctx.fillRect(-3 * s, -3 * s, 3 * s, 3 * s);
        ctx.fillRect(1 * s, -2 * s, 2 * s, 3 * s);
        ctx.fillRect(-2 * s, 1 * s, 3 * s, 2 * s);

        // 4. 白熱ハイライトドット（sakura_04.png 特有の白い輝き）
        ctx.fillStyle = '#fff8d0';
        ctx.fillRect(-2 * s, -3 * s, 2 * s, 2 * s);
        ctx.fillRect(1 * s, -1 * s, 1 * s, 2 * s);
        ctx.fillRect(-1 * s, 1 * s, 2 * s, 1 * s);

        // 5. 岩の黒クレバス点
        ctx.fillStyle = '#280800';
        ctx.fillRect(0, -1 * s, 1 * s, 2 * s);
        ctx.fillRect(-2 * s, 0, 2 * s, 1 * s);

        ctx.restore();
    }
}

// ------------------------------------------
// 砲台 (TurretEnemy / ディー01: sakura_03.png & sakura_09.png 完全再現)
// 白銀＆シアンの段付き装甲台座から、オレンジ茶色の太い砲身が角度を変えて突き出る固定砲台！
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

        // 自機方向への段階的砲身トラッキング（本家ディー01の段階アングル）
        if (typeof player !== 'undefined' && player) {
            const centerX = this.x + this.width / 2;
            const centerY = this.isCeiling ? this.groundY + 12 : this.groundY - 12;
            const rawAngle = Math.atan2((player.y + player.height / 2) - centerY, (player.x + player.width / 2) - centerX);
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

        // 1985年アーケード版「ディー01 (sakura_03.png / sakura_09.png)」完全再現：
        // 白銀＆シアンブルーの段付き台座＋アンバーオレンジの太い旋回砲身
        const S = 2;
        const cBaseDark  = this.isRed ? '#781018' : '#284878';
        const cBaseMain  = this.isRed ? '#d83038' : '#5898d8';
        const cBaseLight = this.isRed ? '#ffd0d8' : '#e8f4ff';
        const cGunDark   = this.isRed ? '#882000' : '#884008';
        const cGunMain   = this.isRed ? '#f86818' : '#d87818';
        const cGunLight  = '#f8c860';

        // 1. 砲身（アンバーオレンジの太いドット砲身）
        ctx.save();
        ctx.translate(0, -6 * S);
        const effectiveAngle = this.isCeiling ? -this.barrelAngle : this.barrelAngle;
        ctx.rotate(effectiveAngle);
        ctx.fillStyle = cGunDark;
        ctx.fillRect(2 * S, -2.5 * S, 11 * S, 5 * S);
        ctx.fillStyle = cGunMain;
        ctx.fillRect(2 * S, -1.5 * S, 10 * S, 3 * S);
        ctx.fillStyle = cGunLight;
        ctx.fillRect(3 * S, -1.5 * S, 8 * S, 1 * S);
        ctx.restore();

        // 2. 階段状の接地フランジ＆白銀・シアン装甲ボディ
        ctx.fillStyle = cBaseDark;
        ctx.fillRect(-8 * S, -4 * S, 16 * S, 4 * S);
        ctx.fillStyle = cBaseMain;
        ctx.fillRect(-7 * S, -4 * S, 14 * S, 3 * S);
        ctx.fillStyle = cBaseLight;
        ctx.fillRect(-6 * S, -3 * S, 12 * S, 1 * S);

        // 3. 砲塔ドームハウジング
        ctx.fillStyle = cBaseDark;
        ctx.fillRect(-6 * S, -9 * S, 12 * S, 5 * S);
        ctx.fillStyle = cBaseMain;
        ctx.fillRect(-5 * S, -8 * S, 10 * S, 4 * S);
        ctx.fillStyle = cBaseLight;
        ctx.fillRect(-4 * S, -8 * S, 6 * S, 2 * S);

        // 中央のオレンジ色ロックオンサイト
        ctx.fillStyle = cGunMain;
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



