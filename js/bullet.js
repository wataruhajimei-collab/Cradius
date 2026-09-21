class Bullet {
    constructor(x, y, speedX, speedY, color = '#ffffff') {
        this.x = x;
        this.y = y;
        this.width = 15;
        this.height = 4;
        this.speedX = speedX;
        this.speedY = speedY;
        this.color = color;
        this.active = true;
    }

    update(canvasHeight = 600) {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.x < -80 || this.x > 880 || this.y < -50 || this.y > canvasHeight + 50) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
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
        this.width = 500; // 長大な本格グラディウスレーザー
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
