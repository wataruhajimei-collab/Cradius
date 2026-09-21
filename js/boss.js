class Boss {
    constructor(x, y) {
        this.x = x + 200; // 画面外から登場
        this.targetX = x - 100; // 定位置
        this.y = y;
        this.width = 80;
        this.height = 100;
        this.maxHp = 30;
        this.hp = 30;
        this.active = true;
        this.color = '#aa4444';
        
        // 遮蔽板: 5枚の金属風シールドプレート (各3発耐久、合計15発で全滅)
        this.maxShields = 5;
        this.shields = 5;
        this.shieldHpPerPlate = 3;
        this.currentShieldHp = this.shieldHpPerPlate;
        this.shieldFlashTimer = 0;
        this.hitFlashTimer = 0;

        this.coreOpen = false;
        this.coreTimer = 0;
        this.moveTimer = 0;
        this.rotationAngle = 0;
        this.bullets = [];
    }

    update() {
        // 登場シーン
        if (this.x > this.targetX) {
            this.x -= 2;
            return; // 登場中は攻撃しない
        }

        this.moveTimer += 0.02;
        this.y = 250 + Math.sin(this.moveTimer) * 150; // 上下移動
        this.rotationAngle += 0.04; // コア内部の回転

        if (this.shieldFlashTimer > 0) this.shieldFlashTimer--;
        if (this.hitFlashTimer > 0) this.hitFlashTimer--;

        // 遮蔽板が残っている場合は定期的に開閉、遮蔽板が全て破壊されたらコアは常時露出
        if (this.shields > 0) {
            this.coreTimer++;
            if (this.coreTimer > 120) {
                this.coreOpen = !this.coreOpen;
                this.coreTimer = 0;
                if (this.coreOpen) {
                    this.shoot();
                }
            }
        } else {
            // 遮蔽板全滅時はコア露出＆激しい攻撃モード
            this.coreOpen = true;
            this.coreTimer++;
            if (this.coreTimer > 80) {
                this.coreTimer = 0;
                this.shoot();
            }
        }
        
        // ボスの弾の更新
        this.bullets.forEach(b => b.update(600));
        this.bullets = this.bullets.filter(b => b.active);
    }

    shoot() {
        // ビッグコア伝統の4連レーザー・スプレッドショット！
        const startX = this.x - 10;
        const coreCenterY = this.y + 50;
        
        // 上下アーム砲台から2門ずつ、計4連ビーム
        this.bullets.push(new Bullet(startX, coreCenterY - 24, -6.5, 0, '#00ffff'));
        this.bullets.push(new Bullet(startX, coreCenterY - 8,  -6.5, 0, '#ffaa00'));
        this.bullets.push(new Bullet(startX, coreCenterY + 8,  -6.5, 0, '#ffaa00'));
        this.bullets.push(new Bullet(startX, coreCenterY + 24, -6.5, 0, '#00ffff'));
    }

    // 遮蔽板ダメージ処理
    hitShield() {
        this.shieldFlashTimer = 4;
        this.currentShieldHp--;
        if (this.currentShieldHp <= 0) {
            this.shields--;
            this.currentShieldHp = this.shieldHpPerPlate;
            return true; // 1枚破壊
        }
        return false;
    }

    // コアダメージ処理
    hitCore(damage = 1) {
        this.hitFlashTimer = 4;
        this.hp -= damage;
    }

    draw(ctx) {
        ctx.save();

        // 1. ボス本体の描画
        if (typeof images !== 'undefined' && images.boss && images.boss.complete) {
            // 立体感を際立たせるドロップシャドウ
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 12;
            ctx.shadowOffsetX = -6;
            ctx.shadowOffsetY = 6;

            ctx.drawImage(images.boss, this.x - 60, this.y - 50, 200, 200);

            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        } else {
            // 代替メカニカル描画
            this.drawMechanicalHull(ctx);
        }

        const coreX = this.x + 36;
        const coreY = this.y + 50;
        const coreR = 16;

        // 2. 立体感と輝きのあるコアの描画
        this.drawHighTechCore(ctx, coreX, coreY, coreR);

        // 3. 5枚の金属風遮蔽板（シールドプレート）の描画
        this.drawShieldPlates(ctx, coreX, coreY);

        ctx.restore();
        
        // 4. 弾の描画
        this.bullets.forEach(b => b.draw(ctx));
    }

    // メカニカルなハル（船体）の代替描画
    drawMechanicalHull(ctx) {
        // メインハル
        const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y + this.height);
        grad.addColorStop(0, '#556677');
        grad.addColorStop(0.5, '#2a3542');
        grad.addColorStop(1, '#151d26');
        ctx.fillStyle = grad;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // 上部・下部アーム
        ctx.fillStyle = '#1e2631';
        ctx.fillRect(this.x - 20, this.y - 10, 40, 30);
        ctx.fillRect(this.x - 20, this.y + 80, 40, 30);
    }

    // 立体感と輝きのあるハイテク・クリスタルコア
    drawHighTechCore(ctx, coreX, coreY, r) {
        ctx.save();

        const pulse = Math.sin(Date.now() * 0.007) * 0.25 + 0.75;
        const hpRatio = Math.max(0, this.hp / this.maxHp);

        // HPに応じたコアの基本色（青 -> 黄 -> 赤）
        let baseColor, glowColor, darkColor;
        if (hpRatio > 0.6) {
            // 健全: 神秘のクリスタルブルー
            baseColor = '#00ddff';
            glowColor = '#0088ff';
            darkColor = '#002255';
        } else if (hpRatio > 0.3) {
            // 警告: エナジー過負荷イエロー
            baseColor = '#ffea00';
            glowColor = '#ff8800';
            darkColor = '#553300';
        } else {
            // 瀕死: 暴走クリムゾンレッド（激しく点滅）
            const flash = (Math.floor(Date.now() / 100) % 2 === 0);
            baseColor = flash ? '#ffffff' : '#ff2200';
            glowColor = '#ff0033';
            darkColor = '#660011';
        }

        // 被弾フラッシュ
        if (this.hitFlashTimer > 0) {
            baseColor = '#ffffff';
            glowColor = '#ffffff';
        }

        // A. コア・マウントリング（外枠の重厚金属フレーム）
        ctx.beginPath();
        ctx.arc(coreX, coreY, r + 4, 0, Math.PI * 2);
        ctx.fillStyle = '#1c232d';
        ctx.fill();
        ctx.strokeStyle = '#4a5b6e';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 4箇所の固定リベット
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 2) * i + Math.PI / 4;
            const rx = coreX + Math.cos(angle) * (r + 2.5);
            const ry = coreY + Math.sin(angle) * (r + 2.5);
            ctx.fillStyle = '#88a0b8';
            ctx.beginPath();
            ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // B. 多重エネルギーオーラ（輝きとグロー）
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = (this.coreOpen ? 22 : 10) * pulse;

        // C. 球体立体グラデーション（3D光沢スフィア）
        const sphereGrad = ctx.createRadialGradient(
            coreX - r * 0.35, coreY - r * 0.35, r * 0.1,
            coreX, coreY, r
        );
        sphereGrad.addColorStop(0, '#ffffff');
        sphereGrad.addColorStop(0.3, baseColor);
        sphereGrad.addColorStop(0.75, glowColor);
        sphereGrad.addColorStop(1, darkColor);

        ctx.fillStyle = sphereGrad;
        ctx.beginPath();
        ctx.arc(coreX, coreY, r, 0, Math.PI * 2);
        ctx.fill();

        // D. コア内部の回転するエネルギー集束リング
        ctx.save();
        ctx.translate(coreX, coreY);
        ctx.rotate(this.rotationAngle);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.45 * pulse})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i;
            const px = Math.cos(a) * (r * 0.65);
            const py = Math.sin(a) * (r * 0.65);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // E. 鏡面ハイライト（ガラス球体の反射光）
        ctx.fillStyle = `rgba(255, 255, 255, ${0.65 * pulse})`;
        ctx.beginPath();
        ctx.ellipse(coreX - r * 0.3, coreY - r * 0.3, r * 0.45, r * 0.22, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        // F. コアが開いている時の放出パルスリング
        if (this.coreOpen) {
            const waveR = r + (Date.now() * 0.02 % 12);
            const waveAlpha = Math.max(0, 1 - (waveR - r) / 12);
            ctx.strokeStyle = `rgba(255, 255, 255, ${waveAlpha * 0.6})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(coreX, coreY, waveR, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    // ボス本体に合わせた5枚の金属風遮蔽板（シールドプレート）
    drawShieldPlates(ctx, coreX, coreY) {
        if (this.shields <= 0) return; // 全滅時は描画なし

        // 遮蔽板の配置: コアの前方（左側）に5枚配置
        const plateW = 5;
        const plateH = 38;
        const spacing = 7;
        const startX = coreX - 18; // 最奥（第5プレート）の位置

        for (let i = 0; i < this.shields; i++) {
            // 左側（外側）が0番、奥（右側）が4番
            // 外側から破壊されていくため、残っている枚数に応じて内側から配置
            const plateIndex = (this.maxShields - this.shields) + i;
            const px = startX - (this.shields - 1 - i) * spacing;
            const py = coreY - plateH / 2;

            // 最前列（先頭）の板がダメージを受けている時のフラッシュ
            const isFrontPlate = (i === 0);
            const isFlashing = isFrontPlate && (this.shieldFlashTimer > 0);

            ctx.save();

            // ドロップシャドウ
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = -2;
            ctx.shadowOffsetY = 2;

            // 金属グラデーション（チタンシルバー〜ガンメタル）
            const metalGrad = ctx.createLinearGradient(px, py, px + plateW, py);
            if (isFlashing) {
                metalGrad.addColorStop(0, '#ffffff');
                metalGrad.addColorStop(0.5, '#ffeeaa');
                metalGrad.addColorStop(1, '#ffffff');
            } else {
                metalGrad.addColorStop(0, '#e2ecf5');   // 明るいハイライト面
                metalGrad.addColorStop(0.35, '#8da0b3'); // 中間チタン
                metalGrad.addColorStop(0.85, '#3b4958'); // 濃い金属シャドウ
                metalGrad.addColorStop(1, '#1b232c');   // 境界シャドウ
            }

            ctx.fillStyle = metalGrad;
            ctx.fillRect(px, py, plateW, plateH);

            // 金属プレートのシャープなベベル枠（立体感エッジ）
            ctx.strokeStyle = isFlashing ? '#ffffff' : '#99b3cc';
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, plateW, plateH);

            // 上下のリベット（固定六角ボルト）
            ctx.fillStyle = isFlashing ? '#ffffff' : '#222d38';
            ctx.fillRect(px + 1, py + 2, 3, 2);
            ctx.fillRect(px + 1, py + plateH - 4, 3, 2);

            // 中央の冷却スリット / エナジーライン
            ctx.fillStyle = isFlashing ? '#ffaa00' : '#00ffee';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 4;
            ctx.fillRect(px + 2, py + plateH * 0.35, 1.5, plateH * 0.3);

            ctx.restore();
        }
    }

    // 遮蔽板全体の当たり判定バウンディングボックスを取得
    getShieldBounds() {
        if (this.shields <= 0) return null;
        const coreX = this.x + 36;
        const coreY = this.y + 50;
        const plateW = 5;
        const plateH = 38;
        const spacing = 7;
        const startX = coreX - 18;
        const frontX = startX - (this.shields - 1) * spacing;
        const totalW = (this.shields - 1) * spacing + plateW;

        return {
            x: frontX,
            y: coreY - plateH / 2,
            width: totalW,
            height: plateH
        };
    }

    // コアの当たり判定バウンディングボックスを取得
    getCoreBounds() {
        const coreX = this.x + 36;
        const coreY = this.y + 50;
        const r = 16;
        return {
            x: coreX - r,
            y: coreY - r,
            width: r * 2,
            height: r * 2
        };
    }
}
