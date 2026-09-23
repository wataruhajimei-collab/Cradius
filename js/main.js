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
    window.player = player;
    window.levelManager = levelManager;
    window.getEnemies = () => enemies;
    window.getLevelManager = () => levelManager;
    window.getPlayer = () => player;
    window.playerBullets = playerBullets;
    window.enemyBullets = enemyBullets;
    window.capsules = capsules;
    window.getCapsules = () => capsules;

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
    enemies = enemies.filter(e => {
        if (!e.active) return false;
        if (e.parentIsland) {
            return e.parentIsland.active && (e.parentIsland.x + e.parentIsland.width > -120);
        }
        return e.x < canvas.width + 300 && e.x + e.width > -100;
    });

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
    // ステージ2: ストーンヘンジ面での石ブロック掘削処理
    if (levelManager.stage === 2 && typeof stonehengeStage !== 'undefined' && stonehengeStage && stonehengeStage.active) {
        stonehengeStage.handleBulletCollisions(playerBullets);
    }

    // ステージ3: モアイ地形のモアイ像への弾当たり判定
    const st3 = window.stage3 || (typeof stage3 !== 'undefined' ? stage3 : null);
    if (levelManager.stage === 3 && st3) {
        st3.handleBulletCollisions(playerBullets);
    }

    // プレイヤーの弾と敵の当たり判定
    playerBullets.forEach(bullet => {
        // 弾と地形・浮遊大陸（ステージ1）
        if (levelManager.stage === 1 && bullet.active && levelManager.checkCollision(bullet)) {
            if (!(bullet instanceof Missile)) {
                bullet.active = false;
                createExplosion(bullet.x, bullet.y, '#555555');
            }
        }

        enemies.forEach(enemy => {
            if (enemy instanceof FanEnemy && !enemy.visible) return;
            if (typeof WarpSphereEnemy !== 'undefined' && enemy instanceof WarpSphereEnemy && enemy.state === 'WARPING') return;

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

                    // 赤い敵（isRed）を倒した場合、確定でパワーアップカプセルをドロップ！
                    if (enemy.isRed && typeof capsules !== 'undefined') {
                        capsules.push(new PowerUpCapsule(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2));
                    }

                    // 群れ（編隊・小隊）に所属している敵の場合、群れ全滅時にカプセル確定ドロップ！
                    if (enemy.formation) {
                        enemy.formation.notifyDestroyed(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                    }
                }
            }
        });
    });

    // プレイヤーと敵の当たり判定
    enemies.forEach(enemy => {
        if (enemy instanceof FanEnemy && !enemy.visible) return;
        if (typeof WarpSphereEnemy !== 'undefined' && enemy instanceof WarpSphereEnemy && enemy.state === 'WARPING') return;
        if (typeof SuperVolcano !== 'undefined' && enemy instanceof SuperVolcano) return; // 火山山体はシールドで消滅させない

        if (enemy.active && checkCollision(player, enemy)) {
            if (player.shieldActive) {
                if (enemy.x > player.x) {
                    player.shieldHp--;
                    enemy.active = false;
                    createExplosion(enemy.x, enemy.y, '#ffffff');
                    if (typeof Sound !== 'undefined') Sound.playExplosion();
                    if (enemy.isRed && typeof capsules !== 'undefined') {
                        capsules.push(new PowerUpCapsule(enemy.x, enemy.y));
                    }
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
        
        if (bullet.active && levelManager.checkCollision(bullet)) {
            bullet.active = false;
        }
    });

    // プレイヤーと地形・浮遊大陸・石ブロック
    if (levelManager.checkCollision(player)) {
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

    // ボス戦の当たり判定（ステージ1ボス または ステージ2ボス または ステージ3ボス）
    const currentBoss = (levelManager.stage === 1 && levelManager.state === 'BOSS') ? levelManager.boss :
                        (levelManager.stage === 2 && typeof stonehengeStage !== 'undefined' && stonehengeStage && stonehengeStage.boss) ? stonehengeStage.boss :
                        (levelManager.stage === 3 && (window.stage3 || (typeof stage3 !== 'undefined' ? stage3 : null)) && (window.stage3 || stage3).boss) ? (window.stage3 || stage3).boss : null;

    if (currentBoss && currentBoss.active) {
        const boss = currentBoss;

        // 登場中（isEntering）や撃破中（isDying）は無敵
        if (!boss.isEntering && !boss.isDying) {
            playerBullets.forEach(bullet => {
                if (bullet.active && boss.active) {
                    if (typeof boss.handleBulletCollision === 'function') {
                        boss.handleBulletCollision(bullet);
                    }
                }
            });
        }

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
        ui.draw(ctx, canvas.width, player);
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
