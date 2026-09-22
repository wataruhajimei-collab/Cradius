// ==========================================
// CRADIUS STAGE 2: STONEHENGE STAGE (ストーンヘンジ面)
// 破壊できる石（掘削ブロック）と破壊できない石（古代モノリス）
// 壊れない石の上に既存敵（砲台・ダッカー）と新キャラ（ルーンタレット）を配置！
// 飛ぶ敵（編隊・新キャラストーンアイ）がドンドン出現！
// 掘削しないとスクロールに挟まれて行き詰まるオリジナルグラディウスの完全再現！
// ==========================================

class StoneBlock {
    constructor(x, y, width = 40, height = 40, isDestructible = true) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isDestructible = isDestructible;
        this.maxHp = isDestructible ? 3 : Infinity;
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
            // 破壊不能石: 火花が散るだけ
            return false;
        }

        this.hp -= damage;
        this.flashTimer = 4;

        if (this.hp <= 0) {
            this.active = false;
            // 石が砕け散る迫力の破片エフェクト
            if (typeof particles !== 'undefined') {
                for (let i = 0; i < 8; i++) {
                    const color = Math.random() < 0.5 ? '#d4b483' : '#a08050';
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
            // --- 破壊できる石（砂岩・古代石英ブロック） ---
            const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y + this.height);
            if (isFlashing) {
                grad.addColorStop(0.0, '#ffffff');
                grad.addColorStop(0.5, '#ffeecc');
                grad.addColorStop(1.0, '#ffffff');
            } else {
                const hpRatio = this.hp / this.maxHp;
                if (hpRatio > 0.66) {
                    grad.addColorStop(0.0, '#e5c392'); // 明るい砂岩
                    grad.addColorStop(0.5, '#b8935f');
                    grad.addColorStop(1.0, '#7c5e37');
                } else if (hpRatio > 0.33) {
                    grad.addColorStop(0.0, '#c7a372'); // やや風化した砂岩
                    grad.addColorStop(0.5, '#9a7543');
                    grad.addColorStop(1.0, '#5e421d');
                } else {
                    grad.addColorStop(0.0, '#a88556'); // 激しくひび割れた砂岩
                    grad.addColorStop(0.5, '#7b582b');
                    grad.addColorStop(1.0, '#422c10');
                }
            }

            ctx.fillStyle = grad;
            ctx.fillRect(this.x, this.y, this.width, this.height);

            // ブロック外枠（切り石の陰影エッジ）
            ctx.strokeStyle = isFlashing ? '#ffffff' : '#3d2b14';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(this.x, this.y, this.width, this.height);

            // 切り石のハイライトライン
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(this.x + 1, this.y + this.height - 1);
            ctx.lineTo(this.x + 1, this.y + 1);
            ctx.lineTo(this.x + this.width - 1, this.y + 1);
            ctx.stroke();

            // クラック（ひび割れ模様: 耐久力に応じて増加）
            ctx.strokeStyle = isFlashing ? '#ffaa00' : 'rgba(40, 25, 10, 0.7)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(this.x + 8, this.y + 10);
            ctx.lineTo(this.x + 22, this.y + 24);
            ctx.lineTo(this.x + 32, this.y + 20);
            if (this.hp <= 2) {
                ctx.moveTo(this.x + 22, this.y + 24);
                ctx.lineTo(this.x + 16, this.y + 36);
            }
            if (this.hp <= 1) {
                ctx.moveTo(this.x + 4, this.y + 28);
                ctx.lineTo(this.x + 16, this.y + 36);
                ctx.lineTo(this.x + 36, this.y + 32);
            }
            ctx.stroke();
        } else {
            // --- 破壊できない石（巨大玄武岩モノリス・ストーンヘンジ巨石柱） ---
            const grad = ctx.createLinearGradient(this.x, this.y, this.x + this.width, this.y + this.height);
            grad.addColorStop(0.0, '#64748b'); // 重厚なスレートブルー
            grad.addColorStop(0.3, '#334155');
            grad.addColorStop(0.7, '#1e293b');
            grad.addColorStop(1.0, '#0f172a');
            ctx.fillStyle = grad;
            ctx.fillRect(this.x, this.y, this.width, this.height);

            ctx.strokeStyle = '#020617';
            ctx.lineWidth = 2;
            ctx.strokeRect(this.x, this.y, this.width, this.height);

            // 古代の神秘的なルーン紋様（シアン微発光）
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 8, 0, Math.PI * 2);
            ctx.moveTo(this.x + this.width / 2, this.y + 6);
            ctx.lineTo(this.x + this.width / 2, this.y + this.height - 6);
            ctx.stroke();
        }

        ctx.restore();
    }
}

class StonehengeStage {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.scrollSpeed = 1.5;
        this.blocks = [];
        this.distance = 0;
        this.spawnColumnX = canvasWidth + 40;
        this.columnWidth = 40;
        this.active = false;
        this.stageTime = 0;
        this.state = 'STAGE'; // STAGE -> BOSS -> ALL_CLEAR
        this.generating = true;
        this.boss = null;
        this.stageClearTimer = 0;
        
        // 飛ぶ敵のスポーンタイマー（1秒強の間隔でドンドン出す！）
        this.flyingEnemyTimer = 0;
        this.flyingEnemyInterval = 1100;
        
        // 遠景パララックス用ストーンヘンジ巨石シルエット
        this.bgMonoliths = [];
        for (let i = 0; i < 16; i++) {
            this.bgMonoliths.push({
                x: (canvasWidth / 14) * i,
                y: canvasHeight - (90 + Math.random() * 90),
                w: 32 + Math.random() * 28,
                h: 130 + Math.random() * 100,
                speed: 0.4
            });
        }
    }

    start() {
        this.active = true;
        this.blocks = [];
        this.distance = 0;
        this.stageTime = 0;
        this.state = 'STAGE';
        this.generating = true;
        this.boss = null;
        this.stageClearTimer = 0;
        this.flyingEnemyTimer = 0;

        // ステージ開幕直後から画面全域に石ブロック群がびっしり広がるよう先行生成！
        this.spawnColumnX = 240;
        while (this.spawnColumnX < this.width + 120) {
            this.generateColumn(this.spawnColumnX);
            this.spawnColumnX += this.columnWidth;
        }
    }

    update(dt) {
        if (!this.active) return;
        this.distance += this.scrollSpeed;

        // 1. 遠景シルエットのスクロール
        this.bgMonoliths.forEach(m => {
            m.x -= m.speed;
            if (m.x + m.w < 0) {
                m.x = this.width + Math.random() * 60;
            }
        });

        // 2. 石ブロックの移動と画面外削除
        this.blocks.forEach(b => b.update(this.scrollSpeed));
        this.blocks = this.blocks.filter(b => b.active);

        if (this.state === 'STAGE') {
            this.stageTime += dt;

            // 3. 新しい石ブロック列の生成（絶え間なく密集して出現！）
            if (this.generating) {
                while (this.spawnColumnX < this.width + 120) {
                    this.generateColumn(this.spawnColumnX);
                    this.spawnColumnX += this.columnWidth;
                }
            }

            // 4. 飛ぶ敵をドンドン出すシステム！
            this.updateFlyingEnemies(dt);

            // 約75秒経過で石地帯の生成を終了し、ボス戦への通路を開放
            if (this.stageTime > 75000 && this.generating) {
                this.generating = false;
            }

            // 石ブロックが画面左へ全て抜けたら2面ボス（古代守護神ゴーレムコア）が登場！
            if (this.stageTime > 82000 && this.blocks.length < 8) {
                this.state = 'BOSS';
                this.blocks = []; // 残存ブロックをクリア
                if (typeof Sound !== 'undefined') Sound.playBossBgm();
                if (typeof GolemBoss !== 'undefined') {
                    this.boss = new GolemBoss(this.width, 185);
                }
            }
        } else if (this.state === 'BOSS') {
            if (this.boss) {
                this.boss.update();
                if (!this.boss.active) {
                    this.state = 'ALL_CLEAR';
                    this.stageClearTimer = 0;
                    if (typeof Sound !== 'undefined') Sound.playStageBgm();
                }
            }
        } else if (this.state === 'ALL_CLEAR') {
            this.stageClearTimer += dt;
            if (typeof player !== 'undefined') {
                player.x += 3.8; // 自機が右へ疾走離脱
            }
        }
    }

    // 飛ぶ敵をドンドン出す処理（約1.0〜1.3秒ごとに波状攻撃）
    updateFlyingEnemies(dt) {
        if (typeof enemies === 'undefined') return;

        this.flyingEnemyTimer += dt;
        if (this.flyingEnemyTimer > this.flyingEnemyInterval) {
            this.flyingEnemyTimer = 0;
            this.flyingEnemyInterval = 1000 + Math.random() * 400; // 1.0〜1.4秒のハイテンポ！

            const spawnRoll = Math.random();

            if (spawnRoll < 0.40) {
                // パターンA: 新キャラ「古代ストーンアイ（StoneEyeEnemy）」がイオンリング弾を撃ちながら飛来！
                const spawnY = 120 + Math.random() * 360;
                if (typeof StoneEyeEnemy !== 'undefined') {
                    enemies.push(new StoneEyeEnemy(this.width + 50, spawnY));
                    if (Math.random() < 0.5) {
                        enemies.push(new StoneEyeEnemy(this.width + 100, spawnY + (Math.random() - 0.5) * 70));
                    }
                }
            } else if (spawnRoll < 0.75) {
                // パターンB: 5機編隊（FanEnemy）がサイン波で掘削トンネル内を急襲！
                const isRed = Math.random() < 0.35; // 35%でカプセル確定ドロップ赤編隊
                const startY = 140 + Math.random() * 320;
                const formation = (typeof EnemyFormation !== 'undefined') ? new EnemyFormation() : null;

                for (let i = 0; i < 5; i++) {
                    const delay = i * 140;
                    setTimeout(() => {
                        if (!this.active || typeof FanEnemy === 'undefined') return;
                        const fe = new FanEnemy(this.width + 40, startY, isRed);
                        if (formation) {
                            fe.formation = formation;
                            formation.enemies.push(fe);
                        }
                        enemies.push(fe);
                    }, delay);
                }
            } else {
                // パターンC: 単機または小隊の迎撃機
                const y1 = 100 + Math.random() * 400;
                if (typeof Enemy !== 'undefined') {
                    enemies.push(new Enemy(this.width + 40, y1));
                    enemies.push(new Enemy(this.width + 80, y1 + 30));
                }
            }
        }
    }

    // ストーンヘンジ面全体の石ブロック化レイアウト生成（絶え間なく続く石ブロック＆敵配置）
    generateColumn(colX) {
        const totalRows = Math.floor(this.height / this.columnWidth); // 600 / 40 = 15行
        const colIndex = Math.floor(colX / this.columnWidth);

        // 天井（行0）と地面（行14）は常に破壊不能の古代巨石
        this.blocks.push(new StoneBlock(colX, 0, this.columnWidth, this.columnWidth, false));
        this.blocks.push(new StoneBlock(colX, (totalRows - 1) * this.columnWidth, this.columnWidth, this.columnWidth, false));

        // 12列ごとの地形サイクル
        const phase = (colIndex % 12);

        // --- A. 壊れない石（古代モノリス柱・空中要塞足場） ---
        let hasIndestructible = false;
        let pillarRow = -1;

        if (phase === 2 || phase === 6 || phase === 10) {
            // 上または下から突き出す巨石柱
            const fromTop = (phase % 4 === 2);
            const pillarHeight = 4 + (colIndex % 3); // 4〜6ブロック分の柱

            for (let r = 1; r < totalRows - 1; r++) {
                if (fromTop && r <= pillarHeight) {
                    this.blocks.push(new StoneBlock(colX, r * this.columnWidth, this.columnWidth, this.columnWidth, false));
                    pillarRow = pillarHeight;
                    hasIndestructible = true;
                } else if (!fromTop && r >= totalRows - 1 - pillarHeight) {
                    this.blocks.push(new StoneBlock(colX, r * this.columnWidth, this.columnWidth, this.columnWidth, false));
                    if (pillarRow === -1) pillarRow = r;
                    hasIndestructible = true;
                }
            }
        } else if (phase === 4 || phase === 8) {
            // 中空に浮かぶ壊れない石の空中トーチカ
            const midR = 5 + (colIndex % 4);
            this.blocks.push(new StoneBlock(colX, midR * this.columnWidth, this.columnWidth, this.columnWidth, false));
            this.blocks.push(new StoneBlock(colX, (midR + 1) * this.columnWidth, this.columnWidth, this.columnWidth, false));
            pillarRow = midR;
            hasIndestructible = true;
        }

        // --- B. 壊れない石の上に敵を高密度配置！(古代ルーン砲台・通常砲台・ダッカー) ---
        if (hasIndestructible && typeof enemies !== 'undefined') {
            const enemyRoll = Math.random();
            const spawnX = colX + 2;

            if (pillarRow > 0 && pillarRow < totalRows - 1) {
                const isCeil = (pillarRow <= 6);
                const spawnY = isCeil ? (pillarRow + 1) * this.columnWidth : (pillarRow - 1) * this.columnWidth;

                if (enemyRoll < 0.45) {
                    // 新キャラ: 古代ルーン砲台 (RuneTurret)
                    if (typeof RuneTurret !== 'undefined') {
                        enemies.push(new RuneTurret(spawnX, spawnY, isCeil));
                    }
                } else if (enemyRoll < 0.75) {
                    // 既存敵: 砲台 (TurretEnemy)
                    if (typeof TurretEnemy !== 'undefined') {
                        enemies.push(new TurretEnemy(spawnX, spawnY, isCeil, Math.random() < 0.2));
                    }
                } else {
                    // 既存敵: 歩行ロボット・ダッカー (DuckerEnemy)
                    if (typeof DuckerEnemy !== 'undefined') {
                        enemies.push(new DuckerEnemy(spawnX, spawnY, isCeil, Math.random() < 0.2));
                    }
                }
            }
        }

        // --- C. 破壊できる石（砂岩ブロック）の全域連続配置（掘らないと行き詰まる！） ---
        // 全ての列で破壊できる石を隙間なく配置し、2面全体を石で埋め尽くす！
        for (let r = 1; r < totalRows - 1; r++) {
            // 既に壊れない石がある位置はスキップ
            const alreadyHasBlock = this.blocks.some(b => Math.abs(b.x - colX) < 5 && Math.abs(b.y - r * this.columnWidth) < 5);
            if (alreadyHasBlock) continue;

            // 通路の開口部（1〜2ブロック分のみの狭い隙間。それ以外は全域掘削ブロック！）
            // 4列に1列は隙間すら無い「完全な石壁」にして、プレイヤーが自ら掘り進む必然性を作る！
            const isSolidWall = (colIndex % 4 === 0);
            const gapRow = 5 + (Math.floor(colIndex / 3) % 5);
            const isGap = !isSolidWall && (r === gapRow || r === gapRow + 1);

            if (!isGap) {
                // 破壊できる石を敷き詰める！
                this.blocks.push(new StoneBlock(colX, r * this.columnWidth, this.columnWidth, this.columnWidth, true));
            }
        }
    }

    // プレイヤーの弾との当たり判定処理（石ブロックの掘削）
    handleBulletCollisions(playerBullets) {
        if (!this.active) return;

        playerBullets.forEach(bullet => {
            if (!bullet.active) return;

            for (let i = 0; i < this.blocks.length; i++) {
                const b = this.blocks[i];
                if (!b.active) continue;

                // 弾とブロックの矩形交差判定
                if (
                    bullet.x < b.x + b.width &&
                    bullet.x + bullet.width > b.x &&
                    bullet.y < b.y + b.height &&
                    bullet.y + bullet.height > b.y
                ) {
                    // レーザーなら貫通しながら大ダメージ（石を一気にぶち抜く快感！）
                    if (typeof Laser !== 'undefined' && bullet instanceof Laser) {
                        b.hit(2);
                    } else if (typeof Missile !== 'undefined' && bullet instanceof Missile) {
                        bullet.active = false;
                        b.hit(3);
                    } else {
                        // 通常ショット・ダブル
                        bullet.active = false;
                        b.hit(1);
                    }
                    break;
                }
            }
        });
    }

    // プレイヤーや敵弾との矩形衝突判定（自機が挟まれる・激突する判定）
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

        // 1. ストーンヘンジ面専用の紫紺の宇宙背景
        const spaceGrad = ctx.createLinearGradient(0, 0, 0, this.height);
        spaceGrad.addColorStop(0.0, '#0a0518');
        spaceGrad.addColorStop(0.4, '#170c32');
        spaceGrad.addColorStop(0.7, '#24144a');
        spaceGrad.addColorStop(1.0, '#0d0720');
        ctx.fillStyle = spaceGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        // 2. 遠景のストーンヘンジ巨石群シルエット（パララックス深景）
        ctx.fillStyle = 'rgba(20, 10, 40, 0.85)';
        this.bgMonoliths.forEach(m => {
            ctx.fillRect(m.x, m.y, m.w, m.h);
            ctx.fillRect(m.x - 8, m.y - 12, m.w + 16, 14);
        });

        // 3. 全ての石ブロックの描画
        this.blocks.forEach(b => b.draw(ctx));

        // 4. ステージ2ボスの描画
        if (this.state === 'BOSS' && this.boss) {
            this.boss.draw(ctx);
        }

        // 5. ステージ2開幕インジケーター（開始から約3.5秒間）
        if (this.state === 'STAGE' && this.stageTime < 3500) {
            const alpha = Math.min(1, Math.sin((this.stageTime / 3500) * Math.PI));
            ctx.font = 'bold 36px "Courier New", monospace';
            ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`;
            ctx.textAlign = 'center';
            ctx.shadowColor = '#0088ff';
            ctx.shadowBlur = 14;
            ctx.fillText('STAGE 2 : STONEHENGE', this.width / 2, this.height / 2 - 50);
            ctx.font = 'bold 18px "Courier New", monospace';
            ctx.fillStyle = `rgba(255, 230, 150, ${alpha})`;
            ctx.fillText('BREAK THE STONES TO CARVE YOUR PATH!', this.width / 2, this.height / 2);
        }

        // 6. ALL CLEAR（全ステージクリア）栄光のエンディング演出！
        if (this.state === 'ALL_CLEAR') {
            ctx.save();
            ctx.textAlign = 'center';

            ctx.font = 'bold 44px "Courier New", monospace';
            ctx.fillStyle = '#ffea00';
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 18;
            ctx.fillText('STAGE 2 ALL CLEAR!', this.width / 2, this.height / 2 - 80);

            ctx.font = 'bold 26px "Courier New", monospace';
            ctx.fillStyle = '#00ffff';
            ctx.shadowColor = '#0088ff';
            ctx.shadowBlur = 12;
            ctx.fillText('CONGRATULATIONS!', this.width / 2, this.height / 2 - 20);

            ctx.font = 'bold 18px "Courier New", monospace';
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 0;
            ctx.fillText('ALL MISSIONS COMPLETED!', this.width / 2, this.height / 2 + 30);
            ctx.fillText('SPECIAL MISSION BONUS : 100,000 PTS', this.width / 2, this.height / 2 + 70);

            ctx.restore();
        }

        ctx.restore();
    }
}

// グローバルインスタンス
let stonehengeStage = null;
