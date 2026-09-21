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

