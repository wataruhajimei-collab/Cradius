class UI {
    constructor() {
        this.powerUpItems = ['SPEEDUP', 'MISSILE', 'DOUBLE', 'LASER', 'OPTION', '?' ];
        this.itemWidth = 92;
        this.itemHeight = 24;
        this.y = 572; // 画面最下部（1985年AC実機同様、最下段フロアタイルの下半分に配置）

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
        return String(n);
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

        const topY = 8;

        // 左: 1P スコア（1985年AC版準拠の右寄せスコア配置）
        ctx.textAlign = 'left';
        ctx.fillStyle = '#88b8f8';
        ctx.fillText('1P', 36, topY);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#e0ecff';
        ctx.fillText(String(Math.floor(this.score || 0)), 228, topY);

        // 1P下の残機アイコン（上向きビックバイパー小型ドット絵 × 2機）
        for (let li = 0; li < 2; li++) {
            const lx = 38 + li * 20;
            const ly = topY + 18;
            // オレンジのバーニア＆ベース
            ctx.fillStyle = '#d87818';
            ctx.fillRect(lx + 2, ly + 10, 12, 4);
            // 白銀の機体ウイング
            ctx.fillStyle = '#f0f4ff';
            ctx.fillRect(lx + 6, ly, 4, 12);
            ctx.fillRect(lx + 4, ly + 4, 8, 8);
            ctx.fillRect(lx + 1, ly + 8, 14, 4);
            // コックピット暗部
            ctx.fillStyle = '#385888';
            ctx.fillRect(lx + 7, ly + 4, 2, 4);
        }

        // 中央: HI (ハイスコア - 1985年AC版準拠の配置)
        ctx.textAlign = 'left';
        const hiStartX = 290;
        ctx.fillStyle = '#88b8f8';
        ctx.fillText('HI', hiStartX, topY);
        ctx.textAlign = 'right';
        ctx.fillStyle = (this.score > 0 && this.score >= this.hiScore) ? '#ffea00' : '#e0ecff';
        ctx.fillText(String(Math.floor(this.hiScore || 57300)), hiStartX + 188, topY);

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
        // 3. 画面下部 パワーアップメーターの描画（参照画像の銀プレート＆濃紺＋黄色選択枠を完全再現）
        // ====================================================
        const startX = Math.round((canvasWidth - (this.itemWidth * this.powerUpItems.length + this.padding * (this.powerUpItems.length - 1))) / 2);

        ctx.save();
        for (let i = 0; i < this.powerUpItems.length; i++) {
            const x = startX + i * (this.itemWidth + this.padding);
            const canActivate = player ? player.canActivatePowerUp(i) : true;
            const isSelected = (i === powerUpIndex);

            if (isSelected) {
                // 選択中スロット：外枠#8C726C + 黄色ハイライト枠#FCEE04 + 濃紺背景#040224 + 黄色文字#ECDE04（1985年AC実機 grad0010.png）
                ctx.fillStyle = '#DCDECC';
                ctx.fillRect(x, this.y, this.itemWidth, this.itemHeight);
                ctx.fillStyle = '#ECDE04';
                ctx.fillRect(x + 2, this.y + 2, this.itemWidth - 4, this.itemHeight - 4);
                ctx.fillStyle = '#040224';
                ctx.fillRect(x + 4, this.y + 4, this.itemWidth - 8, this.itemHeight - 8);
            } else {
                // 通常スロット：外枠#8C726C、内枠#DCDECC、銀プレート#C4B2A4
                ctx.fillStyle = '#8C726C';
                ctx.fillRect(x, this.y, this.itemWidth, this.itemHeight);
                ctx.fillStyle = '#DCDECC';
                ctx.fillRect(x + 1, this.y + 1, this.itemWidth - 2, 2);
                ctx.fillStyle = '#C4B2A4';
                ctx.fillRect(x + 2, this.y + 3, this.itemWidth - 4, this.itemHeight - 5);
            }

            // 装備済みでない場合（または選択中）のみラベル文字を描画（装備済みはブランク銀板になる本家仕様）
            if (canActivate) {
                ctx.font = 'bold 12px "Press Start 2P", "Courier New", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                if (isSelected) {
                    ctx.fillStyle = '#ECDE04';
                } else {
                    ctx.fillStyle = '#04023C';
                }
                ctx.fillText(this.powerUpItems[i], x + this.itemWidth / 2, this.y + this.itemHeight / 2 + 1);
            }
        }
        ctx.restore();
    }
}

const ui = new UI();
if (typeof window !== 'undefined') {
    window.ui = ui;
    window.addScore = (pts, x, y, color) => ui.addScore(pts, x, y, color);
}

