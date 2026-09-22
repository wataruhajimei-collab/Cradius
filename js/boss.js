class Boss {
    constructor(x, y) {
        this.scale = 2; // ユーザー要望によりボスの大きさを元の2倍（幅160px、高さ200px）に最適化！
        this.width = 80 * this.scale;   // 160px
        this.height = 100 * this.scale; // 200px
        this.x = x + 150; // 画面外右側から登場
        this.targetX = x - 200; // 画面右端（800px中 600〜760px）に堂々陣取る定位置
        this.y = 200;
        this.maxHp = 35;
        this.hp = 35;
        this.active = true;
        this.color = '#aa4444';
        
        // 遮蔽板: 5枚の金属風シールドプレート (各3発耐久、合計15発)
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
        this.isDying = false; // 撃破演出中フラグ
    }

    update() {
        if (this.isDying) return; // 撃破中は行動停止

        // 登場シーン（画面外から定位置へ素早くスムーズに前進）
        if (this.x > this.targetX) {
            this.x -= 3.2;
            return;
        }

        this.moveTimer += 0.02; // スムーズな上下浮動
        // 高さ200pxのボスが画面中央付近（Y: 80〜320、下端: 280〜520）を美しく移動
        this.y = 200 + Math.sin(this.moveTimer) * 120;
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
            // 遮蔽板全滅時はコア露出＆激しい猛攻モード
            this.coreOpen = true;
            this.coreTimer++;
            if (this.coreTimer > 75) {
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
        const startX = this.x - 15;
        const coreCenterY = this.y + 100;
        
        // 上下アーム砲台から2門ずつ、計4連ビーム
        this.bullets.push(new Bullet(startX, coreCenterY - 48, -7.0, 0, '#00ffff'));
        this.bullets.push(new Bullet(startX, coreCenterY - 16, -7.0, 0, '#ffaa00'));
        this.bullets.push(new Bullet(startX, coreCenterY + 16, -7.0, 0, '#ffaa00'));
        this.bullets.push(new Bullet(startX, coreCenterY + 48, -7.0, 0, '#00ffff'));
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

        // 撃破時の激しい振動（シェイク）と赤白フラッシュ
        if (this.isDying) {
            ctx.translate((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
            if (Math.floor(Date.now() / 60) % 2 === 0) {
                ctx.filter = 'brightness(2.2) saturate(2.0)';
            }
        }

        // 1. ボス本体の描画 (2倍スケール)
        if (typeof images !== 'undefined' && images.boss && images.boss.complete) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
            ctx.shadowBlur = 16;
            ctx.shadowOffsetX = -8;
            ctx.shadowOffsetY = 8;

            // 400px × 400px の2倍スケール画像描画
            ctx.drawImage(images.boss, this.x - 120, this.y - 100, 400, 400);

            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        } else {
            // 代替メカニカル描画
            this.drawMechanicalHull(ctx);
        }

        // 2倍スケールのコア中心と半径
        const coreX = this.x + 72;
        const coreY = this.y + 100;
        const coreR = 32;

        // 2. 立体感と輝きのある2倍ハイテク・クリスタルコア
        this.drawHighTechCore(ctx, coreX, coreY, coreR);

        // 3. 2倍サイズの5枚の金属風遮蔽板（シールドプレート）
        this.drawShieldPlates(ctx, coreX, coreY);

        ctx.restore();
        
        // 4. 弾の描画
        this.bullets.forEach(b => b.draw(ctx));
    }

    // メカニカルなハル（船体）の代替描画 (2倍スケール)
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
        ctx.fillRect(this.x - 40, this.y - 20, 80, 60);
        ctx.fillRect(this.x - 40, this.y + 160, 80, 60);
    }

    // 立体感と輝きのあるハイテク・クリスタルコア (2倍スケール)
    drawHighTechCore(ctx, coreX, coreY, r) {
        ctx.save();

        const pulse = Math.sin(Date.now() * 0.007) * 0.25 + 0.75;
        const hpRatio = Math.max(0, this.hp / this.maxHp);

        // HPに応じたコアの基本色（青 -> 黄 -> 赤）
        let baseColor, glowColor, darkColor;
        if (hpRatio > 0.6) {
            baseColor = '#00ddff';
            glowColor = '#0088ff';
            darkColor = '#002255';
        } else if (hpRatio > 0.3) {
            baseColor = '#ffea00';
            glowColor = '#ff8800';
            darkColor = '#553300';
        } else {
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

        // A. コア・マウントリング（重厚金属フレーム）
        ctx.beginPath();
        ctx.arc(coreX, coreY, r + 7, 0, Math.PI * 2);
        ctx.fillStyle = '#1c232d';
        ctx.fill();
        ctx.strokeStyle = '#4a5b6e';
        ctx.lineWidth = 4;
        ctx.stroke();

        // 6箇所の固定ボルト
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const rx = coreX + Math.cos(angle) * (r + 4.5);
            const ry = coreY + Math.sin(angle) * (r + 4.5);
            ctx.fillStyle = '#88a0b8';
            ctx.beginPath();
            ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // B. 多重エネルギーオーラ
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = (this.coreOpen ? 35 : 18) * pulse;

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
        ctx.lineWidth = 2.5;
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

        // E. 鏡面ハイライト
        ctx.fillStyle = `rgba(255, 255, 255, ${0.65 * pulse})`;
        ctx.beginPath();
        ctx.ellipse(coreX - r * 0.3, coreY - r * 0.3, r * 0.45, r * 0.22, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        // F. コア開放時の放出パルスリング
        if (this.coreOpen) {
            const waveR = r + (Date.now() * 0.025 % 20);
            const waveAlpha = Math.max(0, 1 - (waveR - r) / 20);
            ctx.strokeStyle = `rgba(255, 255, 255, ${waveAlpha * 0.7})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(coreX, coreY, waveR, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    // 2倍サイズの5枚の金属風遮蔽板（シールドプレート）
    drawShieldPlates(ctx, coreX, coreY) {
        if (this.shields <= 0) return;

        const plateW = 10;
        const plateH = 76;
        const spacing = 14;
        const startX = coreX - 36;

        for (let i = 0; i < this.shields; i++) {
            const px = startX - (this.shields - 1 - i) * spacing;
            const py = coreY - plateH / 2;

            const isFrontPlate = (i === 0);
            const isFlashing = isFrontPlate && (this.shieldFlashTimer > 0);

            ctx.save();

            ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetX = -3;
            ctx.shadowOffsetY = 3;

            // チタングラデーション
            const metalGrad = ctx.createLinearGradient(px, py, px + plateW, py);
            if (isFlashing) {
                metalGrad.addColorStop(0, '#ffffff');
                metalGrad.addColorStop(0.5, '#ffeeaa');
                metalGrad.addColorStop(1, '#ffffff');
            } else {
                metalGrad.addColorStop(0, '#e2ecf5');
                metalGrad.addColorStop(0.35, '#8da0b3');
                metalGrad.addColorStop(0.85, '#3b4958');
                metalGrad.addColorStop(1, '#1b232c');
            }

            ctx.fillStyle = metalGrad;
            ctx.fillRect(px, py, plateW, plateH);

            // 金属ベベル枠
            ctx.strokeStyle = isFlashing ? '#ffffff' : '#99b3cc';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px, py, plateW, plateH);

            // 上下リベットボルト
            ctx.fillStyle = isFlashing ? '#ffffff' : '#222d38';
            ctx.fillRect(px + 2, py + 4, 6, 4);
            ctx.fillRect(px + 2, py + plateH - 8, 6, 4);

            // 冷却エナジーライン
            ctx.fillStyle = isFlashing ? '#ffaa00' : '#00ffee';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 6;
            ctx.fillRect(px + 3, py + plateH * 0.35, 3, plateH * 0.3);

            ctx.restore();
        }
    }

    // 遮蔽板の当たり判定バウンディングボックス (2倍スケール)
    getShieldBounds() {
        if (this.shields <= 0) return null;
        const coreX = this.x + 72;
        const coreY = this.y + 100;
        const plateW = 10;
        const plateH = 76;
        const spacing = 14;
        const startX = coreX - 36;
        const frontX = startX - (this.shields - 1) * spacing;
        const totalW = (this.shields - 1) * spacing + plateW;

        return {
            x: frontX,
            y: coreY - plateH / 2,
            width: totalW,
            height: plateH
        };
    }

    // コアの当たり判定バウンディングボックス (2倍スケール)
    getCoreBounds() {
        const coreX = this.x + 72;
        const coreY = this.y + 100;
        const r = 32;
        return {
            x: coreX - r,
            y: coreY - r,
            width: r * 2,
            height: r * 2
        };
    }

    // 上部ハル（無敵装甲アーム）の当たり判定 (2倍スケール)
    getTopHullBounds() {
        return {
            x: this.x - 30,
            y: this.y,
            width: this.width + 30,
            height: 64
        };
    }

    // 下部ハル（無敵装甲アーム）の当たり判定 (2倍スケール)
    getBottomHullBounds() {
        return {
            x: this.x - 30,
            y: this.y + 136,
            width: this.width + 30,
            height: 64
        };
    }
}
