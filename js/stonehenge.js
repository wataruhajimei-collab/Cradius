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
        this.totalColumnsGenerated = 0;
        
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
        this.totalColumnsGenerated = 0;

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

            // 3. 新しい石ブロック列の生成（スクロールに合わせて絶え間なく密集して出現！）
            if (this.generating) {
                this.spawnColumnX -= this.scrollSpeed; // 毎フレームのスクロール追従
                while (this.spawnColumnX < this.width + 120) {
                    this.generateColumn(this.spawnColumnX);
                    this.spawnColumnX += this.columnWidth;
                }
            }

            // 4. 飛ぶ敵をドンドン出すシステム！
            this.updateFlyingEnemies(dt);

            // 約50秒経過で石地帯の生成を終了し、宇宙空間ワープフェーズへの準備
            if (this.stageTime > 50000 && this.generating) {
                this.generating = false;
            }

            // 石ブロックが画面左へ抜けたらボスの前の宇宙空間「丸型ワープ兵器」フェーズへ移行！
            if (this.stageTime > 55000 && this.blocks.length < 5) {
                this.state = 'WARP_SPACE';
                this.blocks = [];
                this.warpSpaceTimer = 0;
                this.warpWaveTimer = 0;
            }
        } else if (this.state === 'WARP_SPACE') {
            this.stageTime += dt;
            this.warpSpaceTimer += dt;
            this.warpWaveTimer += dt;

            // 丸型ワープ兵器の小隊（WarpSquad）が空間から次々とワープアウト！
            if (this.warpWaveTimer > 1800) {
                this.warpWaveTimer = 0;
                if (typeof WarpSquad !== 'undefined') {
                    new WarpSquad(Math.floor(Math.random() * 2) + 4);
                }
            }

            // 約28秒間のワープ強襲を耐え抜いたら2面ボス（古代守護神ゴーレムコア）が登場！
            if (this.warpSpaceTimer > 28000) {
                this.state = 'BOSS';
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

    // 飛ぶ敵をドンドン出す処理（編隊全滅時や赤色敵撃破でカプセル大量ドロップ！）
    updateFlyingEnemies(dt) {
        if (typeof enemies === 'undefined') return;

        this.flyingEnemyTimer += dt;
        if (this.flyingEnemyTimer > this.flyingEnemyInterval) {
            this.flyingEnemyTimer = 0;
            this.flyingEnemyInterval = 900 + Math.random() * 400; // 0.9〜1.3秒のハイテンポ！

            const spawnRoll = Math.random();

            if (spawnRoll < 0.38) {
                // パターンA: 新キャラ「古代ストーンアイ（StoneEyeEnemy）」イオンリング弾放射（40%で赤色＝カプセル！）
                const spawnY = 120 + Math.random() * 360;
                if (typeof StoneEyeEnemy !== 'undefined') {
                    const eye = new StoneEyeEnemy(this.width + 50, spawnY);
                    if (Math.random() < 0.40) eye.isRed = true;
                    enemies.push(eye);
                }
            } else if (spawnRoll < 0.72) {
                // パターンB: 5機編隊（Formation）サイン波で飛来（全滅でカプセル確定ドロップ！）
                const startY = 120 + Math.random() * 360;
                if (typeof Formation !== 'undefined') {
                    new Formation(startY, 5);
                }
            } else {
                // パターンC: ザブ小隊（ZabSquad）奇襲編隊（全滅でカプセル確定ドロップ！）
                const startY = 140 + Math.random() * 320;
                if (typeof ZabSquad !== 'undefined') {
                    new ZabSquad('FRONT', startY, 4);
                }
            }
        }
    }

    // =========================================================================
    // ストーンヘンジ面 複雑・多層古代遺跡迷路レイアウト生成
    // 単純な上半分埋めを全廃！S字ジグザグ・古代門・ピラミッド階段・中央要塞島・チェッカー
    // =========================================================================
    generateColumn(colX) {
        const totalRows = Math.floor(this.height / this.columnWidth); // 600 / 40 = 15行 (r = 0〜14)
        const colIndex = this.totalColumnsGenerated++; // 正しい進行列インデックス！

        // 1. 最外郭境界: 天井（行0）と地面（行14）は1ブロック分の古代モノリス
        this.blocks.push(new StoneBlock(colX, 0, this.columnWidth, this.columnWidth, false));
        this.blocks.push(new StoneBlock(colX, (totalRows - 1) * this.columnWidth, this.columnWidth, this.columnWidth, false));

        // 2. 36列ごとの古代遺跡迷路サイクル
        const phase = colIndex % 36;
        let indestructibleRows = []; // この列で壊れない石を配置する行番号
        let enemySpawns = []; // { row, isCeil, type }

        // --- ゾーン1: S字ジグザグ・クランク迷路回廊 (phase: 0〜7) ---
        if (phase >= 1 && phase <= 3) {
            // 上から突き出す巨石柱 (r: 1〜7) -> 下部 (r: 8〜13) が通路
            for (let r = 1; r <= 7; r++) indestructibleRows.push(r);
            if (phase === 2) {
                enemySpawns.push({ row: 8, isCeil: true, type: 'RUNE' }); // 柱の下端に下向きルーン砲台
            }
        } else if (phase >= 5 && phase <= 7) {
            // 下から突き出す巨石柱 (r: 7〜13) -> 上部 (r: 1〜6) が通路
            for (let r = 7; r <= 13; r++) indestructibleRows.push(r);
            if (phase === 6) {
                enemySpawns.push({ row: 6, isCeil: false, type: 'TURRET' }); // 柱の上端に上向き砲台
            }
        }

        // --- ゾーン2: 古代遺跡アーチゲート門＆双塔ピラー (phase: 8〜14) ---
        else if (phase === 9) {
            // 対向ピラー (上 r: 1〜3, 下 r: 11〜13)
            for (let r = 1; r <= 3; r++) indestructibleRows.push(r);
            for (let r = 11; r <= 13; r++) indestructibleRows.push(r);
            enemySpawns.push({ row: 4, isCeil: true, type: 'DUCKER' });
            enemySpawns.push({ row: 10, isCeil: false, type: 'TURRET' });
        } else if (phase >= 11 && phase <= 12) {
            // 中央巨大門柱 (r: 5〜9) -> 上下両方に回廊が開口
            for (let r = 5; r <= 9; r++) indestructibleRows.push(r);
            if (phase === 11) {
                enemySpawns.push({ row: 4, isCeil: false, type: 'RUNE' }); // 門柱上面に上向きルーン砲台
                enemySpawns.push({ row: 10, isCeil: true, type: 'RUNE' }); // 門柱下面に下向きルーン砲台
            }
        }

        // --- ゾーン3: ピラミッド階段テラス (phase: 15〜22) ---
        else if (phase === 16) {
            for (let r = 12; r <= 13; r++) indestructibleRows.push(r); // 下側 1段目
        } else if (phase === 17) {
            for (let r = 10; r <= 13; r++) indestructibleRows.push(r); // 下側 2段目
        } else if (phase === 18) {
            for (let r = 8; r <= 13; r++) indestructibleRows.push(r);  // 下側 3段目 (高台)
            enemySpawns.push({ row: 7, isCeil: false, type: 'TURRET' }); // 赤砲台テラス！
        } else if (phase === 20) {
            for (let r = 1; r <= 4; r++) indestructibleRows.push(r);  // 上側 階段
            enemySpawns.push({ row: 5, isCeil: true, type: 'DUCKER' });
        } else if (phase === 21) {
            for (let r = 1; r <= 6; r++) indestructibleRows.push(r);
        }

        // --- ゾーン4: 回廊アイランド中央要塞島 (phase: 23〜29) ---
        else if (phase >= 24 && phase <= 27) {
            // 中央に浮かぶ 4×5ブロックの巨大浮遊要塞島 (r: 5〜9)
            for (let r = 5; r <= 9; r++) indestructibleRows.push(r);
            if (phase === 24) {
                enemySpawns.push({ row: 4, isCeil: false, type: 'RUNE' });
            } else if (phase === 26) {
                enemySpawns.push({ row: 10, isCeil: true, type: 'TURRET' });
            }
        }

        // --- ゾーン5: チェッカー＆狭窄クランク迷路 (phase: 30〜35) ---
        else if (phase === 31) {
            indestructibleRows.push(3, 4, 10, 11);
            enemySpawns.push({ row: 5, isCeil: true, type: 'TURRET' });
        } else if (phase === 33) {
            indestructibleRows.push(6, 7, 8);
            enemySpawns.push({ row: 5, isCeil: false, type: 'DUCKER' });
        } else if (phase === 35) {
            indestructibleRows.push(2, 3, 11, 12);
        }

        // 3. 壊れない石（古代モノリスブロック）の配置
        indestructibleRows.forEach(r => {
            this.blocks.push(new StoneBlock(colX, r * this.columnWidth, this.columnWidth, this.columnWidth, false));
        });

        // 4. 壊れない石の上に敵（砲台・ルーン砲台・ダッカー）を高密度配置（赤色確率40%！）
        if (typeof enemies !== 'undefined') {
            enemySpawns.forEach(sp => {
                const isRed = Math.random() < 0.40; // 40%で赤色＝カプセル確定ドロップ！
                const spawnX = colX + 1;
                const spawnY = sp.row * this.columnWidth;

                if (sp.type === 'RUNE' && typeof RuneTurret !== 'undefined') {
                    const rt = new RuneTurret(spawnX, spawnY, sp.isCeil);
                    if (isRed) rt.isRed = true;
                    enemies.push(rt);
                } else if (sp.type === 'DUCKER' && typeof DuckerEnemy !== 'undefined') {
                    enemies.push(new DuckerEnemy(spawnX, spawnY, sp.isCeil, isRed));
                } else if (typeof TurretEnemy !== 'undefined') {
                    enemies.push(new TurretEnemy(spawnX, spawnY, sp.isCeil, isRed));
                }
            });
        }

        // 5. 破壊できる石（砂岩ブロック）の連続掘削配置
        // 壊れない石がない行を隙間なく埋め尽くし、プレイヤーが掘り進む必然性を作る！
        // 4列に1列は完全な石壁（隙間なし！）。それ以外の列は1〜2マスの開口部のみ設ける。
        const isSolidWall = (colIndex % 4 === 0);
        let gapCenter = 7;
        if (phase >= 1 && phase <= 3) gapCenter = 10; // 下側が開口
        else if (phase >= 5 && phase <= 7) gapCenter = 3; // 上側が開口
        else if (phase >= 11 && phase <= 12) gapCenter = (colIndex % 2 === 0) ? 3 : 11; // 上下分岐
        else if (phase >= 24 && phase <= 27) gapCenter = (colIndex % 2 === 0) ? 2 : 12; // 要塞上下

        for (let r = 1; r < totalRows - 1; r++) {
            if (indestructibleRows.includes(r)) continue;

            const isGap = !isSolidWall && (r === gapCenter || r === gapCenter + 1);
            if (!isGap) {
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

        // 6. 宇宙空間ワープ強襲インジケーター（開始から約3.8秒間）
        if (this.state === 'WARP_SPACE' && this.warpSpaceTimer < 3800) {
            const alpha = Math.min(1, Math.sin((this.warpSpaceTimer / 3800) * Math.PI));
            ctx.font = 'bold 32px "Courier New", monospace';
            ctx.fillStyle = `rgba(0, 255, 255, ${alpha})`;
            ctx.textAlign = 'center';
            ctx.shadowColor = '#0088ff';
            ctx.shadowBlur = 14;
            ctx.fillText('WARNING : WARP ATTACK DETECTED!', this.width / 2, this.height / 2 - 40);
            ctx.font = 'bold 18px "Courier New", monospace';
            ctx.fillStyle = `rgba(255, 200, 100, ${alpha})`;
            ctx.fillText('SPHERE WARP WEAPONS INCOMING!', this.width / 2, this.height / 2 + 10);
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
window.stonehengeStage = stonehengeStage;
