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
// Stage 3: モアイ顎装甲・触手節が吹き飛び、内部から脳組織・内臓器官・鮮血が大量に溢れ出るスプラッター演出
// ==========================================================
class BossDebris {
    constructor(x, y, kind, options = {}) {
        this.x = x;
        this.y = y;
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

        // 岩石・装甲・内臓のランダム多角形頂点生成
        this.polyPoints = [];
        const vertCount = options.vertCount || 6;
        for (let i = 0; i < vertCount; i++) {
            const a = (Math.PI * 2 * i) / vertCount + (Math.random() - 0.5) * 0.35;
            const rad = this.size * (0.65 + Math.random() * 0.45);
            this.polyPoints.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad });
        }
    }

    update() {
        this.age++;
        this.vx *= this.drag;
        this.vy = this.vy * this.drag + this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.vAngle;
        this.life -= this.decay;

        if (this.life <= 0 || this.y > 720 || this.x < -160 || this.x > 960) {
            this.active = false;
            return;
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

        // 3面：飛び散る内臓・脳・生体触手・眼球から鮮血しぶきが滴り落ちるスプラッター演出
        if ((this.kind === 'VISCERA_BRAIN' || this.kind === 'VISCERA_ORGAN' || this.kind === 'VISCERA_INTESTINE' || this.kind === 'EYEBALL_CHUNK' || this.kind === 'BIO_TENTACLE_CHUNK') && this.age % 3 === 0 && typeof particles !== 'undefined') {
            particles.push(new BossDebris(
                this.x + (Math.random() - 0.5) * this.size * 0.5,
                this.y + (Math.random() - 0.5) * this.size * 0.5,
                'BLOOD_SPLATTER',
                {
                    stage: 3,
                    vx: this.vx * 0.3 + (Math.random() - 0.5) * 2.4,
                    vy: this.vy * 0.3 + Math.random() * 2.2,
                    gravity: 0.09,
                    size: 3 + Math.random() * 4.5,
                    decay: 0.020,
                    color: Math.random() < 0.6 ? '#dc143c' : '#990011'
                }
            ));
        }
    }

    draw(ctx) {
        if (!this.active || this.life <= 0) return;
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

                // 内部の回路ライン＆リベット穴
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

                // 岩石の亀裂ディテール
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
                // 3面：砕け飛ぶ古代モアイ巨石顎＆金属牙パーツ
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

                // 付着した金属牙と血痕
                ctx.fillStyle = '#e2e8f0';
                ctx.beginPath();
                ctx.moveTo(-s * 0.4, s * 0.4);
                ctx.lineTo(-s * 0.15, s * 0.95);
                ctx.lineTo(s * 0.1, s * 0.4);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#be123c';
                ctx.beginPath();
                ctx.arc(s * 0.15, -s * 0.1, s * 0.32, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'BIO_TENTACLE_CHUNK': {
                // 3面：ぶつ切りになって飛散する生体血管触手の肉片
                const bGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, s);
                bGrad.addColorStop(0, '#fda4af');
                bGrad.addColorStop(0.45, '#e11d48');
                bGrad.addColorStop(0.85, '#881337');
                bGrad.addColorStop(1, '#4c0519');
                ctx.fillStyle = bGrad;
                ctx.beginPath();
                ctx.ellipse(0, 0, s * 1.15, s * 0.8, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#fb7185';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // 断面から飛び出す血管
                ctx.strokeStyle = '#ff0033';
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.moveTo(s * 0.9, 0);
                ctx.quadraticCurveTo(s * 1.4, -s * 0.4, s * 1.7, s * 0.2);
                ctx.stroke();
                break;
            }

            case 'VISCERA_BRAIN': {
                // 3面：四散する生体脳みそ（皺のある大脳皮質塊）
                const brGrad = ctx.createRadialGradient(-s * 0.2, -s * 0.2, 2, 0, 0, s);
                brGrad.addColorStop(0, '#ffe4e6');
                brGrad.addColorStop(0.35, '#fb7185');
                brGrad.addColorStop(0.75, '#be123c');
                brGrad.addColorStop(1, '#4c0519');
                ctx.fillStyle = brGrad;
                ctx.beginPath();
                ctx.ellipse(0, 0, s * 1.1, s * 0.85, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#881337';
                ctx.lineWidth = 1.8;
                ctx.stroke();

                // 脳の溝（皺）のディテール
                ctx.strokeStyle = '#4c0519';
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                ctx.moveTo(-s * 0.65, -s * 0.2);
                ctx.bezierCurveTo(-s * 0.2, -s * 0.55, s * 0.2, s * 0.25, s * 0.65, -s * 0.15);
                ctx.moveTo(-s * 0.55, s * 0.25);
                ctx.bezierCurveTo(-s * 0.1, -s * 0.1, s * 0.25, s * 0.55, s * 0.6, s * 0.2);
                ctx.stroke();
                break;
            }

            case 'VISCERA_ORGAN': {
                // 3面：溢れ出る内臓器官（生々しい光沢のある赤紫の臓器サック＋動脈）
                const orgGrad = ctx.createRadialGradient(-s * 0.25, -s * 0.25, 2, 0, 0, s);
                orgGrad.addColorStop(0, '#f472b6');
                orgGrad.addColorStop(0.35, '#e11d48');
                orgGrad.addColorStop(0.75, '#881337');
                orgGrad.addColorStop(1, '#3b0764');
                ctx.fillStyle = orgGrad;
                ctx.beginPath();
                ctx.ellipse(0, 0, s * 1.15, s * 0.78, 0.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#500724';
                ctx.lineWidth = 1.8;
                ctx.stroke();

                // 濡れた内臓のハイライト反射
                ctx.fillStyle = 'rgba(255, 220, 230, 0.65)';
                ctx.beginPath();
                ctx.ellipse(-s * 0.3, -s * 0.25, s * 0.35, s * 0.15, -0.3, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'VISCERA_INTESTINE': {
                // 3面：ちぎれて吹き飛ぶ腸管・太い生体血管の束
                ctx.strokeStyle = '#be123c';
                ctx.lineWidth = Math.max(4, s * 0.42);
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(-s, -s * 0.3);
                ctx.bezierCurveTo(-s * 0.3, s * 0.8, s * 0.3, -s * 0.8, s, s * 0.3);
                ctx.stroke();

                ctx.strokeStyle = '#fb7185';
                ctx.lineWidth = Math.max(1.5, s * 0.14);
                ctx.beginPath();
                ctx.moveTo(-s * 0.9, -s * 0.35);
                ctx.bezierCurveTo(-s * 0.3, s * 0.7, s * 0.3, -s * 0.9, s * 0.9, s * 0.25);
                ctx.stroke();
                break;
            }

            case 'EYEBALL_CHUNK': {
                // 3面：視神経ごと飛び出した巨大生体眼球コア
                ctx.strokeStyle = '#e11d48';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(-s * 0.8, 0);
                ctx.quadraticCurveTo(-s * 1.6, s * 0.6, -s * 2.2, -s * 0.3);
                ctx.stroke();

                const eyeGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, s);
                eyeGrad.addColorStop(0, '#fff1f2');
                eyeGrad.addColorStop(0.65, '#fecdd3');
                eyeGrad.addColorStop(1, '#e11d48');
                ctx.fillStyle = eyeGrad;
                ctx.beginPath();
                ctx.arc(0, 0, s, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#00e5ff';
                ctx.beginPath();
                ctx.arc(s * 0.25, 0, s * 0.45, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#020617';
                ctx.beginPath();
                ctx.ellipse(s * 0.25, 0, s * 0.15, s * 0.38, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'BLOOD_SPLATTER': {
                // 3面：激しく吹き出す鮮血スプラッター飛沫
                ctx.fillStyle = this.color || '#dc143c';
                ctx.beginPath();
                ctx.ellipse(0, 0, s * 1.25, s * 0.75, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'BLOOD_MIST': {
                // 3面：濃い血煙・スプラッター血霧
                const bMist = ctx.createRadialGradient(0, 0, s * 0.1, 0, 0, s);
                bMist.addColorStop(0, 'rgba(220, 20, 60, 0.82)');
                bMist.addColorStop(0.55, 'rgba(136, 19, 55, 0.5)');
                bMist.addColorStop(1, 'rgba(76, 5, 25, 0)');
                ctx.fillStyle = bMist;
                ctx.beginPath();
                ctx.arc(0, 0, s, 0, Math.PI * 2);
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

    // ボス中心座標の算出（Stage 2は左上基準、Stage 1 / Stage 3は中心基準）
    const cx = isStage2 ? (boss.x + boss.width / 2) : boss.x;
    const cy = isStage2 ? (boss.y + boss.height / 2) : boss.y;
    const mult = isFinalBlast ? 2.4 : 1.0;

    if (!isStage2 && !isStage3) {
        // ====================================================
        // STAGE 1 BOSS: 機械部品（砲台アーム・装甲板・歯車・ピストン・コア）がバラバラに飛散！
        // ====================================================
        if (isFinalBlast) {
            // 上下4連レーザー砲台アームが千切れて吹き飛ぶ
            [-1, 1].forEach(sign => {
                particles.push(new BossDebris(cx - 50, cy + sign * 55, 'CANNON_ARM', {
                    stage: 1,
                    vx: -3.5 - Math.random() * 3.0,
                    vy: sign * (2.5 + Math.random() * 3.0),
                    size: 24,
                    vAngle: sign * 0.08,
                    subColor: '#00ffff',
                    decay: 0.0045
                }));
                particles.push(new BossDebris(cx + 15, cy + sign * 45, 'CANNON_ARM', {
                    stage: 1,
                    vx: 1.5 + Math.random() * 3.5,
                    vy: sign * (2.0 + Math.random() * 2.8),
                    size: 20,
                    vAngle: -sign * 0.09,
                    subColor: '#ffaa00',
                    decay: 0.0045
                }));
            });
        }

        // メカ装甲プレート・ギア・ピストン・クリスタルコア破片を大量散布
        const mechCount = Math.round(7 * mult);
        for (let i = 0; i < mechCount; i++) {
            const ox = (Math.random() - 0.5) * 160;
            const oy = (Math.random() - 0.5) * 140;
            const kinds = ['HULL_PLATE', 'MECH_GEAR', 'PISTON_ROD', 'CORE_SHARD'];
            const kind = kinds[i % kinds.length];
            particles.push(new BossDebris(cx + ox, cy + oy, kind, {
                stage: 1,
                speed: (2.5 + Math.random() * 6.0) * (isFinalBlast ? 1.25 : 1.0),
                size: (kind === 'CORE_SHARD') ? (10 + Math.random() * 10) : (12 + Math.random() * 14),
                color: (i % 2 === 0) ? '#64748b' : '#475569',
                subColor: (i % 2 === 0) ? '#00ffff' : '#ffaa00',
                decay: 0.0055
            }));
        }
    } else if (isStage2) {
        // ====================================================
        // STAGE 2 BOSS: 飛び散るボスの機械・石板部品の中から、岩石や砂も大量に四散！
        // ====================================================
        if (isFinalBlast && typeof boss._getTentacleNodes === 'function') {
            // 上下2本の機械触手の全関節がバラバラに分解して四方へ吹き飛ぶ！
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

        // 1. ボスの機械部品＆モノリス石板の飛散
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

        // 2. 内部から噴き出して四散する巨石・岩塊（ROCK_BOULDER）
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

        // 3. 内部から四散する砂煙クラウド（SAND_CLOUD）と無数の砂粒（SAND_GRAIN）
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
        // STAGE 3 BOSS: ボスの部品が飛び散り、中から脳・内臓器官や血液が大量に溢れ出るスプラッター演出！
        // ====================================================
        if (isFinalBlast && typeof boss._getBioMechaTentacles === 'function') {
            // 4本の生体＆機械触手の全関節がバラバラに千切れて飛散！
            const tents = boss._getBioMechaTentacles();
            tents.forEach(t => {
                t.nodes.forEach((n, idx) => {
                    const kind = t.isBio ? 'BIO_TENTACLE_CHUNK' : ((idx === t.nodes.length - 1) ? 'TENTACLE_CLAW' : 'TENTACLE_JOINT');
                    particles.push(new BossDebris(n.x, n.y, kind, {
                        stage: 3,
                        speed: 3.2 + Math.random() * 6.0,
                        gravity: t.isBio ? 0.07 : 0.04,
                        size: Math.max(10, 18 - idx * 0.8),
                        subColor: t.isBio ? '#ff0055' : '#00ffee',
                        decay: 0.0048
                    }));
                });
            });

            // 中央の巨大生体眼球コアが視神経ごと飛び出す！
            particles.push(new BossDebris(cx, cy, 'EYEBALL_CHUNK', {
                stage: 3,
                vx: -4.2 - Math.random() * 2.5,
                vy: -2.5 + (Math.random() - 0.5) * 3.0,
                gravity: 0.065,
                size: 24,
                vAngle: 0.12,
                decay: 0.0042
            }));
        }

        // 1. モアイ巨石顎アーマー＆サイボーグ機械部品の飛散
        const armorCount = Math.round(5 * mult);
        for (let i = 0; i < armorCount; i++) {
            const ox = (Math.random() - 0.5) * 170;
            const oy = (Math.random() - 0.5) * 150;
            const kinds = ['MOAI_JAW_PART', 'HULL_PLATE', 'TENTACLE_JOINT'];
            particles.push(new BossDebris(cx + ox, cy + oy, kinds[i % kinds.length], {
                stage: 3,
                speed: 3.0 + Math.random() * 6.0,
                size: 15 + Math.random() * 15,
                subColor: '#ff2266',
                decay: 0.0052
            }));
        }

        // 2. ボス内部から溢れ出る脳みそ塊・内臓器官・腸管（VISCERA_BRAIN / VISCERA_ORGAN / VISCERA_INTESTINE）
        const organCount = Math.round(9 * mult);
        for (let i = 0; i < organCount; i++) {
            const ox = (Math.random() - 0.4) * 140;
            const oy = (Math.random() - 0.5) * 120;
            const organKinds = ['VISCERA_BRAIN', 'VISCERA_ORGAN', 'VISCERA_INTESTINE', 'BIO_TENTACLE_CHUNK'];
            const kind = organKinds[i % organKinds.length];
            particles.push(new BossDebris(cx + ox, cy + oy, kind, {
                stage: 3,
                speed: 2.2 + Math.random() * 6.2,
                gravity: 0.08,
                size: 13 + Math.random() * 16,
                decay: 0.0048
            }));
        }

        // 3. 激しく噴き出す濃密な血煙（BLOOD_MIST）と鮮血スプラッター飛沫（BLOOD_SPLATTER）
        const mistCount = Math.round(6 * mult);
        for (let i = 0; i < mistCount; i++) {
            const ox = (Math.random() - 0.4) * 130;
            const oy = (Math.random() - 0.5) * 110;
            particles.push(new BossDebris(cx + ox, cy + oy, 'BLOOD_MIST', {
                stage: 3,
                speed: 1.5 + Math.random() * 3.8,
                gravity: 0.02,
                size: 28 + Math.random() * 30,
                decay: 0.009
            }));
        }

        const bloodCount = Math.round(20 * mult);
        const bloodPalette = ['#ff0022', '#dc143c', '#b91c1c', '#881337', '#4c0519'];
        for (let i = 0; i < bloodCount; i++) {
            const ox = (Math.random() - 0.4) * 140;
            const oy = (Math.random() - 0.5) * 120;
            particles.push(new BossDebris(cx + ox, cy + oy, 'BLOOD_SPLATTER', {
                stage: 3,
                speed: 3.0 + Math.random() * 8.5,
                gravity: 0.095,
                size: 3.5 + Math.random() * 6.0,
                color: bloodPalette[i % bloodPalette.length],
                decay: 0.009
            }));
        }
    }
}

window.BossDebris = BossDebris;
window.spawnBossDismembermentWave = spawnBossDismembermentWave;
