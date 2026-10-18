class Bullet {
    constructor(x, y, speedX, speedY, color = '#fff8e8', isEnemy = false) {
        this.x = x;
        this.y = y;
        this.width = isEnemy ? 10 : 20;
        this.height = isEnemy ? 10 : 5;
        this.speedX = speedX;
        this.speedY = speedY;
        this.color = color;
        this.active = true;
        this.isEnemy = isEnemy;
        this.animTimer = Math.floor(Math.random() * 10);
    }

    update(canvasHeight = 600) {
        this.x += this.speedX;
        this.y += this.speedY;
        this.animTimer++;
        if (this.x < -80 || this.x > 880 || this.y < -50 || this.y > canvasHeight + 50) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (this.isEnemy) {
            // 1985年アーケード版 敵通常弾：回転・明滅するピンク＆ホワイトのドットひし形弾 (◆)
            ctx.save();
            const cx = Math.round(this.x + this.width / 2);
            const cy = Math.round(this.y + this.height / 2);
            const phase = Math.floor(this.animTimer / 2) % 2;

            // 外周ピンク・コーラル枠
            ctx.fillStyle = phase === 0 ? '#d86888' : '#e88868';
            ctx.beginPath();
            ctx.moveTo(cx, cy - 5);
            ctx.lineTo(cx + 5, cy);
            ctx.lineTo(cx, cy + 5);
            ctx.lineTo(cx - 5, cy);
            ctx.closePath();
            ctx.fill();

            // 中間ピーチピンク層
            ctx.fillStyle = '#ffb8d0';
            ctx.fillRect(cx - 3, cy - 1, 6, 2);
            ctx.fillRect(cx - 1, cy - 3, 2, 6);

            // 中心ホワイトハイライト
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(cx - 1, cy - 1, 2, 2);
            ctx.restore();
        } else {
            // 1985年アーケード版 自機ノーマル／ダブルショット：4連ドットペレット型エネルギー弾 (▪▪▪▪)
            ctx.save();
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            ctx.translate(cx, cy);
            if (Math.abs(this.speedY) > 0.5) {
                ctx.rotate(Math.atan2(this.speedY, this.speedX));
            }
            const segCount = 4;
            const segW = 4;
            const gap = 1;
            const startX = -((segCount * segW + (segCount - 1) * gap) / 2);
            for (let i = 0; i < segCount; i++) {
                const sx = Math.round(startX + i * (segW + gap));
                // 外縁のアンバーオレンジ陰影
                ctx.fillStyle = '#d87838';
                ctx.fillRect(sx, -2, segW, 5);
                // 中心のウォームホワイト高輝度コア
                ctx.fillStyle = '#fff8e8';
                ctx.fillRect(sx + 1, -1, segW - 1, 3);
            }
            ctx.restore();
        }
    }
}

// 1985年アーケード版 敵ひし形弾
class EnemyBullet extends Bullet {
    constructor(x, y, speedX, speedY) {
        super(x - 5, y - 5, speedX, speedY, '#ffb8d0', true);
        this.radius = 5;
        this.width = 10;
        this.height = 10;
    }
}

class Missile {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 14;
        this.height = 7;
        this.speedX = 3.6;
        this.speedY = 5.4;
        this.color = '#e8f0f8';
        this.active = true;
        this.onGround = false;
    }

    update(canvasHeight) {
        this.x += this.speedX;
        this.y += this.speedY;

        let groundY = canvasHeight || 600;
        if (typeof levelManager !== 'undefined') {
            if (levelManager.stage === 3 && window.stage3 && window.stage3.terrain && window.stage3.terrain.wallActive) {
                groundY = window.stage3.terrain.getBottomY(this.x + this.width / 2);
            } else if (levelManager.stage === 4 && window.stage4 && window.stage4.terrain && window.stage4.terrain.wallActive) {
                groundY = window.stage4.terrain.getBottomY(this.x + this.width / 2);
            } else if (levelManager.terrain && levelManager.terrain.active) {
                groundY = levelManager.terrain.getGroundY(this.x + this.width / 2);
            }
        }

        if (this.y + this.height >= groundY) {
            this.y = groundY - this.height;
            this.speedY = 0; // 落下ストップ・地形追従モード
            this.speedX = 5.5;
            this.onGround = true;
        } else if (this.onGround) {
            // 緩やかな下り斜面なら追従し、大きく離れたら再び斜め落下
            if (groundY - (this.y + this.height) <= 10) {
                this.y = groundY - this.height;
                this.speedY = 0;
            } else {
                this.speedY = 5.4;
                this.speedX = 3.6;
                this.onGround = false;
            }
        }
    }

    draw(ctx) {
        // 1985年アーケード版 対地ミサイル：白銀＆ブルーグレーの円筒ロケット弾（落下時は斜め右下、着地時は水平走行）
        ctx.save();
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        ctx.translate(cx, cy);
        const angle = this.onGround ? 0 : Math.atan2(this.speedY, this.speedX);
        ctx.rotate(angle);

        // 後部バーニア噴射ドット
        const flicker = Math.floor(Date.now() / 45) % 2;
        ctx.fillStyle = flicker === 0 ? '#ff9820' : '#ffffa0';
        ctx.fillRect(-9, -1, 3, 3);

        // 尾翼フィン（ブルーグレー）
        ctx.fillStyle = '#486898';
        ctx.fillRect(-6, -3, 4, 7);

        // ミサイル円筒ボディ（白銀ハイライト＋シルバー陰影）
        ctx.fillStyle = '#8898b0';
        ctx.fillRect(-5, -2, 10, 5);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-5, -2, 10, 2);

        // 弾頭ノーズコーン（赤オレンジ）
        ctx.fillStyle = '#e84818';
        ctx.fillRect(5, -1, 3, 3);
        ctx.restore();
    }
}

class Laser {
    constructor(owner, offsetY, x, speedX, color = '#f89818', shotId = null) {
        this.owner = owner;
        this.offsetY = offsetY;
        this.x = x;
        this.y = owner.y + offsetY;
        this.width = 5000; // 長い貫通レーザー
        this.height = 4;   // 1985年AC版の黄金オレンジ＋白黄コアレーザー
        this.speedX = speedX;
        this.color = color;
        this.active = true;
        this.framesAlive = 0;
        this.minFrames = 22; // 近くの敵に当たっても発射間隔が乱れないよう一定フレーム維持
        if (shotId !== null) {
            this.shotId = shotId;
        } else {
            Laser._seq = (Laser._seq || 0) + 1;
            this.shotId = Laser._seq;
        }
    }

    update(canvasHeight) {
        this.framesAlive++;
        this.x += this.speedX;
        // 常に発射元（自機またはオプション）のY座標にリアルタイム追従（レーザーワインダー対応）
        this.y = this.owner.y + this.offsetY;
    }

    draw(ctx) {
        ctx.save();
        const ly = Math.round(this.y);
        // 1985年アーケード版 黄金オレンジ〜アンバー外縁＋高輝度イエローホワイト中心コア
        ctx.fillStyle = '#c85000';
        ctx.fillRect(this.x, ly, this.width, 4);
        ctx.fillStyle = this.color || '#f89818';
        ctx.fillRect(this.x, ly + 1, this.width, 2);
        ctx.fillStyle = '#ffffb8';
        ctx.fillRect(this.x, ly + 1, this.width, 1);
        ctx.restore();
    }
}

// 敵の短いレーザー弾 (EnemyLaser: 高速で鋭いビーム光線)
class EnemyLaser extends Bullet {
    constructor(x, y, speedX, speedY, color = '#00ffee') {
        super(x - 6, y - 6, speedX, speedY, color, true);
        this.length = 42; // レーザーの長さ
        this.thickness = 5; // レーザーの太さ
        this.angle = Math.atan2(speedY, speedX);
        this.width = 14;
        this.height = 14;
        this.color = color;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.angle);

        // 外側グロー光彩
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;

        // レーザー外郭 (鋭い先端を持つ細長いビーム)
        const halfL = this.length / 2;
        const halfT = this.thickness / 2;

        const grad = ctx.createLinearGradient(-halfL, 0, halfL, 0);
        grad.addColorStop(0.0, 'rgba(0, 255, 255, 0.2)');
        grad.addColorStop(0.3, this.color);
        grad.addColorStop(0.8, '#ffffff');
        grad.addColorStop(1.0, '#ffffff');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(halfL + 4, 0); // 先頭鋭角
        ctx.lineTo(halfL - 4, -halfT);
        ctx.lineTo(-halfL, -halfT * 0.7);
        ctx.lineTo(-halfL, halfT * 0.7);
        ctx.lineTo(halfL - 4, halfT);
        ctx.closePath();
        ctx.fill();

        // 中心ホワイトコア
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-halfL * 0.7, -1, this.length * 0.8, 2);

        ctx.restore();
    }
}

// 1985年AC版ビッグコア専用：短い青っぽい太いレーザー弾 (BigCoreLaser)
class BigCoreLaser extends Bullet {
    constructor(x, y, speedX, speedY = 0) {
        // 当たり判定は長さ26px × 太さ8pxの短く太い矩形
        super(x - 13, y - 4, speedX, speedY, '#38bdf8', true);
        this.width = 26;
        this.height = 8;
        this.length = 26;
        this.thickness = 8;
    }

    draw(ctx) {
        ctx.save();
        const x = Math.round(this.x);
        const y = Math.round(this.y);
        const w = this.width;   // 26px (短いレーザー)
        const h = this.height;  // 8px  (太いレーザー)

        // 青いレーザーの発光グロウ
        ctx.shadowColor = '#2563eb';
        ctx.shadowBlur = 8;

        // 1. 外郭ディープブルー〜コバルトブルーの太いカプセル状ボディ
        const outerGrad = ctx.createLinearGradient(x, y, x, y + h);
        outerGrad.addColorStop(0.00, '#1d4ed8');
        outerGrad.addColorStop(0.22, '#3b82f6');
        outerGrad.addColorStop(0.50, '#60a5fa');
        outerGrad.addColorStop(0.78, '#3b82f6');
        outerGrad.addColorStop(1.00, '#1e40af');
        ctx.fillStyle = outerGrad;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(x, y, w, h, 3);
        } else {
            ctx.rect(x, y, w, h);
        }
        ctx.fill();

        // 2. 中間の鮮やかなシアンブルー層
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#7dd3fc';
        ctx.fillRect(x + 2, y + 1.5, w - 4, h - 3);

        // 3. 中心の青白い高輝度コア（太めの3pxコア＋アーケード特有の青色エネルギー節）
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(x + 3, y + 2.5, w - 6, h - 5);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 4, y + 3, w - 8, 2);

        // アーケード版ビッグコアレーザー特有の青い縦スリット節ディテール
        ctx.fillStyle = 'rgba(29, 78, 216, 0.55)';
        for (let sx = x + 6; sx < x + w - 4; sx += 6) {
            ctx.fillRect(sx, y + 1, 2, h - 2);
        }

        ctx.restore();
    }
}

window.BigCoreLaser = BigCoreLaser;

// 古代イオンリング弾 (RingBullet: モアイが放つ本家グラディウス風の大きな丸いリング光弾)
class RingBullet extends Bullet {
    constructor(x, y, speedX, speedY, color = '#38bdf8') {
        super(x - 16, y - 16, speedX, speedY, color, true);
        this.radius = 16; // 本家グラディウス風の大きめな丸いリング（半径16px＝直径32px）
        this.width = 32;
        this.height = 32;
        this.color = color;
        this.pulse = Math.random() * Math.PI * 2;
        this.framesAlive = 0;
    }

    update(canvasHeight) {
        super.update(canvasHeight);
        this.framesAlive++;
        this.pulse += 0.22;
    }

    draw(ctx) {
        ctx.save();
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const r = this.radius + Math.sin(this.pulse) * 2.0;

        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;

        // 外周の太いプラズマリング
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 5.0;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // 中間の高輝度ホワイト・シアンリング
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
        ctx.stroke();

        // 内周の淡いエネルギー輪郭
        ctx.strokeStyle = 'rgba(180, 245, 255, 0.7)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }
}

