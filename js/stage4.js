// ==========================================
// CRADIUS STAGE 4: INVERTED VOLCANO（４面：逆火山）
// 1985年アーケード版『グラディウス』4面「逆火山」完全再現：
// ・1面を天地逆転させた重厚な逆さ火山山脈＆溶岩脈地形
// ・4門のレーザー砲台を備えた中空の逆さ浮遊大陸（3基）
// ・天井と床のハッチ（ハッチャー）、ダッカー、砲台（ディー01）
// ・4面名物：豪快に飛び跳ねながら3WAY弾を放つ「ジャンパー (JumperEnemy)」
// ・4面最大の難所：回転しながらジグザグに自機を囲い込む中ボス群「アイアンメイデン (IronMaidenEnemy)」
// ・天井から垂れ下がる「超巨大逆火山 (InvertedSuperVolcano)」の逆重力放物線・大噴火サバイバル
// ・最深部で待ち受ける4面ボス「重装マグマ・ビッグコア (Stage4Boss)」！
// ==========================================

// ==========================================
// 1. ジャンパー (JumperEnemy: 飛び跳ねながら弾をばら撒く4面名物メカ)
// ==========================================
class JumperEnemy extends Enemy {
    constructor(x, y, isCeiling = false, isRed = false) {
        super(x, y, isRed);
        this.width = 36;
        this.height = 38;
        this.isCeiling = isCeiling;
        this.hp = 1;
        this.vx = -1.5;
        this.vy = isCeiling ? 7.0 : -7.6;
        this.gravity = isCeiling ? -0.22 : 0.23;
        this.groundY = y;
        this.springCompress = 0; // 着地時のバネ脚収縮量 (0〜1)
        this.hasShotInJump = false;
        this.legAnim = 0;
    }

    update() {
        let terrain = null;
        if (typeof levelManager !== 'undefined' && levelManager.stage === 4) {
            const st4 = window.stage4 || (typeof stage4 !== 'undefined' ? stage4 : null);
            if (st4 && st4.terrain && st4.terrain.wallActive) terrain = st4.terrain;
        } else if (typeof levelManager !== 'undefined' && levelManager.terrain && levelManager.terrain.active) {
            terrain = levelManager.terrain;
        }
        const scrollSpeed = terrain ? terrain.scrollSpeed : 2.0;

        this.legAnim += 0.2;

        if (this.springCompress > 0) {
            // 着地してバネを縮めている瞬間
            this.x -= scrollSpeed;
            this.springCompress -= 0.12;
            if (this.springCompress <= 0) {
                this.springCompress = 0;
                // 再び大ジャンプ！
                this.vy = this.isCeiling ? (6.6 + Math.random() * 1.6) : -(7.0 + Math.random() * 1.8);
                this.vx = (Math.random() < 0.28) ? 0.8 : -(1.2 + Math.random() * 0.8);
                this.hasShotInJump = false;
            }
        } else {
            // 空中ジャンプ移動中
            this.x += this.vx - scrollSpeed * 0.65;
            this.y += this.vy;
            this.vy += this.gravity;

            // ジャンプの頂点付近で3WAY弾（自機方向拡散弾）を発射！
            if (!this.hasShotInJump && Math.abs(this.vy) < 1.6 && this.x > 30 && this.x < 770) {
                this.hasShotInJump = true;
                this.shoot();
            }
        }

        if (terrain) {
            const cx = this.x + this.width / 2;
            const topY = terrain.getTopY(cx);
            const botY = terrain.getBottomY(cx);

            if (this.isCeiling) {
                this.groundY = topY;
                if (this.y <= topY) {
                    this.y = topY;
                    this.vy = 0;
                    this.springCompress = 1.0;
                } else if (botY < 600 && this.y + this.height > botY - 10) {
                    this.vy = -Math.abs(this.vy) * 0.7;
                }
            } else {
                this.groundY = botY;
                if (this.y + this.height >= botY) {
                    this.y = botY - this.height;
                    this.vy = 0;
                    this.springCompress = 1.0;
                } else if (topY > 0 && this.y < topY + 10) {
                    this.vy = Math.abs(this.vy) * 0.7;
                }
            }
        }

        if (this.x + this.width < -100 || this.x > 920) {
            this.active = false;
        }
    }

    shoot() {
        if (typeof enemyBullets === 'undefined' || typeof EnemyBullet === 'undefined') return;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        let baseAngle = Math.PI;
        if (typeof player !== 'undefined' && player) {
            baseAngle = Math.atan2((player.y + player.height / 2) - cy, (player.x + player.width / 2) - cx);
        }

        // 本家ジャンパー特有のジャンプ頂点ばら撒きショット（3WAY弾）
        const spread = [-0.32, 0, 0.32];
        const spd = 3.3;
        spread.forEach(offset => {
            const ang = baseAngle + offset;
            enemyBullets.push(new EnemyBullet(cx, cy, Math.cos(ang) * spd, Math.sin(ang) * spd));
        });
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();

        const cx = Math.round(this.x + this.width / 2);
        const cy = Math.round(this.isCeiling ? this.y : (this.y + this.height));
        ctx.translate(cx, cy);
        if (this.isCeiling) ctx.scale(1, -1);

        // 1985年アーケード版「ジャンパー (step_160_1.jpg)」完全再現：
        // 地上待機時はストライプドーム形状に縮み、大ジャンプ時は縦縞の円筒ボディの中央に青い丸目（砲口）が現れ、下部に着地脚パッドが伸びる！
        const compress = Math.round(this.springCompress * 6);
        const baseOffset = -compress;

        const cCapEdge = this.isRed ? '#b82818' : '#207888';
        const cCapMid  = this.isRed ? '#ec5838' : '#48b8c8';
        const cCapHigh = this.isRed ? '#ff9878' : '#88e8f0';
        const cFoot    = this.isRed ? '#5878c8' : '#d89824';

        // 1. 下部の着地用スプリング脚＆ゴールドフランジベース
        ctx.fillStyle = '#283858';
        ctx.fillRect(-10, -8 - baseOffset, 4, 6 + baseOffset);
        ctx.fillRect(6, -8 - baseOffset, 4, 6 + baseOffset);
        ctx.fillStyle = cFoot;
        ctx.fillRect(-16, -4, 32, 4);
        ctx.fillStyle = '#f8e878';
        ctx.fillRect(-12, -3, 8, 2);
        ctx.fillRect(4, -3, 8, 2);

        // 2. 縦ストライプ円筒胴体＋中央の青い丸目アイ (step_160_1.jpg の象徴的デザイン)
        const cylY = -22 + compress;
        ctx.fillStyle = '#080c18';
        ctx.fillRect(-16, cylY, 32, 14);

        const stripeX = [-14, -9, -4, 1, 6, 11];
        stripeX.forEach((sx, idx) => {
            ctx.fillStyle = (idx === 1 || idx === 4) ? '#f0f8ff' : (this.isRed ? '#e84838' : '#58c8d8');
            ctx.fillRect(sx, cylY + 1, 3, 12);
        });

        // 中央の青いカメラアイ／発射口（ジャンプ中に露出！）
        if (this.springCompress < 0.6) {
            ctx.fillStyle = '#081028';
            ctx.fillRect(-6, cylY + 2, 12, 10);
            ctx.fillStyle = '#2060e8';
            ctx.fillRect(-5, cylY + 3, 10, 8);
            ctx.fillStyle = this.hasShotInJump ? '#ffe850' : '#68c8ff';
            ctx.fillRect(-3, cylY + 4, 6, 6);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-2, cylY + 5, 2, 2);
        }

        // 3. 上部の半円ドームキャップ
        const capY = cylY - 11;
        ctx.fillStyle = cCapEdge;
        ctx.fillRect(-16, capY + 6, 32, 5);
        ctx.fillRect(-13, capY + 2, 26, 4);
        ctx.fillStyle = cCapMid;
        ctx.fillRect(-13, capY + 6, 26, 5);
        ctx.fillRect(-10, capY + 2, 20, 4);
        ctx.fillStyle = cCapHigh;
        ctx.fillRect(-8, capY, 16, 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-4, capY, 8, 2);

        ctx.restore();
    }
}

// ==========================================
// 2. 大型傘＆ボディ重装巡回メカ：アイアンメイデン (IronMaidenEnemy & IronMaidenSquad)
// 1985年AC版4面ボス前の象徴：スクロールが停止した画面の「右上」からだけ整然と1列で順番に出現し、
// 簡単に壊れない重装甲の大型ボディ（上部ドーム傘＋下部メカニカルボディ）で画面全域を整然と巡回する！
// ==========================================
class IronMaidenSquad extends FormationBase {
    constructor(count = 20, spacing = 24) {
        super(count);
        this.enemies = [];

        for (let i = 0; i < count; i++) {
            // 3機に1機（および最後尾）を赤色カプセルキャリアに設定
            const isRed = (i % 3 === 2) || (i === count - 1);
            const maiden = new IronMaidenEnemy(i * spacing, this, isRed);
            this.enemies.push(maiden);
            if (typeof enemies !== 'undefined') {
                enemies.push(maiden);
            }
        }
    }
}

class IronMaidenEnemy extends Enemy {
    constructor(delay = 0, formation = null, isRed = false) {
        // ★必ず画面右上（x=824, y=84）からのみ整然と出現！
        const initX = 824;
        const initY = 84;
        super(initX, initY, isRed);

        // ★さらに大きく、簡単に壊れない重装サブボス級サイズ＆耐久力
        this.width = 96;
        this.height = 86;
        this.delay = delay;
        this.formation = formation;
        this.visible = (delay <= 0);

        this.hp = 45;
        this.maxHp = 45;
        this.lastLaserShotId = 0; // レーザー1回の照射につき5ダメージ（従来の3倍硬いHP45＝レーザー9回照射で破壊）
        this.hitCooldown = 0; // レーザー接触中に「キーキー」と鳴りながら重厚な手応えで破壊できるクールダウン
        this.flashTimer = 0;

        this.phase = 0;
        this.lapCount = 0;
        this.spinAngle = 0;
        this.patrolSpeed = 3.4;
    }

    update() {
        if (this.delay > 0) {
            this.delay--;
            if (this.delay <= 0) {
                this.visible = true;
            }
            return;
        }

        if (this.hitCooldown > 0) this.hitCooldown--;
        if (this.flashTimer > 0) this.flashTimer--;
        this.spinAngle += 0.12;

        // 画面外周および内周を整然と巡回する固定ウェイポイント座標
        const topLaneY = 84;
        const botLaneY = 428;
        const leftLaneX = 48;
        const rightLaneX = 656;

        const innerTopY = 172;
        const innerBotY = 340;
        const innerLeftX = 152;
        const innerRightX = 556;

        const spd = this.patrolSpeed;
        const st4 = window.stage4 || (typeof stage4 !== 'undefined' ? stage4 : null);
        const rushEnded = st4 && st4.state !== 'JELLYFISH_RUSH';

        // ボス前巡回フェーズ終了時は速やかに左方向へ整然と退場
        if (rushEnded && this.phase !== 8) {
            this.phase = 8;
        }

        if (this.phase === 0) {
            // 0. 右上から出現し、上段レーンを左端へ整然と直進
            this.y = topLaneY;
            this.x -= spd;
            if (this.x <= leftLaneX) {
                this.x = leftLaneX;
                this.phase = 1;
            }
        } else if (this.phase === 1) {
            // 1. 左端レーンを上段から下段へ垂直降下
            this.x = leftLaneX;
            this.y += spd;
            if (this.y >= botLaneY) {
                this.y = botLaneY;
                this.phase = 2;
            }
        } else if (this.phase === 2) {
            // 2. 下段レーンを左端から右端へ整然と水平移動
            this.y = botLaneY;
            this.x += spd;
            if (this.x >= rightLaneX) {
                this.x = rightLaneX;
                this.phase = 3;
            }
        } else if (this.phase === 3) {
            // 3. 右端レーンを下段から中上段へ垂直上昇
            this.x = rightLaneX;
            this.y -= spd;
            if (this.y <= innerTopY) {
                this.y = innerTopY;
                this.phase = 4;
            }
        } else if (this.phase === 4) {
            // 4. 内周・中上段レーンを右から左へ水平巡回
            this.y = innerTopY;
            this.x -= spd;
            if (this.x <= innerLeftX) {
                this.x = innerLeftX;
                this.phase = 5;
            }
        } else if (this.phase === 5) {
            // 5. 内周・左レーンを中下段へ垂直降下
            this.x = innerLeftX;
            this.y += spd;
            if (this.y >= innerBotY) {
                this.y = innerBotY;
                this.phase = 6;
            }
        } else if (this.phase === 6) {
            // 6. 内周・中下段レーンを左から右へ水平巡回
            this.y = innerBotY;
            this.x += spd;
            if (this.x >= innerRightX) {
                this.x = innerRightX;
                this.phase = 7;
            }
        } else if (this.phase === 7) {
            // 7. 内周・右レーンから再び上段レーンへ垂直上昇して2周目へ（または退場）
            this.x = innerRightX;
            this.y -= spd;
            if (this.y <= topLaneY) {
                this.y = topLaneY;
                this.lapCount++;
                if (this.lapCount < 2 && !rushEnded) {
                    this.phase = 0;
                } else {
                    this.phase = 8;
                }
            }
        } else {
            // 8. 巡回完了後、左端へ整然と直進離脱
            this.x -= spd * 1.35;
        }

        if (this.x < -140 || this.x > 960) {
            this.active = false;
        }
    }

    draw(ctx) {
        if (!this.visible || !this.active) return;
        ctx.save();

        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        ctx.translate(cx, cy);

        const isFlash = (this.flashTimer > 0);
        const rxRim = 46;     // 広げた傘布の最大半径（全幅92px）
        const rxCollar = 13.5; // 上部ドーム直下の傘の首元半径
        const yCollar = -23.5;
        const yRimBase = 2.0;

        // =========================================================
        // 1. 下部回転フィン（背面側）＆ 傘の裏側（内部の陰影と受骨）
        // =========================================================
        const finCount = 6;
        const fins = [];
        for (let i = 0; i < finCount; i++) {
            // 本家同様、下部フィンを右回り（反時計回り）に高速回転
            const angle = -this.spinAngle * 1.15 + (i * Math.PI * 2) / finCount;
            fins.push({
                angle,
                sin: Math.sin(angle),
                cos: Math.cos(angle)
            });
        }

        const drawFin = (f) => {
            const xBase = f.sin * 10.5;
            const xOuter = f.sin * 23.5;
            const xTip = f.sin * 16.5;
            const bladeHalfW = 2.6 + Math.abs(f.cos) * 3.8;
            const yOffset = f.cos * 2.2;
            const dir = f.sin >= 0 ? 1 : -1;

            const finGrad = ctx.createLinearGradient(xBase - bladeHalfW, 4, xOuter + bladeHalfW, 35);
            if (isFlash) {
                finGrad.addColorStop(0, '#ffffff');
                finGrad.addColorStop(1, '#fde047');
            } else if (this.isRed) {
                finGrad.addColorStop(0, f.cos >= 0 ? '#fecdd3' : '#9f1239');
                finGrad.addColorStop(0.55, f.cos >= 0 ? '#e11d48' : '#881337');
                finGrad.addColorStop(1, '#310413');
            } else {
                finGrad.addColorStop(0, f.cos >= 0 ? '#f1f5f9' : '#64748b');
                finGrad.addColorStop(0.5, f.cos >= 0 ? '#64748b' : '#334155');
                finGrad.addColorStop(1, '#090d16');
            }

            ctx.fillStyle = finGrad;
            ctx.beginPath();
            ctx.moveTo(xBase - bladeHalfW * 0.55, 2 + yOffset * 0.4);
            ctx.lineTo(xBase + bladeHalfW * 0.55, 2 + yOffset * 0.4);
            ctx.lineTo(xOuter + dir * bladeHalfW * 0.7, 17 + yOffset);
            ctx.lineTo(xTip + dir * 2.0, 35 + yOffset);
            ctx.lineTo(xTip - dir * 2.2, 33 + yOffset);
            ctx.lineTo(xBase - dir * 2.0, 18 + yOffset * 0.6);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = isFlash ? '#ffffff' : '#090d16';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // フィン表面のオレンジ発光スリット（前面側フィンのみ）
            if (f.cos > -0.15) {
                ctx.strokeStyle = isFlash ? '#ffffff' : (this.isRed ? '#fde047' : '#f97316');
                ctx.lineWidth = 1.3;
                ctx.beginPath();
                ctx.moveTo((xBase + xOuter) * 0.5, 9 + yOffset * 0.7);
                ctx.lineTo((xOuter + xTip) * 0.5, 26 + yOffset);
                ctx.stroke();
            }
        };

        // 傘の裏側（開いた傘の内側の暗がり＆ろくろから伸びる受骨）
        const underGrad = ctx.createLinearGradient(0, -3, 0, 9);
        underGrad.addColorStop(0, '#020617');
        underGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = underGrad;
        ctx.beginPath();
        ctx.ellipse(0, 2.5, rxRim - 2, 7.0, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // 傘の内側に見える受骨（中心軸から傘の骨へ伸びる細い金属ストラット）
        ctx.strokeStyle = isFlash ? '#fde047' : '#475569';
        ctx.lineWidth = 1.3;
        for (let s = -3; s <= 3; s++) {
            if (s === 0) continue;
            ctx.beginPath();
            ctx.moveTo(s * 2.5, 7);
            ctx.lineTo(s * 12.5, 1.5);
            ctx.stroke();
        }

        // 背面側の回転フィンを先に描画
        fins.filter(f => f.cos < 0).sort((a, b) => a.cos - b.cos).forEach(drawFin);

        // =========================================================
        // 2. 傘の中央軸（ろくろハブ＆下部コアスピンドル）
        // =========================================================
        const shaftGrad = ctx.createLinearGradient(-11, 2, 11, 36);
        if (isFlash) {
            shaftGrad.addColorStop(0, '#ffffff');
            shaftGrad.addColorStop(1, '#ea580c');
        } else if (this.isRed) {
            shaftGrad.addColorStop(0, '#fda4af');
            shaftGrad.addColorStop(0.45, '#be123c');
            shaftGrad.addColorStop(1, '#4c0519');
        } else {
            shaftGrad.addColorStop(0, '#e2e8f0');
            shaftGrad.addColorStop(0.45, '#475569');
            shaftGrad.addColorStop(1, '#0f172a');
        }
        ctx.fillStyle = shaftGrad;
        ctx.beginPath();
        ctx.moveTo(-11, 1);
        ctx.lineTo(11, 1);
        ctx.lineTo(8.5, 29);
        ctx.lineTo(0, 38);
        ctx.lineTo(-8.5, 29);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // 中央軸のルーバーリング＆発光スリット
        for (let ry = 7; ry <= 23; ry += 5) {
            ctx.fillStyle = '#020617';
            ctx.fillRect(-7.5, ry, 15, 2.5);
            ctx.fillStyle = isFlash ? '#ffffff' : '#ff3300';
            ctx.fillRect(-5, ry + 0.4, 10, 1.7);
        }

        // 前面側の回転フィンを中央軸の手前に描画
        fins.filter(f => f.cos >= 0).sort((a, b) => a.cos - b.cos).forEach(drawFin);

        // =========================================================
        // 3. オリジナル準拠の「傘布を開いた傘型円盤」キャノピー
        //    （放射状の親骨＋アーチ状に切れ込んだ裾スカラップ＋尖った露先）
        // =========================================================
        const panelCount = 5; // 正面180度に見える傘布パネル分割数
        const step = Math.PI / panelCount;
        const phase = (((-this.spinAngle * 0.75) % step) + step) % step;

        // 左端(-π/2)と右端(+π/2)を固定しつつ、内部の親骨が滑らかに回転移動する角度配列
        const ribAngles = [-Math.PI / 2];
        for (let a = -Math.PI / 2 + phase; a < Math.PI / 2 - 0.02; a += step) {
            if (a > -Math.PI / 2 + 0.02) {
                ribAngles.push(a);
            }
        }
        ribAngles.push(Math.PI / 2);

        const getRibGeom = (alpha) => {
            const u = Math.sin(alpha); // -1.0 (左端) 〜 +1.0 (右端)
            const depth = Math.cos(alpha); // 0.0 (両端) 〜 1.0 (正面中央)
            const xTop = u * rxCollar;
            const yTop = yCollar + depth * 2.2;
            const xTip = u * rxRim;
            const yTip = yRimBase + depth * 5.8; // 正面手前の露先ほど下に降りる立体パース
            // 傘布特有の「外側へ張り出しながら広がる」親骨ベジェ制御点
            const ctrlX = u * (rxRim * 0.77);
            const ctrlY = yCollar + (yTip - yCollar) * 0.27;
            return { alpha, u, depth, xTop, yTop, xTip, yTip, ctrlX, ctrlY };
        };

        const ribs = ribAngles.map(getRibGeom);

        // 各傘布パネル（隣り合う親骨の間）を描画：裾が上向きアーチ状に切れ込んだ本物の傘シルエット
        for (let i = 0; i < ribs.length - 1; i++) {
            const r0 = ribs[i];
            const r1 = ribs[i + 1];
            const midAlpha = (r0.alpha + r1.alpha) * 0.5;
            const midU = Math.sin(midAlpha);
            const midDepth = Math.cos(midAlpha);

            // 傘布の裾（r0.xTip 〜 r1.xTip）の中央が大きく上向きに湾曲するスカラップアーチ
            const spanW = Math.abs(r1.xTip - r0.xTip);
            const archLift = 4.2 + (spanW / rxRim) * 6.5;
            const archCtrlX = (r0.xTip + r1.xTip) * 0.5;
            const archCtrlY = (r0.yTip + r1.yTip) * 0.5 - archLift;

            // 光源（左上）に対する各傘布パネルの立体シェーディング
            const lightFactor = Math.max(0, Math.min(1, 0.58 - midU * 0.45 + midDepth * 0.15));
            const pGrad = ctx.createLinearGradient(
                (r0.xTop + r1.xTop) * 0.5,
                yCollar,
                archCtrlX,
                (r0.yTip + r1.yTip) * 0.5
            );

            if (isFlash) {
                pGrad.addColorStop(0.0, '#ffffff');
                pGrad.addColorStop(0.6, '#fde047');
                pGrad.addColorStop(1.0, '#ea580c');
            } else if (this.isRed) {
                if (lightFactor > 0.62) {
                    pGrad.addColorStop(0.0, '#fff1f2');
                    pGrad.addColorStop(0.38, '#fda4af');
                    pGrad.addColorStop(0.82, '#e11d48');
                    pGrad.addColorStop(1.0, '#881337');
                } else if (lightFactor > 0.35) {
                    pGrad.addColorStop(0.0, '#fecdd3');
                    pGrad.addColorStop(0.42, '#e11d48');
                    pGrad.addColorStop(0.85, '#9f1239');
                    pGrad.addColorStop(1.0, '#4c0519');
                } else {
                    pGrad.addColorStop(0.0, '#fb7185');
                    pGrad.addColorStop(0.45, '#9f1239');
                    pGrad.addColorStop(1.0, '#310413');
                }
            } else {
                if (lightFactor > 0.62) {
                    pGrad.addColorStop(0.0, '#ffffff');
                    pGrad.addColorStop(0.35, '#e0f2fe');
                    pGrad.addColorStop(0.78, '#64748b');
                    pGrad.addColorStop(1.0, '#1e293b');
                } else if (lightFactor > 0.35) {
                    pGrad.addColorStop(0.0, '#e2e8f0');
                    pGrad.addColorStop(0.40, '#64748b');
                    pGrad.addColorStop(0.82, '#334155');
                    pGrad.addColorStop(1.0, '#0f172a');
                } else {
                    pGrad.addColorStop(0.0, '#94a3b8');
                    pGrad.addColorStop(0.45, '#334155');
                    pGrad.addColorStop(1.0, '#090d16');
                }
            }

            ctx.fillStyle = pGrad;
            ctx.beginPath();
            ctx.moveTo(r0.xTop, r0.yTop);
            // 左側の親骨ラインに沿って露先へ
            ctx.quadraticCurveTo(r0.ctrlX, r0.ctrlY, r0.xTip, r0.yTip);
            // ★傘布の裾：露先から次の露先へ、上向きに食い込むアーチ状スカラップ！
            ctx.quadraticCurveTo(archCtrlX, archCtrlY, r1.xTip, r1.yTip);
            // 右側の親骨ラインに沿って首元へ戻る
            ctx.quadraticCurveTo(r1.ctrlX, r1.ctrlY, r1.xTop, r1.yTop);
            ctx.closePath();
            ctx.fill();

            // 傘布の裾アーチのハイライト縁取り
            ctx.strokeStyle = isFlash ? '#ffffff' : (this.isRed ? '#fda4af' : '#cbd5e1');
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(r0.xTip, r0.yTip);
            ctx.quadraticCurveTo(archCtrlX, archCtrlY, r1.xTip, r1.yTip);
            ctx.stroke();
        }

        // 各親骨（傘のフレーム）と先端の尖った露先（石突きスパイク）を描画
        ribs.forEach((r) => {
            ctx.strokeStyle = isFlash ? '#ffffff' : '#090d16';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(r.xTop, r.yTop);
            ctx.quadraticCurveTo(r.ctrlX, r.ctrlY, r.xTip, r.yTip);
            ctx.stroke();

            // 親骨のメタリックハイライト筋
            ctx.strokeStyle = isFlash ? '#fde047' : (this.isRed ? '#fecdd3' : '#e2e8f0');
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(r.xTop, r.yTop);
            ctx.quadraticCurveTo(r.ctrlX, r.ctrlY, r.xTip, r.yTip);
            ctx.stroke();

            // 傘の骨の先端（露先スパイク）
            const spikeDirX = r.u * 2.2;
            const spikeDirY = 3.2;
            ctx.fillStyle = isFlash ? '#ffffff' : (this.isRed ? '#ffe4e6' : '#f8fafc');
            ctx.beginPath();
            ctx.moveTo(r.xTip - 2.0, r.yTip - 0.5);
            ctx.lineTo(r.xTip + 2.0, r.yTip - 0.5);
            ctx.lineTo(r.xTip + spikeDirX, r.yTip + spikeDirY);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#090d16';
            ctx.lineWidth = 1.1;
            ctx.stroke();
        });

        // =========================================================
        // 4. 本体上部のドーム＆内部に透けて見える赤熱コア（原作の象徴）
        // =========================================================
        // ドーム基部の金属カラー（首輪リング）
        const collarGrad = ctx.createLinearGradient(-rxCollar - 2, yCollar - 2, rxCollar + 2, yCollar + 3);
        collarGrad.addColorStop(0, '#1e293b');
        collarGrad.addColorStop(0.5, '#cbd5e1');
        collarGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = isFlash ? '#ffffff' : collarGrad;
        ctx.beginPath();
        ctx.ellipse(0, yCollar + 0.5, rxCollar + 1.5, 3.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // 上部ドーム外殻（内部コアが透けて見えるダークガラス・カプセルドーム）
        const topDomeGrad = ctx.createRadialGradient(-4, -33, 2, 0, -28, 15);
        if (isFlash) {
            topDomeGrad.addColorStop(0.0, '#ffffff');
            topDomeGrad.addColorStop(0.7, '#fde047');
            topDomeGrad.addColorStop(1.0, '#ea580c');
        } else {
            topDomeGrad.addColorStop(0.0, 'rgba(148, 163, 184, 0.55)');
            topDomeGrad.addColorStop(0.6, 'rgba(15, 23, 42, 0.88)');
            topDomeGrad.addColorStop(1.0, 'rgba(2, 6, 23, 0.96)');
        }
        ctx.fillStyle = topDomeGrad;
        ctx.beginPath();
        ctx.ellipse(0, yCollar, rxCollar, 14.5, 0, Math.PI, 0, false);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = isFlash ? '#ffffff' : '#64748b';
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // 上部ドーム内部の赤熱エネルギーコア（脈動しながら輝く核）
        const corePulse = 0.82 + Math.sin(this.spinAngle * 2.4) * 0.18;
        const coreGrad = ctx.createRadialGradient(-2.5, yCollar - 7.5, 1, 0, yCollar - 6.0, 9.5);
        coreGrad.addColorStop(0.0, '#ffffff');
        coreGrad.addColorStop(0.32, '#fde047');
        coreGrad.addColorStop(0.68, `rgba(255, 38, 0, ${corePulse})`);
        coreGrad.addColorStop(1.0, 'rgba(127, 29, 29, 0.9)');
        ctx.fillStyle = coreGrad;
        ctx.shadowColor = '#ff2200';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(0, yCollar - 5.5, 8.8, 6.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 上部ドーム表面のガラス光沢ハイライト
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(-2, yCollar - 2, rxCollar * 0.65, 9.5, -0.15, Math.PI * 1.12, Math.PI * 1.68, false);
        ctx.stroke();

        ctx.restore();
    }
}

// ==========================================
// 3. 天井の逆火山 (InvertedVolcano) ＆ 超巨大逆火山 (InvertedSuperVolcano) ＆ 逆重力火山弾 (InvertedVolcanoRock)
// ==========================================
class InvertedVolcanoRock extends Enemy {
    constructor(x, y, vx, vy, size = 28, gravity = -0.135) {
        super(x, y);
        this.size = size;
        this.width = size;
        this.height = size;
        this.vx = vx;
        this.vy = vy;
        // ★原作1985年AC版4面「逆火山」の象徴：
        // 天井火口から下向き(vy > 0)に噴き出し、逆重力(gravity < 0)で再び天井へと弧を描いて吸い上げられる逆放物線！
        this.gravity = gravity;
        this.hp = size > 34 ? 2 : 1;
        this.rot = Math.random() * Math.PI * 2;
        this.rotSpd = (Math.random() - 0.5) * 0.22;
        this.framesAlive = 0;
    }

    update() {
        this.framesAlive++;
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.rot += this.rotSpd;

        if (this.y < -80 || this.y > 680 || this.x < -120 || this.x > 950) {
            this.active = false;
            return;
        }

        // 発射直後（火口付近）を抜けたら天井・地面との衝突で消滅
        if (this.framesAlive > 18) {
            const st4 = window.stage4 || (typeof stage4 !== 'undefined' ? stage4 : null);
            if (st4 && st4.terrain && st4.terrain.wallActive) {
                const cx = this.x + this.width / 2;
                const topY = st4.terrain.getTopY(cx);
                const botY = st4.terrain.getBottomY(cx);
                if (this.gravity < 0 && this.vy < 0 && this.y <= topY) {
                    this.active = false;
                } else if (this.gravity > 0 && this.vy > 0 && this.y + this.height >= botY) {
                    this.active = false;
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rot);

        const rBase = this.size / 2;
        ctx.shadowColor = 'rgba(255, 80, 0, 0.8)';
        ctx.shadowBlur = Math.max(6, rBase * 0.6);

        const magmaGrad = ctx.createRadialGradient(rBase * 0.15, -rBase * 0.15, 1, 0, 0, rBase);
        magmaGrad.addColorStop(0.0, '#ffffff');
        magmaGrad.addColorStop(0.28, '#fde047');
        magmaGrad.addColorStop(0.60, '#f97316');
        magmaGrad.addColorStop(0.88, '#991b1b');
        magmaGrad.addColorStop(1.0, '#1c1917');

        ctx.fillStyle = magmaGrad;
        ctx.beginPath();
        const points = 8;
        for (let i = 0; i < points; i++) {
            const angle = (i / points) * Math.PI * 2;
            const r = rBase * (0.85 + ((i % 2 === 0) ? 0.2 : -0.1));
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#450a0a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }
}

// 道中の天井・床に配置される小型逆火山クレーター
class InvertedVolcano extends Enemy {
    constructor(x, y, isCeiling = true) {
        super(x, y);
        this.width = 92;
        this.height = 66;
        this.isCeiling = isCeiling;
        this.groundY = y;
        this.burstTimer = Math.floor(Math.random() * 50);
        this.magmaAnim = Math.random() * 10;
        this.hp = 9999; // 破壊不能な地形火山ギミック
    }

    update() {
        const st4 = window.stage4 || (typeof stage4 !== 'undefined' ? stage4 : null);
        const terrain = (st4 && st4.terrain && st4.terrain.wallActive) ? st4.terrain : null;

        if (terrain) {
            this.x -= terrain.scrollSpeed;
            const cx = this.x + this.width / 2;
            if (this.isCeiling) {
                this.groundY = terrain.getTopY(cx);
                this.y = this.groundY;
            } else {
                this.groundY = terrain.getBottomY(cx);
                this.y = this.groundY - this.height;
            }
        } else {
            this.x -= this.speed;
        }

        if (this.x + this.width < -100) {
            this.active = false;
            return;
        }

        this.magmaAnim += 0.14;
        this.burstTimer++;
        if (this.burstTimer > 105 && this.x > 40 && this.x < 760) {
            this.burstTimer = 0;
            if (typeof enemies !== 'undefined') {
                const craterX = this.x + this.width / 2;
                const craterY = this.isCeiling ? (this.groundY + this.height - 14) : (this.groundY - this.height + 14);
                for (let i = 0; i < 3; i++) {
                    const vx = (Math.random() - 0.62) * 4.2 - 1.0;
                    if (this.isCeiling) {
                        // 天井から下へ噴き出し、逆重力で天井へ戻る本家4面軌道！
                        const vy = Math.random() * 4.2 + 5.6;
                        enemies.push(new InvertedVolcanoRock(craterX + (Math.random() - 0.5) * 20, craterY, vx, vy, 26, -0.13));
                    } else {
                        const vy = -(Math.random() * 4.5 + 5.8);
                        enemies.push(new InvertedVolcanoRock(craterX + (Math.random() - 0.5) * 20, craterY, vx, vy, 26, 0.13));
                    }
                }
            }
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.groundY);
        if (this.isCeiling) ctx.scale(1, -1);

        const mountainGrad = ctx.createLinearGradient(0, -this.height, 0, 0);
        mountainGrad.addColorStop(0.0, '#7c2d12');
        mountainGrad.addColorStop(0.4, '#431407');
        mountainGrad.addColorStop(1.0, '#1c0a04');
        ctx.fillStyle = mountainGrad;

        ctx.beginPath();
        ctx.moveTo(-this.width / 2, 0);
        ctx.lineTo(-24, -this.height);
        ctx.lineTo(24, -this.height);
        ctx.lineTo(this.width / 2, 0);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#1c0a04';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // マグマ亀裂
        ctx.strokeStyle = `rgba(255, 85, 0, ${0.65 + Math.sin(this.magmaAnim) * 0.3})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, -this.height + 6);
        ctx.lineTo(-18, -this.height * 0.45);
        ctx.lineTo(-28, 0);
        ctx.moveTo(10, -this.height + 6);
        ctx.lineTo(16, -this.height * 0.48);
        ctx.lineTo(26, 0);
        ctx.stroke();

        // 火口の煮え滾る溶岩
        ctx.shadowColor = '#ff3300';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.ellipse(0, -this.height + 4, 22, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// 4面クライマックス：天井から垂れ下がる「超巨大逆火山 (InvertedSuperVolcano)」
class InvertedSuperVolcano extends Enemy {
    constructor(x, ceilingY) {
        super(x, ceilingY);
        this.width = 220;
        this.height = 148;
        this.ceilingY = ceilingY;
        this.burstTimer = 0;
        this.erupting = false;
        this.magmaAnim = 0;
        this.hp = 99999;
        this.targetX = 485; // 画面中央やや右の天井に堂々と陣取る
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
        const st4 = window.stage4 || (typeof stage4 !== 'undefined' ? stage4 : null);
        const terrain = (st4 && st4.terrain && st4.terrain.wallActive) ? st4.terrain : null;
        const scrollSpeed = terrain ? terrain.scrollSpeed : 0;

        if (!this.positioned) {
            const spd = scrollSpeed > 0 ? scrollSpeed : 2.2;
            this.x -= spd;
            if (terrain) {
                this.ceilingY = terrain.getTopY(this.x + this.width / 2);
            }
            this.y = this.ceilingY;
            if (this.x <= this.targetX) {
                this.x = this.targetX;
                this.positioned = true;
            }
        } else if (!this.erupting) {
            // 大噴火終了後、左へ高速スクロール退場
            const exitSpd = Math.max(scrollSpeed, 4.5);
            this.x -= exitSpd;
            if (terrain) {
                this.ceilingY = terrain.getTopY(this.x + this.width / 2);
            }
            this.y = this.ceilingY;
            if (this.x + this.width < -60) {
                this.active = false;
            }
        } else {
            if (terrain) {
                this.ceilingY = terrain.getTopY(this.x + this.width / 2);
                this.y = this.ceilingY;
            }
        }

        this.magmaAnim += 0.16;

        if (this.erupting) {
            this.burstTimer++;
            // 約11フレームごとに天井の巨大火口から灼熱の火山弾を大量噴射！
            if (this.burstTimer > 11) {
                this.burstTimer = 0;
                if (typeof enemies !== 'undefined') {
                    const count = Math.floor(Math.random() * 3) + 3; // 3〜5個
                    const craterX = this.x + this.width / 2;
                    const craterY = this.ceilingY + this.height - 8;

                    for (let i = 0; i < count; i++) {
                        const sizes = [20, 28, 38];
                        const s = sizes[Math.floor(Math.random() * sizes.length)];
                        const vx = (Math.random() - 0.70) * 6.4 - 1.1;
                        const spawnX = craterX + (Math.random() - 0.5) * 44;

                        if (i % 3 === 0) {
                            // 地面側までそのまま降り注ぐ直下型火山弾
                            const vy = Math.random() * 2.8 + 2.2;
                            enemies.push(new InvertedVolcanoRock(spawnX, craterY, vx, vy, s, 0.08));
                        } else {
                            // ★1985年AC版4面象徴：天井火口から下へ勢いよく噴き出し、画面下部まで迫ってから
                            // 逆重力（上向き加速度）で天井へと豪快に舞い戻る逆さ放物線火山弾！
                            const vy = Math.random() * 5.2 + 6.4;
                            enemies.push(new InvertedVolcanoRock(spawnX, craterY, vx, vy, s, -0.14));
                        }
                    }

                    if (typeof particles !== 'undefined' && typeof Particle !== 'undefined') {
                        for (let p = 0; p < 8; p++) {
                            particles.push(new Particle(craterX + (Math.random() - 0.5) * 30, craterY, Math.random() < 0.65 ? '#ff4400' : '#fde047'));
                        }
                    }
                }
            }
        }
    }

    checkCollision(rect) {
        if (!this.active) return false;
        if (rect.x + rect.width < this.x || rect.x > this.x + this.width) return false;
        if (rect.y > this.ceilingY + this.height) return false;

        const midX = this.x + this.width / 2;
        const relX = Math.abs((rect.x + rect.width / 2) - midX);
        const slopeH = this.height * (1 - Math.max(0, (relX - 42) / (this.width / 2 - 42)));
        return (rect.y <= this.ceilingY + slopeH);
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();
        // 天井（ceilingY）から下向きに山体が突き出すよう上下反転描画！
        ctx.translate(this.x + this.width / 2, this.ceilingY);
        ctx.scale(1, -1);

        // 1. 超巨大逆火山の山体（赤褐色〜黒曜石グラデーション）
        const mountainGrad = ctx.createLinearGradient(0, -this.height, 0, 0);
        mountainGrad.addColorStop(0.0, '#7c2d12');
        mountainGrad.addColorStop(0.35, '#9a3412');
        mountainGrad.addColorStop(0.7, '#431407');
        mountainGrad.addColorStop(1.0, '#1c0a04');
        ctx.fillStyle = mountainGrad;

        ctx.beginPath();
        ctx.moveTo(-this.width / 2, 0);
        ctx.lineTo(-42, -this.height);
        ctx.lineTo(42, -this.height);
        ctx.lineTo(this.width / 2, 0);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#1c0a04';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 2. 山肌を走る灼熱マグマの血管亀裂
        ctx.strokeStyle = `rgba(255, 80, 0, ${0.72 + Math.sin(this.magmaAnim) * 0.28})`;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(-22, -this.height + 10);
        ctx.lineTo(-34, -this.height * 0.45);
        ctx.lineTo(-60, 0);
        ctx.moveTo(18, -this.height + 10);
        ctx.lineTo(32, -this.height * 0.52);
        ctx.lineTo(55, 0);
        ctx.moveTo(0, -this.height + 12);
        ctx.lineTo(-6, -this.height * 0.35);
        ctx.lineTo(8, 0);
        ctx.stroke();

        // 3. 下向きに開いた巨大火口の超高温マグマ湖
        const glow = Math.sin(this.magmaAnim * 2) * 0.3 + 0.7;
        ctx.shadowColor = '#ff2200';
        ctx.shadowBlur = 26 * glow;

        const magmaGrad = ctx.createLinearGradient(0, -this.height - 4, 0, -this.height + 24);
        magmaGrad.addColorStop(0.0, '#ffffff');
        magmaGrad.addColorStop(0.28, '#fde047');
        magmaGrad.addColorStop(0.68, '#ff4400');
        magmaGrad.addColorStop(1.0, '#7f1d1d');
        ctx.fillStyle = magmaGrad;

        ctx.beginPath();
        ctx.ellipse(0, -this.height + 6, 40, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// ==========================================
// 4. 逆火山・浮遊大陸 (InvertedFloatingIsland: 上下4門のレーザー砲台付き)
// ==========================================
class InvertedFloatingIsland {
    constructor(x, y, width, height, scrollSpeed = 1.8) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.scrollSpeed = scrollSpeed;
        this.active = true;
        this.turrets = [];

        // 浮遊大陸の上面2基・下面2基にレーザー砲台を設置
        if (typeof LaserTurretEnemy !== 'undefined' && typeof enemies !== 'undefined') {
            const relX1 = width * 0.20;
            const relX2 = width * 0.68;

            const tTop1 = new LaserTurretEnemy(this, relX1, false);
            const tTop2 = new LaserTurretEnemy(this, relX2, false);
            const tBot1 = new LaserTurretEnemy(this, relX1, true);
            const tBot2 = new LaserTurretEnemy(this, relX2, true);

            this.turrets.push(tTop1, tTop2, tBot1, tBot2);
            enemies.push(tTop1, tTop2, tBot1, tBot2);
        }
    }

    update(currentScrollSpeed) {
        const spd = (typeof currentScrollSpeed === 'number') ? currentScrollSpeed : this.scrollSpeed;
        this.x -= spd;
        if (this.x + this.width < -150) {
            this.active = false;
        }
        this.turrets.forEach(t => {
            if (t.active) t.updatePosition();
        });
    }

    checkCollision(rect) {
        if (!this.active) return false;
        return (
            rect.x < this.x + this.width &&
            rect.x + rect.width > this.x &&
            rect.y < this.y + this.height &&
            rect.y + rect.height > this.y
        );
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();

        const w = this.width;
        const h = this.height;
        const bevelX = 34;
        const bevelY = 18;

        // 1面とは上下逆転した照明グラデーション（下面がマグマ照り返しで赤明るく、上面が深い玄武岩色）
        const grad = ctx.createLinearGradient(this.x, this.y, this.x, this.y + h);
        grad.addColorStop(0.0, '#1c0f08');
        grad.addColorStop(0.25, '#431407');
        grad.addColorStop(0.65, '#7c2d12');
        grad.addColorStop(1.0, '#c2410c');
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.moveTo(this.x + bevelX + 10, this.y);
        ctx.lineTo(this.x + w - bevelX - 10, this.y);
        ctx.lineTo(this.x + w - 10, this.y + bevelY);
        ctx.lineTo(this.x + w, this.y + h - bevelY);
        ctx.lineTo(this.x + w - bevelX, this.y + h);
        ctx.lineTo(this.x + bevelX, this.y + h);
        ctx.lineTo(this.x, this.y + h - bevelY);
        ctx.lineTo(this.x + 10, this.y + bevelY);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#180904';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 下面のマグマ反射ハイライトライン（逆火山らしさの強調）
        ctx.strokeStyle = 'rgba(255, 160, 80, 0.65)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x + bevelX, this.y + h - 2);
        ctx.lineTo(this.x + w - bevelX, this.y + h - 2);
        ctx.stroke();

        // 内部の赤熱マグマ地層ライン
        ctx.strokeStyle = 'rgba(255, 90, 20, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(this.x + 22, this.y + h * 0.36);
        ctx.lineTo(this.x + w * 0.45, this.y + h * 0.42);
        ctx.lineTo(this.x + w - 24, this.y + h * 0.34);
        ctx.moveTo(this.x + 30, this.y + h * 0.68);
        ctx.lineTo(this.x + w * 0.55, this.y + h * 0.62);
        ctx.lineTo(this.x + w - 28, this.y + h * 0.70);
        ctx.stroke();

        // 4基のレーザー砲台マウントベース
        const relX1 = w * 0.20 + 21;
        const relX2 = w * 0.68 + 21;
        [relX1, relX2].forEach(rx => {
            ctx.fillStyle = '#334155';
            ctx.fillRect(this.x + rx - 22, this.y - 2, 44, 6);
            ctx.fillRect(this.x + rx - 22, this.y + h - 4, 44, 6);
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x + rx - 22, this.y - 2, 44, 6);
            ctx.strokeRect(this.x + rx - 22, this.y + h - 4, 44, 6);
        });

        ctx.restore();
    }
}

// ==========================================
// 5. InvertedVolcanoTerrain クラス（1面を天地逆転させた逆火山山脈地形）
// ==========================================
class InvertedVolcanoTerrain {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.scrollSpeed = 1.85;
        this.baseScrollSpeed = 1.85;

        // ★逆火山：天井側（top）に高い山脈が垂れ下がり、床側（bottom）も起伏する天地逆転構造！
        this.baseTopY = 92;
        this.baseBottomY = canvasHeight - 72;

        this.active = false;
        this.wallActive = false;
        this.generating = true;
        this.wallTransition = 0;

        this.terrainStep = 32;
        this.scrollOffset = 0;
        this.generatedWorldX = 0;
        this.topHeights = [];
        this.bottomHeights = [];

        this.floatingIslands = [];
        this.distance = 0;

        // 星空背景
        this.stars = [];
        for (let i = 0; i < 95; i++) {
            this.stars.push({
                x: Math.random() * canvasWidth,
                y: Math.random() * canvasHeight,
                speed: Math.random() * 2.0 + 0.5,
                size: Math.random() * 2.0 + 0.8,
                color: (Math.random() < 0.25) ? '#fed7aa' : '#ffffff'
            });
        }
    }

    _computeTerrainHeights(d) {
        if (!this.generating) {
            return { top: 0, bottom: this.height };
        }
        // 天井（逆さ山脈）は大きく鋭い山嶺が垂れ下がり、床はうねる溶岩大地を形成
        const invMountainTop = Math.sin(d * 0.0075) * 56 + Math.sin(d * 0.021) * 32 + Math.cos(d * 0.045) * 16;
        const lavaRidgeBot = Math.cos(d * 0.0085) * 38 + Math.sin(d * 0.024) * 22 + Math.sin(d * 0.050) * 12;
        return {
            top: Math.max(36, Math.min(205, this.baseTopY + invMountainTop)),
            bottom: Math.min(this.height - 34, Math.max(this.height - 165, this.baseBottomY - lavaRidgeBot))
        };
    }

    start() {
        this.active = true;
        this.wallActive = false;
        this.generating = true;
        this.wallTransition = 0;
        this.scrollSpeed = this.baseScrollSpeed;
        this.floatingIslands = [];
        this.distance = 0;
        this.scrollOffset = 0;
        this.generatedWorldX = 0;

        const count = Math.ceil(this.width / this.terrainStep) + 16;
        this.topHeights = [];
        this.bottomHeights = [];
        for (let i = 0; i < count; i++) {
            const d = i * this.terrainStep;
            this.generatedWorldX = d;
            const h = this._computeTerrainHeights(d);
            this.topHeights.push(h.top);
            this.bottomHeights.push(h.bottom);
        }
    }

    startWalls() {
        this.wallActive = true;
        this.generating = true;
        this.wallTransition = 0;
    }

    stopGenerating() {
        this.generating = false;
    }

    // ★ボス前の大型傘＆ボディメカ巡回場面：スクロールを完全停止し、右上ゲートと巡回スペースを確保
    preparePatrolArena() {
        this.wallActive = true;
        this.generating = true;
        this.wallTransition = 1.0;
        this.scrollSpeed = 0;
        this.floatingIslands = [];

        for (let i = 0; i < this.topHeights.length; i++) {
            // 右上（出現口付近）は天井を高く開け、他も大型メカ(96x86)が整然と巡回できるよう高さを揃える
            if (i >= 19) {
                this.topHeights[i] = Math.min(this.topHeights[i], 42);
            } else {
                this.topHeights[i] = Math.min(this.topHeights[i], 68);
            }
        }
        for (let i = 0; i < this.bottomHeights.length; i++) {
            this.bottomHeights[i] = Math.max(this.bottomHeights[i], this.height - 68);
        }
    }

    getTopY(x) {
        if (!this.wallActive) return 0;
        const clampedTransition = Math.max(0, Math.min(1, this.wallTransition));
        const exactIdx = (x + this.scrollOffset) / this.terrainStep;
        const idx = Math.floor(exactIdx);
        if (idx < 0) return (this.topHeights[0] || 0) * clampedTransition;
        if (idx >= this.topHeights.length - 1) return (this.topHeights[this.topHeights.length - 1] || 0) * clampedTransition;

        const t = exactIdx - idx;
        const rawY = this.topHeights[idx] + (this.topHeights[idx + 1] - this.topHeights[idx]) * t;
        return rawY * clampedTransition;
    }

    getBottomY(x) {
        if (!this.wallActive) return this.height;
        const clampedTransition = Math.max(0, Math.min(1, this.wallTransition));
        const exactIdx = (x + this.scrollOffset) / this.terrainStep;
        const idx = Math.floor(exactIdx);
        let rawY = this.baseBottomY;
        if (idx < 0) {
            rawY = this.bottomHeights[0] || this.height;
        } else if (idx >= this.bottomHeights.length - 1) {
            rawY = this.bottomHeights[this.bottomHeights.length - 1] || this.height;
        } else {
            const t = exactIdx - idx;
            rawY = this.bottomHeights[idx] + (this.bottomHeights[idx + 1] - this.bottomHeights[idx]) * t;
        }
        return this.height - (this.height - rawY) * clampedTransition;
    }

    getGroundY(x) {
        return this.getBottomY(x);
    }

    checkCollision(rect) {
        if (!this.active || !this.wallActive || this.wallTransition < 0.25) return false;

        const cx = rect.x + rect.width / 2;
        const topY = this.getTopY(cx);
        const bottomY = this.getBottomY(cx);

        if (rect.y < topY && topY > 4) return true;
        if (rect.y + rect.height > bottomY && bottomY < this.height - 4) return true;

        for (let i = 0; i < this.floatingIslands.length; i++) {
            if (this.floatingIslands[i].checkCollision(rect)) return true;
        }

        return false;
    }

    update(dt = 16.6, canSpawnTerrainEnemies = true) {
        if (!this.active) return;

        // 星空スクロール（スクロール停止場面では背景の星もピタッと止める）
        if (this.scrollSpeed > 0) {
            this.stars.forEach(s => {
                s.x -= s.speed;
                if (s.x < 0) {
                    s.x = this.width;
                    s.y = Math.random() * this.height;
                }
            });
        }

        if (!this.wallActive) return;

        if (this.wallTransition < 1.0 && this.generating) {
            this.wallTransition = Math.min(1.0, this.wallTransition + 0.016);
        } else if (!this.generating) {
            this.wallTransition = Math.max(0.0, this.wallTransition - 0.012);
            if (this.wallTransition <= 0.02) {
                this.wallActive = false;
                return;
            }
        }

        this.distance += this.scrollSpeed;
        this.scrollOffset += this.scrollSpeed;

        while (this.scrollOffset >= this.terrainStep) {
            this.scrollOffset -= this.terrainStep;
            this.topHeights.shift();
            this.bottomHeights.shift();

            this.generatedWorldX += this.terrainStep;
            const h = this._computeTerrainHeights(this.generatedWorldX);
            this.topHeights.push(h.top);
            this.bottomHeights.push(h.bottom);

            // 新しい地形セグメントが右端から生成される際、原作4面どおりに砲台・ハッチ・ダッカー・ジャンパー・逆火山を配置！
            if (this.generating && canSpawnTerrainEnemies && typeof enemies !== 'undefined') {
                const spawnX = this.width + 24;
                const topY = h.top;
                const botY = h.bottom;
                const roll = Math.random();

                if (roll < 0.075 && typeof TurretEnemy !== 'undefined') {
                    // 天井の砲台（逆火山なので天井砲台が多め）
                    enemies.push(new TurretEnemy(spawnX, topY, true, Math.random() < 0.22));
                } else if (roll < 0.135 && typeof TurretEnemy !== 'undefined') {
                    // 地面の砲台
                    enemies.push(new TurretEnemy(spawnX, botY, false, Math.random() < 0.22));
                } else if (roll < 0.195 && typeof DuckerEnemy !== 'undefined') {
                    // ダッカー（天井または地面を走行）
                    const isCeil = Math.random() < 0.55;
                    enemies.push(new DuckerEnemy(spawnX, isCeil ? topY : botY, isCeil, Math.random() < 0.30));
                } else if (roll < 0.255) {
                    // ★4面名物：ジャンパー（飛び跳ねながら3WAY弾を撃つ難敵！）
                    const isCeil = Math.random() < 0.30;
                    enemies.push(new JumperEnemy(spawnX, isCeil ? topY : (botY - 42), isCeil, Math.random() < 0.35));
                } else if (roll < 0.295 && typeof HatcherEnemy !== 'undefined') {
                    // 天井・床のハッチ（ハッチャー）
                    const isCeil = Math.random() < 0.60;
                    enemies.push(new HatcherEnemy(spawnX, isCeil ? topY : botY, isCeil));
                } else if (roll < 0.320) {
                    // 天井の小規模逆火山クレーター
                    enemies.push(new InvertedVolcano(spawnX, topY, true));
                }
            }
        }

        // 浮遊大陸の更新
        this.floatingIslands.forEach(island => island.update(this.scrollSpeed));
        this.floatingIslands = this.floatingIslands.filter(i => i.active);
    }

    draw(ctx) {
        ctx.save();

        // 1. 4面・逆火山の深宇宙＆赤熱マグマ大気グラデーション背景
        const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
        bgGrad.addColorStop(0.0, '#180604');
        bgGrad.addColorStop(0.45, '#070510');
        bgGrad.addColorStop(1.0, '#160705');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, this.width, this.height);

        // 2. 星空
        this.stars.forEach(s => {
            ctx.globalAlpha = s.speed / 2.6;
            ctx.fillStyle = s.color;
            ctx.fillRect(s.x, s.y, s.size, s.size);
        });
        ctx.globalAlpha = 1.0;

        // 3. 天地逆転の火山地形＆浮遊大陸の描画
        if (this.wallActive && this.wallTransition > 0.02) {
            this.floatingIslands.forEach(island => island.draw(ctx));
            this._drawInvertedVolcanoCeiling(ctx);
            this._drawVolcanoFloor(ctx);
        }

        ctx.restore();
    }

    _drawInvertedVolcanoCeiling(ctx) {
        ctx.save();
        const clampedTransition = Math.max(0, Math.min(1, this.wallTransition));

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.width, 0);

        for (let i = this.topHeights.length - 1; i >= 0; i--) {
            const x = i * this.terrainStep - this.scrollOffset;
            if (x < -this.terrainStep || x > this.width + this.terrainStep) continue;
            const y = this.topHeights[i] * clampedTransition;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(0, this.getTopY(0));
        ctx.closePath();

        // 逆さ火山岩盤グラデーション（天井から垂れ下がる赤褐色〜アンバーの火山地層）
        const grad = ctx.createLinearGradient(0, 0, 0, 210 * clampedTransition);
        grad.addColorStop(0.0, '#1a0a04');
        grad.addColorStop(0.40, '#431407');
        grad.addColorStop(0.78, '#9a3412');
        grad.addColorStop(1.0, '#ea580c');
        ctx.fillStyle = grad;
        ctx.fill();

        // 岩肌エッジの灼熱ハイライトライン
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < this.topHeights.length; i++) {
            const x = i * this.terrainStep - this.scrollOffset;
            if (x < -this.terrainStep || x > this.width + this.terrainStep) continue;
            const y = this.topHeights[i] * clampedTransition;
            if (!started) {
                ctx.moveTo(x, y);
                started = true;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // 天井岩盤を走るマグマ地層クレバス
        const shift = this.distance % 64;
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.32)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let x = -shift; x <= this.width + 64; x += 64) {
            const y = this.getTopY(x);
            ctx.moveTo(x, 0);
            ctx.lineTo(x - 14, y * 0.55);
            ctx.lineTo(x + 6, y - 3);
        }
        ctx.stroke();

        ctx.restore();
    }

    _drawVolcanoFloor(ctx) {
        ctx.save();
        const clampedTransition = Math.max(0, Math.min(1, this.wallTransition));

        ctx.beginPath();
        ctx.moveTo(0, this.height);
        ctx.lineTo(this.width, this.height);

        for (let i = this.bottomHeights.length - 1; i >= 0; i--) {
            const x = i * this.terrainStep - this.scrollOffset;
            if (x < -this.terrainStep || x > this.width + this.terrainStep) continue;
            const rawY = this.bottomHeights[i];
            const y = this.height - (this.height - rawY) * clampedTransition;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(0, this.getBottomY(0));
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, this.height - 175 * clampedTransition, 0, this.height);
        grad.addColorStop(0.0, '#c2410c');
        grad.addColorStop(0.25, '#7c2d12');
        grad.addColorStop(0.65, '#431407');
        grad.addColorStop(1.0, '#1a0a04');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < this.bottomHeights.length; i++) {
            const x = i * this.terrainStep - this.scrollOffset;
            if (x < -this.terrainStep || x > this.width + this.terrainStep) continue;
            const rawY = this.bottomHeights[i];
            const y = this.height - (this.height - rawY) * clampedTransition;
            if (!started) {
                ctx.moveTo(x, y);
                started = true;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();

        // 床岩盤のマグマクレバス
        const shift = this.distance % 64;
        ctx.strokeStyle = 'rgba(251, 146, 60, 0.28)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let x = 32 - shift; x <= this.width + 64; x += 64) {
            const y = this.getBottomY(x);
            ctx.moveTo(x, this.height);
            ctx.lineTo(x + 14, (this.height + y) * 0.52);
            ctx.lineTo(x - 6, y + 3);
        }
        ctx.stroke();

        ctx.restore();
    }
}

// ==========================================
// 6. STAGE 4 BOSS: 重装マグマ・ビッグコア Mk-II (Stage4Boss)
// 本家4面ボスの「ビッグコア（遮蔽板4枚＋中央コア＋4連レーザー＋高速上下追尾）」をベースに、
// 逆火山の灼熱マグマ装甲＆アイアンメイデン射出ポッドを融合した4面クライマックスボス！
// ==========================================
class Stage4Boss {
    constructor(x, y) {
        this.scale = 2;
        this.drawW = 280;
        this.drawH = 260;
        this.width = 240;
        this.height = 200;
        this.x = (x || 800) + 150;
        this.targetX = 635;
        this.baseY = y || 300;
        this.y = this.baseY;
        this.vy = 2.8;

        this.maxHp = 12;
        this.hp = 12;
        this.active = true;
        this.isEntering = true;
        this.isDying = false;

        // 本家ビッグコア準拠：前面4枚の重装シールドプレート
        this.maxShields = 4;
        this.shields = 4;
        this.shieldHpPerPlate = 7;
        this.currentShieldHp = this.shieldHpPerPlate;
        this.shieldHitCooldown = 0;
        this.shieldFlashTimer = 0;
        this.hitFlashTimer = 0;

        this.coreOpen = false;
        this.laserTimer = 0;
        this.magmaRingTimer = 0;
        this.maidenOrbAngle = 0;
        this.rotationAngle = 0;
        this.bullets = [];

        this.isScreaming = false;
        this.screamText = '';
    }

    triggerDeathScream() {
        this.isScreaming = false;
        this.screamText = '';
    }

    update() {
        if (this.isDying) return;

        if (this.x > this.targetX) {
            this.x -= 3.2;
            this.isEntering = true;
            return;
        }
        this.isEntering = false;

        // 原作ビッグコア準拠：自機の装備ランクが高いほど機敏に上下追尾し、短い青っぽい太い4連レーザーも高速化する！
        const rank = (typeof getPlayerEquipmentRank === 'function') ? getPlayerEquipmentRank() : 0;
        const py = (typeof player !== 'undefined' && player) ? (player.y + player.height / 2) : this.baseY;
        const targetY = Math.max(150, Math.min(450, py));
        const dy = targetY - this.y;
        const trackSpeed = 2.1 + rank * 2.0 + (this.coreOpen ? 0.4 : 0);
        this.y += Math.max(-trackSpeed, Math.min(trackSpeed, dy));

        this.rotationAngle += 0.05 + rank * 0.03;
        this.maidenOrbAngle += 0.06;

        if (this.shieldHitCooldown > 0) this.shieldHitCooldown--;
        if (this.shieldFlashTimer > 0) this.shieldFlashTimer--;
        if (this.hitFlashTimer > 0) this.hitFlashTimer--;

        this.coreOpen = (this.shields <= 0);

        // ビッグコア伝統の4連平行レーザー斉射（装備ランクに応じて発射間隔も短縮）
        this.laserTimer++;
        const laserInterval = Math.max(42, Math.round((this.coreOpen ? 76 : 96) - rank * 38));
        if (this.laserTimer >= laserInterval) {
            this.laserTimer = 0;
            this.shootTwinLasers();
        }

        this.bullets.forEach(b => b.update(600));
        this.bullets = this.bullets.filter(b => b.active);
    }

    shootTwinLasers() {
        const cx = this.x;
        const cy = this.y;
        const rank = (typeof getPlayerEquipmentRank === 'function') ? getPlayerEquipmentRank() : 0;
        const spd = -(6.2 + rank * 4.6 + (this.coreOpen ? 0.8 : 0));
        const LaserClass = (typeof BigCoreLaser !== 'undefined') ? BigCoreLaser :
                           ((typeof EnemyLaser !== 'undefined') ? EnemyLaser : Bullet);

        // 1985年AC版ビッグコアの4門レーザー砲口座標（内側2門は先端x-147/y±28、外側2門は段差肩部x-75/y±70）
        const muzzles = [
            { dx: -75, dy: -70 },
            { dx: -147, dy: -28 },
            { dx: -147, dy: 28 },
            { dx: -75, dy: 70 }
        ];
        muzzles.forEach(m => {
            if (LaserClass === BigCoreLaser) {
                this.bullets.push(new BigCoreLaser(cx + m.dx, cy + m.dy, spd, 0));
            } else {
                this.bullets.push(new LaserClass(cx + m.dx, cy + m.dy, spd, 0, '#38bdf8'));
            }
        });

        if (typeof Sound !== 'undefined' && typeof Sound.playLaser === 'function') {
            Sound.playLaser();
        }
    }

    hitShield(damage = 1) {
        if (this.shieldHitCooldown > 0) return false;
        this.shieldHitCooldown = 1;
        this.shieldFlashTimer = 5;
        this.currentShieldHp -= damage;
        let destroyedAny = false;
        while (this.currentShieldHp <= 0 && this.shields > 0) {
            this.shields--;
            destroyedAny = true;
            if (this.shields > 0) {
                this.currentShieldHp += this.shieldHpPerPlate;
            } else {
                this.currentShieldHp = 0;
                break;
            }
        }
        return destroyedAny;
    }

    hitCore(damage = 1) {
        this.hitFlashTimer = 5;
        this.hp -= damage;
        if (this.hp <= 0 && !this.isDying) {
            this.triggerDeathScream();
            if (typeof triggerBossDefeatExplosion === 'function') {
                triggerBossDefeatExplosion(this);
            }
        }
    }

    getShieldBounds() {
        if (this.shields <= 0) return null;
        const firstBarIdx = 4 - this.shields;
        const frontX = this.x - 147 + (10 + firstBarIdx * 4) * 3;
        const backX = this.x - 147 + 30 * 3;
        return {
            x: frontX,
            y: this.y - 18,
            width: Math.max(12, backX - frontX),
            height: 36
        };
    }

    getCoreBounds() {
        const coreX = this.x - 8;
        const coreY = this.y;
        const r = 22;
        return {
            x: coreX - r,
            y: coreY - r,
            width: r * 2,
            height: r * 2
        };
    }

    getTopHullBounds() {
        return {
            x: this.x - 135,
            y: this.y - 96,
            width: 255,
            height: 78
        };
    }

    getBottomHullBounds() {
        return {
            x: this.x - 135,
            y: this.y + 18,
            width: 255,
            height: 78
        };
    }

    handleBulletCollision(bullet) {
        if (this.isEntering || this.isDying || !this.active) return;

        const topHull = this.getTopHullBounds();
        const bottomHull = this.getBottomHullBounds();
        const shieldBounds = this.getShieldBounds();
        const coreHitbox = this.getCoreBounds();

        if (typeof Laser !== 'undefined' && bullet instanceof Laser) {
            if (bullet.bossHitCooldown && bullet.bossHitCooldown > 0) {
                bullet.bossHitCooldown--;
                return;
            }
            bullet.bossHitCooldown = 16;
        }

        const isDouble = bullet.isDouble || (typeof player !== 'undefined' && player && player.weaponType === 'DOUBLE');
        const shieldDamage = isDouble ? 2 : 1;

        // 1. 前面4枚の遮蔽板への命中判定
        if (this.shields > 0 && shieldBounds && checkCollision(bullet, shieldBounds)) {
            if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) {
                bullet.active = false;
            }
            const hitX = Math.min(bullet.x + bullet.width, shieldBounds.x);
            const destroyed = this.hitShield(shieldDamage);
            if (destroyed) {
                if (typeof createExplosion === 'function') {
                    createExplosion(hitX, bullet.y, '#c6ad7b');
                    createExplosion(hitX, bullet.y, '#ffaa00');
                }
                if (typeof addScore === 'function') {
                    addScore(1000, hitX, bullet.y, '#ffea00');
                }
                if (typeof Sound !== 'undefined' && typeof Sound.playShieldBreak === 'function') {
                    Sound.playShieldBreak();
                }
            } else {
                if (typeof createExplosion === 'function') {
                    createExplosion(hitX, bullet.y, '#ffffaa');
                }
                if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') {
                    Sound.playBossHit();
                }
            }
            return;
        }

        // 2. 遮蔽板全破壊後のコア直撃判定
        if (this.shields === 0 && checkCollision(bullet, coreHitbox)) {
            if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) {
                bullet.active = false;
            }
            this.hitCore(1);
            if (typeof createExplosion === 'function') {
                createExplosion(bullet.x + bullet.width / 2, bullet.y, '#52adef');
            }
            if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') {
                Sound.playBossHit();
            }
            return;
        }

        // 3. 上下無敵装甲アームへの弾かれ判定
        if (checkCollision(bullet, topHull) || checkCollision(bullet, bottomHull)) {
            if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) {
                bullet.active = false;
                if (typeof createExplosion === 'function') {
                    createExplosion(bullet.x, bullet.y, '#8c948c');
                }
                if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') {
                    Sound.playBossHit();
                }
            }
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();

        if (this.isDying) {
            ctx.translate((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
            if (Math.floor(Date.now() / 60) % 2 === 0) {
                ctx.filter = 'brightness(2.3) saturate(2.0)';
            }
        }

        const cx = this.x;
        const cy = this.y;

        // 1985年AC版『グラディウス』ビッグコア完全再現描画（船体＋動的4枚遮蔽板＋ブルーコア）
        if (typeof drawOriginalBigCore === 'function') {
            drawOriginalBigCore(ctx, this);
        }

        ctx.restore();

        this.bullets.forEach(b => b.draw(ctx));
    }
}

// ==========================================
// 7. Stage4 クラス（4面・逆火山ステージ全体進行統括）
// ==========================================
class Stage4 {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;

        // 'STAGE' -> 'JELLYFISH_RUSH' (ボス前の大型クラゲロボ順次巡回ラッシュ) -> 'POST_RUSH' -> 'BOSS' -> 'ALL_CLEAR'
        this.state = 'STAGE';
        this.stageTime = 0;

        this.terrain = new InvertedVolcanoTerrain(canvasWidth, canvasHeight);
        this.boss = null;
        this.active = true;

        // 浮遊大陸（3基）の出現タイミング（開幕20秒の空中戦後に順次出現）
        this.islandSpawnTimes = [27000, 36500, 45500];
        this.islandSpawnedCount = 0;

        // ボス前：大型クラゲロボット（アイアンメイデン）順次出現＆画面全域巡回ラッシュ管理
        this.maidenWaveTimer = 0;
        this.maidenWaveCount = 0;
        this.jellyfishRushTimer = 0;
        this.postRushTimer = 0;
        this.stageClearTimer = 0;

        this.flyingTimer = 0;
    }

    start() {
        this.state = 'STAGE';
        this.stageTime = 0;
        this.active = true;
        this.boss = null;
        this.islandSpawnedCount = 0;
        this.maidenWaveTimer = 0;
        this.maidenWaveCount = 0;
        this.jellyfishRushTimer = 0;
        this.postRushTimer = 0;
        this.stageClearTimer = 0;
        this.flyingTimer = 0;

        this.terrain.start();
    }

    // ★ボス前の大型傘＆ボディメカ巡回場面へ突入（スクロールを止め、右上から整然と1列で2倍の数＝20機出現させて画面を巡回させる）
    _enterPatrolRush() {
        this.active = true;
        this.boss = null;
        if (!this.terrain.active) {
            this.terrain.start();
        }
        this.terrain.preparePatrolArena(); // ★スクロール完全停止 (scrollSpeed = 0) ＆ 巡回スペース確保
        this.islandSpawnedCount = this.islandSpawnTimes.length;

        // 画面上に残っていた通常の雑魚・火山を整理し、大型メカの整然とした巡回に集中させる
        if (typeof enemies !== 'undefined' && Array.isArray(enemies)) {
            enemies.forEach(e => {
                if (!(e instanceof IronMaidenEnemy)) {
                    e.active = false;
                }
            });
        }

        this.state = 'JELLYFISH_RUSH';
        this.stageTime = 53000;
        this.jellyfishRushTimer = 28000; // 28秒間の巡回フェーズ
        this.maidenWaveTimer = 0;
        this.maidenWaveCount = 1;

        // 右上から従来の2倍（20機）の大型傘＆ボディメカが一定間隔(24フレームおき)で整然と1列で出現し、画面を巡回する！
        new IronMaidenSquad(20, 24);

        // 傘の巡回シーンのBGMはボスBGM（Aircraft Carrier）を再生！
        if (typeof Sound !== 'undefined' && typeof Sound.playBossBgm === 'function') {
            Sound.playBossBgm();
        }
    }

    // ★iPadボタンやショートカットから即座に「ボス前の大型傘＆ボディメカ巡回場面」を開始するヘルパー
    startJellyfishRush() {
        this._enterPatrolRush();
    }

    update(dt) {
        if (!this.active) return;

        if (this.state === 'STAGE') {
            this.stageTime += dt;

            // 1. 開幕20秒間の宇宙空中戦の後、天地逆転した逆火山地形が出現＆4面BGM（Free Flyer）開始！
            if (this.stageTime >= 20000 && !this.terrain.wallActive) {
                this.terrain.startWalls();
                if (typeof Sound !== 'undefined' && typeof Sound.playStage4Bgm === 'function') {
                    Sound.playStage4Bgm();
                }
            }

            const canSpawnTerrainEnemies = (this.stageTime >= 20500 && this.stageTime < 51500);
            this.terrain.update(dt, canSpawnTerrainEnemies);

            // 2. 空中編隊の出現（開幕20秒は激しい宇宙空中戦、地形突入後もカプセル補給編隊が出現）
            if (this.stageTime < 51500) {
                this.updateFlyingEnemies(dt);
            }

            // 3. 中空の逆火山・浮遊大陸（4門レーザー砲台付き）を3基順次出現！
            if (this.islandSpawnedCount < this.islandSpawnTimes.length &&
                this.stageTime >= this.islandSpawnTimes[this.islandSpawnedCount]) {
                const idx = this.islandSpawnedCount;
                const heights = [255, 195, 290];
                const widths = [265, 285, 295];
                const thicks = [68, 74, 70];
                const island = new InvertedFloatingIsland(
                    this.width + 50,
                    heights[idx],
                    widths[idx],
                    thicks[idx],
                    this.terrain.scrollSpeed
                );
                this.terrain.floatingIslands.push(island);
                this.islandSpawnedCount++;
            }

            // 4. ★53秒経過で画面スクロールを止め、右上から大型の傘＆ボディメカが20機整然と出現して巡回する場面へ突入！
            if (this.stageTime >= 53000) {
                this._enterPatrolRush();
            }

        } else if (this.state === 'JELLYFISH_RUSH') {
            // ★この場面はスクロールを止める (scrollSpeed = 0)
            this.terrain.scrollSpeed = 0;
            this.terrain.update(dt, false);
            this.jellyfishRushTimer -= dt;

            let activeMaidenCount = 0;
            if (typeof enemies !== 'undefined' && Array.isArray(enemies)) {
                for (let i = 0; i < enemies.length; i++) {
                    if (enemies[i].active && enemies[i] instanceof IronMaidenEnemy) {
                        activeMaidenCount++;
                    }
                }
            }

            // 巡回メカがすべて退場／撃破されるか、制限時間が経過したらスクロールを再開してボス戦へ！
            if (this.jellyfishRushTimer <= 0 || (this.jellyfishRushTimer < 22000 && activeMaidenCount === 0)) {
                this.jellyfishRushTimer = 0;
                this.terrain.scrollSpeed = 4.2;
                this.terrain.stopGenerating();
                this.state = 'POST_RUSH';
                this.postRushTimer = 0;
            }

        } else if (this.state === 'POST_RUSH' || this.state === 'POST_VOLCANO') {
            this.postRushTimer += dt;
            this.terrain.update(dt, false);

            if (this.postRushTimer >= 3800 || !this.terrain.wallActive) {
                this.state = 'BOSS';
                this.terrain.wallActive = false;
                if (typeof Sound !== 'undefined' && typeof Sound.playBossBgm === 'function') {
                    Sound.playBossBgm();
                }
                this.boss = new Stage4Boss(this.width, this.height / 2);
            }

        } else if (this.state === 'BOSS') {
            this.terrain.update(dt, false);

            if (this.boss) {
                this.boss.update();
                if (!this.boss.active) {
                    this.state = 'ALL_CLEAR';
                    this.stageClearTimer = 0;
                    if (typeof addScore === 'function') {
                        addScore(100000, this.width / 2, this.height / 2 - 40, '#ffea00');
                    }
                    setTimeout(() => {
                        if (this.active && typeof Sound !== 'undefined' && typeof Sound.playStage4Bgm === 'function') {
                            Sound.playStage4Bgm();
                        }
                    }, 650);
                }
            }

        } else if (this.state === 'ALL_CLEAR') {
            this.terrain.update(dt, false);
            this.stageClearTimer += dt;
        }
    }

    updateFlyingEnemies(dt) {
        this.flyingTimer += dt;
        const interval = this.terrain.wallActive ? 1050 : 820;
        if (this.flyingTimer < interval) return;
        this.flyingTimer = 0;

        const roll = Math.random();
        const safeY = this.terrain.wallActive
            ? Math.random() * (this.terrain.baseBottomY - this.terrain.baseTopY - 150) + this.terrain.baseTopY + 75
            : Math.random() * (this.height - 240) + 120;

        if (roll < 0.38) {
            if (typeof Formation !== 'undefined') {
                new Formation(safeY, 4);
            }
        } else if (roll < 0.65) {
            if (typeof GarunFormation !== 'undefined') {
                new GarunFormation(safeY, Math.random() < 0.5, 4);
            }
        } else if (roll < 0.88) {
            if (typeof ZabSquad !== 'undefined') {
                new ZabSquad('ANYWHERE', safeY, 3);
            }
        } else {
            if (typeof RugraEnemy !== 'undefined' && typeof enemies !== 'undefined') {
                enemies.push(new RugraEnemy(this.width, safeY));
            }
        }
    }

    checkCollision(rect) {
        if (this.terrain && this.terrain.wallActive) {
            if (this.terrain.checkCollision(rect)) return true;
        }
        return false;
    }

    draw(ctx) {
        if (this.terrain) {
            this.terrain.draw(ctx);
        }

        // 1. 開幕ステージタイトル演出（0〜4.2秒）
        if (this.state === 'STAGE' && this.stageTime < 4200) {
            const alpha = Math.min(1, Math.sin((this.stageTime / 4200) * Math.PI));
            ctx.save();
            ctx.textAlign = 'center';

            ctx.font = 'bold 36px "Courier New", monospace';
            ctx.fillStyle = `rgba(255, 120, 30, ${alpha})`;
            ctx.shadowColor = '#ff3300';
            ctx.shadowBlur = 16;
            ctx.fillText('STAGE 4 : INVERTED VOLCANO', this.width / 2, this.height / 2 - 40);

            ctx.font = 'bold 18px "Courier New", monospace';
            ctx.fillStyle = `rgba(255, 235, 120, ${alpha})`;
            ctx.shadowColor = '#ff8800';
            ctx.shadowBlur = 8;
            ctx.fillText('BEWARE OF JUMPERS, CEILING VOLCANOES & IRON MAIDENS!', this.width / 2, this.height / 2 + 10);

            ctx.restore();
        }

        // 2. ボス前：大型傘＆ボディ重装メカ（アイアンメイデン）整然巡回HUD表示
        if (this.state === 'JELLYFISH_RUSH') {
            ctx.save();
            const remainSec = Math.max(0, (this.jellyfishRushTimer / 1000)).toFixed(1);
            const pulse = Math.sin(Date.now() * 0.008);

            ctx.fillStyle = 'rgba(2, 12, 28, 0.72)';
            ctx.fillRect(this.width / 2 - 275, 12, 550, 52);
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.7 + pulse * 0.3})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(this.width / 2 - 275, 12, 550, 52);

            ctx.textAlign = 'center';
            ctx.font = 'bold 19px "Courier New", monospace';
            ctx.fillStyle = '#38bdf8';
            ctx.shadowColor = '#0284c7';
            ctx.shadowBlur = 10;
            ctx.fillText('WARNING: HEAVY ARMORED MECH PATROL IN PROGRESS!', this.width / 2, 34);

            ctx.font = 'bold 16px "Courier New", monospace';
            ctx.fillStyle = '#fde047';
            ctx.shadowColor = '#ea580c';
            ctx.shadowBlur = 8;
            ctx.fillText(`SCROLL LOCKED - BOSS IN : ${remainSec}s`, this.width / 2, 55);

            ctx.restore();
        } else if (this.state === 'POST_RUSH' || this.state === 'POST_VOLCANO') {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.font = 'bold 22px "Courier New", monospace';
            ctx.fillStyle = '#00ffff';
            ctx.shadowColor = '#0088ff';
            ctx.shadowBlur = 10;
            ctx.fillText('PATROL UNIT CLEARED - MAGMA BIG CORE APPROACHING!', this.width / 2, 48);
            ctx.restore();
        }

        // 3. ボスの描画
        if (this.state === 'BOSS' && this.boss) {
            this.boss.draw(ctx);
        }

        // 4. STAGE 4 ALL CLEAR 演出
        if (this.state === 'ALL_CLEAR') {
            ctx.save();
            ctx.textAlign = 'center';

            ctx.font = 'bold 44px "Courier New", monospace';
            ctx.fillStyle = '#ffea00';
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 20;
            ctx.fillText('STAGE 4 ALL CLEAR!', this.width / 2, this.height / 2 - 80);

            ctx.font = 'bold 26px "Courier New", monospace';
            ctx.fillStyle = '#00ffee';
            ctx.shadowColor = '#0088ff';
            ctx.shadowBlur = 12;
            ctx.fillText('CONGRATULATIONS! INVERTED VOLCANO CONQUERED!', this.width / 2, this.height / 2 - 20);

            ctx.font = 'bold 20px "Courier New", monospace';
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 0;
            ctx.fillText('ALL MISSIONS COMPLETED!', this.width / 2, this.height / 2 + 30);

            ctx.font = 'bold 18px "Courier New", monospace';
            ctx.fillStyle = '#ffcc00';
            ctx.fillText('SPECIAL MISSION BONUS : 100,000 PTS', this.width / 2, this.height / 2 + 70);

            ctx.restore();
        }
    }
}

// グローバル公開
window.JumperEnemy = JumperEnemy;
window.IronMaidenEnemy = IronMaidenEnemy;
window.IronMaidenSquad = IronMaidenSquad;
window.InvertedVolcanoRock = InvertedVolcanoRock;
window.InvertedVolcano = InvertedVolcano;
window.InvertedSuperVolcano = InvertedSuperVolcano;
window.InvertedFloatingIsland = InvertedFloatingIsland;
window.InvertedVolcanoTerrain = InvertedVolcanoTerrain;
window.Stage4Boss = Stage4Boss;
window.Stage4 = Stage4;
let stage4 = null;
window.stage4 = stage4;
