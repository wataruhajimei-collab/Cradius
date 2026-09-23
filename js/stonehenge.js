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
    constructor(x, y, width = 40, height = 40, isDestructible = true) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isDestructible = isDestructible;
        this.maxHp = isDestructible ? 2 : Infinity;
        this.hp = this.maxHp;
        this.active = true;
        this.flashTimer = 0;
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
            // 破壊不能石柱: 火花が散る
            return false;
        }

        this.hp -= damage;
        this.flashTimer = 5;

        if (this.hp <= 0) {
            this.active = false;
            // アーケード版準拠：赤茶色の岩石破片が飛び散るエフェクト
            if (typeof Particle !== 'undefined' && typeof particles !== 'undefined') {
                for (let i = 0; i < 9; i++) {
                    const color = (Math.random() < 0.45) ? '#c24b38' : ((Math.random() < 0.5) ? '#e06b58' : '#7a2b1f');
                    particles.push(new Particle(
                        this.x + this.width / 2 + (Math.random() - 0.5) * 20,
                        this.y + this.height / 2 + (Math.random() - 0.5) * 20,
                        color
                    ));
                }
            }
            if (typeof Sound !== 'undefined' && typeof Sound.playExplosion === 'function') {
                Sound.playExplosion();
            }
            return true; // 破壊完了
        }
        return false;
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();

        const isFlashing = this.flashTimer > 0;

        if (this.isDestructible) {
            // --- アーケード版再現：赤茶色・丸みを帯びた細胞状の石ブロック ---
            const r = 6; // 丸みを持たせた角
            const bx = this.x + 1;
            const by = this.y + 1;
            const bw = this.width - 2;
            const bh = this.height - 2;

            ctx.beginPath();
            ctx.moveTo(bx + r, by);
            ctx.lineTo(bx + bw - r, by);
            ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
            ctx.lineTo(bx + bw, by + bh - r);
            ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
            ctx.lineTo(bx + r, by + bh);
            ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
            ctx.lineTo(bx, by + r);
            ctx.quadraticCurveTo(bx, by, bx + r, by);
            ctx.closePath();

            const grad = ctx.createRadialGradient(bx + bw * 0.35, by + bh * 0.35, 2, bx + bw * 0.5, by + bh * 0.5, bw * 0.65);
            if (isFlashing) {
                grad.addColorStop(0.0, '#ffffff');
                grad.addColorStop(0.5, '#ffbbbb');
                grad.addColorStop(1.0, '#ffffff');
            } else {
                const hpRatio = this.hp / this.maxHp;
                if (hpRatio > 0.5) {
                    grad.addColorStop(0.0, '#e06b58'); // 赤茶色ハイライト
                    grad.addColorStop(0.45, '#c24b38'); // テラコッタレッド
                    grad.addColorStop(0.85, '#943828');
                    grad.addColorStop(1.0, '#662418');  // 深い影
                } else {
                    grad.addColorStop(0.0, '#c75645'); // ひび割れ被弾色
                    grad.addColorStop(0.5, '#a63d2e');
                    grad.addColorStop(1.0, '#4a170f');
                }
            }
            ctx.fillStyle = grad;
            ctx.fill();

            // 外枠エッジ
            ctx.strokeStyle = isFlashing ? '#ffffff' : '#3d140e';
            ctx.lineWidth = 1.6;
            ctx.stroke();

            // 細胞状ストーンの立体ハイライトライン
            ctx.strokeStyle = 'rgba(255, 220, 200, 0.4)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(bx + bw * 0.38, by + bh * 0.35, bw * 0.22, Math.PI * 0.8, Math.PI * 1.8);
            ctx.stroke();

            // クラック（ひび割れ模様：耐久力減少時）
            if (this.hp <= 1) {
                ctx.strokeStyle = isFlashing ? '#ffffff' : 'rgba(30, 8, 4, 0.8)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(bx + 8, by + 12);
                ctx.lineTo(bx + 20, by + 24);
                ctx.lineTo(bx + 32, by + 18);
                ctx.moveTo(bx + 20, by + 24);
                ctx.lineTo(bx + 16, by + 34);
                ctx.stroke();
            }

        } else {
            // --- 破壊不能な古代巨石柱（スレートグレーのストーンヘンジモノリス） ---
            const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y + this.height);
            grad.addColorStop(0.0, '#64748b'); // スレートグレー
            grad.addColorStop(0.35, '#475569');
            grad.addColorStop(0.75, '#334155');
            grad.addColorStop(1.0, '#1e293b'); // 玄武岩
            ctx.fillStyle = grad;
            ctx.fillRect(this.x, this.y, this.width, this.height);

            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);

            // 切り石のエッジハイライト
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.x + 1, this.y + this.height - 1);
            ctx.lineTo(this.x + 1, this.y + 1);
            ctx.lineTo(this.x + this.width - 1, this.y + 1);
            ctx.stroke();

            // 古代の石柱刻印ライン
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(this.x + this.width / 2, this.y + 6);
            ctx.lineTo(this.x + this.width / 2, this.y + this.height - 6);
            ctx.stroke();
        }

        ctx.restore();
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
                this.zabWaveTimer = 0;
            }

        } else if (this.state === 'ZAB_RUSH') {
            // --- フェーズ3: 名物「ザブ地帯」（約20秒間） ---
            this.zabTimer += dt;
            this.zabWaveTimer += dt;

            // 約1.0秒ごとに四方（前・後・上・下）からザブ小隊がワープ強襲！
            if (this.zabWaveTimer >= 1050) {
                this.zabWaveTimer = 0;
                if (typeof ZabSquad !== 'undefined') {
                    const sides = ['FRONT', 'BACK', 'TOP', 'BOTTOM'];
                    // 自機の現在Yに合わせて上下や前後から挟み撃ち！
                    const side = sides[Math.floor(Math.random() * sides.length)];
                    const curPlayerY = (typeof player !== 'undefined') ? player.y : 300;
                    const safeY = Math.max(120, Math.min(this.height - 120, curPlayerY + (Math.random() - 0.5) * 120));
                    new ZabSquad(side, safeY, 3);
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
            // --- フェーズ5: ビッグコア戦 ---
            if (this.boss) {
                this.boss.update();
                if (!this.boss.active) {
                    this.state = 'STAGE_CLEAR';
                    this.stageClearTimer = 0;
                    if (typeof Sound !== 'undefined' && typeof Sound.playStageBgm === 'function') {
                        Sound.playStageBgm();
                    }
                }
            }

        } else if (this.state === 'STAGE_CLEAR' || this.state === 'ALL_CLEAR') {
            // --- フェーズ6: ステージクリア＆3面ワープ ---
            this.stageClearTimer += dt;
            if (typeof player !== 'undefined') {
                player.x += 4.2; // 自機が右へ疾走離脱
            }
            if (this.stageClearTimer > 3500) {
                this.active = false;
                if (typeof levelManager !== 'undefined' && typeof levelManager.startStage3 === 'function') {
                    levelManager.startStage3();
                }
            }
        }
    }

    _spawnBoss() {
        const bossClass = (typeof BigCoreBoss !== 'undefined') ? BigCoreBoss :
                          (typeof window.BigCoreBoss !== 'undefined') ? window.BigCoreBoss :
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

    // =========================================================================
    // ストーンヘンジ面 レイアウト生成
    // 原作アーケード版準拠：赤丸掘削ブロック＋巨石柱＋砲台＋ハッチ＋ダッカー
    // =========================================================================
    generateColumn(colX) {
        const totalRows = Math.floor(this.height / this.columnWidth); // 600 / 40 = 15行 (r = 0〜14)
        const colIndex = this.totalColumnsGenerated++;

        // 1. 最外郭境界: 天井（行0）と地面（行14）は古代巨石モノリス
        this.blocks.push(new StoneBlock(colX, 0, this.columnWidth, this.columnWidth, false));
        this.blocks.push(new StoneBlock(colX, (totalRows - 1) * this.columnWidth, this.columnWidth, this.columnWidth, false));

        // 2. 36列周期の古代遺跡迷路パターン
        const phase = colIndex % 36;
        let indestructibleRows = []; // 壊れない石柱の行番号
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

        // 3. 壊れない石（古代モノリスブロック）の配置
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

        // 5. 破壊できる石（赤丸掘削ブロック）の充填
        // 安全な開口トンネル（幅3ブロック）は緩やかなS字サイン波で必ず確保し、掘削の快感と回避を両立！
        const waveCenter = Math.round(7 + Math.sin(colIndex * 0.22) * 3.2); // r: 4〜10
        const isTunnelRow = (r) => (r >= waveCenter - 1 && r <= waveCenter + 1);

        for (let r = 1; r < totalRows - 1; r++) {
            if (indestructibleRows.includes(r)) continue;

            // トンネル部分は空間をあける
            if (isTunnelRow(r)) {
                // ごく稀に単独の掘削ブロックを配置してアクセント
                if (Math.random() < 0.08) {
                    this.blocks.push(new StoneBlock(colX, r * this.columnWidth, this.columnWidth, this.columnWidth, true));
                }
            } else {
                // トンネル外は赤丸掘削ブロックで密集充填！
                this.blocks.push(new StoneBlock(colX, r * this.columnWidth, this.columnWidth, this.columnWidth, true));
            }
        }
    }

    // プレイヤーの弾と石ブロックの当たり判定（掘削処理）
    handleBulletCollisions(playerBullets) {
        if (!this.active) return;

        playerBullets.forEach(bullet => {
            if (!bullet.active) return;

            for (let i = 0; i < this.blocks.length; i++) {
                const b = this.blocks[i];
                if (!b.active) continue;

                if (
                    bullet.x < b.x + b.width &&
                    bullet.x + bullet.width > b.x &&
                    bullet.y < b.y + b.height &&
                    bullet.y + bullet.height > b.y
                ) {
                    // レーザーは石を貫通しながら複数ブロックを一度に掘削！
                    if (typeof Laser !== 'undefined' && bullet instanceof Laser) {
                        b.hit(2);
                    } else if (typeof Missile !== 'undefined' && bullet instanceof Missile) {
                        bullet.active = false;
                        b.hit(2);
                    } else {
                        bullet.active = false;
                        b.hit(1);
                    }
                    if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') {
                        Sound.playBossHit();
                    }
                    break;
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
                ctx.font = 'bold 28px "Courier New", monospace';
                ctx.fillStyle = '#ff3300';
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur = 16;
                ctx.fillText('WARNING : BIG CORE APPROACHING!', this.width / 2, this.height / 2 - 30);
                ctx.font = 'bold 18px "Courier New", monospace';
                ctx.fillStyle = '#ffcc00';
                ctx.fillText('DESTROY 4 SHIELD BARRIERS TO EXPOSE REACTOR!', this.width / 2, this.height / 2 + 15);
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
