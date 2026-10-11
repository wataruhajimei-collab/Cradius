// ==========================================
// CRADIUS STAGE 2: STONEHENGE STAGE (ストーンヘンジ面)
// 1985年アーケード版『グラディウス』完全再現！
// 1. 開幕・宇宙空中戦（編隊とカプセル補給）
// 2. 赤茶色の丸い細胞状の掘削石ブロック群＆古代巨石柱
// 3. 砲台・ダッカー・敵を生み出すハッチ基地
// 4. 四方からワープ強襲する伝説の「ザブ地帯（ザブラッシュ）」
// 5. 伝統の機械要塞「ビッグコア」とのボス決戦！
// ==========================================

class StoneBlock {
    constructor(x, y, width = 20, height = 20, isDestructible = true) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isDestructible = isDestructible;
        this.maxHp = isDestructible ? 1 : Infinity;
        this.hp = this.maxHp;
        this.active = true;
        this.flashTimer = 0;
        // 粒ごとの微細なランダムオフセットとサイズ変化（自然な粒状感）
        this.jx = ((Math.abs(Math.sin(x * 0.13 + y * 0.29))) - 0.5) * 2.2;
        this.jy = ((Math.abs(Math.cos(x * 0.19 + y * 0.11))) - 0.5) * 2.2;
        this.variant = Math.floor(Math.abs(Math.sin(x * 0.37 + y * 0.53)) * 3);
    }

    static _initSprites() {
        if (StoneBlock._spritesReady) return;
        StoneBlock._spritesReady = true;

        // 1. 壊れる石（小さい丸い粒のような石: 20x20）のプリレンダリングキャッシュ（3バリエーション）
        StoneBlock._pebbleCanvases = [];
        for (let v = 0; v < 3; v++) {
            const c = document.createElement('canvas');
            c.width = 24;
            c.height = 24;
            const g = c.getContext('2d');
            const cx = 12;
            const cy = 12;
            const r = 8.2 - (v * 0.4);

            // 小さな副粒（本家グラディウスの粒状感を演出する小コブ）
            const subAngle = v * 2.1 + 0.6;
            const sx = cx + Math.cos(subAngle) * 5.2;
            const sy = cy + Math.sin(subAngle) * 4.8;
            g.fillStyle = '#6e2518';
            g.beginPath();
            g.arc(sx, sy, 4.2, 0, Math.PI * 2);
            g.fill();
            g.strokeStyle = '#2b0b05';
            g.lineWidth = 1.2;
            g.stroke();

            // メインの丸い石粒（球体陰影グラデーション）
            const grad = g.createRadialGradient(cx - 2.5, cy - 2.5, 1.0, cx, cy, r);
            grad.addColorStop(0.0, '#ffb094'); // ハイライト
            grad.addColorStop(0.30, '#e2684e'); // 赤茶テラコッタ
            grad.addColorStop(0.70, '#a83823'); // 深い赤褐色
            grad.addColorStop(1.0, '#3d1109');  // 輪郭シャドウ

            g.fillStyle = grad;
            g.beginPath();
            g.arc(cx, cy, r, 0, Math.PI * 2);
            g.fill();

            g.strokeStyle = '#290a05';
            g.lineWidth = 1.3;
            g.stroke();

            // 粒の光沢ドット
            g.fillStyle = 'rgba(255, 235, 220, 0.85)';
            g.beginPath();
            g.arc(cx - 2.6, cy - 2.6, 1.8, 0, Math.PI * 2);
            g.fill();

            StoneBlock._pebbleCanvases.push(c);
        }

        // 2. 壊れない岩（本家グラディウス風の「薄くて丸みを帯びた平石スラブ」: 幅46 x 厚さ19）のキャッシュ
        const slabC = document.createElement('canvas');
        slabC.width = 48;
        slabC.height = 22;
        const sg = slabC.getContext('2d');
        const sw = 44;
        const sh = 17;
        const sx0 = 2;
        const sy0 = 2.5;
        const sr = sh / 2; // 両端が完全に丸みを帯びたカプセル・平石形状

        sg.beginPath();
        sg.arc(sx0 + sr, sy0 + sr, sr, Math.PI * 0.5, Math.PI * 1.5);
        sg.lineTo(sx0 + sw - sr, sy0);
        sg.arc(sx0 + sw - sr, sy0 + sr, sr, Math.PI * 1.5, Math.PI * 0.5);
        sg.lineTo(sx0 + sr, sy0 + sh);
        sg.closePath();

        // 立体的な薄石グラデーション（上端ハイライト〜スレートグレー〜下端の深い影）
        const sGrad = sg.createLinearGradient(0, sy0, 0, sy0 + sh);
        sGrad.addColorStop(0.0, '#cbd5e1');
        sGrad.addColorStop(0.22, '#94a3b8');
        sGrad.addColorStop(0.55, '#64748b');
        sGrad.addColorStop(0.85, '#334155');
        sGrad.addColorStop(1.0, '#0f172a');
        sg.fillStyle = sGrad;
        sg.fill();

        sg.strokeStyle = '#090d16';
        sg.lineWidth = 1.6;
        sg.stroke();

        // 丸みを帯びた上縁の石肌ハイライト曲線
        sg.strokeStyle = 'rgba(248, 250, 252, 0.55)';
        sg.lineWidth = 1.3;
        sg.beginPath();
        sg.moveTo(sx0 + sr, sy0 + 2.2);
        sg.lineTo(sx0 + sw - sr, sy0 + 2.2);
        sg.stroke();

        // 石スラブ表面の横方向の層・くぼみディテール
        sg.strokeStyle = 'rgba(15, 23, 42, 0.45)';
        sg.lineWidth = 1.1;
        sg.beginPath();
        sg.moveTo(sx0 + sr + 3, sy0 + sh * 0.58);
        sg.lineTo(sx0 + sw - sr - 4, sy0 + sh * 0.58);
        sg.stroke();

        StoneBlock._slabCanvas = slabC;
    }

    update(scrollSpeed) {
        this.x -= scrollSpeed;
        if (this.flashTimer > 0) this.flashTimer--;
        if (this.x + this.width < -80) {
            this.active = false;
        }
    }

    hit(damage = 1) {
        if (!this.isDestructible) {
            return false;
        }

        this.hp -= damage;
        this.flashTimer = 4;

        if (this.hp <= 0) {
            this.active = false;
            // 小さい石粒が砕け散るエフェクト
            if (typeof Particle !== 'undefined' && typeof particles !== 'undefined') {
                for (let i = 0; i < 4; i++) {
                    const color = (Math.random() < 0.5) ? '#e06b58' : '#943828';
                    particles.push(new Particle(
                        this.x + this.width / 2 + (Math.random() - 0.5) * 10,
                        this.y + this.height / 2 + (Math.random() - 0.5) * 10,
                        color
                    ));
                }
            }
            if (typeof Sound !== 'undefined' && typeof Sound.playExplosion === 'function') {
                Sound.playExplosion();
            }
            if (typeof addScore === 'function') {
                addScore(100, this.x + this.width / 2, this.y, '#ffcc66');
            }
            return true;
        }
        return false;
    }

    draw(ctx) {
        if (!this.active) return;
        StoneBlock._initSprites();

        if (this.isDestructible) {
            // --- 壊れる石: 小さい丸い粒のような石 ---
            const sprite = StoneBlock._pebbleCanvases[this.variant];
            ctx.drawImage(sprite, this.x - 2 + this.jx, this.y - 2 + this.jy);
        } else {
            // --- 壊れない岩: 本家グラディウス風の薄くて丸みを帯びた平石（2段積層または単層） ---
            const slab = StoneBlock._slabCanvas;
            if (this.height >= 36) {
                // 40px高の枠内に薄い丸石スラブを2段重ねて描画（少しずつ互い違いにして自然な巨石積みに）
                const offsetTop = ((Math.floor(this.y / 40) % 2) === 0) ? -2 : 1;
                ctx.drawImage(slab, this.x - 4 + offsetTop, this.y - 1);
                ctx.drawImage(slab, this.x - 4 - offsetTop, this.y + 19);
            } else {
                ctx.drawImage(slab, this.x - 4, this.y - 1);
            }
        }
    }
}

// ==========================================
// StonehengeStage クラス（2面全体統括）
// ==========================================
class StonehengeStage {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.scrollSpeed = 1.6;

        this.blocks = [];
        this.distance = 0;
        this.columnWidth = 40;
        this.active = false;
        this.stageTime = 0;

        // ステートマシン:
        // OPENING（空中戦・カプセル補給）
        // -> STONEHENGE（石掘削・砲台・ハッチ・ダッカー）
        // -> ZAB_RUSH（四方からの真のザブ地帯）
        // -> PRE_BOSS（ボス前警報）
        // -> BOSS（ビッグコア決戦）
        // -> STAGE_CLEAR
        this.state = 'OPENING';
        this.generating = false;
        this.boss = null;
        this.stageClearTimer = 0;
        this.totalColumnsGenerated = 0;

        // 空中敵スポーンタイマー
        this.flyingEnemyTimer = 0;
        this.zabTimer = 0;
        this.zabWaveTimer = 0;
        this.preBossTimer = 0;

        // 星空（背景用：深淵の宇宙）
        this.stars = [];
        for (let i = 0; i < 90; i++) {
            this.stars.push({
                x: Math.random() * canvasWidth,
                y: Math.random() * canvasHeight,
                speed: Math.random() * 2.2 + 0.6,
                size: Math.random() * 2.0 + 0.6,
                brightness: Math.random() * 0.7 + 0.3
            });
        }
    }

    start() {
        this.active = true;
        this.blocks = [];
        this.distance = 0;
        this.stageTime = 0;
        this.state = 'OPENING'; // 原作通りまずは宇宙空中戦から！
        this.generating = false;
        this.boss = null;
        this.stageClearTimer = 0;
        this.flyingEnemyTimer = 0;
        this.totalColumnsGenerated = 0;
        this.zabTimer = 0;
        this.zabWaveTimer = 0;
        this.preBossTimer = 0;
        this.spawnColumnX = this.width + 40;
    }

    update(dt) {
        if (!this.active) return;
        this.stageTime += dt;
        this.distance += this.scrollSpeed;

        // 1. 星空のスクロール（常時稼働）
        this.stars.forEach(s => {
            s.x -= s.speed;
            if (s.x < 0) {
                s.x = this.width;
                s.y = Math.random() * this.height;
            }
        });

        // 2. 石ブロックの移動と画面外削除
        this.blocks.forEach(b => b.update(this.scrollSpeed));
        this.blocks = this.blocks.filter(b => b.active);

        // ==========================================
        // ステート別進行管理
        // ==========================================
        if (this.state === 'OPENING') {
            // --- フェーズ1: 開幕・宇宙空中戦（0〜12秒） ---
            this.updateOpeningAirEnemies(dt);

            // 12秒経過でストーンヘンジ巨石地帯へ突入！
            if (this.stageTime >= 12000) {
                this.state = 'STONEHENGE';
                this.generating = true;
                this.spawnColumnX = this.width + 20;
            }

        } else if (this.state === 'STONEHENGE') {
            // --- フェーズ2: ストーンヘンジ石掘削地帯（12秒〜55秒） ---
            // 52秒経過で石地帯の生成を終了（約40秒間の掘削体験）
            if (this.stageTime >= 52000 && this.generating) {
                this.generating = false;
            }

            if (this.generating) {
                this.spawnColumnX -= this.scrollSpeed;
                while (this.spawnColumnX < this.width + 80) {
                    this.generateColumn(this.spawnColumnX);
                    this.spawnColumnX += this.columnWidth;
                }
            }

            // 空中敵の編隊飛行（カプセル供給＆スリル）
            this.updateStonehengeEnemies(dt);

            // 石ブロックが完全に画面左へ抜けたら「ザブ地帯」へ突入！
            if (this.stageTime >= 56000 && this.blocks.length < 5) {
                this.state = 'ZAB_RUSH';
                this.blocks = [];
                this.zabTimer = 0;
                this.zabWaveTimer = 900;
            }

        } else if (this.state === 'ZAB_RUSH') {
            // --- フェーズ3: 名物「ザブ地帯」（約20秒間） ---
            this.zabTimer += dt;
            this.zabWaveTimer += dt;

            // 約1.0秒ごとに画面の外からではなく、画面内のどこからでもザブ小隊がワープアウト強襲！
            if (this.zabWaveTimer >= 1000) {
                this.zabWaveTimer = 0;
                if (typeof ZabSquad !== 'undefined') {
                    new ZabSquad('ANYWHERE', null, 3);
                }
            }

            // 約20秒間の猛烈なザブラッシュを耐え抜いたらボス前へ移行！
            if (this.zabTimer >= 20000) {
                this.state = 'PRE_BOSS';
                this.preBossTimer = 0;
                if (typeof Sound !== 'undefined' && typeof Sound.playBossBgm === 'function') {
                    Sound.playBossBgm();
                }
            }

        } else if (this.state === 'PRE_BOSS') {
            // --- フェーズ4: ボス前静寂＆警告（約3.5秒） ---
            this.preBossTimer += dt;
            if (this.preBossTimer >= 3500) {
                this.state = 'BOSS';
                this._spawnBoss();
            }

        } else if (this.state === 'BOSS') {
            // --- フェーズ5: ボス戦 ---
            if (this.boss) {
                this.boss.update();
                if (!this.boss.active) {
                    this.state = 'STAGE_CLEAR';
                    this.stageClearTimer = 0;
                    setTimeout(() => {
                        if (this.active && typeof Sound !== 'undefined' && typeof Sound.playStageBgm === 'function') {
                            Sound.playStageBgm();
                        }
                    }, 650);
                }
            }

        } else if (this.state === 'STAGE_CLEAR' || this.state === 'ALL_CLEAR') {
            // --- フェーズ6: ステージクリア＆3面遷移 ---
            this.stageClearTimer += dt;
            // 自機を右端に押し付けず、現在の位置・操作を維持
            if (this.stageClearTimer > 3500) {
                this.active = false;
                if (typeof levelManager !== 'undefined' && typeof levelManager.startStage3 === 'function') {
                    levelManager.startStage3();
                }
            }
        }
    }

    _spawnBoss() {
        const bossClass = (typeof GolemBoss !== 'undefined') ? GolemBoss :
                          (typeof window.GolemBoss !== 'undefined') ? window.GolemBoss :
                          (typeof BigCoreBoss !== 'undefined') ? BigCoreBoss :
                          (typeof Boss !== 'undefined') ? Boss : null;
        if (bossClass) {
            this.boss = new bossClass(this.width, this.height / 2);
        }
    }

    // 開幕・宇宙空中戦（ファン／ガルン編隊によるカプセル補給）
    updateOpeningAirEnemies(dt) {
        this.flyingEnemyTimer += dt;
        if (this.flyingEnemyTimer < 1400) return;
        this.flyingEnemyTimer = 0;

        const startY = 140 + Math.random() * (this.height - 280);
        if (Math.random() < 0.6) {
            if (typeof Formation !== 'undefined') {
                new Formation(startY, 4); // 赤編隊（全滅でカプセル！）
            }
        } else {
            if (typeof GarunFormation !== 'undefined') {
                new GarunFormation(startY, Math.random() < 0.5, 4);
            }
        }
    }

    // ストーンヘンジ道中の空中編隊
    updateStonehengeEnemies(dt) {
        this.flyingEnemyTimer += dt;
        if (this.flyingEnemyTimer < 1600) return;
        this.flyingEnemyTimer = 0;

        const startY = 160 + Math.random() * (this.height - 320);
        if (Math.random() < 0.55) {
            if (typeof Formation !== 'undefined') {
                new Formation(startY, 4);
            }
        } else {
            if (typeof GarunFormation !== 'undefined') {
                new GarunFormation(startY, Math.random() < 0.5, 4);
            }
        }
    }

    // 小さい丸い石粒（20x20）を40x40セル内に2x2で配置するヘルパー
    _spawnPebbleCluster(colX, rowY) {
        const sub = 20;
        for (let dy = 0; dy < 40; dy += sub) {
            for (let dx = 0; dx < 40; dx += sub) {
                this.blocks.push(new StoneBlock(colX + dx, rowY + dy, sub, sub, true));
            }
        }
    }

    // =========================================================================
    // ストーンヘンジ面 レイアウト生成
    // 原作アーケード版準拠：小さい丸い粒の壊れる石＋薄くて丸みを帯びた壊れない平石
    // =========================================================================
    generateColumn(colX) {
        const totalRows = Math.floor(this.height / this.columnWidth); // 600 / 40 = 15行 (r = 0〜14)
        const colIndex = this.totalColumnsGenerated++;

        // 1. 最外郭境界: 天井（行0）と地面（行14）は薄くて丸みを帯びた平石スラブ
        this.blocks.push(new StoneBlock(colX, 0, this.columnWidth, 20, false));
        this.blocks.push(new StoneBlock(colX, this.height - 20, this.columnWidth, 20, false));

        // 2. 36列周期の古代遺跡迷路パターン
        const phase = colIndex % 36;
        let indestructibleRows = []; // 壊れない薄石スラブの行番号
        let enemySpawns = []; // { row, isCeil, type }

        // --- ゾーン1: 天井・床の巨石ピラー (phase: 1〜7) ---
        if (phase >= 1 && phase <= 3) {
            for (let r = 1; r <= 3; r++) indestructibleRows.push(r);
            if (phase === 2) {
                enemySpawns.push({ row: 4, isCeil: true, type: 'TURRET' }); // 柱の下端に下向き砲台
            }
        } else if (phase >= 5 && phase <= 7) {
            for (let r = 11; r <= 13; r++) indestructibleRows.push(r);
            if (phase === 6) {
                enemySpawns.push({ row: 10, isCeil: false, type: 'TURRET' }); // 台座の上端に上向き砲台
            }
        }

        // --- ゾーン2: 古代アーチゲート門 & 中央浮島 (phase: 8〜14) ---
        else if (phase === 9) {
            indestructibleRows.push(1, 2, 12, 13);
            enemySpawns.push({ row: 3, isCeil: true, type: 'DUCKER' });
            enemySpawns.push({ row: 11, isCeil: false, type: 'TURRET' });
        } else if (phase >= 11 && phase <= 13) {
            // 中央浮島モノリス (r: 6〜7)
            indestructibleRows.push(6, 7);
            if (phase === 11) {
                enemySpawns.push({ row: 5, isCeil: false, type: 'HATCHER' }); // ★浮島に敵基地ハッチ！
            } else if (phase === 13) {
                enemySpawns.push({ row: 8, isCeil: true, type: 'TURRET' });
            }
        }

        // --- ゾーン3: ピラミッド階段テラス (phase: 15〜22) ---
        else if (phase === 16) {
            indestructibleRows.push(13);
        } else if (phase === 17) {
            indestructibleRows.push(12, 13);
        } else if (phase === 18) {
            indestructibleRows.push(11, 12, 13);
            enemySpawns.push({ row: 10, isCeil: false, type: 'TURRET' });
        } else if (phase === 20) {
            indestructibleRows.push(1, 2);
            enemySpawns.push({ row: 3, isCeil: true, type: 'DUCKER' });
        } else if (phase === 21) {
            indestructibleRows.push(1, 2, 3);
            enemySpawns.push({ row: 4, isCeil: true, type: 'HATCHER' }); // ★天井ハッチ基地！
        }

        // --- ゾーン4: 回廊アイランド要塞 (phase: 23〜29) ---
        else if (phase >= 25 && phase <= 27) {
            indestructibleRows.push(6, 7);
            if (phase === 25) {
                enemySpawns.push({ row: 5, isCeil: false, type: 'TURRET' });
            } else if (phase === 27) {
                enemySpawns.push({ row: 8, isCeil: true, type: 'TURRET' });
            }
        }

        // --- ゾーン5: チェッカー障害物 (phase: 30〜35) ---
        else if (phase === 31) {
            indestructibleRows.push(2, 3, 11, 12);
            enemySpawns.push({ row: 4, isCeil: true, type: 'DUCKER' });
        } else if (phase === 33) {
            indestructibleRows.push(5, 6);
            enemySpawns.push({ row: 7, isCeil: false, type: 'TURRET' });
        } else if (phase === 35) {
            indestructibleRows.push(8, 9);
            enemySpawns.push({ row: 7, isCeil: false, type: 'HATCHER' }); // ★ハッチ基地！
        }

        // 3. 壊れない岩（薄くて丸みを帯びた平石スラブ）の配置
        indestructibleRows.forEach(r => {
            this.blocks.push(new StoneBlock(colX, r * this.columnWidth, this.columnWidth, this.columnWidth, false));
        });

        // 4. 巨石柱の上に敵（砲台・ダッカー・ハッチ）を配置
        if (typeof enemies !== 'undefined') {
            enemySpawns.forEach(sp => {
                const isRed = Math.random() < 0.45; // 45%で赤色＝カプセル確定ドロップ！
                const spawnX = colX + 1;
                const spawnY = sp.row * this.columnWidth;

                if (sp.type === 'HATCHER' && typeof HatcherEnemy !== 'undefined') {
                    enemies.push(new HatcherEnemy(spawnX, spawnY, sp.isCeil));
                } else if (sp.type === 'DUCKER' && typeof DuckerEnemy !== 'undefined') {
                    enemies.push(new DuckerEnemy(spawnX, spawnY, sp.isCeil, isRed));
                } else if (typeof TurretEnemy !== 'undefined') {
                    enemies.push(new TurretEnemy(spawnX, spawnY, sp.isCeil, isRed));
                }
            });
        }

        // 5. 破壊できる石（小さい丸い粒のような石）の充填
        const waveCenter = Math.round(7 + Math.sin(colIndex * 0.22) * 3.2); // r: 4〜10
        const isTunnelRow = (r) => (r >= waveCenter - 1 && r <= waveCenter + 1);

        for (let r = 1; r < totalRows - 1; r++) {
            if (indestructibleRows.includes(r)) continue;

            // トンネル部分は空間をあける
            if (isTunnelRow(r)) {
                if (Math.random() < 0.08) {
                    this._spawnPebbleCluster(colX, r * this.columnWidth);
                }
            } else {
                // トンネル外は小さい丸い石粒で密集充填！
                this._spawnPebbleCluster(colX, r * this.columnWidth);
            }
        }
    }

    // プレイヤーの弾と石ブロックの当たり判定（掘削処理）
    handleBulletCollisions(playerBullets) {
        if (!this.active) return;

        playerBullets.forEach(bullet => {
            if (!bullet.active) return;
            const isLaser = (typeof Laser !== 'undefined' && bullet instanceof Laser);
            const isMissile = (typeof Missile !== 'undefined' && bullet instanceof Missile);
            let laserHits = 0;

            for (let i = 0; i < this.blocks.length; i++) {
                const b = this.blocks[i];
                if (!b.active) continue;

                // 小さい石粒を掘りやすいよう上下判定を少し広げる
                const padY = b.isDestructible ? 3 : 0;
                if (
                    bullet.x < b.x + b.width &&
                    bullet.x + bullet.width > b.x &&
                    bullet.y < b.y + b.height + padY &&
                    bullet.y + bullet.height > b.y - padY
                ) {
                    if (isLaser) {
                        // レーザーは壊れない岩で消滅せず、壊れる石粒を次々と貫通掘削
                        if (b.isDestructible) {
                            b.hit(2);
                            laserHits++;
                            if (laserHits >= 4) break;
                        }
                    } else if (isMissile) {
                        bullet.active = false;
                        b.hit(2);
                        break;
                    } else {
                        bullet.active = false;
                        b.hit(1);
                        break;
                    }
                }
            }
        });
    }

    // 自機や敵弾との矩形衝突判定（挟まれ・激突死）
    checkCollision(rect) {
        if (!this.active) return false;

        for (let i = 0; i < this.blocks.length; i++) {
            const b = this.blocks[i];
            if (!b.active) continue;

            if (
                rect.x < b.x + b.width &&
                rect.x + rect.width > b.x &&
                rect.y < b.y + b.height &&
                rect.y + rect.height > b.y
            ) {
                return true;
            }
        }
        return false;
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();

        // 1. 深淵の宇宙背景（アーケード版準拠の濃紺〜ブラック）
        const spaceGrad = ctx.createLinearGradient(0, 0, 0, this.height);
        spaceGrad.addColorStop(0.0, '#030514');
        spaceGrad.addColorStop(0.5, '#070c24');
        spaceGrad.addColorStop(1.0, '#02030d');
        ctx.fillStyle = spaceGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        // 2. 星々
        this.stars.forEach(s => {
            ctx.globalAlpha = s.brightness;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(s.x, s.y, s.size, s.size);
        });
        ctx.globalAlpha = 1.0;

        // 3. 全ての石ブロックの描画
        this.blocks.forEach(b => b.draw(ctx));

        // 4. ボスの描画（ビッグコア）
        if (this.state === 'BOSS' && this.boss) {
            this.boss.draw(ctx);
        }

        // 5. ステージ開幕インジケーター（開始から約3.5秒間）
        if (this.state === 'OPENING' && this.stageTime < 3800) {
            const alpha = Math.min(1, Math.sin((this.stageTime / 3800) * Math.PI));
            ctx.save();
            ctx.textAlign = 'center';
            ctx.font = 'bold 36px "Courier New", monospace';
            ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`;
            ctx.shadowColor = '#0088ff';
            ctx.shadowBlur = 14;
            ctx.fillText('STAGE 2 : STONEHENGE', this.width / 2, this.height / 2 - 40);
            ctx.font = 'bold 18px "Courier New", monospace';
            ctx.fillStyle = `rgba(255, 230, 150, ${alpha})`;
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur = 8;
            ctx.fillText('EXCAVATE THE ANCIENT RUINS!', this.width / 2, this.height / 2 + 10);
            ctx.restore();
        }

        // 6. 巨石地帯突入警告（10〜12秒）
        if (this.state === 'OPENING' && this.stageTime >= 10000 && this.stageTime < 12000) {
            const pulse = (Math.floor(Date.now() / 200) % 2 === 0);
            if (pulse) {
                ctx.save();
                ctx.textAlign = 'center';
                ctx.font = 'bold 22px "Courier New", monospace';
                ctx.fillStyle = '#ffaa00';
                ctx.shadowColor = '#ff6600';
                ctx.shadowBlur = 12;
                ctx.fillText('WARNING : STONEHENGE APPROACHING!', this.width / 2, 50);
                ctx.restore();
            }
        }

        // 7. ザブ地帯突入インジケーター（開始から約3.5秒間）
        if (this.state === 'ZAB_RUSH' && this.zabTimer < 3500) {
            const alpha = Math.min(1, Math.sin((this.zabTimer / 3500) * Math.PI));
            ctx.save();
            ctx.textAlign = 'center';
            ctx.font = 'bold 32px "Courier New", monospace';
            ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`;
            ctx.shadowColor = '#0088ff';
            ctx.shadowBlur = 16;
            ctx.fillText('WARNING : ZAB ATTACK DETECTED!', this.width / 2, this.height / 2 - 40);
            ctx.font = 'bold 18px "Courier New", monospace';
            ctx.fillStyle = `rgba(255, 200, 100, ${alpha})`;
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur = 8;
            ctx.fillText('HOLD OFF THE WARPING SWARM!', this.width / 2, this.height / 2 + 10);
            ctx.restore();
        }

        // 8. ボス前警告演出
        if (this.state === 'PRE_BOSS') {
            const pulse = (Math.floor(Date.now() / 180) % 2 === 0);
            if (pulse) {
                ctx.save();
                ctx.textAlign = 'center';
                ctx.font = 'bold 26px "Courier New", monospace';
                ctx.fillStyle = '#ff3300';
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 16;
                ctx.fillText('WARNING : ANCIENT MECHA-GOLEM APPROACHING!', this.width / 2, this.height / 2 - 30);
                ctx.font = 'bold 17px "Courier New", monospace';
                ctx.fillStyle = '#ffcc00';
                ctx.fillText('DESTROY STONE TABLETS & TWIN RUNE CORES! BEWARE OF MECHA TENTACLES!', this.width / 2, this.height / 2 + 15);
                ctx.restore();
            }
        }

        // 9. ステージクリア演出
        if (this.state === 'STAGE_CLEAR' || this.state === 'ALL_CLEAR') {
            ctx.save();
            ctx.textAlign = 'center';

            ctx.font = 'bold 44px "Courier New", monospace';
            ctx.fillStyle = '#ffea00';
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 18;
            ctx.fillText('STAGE 2 CLEAR', this.width / 2, this.height / 2 - 40);

            ctx.font = 'bold 20px "Courier New", monospace';
            ctx.fillStyle = '#00ffff';
            ctx.shadowColor = '#0088ff';
            ctx.shadowBlur = 10;
            ctx.fillText('ANCIENT RUINS PURIFIED - WARPING TO STAGE 3', this.width / 2, this.height / 2 + 10);

            ctx.restore();
        }

        ctx.restore();
    }
}

// グローバル公開
window.StoneBlock = StoneBlock;
window.StonehengeStage = StonehengeStage;
let stonehengeStage = null;
window.stonehengeStage = stonehengeStage;
