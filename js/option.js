class Option {
    constructor(player, delay) {
        this.player = player;
        this.delay = delay; // 何フレーム（または履歴のインデックス）遅れて追従するか
        this.x = player.x;
        this.y = player.y;
        this.width = 30;  // 少し大きく（20 -> 30）
        this.height = 24; // グラディウスらしい存在感のある楕円球サイズ（20 -> 24）
        this.color = '#ffaa00';
        this.pulseTimer = delay * 0.1;
    }

    update() {
        this.pulseTimer += 0.15;
        // プレイヤーの履歴から位置を取得
        // 履歴がまだ十分にない場合は、取得できる一番古い位置（自機の現在位置付近）を使用する
        const targetIndex = Math.min(this.delay, this.player.history.length - 1);
        if (targetIndex >= 0) {
            const pos = this.player.history[targetIndex];
            this.x = pos.x;
            this.y = pos.y;
        }
    }

    draw(ctx) {
        ctx.save();
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const pulse = Math.sin(this.pulseTimer) * 1.2;
        const rx = (this.width / 2) + pulse * 0.6;
        const ry = (this.height / 2) + pulse * 0.4;

        // 外側のエネルギー発光オーラ
        ctx.shadowColor = '#ff5500';
        ctx.shadowBlur = 10 + pulse * 2;

        // グラディウス伝統の多段階プラズマグラデーション（白黄〜黄金オレンジ〜紅蓮レッド）
        const grad = ctx.createRadialGradient(cx - 3, cy - 3, 1.5, cx, cy, rx);
        grad.addColorStop(0.0, '#ffffff');
        grad.addColorStop(0.22, '#fff066');
        grad.addColorStop(0.50, '#ff9900');
        grad.addColorStop(0.80, '#ff3300');
        grad.addColorStop(1.0, '#990a00');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // 内部の光のリング＆ハイライトコア
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255, 240, 150, 0.65)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(cx - 1, cy - 0.5, rx * 0.65, ry * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(cx - 3.5, cy - 2.5, 4.2, 2.5, -0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

