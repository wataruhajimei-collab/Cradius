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

        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = -2;
        ctx.shadowOffsetY = 2;

        // 大きめの鋭角戦闘機
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.moveTo(20, 0);
        ctx.lineTo(-8, -13);
        ctx.lineTo(-16, -5);
        ctx.lineTo(-18, 0);
        ctx.lineTo(-16, 5);
        ctx.lineTo(-8, 13);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = this.trimColor;
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(2, -4);
        ctx.lineTo(-6, 0);
        ctx.lineTo(2, 4);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#00ffff';
        ctx.fillRect(0, -3, 8, 6);

        // バーニア
        ctx.shadowBlur = 0;
        const flame = 8 + Math.sin(this.animTimer * 2) * 4;
        ctx.fillStyle = '#00aaff';
        ctx.beginPath();
        ctx.moveTo(-18, -4);
        ctx.lineTo(-18 - flame, 0);
        ctx.lineTo(-18, 4);
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

        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 5;

        // 大きめの円盤扇型機
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.arc(0, 0, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.trimColor;
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#00ddff';
        ctx.beginPath();
        ctx.arc(3, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        // バーニア
        ctx.shadowBlur = 0;
        const flame = 8 + Math.sin(this.animTimer * 2) * 4;
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.moveTo(-16, -4);
        ctx.lineTo(-16 - flame, 0);
        ctx.lineTo(-16, 4);
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

        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-14, -11);
        ctx.lineTo(-8, 0);
        ctx.lineTo(-14, 11);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#44ddff';
        ctx.fillRect(-4, -3, 9, 6);

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
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, (40 - this.warpTimer), 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.rotate(this.rot);
            // 大きめの結晶体
            ctx.fillStyle = this.bodyColor;
            ctx.fillRect(-12, -12, 24, 24);

            ctx.fillStyle = this.trimColor;
            ctx.fillRect(-6, -6, 12, 12);

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
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
            const spd = 3.6; // 弾も少しゆっくり見やすく
            const bullet = new Bullet(centerX, centerY, (dx / dist) * spd, (dy / dist) * spd, '#ff44aa');
            bullet.width = 7;
            bullet.height = 7;
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

        ctx.strokeStyle = this.darkColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-9, -12);
        ctx.lineTo(-12 + leg1, 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(9, -12);
        ctx.lineTo(12 + leg2, 0);
        ctx.stroke();

        // 大きめのポッド胴体
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.arc(0, -18, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff0055';
        ctx.fillRect(-9, -21, 18, 5);

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

        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.moveTo(-25, 0);
        ctx.lineTo(-18, -30);
        ctx.lineTo(18, -30);
        ctx.lineTo(25, 0);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = this.hatchOpen ? '#00ffff' : this.darkColor;
        ctx.fillRect(-11, -28, 22, 11);

        ctx.fillStyle = '#00ffcc';
        ctx.fillRect(-16, -14, 8, 5);
        ctx.fillRect(8, -14, 8, 5);

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
        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
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

        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(-18, -12);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-18, 12);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = this.trimColor;
        ctx.fillRect(-4, -4, 12, 8);

        if (this.rushing) {
            const flame = 16 + Math.sin(this.animTimer * 2) * 6;
            ctx.fillStyle = '#00ddff';
            ctx.beginPath();
            ctx.moveTo(-14, -5);
            ctx.lineTo(-14 - flame, 0);
            ctx.lineTo(-14, 5);
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

        ctx.fillStyle = '#cc5522';
        ctx.beginPath();
        ctx.arc(0, 0, 13, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffff66';
        ctx.beginPath();
        ctx.arc(3, -3, 6, 0, Math.PI * 2);
        ctx.fill();

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
        this.barrelAngle = 0;
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
            const bullet = new Bullet(centerX, centerY, (dx / dist) * speed, (dy / dist) * speed, '#ff3388');
            bullet.width = 8;
            bullet.height = 8;
            enemyBullets.push(bullet);

            if (typeof particles !== 'undefined') {
                for (let i = 0; i < 4; i++) {
                    particles.push(new Particle(centerX, centerY, '#ffaaee'));
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

        ctx.fillStyle = '#222833';
        ctx.beginPath();
        ctx.ellipse(0, 0, 22, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.bodyColor;
        ctx.beginPath();
        ctx.arc(0, -12, 16, Math.PI, 0);
        ctx.fill();

        ctx.fillStyle = this.darkColor;
        ctx.fillRect(-20, -17, 12, 8);

        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.arc(3, -12, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
