class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
        this.life = 1.0; // 1.0 = 100%
        this.decay = Math.random() * 0.05 + 0.02;
        this.color = color;
        this.size = Math.random() * 3 + 2;
        this.active = true;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        if (this.life <= 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

// グラディウス風 超巨大連鎖火炎爆発
class BossExplosion {
    constructor(x, y, maxRadius = 55) {
        this.x = x;
        this.y = y;
        this.radius = 6;
        this.maxRadius = maxRadius;
        this.growthRate = 2.4 + Math.random() * 1.8;
        this.alpha = 1.0;
        this.active = true;
        this.sparks = [];
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 2 + Math.random() * 4;
            this.sparks.push({
                x: 0,
                y: 0,
                vx: Math.cos(angle) * spd,
                vy: Math.sin(angle) * spd,
                size: 2 + Math.random() * 3
            });
        }
    }

    update() {
        this.radius += this.growthRate;
        if (this.radius > this.maxRadius * 0.55) {
            this.alpha -= 0.045;
        }
        if (this.alpha <= 0 || this.radius >= this.maxRadius) {
            this.active = false;
        }

        this.sparks.forEach(s => {
            s.x += s.vx;
            s.y += s.vy;
        });
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);

        // 1. グラディウス伝統の巨大火炎球（多層ラジアルグラデーション）
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        grad.addColorStop(0, '#ffffff');       // コアの超高熱白熱
        grad.addColorStop(0.25, '#ffff55');    // 眩いレモンイエロー
        grad.addColorStop(0.6, '#ff4400');     // 爆熱オレンジ
        grad.addColorStop(0.85, '#aa1100');    // 真紅の火炎外周
        grad.addColorStop(1, 'rgba(40, 0, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // 2. 衝撃波リング（光輪）
        ctx.strokeStyle = `rgba(255, 230, 180, ${this.alpha * 0.7})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 1.15, 0, Math.PI * 2);
        ctx.stroke();

        // 3. 火の粉スパーク
        ctx.fillStyle = '#ffffaa';
        this.sparks.forEach(s => {
            ctx.fillRect(this.x + s.x, this.y + s.y, s.size, s.size);
        });

        ctx.restore();
    }
}

// ==========================================================
// ボス撃破時の部位破壊・飛散デブリ＆ステージ固有エフェクト
// Stage 1: 装甲プレート・砲台アーム・ギア・ピストン・コア破片などの機械部品がバラバラに飛散
// Stage 2: 機械触手節・モノリス石板に加え、内部から巨石・岩塊・大量の砂塵が四散
// Stage 3: 神経を引きずった巨大目玉が飛び出し、ベトベトでドロドロした粘着質な内臓・血液塊が糸を引きながら溢れ出る
// ==========================================================
class BossDebris {
    constructor(x, y, kind, options = {}) {
        this.x = x;
        this.y = y;
        this.originX = options.originX !== undefined ? options.originX : x;
        this.originY = options.originY !== undefined ? options.originY : y;
        this.kind = kind;
        this.stage = options.stage || 1;
        const angle = (options.angle !== undefined) ? options.angle : (Math.random() * Math.PI * 2);
        const speed = (options.speed !== undefined) ? options.speed : (2.2 + Math.random() * 5.8);
        this.vx = (options.vx !== undefined) ? options.vx : Math.cos(angle) * speed;
        this.vy = (options.vy !== undefined) ? options.vy : Math.sin(angle) * speed;
        this.gravity = (options.gravity !== undefined) ? options.gravity : 0.04;
        this.drag = (options.drag !== undefined) ? options.drag : 0.992;
        this.angle = (options.rot !== undefined) ? options.rot : (Math.random() * Math.PI * 2);
        this.vAngle = (options.vAngle !== undefined) ? options.vAngle : ((Math.random() - 0.5) * 0.22);
        this.size = options.size || (14 + Math.random() * 16);
        this.color = options.color || '#94a3b8';
        this.subColor = options.subColor || '#38bdf8';
        this.life = 1.0;
        this.decay = options.decay || (0.0055 + Math.random() * 0.005);
        this.active = true;
        this.age = 0;
        this.wobblePhase = Math.random() * Math.PI * 2;

        // 粘着質・有機物かどうか（3面の内臓・脳・粘液血塊・生体触手・目玉）
        this.isOrganic = (
            this.kind === 'VISCERA_BRAIN' ||
            this.kind === 'VISCERA_ORGAN' ||
            this.kind === 'VISCERA_INTESTINE' ||
            this.kind === 'BIO_TENTACLE_CHUNK' ||
            this.kind === 'EYEBALL_CHUNK' ||
            this.kind === 'BLOOD_SPLATTER' ||
            this.kind === 'BLOOD_MIST'
        );

        // ドロドロと糸を引く軌跡履歴（粘着血塊・内臓塊用）
        this.trail = [];
        this.maxTrail = (this.kind === 'BLOOD_SPLATTER') ? 12 : (this.isOrganic ? 9 : 0);
        for (let t = 0; t < this.maxTrail; t++) {
            this.trail.push({ x: this.x, y: this.y });
        }

        // 内臓から垂れ下がるドロドロの粘液・血の糸（重力で下へ伸びる）
        this.dripStrings = [];
        if (this.kind === 'VISCERA_BRAIN' || this.kind === 'VISCERA_ORGAN' || this.kind === 'VISCERA_INTESTINE' || this.kind === 'BIO_TENTACLE_CHUNK') {
            const dripCount = 2 + Math.floor(Math.random() * 2);
            for (let d = 0; d < dripCount; d++) {
                this.dripStrings.push({
                    ox: (Math.random() - 0.5) * this.size * 1.1,
                    oy: (Math.random() * 0.4) * this.size,
                    len: 8 + Math.random() * 14,
                    growSpeed: 0.35 + Math.random() * 0.45,
                    maxLen: 28 + Math.random() * 26,
                    thickness: 2.5 + Math.random() * 2.5,
                    phase: Math.random() * Math.PI * 2
                });
            }
        }

        // 3面：飛び出す目玉（EYEBALL_CHUNK）が後ろに引きずる長大な視神経コード＆千切れた血管束
        this.nerveNodes = [];
        if (this.kind === 'EYEBALL_CHUNK') {
            const nodeCount = 15;
            for (let i = 0; i < nodeCount; i++) {
                this.nerveNodes.push({
                    x: this.x + i * 3,
                    y: this.y + i * 1.5,
                    vx: 0,
                    vy: 0
                });
            }
        }

        // 岩石・装甲・内臓のランダム多角形／有機ローブ頂点生成
        this.polyPoints = [];
        const vertCount = options.vertCount || (this.isOrganic ? 10 : 6);
        for (let i = 0; i < vertCount; i++) {
            const a = (Math.PI * 2 * i) / vertCount + (this.isOrganic ? 0 : (Math.random() - 0.5) * 0.35);
            const rad = this.size * (this.isOrganic ? (0.82 + Math.sin(i * 1.7) * 0.22) : (0.65 + Math.random() * 0.45));
            this.polyPoints.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad, baseAngle: a, baseRad: rad });
        }
    }

    update() {
        this.age++;

        // 軌跡履歴の記録（粘着質な血の尾・粘液ストリーム）
        if (this.maxTrail > 0) {
            this.trail.unshift({ x: this.x, y: this.y });
            if (this.trail.length > this.maxTrail) {
                this.trail.pop();
            }
        }

        this.vx *= this.drag;
        this.vy = this.vy * this.drag + this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.vAngle;
        this.life -= this.decay;

        if (this.life <= 0 || this.y > 740 || this.x < -180 || this.x > 980) {
            this.active = false;
            return;
        }

        // 目玉が引きずる視神経コードの物理追従シミュレーション（重力で垂れ下がりつつうねりながら目玉に引っ張られる）
        if (this.kind === 'EYEBALL_CHUNK' && this.nerveNodes.length > 0) {
            const segLen = 9.5;
            // 先頭ノードは目玉の裏側（進行方向の逆側または後方）に接続
            const backAngle = Math.atan2(this.vy, this.vx) + Math.PI;
            this.nerveNodes[0].x = this.x + Math.cos(backAngle) * (this.size * 0.75);
            this.nerveNodes[0].y = this.y + Math.sin(backAngle) * (this.size * 0.75);

            for (let i = 1; i < this.nerveNodes.length; i++) {
                const prev = this.nerveNodes[i - 1];
                const cur = this.nerveNodes[i];
                // 重力と粘性抵抗＋神経の痙攣うねり
                cur.vy = (cur.vy + 0.14) * 0.92;
                cur.vx = (cur.vx + Math.sin(this.age * 0.22 + i * 0.65) * 0.18) * 0.92;
                cur.x += cur.vx;
                cur.y += cur.vy;

                const dx = cur.x - prev.x;
                const dy = cur.y - prev.y;
                const dist = Math.hypot(dx, dy) || 0.001;
                if (dist > segLen) {
                    const pull = (dist - segLen) / dist;
                    cur.x -= dx * pull * 0.78;
                    cur.y -= dy * pull * 0.78;
                    cur.vx -= dx * pull * 0.15;
                    cur.vy -= dy * pull * 0.15;
                }
            }
        }

        // 内臓から垂れ下がるドロドロの粘液・血の糸の伸長と滴り
        if (this.dripStrings.length > 0) {
            for (let i = 0; i < this.dripStrings.length; i++) {
                const ds = this.dripStrings[i];
                ds.len += ds.growSpeed;
                if (ds.len >= ds.maxLen) {
                    // 伸び切った粘液の先端からボタッと重い血塊がちぎれて落ちる
                    if (typeof particles !== 'undefined' && particles.length < 880) {
                        particles.push(new BossDebris(
                            this.x + ds.ox,
                            this.y + ds.oy + ds.len,
                            'BLOOD_SPLATTER',
                            {
                                stage: 3,
                                vx: this.vx * 0.35 + (Math.random() - 0.5) * 0.8,
                                vy: Math.max(0.5, this.vy * 0.4) + 1.2,
                                gravity: 0.085,
                                drag: 0.965,
                                size: 6.5 + Math.random() * 5.0,
                                decay: 0.014,
                                color: '#b91c1c'
                            }
                        ));
                    }
                    ds.len = 6 + Math.random() * 6;
                }
            }
        }

        // 2面：飛散する岩石や石板からパラパラと砂粒がこぼれ落ちる
        if ((this.kind === 'ROCK_BOULDER' || this.kind === 'MONOLITH_SLAB') && this.age % 3 === 0 && typeof particles !== 'undefined') {
            particles.push(new BossDebris(
                this.x + (Math.random() - 0.5) * this.size * 0.6,
                this.y + (Math.random() - 0.5) * this.size * 0.6,
                'SAND_GRAIN',
                {
                    stage: 2,
                    vx: this.vx * 0.25 + (Math.random() - 0.5) * 2.2,
                    vy: 0.5 + Math.random() * 2.0,
                    gravity: 0.06,
                    size: 2.5 + Math.random() * 2.5,
                    decay: 0.022,
                    color: Math.random() < 0.5 ? '#e6ccb2' : '#d4a373'
                }
            ));
        }
    }

    // 近くの3面内臓・粘液血塊同士の間に張り巡らされるベトベトの粘液糸・血の膜を描画
    _drawStickyWebsToNeighbors(ctx) {
        if (typeof particles === 'undefined' || !Array.isArray(particles)) return;
        const myKinds = (this.kind === 'VISCERA_BRAIN' || this.kind === 'VISCERA_ORGAN' || this.kind === 'VISCERA_INTESTINE' || this.kind === 'BIO_TENTACLE_CHUNK');
        if (!myKinds) return;

        let connected = 0;
        for (let i = 0; i < particles.length; i++) {
            const other = particles[i];
            if (!other || other === this || !other.active || other.stage !== 3 || !other.isOrganic) continue;
            if (other.kind === 'BLOOD_MIST') continue;
            // 重複描画を避けるため座標順序で片方向のみ描画
            if (other.x < this.x) continue;

            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const dist = Math.hypot(dx, dy);
            const maxWebDist = 115;
            if (dist > 12 && dist < maxWebDist) {
                const ratio = 1 - dist / maxWebDist;
                const midX = (this.x + other.x) * 0.5;
                // 重力で中央がドロッと垂れ下がるカテナリー曲線
                const sag = (1 - ratio) * 26 + Math.sin(this.age * 0.15 + dist * 0.05) * 5;
                const midY = (this.y + other.y) * 0.5 + sag;

                ctx.save();
                ctx.globalAlpha = Math.min(this.life, other.life) * ratio * 0.85;

                // 外側の太い粘着血膜
                ctx.strokeStyle = '#9f1239';
                ctx.lineWidth = Math.max(1.2, ratio * 6.5);
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.quadraticCurveTo(midX, midY, other.x, other.y);
                ctx.stroke();

                // 内側の濡れた光沢粘液ライン
                ctx.strokeStyle = 'rgba(253, 164, 175, 0.75)';
                ctx.lineWidth = Math.max(0.6, ratio * 2.0);
                ctx.beginPath();
                ctx.moveTo(this.x, this.y - 1);
                ctx.quadraticCurveTo(midX, midY - 1.5, other.x, other.y - 1);
                ctx.stroke();

                // 粘液の糸の途中に絡みつくドロッとした血の玉
                ctx.fillStyle = '#be123c';
                const bx = 0.25 * this.x + 0.5 * midX + 0.25 * other.x;
                const by = 0.25 * this.y + 0.5 * midY + 0.25 * other.y;
                ctx.beginPath();
                ctx.arc(bx, by, Math.max(2, ratio * 4.5), 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
                connected++;
                if (connected >= 3) break;
            }
        }
    }

    // 内臓塊から下へドロドロと糸を引いて垂れ下がる粘着血液ストリングの描画
    _drawHangingSlimeDrips(ctx) {
        if (!this.dripStrings || this.dripStrings.length === 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, this.life * 1.2));
        for (let i = 0; i < this.dripStrings.length; i++) {
            const ds = this.dripStrings[i];
            const sx = this.x + ds.ox;
            const sy = this.y + ds.oy;
            const sway = Math.sin(this.age * 0.14 + ds.phase) * 4 - this.vx * 1.8;
            const ex = sx + sway;
            const ey = sy + ds.len;

            // 粘着質の太い血の糸
            ctx.strokeStyle = '#99001b';
            ctx.lineWidth = ds.thickness;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.quadraticCurveTo(sx + sway * 0.4, sy + ds.len * 0.55, ex, ey);
            ctx.stroke();

            // 先端に溜まるぷっくりした粘液血滴（ティアドロップ型）
            const dropR = ds.thickness * 1.45;
            const dGrad = ctx.createRadialGradient(ex - dropR * 0.3, ey - dropR * 0.3, 0.5, ex, ey, dropR);
            dGrad.addColorStop(0, '#fda4af');
            dGrad.addColorStop(0.35, '#e11d48');
            dGrad.addColorStop(1, '#4c0519');
            ctx.fillStyle = dGrad;
            ctx.beginPath();
            ctx.arc(ex, ey, dropR, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    draw(ctx) {
        if (!this.active || this.life <= 0) return;

        // 3面の有機内臓パーツ同士の粘着ネット＆垂れ下がる粘液糸をワールド座標で先に描画
        if (this.stage === 3 && this.isOrganic) {
            this._drawStickyWebsToNeighbors(ctx);
            this._drawHangingSlimeDrips(ctx);
        }

        // 目玉（EYEBALL_CHUNK）の引きずる長大な視神経コードはワールド座標でうねりながら描画
        if (this.kind === 'EYEBALL_CHUNK' && this.nerveNodes.length > 1) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, this.life * 1.3));
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // 1. 視神経束の外周を覆うドロドロの血膜・肉片シース
            ctx.strokeStyle = 'rgba(136, 19, 55, 0.85)';
            ctx.lineWidth = 11;
            ctx.beginPath();
            this.nerveNodes.forEach((n, idx) => {
                if (idx === 0) ctx.moveTo(n.x, n.y);
                else ctx.lineTo(n.x, n.y);
            });
            ctx.stroke();

            // 2. 太く生々しい視神経幹コード本体
            ctx.strokeStyle = '#e11d48';
            ctx.lineWidth = 6.5;
            ctx.beginPath();
            this.nerveNodes.forEach((n, idx) => {
                if (idx === 0) ctx.moveTo(n.x, n.y);
                else ctx.lineTo(n.x, n.y);
            });
            ctx.stroke();

            // 3. 視神経内部の白ピンクの神経髄鞘ハイライト（濡れた粘液感）
            ctx.strokeStyle = '#fecdd3';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            this.nerveNodes.forEach((n, idx) => {
                if (idx === 0) ctx.moveTo(n.x - 1, n.y - 1);
                else ctx.lineTo(n.x - 1, n.y - 1);
            });
            ctx.stroke();

            // 4. 視神経の節々に絡みつく血塊と、引きちぎれた枝分かれ神経繊維
            for (let i = 2; i < this.nerveNodes.length; i += 2) {
                const n = this.nerveNodes[i];
                const blobR = Math.max(2.5, 6.5 - i * 0.3);
                ctx.fillStyle = (i % 4 === 0) ? '#be123c' : '#881337';
                ctx.beginPath();
                ctx.arc(n.x, n.y, blobR, 0, Math.PI * 2);
                ctx.fill();

                // 枝分かれして垂れ下がる毛細神経・血管
                const side = (i % 4 === 0) ? 1 : -1;
                const branchLen = 10 + (this.nerveNodes.length - i) * 1.2;
                const sway = Math.sin(this.age * 0.25 + i) * 5;
                ctx.strokeStyle = '#f43f5e';
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(n.x, n.y);
                ctx.quadraticCurveTo(n.x + sway, n.y + branchLen * 0.6, n.x + side * 8 + sway, n.y + branchLen);
                ctx.stroke();
            }
            ctx.restore();
        }

        // 3面のドロドロ粘着血液（BLOOD_SPLATTER）はパラパラの点ではなく、
        // 軌跡に沿って糸を引きながらうねるメタボール状の粘液塊としてワールド座標描画！
        if (this.kind === 'BLOOD_SPLATTER') {
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, this.life * 1.25));
            const s = this.size;

            // 1. 伸びる粘着質の血の尾（数珠つなぎのメタボール＆太い粘液リボン）
            if (this.trail.length > 1) {
                ctx.strokeStyle = this.color || '#99001b';
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                for (let i = 0; i < this.trail.length - 1; i++) {
                    const p0 = this.trail[i];
                    const p1 = this.trail[i + 1];
                    const ratio = 1 - i / this.trail.length;
                    ctx.lineWidth = Math.max(1.5, s * 1.35 * ratio);
                    ctx.beginPath();
                    ctx.moveTo(p0.x, p0.y);
                    ctx.lineTo(p1.x, p1.y);
                    ctx.stroke();

                    // 粘液の途中にできるドロッとした玉（凝血塊）
                    if (i % 3 === 1) {
                        ctx.fillStyle = this.color || '#b91c1c';
                        ctx.beginPath();
                        ctx.arc(p0.x, p0.y, s * 0.65 * ratio, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // 血の尾の濡れたハイライト筋
                ctx.strokeStyle = 'rgba(255, 180, 195, 0.55)';
                ctx.lineWidth = Math.max(0.8, s * 0.28);
                ctx.beginPath();
                for (let i = 0; i < Math.min(5, this.trail.length); i++) {
                    const p = this.trail[i];
                    if (i === 0) ctx.moveTo(p.x - 1, p.y - 1);
                    else ctx.lineTo(p.x - 1, p.y - 1);
                }
                ctx.stroke();
            }

            // 2. 先頭のぷっくりと歪む粘着血塊本体（アメーバ状に脈動）
            const stretchAngle = Math.atan2(this.vy, this.vx);
            const spd = Math.min(2.2, Math.hypot(this.vx, this.vy) * 0.15 + 1.0);
            ctx.translate(this.x, this.y);
            ctx.rotate(stretchAngle);

            const bGrad = ctx.createRadialGradient(-s * 0.25, -s * 0.25, 1, 0, 0, s * 1.25);
            bGrad.addColorStop(0, '#fda4af');
            bGrad.addColorStop(0.28, '#e11d48');
            bGrad.addColorStop(0.75, this.color || '#99001b');
            bGrad.addColorStop(1, '#3b0412');
            ctx.fillStyle = bGrad;
            ctx.beginPath();
            ctx.ellipse(0, 0, s * spd, s * (0.85 + Math.sin(this.age * 0.3 + this.wobblePhase) * 0.15), 0, 0, Math.PI * 2);
            ctx.fill();

            // 濡れたゼリー状の鏡面ハイライト
            ctx.fillStyle = 'rgba(255, 235, 240, 0.78)';
            ctx.beginPath();
            ctx.ellipse(-s * 0.2, -s * 0.28, s * 0.42, s * 0.18, -0.2, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
            return;
        }

        // 内臓・脳・生体触手も飛翔軌跡にベトベトの粘液尾を引く
        if ((this.kind === 'VISCERA_BRAIN' || this.kind === 'VISCERA_ORGAN' || this.kind === 'VISCERA_INTESTINE' || this.kind === 'BIO_TENTACLE_CHUNK') && this.trail.length > 2) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, this.life * 0.85));
            ctx.strokeStyle = 'rgba(159, 18, 57, 0.72)';
            ctx.lineCap = 'round';
            for (let i = 0; i < this.trail.length - 1; i++) {
                const p0 = this.trail[i];
                const p1 = this.trail[i + 1];
                const ratio = 1 - i / this.trail.length;
                ctx.lineWidth = Math.max(2, this.size * 0.75 * ratio);
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.stroke();
            }
            ctx.restore();
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, this.life * 1.25));
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const s = this.size;

        switch (this.kind) {
            case 'CANNON_ARM': {
                // 1面ボス：主砲レーザーアーム部品（重装甲カウル＋2連砲身＋エネルギースリット）
                const grad = ctx.createLinearGradient(-s, -s * 0.5, s, s * 0.5);
                grad.addColorStop(0, '#cbd5e1');
                grad.addColorStop(0.5, '#475569');
                grad.addColorStop(1, '#1e293b');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(-s, -s * 0.35);
                ctx.lineTo(s * 0.7, -s * 0.55);
                ctx.lineTo(s, s * 0.45);
                ctx.lineTo(-s * 0.6, s * 0.55);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // 折れた2連レーザー砲身
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(-s * 1.35, -s * 0.25, s * 0.5, s * 0.16);
                ctx.fillRect(-s * 1.35, s * 0.08, s * 0.5, s * 0.16);
                ctx.fillStyle = this.subColor || '#00ffff';
                ctx.fillRect(-s * 0.6, -s * 0.1, s * 0.9, s * 0.18);
                break;
            }

            case 'HULL_PLATE': {
                // メカ装甲プレート（リベット＆パネルライン付き金属破片）
                const grad = ctx.createLinearGradient(-s, -s, s, s);
                grad.addColorStop(0, '#e2e8f0');
                grad.addColorStop(0.45, this.color || '#64748b');
                grad.addColorStop(1, '#0f172a');
                ctx.fillStyle = grad;
                ctx.beginPath();
                this.polyPoints.forEach((p, idx) => {
                    if (idx === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                });
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 1.4;
                ctx.stroke();

                ctx.strokeStyle = this.subColor || '#00ffee';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(-s * 0.4, 0);
                ctx.lineTo(s * 0.4, 0);
                ctx.stroke();
                ctx.fillStyle = '#1e293b';
                ctx.beginPath();
                ctx.arc(-s * 0.3, -s * 0.25, 2, 0, Math.PI * 2);
                ctx.arc(s * 0.3, s * 0.25, 2, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'MECH_GEAR': {
                // 1面・2面：回転しながら飛び散る歯車・タービンギア部品
                ctx.fillStyle = '#64748b';
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 1.5;
                const teeth = 8;
                ctx.beginPath();
                for (let i = 0; i < teeth * 2; i++) {
                    const a = (Math.PI * i) / teeth;
                    const r = (i % 2 === 0) ? s : s * 0.72;
                    const px = Math.cos(a) * r;
                    const py = Math.sin(a) * r;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#0f172a';
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#38bdf8';
                ctx.stroke();
                break;
            }

            case 'PISTON_ROD': {
                // 機械シリンダー＆ピストンシャフト部品
                ctx.fillStyle = '#334155';
                ctx.fillRect(-s, -s * 0.28, s * 1.2, s * 0.56);
                ctx.strokeStyle = '#94a3b8';
                ctx.lineWidth = 1.2;
                ctx.strokeRect(-s, -s * 0.28, s * 1.2, s * 0.56);
                ctx.fillStyle = '#e2e8f0';
                ctx.fillRect(s * 0.2, -s * 0.14, s * 0.9, s * 0.28);
                ctx.fillStyle = '#ffaa00';
                ctx.beginPath();
                ctx.arc(-s * 0.7, 0, s * 0.18, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'CORE_SHARD': {
                // 砕け散るクリスタルコアの輝く破片
                ctx.shadowColor = this.color || '#00ffff';
                ctx.shadowBlur = 10;
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.moveTo(0, -s);
                ctx.lineTo(s * 0.65, 0);
                ctx.lineTo(0, s);
                ctx.lineTo(-s * 0.65, 0);
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = this.color || '#00ffff';
                ctx.lineWidth = 2;
                ctx.stroke();
                break;
            }

            case 'TENTACLE_JOINT': {
                // 2面・3面：バラバラにちぎれて飛ぶ機械触手の関節リング部品
                const segGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, s);
                segGrad.addColorStop(0, '#e2e8f0');
                segGrad.addColorStop(0.5, '#64748b');
                segGrad.addColorStop(1, '#0f172a');
                ctx.fillStyle = segGrad;
                ctx.fillRect(-s * 0.85, -s * 0.7, s * 1.7, s * 1.4);
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(-s * 0.85, -s * 0.7, s * 1.7, s * 1.4);

                ctx.fillStyle = this.subColor || '#00ffee';
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.32, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'TENTACLE_CLAW': {
                // 2面・3面：ちぎれた触手先端のメカニカルクロー砲門
                ctx.fillStyle = '#cbd5e1';
                ctx.beginPath();
                ctx.moveTo(-4, -s * 0.5);
                ctx.lineTo(s, -s * 0.8);
                ctx.lineTo(s * 0.6, -s * 0.15);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(-4, s * 0.5);
                ctx.lineTo(s, s * 0.8);
                ctx.lineTo(s * 0.6, s * 0.15);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = this.subColor || '#ffaa00';
                ctx.beginPath();
                ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'MONOLITH_SLAB': {
                // 2面：砕け飛ぶ古代モノリス巨石プレート（ルーン刻印入り）
                const g = ctx.createLinearGradient(-s, -s, s, s);
                g.addColorStop(0, '#94a3b8');
                g.addColorStop(0.5, '#475569');
                g.addColorStop(1, '#1e293b');
                ctx.fillStyle = g;
                ctx.fillRect(-s * 0.6, -s, s * 1.2, s * 2);
                ctx.strokeStyle = '#cbd5e1';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(-s * 0.6, -s, s * 1.2, s * 2);

                ctx.fillStyle = this.subColor || '#38bdf8';
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 6;
                ctx.fillRect(-s * 0.2, -s * 0.65, s * 0.4, s * 1.3);
                break;
            }

            case 'ROCK_BOULDER': {
                // 2面：ボスの内部から四散するゴツゴツした古代岩石・巨石塊
                const rGrad = ctx.createRadialGradient(-s * 0.25, -s * 0.25, s * 0.1, 0, 0, s);
                rGrad.addColorStop(0, '#d6ccc2');
                rGrad.addColorStop(0.45, this.color || '#8d8070');
                rGrad.addColorStop(0.85, '#4a4238');
                rGrad.addColorStop(1, '#26211c');
                ctx.fillStyle = rGrad;
                ctx.beginPath();
                this.polyPoints.forEach((p, idx) => {
                    if (idx === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                });
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#26211c';
                ctx.lineWidth = 1.6;
                ctx.stroke();

                ctx.strokeStyle = 'rgba(20, 15, 10, 0.65)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(-s * 0.35, -s * 0.2);
                ctx.lineTo(0, s * 0.05);
                ctx.lineTo(s * 0.3, -s * 0.15);
                ctx.stroke();
                break;
            }

            case 'SAND_CLOUD': {
                // 2面：内部から噴き出し四散する砂煙・砂塵クラウド
                const sandGrad = ctx.createRadialGradient(0, 0, s * 0.1, 0, 0, s);
                sandGrad.addColorStop(0, 'rgba(235, 210, 170, 0.75)');
                sandGrad.addColorStop(0.55, 'rgba(194, 160, 110, 0.45)');
                sandGrad.addColorStop(1, 'rgba(140, 110, 70, 0)');
                ctx.fillStyle = sandGrad;
                ctx.beginPath();
                ctx.arc(0, 0, s, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'SAND_GRAIN': {
                // 2面：無数に飛び散る砂粒・石つぶて
                ctx.fillStyle = this.color || '#e6ccb2';
                ctx.beginPath();
                ctx.arc(0, 0, s, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'MOAI_JAW_PART': {
                // 3面：砕け飛ぶ古代モアイ巨石顎＆金属牙パーツ（粘着肉片付き）
                const mGrad = ctx.createLinearGradient(-s, -s, s, s);
                mGrad.addColorStop(0, '#cbd5e1');
                mGrad.addColorStop(0.5, '#64748b');
                mGrad.addColorStop(1, '#1e293b');
                ctx.fillStyle = mGrad;
                ctx.beginPath();
                this.polyPoints.forEach((p, idx) => {
                    if (idx === 0) ctx.moveTo(p.x, p.y);
                    else ctx.lineTo(p.x, p.y);
                });
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#0f172a';
                ctx.lineWidth = 1.8;
                ctx.stroke();

                // 付着した金属牙とベトベトの血糊・肉塊
                ctx.fillStyle = '#e2e8f0';
                ctx.beginPath();
                ctx.moveTo(-s * 0.4, s * 0.4);
                ctx.lineTo(-s * 0.15, s * 0.95);
                ctx.lineTo(s * 0.1, s * 0.4);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#9f1239';
                ctx.beginPath();
                ctx.arc(s * 0.15, -s * 0.1, s * 0.42, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'BIO_TENTACLE_CHUNK': {
                // 3面：ぶつ切りになって蠢く粘着質な生体血管触手の肉塊
                const wobble = Math.sin(this.age * 0.25 + this.wobblePhase) * 0.16;
                const bGrad = ctx.createRadialGradient(-s * 0.2, -s * 0.2, 1, 0, 0, s * 1.2);
                bGrad.addColorStop(0, '#fda4af');
                bGrad.addColorStop(0.4, '#e11d48');
                bGrad.addColorStop(0.8, '#881337');
                bGrad.addColorStop(1, '#4c0519');
                ctx.fillStyle = bGrad;
                ctx.beginPath();
                ctx.ellipse(0, 0, s * (1.2 + wobble), s * (0.85 - wobble * 0.5), 0, 0, Math.PI * 2);
                ctx.fill();

                // 断面からドロッと溢れる凝血と引きちぎれた動脈
                ctx.strokeStyle = '#99001b';
                ctx.lineWidth = 4.2;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(s * 0.8, 0);
                ctx.quadraticCurveTo(s * 1.4, -s * 0.5, s * 1.85, s * 0.3);
                ctx.stroke();

                // 濡れた粘膜ハイライト
                ctx.fillStyle = 'rgba(255, 225, 235, 0.72)';
                ctx.beginPath();
                ctx.ellipse(-s * 0.25, -s * 0.25, s * 0.42, s * 0.16, -0.2, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'VISCERA_BRAIN': {
                // 3面：粘液にまみれて脈動しながら飛び散る生体脳みそ塊（大脳皮質の皺＋濡れた艶）
                const pulse = Math.sin(this.age * 0.22 + this.wobblePhase) * 0.14;
                const brGrad = ctx.createRadialGradient(-s * 0.25, -s * 0.25, 2, 0, 0, s * 1.2);
                brGrad.addColorStop(0, '#ffe4e6');
                brGrad.addColorStop(0.32, '#fb7185');
                brGrad.addColorStop(0.72, '#be123c');
                brGrad.addColorStop(1, '#4c0519');
                ctx.fillStyle = brGrad;

                // ぶよぶよと変形する多葉状の脳実質シェイプ
                ctx.beginPath();
                this.polyPoints.forEach((p, idx) => {
                    const rMod = 1 + Math.sin(this.age * 0.2 + idx * 1.3 + this.wobblePhase) * 0.15;
                    const px = Math.cos(p.baseAngle) * p.baseRad * rMod * (1.1 + pulse);
                    const py = Math.sin(p.baseAngle) * p.baseRad * rMod * (0.9 - pulse * 0.5);
                    if (idx === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                });
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#881337';
                ctx.lineWidth = 2.2;
                ctx.stroke();

                // 脳の溝（皺）に溜まったどす黒い粘着血
                ctx.strokeStyle = '#4c0519';
                ctx.lineWidth = 2.6;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(-s * 0.65, -s * 0.2);
                ctx.bezierCurveTo(-s * 0.2, -s * 0.6, s * 0.2, s * 0.3, s * 0.65, -s * 0.15);
                ctx.moveTo(-s * 0.55, s * 0.25);
                ctx.bezierCurveTo(-s * 0.1, -s * 0.15, s * 0.25, s * 0.6, s * 0.6, s * 0.2);
                ctx.stroke();

                // 粘液の濡れたハイライト光沢
                ctx.fillStyle = 'rgba(255, 235, 240, 0.78)';
                ctx.beginPath();
                ctx.ellipse(-s * 0.28, -s * 0.3, s * 0.38, s * 0.16, -0.3, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'VISCERA_ORGAN': {
                // 3面：ベトベトの粘膜に覆われドロドロと変形しながら溢れ出る内臓器官塊
                const wobble = Math.sin(this.age * 0.24 + this.wobblePhase) * 0.18;
                const orgGrad = ctx.createRadialGradient(-s * 0.28, -s * 0.28, 2, 0, 0, s * 1.25);
                orgGrad.addColorStop(0, '#fbcfe8');
                orgGrad.addColorStop(0.28, '#e11d48');
                orgGrad.addColorStop(0.7, '#881337');
                orgGrad.addColorStop(1, '#3b0764');
                ctx.fillStyle = orgGrad;

                // アメーバ状にうねる内臓サック
                ctx.beginPath();
                this.polyPoints.forEach((p, idx) => {
                    const rMod = 1 + Math.sin(this.age * 0.22 + idx * 1.1 + this.wobblePhase) * 0.18;
                    const px = Math.cos(p.baseAngle) * p.baseRad * rMod * (1.15 + wobble);
                    const py = Math.sin(p.baseAngle) * p.baseRad * rMod * (0.85 - wobble * 0.5);
                    if (idx === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                });
                ctx.closePath();
                ctx.fill();
                ctx.strokeStyle = '#500724';
                ctx.lineWidth = 2.2;
                ctx.stroke();

                // 絡みつく太い静脈・粘液の塊
                ctx.strokeStyle = '#4c0519';
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.moveTo(-s * 0.6, 0);
                ctx.quadraticCurveTo(0, s * 0.45, s * 0.7, -s * 0.2);
                ctx.stroke();

                // ぬめりを感じさせる強い鏡面ハイライト（2箇所）
                ctx.fillStyle = 'rgba(255, 230, 240, 0.82)';
                ctx.beginPath();
                ctx.ellipse(-s * 0.3, -s * 0.28, s * 0.42, s * 0.18, -0.35, 0, Math.PI * 2);
                ctx.ellipse(s * 0.22, s * 0.18, s * 0.22, s * 0.10, 0.25, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'VISCERA_INTESTINE': {
                // 3面：ドロドロの粘液膜で繋がりながらうねり飛ぶ腸管・太い生体血管の塊
                const wriggle = Math.sin(this.age * 0.25 + this.wobblePhase) * s * 0.35;

                // 腸管同士の間を埋める半透明の粘液・腸間膜
                ctx.fillStyle = 'rgba(159, 18, 57, 0.68)';
                ctx.beginPath();
                ctx.moveTo(-s, -s * 0.3);
                ctx.quadraticCurveTo(0, s * 0.9 + wriggle, s, s * 0.3);
                ctx.quadraticCurveTo(0, -s * 0.9 - wriggle, -s, -s * 0.3);
                ctx.closePath();
                ctx.fill();

                // 太くぬめりのある腸管本体
                ctx.strokeStyle = '#881337';
                ctx.lineWidth = Math.max(7, s * 0.62);
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(-s, -s * 0.3);
                ctx.bezierCurveTo(-s * 0.3, s * 0.95 + wriggle, s * 0.3, -s * 0.95 - wriggle, s, s * 0.3);
                ctx.stroke();

                ctx.strokeStyle = '#e11d48';
                ctx.lineWidth = Math.max(4.5, s * 0.40);
                ctx.beginPath();
                ctx.moveTo(-s, -s * 0.3);
                ctx.bezierCurveTo(-s * 0.3, s * 0.95 + wriggle, s * 0.3, -s * 0.95 - wriggle, s, s * 0.3);
                ctx.stroke();

                // 濡れた粘膜ハイライト
                ctx.strokeStyle = 'rgba(255, 215, 225, 0.78)';
                ctx.lineWidth = Math.max(1.8, s * 0.15);
                ctx.beginPath();
                ctx.moveTo(-s * 0.88, -s * 0.35);
                ctx.bezierCurveTo(-s * 0.3, s * 0.82 + wriggle, s * 0.3, -s * 1.02 - wriggle, s * 0.88, s * 0.22);
                ctx.stroke();
                break;
            }

            case 'EYEBALL_CHUNK': {
                // 3面：太い視神経と引きちぎれた眼筋を引きずりながら飛び出す巨大生体眼球！
                // 1. 眼球裏側にまとわりつく千切れた赤黒い眼筋組織
                ctx.fillStyle = '#9f1239';
                ctx.beginPath();
                ctx.ellipse(-s * 0.55, 0, s * 0.75, s * 0.68, 0, 0, Math.PI * 2);
                ctx.fill();

                // 2. 充血した巨大眼球の強膜（白目〜赤黒い血管グラデーション）
                const eyeGrad = ctx.createRadialGradient(-s * 0.2, -s * 0.2, 2, 0, 0, s);
                eyeGrad.addColorStop(0, '#ffffff');
                eyeGrad.addColorStop(0.55, '#ffe4e6');
                eyeGrad.addColorStop(0.85, '#fb7185');
                eyeGrad.addColorStop(1, '#9f1239');
                ctx.fillStyle = eyeGrad;
                ctx.beginPath();
                ctx.arc(0, 0, s, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#881337';
                ctx.lineWidth = 2.2;
                ctx.stroke();

                // 3. 白目に浮き出た生々しい毛細血管
                ctx.strokeStyle = 'rgba(225, 29, 72, 0.8)';
                ctx.lineWidth = 1.4;
                for (let v = 0; v < 5; v++) {
                    const va = -2.4 + v * 0.45;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(va) * s * 0.95, Math.sin(va) * s * 0.95);
                    ctx.quadraticCurveTo(Math.cos(va + 0.2) * s * 0.5, Math.sin(va - 0.2) * s * 0.5, s * 0.1, 0);
                    ctx.stroke();
                }

                // 4. ギョロッと見開いた虹彩と縦長スリット瞳孔
                const irisGrad = ctx.createRadialGradient(s * 0.28, 0, 1, s * 0.28, 0, s * 0.48);
                irisGrad.addColorStop(0, '#00e5ff');
                irisGrad.addColorStop(0.65, '#be123c');
                irisGrad.addColorStop(1, '#1e1b4b');
                ctx.fillStyle = irisGrad;
                ctx.beginPath();
                ctx.arc(s * 0.28, 0, s * 0.46, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#020617';
                ctx.beginPath();
                ctx.ellipse(s * 0.30, 0, s * 0.15, s * 0.38, 0, 0, Math.PI * 2);
                ctx.fill();

                // 5. 眼球表面のドロッとした硝子体液・涙液の強い鏡面ハイライト
                ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
                ctx.beginPath();
                ctx.ellipse(s * 0.1, -s * 0.32, s * 0.32, s * 0.16, -0.35, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'BLOOD_MIST': {
                // 3面：ドロドロと絡みつく濃厚な血糊・粘液塊クラウド
                const bMist = ctx.createRadialGradient(-s * 0.15, -s * 0.15, s * 0.1, 0, 0, s);
                bMist.addColorStop(0, 'rgba(225, 29, 72, 0.88)');
                bMist.addColorStop(0.5, 'rgba(136, 19, 55, 0.68)');
                bMist.addColorStop(0.82, 'rgba(76, 5, 25, 0.35)');
                bMist.addColorStop(1, 'rgba(76, 5, 25, 0)');
                ctx.fillStyle = bMist;
                ctx.beginPath();
                const wobble = Math.sin(this.age * 0.18 + this.wobblePhase) * 0.15;
                ctx.ellipse(0, 0, s * (1.1 + wobble), s * (0.9 - wobble), 0, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
        }

        ctx.restore();
    }
}

// ボス撃破時のステージ別・部位破壊＆内容物飛散スポーン関数
function spawnBossDismembermentWave(boss, isFinalBlast = false) {
    if (!boss || typeof particles === 'undefined') return;

    const isStage2 = (typeof GolemBoss !== 'undefined' && boss instanceof GolemBoss);
    const isStage3 = (typeof BigCoreBoss !== 'undefined' && boss instanceof BigCoreBoss);
    const isStage4 = (typeof Stage4Boss !== 'undefined' && boss instanceof Stage4Boss);

    // ボス中心座標の算出（Stage 2は左上基準、Stage 1 / Stage 3 / Stage 4は中心基準）
    const cx = isStage2 ? (boss.x + boss.width / 2) : boss.x;
    const cy = isStage2 ? (boss.y + boss.height / 2) : boss.y;
    const mult = isFinalBlast ? 2.4 : 1.0;

    if (!isStage2 && !isStage3) {
        // ====================================================
        // STAGE 1 / STAGE 4 BOSS: 機械部品（砲台アーム・装甲板・歯車・ピストン・コア）がバラバラに飛散！
        // ====================================================
        if (isFinalBlast) {
            [-1, 1].forEach(sign => {
                particles.push(new BossDebris(cx - 50, cy + sign * 55, 'CANNON_ARM', {
                    stage: isStage4 ? 4 : 1,
                    vx: -3.5 - Math.random() * 3.0,
                    vy: sign * (2.5 + Math.random() * 3.0),
                    size: 24,
                    vAngle: sign * 0.08,
                    subColor: isStage4 ? '#ff5500' : '#00ffff',
                    decay: 0.0045
                }));
                particles.push(new BossDebris(cx + 15, cy + sign * 45, 'CANNON_ARM', {
                    stage: isStage4 ? 4 : 1,
                    vx: 1.5 + Math.random() * 3.5,
                    vy: sign * (2.0 + Math.random() * 2.8),
                    size: 20,
                    vAngle: -sign * 0.09,
                    subColor: '#ffaa00',
                    decay: 0.0045
                }));
            });
        }

        const mechCount = Math.round(7 * mult);
        for (let i = 0; i < mechCount; i++) {
            const ox = (Math.random() - 0.5) * 160;
            const oy = (Math.random() - 0.5) * 140;
            const kinds = ['HULL_PLATE', 'MECH_GEAR', 'PISTON_ROD', 'CORE_SHARD'];
            const kind = kinds[i % kinds.length];
            particles.push(new BossDebris(cx + ox, cy + oy, kind, {
                stage: isStage4 ? 4 : 1,
                speed: (2.5 + Math.random() * 6.0) * (isFinalBlast ? 1.25 : 1.0),
                size: (kind === 'CORE_SHARD') ? (10 + Math.random() * 10) : (12 + Math.random() * 14),
                color: isStage4 ? ((i % 2 === 0) ? '#7f1d1d' : '#450a0a') : ((i % 2 === 0) ? '#64748b' : '#475569'),
                subColor: isStage4 ? '#ff5500' : ((i % 2 === 0) ? '#00ffff' : '#ffaa00'),
                decay: 0.0055
            }));
        }

        if (isStage4) {
            const magmaCount = Math.round(6 * mult);
            const magmaColors = ['#ff4400', '#b91c1c', '#ea580c', '#7c2d12'];
            for (let i = 0; i < magmaCount; i++) {
                const ox = (Math.random() - 0.5) * 150;
                const oy = (Math.random() - 0.5) * 130;
                particles.push(new BossDebris(cx + ox, cy + oy, 'ROCK_BOULDER', {
                    stage: 4,
                    speed: 3.0 + Math.random() * 6.5,
                    gravity: (i % 2 === 0) ? -0.05 : 0.06, // 逆火山らしく上下両方へ飛散
                    size: 11 + Math.random() * 15,
                    color: magmaColors[i % magmaColors.length],
                    vertCount: 7,
                    decay: 0.005
                }));
            }
        }
    } else if (isStage2) {
        // ====================================================
        // STAGE 2 BOSS: 飛び散るボスの機械・石板部品の中から、岩石や砂も大量に四散！
        // ====================================================
        if (isFinalBlast && typeof boss._getTentacleNodes === 'function') {
            [false, true].forEach(isBot => {
                const nodes = boss._getTentacleNodes(isBot);
                nodes.forEach((n, idx) => {
                    const isTip = (idx === nodes.length - 1);
                    particles.push(new BossDebris(n.x, n.y, isTip ? 'TENTACLE_CLAW' : 'TENTACLE_JOINT', {
                        stage: 2,
                        speed: 3.0 + Math.random() * 5.5,
                        size: isTip ? 16 : Math.max(9, 16 - idx * 0.9),
                        subColor: isBot ? '#ffaa00' : '#00ffee',
                        decay: 0.0048
                    }));
                });
            });
        }

        const partCount = Math.round(5 * mult);
        for (let i = 0; i < partCount; i++) {
            const ox = (Math.random() - 0.5) * boss.width;
            const oy = (Math.random() - 0.5) * boss.height;
            const kinds = ['MONOLITH_SLAB', 'HULL_PLATE', 'TENTACLE_JOINT', 'MECH_GEAR'];
            particles.push(new BossDebris(cx + ox, cy + oy, kinds[i % kinds.length], {
                stage: 2,
                speed: 2.8 + Math.random() * 5.5,
                size: 13 + Math.random() * 14,
                subColor: (i % 2 === 0) ? '#38bdf8' : '#ffaa00',
                decay: 0.0055
            }));
        }

        const rockCount = Math.round(7 * mult);
        for (let i = 0; i < rockCount; i++) {
            const ox = (Math.random() - 0.5) * (boss.width * 0.8);
            const oy = (Math.random() - 0.5) * (boss.height * 0.8);
            const rockColors = ['#8d8070', '#a89f91', '#6c584c', '#7f7060'];
            particles.push(new BossDebris(cx + ox, cy + oy, 'ROCK_BOULDER', {
                stage: 2,
                speed: 2.5 + Math.random() * 6.5,
                gravity: 0.075,
                size: 12 + Math.random() * 18,
                color: rockColors[i % rockColors.length],
                vertCount: 7,
                decay: 0.005
            }));
        }

        const cloudCount = Math.round(5 * mult);
        for (let i = 0; i < cloudCount; i++) {
            const ox = (Math.random() - 0.5) * (boss.width * 0.7);
            const oy = (Math.random() - 0.5) * (boss.height * 0.7);
            particles.push(new BossDebris(cx + ox, cy + oy, 'SAND_CLOUD', {
                stage: 2,
                speed: 1.5 + Math.random() * 4.0,
                gravity: 0.015,
                size: 26 + Math.random() * 28,
                decay: 0.010
            }));
        }

        const sandCount = Math.round(16 * mult);
        const sandPalette = ['#e6ccb2', '#ddb892', '#b08968', '#d4a373'];
        for (let i = 0; i < sandCount; i++) {
            const ox = (Math.random() - 0.5) * (boss.width * 0.85);
            const oy = (Math.random() - 0.5) * (boss.height * 0.85);
            particles.push(new BossDebris(cx + ox, cy + oy, 'SAND_GRAIN', {
                stage: 2,
                speed: 3.0 + Math.random() * 7.5,
                gravity: 0.065,
                size: 2.5 + Math.random() * 3.8,
                color: sandPalette[i % sandPalette.length],
                decay: 0.011
            }));
        }
    } else if (isStage3) {
        // ====================================================
        // STAGE 3 BOSS: 神経を引きずった巨大目玉が飛び出し、
        // ベトベトでドロドロした粘着質な内臓・血液塊が糸を引きながら溢れ出るスプラッター演出！
        // ====================================================
        if (isFinalBlast && typeof boss._getBioMechaTentacles === 'function') {
            const tents = boss._getBioMechaTentacles();
            tents.forEach(t => {
                t.nodes.forEach((n, idx) => {
                    const kind = t.isBio ? 'BIO_TENTACLE_CHUNK' : ((idx === t.nodes.length - 1) ? 'TENTACLE_CLAW' : 'TENTACLE_JOINT');
                    particles.push(new BossDebris(n.x, n.y, kind, {
                        stage: 3,
                        speed: 2.2 + Math.random() * 3.8,
                        drag: 0.975,
                        gravity: t.isBio ? 0.075 : 0.045,
                        size: Math.max(12, 20 - idx * 0.8),
                        subColor: t.isBio ? '#ff0055' : '#00ffee',
                        decay: 0.0042
                    }));
                });
            });

            // 中央の巨大生体眼球コアが太い視神経コードを長く引きずりながら前方へボロッと飛び出す！
            particles.push(new BossDebris(cx - 10, cy, 'EYEBALL_CHUNK', {
                stage: 3,
                vx: -3.4 - Math.random() * 1.4,
                vy: -2.2 + (Math.random() - 0.5) * 1.5,
                drag: 0.985,
                gravity: 0.055,
                size: 27,
                rot: Math.PI,
                vAngle: -0.025,
                decay: 0.0032
            }));
        }

        // 1. モアイ巨石顎アーマー＆機械部品の飛散
        const armorCount = Math.round(4 * mult);
        for (let i = 0; i < armorCount; i++) {
            const ox = (Math.random() - 0.5) * 150;
            const oy = (Math.random() - 0.5) * 130;
            const kinds = ['MOAI_JAW_PART', 'HULL_PLATE', 'TENTACLE_JOINT'];
            particles.push(new BossDebris(cx + ox, cy + oy, kinds[i % kinds.length], {
                stage: 3,
                speed: 2.5 + Math.random() * 4.5,
                size: 16 + Math.random() * 14,
                subColor: '#ff2266',
                decay: 0.0048
            }));
        }

        // 2. ボス内部からボトボトと塊になって溢れ出る粘着質な脳・内臓器官・腸管
        // （パラパラに散らばらないよう、複数の粘着クラスター塊として近い速度でドロッと押し出される）
        const clusterCount = isFinalBlast ? 5 : 2;
        const organKinds = ['VISCERA_BRAIN', 'VISCERA_ORGAN', 'VISCERA_INTESTINE', 'BIO_TENTACLE_CHUNK'];
        for (let c = 0; c < clusterCount; c++) {
            const baseAng = Math.PI + (Math.random() - 0.5) * 2.4;
            const baseSpd = 1.6 + Math.random() * 2.6;
            const clusterOx = (Math.random() - 0.4) * 90;
            const clusterOy = (Math.random() - 0.5) * 85;

            for (let m = 0; m < 3; m++) {
                const kind = organKinds[(c + m) % organKinds.length];
                const ang = baseAng + (Math.random() - 0.5) * 0.35;
                const spd = baseSpd + (Math.random() - 0.5) * 0.9;
                particles.push(new BossDebris(cx + clusterOx + (Math.random() - 0.5) * 24, cy + clusterOy + (Math.random() - 0.5) * 24, kind, {
                    stage: 3,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd - 0.6,
                    drag: 0.968,    // 強い粘性抵抗でベトベトと重く減速
                    gravity: 0.075, // ドロッと重力で垂れ落ちる
                    vAngle: (Math.random() - 0.5) * 0.04,
                    size: 16 + Math.random() * 16,
                    decay: 0.0040
                }));
            }
        }

        // 3. 濃厚な粘液血糊クラウド（BLOOD_MIST）と、糸を引いてうねる粘着血液塊（BLOOD_SPLATTER）
        const mistCount = Math.round(4 * mult);
        for (let i = 0; i < mistCount; i++) {
            const ox = (Math.random() - 0.4) * 100;
            const oy = (Math.random() - 0.5) * 90;
            particles.push(new BossDebris(cx + ox, cy + oy, 'BLOOD_MIST', {
                stage: 3,
                speed: 0.8 + Math.random() * 2.2,
                drag: 0.96,
                gravity: 0.035,
                size: 30 + Math.random() * 28,
                decay: 0.0075
            }));
        }

        const bloodCount = Math.round(14 * mult);
        const bloodPalette = ['#e11d48', '#be123c', '#9f1239', '#881337'];
        for (let i = 0; i < bloodCount; i++) {
            const streamAng = Math.PI + (i % 5 - 2) * 0.45 + (Math.random() - 0.5) * 0.25;
            const spd = 1.8 + (i % 4) * 0.95 + Math.random() * 1.2;
            const ox = (Math.random() - 0.4) * 95;
            const oy = (Math.random() - 0.5) * 85;
            particles.push(new BossDebris(cx + ox, cy + oy, 'BLOOD_SPLATTER', {
                stage: 3,
                vx: Math.cos(streamAng) * spd,
                vy: Math.sin(streamAng) * spd - 0.8,
                drag: 0.965,    // パラパラ飛ばず、粘り気のある流体として減速
                gravity: 0.085, // 重く垂れ落ちる血塊
                size: 8.5 + Math.random() * 7.5,
                color: bloodPalette[i % bloodPalette.length],
                decay: 0.0065
            }));
        }
    }
}

window.BossDebris = BossDebris;
window.spawnBossDismembermentWave = spawnBossDismembermentWave;
