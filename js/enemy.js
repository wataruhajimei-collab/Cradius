// ==========================================
// GRADIUS ENEMY SYSTEM
// 敵キャラクター: 大きく見やすく、ゆったりとした動きに調整
// 配色: 青みのある銀色（メタリックシルバーブルー）
// 群れ全滅でカプセル確定ドロップ
// ==========================================

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 44;
        this.height = 28;
        this.speed = 1.6; // ゆったりとした前進
        this.active = true;
        this.hp = 1;
        this.animTimer = Math.random() * 100;
        this.bodyColor = '#8fa8c8';
        this.trimColor = '#d2e4ff';
        this.darkColor = '#4a6080';
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
        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = -3;
        ctx.shadowOffsetY = 3;

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
            this.active = false;
        }
    }
}

// ------------------------------------------
// ファン編隊 (波打つ編隊: 大きく優雅な動き)
// ------------------------------------------
class Formation extends FormationBase {
    constructor(startY, count = 4) {
        super(count);
        this.enemies = [];

        for (let i = 0; i < count; i++) {
            const enemy = new FanEnemy(820, startY, i * 20, this);
            this.enemies.push(enemy);
            enemies.push(enemy);
        }
    }
}

class FanEnemy extends Enemy {
    constructor(x, y, delay, formation) {
        super(x, y);
        this.startY = y;
        this.delay = delay;
        this.formation = formation;
        this.width = 42;
        this.height = 36;
        this.time = 0;
        this.visible = (delay <= 0);
        this.tilt = 0;
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

        this.time += 0.035; // ゆったり波打つ
        this.animTimer += 0.15;
        this.x -= 2.0; // 見やすいゆったり速度
        
        const prevY = this.y;
        this.y = this.startY + Math.sin(this.time * 0.7) * 45;
        this.tilt = (this.y - prevY) * 0.05;
    }

    draw(ctx) {
        if (!this.visible) return;
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.tilt);

        // 立体ドロップシャドウ
        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = -2;
        ctx.shadowOffsetY = 3;

        // 3D球面メタリック・アウターソーサー (金属円盤)
        const outerGrad = ctx.createRadialGradient(-5, -5, 2, 0, 0, 19);
        outerGrad.addColorStop(0.0, '#ffffff'); // 左上ハイライト
        outerGrad.addColorStop(0.2, '#e2e8f0'); // シルバークローム
        outerGrad.addColorStop(0.55, '#64748b'); // 金属スレート
        outerGrad.addColorStop(0.85, '#334155'); // 影
        outerGrad.addColorStop(1.0, '#0f172a');  // エッジリム
        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 19, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // ベベルエッジ (金属光沢リング)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(-1, -1, 18, Math.PI * 0.7, Math.PI * 1.8);
        ctx.stroke();

        // 中層ローター・タービンリング
        const midGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 12);
        midGrad.addColorStop(0.0, '#0284c7');
        midGrad.addColorStop(0.6, '#0f172a');
        midGrad.addColorStop(1.0, '#475569');
        ctx.fillStyle = midGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();

        // 回転スリット (メカニカルなタービンファン)
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
        ctx.lineWidth = 1.2;
        const fanRot = this.animTimer * 1.5;
        for (let a = 0; a < 4; a++) {
            const angle = fanRot + (a * Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * 5, Math.sin(angle) * 5);
            ctx.lineTo(Math.cos(angle) * 11, Math.sin(angle) * 11);
            ctx.stroke();
        }

        // 中心高輝度エネルギープラズマコア
        const coreGrad = ctx.createRadialGradient(2, 0, 1, 2, 0, 5);
        coreGrad.addColorStop(0.0, '#ffffff');
        coreGrad.addColorStop(0.4, '#38bdf8');
        coreGrad.addColorStop(1.0, '#0369a1');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(2, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        // バーニア噴射炎
        const flame = 8 + Math.sin(this.animTimer * 2) * 4;
        ctx.fillStyle = 'rgba(0, 220, 255, 0.85)';
        ctx.beginPath();
        ctx.moveTo(-16, -4);
        ctx.lineTo(-16 - flame, 0);
        ctx.lineTo(-16, 4);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-16, -2);
        ctx.lineTo(-16 - flame * 0.5, 0);
        ctx.lineTo(-16, 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

// ------------------------------------------
// ガルン編隊 (Uターン旋回: 大きく優雅な軌道)
// ------------------------------------------
class GarunFormation extends FormationBase {
    constructor(startY, isUpward, count = 4) {
        super(count);
        this.enemies = [];

        for (let i = 0; i < count; i++) {
            const enemy = new GarunEnemy(820, startY, i * 18, isUpward, this);
            this.enemies.push(enemy);
            enemies.push(enemy);
        }
    }
}

class GarunEnemy extends Enemy {
    constructor(x, y, delay, isUpward, formation) {
        super(x, y);
        this.startY = y;
        this.delay = delay;
        this.isUpward = isUpward;
        this.formation = formation;
        this.width = 46;
        this.height = 32;
        this.time = 0;
        this.visible = (delay <= 0);
        this.speedX = -2.4; // ゆったり
        this.speedY = 0;
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

        this.time += 0.025;
        this.x += this.speedX;

        // ゆったりUターン
        if (this.time > 1.5 && this.time < 3.4) {
            this.speedY = (this.isUpward ? -2.2 : 2.2);
            this.speedX += 0.04;
        } else if (this.time >= 3.4) {
            this.speedX = 2.8;
            this.speedY *= 0.96;
        }
        this.y += this.speedY;
    }

    draw(ctx) {
        if (!this.visible) return;
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(Math.atan2(this.speedY, this.speedX) + Math.PI);

        // 立体シャドウ
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = -2;
        ctx.shadowOffsetY = 2;

        // 上部主翼 (光面デルタ: シルバー〜スレート)
        const wingTopGrad = ctx.createLinearGradient(0, -11, 0, 0);
        wingTopGrad.addColorStop(0.0, '#f8fafc'); // 先端ハイライト
        wingTopGrad.addColorStop(0.3, '#cbd5e1'); // シルバー
        wingTopGrad.addColorStop(0.8, '#64748b'); // スレート
        wingTopGrad.addColorStop(1.0, '#475569');
        ctx.fillStyle = wingTopGrad;
        ctx.beginPath();
        ctx.moveTo(19, 0);
        ctx.lineTo(-15, -12);
        ctx.lineTo(-9, 0);
        ctx.closePath();
        ctx.fill();

        // 下部主翼 (影面デルタ: ガンメタル)
        const wingBtmGrad = ctx.createLinearGradient(0, 0, 0, 11);
        wingBtmGrad.addColorStop(0.0, '#334155');
        wingBtmGrad.addColorStop(0.6, '#1e293b');
        wingBtmGrad.addColorStop(1.0, '#0f172a');
        ctx.fillStyle = wingBtmGrad;
        ctx.beginPath();
        ctx.moveTo(19, 0);
        ctx.lineTo(-9, 0);
        ctx.lineTo(-15, 12);
        ctx.closePath();
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // 前縁ベベルエッジハイライト
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(19, 0);
        ctx.lineTo(-15, -12);
        ctx.stroke();

        // 中央胴体メタリックカウル
        const cowlGrad = ctx.createLinearGradient(-4, -4, 12, 4);
        cowlGrad.addColorStop(0.0, '#e2e8f0');
        cowlGrad.addColorStop(0.5, '#94a3b8');
        cowlGrad.addColorStop(1.0, '#1e293b');
        ctx.fillStyle = cowlGrad;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(2, -4);
        ctx.lineTo(-8, -2);
        ctx.lineTo(-8, 2);
        ctx.lineTo(2, 4);
        ctx.closePath();
        ctx.fill();

        // センサーアイ・キャノピー (シアン反射ガラス)
        const sensorGrad = ctx.createLinearGradient(-3, -2, 6, 2);
        sensorGrad.addColorStop(0.0, '#ffffff');
        sensorGrad.addColorStop(0.3, '#38bdf8');
        sensorGrad.addColorStop(1.0, '#0284c7');
        ctx.fillStyle = sensorGrad;
        ctx.beginPath();
        ctx.fillRect(-3, -2.5, 9, 5);

        // キャノピーハイライト
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1, -1.5, 3, 1.2);

        // アフターバーナー (旋回中の推力炎)
        const flame = 10 + Math.sin(this.animTimer * 2.5) * 4;
        ctx.fillStyle = 'rgba(0, 220, 255, 0.85)';
        ctx.beginPath();
        ctx.moveTo(-9, -3);
        ctx.lineTo(-9 - flame, 0);
        ctx.lineTo(-9, 3);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-9, -1.5);
        ctx.lineTo(-9 - flame * 0.5, 0);
        ctx.lineTo(-9, 1.5);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

// ------------------------------------------
// ザブ小隊 (奇襲機: 見切りやすいサイズとスピード)
// ------------------------------------------
class ZabSquad extends FormationBase {
    constructor(spawnSide, targetY, count = 3) {
        super(count);
        this.enemies = [];

        for (let i = 0; i < count; i++) {
            const enemy = new ZabEnemy(spawnSide, targetY + (i - 1) * 45, this);
            this.enemies.push(enemy);
            enemies.push(enemy);
        }
    }
}

class ZabEnemy extends Enemy {
    constructor(spawnSide, targetY, formation = null) {
        let sx = 820, sy = targetY;
        if (spawnSide === 'BACK') { sx = -40; }
        else if (spawnSide === 'TOP') { sx = Math.random() * 600 + 100; sy = -40; }
        else if (spawnSide === 'BOTTOM') { sx = Math.random() * 600 + 100; sy = 640; }

        super(sx, sy);
        this.width = 32;
        this.height = 32;
        this.formation = formation;
        this.spawnSide = spawnSide;
        this.state = 'WARP_IN';
        this.warpTimer = 0;
        this.vx = 0;
        this.vy = 0;
        this.rot = 0;
    }

    update() {
        this.rot += 0.15;
        if (this.state === 'WARP_IN') {
            this.warpTimer++;
            if (this.warpTimer > 35) { // ワープ表示を長くして見やすく
                this.state = 'RUSH';
                if (typeof player !== 'undefined') {
                    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
                    const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const speed = 3.6; // 見切りやすいマイルドな突進速度
                    this.vx = (dx / dist) * speed;
                    this.vy = (dy / dist) * speed;
                } else {
                    this.vx = -3.5;
                }
            }
        } else {
            this.x += this.vx;
            this.y += this.vy;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        if (this.state === 'WARP_IN') {
            // 高エネルギー空間歪曲リング
            const radius = Math.max(1, 38 - this.warpTimer);
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.rotate(this.rot);

            // 立体シャドウ
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 7;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;

            // 3D多面体メタリック結晶 (4つの独立した陰影ファセット)
            // 1. 上ファセット (強いハイライト光: シルバーホワイト)
            const facetTop = ctx.createLinearGradient(0, -15, 0, 0);
            facetTop.addColorStop(0.0, '#ffffff');
            facetTop.addColorStop(0.5, '#cbd5e1');
            facetTop.addColorStop(1.0, '#94a3b8');
            ctx.fillStyle = facetTop;
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(15, 0);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.fill();

            // 2. 左ファセット (反射光: スレートブルー)
            const facetLeft = ctx.createLinearGradient(-15, 0, 0, 0);
            facetLeft.addColorStop(0.0, '#e2e8f0');
            facetLeft.addColorStop(0.6, '#64748b');
            facetLeft.addColorStop(1.0, '#475569');
            ctx.fillStyle = facetLeft;
            ctx.beginPath();
            ctx.moveTo(-15, 0);
            ctx.lineTo(0, -15);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.fill();

            // 3. 右ファセット (斜光・影: ディープスレート)
            const facetRight = ctx.createLinearGradient(0, 0, 15, 0);
            facetRight.addColorStop(0.0, '#475569');
            facetRight.addColorStop(0.7, '#334155');
            facetRight.addColorStop(1.0, '#1e293b');
            ctx.fillStyle = facetRight;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(15, 0);
            ctx.lineTo(0, 15);
            ctx.closePath();
            ctx.fill();

            // 4. 下ファセット (最深影: ガンメタルブラック)
            const facetBottom = ctx.createLinearGradient(0, 0, 0, 15);
            facetBottom.addColorStop(0.0, '#334155');
            facetBottom.addColorStop(0.6, '#1e293b');
            facetBottom.addColorStop(1.0, '#0f172a');
            ctx.fillStyle = facetBottom;
            ctx.beginPath();
            ctx.moveTo(-15, 0);
            ctx.lineTo(0, 0);
            ctx.lineTo(0, 15);
            ctx.closePath();
            ctx.fill();

            ctx.shadowColor = 'transparent';

            // 金属ファセット稜線 (シャープなベベルライン)
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

            // 中心エネルギーコア (高輝度プラズマジェム)
            const gemGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 5);
            gemGrad.addColorStop(0.0, '#ffffff');
            gemGrad.addColorStop(0.4, '#38bdf8');
            gemGrad.addColorStop(1.0, '#0284c7');
            ctx.fillStyle = gemGrad;
            ctx.beginPath();
            ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
            ctx.fill();

            // 頂点の光彩スパークル
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-1, -16, 2, 2);
            ctx.fillRect(15, -1, 2, 2);
        }
        ctx.restore();
    }
}

// ------------------------------------------
// ダッカー (DuckerEnemy: 大きくカタカタ歩行)
// ------------------------------------------
class DuckerEnemy extends Enemy {
    constructor(x, y, isCeiling) {
        super(x, y);
        this.width = 38;
        this.height = 34;
        this.isCeiling = isCeiling;
        this.walkCycle = 0;
        this.slopeAngle = 0;
        this.groundY = y;
        this.moveDir = -1;
        this.stopTimer = 0;
        this.hp = 2;
        this.shootCooldown = 0;
    }

    update() {
        if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.active) {
            const terrainScroll = levelManager.terrain.scrollSpeed;
            
            this.stopTimer++;
            if (this.stopTimer > 180 && this.stopTimer < 250) {
                this.x -= terrainScroll;
                this.shootCooldown++;
                if (this.shootCooldown === 25 || this.shootCooldown === 50) {
                    this.shoot();
                }
            } else {
                if (this.stopTimer >= 250) {
                    this.stopTimer = 0;
                    this.shootCooldown = 0;
                }
                this.walkCycle += 0.2;
                this.x += (this.moveDir * 1.1) - terrainScroll; // ゆっくり歩行
            }

            const centerX = this.x + this.width / 2;
            const sampleDist = 16;

            if (this.isCeiling) {
                const yL = levelManager.terrain.getTopY(centerX - sampleDist);
                const yR = levelManager.terrain.getTopY(centerX + sampleDist);
                const yC = levelManager.terrain.getTopY(centerX);
                this.slopeAngle = Math.atan2(yR - yL, sampleDist * 2);
                this.groundY = yC;
                this.y = yC;
            } else {
                const yL = levelManager.terrain.getBottomY(centerX - sampleDist);
                const yR = levelManager.terrain.getBottomY(centerX + sampleDist);
                const yC = levelManager.terrain.getBottomY(centerX);
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
        const centerY = this.isCeiling ? this.groundY + 12 : this.groundY - 12;

        const dx = (player.x + player.width / 2) - centerX;
        const dy = (player.y + player.height / 2) - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        if (dist < 600) {
            const spd = 3.6;
            const bullet = new EnemyBullet(centerX, centerY, (dx / dist) * spd, (dy / dist) * spd);
            enemyBullets.push(bullet);
        }
    }

    draw(ctx) {
        ctx.save();
        const centerX = this.x + this.width / 2;
        ctx.translate(centerX, this.groundY);
        ctx.rotate(this.slopeAngle);
        if (this.isCeiling) ctx.scale(1, -1);

        const leg1 = Math.sin(this.walkCycle) * 8;
        const leg2 = -leg1;

        // --- メタリック油圧シリンダー脚部 ---
        // 後ろ脚 (影側)
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(8, -12);
        ctx.lineTo(11 + leg2, -2);
        ctx.lineTo(13 + leg2, 0);
        ctx.stroke();
        // 後ろ足パッド
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(8 + leg2, -3, 9, 3);

        // 前脚 (光側・クロームシリンダー)
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.moveTo(-8, -12);
        ctx.lineTo(-10 + leg1, -2);
        ctx.lineTo(-12 + leg1, 0);
        ctx.stroke();
        // 油圧ピストンハイライト
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-8, -10);
        ctx.lineTo(-10 + leg1, -3);
        ctx.stroke();
        // 前足パッド
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-16 + leg1, -3, 9, 3);

        // 脚部ピボット関節
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(-8, -12, 3, 0, Math.PI * 2);
        ctx.arc(8, -12, 3, 0, Math.PI * 2);
        ctx.fill();

        // --- 3D球面装甲ポッド胴体 ---
        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = -2;
        ctx.shadowOffsetY = 3;

        const bodyGrad = ctx.createRadialGradient(-4, -23, 2, 0, -18, 14);
        bodyGrad.addColorStop(0.0, '#ffffff'); // 球面ハイライト
        bodyGrad.addColorStop(0.25, '#cbd5e1'); // シルバー装甲
        bodyGrad.addColorStop(0.65, '#64748b'); // スレート
        bodyGrad.addColorStop(0.92, '#334155'); // 影
        bodyGrad.addColorStop(1.0, '#0f172a');  // エッジリム
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(0, -18, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // 装甲分割シーム＆リベット
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -18, 14, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();

        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(-10, -14, 1.5, 1.5);
        ctx.fillRect(8, -14, 1.5, 1.5);

        // 頭頂部小型アンテナ
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -32);
        ctx.lineTo(0, -37);
        ctx.stroke();
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(-1, -38, 2, 2);

        // --- グラディウス伝統の深紅スキャナーバイザーアイ ---
        // バイザーフレーム (暗色ベゼル)
        ctx.fillStyle = '#05070e';
        ctx.fillRect(-10, -22, 20, 7);

        // 発光ルビースキャナー
        const eyeGrad = ctx.createLinearGradient(-9, -21, 9, -21);
        eyeGrad.addColorStop(0.0, '#990022');
        eyeGrad.addColorStop(0.4, '#ff1155');
        eyeGrad.addColorStop(0.7, '#ff4477');
        eyeGrad.addColorStop(1.0, '#990022');
        ctx.fillStyle = eyeGrad;
        ctx.fillRect(-9, -21, 18, 5);

        // 水平レーザーフレアスリット
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-4, -19.5, 9, 1.5);

        ctx.restore();
    }
}

// ------------------------------------------
// ハッチャー (HatcherEnemy: 大きな母艦)
// ------------------------------------------
class HatcherEnemy extends Enemy {
    constructor(x, y, isCeiling) {
        super(x, y);
        this.width = 54;
        this.height = 38;
        this.isCeiling = isCeiling;
        this.hp = 7;
        this.spawnTimer = 0;
        this.groundY = y;
        this.hatchOpen = false;
    }

    update() {
        if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.active) {
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
        if (this.spawnTimer > 130 && this.spawnTimer < 180) {
            this.hatchOpen = true;
            if (this.spawnTimer % 20 === 0) {
                if (typeof enemies !== 'undefined') {
                    const by = this.isCeiling ? this.groundY + 24 : this.groundY - 24;
                    enemies.push(new BlasterEnemy(this.x + this.width / 2, by, this.isCeiling));
                }
            }
        } else {
            this.hatchOpen = false;
            if (this.spawnTimer >= 200) {
                this.spawnTimer = 0;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.groundY);
        if (this.isCeiling) ctx.scale(1, -1);

        // 重装甲バンカー外郭シャドウ
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = -2;

        // メイン装甲傾斜プレート (メタリックグラデーション)
        const bunkerGrad = ctx.createLinearGradient(0, -32, 0, 0);
        bunkerGrad.addColorStop(0.0, '#94a3b8'); // 天面エッジ
        bunkerGrad.addColorStop(0.2, '#64748b'); // 上部装甲
        bunkerGrad.addColorStop(0.65, '#334155'); // 中間スレート
        bunkerGrad.addColorStop(1.0, '#1e293b');  // 基礎部
        ctx.fillStyle = bunkerGrad;
        ctx.beginPath();
        ctx.moveTo(-27, 0);
        ctx.lineTo(-19, -32);
        ctx.lineTo(19, -32);
        ctx.lineTo(27, 0);
        ctx.closePath();
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // 傾斜装甲のハイライトエッジ
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-27, 0);
        ctx.lineTo(-19, -32);
        ctx.lineTo(19, -32);
        ctx.stroke();

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(19, -32);
        ctx.lineTo(27, 0);
        ctx.stroke();

        // 左右の強化リブ・スリット
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-22, -18, 4, 12);
        ctx.fillRect(18, -18, 4, 12);

        // 基部インダストリアル・ハザードライン (黄＆黒の警告帯)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-25, -4, 50, 4);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(-21, -4, 6, 4);
        ctx.fillRect(-9, -4, 6, 4);
        ctx.fillRect(3, -4, 6, 4);
        ctx.fillRect(15, -4, 6, 4);

        // --- 中央ハッチ（格納庫・開閉ゲート） ---
        // ハッチ開口部ピット (暗黒内部)
        ctx.fillStyle = '#020617';
        ctx.fillRect(-13, -30, 26, 14);

        if (this.hatchOpen) {
            // 格納庫内部の高輝度プラズマサージ (敵生成のシアン発光)
            const plasmaGrad = ctx.createRadialGradient(0, -22, 1, 0, -22, 12);
            plasmaGrad.addColorStop(0.0, '#ffffff');
            plasmaGrad.addColorStop(0.4, '#38bdf8');
            plasmaGrad.addColorStop(0.85, '#0284c7');
            plasmaGrad.addColorStop(1.0, 'transparent');
            ctx.fillStyle = plasmaGrad;
            ctx.fillRect(-13, -30, 26, 14);

            // 左右にスライド展開したブラストシールド扉
            ctx.fillStyle = '#475569';
            ctx.fillRect(-16, -31, 5, 15);
            ctx.fillRect(11, -31, 5, 15);
        } else {
            // 閉鎖時の重金属ブラスト扉 (中央シール＆油圧シリンダー)
            const doorGrad = ctx.createLinearGradient(-12, 0, 12, 0);
            doorGrad.addColorStop(0.0, '#334155');
            doorGrad.addColorStop(0.48, '#64748b');
            doorGrad.addColorStop(0.5, '#0f172a');
            doorGrad.addColorStop(0.52, '#64748b');
            doorGrad.addColorStop(1.0, '#334155');
            ctx.fillStyle = doorGrad;
            ctx.fillRect(-12, -29, 24, 12);

            // ロックバー
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(-12, -29, 24, 12);
        }

        // 左右タクティカルセンサー・ビーコン (エメラルド・レッド)
        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(-15, -12, 6, 4);
        ctx.fillStyle = '#ff2244';
        ctx.fillRect(9, -12, 6, 4);

        // 天面ボルトリベット
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-17, -31, 1.5, 1.5);
        ctx.fillRect(15, -31, 1.5, 1.5);

        ctx.restore();
    }
}

// ------------------------------------------
// ブラスター (BlasterEnemy: ポコポコゆっくり飛ぶドローン)
// ------------------------------------------
class BlasterEnemy extends Enemy {
    constructor(x, y, isCeiling) {
        super(x, y);
        this.width = 24;
        this.height = 24;
        this.hp = 1;
        this.speedX = -2.0; // ゆっくり
        this.speedY = isCeiling ? 1.0 : -1.0;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.speedY *= 0.97;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        // 立体シャドウ
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = -1;
        ctx.shadowOffsetY = 2;

        // 3D球面メタリックドローン本体
        const sphereGrad = ctx.createRadialGradient(-3, -3, 1, 0, 0, 11);
        sphereGrad.addColorStop(0.0, '#ffffff'); // 球面ハイライト
        sphereGrad.addColorStop(0.25, '#cbd5e1'); // シルバー
        sphereGrad.addColorStop(0.65, '#64748b'); // 金属スレート
        sphereGrad.addColorStop(0.9, '#334155');  // 影
        sphereGrad.addColorStop(1.0, '#0f172a');  // エッジリム
        ctx.fillStyle = sphereGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // 赤道メカニカルグルーブ (スリット溝)
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, 11, 3, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 中央高精度光学カメラアイ (シアンレンズ)
        const eyeGrad = ctx.createRadialGradient(1, -1, 0.5, 0, 0, 5);
        eyeGrad.addColorStop(0.0, '#ffffff');
        eyeGrad.addColorStop(0.3, '#38bdf8');
        eyeGrad.addColorStop(0.75, '#0284c7');
        eyeGrad.addColorStop(1.0, '#0c4a6e');
        ctx.fillStyle = eyeGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // レンズ反射ハイライト
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1, -2, 1.8, 1.8);

        ctx.restore();
    }
}

// ------------------------------------------
// ルグラ (RugraEnemy: 大きめの迎撃戦闘機)
// ------------------------------------------
class RugraEnemy extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.width = 50;
        this.height = 28;
        this.rushing = false;
        this.waitTimer = 0;
    }

    update() {
        if (!this.rushing) {
            this.x -= 1.0;
            this.waitTimer++;
            if (typeof player !== 'undefined') {
                if (Math.abs(player.y - this.y) < 50 || this.waitTimer > 90) {
                    this.rushing = true;
                }
            }
        } else {
            this.x -= 4.8; // 見応えのある適正なジェット突撃
            this.animTimer += 0.25;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        // 立体シャドウ
        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = -2;
        ctx.shadowOffsetY = 2;

        // 上半面 (光を受けるシルバー主翼)
        const topGrad = ctx.createLinearGradient(0, -12, 0, 0);
        topGrad.addColorStop(0.0, '#ffffff');
        topGrad.addColorStop(0.3, '#cbd5e1');
        topGrad.addColorStop(0.75, '#64748b');
        topGrad.addColorStop(1.0, '#475569');
        ctx.fillStyle = topGrad;
        ctx.beginPath();
        ctx.moveTo(24, 0);
        ctx.lineTo(-18, -12);
        ctx.lineTo(-10, 0);
        ctx.closePath();
        ctx.fill();

        // 下半面 (深い影のガンメタル主翼)
        const btmGrad = ctx.createLinearGradient(0, 0, 0, 12);
        btmGrad.addColorStop(0.0, '#334155');
        btmGrad.addColorStop(0.65, '#1e293b');
        btmGrad.addColorStop(1.0, '#0f172a');
        ctx.fillStyle = btmGrad;
        ctx.beginPath();
        ctx.moveTo(24, 0);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-18, 12);
        ctx.closePath();
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // 前縁ベベルエッジハイライト
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(24, 0);
        ctx.lineTo(-18, -12);
        ctx.stroke();

        ctx.strokeStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(24, 0);
        ctx.lineTo(-18, 12);
        ctx.stroke();

        // 中央胴体装甲ブロック
        const bodyGrad = ctx.createLinearGradient(-4, -4, 10, 4);
        bodyGrad.addColorStop(0.0, '#e2e8f0');
        bodyGrad.addColorStop(0.5, '#94a3b8');
        bodyGrad.addColorStop(1.0, '#334155');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(2, -4);
        ctx.lineTo(-8, 0);
        ctx.lineTo(2, 4);
        ctx.closePath();
        ctx.fill();

        // キャノピー (シアン反射ガラス)
        const canopyGrad = ctx.createLinearGradient(0, -2, 6, 2);
        canopyGrad.addColorStop(0.0, '#ffffff');
        canopyGrad.addColorStop(0.3, '#38bdf8');
        canopyGrad.addColorStop(1.0, '#0284c7');
        ctx.fillStyle = canopyGrad;
        ctx.beginPath();
        ctx.ellipse(3, 0, 5, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // アフターバーナー (突撃時は巨大超音速プラズマ噴射)
        if (this.rushing) {
            const flame = 18 + Math.sin(this.animTimer * 2) * 6;
            // 外層オーラ
            ctx.fillStyle = 'rgba(0, 220, 255, 0.85)';
            ctx.beginPath();
            ctx.moveTo(-10, -5);
            ctx.lineTo(-10 - flame, 0);
            ctx.lineTo(-10, 5);
            ctx.closePath();
            ctx.fill();
            // 内層超高温コア
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(-10, -2);
            ctx.lineTo(-10 - flame * 0.6, 0);
            ctx.lineTo(-10, 2);
            ctx.closePath();
            ctx.fill();
        } else {
            // 待機時の小型バーニア
            const flame = 6 + Math.sin(this.animTimer * 1.5) * 3;
            ctx.fillStyle = 'rgba(0, 220, 255, 0.7)';
            ctx.beginPath();
            ctx.moveTo(-10, -3);
            ctx.lineTo(-10 - flame, 0);
            ctx.lineTo(-10, 3);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
}

// ------------------------------------------
// 火山 (Volcano) ＆ 火山弾 (VolcanoRock: 大きく放物線)
// ------------------------------------------
class Volcano extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.width = 60;
        this.height = 42;
        this.groundY = y;
        this.burstTimer = 0;
    }

    update() {
        if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.active) {
            this.x -= levelManager.terrain.scrollSpeed;
            this.groundY = levelManager.terrain.getBottomY(this.x + this.width / 2);
            this.y = this.groundY - this.height;
        } else {
            this.x -= this.speed;
        }

        this.burstTimer++;
        if (this.burstTimer > 180) {
            this.burstTimer = 0;
            if (typeof enemies !== 'undefined') {
                for (let i = 0; i < 5; i++) {
                    const vx = (Math.random() - 0.5) * 2.5 - 1.2;
                    const vy = - (Math.random() * 3 + 4.5); // ゆったりフワッと舞い上がる
                    enemies.push(new VolcanoRock(this.x + this.width / 2, this.groundY - 10, vx, vy));
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.groundY);

        ctx.fillStyle = '#443322';
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-18, -this.height);
        ctx.lineTo(18, -this.height);
        ctx.lineTo(30, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = (Math.floor(Date.now() / 150) % 2 === 0) ? '#ff4400' : '#ffaa00';
        ctx.fillRect(-12, -this.height, 24, 8);

        ctx.restore();
    }
}

class VolcanoRock extends Enemy {
    constructor(x, y, vx, vy) {
        super(x, y);
        this.width = 30;
        this.height = 30;
        this.vx = vx;
        this.vy = vy;
        this.gravity = 0.12; // ゆったりした重力落下
        this.hp = 1;
        this.rot = 0;
        this.rotSpd = (Math.random() - 0.5) * 0.15;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.rot += this.rotSpd;

        if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.active) {
            const ground = levelManager.terrain.getBottomY(this.x);
            if (this.y + this.height >= ground) {
                this.active = false;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rot);

        // 火山弾の外郭グロー
        ctx.shadowColor = 'rgba(255, 80, 0, 0.7)';
        ctx.shadowBlur = 8;

        // 白熱溶岩ボール (中心の超高温コアから外側の冷却玄武岩まで)
        const magmaGrad = ctx.createRadialGradient(2, -2, 1, 0, 0, 14);
        magmaGrad.addColorStop(0.0, '#ffffff'); // 超高温白熱コア
        magmaGrad.addColorStop(0.25, '#ffe555'); // 灼熱イエロー
        magmaGrad.addColorStop(0.55, '#ea580c'); // 溶融オレンジ
        magmaGrad.addColorStop(0.85, '#991b1b'); // 深紅マグマ
        magmaGrad.addColorStop(1.0, '#1c1917');  // 冷却黒玄武岩

        ctx.fillStyle = magmaGrad;
        ctx.beginPath();
        // 凹凸のあるリアルな火砕流岩石形状
        const points = 8;
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const r = 12 + ((i % 2 === 0) ? 2.5 : -1.5);
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;

        // 表面の溶岩亀裂ライン (輝くマグマの筋)
        ctx.strokeStyle = '#ffe555';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-4, -6);
        ctx.lineTo(2, -2);
        ctx.lineTo(7, 3);
        ctx.moveTo(1, -2);
        ctx.lineTo(-3, 6);
        ctx.stroke();

        ctx.restore();
    }
}

// ------------------------------------------
// 砲台 (TurretEnemy: 大きく堂々とした重砲台)
// ------------------------------------------
class TurretEnemy extends Enemy {
    constructor(x, y, isCeiling) {
        super(x, y);
        this.width = 38;
        this.height = 32;
        this.isCeiling = isCeiling;
        this.shootTimer = Math.floor(Math.random() * 60);
        this.hp = 2;
        this.slopeAngle = 0;
        this.groundY = y;
        this.barrelAngle = Math.PI; // デフォルトは左向き
    }

    update() {
        if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.active) {
            this.x -= levelManager.terrain.scrollSpeed;
            const centerX = this.x + this.width / 2;
            const sampleDist = 18;

            if (this.isCeiling) {
                const yL = levelManager.terrain.getTopY(centerX - sampleDist);
                const yR = levelManager.terrain.getTopY(centerX + sampleDist);
                const yC = levelManager.terrain.getTopY(centerX);
                this.slopeAngle = Math.atan2(yR - yL, sampleDist * 2);
                this.groundY = yC;
                this.y = yC;
            } else {
                const yL = levelManager.terrain.getBottomY(centerX - sampleDist);
                const yR = levelManager.terrain.getBottomY(centerX + sampleDist);
                const yC = levelManager.terrain.getBottomY(centerX);
                this.slopeAngle = Math.atan2(yR - yL, sampleDist * 2);
                this.groundY = yC;
                this.y = yC - this.height;
            }
        } else {
            this.x -= this.speed;
        }

        // 自機方向への砲身トラッキング
        if (typeof player !== 'undefined') {
            const centerX = this.x + this.width / 2;
            const centerY = this.isCeiling ? this.groundY + 12 : this.groundY - 12;
            const targetAngle = Math.atan2(player.y - centerY, player.x - centerX);
            this.barrelAngle = targetAngle;
        }

        this.shootTimer++;
        if (this.shootTimer > 160) {
            this.shootTimer = 0;
            this.shoot();
        }
    }

    shoot() {
        if (typeof player === 'undefined' || typeof enemyBullets === 'undefined') return;
        const centerX = this.x + this.width / 2;
        const centerY = this.isCeiling ? this.groundY + 14 : this.groundY - 14;

        const dx = (player.x + player.width / 2) - centerX;
        const dy = (player.y + player.height / 2) - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist < 650) {
            const speed = 3.5;
            // グラディウス伝統の陰影のある白い球体弾
            const bullet = new EnemyBullet(centerX, centerY, (dx / dist) * speed, (dy / dist) * speed);
            enemyBullets.push(bullet);

            if (typeof particles !== 'undefined') {
                for (let i = 0; i < 4; i++) {
                    particles.push(new Particle(centerX, centerY, '#ffffff'));
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        const centerX = this.x + this.width / 2;
        ctx.translate(centerX, this.groundY);
        ctx.rotate(this.slopeAngle);
        if (this.isCeiling) ctx.scale(1, -1);

        // --- 強化基礎マウント (重金属ベースプレート) ---
        const baseGrad = ctx.createLinearGradient(-23, 0, 23, 0);
        baseGrad.addColorStop(0.0, '#1e293b');
        baseGrad.addColorStop(0.25, '#475569');
        baseGrad.addColorStop(0.5, '#64748b');
        baseGrad.addColorStop(0.75, '#475569');
        baseGrad.addColorStop(1.0, '#0f172a');
        ctx.fillStyle = baseGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 23, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // ベースボルト
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-18, -2, 2, 2);
        ctx.fillRect(16, -2, 2, 2);

        // --- メタリック旋回重砲身 ---
        // 砲台ドーム中心 (-12px) から自機方向へ砲身を描画
        ctx.save();
        ctx.translate(0, -12);
        // 天井設置時は上下反転しているため角度を調整
        const effectiveAngle = this.isCeiling ? -this.barrelAngle : this.barrelAngle;
        ctx.rotate(effectiveAngle);

        // 砲身シリンダーグラデーション (円筒メタリック光沢)
        const barrelGrad = ctx.createLinearGradient(0, -5, 0, 5);
        barrelGrad.addColorStop(0.0, '#0f172a');
        barrelGrad.addColorStop(0.3, '#94a3b8');
        barrelGrad.addColorStop(0.6, '#cbd5e1');
        barrelGrad.addColorStop(1.0, '#1e293b');
        ctx.fillStyle = barrelGrad;
        ctx.fillRect(4, -4.5, 24, 9);

        // マズルブレーキ (先端リングカラー)
        ctx.fillStyle = '#475569';
        ctx.fillRect(23, -6, 5, 12);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.strokeRect(23, -6, 5, 12);

        // 砲口 (黒穴)
        ctx.fillStyle = '#020617';
        ctx.fillRect(27, -3.5, 2, 7);

        ctx.restore();

        // --- 3D球面装甲砲塔ドーム ---
        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = -2;

        const domeGrad = ctx.createRadialGradient(-4, -20, 2, 0, -12, 16);
        domeGrad.addColorStop(0.0, '#ffffff'); // 球面ハイライト
        domeGrad.addColorStop(0.25, '#cbd5e1'); // シルバー合金
        domeGrad.addColorStop(0.65, '#64748b'); // 金属スレート
        domeGrad.addColorStop(0.9, '#334155');  // 影
        domeGrad.addColorStop(1.0, '#0f172a');  // エッジリム
        ctx.fillStyle = domeGrad;
        ctx.beginPath();
        ctx.arc(0, -12, 16, Math.PI, 0);
        ctx.closePath();
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // 装甲分割ライン
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, -12, 16, Math.PI, 0);
        ctx.stroke();

        // 光学照準センサーアイ (エメラルド・シアン)
        const sensorGrad = ctx.createRadialGradient(4, -12, 0.5, 3, -12, 5);
        sensorGrad.addColorStop(0.0, '#ffffff');
        sensorGrad.addColorStop(0.3, '#34d399');
        sensorGrad.addColorStop(0.8, '#059669');
        sensorGrad.addColorStop(1.0, '#064e3b');
        ctx.fillStyle = sensorGrad;
        ctx.beginPath();
        ctx.arc(3, -12, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // センサー反射スポット
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(2, -14, 1.5, 1.5);

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
        this.width = 36;
        this.height = 28;
        this.hp = 2;
        this.shootTimer = Math.floor(Math.random() * 80);
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

        if (this.x < -100) {
            this.active = false;
            return;
        }

        // 自機方向への砲身トラッキング
        if (typeof player !== 'undefined') {
            const centerX = this.x + this.width / 2;
            const centerY = this.isCeiling ? this.groundY + 12 : this.groundY - 12;
            const targetAngle = Math.atan2(player.y - centerY, player.x - centerX);
            this.barrelAngle = targetAngle;
        }

        this.shootTimer++;
        if (this.shootTimer > 140) {
            this.shootTimer = 0;
            this.shoot();
        }
    }

    shoot() {
        if (typeof player === 'undefined' || typeof enemyBullets === 'undefined') return;
        const centerX = this.x + this.width / 2;
        const centerY = this.isCeiling ? this.groundY + 14 : this.groundY - 14;

        const dx = (player.x + player.width / 2) - centerX;
        const dy = (player.y + player.height / 2) - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist < 700) {
            const speed = 4.8; // レーザー特有のシャープな高速弾速
            const speedX = (dx / dist) * speed;
            const speedY = (dy / dist) * speed;

            // 砲身先端から発射
            const barrelLen = 22;
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

        // --- 1. ベースマウント（ハイテク・ネイビーチタン） ---
        const baseGrad = ctx.createLinearGradient(-20, 0, 20, 0);
        baseGrad.addColorStop(0.0, '#0f172a');
        baseGrad.addColorStop(0.3, '#1e293b');
        baseGrad.addColorStop(0.5, '#334155');
        baseGrad.addColorStop(0.7, '#1e293b');
        baseGrad.addColorStop(1.0, '#020617');
        ctx.fillStyle = baseGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.stroke();

        // --- 2. 旋回レーザー砲身 ---
        ctx.save();
        ctx.translate(0, -10);
        // isCeiling反転を考慮した砲身回転角の調整
        const drawAngle = this.isCeiling ? -this.barrelAngle : this.barrelAngle;
        ctx.rotate(drawAngle);

        // 砲身（ダブルバレル風のハイテクレーザーキャノン）
        const barrelGrad = ctx.createLinearGradient(0, -5, 24, 5);
        barrelGrad.addColorStop(0.0, '#475569');
        barrelGrad.addColorStop(0.5, '#94a3b8');
        barrelGrad.addColorStop(1.0, '#1e293b');
        ctx.fillStyle = barrelGrad;
        ctx.fillRect(0, -5, 22, 10);

        // レーザー集束コイル（シアンの発光ライン）
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 6;
        ctx.fillRect(6, -6, 2, 12);
        ctx.fillRect(12, -6, 2, 12);
        ctx.fillRect(18, -6, 2, 12);
        ctx.shadowBlur = 0;

        // 砲口レンズ
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(22, -4, 2, 8);

        ctx.restore();

        // --- 3. コントロール砲塔ドーム ---
        const domeGrad = ctx.createRadialGradient(-3, -16, 2, 0, -10, 14);
        domeGrad.addColorStop(0.0, '#e2e8f0');
        domeGrad.addColorStop(0.4, '#64748b');
        domeGrad.addColorStop(1.0, '#0f172a');
        ctx.fillStyle = domeGrad;
        ctx.beginPath();
        ctx.arc(0, -10, 13, Math.PI, 0);
        ctx.closePath();
        ctx.fill();

        // 光学アイ (シアンに輝くレンズ)
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(0, -10, 3.5, 0, Math.PI * 2);
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
    constructor(x, y, isCeiling = false) {
        super(x, y);
        this.width = 38;
        this.height = 32;
        this.isCeiling = isCeiling;
        this.shootTimer = Math.floor(Math.random() * 60);
        this.hp = 3;
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
            // 紫色の古代ルーン光弾
            enemyBullets.push(new Bullet(centerX, centerY, (dx / dist) * speed, (dy / dist) * speed, '#c084fc', true));
            if (typeof particles !== 'undefined') {
                for (let i = 0; i < 4; i++) {
                    particles.push(new Particle(centerX, centerY, '#c084fc'));
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
        baseGrad.addColorStop(0.0, '#1e1b4b');
        baseGrad.addColorStop(0.5, '#4338ca');
        baseGrad.addColorStop(1.0, '#0f172a');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(-18, -8, 36, 8);
        ctx.strokeStyle = '#818cf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(-18, -8, 36, 8);

        // 回転ルーン砲頭
        ctx.save();
        ctx.translate(0, -14);
        const drawAngle = this.isCeiling ? -this.barrelAngle : this.barrelAngle;
        ctx.rotate(drawAngle);

        // 砲身
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(0, -4, 20, 8);
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(18, -5, 3, 10);
        ctx.restore();

        // ルーンクリスタルアイ（紫色発光）
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#e9d5ff';
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
    constructor(x, y) {
        super(x, y);
        this.width = 38;
        this.height = 42;
        this.speed = 1.4;
        this.hp = 2;
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
        grad.addColorStop(0.0, '#94a3b8');
        grad.addColorStop(0.4, '#64748b');
        grad.addColorStop(1.0, '#1e293b');
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

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 巨大な目（シアン・発光アイ）
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.ellipse(14, 15, 6, 4, 0, 0, Math.PI * 2);
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
