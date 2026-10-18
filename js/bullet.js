// ==========================================
// 1985年アーケード版『グラディウス』1:1 実機抽出 弾・ミサイル・レーザースプライト
// (grad0010.png / grad0017.png / grad0019.png / grad0130.png / grad0143.png)
// ==========================================
const _bulletSpriteCache = {};
function getBulletArcadeCanvas(key, rows, palette, scale = 3) {
    const cacheKey = key + '_' + scale;
    if (_bulletSpriteCache[cacheKey]) return _bulletSpriteCache[cacheKey];
    const h = rows.length;
    const w = rows[0].length;
    const c = document.createElement('canvas');
    c.width = w * scale;
    c.height = h * scale;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    for (let y = 0; y < h; y++) {
        const row = rows[y];
        for (let x = 0; x < w; x++) {
            const ch = row[x];
            if (ch === '.' || ch === ' ') continue;
            const col = palette[ch];
            if (!col) continue;
            g.fillStyle = col;
            g.fillRect(x * scale, y * scale, scale, scale);
        }
    }
    _bulletSpriteCache[cacheKey] = c;
    return c;
}

// 1. 自機ノーマル／ダブルショット弾 (grad0010.png 9x2: X.X.X.XXX)
const PLAYER_SHOT_PALETTE = {
    '1': '#A44254',
    '2': '#B46A44',
    '3': '#DCA674',
    '4': '#ECEEEC'
};
const PLAYER_SHOT_ROWS = [
    "1.2.3.333",
    "3.3.4.444"
];

// 2. 敵通常弾 (grad0017.png & grad0019.png 6x6)
const ENEMY_SHOT_PALETTE_0 = {
    '1': '#DCB2B4',
    '2': '#ECEEEC',
    '4': '#ECDEA4',
    '5': '#DC8A9C'
};
const ENEMY_SHOT_PALETTE_1 = {
    '1': '#ECDEA4',
    '2': '#DC8A9C',
    '4': '#DCB2B4',
    '5': '#ECEEEC'
};
const ENEMY_SHOT_ROWS = [
    "..12..",
    ".1122.",
    "111222",
    "444555",
    ".4455.",
    "..45.."
];

// 3. 対地ミサイル (grad0143.png 地上走行 12x4 & grad0130.png 落下 8x8)
const MISSILE_PALETTE = {
    '1': '#7C4A8C',
    '2': '#9C7EC4',
    '3': '#9CC2DC',
    '4': '#FCFEFC',
    '5': '#9C6AB4',
    '6': '#EC0224'
};
const MISSILE_CRAWL_ROWS = [
    ".1.1.111111.",
    "63.3.3333331",
    "64.4.4444441",
    ".5.5.555555."
];
const MISSILE_FALL_ROWS = [
    ".61.....",
    "6341....",
    ".1341...",
    "..5341..",
    "...5341.",
    "....5341",
    ".....541",
    "......11"
];

class Bullet {
    constructor(x, y, speedX, speedY, color = '#ECEEEC', isEnemy = false) {
        this.x = x;
        this.y = y;
        this.width = isEnemy ? 14 : 27;
        this.height = isEnemy ? 14 : 6;
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
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (this.isEnemy) {
            const phase = Math.floor(this.animTimer / 3) % 2;
            const pal = phase === 0 ? ENEMY_SHOT_PALETTE_0 : ENEMY_SHOT_PALETTE_1;
            const spr = getBulletArcadeCanvas('enemy_shot_' + phase, ENEMY_SHOT_ROWS, pal, 2);
            const cx = Math.round(this.x + this.width / 2 - spr.width / 2);
            const cy = Math.round(this.y + this.height / 2 - spr.height / 2);
            ctx.drawImage(spr, cx, cy);
        } else {
            const spr = getBulletArcadeCanvas('player_shot_9x2', PLAYER_SHOT_ROWS, PLAYER_SHOT_PALETTE, 3);
            const cx = Math.round(this.x + this.width / 2);
            const cy = Math.round(this.y + this.height / 2);
            ctx.translate(cx, cy);
            if (Math.abs(this.speedY) > 0.5) {
                ctx.rotate(Math.atan2(this.speedY, this.speedX));
            }
            ctx.drawImage(spr, -Math.round(spr.width / 2), -Math.round(spr.height / 2));
        }
        ctx.restore();
    }
}

// 1985年アーケード版 敵通常弾
class EnemyBullet extends Bullet {
    constructor(x, y, speedX, speedY) {
        super(x - 6, y - 6, speedX, speedY, '#ECEEEC', true);
        this.radius = 6;
        this.width = 12;
        this.height = 12;
    }
}

class Missile {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 10;
        this.speedX = 3.6;
        this.speedY = 5.4;
        this.color = '#FCFEFC';
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
            this.speedY = 0;
            this.speedX = 5.5;
            this.onGround = true;
        } else if (this.onGround) {
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
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        if (this.onGround) {
            const spr = getBulletArcadeCanvas('missile_crawl', MISSILE_CRAWL_ROWS, MISSILE_PALETTE, 2);
            ctx.drawImage(spr, Math.round(this.x), Math.round(this.y - 2));
        } else {
            const spr = getBulletArcadeCanvas('missile_fall', MISSILE_FALL_ROWS, MISSILE_PALETTE, 2);
            ctx.drawImage(spr, Math.round(this.x), Math.round(this.y - 4));
        }
        ctx.restore();
    }
}

class Laser {
    constructor(owner, offsetY, x, speedX, color = '#B4DEFC', shotId = null) {
        this.owner = owner;
        this.offsetY = offsetY;
        this.x = x;
        this.y = owner.y + offsetY;
        this.width = 5000;
        this.height = 3; // 1985年AC版 (grad0017.png / grad0027.png) のシャープな青白レーザー (#B4DEFC)
        this.speedX = speedX;
        this.color = color;
        this.active = true;
        this.framesAlive = 0;
        this.minFrames = 22;
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
        this.y = this.owner.y + this.offsetY;
    }

    draw(ctx) {
        ctx.save();
        const ly = Math.round(this.y);
        // 1985年アーケード版 実機キャプチャ (grad0017.png / grad0027.png) の1dot=3px青白レーザー (#B4DEFC)
        ctx.fillStyle = '#B4DEFC';
        ctx.fillRect(Math.round(this.x), ly, this.width, 3);
        ctx.fillStyle = '#FCFEFC';
        ctx.fillRect(Math.round(this.x), ly + 1, this.width, 1);
        ctx.restore();
    }
}

// 敵の短いレーザー弾 (EnemyLaser: sakura_03.png 浮き岩左斜面の水平ソロモンレーザーおよび浮遊大陸砲台レーザー)
class EnemyLaser extends Bullet {
    constructor(x, y, speedX, speedY, color = '#00ffee') {
        super(x - 6, y - 6, speedX, speedY, color, true);
        this.length = 42;
        this.thickness = 6;
        this.angle = Math.atan2(speedY, speedX);
        this.width = 16;
        this.height = 12;
        this.color = color;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(Math.round(this.x + this.width / 2), Math.round(this.y + this.height / 2));
        ctx.rotate(this.angle);

        const halfL = this.length / 2;
        ctx.fillStyle = this.color || '#FC9A24';
        ctx.fillRect(-halfL, -3, this.length, 6);
        ctx.fillStyle = '#FCFEFC';
        ctx.fillRect(-halfL + 3, -1, this.length - 6, 2);

        ctx.restore();
    }
}

// 1985年AC版ビッグコア専用：長大で迫力ある青白4連極太レーザー光線 (BigCoreLaser)
class BigCoreLaser extends Bullet {
    constructor(x, y, speedX, speedY = 0) {
        // 本家アーケード完全再現：幅175px × 高さ10pxの長大な青白レーザービーム
        super(x - 175, y - 5, speedX, speedY, '#38bdf8', true);
        this.width = 175;
        this.height = 10;
        this.length = 175;
        this.thickness = 10;
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

