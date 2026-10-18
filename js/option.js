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
        // 1985年アーケード版 オプション（OPTION / MULTIPUL）：
        // 4段階の同心円ドット層（ダークレッド外縁→朱赤→オレンジ→イエロー中心）が脈動する楕円エネルギー体
        ctx.save();
        const cx = Math.round(this.x + this.width / 2);
        const cy = Math.round(this.y + this.height / 2);
        const step = Math.floor(this.pulseTimer * 1.5) % 4;
        const expand = (step === 1 || step === 3) ? 0 : (step === 2 ? 1 : -1);

        const w0 = 24 + expand * 2;
        const h0 = 16 + expand * 2;

        // 1. 最外周ダークレッド層 (#881800)
        ctx.fillStyle = '#881800';
        ctx.fillRect(cx - w0 / 2 + 3, cy - h0 / 2, w0 - 6, h0);
        ctx.fillRect(cx - w0 / 2, cy - h0 / 2 + 3, w0, h0 - 6);
        ctx.fillRect(cx - w0 / 2 + 1, cy - h0 / 2 + 1, w0 - 2, h0 - 2);

        // 2. 第2層 クリムゾンオレンジ層 (#d84000)
        const w1 = w0 - 4;
        const h1 = h0 - 4;
        ctx.fillStyle = '#d84000';
        ctx.fillRect(cx - w1 / 2 + 2, cy - h1 / 2, w1 - 4, h1);
        ctx.fillRect(cx - w1 / 2, cy - h1 / 2 + 2, w1, h1 - 4);

        // 3. 第3層 ブライトオレンジ層 (#f88818)
        const w2 = w1 - 4;
        const h2 = h1 - 4;
        ctx.fillStyle = '#f88818';
        ctx.fillRect(cx - w2 / 2 + 1, cy - h2 / 2, w2 - 2, h2);
        ctx.fillRect(cx - w2 / 2, cy - h2 / 2 + 1, w2, h2 - 2);

        // 4. 中心 ゴールデンイエロー発光核 (#f8e828)
        ctx.fillStyle = '#f8e828';
        ctx.fillRect(cx - 4, cy - 2, 8, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 2, cy - 1, 3, 2);

        ctx.restore();
    }
}

