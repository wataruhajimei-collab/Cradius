class InputManager {
    constructor() {
        this.keys = {};

        // キーボード入力
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        // iOS Safariでのダブルタップズームや画面スクロール・バウンスを抑制
        document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
        document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });
        document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
    }

    isDown(code) {
        return this.keys[code] === true;
    }

    initTouchControls() {
        const moveZone = document.getElementById('touch-move-zone');
        const joystickBase = document.getElementById('joystick-base');
        const joystickStick = document.getElementById('joystick-stick');
        const btnShot = document.getElementById('btn-shot');
        const btnPower = document.getElementById('btn-powerup');

        if (!moveZone) return;

        let activeTouchId = null;
        let baseX = 0;
        let baseY = 0;
        const maxRadius = 45;
        const deadZone = 8;
        const octantRatio = 0.4142; // tan(22.5deg) - 8方向判定のしきい値

        const resetDirections = () => {
            this.keys['ArrowUp'] = false;
            this.keys['ArrowDown'] = false;
            this.keys['ArrowLeft'] = false;
            this.keys['ArrowRight'] = false;
        };

        const updateDirections = (dx, dy) => {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < deadZone) {
                resetDirections();
                return;
            }

            const absX = Math.abs(dx);
            const absY = Math.abs(dy);

            // 8方向判定 (上下左右 + 斜め4方向)
            this.keys['ArrowUp'] = dy < 0 && (absY >= absX * octantRatio);
            this.keys['ArrowDown'] = dy > 0 && (absY >= absX * octantRatio);
            this.keys['ArrowLeft'] = dx < 0 && (absX >= absY * octantRatio);
            this.keys['ArrowRight'] = dx > 0 && (absX >= absY * octantRatio);
        };

        // スワイプ移動ゾーンのタッチ処理（画面の外側の余白も含めた左側全域）
        moveZone.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (typeof Sound !== 'undefined') {
                Sound.unlockAudio();
            }
            if (typeof startGame === 'function') {
                startGame();
            }
            if (activeTouchId !== null) return;

            const touch = e.changedTouches[0];
            activeTouchId = touch.identifier;

            baseX = touch.clientX;
            baseY = touch.clientY;

            // スティックベースをタッチした指の直下に直接表示（余白でもゲーム内でもOK）
            if (joystickBase) {
                joystickBase.style.left = `${touch.clientX}px`;
                joystickBase.style.top = `${touch.clientY}px`;
                joystickBase.style.display = 'block';
                if (joystickStick) {
                    joystickStick.style.transform = 'translate(0px, 0px)';
                }
            }

            const hint = document.getElementById('move-hint');
            if (hint) hint.style.opacity = '0';
        }, { passive: false });

        moveZone.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (activeTouchId === null) return;

            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === activeTouchId) {
                    let dx = touch.clientX - baseX;
                    let dy = touch.clientY - baseY;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    // 指が大きく動いた場合は基準点をスムーズに引き寄せて追従
                    if (dist > maxRadius * 1.5) {
                        const angle = Math.atan2(dy, dx);
                        baseX = touch.clientX - Math.cos(angle) * (maxRadius * 1.5);
                        baseY = touch.clientY - Math.sin(angle) * (maxRadius * 1.5);
                        dx = touch.clientX - baseX;
                        dy = touch.clientY - baseY;
                        
                        if (joystickBase) {
                            joystickBase.style.left = `${baseX}px`;
                            joystickBase.style.top = `${baseY}px`;
                        }
                    }

                    // スティックヘッドの表示（最大半径でクリップ）
                    if (joystickStick) {
                        const clampedDist = Math.min(dist, maxRadius);
                        const angle = Math.atan2(dy, dx);
                        const stickX = Math.cos(angle) * clampedDist;
                        const stickY = Math.sin(angle) * clampedDist;
                        joystickStick.style.transform = `translate(${stickX}px, ${stickY}px)`;
                    }

                    // 8方向入力の更新
                    updateDirections(dx, dy);
                    break;
                }
            }
        }, { passive: false });

        const onTouchEnd = (e) => {
            if (activeTouchId === null) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === activeTouchId) {
                    activeTouchId = null;
                    resetDirections();
                    if (joystickBase) {
                        joystickBase.style.display = 'none';
                    }
                    const hint = document.getElementById('move-hint');
                    if (hint) hint.style.opacity = '0.5';
                    break;
                }
            }
        };

        moveZone.addEventListener('touchend', onTouchEnd, { passive: false });
        moveZone.addEventListener('touchcancel', onTouchEnd, { passive: false });

        // アクションボタン（SHOT, POWER）
        const bindButton = (btn, keyCode) => {
            if (!btn) return;
            const press = (e) => {
                e.preventDefault();
                if (typeof Sound !== 'undefined') {
                    Sound.unlockAudio();
                }
                if (typeof startGame === 'function') {
                    startGame();
                }
                this.keys[keyCode] = true;
                btn.classList.add('active');
            };
            const release = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.keys[keyCode] = false;
                btn.classList.remove('active');
            };

            btn.addEventListener('touchstart', press, { passive: false });
            btn.addEventListener('touchend', release, { passive: false });
            btn.addEventListener('touchcancel', release, { passive: false });

            btn.addEventListener('mousedown', press);
            btn.addEventListener('mouseup', release);
            btn.addEventListener('mouseleave', release);
        };

        bindButton(btnShot, 'KeyZ');
        bindButton(btnPower, 'KeyX');
    }
}

// グローバルなインスタンスとして作成
const Input = new InputManager();

// DOM読み込み完了時にタッチコントロールを初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Input.initTouchControls());
} else {
    Input.initTouchControls();
}
