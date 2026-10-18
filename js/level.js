// ============================================================================
// 1985年アーケード版『グラディウス』STAGE 1（火山）完全再現マップ＆ハードウェアタイル描画
// 実機キャプチャ (256x224: grad0010, grad0017, grad0019, grad0027, grad0030, grad0143, grad0157, sakura_03, sakura_04)
// から抽出した1:1ピクセルマトリクス＆実機パレットによる完全再現実装
// ============================================================================

const ARCADE_ROCK_PALETTE_GOLD = {
    '1': '#7C4204', // 最暗部クレバス（濃茶）
    '2': '#9C5E04', // 暗部岩肌（茶）
    '3': '#B47204', // 中間岩肌（黄茶）
    '4': '#CC8A04', // 明部岩肌（ゴールデンオーカー）
    '5': '#ECA604', // リムハイライト（ブライトアンバー）
    '6': '#FCCE04'  // 頂部ハイライト（山吹イエロー）
};

const ARCADE_ROCK_PALETTE_CRIMSON = {
    '1': '#6C020C', // 最暗部クレバス（暗 적褐）
    '2': '#8C0224', // 暗部岩肌（ディープレッド）
    '3': '#A4022C', // 中間岩肌（クリムゾン）
    '4': '#C40204', // 明部岩肌（スカーレット）
    '5': '#EC0224', // リムハイライト（ブライトレッド）
    '6': '#FC0224'  // 頂部ハイライト（鮮紅）
};

const ARCADE_FOREST_PALETTE = {
    '1': '#042E04', // 深緑シャドウ
    '2': '#8C7E04', // オリーブブラウン
    '3': '#9C8A04', // オリーブグリーン
    '4': '#A4A604', // イエローグリーン
    '5': '#B4C204', // ブライトリーフ
    '6': '#B4CE04'  // ハイライトライム
};

// 実機 grad0017 / grad0010 抽出：天井の波状岩盤タイル（64x16 アーケードピクセル）
// ※地上の波状岩盤（樹木がない場所）はこの上下反転 (vflip) と完全一致！
const ARCADE_CEILING_WAVY_ROWS = [
    "3233223323323233233233233233223323323323323322332332323323323233",
    "3323323322233222332223323323323322233222332332332223323322233233",
    "3231132313221313222313231132313222231323113231322132313221323132",
    "3212212321232121222123212212321233212321221232123212321232123212",
    "2222222212212212222212222222212211221222222221221222212212222122",
    "2121121211231211222112121121211233211212112121123121211231212112",
    "2111111221131121121122111111221133112211111122113111221131112211",
    "1121121121111212111121121121121111112112112112111121121111211211",
    "1131221323222213232222132322131121122112113122132322221323222213",
    "1421214121222141212221412122124121211212142121412122214121222141",
    "3334441434244414342444143424433312122121333444143424441434244414",
    "2552344311223443112234431122555243411434255234431122344311223443",
    "545522......22......22......524555333352545522......22......22..",
    "21............................122542245521......................",
    "................................22344322........................",
    "..................................2222.........................."
];

// 実機 grad0027 抽出：樹木・山岳・ハッチ下のソリッド岩盤タイル（64x16 アーケードピクセル）
const ARCADE_FLOOR_SOLID_ROWS = [
    "1133533311333533113353331133353311333533113335331133533311333533",
    "3353343233234335335334323323433533234335332343353353343233234335",
    "2232414222241423223241422224142322241423222414232232414222241423",
    "1142422433422424114242243342242413422424134224241142422433422424",
    "2242222122122224224222212212222422122224221222242242222122122224",
    "3321211233211212332121123321121233211212332112123321211233211212",
    "1112121133112121111212113311212113112121131121211112121133112121",
    "2211221211212211221122121121221121212211212122112211221211212211",
    "1111211211211211111121121111211211112112112112111111211211112112",
    "3311221111112211331122111311221133112211111122113311221113112211",
    "3321121211212112332112121321121233211212112121123321121213211212",
    "1122122222222122112212222122122211221222222221221122122221221222",
    "3321232122123212332123212321232133212321221232123321232123212321",
    "2223132311323132222313231223132322231323113231322223132312231323",
    "3322233233233222332223323322233233222332332332223322233233222332",
    "3323323322332332332332332323323333233233223323323323323323233233"
];

// 実機 grad0010 / grad0143 抽出：天井の岩盤隆起（40x12 アーケードピクセル）
// ※地上の置き岩（ミサイル遮断岩）はこの上下反転 (vflip) と完全一致！
const ARCADE_MOUND_ROWS = [
    "6665..6654411656441144111244411411111122",
    "6......665444166646614411211111111111222",
    "........66544416111664411123111121122222",
    ".........6554432115554411111122231223233",
    "..........655443555544111122222222223232",
    "...........66544556441411222222321213222",
    "............6654666411112222233312132222",
    "..............65666441112222233321122211",
    "...............66666441123233332112211..",
    ".................6666411233332222211....",
    ".....................444433222..31......"
];

// 実機 grad0027 抽出：緑の樹林タイル（32x15 アーケードピクセル）
const ARCADE_FOREST_ROWS = [
    "..4.......4.....................",
    "..64......64.........2...2......",
    ".352.....352....2...22...2......",
    ".6552.2..6552.2.2...222.22..6...",
    ".553212..553212.22..212222.54...",
    "5632411.3622411.22.6116421.653..",
    "4552421.4552321222151554316443..",
    "6532326.653232631135164432653311",
    "66523665665336641154154425554321",
    "64324645643246443146346425645523",
    "55226556552265522163265244655324",
    "44226545442265443162343346363333",
    "52214644522146432133235244636224",
    "33216341332163422224233146332312",
    "32213431322134221112114122633111"
];

// 実機 grad0030 + grad0157 抽出：山岳／火山／浮き岩の上半分マトリクス（77x54 アーケードピクセル）
// ・通常パレット (GOLD) で描画 ＝ 1面道中の岩山（中を抜けられる山は中段を抜く）
// ・深紅パレット (CRIMSON) で描画 ＝ 1面クライマックスの二連火山（4面では上下反転で逆火山）
// ・通常パレットで上半分＋上下反転した下半分を結合 ＝ 1面後半の「ひし形の浮き岩（大岩）」！
const ARCADE_MOUNTAIN_ROWS = [
    ".....................................2331....................................",
    ".....................................443211..................................",
    "....................................454211211................................",
    "...................................456422211211..............................",
    "..................................3552443322221..............................",
    "..................................4533444333321..............................",
    ".................................456335211122221.............................",
    "................................44563554211123221............................",
    "..............................1445643555332123321............................",
    ".............................124555345544232233221...........................",
    "............................1345564345233433223221...........................",
    "............................24455643452122233231111..........................",
    "...........................234566643452112222232111..........................",
    "..........................23455666336321111232221111.........................",
    "..........................344456663353211112233322211111.....................",
    ".........................334445665355321111222233222222111...................",
    ".........................334455665555321121112223322111111...................",
    "........................3344455654565321122111222332222211...................",
    "........................34445656545542211121111123332222111..................",
    "........................44455556565542111221111112333222211..................",
    ".......................344455565555542112222211112333322221..................",
    ".......................4445566565664321122222211111223322211.................",
    "......................33355555466533221112333322311111322321.................",
    "......................34554455465543221123343342332211111221.................",
    ".....................3455464546654432222333433322222222232111................",
    ".....................3344565546654431212333433212212211223211................",
    "....................33455665446654322113344443221112221112321................",
    "....................335556554565543211113445443221111121123221...............",
    "...................34355665546654432211334554332221111111233111..............",
    "...................33366655446654432111345544331122111112223321..............",
    "..................4435566554666644321134455432331111111123122211.............",
    "..................456566655466664431123455543222111111111221122111...........",
    ".................4555566554466655421123454423222111111112232211111...........",
    "................35655656544666655421234554442233211122111223222211...........",
    "...............4355565655466666554213446454422332211111111223112111..........",
    "..............34556554654466666554123456545433333122221111223322211..........",
    ".............335555544554666666653124555435443322221122211112332221..........",
    "............34555544565566666666312345544245443121211112212112222211.........",
    "...........345445655666656556666653456665442133411122211111132221111.........",
    "...........3434555566666655566665425566665331133111112211111122221111........",
    "..........33334655566565565666655446565566532111111111111111113222111........",
    ".........3332455566665655556666542555555566532211211111111111112222111.......",
    ".........333445655666554566666652555243555544322122211112122211123221........",
    "........333345565566555466666655354232334555443111111111111221111122111......",
    "........34433556566655446666655554233223344555421112111111112222211133.......",
    "........3433556666655445666655565432212132333454551111111221122121111223.....",
    "....444334335665565544556666665554121112233322454442211111121111111111112334.",
    "...43443333566656654465666666565532212121133333222333221111122111111111112233",
    "...43433635564646554466566666565332112221221122223432112111112222222111111112",
    "...33445555665545544565566665655421112321111112223332111211111111122222232111",
    "..433455556665545544665566665653431123311111112234332111133111222211111122321",
    ".4333455566655455445666566656635431232211111112443321121112222222211111112232",
    "43354565556655464455665566366634432321111211122443322112111112221122211111121",
    "44443555656564465556655666366634333421212111122432222211111111122222222111112"
];

function renderArcadeRowsToCanvas(rows, palette, scaleX = 3, scaleY = 3, vFlip = false, skipRowStart = -1, skipRowEnd = -1) {
    const h = rows.length;
    const w = rows[0].length;
    const c = document.createElement('canvas');
    c.width = Math.round(w * scaleX);
    c.height = Math.round(h * scaleY);
    const ctx = c.getContext('2d');
    for (let r = 0; r < h; r++) {
        if (skipRowStart >= 0 && r >= skipRowStart && r <= skipRowEnd) continue;
        const srcRow = vFlip ? rows[h - 1 - r] : rows[r];
        const y0 = Math.round(r * scaleY);
        const y1 = Math.round((r + 1) * scaleY);
        const rh = Math.max(1, y1 - y0);
        for (let col = 0; col < w; col++) {
            const ch = srcRow[col];
            if (ch === '.' || ch === ' ') continue;
            const color = palette[ch];
            if (!color) continue;
            const x0 = Math.round(col * scaleX);
            const x1 = Math.round((col + 1) * scaleX);
            ctx.fillStyle = color;
            ctx.fillRect(x0, y0, Math.max(1, x1 - x0), rh);
        }
    }
    return c;
}

window.ARCADE_MOUNTAIN_ROWS = ARCADE_MOUNTAIN_ROWS;
window.ARCADE_ROCK_PALETTE_GOLD = ARCADE_ROCK_PALETTE_GOLD;
window.ARCADE_ROCK_PALETTE_CRIMSON = ARCADE_ROCK_PALETTE_CRIMSON;
window.ARCADE_FOREST_ROWS = ARCADE_FOREST_ROWS;
window.ARCADE_FOREST_PALETTE = ARCADE_FOREST_PALETTE;
window.renderArcadeRowsToCanvas = renderArcadeRowsToCanvas;

class Starfield {
    constructor(canvasWidth, canvasHeight) {
        this.stars = [];
        this.width = canvasWidth;
        this.height = canvasHeight;
        // 1985年アーケード版実機 (grad0010, grad0017) のカラフルな1ドット星々
        const palette = ['#FCFEFC', '#B4DEFC', '#EC0224', '#0402B4', '#ECC204', '#042E04', '#C45E74'];
        for (let i = 0; i < 95; i++) {
            this.stars.push({
                x: Math.random() * this.width,
                y: Math.random() * (this.height - 44),
                speed: (i % 3 === 0) ? 1.4 : ((i % 3 === 1) ? 0.85 : 0.45),
                size: 2,
                color: palette[i % palette.length],
                blinkOffset: Math.random() * 100
            });
        }
    }

    update() {
        this.stars.forEach(star => {
            star.x -= star.speed;
            star.blinkOffset += 0.07;
            if (star.x < 0) {
                star.x = this.width;
                star.y = Math.random() * (this.height - 44);
            }
        });
    }

    draw(ctx) {
        ctx.save();
        this.stars.forEach(star => {
            if (Math.sin(star.blinkOffset) < -0.78) return;
            ctx.fillStyle = star.color;
            ctx.fillRect(Math.round(star.x), Math.round(star.y), star.size, star.size);
        });
        ctx.restore();
    }
}

class Terrain {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.segmentWidth = 40;
        this.topPoints = [];
        this.bottomPoints = [];
        this.scrollSpeed = 1.65;
        this.baseScrollSpeed = 1.65;
        this.textureOffsetX = 0;
        this.bgOffsetX = 0;
        this.active = false;
        this.generating = false;
        this.currentSegIndex = 0;
        this.spawnIndex = 0;
        this.floatingIslands = [];
        this.twinVolcanoes = [];
        this.treeClusters = [];
        this.mountains = [];
        this.mounds = [];
        this.scorePopups = [];
        this.isCrimsonPalette = false;
        this.wipeProgress = 0;

        // 1985年アーケード版実機 (256x224 -> 800x600: Yスケール 2.68x) 完全準拠：
        // ・天井岩盤帯は画面最上部 y=0〜42（1P/HIスコア・残機アイコンの背面に重なる！）
        //   ※実機仕様通り、天井の基本帯 (y<=42) は自機が擦ってもミスにならず、隆起部 (MOUND) のみ当たり判定を持つ！
        // ・地上岩盤帯は画面最下部 y=556〜600（下部 y=576〜598 にパワーメーターが重なる！）
        // ・地上の山岳（通常山×2、中を抜けられる5000点山×1、深紅二連火山×2）はポリゴンではなく
        //   実機から1:1抽出した山岳スプライト (ARCADE_MOUNTAIN_ROWS) を森林帯の背後に配置！
        this.topProfile = [];
        this.bottomProfile = [];
        for (let s = 0; s <= 112; s++) {
            if (s < 2 || s > 99) {
                this.topProfile.push(0);
                this.bottomProfile.push(600);
            } else {
                this.topProfile.push(42);
                this.bottomProfile.push(556);
            }
        }

        // 1985年アーケード版 STAGE 1 完全再現マップ配置テーブル
        // Section 1 (seg 2-29): 開幕の赤ドーム＋水色ドーム2基 (media_1792284490223_685b672c.jpg) → 森林1＋第1岩山＋天井隆起＋ダグム1 (grad0010.png)
        // Section 2 (seg 30-48): 森林2＋中を抜けられる山（5000点ボーナス！: stage_1-2.png）
        // Section 3 (seg 49-76): ダグム2＋森林3＋第3岩山 → 地上2連ダグム＆砲台群＋天井ダグム＆2連砲台 (grad0017.png, grad0019.png, gradius_1_39.png)
        // Section 4 (seg 77-85): ひし形の浮き岩（左面に5連ソロモンレーザー砲門）＋地上赤ジャンパー＋1UPポイント (sakura_03.png)
        // Section 5 (seg 86-99): 深紅パレット変化＋緑の樹海＋二連火山大噴火 (sakura_04.png, grad0027.png) → ビッグコア (grad0030.png)
        this.spawns = [
            // --- Section 1: 地形開始 〜 第1岩山 〜 第1ダグムハッチ ---
            { seg: 4,  type: 'DOME',    isCeiling: false, isRed: true },   // 開幕左の赤ドーム (media_1792284490223_685b672c.jpg)
            { seg: 6,  type: 'RUGRA',   y: 235, count: 3, hasRed: false }, // 飛来するルグル (media_1792284490223_685b672c.jpg 右上)
            { seg: 8,  type: 'DOME',    isCeiling: false, isRed: false },  // 水色ドーム #1
            { seg: 9,  type: 'TURRET',  isCeiling: true,  isRed: false },  // 天井ディー01砲台 #1
            { seg: 10, type: 'DOME',    isCeiling: false, isRed: false },  // 水色ドーム #2
            { seg: 10, type: 'TURRET',  isCeiling: true,  isRed: true },   // 天井ディー01砲台 #2 (赤)
            { seg: 11, type: 'TURRET',  isCeiling: true,  isRed: false },  // 天井ディー01砲台 #3
            { seg: 12, type: 'TREES',   widthPx: 540 },                    // 第1樹林帯（第1岩山の麓を連続して覆う：grad0010.png）
            { seg: 14, type: 'MOUNTAIN', hollow: false },                  // 第1岩山 (grad0010.png 左の黄金山)
            { seg: 16, type: 'JUMPER',  isCeiling: false, isRed: false },  // ジャンパー
            { seg: 18, type: 'MOUND',   isCeiling: true },                 // 天井の岩盤隆起 #1 (grad0010.png 上部中央)
            { seg: 20, type: 'FAN',     y: 165, isRed: true },
            { seg: 23, type: 'MOUND',   isCeiling: true },                 // 天井の岩盤隆起 #2 (grad0010.png 上部右端)
            { seg: 24, type: 'DUCKER',  isCeiling: false, isRed: true },   // 地上ダッカー
            { seg: 25, type: 'TURRET',  isCeiling: false, isRed: false },  // ダグム手前の地上ディー01砲台 #1 (grad0010.png 右下)
            { seg: 26, type: 'TURRET',  isCeiling: false, isRed: false },  // 地上ディー01砲台 #2
            { seg: 28, type: 'HATCHER', isCeiling: false, isRed: false },  // 第1地上スクランブルハッチ「ダグム」(grad0010.png 右下)
            { seg: 29, type: 'GARUN',   y: 250, count: 5 },

            // --- Section 2: 第2樹林帯 ＆ 中を抜けられる山（5000点ボーナス！） ---
            { seg: 32, type: 'TURRET',  isCeiling: true,  isRed: false },
            { seg: 34, type: 'DUCKER_BACK', isCeiling: false, isRed: true },
            { seg: 35, type: 'TREES',   widthPx: 560 },                    // 第2樹林帯
            { seg: 37, type: 'RUGRA',   y: 220, count: 4, hasRed: true },
            { seg: 38, type: 'MOUNTAIN', hollow: true },                   // 中を抜けられる山（通過で 5000 PTS ボーナス！: stage_1-2.png）
            { seg: 43, type: 'JUMPER',  isCeiling: false, isRed: true },
            { seg: 45, type: 'FAN',     y: 150, isRed: true },
            { seg: 47, type: 'TURRET',  isCeiling: false, isRed: false },

            // --- Section 3: 第2ダグム 〜 第3岩山 〜 2連地上ダグム＆天井ダグム要塞地帯 (grad0017, grad0019, gradius_1_39) ---
            { seg: 49, type: 'TURRET',  isCeiling: false, isRed: false },
            { seg: 50, type: 'TURRET',  isCeiling: false, isRed: true },
            { seg: 51, type: 'MOUND',   isCeiling: true },                 // 天井隆起 #3
            { seg: 52, type: 'HATCHER', isCeiling: false, isRed: false },  // 第2地上ダグムハッチ
            { seg: 54, type: 'TREES',   widthPx: 620 },                    // 第3樹林帯 (grad0017.png 左端まで続く樹林)
            { seg: 56, type: 'MOUNTAIN', hollow: false },                  // 第3岩山 (stage_1-3.png 左の岩山)
            { seg: 60, type: 'GARUN',   y: 260, count: 5 },
            { seg: 62, type: 'DUCKER',  isCeiling: false, isRed: true },
            { seg: 64, type: 'MOUND',   isCeiling: false },                // 地上の置き岩（ミサイル遮断マウンド：grad0143.png）
            { seg: 66, type: 'DUCKER',  isCeiling: false, isRed: false },  // grad0017 / grad0019 / gradius_1_39 左下のダッカー！
            { seg: 67, type: 'TURRET',  isCeiling: false, isRed: false },  // gradius_1_39 第3ダグム左隣の砲台
            { seg: 68, type: 'TURRET',  isCeiling: true,  isRed: false },  // sakura_03.png / stage_1-3 天井ダグム左隣の天井砲台 #1
            { seg: 69, type: 'TURRET',  isCeiling: true,  isRed: false },  // 天井砲台 #2
            { seg: 69, type: 'HATCHER', isCeiling: false, isRed: false },  // 第3地上ダグムハッチ (grad0017 / grad0019 左側ハッチ)
            { seg: 71, type: 'TURRET',  isCeiling: false, isRed: false },  // 2基の地上ダグムの間に並ぶ2連ディー01砲台 #1 (grad0017 / grad0019)
            { seg: 72, type: 'TURRET',  isCeiling: false, isRed: true },   // 2基の地上ダグムの間に並ぶ2連ディー01砲台 #2
            { seg: 72, type: 'HATCHER', isCeiling: true,  isRed: false },  // 天井ダグムハッチ (grad0017 / grad0019 / sakura_03 右上〜左上)
            { seg: 74, type: 'HATCHER', isCeiling: false, isRed: false },  // 第4地上ダグムハッチ (grad0017 / grad0019 右側ハッチ)

            // --- Section 4: ひし形の浮き岩（5連ソロモンレーザー砲門）＋赤ジャンパー＋隠し1UP (sakura_03.png) ---
            { seg: 77, type: 'JUMPER',  isCeiling: false, isRed: true },   // sakura_03.png 浮き岩の真下で跳ねる赤ジャンパー！
            { seg: 78, type: 'ISLAND',  y: 146, w: 210, h: 288, hasRedTurret: false }, // sakura_03.png ひし形の浮き岩＋左面5連ドーム＋右端1UP！
            { seg: 82, type: 'DOME',    isCeiling: false, isRed: false },  // sakura_03.png 右下の水色ドーム
            { seg: 83, type: 'RUGRA',   y: 230, count: 4, hasRed: true },
            { seg: 84, type: 'DUCKER_BACK', isCeiling: false, isRed: true },

            // --- Section 5: クライマックス・深紅パレット変化＋緑の樹海＋二連火山大噴火 (sakura_04.png, grad0027.png, grad0030.png) ---
            { seg: 86, type: 'TREES',   widthPx: 1800 },                   // 二連火山の麓一面に広がる緑の樹林帯 (grad0027 / grad0030)
            { seg: 88, type: 'VOLCANO_TWIN' },                             // 第1深紅火山（画面左端付近 x ≈ 36 に停止）
            { seg: 101, type: 'VOLCANO_TWIN' }                             // 第2深紅火山（画面右端付近 x ≈ 556 に停止、2つの火山の間からビッグコアがせり上がる！）
        ];

        Terrain._initSprites();
    }

    static _initSprites() {
        if (Terrain._sprites) return;
        // 256x224 -> 800x600 換算スケール (X=3.0, Y=2.7)
        const sx = 3.0;
        const sy = 2.7;

        const ceilGold = renderArcadeRowsToCanvas(ARCADE_CEILING_WAVY_ROWS, ARCADE_ROCK_PALETTE_GOLD, sx, sy, false);
        const ceilCrimson = renderArcadeRowsToCanvas(ARCADE_CEILING_WAVY_ROWS, ARCADE_ROCK_PALETTE_CRIMSON, sx, sy, false);

        const floorWavyGold = renderArcadeRowsToCanvas(ARCADE_CEILING_WAVY_ROWS, ARCADE_ROCK_PALETTE_GOLD, sx, sy, true);
        const floorWavyCrimson = renderArcadeRowsToCanvas(ARCADE_CEILING_WAVY_ROWS, ARCADE_ROCK_PALETTE_CRIMSON, sx, sy, true);

        const floorSolidGold = renderArcadeRowsToCanvas(ARCADE_FLOOR_SOLID_ROWS, ARCADE_ROCK_PALETTE_GOLD, sx, sy, false);
        const floorSolidCrimson = renderArcadeRowsToCanvas(ARCADE_FLOOR_SOLID_ROWS, ARCADE_ROCK_PALETTE_CRIMSON, sx, sy, false);

        const moundCeilGold = renderArcadeRowsToCanvas(ARCADE_MOUND_ROWS, ARCADE_ROCK_PALETTE_GOLD, sx, sy, false);
        const moundFloorGold = renderArcadeRowsToCanvas(ARCADE_MOUND_ROWS, ARCADE_ROCK_PALETTE_GOLD, sx, sy, true);

        const forestTile = renderArcadeRowsToCanvas(ARCADE_FOREST_ROWS, ARCADE_FOREST_PALETTE, sx, sy, false);

        const mountainGold = renderArcadeRowsToCanvas(ARCADE_MOUNTAIN_ROWS, ARCADE_ROCK_PALETTE_GOLD, sx * 0.9, sy * 0.92, false);
        // 中を抜けられる山（中段 row 22..37 を空けて自機が通過できるトンネルを形成！: stage_1-2.png）
        const mountainHollowGold = renderArcadeRowsToCanvas(ARCADE_MOUNTAIN_ROWS, ARCADE_ROCK_PALETTE_GOLD, sx * 0.9, sy * 0.92, false, 22, 37);
        const volcanoCrimson = renderArcadeRowsToCanvas(ARCADE_MOUNTAIN_ROWS, ARCADE_ROCK_PALETTE_CRIMSON, sx * 0.9, sy * 0.92, false);

        // ひし形の浮き岩（上半分＋上下反転した下半分をシームレス結合：sakura_03.png / grad0157.png）
        const islTop = renderArcadeRowsToCanvas(ARCADE_MOUNTAIN_ROWS, ARCADE_ROCK_PALETTE_GOLD, sx * 0.9, sy * 0.89, false);
        const islBot = renderArcadeRowsToCanvas(ARCADE_MOUNTAIN_ROWS, ARCADE_ROCK_PALETTE_GOLD, sx * 0.9, sy * 0.89, true);
        const islandGold = document.createElement('canvas');
        islandGold.width = islTop.width;
        islandGold.height = islTop.height * 2;
        const ictx = islandGold.getContext('2d');
        ictx.drawImage(islTop, 0, 0);
        ictx.drawImage(islBot, 0, islTop.height);

        Terrain._sprites = {
            ceilGold,
            ceilCrimson,
            floorWavyGold,
            floorWavyCrimson,
            floorSolidGold,
            floorSolidCrimson,
            moundCeilGold,
            moundFloorGold,
            forestTile,
            mountainGold,
            mountainHollowGold,
            volcanoCrimson,
            islandGold
        };
    }

    start() {
        this.active = true;
        this.generating = true;
        this.scrollSpeed = this.baseScrollSpeed;
        this.textureOffsetX = 0;
        this.bgOffsetX = 0;
        this.currentSegIndex = 0;
        this.spawnIndex = 0;
        this.isCrimsonPalette = false;
        this.topPoints = [];
        this.bottomPoints = [];
        this.floatingIslands = [];
        this.twinVolcanoes = [];
        this.treeClusters = [];
        this.mountains = [];
        this.mounds = [];
        this.scorePopups = [];
        let currentX = this.width;
        this.topPoints.push({ x: currentX, y: 0 });
        this.bottomPoints.push({ x: currentX, y: this.height });
    }

    stopGenerating() {
        this.generating = false;
    }

    update() {
        if (!this.active) return;

        // 二連火山エリア噴火直前 (v1.x <= 80) または噴火・ボス戦フェーズで実機 (sakura_04.png / grad0027.png) の深紅クリムゾンパレットへ遷移
        const isVolcanoNear = this.twinVolcanoes && this.twinVolcanoes.length > 0 && this.twinVolcanoes[0].x <= 80;
        const isVolcanoOrBossPhase = typeof levelManager !== 'undefined' && (levelManager.state === 'VOLCANO_ERUPTION' || levelManager.state === 'BOSS_ENTRY' || levelManager.state === 'BOSS' || levelManager.state === 'STAGE_CLEAR');
        if (isVolcanoNear || isVolcanoOrBossPhase) {
            this.isCrimsonPalette = true;
        }

        // スクロール更新
        this.topPoints.forEach(p => p.x -= this.scrollSpeed);
        this.bottomPoints.forEach(p => p.x -= this.scrollSpeed);
        this.textureOffsetX -= this.scrollSpeed;
        this.bgOffsetX -= this.scrollSpeed;

        // 緑の樹林帯の更新
        this.treeClusters.forEach(tc => {
            tc.x -= this.scrollSpeed;
        });
        this.treeClusters = this.treeClusters.filter(tc => tc.x + tc.widthPx > -120);

        // 山岳（通常山＆中を抜けられる5000点ボーナス山）の更新
        this.mountains.forEach(m => {
            m.x -= this.scrollSpeed;
            // 中を抜けられる山（5000点ボーナス）の通過判定
            if (m.hollow && !m.bonusAwarded && typeof player !== 'undefined' && !player.isDead) {
                const px = player.x + player.width / 2;
                const py = player.y + player.height / 2;
                const tunnelTop = m.y + Math.round(m.height * (22 / 54));
                const tunnelBot = m.y + Math.round(m.height * (38 / 54));
                if (px >= m.x + m.width * 0.35 && px <= m.x + m.width * 0.65 && py >= tunnelTop && py <= tunnelBot) {
                    m.bonusAwarded = true;
                    if (typeof ui !== 'undefined' && typeof ui.addScore === 'function') {
                        ui.addScore(5000);
                    }
                    this.scorePopups.push({
                        x: m.x + m.width / 2,
                        y: (tunnelTop + tunnelBot) / 2,
                        text: '5000',
                        timer: 65
                    });
                }
            }
        });
        this.mountains = this.mountains.filter(m => m.x + m.width > -120);

        // 天井隆起＆地上置き岩マウンドの更新
        this.mounds.forEach(md => {
            md.x -= this.scrollSpeed;
        });
        this.mounds = this.mounds.filter(md => md.x + md.width > -120);

        // 浮き岩の更新（1UP隠しポイント判定含む）
        this.floatingIslands.forEach(isl => {
            isl.scrollSpeed = this.scrollSpeed;
            isl.update();
        });
        this.floatingIslands = this.floatingIslands.filter(isl => isl.active);

        // スコアポップアップ更新
        this.scorePopups.forEach(sp => {
            sp.x -= this.scrollSpeed * 0.5;
            sp.timer--;
        });
        this.scorePopups = this.scorePopups.filter(sp => sp.timer > 0);

        while (this.topPoints.length > 2 && this.topPoints[1].x < -80) {
            this.topPoints.shift();
            this.bottomPoints.shift();
        }

        if (!this.generating) {
            if (this.topPoints.length <= 2 && this.topPoints[this.topPoints.length - 1].x < 0 && this.floatingIslands.length === 0) {
                this.active = false;
                this.topPoints = [];
                this.bottomPoints = [];
                this.treeClusters = [];
                this.mountains = [];
                this.mounds = [];
                return;
            }
        }

        if (this.generating) {
            let lastX = this.topPoints.length > 0 ? this.topPoints[this.topPoints.length - 1].x : this.width;
            while (lastX < this.width + this.segmentWidth) {
                lastX += this.segmentWidth;

                if (this.currentSegIndex < this.topProfile.length) {
                    const topY = this.topProfile[this.currentSegIndex];
                    const bottomY = this.bottomProfile[this.currentSegIndex];

                    this.topPoints.push({ x: lastX, y: topY });
                    this.bottomPoints.push({ x: lastX, y: bottomY });

                    this.checkSpawnsForSeg(this.currentSegIndex, lastX, topY, bottomY);

                    this.currentSegIndex++;
                } else {
                    this.generating = false;
                    break;
                }
            }
        }
    }

    checkSpawnsForSeg(segIdx, x, topY, bottomY) {
        if (typeof enemies === 'undefined') return;

        while (this.spawnIndex < this.spawns.length && this.spawns[this.spawnIndex].seg <= segIdx) {
            let sp = this.spawns[this.spawnIndex];
            if (sp.isCeiling && topY < 8) sp = Object.assign({}, sp, { isCeiling: false });
            if (sp.seg === segIdx) {
                if (sp.type === 'TURRET' && typeof TurretEnemy !== 'undefined') {
                    const gy = sp.isCeiling ? topY : bottomY;
                    enemies.push(new TurretEnemy(x, gy, sp.isCeiling, !!sp.isRed));
                } else if (sp.type === 'DUCKER' && typeof DuckerEnemy !== 'undefined') {
                    const gy = sp.isCeiling ? topY : bottomY;
                    enemies.push(new DuckerEnemy(x, gy, sp.isCeiling, !!sp.isRed, -1));
                } else if (sp.type === 'DUCKER_BACK' && typeof DuckerEnemy !== 'undefined') {
                    const backX = 4;
                    const gy = sp.isCeiling ? this.getTopY(backX) : this.getBottomY(backX);
                    enemies.push(new DuckerEnemy(backX, gy, sp.isCeiling, !!sp.isRed, 1));
                } else if (sp.type === 'JUMPER' && typeof JumperEnemy !== 'undefined') {
                    const gy = sp.isCeiling ? topY : bottomY;
                    enemies.push(new JumperEnemy(x, gy, sp.isCeiling, !!sp.isRed));
                } else if (sp.type === 'DOME' && typeof DomeEnemy !== 'undefined') {
                    const gy = sp.isCeiling ? topY : bottomY;
                    enemies.push(new DomeEnemy(x, gy, sp.isCeiling, !!sp.isRed));
                } else if (sp.type === 'HATCHER' && typeof HatcherEnemy !== 'undefined') {
                    const gy = sp.isCeiling ? topY : bottomY;
                    enemies.push(new HatcherEnemy(x, gy, sp.isCeiling, !!sp.isRed));
                } else if (sp.type === 'TREES') {
                    this.treeClusters.push({
                        x: x,
                        widthPx: sp.widthPx || 320
                    });
                } else if (sp.type === 'MOUNTAIN') {
                    const spr = Terrain._sprites ? Terrain._sprites.mountainGold : null;
                    const mw = spr ? spr.width : 208;
                    const mh = spr ? spr.height : 134;
                    this.mountains.push({
                        x: x,
                        y: 558 - mh,
                        width: mw,
                        height: mh,
                        hollow: !!sp.hollow,
                        bonusAwarded: false
                    });
                } else if (sp.type === 'MOUND') {
                    const spr = Terrain._sprites ? Terrain._sprites.moundCeilGold : null;
                    const mdw = spr ? spr.width : 120;
                    const mdh = spr ? spr.height : 30;
                    this.mounds.push({
                        x: x,
                        y: sp.isCeiling ? 26 : (562 - mdh),
                        width: mdw,
                        height: mdh,
                        isCeiling: !!sp.isCeiling
                    });
                } else if (sp.type === 'ISLAND' && typeof FloatingIsland !== 'undefined') {
                    const isl = new FloatingIsland(x, sp.y || 146, sp.w || 208, sp.h || 288, this.scrollSpeed, !!sp.hasRedTurret);
                    this.floatingIslands.push(isl);
                } else if (sp.type === 'VOLCANO_TWIN' && typeof Volcano !== 'undefined') {
                    const v = new Volcano(x - 40, 558, false);
                    enemies.push(v);
                    this.twinVolcanoes.push(v);
                } else if (sp.type === 'GARUN' && typeof GarunFormation !== 'undefined') {
                    new GarunFormation(sp.y || 250, true, sp.count || 5);
                } else if (sp.type === 'RUGRA' && typeof RugraEnemy !== 'undefined') {
                    const cnt = sp.count || 4;
                    const baseY = sp.y || 235;
                    for (let i = 0; i < cnt; i++) {
                        const ry = baseY + (i - 1.5) * 34;
                        enemies.push(new RugraEnemy(x + 16, ry, sp.hasRed && i === 0, i * 14));
                    }
                } else if (sp.type === 'FAN' && typeof Formation !== 'undefined') {
                    new Formation(sp.y || 165, 5, sp.isRed !== false);
                }
            }
            this.spawnIndex++;
        }
    }

    // 任意X座標が緑の樹林・山岳・火山の範囲内かどうか（地上タイルをソリッド岩盤にする判定）
    _hasGroundCoverAt(x) {
        for (let i = 0; i < this.treeClusters.length; i++) {
            const tc = this.treeClusters[i];
            if (x >= tc.x - 8 && x <= tc.x + tc.widthPx + 8) return true;
        }
        for (let i = 0; i < this.mountains.length; i++) {
            const m = this.mountains[i];
            if (x >= m.x && x <= m.x + m.width) return true;
        }
        for (let i = 0; i < this.twinVolcanoes.length; i++) {
            const v = this.twinVolcanoes[i];
            if (v && v.active && x >= v.x && x <= v.x + v.width) return true;
        }
        return false;
    }

    draw(ctx) {
        if (this.topPoints.length < 2 || !this.active) return;
        Terrain._initSprites();
        const spr = Terrain._sprites;

        ctx.save();

        // 1985年アーケード版実機完全再現：ボス撃破後、地形が右から左へタイル列単位（24px幅）で徐々に消滅（ワイプ）
        if (this.wipeProgress > 0) {
            const wipeWidth = Math.floor((this.width * Math.min(1.0, this.wipeProgress)) / 24) * 24;
            const visibleW = Math.max(0, this.width - wipeWidth);
            if (visibleW <= 0) {
                ctx.restore();
                return;
            }
            ctx.beginPath();
            ctx.rect(0, 0, visibleW, this.height);
            ctx.clip();
        }

        // 1. 道中の黄金岩山 ＆ 中を抜けられる5000点ボーナス山を描画（緑の樹林帯の背後に配置：grad0010.png 完全準拠）
        for (let i = 0; i < this.mountains.length; i++) {
            const m = this.mountains[i];
            if (m.x + m.width < -20 || m.x > this.width + 20) continue;
            const img = m.hollow ? spr.mountainHollowGold : spr.mountainGold;
            ctx.drawImage(img, Math.round(m.x), Math.round(m.y));
        }

        // 2. クライマックスの深紅二連火山を描画（緑の樹林帯の背後に配置：sakura_04.png / grad0027.png 完全準拠）
        if (this.twinVolcanoes && this.twinVolcanoes.length > 0) {
            this.twinVolcanoes.forEach(v => {
                if (v && v.active) {
                    v._drawnByTerrain = true;
                    v.draw(ctx);
                }
            });
        }

        // 3. 緑の樹林帯タイル (ARCADE_FOREST_ROWS: grad0027.png) を山岳・火山の麓の手前に連続描画！
        const ft = spr.forestTile;
        if (ft) {
            for (let i = 0; i < this.treeClusters.length; i++) {
                const tc = this.treeClusters[i];
                const startX = Math.round(tc.x);
                const endX = Math.round(tc.x + tc.widthPx);
                if (endX < -20 || startX > this.width + 20) continue;
                for (let tx = startX; tx < endX; tx += ft.width) {
                    if (tx + ft.width < 0 || tx > this.width) continue;
                    const drawW = Math.min(ft.width, endX - tx);
                    ctx.drawImage(ft, 0, 0, drawW, ft.height, tx, 558 - ft.height, drawW, ft.height);
                }
            }
        }

        // 4. 地形が存在するX範囲を計算
        let minTerrainX = this.width;
        let maxTerrainX = 0;
        for (let i = 0; i < this.topPoints.length; i++) {
            const p = this.topPoints[i];
            if (p.y > 0) {
                if (p.x < minTerrainX) minTerrainX = p.x;
                if (p.x > maxTerrainX) maxTerrainX = p.x;
            }
        }

        if (maxTerrainX > minTerrainX) {
            const ceilTile = this.isCrimsonPalette ? spr.ceilCrimson : spr.ceilGold;
            const floorWavyTile = this.isCrimsonPalette ? spr.floorWavyCrimson : spr.floorWavyGold;
            const floorSolidTile = this.isCrimsonPalette ? spr.floorSolidCrimson : spr.floorSolidGold;
            const tileW = ceilTile.width; // 192px (64 arcade px * 3)
            const scrollMod = ((Math.round(this.textureOffsetX) % tileW) + tileW) % tileW;

            const clipStartX = Math.max(0, Math.round(minTerrainX));
            const clipEndX = Math.min(this.width, Math.round(maxTerrainX));

            if (clipEndX > clipStartX) {
                // 4a. 天井の16アーケードピクセル岩盤帯 (y=0〜43: 1P/HIスコア・残機アイコンの背面に重なる！)
                ctx.save();
                ctx.beginPath();
                ctx.rect(clipStartX, 0, clipEndX - clipStartX, ceilTile.height);
                ctx.clip();
                for (let tx = scrollMod - tileW; tx < clipEndX; tx += tileW) {
                    if (tx + tileW < clipStartX) continue;
                    ctx.drawImage(ceilTile, tx, 0);
                }
                ctx.restore();

                // 4b. 地上の16アーケードピクセル岩盤帯 (y=557〜600: 下部パワーメーターの背面に重なる！)
                ctx.save();
                ctx.beginPath();
                ctx.rect(clipStartX, 557, clipEndX - clipStartX, 43);
                ctx.clip();
                for (let tx = scrollMod - tileW; tx < clipEndX; tx += tileW) {
                    if (tx + tileW < clipStartX) continue;
                    // まず波状岩盤タイルを描画
                    ctx.drawImage(floorWavyTile, tx, 557);
                }
                // 樹林や山岳・火山がある区間は隙間ができないよう実機通りソリッド岩盤タイルを上書き
                // ※iOS/SafariでのFPS低下・描画遅延を防ぐため、ネストされたctx.clip()を排除しdrawImageスライスで超高速描画
                for (let i = 0; i < this.treeClusters.length; i++) {
                    const tc = this.treeClusters[i];
                    const sx0 = Math.max(clipStartX, Math.round(tc.x));
                    const sx1 = Math.min(clipEndX, Math.round(tc.x + tc.widthPx));
                    if (sx1 <= sx0) continue;
                    let curX = sx0;
                    while (curX < sx1) {
                        const drawW = Math.min(tileW, sx1 - curX);
                        let srcX = Math.round((curX - scrollMod) % tileW);
                        if (srcX < 0) srcX += tileW;
                        const chunkW = Math.min(drawW, tileW - srcX);
                        ctx.drawImage(floorSolidTile, srcX, 0, chunkW, 43, curX, 557, chunkW, 43);
                        curX += chunkW;
                    }
                }
                ctx.restore();
            }
        }

        // 5. 天井の岩盤隆起 (grad0010.png) ＆ 地上の置き岩マウンド (grad0143.png) を描画
        for (let i = 0; i < this.mounds.length; i++) {
            const md = this.mounds[i];
            if (md.x + md.width < -20 || md.x > this.width + 20) continue;
            const img = md.isCeiling ? spr.moundCeilGold : spr.moundFloorGold;
            ctx.drawImage(img, Math.round(md.x), Math.round(md.y));
        }

        // 6. 中空の「ひし形の浮き岩 (FloatingIsland: sakura_03.png)」を描画
        this.floatingIslands.forEach(isl => isl.draw(ctx));

        // 7. 5000点ボーナス / 1UP ポップアップ描画
        for (let i = 0; i < this.scorePopups.length; i++) {
            const sp = this.scorePopups[i];
            ctx.fillStyle = (sp.timer % 6 < 3) ? '#FCFEFC' : '#FCCE04';
            ctx.font = 'bold 16px "Press Start 2P", "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(sp.text, Math.round(sp.x), Math.round(sp.y));
        }

        ctx.restore();
    }

    getTopY(x) {
        if (this.topPoints.length < 2) return 0;
        let baseTop = 0;
        for (let i = 0; i < this.topPoints.length - 1; i++) {
            const p1 = this.topPoints[i];
            const p2 = this.topPoints[i + 1];
            if (x >= p1.x && x <= p2.x) {
                const t = (x - p1.x) / (p2.x - p1.x);
                baseTop = p1.y + t * (p2.y - p1.y);
                break;
            }
        }
        for (let i = 0; i < this.mounds.length; i++) {
            const md = this.mounds[i];
            if (md.isCeiling && x >= md.x + 8 && x <= md.x + md.width - 8) {
                return Math.max(baseTop, md.y + md.height - 4);
            }
        }
        return baseTop;
    }

    getBottomY(x) {
        if (this.bottomPoints.length < 2) return this.height;
        let baseBot = this.height;
        for (let i = 0; i < this.bottomPoints.length - 1; i++) {
            const p1 = this.bottomPoints[i];
            const p2 = this.bottomPoints[i + 1];
            if (x >= p1.x && x <= p2.x) {
                const t = (x - p1.x) / (p2.x - p1.x);
                baseBot = p1.y + t * (p2.y - p1.y);
                break;
            }
        }
        for (let i = 0; i < this.mounds.length; i++) {
            const md = this.mounds[i];
            if (!md.isCeiling && x >= md.x + 6 && x <= md.x + md.width - 6) {
                return Math.min(baseBot, md.y + 4);
            }
        }
        return baseBot;
    }

    checkCollision(rect) {
        if (!this.active || this.topPoints.length < 2) return false;

        // ワイプで消去された領域は当たり判定も解除
        if (this.wipeProgress > 0) {
            const wipeWidth = Math.floor((this.width * Math.min(1.0, this.wipeProgress)) / 24) * 24;
            const visibleW = Math.max(0, this.width - wipeWidth);
            if (rect.x >= visibleW) return false;
        }

        // 1. 天井の隆起マウンドとの衝突判定
        // ※本家1985年AC版仕様通り、1面の基本天井帯 (y<=42) は当たり判定が無く（左上隅の火山安全地帯が成立）、
        //   隆起している岩塊 (MOUND) のみ激突判定を持つ！
        for (let i = 0; i < this.mounds.length; i++) {
            const md = this.mounds[i];
            if (rect.x + rect.width > md.x + 10 && rect.x < md.x + md.width - 10) {
                if (md.isCeiling) {
                    if (rect.y < md.y + md.height - 4) return true;
                } else {
                    if (rect.y + rect.height > md.y + 4) return true;
                }
            }
        }

        // 2. 地上岩盤帯 (y=558) との衝突判定
        const yBottomLeft = this.getBottomY(rect.x + 4);
        const yBottomRight = this.getBottomY(rect.x + rect.width - 4);
        if (rect.y + rect.height > yBottomLeft + 2 || rect.y + rect.height > yBottomRight + 2) return true;

        // 3. 道中の岩山 ＆ 中を抜けられる山との衝突判定
        for (let i = 0; i < this.mountains.length; i++) {
            const m = this.mountains[i];
            if (rect.x + rect.width < m.x + 12 || rect.x > m.x + m.width - 12) continue;
            if (rect.y + rect.height < m.y + 6 || rect.y > m.y + m.height) continue;

            // 中を抜けられる山のトンネル区間 (row 22..37) は安全に通過可能！
            if (m.hollow) {
                const tunnelTop = m.y + Math.round(m.height * (22 / 54));
                const tunnelBot = m.y + Math.round(m.height * (38 / 54));
                if (rect.y >= tunnelTop - 4 && rect.y + rect.height <= tunnelBot + 4) {
                    continue;
                }
            }

            // 円錐形スロープ当たり判定
            const midX = m.x + m.width / 2;
            const checkX = (rect.x + rect.width / 2 < midX)
                ? Math.min(midX, rect.x + rect.width - 6)
                : Math.max(midX, rect.x + 6);
            const distRatio = Math.abs(checkX - midX) / (m.width * 0.46);
            if (distRatio < 1.0) {
                const slopeTopY = m.y + m.height * distRatio;
                if (rect.y + rect.height > slopeTopY + 6) return true;
            }
        }

        // 4. ひし形の浮き岩との衝突判定
        for (let i = 0; i < this.floatingIslands.length; i++) {
            if (this.floatingIslands[i].checkCollision(rect)) return true;
        }

        // 5. 二連火山の山体との衝突判定
        for (let i = 0; i < this.twinVolcanoes.length; i++) {
            const v = this.twinVolcanoes[i];
            if (v && v.active && typeof v.checkCollision === 'function' && v.checkCollision(rect)) {
                return true;
            }
        }

        return false;
    }

    getGroundY(x) {
        return this.getBottomY(x);
    }
}

// 1985年アーケード版 1面後半の「ひし形の浮き岩 (FloatingIsland: sakura_03.png & grad0157.png)」完全再現：
// 実機から1:1抽出したひし形岩塊スプライト (islandGold) と、左斜面に張り付く5基の横向きソロモンレーザー砲門、
// さらに右端通過時の「スコア千の位が偶数で1UP」隠しギミックまで完全実装！
class FloatingIsland {
    constructor(x, y, width = 208, height = 288, scrollSpeed = 1.65, hasRedTurret = false) {
        Terrain._initSprites();
        const spr = Terrain._sprites ? Terrain._sprites.islandGold : null;
        this.x = x;
        this.y = y;
        this.width = spr ? spr.width : width;
        this.height = spr ? spr.height : height;
        this.scrollSpeed = scrollSpeed;
        this.active = true;
        this.oneUpChecked = false;
        this.turrets = [];

        // sakura_03.png 完全準拠：ひし形浮き岩の左斜面に沿って5基の横向き水色ドーム（ソロモンレーザー砲門）を配置！
        if (typeof DomeEnemy !== 'undefined' && typeof enemies !== 'undefined') {
            const domeSpecs = [
                { fracY: 0.16, relX: 44, isRed: false },
                { fracY: 0.33, relX: 18, isRed: hasRedTurret },
                { fracY: 0.49, relX: -6, isRed: false },
                { fracY: 0.65, relX: 18, isRed: false },
                { fracY: 0.82, relX: 44, isRed: false }
            ];
            domeSpecs.forEach(d => {
                const relY = Math.round(this.height * d.fracY) - 18;
                const dome = new DomeEnemy(
                    this.x + d.relX,
                    this.y + relY,
                    false,
                    d.isRed,
                    this,
                    d.relX,
                    relY,
                    'LEFT_WALL'
                );
                this.turrets.push(dome);
                enemies.push(dome);
            });
        }
    }

    update() {
        this.x -= this.scrollSpeed;

        // 本家1面名物：ひし形の浮き岩の右端ポイントを、スコア1000の位が偶数のときに通過すると隠し1UP！ (stage_1-3.png)
        if (!this.oneUpChecked && typeof player !== 'undefined' && !player.isDead) {
            const rightTipX = this.x + this.width;
            const midY = this.y + this.height / 2;
            const px = player.x + player.width / 2;
            const py = player.y + player.height / 2;
            if (px >= rightTipX - 16 && px <= rightTipX + 24 && Math.abs(py - midY) < 56) {
                this.oneUpChecked = true;
                const scoreVal = (typeof ui !== 'undefined' && typeof ui.score === 'number') ? ui.score : 0;
                const thousandsDigit = Math.floor(scoreVal / 1000) % 10;
                if (thousandsDigit % 2 === 0 && typeof ui !== 'undefined') {
                    ui.lives = (ui.lives || 3) + 1;
                    if (typeof Sound !== 'undefined' && typeof Sound.playOneUp === 'function') {
                        Sound.playOneUp();
                    } else if (typeof Sound !== 'undefined' && typeof Sound.playPowerUp === 'function') {
                        Sound.playPowerUp();
                    }
                    if (typeof levelManager !== 'undefined' && levelManager.terrain) {
                        levelManager.terrain.scorePopups.push({
                            x: rightTipX + 12,
                            y: midY,
                            text: '1UP',
                            timer: 75
                        });
                    }
                }
            }
        }

        if (this.x + this.width < -160) {
            this.active = false;
        }
    }

    checkCollision(rect) {
        if (!this.active) return false;
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        const rx = Math.max(16, this.width * 0.44);
        const ry = Math.max(24, this.height * 0.46);

        const testPoints = [
            { x: rect.x + 4, y: rect.y + rect.height / 2 },
            { x: rect.x + rect.width - 4, y: rect.y + rect.height / 2 },
            { x: rect.x + rect.width / 2, y: rect.y + 3 },
            { x: rect.x + rect.width / 2, y: rect.y + rect.height - 3 }
        ];
        for (let i = 0; i < testPoints.length; i++) {
            const p = testPoints[i];
            if (Math.abs(p.x - cx) / rx + Math.abs(p.y - cy) / ry <= 1.0) {
                return true;
            }
        }
        return false;
    }

    draw(ctx) {
        if (!this.active) return;
        Terrain._initSprites();
        const spr = Terrain._sprites ? Terrain._sprites.islandGold : null;
        if (spr) {
            ctx.drawImage(spr, Math.round(this.x), Math.round(this.y));
        }
    }
}

class LevelManager {
    constructor(canvasWidth, canvasHeight) {
        this.starfield = new Starfield(canvasWidth, canvasHeight);
        this.terrain = new Terrain(canvasWidth, canvasHeight);
        this.time = 0;
        // 1985年アーケード版1面進行フロー：
        // AIR_BATTLE (宇宙空中戦) -> TERRAIN (火山地帯進攻) -> VOLCANO_ERUPTION (二連火山・スクロール停止大噴火) -> BOSS_ENTRY -> BOSS (ビッグコア) -> STAGE_CLEAR
        this.state = 'AIR_BATTLE';
        this.stage = 1;
        this.boss = null;
        this.eruptionTimer = 0;
        this.bossEntryTimer = 0;
        this.stageClearTimer = 0;

        // 1985年アーケード版 1面開幕の宇宙空中戦スケジュール (stage_1-1.png 完全準拠：上下交互のファン編隊＋ガルンV字編隊＋ルグル編隊)
        this.airWaves = [
            { time: 300,  type: 'FAN',   y: 112, isRed: true },
            { time: 1800, type: 'FAN',   y: 430, isRed: true },
            { time: 3300, type: 'FAN',   y: 112, isRed: true },
            { time: 4800, type: 'FAN',   y: 430, isRed: true },
            { time: 6100, type: 'GARUN', y: 260, count: 5 },
            { time: 7400, type: 'FAN',   y: 112, isRed: true },
            { time: 8600, type: 'FAN',   y: 430, isRed: true },
            { time: 9600, type: 'RUGRA', y: 240, count: 4, hasRed: true }
        ];
        this.airWaveSpawned = 0;
    }

    update(dt) {
        this.starfield.update();

        if (this.stage === 1) {
            this.time += dt;

            if (this.state === 'AIR_BATTLE') {
                while (this.airWaveSpawned < this.airWaves.length && this.time >= this.airWaves[this.airWaveSpawned].time) {
                    const wv = this.airWaves[this.airWaveSpawned];
                    if (wv.type === 'FAN' && typeof Formation !== 'undefined') {
                        new Formation(wv.y, 5, wv.isRed);
                    } else if (wv.type === 'RUGRA' && typeof RugraEnemy !== 'undefined' && typeof enemies !== 'undefined') {
                        for (let i = 0; i < (wv.count || 4); i++) {
                            enemies.push(new RugraEnemy(816, wv.y + (i - 1.5) * 34, wv.hasRed && i === 0, i * 14));
                        }
                    } else if (wv.type === 'GARUN' && typeof GarunFormation !== 'undefined') {
                        new GarunFormation(wv.y, true, wv.count || 5);
                    }
                    this.airWaveSpawned++;
                }

                // 10.5秒経過で「Challenger 1985」BGMとともにドーム基地＆緑の樹林・火山連山地帯へ突入！
                if (this.time >= 10500) {
                    this.state = 'TERRAIN';
                    this.terrain.start();
                    if (typeof Sound !== 'undefined' && typeof Sound.playStageBgm === 'function') {
                        Sound.playStageBgm();
                    }
                }
            } else if (this.state === 'TERRAIN') {
                this.terrain.update();

                // 【本家AC版完全再現】噴火の直前（第1火山が画面左手前 x <= 80）になって初めて地形全体が深紅クリムゾンパレットへ変化！
                if (this.terrain.twinVolcanoes && this.terrain.twinVolcanoes.length > 0 && this.terrain.twinVolcanoes[0].x <= 80) {
                    this.terrain.isCrimsonPalette = true;
                }

                // 本家1面クライマックス (grad0027.png / sakura_04.png)：
                // 第1火山が画面左端 (x <= 36)、第2火山が画面右端 (x ≈ 556) に到達したらスクロール完全停止＆大噴火開始！
                if (this.terrain.twinVolcanoes && this.terrain.twinVolcanoes.length >= 2) {
                    const v1 = this.terrain.twinVolcanoes[0];
                    if (v1 && v1.active && v1.x <= 36) {
                        this.state = 'VOLCANO_ERUPTION';
                        this.eruptionTimer = 0;
                        this.terrain.scrollSpeed = 0; // スクロール完全停止！
                        this.terrain.isCrimsonPalette = true;
                        this.terrain.twinVolcanoes.forEach(v => {
                            if (v) v.isErupting = true;
                        });
                        if (typeof Sound !== 'undefined') {
                            if (typeof Sound.playVolcanoSurvivalBgm === 'function') {
                                Sound.playVolcanoSurvivalBgm();
                            } else if (typeof Sound.playBossBgm === 'function') {
                                Sound.playBossBgm();
                            }
                        }
                    }
                }

                if (!this.terrain.active && this.terrain.currentSegIndex >= this.terrain.topProfile.length) {
                    this.state = 'BOSS';
                    if (typeof Boss !== 'undefined') {
                        this.boss = new Boss(this.starfield.width, 210);
                    }
                }
            } else if (this.state === 'VOLCANO_ERUPTION') {
                // スクロール停止のまま深紅の二連火山から火山弾が放物線を描いて激しく降り注ぐ！
                this.terrain.update();
                this.eruptionTimer += dt;

                // 本家実機通りの尺（約15.5秒）噴火を耐え抜くと噴火が収まる
                // 【本家AC版完全再現】スクロールせず二連火山が画面に残ったまま、2つの火山の間からビッグコアが登場！
                if (this.eruptionTimer >= 15500) {
                    this.terrain.twinVolcanoes.forEach(v => {
                        if (v) v.isErupting = false;
                    });
                    this.state = 'BOSS';
                    this.bossEntryTimer = 0;
                    this.terrain.scrollSpeed = 0; // スクロール停止を維持！
                    if (typeof Sound !== 'undefined' && typeof Sound.playBossBgm === 'function') {
                        Sound.playBossBgm();
                    }
                    if (typeof Boss !== 'undefined') {
                        this.boss = new Boss(this.starfield.width, 210);
                    }
                }
            } else if (this.state === 'BOSS') {
                // ボス戦中：天井と二連火山が画面に残ったステージアリーナでビッグコアと一騎打ち！
                if (this.terrain.active) {
                    this.terrain.update();
                }
                if (this.boss) {
                    this.boss.update();
                    // ボス撃破でステージクリア＆地形消滅（ワイプ）シーケンスへ移行！
                    if (!this.boss.active) {
                        this.state = 'STAGE_CLEAR';
                        this.stageClearTimer = 0;
                    }
                }
            } else if (this.state === 'STAGE_CLEAR') {
                // 【本家AC版完全再現】ボスを倒すと爆発し、地形が右から左へタイル列単位で徐々に消えていく！
                this.stageClearTimer += dt;
                if (this.terrain.active) {
                    this.terrain.wipeProgress = Math.min(1.0, this.stageClearTimer / 1800);
                    if (this.terrain.wipeProgress >= 1.0) {
                        this.terrain.active = false;
                    }
                }
                if (this.stageClearTimer > 3200) {
                    this.startStage2();
                }
            }
        } else if (this.stage === 2) {
            if (typeof stonehengeStage !== 'undefined' && stonehengeStage) {
                stonehengeStage.update(dt);
                if (stonehengeStage.state === 'STAGE_CLEAR' || stonehengeStage.state === 'ALL_CLEAR') {
                    if (!this.stage2ClearTimer) this.stage2ClearTimer = 0;
                    this.stage2ClearTimer += dt;
                    if (this.stage2ClearTimer > 3000 && this.stage === 2) {
                        this.stage2ClearTimer = 0;
                        this.startStage3();
                    }
                }
            }
        } else if (this.stage === 3) {
            if (window.stage3) {
                window.stage3.update(dt);
                if (window.stage3.state === 'STAGE_CLEAR' || window.stage3.state === 'ALL_CLEAR') {
                    if (!this.stage3ClearTimer) this.stage3ClearTimer = 0;
                    this.stage3ClearTimer += dt;
                    if (this.stage3ClearTimer > 3000 && this.stage === 3) {
                        this.stage3ClearTimer = 0;
                        this.startStage4();
                    }
                }
            }
        } else if (this.stage === 4) {
            if (window.stage4) {
                window.stage4.update(dt);
            }
        }
    }

    startStage1() {
        this.stage = 1;
        this.state = 'AIR_BATTLE';
        this.time = 0;
        this.boss = null;
        this.eruptionTimer = 0;
        this.bossEntryTimer = 0;
        this.stageClearTimer = 0;
        this.airWaveSpawned = 0;
        this.terrain.active = false;
        this.terrain.generating = false;
        this.terrain.topPoints = [];
        this.terrain.bottomPoints = [];
        this.terrain.floatingIslands = [];
        this.terrain.twinVolcanoes = [];
        this.terrain.treeClusters = [];
        this.terrain.mountains = [];
        this.terrain.mounds = [];
        this.terrain.scorePopups = [];
        this.terrain.scrollSpeed = this.terrain.baseScrollSpeed;
        this.terrain.wipeProgress = 0;
        this.terrain.isCrimsonPalette = false;

        if (typeof stonehengeStage !== 'undefined' && stonehengeStage) {
            stonehengeStage.active = false;
        }
        if (window.stage3) {
            window.stage3.active = false;
        }
        if (window.stage4) {
            window.stage4.active = false;
        }

        if (typeof enemies !== 'undefined') enemies.length = 0;
        if (typeof enemyBullets !== 'undefined') enemyBullets.length = 0;

        if (typeof player !== 'undefined') {
            if (typeof player.vx !== 'undefined') player.vx = 0;
            if (typeof player.vy !== 'undefined') player.vy = 0;
        }

        if (typeof Sound !== 'undefined' && typeof Sound.playAirBgm === 'function') {
            Sound.playAirBgm();
        }
    }

    startStage2() {
        this.stage = 2;
        this.state = 'STAGE2';
        this.time = 0;
        this.boss = null;
        this.terrain.active = false;
        this.terrain.topPoints = [];
        this.terrain.bottomPoints = [];
        this.terrain.floatingIslands = [];
        this.terrain.twinVolcanoes = [];
        this.terrain.mountains = [];
        this.terrain.mounds = [];
        this.terrain.wipeProgress = 0;
        this.terrain.isCrimsonPalette = false;

        if (typeof enemies !== 'undefined' && Array.isArray(enemies)) {
            enemies = enemies.filter(e => {
                if (typeof Volcano !== 'undefined' && e instanceof Volcano) return false;
                if (typeof VolcanoRock !== 'undefined' && e instanceof VolcanoRock) return false;
                return e.active;
            });
            window.enemies = enemies;
        }

        if (typeof StonehengeStage !== 'undefined') {
            stonehengeStage = new StonehengeStage(this.starfield.width, this.starfield.height);
            window.stonehengeStage = stonehengeStage;
            stonehengeStage.start();
        }
        if (typeof Sound !== 'undefined' && typeof Sound.playAirBgm === 'function') {
            Sound.playAirBgm();
        }
    }

    startStage3() {
        if (this.stage === 3 && window.stage3 && window.stage3.active) return;
        this.stage = 3;
        this.state = 'STAGE3';
        this.time = 0;
        this.boss = null;

        if (typeof stonehengeStage !== 'undefined' && stonehengeStage) {
            stonehengeStage.active = false;
        }

        if (typeof enemies !== 'undefined') enemies.length = 0;
        if (typeof enemyBullets !== 'undefined') enemyBullets.length = 0;

        if (typeof player !== 'undefined') {
            if (typeof player.vx !== 'undefined') player.vx = 0;
            if (typeof player.vy !== 'undefined') player.vy = 0;
        }

        const stage3Class = (typeof Stage3 !== 'undefined') ? Stage3 : window.Stage3;
        if (stage3Class) {
            try {
                const st3 = new stage3Class(this.starfield.width, this.starfield.height);
                window.stage3 = st3;
                st3.start();
            } catch (err) {
                console.error('Stage3 initialization error:', err);
            }
        }
        if (typeof Sound !== 'undefined' && typeof Sound.playAirBgm === 'function') {
            try {
                Sound.playAirBgm();
            } catch (serr) {
                console.warn('Sound playAirBgm error:', serr);
            }
        }
    }

    startStage4() {
        if (this.stage === 4 && window.stage4 && window.stage4.active) return;
        this.stage = 4;
        this.state = 'STAGE4';
        this.time = 0;
        this.boss = null;

        this.terrain.active = false;
        this.terrain.topPoints = [];
        this.terrain.bottomPoints = [];
        this.terrain.floatingIslands = [];
        this.terrain.twinVolcanoes = [];
        this.terrain.mountains = [];
        this.terrain.mounds = [];
        if (typeof stonehengeStage !== 'undefined' && stonehengeStage) {
            stonehengeStage.active = false;
        }
        if (window.stage3) {
            window.stage3.active = false;
        }

        if (typeof enemies !== 'undefined') enemies.length = 0;
        if (typeof enemyBullets !== 'undefined') enemyBullets.length = 0;

        if (typeof player !== 'undefined') {
            if (typeof player.vx !== 'undefined') player.vx = 0;
            if (typeof player.vy !== 'undefined') player.vy = 0;
        }

        const stage4Class = (typeof Stage4 !== 'undefined') ? Stage4 : window.Stage4;
        if (stage4Class) {
            try {
                const st4 = new stage4Class(this.starfield.width, this.starfield.height);
                window.stage4 = st4;
                st4.start();
            } catch (err) {
                console.error('Stage4 initialization error:', err);
            }
        }
        if (typeof Sound !== 'undefined' && typeof Sound.playAirBgm === 'function') {
            try {
                Sound.playAirBgm();
            } catch (serr) {
                console.warn('Sound playAirBgm error:', serr);
            }
        }
    }

    checkCollision(rect) {
        if (this.stage === 1) {
            if (this.terrain && this.terrain.checkCollision(rect)) return true;
        } else if (this.stage === 2) {
            if (typeof stonehengeStage !== 'undefined' && stonehengeStage) {
                return stonehengeStage.checkCollision(rect);
            }
        } else if (this.stage === 3) {
            if (window.stage3) {
                return window.stage3.checkCollision(rect);
            }
        } else if (this.stage === 4) {
            if (window.stage4) {
                return window.stage4.checkCollision(rect);
            }
        }
        return false;
    }

    draw(ctx) {
        if (this.stage === 1) {
            this.starfield.draw(ctx);
            if (this.terrain.active) {
                this.terrain.draw(ctx);
            }

            if (this.state === 'BOSS' && this.boss) {
                this.boss.draw(ctx);
            }

            if (this.state === 'STAGE_CLEAR') {
                ctx.save();
                ctx.font = 'bold 36px "Courier New", monospace';
                ctx.fillStyle = '#ffea00';
                ctx.textAlign = 'center';
                ctx.shadowColor = '#ff8800';
                ctx.shadowBlur = 12;
                ctx.fillText('STAGE 1 CLEAR', this.starfield.width / 2, this.starfield.height / 2 - 40);
                ctx.restore();
            }
        } else if (this.stage === 2) {
            if (typeof stonehengeStage !== 'undefined' && stonehengeStage) {
                stonehengeStage.draw(ctx);
            }
        } else if (this.stage === 3) {
            if (window.stage3) {
                window.stage3.draw(ctx);
            }
        } else if (this.stage === 4) {
            if (window.stage4) {
                window.stage4.draw(ctx);
            }
        }
    }
}
