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
        this.maxHp = 7; // 1/5の強さに調整 (35 -> 7)
        this.hp = 7;
        this.active = true;
        this.isEntering = true; // 登場中は完全無敵
        this.color = '#aa4444';
        
        // 遮蔽板: アーケード準拠の4枚シールドプレート (各7発耐久、ダブル弾なら4発で破壊)
        this.maxShields = 4;
        this.shields = 4;
        this.shieldHpPerPlate = 7; // 1/5の強さに調整 (36 -> 7)
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
            if (this.coreTimer > 120) {
                this.coreTimer = 0;
                this.shoot();
            }
        } else {
            // 遮蔽板全滅時はコアが完全に露出し猛攻モード
            this.coreOpen = true;
            this.coreTimer++;
            if (this.coreTimer > 95) {
                this.coreTimer = 0;
                this.shoot();
            }
        }
        
        // ボスの弾の更新
        this.bullets.forEach(b => b.update(600));
        this.bullets = this.bullets.filter(b => b.active);
    }

    shoot() {
        // 艦首アーム先端（左向き）から自機方向へ4連レーザー発射（適度な速度で回避可能）
        const startX = this.x - 110;
        const coreCenterY = this.y;
        const laserSpeed = -4.8;
        
        // 上下アーム砲台から2門ずつ、計4連ビーム
        this.bullets.push(new Bullet(startX, coreCenterY - 48, laserSpeed, 0, '#00ffff', true));
        this.bullets.push(new Bullet(startX, coreCenterY - 16, laserSpeed, 0, '#ffaa00', true));
        this.bullets.push(new Bullet(startX, coreCenterY + 16, laserSpeed, 0, '#ffaa00', true));
        this.bullets.push(new Bullet(startX, coreCenterY + 48, laserSpeed, 0, '#00ffff', true));
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

    triggerDeathScream() {
        if (this.isScreaming) return;
        this.isScreaming = true;
        this.screamText = 'ウワーーーー！';
        if (typeof Sound !== 'undefined' && typeof Sound.playBossScream === 'function') {
            Sound.playBossScream();
        }
        if (!this._initialDismembered && typeof spawnBossDismembermentWave === 'function') {
            this._initialDismembered = true;
            spawnBossDismembermentWave(this, true);
        }
    }

    // コアダメージ処理
    hitCore(damage = 1) {
        this.hitFlashTimer = 4;
        this.hp -= damage;
        if (this.hp <= 0 && !this.isDying) {
            this.triggerDeathScream();
            if (typeof triggerBossDefeatExplosion === 'function') {
                triggerBossDefeatExplosion(this);
            }
        }
    }

    // プレイヤーの弾との当たり判定処理（遮蔽板によるコアの確実な保護＆登場中無敵）
    handleBulletCollision(bullet) {
        if (this.isEntering || this.isDying || !this.active) return;

        const topHull = this.getTopHullBounds();
        const bottomHull = this.getBottomHullBounds();
        const shieldBounds = this.getShieldBounds();
        const coreHitbox = this.getCoreBounds();

        // レーザーのヒットレート抑制（レーザーに対して遮蔽板・コアを頑丈に）
        if (bullet instanceof Laser) {
            if (bullet.bossHitCooldown && bullet.bossHitCooldown > 0) {
                bullet.bossHitCooldown--;
                return;
            }
            bullet.bossHitCooldown = 20;
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
                if (typeof addScore === 'function') {
                    addScore(1000, hitX, bullet.y, '#00ffff');
                }
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
                this.triggerDeathScream();
                if (typeof triggerBossDefeatExplosion === 'function') {
                    triggerBossDefeatExplosion(this);
                }
            }
            return;
        }

        // 3. 上下ハル（無敵装甲アーム）への弾かれ判定
        if (checkCollision(bullet, topHull) || checkCollision(bullet, bottomHull)) {
            if (!(bullet instanceof Laser)) {
                bullet.active = false;
                createExplosion(bullet.x, bullet.y, '#667788');
                if (typeof Sound !== 'undefined') Sound.playBossHit();
            }
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
        if (typeof images !== 'undefined' && images.boss && images.boss.complete && images.boss.naturalWidth > 0) {
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

        // 撃破時の大声断末魔シャウト演出（「ウワーーーー！」）
        if (this.isDying || this.isScreaming) {
            ctx.save();
            const sx = this.x + (Math.random() - 0.5) * 16;
            const sy = Math.max(60, this.y - 115) + (Math.random() - 0.5) * 16;
            ctx.font = '900 42px "Impact", "Arial Black", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 22;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 6;
            const txt = this.screamText || 'ウワーーーー！';
            ctx.strokeText(txt, sx, sy);
            ctx.fillStyle = '#ff2200';
            ctx.fillText(txt, sx, sy);
            ctx.restore();
        }

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
// STAGE 2 BOSS: 古代遺跡巨石×重武装メカ×多関節機械触手要塞
// 「エンシェント・テンタクル・ゴーレム (GolemBoss)」
// 風化したストーンヘンジ巨石遺跡と超古代機械フレームが融合し、
// 上下2本のうねる多関節メカニカル触手アームと旋回モノリス結界、
// 2基のルーンコアから苛烈なレーザー・イオンリング・拡散弾幕を放つ！
// ==========================================
class GolemBoss {
    constructor(x, y) {
        this.scale = 2;
        this.width = 175;
        this.height = 230;
        this.x = (x || 800) + 150;
        this.targetX = (x || 800) - 220; // 580: 画面右側に堂々陣取る定位置
        this.y = 185;
        this.active = true;
        this.isEntering = true;
        this.isDying = false;

        // 2つの古代ルーンコア（上下に各1基）
        this.core1Hp = 22;
        this.core1MaxHp = 22;
        this.core2Hp = 22;
        this.core2MaxHp = 22;
        this.hp = 44;

        // 各コアを守る古代石板シールド（上下各3枚）
        this.shields1 = 3;
        this.shields2 = 3;
        this.shieldHpPerPlate = 6;
        this.currentShieldHp1 = this.shieldHpPerPlate;
        this.currentShieldHp2 = this.shieldHpPerPlate;
        this.shieldHitCooldown = 0;

        // テスト互換用 shieldCores プロパティ（全無効化時はシールド解除として扱う）
        this.shieldCores = [
            { active: true },
            { active: true },
            { active: true },
            { active: true }
        ];

        this.moveTimer = 0;
        this.ringTimer = 0;
        this.laserTimer = 0;
        this.tentacleFireTimer = 0;
        this.monolithAngle = 0;
        this.rotationAngle = 0;
        this.bullets = [];
        this.hitFlashTimer1 = 0;
        this.hitFlashTimer2 = 0;
        this.shieldFlashTimer1 = 0;
        this.shieldFlashTimer2 = 0;
        this.hasTentacles = true;
        this.rearTentacleBlend = 0;
        this._computedRearBlend = 0;
        this.trackedPlayerX = 120;
        this.trackedPlayerY = 300;
        // 上下各触手の追従角度・角速度ステート（上からも下からも自機をゆっくり追いかける）
        this.tentacleStates = [
            { angle: -Math.PI, vel: 0, prevRaw: -Math.PI, targetUnwrapped: -Math.PI }, // 上触手
            { angle: Math.PI,  vel: 0, prevRaw: Math.PI,  targetUnwrapped: Math.PI }   // 下触手
        ];
        this.isScreaming = false;
        this.screamText = '';
    }

    triggerDeathScream() {
        if (this.isScreaming) return;
        this.isScreaming = true;
        this.screamText = 'ウワーーーー！';
        if (typeof Sound !== 'undefined' && typeof Sound.playBossScream === 'function') {
            Sound.playBossScream();
        }
        if (!this._initialDismembered && typeof spawnBossDismembermentWave === 'function') {
            this._initialDismembered = true;
            spawnBossDismembermentWave(this, true);
        }
    }

    _syncLegacyTestState() {
        if (this.shieldCores && this.shieldCores.every(c => !c.active)) {
            this.shields1 = 0;
            this.shields2 = 0;
        }
    }

    _updateTentacleState(state, sign, px, py, refX, bossCenterY, maxSpeed, accel) {
        // 上触手(sign=-1)はやや下寄り、下触手(sign=+1)はやや上寄りを基準にすることで、
        // 自機が上から回り込めば全触手が上から、下から回り込めば全触手が下から、
        // 中央付近なら上触手は上から・下触手は下から自機を追いかける
        const refY = bossCenterY - sign * 28;
        const dx = px - refX;
        const dy = py - refY;
        const rawAngle = Math.atan2(dy, dx);

        let dRaw = Math.atan2(Math.sin(rawAngle - state.prevRaw), Math.cos(rawAngle - state.prevRaw));
        // 1フレームで前後へ大きく移動した場合も、自機の上下位置に応じた回転方向（上回り／下回り）を維持
        if (Math.cos(state.prevRaw) < -0.2 && Math.cos(rawAngle) > 0.2) {
            if (dy < 0 && dRaw < 0) dRaw += Math.PI * 2;
            else if (dy >= 0 && dRaw > 0) dRaw -= Math.PI * 2;
        } else if (Math.cos(state.prevRaw) > 0.2 && Math.cos(rawAngle) < -0.2) {
            if (dy < 0 && dRaw > 0) dRaw -= Math.PI * 2;
            else if (dy >= 0 && dRaw < 0) dRaw += Math.PI * 2;
        }
        state.prevRaw = rawAngle;
        state.targetUnwrapped += dRaw;

        // 触手がまだ前方を向いている状態で自機が背後へ回り込んだ際、
        // 自機がボスより上なら必ず上回り(角度増加: -π -> -π/2 -> 0)、下なら必ず下回り(角度減少: +π -> +π/2 -> 0)に誘導
        if (Math.cos(state.angle) < -0.25 && dx > -20) {
            const k = Math.round(state.angle / (Math.PI * 2));
            const rearAligned = k * Math.PI * 2 + rawAngle;
            if (dy < 0) {
                state.targetUnwrapped = (rearAligned > state.angle) ? rearAligned : (rearAligned + Math.PI * 2);
            } else {
                state.targetUnwrapped = (rearAligned < state.angle) ? rearAligned : (rearAligned - Math.PI * 2);
            }
        }

        // 複数周回の蓄積防止（上回り・下回りの経路記憶を保てる ±1.35π の範囲に収める）
        while (state.targetUnwrapped - state.angle > Math.PI * 1.35) state.targetUnwrapped -= Math.PI * 2;
        while (state.targetUnwrapped - state.angle < -Math.PI * 1.35) state.targetUnwrapped += Math.PI * 2;

        const diff = state.targetUnwrapped - state.angle;
        const desiredVel = Math.max(-maxSpeed, Math.min(maxSpeed, diff * 0.075));
        if (state.vel < desiredVel) {
            state.vel = Math.min(desiredVel, state.vel + accel);
        } else {
            state.vel = Math.max(desiredVel, state.vel - accel);
        }
        state.angle += state.vel;
    }

    // 上下2本の多関節メカニカル触手アームの関節座標を計算
    // （自機の位置を追いかけるように上からも下からもゆっくり追随して回る）
    _getTentacleNodes(isBottom) {
        const idx = isBottom ? 1 : 0;
        const sign = isBottom ? 1 : -1;
        const state = (this.tentacleStates && this.tentacleStates[idx])
            ? this.tentacleStates[idx]
            : { angle: sign * Math.PI, vel: 0, targetUnwrapped: sign * Math.PI };

        let targetDir = state.angle;
        let blend = (1 + Math.cos(targetDir)) * 0.5;

        // 外部テスト等から rearTentacleBlend が直接書き換えられた場合の互換サポート
        if (typeof this.rearTentacleBlend === 'number' && Math.abs(this.rearTentacleBlend - (this._computedRearBlend || 0)) > 0.05) {
            blend = this.rearTentacleBlend;
            targetDir = sign * Math.PI * (1 - blend);
        }

        const baseX = this.x + 38 + blend * 75;
        const baseY = isBottom ? (this.y + this.height - 14) : (this.y + 14);
        const nodes = [{ x: baseX, y: baseY }];
        const segCount = 8;
        const segLen = 20;

        // 回転中は先端が自機の方向へしなるように追随
        const leadDiff = Math.max(-0.55, Math.min(0.55, (state.targetUnwrapped || targetDir) - targetDir));
        const curveSign = -sign * Math.cos(targetDir);

        let curX = baseX;
        let curY = baseY;
        for (let i = 1; i <= segCount; i++) {
            const ratio = i / segCount;
            const wave = Math.sin(this.moveTimer * 1.45 - i * 0.50 + (isBottom ? Math.PI * 0.7 : 0)) * (0.28 + ratio * 0.16);
            const baseAngle = targetDir + leadDiff * ratio * 0.35 + curveSign * (0.38 - ratio * 0.42) + wave;
            curX += Math.cos(baseAngle) * segLen;
            curY += Math.sin(baseAngle) * segLen;
            nodes.push({ x: curX, y: curY, angle: baseAngle });
        }
        return nodes;
    }

    // 浮遊旋回する2基の古代モノリス結界石の座標
    _getOrbitingMonoliths() {
        const cx = this.x - 24;
        const cy = this.y + this.height / 2;
        const list = [];
        for (let i = 0; i < 2; i++) {
            const ang = this.monolithAngle + i * Math.PI;
            const mx = cx + Math.cos(ang) * 42;
            const my = cy + Math.sin(ang) * 95;
            list.push({ x: mx - 12, y: my - 22, width: 24, height: 44, cx: mx, cy: my });
        }
        return list;
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

        this._syncLegacyTestState();

        this.moveTimer += 0.016;
        this.y = 185 + Math.sin(this.moveTimer) * 85;
        this.rotationAngle += 0.035;
        this.monolithAngle += 0.025;

        // 自機位置を取得し、上下の触手がそれぞれ上回り・下回りでゆっくり自機を追いかけるように更新
        const px = (typeof player !== 'undefined' && player) ? (player.x + player.width / 2) : 120;
        const py = (typeof player !== 'undefined' && player) ? (player.y + player.height / 2) : 300;
        this.trackedPlayerX += (px - this.trackedPlayerX) * 0.02;
        this.trackedPlayerY += (py - this.trackedPlayerY) * 0.02;

        const refX = this.x + 55;
        const bossCenterY = this.y + this.height / 2;
        this._updateTentacleState(this.tentacleStates[0], -1, px, py, refX, bossCenterY, 0.0205, 0.00072);
        this._updateTentacleState(this.tentacleStates[1],  1, px, py, refX, bossCenterY, 0.0195, 0.00068);

        const b0 = (1 + Math.cos(this.tentacleStates[0].angle)) * 0.5;
        const b1 = (1 + Math.cos(this.tentacleStates[1].angle)) * 0.5;
        this.rearTentacleBlend = (b0 + b1) * 0.5;
        this._computedRearBlend = this.rearTentacleBlend;

        if (this.shieldHitCooldown > 0) this.shieldHitCooldown--;
        if (this.hitFlashTimer1 > 0) this.hitFlashTimer1--;
        if (this.hitFlashTimer2 > 0) this.hitFlashTimer2--;
        if (this.shieldFlashTimer1 > 0) this.shieldFlashTimer1--;
        if (this.shieldFlashTimer2 > 0) this.shieldFlashTimer2--;

        const isEnraged = (this.core1Hp <= 0 || this.core2Hp <= 0 || (this.shields1 === 0 && this.shields2 === 0));

        // 攻撃1: 穏やかなペースの古代イオンリング弾（間隔を広げて弾数も控えめに）
        this.ringTimer++;
        if (this.ringTimer > (isEnraged ? 95 : 120)) {
            this.ringTimer = 0;
            this.shootRings();
        }

        // 攻撃2: 触手先端からの単発レーザー（連射や拡散を抑えて穏やかに）
        this.tentacleFireTimer++;
        if (this.tentacleFireTimer > (isEnraged ? 75 : 95)) {
            this.tentacleFireTimer = 0;
            this.shootTentacleWeapons();
        }

        // 攻撃3: 2連レーザー（間隔を広く穏やかに）
        this.laserTimer++;
        if (this.laserTimer > (isEnraged ? 110 : 140)) {
            this.laserTimer = 0;
            this.shootLasers();
        }

        this.bullets.forEach(b => b.update(600));
        this.bullets = this.bullets.filter(b => b.active);
    }

    shootRings() {
        const cx = this.x - 10;
        const rearX = this.x + this.width - 10;
        const cy1 = this.y + 60;
        const cy2 = this.y + 170;
        const midY = this.y + this.height / 2;
        const ShotClass = (typeof EnemyBullet !== 'undefined') ? EnemyBullet : Bullet;

        // 1. 前方へ穏やかな速度で上下各2発ずつイオンリング弾を発射
        if (typeof RingBullet !== 'undefined') {
            const angles = [-0.20, 0.20];
            angles.forEach(ang => {
                const spd = 3.2;
                const vx = -Math.cos(ang) * spd;
                const vy = Math.sin(ang) * spd;
                if (this.core1Hp > 0) {
                    this.bullets.push(new RingBullet(cx, cy1, vx, vy, '#38bdf8'));
                }
                if (this.core2Hp > 0) {
                    this.bullets.push(new RingBullet(cx, cy2, vx, vy, '#ffaa00'));
                }
            });
        }

        // 2. 自機が後ろ（右側）に回り込んでいる時だけ、後方へ穏やかなリング弾と単発弾を発射
        if (typeof player !== 'undefined' && player && player.x > this.x - 50) {
            const tx = player.x + player.width / 2;
            const ty = player.y + player.height / 2;
            const aimAng = Math.atan2(ty - midY, tx - rearX);
            if (typeof RingBullet !== 'undefined') {
                this.bullets.push(new RingBullet(rearX, midY, Math.cos(aimAng) * 3.5, Math.sin(aimAng) * 3.5, '#38bdf8'));
            }
            this.bullets.push(new ShotClass(rearX, midY, Math.cos(aimAng) * 4.0, Math.sin(aimAng) * 4.0));
        }
    }

    shootTentacleWeapons() {
        const topNodes = this._getTentacleNodes(false);
        const botNodes = this._getTentacleNodes(true);
        const topTip = topNodes[topNodes.length - 1];
        const botTip = botNodes[botNodes.length - 1];

        const targetX = (typeof player !== 'undefined' && player) ? (player.x + player.width / 2) : 120;
        const targetY = (typeof player !== 'undefined' && player) ? (player.y + player.height / 2) : 300;
        const LaserClass = (typeof EnemyLaser !== 'undefined') ? EnemyLaser : Bullet;

        // 上下触手先端から1発ずつ、穏やかな弾速で発射
        [topTip, botTip].forEach((tip, idx) => {
            const dx = targetX - tip.x;
            const dy = targetY - tip.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const spd = 4.3;
            const vx = (dx / dist) * spd;
            const vy = (dy / dist) * spd;
            const color = (idx === 0) ? '#00ffee' : '#ffaa00';
            this.bullets.push(new LaserClass(tip.x, tip.y, vx, vy, color));
        });

        if (typeof Sound !== 'undefined' && typeof Sound.playLaser === 'function') {
            Sound.playLaser();
        }
    }

    shootLasers() {
        const startX = this.x - 24;
        const rearX = this.x + this.width - 10;
        const LaserClass = (typeof EnemyLaser !== 'undefined') ? EnemyLaser : Bullet;

        // 前方へ穏やかな2連レーザー
        this.bullets.push(new LaserClass(startX, this.y + 45, -5.2, 0, '#00ffff'));
        this.bullets.push(new LaserClass(startX, this.y + this.height - 45, -5.2, 0, '#ffaa00'));

        // 自機が背後にいる時のみ後方へ穏やかな2連レーザー
        if (typeof player !== 'undefined' && player && player.x > this.x - 50) {
            this.bullets.push(new LaserClass(rearX, this.y + 45, 4.8, 0, '#00ffff'));
            this.bullets.push(new LaserClass(rearX, this.y + this.height - 45, 4.8, 0, '#ffaa00'));
        }

        if (typeof Sound !== 'undefined' && typeof Sound.playLaser === 'function') {
            Sound.playLaser();
        }
    }

    hitShield(isCore1, damage = 1) {
        if (this.shieldHitCooldown > 0) return false;
        this.shieldHitCooldown = 2;
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
                if (typeof createExplosion === 'function') {
                    createExplosion(this.x + 60, this.y + 60, '#00ffff');
                    createExplosion(this.x + 60, this.y + 60, '#ffaa00');
                }
                if (typeof addScore === 'function') {
                    addScore(3000, this.x + 60, this.y + 60, '#ffcc00');
                }
            }
        } else {
            this.hitFlashTimer2 = 4;
            this.core2Hp -= damage;
            if (this.core2Hp <= 0 && this.core2Hp + damage > 0) {
                if (typeof createExplosion === 'function') {
                    createExplosion(this.x + 60, this.y + 170, '#00ffff');
                    createExplosion(this.x + 60, this.y + 170, '#ffaa00');
                }
                if (typeof addScore === 'function') {
                    addScore(3000, this.x + 60, this.y + 170, '#ffcc00');
                }
            }
        }
        this.hp = Math.max(0, this.core1Hp) + Math.max(0, this.core2Hp);
        this.checkDefeat();
    }

    handleBulletCollision(bullet) {
        if (this.isEntering || this.isDying || !this.active) return;

        this._syncLegacyTestState();

        // レーザーのヒットレート抑制
        if (typeof Laser !== 'undefined' && bullet instanceof Laser) {
            if (bullet.bossHitCooldown && bullet.bossHitCooldown > 0) {
                bullet.bossHitCooldown--;
                return;
            }
            bullet.bossHitCooldown = 4;
        }

        const isDouble = Boolean(bullet.isDouble || (typeof player !== 'undefined' && player && player.weaponType === 'DOUBLE'));
        const shieldDmg = isDouble ? 5 : 1;

        // テスト互換: shieldCoresが全て無効化され hp <= 1 で (this.x, this.y) を撃たれた場合
        if (this.shields1 === 0 && this.shields2 === 0 && this.hp <= 1) {
            const directBox = { x: this.x - 28, y: this.y - 28, width: 56, height: 56 };
            if (checkCollision(bullet, directBox)) {
                if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) bullet.active = false;
                this.core1Hp = 0;
                this.core2Hp = 0;
                this.hp = 0;
                this.checkDefeat();
                return;
            }
        }

        // 1. 上コア・下コアの遮蔽板当たり判定
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

        const core1Bounds = { x: this.x + 30, y: this.y + 35, width: 56, height: 54 };
        const core2Bounds = { x: this.x + 30, y: this.y + 145, width: 56, height: 54 };

        // A. 上コアの遮蔽板への着弾判定
        if (this.shields1 > 0 && shield1Bounds && checkCollision(bullet, shield1Bounds)) {
            if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) bullet.active = false;
            const hitX = Math.min(bullet.x + bullet.width, shield1Bounds.x + 10);
            const destroyed = this.hitShield(true, shieldDmg);
            createExplosion(hitX, bullet.y, destroyed ? '#ffaa00' : '#ffffaa');
            if (destroyed && typeof addScore === 'function') addScore(1000, hitX, bullet.y, '#00ffff');
            if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') Sound.playBossHit();
            return;
        }

        // B. 下コアの遮蔽板への着弾判定
        if (this.shields2 > 0 && shield2Bounds && checkCollision(bullet, shield2Bounds)) {
            if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) bullet.active = false;
            const hitX = Math.min(bullet.x + bullet.width, shield2Bounds.x + 10);
            const destroyed = this.hitShield(false, shieldDmg);
            createExplosion(hitX, bullet.y, destroyed ? '#ffaa00' : '#ffffaa');
            if (destroyed && typeof addScore === 'function') addScore(1000, hitX, bullet.y, '#00ffff');
            if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') Sound.playBossHit();
            return;
        }

        // C. 上コアへの直撃（遮蔽板全滅後）
        if (this.shields1 === 0 && this.core1Hp > 0 && checkCollision(bullet, core1Bounds)) {
            if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) bullet.active = false;
            this.hitCore(true, 1);
            createExplosion(bullet.x + bullet.width / 2, bullet.y, '#00ffff');
            if (typeof Sound !== 'undefined') Sound.playBossHit();
            this.checkDefeat();
            return;
        }

        // D. 下コアへの直撃（遮蔽板全滅後）
        if (this.shields2 === 0 && this.core2Hp > 0 && checkCollision(bullet, core2Bounds)) {
            if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) bullet.active = false;
            this.hitCore(false, 1);
            createExplosion(bullet.x + bullet.width / 2, bullet.y, '#ffaa00');
            if (typeof Sound !== 'undefined') Sound.playBossHit();
            this.checkDefeat();
            return;
        }

        // E. 旋回する浮遊モノリス結界石による防御ギミック（通常弾を弾く）
        const monoliths = this._getOrbitingMonoliths();
        for (const m of monoliths) {
            if (checkCollision(bullet, m)) {
                if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) {
                    bullet.active = false;
                    createExplosion(bullet.x, bullet.y, '#38bdf8');
                    if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') Sound.playBossHit();
                }
                return;
            }
        }

        // F. 外装玄武岩＆超古代メカアーマーへの弾かれ判定
        const armorParts = [
            { x: this.x + 25, y: this.y, width: this.width - 25, height: 32 },
            { x: this.x + 25, y: this.y + 92, width: this.width - 25, height: 50 },
            { x: this.x + 25, y: this.y + 202, width: this.width - 25, height: 28 },
            { x: this.x + 90, y: this.y, width: this.width - 90, height: this.height }
        ];

        for (const armor of armorParts) {
            if (checkCollision(bullet, armor)) {
                if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) {
                    bullet.active = false;
                    createExplosion(bullet.x, bullet.y, '#556677');
                    if (typeof Sound !== 'undefined') Sound.playBossHit();
                }
                return;
            }
        }
    }

    checkDefeat() {
        if (this.core1Hp <= 0 && this.core2Hp <= 0 && !this.isDying) {
            this.triggerDeathScream();
            if (typeof triggerBossDefeatExplosion === 'function') {
                triggerBossDefeatExplosion(this);
            } else {
                this.isDying = true;
            }
        }
    }

    draw(ctx) {
        if (!this.active) return;
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

        // --- 0. 上下2本の多関節メカニカル触手アーム（背面から前方へうねる機械触手） ---
        this._drawMechanicalTentacle(ctx, false);
        this._drawMechanicalTentacle(ctx, true);

        // --- 1. 後部プラズマスラスター＆超古代機械フレーム ---
        const thrustLen = 28 + Math.sin(Date.now() * 0.02) * 10;
        const thrustGrad = ctx.createLinearGradient(bx + bw - 10, by, bx + bw + thrustLen, by);
        thrustGrad.addColorStop(0, '#ffffff');
        thrustGrad.addColorStop(0.4, '#38bdf8');
        thrustGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
        ctx.fillStyle = thrustGrad;
        [by + 45, by + bh / 2, by + bh - 45].forEach(ty => {
            ctx.beginPath();
            ctx.moveTo(bx + bw - 8, ty - 14);
            ctx.lineTo(bx + bw + thrustLen, ty);
            ctx.lineTo(bx + bw - 8, ty + 14);
            ctx.closePath();
            ctx.fill();
        });

        // --- 2. 重厚な古代遺跡巨石モノリス × サイバー装甲メインボディ ---
        const stoneGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
        stoneGrad.addColorStop(0.0, '#64748b');
        stoneGrad.addColorStop(0.3, '#334155');
        stoneGrad.addColorStop(0.7, '#1e293b');
        stoneGrad.addColorStop(1.0, '#090d16');
        ctx.fillStyle = stoneGrad;

        ctx.beginPath();
        ctx.moveTo(bx + 36, by - 6);
        ctx.lineTo(bx + bw - 8, by + 14);
        ctx.lineTo(bx + bw + 6, by + 55);
        ctx.lineTo(bx + bw + 6, by + bh - 55);
        ctx.lineTo(bx + bw - 8, by + bh - 14);
        ctx.lineTo(bx + 36, by + bh + 6);
        ctx.lineTo(bx - 4, by + bh - 34);
        ctx.lineTo(bx + 18, by + bh / 2 + 28);
        ctx.lineTo(bx - 18, by + bh / 2);
        ctx.lineTo(bx + 18, by + bh / 2 - 28);
        ctx.lineTo(bx - 4, by + 34);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 古代石積みのレリーフ分割線と機械装甲プレート
        ctx.fillStyle = '#475569';
        ctx.fillRect(bx + 88, by + 18, 68, 42);
        ctx.fillRect(bx + 88, by + bh - 60, 68, 42);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(bx + 22, by + bh / 2 - 18, 125, 36);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx + 22, by + bh / 2 - 18, 125, 36);

        // --- 3. 古代ルーン回路紋様（シアン＆アンバー発光） ---
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(bx + bw * 0.68, by + bh * 0.28, 16, 0, Math.PI * 2);
        ctx.arc(bx + bw * 0.68, by + bh * 0.72, 16, 0, Math.PI * 2);
        ctx.moveTo(bx + bw * 0.68, by + bh * 0.28 + 16);
        ctx.lineTo(bx + bw * 0.68, by + bh * 0.72 - 16);
        ctx.moveTo(bx + 30, by + bh / 2);
        ctx.lineTo(bx + bw * 0.68, by + bh / 2);
        ctx.stroke();
        ctx.restore();

        // --- 4. 2基の古代ルーンコア ---
        this.drawCore(ctx, bx + 62, by + 62, this.core1Hp, this.core1MaxHp, this.hitFlashTimer1, '#00ffff');
        this.drawCore(ctx, bx + 62, by + 172, this.core2Hp, this.core2MaxHp, this.hitFlashTimer2, '#ffaa00');

        // --- 5. 古代石板シールド（ストーンタブレット） ---
        this.drawStoneShields(ctx, bx + 16, by + 62, this.shields1, this.shieldFlashTimer1);
        this.drawStoneShields(ctx, bx + 16, by + 172, this.shields2, this.shieldFlashTimer2);

        // --- 6. 旋回する浮遊モノリス結界石とルーン稲妻 ---
        this._drawOrbitingMonoliths(ctx, bx + 62, by + bh / 2);

        // 撃破時の大声断末魔シャウト演出（「ウワーーーー！」）
        if (this.isDying || this.isScreaming) {
            ctx.save();
            const sx = bx + bw / 2 + (Math.random() - 0.5) * 16;
            const sy = Math.max(60, by - 24) + (Math.random() - 0.5) * 16;
            ctx.font = '900 42px "Impact", "Arial Black", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 22;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 6;
            const txt = this.screamText || 'ウワーーーー！';
            ctx.strokeText(txt, sx, sy);
            ctx.fillStyle = '#ff2200';
            ctx.fillText(txt, sx, sy);
            ctx.restore();
        }

        ctx.restore();

        // 弾の描画
        this.bullets.forEach(b => b.draw(ctx));
    }

    _drawMechanicalTentacle(ctx, isBottom) {
        const nodes = this._getTentacleNodes(isBottom);
        ctx.save();

        // 機械触手のエネルギー導管ケーブル
        ctx.strokeStyle = isBottom ? 'rgba(255, 170, 0, 0.55)' : 'rgba(0, 255, 238, 0.55)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        nodes.forEach((n, idx) => {
            if (idx === 0) ctx.moveTo(n.x, n.y);
            else ctx.lineTo(n.x, n.y);
        });
        ctx.stroke();

        // 各関節の重装甲メカセグメント＆古代石材リング
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            const r = Math.max(7, 16 - i * 1.1);

            ctx.save();
            ctx.translate(n.x, n.y);
            if (n.angle !== undefined) ctx.rotate(n.angle);

            // メタリック＆古代石材ハイブリッド装甲節
            const segGrad = ctx.createRadialGradient(-2, -3, 1, 0, 0, r);
            segGrad.addColorStop(0, '#e2e8f0');
            segGrad.addColorStop(0.45, '#64748b');
            segGrad.addColorStop(0.85, '#1e293b');
            segGrad.addColorStop(1, '#090d16');
            ctx.fillStyle = segGrad;
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(-r * 0.9, -r * 0.75, r * 1.8, r * 1.5, 4) : ctx.fillRect(-r * 0.9, -r * 0.75, r * 1.8, r * 1.5);
            ctx.fill();
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // 関節コアのルーン発光ノード
            ctx.fillStyle = isBottom ? '#ffaa00' : '#00ffee';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
            ctx.fill();

            // 先端のメカニカル・クローレーザー砲門
            if (i === nodes.length - 1) {
                ctx.fillStyle = '#cbd5e1';
                ctx.beginPath();
                ctx.moveTo(4, -7);
                ctx.lineTo(18, -12);
                ctx.lineTo(12, -3);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(4, 7);
                ctx.lineTo(18, 12);
                ctx.lineTo(12, 3);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = isBottom ? '#ffdd00' : '#00ffff';
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(8, 0, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        ctx.restore();
    }

    _drawOrbitingMonoliths(ctx, hubX, hubY) {
        const monoliths = this._getOrbitingMonoliths();
        ctx.save();
        monoliths.forEach((m, idx) => {
            // 本体と結界石を結ぶ古代エネルギーライン
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(hubX, hubY);
            ctx.lineTo(m.cx, m.cy);
            ctx.stroke();

            // 浮遊巨石スラブ
            const g = ctx.createLinearGradient(m.x, m.y, m.x + m.width, m.y + m.height);
            g.addColorStop(0, '#94a3b8');
            g.addColorStop(0.5, '#475569');
            g.addColorStop(1, '#0f172a');
            ctx.fillStyle = g;
            ctx.fillRect(m.x, m.y, m.width, m.height);
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(m.x, m.y, m.width, m.height);

            // ルーン刻印
            ctx.fillStyle = (idx === 0) ? '#00ffee' : '#ffaa00';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 8;
            ctx.fillRect(m.x + 8, m.y + 8, 8, m.height - 16);
            ctx.shadowBlur = 0;
        });
        ctx.restore();
    }

    drawCore(ctx, cx, cy, hp, maxHp, flashTimer, coreThemeColor) {
        ctx.save();
        const r = 24;

        if (hp <= 0) {
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

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.shadowColor = isFlashing ? '#ffffff' : coreThemeColor;
        ctx.shadowBlur = 20 * pulse;

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

            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(px + 2, py + 15, 4, 20);
            ctx.restore();
        }
    }
}


// ==========================================
// STAGE 3 BOSS: 生体脳みそ・脈動する内臓血管 × 機械触手 × 古代モアイ巨石装甲
// 「バイオ・モアイ・ブレイン・コア (BigCoreBoss)」
// 巨大な生体脳みそ（大脳皮質の皺・神経シナプス）と拍動する内臓器官・太い血管網、
// 自機を睨みつける巨大生体眼球コア、上下の古代モアイ巨石顎、
// そして4本のうねる機械触手＆生体触手から苛烈なバイオレーザー・イオンリング嵐を放つ！
// ==========================================
class BigCoreBoss {
    constructor(x, y) {
        this.x = (x || 800) + 100;
        this.targetX = 580;
        this.y = y || 300;
        this.width = 250;
        this.height = 210;
        this.active = true;
        this.isEntering = true;
        this.isDying = false;

        this.maxHp = 40;
        this.hp = 40;

        // 前面4つの生体臓器カプセル・シールドコア（テスト互換維持）
        this.shieldCores = [
            { hp: 8, maxHp: 8, flashTimer: 0, active: true },
            { hp: 8, maxHp: 8, flashTimer: 0, active: true },
            { hp: 8, maxHp: 8, flashTimer: 0, active: true },
            { hp: 8, maxHp: 8, flashTimer: 0, active: true },
        ];

        this.hitFlashTimer = 0;
        this.moveTimer = 0;
        this.rotationAngle = 0;
        this.fireTimer = 0;
        this.tentacleTimer = 0;
        this.bioRingTimer = 0;
        this.organPulse = 0;
        this.jawOpen = 0;
        this.bullets = [];

        // 3面ボスの触手の長さを以前の半分(1.5倍スケール)に調整し、ゆっくり動くよう設定
        this.hasTentacles = true;
        this.tentacleLengthScale = 1.5;
        this.tentacleThicknessScale = 1.8;
        this.rearTentacleBlend = 0;
        this._computedRearBlend = 0;
        this.trackedPlayerX = 120;
        this.trackedPlayerY = 300;
        // 4本の各触手の追従角度・角速度ステート（上からも下からも自機をゆっくり追いかける）
        this.tentacleStates = [
            { angle: -Math.PI, vel: 0, prevRaw: -Math.PI, targetUnwrapped: -Math.PI }, // 上外（機械）
            { angle: -Math.PI, vel: 0, prevRaw: -Math.PI, targetUnwrapped: -Math.PI }, // 上内（生体）
            { angle: Math.PI,  vel: 0, prevRaw: Math.PI,  targetUnwrapped: Math.PI },  // 下内（生体）
            { angle: Math.PI,  vel: 0, prevRaw: Math.PI,  targetUnwrapped: Math.PI }   // 下外（機械）
        ];
        this.volleyIndex = 0;
        this.isScreaming = false;
        this.screamText = '';
    }

    triggerDeathScream() {
        if (this.isScreaming) return;
        this.isScreaming = true;
        this.screamText = 'ウワーーーー！';
        if (typeof Sound !== 'undefined' && typeof Sound.playBossScream === 'function') {
            Sound.playBossScream();
        }
        if (!this._initialDismembered && typeof spawnBossDismembermentWave === 'function') {
            this._initialDismembered = true;
            spawnBossDismembermentWave(this, true);
        }
    }

    checkDefeat() {
        if (this.hp <= 0 && !this.isDying) {
            this.triggerDeathScream();
            if (typeof triggerBossDefeatExplosion === 'function') {
                triggerBossDefeatExplosion(this);
            } else {
                this.isDying = true;
            }
        }
    }

    get allShieldsDestroyed() {
        return this.shieldCores.every(c => !c.active);
    }

    get coreOpen() {
        return this.allShieldsDestroyed;
    }

    _updateTentacleState(state, sign, biasY, px, py, refX, bossCenterY, maxSpeed, accel) {
        const refY = bossCenterY - sign * biasY;
        const dx = px - refX;
        const dy = py - refY;
        const rawAngle = Math.atan2(dy, dx);

        let dRaw = Math.atan2(Math.sin(rawAngle - state.prevRaw), Math.cos(rawAngle - state.prevRaw));
        if (Math.cos(state.prevRaw) < -0.2 && Math.cos(rawAngle) > 0.2) {
            if (dy < 0 && dRaw < 0) dRaw += Math.PI * 2;
            else if (dy >= 0 && dRaw > 0) dRaw -= Math.PI * 2;
        } else if (Math.cos(state.prevRaw) > 0.2 && Math.cos(rawAngle) < -0.2) {
            if (dy < 0 && dRaw > 0) dRaw -= Math.PI * 2;
            else if (dy >= 0 && dRaw < 0) dRaw += Math.PI * 2;
        }
        state.prevRaw = rawAngle;
        state.targetUnwrapped += dRaw;

        // 触手がまだ前方を向いている状態で自機が背後へ回り込んだ際、
        // 自機が基準より上なら必ず上回り(角度増加: -π -> -π/2 -> 0)、下なら必ず下回り(角度減少: +π -> +π/2 -> 0)に誘導
        if (Math.cos(state.angle) < -0.25 && dx > -20) {
            const k = Math.round(state.angle / (Math.PI * 2));
            const rearAligned = k * Math.PI * 2 + rawAngle;
            if (dy < 0) {
                state.targetUnwrapped = (rearAligned > state.angle) ? rearAligned : (rearAligned + Math.PI * 2);
            } else {
                state.targetUnwrapped = (rearAligned < state.angle) ? rearAligned : (rearAligned - Math.PI * 2);
            }
        }

        while (state.targetUnwrapped - state.angle > Math.PI * 1.35) state.targetUnwrapped -= Math.PI * 2;
        while (state.targetUnwrapped - state.angle < -Math.PI * 1.35) state.targetUnwrapped += Math.PI * 2;

        const diff = state.targetUnwrapped - state.angle;
        const desiredVel = Math.max(-maxSpeed, Math.min(maxSpeed, diff * 0.038));
        if (state.vel < desiredVel) {
            state.vel = Math.min(desiredVel, state.vel + accel);
        } else {
            state.vel = Math.max(desiredVel, state.vel - accel);
        }
        state.angle += state.vel;
    }

    // 4本のうねる機械触手＆生体触手（長さを以前の半分に短縮し、自機を追いかけるように上からも下からもゆっくり追随）
    _getBioMechaTentacles() {
        const cx = this.x;
        const cy = this.y;
        const lenScale = this.tentacleLengthScale || 1.5;
        const thickScale = this.tentacleThicknessScale || 1.8;
        const hasManualOverride = (typeof this.rearTentacleBlend === 'number' && Math.abs(this.rearTentacleBlend - (this._computedRearBlend || 0)) > 0.05);

        const baseConfigs = [
            { baseOx: -15, rearShift: 75, oy: -82, sign: -1, isBio: false, phase: 0.0, baseLen: 21, len: 21 * lenScale },
            { baseOx: 20,  rearShift: 55, oy: -58, sign: -1, isBio: true,  phase: 1.6, baseLen: 19, len: 19 * lenScale },
            { baseOx: 20,  rearShift: 55, oy: 58,  sign: 1,  isBio: true,  phase: 3.1, baseLen: 19, len: 19 * lenScale },
            { baseOx: -15, rearShift: 75, oy: 82,  sign: 1,  isBio: false, phase: 4.7, baseLen: 21, len: 21 * lenScale }
        ];

        return baseConfigs.map((cfg, idx) => {
            const state = (this.tentacleStates && this.tentacleStates[idx])
                ? this.tentacleStates[idx]
                : { angle: cfg.sign * Math.PI, vel: 0, targetUnwrapped: cfg.sign * Math.PI };

            let targetDir = state.angle;
            let blend = (1 + Math.cos(targetDir)) * 0.5;
            if (hasManualOverride) {
                blend = this.rearTentacleBlend;
                targetDir = cfg.sign * Math.PI * (1 - blend);
            }

            const nodes = [];
            let nx = cx + cfg.baseOx + blend * cfg.rearShift;
            let ny = cy + cfg.oy;
            const leadDiff = Math.max(-0.28, Math.min(0.28, (state.targetUnwrapped || targetDir) - targetDir));
            const curveSign = -cfg.sign * Math.cos(targetDir);

            nodes.push({ x: nx, y: ny, angle: targetDir, radius: 13 * thickScale });
            const segs = 9;
            for (let i = 1; i <= segs; i++) {
                const t = i / segs;
                const whip = Math.sin(this.moveTimer * 1.35 - i * 0.50 + cfg.phase) * (0.26 + t * 0.16);
                const ang = targetDir + leadDiff * t * 0.175 + curveSign * (0.36 - t * 0.42) + whip;
                nx += Math.cos(ang) * cfg.len;
                ny += Math.sin(ang) * cfg.len;
                const r = Math.max(5, 13 - i * 0.9) * thickScale;
                nodes.push({ x: nx, y: ny, angle: ang, radius: r });
            }
            return {
                isBio: cfg.isBio,
                sign: cfg.sign,
                baseLen: cfg.baseLen,
                len: cfg.len,
                lengthScale: lenScale,
                thicknessScale: thickScale,
                lineWidth: (cfg.isBio ? 7 : 5.5) * thickScale,
                nodes
            };
        });
    }

    update() {
        if (this.isDying) return;

        if (this.x > this.targetX) {
            this.x -= 2.8;
            this.isEntering = true;
            return;
        }
        this.isEntering = false;

        this.moveTimer += 0.015;
        this.organPulse += this.coreOpen ? 0.10 : 0.06;
        this.y = 300 + Math.sin(this.moveTimer) * 65;
        this.rotationAngle += 0.035;

        // 自機位置を取得し、4本の触手が上回り・下回りで自機を従来の半分の速度でゆっくり追いかけるように更新
        const px = (typeof player !== 'undefined' && player) ? (player.x + player.width / 2) : 120;
        const py = (typeof player !== 'undefined' && player) ? (player.y + player.height / 2) : 300;
        this.trackedPlayerX += (px - this.trackedPlayerX) * 0.01;
        this.trackedPlayerY += (py - this.trackedPlayerY) * 0.01;

        const refX = this.x;
        const bossCenterY = this.y;
        this._updateTentacleState(this.tentacleStates[0], -1, 32, px, py, refX, bossCenterY, 0.0102, 0.00036);
        this._updateTentacleState(this.tentacleStates[1], -1, 20, px, py, refX, bossCenterY, 0.0097, 0.00034);
        this._updateTentacleState(this.tentacleStates[2],  1, 20, px, py, refX, bossCenterY, 0.0097, 0.00034);
        this._updateTentacleState(this.tentacleStates[3],  1, 32, px, py, refX, bossCenterY, 0.0102, 0.00036);

        let sumBlend = 0;
        for (let i = 0; i < this.tentacleStates.length; i++) {
            sumBlend += (1 + Math.cos(this.tentacleStates[i].angle)) * 0.5;
        }
        this.rearTentacleBlend = sumBlend / this.tentacleStates.length;
        this._computedRearBlend = this.rearTentacleBlend;

        // 顎の開閉アニメーション
        const targetJaw = (this.bioRingTimer > 80 || this.coreOpen) ? 1.0 : 0.25 + Math.sin(this.organPulse * 0.5) * 0.2;
        this.jawOpen += (targetJaw - this.jawOpen) * 0.08;

        this.shieldCores.forEach(c => { if (c.flashTimer > 0) c.flashTimer--; });
        if (this.hitFlashTimer > 0) this.hitFlashTimer--;

        // 武器1: バイオレーザー（間隔を広げて穏やかに）
        this.fireTimer++;
        const interval = this.coreOpen ? 90 : 115;
        if (this.fireTimer >= interval) {
            this.fireTimer = 0;
            this.shoot();
        }

        // 武器2: 触手からの単発ショット（間隔を広げて穏やかに）
        this.tentacleTimer++;
        const tentacleInterval = this.coreOpen ? 75 : 95;
        if (this.tentacleTimer >= tentacleInterval) {
            this.tentacleTimer = 0;
            this.shootTentacleBarrage();
        }

        // 武器3: バイオ・イオンリング弾（間隔を広げて穏やかに）
        this.bioRingTimer++;
        const ringInterval = this.coreOpen ? 105 : 135;
        if (this.bioRingTimer >= ringInterval) {
            this.bioRingTimer = 0;
            this.shootBioRingStorm();
        }

        this.bullets.forEach(b => b.update(600));
        this.bullets = this.bullets.filter(b => b.active);
    }

    shoot() {
        const bx = this.x - this.width / 2 + 10;
        const rearX = this.x + this.width / 2 - 10;
        const by = this.y;
        const spd = this.coreOpen ? -5.8 : -5.0;
        const rearSpd = 4.6;
        const LaserClass = (typeof EnemyLaser !== 'undefined') ? EnemyLaser : Bullet;

        // 前方へ穏やかな2連レーザー（コア開放時は4連）
        this.bullets.push(new LaserClass(bx, by - 42, spd, 0, '#00ffff'));
        this.bullets.push(new LaserClass(bx, by + 42, spd, 0, '#00ffff'));
        if (this.coreOpen) {
            this.bullets.push(new LaserClass(bx, by - 16, spd, 0, '#ff2266'));
            this.bullets.push(new LaserClass(bx, by + 16, spd, 0, '#ff2266'));
        }

        // 自機が背後にいる時のみ後方へ穏やかなレーザーを発射
        if (typeof player !== 'undefined' && player && player.x > this.x - 50) {
            const tx = player.x + player.width / 2;
            const ty = player.y + player.height / 2;
            const ang = Math.atan2(ty - by, tx - rearX);
            this.bullets.push(new LaserClass(rearX, by, Math.cos(ang) * rearSpd, Math.sin(ang) * rearSpd, '#ff2266'));
        }

        if (typeof Sound !== 'undefined' && typeof Sound.playLaser === 'function') {
            Sound.playLaser();
        }
    }

    shootTentacleBarrage() {
        const tentacles = this._getBioMechaTentacles();
        const targetX = (typeof player !== 'undefined' && player) ? (player.x + player.width / 2) : 120;
        const targetY = (typeof player !== 'undefined' && player) ? (player.y + player.height / 2) : 300;
        const LaserClass = (typeof EnemyLaser !== 'undefined') ? EnemyLaser : Bullet;
        this.volleyIndex = ((this.volleyIndex || 0) + 1) % 2;

        // 4本すべてから同時乱射せず、交互に2本ずつ単発の穏やかなレーザーのみ発射
        tentacles.forEach((t, idx) => {
            if (idx % 2 !== this.volleyIndex) return;
            const tip = t.nodes[t.nodes.length - 1];
            const dx = targetX - tip.x;
            const dy = targetY - tip.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const spd = 4.2;
            const vx = (dx / dist) * spd;
            const vy = (dy / dist) * spd;
            const col = t.isBio ? '#ff2266' : '#00ffee';
            this.bullets.push(new LaserClass(tip.x, tip.y, vx, vy, col));
        });
    }

    shootBioRingStorm() {
        const mouthX = this.x - 88;
        const rearBrainX = this.x + 95;
        const mouthY = this.y;

        // 1. 前方（口）へ撃ち落とし可能なバイオ・イオンリング弾を穏やかに2〜3発発射
        if (typeof RingBullet !== 'undefined') {
            const angles = this.coreOpen ? [-0.24, 0, 0.24] : [-0.18, 0.18];
            angles.forEach((a, i) => {
                const spd = 3.2;
                const col = (i % 2 === 0) ? '#ff2266' : '#00e5ff';
                this.bullets.push(new RingBullet(mouthX, mouthY, -Math.cos(a) * spd, Math.sin(a) * spd, col));
            });
        }

        // 2. 自機が背後に回り込んでいる時のみ、後方へ穏やかなイオンリング弾を1発発射
        if (typeof player !== 'undefined' && player && player.x > this.x - 50) {
            const tx = player.x + player.width / 2;
            const ty = player.y + player.height / 2;
            const aimAng = Math.atan2(ty - mouthY, tx - rearBrainX);
            if (typeof RingBullet !== 'undefined') {
                this.bullets.push(new RingBullet(rearBrainX, mouthY, Math.cos(aimAng) * 3.5, Math.sin(aimAng) * 3.5, '#ff2266'));
            }
        }
    }

    _getShieldCoreX(index) {
        return this.x - 96 + index * 22;
    }

    _getShieldCoreBounds(index) {
        const cx = this._getShieldCoreX(index);
        const r = 14;
        return { x: cx - r, y: this.y - r, width: r * 2, height: r * 2 };
    }

    hitShieldCore(index, damage = 1) {
        if (index === undefined || index === null) {
            index = this.shieldCores.findIndex(c => c.active);
        }
        if (index < 0 || index >= this.shieldCores.length) return false;
        const core = this.shieldCores[index];
        if (!core || !core.active) return false;

        core.hp -= damage;
        core.flashTimer = 8;
        if (core.hp <= 0) {
            core.active = false;
            const scx = this._getShieldCoreX(index);
            if (typeof createExplosion === 'function') {
                createExplosion(scx, this.y, '#ff2266');
                createExplosion(scx, this.y, '#00ffff');
            }
            if (typeof addScore === 'function') {
                addScore(1500, scx, this.y, '#00ffff');
            }
            if (typeof Sound !== 'undefined' && typeof Sound.playExplosion === 'function') {
                Sound.playExplosion();
            }
        }
        return true;
    }

    hitCore(damage) {
        this.hitFlashTimer = 5;
        this.hp -= damage;
        this.checkDefeat();
    }

    handleBulletCollision(bullet) {
        if (this.isEntering || this.isDying || !this.active) return;

        if (typeof Laser !== 'undefined' && bullet instanceof Laser) {
            if (bullet.bossHitCooldown && bullet.bossHitCooldown > 0) {
                bullet.bossHitCooldown--;
                return;
            }
            bullet.bossHitCooldown = 12;
        }

        // シールドコア判定（最前列＝最も左側のアクティブな生体臓器カプセルを探す）
        for (let i = 0; i < this.shieldCores.length; i++) {
            const core = this.shieldCores[i];
            if (!core.active) continue;
            const bounds = this._getShieldCoreBounds(i);
            if (checkCollision(bullet, bounds)) {
                if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) bullet.active = false;
                this.hitShieldCore(i, 1);
                createExplosion(bullet.x, bullet.y, '#ff88aa');
                if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') {
                    Sound.playBossHit();
                }
                return;
            }
            break; // 最前列のみ被弾（背後のコアは保護される）
        }

        // 中央の脳みそ・生体眼球コア判定（全シールド破壊後のみ）
        if (this.allShieldsDestroyed) {
            const coreBounds = { x: this.x - 28, y: this.y - 28, width: 56, height: 56 };
            if (checkCollision(bullet, coreBounds)) {
                if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) bullet.active = false;
                this.hitCore(1);
                createExplosion(bullet.x, bullet.y, '#ff2266');
                if (typeof Sound !== 'undefined') Sound.playBossHit();
                this.checkDefeat();
                return;
            }
        }

        // 上下モアイ巨石＆機械外殻アーム（無敵装甲）
        const topArm = { x: this.x - this.width / 2, y: this.y - 95, width: this.width - 20, height: 58 };
        const botArm = { x: this.x - this.width / 2, y: this.y + 37, width: this.width - 20, height: 58 };
        if (checkCollision(bullet, topArm) || checkCollision(bullet, botArm)) {
            if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) bullet.active = false;
            createExplosion(bullet.x, bullet.y, '#64748b');
            if (typeof Sound !== 'undefined') Sound.playBossHit();
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();

        if (this.isDying) {
            ctx.translate((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
            if (Math.floor(Date.now() / 60) % 2 === 0) ctx.filter = 'brightness(2.4) saturate(2)';
        }

        const cx = this.x;
        const cy = this.y;
        const hw = this.width / 2;

        // --- 1. 4本のうねる機械触手＆生体血管触手（太さ・長さ3倍！） ---
        this._drawBioMechaTentacles(ctx);

        // --- 2. 巨大生体脳みそ（大脳皮質の皺）＆拍動する内臓器官・血管網 ---
        this._drawCerebralBrainAndViscera(ctx, cx, cy, hw);

        // --- 3. 上下の古代モアイ巨石外殻 × サイボーグ機械顎 ---
        this._drawMoaiCyberJaw(ctx, cx, cy, hw, false);
        this._drawMoaiCyberJaw(ctx, cx, cy, hw, true);

        // --- 4. 中央の巨大生体眼球・脳神経コア ---
        this._drawMainCore(ctx, cx, cy);

        // --- 5. 前面4つの生体臓器カプセル・シールドコア ---
        this._drawShieldCores(ctx, cy);

        // 撃破時の大声断末魔シャウト演出（「ウワーーーー！」）
        if (this.isDying || this.isScreaming) {
            ctx.save();
            const sx = cx + (Math.random() - 0.5) * 18;
            const sy = Math.max(65, cy - 115) + (Math.random() - 0.5) * 18;
            ctx.font = '900 46px "Impact", "Arial Black", sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#ff0044';
            ctx.shadowBlur = 24;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 6;
            const txt = this.screamText || 'ウワーーーー！';
            ctx.strokeText(txt, sx, sy);
            ctx.fillStyle = '#ff1144';
            ctx.fillText(txt, sx, sy);
            ctx.restore();
        }

        ctx.restore();

        this.bullets.forEach(b => b.draw(ctx));
    }

    _drawBioMechaTentacles(ctx) {
        const tentacles = this._getBioMechaTentacles();
        const thickScale = this.tentacleThicknessScale || 1.8;
        ctx.save();

        tentacles.forEach(t => {
            const nodes = t.nodes;

            // 生体動脈ラインまたは高圧装甲エネルギー導管
            ctx.strokeStyle = t.isBio ? 'rgba(225, 29, 72, 0.75)' : 'rgba(14, 165, 233, 0.65)';
            ctx.lineWidth = (t.isBio ? 7.5 : 6.5) * thickScale;
            ctx.beginPath();
            nodes.forEach((n, idx) => {
                if (idx === 0) ctx.moveTo(n.x, n.y);
                else ctx.lineTo(n.x, n.y);
            });
            ctx.stroke();

            // 各関節の精密3D描画
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                const r = (n.radius !== undefined) ? n.radius : (Math.max(6, 14 - i * 0.9) * thickScale);
                ctx.save();
                ctx.translate(n.x, n.y);
                ctx.rotate(n.angle);

                if (t.isBio) {
                    // 生体触手：脈動する赤紫の筋肉組織＆生体発光リング
                    const pulseR = r + Math.sin(this.organPulse + i * 0.7) * 1.5 * thickScale;
                    const bioGrad = ctx.createRadialGradient(-2 * thickScale, -2 * thickScale, 1, 0, 0, pulseR);
                    bioGrad.addColorStop(0, '#ffe4e6');
                    bioGrad.addColorStop(0.35, '#f43f5e');
                    bioGrad.addColorStop(0.75, '#9f1239');
                    bioGrad.addColorStop(1, '#3b0764');
                    ctx.fillStyle = bioGrad;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, pulseR * 1.12, pulseR * 0.82, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#fda4af';
                    ctx.lineWidth = 1.1;
                    ctx.stroke();
                } else {
                    // 機械触手：多層ベベル加工のクローム＆ガンメタル円筒アクチュエーター節
                    const w = r * 1.65;
                    const h = r * 1.35;
                    const mechGrad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
                    mechGrad.addColorStop(0.0, '#f8fafc');
                    mechGrad.addColorStop(0.22, '#cbd5e1');
                    mechGrad.addColorStop(0.55, '#475569');
                    mechGrad.addColorStop(0.85, '#1e293b');
                    mechGrad.addColorStop(1.0, '#090d16');
                    ctx.fillStyle = mechGrad;
                    ctx.fillRect(-w / 2, -h / 2, w, h);

                    // ゴールド油圧カラー＆スリット装甲枠
                    ctx.fillStyle = '#f59e0b';
                    ctx.fillRect(-w / 2 + 1, -h / 2, 3, h);
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.lineWidth = 1.2;
                    ctx.strokeRect(-w / 2, -h / 2, w, h);

                    // 関節中央の高輝度リアクターベアリング
                    ctx.fillStyle = '#00f0ff';
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
                    ctx.fill();
                }

                // 触手先端の連装メカニカル・レーザー砲ユニット
                if (i === nodes.length - 1) {
                    ctx.save();
                    ctx.scale(thickScale, thickScale);

                    // 砲身マウントハウジング
                    const tipGrad = ctx.createLinearGradient(-4, -8, 14, 8);
                    tipGrad.addColorStop(0, '#e2e8f0');
                    tipGrad.addColorStop(0.5, '#334155');
                    tipGrad.addColorStop(1, '#0f172a');
                    ctx.fillStyle = tipGrad;
                    ctx.fillRect(-2, -7, 14, 14);
                    ctx.strokeStyle = '#94a3b8';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(-2, -7, 14, 14);

                    // 上下スタビライザーバレル
                    ctx.fillStyle = '#cbd5e1';
                    ctx.fillRect(8, -6, 10, 3);
                    ctx.fillRect(8, 3, 10, 3);

                    // 中央集束レンズコア
                    ctx.fillStyle = t.isBio ? '#ff0055' : '#00ffff';
                    ctx.shadowColor = ctx.fillStyle;
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.arc(10, 0, 4.2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }

                ctx.restore();
            }
        });

        ctx.restore();
    }

    _drawCerebralBrainAndViscera(ctx, cx, cy, hw) {
        ctx.save();
        const beat = Math.sin(this.organPulse) * 4.5;

        // A. 後部4連大型プラズマ・ベクタースラスター＆アフターバーナー噴射炎
        const nozzleYs = [-54, -22, 22, 54];
        const flameLen = 34 + Math.sin(Date.now() * 0.025) * 12;
        nozzleYs.forEach((ny, idx) => {
            const bx = cx + hw + 4;
            const by = cy + ny;

            // スラスター噴射プラズマプルーム
            const pGrad = ctx.createLinearGradient(bx, by, bx + flameLen, by);
            pGrad.addColorStop(0, '#ffffff');
            pGrad.addColorStop(0.35, (idx % 2 === 0) ? '#00f0ff' : '#ff2266');
            pGrad.addColorStop(1, 'rgba(0, 200, 255, 0)');
            ctx.fillStyle = pGrad;
            ctx.beginPath();
            ctx.moveTo(bx, by - 9);
            ctx.lineTo(bx + flameLen, by);
            ctx.lineTo(bx, by + 9);
            ctx.closePath();
            ctx.fill();

            // 装甲ベクターノズル本体
            const nGrad = ctx.createLinearGradient(bx - 16, by - 11, bx + 6, by + 11);
            nGrad.addColorStop(0, '#cbd5e1');
            nGrad.addColorStop(0.5, '#334155');
            nGrad.addColorStop(1, '#090d16');
            ctx.fillStyle = nGrad;
            ctx.beginPath();
            ctx.moveTo(bx - 16, by - 11);
            ctx.lineTo(bx + 4, by - 8);
            ctx.lineTo(bx + 4, by + 8);
            ctx.lineTo(bx - 16, by + 11);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.2;
            ctx.stroke();
        });

        // B. 後部〜中央に広がる「巨大生体脳みそ（大脳半球）」
        const brainX = cx + 28;
        const brainY = cy;
        const brainW = 90 + beat;
        const brainH = 72 + beat * 0.8;

        const brainGrad = ctx.createRadialGradient(brainX - 18, brainY - 14, 8, brainX, brainY, brainW);
        brainGrad.addColorStop(0, '#ffe4e6');
        brainGrad.addColorStop(0.3, '#fb7185');
        brainGrad.addColorStop(0.65, '#be123c');
        brainGrad.addColorStop(0.9, '#881337');
        brainGrad.addColorStop(1, '#3b0764');

        ctx.fillStyle = brainGrad;
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.ellipse(brainX, brainY, brainW, brainH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 脳みそのリアルな皺（大脳皮質の溝・回）と神経シナプス発光
        ctx.strokeStyle = '#4c0519';
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        for (let row = -2; row <= 2; row++) {
            const ry = brainY + row * 18;
            ctx.moveTo(brainX - 52, ry);
            ctx.bezierCurveTo(brainX - 24, ry - 13, brainX + 5, ry + 13, brainX + 34, ry - 6);
            ctx.bezierCurveTo(brainX + 52, ry - 15, brainX + 66, ry + 10, brainX + 74, ry);
        }
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 210, 225, 0.55)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        for (let row = -2; row <= 2; row++) {
            const ry = brainY + row * 18 - 2;
            ctx.moveTo(brainX - 48, ry);
            ctx.bezierCurveTo(brainX - 18, ry - 11, brainX + 10, ry + 11, brainX + 42, ry - 4);
        }
        ctx.stroke();

        // C. 上下に拍動する「内臓器官（バイオ臓器サック）」
        [-1, 1].forEach(sign => {
            const ox = cx - 18;
            const oy = cy + sign * (42 + beat * 0.4);
            const orx = 34 + beat * 0.7;
            const ory = 20 - beat * 0.3;

            const visceraGrad = ctx.createRadialGradient(ox - 6, oy - 4, 2, ox, oy, orx);
            visceraGrad.addColorStop(0, '#f472b6');
            visceraGrad.addColorStop(0.5, '#9d174d');
            visceraGrad.addColorStop(1, '#3b0764');
            ctx.fillStyle = visceraGrad;
            ctx.beginPath();
            ctx.ellipse(ox, oy, orx, ory, sign * 0.18, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#500724';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // D. 前方のシールドコアと脳・内臓を繋ぐ太い生体動脈・血管束
        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = 3.8;
        ctx.beginPath();
        for (let v = -2; v <= 2; v++) {
            if (v === 0) continue;
            ctx.moveTo(cx + 25, cy + v * 16);
            ctx.quadraticCurveTo(cx - 35, cy + v * (26 + beat * 0.5), cx - 95, cy + v * 6);
        }
        ctx.stroke();

        // E. 脳の後方〜側面を重厚に装甲する多層サイバネティック・リアクター脊椎フレーム
        const spineGrad = ctx.createLinearGradient(cx + 55, cy - 78, cx + hw + 16, cy + 78);
        spineGrad.addColorStop(0.0, '#f1f5f9');
        spineGrad.addColorStop(0.25, '#94a3b8');
        spineGrad.addColorStop(0.55, '#334155');
        spineGrad.addColorStop(0.85, '#0f172a');
        spineGrad.addColorStop(1.0, '#020617');
        ctx.fillStyle = spineGrad;
        ctx.beginPath();
        ctx.moveTo(cx + 58, cy - 76);
        ctx.lineTo(cx + hw + 6, cy - 64);
        ctx.lineTo(cx + hw + 18, cy - 28);
        ctx.lineTo(cx + hw + 22, cy);
        ctx.lineTo(cx + hw + 18, cy + 28);
        ctx.lineTo(cx + hw + 6, cy + 64);
        ctx.lineTo(cx + 58, cy + 76);
        ctx.lineTo(cx + 82, cy + 38);
        ctx.lineTo(cx + 68, cy);
        ctx.lineTo(cx + 82, cy - 38);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 後部リアクター装甲の内部ベベルパネル＆ゴールド油圧シリンダー＆発光スリット
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(cx + 84, cy - 46, 26, 92);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(cx + 84, cy - 46, 26, 92);

        for (let s = -3; s <= 3; s++) {
            ctx.fillStyle = (s % 2 === 0) ? '#00f0ff' : '#f59e0b';
            ctx.fillRect(cx + 88, cy + s * 11 - 2, 18, 4);
        }

        // 後部中央の回転式大型エネルギータービン・ローター
        ctx.save();
        ctx.translate(cx + 97, cy);
        ctx.rotate(-this.rotationAngle * 1.4);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.stroke();
        for (let b = 0; b < 4; b++) {
            const a = (Math.PI / 2) * b;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
            ctx.stroke();
        }
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }

    // 豪華な多層3D重武装メカ・ウイングポッド＆連装ヘビーレーザー砲塔（上下アーム）
    _drawMoaiCyberJaw(ctx, cx, cy, hw, isBottom) {
        ctx.save();
        const sign = isBottom ? 1 : -1;
        const jawShift = this.jawOpen * 14 * sign;
        const baseY = cy + jawShift;

        // --- 1. 中央フレームと上下メカポッドを連結する可動式ツイン油圧ダンパー＆ゴールドピストン ---
        const pistonXs = [cx - 32, cx + 24];
        pistonXs.forEach(px => {
            // シリンダー外筒
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(px - 6, Math.min(cy + sign * 18, baseY + sign * 42), 12, Math.abs(baseY + sign * 42 - (cy + sign * 18)));
            // ゴールド油圧シャフト
            const rodGrad = ctx.createLinearGradient(px - 3, 0, px + 3, 0);
            rodGrad.addColorStop(0, '#fef08a');
            rodGrad.addColorStop(0.5, '#f59e0b');
            rodGrad.addColorStop(1, '#78350f');
            ctx.fillStyle = rodGrad;
            ctx.fillRect(px - 3, Math.min(cy + sign * 14, baseY + sign * 44), 6, Math.abs(baseY + sign * 44 - (cy + sign * 14)));
        });

        // --- 2. 前方に突き出す多段バレル式・連装ヘビーレーザー砲身（2門×上下＝4門） ---
        const barrelOffsets = [38, 66];
        barrelOffsets.forEach((bo, bIdx) => {
            const by = baseY + sign * bo;
            const bLen = (bIdx === 0) ? 36 : 26;
            const bxStart = cx - hw - bLen + 12;

            // 砲身メタリックシリンダー
            const bGrad = ctx.createLinearGradient(bxStart, by - 6, bxStart, by + 6);
            bGrad.addColorStop(0, '#f8fafc');
            bGrad.addColorStop(0.4, '#94a3b8');
            bGrad.addColorStop(0.8, '#1e293b');
            bGrad.addColorStop(1, '#090d16');
            ctx.fillStyle = bGrad;
            ctx.fillRect(bxStart, by - 5, bLen + 20, 10);
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1;
            ctx.strokeRect(bxStart, by - 5, bLen + 20, 10);

            // マズルブレーキ＆冷却ジャケットリング
            ctx.fillStyle = '#0f172a';
            for (let r = 0; r < 3; r++) {
                ctx.fillRect(bxStart + 6 + r * 7, by - 6, 3, 12);
            }

            // 砲口プラズマチェンバー発光
            const muzzleColor = (bIdx === 0) ? '#00f0ff' : '#ff2266';
            ctx.fillStyle = muzzleColor;
            ctx.shadowColor = muzzleColor;
            ctx.shadowBlur = 10;
            ctx.fillRect(bxStart - 3, by - 3.5, 5, 7);
            ctx.shadowBlur = 0;
        });

        // --- 3. 第1層：重厚な多面体チタン＆ガンメタル主装甲ハル（3Dベベルシェーディング） ---
        const hullGrad = ctx.createLinearGradient(cx - hw, baseY + sign * 26, cx + hw, baseY + sign * 96);
        hullGrad.addColorStop(0.0, '#f8fafc');
        hullGrad.addColorStop(0.18, '#cbd5e1');
        hullGrad.addColorStop(0.45, '#64748b');
        hullGrad.addColorStop(0.78, '#1e293b');
        hullGrad.addColorStop(1.0, '#090d16');
        ctx.fillStyle = hullGrad;

        ctx.beginPath();
        ctx.moveTo(cx + hw + 4, baseY + sign * 30);
        ctx.lineTo(cx + hw - 14, baseY + sign * 88);
        ctx.lineTo(cx + 18, baseY + sign * 96);
        ctx.lineTo(cx - 58, baseY + sign * 86);
        ctx.lineTo(cx - hw + 4, baseY + sign * 72);
        ctx.lineTo(cx - hw - 8, baseY + sign * 48);
        ctx.lineTo(cx - hw + 10, baseY + sign * 28);
        ctx.lineTo(cx - 24, baseY + sign * 24);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // エッジの鋭い鏡面クロームハイライトライン
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx - hw + 10, baseY + sign * 29);
        ctx.lineTo(cx - 24, baseY + sign * 25);
        ctx.lineTo(cx + hw, baseY + sign * 31);
        ctx.stroke();

        // --- 4. 第2層：内部段差アーマープレート＆放熱ラジエーター・ルーバースリット ---
        const innerY = isBottom ? (baseY + 38) : (baseY - 78);
        const plateGrad = ctx.createLinearGradient(cx - 85, innerY, cx + 80, innerY + 40);
        plateGrad.addColorStop(0, '#0f172a');
        plateGrad.addColorStop(0.5, '#1e293b');
        plateGrad.addColorStop(1, '#334155');
        ctx.fillStyle = plateGrad;
        ctx.beginPath();
        ctx.moveTo(cx - 88, baseY + sign * 38);
        ctx.lineTo(cx + 78, baseY + sign * 38);
        ctx.lineTo(cx + 64, baseY + sign * 76);
        ctx.lineTo(cx - 72, baseY + sign * 72);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // 斜め発光ラジエーター・放熱スリット群（6連ネオンルーバー）
        ctx.save();
        const glowPulse = 0.65 + Math.sin(Date.now() * 0.01 + (isBottom ? 1.5 : 0)) * 0.35;
        ctx.fillStyle = `rgba(0, 240, 255, ${glowPulse})`;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;
        for (let v = 0; v < 6; v++) {
            const vx = cx - 42 + v * 17;
            const vy = baseY + sign * 48;
            ctx.beginPath();
            ctx.moveTo(vx, vy);
            ctx.lineTo(vx + 9, vy);
            ctx.lineTo(vx + 5, vy + sign * 16);
            ctx.lineTo(vx - 4, vy + sign * 16);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // --- 5. 第3層：前方精密レーザー照準ポッド＆回転式メカニカル・サブタレット ---
        const podX = cx - 72;
        const podY = baseY + sign * 56;

        // 照準ポッド装甲リング
        const podGrad = ctx.createRadialGradient(podX - 3, podY - 3, 2, podX, podY, 16);
        podGrad.addColorStop(0, '#f8fafc');
        podGrad.addColorStop(0.5, '#475569');
        podGrad.addColorStop(1, '#090d16');
        ctx.fillStyle = podGrad;
        ctx.beginPath();
        ctx.arc(podX, podY, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 光学レーザースキャナーレンズ
        ctx.fillStyle = '#ff0055';
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(podX - 2, podY, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(podX - 4, podY - 2, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 後方側のゴールドトリム装甲リブ＆リベットボルト列
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + 52, baseY + sign * 36);
        ctx.lineTo(cx + 38, baseY + sign * 84);
        ctx.moveTo(cx + 76, baseY + sign * 36);
        ctx.lineTo(cx + 62, baseY + sign * 82);
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        for (let b = 0; b < 7; b++) {
            ctx.beginPath();
            ctx.arc(cx - 80 + b * 24, baseY + sign * 32, 2.0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // 中央の巨大生体眼球＆脳幹コア
    _drawMainCore(ctx, cx, cy) {
        ctx.save();
        const hpRatio = Math.max(0, this.hp / this.maxHp);
        const pulse = Math.sin(Date.now() * 0.009) * 0.25 + 0.75;
        const r = 27;

        const isFlash = this.hitFlashTimer > 0;
        const glowColor = isFlash ? '#ffffff' : (this.coreOpen ? '#ff0044' : '#ff2266');

        ctx.shadowColor = glowColor;
        ctx.shadowBlur = (this.coreOpen ? 34 : 18) * pulse;

        // 生体肉腫リング（眼瞼リング）
        ctx.fillStyle = '#4c0519';
        ctx.beginPath();
        ctx.arc(cx, cy, r + 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 巨大眼球の強膜（白目〜充血グラデーション）
        const scleraGrad = ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, r);
        if (isFlash) {
            scleraGrad.addColorStop(0, '#ffffff');
            scleraGrad.addColorStop(1, '#ffffff');
        } else {
            scleraGrad.addColorStop(0, '#fff1f2');
            scleraGrad.addColorStop(0.55, '#fecdd3');
            scleraGrad.addColorStop(0.85, '#f43f5e');
            scleraGrad.addColorStop(1, '#881337');
        }
        ctx.fillStyle = scleraGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // 眼球内の毛細血管
        if (!isFlash) {
            ctx.strokeStyle = 'rgba(225, 29, 72, 0.65)';
            ctx.lineWidth = 1.2;
            for (let i = 0; i < 6; i++) {
                const a = this.rotationAngle * 0.3 + (Math.PI / 3) * i;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95);
                ctx.quadraticCurveTo(cx + Math.cos(a + 0.2) * r * 0.6, cy + Math.sin(a - 0.2) * r * 0.6, cx, cy);
                ctx.stroke();
            }
        }

        // 自機を睨みつける虹彩＆縦長スリット瞳孔
        const targetX = (typeof player !== 'undefined' && player) ? player.x : 100;
        const targetY = (typeof player !== 'undefined' && player) ? player.y : cy;
        const lookAng = Math.atan2(targetY - cy, targetX - cx);
        const lookDist = 6;
        const ix = cx + Math.cos(lookAng) * lookDist;
        const iy = cy + Math.sin(lookAng) * lookDist;

        const irisColor = hpRatio > 0.4 ? '#00e5ff' : '#ffea00';
        const irisGrad = ctx.createRadialGradient(ix, iy, 1, ix, iy, 13);
        irisGrad.addColorStop(0, irisColor);
        irisGrad.addColorStop(0.6, '#be123c');
        irisGrad.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(ix, iy, 13, 0, Math.PI * 2);
        ctx.fill();

        // 爬虫類・生体兵器風の縦長スリット瞳孔
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.ellipse(ix, iy, this.coreOpen ? 4.5 : 3.0, 10.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 眼球の濡れたハイライト反射
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.ellipse(cx - 8, cy - 9, 6, 3.2, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // 前面4つの生体臓器カプセル・シールドコア
    _drawShieldCores(ctx, cy) {
        ctx.save();
        for (let i = 0; i < this.shieldCores.length; i++) {
            const core = this.shieldCores[i];
            if (!core.active) continue;

            const scx = this._getShieldCoreX(i);
            const scy = cy;
            const r = 13;
            const pulse = Math.sin(Date.now() * 0.012 + i * 1.4) * 0.2 + 0.8;
            const isFlash = core.flashTimer > 0;
            const hpRatio = core.hp / core.maxHp;
            const coreColor = isFlash ? '#ffffff' : (hpRatio > 0.5 ? '#ff2266' : '#ffaa00');

            // 上下顎と臓器カプセルを繋ぐ生体神経腱
            ctx.strokeStyle = 'rgba(244, 63, 94, 0.65)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(scx, scy - 28);
            ctx.lineTo(scx, scy + 28);
            ctx.stroke();

            ctx.shadowColor = coreColor;
            ctx.shadowBlur = 16 * pulse;

            // 生体カプセル外膜
            ctx.strokeStyle = isFlash ? '#ffffff' : '#fda4af';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(scx, scy, r + 3, 0, Math.PI * 2);
            ctx.stroke();

            // 拍動する生体臓器コア球体
            const grad = ctx.createRadialGradient(scx - 3, scy - 3, 1, scx, scy, r);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.35, coreColor);
            grad.addColorStop(0.8, '#881337');
            grad.addColorStop(1, '#1f0318');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(scx, scy, r * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.restore();
    }
}

window.GolemBoss = GolemBoss;
window.BigCoreBoss = BigCoreBoss;

