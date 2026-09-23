class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 20;
        this.speed = 2; // 初期スピード（4から半分に調整）
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
        this.maxShieldHp = 3;

        this.hasMissile = false; // ミサイルを持っているか
    }

    update(canvasWidth, canvasHeight) {
        // 入力による移動処理
        if (Input.isDown('ArrowUp')) {
            this.y -= this.speed;
        }
        if (Input.isDown('ArrowDown')) {
            this.y += this.speed;
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
            this.history.unshift({ x: this.x, y: this.y });
            if (this.history.length > this.historyMax) {
                this.history.pop();
            }
        }

        // オプションの更新
        this.options.forEach(option => option.update());

        // ショット（Zキー）
        if (Input.isDown('KeyZ')) {
            const now = Date.now();
            // レーザー時は画面内のレーザーが出切るまで待機し、出切った瞬間に次弾発射可能（判定間隔50ms）
            // 通常弾/DOUBLEは標準の shotDelay (200ms)
            const currentDelay = this.weaponType === 'LASER' ? 50 : this.shotDelay;
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

        // テスト用ショートカット: 2キーで即座にステージ2（ストーンヘンジ面）へワープ
        if (Input.isDown('Digit2')) {
            if (typeof levelManager !== 'undefined' && levelManager.stage === 1) {
                levelManager.startStage2();
            }
        }

        // テスト用ショートカット: Vキーで即座に火山大噴火ゾーン（65.5秒）へワープ
        if (Input.isDown('KeyV')) {
            if (typeof levelManager !== 'undefined' && levelManager.stage === 1) {
                levelManager.time = 65500;
                if (!levelManager.terrain.active) levelManager.terrain.start();
            }
        }

        // テスト用ショートカット: Bキーで即座にボス戦へワープ（1面: ビッグコア / 2面: ゴーレムコア）
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
                if (this.speed < 8) this.speed += 1; // スピードアップ率を2から1（半分）に調整
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

    fireBulletFromOrigin(originOwner, originX, originY, offsetY) {
        if (typeof addPlayerBullet === 'function') {
            if (this.weaponType === 'LASER') {
                const laser = new Laser(originOwner, offsetY, originX, 20, '#00ffff');
                addPlayerBullet(laser);
            } else if (this.weaponType === 'DOUBLE') {
                const b1 = new Bullet(originX, originY, 10, 0);
                const b2 = new Bullet(originX, originY - 5, 9.5, -4.0); // 前方にしっかり伸びてボスや上下の標的を捉える最適弾道
                b1.isDouble = true;
                b2.isDouble = true;
                addPlayerBullet(b1);
                addPlayerBullet(b2);
            } else {
                addPlayerBullet(new Bullet(originX, originY, 10, 0));
            }

            // ミサイル発射 (メインショットとは独立して発射される)
            if (this.hasMissile) {
                // 機体の下部から斜め下へ発射
                addPlayerBullet(new Missile(originX - 10, originY + 10));
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
        this.fireBulletFromOrigin(this, bulletX, bulletY, offsetY);

        // オプションから発射
        this.options.forEach(opt => {
            const optBulletX = opt.x + opt.width;
            const optOffsetY = opt.height / 2 - 2;
            const optBulletY = opt.y + optOffsetY;
            this.fireBulletFromOrigin(opt, optBulletX, optBulletY, optOffsetY);
        });

        return true;
    }

    draw(ctx) {
        // オプションを描画
        this.options.forEach(opt => opt.draw(ctx));

        ctx.save();
        if (typeof images !== 'undefined' && images.player && images.player.complete && images.player.naturalWidth > 0) {
            // 立体感を高めるシャドウ
            ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetX = -3;
            ctx.shadowOffsetY = 3;

            // 通常描画（ソリッド）
            ctx.drawImage(images.player, this.x - 8, this.y - 18, 56, 56);

            // シャドウ解除
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // 自機のエンジン噴射炎（上下2箇所または中央）
            const flameLen = 8 + (Math.sin(Date.now() * 0.02) * 3);
            ctx.fillStyle = '#ff9900';
            ctx.beginPath();
            ctx.moveTo(this.x - 2, this.y + 7);
            ctx.lineTo(this.x - 2 - flameLen, this.y + 9);
            ctx.lineTo(this.x - 2, this.y + 11);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#ffffaa';
            ctx.beginPath();
            ctx.moveTo(this.x - 2, this.y + 8);
            ctx.lineTo(this.x - 2 - flameLen * 0.6, this.y + 9);
            ctx.lineTo(this.x - 2, this.y + 10);
            ctx.closePath();
            ctx.fill();
        } else {
            // 仮の描画（機体を示す三角形または四角形）
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo(this.x + this.width, this.y + this.height / 2); // 先端
            ctx.lineTo(this.x, this.y); // 左上
            ctx.lineTo(this.x, this.y + this.height); // 左下
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(this.x + 10, this.y + 5, 10, 10);
        }
        ctx.restore();

        // シールドの描画
        if (this.shieldActive) {
            ctx.save();
            ctx.strokeStyle = `rgba(0, 255, 255, ${this.shieldHp / this.maxShieldHp})`;
            ctx.lineWidth = 3;
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(this.x + this.width + 10, this.y + this.height / 2, 25, -Math.PI / 3, Math.PI / 3);
            ctx.stroke();
            ctx.restore();
        }
    }
}
