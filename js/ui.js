class UI {
    constructor() {
        this.powerUpItems = ['SPEED', 'MISSILE', 'DOUBLE', 'LASER', 'OPTION', '?' ];
        this.itemWidth = 90;
        this.itemHeight = 30;
        this.padding = 10;
        this.y = 550; // 画面下部
    }

    draw(ctx, canvasWidth, playerOrIndex) {
        let player = null;
        let powerUpIndex = -1;

        if (typeof playerOrIndex === 'object' && playerOrIndex !== null) {
            player = playerOrIndex;
            powerUpIndex = player.powerUpIndex;
        } else if (typeof playerOrIndex === 'number') {
            powerUpIndex = playerOrIndex;
        }

        const startX = (canvasWidth - (this.itemWidth * this.powerUpItems.length + this.padding * (this.powerUpItems.length - 1))) / 2;

        for (let i = 0; i < this.powerUpItems.length; i++) {
            const x = startX + i * (this.itemWidth + this.padding);
            const canActivate = player ? player.canActivatePowerUp(i) : true;
            const isSelected = (i === powerUpIndex);
            
            // 背景と枠線のスタイル決定
            if (isSelected) {
                if (canActivate) {
                    // 選択可能スロットを選択中: 鮮やかなオレンジ
                    ctx.fillStyle = '#ff8800';
                    ctx.strokeStyle = '#ffffff';
                } else {
                    // 選択不可（取得済み）スロットを選択中: 暗いトーンで発動不可を明示
                    ctx.fillStyle = '#221105';
                    ctx.strokeStyle = '#664422';
                }
            } else {
                if (canActivate) {
                    // 選択可能スロット（非選択）
                    ctx.fillStyle = '#000000';
                    ctx.strokeStyle = '#555555';
                } else {
                    // 選択不可（取得済み）スロット（非選択）: グレーアウト
                    ctx.fillStyle = '#050505';
                    ctx.strokeStyle = '#222222';
                }
            }
            
            ctx.fillRect(x, this.y, this.itemWidth, this.itemHeight);
            ctx.lineWidth = 2;
            ctx.strokeRect(x, this.y, this.itemWidth, this.itemHeight);

            // テキストの描画
            if (isSelected) {
                ctx.fillStyle = canActivate ? '#000000' : '#886644';
            } else {
                ctx.fillStyle = canActivate ? '#00ffff' : '#334444';
            }
            
            ctx.font = 'bold 16px Courier New';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.powerUpItems[i], x + this.itemWidth / 2, this.y + this.itemHeight / 2);
        }
    }
}

const ui = new UI();
