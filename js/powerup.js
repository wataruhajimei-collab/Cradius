class PowerUpCapsule {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 38; // 横長のパワーコア
        this.height = 22;
        this.speedX = -1.5; // 背景と同じようにスクロール
        this.active = true;
        this.animTimer = Math.random() * Math.PI * 2;
    }

    update() {
        this.x += this.speedX;
        this.animTimer += 0.14;
        // 画面外に出たら消す
        if (this.x + this.width < 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.save();
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const pulse = (Math.sin(this.animTimer) + 1) * 0.5; // 0.0 ~ 1.0

        ctx.translate(cx, cy);

        // 1. 上下合計6本のトゲ（上3本・下3本）
        const spikeXOffsets = [-10, 0, 10];
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.2;

        // 上側3本のトゲ
        spikeXOffsets.forEach(sx => {
            ctx.beginPath();
            ctx.moveTo(sx - 3.5, -5);
            ctx.lineTo(sx, -12);
            ctx.lineTo(sx + 3.5, -5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });

        // 下側3本のトゲ
        spikeXOffsets.forEach(sx => {
            ctx.beginPath();
            ctx.moveTo(sx - 3.5, 5);
            ctx.lineTo(sx, 12);
            ctx.lineTo(sx + 3.5, 5);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });

        // 2. 横長カプセル外殻フレーム（メタリックグレー・八角形風の横長ボディ）
        const bodyGrad = ctx.createLinearGradient(0, -6, 0, 6);
        bodyGrad.addColorStop(0.0, '#f8fafc');
        bodyGrad.addColorStop(0.35, '#94a3b8');
        bodyGrad.addColorStop(0.7, '#475569');
        bodyGrad.addColorStop(1.0, '#1e293b');
        ctx.fillStyle = bodyGrad;

        ctx.beginPath();
        ctx.moveTo(-13, -6);
        ctx.lineTo(13, -6);
        ctx.lineTo(18, -2.5);
        ctx.lineTo(18, 2.5);
        ctx.lineTo(13, 6);
        ctx.lineTo(-13, 6);
        ctx.lineTo(-18, 2.5);
        ctx.lineTo(-18, -2.5);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // 左右のメカニカルキャップ装飾
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-16, -2, 3, 4);
        ctx.fillRect(13, -2, 3, 4);

        // 3. 中央の横長発光エネルギーコア（赤〜オレンジ〜イエローの明滅グラデーション）
        const coreGrad = ctx.createRadialGradient(-2, -1, 1, 0, 0, 11);
        coreGrad.addColorStop(0.0, '#ffffff');
        coreGrad.addColorStop(0.25, pulse > 0.5 ? '#ffff66' : '#ffcc00');
        coreGrad.addColorStop(0.65, '#ff5500');
        coreGrad.addColorStop(1.0, '#b91c1c');

        ctx.save();
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 6 + pulse * 6;
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 10, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // コア中心のハイライト
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-2.5, -1.2, 4, 1.3, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

