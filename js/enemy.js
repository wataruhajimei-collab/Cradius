// ==========================================
// GRADIUS ENEMY SYSTEM
// 敵キャラクター: 大きく見やすく、ゆったりとした動きに調整
// 配色: 青みのある銀色（メタリックシルバーブルー）
// 群れ全滅でカプセル確定ドロップ
// ==========================================

class Enemy {
    constructor(x, y, isRed = false) {
        this.x = x;
        this.y = y;
        this.width = 44;
        this.height = 28;
        this.speed = 1.6; // ゆったりとした前進
        this.active = true;
        this.hp = 1;
        this.animTimer = Math.random() * 100;
        this.isRed = isRed;
        if (isRed) {
            this.bodyColor = '#ff2244';
            this.trimColor = '#ffaacc';
            this.darkColor = '#880011';
        } else {
            this.bodyColor = '#8fa8c8';
            this.trimColor = '#d2e4ff';
            this.darkColor = '#4a6080';
        }
        this.formation = null;
    }

    update() {
        this.x -= this.speed;
        this.animTimer += 0.12;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        // 機体下面の立体シャドウ
        // Fast draw

        // 上半身 (光を受けるメタリックシルバー)
        const gradTop = ctx.createLinearGradient(0, -13, 0, 0);
        gradTop.addColorStop(0.0, '#f8fafc'); // 先端ハイライト
        gradTop.addColorStop(0.3, '#cbd5e1'); // 金属光沢
        gradTop.addColorStop(0.7, '#64748b'); // スレートグレー
        gradTop.addColorStop(1.0, '#475569'); // センター稜線

        ctx.fillStyle = gradTop;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(-8, -13);
        ctx.lineTo(-16, -5);
        ctx.lineTo(-18, 0);
        ctx.lineTo(22, 0);
        ctx.closePath();
        ctx.fill();

        // 下半身 (深い影のガンメタル)
        const gradBottom = ctx.createLinearGradient(0, 0, 0, 13);
        gradBottom.addColorStop(0.0, '#334155');
        gradBottom.addColorStop(0.5, '#1e293b');
        gradBottom.addColorStop(1.0, '#0f172a');

        ctx.fillStyle = gradBottom;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(-18, 0);
        ctx.lineTo(-16, 5);
        ctx.lineTo(-8, 13);
        ctx.closePath();
        ctx.fill();

        ctx.shadowColor = 'transparent';

        // 前縁ベベルエッジ (鋭い光沢ハイライトライン)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(-8, -13);
        ctx.stroke();

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.lineTo(-8, 13);
        ctx.stroke();

        // 中央胴体装甲隆起
        const spineGrad = ctx.createLinearGradient(-6, -4, 14, 4);
        spineGrad.addColorStop(0.0, '#e2e8f0');
        spineGrad.addColorStop(0.5, '#94a3b8');
        spineGrad.addColorStop(1.0, '#334155');
        ctx.fillStyle = spineGrad;
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(2, -4);
        ctx.lineTo(-8, 0);
        ctx.lineTo(2, 4);
        ctx.closePath();
        ctx.fill();

        // パネルライン
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(2, -4);
        ctx.lineTo(2, 4);
        ctx.stroke();

        // キャノピー (曲面ガラス光沢シアン)
        const canopyGrad = ctx.createLinearGradient(0, -3, 8, 3);
        canopyGrad.addColorStop(0.0, '#ffffff');
        canopyGrad.addColorStop(0.3, '#38bdf8');
        canopyGrad.addColorStop(0.8, '#0284c7');
        canopyGrad.addColorStop(1.0, '#0369a1');
        ctx.fillStyle = canopyGrad;
        ctx.beginPath();
        ctx.ellipse(3, 0, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // キャノピーハイライト
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(2, -1.5, 2.5, 1);

        // バーニア / プラズマアフターバーナー
        const flame = 9 + Math.sin(this.animTimer * 2) * 4;
        ctx.fillStyle = 'rgba(0, 220, 255, 0.85)';
        ctx.beginPath();
        ctx.moveTo(-18, -4);
        ctx.lineTo(-18 - flame, 0);
        ctx.lineTo(-18, 4);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-18, -2);
        ctx.lineTo(-18 - flame * 0.55, 0);
        ctx.lineTo(-18, 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }
}

class FormationBase {
    constructor(count) {
        this.totalCount = count;
        this.destroyedCount = 0;
        this.active = true;
    }

    notifyDestroyed(enemyX, enemyY) {
        this.destroyedCount++;
        if (this.destroyedCount === this.totalCount) {
            if (typeof capsules !== 'undefined') {
                capsules.push(new PowerUpCapsule(enemyX, enemyY));
            }
            if (typeof addScore === 'function') {
                addScore(500, enemyX, enemyY - 12, '#00ffff');
            }
            this.active = false;
        }
    }
}

// ------------------------------------------
// ファン編隊 (Fan: 1985年アーケード版完全準拠)
// 右端から直進飛来 → 自機のY座標方向へ斜めに「カックン」と折れ曲がり反転・交差離脱！
// 4枚羽根の風車（ピンホイール）回転スプライト（銀青 / 赤カプセル機は朱赤）
// ------------------------------------------
class Formation extends FormationBase {
    constructor(startY, count = 5, isRed = false) {
        super(count);
        this.enemies = [];

        for (let i = 0; i < count; i++) {
            const enemy = new FanEnemy(820, startY, i * 14, this, isRed);
            this.enemies.push(enemy);
            enemies.push(enemy);
        }
    }
}

// ==========================================
// 1985年アーケード版『グラディウス』1:1 実機抽出スプライトマトリクス群
// (grad0010.png / grad0017.png / grad0019.png / grad0027.png / grad0130.png / gradius_1_219.png)
// ==========================================
const _enemySpriteCache = {};
function getEnemyArcadeCanvas(key, rows, palette, scale = 3) {
    const cacheKey = key + '_' + scale;
    if (_enemySpriteCache[cacheKey]) return _enemySpriteCache[cacheKey];
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
    _enemySpriteCache[cacheKey] = c;
    return c;
}

// 1. ガルン (Garun: grad0017.png x=192..208, y=117..131 & x=212..228, y=146..159)
const GARUN_BLUE_PALETTE = {
    '1': '#7C4A8C', '2': '#9C6AB4', '3': '#9C7EC4', '4': '#9CC2DC',
    '5': '#5C425C', '6': '#A4DEDC', '7': '#A45E04', '8': '#CC8A04',
    '9': '#FCFEFC', 'A': '#ECDEC4', 'B': '#DCC27C'
};
const GARUN_RED_PALETTE = {
    '1': '#740204', '2': '#A42224', '3': '#C44244', '4': '#FCA69C',
    '5': '#5C1214', '6': '#FCC2B4', '7': '#A45E04', '8': '#EC9A04',
    '9': '#FCFEFC', 'A': '#FCFECC', 'B': '#FCD654'
};
const GARUN_FRAME0_ROWS = [
    "....11111111....",
    "..222222222222..",
    "...3333333333...",
    "...1435555341...",
    "....26333362....",
    "..2.2.6666.2.2..",
    "4.4.4.7887.4.4.4",
    "9.9.9.8AB8.9.9.9",
    "..6.6.8B98.6.6..",
    "....43788734....",
    "....25555.52....",
    "....56666665....",
    "...1999999991...",
    "...9991111999..."
];
const GARUN_FRAME1_ROWS = [
    "......1221......",
    ".....12..21.....",
    "....13333331....",
    "...1333333331...",
    "..244444444442..",
    "..644444444446..",
    "..264444444462..",
    "4.4.64444446.4.4",
    "9.9.46....64.9.9",
    "..6.26444462.6..",
    "....41699614....",
    ".....418B14.....",
    "......4334......"
];

// 2. ダッカー (Ducker: grad0017.png x=44..60, y=196..205 & grad0019.png x=63..79, y=191..205)
const DUCKER_BLUE_PALETTE = {
    '1': '#FCCE54', '2': '#B4566C', '3': '#DCFEFC', '4': '#742234',
    '5': '#8C3E4C', '6': '#DC8A5C', '7': '#547EDC', '8': '#C4EEFC',
    '9': '#8CCEEC', 'A': '#CC5E5C', 'B': '#0402A4', 'C': '#742234',
    'D': '#547EDC', 'E': '#C4EEFC', 'F': '#8CCEEC', 'G': '#0402A4'
};
const DUCKER_RED_PALETTE = {
    '1': '#FCCE54', '2': '#B42234', '3': '#FCFEFC', '4': '#6C020C',
    '5': '#8C1224', '6': '#FC7E54', '7': '#C42234', '8': '#FCC2B4',
    '9': '#EC5E6C', 'A': '#EC2234', 'B': '#740204', 'C': '#6C020C',
    'D': '#C42234', 'E': '#FCC2B4', 'F': '#EC5E6C', 'G': '#740204'
};
const DUCKER_WALK_ROWS = [
    "11111111111111..",
    "..2223331455....",
    "3.613....15.....",
    "7.13..897.14....",
    "5A13.8997B.14...",
    ".213.8977B.64...",
    "..21..87B..64...",
    "...21.BB..645..."
];
const DUCKER_AIM_ROWS = [
    "...66...........",
    "...261..........",
    "....261...6A....",
    ".....211..51A...",
    ".....42736651A..",
    ".....457733331A.",
    "......563....31A",
    "......53..897.31",
    "......43.89777.1",
    "......43.89777.1",
    ".......1..997BB7",
    ".......46.....77",
    "........5A99997B"
];

// 3. ストライプドーム (Ground Dome: gradius_snap_grad0130.png x=200..214, y=195..205)
const DOME_BLUE_PALETTE = {
    '3': '#1C566C', '4': '#6CB2B4', '5': '#347E8C', '6': '#9CDEC4',
    '7': '#CCEECC', '8': '#0C2E54', '9': '#FCFEFC', 'B': '#DCDE7C',
    'C': '#A45E04', 'D': '#CC8A04'
};
const DOME_RED_PALETTE = {
    '3': '#6C121C', '4': '#C44244', '5': '#8C1E2C', '6': '#EC7E7C',
    '7': '#FCC2B4', '8': '#4C0204', '9': '#FCFEFC', 'B': '#A4DEFC',
    'C': '#1C568C', 'D': '#347EC4'
};
const DOME_ROWS = [
    "...344443...",
    "..56666665..",
    ".5467777645.",
    "844779977448",
    "854799997458",
    "..CDDBBDDC..",
    "4.7..99..7.4",
    "4.7..99..7.4",
    "4.7..99..7.4",
    "..33555533.."
];

// 4. ダグム / ハッチ (Dagumu: grad0017.png & grad0019.png x=147..181, y=189..205)
const DAGUMU_BLUE_PALETTE = {
    '1': '#0C2E54', '2': '#1C566C', '4': '#FCFEFC', '5': '#347E8C',
    '8': '#6CB2B4', 'F': '#9CDEC4', 'G': '#CCEECC', 'K': '#DCDE7C',
    'L': '#CC8A04', 'O': '#A45E04'
};
const DAGUMU_RED_PALETTE = {
    '1': '#4C0204', '2': '#741214', '4': '#FCFEFC', '5': '#9C2224',
    '8': '#C44E4C', 'F': '#EC8A8C', 'G': '#FCC2B4', 'K': '#DCDE7C',
    'L': '#CC8A04', 'O': '#A45E04'
};
const DAGUMU_OPEN_ROWS = [
    "....1111..............1111....",
    "....2222..............2222....",
    "....5555..............5555....",
    "....8888..............8888....",
    "....8888..............8888....",
    "....FFFF..............FFFF....",
    "..1.FFFF..............FFFF.1..",
    "..2.FGGG..............GGGF.2..",
    ".15.GGGG..............GGGG.51.",
    ".28.4444..............4444.82.",
    ".5F.4444..............4444.F5.",
    "..............................",
    "1225588888FFFGGGGFFF8888855221",
    "..............................",
    "..255888FFFFGG44GGFFFF888552..",
    "2588G..OLK.G44G.KLO..G8852..2."
];
const DAGUMU_CLOSED_ROWS = [
    "........1111225555221111......",
    "......11225588FFFF88552211....",
    "....11225588FFGGGGFF88552211..",
    "....22225588FFG44GFF88552222..",
    "....5555..88FFG44GFF88..5555..",
    "....8888....FFGGGGFF....8888..",
    "..1.FFFF......FFFF......FFFF.1",
    "..2.FGGG................GGGF.2",
    ".15.GGGG................GGGG.5",
    ".28.4444................4444.8",
    ".5F.4444................4444.F",
    "..............................",
    "1225588888FFFGGGGFFF8888855221",
    "..............................",
    "..255888FFFFGG44GGFFFF888552..",
    "2588G..OLK.G44G.KLO..G8852..2."
];

// 5. ルグル / ラッシュ (Rugra / Blaster: grad0017.png x=216..228, y=190..200)
const RUGRA_BLUE_PALETTE = {
    '3': '#A4DEDC', '4': '#FCFEFC', '6': '#9C7EC4', '7': '#9C6AB4',
    '9': '#9CC2DC', 'A': '#7C4A8C', 'B': '#ECDEC4', 'C': '#9C5E04',
    'D': '#DCC27C', 'E': '#9C5604', 'J': '#5C425C'
};
const RUGRA_RED_PALETTE = {
    '3': '#FCC2B4', '4': '#FCFEFC', '6': '#C44244', '7': '#A42224',
    '9': '#EC7E7C', 'A': '#740204', 'B': '#FCFECC', 'C': '#9C5E04',
    'D': '#FCD654', 'E': '#CC6A04', 'J': '#4C0204'
};
// 垂直発進時 (12x10)
const BLASTER_LAUNCH_ROWS = [
    "....3443....",
    "...367763...",
    "..9AAB4AA9..",
    ".6AACBDEAA6.",
    "3.3.3443.3.3",
    "4.43333334.4",
    "9.93333339.9",
    ".7.39999993.",
    "..339JJJJ933",
    ".39966666699"
];
// 水平飛行時 (10x12: 垂直発進スプライトを左90度回転した実機ルグル形状)
const RUGRA_HORIZ_ROWS = [
    "....349...",
    "...6.4339.",
    "..7A3339J6",
    ".36A.339J6",
    "347B4339J6",
    "347D4339J6",
    ".36E.339J6",
    "..7A3339J6",
    "...6.4339.",
    "....349..."
];

// 6. ディー01 (Dee-01 Turret: grad0017.png x=179..190 & gradius_snap_grad0130.png x=232..246)
const DEE01_BLUE_PALETTE = {
    '4': '#FCFEFC', '5': '#347E8C', '6': '#6CB2B4', '7': '#9CDEC4',
    '8': '#CCEECC', '9': '#FCFEFC', 'A': '#ECDEB4', 'B': '#DCDE7C',
    'D': '#CC8A04', 'E': '#ECDEC4', 'F': '#9CDEC4', 'G': '#CCEECC',
    'K': '#DCDE7C', 'L': '#CC8A04'
};
const DEE01_RED_PALETTE = {
    '4': '#FCFEFC', '5': '#8C1E2C', '6': '#C44244', '7': '#EC7E7C',
    '8': '#FCC2B4', '9': '#FCFEFC', 'A': '#FCFECC', 'B': '#FCD654',
    'D': '#EC6A04', 'E': '#FCFEFC', 'F': '#EC7E7C', 'G': '#FCC2B4',
    'K': '#FCD654', 'L': '#EC6A04'
};
// 斜め左上照準 (grad0017.png & grad0130.png)
const DEE01_DIAG_ROWS = [
    "BK.........",
    "LBBK.......",
    ".LB.4BKL...",
    "..LBKL.GF..",
    "..BKL.GGF5.",
    "..LL.GGFF5."
];
// 上照準 (gradius_stage_snap_gradius_1_39.png)
const DEE01_UP_ROWS = [
    ".LK........",
    ".LK........",
    ".LK........",
    ".LB........",
    "..KKL......",
    ".BKKL.GG...",
    ".BBKL.GGF6.",
    ".LLL.GGFF6."
];

// 7. 火山弾 (VolcanoRock: gradius_stage_snap_gradius_1_219.png 16x14)
const VOLCANO_ROCK_PALETTE = {
    '1': '#9C4204', '2': '#B45E04', '3': '#EC9A04', '4': '#FCDEB4',
    '5': '#FCC24C', '6': '#CC6A04', '7': '#FCFEFC', '8': '#DC7E04',
    '9': '#A45E04'
};
const VOLCANO_ROCK_ROWS = [
    "......111111....",
    ".....12345621...",
    "....1144532421..",
    "...11174534421..",
    "..1477453882281.",
    "..1477453413381.",
    "..1436343164331.",
    ".14751643164331.",
    ".14753348187211.",
    ".17454453647291.",
    ".1433333847321..",
    "..16688888291...",
    "...194444911....",
    "....111111......"
];

// 1985年アーケード版 ファン (Fan 16x16 回転プロペラスプライト2フレーム完全再現)
const FAN_BLUE_PALETTE = {
    '1': '#5C425C', '2': '#7C4A8C', '3': '#9C6AB4', '4': '#9C7EC4',
    '5': '#9CC2DC', '6': '#A4DEDC', '7': '#FCFEFC', '8': '#CCEEFC'
};
const FAN_RED_PALETTE = {
    '1': '#5C1214', '2': '#740204', '3': '#A42224', '4': '#C44244',
    '5': '#FCA69C', '6': '#FCC2B4', '7': '#FCFEFC', '8': '#FCD654'
};
const FAN_FRAME0_ROWS = [
    "......1111......",
    "......2332......",
    "......2332......",
    "......2442......",
    "....22344322....",
    "...2345555432...",
    ".12345677654321.",
    ".13456788765431.",
    ".13456788765431.",
    ".12345677654321.",
    "...2345555432...",
    "....22344322....",
    "......2442......",
    "......2332......",
    "......2332......",
    "......1111......"
];
const FAN_FRAME1_ROWS = [
    "11............11",
    ".232........232.",
    "..2342....2432..",
    "...2344..4432...",
    "....23455432....",
    ".....246642.....",
    "....25677652....",
    "...2578888752...",
    "...2578888752...",
    "....25677652....",
    ".....246642.....",
    "....23455432....",
    "...2344..4432...",
    "..2342....2432..",
    ".232........232.",
    "11............11"
];

class FanEnemy extends Enemy {
    constructor(x, y, delay, formation, isRed = false) {
        super(x, y, isRed);
        this.startY = y;
        this.delay = delay;
        this.formation = formation;
        this.width = 34;
        this.height = 34;
        this.time = 0;
        this.visible = (delay <= 0);
        this.phase = 'STRAIGHT'; // 'STRAIGHT' -> 'DIAG' -> 'RETURN'
        this.turnX = 250; // 画面左寄りまで直進してから折れ曲がる
        this.diagTimer = 0;
        this.vx = -3.4;
        this.vy = 0;
        this.frameIndex = 0;
    }

    update() {
        if (this.delay > 0) {
            this.delay--;
            if (this.delay <= 0) {
                this.visible = true;
                this.x = 820;
                this.y = this.startY;
            }
            return;
        }

        this.time++;
        this.animTimer += 0.28;
        this.frameIndex = Math.floor(this.time / 4) % 2;

        if (this.phase === 'STRAIGHT') {
            this.x += this.vx;
            if (this.x <= this.turnX) {
                this.phase = 'DIAG';
                this.diagTimer = 0;
                let dirY = (this.y < 300) ? 1 : -1;
                if (typeof player !== 'undefined' && player) {
                    dirY = (player.y > this.y) ? 1 : -1;
                }
                this.vx = 2.2;
                this.vy = dirY * 2.6;
            }
        } else if (this.phase === 'DIAG') {
            this.x += this.vx;
            this.y += this.vy;
            this.diagTimer++;
            if (this.diagTimer >= 28) {
                this.phase = 'RETURN';
                this.vx = 3.6;
                this.vy = 0;
            }
        } else {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x > 860 || this.x < -80 || this.y < -60 || this.y > 660) {
                this.active = false;
            }
        }
    }

    draw(ctx) {
        if (!this.visible || !this.active) return;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const pal = this.isRed ? FAN_RED_PALETTE : FAN_BLUE_PALETTE;
        const rows = (this.frameIndex === 0) ? FAN_FRAME0_ROWS : FAN_FRAME1_ROWS;
        const key = (this.isRed ? 'fan_red_' : 'fan_blue_') + this.frameIndex;
        const spr = getEnemyArcadeCanvas(key, rows, pal, 2.3);
        if (spr) {
            ctx.drawImage(spr, Math.round(this.x), Math.round(this.y));
        }
        ctx.restore();
    }
}

// ------------------------------------------
// ガルン編隊 (Garun: 1985年アーケード版 grad0017.png 完全準拠)
// ------------------------------------------
class GarunFormation extends FormationBase {
    constructor(startY, isUpward = false, count = 4, hasRed = true) {
        super(count);
        this.enemies = [];

        for (let i = 0; i < count; i++) {
            const isRed = hasRed && (i === 0 || i === count - 1);
            const enemy = new GarunEnemy(820, startY, i * 18, isUpward ? -1 : 1, this, isRed);
            this.enemies.push(enemy);
            enemies.push(enemy);
        }
    }
}

class GarunEnemy extends Enemy {
    constructor(x, y, delay, phaseDir = 1, formation = null, isRed = false) {
        super(x, y, isRed);
        this.startY = y;
        this.delay = delay;
        this.phaseDir = phaseDir || 1;
        this.formation = formation;
        this.width = 48;
        this.height = 42;
        this.time = 0;
        this.visible = (delay <= 0);
        this.speedX = -2.8;
        this.amplitude = 52;
    }

    update() {
        if (this.delay > 0) {
            this.delay--;
            if (this.delay <= 0) {
                this.visible = true;
                this.x = 820;
            }
            return;
        }

        this.time += 0.085;
        this.animTimer += 0.2;
        this.x += this.speedX;
        this.y = this.startY + Math.sin(this.time) * this.amplitude * this.phaseDir;

        if (this.x < -80) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.visible) return;
        const pal = this.isRed ? GARUN_RED_PALETTE : GARUN_BLUE_PALETTE;
        const useFrame1 = Math.abs(Math.cos(this.time)) < 0.55;
        const rows = useFrame1 ? GARUN_FRAME1_ROWS : GARUN_FRAME0_ROWS;
        const key = (this.isRed ? 'garun_r_' : 'garun_b_') + (useFrame1 ? '1' : '0');
        const spr = getEnemyArcadeCanvas(key, rows, pal, 3);
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(spr, Math.round(this.x), Math.round(this.y));
        ctx.restore();
    }
}

// ------------------------------------------
// ザブ小隊 (奇襲機: 2面ストーンヘンジ・ボス前ラッシュ用)
// ------------------------------------------
class ZabSquad extends FormationBase {
    constructor(spawnSide = 'ANYWHERE', targetY = 300, count = 3) {
        super(count);
        this.enemies = [];

        for (let i = 0; i < count; i++) {
            const isRed = (i === count - 1 && Math.random() < 0.55);
            const enemy = new ZabEnemy('ANYWHERE', null, this, i * 10, isRed);
            this.enemies.push(enemy);
            enemies.push(enemy);
        }
    }
}

class ZabEnemy extends Enemy {
    constructor(spawnSide = 'ANYWHERE', targetY = null, formation = null, delay = 0, isRed = false) {
        let sx, sy;
        if (typeof spawnSide === 'number' && typeof targetY === 'number') {
            sx = Math.max(40, Math.min(750, spawnSide));
            sy = Math.max(40, Math.min(530, targetY));
        } else {
            const pX = (typeof player !== 'undefined' && player) ? (player.x + player.width / 2) : -999;
            const pY = (typeof player !== 'undefined' && player) ? (player.y + player.height / 2) : -999;
            sx = 45 + Math.random() * 695;
            sy = 45 + Math.random() * 480;
            for (let attempt = 0; attempt < 10; attempt++) {
                const candX = 45 + Math.random() * 695;
                const candY = 45 + Math.random() * 480;
                if (Math.hypot(candX + 16 - pX, candY + 16 - pY) >= 115) {
                    sx = candX;
                    sy = candY;
                    break;
                }
            }
        }

        super(sx, sy, isRed);
        this.width = 32;
        this.height = 32;
        this.formation = formation;
        this.spawnSide = 'ANYWHERE';
        this.delay = delay;
        this.state = 'WARP_IN';
        this.warpTimer = 0;
        this.warpDuration = 38;
        this.vx = 0;
        this.vy = 0;
        this.rot = 0;
    }

    update() {
        if (this.delay > 0) {
            this.delay--;
            return;
        }

        this.rot += 0.15;
        if (this.state === 'WARP_IN') {
            this.warpTimer++;
            if (this.warpTimer >= this.warpDuration) {
                this.state = 'RUSH';
                if (typeof particles !== 'undefined' && typeof Particle !== 'undefined') {
                    const pColor = this.isRed ? '#ff6688' : '#00ffff';
                    for (let i = 0; i < 6; i++) {
                        particles.push(new Particle(this.x + this.width / 2, this.y + this.height / 2, pColor));
                    }
                }
                if (typeof player !== 'undefined') {
                    const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
                    const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
                    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                    const speed = 3.6;
                    this.vx = (dx / dist) * speed;
                    this.vy = (dy / dist) * speed;
                } else {
                    this.vx = -3.5;
                }
            }
        } else {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < -80 || this.x > 880 || this.y < -80 || this.y > 680) {
                this.active = false;
            }
        }
    }

    draw(ctx) {
        if (this.delay > 0) return;
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        if (this.state === 'WARP_IN') {
            const progress = Math.min(1, this.warpTimer / this.warpDuration);
            const ringColor = this.isRed ? '#ff3366' : '#00ffff';
            const radius = Math.max(4, (1 - progress) * 40 + 6);

            ctx.strokeStyle = ringColor;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = ringColor;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 0.55, 0, Math.PI * 2);
            ctx.stroke();

            ctx.globalAlpha = progress * 0.85;
            const scale = 0.25 + progress * 0.75;
            ctx.scale(scale, scale);
            ctx.rotate(this.rot);
            ctx.strokeStyle = '#ffffff';
            ctx.fillStyle = this.isRed ? 'rgba(255, 50, 100, 0.5)' : 'rgba(0, 220, 255, 0.5)';
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(15, 0);
            ctx.lineTo(0, 15);
            ctx.lineTo(-15, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else {
            ctx.rotate(this.rot);
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 7;
            ctx.shadowOffsetX = 3;
            ctx.shadowOffsetY = 3;

            const facetTop = ctx.createLinearGradient(0, -15, 0, 0);
            if (this.isRed) {
                facetTop.addColorStop(0.0, '#ffffff');
                facetTop.addColorStop(0.5, '#fda4af');
                facetTop.addColorStop(1.0, '#f43f5e');
            } else {
                facetTop.addColorStop(0.0, '#ffffff');
                facetTop.addColorStop(0.5, '#cbd5e1');
                facetTop.addColorStop(1.0, '#94a3b8');
            }
            ctx.fillStyle = facetTop;
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(15, 0);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.fill();

            const facetLeft = ctx.createLinearGradient(-15, 0, 0, 0);
            if (this.isRed) {
                facetLeft.addColorStop(0.0, '#ffe4e6');
                facetLeft.addColorStop(0.6, '#e11d48');
                facetLeft.addColorStop(1.0, '#9f1239');
            } else {
                facetLeft.addColorStop(0.0, '#e2e8f0');
                facetLeft.addColorStop(0.6, '#64748b');
                facetLeft.addColorStop(1.0, '#475569');
            }
            ctx.fillStyle = facetLeft;
            ctx.beginPath();
            ctx.moveTo(-15, 0);
            ctx.lineTo(0, -15);
            ctx.lineTo(0, 0);
            ctx.closePath();
            ctx.fill();

            const facetRight = ctx.createLinearGradient(0, 0, 15, 0);
            if (this.isRed) {
                facetRight.addColorStop(0.0, '#9f1239');
                facetRight.addColorStop(0.7, '#881337');
                facetRight.addColorStop(1.0, '#4c0519');
            } else {
                facetRight.addColorStop(0.0, '#475569');
                facetRight.addColorStop(0.7, '#334155');
                facetRight.addColorStop(1.0, '#1e293b');
            }
            ctx.fillStyle = facetRight;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(15, 0);
            ctx.lineTo(0, 15);
            ctx.closePath();
            ctx.fill();

            const facetBottom = ctx.createLinearGradient(0, 0, 0, 15);
            if (this.isRed) {
                facetBottom.addColorStop(0.0, '#881337');
                facetBottom.addColorStop(0.6, '#4c0519');
                facetBottom.addColorStop(1.0, '#2a020d');
            } else {
                facetBottom.addColorStop(0.0, '#334155');
                facetBottom.addColorStop(0.6, '#1e293b');
                facetBottom.addColorStop(1.0, '#0f172a');
            }
            ctx.fillStyle = facetBottom;
            ctx.beginPath();
            ctx.moveTo(-15, 0);
            ctx.lineTo(0, 0);
            ctx.lineTo(0, 15);
            ctx.closePath();
            ctx.fill();

            ctx.shadowColor = 'transparent';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(0, 15);
            ctx.moveTo(-15, 0);
            ctx.lineTo(15, 0);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.strokeRect(-10, -10, 20, 20);

            const gemGrad = ctx.createRadialGradient(0, 0, 1, 0, 0, 5);
            gemGrad.addColorStop(0.0, '#ffffff');
            gemGrad.addColorStop(0.4, this.isRed ? '#fb7185' : '#38bdf8');
            gemGrad.addColorStop(1.0, this.isRed ? '#be123c' : '#0284c7');
            ctx.fillStyle = gemGrad;
            ctx.beginPath();
            ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-1, -16, 2, 2);
            ctx.fillRect(15, -1, 2, 2);
        }
        ctx.restore();
    }
}

// ------------------------------------------
// ダッカー (DuckerEnemy: 1985年アーケード版 grad0017.png & grad0019.png 完全準拠)
// ------------------------------------------
class DuckerEnemy extends Enemy {
    constructor(x, y, isCeiling, isRed = false, moveDir = -1) {
        super(x, y, isRed);
        this.width = 48;
        this.height = 38;
        this.isCeiling = isCeiling;
        this.walkCycle = 0;
        this.slopeAngle = 0;
        this.groundY = y;
        this.moveDir = moveDir;
        this.stopTimer = Math.floor(Math.random() * 40);
        this.hp = 1;
        this.shootCooldown = 0;
    }

    update() {
        let activeTerrain = null;
        if (typeof levelManager !== 'undefined') {
            if (levelManager.stage === 4 && window.stage4 && window.stage4.terrain && window.stage4.terrain.wallActive) {
                activeTerrain = window.stage4.terrain;
            } else if (levelManager.stage === 3 && window.stage3 && window.stage3.terrain && window.stage3.terrain.wallActive) {
                activeTerrain = window.stage3.terrain;
            } else if (levelManager.terrain && levelManager.terrain.active) {
                activeTerrain = levelManager.terrain;
            }
        }

        if (activeTerrain) {
            const terrainScroll = activeTerrain.scrollSpeed;

            this.stopTimer++;
            if (this.stopTimer > 75 && this.stopTimer < 120) {
                this.x -= terrainScroll;
                this.shootCooldown++;
                if (this.shootCooldown === 18) {
                    this.shoot();
                }
            } else {
                if (this.stopTimer >= 120) {
                    this.stopTimer = 0;
                    this.shootCooldown = 0;
                    if (typeof player !== 'undefined' && player) {
                        if (this.x < player.x - 90) this.moveDir = 1;
                        else if (this.x > player.x + 220) this.moveDir = -1;
                    }
                }
                this.walkCycle += 0.32;
                this.x += (this.moveDir * 1.8) - terrainScroll;
            }

            const centerX = this.x + this.width / 2;
            const sampleDist = 14;

            if (this.isCeiling) {
                const yL = activeTerrain.getTopY(centerX - sampleDist);
                const yR = activeTerrain.getTopY(centerX + sampleDist);
                const yC = activeTerrain.getTopY(centerX);
                this.slopeAngle = Math.atan2(yR - yL, sampleDist * 2);
                this.groundY = yC;
                this.y = yC;
            } else {
                const yL = activeTerrain.getBottomY(centerX - sampleDist);
                const yR = activeTerrain.getBottomY(centerX + sampleDist);
                const yC = activeTerrain.getBottomY(centerX);
                this.slopeAngle = Math.atan2(yR - yL, sampleDist * 2);
                this.groundY = yC;
                this.y = yC - this.height;
            }
        } else {
            this.x -= this.speed;
        }
    }

    shoot() {
        if (typeof player === 'undefined' || typeof enemyBullets === 'undefined') return;
        const centerX = this.x + this.width / 2;
        const centerY = this.isCeiling ? this.groundY + 14 : this.groundY - 14;

        const dx = (player.x + player.width / 2) - centerX;
        const dy = (player.y + player.height / 2) - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        if (dist < 680) {
            const spd = 3.8;
            const bullet = new EnemyBullet(centerX, centerY, (dx / dist) * spd, (dy / dist) * spd);
            enemyBullets.push(bullet);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const centerX = Math.round(this.x + this.width / 2);
        ctx.translate(centerX, Math.round(this.groundY));
        ctx.rotate(this.slopeAngle);
        if (this.isCeiling) ctx.scale(1, -1);
        if (this.moveDir > 0) ctx.scale(-1, 1);

        const isAiming = (this.stopTimer > 75 && this.stopTimer < 120);
        const pal = this.isRed ? DUCKER_RED_PALETTE : DUCKER_BLUE_PALETTE;
        const rows = isAiming ? DUCKER_AIM_ROWS : DUCKER_WALK_ROWS;
        const key = (this.isRed ? 'ducker_r_' : 'ducker_b_') + (isAiming ? 'aim' : 'walk');
        const spr = getEnemyArcadeCanvas(key, rows, pal, 3);
        const bobY = isAiming ? 0 : (Math.floor(this.walkCycle) % 2) * 2;
        ctx.drawImage(spr, -Math.round(spr.width / 2), -spr.height - bobY);
        ctx.restore();
    }
}

// ------------------------------------------
// 小型ストライプドーム (DomeEnemy: gradius_snap_grad0130.png & sakura_03.png 1:1完全再現)
// 地表設置時は自機狙い弾を発射し、ひし形浮き岩の左斜面設置時(LEFT_WALL)は水平にオレンジ＆白の極太ソロモンレーザーを発射！
// ------------------------------------------
class DomeEnemy extends Enemy {
    constructor(x, y, isCeiling = false, isRed = false, parentIsland = null, relX = 0, relY = 0, mountSide = 'FLOOR') {
        super(x, y, isRed);
        this.width = 36;
        this.height = 30;
        this.isCeiling = isCeiling;
        this.parentIsland = parentIsland;
        this.relX = relX;
        this.relY = relY;
        this.mountSide = mountSide; // 'FLOOR', 'CEILING', 'LEFT_WALL'
        this.hp = 1;
        this.groundY = y;
        this.shootTimer = Math.floor(Math.random() * 80) + 40;
    }

    update() {
        if (this.parentIsland) {
            if (!this.parentIsland.active) {
                this.active = false;
                return;
            }
            this.x = this.parentIsland.x + this.relX;
            this.y = this.parentIsland.y + this.relY;
            this.groundY = this.y + this.height;
        } else if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.active) {
            this.x -= levelManager.terrain.scrollSpeed;
            const centerX = this.x + this.width / 2;
            if (this.isCeiling) {
                this.groundY = levelManager.terrain.getTopY(centerX);
                this.y = this.groundY;
            } else {
                this.groundY = levelManager.terrain.getBottomY(centerX);
                this.y = this.groundY - this.height;
            }
        } else {
            this.x -= this.speed;
        }

        this.shootTimer++;
        const fireInterval = (this.mountSide === 'LEFT_WALL') ? 105 : 150;
        if (this.shootTimer >= fireInterval) {
            this.shootTimer = 0;
            if (typeof player !== 'undefined' && typeof enemyBullets !== 'undefined' && this.x > 40 && this.x < 760) {
                const cx = this.x + this.width / 2;
                const cy = this.y + this.height / 2;
                if (this.mountSide === 'LEFT_WALL') {
                    // sakura_03.png：中央浮き岩の左斜面ドーム砲台が左真横へ放つオレンジ＆ホワイトの水平レーザー弾！
                    if (typeof EnemyLaser !== 'undefined') {
                        enemyBullets.push(new EnemyLaser(this.x - 6, cy, -5.8, 0, '#FC9A24'));
                    } else {
                        enemyBullets.push(new EnemyBullet(this.x - 6, cy, -5.2, 0));
                    }
                } else {
                    const dx = (player.x + player.width / 2) - cx;
                    const dy = (player.y + player.height / 2) - cy;
                    const dist = Math.hypot(dx, dy) || 1;
                    if (dist < 620) {
                        enemyBullets.push(new EnemyBullet(cx, cy, (dx / dist) * 3.2, (dy / dist) * 3.2));
                    }
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const pal = this.isRed ? DOME_RED_PALETTE : DOME_BLUE_PALETTE;
        const key = this.isRed ? 'dome_r' : 'dome_b';
        const spr = getEnemyArcadeCanvas(key, DOME_ROWS, pal, 3);

        if (this.mountSide === 'LEFT_WALL') {
            const cx = Math.round(this.x + this.width);
            const cy = Math.round(this.y + this.height / 2);
            ctx.translate(cx, cy);
            ctx.rotate(-Math.PI / 2);
            ctx.drawImage(spr, -Math.round(spr.width / 2), -spr.height);
        } else {
            ctx.translate(Math.round(this.x + this.width / 2), Math.round(this.groundY));
            if (this.isCeiling) ctx.scale(1, -1);
            ctx.drawImage(spr, -Math.round(spr.width / 2), -spr.height);
        }
        ctx.restore();
    }
}

// ------------------------------------------
// ダグム / 大型スクランブルハッチ基地 (HatcherEnemy: grad0017.png & grad0019.png 1:1完全再現)
// ------------------------------------------
class HatcherEnemy extends Enemy {
    constructor(x, y, isCeiling, isRed = false) {
        super(x, y, isRed);
        this.width = 90;
        this.height = 48;
        this.isCeiling = isCeiling;
        this.hp = 4;
        this.spawnTimer = Math.floor(Math.random() * 25) + 20;
        this.groundY = y;
        this.hatchOpen = false;
        this.openRatio = 0;
    }

    update() {
        if (typeof levelManager !== 'undefined' && levelManager.stage === 2 && typeof stonehengeStage !== 'undefined' && stonehengeStage && stonehengeStage.active) {
            this.x -= stonehengeStage.scrollSpeed;
        } else if (typeof levelManager !== 'undefined' && levelManager.stage === 4 && window.stage4 && window.stage4.terrain && window.stage4.terrain.wallActive) {
            this.x -= window.stage4.terrain.scrollSpeed;
            const centerX = this.x + this.width / 2;
            if (this.isCeiling) {
                this.groundY = window.stage4.terrain.getTopY(centerX);
                this.y = this.groundY;
            } else {
                this.groundY = window.stage4.terrain.getBottomY(centerX);
                this.y = this.groundY - this.height;
            }
        } else if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.active) {
            this.x -= levelManager.terrain.scrollSpeed;
            const centerX = this.x + this.width / 2;
            if (this.isCeiling) {
                this.groundY = levelManager.terrain.getTopY(centerX);
                this.y = this.groundY;
            } else {
                this.groundY = levelManager.terrain.getBottomY(centerX);
                this.y = this.groundY - this.height;
            }
        } else {
            this.x -= this.speed;
        }

        this.spawnTimer++;
        if (this.spawnTimer >= 45 && this.spawnTimer <= 135) {
            this.hatchOpen = true;
            this.openRatio = Math.min(1, this.openRatio + 0.14);
            if (this.spawnTimer % 20 === 0 && this.x > 30 && this.x < 770) {
                if (typeof enemies !== 'undefined') {
                    const by = this.isCeiling ? this.groundY + 14 : this.groundY - 34;
                    enemies.push(new BlasterEnemy(this.x + this.width / 2 - 18, by, this.isCeiling));
                }
            }
        } else {
            this.hatchOpen = false;
            this.openRatio = Math.max(0, this.openRatio - 0.10);
            if (this.spawnTimer >= 190) {
                this.spawnTimer = 0;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(Math.round(this.x + this.width / 2), Math.round(this.groundY));
        if (this.isCeiling) ctx.scale(1, -1);

        const pal = this.isRed ? DAGUMU_RED_PALETTE : DAGUMU_BLUE_PALETTE;
        const isOpen = this.hatchOpen || this.openRatio > 0.35;
        const rows = isOpen ? DAGUMU_OPEN_ROWS : DAGUMU_CLOSED_ROWS;
        const key = (this.isRed ? 'dagumu_r_' : 'dagumu_b_') + (isOpen ? 'open' : 'closed');
        const spr = getEnemyArcadeCanvas(key, rows, pal, 3);
        ctx.drawImage(spr, -Math.round(spr.width / 2), -spr.height);
        ctx.restore();
    }
}

// ------------------------------------------
// ラッシュ / ルグル発進機 (BlasterEnemy: grad0017.png & grad0019.png 1:1完全再現)
// ------------------------------------------
class BlasterEnemy extends Enemy {
    constructor(x, y, isCeiling) {
        super(x, y);
        this.width = 36;
        this.height = 30;
        this.hp = 1;
        this.isCeiling = isCeiling;
        this.phase = 'LAUNCH';
        this.speedX = -0.8;
        this.speedY = isCeiling ? 2.5 : -2.5;
        this.launchTimer = 0;
    }

    update() {
        this.animTimer += 0.25;
        if (this.phase === 'LAUNCH') {
            this.launchTimer++;
            this.x += this.speedX;
            this.y += this.speedY;

            let shouldTurn = (this.launchTimer >= 52);
            if (typeof player !== 'undefined' && player) {
                const py = player.y + player.height / 2;
                const cy = this.y + this.height / 2;
                if (this.isCeiling && cy >= py - 6) shouldTurn = true;
                if (!this.isCeiling && cy <= py + 6) shouldTurn = true;
            }
            if (this.launchTimer > 10 && shouldTurn) {
                this.phase = 'RUSH';
                this.speedX = -4.4;
                this.speedY = 0;
            }
        } else {
            this.x += this.speedX;
            this.y += this.speedY;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const isLaunch = (this.phase === 'LAUNCH');
        const rows = isLaunch ? BLASTER_LAUNCH_ROWS : RUGRA_HORIZ_ROWS;
        const key = isLaunch ? 'blaster_launch' : 'rugra_horiz_b';
        const spr = getEnemyArcadeCanvas(key, rows, RUGRA_BLUE_PALETTE, 3);
        const cx = Math.round(this.x + this.width / 2);
        const cy = Math.round(this.y + this.height / 2);
        ctx.translate(cx, cy);
        if (isLaunch && this.isCeiling) {
            ctx.scale(1, -1);
        }
        ctx.drawImage(spr, -Math.round(spr.width / 2), -Math.round(spr.height / 2));
        ctx.restore();
    }
}

// ------------------------------------------
// ルグル (RugraEnemy: grad0017.png 1:1完全再現)
// ------------------------------------------
class RugraEnemy extends Enemy {
    constructor(x, y, isRed = false, delay = 0) {
        super(x, y, isRed);
        this.width = 36;
        this.height = 30;
        this.delay = delay;
        this.visible = (delay <= 0);
        this.vx = -2.9;
        this.vy = 0;
    }

    update() {
        if (this.delay > 0) {
            this.delay--;
            if (this.delay <= 0) {
                this.visible = true;
                this.x = 820;
            }
            return;
        }

        this.animTimer += 0.22;
        this.x += this.vx;

        if (typeof player !== 'undefined' && player && this.x > player.x - 40) {
            const targetY = player.y + player.height / 2 - this.height / 2;
            const dy = targetY - this.y;
            if (Math.abs(dy) > 4) {
                this.vy += (dy > 0 ? 0.13 : -0.13);
                this.vy = Math.max(-2.0, Math.min(2.0, this.vy));
            } else {
                this.vy *= 0.9;
            }
        }
        this.y += this.vy;

        if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.active) {
            const cx = this.x + this.width / 2;
            const topY = levelManager.terrain.getTopY(cx);
            const botY = levelManager.terrain.getBottomY(cx);
            if (topY > 0 && this.y < topY + 8) {
                this.y = topY + 8;
                this.vy = Math.max(0, this.vy);
            }
            if (botY < 600 && this.y + this.height > botY - 8) {
                this.y = botY - 8 - this.height;
                this.vy = Math.min(0, this.vy);
            }
        }
    }

    draw(ctx) {
        if (!this.visible) return;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const pal = this.isRed ? RUGRA_RED_PALETTE : RUGRA_BLUE_PALETTE;
        const key = this.isRed ? 'rugra_horiz_r' : 'rugra_horiz_b';
        const spr = getEnemyArcadeCanvas(key, RUGRA_HORIZ_ROWS, pal, 3);
        ctx.drawImage(spr, Math.round(this.x), Math.round(this.y));
        ctx.restore();
    }
}

// ------------------------------------------
// 火山 (Volcano: grad0027.png & grad0030.png 1:1実機ピクセルマトリクス完全再現)
// ＆ 火山弾 (VolcanoRock: gradius_stage_snap_gradius_1_219.png 1:1完全再現)
// ------------------------------------------
class Volcano extends Enemy {
    constructor(x, y, isErupting = true) {
        super(x, y);
        this.width = 288;
        this.height = 144;
        this.groundY = y;
        this.burstTimer = 0;
        this.isErupting = isErupting;
        this.magmaAnim = Math.random() * 10;
        this.hp = 99999; // 破壊不能な火山地形ギミック
    }

    update() {
        if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.active) {
            this.x -= levelManager.terrain.scrollSpeed;
            this.groundY = 558;
            this.y = this.groundY - this.height;
        } else {
            this.x -= this.speed;
        }

        this.magmaAnim += 0.14;

        const isEruptPhase = (typeof levelManager !== 'undefined' && levelManager.state === 'VOLCANO_ERUPTION');
        if ((this.isErupting || isEruptPhase) && this.x > -40 && this.x < 780) {
            this.burstTimer++;
            const interval = isEruptPhase ? 6 : 14;
            if (this.burstTimer >= interval) {
                this.burstTimer = 0;
                if (typeof enemies !== 'undefined') {
                    const count = isEruptPhase ? (Math.random() < 0.65 ? 2 : 3) : 1;
                    const isLeftVolcano = (this.x < 300);
                    for (let i = 0; i < count; i++) {
                        // 1985年アーケード実機完全再現：左火山は右方向へ、右火山は左方向へ扇状にダイナミック噴出！
                        const bias = isLeftVolcano ? 0.35 : -0.35;
                        const vx = (Math.random() - 0.5 + bias) * 6.5;
                        const vy = -(Math.random() * 4.5 + 8.5); // 画面上部まで高く力強く打ち上げ！
                        const size = Math.random() < 0.4 ? 42 : (Math.random() < 0.5 ? 32 : 24);
                        enemies.push(new VolcanoRock(
                            this.x + this.width / 2 + (Math.random() - 0.5) * 24 - size / 2,
                            this.groundY - this.height + 4,
                            vx,
                            vy,
                            size
                        ));
                    }
                }
            }
        }
    }

    checkCollision(rect) {
        if (!this.active) return false;
        if (rect.x + rect.width < this.x + 18 || rect.x > this.x + this.width - 18) return false;
        if (rect.y + rect.height < this.y + 8) return false;
        const midX = this.x + this.width / 2;
        const relX = Math.abs((rect.x + rect.width / 2) - midX);
        const topHalf = 24;
        const baseHalf = this.width / 2 - 12;
        const ratio = Math.max(0, Math.min(1, (relX - topHalf) / (baseHalf - topHalf)));
        const slopeY = (this.groundY - this.height + 8) + ratio * (this.height - 8);
        return (rect.y + rect.height >= slopeY);
    }

    draw(ctx) {
        if (!this.active) return;
        if (typeof levelManager !== 'undefined') {
            if (levelManager.terrain && !levelManager.terrain.active) return;
            if (levelManager.state === 'STAGE_CLEAR' && levelManager.terrain && levelManager.terrain.wipeProgress >= 1.0) return;
        }
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const isCrimson = (typeof levelManager !== 'undefined' &&
            (levelManager.state === 'VOLCANO_ERUPTION' || levelManager.state === 'BOSS_ENTRY' || levelManager.state === 'BOSS' ||
             (levelManager.terrain && levelManager.terrain.isCrimsonPalette)));

        if (window.ARCADE_MOUNTAIN_ROWS && window.renderArcadeRowsToCanvas) {
            const pal = isCrimson ? window.ARCADE_ROCK_PALETTE_CRIMSON : window.ARCADE_ROCK_PALETTE_GOLD;
            const key = isCrimson ? 'volcano_crimson_96x48' : 'volcano_gold_96x48';
            if (!_enemySpriteCache[key]) {
                _enemySpriteCache[key] = window.renderArcadeRowsToCanvas(window.ARCADE_MOUNTAIN_ROWS, pal, 3);
            }
            const spr = _enemySpriteCache[key];
            ctx.drawImage(spr, Math.round(this.x), Math.round(this.groundY - this.height), this.width, this.height);
        }
        ctx.restore();
    }
}
// 超巨大火山 (SuperVolcano: 互換維持用)
// ------------------------------------------
class SuperVolcano extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.width = 288;
        this.height = 144;
        this.groundY = y;
        this.burstTimer = 0;
        this.erupting = false;
        this.magmaAnim = 0;
        this.hp = 99999;
        this.targetX = 500;
        this.positioned = false;
    }

    startMajorEruption() {
        this.erupting = true;
        this.burstTimer = 0;
    }

    stopEruption() {
        this.erupting = false;
    }

    update() {
        let scrollSpeed = 0;
        if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.scrollSpeed > 0) {
            scrollSpeed = levelManager.terrain.scrollSpeed;
        }

        if (!this.positioned) {
            const speed = scrollSpeed > 0 ? scrollSpeed : 2.5;
            this.x -= speed;
            this.groundY = 558;
            this.y = this.groundY - this.height;
            if (this.x <= this.targetX) {
                this.x = this.targetX;
                this.positioned = true;
            }
        } else if (!this.erupting) {
            let exitSpeed = Math.max(scrollSpeed, 4.5);
            if (typeof levelManager !== 'undefined' && (levelManager.state === 'BOSS' || levelManager.state === 'STAGE_CLEAR')) {
                exitSpeed = Math.max(exitSpeed, 6.0);
            }
            this.x -= exitSpeed;
            this.groundY = 558;
            this.y = this.groundY - this.height;
            if (this.x + this.width < -50) {
                this.active = false;
                if (typeof levelManager !== 'undefined' && levelManager.superVolcano === this) {
                    levelManager.superVolcano = null;
                }
            }
        }

        this.magmaAnim += 0.16;

        if (this.erupting) {
            this.burstTimer++;
            if (this.burstTimer > 11) {
                this.burstTimer = 0;
                if (typeof enemies !== 'undefined') {
                    const count = Math.floor(Math.random() * 3) + 2;
                    const craterY = this.groundY - this.height + 6;
                    for (let i = 0; i < count; i++) {
                        const vx = (Math.random() - 0.72) * 6.5 - 1.2;
                        const vy = - (Math.random() * 6.2 + 6.8);
                        const spawnX = this.x + this.width / 2 + (Math.random() - 0.5) * 45;
                        enemies.push(new VolcanoRock(spawnX, craterY, vx, vy, 42));
                    }
                }
            }
        }
    }

    checkCollision(rect) {
        return Volcano.prototype.checkCollision.call(this, rect);
    }

    draw(ctx) {
        Volcano.prototype.draw.call(this, ctx);
    }
}

class VolcanoRock extends Enemy {
    constructor(x, y, vx, vy, size = 42) {
        super(x, y);
        this.size = size;
        this.width = size;
        this.height = Math.round(size * (14 / 16));
        this.vx = vx;
        this.vy = vy;
        this.gravity = 0.13;
        this.hp = 1;
        this.rot = 0;
        this.rotSpd = (Math.random() < 0.5 ? 1 : -1) * 0.12;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.rot += this.rotSpd;

        if (this.y > 620 || this.x < -120 || this.x > 950) {
            this.active = false;
            return;
        }

        if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.active) {
            const cx = this.x + this.width / 2;
            const ground = levelManager.terrain.getBottomY(cx);
            const ceiling = levelManager.terrain.getTopY(cx);
            if (this.vy > 0 && this.y + this.height >= ground) {
                this.active = false;
            } else if (this.vy < 0 && this.y <= Math.max(8, ceiling)) {
                // 天井に激突しても消滅せず、下向きに跳ね返って激しく降り注ぐ！（本家AC版の激しい噴火シャワー再現）
                this.y = Math.max(8, ceiling);
                this.vy = Math.abs(this.vy) * 0.65;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const spr = getEnemyArcadeCanvas('volcano_rock_16x14', VOLCANO_ROCK_ROWS, VOLCANO_ROCK_PALETTE, 3);
        ctx.drawImage(spr, Math.round(this.x), Math.round(this.y), this.width, this.height);
        ctx.restore();
    }
}

// ------------------------------------------
// 砲台 (TurretEnemy / ディー01: grad0017.png & gradius_snap_grad0130.png 1:1完全再現)
// ------------------------------------------
class TurretEnemy extends Enemy {
    constructor(x, y, isCeiling, isRed = false, parentIsland = null, relX = 0) {
        super(x, y, isRed);
        this.width = 36;
        this.height = 24;
        this.isCeiling = isCeiling;
        this.parentIsland = parentIsland;
        this.relX = relX;
        this.shootTimer = Math.floor(Math.random() * 55) + 25;
        this.hp = 1;
        this.slopeAngle = 0;
        this.groundY = y;
        this.barrelAngle = Math.PI;
    }

    update() {
        if (this.parentIsland) {
            if (!this.parentIsland.active) {
                this.active = false;
                return;
            }
            this.x = this.parentIsland.x + this.relX;
            if (this.isCeiling) {
                this.groundY = this.parentIsland.y + this.parentIsland.height;
                this.y = this.groundY;
            } else {
                this.groundY = this.parentIsland.y;
                this.y = this.groundY - this.height;
            }
            this.slopeAngle = 0;
        } else if (typeof levelManager !== 'undefined' && levelManager.stage === 2 && typeof stonehengeStage !== 'undefined' && stonehengeStage && stonehengeStage.active) {
            this.x -= stonehengeStage.scrollSpeed;
        } else if (typeof levelManager !== 'undefined' && levelManager.stage === 4 && window.stage4 && window.stage4.terrain && window.stage4.terrain.wallActive) {
            this.x -= window.stage4.terrain.scrollSpeed;
            const centerX = this.x + this.width / 2;
            const yC = this.isCeiling ? window.stage4.terrain.getTopY(centerX) : window.stage4.terrain.getBottomY(centerX);
            this.groundY = yC;
            this.y = this.isCeiling ? yC : (yC - this.height);
            this.slopeAngle = 0;
        } else if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.active) {
            this.x -= levelManager.terrain.scrollSpeed;
            const centerX = this.x + this.width / 2;
            const yC = this.isCeiling ? levelManager.terrain.getTopY(centerX) : levelManager.terrain.getBottomY(centerX);
            this.groundY = yC;
            this.y = this.isCeiling ? yC : (yC - this.height);
            this.slopeAngle = 0;
        } else {
            this.x -= this.speed;
        }

        if (typeof player !== 'undefined' && player) {
            const centerX = this.x + this.width / 2;
            const centerY = this.isCeiling ? this.groundY + 12 : this.groundY - 12;
            const rawAngle = Math.atan2((player.y + player.height / 2) - centerY, (player.x + player.width / 2) - centerX);
            const step = Math.PI / 8;
            this.barrelAngle = Math.round(rawAngle / step) * step;
        }

        this.shootTimer++;
        if (this.shootTimer > 135) {
            this.shootTimer = 0;
            this.shoot();
        }
    }

    shoot() {
        if (typeof player === 'undefined' || typeof enemyBullets === 'undefined') return;
        if (this.x < 20 || this.x > 770) return;
        const centerX = this.x + this.width / 2;
        const centerY = this.isCeiling ? this.groundY + 14 : this.groundY - 14;

        const dx = (player.x + player.width / 2) - centerX;
        const dy = (player.y + player.height / 2) - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist < 640) {
            const speed = 3.2;
            const bullet = new EnemyBullet(centerX, centerY, (dx / dist) * speed, (dy / dist) * speed);
            enemyBullets.push(bullet);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const centerX = Math.round(this.x + this.width / 2);
        const groundY = Math.round(this.groundY);
        ctx.translate(centerX, groundY);
        if (this.isCeiling) ctx.scale(1, -1);

        let isFacingRight = false;
        if (typeof player !== 'undefined' && player && player.x > this.x + 20) {
            isFacingRight = true;
            ctx.scale(-1, 1);
        }

        const isSteep = (typeof player !== 'undefined' && player && Math.abs(player.x - this.x) < 130);
        const pal = this.isRed ? DEE01_RED_PALETTE : DEE01_BLUE_PALETTE;
        const rows = isSteep ? DEE01_UP_ROWS : DEE01_DIAG_ROWS;
        const key = (this.isRed ? 'dee01_r_' : 'dee01_b_') + (isSteep ? 'up' : 'diag');
        const spr = getEnemyArcadeCanvas(key, rows, pal, 3);
        ctx.drawImage(spr, -Math.round(spr.width / 2), -spr.height);
        ctx.restore();
    }
}

// 浮遊大陸用レーザー砲台 (LaserTurretEnemy: 短いレーザーを放つハイテク重砲台)
class LaserTurretEnemy extends Enemy {
    constructor(parentIsland, relX, isCeiling = false) {
        super(0, 0);
        this.parentIsland = parentIsland;
        this.relX = relX;
        this.isCeiling = isCeiling; // false: 上面, true: 下面
        this.width = 42;
        this.height = 32;
        this.hp = 3;
        this.shootTimer = Math.floor(Math.random() * 60);
        this.barrelAngle = isCeiling ? Math.PI / 2 : -Math.PI / 2;
        this.updatePosition();
    }

    updatePosition() {
        if (this.parentIsland) {
            this.x = this.parentIsland.x + this.relX;
            if (this.isCeiling) {
                // 浮遊大陸の底面
                this.groundY = this.parentIsland.y + this.parentIsland.height;
                this.y = this.groundY;
            } else {
                // 浮遊大陸の上面
                this.groundY = this.parentIsland.y;
                this.y = this.groundY - this.height;
            }
        }
    }

    update() {
        this.updatePosition();

        if (this.parentIsland && !this.parentIsland.active) {
            this.active = false;
            return;
        }

        if (this.x < -120) {
            this.active = false;
            return;
        }

        // 自機方向への砲身トラッキング
        if (typeof player !== 'undefined') {
            const centerX = this.x + this.width / 2;
            const centerY = this.isCeiling ? this.groundY + 14 : this.groundY - 14;
            const targetAngle = Math.atan2(player.y - centerY, player.x - centerX);
            this.barrelAngle = targetAngle;
        }

        this.shootTimer++;
        if (this.shootTimer > 85) {
            this.shootTimer = 0;
            this.shoot();
        }
    }

    shoot() {
        if (typeof player === 'undefined' || typeof enemyBullets === 'undefined') return;
        const centerX = this.x + this.width / 2;
        const centerY = this.isCeiling ? this.groundY + 16 : this.groundY - 16;

        const dx = (player.x + player.width / 2) - centerX;
        const dy = (player.y + player.height / 2) - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist < 750) {
            const speed = 5.2; // レーザー特有のシャープな高速弾速
            const speedX = (dx / dist) * speed;
            const speedY = (dy / dist) * speed;

            // 砲身先端から発射
            const barrelLen = 26;
            const spawnX = centerX + Math.cos(this.barrelAngle) * barrelLen;
            const spawnY = centerY + Math.sin(this.barrelAngle) * barrelLen;

            if (typeof EnemyLaser !== 'undefined') {
                enemyBullets.push(new EnemyLaser(spawnX, spawnY, speedX, speedY, '#00ffff'));
            } else {
                enemyBullets.push(new EnemyBullet(spawnX, spawnY, speedX, speedY));
            }

            // マズルフラッシュ (シアンの光彩)
            if (typeof particles !== 'undefined') {
                for (let i = 0; i < 5; i++) {
                    particles.push(new Particle(spawnX, spawnY, '#00ffff'));
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        const centerX = this.x + this.width / 2;
        ctx.translate(centerX, this.groundY);
        if (this.isCeiling) ctx.scale(1, -1);

        // --- 1. ベースマウント（高輝度シルバーチタン＆シアンLED） ---
        const baseGrad = ctx.createLinearGradient(-24, 0, 24, 0);
        baseGrad.addColorStop(0.0, '#475569');
        baseGrad.addColorStop(0.3, '#cbd5e1');
        baseGrad.addColorStop(0.5, '#f8fafc');
        baseGrad.addColorStop(0.7, '#cbd5e1');
        baseGrad.addColorStop(1.0, '#334155');
        ctx.fillStyle = baseGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, 24, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // --- 2. 旋回レーザー砲身 ---
        ctx.save();
        ctx.translate(0, -12);
        const drawAngle = this.isCeiling ? -this.barrelAngle : this.barrelAngle;
        ctx.rotate(drawAngle);

        // 砲身（ダブルバレル風のハイテクレーザーキャノン: シルバー＆シアン）
        const barrelGrad = ctx.createLinearGradient(0, -6, 26, 6);
        barrelGrad.addColorStop(0.0, '#64748b');
        barrelGrad.addColorStop(0.4, '#e2e8f0');
        barrelGrad.addColorStop(0.7, '#94a3b8');
        barrelGrad.addColorStop(1.0, '#334155');
        ctx.fillStyle = barrelGrad;
        ctx.fillRect(0, -6, 26, 12);

        // レーザー集束コイル（シアンの発光ライン）
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 8;
        ctx.fillRect(6, -7, 3, 14);
        ctx.fillRect(13, -7, 3, 14);
        ctx.fillRect(20, -7, 3, 14);
        ctx.shadowBlur = 0;

        // 砲口レンズ（白熱発光）
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(26, -5, 3, 10);

        ctx.restore();

        // --- 3. コントロール砲塔ドーム（クロームシルバー＆シアン追尾アイ） ---
        const domeGrad = ctx.createRadialGradient(-4, -18, 3, 0, -12, 16);
        domeGrad.addColorStop(0.0, '#ffffff');
        domeGrad.addColorStop(0.4, '#cbd5e1');
        domeGrad.addColorStop(0.8, '#64748b');
        domeGrad.addColorStop(1.0, '#1e293b');
        ctx.fillStyle = domeGrad;
        ctx.beginPath();
        ctx.arc(0, -12, 15, Math.PI, 0);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 光学アイ (鮮烈にシアン発光するセンサーアイ)
        ctx.fillStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, -12, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // レンズ中心ハイライト
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-1, -13, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// 浮遊大陸用新キャラ砲台のエイリアス
const LaserCannonTurret = LaserTurretEnemy;

// ==========================================
// STAGE 2 新キャラ1: 古代ルーン砲台 (RuneTurret)
// 壊れない石の上に鎮座する古代遺跡の防衛装置
// ==========================================
class RuneTurret extends Enemy {
    constructor(x, y, isCeiling = false, isRed = false) {
        super(x, y, isRed);
        this.width = 38;
        this.height = 32;
        this.isCeiling = isCeiling;
        this.shootTimer = Math.floor(Math.random() * 60);
        this.hp = 1; // 軽快に撃破してカプセル獲得
        this.groundY = y;
        this.barrelAngle = isCeiling ? Math.PI / 2 : -Math.PI / 2;
    }

    update() {
        // ステージ2のスクロール速度に連動
        const scrollSpeed = (typeof stonehengeStage !== 'undefined' && stonehengeStage) ? stonehengeStage.scrollSpeed : 1.5;
        this.x -= scrollSpeed;
        if (this.x < -100) {
            this.active = false;
            return;
        }

        // 自機追尾
        if (typeof player !== 'undefined') {
            const centerX = this.x + this.width / 2;
            const centerY = this.isCeiling ? this.y + 12 : this.y + this.height - 12;
            this.barrelAngle = Math.atan2(player.y - centerY, player.x - centerX);
        }

        this.shootTimer++;
        if (this.shootTimer > 150) {
            this.shootTimer = 0;
            this.shoot();
        }
    }

    shoot() {
        if (typeof player === 'undefined' || typeof enemyBullets === 'undefined') return;
        const centerX = this.x + this.width / 2;
        const centerY = this.isCeiling ? this.y + 14 : this.y + this.height - 14;

        const dx = (player.x + player.width / 2) - centerX;
        const dy = (player.y + player.height / 2) - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist < 650) {
            const speed = 4.2;
            // 赤敵は真紅の光弾、通常は紫色の古代ルーン光弾
            const bulletColor = this.isRed ? '#ff3366' : '#c084fc';
            enemyBullets.push(new Bullet(centerX, centerY, (dx / dist) * speed, (dy / dist) * speed, bulletColor, true));
            if (typeof particles !== 'undefined') {
                for (let i = 0; i < 4; i++) {
                    particles.push(new Particle(centerX, centerY, bulletColor));
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        const centerX = this.x + this.width / 2;
        const baseY = this.isCeiling ? this.y : this.y + this.height;
        ctx.translate(centerX, baseY);
        if (this.isCeiling) ctx.scale(1, -1);

        // 古代石柱マウント
        const baseGrad = ctx.createLinearGradient(-18, 0, 18, 0);
        if (this.isRed) {
            baseGrad.addColorStop(0.0, '#4a0410');
            baseGrad.addColorStop(0.5, '#9f1239');
            baseGrad.addColorStop(1.0, '#1e0208');
        } else {
            baseGrad.addColorStop(0.0, '#1e1b4b');
            baseGrad.addColorStop(0.5, '#4338ca');
            baseGrad.addColorStop(1.0, '#0f172a');
        }
        ctx.fillStyle = baseGrad;
        ctx.fillRect(-18, -8, 36, 8);
        ctx.strokeStyle = this.isRed ? '#fb7185' : '#818cf8';
        ctx.lineWidth = 1;
        ctx.strokeRect(-18, -8, 36, 8);

        // 回転ルーン砲頭
        ctx.save();
        ctx.translate(0, -14);
        const drawAngle = this.isCeiling ? -this.barrelAngle : this.barrelAngle;
        ctx.rotate(drawAngle);

        // 砲身
        ctx.fillStyle = this.isRed ? '#e11d48' : '#6366f1';
        ctx.fillRect(0, -4, 20, 8);
        ctx.fillStyle = this.isRed ? '#ff6b81' : '#a855f7';
        ctx.fillRect(18, -5, 3, 10);
        ctx.restore();

        // ルーンクリスタルアイ
        ctx.shadowColor = this.isRed ? '#ff2255' : '#c084fc';
        ctx.shadowBlur = 8;
        ctx.fillStyle = this.isRed ? '#ffe4e6' : '#e9d5ff';
        ctx.beginPath();
        ctx.arc(0, -14, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ==========================================
// STAGE 2 新キャラ2: 浮遊古代ストーンアイ (StoneEyeEnemy)
// モアイ・古代石像の顔ドローン。イオンリング弾を吐く！
// ==========================================
class StoneEyeEnemy extends Enemy {
    constructor(x, y, isRed = false) {
        super(x, y, isRed);
        this.width = 38;
        this.height = 42;
        this.speed = 1.4;
        this.hp = 1; // 軽快に撃破してカプセル獲得
        this.shootTimer = Math.floor(Math.random() * 50);
        this.baseY = y;
        this.floatPhase = Math.random() * Math.PI * 2;
    }

    update() {
        this.x -= this.speed;
        this.floatPhase += 0.05;
        this.y = this.baseY + Math.sin(this.floatPhase) * 25; // ふわふわ浮遊

        if (this.x < -80) {
            this.active = false;
            return;
        }

        this.shootTimer++;
        if (this.shootTimer > 120) {
            this.shootTimer = 0;
            this.shoot();
        }
    }

    shoot() {
        if (typeof player === 'undefined' || typeof enemyBullets === 'undefined') return;
        const mouthX = this.x;
        const mouthY = this.y + this.height * 0.65;

        const dx = (player.x + player.width / 2) - mouthX;
        const dy = (player.y + player.height / 2) - mouthY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && dist < 650) {
            const speed = 3.6;
            // イオンリング弾（口から発射！）
            if (typeof RingBullet !== 'undefined') {
                enemyBullets.push(new RingBullet(mouthX, mouthY, (dx / dist) * speed, (dy / dist) * speed, '#38bdf8'));
            } else {
                enemyBullets.push(new Bullet(mouthX, mouthY, (dx / dist) * speed, (dy / dist) * speed, '#38bdf8', true));
            }

            if (typeof particles !== 'undefined') {
                for (let i = 0; i < 5; i++) {
                    particles.push(new Particle(mouthX, mouthY, '#38bdf8'));
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // 古代石像・モアイフェイス（立体陰影）
        const grad = ctx.createLinearGradient(0, 0, this.width, this.height);
        if (this.isRed) {
            grad.addColorStop(0.0, '#fda4af');
            grad.addColorStop(0.4, '#e11d48');
            grad.addColorStop(1.0, '#4c0519');
        } else {
            grad.addColorStop(0.0, '#94a3b8');
            grad.addColorStop(0.4, '#64748b');
            grad.addColorStop(1.0, '#1e293b');
        }
        ctx.fillStyle = grad;

        // モアイ形状ポリゴン
        ctx.beginPath();
        ctx.moveTo(8, 0); // 額
        ctx.lineTo(this.width, 4); // 後頭部
        ctx.lineTo(this.width - 4, this.height); // 顎裏
        ctx.lineTo(6, this.height); // 顎先
        ctx.lineTo(2, this.height * 0.7); // 唇
        ctx.lineTo(0, this.height * 0.45); // 鼻
        ctx.lineTo(6, this.height * 0.3); // 眉間
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = this.isRed ? '#881337' : '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 巨大な目（通常シアン・赤敵は黄金ゴールド）
        ctx.shadowColor = this.isRed ? '#fbbf24' : '#00ffff';
        ctx.shadowBlur = 6;
        ctx.fillStyle = this.isRed ? '#fef08a' : '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(14, this.height * 0.32, 5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(12, 14, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 口の溝
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(3, this.height * 0.65);
        ctx.lineTo(14, this.height * 0.65);
        ctx.stroke();

        ctx.restore();
    }
}

// ==========================================
// STAGE 2 新キャラ: 丸型ワープ兵器 (WarpSphereEnemy & WarpSquad)
// 宇宙空間の至る所から光の波紋とともにワープアウトして自機を強襲する球体ドローン
// ==========================================
class WarpSquad extends FormationBase {
    constructor(count = 4) {
        super(count);
        this.enemies = [];
        
        // 自機の周囲ランダム（前方・後方・上下）にワープイン配置
        for (let i = 0; i < count; i++) {
            const rx = 120 + Math.random() * 640;
            const ry = 80 + Math.random() * 440;
            const delay = i * 16;
            const isHoming = Math.random() < 0.65;
            const enemy = new WarpSphereEnemy(rx, ry, isHoming ? 'HOMING' : 'SHOOTER', this, delay);
            this.enemies.push(enemy);
            enemies.push(enemy);
        }
    }
}

class WarpSphereEnemy extends Enemy {
    constructor(x, y, behaviorType = 'HOMING', formation = null, delay = 0) {
        super(x, y);
        this.width = 38;
        this.height = 38;
        this.behaviorType = behaviorType; // 'HOMING' (高速追撃) or 'SHOOTER' (リング弾発射)
        this.formation = formation;
        this.delay = delay;
        this.hp = 2;
        this.state = 'WARPING'; // 'WARPING' -> 'ACTIVE'
        this.warpTimer = 0;
        this.warpDuration = 45; // 約0.75秒のワープイン演出
        this.activeTimer = 0;
        this.ringAngle = Math.random() * Math.PI * 2;
        this.shootTimer = Math.floor(Math.random() * 30);
    }

    update() {
        if (this.delay > 0) {
            this.delay--;
            return;
        }

        this.ringAngle += 0.09;

        if (this.state === 'WARPING') {
            this.warpTimer++;
            if (this.warpTimer >= this.warpDuration) {
                this.state = 'ACTIVE';
                // ワープ完了時のシアン光粒子
                if (typeof particles !== 'undefined') {
                    for (let i = 0; i < 8; i++) {
                        particles.push(new Particle(this.x + this.width / 2, this.y + this.height / 2, '#00ffff'));
                    }
                }
            }
            return;
        }

        this.activeTimer++;

        if (this.behaviorType === 'HOMING') {
            // 自機に向かってスムーズに加速旋回突進
            if (typeof player !== 'undefined') {
                const dx = (player.x + player.width / 2) - (this.x + this.width / 2);
                const dy = (player.y + player.height / 2) - (this.y + this.height / 2);
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    const spd = Math.min(4.8, 1.8 + this.activeTimer * 0.035);
                    this.x += (dx / dist) * spd - 0.8;
                    this.y += (dy / dist) * spd;
                }
            } else {
                this.x -= 3.2;
            }
        } else {
            // SHOOTER: 浮遊旋回しながら古代イオンリング弾を発射
            this.x -= 1.4;
            this.y += Math.sin(this.activeTimer * 0.06) * 1.8;

            this.shootTimer++;
            if (this.shootTimer > 65) {
                this.shootTimer = 0;
                this.shoot();
            }
        }

        if (this.x < -100 || this.x > 900 || this.y < -100 || this.y > 700) {
            if (this.activeTimer > 150) this.active = false;
        }
    }

    shoot() {
        if (typeof player === 'undefined' || typeof enemyBullets === 'undefined') return;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const dx = (player.x + player.width / 2) - cx;
        const dy = (player.y + player.height / 2) - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0 && typeof RingBullet !== 'undefined') {
            const spd = 4.4;
            enemyBullets.push(new RingBullet(cx, cy, (dx / dist) * spd, (dy / dist) * spd, '#38bdf8'));
        }
    }

    draw(ctx) {
        if (this.delay > 0) return;
        ctx.save();
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        if (this.state === 'WARPING') {
            // ワープイン演出（空間の光彩歪み＆拡大リング）
            const progress = this.warpTimer / this.warpDuration;
            const radius = 24 * Math.sin(progress * Math.PI);

            ctx.strokeStyle = `rgba(0, 255, 255, ${Math.sin(progress * Math.PI)})`;
            ctx.lineWidth = 3;
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = `rgba(255, 255, 255, ${Math.sin(progress * Math.PI)})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
            return;
        }

        // 実体化後の丸型ワープ兵器
        // 1. 周囲を高速回転するプラズマリング
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.ringAngle);
        ctx.strokeStyle = '#00ffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 23, 9, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // 2. メタリック球体本体（3D光沢スフィア）
        const sphereGrad = ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, 18);
        sphereGrad.addColorStop(0.0, '#ffffff');
        sphereGrad.addColorStop(0.25, '#38bdf8');
        sphereGrad.addColorStop(0.65, '#0369a1');
        sphereGrad.addColorStop(1.0, '#0f172a');
        ctx.fillStyle = sphereGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 3. 発光センサーアイ
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#00ffff';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(cx - 3, cy - 3, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}



