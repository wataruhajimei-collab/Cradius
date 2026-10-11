class UI {
    constructor() {
        this.powerUpItems = ['SPEED', 'MISSILE', 'DOUBLE', 'LASER', 'OPTION', '?' ];
        this.itemWidth = 90;
        this.itemHeight = 30;
        this.padding = 10;
        this.y = 550; // 画面下部

        // スコア＆ハイスコア管理（コナミ伝統の初期ハイスコア 57300 点）
        this.score = 0;
        this.hiScore = 57300;
        try {
            const savedHi = localStorage.getItem('gradius_hi_score');
            if (savedHi !== null) {
                const parsed = parseInt(savedHi, 10);
                if (!isNaN(parsed) && parsed > this.hiScore) {
                    this.hiScore = parsed;
                }
            }
        } catch (e) {}

        // 1ST BONUS AT 30000PTS / AND THEN EVERY 80000PTS
        this.nextBonusScore = 30000;
        this.bonusStep = 80000;
        this.bonusBannerTimer = 0;
        this.bonusBannerText = '';

        // 撃破・取得時のフローティングスコア演出
        this.scorePopups = [];

        this.syncTitleScoreDom();
    }

    formatScore(val) {
        const n = Math.max(0, Math.floor(val || 0));
        return String(n).padStart(7, '0');
    }

    syncTitleScoreDom() {
        if (typeof document === 'undefined') return;
        const el1p = document.getElementById('title-1p-score');
        const elHi = document.getElementById('title-hi-score');
        if (el1p) el1p.textContent = this.formatScore(this.score);
        if (elHi) elHi.textContent = this.formatScore(this.hiScore);
    }

    resetScore() {
        this.score = 0;
        this.nextBonusScore = 30000;
        this.scorePopups = [];
        this.bonusBannerTimer = 0;
        this.syncTitleScoreDom();
    }

    addScore(pts, x = null, y = null, color = '#ffffaa') {
        const add = Math.floor(pts || 0);
        if (add <= 0) return;

        this.score += add;
        if (typeof window !== 'undefined') {
            window.score = this.score;
            if (window.player) window.player.score = this.score;
        }

        if (this.score > this.hiScore) {
            this.hiScore = this.score;
            try {
                localStorage.setItem('gradius_hi_score', String(this.hiScore));
            } catch (e) {}
        }

        // ボーナススコア到達判定 (30,000PTS & 以降 80,000PTS ごと)
        while (this.score >= this.nextBonusScore) {
            this.bonusBannerText = `BONUS ${this.nextBonusScore.toLocaleString()} PTS!`;
            this.bonusBannerTimer = 110;
            this.nextBonusScore += this.bonusStep;
            if (typeof Sound !== 'undefined' && typeof Sound.playPowerUp === 'function') {
                Sound.playPowerUp();
            }
        }

        if (x !== null && y !== null && !isNaN(x) && !isNaN(y)) {
            this.scorePopups.push({
                x,
                y,
                text: String(add),
                color: color || '#ffffaa',
                large: add >= 1000,
                timer: 42,
                maxTimer: 42
            });
            if (this.scorePopups.length > 35) {
                this.scorePopups.shift();
            }
        }

        this.syncTitleScoreDom();
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

        // ====================================================
        // 1. 画面上部 アーケード・スコアヘッダー (1P / HI / STAGE)
        // ====================================================
        ctx.save();
        ctx.font = 'bold 16px "Press Start 2P", "Courier New", monospace';
        ctx.textBaseline = 'top';
        ctx.shadowColor = '#071936';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        const topY = 12;

        // 左: 1P スコア
        ctx.textAlign = 'left';
        ctx.fillStyle = '#4ea8eb';
        ctx.fillText('1P', 28, topY);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.formatScore(this.score), 78, topY);

        // 中央: HI (ハイスコア)
        ctx.textAlign = 'center';
        const hiCenterX = canvasWidth / 2;
        ctx.fillStyle = '#4ea8eb';
        ctx.fillText('HI', hiCenterX - 68, topY);
        ctx.fillStyle = (this.score > 0 && this.score >= this.hiScore) ? '#ffea00' : '#ffffff';
        ctx.fillText(this.formatScore(this.hiScore), hiCenterX + 18, topY);

        // 右: STAGE 表示
        const currentStage = (typeof levelManager !== 'undefined' && levelManager && levelManager.stage) ? levelManager.stage : 1;
        ctx.textAlign = 'right';
        ctx.fillStyle = '#4ea8eb';
        ctx.fillText('STAGE', canvasWidth - 54, topY);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(String(currentStage), canvasWidth - 28, topY);

        // ボーナス到達バナー演出
        if (this.bonusBannerTimer > 0) {
            this.bonusBannerTimer--;
            if (Math.floor(this.bonusBannerTimer / 4) % 2 === 0) {
                ctx.textAlign = 'center';
                ctx.font = 'bold 14px "Press Start 2P", "Courier New", monospace';
                ctx.fillStyle = '#ffea00';
                ctx.fillText(this.bonusBannerText, canvasWidth / 2, topY + 24);
            }
        }
        ctx.restore();

        // ====================================================
        // 2. 撃破・取得フローティングスコアの描画と更新
        // ====================================================
        if (this.scorePopups.length > 0) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            for (let i = this.scorePopups.length - 1; i >= 0; i--) {
                const p = this.scorePopups[i];
                p.y -= 0.65;
                p.timer--;
                const alpha = Math.max(0, Math.min(1, p.timer / 16));
                ctx.globalAlpha = alpha;
                ctx.font = p.large ? 'bold 15px "Press Start 2P", "Courier New", monospace' : 'bold 11px "Press Start 2P", "Courier New", monospace';
                ctx.fillStyle = '#000000';
                ctx.fillText(p.text, p.x + 1, p.y + 1);
                ctx.fillStyle = p.color;
                ctx.fillText(p.text, p.x, p.y);
                if (p.timer <= 0) {
                    this.scorePopups.splice(i, 1);
                }
            }
            ctx.restore();
        }

        // ====================================================
        // 3. 画面下部 パワーアップメーターの描画
        // ====================================================
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
if (typeof window !== 'undefined') {
    window.ui = ui;
    window.addScore = (pts, x, y, color) => ui.addScore(pts, x, y, color);
}

