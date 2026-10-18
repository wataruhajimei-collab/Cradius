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
        // 1985年アーケード版 パワーカプセル：実機 12x10 ドット行列完全再現 (1dot=2.5px -> 30x25)
        if (!PowerUpCapsule._canvasRed || !PowerUpCapsule._canvasBlue) {
            const palRed = {
                '1': '#8C726C', '2': '#DCDECC', '3': '#740204', '4': '#C40204',
                '5': '#EC0224', '6': '#FC9A04', '7': '#ECDE04', '8': '#FCFEFC'
            };
            const palBlue = {
                '1': '#8C726C', '2': '#DCDECC', '3': '#040274', '4': '#1C72C4',
                '5': '#7CC2FC', '6': '#B4DEFC', '7': '#DCFEFC', '8': '#FCFEFC'
            };
            const rows0 = [
                "12........21",
                "234444444432",
                ".4555665554.",
                ".4566776654.",
                ".4677887764.",
                ".4677887764.",
                ".4566776654.",
                ".4555665554.",
                "234444444432",
                "12........21"
            ];
            const rows1 = [
                "12........21",
                "234444444432",
                ".4556666554.",
                ".4567777654.",
                ".4678888764.",
                ".4678888764.",
                ".4567777654.",
                ".4556666554.",
                "234444444432",
                "12........21"
            ];
            const makeC = (pal, rows) => {
                const S = 3;
                const c = document.createElement('canvas');
                c.width = 12 * S;
                c.height = 10 * S;
                const g = c.getContext('2d');
                rows.forEach((r, y) => {
                    for (let x = 0; x < 12; x++) {
                        const col = pal[r[x]];
                        if (!col) continue;
                        g.fillStyle = col;
                        g.fillRect(x * S, y * S, S, S);
                    }
                });
                return c;
            };
            PowerUpCapsule._canvasRed = [makeC(palRed, rows0), makeC(palRed, rows1)];
            PowerUpCapsule._canvasBlue = [makeC(palBlue, rows0), makeC(palBlue, rows1)];
        }

        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const phase = Math.floor(this.animTimer) % 2;
        const arr = this.isBlue ? PowerUpCapsule._canvasBlue : PowerUpCapsule._canvasRed;
        const spr = arr[phase];
        const cx = Math.round(this.x + this.width / 2 - spr.width / 2);
        const cy = Math.round(this.y + this.height / 2 - spr.height / 2);
        ctx.drawImage(spr, cx, cy);
        ctx.restore();
    }
}

