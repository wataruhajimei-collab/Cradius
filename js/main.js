const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let lastTime = 0;
let player;
let playerBullets = [];
let enemies = [];
let particles = [];
let capsules = [];
let enemySpawnTimer = 0;
let levelManager;
let enemyBullets = [];

// 画像アセットの読み込み（自機・ボス・地形テクスチャ・カプセル）
const images = {
    player: new Image(),
    boss: new Image(),
    terrain: new Image(),
    capsule: new Image()
};
images.player.src = 'img/player.png';
images.boss.src = 'img/boss.png';
images.terrain.src = 'img/terrain.jpg';
images.capsule.src = 'img/capsule.png';

let gameStarted = false;

function startGame() {
    if (gameStarted) return;
    gameStarted = true;

    // Web Audioを確実にアンロック＆即座に「タララララン！」グラディウス開始音を再生！
    if (typeof Sound !== 'undefined') {
        Sound.unlockAudio();
        Sound.playGameStart();
    }

    const startScreen = document.getElementById('start-screen');
    if (startScreen) {
        startScreen.style.opacity = '0';
        setTimeout(() => {
            startScreen.style.display = 'none';
        }, 320);
    }

    // スタートジングル（約0.35秒）が響き渡った瞬間、空中戦BGMが爆音でスタート！
    setTimeout(() => {
        if (typeof Sound !== 'undefined') {
            Sound.playAirBgm(true);
        }
    }, 360);

    if (levelManager) {
        levelManager.time = 0;
    }
    enemySpawnTimer = 0;
}

function init() {
    player = new Player(100, canvas.height / 2 - 10);
    levelManager = new LevelManager(canvas.width, canvas.height);

    // スタート画面操作のバインド
    const startScreen = document.getElementById('start-screen');
    const btnStart = document.getElementById('btn-start');

    if (startScreen) {
        startScreen.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            startGame();
        });
        startScreen.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startGame();
        }, { passive: false });
    }
    if (btnStart) {
        btnStart.addEventListener('click', (e) => {
            e.preventDefault();
            startGame();
        });
    }

    // 画面全体のどこをタップ・クリック・キー押ししても即座にゲーム開始＆BGM発音
    const globalTrigger = () => {
        if (!gameStarted) {
            startGame();
        } else {
            if (typeof Sound !== 'undefined') {
                Sound.unlockAudio();
                if (Sound.ctx && Sound.ctx.state === 'suspended') {
                    Sound.ctx.resume().catch(() => {});
                }
            }
        }
    };

    ['touchstart', 'touchend', 'mousedown', 'pointerdown', 'keydown'].forEach(evt => {
        window.addEventListener(evt, globalTrigger, { capture: true, passive: true });
        document.addEventListener(evt, globalTrigger, { capture: true, passive: true });
    });

    requestAnimationFrame(gameLoop);
}

function update(dt) {
    // スタート前は星空スクロールのみ行い、敵スポーンやタイマーは停止
    if (!gameStarted) {
        if (levelManager && levelManager.starfield) {
            levelManager.starfield.update();
        }
        return;
    }

    player.update(canvas.width, canvas.height);

    playerBullets.forEach(b => b.update(canvas.height));
    playerBullets = playerBullets.filter(b => b.active && b.x < canvas.width && b.x > -50);

    levelManager.update(dt);

    // ----------------------------------------------------
    // 敵の大群スポーン（10倍密度・青銀基調・たまに赤でカプセル）
    // ----------------------------------------------------
    if (levelManager.state === 'WAVES') {
        enemySpawnTimer += dt;
        const stageTime = levelManager.time;

        // 空中戦フェーズ（0〜40秒）: 大きな編隊が約850msごとに整然と襲来！
        if (stageTime < 40000) {
            if (enemySpawnTimer > 850) {
                const roll = Math.random();
                const y = Math.random() * (canvas.height - 240) + 120;

                // 1. Fan編隊（4機の群れ：全滅でカプセル確定）
                if (roll < 0.45) {
                    if (typeof Formation !== 'undefined') {
                        new Formation(y, 4);
                    }
                }
                // 2. Garun編隊（4機のUターン群れ：全滅でカプセル確定）
                else if (roll < 0.75) {
                    if (typeof GarunFormation !== 'undefined') {
                        const isUp = Math.random() < 0.5;
                        new GarunFormation(y, isUp, 4);
                    }
                }
                // 3. Zab小隊（3機の奇襲群れ：全滅でカプセル確定）
                else if (roll < 0.90) {
                    if (typeof ZabSquad !== 'undefined') {
                        const sides = ['TOP', 'BOTTOM', 'BACK', 'FRONT'];
                        const side = sides[Math.floor(Math.random() * sides.length)];
                        new ZabSquad(side, y, 3);
                    }
                }
                // 4. ルグラ（高速突進迎撃機）
                else {
                    if (typeof RugraEnemy !== 'undefined') {
                        enemies.push(new RugraEnemy(canvas.width, y));
                    }
                }
                enemySpawnTimer = 0;
            }
        }
        // 地形激戦フェーズ（40〜130秒）: 地形敵＋空からの編隊が約1050msごとに襲来！
        else if (stageTime < 130000) {
            if (enemySpawnTimer > 1050) {
                const roll = Math.random();
                const y = Math.random() * (canvas.height - 300) + 150;

                // Fan編隊（全滅でカプセル）
                if (roll < 0.45) {
                    if (typeof Formation !== 'undefined') {
                        new Formation(y, 4);
                    }
                }
                // Zab小隊（全滅でカプセル）
                else if (roll < 0.75) {
                    if (typeof ZabSquad !== 'undefined') {
                        const side = Math.random() < 0.4 ? 'BACK' : 'FRONT';
                        new ZabSquad(side, y, 3);
                    }
                }
                // ルグラ高速突進
                else {
                    if (typeof RugraEnemy !== 'undefined') {
                        enemies.push(new RugraEnemy(canvas.width, y));
                    }
                }
                enemySpawnTimer = 0;
            }
        }
        // 地形離脱フェーズ（130〜145秒）: ボス直前の静寂
    }

    enemies.forEach(e => e.update());
    enemies = enemies.filter(e => e.active && e.x < canvas.width + 100 && e.x + e.width > -80);

    enemyBullets.forEach(b => b.update());
    enemyBullets = enemyBullets.filter(b => b.active && b.x > -50 && b.x < canvas.width && b.y > -50 && b.y < canvas.height);

    capsules.forEach(c => c.update());
    capsules = capsules.filter(c => c.active && c.x + c.width > 0);

    particles.forEach(p => p.update());
    particles = particles.filter(p => p.active);
    if (particles.length > 300) {
        particles = particles.slice(particles.length - 300);
    }

    handleCollisions();
}

function handleCollisions() {
    // プレイヤーの弾と敵の当たり判定
    playerBullets.forEach(bullet => {
        // 弾と地形
        if (bullet.active && levelManager.terrain.checkCollision(bullet)) {
            if (!(bullet instanceof Missile)) {
                bullet.active = false;
                createExplosion(bullet.x, bullet.y, '#555555');
            }
        }

        enemies.forEach(enemy => {
            if (enemy instanceof FanEnemy && !enemy.visible) return;

            if (bullet.active && enemy.active && checkCollision(bullet, enemy)) {
                if (!(bullet instanceof Laser)) {
                    bullet.active = false;
                }
                enemy.hp--;
                if (enemy.hp <= 0) {
                    enemy.active = false;
                    createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#88ccff');
                    
                    // 爆発音
                    if (typeof Sound !== 'undefined') Sound.playExplosion();

                    // 群れ（編隊・小隊）に所属している敵の場合、群れ全滅時にカプセル確定ドロップ！
                    if (enemy.formation) {
                        enemy.formation.notifyDestroyed(enemy.x, enemy.y);
                    }
                }
            }
        });
    });

    // プレイヤーと敵の当たり判定
    enemies.forEach(enemy => {
        if (enemy instanceof FanEnemy && !enemy.visible) return;

        if (enemy.active && checkCollision(player, enemy)) {
            if (player.shieldActive) {
                if (enemy.x > player.x) {
                    player.shieldHp--;
                    enemy.active = false;
                    createExplosion(enemy.x, enemy.y, '#ffffff');
                    if (typeof Sound !== 'undefined') Sound.playExplosion();
                    if (enemy.formation) enemy.formation.notifyDestroyed(enemy.x, enemy.y);
                    if (player.shieldHp <= 0) player.shieldActive = false;
                    return;
                }
            }
            console.log("Player hit by enemy!");
        }
    });

    // 敵の弾とプレイヤー
    enemyBullets.forEach(bullet => {
        if (bullet.active && checkCollision(player, bullet)) {
            if (player.shieldActive) {
                player.shieldHp--;
                bullet.active = false;
                createExplosion(bullet.x, bullet.y, '#ffffff');
                if (typeof Sound !== 'undefined') Sound.playBossHit();
                if (player.shieldHp <= 0) player.shieldActive = false;
            } else {
                console.log("Player hit by enemy bullet!");
            }
        }
        
        if (bullet.active && levelManager.terrain.checkCollision(bullet)) {
            bullet.active = false;
        }
    });

    // プレイヤーと地形
    if (levelManager.terrain.checkCollision(player)) {
        if (player.shieldActive) {
            player.shieldActive = false;
        }
        player.x -= 2;
    }

    // プレイヤーとカプセルの当たり判定
    capsules.forEach(capsule => {
        if (capsule.active && checkCollision(player, capsule)) {
            capsule.active = false;
            player.advancePowerUp();
            if (typeof Sound !== 'undefined') Sound.playCapsule();
        }
    });

    // ボス戦の当たり判定
    if (levelManager.state === 'BOSS' && levelManager.boss) {
        const boss = levelManager.boss;
        
        playerBullets.forEach(bullet => {
            if (bullet.active && boss.active) {
                const topHull = { x: boss.x - 20, y: boss.y, width: boss.width + 20, height: 32 };
                const bottomHull = { x: boss.x - 20, y: boss.y + 68, width: boss.width + 20, height: 32 };
                const shieldBounds = boss.getShieldBounds();
                const coreHitbox = boss.getCoreBounds();

                // レーザーのヒットレート抑制（毎フレーム連続多重ヒットによる負荷とSE爆音を防止）
                if (bullet instanceof Laser) {
                    if (bullet.bossHitCooldown && bullet.bossHitCooldown > 0) {
                        bullet.bossHitCooldown--;
                        return;
                    }
                    bullet.bossHitCooldown = 3; // 約50msごとに1ヒットの心地よい削り音
                }

                // 1. 遮蔽板への命中判定（遮蔽板が残っている場合、コアを守る）
                if (shieldBounds && checkCollision(bullet, shieldBounds)) {
                    if (!(bullet instanceof Laser)) {
                        bullet.active = false;
                    }
                    const hitX = Math.min(bullet.x + bullet.width, shieldBounds.x);
                    const destroyed = boss.hitShield();
                    if (destroyed) {
                        // 遮蔽板が1枚破壊された時の派手な金属粉砕エフェクト！
                        createExplosion(hitX, bullet.y, '#99b3cc');
                        createExplosion(hitX, bullet.y, '#ffaa00');
                        if (typeof Sound !== 'undefined') {
                            if (typeof Sound.playShieldBreak === 'function') Sound.playShieldBreak();
                            else if (typeof Sound.playExplosion === 'function') Sound.playExplosion();
                        }
                    } else {
                        // 遮蔽板被弾時の金属火花
                        createExplosion(hitX, bullet.y, '#ffffaa');
                        if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') {
                            Sound.playBossHit();
                        }
                    }
                }
                // 2. コアへの直撃判定（遮蔽板全滅、またはコア開放時）
                else if ((boss.shields === 0 || boss.coreOpen) && checkCollision(bullet, coreHitbox)) {
                    if (!(bullet instanceof Laser)) {
                        bullet.active = false;
                    }
                    boss.hitCore(1);
                    createExplosion(bullet.x + bullet.width / 2, bullet.y, '#00ffff');
                    if (typeof Sound !== 'undefined') Sound.playBossHit();

                    if (boss.hp <= 0) {
                        triggerBossDefeatExplosion(boss);
                    }
                }
                // 3. 上下ハル（無敵装甲）への弾かれ判定
                else if (checkCollision(bullet, topHull) || checkCollision(bullet, bottomHull)) {
                    bullet.active = false;
                    createExplosion(bullet.x, bullet.y, '#667788');
                    if (typeof Sound !== 'undefined') Sound.playBossHit();
                }
            }
        });

        boss.bullets.forEach(bullet => {
            if (bullet.active && checkCollision(player, bullet)) {
                if (player.shieldActive) {
                    player.shieldHp--;
                    bullet.active = false;
                    createExplosion(bullet.x, bullet.y, '#ffffff');
                    if (typeof Sound !== 'undefined') Sound.playBossHit();
                    if (player.shieldHp <= 0) player.shieldActive = false;
                }
            }
        });
    }
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 18; i++) {
        particles.push(new Particle(x, y, color));
    }
}

// グラディウス風 ボス撃破時の超巨大連鎖爆発
function triggerBossDefeatExplosion(boss) {
    if (boss.isDying) return;
    boss.isDying = true;

    // サウンド再生（重低音連続大爆発）
    if (typeof Sound !== 'undefined') Sound.playBossExplode();

    // 1. ボス各部（遮蔽板、上下アーム、外装、コア）から次々と巨大火炎球が炸裂！（計28発）
    for (let i = 0; i < 28; i++) {
        setTimeout(() => {
            if (!boss) return;
            const offsetX = (Math.random() - 0.3) * (boss.width + 40);
            const offsetY = (Math.random() - 0.2) * (boss.height + 40);
            const explosionX = boss.x + offsetX;
            const explosionY = boss.y + offsetY;
            const radius = 35 + Math.random() * 30; // 半径35〜65pxの巨大火球
            if (typeof BossExplosion !== 'undefined') {
                particles.push(new BossExplosion(explosionX, explosionY, radius));
            }
            createExplosion(explosionX, explosionY, '#ffaa00');
        }, i * 45);
    }

    // 2. 最後に中心で超特大のファイナル大爆発！（半径85〜100px）
    setTimeout(() => {
        if (!boss) return;
        const centerX = boss.x + boss.width / 2;
        const centerY = boss.y + boss.height / 2;
        if (typeof BossExplosion !== 'undefined') {
            particles.push(new BossExplosion(centerX, centerY, 90));
            particles.push(new BossExplosion(centerX - 20, centerY, 75));
            particles.push(new BossExplosion(centerX + 20, centerY, 75));
        }
        for (let j = 0; j < 30; j++) {
            createExplosion(centerX, centerY, '#ffffff');
        }
    }, 1100);

    // 3. 大爆発の後にボス本体が完全に消滅
    setTimeout(() => {
        boss.active = false;
    }, 1400);
}

function addPlayerBullet(bullet) {
    playerBullets.push(bullet);
}

function draw() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    levelManager.draw(ctx);

    if (gameStarted) {
        capsules.forEach(c => c.draw(ctx));
        particles.forEach(p => p.draw(ctx));
        enemies.forEach(e => e.draw(ctx));
        enemyBullets.forEach(b => b.draw(ctx));
        playerBullets.forEach(b => b.draw(ctx));
    }
    player.draw(ctx);

    if (typeof ui !== 'undefined') {
        ui.draw(ctx, canvas.width, player.powerUpIndex);
    }
}

function gameLoop(timestamp) {
    try {
        const dt = timestamp - lastTime;
        lastTime = timestamp;

        update(dt);
        draw();
    } catch (err) {
        console.error('GameLoop Error:', err);
    }

    requestAnimationFrame(gameLoop);
}

window.onload = init;
