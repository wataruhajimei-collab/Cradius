class Boss {
    constructor(x, y) {
        this.scale = 2; // 2倍スケール
        this.drawW = 270;
        this.drawH = 270;
        this.width = 240;
        this.height = 200;
        this.x = (x || 800) + 150; // 950 (画面外右側から登場)
        this.targetX = 640; // 画面内に全体像が100%美しく収まる定位置 (中心X: 640)
        this.baseY = 300; // 中心Y
        this.y = 300;
        this.maxHp = 35;
        this.hp = 35;
        this.active = true;
        this.isEntering = true; // 登場中は完全無敵
        this.color = '#aa4444';
        
        // 遮蔽板: 5枚の金属風シールドプレート (各4発耐久、ダブル弾なら2発で粉砕)
        this.maxShields = 5;
        this.shields = 5;
        this.shieldHpPerPlate = 4; // ダブルや通常弾でもサクサク壊せる爽快バランス！
        this.currentShieldHp = this.shieldHpPerPlate;
        this.shieldHitCooldown = 0; // 連続多重ヒット抑制用クールダウン
        this.shieldFlashTimer = 0;
        this.hitFlashTimer = 0;

        this.coreOpen = false; // 遮蔽板が1枚でも残っている間はコアは絶対に露出しない
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
            this.isEntering = true;
            return;
        }
        this.isEntering = false; // 定位置に到着して戦闘開始

        this.moveTimer += 0.02; // スムーズな上下浮動
        // 振幅 ±80px（中心Y: 300、範囲: 220〜380）。画面上下に絶対に干渉しない安全領域
        this.y = this.baseY + Math.sin(this.moveTimer) * 80;
        this.rotationAngle += 0.04; // コア内部の回転

        if (this.shieldHitCooldown > 0) this.shieldHitCooldown--;
        if (this.shieldFlashTimer > 0) this.shieldFlashTimer--;
        if (this.hitFlashTimer > 0) this.hitFlashTimer--;

        // 遮蔽板が残っている間は攻撃のみ行い、コアは露出させない
        if (this.shields > 0) {
            this.coreOpen = false;
            this.coreTimer++;
            if (this.coreTimer > 100) {
                this.coreTimer = 0;
                this.shoot();
            }
        } else {
            // 遮蔽板全滅時はコアが完全に露出し猛攻モード
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
        // 艦首アーム先端（左向き）から自機方向へ4連レーザー発射！
        const startX = this.x - 110;
        const coreCenterY = this.y;
        
        // 上下アーム砲台から2門ずつ、計4連ビーム
        this.bullets.push(new Bullet(startX, coreCenterY - 48, -7.0, 0, '#00ffff', true));
        this.bullets.push(new Bullet(startX, coreCenterY - 16, -7.0, 0, '#ffaa00', true));
        this.bullets.push(new Bullet(startX, coreCenterY + 16, -7.0, 0, '#ffaa00', true));
        this.bullets.push(new Bullet(startX, coreCenterY + 48, -7.0, 0, '#00ffff', true));
    }

    // 遮蔽板ダメージ処理（ダブル弾ボーナス対応＆クールダウン短縮）
    hitShield(damage = 1) {
        if (this.shieldHitCooldown > 0) return false;
        this.shieldHitCooldown = 1; // 軽快に連射を受け付ける
        this.shieldFlashTimer = 5;
        this.currentShieldHp -= damage;
        let destroyedAny = false;
        while (this.currentShieldHp <= 0 && this.shields > 0) {
            this.shields--;
            destroyedAny = true;
            if (this.shields > 0) {
                this.currentShieldHp += this.shieldHpPerPlate;
            } else {
                this.currentShieldHp = 0;
                break;
            }
        }
        return destroyedAny;
    }

    // コアダメージ処理
    hitCore(damage = 1) {
        this.hitFlashTimer = 4;
        this.hp -= damage;
    }

    // プレイヤーの弾との当たり判定処理（遮蔽板によるコアの確実な保護＆登場中無敵）
    handleBulletCollision(bullet) {
        if (this.isEntering || this.isDying || !this.active) return;

        const topHull = this.getTopHullBounds();
        const bottomHull = this.getBottomHullBounds();
        const shieldBounds = this.getShieldBounds();
        const coreHitbox = this.getCoreBounds();

        // レーザーのヒットレート抑制
        if (bullet instanceof Laser) {
            if (bullet.bossHitCooldown && bullet.bossHitCooldown > 0) {
                bullet.bossHitCooldown--;
                return;
            }
            bullet.bossHitCooldown = 4;
        }

        // ダブル弾の判定（ダブル弾なら遮蔽板に2ダメージ！）
        const isDouble = bullet.isDouble || (typeof player !== 'undefined' && player.weaponType === 'DOUBLE');
        const shieldDamage = isDouble ? 2 : 1;

        // 1. 遮蔽板への命中判定（遮蔽板が1枚でも残っていれば絶対にコアには当たらない！）
        if (this.shields > 0 && shieldBounds && checkCollision(bullet, shieldBounds)) {
            if (!(bullet instanceof Laser)) {
                bullet.active = false;
            }
            const hitX = Math.min(bullet.x + bullet.width, shieldBounds.x);
            const destroyed = this.hitShield(shieldDamage);
            if (destroyed) {
                createExplosion(hitX, bullet.y, '#99b3cc');
                createExplosion(hitX, bullet.y, '#ffaa00');
                if (typeof Sound !== 'undefined') {
                    if (typeof Sound.playShieldBreak === 'function') Sound.playShieldBreak();
                    else if (typeof Sound.playExplosion === 'function') Sound.playExplosion();
                }
            } else {
                createExplosion(hitX, bullet.y, '#ffffaa');
                if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') {
                    Sound.playBossHit();
                }
            }
            return; // 遮蔽板に当たったのでコア判定は遮断！
        }

        // 2. コアへの直撃判定（遮蔽板が全て破壊された時のみ！）
        if (this.shields === 0 && checkCollision(bullet, coreHitbox)) {
            if (!(bullet instanceof Laser)) {
                bullet.active = false;
            }
            this.hitCore(1);
            createExplosion(bullet.x + bullet.width / 2, bullet.y, '#00ffff');
            if (typeof Sound !== 'undefined') Sound.playBossHit();

            if (this.hp <= 0) {
                if (typeof triggerBossDefeatExplosion === 'function') {
                    triggerBossDefeatExplosion(this);
                }
            }
            return;
        }

        // 3. 上下ハル（無敵装甲アーム）への弾かれ判定
        if (checkCollision(bullet, topHull) || checkCollision(bullet, bottomHull)) {
            bullet.active = false;
            createExplosion(bullet.x, bullet.y, '#667788');
            if (typeof Sound !== 'undefined') Sound.playBossHit();
            return;
        }
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

        // 1. ボス本体の描画 (水平反転！艦首が自機・左側を向き、炎が右・後方を向く！)
        if (typeof images !== 'undefined' && images.boss && images.boss.complete) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.scale(-1, 1); // ★★★ 水平反転！自機（画面左）に艦首を向ける！ ★★★

            ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
            ctx.shadowBlur = 16;
            ctx.shadowOffsetX = 8;
            ctx.shadowOffsetY = 8;

            // 270px × 270px の適正2倍スケールで中心に綺麗に描画
            ctx.drawImage(images.boss, -this.drawW / 2, -this.drawH / 2, this.drawW, this.drawH);
            ctx.restore();
        } else {
            // 代替メカニカル描画
            this.drawMechanicalHull(ctx);
        }

        // 2倍スケールのコア中心と半径（リアクター中心に完全一致）
        const coreX = this.x - 5;
        const coreY = this.y;
        const coreR = 26;

        // 2. 立体感と輝きのある2倍ハイテク・クリスタルコア
        this.drawHighTechCore(ctx, coreX, coreY, coreR);

        // 3. コア前方（左側）に並ぶ5枚の金属風遮蔽板（シールドプレート）
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

    // 2倍サイズの5枚の金属風遮蔽板（シールドプレート: 元の1/3の上下幅24pxに超スリム化し機体構造を全面露出）
    drawShieldPlates(ctx, coreX, coreY) {
        if (this.shields <= 0) return;

        const plateW = 5;
        const plateH = 24; // 元(72px)の1/3！中央ラインのみをカバーし機体やアームを贅沢に見せる
        const spacing = 8;
        const startX = coreX - 22;

        for (let i = 0; i < this.shields; i++) {
            const px = startX - (this.shields - 1 - i) * spacing;
            const py = coreY - plateH / 2;

            const isFrontPlate = (i === 0);
            const isFlashing = isFrontPlate && (this.shieldFlashTimer > 0);

            ctx.save();

            ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = -2;
            ctx.shadowOffsetY = 2;

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
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, plateW, plateH);

            // 上下リベットボルト
            ctx.fillStyle = isFlashing ? '#ffffff' : '#222d38';
            ctx.fillRect(px + 1, py + 2, 3, 2);
            ctx.fillRect(px + 1, py + plateH - 4, 3, 2);

            // 冷却エナジーライン
            ctx.fillStyle = isFlashing ? '#ffaa00' : '#00ffee';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 4;
            ctx.fillRect(px + 1.5, py + 6, 2, plateH - 12);

            ctx.restore();
        }
    }

    // 遮蔽板の当たり判定バウンディングボックス (2倍スケール: 高さ24px)
    getShieldBounds() {
        if (this.shields <= 0) return null;
        const coreX = this.x - 5;
        const coreY = this.y;
        const plateW = 5;
        const plateH = 24;
        const spacing = 8;
        const startX = coreX - 22;
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
        const coreX = this.x - 5;
        const coreY = this.y;
        const r = 26;
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
            x: this.x - 120,
            y: this.y - 105,
            width: 230,
            height: 68
        };
    }

    // 下部ハル（無敵装甲アーム）の当たり判定 (2倍スケール)
    getBottomHullBounds() {
        return {
            x: this.x - 120,
            y: this.y + 37,
            width: 230,
            height: 68
        };
    }
}

// ==========================================
// STAGE 2 BOSS: 古代守護神「ストーン・ゴーレムコア (GolemBoss)」
// 巨大古代玄武岩と2基の発光ルーンコアを持つストーンヘンジの主
// ==========================================
class GolemBoss {
    constructor(x, y) {
        this.scale = 2;
        this.width = 170;
        this.height = 230;
        this.x = x + 150;
        this.targetX = x - 220; // 画面右端に堂々陣取る定位置
        this.y = 185;
        this.active = true;
        this.isEntering = true;
        this.isDying = false;

        // 2つの古代ルーンコア（上下に各1基）
        this.core1Hp = 25;
        this.core1MaxHp = 25;
        this.core2Hp = 25;
        this.core2MaxHp = 25;
        this.hp = 50; // 合計HP

        // 各コアを守る古代石板シールド（上下各3枚、耐久力各8発）
        this.shields1 = 3;
        this.shields2 = 3;
        this.shieldHpPerPlate = 8; // 元の重厚な耐久力（1枚あたり8発、3枚で24発）に完全復帰！
        this.currentShieldHp1 = this.shieldHpPerPlate;
        this.currentShieldHp2 = this.shieldHpPerPlate;
        this.shieldHitCooldown = 0;

        this.moveTimer = 0;
        this.ringTimer = 0;
        this.laserTimer = 0;
        this.rotationAngle = 0;
        this.bullets = [];
        this.hitFlashTimer1 = 0;
        this.hitFlashTimer2 = 0;
        this.shieldFlashTimer1 = 0;
        this.shieldFlashTimer2 = 0;
    }

    update() {
        if (this.isDying) return;

        // 登場シーン
        if (this.x > this.targetX) {
            this.x -= 2.8;
            this.isEntering = true;
            return;
        }
        this.isEntering = false;

        this.moveTimer += 0.018;
        this.y = 185 + Math.sin(this.moveTimer) * 110;
        this.rotationAngle += 0.035;

        if (this.shieldHitCooldown > 0) this.shieldHitCooldown--;
        if (this.hitFlashTimer1 > 0) this.hitFlashTimer1--;
        if (this.hitFlashTimer2 > 0) this.hitFlashTimer2--;
        if (this.shieldFlashTimer1 > 0) this.shieldFlashTimer1--;
        if (this.shieldFlashTimer2 > 0) this.shieldFlashTimer2--;

        // 攻撃1: 古代イオンリング弾（Moai RingBullet）拡散放射
        this.ringTimer++;
        if (this.ringTimer > 105) {
            this.ringTimer = 0;
            this.shootRings();
        }

        // 攻撃2: 連装古代ヘビーレーザー
        this.laserTimer++;
        if (this.laserTimer > 145) {
            this.laserTimer = 0;
            this.shootLasers();
        }

        this.bullets.forEach(b => b.update(600));
        this.bullets = this.bullets.filter(b => b.active);
    }

    shootRings() {
        if (typeof RingBullet === 'undefined') return;
        const cx = this.x - 10;
        const cy1 = this.y + 60;
        const cy2 = this.y + 170;

        // 上下コアから放射状にイオンリング弾を発射
        const angles = [-0.25, -0.08, 0.08, 0.25];
        angles.forEach(ang => {
            const spd = 4.2;
            const vx = -Math.cos(ang) * spd;
            const vy = Math.sin(ang) * spd;
            if (this.core1Hp > 0) this.bullets.push(new RingBullet(cx, cy1, vx, vy, '#38bdf8'));
            if (this.core2Hp > 0) this.bullets.push(new RingBullet(cx, cy2, vx, vy, '#ffaa00'));
        });
    }

    shootLasers() {
        const startX = this.x - 20;
        // 上下ホーン砲門から高速ビーム
        this.bullets.push(new Bullet(startX, this.y + 20, -7.5, 0, '#00ffff', true));
        this.bullets.push(new Bullet(startX, this.y + this.height - 20, -7.5, 0, '#00ffff', true));
    }

    hitShield(isCore1, damage = 1) {
        if (this.shieldHitCooldown > 0) return false;
        this.shieldHitCooldown = 3; // 元のヒットクールダウン3に戻す
        let destroyedAny = false;
        if (isCore1) {
            this.shieldFlashTimer1 = 5;
            this.currentShieldHp1 -= damage;
            while (this.currentShieldHp1 <= 0 && this.shields1 > 0) {
                this.shields1--;
                destroyedAny = true;
                if (this.shields1 > 0) {
                    this.currentShieldHp1 += this.shieldHpPerPlate;
                } else {
                    this.currentShieldHp1 = 0;
                    break;
                }
            }
            return destroyedAny;
        } else {
            this.shieldFlashTimer2 = 5;
            this.currentShieldHp2 -= damage;
            while (this.currentShieldHp2 <= 0 && this.shields2 > 0) {
                this.shields2--;
                destroyedAny = true;
                if (this.shields2 > 0) {
                    this.currentShieldHp2 += this.shieldHpPerPlate;
                } else {
                    this.currentShieldHp2 = 0;
                    break;
                }
            }
            return destroyedAny;
        }
    }

    hitCore(isCore1, damage = 1) {
        if (isCore1) {
            this.hitFlashTimer1 = 4;
            this.core1Hp -= damage;
            if (this.core1Hp <= 0 && this.core1Hp + damage > 0) {
                // 上コア破壊エフェクト
                if (typeof createExplosion === 'function') {
                    createExplosion(this.x + 60, this.y + 60, '#00ffff');
                    createExplosion(this.x + 60, this.y + 60, '#ffaa00');
                }
            }
        } else {
            this.hitFlashTimer2 = 4;
            this.core2Hp -= damage;
            if (this.core2Hp <= 0 && this.core2Hp + damage > 0) {
                // 下コア破壊エフェクト
                if (typeof createExplosion === 'function') {
                    createExplosion(this.x + 60, this.y + 170, '#00ffff');
                    createExplosion(this.x + 60, this.y + 170, '#ffaa00');
                }
            }
        }
        this.hp = Math.max(0, this.core1Hp) + Math.max(0, this.core2Hp);
    }

    handleBulletCollision(bullet) {
        if (this.isEntering || this.isDying || !this.active) return;

        // レーザーのヒットレート抑制
        if (bullet instanceof Laser) {
            if (bullet.bossHitCooldown && bullet.bossHitCooldown > 0) {
                bullet.bossHitCooldown--;
                return;
            }
            bullet.bossHitCooldown = 4;
        }

        const shieldDmg = 1; // 元の硬さに復帰（1発1ダメージ）

        // 1. 上コア・下コアの遮蔽板当たり判定（グラフィック最前線と完全に同期し、弾を確実に受け止める）
        let shield1Bounds = null;
        if (this.shields1 > 0) {
            const frontX1 = (this.x + 16) - (this.shields1 - 1) * 12;
            shield1Bounds = {
                x: frontX1 - 6,
                y: this.y + 32,
                width: (this.x + 36) - (frontX1 - 6),
                height: 60
            };
        }

        let shield2Bounds = null;
        if (this.shields2 > 0) {
            const frontX2 = (this.x + 16) - (this.shields2 - 1) * 12;
            shield2Bounds = {
                x: frontX2 - 6,
                y: this.y + 142,
                width: (this.x + 36) - (frontX2 - 6),
                height: 60
            };
        }

        // コア当たり判定（遮蔽板全滅後に開口部から奥のコアへスムーズに着弾）
        const core1Bounds = { x: this.x + 30, y: this.y + 35, width: 56, height: 54 };
        const core2Bounds = { x: this.x + 30, y: this.y + 145, width: 56, height: 54 };

        // A. 上コアの遮蔽板への着弾判定
        if (this.shields1 > 0 && shield1Bounds && checkCollision(bullet, shield1Bounds)) {
            if (!(bullet instanceof Laser)) bullet.active = false;
            const hitX = Math.min(bullet.x + bullet.width, shield1Bounds.x + 10);
            const destroyed = this.hitShield(true, shieldDmg);
            createExplosion(hitX, bullet.y, destroyed ? '#ffaa00' : '#ffffaa');
            if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') Sound.playBossHit();
            return;
        }

        // B. 下コアの遮蔽板への着弾判定
        if (this.shields2 > 0 && shield2Bounds && checkCollision(bullet, shield2Bounds)) {
            if (!(bullet instanceof Laser)) bullet.active = false;
            const hitX = Math.min(bullet.x + bullet.width, shield2Bounds.x + 10);
            const destroyed = this.hitShield(false, shieldDmg);
            createExplosion(hitX, bullet.y, destroyed ? '#ffaa00' : '#ffffaa');
            if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') Sound.playBossHit();
            return;
        }

        // C. 上コアへの直撃（遮蔽板全滅後）
        if (this.shields1 === 0 && this.core1Hp > 0 && checkCollision(bullet, core1Bounds)) {
            if (!(bullet instanceof Laser)) bullet.active = false;
            this.hitCore(true, 1);
            createExplosion(bullet.x + bullet.width / 2, bullet.y, '#00ffff');
            if (typeof Sound !== 'undefined') Sound.playBossHit();
            this.checkDefeat();
            return;
        }

        // D. 下コアへの直撃（遮蔽板全滅後）
        if (this.shields2 === 0 && this.core2Hp > 0 && checkCollision(bullet, core2Bounds)) {
            if (!(bullet instanceof Laser)) bullet.active = false;
            this.hitCore(false, 1);
            createExplosion(bullet.x + bullet.width / 2, bullet.y, '#ffaa00');
            if (typeof Sound !== 'undefined') Sound.playBossHit();
            this.checkDefeat();
            return;
        }

        // E. 外装玄武岩アーマーへの弾かれ判定
        // ★重要: シールドやコアの手前（左側）には絶対にアーマーを置かない！開口部は完全に開放！
        const armorParts = [
            { x: this.x + 25, y: this.y, width: this.width - 25, height: 32 },       // 頭部
            { x: this.x + 25, y: this.y + 92, width: this.width - 25, height: 50 },  // 上下コア中間壁
            { x: this.x + 25, y: this.y + 202, width: this.width - 25, height: 28 }, // 底部
            { x: this.x + 90, y: this.y, width: this.width - 90, height: this.height } // 背面メインボディ
        ];

        for (const armor of armorParts) {
            if (checkCollision(bullet, armor)) {
                bullet.active = false;
                createExplosion(bullet.x, bullet.y, '#556677');
                if (typeof Sound !== 'undefined') Sound.playBossHit();
                return;
            }
        }
    }

    checkDefeat() {
        if (this.core1Hp <= 0 && this.core2Hp <= 0 && !this.isDying) {
            if (typeof triggerBossDefeatExplosion === 'function') {
                triggerBossDefeatExplosion(this);
            }
        }
    }

    draw(ctx) {
        ctx.save();

        if (this.isDying) {
            ctx.translate((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
            if (Math.floor(Date.now() / 60) % 2 === 0) {
                ctx.filter = 'brightness(2.4) saturate(2.0)';
            }
        }

        const bx = this.x;
        const by = this.y;
        const bw = this.width;
        const bh = this.height;

        // --- 1. 重厚な古代玄武岩モノリス・メインボディ ---
        const stoneGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
        stoneGrad.addColorStop(0.0, '#475569');
        stoneGrad.addColorStop(0.4, '#1e293b');
        stoneGrad.addColorStop(0.8, '#0f172a');
        stoneGrad.addColorStop(1.0, '#020617');
        ctx.fillStyle = stoneGrad;

        // 重厚な多角形石壁
        ctx.beginPath();
        ctx.moveTo(bx + 40, by);
        ctx.lineTo(bx + bw, by + 20);
        ctx.lineTo(bx + bw - 15, by + bh - 20);
        ctx.lineTo(bx + 40, by + bh);
        ctx.lineTo(bx, by + bh - 40);
        ctx.lineTo(bx + 15, by + bh / 2 + 25);
        ctx.lineTo(bx - 10, by + bh / 2);
        ctx.lineTo(bx + 15, by + bh / 2 - 25);
        ctx.lineTo(bx, by + 40);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 巨石ハイライト
        ctx.strokeStyle = 'rgba(203, 213, 225, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx + 40, by + 2);
        ctx.lineTo(bx + bw - 2, by + 22);
        ctx.stroke();

        // --- 2. 古代ルーン紋様（シアン発光） ---
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(bx + bw * 0.65, by + bh * 0.3, 16, 0, Math.PI * 2);
        ctx.arc(bx + bw * 0.65, by + bh * 0.7, 16, 0, Math.PI * 2);
        ctx.moveTo(bx + bw * 0.65, by + bh * 0.3 + 16);
        ctx.lineTo(bx + bw * 0.65, by + bh * 0.7 - 16);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // --- 3. 2基の古代ルーンコア ---
        this.drawCore(ctx, bx + 62, by + 62, this.core1Hp, this.core1MaxHp, this.hitFlashTimer1, '#00ffff');
        this.drawCore(ctx, bx + 62, by + 172, this.core2Hp, this.core2MaxHp, this.hitFlashTimer2, '#ffaa00');

        // --- 4. 古代石板シールド（ストーンタブレット） ---
        this.drawStoneShields(ctx, bx + 16, by + 62, this.shields1, this.shieldFlashTimer1);
        this.drawStoneShields(ctx, bx + 16, by + 172, this.shields2, this.shieldFlashTimer2);

        ctx.restore();

        // 弾の描画
        this.bullets.forEach(b => b.draw(ctx));
    }

    drawCore(ctx, cx, cy, hp, maxHp, flashTimer, coreThemeColor) {
        ctx.save();
        const r = 24;

        if (hp <= 0) {
            // 破壊されたコア: 黒焦げの空洞
            ctx.fillStyle = '#0a0d14';
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
            return;
        }

        const isFlashing = flashTimer > 0;
        const pulse = Math.sin(Date.now() * 0.008) * 0.3 + 0.7;

        // コア外郭フレーム
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.stroke();

        // コアグロー
        ctx.shadowColor = isFlashing ? '#ffffff' : coreThemeColor;
        ctx.shadowBlur = 20 * pulse;

        // 球体グラデーション
        const grad = ctx.createRadialGradient(cx - 7, cy - 7, 2, cx, cy, r);
        if (isFlashing) {
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(1, '#ffffff');
        } else {
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, coreThemeColor);
            grad.addColorStop(0.8, '#0369a1');
            grad.addColorStop(1.0, '#020617');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // 回転する古代ルーン環
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.rotationAngle);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(-12, -12, 24, 24);
        ctx.restore();

        ctx.restore();
    }

    drawStoneShields(ctx, sx, sy, shields, flashTimer) {
        if (shields <= 0) return;
        const w = 8;
        const h = 50;
        const spacing = 12;
        const isFlashing = flashTimer > 0;

        for (let i = 0; i < shields; i++) {
            const px = sx - (shields - 1 - i) * spacing;
            const py = sy - h / 2;

            ctx.save();
            const grad = ctx.createLinearGradient(px, py, px + w, py);
            if (isFlashing && i === 0) {
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(1, '#ffeeaa');
            } else {
                grad.addColorStop(0, '#cbd5e1');
                grad.addColorStop(0.5, '#64748b');
                grad.addColorStop(1, '#1e293b');
            }
            ctx.fillStyle = grad;
            ctx.fillRect(px, py, w, h);

            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, w, h);

            // ルーン彫刻ライン
            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(px + 2, py + 15, 4, 20);
            ctx.restore();
        }
    }
}

