class Boss {
    constructor(x, y) {
        this.scale = 3; // ユーザー要望によりボスを3倍の大きさに巨大化！
        this.width = 80 * this.scale;  // 240px
        this.height = 100 * this.scale; // 300px
        this.x = x + 300; // 画面外から登場
        this.targetX = x - 270; // 巨大な巨体が画面右側に堂々陣取る定位置
        this.y = 150;
        this.maxHp = 45;
        this.hp = 45;
        this.active = true;
        this.color = '#aa4444';
        
        // 遮蔽板: 5枚の金属風シールドプレート (各4発耐久、合計20発で全滅)
        this.maxShields = 5;
        this.shields = 5;
        this.shieldHpPerPlate = 4;
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

        // 登場シーン（巨大戦艦が重厚に侵入）
        if (this.x > this.targetX) {
            this.x -= 2.2;
            return;
        }

        this.moveTimer += 0.016; // 巨体ならではの重厚で滑らかな浮遊移動
        // 高さ300pxの巨体が画面(600px)の上下中央付近(Y: 50〜250)を雄大に浮遊
        this.y = 150 + Math.sin(this.moveTimer) * 95;
        this.rotationAngle += 0.035; // コア内部の回転

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
        // ビッグコア伝統の超巨大4連レーザー・スプレッドショット！
        const startX = this.x - 25;
        const coreCenterY = this.y + 150;
        
        // 上下アーム先端の砲門（上下に大きく広がった4門）から超高速極太ビーム斉射！
        this.bullets.push(new Bullet(startX, coreCenterY - 80, -7.0, 0, '#00ffff'));
        this.bullets.push(new Bullet(startX, coreCenterY - 28, -7.0, 0, '#ffaa00'));
        this.bullets.push(new Bullet(startX, coreCenterY + 28, -7.0, 0, '#ffaa00'));
        this.bullets.push(new Bullet(startX, coreCenterY + 80, -7.0, 0, '#00ffff'));
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
            ctx.translate((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16);
            if (Math.floor(Date.now() / 60) % 2 === 0) {
                ctx.filter = 'brightness(2.5) saturate(2.5)';
            }
        }

        // 1. ボス本体の描画 (3倍スケール)
        if (typeof images !== 'undefined' && images.boss && images.boss.complete) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 24;
            ctx.shadowOffsetX = -12;
            ctx.shadowOffsetY = 12;

            // 600px × 600px の大迫力スプライト描画
            ctx.drawImage(images.boss, this.x - 180, this.y - 150, 600, 600);

            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        } else {
            // 代替メカニカル描画
            this.drawMechanicalHull(ctx);
        }

        // 3倍スケールのコア中心と半径
        const coreX = this.x + 108;
        const coreY = this.y + 150;
        const coreR = 48;

        // 2. 立体感と輝きのある超巨大ハイテク・クリスタルコア
        this.drawHighTechCore(ctx, coreX, coreY, coreR);

        // 3. 3倍サイズの5枚の金属風遮蔽板（シールドプレート）
        this.drawShieldPlates(ctx, coreX, coreY);

        ctx.restore();
        
        // 4. 弾の描画
        this.bullets.forEach(b => b.draw(ctx));
    }

    // メカニカルなハル（船体）の代替描画 (3倍スケール)
    drawMechanicalHull(ctx) {
        // メインハル
        const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y + this.height);
        grad.addColorStop(0, '#556677');
        grad.addColorStop(0.5, '#2a3542');
        grad.addColorStop(1, '#151d26');
        ctx.fillStyle = grad;
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // 上部・下部巨大アーム
        ctx.fillStyle = '#1e2631';
        ctx.fillRect(this.x - 60, this.y - 30, 120, 90);
        ctx.fillRect(this.x - 60, this.y + 240, 120, 90);
    }

    // 立体感と輝きのあるハイテク・クリスタルコア (3倍スケール)
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
        ctx.arc(coreX, coreY, r + 10, 0, Math.PI * 2);
        ctx.fillStyle = '#1c232d';
        ctx.fill();
        ctx.strokeStyle = '#4a5b6e';
        ctx.lineWidth = 6;
        ctx.stroke();

        // 8箇所の固定ボルトリベット
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI / 4) * i;
            const rx = coreX + Math.cos(angle) * (r + 6);
            const ry = coreY + Math.sin(angle) * (r + 6);
            ctx.fillStyle = '#88a0b8';
            ctx.beginPath();
            ctx.arc(rx, ry, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // B. 多重エネルギーオーラ
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = (this.coreOpen ? 50 : 25) * pulse;

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
        ctx.lineWidth = 3.5;
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

        // F. コア開放時の強力パルス波動
        if (this.coreOpen) {
            const waveR = r + (Date.now() * 0.03 % 30);
            const waveAlpha = Math.max(0, 1 - (waveR - r) / 30);
            ctx.strokeStyle = `rgba(255, 255, 255, ${waveAlpha * 0.75})`;
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(coreX, coreY, waveR, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    // 3倍サイズの5枚の金属風遮蔽板（シールドプレート）
    drawShieldPlates(ctx, coreX, coreY) {
        if (this.shields <= 0) return;

        const plateW = 15;
        const plateH = 114;
        const spacing = 21;
        const startX = coreX - 54;

        for (let i = 0; i < this.shields; i++) {
            const px = startX - (this.shields - 1 - i) * spacing;
            const py = coreY - plateH / 2;

            const isFrontPlate = (i === 0);
            const isFlashing = isFrontPlate && (this.shieldFlashTimer > 0);

            ctx.save();

            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = -4;
            ctx.shadowOffsetY = 4;

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
            ctx.lineWidth = 2;
            ctx.strokeRect(px, py, plateW, plateH);

            // リベットボルト
            ctx.fillStyle = isFlashing ? '#ffffff' : '#222d38';
            ctx.fillRect(px + 3, py + 6, 8, 6);
            ctx.fillRect(px + 3, py + plateH - 12, 8, 6);

            // 冷却エナジーライン
            ctx.fillStyle = isFlashing ? '#ffaa00' : '#00ffee';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 8;
            ctx.fillRect(px + 5, py + plateH * 0.35, 4, plateH * 0.3);

            ctx.restore();
        }
    }

    // 遮蔽板の当たり判定バウンディングボックス (3倍スケール)
    getShieldBounds() {
        if (this.shields <= 0) return null;
        const coreX = this.x + 108;
        const coreY = this.y + 150;
        const plateW = 15;
        const plateH = 114;
        const spacing = 21;
        const startX = coreX - 54;
        const frontX = startX - (this.shields - 1) * spacing;
        const totalW = (this.shields - 1) * spacing + plateW;

        return {
            x: frontX,
            y: coreY - plateH / 2,
            width: totalW,
            height: plateH
        };
    }

    // コアの当たり判定バウンディングボックス (3倍スケール)
    getCoreBounds() {
        const coreX = this.x + 108;
        const coreY = this.y + 150;
        const r = 48;
        return {
            x: coreX - r,
            y: coreY - r,
            width: r * 2,
            height: r * 2
        };
    }

    // 上部ハル（無敵装甲アーム）の当たり判定 (3倍スケール)
    getTopHullBounds() {
        return {
            x: this.x - 50,
            y: this.y,
            width: this.width + 50,
            height: 96
        };
    }

    // 下部ハル（無敵装甲アーム）の当たり判定 (3倍スケール)
    getBottomHullBounds() {
        return {
            x: this.x - 50,
            y: this.y + 204,
            width: this.width + 50,
            height: 96
        };
    }
}
