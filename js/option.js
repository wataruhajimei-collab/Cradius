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
        // 1985年アーケード版 オプション：grad0017.png から抽出した 16x10 ドット行列（1dot=3px）
        if (!Option._canvas) {
            const pal = { '1': '#740204', '2': '#A44A14', '3': '#8C0204', '4': '#C46A24',
                          '5': '#DC7E34', '6': '#FCA67C', '7': '#FCC2A4', '8': '#ECDE04' };
            const rows = [
                ".....111111.....",
                "...1122222211...",
                "..132455554231..",
                ".11246788764211.",
                ".11457888875411.",
                ".11457888875411.",
                ".11246788764211.",
                "..132455554231..",
                "...1122222211...",
                ".....111111....."
            ];
            const S = 3;
            const c = document.createElement('canvas');
            c.width = 16 * S;
            c.height = 10 * S;
            const g = c.getContext('2d');
            rows.forEach((r, y) => {
                for (let x = 0; x < 16; x++) {
                    if (!pal[r[x]]) continue;
                    g.fillStyle = pal[r[x]];
                    g.fillRect(x * S, y * S, S, S);
                }
            });
            Option._canvas = c;
        }
        const spr = Option._canvas;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(spr, Math.round(this.x + this.width / 2 - spr.width / 2), Math.round(this.y + this.height / 2 - spr.height / 2));
        ctx.restore();
    }
}

