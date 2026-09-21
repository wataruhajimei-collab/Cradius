class Option {
    constructor(player, delay) {
        this.player = player;
        this.delay = delay; // 何フレーム（または履歴のインデックス）遅れて追従するか
        this.x = player.x;
        this.y = player.y;
        this.width = 20;
        this.height = 20;
        this.color = '#ffaa00'; // オプションの色（オレンジ）
    }

    update() {
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
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
