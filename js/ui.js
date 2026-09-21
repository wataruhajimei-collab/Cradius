class UI {
    constructor() {
        this.powerUpItems = ['SPEED', 'MISSILE', 'DOUBLE', 'LASER', 'OPTION', '?' ];
        this.itemWidth = 90;
        this.itemHeight = 30;
        this.padding = 10;
        this.y = 550; // 画面下部
    }

    draw(ctx, canvasWidth, powerUpIndex) {
        const startX = (canvasWidth - (this.itemWidth * this.powerUpItems.length + this.padding * (this.powerUpItems.length - 1))) / 2;

        for (let i = 0; i < this.powerUpItems.length; i++) {
            const x = startX + i * (this.itemWidth + this.padding);
            
            // 枠の描画
            ctx.strokeStyle = '#555555';
            if (i === powerUpIndex) {
                // 選択中
                ctx.fillStyle = '#ff8800';
                ctx.fillRect(x, this.y, this.itemWidth, this.itemHeight);
                ctx.strokeStyle = '#ffffff';
            } else {
                ctx.fillStyle = '#000000';
                ctx.fillRect(x, this.y, this.itemWidth, this.itemHeight);
            }
            
            ctx.lineWidth = 2;
            ctx.strokeRect(x, this.y, this.itemWidth, this.itemHeight);

            // テキストの描画
            ctx.fillStyle = i === powerUpIndex ? '#000000' : '#00ffff';
            ctx.font = '16px Courier New';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.powerUpItems[i], x + this.itemWidth / 2, this.y + this.itemHeight / 2);
        }
    }
}

const ui = new UI();
