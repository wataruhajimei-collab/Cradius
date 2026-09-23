class PowerUpCapsule {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24; // グラディウスの縦長カプセルっぽく
        this.height = 16;
        this.speedX = -1.5; // 背景と同じようにスクロール
        this.active = true;
    }

    update() {
        this.x += this.speedX;
        // 画面外に出たら消す
        if (this.x + this.width < 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.save();
        if (typeof images !== 'undefined' && images.capsule && images.capsule.complete && images.capsule.naturalWidth > 0) {
            // パルス発光（グラディウスのカプセルらしい明滅感）
            const glow = Math.sin(Date.now() * 0.01) * 6 + 8;
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = glow;

            // 通常描画（ソリッド）
            ctx.drawImage(images.capsule, this.x - 6, this.y - 10, 36, 36);

            ctx.shadowBlur = 0;
        } else {
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(this.x + 4, this.y + 4, 8, 8);
        }
        ctx.restore();
    }
}
