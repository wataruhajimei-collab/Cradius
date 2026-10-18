class PowerUpCapsule {
    constructor(x, y, isBlue = false) {
        this.x = x;
        this.y = y;
        this.width = 22;
        this.height = 18;
        this.speedX = -1.5; // 背景と同じようにスクロール
        this.active = true;
        this.isBlue = isBlue;
        this.animTimer = Math.random() * 10;
    }

    update() {
        this.x += this.speedX;
        this.animTimer += 0.25;
        // 画面外に出たら消す
        if (this.x + this.width < 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        // 1985年アーケード版 パワーカプセル（赤カプセル／青カプセル）：
        // 四隅に白い斜めプロング（爪）を備え、中央の赤オレンジ（または青）の十字コアが点滅回転するドット絵
        ctx.save();
        const cx = Math.round(this.x + this.width / 2);
        const cy = Math.round(this.y + this.height / 2);
        const phase = Math.floor(this.animTimer) % 2;

        ctx.translate(cx, cy);

        // 1. 四隅のシルバーホワイト・プロング（斜め突起）
        ctx.fillStyle = phase === 0 ? '#dce8f8' : '#98b0d0';
        ctx.fillRect(-8, -7, 4, 3);
        ctx.fillRect(4, -7, 4, 3);
        ctx.fillRect(-8, 4, 4, 3);
        ctx.fillRect(4, 4, 4, 3);

        // 2. カプセル外周リング（赤カプセル＝ダークレッド＆オレンジ、青カプセル＝ディープブルー＆シアン）
        const outerCol = this.isBlue ? '#1848c8' : '#b82000';
        const midCol   = this.isBlue ? '#3898ff' : '#f86818';
        const coreCol  = this.isBlue ? '#b8f0ff' : '#f8e830';

        ctx.fillStyle = outerCol;
        ctx.fillRect(-7, -5, 14, 10);
        ctx.fillRect(-5, -7, 10, 14);

        // 3. 中間発光ボディ
        ctx.fillStyle = midCol;
        ctx.fillRect(-5, -4, 10, 8);
        ctx.fillRect(-3, -6, 6, 12);

        // 4. 中心コア（フレームごとに十字⇔ひし形に脈動）
        ctx.fillStyle = coreCol;
        if (phase === 0) {
            ctx.fillRect(-4, -2, 8, 4);
            ctx.fillRect(-2, -4, 4, 8);
        } else {
            ctx.fillRect(-3, -3, 6, 6);
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1, -1, 2, 2);

        ctx.restore();
    }
}

