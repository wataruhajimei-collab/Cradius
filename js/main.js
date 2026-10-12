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
window.bgmModalOpen = false;
window.secretSelectedStage = 1;
window.devModeUnlocked = false;

function equipFullPowerForTest() {
    if (!player) return;
    player.speed = Math.max(player.speed, 5.0);
    player.hasMissile = true;
    player.weaponType = 'LASER';
    player.shieldActive = true;
    player.shieldHp = player.maxShieldHp || 3;
    if (typeof Option !== 'undefined') {
        while (player.options.length < (player.maxOptions || 4)) {
            const idx = player.options.length + 1;
            player.options.push(new Option(player, idx * 15));
        }
    }
    if (typeof Sound !== 'undefined' && typeof Sound.playPowerUp === 'function') {
        Sound.playPowerUp();
    }
}

function startOrJumpStage(stageNum = 1, mode = 'STAGE', autoEquipPower = null) {
    if (window.bgmModalOpen) return;

    const targetStage = Number(stageNum) || 1;
    const wasStarted = gameStarted;
    gameStarted = true;

    if (typeof Sound !== 'undefined') {
        Sound.unlockAudio();
        if (Sound.ctx && Sound.ctx.state === 'suspended') {
            Sound.ctx.resume().catch(() => {});
        }
    }

    const startScreen = document.getElementById('start-screen');
    if (startScreen && !wasStarted) {
        startScreen.style.opacity = '0';
        setTimeout(() => {
            startScreen.style.display = 'none';
        }, 280);
    }

    // 2面以降またはボス直行時は快適にテストできるようフル装備を自動付与（1面通常開始時は任意）
    const shouldEquip = autoEquipPower !== null ? autoEquipPower : (targetStage >= 2 || mode !== 'STAGE');
    if (shouldEquip) {
        equipFullPowerForTest();
    }

    if (levelManager) {
        if (targetStage === 1) {
            levelManager.startStage1();
            if (mode === 'VOLCANO') {
                levelManager.time = 51500;
                if (!levelManager.terrain.active) levelManager.terrain.start();
            } else if (mode === 'BOSS') {
                levelManager.state = 'BOSS';
                levelManager.terrain.active = false;
                if (typeof Sound !== 'undefined' && typeof Sound.playBossBgm === 'function') {
                    Sound.playBossBgm(true);
                }
                if (typeof Boss !== 'undefined') {
                    levelManager.boss = new Boss(levelManager.starfield.width, 200);
                }
            }
        } else if (targetStage === 2) {
            levelManager.startStage2();
            const st2 = window.stonehengeStage || (typeof stonehengeStage !== 'undefined' ? stonehengeStage : null);
            if (mode === 'ZAB' && st2) {
                st2.blocks = [];
                st2.generating = false;
                st2.state = 'ZAB_RUSH';
                st2.zabTimer = 0;
                st2.zabWaveTimer = 0;
                if (typeof Sound !== 'undefined' && typeof Sound.playStage2Bgm === 'function') {
                    Sound.playStage2Bgm();
                }
            } else if (mode === 'BOSS' && st2) {
                st2.blocks = [];
                st2.generating = false;
                st2.state = 'BOSS';
                if (typeof Sound !== 'undefined' && typeof Sound.playBossBgm === 'function') {
                    Sound.playBossBgm(true);
                }
                const bossClass = (typeof GolemBoss !== 'undefined') ? GolemBoss : Boss;
                st2.boss = new bossClass(st2.width, st2.height / 2);
            }
        } else if (targetStage === 3) {
            levelManager.startStage3();
            const st3 = window.stage3 || (typeof stage3 !== 'undefined' ? stage3 : null);
            if (mode === 'BOSS' && st3) {
                st3.state = 'PRE_BOSS';
                st3.preBossTimer = 3400;
                if (st3.terrain) st3.terrain.wallActive = false;
            }
        } else if (targetStage === 4) {
            levelManager.startStage4();
            if (mode === 'JELLYFISH' && window.stage4 && typeof window.stage4.startJellyfishRush === 'function') {
                window.stage4.startJellyfishRush();
            } else if (mode === 'BOSS' && window.stage4) {
                window.stage4.state = 'BOSS';
                window.stage4.terrain.wallActive = false;
                window.stage4.terrain.floatingIslands = [];
                if (typeof Sound !== 'undefined' && typeof Sound.playBossBgm === 'function') {
                    Sound.playBossBgm(true);
                }
                if (typeof Stage4Boss !== 'undefined') {
                    window.stage4.boss = new Stage4Boss(window.stage4.width, window.stage4.height / 2);
                }
            }
        }
    }
    enemySpawnTimer = 0;
}

function startOrJumpStage4(mode = 'STAGE') {
    startOrJumpStage(4, mode, true);
}

function startGame() {
    if (gameStarted || window.bgmModalOpen) return;

    gameStarted = true;

    // Web Audioを確実にアンロック＆即座に「タララララン！」グラディウス開始音を再生！
    if (typeof Sound !== 'undefined') {
        Sound.unlockAudio();
        Sound.stopBgm();
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
        if (typeof Sound !== 'undefined' && levelManager && levelManager.stage === 1) {
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
    window.startOrJumpStage = startOrJumpStage;
    window.startOrJumpStage4 = startOrJumpStage4;
    window.equipFullPowerForTest = equipFullPowerForTest;

    // スタート画面 & BGM集モーダル & Komamiロゴタップによる開発者ステージセレクトのバインド
    const startScreen = document.getElementById('start-screen');
    const btnStart = document.getElementById('btn-start');
    const titleStageSelect = document.getElementById('title-stage-select');
    const titleStageBtns = titleStageSelect ? Array.from(titleStageSelect.querySelectorAll('button[data-stage]')) : [];
    const secretKonamiLogo = document.getElementById('secret-konami-logo');
    const btnBgmCollection = document.getElementById('btn-bgm-collection');
    const bgmModal = document.getElementById('bgm-modal');
    const btnBgmClose = document.getElementById('btn-bgm-close');
    const btnBgmCloseBottom = document.getElementById('btn-bgm-close-bottom');
    const btnBgmStop = document.getElementById('btn-bgm-stop');
    const bgmNowPlaying = document.getElementById('bgm-now-playing');
    const bgmTrackBtns = bgmModal ? Array.from(bgmModal.querySelectorAll('.bgm-track-btn')) : [];

    // 開発者ステージ選択UI（タイトル画面）の表示・非表示切替
    const setDevMenuVisible = (visible, playSound = true) => {
        const show = Boolean(visible);
        window.devModeUnlocked = show;
        if (titleStageSelect) {
            titleStageSelect.classList.toggle('dev-secret-hidden', !show);
            titleStageSelect.style.display = show ? 'flex' : 'none';
            titleStageSelect.setAttribute('aria-hidden', show ? 'false' : 'true');
        }
        if (show && playSound && typeof Sound !== 'undefined' && typeof Sound.playPowerUp === 'function') {
            Sound.unlockAudio();
            Sound.playPowerUp();
        }
    };
    window.setDevMenuVisible = setDevMenuVisible;
    // 初期状態は必ず非表示に固定
    setDevMenuVisible(false, false);

    const isBgmUiEvent = (e) => {
        if (window.bgmModalOpen) return true;
        if (!e || !e.target || typeof e.target.closest !== 'function') return false;
        return Boolean(
            e.target.closest('#btn-bgm-collection') ||
            e.target.closest('#bgm-modal') ||
            e.target.closest('#title-stage-select') ||
            e.target.closest('#secret-konami-logo')
        );
    };

    // タイトル画面の「Komami®」ロゴを3回タップした時のみ開発者ステージセレクトを開閉
    if (secretKonamiLogo) {
        let logoTapCount = 0;
        let lastLogoTapTime = 0;
        let lastPointerOrTouchTime = 0;

        const handleSecretLogoTap = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            const now = Date.now();

            // pointerdown / touchstart の直後に遅れて発火する合成 click イベントで1タップが2回分カウントされるのを防止
            if (e && e.type === 'click' && (now - lastPointerOrTouchTime < 450)) {
                return;
            }
            if (e && (e.type === 'pointerdown' || e.type === 'touchstart')) {
                if (now - lastPointerOrTouchTime < 80) return; // pointerdown + touchstart の同時発火を1回に集約
                lastPointerOrTouchTime = now;
            }

            // 前回のタップから2秒以上空いたらカウントをリセット
            if (now - lastLogoTapTime > 2000) {
                logoTapCount = 0;
            }
            lastLogoTapTime = now;
            logoTapCount++;

            if (logoTapCount >= 3) {
                logoTapCount = 0;
                setDevMenuVisible(!window.devModeUnlocked, true);
            }
        };
        secretKonamiLogo.addEventListener('pointerdown', handleSecretLogoTap);
        secretKonamiLogo.addEventListener('touchstart', handleSecretLogoTap, { passive: false });
        secretKonamiLogo.addEventListener('click', handleSecretLogoTap);
    }

    // タイトル画面の隠しステージセレクトボタン（1面〜4面）
    titleStageBtns.forEach(btn => {
        let lastBtnTap = 0;
        const handleStageSelectBtn = (e) => {
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
            const now = Date.now();
            if (now - lastBtnTap < 80) return;
            lastBtnTap = now;
            const st = parseInt(btn.getAttribute('data-stage'), 10) || 1;
            const mode = btn.getAttribute('data-mode') || 'STAGE';
            startOrJumpStage(st, mode);
        };
        btn.addEventListener('pointerdown', handleStageSelectBtn);
        btn.addEventListener('touchstart', handleStageSelectBtn, { passive: false });
        btn.addEventListener('click', handleStageSelectBtn);
    });

    const clearTrackSelection = () => {
        bgmTrackBtns.forEach(btn => {
            btn.classList.remove('playing');
            const playBadge = btn.querySelector('.bgm-track-play');
            if (playBadge) playBadge.textContent = '▶ 再生';
        });
    };

    const openBgmModal = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        window.bgmModalOpen = true;
        if (typeof Sound !== 'undefined') {
            Sound.unlockAudio();
        }
        if (bgmModal) {
            bgmModal.classList.add('open');
            bgmModal.setAttribute('aria-hidden', 'false');
        }
    };

    const closeBgmModal = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (typeof Sound !== 'undefined') {
            Sound.stopBgm();
        }
        clearTrackSelection();
        if (bgmNowPlaying) {
            bgmNowPlaying.textContent = '曲を選択して試聴できます';
        }
        if (bgmModal) {
            bgmModal.classList.remove('open');
            bgmModal.setAttribute('aria-hidden', 'true');
        }
        // 直後のイベント伝播でstartGameが誤発火しないよう微小ディレイで解除
        setTimeout(() => {
            window.bgmModalOpen = false;
        }, 120);
    };

    if (btnBgmCollection) {
        btnBgmCollection.addEventListener('pointerdown', openBgmModal);
        btnBgmCollection.addEventListener('touchstart', openBgmModal, { passive: false });
        btnBgmCollection.addEventListener('click', openBgmModal);
    }

    if (btnBgmClose) {
        btnBgmClose.addEventListener('click', closeBgmModal);
        btnBgmClose.addEventListener('touchend', closeBgmModal, { passive: false });
    }
    if (btnBgmCloseBottom) {
        btnBgmCloseBottom.addEventListener('click', closeBgmModal);
        btnBgmCloseBottom.addEventListener('touchend', closeBgmModal, { passive: false });
    }
    if (bgmModal) {
        bgmModal.addEventListener('click', (e) => {
            if (e.target === bgmModal) {
                closeBgmModal(e);
            }
        });
    }

    if (btnBgmStop) {
        const handleStop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (typeof Sound !== 'undefined') {
                Sound.stopBgm();
            }
            clearTrackSelection();
            if (bgmNowPlaying) {
                bgmNowPlaying.textContent = '⏹ 停止中（曲を選択して試聴できます）';
            }
        };
        btnBgmStop.addEventListener('click', handleStop);
        btnBgmStop.addEventListener('touchend', handleStop, { passive: false });
    }

    bgmTrackBtns.forEach(btn => {
        const handlePlayTrack = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const trackId = btn.getAttribute('data-bgm');
            if (typeof Sound === 'undefined') return;
            Sound.unlockAudio();
            if (Sound.ctx && Sound.ctx.state === 'suspended') {
                Sound.ctx.resume().catch(() => {});
            }

            clearTrackSelection();
            btn.classList.add('playing');
            const playBadge = btn.querySelector('.bgm-track-play');
            if (playBadge) playBadge.textContent = '🔊 再生中';

            let label = '';
            if (trackId === 'AIR') {
                Sound.playAirBgm(true);
                label = '♪ 再生中: 01. BEGINNING OF THE HISTORY (空中戦BGM)';
            } else if (trackId === 'STAGE1') {
                Sound.playStageBgm(true);
                label = '♪ 再生中: 02. CHALLENGER 1985 (1面メインBGM)';
            } else if (trackId === 'VOLCANO') {
                Sound.playVolcanoSurvivalBgm(true);
                label = '♪ 再生中: 03. AIRCRAFT CARRIER (1面・火山噴火)';
            } else if (trackId === 'STAGE2') {
                Sound.playStage2Bgm(true);
                label = '♪ 再生中: 04. BEAT BACK (2面・ストーンヘンジ)';
            } else if (trackId === 'STAGE3') {
                Sound.playStage3Bgm(true);
                label = '♪ 再生中: 05. BLANK MASK (3面・モアイ遺跡)';
            } else if (trackId === 'STAGE4') {
                Sound.playStage4Bgm(true);
                label = '♪ 再生中: 06. FREE FLYER (4面・逆火山)';
            } else if (trackId === 'BOSS') {
                Sound.playBossBgm(true);
                label = '♪ 再生中: 07. AIRCRAFT CARRIER (ボス戦BGM)';
            }
            if (bgmNowPlaying && label) {
                bgmNowPlaying.textContent = label;
            }
        };
        btn.addEventListener('click', handlePlayTrack);
    });

    window.addEventListener('keydown', (e) => {
        if (window.bgmModalOpen && e.code === 'Escape') {
            closeBgmModal(e);
        }
    });

    if (startScreen) {
        startScreen.addEventListener('pointerdown', (e) => {
            if (isBgmUiEvent(e)) return;
            e.preventDefault();
            startGame();
        });
        startScreen.addEventListener('touchstart', (e) => {
            if (isBgmUiEvent(e)) return;
            e.preventDefault();
            startGame();
        }, { passive: false });
    }
    if (btnStart) {
        btnStart.addEventListener('click', (e) => {
            if (isBgmUiEvent(e)) return;
            e.preventDefault();
            startGame();
        });
    }

    // 画面全体のどこをタップ・クリック・キー押ししても即座にゲーム開始＆BGM発音
    const globalTrigger = (e) => {
        if (isBgmUiEvent(e)) return;
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
    playerBullets = playerBullets.filter(b => b.active && ((typeof Laser !== 'undefined' && b instanceof Laser && b.framesAlive < b.minFrames) || b.x < canvas.width) && b.x > -50);
    window.playerBullets = playerBullets;

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

    enemyBullets.forEach(b => b.update(canvas.height));
    enemyBullets = enemyBullets.filter(b => b.active && b.x > -80 && b.x < canvas.width + 80 && b.y > -60 && b.y < canvas.height + 60);
    window.enemyBullets = enemyBullets;

    capsules.forEach(c => c.update());
    capsules = capsules.filter(c => c.active && c.x + c.width > 0);
    window.capsules = capsules;

    particles.forEach(p => p.update());
    particles = particles.filter(p => p.active);
    if (particles.length > 900) {
        particles = particles.slice(particles.length - 900);
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
        // 弾と地形・浮遊大陸（ステージ1・ステージ4）
        if ((levelManager.stage === 1 || levelManager.stage === 4) && bullet.active && levelManager.checkCollision(bullet)) {
            if (!(bullet instanceof Missile) && !(typeof Laser !== 'undefined' && bullet instanceof Laser)) {
                bullet.active = false;
                createExplosion(bullet.x, bullet.y, '#555555');
            }
        }

        enemies.forEach(enemy => {
            if (enemy instanceof FanEnemy && !enemy.visible) return;
            if (typeof IronMaidenEnemy !== 'undefined' && enemy instanceof IronMaidenEnemy && !enemy.visible) return;
            if (typeof ZabEnemy !== 'undefined' && enemy instanceof ZabEnemy && enemy.delay > 0) return;
            if (typeof WarpSphereEnemy !== 'undefined' && enemy instanceof WarpSphereEnemy && enemy.state === 'WARPING') return;

            if (bullet.active && enemy.active && checkCollision(bullet, enemy)) {
                const isIronMaiden = (typeof IronMaidenEnemy !== 'undefined' && enemy instanceof IronMaidenEnemy);
                if (isIronMaiden) {
                    const isLaser = (typeof Laser !== 'undefined' && bullet instanceof Laser);
                    // レーザーは消去せず長さと発射ペース（リズム）を完全に維持し、通常弾のみ消去する
                    if (!isLaser) {
                        bullet.active = false;
                    }
                    // 本家同様の甲高い金属摩擦音「キーキー！」を鳴らす
                    if (typeof Sound !== 'undefined') {
                        if (typeof Sound.playMetalHit === 'function') {
                            Sound.playMetalHit();
                        } else if (typeof Sound.playBossHit === 'function') {
                            Sound.playBossHit();
                        }
                    }
                    enemy.flashTimer = 4;

                    if (isLaser) {
                        const shotId = bullet.shotId || 0;
                        // レーザー1回の発射につき5ダメージ（従来の3倍のHP45なのでレーザーを9回当てると壊れる）
                        if (shotId > (enemy.lastLaserShotId || 0)) {
                            enemy.lastLaserShotId = shotId;
                            enemy.hp -= 5;
                        } else {
                            return;
                        }
                    } else {
                        if (enemy.hitCooldown > 0) {
                            return;
                        }
                        if (typeof Missile !== 'undefined' && bullet instanceof Missile) {
                            enemy.hitCooldown = 16;
                            enemy.hp -= 1;
                        } else {
                            enemy.hitCooldown = 6;
                            enemy.hp -= 2;
                        }
                    }
                } else {
                    if (!(bullet instanceof Laser)) {
                        bullet.active = false;
                    }
                    enemy.hp--;
                }
                if (enemy.hp <= 0) {
                    enemy.active = false;
                    const ex = enemy.x + enemy.width / 2;
                    const ey = enemy.y + enemy.height / 2;
                    createExplosion(ex, ey, '#88ccff');
                    
                    // 爆発音
                    if (typeof Sound !== 'undefined') Sound.playExplosion();

                    // スコア加算＆ポップアップ演出
                    if (typeof addScore === 'function') {
                        const pts = getEnemyScore(enemy);
                        addScore(pts, ex, ey, enemy.isRed ? '#ff99aa' : '#ffffaa');
                    }

                    // 赤い敵（isRed）を倒した場合、確定でパワーアップカプセルをドロップ！
                    if (enemy.isRed && typeof capsules !== 'undefined') {
                        capsules.push(new PowerUpCapsule(ex, ey));
                    }

                    // 群れ（編隊・小隊）に所属している敵の場合、群れ全滅時にカプセル確定ドロップ！
                    if (enemy.formation) {
                        enemy.formation.notifyDestroyed(ex, ey);
                    }
                }
            }
        });
    });

    // プレイヤーと敵の当たり判定
    enemies.forEach(enemy => {
        if (enemy instanceof FanEnemy && !enemy.visible) return;
        if (typeof IronMaidenEnemy !== 'undefined' && enemy instanceof IronMaidenEnemy && !enemy.visible) return;
        if (typeof ZabEnemy !== 'undefined' && enemy instanceof ZabEnemy && (enemy.delay > 0 || enemy.state === 'WARP_IN')) return;
        if (typeof WarpSphereEnemy !== 'undefined' && enemy instanceof WarpSphereEnemy && enemy.state === 'WARPING') return;
        if (typeof SuperVolcano !== 'undefined' && enemy instanceof SuperVolcano) return; // 火山山体はシールドで消滅させない
        if (typeof InvertedVolcano !== 'undefined' && enemy instanceof InvertedVolcano) return;
        if (typeof InvertedSuperVolcano !== 'undefined' && enemy instanceof InvertedSuperVolcano) return;

        if (enemy.active && checkCollision(player, enemy)) {
            if (typeof IronMaidenEnemy !== 'undefined' && enemy instanceof IronMaidenEnemy) {
                // 大型重装メカは自機シールド体当たりでも簡単には壊れない
                if (enemy.hitCooldown <= 0) {
                    enemy.hitCooldown = 14;
                    enemy.flashTimer = 6;
                    if (typeof player.onHit === 'function') {
                        player.onHit(enemy.x);
                    }
                }
                return;
            }
            if (player.shieldActive) {
                if (enemy.x > player.x) {
                    player.shieldHp--;
                    enemy.active = false;
                    const ex = enemy.x + enemy.width / 2;
                    const ey = enemy.y + enemy.height / 2;
                    createExplosion(enemy.x, enemy.y, '#ffffff');
                    if (typeof Sound !== 'undefined') Sound.playExplosion();
                    if (typeof addScore === 'function') {
                        addScore(getEnemyScore(enemy), ex, ey, '#ffffff');
                    }
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
            bullet.active = false;
            createExplosion(bullet.x, bullet.y, player.shieldActive ? '#ffffff' : '#ff5500');
            if (typeof player.onHit === 'function') {
                player.onHit(bullet.x);
            } else if (player.shieldActive) {
                player.shieldHp--;
                if (typeof Sound !== 'undefined') Sound.playBossHit();
                if (player.shieldHp <= 0) player.shieldActive = false;
            }
        }
        
        if (bullet.active && levelManager.checkCollision(bullet)) {
            bullet.active = false;
            if (typeof RingBullet !== 'undefined' && bullet instanceof RingBullet && typeof particles !== 'undefined' && typeof Particle !== 'undefined') {
                const cx = bullet.x + bullet.width / 2;
                const cy = bullet.y + bullet.height / 2;
                for (let i = 0; i < 5; i++) {
                    particles.push(new Particle(cx, cy, bullet.color || '#38bdf8'));
                }
            }
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
            if (typeof addScore === 'function') {
                addScore(500, capsule.x + capsule.width / 2, capsule.y + capsule.height / 2, '#00ffff');
            }
        }
    });

    // ボス戦の当たり判定（ステージ1ボス〜ステージ4ボス）
    const st4 = window.stage4 || (typeof stage4 !== 'undefined' ? stage4 : null);
    const currentBoss = (levelManager.stage === 1 && levelManager.state === 'BOSS') ? levelManager.boss :
                        (levelManager.stage === 2 && typeof stonehengeStage !== 'undefined' && stonehengeStage && stonehengeStage.boss) ? stonehengeStage.boss :
                        (levelManager.stage === 3 && (window.stage3 || (typeof stage3 !== 'undefined' ? stage3 : null)) && (window.stage3 || stage3).boss) ? (window.stage3 || stage3).boss :
                        (levelManager.stage === 4 && st4 && st4.boss) ? st4.boss : null;

    if (currentBoss && currentBoss.active) {
        const boss = currentBoss;

        // 登場中（isEntering）や撃破中（isDying）は無敵
        if (!boss.isEntering && !boss.isDying) {
            playerBullets.forEach(bullet => {
                if (!bullet.active) return;

                // ボスが放ったイオンリング弾（RingBullet）は自機弾で撃ち落とし可能
                if (boss.bullets && typeof RingBullet !== 'undefined') {
                    for (let i = 0; i < boss.bullets.length; i++) {
                        const bShot = boss.bullets[i];
                        if (bShot.active && bShot instanceof RingBullet && checkCollision(bullet, bShot)) {
                            bShot.active = false;
                            if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) {
                                bullet.active = false;
                            }
                            const rx = bShot.x + bShot.width / 2;
                            const ry = bShot.y + bShot.height / 2;
                            createExplosion(rx, ry, bShot.color || '#38bdf8');
                            if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') Sound.playBossHit();
                            if (typeof addScore === 'function') addScore(100, rx, ry, '#38bdf8');
                            if (!bullet.active) break;
                        }
                    }
                }

                if (bullet.active && boss.active) {
                    if (typeof boss.handleBulletCollision === 'function') {
                        boss.handleBulletCollision(bullet);
                    }
                }
            });

            // ボスの触手と自機の直接接触ダメージ判定（2面・3面ボス）
            const px = player.x + player.width / 2;
            const py = player.y + player.height / 2;
            if (typeof boss._getTentacleNodes === 'function') {
                [false, true].forEach(isBot => {
                    const nodes = boss._getTentacleNodes(isBot);
                    for (let i = 0; i < nodes.length; i++) {
                        const n = nodes[i];
                        if (Math.hypot(px - n.x, py - n.y) < 22) {
                            if (typeof player.onHit === 'function') player.onHit(n.x);
                            break;
                        }
                    }
                });
            }
            if (typeof boss._getBioMechaTentacles === 'function') {
                const tents = boss._getBioMechaTentacles();
                tents.forEach(t => {
                    for (let i = 0; i < t.nodes.length; i++) {
                        const n = t.nodes[i];
                        const r = (n.radius || 24) * 0.75;
                        if (Math.hypot(px - n.x, py - n.y) < r + 10) {
                            if (typeof player.onHit === 'function') player.onHit(n.x);
                            break;
                        }
                    }
                });
            }
        }

        // ボスの弾と自機の当たり判定（シールド有無に関わらず確実に着弾・被弾処理！）
        boss.bullets.forEach(bullet => {
            if (bullet.active && checkCollision(player, bullet)) {
                bullet.active = false;
                createExplosion(bullet.x, bullet.y, player.shieldActive ? '#ffffff' : '#ff3300');
                if (typeof player.onHit === 'function') {
                    player.onHit(bullet.x);
                } else if (player.shieldActive) {
                    player.shieldHp--;
                    if (typeof Sound !== 'undefined') Sound.playBossHit();
                    if (player.shieldHp <= 0) player.shieldActive = false;
                }
            }
        });
    }
}

function getEnemyScore(enemy) {
    if (!enemy) return 100;
    if (typeof IronMaidenEnemy !== 'undefined' && enemy instanceof IronMaidenEnemy) return 500;
    if (typeof HatcherEnemy !== 'undefined' && enemy instanceof HatcherEnemy) return 500;
    if (typeof LaserTurretEnemy !== 'undefined' && enemy instanceof LaserTurretEnemy) return 400;
    if (typeof RuneTurret !== 'undefined' && enemy instanceof RuneTurret) return 400;
    if (typeof StoneEyeEnemy !== 'undefined' && enemy instanceof StoneEyeEnemy) return 300;
    if (typeof JumperEnemy !== 'undefined' && enemy instanceof JumperEnemy) return 300;
    if (typeof DuckerEnemy !== 'undefined' && enemy instanceof DuckerEnemy) return 200;
    if (typeof TurretEnemy !== 'undefined' && enemy instanceof TurretEnemy) return 200;
    if (typeof WarpSphereEnemy !== 'undefined' && enemy instanceof WarpSphereEnemy) return 200;
    if (typeof RugraEnemy !== 'undefined' && enemy instanceof RugraEnemy) return 200;
    if (enemy.isRed) return 300;
    return 100;
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 18; i++) {
        particles.push(new Particle(x, y, color));
    }
}

// グラディウス風 ボス撃破時の超巨大連鎖爆発＆部位飛散演出
function triggerBossDefeatExplosion(boss) {
    if (boss.isDying) return;
    boss.isDying = true;

    // ボスを倒した時は大声で「ウワーーーー！」と断末魔の叫び声をあげる！
    if (typeof boss.triggerDeathScream === 'function') {
        boss.triggerDeathScream();
    } else {
        boss.isScreaming = true;
        boss.screamText = 'ウワーーーー！';
        if (typeof Sound !== 'undefined' && typeof Sound.playBossScream === 'function') {
            Sound.playBossScream();
        }
    }

    // サウンド再生（重低音連続大爆発）
    if (typeof Sound !== 'undefined') Sound.playBossExplode();

    const isStage2 = (typeof GolemBoss !== 'undefined' && boss instanceof GolemBoss);
    const isStage3 = (typeof BigCoreBoss !== 'undefined' && boss instanceof BigCoreBoss);
    const isStage4 = (typeof Stage4Boss !== 'undefined' && boss instanceof Stage4Boss);
    const getBossCenter = () => ({
        cx: isStage2 ? (boss.x + boss.width / 2) : boss.x,
        cy: isStage2 ? (boss.y + boss.height / 2) : boss.y
    });

    // ボス撃破特大ボーナススコア加算！
    if (typeof addScore === 'function') {
        const { cx, cy } = getBossCenter();
        const bossPts = isStage4 ? 40000 : (isStage3 ? 30000 : (isStage2 ? 20000 : 10000));
        addScore(bossPts, cx, cy - 20, '#ffea00');
    }

    // 撃破した瞬間にも第1波として部品・岩石/砂・内臓/血液が激しく飛び散る！
    if (!boss._initialDismembered && typeof spawnBossDismembermentWave === 'function') {
        boss._initialDismembered = true;
        spawnBossDismembermentWave(boss, true);
    }

    // 1. ボス各部（遮蔽板、上下アーム、外装、コア）から次々と巨大火炎球と破片・内容物が炸裂！（計28発）
    for (let i = 0; i < 28; i++) {
        setTimeout(() => {
            if (!boss) return;
            const { cx, cy } = getBossCenter();
            const offsetX = (Math.random() - 0.5) * (boss.width + 40);
            const offsetY = (Math.random() - 0.5) * (boss.height + 40);
            const explosionX = cx + offsetX;
            const explosionY = cy + offsetY;
            const radius = 35 + Math.random() * 30; // 半径35〜65pxの巨大火球
            if (typeof BossExplosion !== 'undefined') {
                particles.push(new BossExplosion(explosionX, explosionY, radius));
            }
            if (!isStage3) {
                const sparkColor = isStage2 ? '#e6ccb2' : (isStage4 ? '#ff5500' : '#ffaa00');
                createExplosion(explosionX, explosionY, sparkColor);
            }
            if (i % 3 === 0 && typeof spawnBossDismembermentWave === 'function') {
                spawnBossDismembermentWave(boss, false);
            }
        }, i * 45);
    }

    // 2. 最後に中心で超特大のファイナル大爆発＆全身の部品・岩石砂・内臓血液が完全にバラバラに四散！
    setTimeout(() => {
        if (!boss) return;
        const { cx: centerX, cy: centerY } = getBossCenter();
        if (typeof BossExplosion !== 'undefined') {
            particles.push(new BossExplosion(centerX, centerY, 90));
            particles.push(new BossExplosion(centerX - 20, centerY, 75));
            particles.push(new BossExplosion(centerX + 20, centerY, 75));
        }
        if (typeof spawnBossDismembermentWave === 'function') {
            spawnBossDismembermentWave(boss, true);
        }
        if (!isStage3) {
            for (let j = 0; j < 20; j++) {
                createExplosion(centerX, centerY, isStage2 ? '#ddb892' : (isStage4 ? '#ffaa00' : '#ffffff'));
            }
        }
    }, 1100);

    // 3. 大爆発の後にボス本体が完全に消滅（飛び散った部品・岩石・砂・内臓・血しぶきは画面上を舞い続ける）
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
