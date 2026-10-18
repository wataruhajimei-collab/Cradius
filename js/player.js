// 1985年アーケード版 ビックバイパー 32x14 ドット行列 (grad0017.png より抽出)
const VIC_VIPER_PALETTE = {
    '1': '#8C0204', '2': '#5C4A44', '3': '#7C6A5C', '4': '#8C726C', '5': '#A48A7C',
    '6': '#DCDECC', '7': '#C4B2A4', '8': '#547EC4', '9': '#DCB2B4', 'A': '#C47E54',
    'B': '#040274', 'C': '#ECDEB4', 'D': '#DCB28C', 'E': '#0402A4', 'F': '#1C72C4',
    'G': '#7CC2FC', 'H': '#FCFEFC', 'I': '#A44234', 'J': '#B4DEFC', 'K': '#0402C4',
    'L': '#DCFEFC', 'M': '#A44254'
};
const VIC_VIPER_ROWS = [
    "..............1.................",
    "...............22...............",
    "...............33422............",
    "........5675...3333333..........",
    ".........56678.2222222222.......",
    "..........766695555555444433....",
    "..........466666733AAA555777775.",
    ".....BB....66666673CCDDAA444444.",
    "...BBEFG.H.HHHHHHH73DCDDDI2JJJJJ",
    ".BBKKFGL.6.776666667MIIII.2.....",
    "...BBKFG.5.44766666666HHHHHHHH7.",
    ".....BB...2..576666666666667532.",
    "...........H8.5777777776H543....",
    "...........JH8.66666HH533......."
];
let _vicViperCanvas = null;
function getVicViperCanvas() {
    if (_vicViperCanvas) return _vicViperCanvas;
    const S = 3;
    const c = document.createElement('canvas');
    c.width = 32 * S;
    c.height = 14 * S;
    const g = c.getContext('2d');
    for (let y = 0; y < VIC_VIPER_ROWS.length; y++) {
        for (let x = 0; x < 32; x++) {
            const col = VIC_VIPER_PALETTE[VIC_VIPER_ROWS[y][x]];
            if (!col) continue;
            g.fillStyle = col;
            g.fillRect(x * S, y * S, S, S);
        }
    }
    _vicViperCanvas = c;
    return c;
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 20;
        this.speed = 3.5; // Responsive arcade speed
        this.color = '#00ffff'; // 仮の色（ビックバイパー風の青系）
        this.lastShotTime = 0;
        this.shotDelay = 200; // 弾の発射間隔（ミリ秒）
        
        this.powerUpIndex = -1; // -1 は未選択
        this.lastPowerUpKeyTime = 0;
        this.weaponType = 'NORMAL'; // NORMAL, DOUBLE, LASER 等

        this.history = []; // 過去の位置を記録（オプション用）
        this.historyMax = 100; // 記録する最大フレーム数 (余裕を持たせる)
        this.options = []; // 持っているオプション
        this.maxOptions = 4; // オプションの最大数

        this.shieldActive = false;
        this.shieldHp = 0;
        this.maxShieldHp = 16; // 1985年AC版準拠のシールド耐久力（残量低下で赤く変色）

        this.hasMissile = false; // ミサイルを持っているか
        this.hitFlashTimer = 0;  // 被弾時の赤白フラッシュ＆シェイク演出タイマー
        this.hitCooldown = 0;    // 連続被弾クールダウン
        this.hitCount = 0;
        this.bankAngle = 0;      // 上下移動時の機体ロール（バンク）状態 (-1: 上, 0: 水平, 1: 下)
        this.shieldAnimTimer = 0;
    }

    onHit(sourceX) {
        if (this.shieldActive) {
            this.shieldHp--;
            if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') {
                Sound.playBossHit();
            }
            if (this.shieldHp <= 0) {
                this.shieldActive = false;
            }
            return true;
        }

        if (this.hitCooldown > 0) return false;
        this.hitCooldown = 18;
        this.hitFlashTimer = 18;
        this.hitCount++;

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        if (typeof createExplosion === 'function') {
            createExplosion(cx, cy, '#ff3300');
            createExplosion(cx, cy, '#ffdd00');
        }
        if (typeof Sound !== 'undefined' && typeof Sound.playExplosion === 'function') {
            Sound.playExplosion();
        }

        // ボスの背後（画面右側）に回り込んで被弾した場合は衝撃で弾き飛ばされるノックバック
        if (this.x > 460) {
            this.x = Math.max(40, this.x - 28);
        }
        return true;
    }

    update(canvasWidth, canvasHeight) {
        if (this.hitFlashTimer > 0) this.hitFlashTimer--;
        if (this.hitCooldown > 0) this.hitCooldown--;
        this.shieldAnimTimer += 0.25;

        // 入力による移動処理＆1985年AC版バンク姿勢制御
        let moveY = 0;
        if (Input.isDown('ArrowUp')) {
            this.y -= this.speed;
            moveY = -1;
        }
        if (Input.isDown('ArrowDown')) {
            this.y += this.speed;
            moveY = 1;
        }
        if (moveY !== 0) {
            this.bankAngle += (moveY - this.bankAngle) * 0.35;
        } else {
            this.bankAngle *= 0.7;
            if (Math.abs(this.bankAngle) < 0.05) this.bankAngle = 0;
        }
        if (Input.isDown('ArrowLeft')) {
            this.x -= this.speed;
        }
        if (Input.isDown('ArrowRight')) {
            this.x += this.speed;
        }

        // 画面外に出ないように制限
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvasWidth) this.x = canvasWidth - this.width;
        if (this.y < 0) this.y = 0;
        if (this.y + this.height > canvasHeight) this.y = canvasHeight - this.height;

        // 位置の履歴を記録（オプション用）
        // プレイヤーが移動した時のみ履歴を追加することで、停止時にオプションが自機に重ならないようにする
        if (this.history.length === 0 || this.history[0].x !== this.x || this.history[0].y !== this.y) {
            // 万一座標が大きく飛んだ場合もワープに見えないよう補間履歴を挿入
            if (this.history.length > 0) {
                const dx = this.x - this.history[0].x;
                const dy = this.y - this.history[0].y;
                const dist = Math.hypot(dx, dy);
                if (dist > this.speed * 2.5) {
                    const steps = Math.min(30, Math.ceil(dist / Math.max(3, this.speed)));
                    for (let s = 1; s < steps; s++) {
                        const ratio = s / steps;
                        this.history.unshift({
                            x: this.history[0].x + dx * ratio,
                            y: this.history[0].y + dy * ratio
                        });
                    }
                }
            }
            this.history.unshift({ x: this.x, y: this.y });
            while (this.history.length > this.historyMax) {
                this.history.pop();
            }
        }

        // オプションの更新
        this.options.forEach(option => option.update());

        // ショット（Zキー）
        if (Input.isDown('KeyZ')) {
            const now = Date.now();
            // レーザー時は近くの敵に当たっても連射・乱れが起きないよう一定間隔（360ms）を保証
            // 通常弾/DOUBLEは標準の shotDelay (200ms)
            const currentDelay = this.weaponType === 'LASER' ? 360 : this.shotDelay;
            if (now - this.lastShotTime > currentDelay) {
                if (this.shoot()) {
                    this.lastShotTime = now;
                }
            }
        }

        // パワーアップ発動（Xキー）
        if (Input.isDown('KeyX')) {
            const now = Date.now();
            if (now - this.lastPowerUpKeyTime > 300) { // 連続入力防止
                this.activatePowerUp();
                this.lastPowerUpKeyTime = now;
            }
        }

        // テスト用ショートカット: Lキーで即座にレーザー装備
        if (Input.isDown('KeyL')) {
            this.weaponType = 'LASER';
        }

        // テスト用ショートカット: 1キーで即座にステージ1（火山面）へワープ
        if (Input.isDown('Digit1')) {
            if (typeof levelManager !== 'undefined') {
                levelManager.startStage1();
            }
        }

        // テスト用ショートカット: 2キーで即座にステージ2（ストーンヘンジ面）へワープ
        if (Input.isDown('Digit2')) {
            if (typeof levelManager !== 'undefined' && levelManager.stage !== 2) {
                levelManager.startStage2();
            }
        }

        // テスト用ショートカット: 3キーで即座にステージ3（モアイ面）へワープ
        if (Input.isDown('Digit3')) {
            if (typeof levelManager !== 'undefined' && levelManager.stage !== 3) {
                levelManager.startStage3();
            }
        }

        // テスト用ショートカット: 4キーで即座にステージ4（逆火山面）へワープ
        if (Input.isDown('Digit4')) {
            if (typeof levelManager !== 'undefined' && levelManager.stage !== 4) {
                levelManager.startStage4();
            }
        }

        // テスト用ショートカット: Vキーで即座に1面火山ゾーンまたは4面クラゲロボット大巡回ゾーンへワープ
        if (Input.isDown('KeyV')) {
            if (typeof levelManager !== 'undefined') {
                if (levelManager.stage === 1) {
                    levelManager.state = 'TERRAIN';
                    levelManager.terrain.start();
                    levelManager.terrain.currentSegIndex = 82;
                    levelManager.terrain.spawnIndex = levelManager.terrain.spawns.findIndex(s => s.seg >= 82);
                    if (levelManager.terrain.spawnIndex < 0) levelManager.terrain.spawnIndex = levelManager.terrain.spawns.length;
                    levelManager.time = 18000;
                    if (typeof Sound !== 'undefined' && typeof Sound.playStageBgm === 'function') {
                        Sound.playStageBgm();
                    }
                } else if (levelManager.stage === 4 && window.stage4 && window.stage4.state === 'STAGE') {
                    if (typeof window.stage4.startJellyfishRush === 'function') {
                        window.stage4.startJellyfishRush();
                    }
                }
            }
        }

        // テスト用ショートカット: Bキーで即座にボス戦へワープ（1面〜4面）
        if (Input.isDown('KeyB')) {
            if (typeof levelManager !== 'undefined') {
                if (levelManager.stage === 1 && levelManager.state !== 'BOSS') {
                    levelManager.state = 'BOSS';
                    levelManager.time = 0;
                    levelManager.terrain.active = false;
                    if (typeof Sound !== 'undefined') Sound.playBossBgm();
                    if (typeof Boss !== 'undefined') {
                        levelManager.boss = new Boss(levelManager.starfield.width, 200);
                    }
                } else if (levelManager.stage === 2 && typeof stonehengeStage !== 'undefined' && stonehengeStage && stonehengeStage.state !== 'BOSS') {
                    stonehengeStage.state = 'BOSS';
                    stonehengeStage.blocks = [];
                    if (typeof Sound !== 'undefined') Sound.playBossBgm();
                    if (typeof GolemBoss !== 'undefined') {
                        stonehengeStage.boss = new GolemBoss(stonehengeStage.width, 185);
                    }
                } else if (levelManager.stage === 3 && window.stage3 && window.stage3.state !== 'BOSS') {
                    window.stage3.state = 'BOSS';
                    window.stage3.terrain.wallActive = false;
                    if (typeof Sound !== 'undefined') Sound.playBossBgm();
                    if (typeof BigCoreBoss !== 'undefined') {
                        window.stage3.boss = new BigCoreBoss(window.stage3.width + 130, window.stage3.height / 2);
                    }
                } else if (levelManager.stage === 4 && window.stage4 && window.stage4.state !== 'BOSS') {
                    window.stage4.state = 'BOSS';
                    window.stage4.terrain.wallActive = false;
                    window.stage4.terrain.floatingIslands = [];
                    if (typeof Sound !== 'undefined') Sound.playBossBgm();
                    if (typeof Stage4Boss !== 'undefined') {
                        window.stage4.boss = new Stage4Boss(window.stage4.width, window.stage4.height / 2);
                    }
                }
            }
        }
    }

    // 指定のパワーアップスロットが選択（発動）可能かどうかを判定
    canActivatePowerUp(index) {
        switch (index) {
            case 0: // SPEED (スピードアップは何回でも選択可能)
                return this.speed < 8;
            case 1: // MISSILE (すでにミサイルを所持している場合は選択不可)
                return !this.hasMissile;
            case 2: // DOUBLE (現在ダブル装備中は選択不可、レーザー装備中または初期状態時は選択可能)
                return this.weaponType !== 'DOUBLE';
            case 3: // LASER (現在レーザー装備中は選択不可、ダブル装備中または初期状態時は選択可能)
                return this.weaponType !== 'LASER';
            case 4: // OPTION (上限4個に達したら選べない)
                return this.options.length < this.maxOptions;
            case 5: // ? (SHIELD: シールド展開中は選べない)
                return !this.shieldActive;
            default:
                return false;
        }
    }

    advancePowerUp() {
        this.powerUpIndex++;
        if (this.powerUpIndex > 5) {
            this.powerUpIndex = 0;
        }
    }

    activatePowerUp() {
        if (this.powerUpIndex === -1) return;

        // 装備中の武器や上限到達済みのパワーアップは選択不可（ゲージは保持）
        if (!this.canActivatePowerUp(this.powerUpIndex)) {
            return;
        }

        switch (this.powerUpIndex) {
            case 0: // SPEED
                if (this.speed < 8.5) this.speed += 1.2; // Speed up
                break;
            case 1: // MISSILE
                this.hasMissile = true;
                break;
            case 2: // DOUBLE
                this.weaponType = 'DOUBLE';
                break;
            case 3: // LASER
                this.weaponType = 'LASER';
                break;
            case 4: // OPTION
                if (this.options.length < this.maxOptions) {
                    // 追加するオプションごとに遅延を増やす (例: 15フレームごと)
                    const delay = (this.options.length + 1) * 15;
                    this.options.push(new Option(this, delay));
                }
                break;
            case 5: // ? (SHIELD)
                this.shieldActive = true;
                this.shieldHp = this.maxShieldHp;
                break;
        }
        
        // 発動成功時のみゲージをリセットして効果音を鳴らす
        this.powerUpIndex = -1;
        if (typeof Sound !== 'undefined') Sound.playPowerUp();
    }

    fireBulletFromOrigin(originOwner, originX, originY, offsetY, shotId = null) {
        if (typeof addPlayerBullet === 'function') {
            if (this.weaponType === 'LASER') {
                const laser = new Laser(originOwner, offsetY, originX, 22, '#f89818', shotId);
                addPlayerBullet(laser);
            } else if (this.weaponType === 'DOUBLE') {
                const b1 = new Bullet(originX, originY, 11, 0);
                const b2 = new Bullet(originX, originY - 5, 8.5, -8.5); // 1985年AC版準拠の前方＋斜め上45度ショット
                b1.isDouble = true;
                b2.isDouble = true;
                addPlayerBullet(b1);
                addPlayerBullet(b2);
            } else {
                addPlayerBullet(new Bullet(originX, originY, 11, 0));
            }

            // ミサイル発射 (メインショットとは独立して発射される)
            if (this.hasMissile) {
                // 機体の下部から斜め下へ発射
                addPlayerBullet(new Missile(originX - 16, originY + 8));
            }
        }
    }

    shoot() {
        // レーザー装備時：長いレーザーが出切るまでは次のショットが出来ない設定（小刻みな連射を防止）
        if (this.weaponType === 'LASER') {
            if (typeof playerBullets !== 'undefined') {
                const hasActiveLaser = playerBullets.some(b => b instanceof Laser && b.active && b.owner === this);
                if (hasActiveLaser) {
                    return false;
                }
            }
        }

        let currentShotId = null;
        if (this.weaponType === 'LASER' && typeof Laser !== 'undefined') {
            Laser._seq = (Laser._seq || 0) + 1;
            currentShotId = Laser._seq;
        }

        // 効果音の再生（自機の発射時に1回だけ鳴らす）
        if (typeof Sound !== 'undefined') {
            if (this.weaponType === 'LASER') {
                Sound.playLaser();
            } else {
                Sound.playShot();
            }
            if (this.hasMissile) {
                Sound.playMissile();
            }
        }

        // 自機から発射
        const bulletX = this.x + this.width;
        const offsetY = this.height / 2 - 2;
        const bulletY = this.y + offsetY;
        this.fireBulletFromOrigin(this, bulletX, bulletY, offsetY, currentShotId);

        // オプションから発射
        this.options.forEach(opt => {
            const optBulletX = opt.x + opt.width;
            const optOffsetY = opt.height / 2 - 2;
            const optBulletY = opt.y + optOffsetY;
            this.fireBulletFromOrigin(opt, optBulletX, optBulletY, optOffsetY, currentShotId);
        });

        return true;
    }

    draw(ctx) {
        // オプションを描画
        this.options.forEach(opt => opt.draw(ctx));

        ctx.save();
        if (this.hitFlashTimer > 0) {
            ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
            if (this.hitFlashTimer % 2 === 0) {
                ctx.filter = 'brightness(2.5) saturate(2.5) hue-rotate(-30deg)';
            }
        }

        // ============================================================
        // 1985年アーケード版 ビックバイパー (grad0017.png から抽出した 32x14 ドット行列を 1dot=3px で描画)
        // ============================================================
        const vv = getVicViperCanvas();
        ctx.imageSmoothingEnabled = false;
        const px = Math.round(this.x + this.width / 2 - vv.width / 2);
        const py = Math.round(this.y + this.height / 2 - vv.height / 2);
        ctx.drawImage(vv, px, py);

        // 後方バーニア炎（実機同様の2フレーム点滅）
        const flicker = Math.floor(Date.now() / 50) % 2;
        ctx.fillStyle = flicker === 0 ? '#ECDE04' : '#FCA67C';
        ctx.fillRect(px - (flicker === 0 ? 6 : 3), py + 24, flicker === 0 ? 6 : 3, 3);

        // 被弾時のショックウェーブリング描画
        if (this.hitFlashTimer > 0) {
            ctx.strokeStyle = (this.hitFlashTimer % 2 === 0) ? '#ff2200' : '#ffea00';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 22 + (18 - this.hitFlashTimer) * 1.2, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();

        // ============================================================
        // 1985年アーケード版 シールド (grad0130.png 16x25 ドット行列完全再現)
        // ============================================================
        if (this.shieldActive) {
            if (!Player._shieldCanvasBlue || !Player._shieldCanvasRed) {
                const palBlue = {
                    '1':'#247EC4', '2':'#7CC2FC', '3':'#DCDEDC', '4':'#04028C', '5':'#04027C',
                    '6':'#A4DEFC', '7':'#A4A6A4', '8':'#CCEEFC', '9':'#145EA4', 'A':'#747274',
                    'C':'#FCFEFC', 'D':'#DCDECC', 'F':'#B4DEFC'
                };
                const palRed = {
                    '1':'#C42434', '2':'#FC7C8C', '3':'#DCDEDC', '4':'#8C0414', '5':'#7C040C',
                    '6':'#FCA4B4', '7':'#A4A6A4', '8':'#FCCECE', '9':'#A41424', 'A':'#747274',
                    'C':'#FCFEFC', 'D':'#DCCEDC', 'F':'#FCB4C4'
                };
                const rows = [
                    "..12.34516667.21",
                    "..12.34816667.21",
                    ".92..3.4416.7..2",
                    ".12.33A.54.A77.2",
                    ".2.....AAAA.....",
                    ".12222..AA..2222",
                    "..91112.AA.21119",
                    "......12..21....",
                    "CCCDEF.1221.FFFF",
                    "..92.221122.29..",
                    "...12...22...21.",
                    "...12.7....7.21.",
                    "...12.777777.21.",
                    "..12..7.44.A..21",
                    ".12..7.5416.A..2",
                    ".2.777441666AAA.",
                    ".2.A33461666AAA.",
                    ".12..3.4516.A..2",
                    "..12..3.44.A..21",
                    "...12.333333.21.",
                    "...12.3....3.21.",
                    "...12...22...21.",
                    "...92.221122.29.",
                    "....1219..9121.."
                ];
                const makeC = (pal) => {
                    const S = 3;
                    const c = document.createElement('canvas');
                    c.width = 16 * S;
                    c.height = rows.length * S;
                    const g = c.getContext('2d');
                    rows.forEach((r, y) => {
                        for (let x = 0; x < 16; x++) {
                            const col = pal[r[x]];
                            if (!col) continue;
                            g.fillStyle = col;
                            g.fillRect(x * S, y * S, S, S);
                        }
                    });
                    return c;
                };
                Player._shieldCanvasBlue = makeC(palBlue);
                Player._shieldCanvasRed = makeC(palRed);
            }
            ctx.save();
            ctx.imageSmoothingEnabled = false;
            const isLow = this.shieldHp <= 4;
            const spr = isLow ? Player._shieldCanvasRed : Player._shieldCanvasBlue;
            const shieldX = Math.round(this.x + this.width + 4);
            const shieldY = Math.round(this.y + this.height / 2 - spr.height / 2);
            ctx.drawImage(spr, shieldX, shieldY);
            ctx.restore();
        }
    }
}
