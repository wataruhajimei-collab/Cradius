class Bullet {
    constructor(x, y, speedX, speedY, color = '#ffffff', isEnemy = false) {
        this.x = x;
        this.y = y;
        this.width = isEnemy ? 10 : 15;
        this.height = isEnemy ? 10 : 4;
        this.speedX = speedX;
        this.speedY = speedY;
        this.color = color;
        this.active = true;
        this.isEnemy = isEnemy;
    }

    update(canvasHeight = 600) {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < -80 || this.x > 880 || this.y < -50 || this.y > canvasHeight + 50) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (this.isEnemy) {
            ctx.save();
            const r = this.width / 2;
            const cx = this.x + r;
            const cy = this.y + r;

            ctx.shadowColor = 'rgba(255, 255, 255, 0.45)';
            ctx.shadowBlur = 4;

            const grad = ctx.createRadialGradient(cx - 1.5, cy - 1.5, 0.5, cx, cy, r);
            grad.addColorStop(0.0, '#ffffff'); // 超高輝度ハイライト
            grad.addColorStop(0.35, '#f4f6f9'); // 艶やかな白
            grad.addColorStop(0.65, '#cbd5e1'); // 陰影・スチールグレー
            grad.addColorStop(0.92, '#475569'); // 球体の立体影
            grad.addColorStop(1.0, '#1e293b');  // 輪郭のエッジリム

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx - 1.6, cy - 1.6, 1.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

// グラディウス伝統の陰影のある白い球体弾
class EnemyBullet extends Bullet {
    constructor(x, y, speedX, speedY) {
        super(x - 5, y - 5, speedX, speedY, '#ffffff', true);
        this.radius = 5;
        this.width = 10;
        this.height = 10;
    }
}

class Missile {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 12;
        this.height = 6;
        this.speedX = 4;
        this.speedY = 6;
        this.color = '#ff8800'; // ミサイルの色
        this.active = true;
    }

    update(canvasHeight) {
        this.x += this.speedX;
        this.y += this.speedY;

        let groundY = canvasHeight || 600;
        if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.active) {
            groundY = levelManager.terrain.getGroundY(this.x + this.width / 2);
        }

        if (this.y + this.height >= groundY) {
            this.y = groundY - this.height;
            this.speedY = 0; // 落下ストップ
            this.speedX = 6; // 地上を這う速度を少し上げる
        } else if (this.speedY === 0) {
            // 地形が下がった場合は再び落ちる
            this.speedY = 6;
            this.speedX = 4;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        // ミサイルの形
        ctx.beginPath();
        ctx.moveTo(this.x + this.width, this.y + this.height / 2);
        ctx.lineTo(this.x, this.y);
        ctx.lineTo(this.x, this.y + this.height);
        ctx.closePath();
        ctx.fill();
    }
}

class Laser {
    constructor(owner, offsetY, x, speedX, color = '#00ffff') {
        this.owner = owner;
        this.offsetY = offsetY;
        this.x = x;
        this.y = owner.y + offsetY;
        this.width = 5000; // ユーザー要望により長さを2倍（2500 -> 5000）に延長
        this.height = 3; // 極細シャープなグラディウスレーザー
        this.speedX = speedX;
        this.color = color;
        this.active = true;
    }

    update(canvasHeight) {
        this.x += this.speedX;
        // 常に発射元（自機またはオプション）のY座標にリアルタイム追従
        this.y = this.owner.y + this.offsetY;
    }

    draw(ctx) {
        ctx.save();
        // 外側のシアン発光ビーム
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // 中心の高輝度白コア（極細1px）
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x, this.y + 1, this.width, 1);
        ctx.restore();
    }
}

// 敵の短いレーザー弾 (EnemyLaser: 高速で鋭いビーム光線)
class EnemyLaser extends Bullet {
    constructor(x, y, speedX, speedY, color = '#00ffee') {
        super(x - 6, y - 6, speedX, speedY, color, true);
        this.length = 42; // レーザーの長さ
        this.thickness = 5; // レーザーの太さ
        this.angle = Math.atan2(speedY, speedX);
        this.width = 14;
        this.height = 14;
        this.color = color;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.angle);

        // 外側グロー光彩
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;

        // レーザー外郭 (鋭い先端を持つ細長いビーム)
        const halfL = this.length / 2;
        const halfT = this.thickness / 2;

        const grad = ctx.createLinearGradient(-halfL, 0, halfL, 0);
        grad.addColorStop(0.0, 'rgba(0, 255, 255, 0.2)');
        grad.addColorStop(0.3, this.color);
        grad.addColorStop(0.8, '#ffffff');
        grad.addColorStop(1.0, '#ffffff');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(halfL + 4, 0); // 先頭鋭角
        ctx.lineTo(halfL - 4, -halfT);
        ctx.lineTo(-halfL, -halfT * 0.7);
        ctx.lineTo(-halfL, halfT * 0.7);
        ctx.lineTo(halfL - 4, halfT);
        ctx.closePath();
        ctx.fill();

        // 中心ホワイトコア
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-halfL * 0.7, -1, this.length * 0.8, 2);

        ctx.restore();
    }
}
