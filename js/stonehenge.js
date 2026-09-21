// ==========================================
// CRADIUS STAGE 2: STONEHENGE STAGE (ストーンヘンジ面)
// 破壊できる石（掘削ブロック）と破壊できない石（古代モノリス）
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
        this.seed = Math.random() * 100;
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
                // 耐久力低下に応じて暗くヒビ割れ感
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

            // 切り石の上面・左面ハイライトライン
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
            // 基本クラック
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

            // 破壊不能の鋼のような外枠
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
        
        // 遠景パララックス用ストーンヘンジ巨石シルエット
        this.bgMonoliths = [];
        for (let i = 0; i < 12; i++) {
            this.bgMonoliths.push({
                x: (canvasWidth / 10) * i,
                y: canvasHeight - (80 + Math.random() * 80),
                w: 30 + Math.random() * 25,
                h: 120 + Math.random() * 90,
                speed: 0.4
            });
        }
    }

    start() {
        this.active = true;
        this.blocks = [];
        this.distance = 0;
        this.spawnColumnX = this.width;
        this.stageTime = 0;
    }

    update(dt) {
        if (!this.active) return;
        this.stageTime += dt;
        this.distance += this.scrollSpeed;

        // 遠景シルエットのスクロール
        this.bgMonoliths.forEach(m => {
            m.x -= m.speed;
            if (m.x + m.w < 0) {
                m.x = this.width + Math.random() * 60;
            }
        });

        // 石ブロックの移動と画面外削除
        this.blocks.forEach(b => b.update(this.scrollSpeed));
        this.blocks = this.blocks.filter(b => b.active);

        // 新しい列ブロック群の定期生成
        while (this.spawnColumnX < this.width + 120) {
            this.generateColumn(this.spawnColumnX);
            this.spawnColumnX += this.columnWidth;
        }
    }

    // ストーンヘンジ面のレイアウト生成（破壊できる石で塞がれた掘削エリア）
    generateColumn(colX) {
        const totalRows = Math.floor(this.height / this.columnWidth); // 600 / 40 = 15行
        const colIndex = Math.floor(colX / this.columnWidth);

        // 天井（行0）と地面（行14）は常に破壊不能の古代巨石
        this.blocks.push(new StoneBlock(colX, 0, this.columnWidth, this.columnWidth, false));
        this.blocks.push(new StoneBlock(colX, (totalRows - 1) * this.columnWidth, this.columnWidth, this.columnWidth, false));

        // 周期的なパターン生成 (掘削ウォールエリア & オープンエリア)
        const patternPhase = (colIndex % 32);

        if (patternPhase >= 8 && patternPhase <= 22) {
            // --- 掘削エリア（通路が破壊できる石で埋め尽くされ、掘らないと行き詰まる！） ---
            for (let r = 1; r < totalRows - 1; r++) {
                // 上下から突き出る破壊不能モノリス柱
                const isIndestructiblePillar = (r <= 2 || r >= totalRows - 3) && (colIndex % 4 === 0);
                
                if (isIndestructiblePillar) {
                    this.blocks.push(new StoneBlock(colX, r * this.columnWidth, this.columnWidth, this.columnWidth, false));
                } else {
                    // 全面を破壊できる石で埋め尽くす！（ショットやレーザーで掘削が必須）
                    // ただし稀に1〜2マスだけ狭い抜け道やカプセル用隙間を設ける
                    const isNarrowPath = (patternPhase === 15 && (r === 6 || r === 7));
                    if (!isNarrowPath) {
                        this.blocks.push(new StoneBlock(colX, r * this.columnWidth, this.columnWidth, this.columnWidth, true));
                    }
                }
            }
        } else if (patternPhase === 4 || patternPhase === 26) {
            // 柱状の障害物（ストーンヘンジの門）
            for (let r = 1; r < totalRows - 1; r++) {
                if (r < 5 || r > 9) {
                    this.blocks.push(new StoneBlock(colX, r * this.columnWidth, this.columnWidth, this.columnWidth, false));
                }
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
            // 巨石上の梁石（横石）
            ctx.fillRect(m.x - 8, m.y - 12, m.w + 16, 14);
        });

        // 3. 全ての石ブロックの描画
        this.blocks.forEach(b => b.draw(ctx));

        // 4. ステージ2開幕インジケーター（開始から約3秒間）
        if (this.stageTime < 3500) {
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

        ctx.restore();
    }
}

// グローバルインスタンス
let stonehengeStage = null;
