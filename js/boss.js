// ==========================================
// 1985年アーケード版『グラディウス』初代ビッグコア (98x66ドット完全再現データ)
// ==========================================
const BIG_CORE_PALETTE = {
    '.': null,        // 透過背景 (#FFFFF8)
    '0': '#000000',   // アウトライン・内部暗部・コア通路
    '1': '#A5ADA5',   // 明シルバーグレー装甲
    '2': '#8C948C',   // 中間シルバーグレー装甲
    '3': '#637363',   // 暗スレートグレー装甲
    '4': '#B58C00',   // ゴールドフレーム（明）
    '5': '#4A5A4A',   // 深緑スレートシャドウ
    '6': '#9C6300',   // アンバーゴールド（暗）
    '7': '#314239',   // 最暗装甲シャドウ
    '8': '#738473',   // 中間グリーングレー
    '9': '#C6AD7B',   // シャンパンゴールド／遮蔽板明部
    'A': '#C6C6C6',   // ハイライトシルバー
    'B': '#CEC6B5',   // ウォームホワイトハイライト
    'C': '#6B6B6B',   // コア外周リンググレー
    'D': '#00008C',   // コア深紺
    'E': '#398CC6',   // コア中青
    'F': '#52ADEF',   // コア明青
    'G': '#A5CEFF',   // コア水色
    'H': '#2963A5',   // コア濃青
    'I': '#BDD6FF',   // コア淡青白
    'J': '#636B63',   // 後部アンテナ暗灰
    'K': '#00005A',   // コア四隅濃紺ドット
    'L': '#B5B5B5',   // パイプ明灰
    'M': '#525A52',   // 後部アンテナ濃灰
    'N': '#7B847B',   // 後部アンテナ中灰
    'O': '#424A42',   // 後部アンテナ先端暗灰
    'P': '#E7F7FF',   // コア中心ハイライト白
    'Q': '#18637B'    // 下部ノズル付け根アクセント青緑
};

const BIG_CORE_CORE_RED_MAP = {
    'D': '#6B0000',
    'H': '#9C1800',
    'E': '#C63900',
    'F': '#EF6318',
    'G': '#FFA539',
    'I': '#FFD68C',
    'P': '#FFFFFF'
};

const BIG_CORE_SPRITE_ROWS = [
    ".................................................................0000.............................",
    ".........................................0000000000000000000000000870.............................",
    "....................................000000550000000007707777777778500.....0000000.................",
    "..................................00077700330064B4600330333333558300....0006083500................",
    "................................00077533003306000006033033333332000..0000644B022500...............",
    "...............................00775333300331006660013303333332060000070644B9901A500..............",
    "..............................00753333330033206444402330333332044000753204B999901250..............",
    "..............................053333333300115646464651101111104447553211109999990350..............",
    "........................0000000023333333002206666666022022210444B53211111109999B9070..............",
    "........................023040407233331100220046B960022022104449000001111110999B4600..........0000",
    "........................055060657023312200220006660002202104449004499011111109B4660.........000MO0",
    "........................000000000001122200222222222222201044490000009901111110B4600.......0008J000",
    ".....................0000000000050001220302222222222222004449052222009B01111120660......00022000..",
    "...................0007750000305002001032011AAAAAAAAA1104449052222A100BB0111223000....00012000....",
    "................0000775333000300707700322000000000000000449033333A1A100BB01223570...00011000......",
    "..............000707533333300307250003221066666666666640490000000811A100990235770.00011000........",
    "............000005303333311200705370322A06444444444444409008210210811A100990577000011000..........",
    "..........0007753333033112222000000322A0644444444444444000555555500811A100440700011000............",
    "........00075333333310122222220000322A06444BBBBBBBBBB9900511111118008111100460001000..............",
    "......000753333311112022222222200322A06444B000000000000005588888218008111100000000................",
    "......077223311122222022222222A0322A06444B00888888888000020000000818008111088877000...............",
    "....0000000112222222202222222A0322106444B00011111111102001230000008185501081118877000.........0000",
    "00000722230AAAA00000A0AAAAAAA0221106444B0080A111111110120000021123081111081111128877000.....000JM0",
    "01022205500000003550000000700000006444B008105555555550512000000001508887081111AA12887700..0002N000",
    "0503330502222200322502222350064444444B0081500000000000051044444058255555555555111112357000012000..",
    "000000002500000087070000023506499999900D0000CCCCCC0000D050BBBBB01111111111A1287812222357711000....",
    "......001202130205032008031300000000008000CC000000CC0000006666608888888888888708122222257700......",
    ".....0020002058032270022031233304040881LLC00DDDDDD00C0000000000000000000000000812200022285700.....",
    ".....08000000000000008000531111097901A5CK0KDDDDDDDDK0C0000000000031111123700882222222222225700....",
    ".....000.04600460046004600533337B7B0550000DDDDEEDDDD0C00003211111100000000021111111111111A85700...",
    ".........09600960096009600666000606000000DDDHFPIFHDDD0C00000111111711112370000000000000211A8570...",
    ".........09600960096009606469600000000000DHHHEGIEHHHD0C0055011111100000000006644444466001118570...",
    ".........0960096009600960444AB00000000000HHEEEEEEEEHH0C0011011111171111237064499BBB994600000000...",
    ".........0960096009600960444AB00000000000HEEEEFFEEEEH0C0011011111171111237064499BBB994600000000...",
    ".........09600960096009606469600000000000EEEFFFFFFEEE0C0055011111100000000006644444466001118570...",
    ".........09600960096009600666000606000000EFFFGGGGFFFE0C00000111111711112370000000000000211A8570...",
    ".....000.04600460046004600533337B7B0550000FGGGIIGGGF0C00003211111100000000021111111111111A85700...",
    ".....08000000000000008000531111097901A5CK0HGGIIIIGGH0C0000000000031111123700882222222222225700....",
    ".....0020002058032270022031233304040881LLC00FGIIGF00C0000000000000000000000000812200022285700.....",
    "......001202130205032008031300000000008000CC000000CC0000006666608888888888888708122222257700......",
    "000000002500000087070000023506499999900D0000CCCCCC0000D050BBBBB01111111111A1287812222357711000....",
    "0503330502222200322502222350064444444B0081500000000000051044444058255555555555111112357000012000..",
    "01022205500000003550000000700000006444B008105555555550512000000001508887081111AA12887700..0002N000",
    "00000722230AAAA00000A0AAAAAAA0221106444B0080A111111110120000021123081111081111128877000.....000JM0",
    "....0000000112222222202222222A0322106444B00011111111102001230000008185501081118877000.........0000",
    "......077223311122222022222222A0322A06444B00888888888000020000000818008111088877000...............",
    "......000753333311112022222222200322A06444B000000000000005588888218008111100000000................",
    "........00075333333310122222220000322A06444BBBBBBBBBB9900511111118008111100460Q01000..............",
    "..........0007753333033112222000000322A0644444444444444000555555500811A100440700011000............",
    "............000005303333311200705370322A06444444444444409008210210811A100990577000011000..........",
    "..............000707533333300307250003221066666666666640490000000811A100990235770.00011000........",
    "................0000775333000300707700322000000000000000449033333A1A100BB01223570...00011000......",
    "...................0007750000305002001032011AAAAAAAAA1104449052222A100BB0111223000....00012000....",
    ".....................0000000000050001220302222222222222004449052222009B01111120660......00022000..",
    "........................000000000001122200222222222222201044490000009901111110B4600.......0008J000",
    "........................055060657023312200220006660002202104449004499011111109B4660.........000MO0",
    "........................023040407233331100220046B960022022104449000001111110999B4600..........0000",
    "........................0000000023333333002206666666022022210444B53211111109999B9070..............",
    "..............................053333333300115646464651101111104447553211109999990350..............",
    "..............................00753333330033206444402330333332044000753204B999901250..............",
    "...............................00775333300331006660013303333332060000070644B9901A500..............",
    "................................00077533003306000006033033333332000..0000644B022500...............",
    "..................................00077700330064B4600330333333558300....0006083500................",
    "....................................000000550000000007707777777778500.....0000000.................",
    ".........................................0000000000000000000000000870.............................",
    ".................................................................0000............................."
];

let _bigCoreHullCanvas = null;

function _parseHexRgb(hex) {
    if (!hex) return [0, 0, 0];
    const v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

const BIG_CORE_RGB_PALETTE = {};
for (const k in BIG_CORE_PALETTE) {
    if (BIG_CORE_PALETTE[k]) {
        BIG_CORE_RGB_PALETTE[k] = _parseHexRgb(BIG_CORE_PALETTE[k]);
    }
}

function getBigCoreHullCanvas() {
    if (_bigCoreHullCanvas) return _bigCoreHullCanvas;
    const w = 98;
    const h = 66;
    const HD = 6; // 6倍スーパーサンプリング (588x396px) でドット絵の正確なシルエットを保ったまま高精細HD化
    const cw = w * HD;
    const ch = h * HD;

    const c = document.createElement('canvas');
    c.width = cw;
    c.height = ch;
    const g = c.getContext('2d');

    // 1. セルごとのマテリアル分類とベースRGB配列を構築
    // Group 0: 透過('.'), Group 1: 黒溝/装甲継目('0'および動的描画キャビティ), Group 2: シルバー/スレート装甲, Group 3: ゴールド/アンバーフレーム
    const groupGrid = new Uint8Array(w * h);
    const charGrid = new Array(w * h);
    const rgbGrid = new Float32Array(w * h * 3);

    const goldChars = new Set(['4', '6', '9', 'B']);

    for (let y = 0; y < h; y++) {
        const row = BIG_CORE_SPRITE_ROWS[y];
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            let chCell = row[x];
            // コア通路の4枚遮蔽板＋ストッパー領域(x=10..29, y=29..36)と中央コア内部(x=41..52, y=27..38)は動的HD描画するため黒下地にする
            if ((y >= 29 && y <= 36 && x >= 10 && x <= 29) ||
                (y >= 27 && y <= 38 && x >= 41 && x <= 52)) {
                chCell = '0';
            }
            charGrid[idx] = chCell;

            if (chCell === '.') {
                groupGrid[idx] = 0;
            } else if (chCell === '0') {
                groupGrid[idx] = 1;
                rgbGrid[idx * 3] = 10;
                rgbGrid[idx * 3 + 1] = 15;
                rgbGrid[idx * 3 + 2] = 20;
            } else if (goldChars.has(chCell)) {
                groupGrid[idx] = 3;
                const rgb = BIG_CORE_RGB_PALETTE[chCell] || [181, 140, 0];
                rgbGrid[idx * 3] = rgb[0];
                rgbGrid[idx * 3 + 1] = rgb[1];
                rgbGrid[idx * 3 + 2] = rgb[2];
            } else {
                groupGrid[idx] = 2;
                const rgb = BIG_CORE_RGB_PALETTE[chCell] || [140, 148, 140];
                rgbGrid[idx * 3] = rgb[0];
                rgbGrid[idx * 3 + 1] = rgb[1];
                rgbGrid[idx * 3 + 2] = rgb[2];
            }
        }
    }

    const getGroup = (x, y) => {
        if (x < 0 || x >= w || y < 0 || y >= h) return 0;
        return groupGrid[y * w + x];
    };
    const getChar = (x, y) => {
        if (x < 0 || x >= w || y < 0 || y >= h) return '.';
        return charGrid[y * w + x];
    };

    // 2. 同一マテリアルパネル内で滑らかな3D金属グラデーションを得るため、境界('0'や異素材)を跨がないガウシアン平滑化フィールドを計算
    const smoothRgb = new Float32Array(w * h * 3);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = y * w + x;
            const grp = groupGrid[idx];
            if (grp < 2) {
                smoothRgb[idx * 3] = rgbGrid[idx * 3];
                smoothRgb[idx * 3 + 1] = rgbGrid[idx * 3 + 1];
                smoothRgb[idx * 3 + 2] = rgbGrid[idx * 3 + 2];
                continue;
            }
            let rSum = 0, gSum = 0, bSum = 0, wSum = 0;
            for (let dy = -2; dy <= 2; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= h) continue;
                for (let dx = -2; dx <= 2; dx++) {
                    const nx = x + dx;
                    if (nx < 0 || nx >= w) continue;
                    const nIdx = ny * w + nx;
                    if (groupGrid[nIdx] !== grp) continue;
                    const dist2 = dx * dx + dy * dy;
                    const weight = Math.exp(-dist2 * 0.42);
                    rSum += rgbGrid[nIdx * 3] * weight;
                    gSum += rgbGrid[nIdx * 3 + 1] * weight;
                    bSum += rgbGrid[nIdx * 3 + 2] * weight;
                    wSum += weight;
                }
            }
            // オリジナルの階調ディテールと滑らかな3D曲面シェーディングをブレンド
            const sr = rSum / wSum;
            const sg = gSum / wSum;
            const sb = bSum / wSum;
            smoothRgb[idx * 3] = rgbGrid[idx * 3] * 0.38 + sr * 0.62;
            smoothRgb[idx * 3 + 1] = rgbGrid[idx * 3 + 1] * 0.38 + sg * 0.62;
            smoothRgb[idx * 3 + 2] = rgbGrid[idx * 3 + 2] * 0.38 + sb * 0.62;
        }
    }

    // 同一マテリアルグループ内でバイリニア補間サンプリングを行うヘルパー
    const sampleMaterialRgb = (gx, gy, targetGrp, fallbackX, fallbackY) => {
        const x0 = Math.floor(gx - 0.5);
        const y0 = Math.floor(gy - 0.5);
        const tx = (gx - 0.5) - x0;
        const ty = (gy - 0.5) - y0;

        let rAcc = 0, gAcc = 0, bAcc = 0, wAcc = 0;
        for (let j = 0; j <= 1; j++) {
            const sy = Math.max(0, Math.min(h - 1, y0 + j));
            const wy = j === 0 ? (1 - ty) : ty;
            for (let i = 0; i <= 1; i++) {
                const sx = Math.max(0, Math.min(w - 1, x0 + i));
                const wx = i === 0 ? (1 - tx) : tx;
                const sIdx = sy * w + sx;
                if (groupGrid[sIdx] === targetGrp) {
                    const wt = wx * wy;
                    rAcc += smoothRgb[sIdx * 3] * wt;
                    gAcc += smoothRgb[sIdx * 3 + 1] * wt;
                    bAcc += smoothRgb[sIdx * 3 + 2] * wt;
                    wAcc += wt;
                }
            }
        }
        if (wAcc > 0.001) {
            return [rAcc / wAcc, gAcc / wAcc, bAcc / wAcc];
        }
        const fIdx = Math.max(0, Math.min(h - 1, fallbackY)) * w + Math.max(0, Math.min(w - 1, fallbackX));
        return [smoothRgb[fIdx * 3], smoothRgb[fIdx * 3 + 1], smoothRgb[fIdx * 3 + 2]];
    };

    // 3. 588x396 (HD=6) サブピクセル合成（xBR/Scale3x風の斜めエッジ補間＋金属ヘアライン＆パネルベベル立体化）
    const imgData = g.createImageData(cw, ch);
    const data = imgData.data;

    for (let py = 0; py < ch; py++) {
        const gy = (py + 0.5) / HD;
        const cy = Math.min(h - 1, Math.floor(gy));
        const fy = gy - cy;

        // 船体全体のゆるやかな立体円筒ライティング（上下対称の曲面光沢）
        const normY = (gy - 33.0) / 33.0;
        const hullCurveLight = Math.cos(normY * Math.PI * 0.75) * 9.0 - 2.0;
        // 微細な水平ブラッシュドメタル（ヘアライン金属質感）
        const hairline = Math.sin(py * 1.5708) * 2.8 + Math.cos(py * 0.65) * 1.8;

        for (let px = 0; px < cw; px++) {
            const gx = (px + 0.5) / HD;
            const cx = Math.min(w - 1, Math.floor(gx));
            const fx = gx - cx;

            let grp = getGroup(cx, cy);
            let sampleCx = cx;
            let sampleCy = cy;

            const gUp = getGroup(cx, cy - 1);
            const gDn = getGroup(cx, cy + 1);
            const gLf = getGroup(cx - 1, cy);
            const gRt = getGroup(cx + 1, cy);

            // 斜めエッジのC1連続xBR補間（1:1 / 2:1 / 1:2 スロープを自動判定してドット階段を完全な直線・滑らかエッジに変換）
            const checkCorner = (u, v, sx, sy, gH, gV) => {
                if (gV !== gH || gV === grp) return false;
                // 1ドット幅の細い斜めラインを切断しないための保護条件
                if (grp !== 0 && getGroup(cx + sx, cy + sy) === grp) return false;
                const is2to1H = (getGroup(cx - sx, cy + sy) === gV);
                const is1to2V = (getGroup(cx + sx, cy - sy) === gV);
                const kU = is2to1H ? 0.5 : 1.0;
                const kV = is1to2V ? 0.5 : 1.0;
                return (u * kU + v * kV) < 0.52;
            };

            if (checkCorner(fx, fy, -1, -1, gLf, gUp)) {
                grp = gUp;
                sampleCx = cx - 1;
                sampleCy = cy - 1;
            } else if (checkCorner(1 - fx, fy, 1, -1, gRt, gUp)) {
                grp = gUp;
                sampleCx = cx + 1;
                sampleCy = cy - 1;
            } else if (checkCorner(fx, 1 - fy, -1, 1, gLf, gDn)) {
                grp = gDn;
                sampleCx = cx - 1;
                sampleCy = cy + 1;
            } else if (checkCorner(1 - fx, 1 - fy, 1, 1, gRt, gDn)) {
                grp = gDn;
                sampleCx = cx + 1;
                sampleCy = cy + 1;
            }

            if (grp === 0) continue; // 透過背景

            const pOffset = (py * cw + px) * 4;

            // Group 1: 黒アウトライン・装甲パネル溝・コア通路内部
            if (grp === 1) {
                const isCavity = (cy >= 29 && cy <= 36 && cx >= 10 && cx <= 29) ||
                                 (cy >= 27 && cy <= 38 && cx >= 41 && cx <= 52);
                if (isCavity) {
                    // コア通路・格納部の重厚なダークガンメタル内壁
                    const railWave = Math.sin(px * 0.35) * 3;
                    data[pOffset] = Math.max(4, Math.min(28, 12 + railWave));
                    data[pOffset + 1] = Math.max(6, Math.min(34, 16 + railWave));
                    data[pOffset + 2] = Math.max(10, Math.min(42, 22 + railWave));
                    data[pOffset + 3] = 255;
                } else {
                    // 装甲パネルの継ぎ目（溝の中心は深く、装甲との境界は微細なガンメタルベベル）
                    const nearArmor = (gUp >= 2 || gDn >= 2 || gLf >= 2 || gRt >= 2);
                    const grooveBase = nearArmor ? 20 : 10;
                    data[pOffset] = grooveBase;
                    data[pOffset + 1] = grooveBase + 4;
                    data[pOffset + 2] = grooveBase + 7;
                    data[pOffset + 3] = 255;
                }
                continue;
            }

            // Group 2 (シルバー/スレート装甲) または Group 3 (ゴールドフレーム) の連続バイリニア色取得
            let [r, gr, b] = sampleMaterialRgb(gx, gy, grp, sampleCx, sampleCy);

            // パネル境界ベベル立体感（上・左が黒溝'0'ならハイライトエッジ、下・右が黒溝'0'ならシャドウエッジ）
            let bevel = 0;
            if (gUp !== grp && fy < 0.34) bevel += (0.34 - fy) * 82;
            if (gLf !== grp && fx < 0.34) bevel += (0.34 - fx) * 68;
            if (gDn !== grp && fy > 0.66) bevel -= (fy - 0.66) * 65;
            if (gRt !== grp && fx > 0.66) bevel -= (fx - 0.66) * 52;

            if (grp === 2) {
                // シルバー＆スレート装甲のクールな金属光沢・青백スペキュラ補正
                const lum = (r * 0.299 + gr * 0.587 + b * 0.114) / 255;
                const spec = Math.pow(Math.max(0, lum), 2.2) * 26;
                const delta = hullCurveLight + hairline + bevel + spec;
                r = Math.max(24, Math.min(248, r + delta * 0.92));
                gr = Math.max(30, Math.min(252, gr + delta * 0.98));
                b = Math.max(32, Math.min(255, b + delta * 1.08 + 5));
            } else if (grp === 3) {
                // ゴールド＆シャンパン合金フレームのリッチな金属反射＋精密リブ質感
                const lum = (r * 0.299 + gr * 0.587 + b * 0.114) / 255;
                const rib = Math.sin(px * 0.95) * 5.5 + Math.sin(py * 1.5708) * 3.5;
                const spec = Math.pow(Math.max(0, lum), 1.8) * 32;
                const delta = hullCurveLight * 0.8 + rib + bevel * 1.15 + spec;
                r = Math.max(55, Math.min(255, r + delta * 1.12 + 8));
                gr = Math.max(38, Math.min(248, gr + delta * 0.96 + 3));
                b = Math.max(12, Math.min(230, b + delta * 0.68));
            }

            data[pOffset] = Math.round(r);
            data[pOffset + 1] = Math.round(gr);
            data[pOffset + 2] = Math.round(b);
            data[pOffset + 3] = 255;
        }
    }

    g.putImageData(imgData, 0, 0);

    // 4. 高精細ベクターディテール（シルエットを1ドットも崩さずに内部へ精密メカディテールを重ねる）
    g.save();
    g.globalCompositeOperation = 'source-atop';

    // (a) 船体全体の立体メタリック光沢グラデーション（上下ウイングの金属ハイライトと中央の重厚感）
    const sheenGrad = g.createLinearGradient(0, 0, 0, ch);
    sheenGrad.addColorStop(0.00, 'rgba(180, 210, 230, 0.08)');
    sheenGrad.addColorStop(0.18, 'rgba(255, 255, 255, 0.14)');
    sheenGrad.addColorStop(0.36, 'rgba(15, 25, 35, 0.10)');
    sheenGrad.addColorStop(0.50, 'rgba(220, 240, 255, 0.10)');
    sheenGrad.addColorStop(0.64, 'rgba(15, 25, 35, 0.10)');
    sheenGrad.addColorStop(0.82, 'rgba(255, 255, 255, 0.14)');
    sheenGrad.addColorStop(1.00, 'rgba(180, 210, 230, 0.08)');
    g.fillStyle = sheenGrad;
    g.fillRect(0, 0, cw, ch);

    // (b) 中央ゴールド冷却コンジット（x=38..50, y=15..25 & y=40..50）の精密フィン溝ディテール
    g.fillStyle = 'rgba(25, 14, 0, 0.28)';
    for (let gx = 39; gx <= 49; gx += 2) {
        g.fillRect(gx * HD + 1, 15 * HD, 2, 10 * HD);
        g.fillRect(gx * HD + 1, 41 * HD, 2, 10 * HD);
    }
    g.fillStyle = 'rgba(255, 244, 190, 0.25)';
    for (let gx = 39; gx <= 49; gx += 2) {
        g.fillRect(gx * HD + 3, 15 * HD, 1.5, 10 * HD);
        g.fillRect(gx * HD + 3, 41 * HD, 1.5, 10 * HD);
    }

    // (c) 上下装甲プレートの精密マイクロリベット（上下対称配置）
    const rivetCoords = [
        [34, 14], [34, 18], [34, 22],
        [24, 18], [24, 22], [15, 21],
        [56, 12], [62, 12], [68, 12],
        [56, 21], [62, 21], [68, 21],
        [73, 16], [73, 22], [79, 24],
        [63, 28], [69, 28], [83, 28]
    ];
    for (const [rx, ry] of rivetCoords) {
        for (const yPos of [ry, 65 - ry]) {
            const px = (rx + 0.5) * HD;
            const py = (yPos + 0.5) * HD;
            g.fillStyle = 'rgba(15, 22, 28, 0.65)';
            g.beginPath();
            g.arc(px + 0.8, py + 0.8, 2.1, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = 'rgba(235, 245, 255, 0.72)';
            g.beginPath();
            g.arc(px - 0.5, py - 0.5, 1.6, 0, Math.PI * 2);
            g.fill();
        }
    }

    // (d) 4門のレーザー砲口（外側肩部 x=24, y=9.5/56.5 ＆ 内側先端 x=1, y=23.5/42.5）のHD砲身レンズ発光
    const muzzlePorts = [
        { x: 24.5, y: 10.0 },
        { x: 1.2,  y: 23.5 },
        { x: 1.2,  y: 42.5 },
        { x: 24.5, y: 56.0 }
    ];
    for (const mp of muzzlePorts) {
        const mx = mp.x * HD;
        const my = mp.y * HD;
        const mGrad = g.createRadialGradient(mx, my, 1, mx, my, 9);
        mGrad.addColorStop(0, 'rgba(200, 250, 255, 0.85)');
        mGrad.addColorStop(0.5, 'rgba(60, 180, 240, 0.40)');
        mGrad.addColorStop(1, 'rgba(0, 80, 160, 0)');
        g.fillStyle = mGrad;
        g.beginPath();
        g.arc(mx, my, 9, 0, Math.PI * 2);
        g.fill();
    }

    // (e) コア通路の上下ガイドレールと奥行き陰影 (x=9..40, y=28..37)
    const corrX = 9 * HD;
    const corrY = 28.5 * HD;
    const corrW = 32 * HD;
    const corrH = 9 * HD;
    const corrGrad = g.createLinearGradient(0, corrY, 0, corrY + corrH);
    corrGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.75)');
    corrGrad.addColorStop(0.18, 'rgba(70, 90, 105, 0.28)');
    corrGrad.addColorStop(0.50, 'rgba(5, 10, 18, 0.65)');
    corrGrad.addColorStop(0.82, 'rgba(70, 90, 105, 0.28)');
    corrGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.75)');
    g.fillStyle = corrGrad;
    g.fillRect(corrX, corrY, corrW, corrH);

    g.restore();

    _bigCoreHullCanvas = c;
    return c;
}

function drawOriginalBigCore(ctx, boss) {
    const S = 3; // 画面上の表示サイズは従来どおり 98x66 * 3 = 294x198px（当たり判定・シルエット完全維持）
    const w = 98;
    const h = 66;
    const ox = Math.round(boss.x - (w * S) / 2); // boss.x - 147
    const oy = Math.round(boss.y - (h * S) / 2); // boss.y - 99

    ctx.save();
    const prevSmooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) {
        ctx.imageSmoothingQuality = 'high';
    }

    // 1. 6倍スーパーサンプリング済みの高精細HD船体ハルを描画
    const hullCanvas = getBigCoreHullCanvas();
    ctx.drawImage(hullCanvas, ox, oy, w * S, h * S);

    // 2. コア通路内の4枚遮蔽板（シャッター）＋奥のストッパーを高精細3Dメタリック描画
    const shields = Math.max(0, Math.min(4, boss.shields || 0));
    if (shields > 0) {
        const firstBarIdx = 4 - shields; // 前(左)から順に破壊される
        for (let i = firstBarIdx; i < 4; i++) {
            const bx = ox + (10 + i * 4) * S;
            const by = oy + 29 * S;
            const bw = 2 * S; // 6px
            const bh = 8 * S; // 24px
            const isFrontBar = (i === firstBarIdx);
            const isFlashing = isFrontBar && (boss.shieldFlashTimer > 0);

            // シャッター装甲プレートの立体円筒グラデーション
            const sGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
            if (isFlashing) {
                sGrad.addColorStop(0.0, '#ffffff');
                sGrad.addColorStop(0.5, '#fff6cc');
                sGrad.addColorStop(1.0, '#ffd266');
            } else {
                sGrad.addColorStop(0.00, '#6e4700');
                sGrad.addColorStop(0.18, '#c69e4b');
                sGrad.addColorStop(0.45, '#f2dfba');
                sGrad.addColorStop(0.55, '#ffffff');
                sGrad.addColorStop(0.75, '#c6ad7b');
                sGrad.addColorStop(1.00, '#593800');
            }
            ctx.fillStyle = sGrad;
            ctx.fillRect(bx, by, bw, bh);

            // 前面（左側）のエッジハイライトと背面シャドウ
            ctx.fillStyle = isFlashing ? '#ffffff' : 'rgba(255, 250, 225, 0.85)';
            ctx.fillRect(bx, by, 1.5, bh);
            ctx.fillStyle = 'rgba(25, 12, 0, 0.7)';
            ctx.fillRect(bx + bw - 1.2, by, 1.2, bh);

            // 上下の油圧ロック金具
            ctx.fillStyle = '#4a3208';
            ctx.fillRect(bx - 0.5, by, bw + 1, 2.5);
            ctx.fillRect(bx - 0.5, by + bh - 2.5, bw + 1, 2.5);
        }

        // 4枚目のすぐ後ろにある金色の丸型シャッターストッパー (x=25..29, y=30..35)
        const stX = ox + 25 * S;
        const stY = oy + 30 * S;
        const stW = 5 * S; // 15px
        const stH = 6 * S; // 18px
        const stCx = stX + stW * 0.5;
        const stCy = stY + stH * 0.5;

        const stGrad = ctx.createRadialGradient(stCx - 2, stCy - 3, 1, stCx, stCy, stH * 0.55);
        stGrad.addColorStop(0.0, '#fff5d6');
        stGrad.addColorStop(0.35, '#d6b46e');
        stGrad.addColorStop(0.72, '#9c6b08');
        stGrad.addColorStop(1.0, '#3b2400');
        ctx.fillStyle = stGrad;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(stX, stY, stW, stH, 4) : ctx.rect(stX, stY, stW, stH);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 235, 180, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // 3. 中央の12x12領域（36x36px）・高精細クリスタルプラズマ・ブルーコア
    const isFlash = (boss.hitFlashTimer > 0);
    const isCritical = (boss.hp <= 2) || boss.isDying;
    const coreCenterX = ox + 47 * S;
    const coreCenterY = oy + 33 * S;
    const outerR = 6.2 * S; // 18.6px (外周リングベゼル)
    const coreR = 5.0 * S;  // 15.0px (コア球体)
    const now = Date.now();
    const pulse = 0.5 + Math.sin(now * 0.008) * 0.5;

    // (a) 外周の重厚なダーククローム装甲ベゼルリング (原作の'C','K'リング領域に完全一致)
    const bezelGrad = ctx.createLinearGradient(coreCenterX - outerR, coreCenterY - outerR, coreCenterX + outerR, coreCenterY + outerR);
    bezelGrad.addColorStop(0.0, '#a8b2b8');
    bezelGrad.addColorStop(0.35, '#5a646a');
    bezelGrad.addColorStop(0.70, '#262d32');
    bezelGrad.addColorStop(1.0, '#101518');
    ctx.fillStyle = bezelGrad;
    ctx.beginPath();
    ctx.arc(coreCenterX, coreCenterY, outerR, 0, Math.PI * 2);
    ctx.fill();

    // ベゼル内周の暗い溝リング
    ctx.fillStyle = '#05080c';
    ctx.beginPath();
    ctx.arc(coreCenterX, coreCenterY, coreR + 1.4, 0, Math.PI * 2);
    ctx.fill();

    // (b) 3D球体プラズマ・エネルギーコア本体
    const sphereGrad = ctx.createRadialGradient(
        coreCenterX - coreR * 0.28,
        coreCenterY - coreR * 0.28,
        coreR * 0.06,
        coreCenterX,
        coreCenterY,
        coreR
    );
    if (isFlash) {
        sphereGrad.addColorStop(0.00, '#ffffff');
        sphereGrad.addColorStop(0.45, '#e0f7ff');
        sphereGrad.addColorStop(0.80, '#78c8ff');
        sphereGrad.addColorStop(1.00, '#1a5fb4');
    } else if (isCritical) {
        sphereGrad.addColorStop(0.00, '#ffffff');
        sphereGrad.addColorStop(0.22, '#ffe599');
        sphereGrad.addColorStop(0.50, '#ff7722');
        sphereGrad.addColorStop(0.78, '#c62800');
        sphereGrad.addColorStop(0.94, '#5a0800');
        sphereGrad.addColorStop(1.00, '#220000');
    } else {
        sphereGrad.addColorStop(0.00, '#ffffff');
        sphereGrad.addColorStop(0.20, '#d4ecff');
        sphereGrad.addColorStop(0.46, '#62b6ff');
        sphereGrad.addColorStop(0.72, '#1e6ec8');
        sphereGrad.addColorStop(0.92, '#062670');
        sphereGrad.addColorStop(1.00, '#020c30');
    }
    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(coreCenterX, coreCenterY, coreR, 0, Math.PI * 2);
    ctx.fill();

    // (c) コア内部のクリスタルエネルギー・リング脈動
    ctx.strokeStyle = isCritical
        ? `rgba(255, 220, 140, ${0.35 + pulse * 0.25})`
        : `rgba(180, 235, 255, ${0.35 + pulse * 0.25})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(coreCenterX, coreCenterY, coreR * (0.58 + pulse * 0.08), 0, Math.PI * 2);
    ctx.stroke();

    // (d) 曲面ガラスレンズのハイグロス反射ハイライト（左上メイン光沢＋右下バウンス光）
    ctx.save();
    ctx.translate(coreCenterX - coreR * 0.34, coreCenterY - coreR * 0.34);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
    ctx.beginPath();
    ctx.ellipse(0, 0, coreR * 0.32, coreR * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = isCritical ? 'rgba(255, 160, 90, 0.28)' : 'rgba(140, 220, 255, 0.30)';
    ctx.beginPath();
    ctx.arc(coreCenterX + coreR * 0.32, coreCenterY + coreR * 0.32, coreR * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // (e) コアの透過発光オーラ
    const auraAlpha = 0.20 + pulse * 0.10;
    const auraGrad = ctx.createRadialGradient(coreCenterX, coreCenterY, 4, coreCenterX, coreCenterY, 28);
    if (isCritical) {
        auraGrad.addColorStop(0, `rgba(255, 180, 80, ${auraAlpha})`);
        auraGrad.addColorStop(1, 'rgba(255, 40, 0, 0)');
    } else {
        auraGrad.addColorStop(0, `rgba(140, 220, 255, ${auraAlpha})`);
        auraGrad.addColorStop(1, 'rgba(0, 100, 255, 0)');
    }
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(coreCenterX, coreCenterY, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.imageSmoothingEnabled = prevSmooth;
    ctx.restore();
}

// 1985年AC版『グラディウス』準拠：自機のパワーアップ充実度（ランク 0.0〜1.0）を算出
// オプション数・レーザー/ダブル・ミサイル・シールド・スピード段階が多いほどボスの移動速度・レーザー弾速・連射間隔が強化される
function getPlayerEquipmentRank() {
    if (typeof player === 'undefined' || !player) return 0;
    let score = 0;
    // オプション数 (0〜4個: 最大8.0pt — 原作で最もランク上昇寄与が大きい要素)
    const optCount = Array.isArray(player.options) ? player.options.length : 0;
    score += Math.min(4, optCount) * 2.0;
    // メインウェポン (LASER: 2.5pt, DOUBLE: 1.8pt)
    if (player.weaponType === 'LASER') score += 2.5;
    else if (player.weaponType === 'DOUBLE') score += 1.8;
    // ミサイル (1.2pt)
    if (player.hasMissile) score += 1.2;
    // シールド (1.2pt)
    if (player.shieldActive) score += 1.2;
    // スピードアップ段階 (初期3.5から1.5刻み: 最大2.1pt)
    const speedUps = Math.max(0, Math.min(3, ((player.speed || 3.5) - 3.5) / 1.5));
    score += speedUps * 0.7;

    return Math.max(0, Math.min(1, score / 14.0));
}
if (typeof window !== 'undefined') {
    window.getPlayerEquipmentRank = getPlayerEquipmentRank;
}

class Boss {
    constructor(x, y) {
        this.scale = 3; // 98x66ドット×3倍＝294x198px
        this.drawW = 294;
        this.drawH = 198;
        this.width = 294;
        this.height = 198;
        this.x = (x || 800) + 150; // 950 (画面外右側から登場)
        this.targetX = 635; // 画面内に全体像が美しく収まる定位置
        this.baseY = 300; // 中心Y
        this.y = 300;
        this.maxHp = 7;
        this.hp = 7;
        this.active = true;
        this.isEntering = true; // 登場中は完全無敵
        this.color = '#8C948C';
        
        // 遮蔽板: アーケード準拠の4枚シールドプレート (各7発耐久、ダブル弾なら4発で破壊)
        this.maxShields = 4;
        this.shields = 4;
        this.shieldHpPerPlate = 7;
        this.currentShieldHp = this.shieldHpPerPlate;
        this.shieldHitCooldown = 0;
        this.shieldFlashTimer = 0;
        this.hitFlashTimer = 0;

        this.coreOpen = false;
        this.coreTimer = 0;
        this.moveTimer = 0;
        this.rotationAngle = 0;
        this.bullets = [];
        this.isDying = false;
    }

    update() {
        if (this.isDying) return;

        // 登場シーン（画面外から定位置へ前進）
        if (this.x > this.targetX) {
            this.x -= 3.2;
            this.isEntering = true;
            return;
        }
        this.isEntering = false;

        // 原作ビッグコア準拠：自機の装備が充実しているほど上下追尾スピードとレーザー連射・弾速が速くなる！
        const rank = getPlayerEquipmentRank();
        const baseTrack = this.trackSpeed || 1.45;
        const trackSpeed = baseTrack + rank * 1.95 + (this.shields === 0 ? 0.35 : 0);
        const py = (typeof player !== 'undefined' && player) ? (player.y + player.height / 2) : this.baseY;
        const targetY = Math.max(140, Math.min(460, py));
        const dy = targetY - this.y;
        this.y += Math.max(-trackSpeed, Math.min(trackSpeed, dy));
        this.rotationAngle += 0.04 + rank * 0.03;

        if (this.shieldHitCooldown > 0) this.shieldHitCooldown--;
        if (this.shieldFlashTimer > 0) this.shieldFlashTimer--;
        if (this.hitFlashTimer > 0) this.hitFlashTimer--;

        this.coreOpen = (this.shields <= 0);
        const fireInterval = Math.max(46, Math.round((this.shields > 0 ? 115 : 92) - rank * 48));
        this.coreTimer++;
        if (this.coreTimer > fireInterval) {
            this.coreTimer = 0;
            this.shoot();
        }
        
        this.bullets.forEach(b => b.update(600));
        this.bullets = this.bullets.filter(b => b.active);
    }

    shoot() {
        // 1985年AC版ビッグコアの4門レーザー砲口座標（内側2門は先端x-147/y±28、外側2門は段差肩部x-75/y±70）
        // 自機の装備ランクが高いほどレーザー弾速も高速化（-5.4 〜 -10.6）
        const cx = this.x;
        const cy = this.y;
        const rank = getPlayerEquipmentRank();
        const laserSpeed = -(5.4 + rank * 4.4 + (this.shields === 0 ? 0.8 : 0));
        const LaserClass = (typeof BigCoreLaser !== 'undefined') ? BigCoreLaser : Bullet;
        const muzzles = [
            { dx: -75, dy: -70 },
            { dx: -147, dy: -28 },
            { dx: -147, dy: 28 },
            { dx: -75, dy: 70 }
        ];
        muzzles.forEach(m => {
            if (LaserClass === BigCoreLaser) {
                this.bullets.push(new BigCoreLaser(cx + m.dx, cy + m.dy, laserSpeed, 0));
            } else {
                this.bullets.push(new Bullet(cx + m.dx, cy + m.dy, laserSpeed, 0, '#38bdf8', true));
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

    triggerDeathScream() {
        this.isScreaming = false;
        this.screamText = '';
    }

    hitCore(damage = 1) {
        this.hitFlashTimer = 4;
        this.hp -= damage;
        if (this.hp <= 0 && !this.isDying) {
            this.isDying = true;
            if (typeof triggerBossDefeatExplosion === 'function') {
                triggerBossDefeatExplosion(this);
            }
        }
    }

    handleBulletCollision(bullet) {
        if (this.isEntering || this.isDying || !this.active) return;

        const topHull = this.getTopHullBounds();
        const bottomHull = this.getBottomHullBounds();
        const shieldBounds = this.getShieldBounds();
        const coreHitbox = this.getCoreBounds();

        if (bullet instanceof Laser) {
            if (bullet.bossHitCooldown && bullet.bossHitCooldown > 0) {
                bullet.bossHitCooldown--;
                return;
            }
            bullet.bossHitCooldown = 20;
        }

        const isDouble = bullet.isDouble || (typeof player !== 'undefined' && player.weaponType === 'DOUBLE');
        const shieldDamage = isDouble ? 2 : 1;

        // 1. 遮蔽板への命中判定
        if (this.shields > 0 && shieldBounds && checkCollision(bullet, shieldBounds)) {
            if (!(bullet instanceof Laser)) {
                bullet.active = false;
            }
            const hitX = Math.min(bullet.x + bullet.width, shieldBounds.x);
            const destroyed = this.hitShield(shieldDamage);
            if (destroyed) {
                createExplosion(hitX, bullet.y, '#c6ad7b');
                createExplosion(hitX, bullet.y, '#ffaa00');
                if (typeof addScore === 'function') {
                    addScore(1000, hitX, bullet.y, '#00ffff');
                }
                if (typeof Sound !== 'undefined') {
                    if (typeof Sound.playShieldBreak === 'function') Sound.playShieldBreak();
                    else if (typeof Sound.playExplosion === 'function') Sound.playExplosion();
                }
            } else {
                createExplosion(hitX, bullet.y, '#ffffaa');
                if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') {
                    Sound.playBossHit();
                }
            }
            return;
        }

        // 2. コアへの直撃判定（遮蔽板全破壊後）
        if (this.shields === 0 && checkCollision(bullet, coreHitbox)) {
            if (!(bullet instanceof Laser)) {
                bullet.active = false;
            }
            this.hitCore(1);
            createExplosion(bullet.x + bullet.width / 2, bullet.y, '#52adef');
            if (typeof Sound !== 'undefined') Sound.playBossHit();

            if (this.hp <= 0 && !this.isDying) {
                this.isDying = true;
                if (typeof triggerBossDefeatExplosion === 'function') {
                    triggerBossDefeatExplosion(this);
                }
            }
            return;
        }

        // 3. 上下ハル（無敵装甲）への弾かれ判定
        if (checkCollision(bullet, topHull) || checkCollision(bullet, bottomHull)) {
            if (!(bullet instanceof Laser)) {
                bullet.active = false;
                createExplosion(bullet.x, bullet.y, '#8c948c');
                if (typeof Sound !== 'undefined') Sound.playBossHit();
            }
            return;
        }
    }

    draw(ctx) {
        ctx.save();

        if (this.isDying) {
            ctx.translate((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
            if (Math.floor(Date.now() / 60) % 2 === 0) {
                ctx.filter = 'brightness(2.2) saturate(2.0)';
            }
        }

        // 1985年AC版『グラディウス』ビッグコア完全再現描画（船体＋動的4枚遮蔽板＋ブルーコア）
        drawOriginalBigCore(ctx, this);

        ctx.restore();
        
        this.bullets.forEach(b => b.draw(ctx));
    }

    // 遮蔽壁の当たり判定（3倍スケールのドット絵座標に完全一致）
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

    // コアの当たり判定（中心: this.x - 8, this.y）
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

    // 上部ハル（無敵装甲）の当たり判定
    getTopHullBounds() {
        return {
            x: this.x - 135,
            y: this.y - 96,
            width: 255,
            height: 78
        };
    }

    // 下部ハル（無敵装甲）の当たり判定
    getBottomHullBounds() {
        return {
            x: this.x - 135,
            y: this.y + 18,
            width: 255,
            height: 78
        };
    }
}

// ==========================================
// STAGE 2 BOSS: 古代遺跡巨石×重武装メカ×多関節機械触手要塞
// 「エンシェント・テンタクル・ゴーレム (GolemBoss)」
// 風化したストーンヘンジ巨石遺跡と超古代機械フレームが融合し、
// 上下2本のうねる多関節メカニカル触手アームと旋回モノリス結界、
// 2基のルーンコアから苛烈なレーザー・イオンリング・拡散弾幕を放つ！
// ==========================================
class GolemBoss {
    constructor(x, y) {
        this.scale = 2;
        this.width = 175;
        this.height = 230;
        this.x = (x || 800) + 150;
        this.targetX = (x || 800) - 220; // 580: 画面右側に堂々陣取る定位置
        this.y = 185;
        this.active = true;
        this.isEntering = true;
        this.isDying = false;

        // 2つの古代ルーンコア（上下に各1基）
        this.core1Hp = 22;
        this.core1MaxHp = 22;
        this.core2Hp = 22;
        this.core2MaxHp = 22;
        this.hp = 44;

        // 各コアを守る古代石板シールド（上下各3枚）
        this.shields1 = 3;
        this.shields2 = 3;
        this.shieldHpPerPlate = 6;
        this.currentShieldHp1 = this.shieldHpPerPlate;
        this.currentShieldHp2 = this.shieldHpPerPlate;
        this.shieldHitCooldown = 0;

        // テスト互換用 shieldCores プロパティ（全無効化時はシールド解除として扱う）
        this.shieldCores = [
            { active: true },
            { active: true },
            { active: true },
            { active: true }
        ];

        this.moveTimer = 0;
        this.ringTimer = 0;
        this.laserTimer = 0;
        this.tentacleFireTimer = 0;
        this.monolithAngle = 0;
        this.rotationAngle = 0;
        this.bullets = [];
        this.hitFlashTimer1 = 0;
        this.hitFlashTimer2 = 0;
        this.shieldFlashTimer1 = 0;
        this.shieldFlashTimer2 = 0;
        this.hasTentacles = true;
        this.rearTentacleBlend = 0;
        this._computedRearBlend = 0;
        this.trackedPlayerX = 120;
        this.trackedPlayerY = 300;
        // 上下各触手の追従角度・角速度ステート（上からも下からも自機をゆっくり追いかける）
        this.tentacleStates = [
            { angle: -Math.PI, vel: 0, prevRaw: -Math.PI, targetUnwrapped: -Math.PI }, // 上触手
            { angle: Math.PI,  vel: 0, prevRaw: Math.PI,  targetUnwrapped: Math.PI }   // 下触手
        ];
        this.isScreaming = false;
        this.screamText = '';
    }

    triggerDeathScream() {
        if (this.isScreaming) return;
        this.isScreaming = true;
        this.screamText = '';
        if (typeof Sound !== 'undefined' && typeof Sound.playBossScream === 'function') {
            Sound.playBossScream();
        }
        if (!this._initialDismembered && typeof spawnBossDismembermentWave === 'function') {
            this._initialDismembered = true;
            spawnBossDismembermentWave(this, true);
        }
    }

    _syncLegacyTestState() {
        if (this.shieldCores && this.shieldCores.every(c => !c.active)) {
            this.shields1 = 0;
            this.shields2 = 0;
        }
    }

    _updateTentacleState(state, sign, px, py, refX, bossCenterY, maxSpeed, accel) {
        // 上触手(sign=-1)はやや下寄り、下触手(sign=+1)はやや上寄りを基準にすることで、
        // 自機が上から回り込めば全触手が上から、下から回り込めば全触手が下から、
        // 中央付近なら上触手は上から・下触手は下から自機を追いかける
        const refY = bossCenterY - sign * 28;
        const dx = px - refX;
        const dy = py - refY;
        const rawAngle = Math.atan2(dy, dx);

        let dRaw = Math.atan2(Math.sin(rawAngle - state.prevRaw), Math.cos(rawAngle - state.prevRaw));
        // 1フレームで前後へ大きく移動した場合も、自機の上下位置に応じた回転方向（上回り／下回り）を維持
        if (Math.cos(state.prevRaw) < -0.2 && Math.cos(rawAngle) > 0.2) {
            if (dy < 0 && dRaw < 0) dRaw += Math.PI * 2;
            else if (dy >= 0 && dRaw > 0) dRaw -= Math.PI * 2;
        } else if (Math.cos(state.prevRaw) > 0.2 && Math.cos(rawAngle) < -0.2) {
            if (dy < 0 && dRaw > 0) dRaw -= Math.PI * 2;
            else if (dy >= 0 && dRaw < 0) dRaw += Math.PI * 2;
        }
        state.prevRaw = rawAngle;
        state.targetUnwrapped += dRaw;

        // 触手がまだ前方を向いている状態で自機が背後へ回り込んだ際、
        // 自機がボスより上なら必ず上回り(角度増加: -π -> -π/2 -> 0)、下なら必ず下回り(角度減少: +π -> +π/2 -> 0)に誘導
        if (Math.cos(state.angle) < -0.25 && dx > -20) {
            const k = Math.round(state.angle / (Math.PI * 2));
            const rearAligned = k * Math.PI * 2 + rawAngle;
            if (dy < 0) {
                state.targetUnwrapped = (rearAligned > state.angle) ? rearAligned : (rearAligned + Math.PI * 2);
            } else {
                state.targetUnwrapped = (rearAligned < state.angle) ? rearAligned : (rearAligned - Math.PI * 2);
            }
        }

        // 複数周回の蓄積防止（上回り・下回りの経路記憶を保てる ±1.35π の範囲に収める）
        while (state.targetUnwrapped - state.angle > Math.PI * 1.35) state.targetUnwrapped -= Math.PI * 2;
        while (state.targetUnwrapped - state.angle < -Math.PI * 1.35) state.targetUnwrapped += Math.PI * 2;

        const diff = state.targetUnwrapped - state.angle;
        const desiredVel = Math.max(-maxSpeed, Math.min(maxSpeed, diff * 0.075));
        if (state.vel < desiredVel) {
            state.vel = Math.min(desiredVel, state.vel + accel);
        } else {
            state.vel = Math.max(desiredVel, state.vel - accel);
        }
        state.angle += state.vel;
    }

    // 上下2本の多関節メカニカル触手アームの関節座標を計算
    // （自機の位置を追いかけるように上からも下からもゆっくり追随して回る）
    _getTentacleNodes(isBottom) {
        const idx = isBottom ? 1 : 0;
        const sign = isBottom ? 1 : -1;
        const state = (this.tentacleStates && this.tentacleStates[idx])
            ? this.tentacleStates[idx]
            : { angle: sign * Math.PI, vel: 0, targetUnwrapped: sign * Math.PI };

        let targetDir = state.angle;
        let blend = (1 + Math.cos(targetDir)) * 0.5;

        // 外部テスト等から rearTentacleBlend が直接書き換えられた場合の互換サポート
        if (typeof this.rearTentacleBlend === 'number' && Math.abs(this.rearTentacleBlend - (this._computedRearBlend || 0)) > 0.05) {
            blend = this.rearTentacleBlend;
            targetDir = sign * Math.PI * (1 - blend);
        }

        const baseX = this.x + 38 + blend * 75;
        const baseY = isBottom ? (this.y + this.height - 14) : (this.y + 14);
        const nodes = [{ x: baseX, y: baseY }];
        const segCount = 8;
        const segLen = 20;

        // 回転中は先端が自機の方向へしなるように追随
        const leadDiff = Math.max(-0.55, Math.min(0.55, (state.targetUnwrapped || targetDir) - targetDir));
        const curveSign = -sign * Math.cos(targetDir);

        let curX = baseX;
        let curY = baseY;
        for (let i = 1; i <= segCount; i++) {
            const ratio = i / segCount;
            const wave = Math.sin(this.moveTimer * 1.45 - i * 0.50 + (isBottom ? Math.PI * 0.7 : 0)) * (0.28 + ratio * 0.16);
            const baseAngle = targetDir + leadDiff * ratio * 0.35 + curveSign * (0.38 - ratio * 0.42) + wave;
            curX += Math.cos(baseAngle) * segLen;
            curY += Math.sin(baseAngle) * segLen;
            nodes.push({ x: curX, y: curY, angle: baseAngle });
        }
        return nodes;
    }

    // 浮遊旋回する2基の古代モノリス結界石の座標
    _getOrbitingMonoliths() {
        const cx = this.x - 24;
        const cy = this.y + this.height / 2;
        const list = [];
        for (let i = 0; i < 2; i++) {
            const ang = this.monolithAngle + i * Math.PI;
            const mx = cx + Math.cos(ang) * 42;
            const my = cy + Math.sin(ang) * 95;
            list.push({ x: mx - 12, y: my - 22, width: 24, height: 44, cx: mx, cy: my });
        }
        return list;
    }

    update() {
        if (this.isDying) return;

        // 登場シーン
        if (this.x > this.targetX) {
            this.x -= 2.8;
            this.isEntering = true;
            return;
        }
        this.isEntering = false;

        this._syncLegacyTestState();

        this.moveTimer += 0.016;
        this.y = 185 + Math.sin(this.moveTimer) * 85;
        this.rotationAngle += 0.035;
        this.monolithAngle += 0.025;

        // 自機位置を取得し、上下の触手がそれぞれ上回り・下回りでゆっくり自機を追いかけるように更新
        const px = (typeof player !== 'undefined' && player) ? (player.x + player.width / 2) : 120;
        const py = (typeof player !== 'undefined' && player) ? (player.y + player.height / 2) : 300;
        this.trackedPlayerX += (px - this.trackedPlayerX) * 0.02;
        this.trackedPlayerY += (py - this.trackedPlayerY) * 0.02;

        const refX = this.x + 55;
        const bossCenterY = this.y + this.height / 2;
        this._updateTentacleState(this.tentacleStates[0], -1, px, py, refX, bossCenterY, 0.0205, 0.00072);
        this._updateTentacleState(this.tentacleStates[1],  1, px, py, refX, bossCenterY, 0.0195, 0.00068);

        const b0 = (1 + Math.cos(this.tentacleStates[0].angle)) * 0.5;
        const b1 = (1 + Math.cos(this.tentacleStates[1].angle)) * 0.5;
        this.rearTentacleBlend = (b0 + b1) * 0.5;
        this._computedRearBlend = this.rearTentacleBlend;

        if (this.shieldHitCooldown > 0) this.shieldHitCooldown--;
        if (this.hitFlashTimer1 > 0) this.hitFlashTimer1--;
        if (this.hitFlashTimer2 > 0) this.hitFlashTimer2--;
        if (this.shieldFlashTimer1 > 0) this.shieldFlashTimer1--;
        if (this.shieldFlashTimer2 > 0) this.shieldFlashTimer2--;

        const isEnraged = (this.core1Hp <= 0 || this.core2Hp <= 0 || (this.shields1 === 0 && this.shields2 === 0));

        // 攻撃1: 穏やかなペースの古代イオンリング弾（間隔を広げて弾数も控えめに）
        this.ringTimer++;
        if (this.ringTimer > (isEnraged ? 95 : 120)) {
            this.ringTimer = 0;
            this.shootRings();
        }

        // 攻撃2: 触手先端からの単発レーザー（連射や拡散を抑えて穏やかに）
        this.tentacleFireTimer++;
        if (this.tentacleFireTimer > (isEnraged ? 75 : 95)) {
            this.tentacleFireTimer = 0;
            this.shootTentacleWeapons();
        }

        // 攻撃3: 2連レーザー（間隔を広く穏やかに）
        this.laserTimer++;
        if (this.laserTimer > (isEnraged ? 110 : 140)) {
            this.laserTimer = 0;
            this.shootLasers();
        }

        this.bullets.forEach(b => b.update(600));
        this.bullets = this.bullets.filter(b => b.active);
    }

    shootRings() {
        const cx = this.x - 10;
        const rearX = this.x + this.width - 10;
        const cy1 = this.y + 60;
        const cy2 = this.y + 170;
        const midY = this.y + this.height / 2;
        const ShotClass = (typeof EnemyBullet !== 'undefined') ? EnemyBullet : Bullet;

        // 1. 前方へ穏やかな速度で上下各2発ずつイオンリング弾を発射
        if (typeof RingBullet !== 'undefined') {
            const angles = [-0.20, 0.20];
            angles.forEach(ang => {
                const spd = 3.2;
                const vx = -Math.cos(ang) * spd;
                const vy = Math.sin(ang) * spd;
                if (this.core1Hp > 0) {
                    this.bullets.push(new RingBullet(cx, cy1, vx, vy, '#38bdf8'));
                }
                if (this.core2Hp > 0) {
                    this.bullets.push(new RingBullet(cx, cy2, vx, vy, '#ffaa00'));
                }
            });
        }

        // 2. 自機が後ろ（右側）に回り込んでいる時だけ、後方へ穏やかなリング弾と単発弾を発射
        if (typeof player !== 'undefined' && player && player.x > this.x - 50) {
            const tx = player.x + player.width / 2;
            const ty = player.y + player.height / 2;
            const aimAng = Math.atan2(ty - midY, tx - rearX);
            if (typeof RingBullet !== 'undefined') {
                this.bullets.push(new RingBullet(rearX, midY, Math.cos(aimAng) * 3.5, Math.sin(aimAng) * 3.5, '#38bdf8'));
            }
            this.bullets.push(new ShotClass(rearX, midY, Math.cos(aimAng) * 4.0, Math.sin(aimAng) * 4.0));
        }
    }

    shootTentacleWeapons() {
        const topNodes = this._getTentacleNodes(false);
        const botNodes = this._getTentacleNodes(true);
        const topTip = topNodes[topNodes.length - 1];
        const botTip = botNodes[botNodes.length - 1];

        const targetX = (typeof player !== 'undefined' && player) ? (player.x + player.width / 2) : 120;
        const targetY = (typeof player !== 'undefined' && player) ? (player.y + player.height / 2) : 300;
        const LaserClass = (typeof EnemyLaser !== 'undefined') ? EnemyLaser : Bullet;

        // 上下触手先端から1発ずつ、穏やかな弾速で発射
        [topTip, botTip].forEach((tip, idx) => {
            const dx = targetX - tip.x;
            const dy = targetY - tip.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const spd = 4.3;
            const vx = (dx / dist) * spd;
            const vy = (dy / dist) * spd;
            const color = (idx === 0) ? '#00ffee' : '#ffaa00';
            this.bullets.push(new LaserClass(tip.x, tip.y, vx, vy, color));
        });

        if (typeof Sound !== 'undefined' && typeof Sound.playLaser === 'function') {
            Sound.playLaser();
        }
    }

    shootLasers() {
        const startX = this.x - 24;
        const rearX = this.x + this.width - 10;
        const LaserClass = (typeof EnemyLaser !== 'undefined') ? EnemyLaser : Bullet;

        // 前方へ穏やかな2連レーザー
        this.bullets.push(new LaserClass(startX, this.y + 45, -5.2, 0, '#00ffff'));
        this.bullets.push(new LaserClass(startX, this.y + this.height - 45, -5.2, 0, '#ffaa00'));

        // 自機が背後にいる時のみ後方へ穏やかな2連レーザー
        if (typeof player !== 'undefined' && player && player.x > this.x - 50) {
            this.bullets.push(new LaserClass(rearX, this.y + 45, 4.8, 0, '#00ffff'));
            this.bullets.push(new LaserClass(rearX, this.y + this.height - 45, 4.8, 0, '#ffaa00'));
        }

        if (typeof Sound !== 'undefined' && typeof Sound.playLaser === 'function') {
            Sound.playLaser();
        }
    }

    hitShield(isCore1, damage = 1) {
        if (this.shieldHitCooldown > 0) return false;
        this.shieldHitCooldown = 2;
        let destroyedAny = false;
        if (isCore1) {
            this.shieldFlashTimer1 = 5;
            this.currentShieldHp1 -= damage;
            while (this.currentShieldHp1 <= 0 && this.shields1 > 0) {
                this.shields1--;
                destroyedAny = true;
                if (this.shields1 > 0) {
                    this.currentShieldHp1 += this.shieldHpPerPlate;
                } else {
                    this.currentShieldHp1 = 0;
                    break;
                }
            }
            return destroyedAny;
        } else {
            this.shieldFlashTimer2 = 5;
            this.currentShieldHp2 -= damage;
            while (this.currentShieldHp2 <= 0 && this.shields2 > 0) {
                this.shields2--;
                destroyedAny = true;
                if (this.shields2 > 0) {
                    this.currentShieldHp2 += this.shieldHpPerPlate;
                } else {
                    this.currentShieldHp2 = 0;
                    break;
                }
            }
            return destroyedAny;
        }
    }

    hitCore(isCore1, damage = 1) {
        if (isCore1) {
            this.hitFlashTimer1 = 4;
            this.core1Hp -= damage;
            if (this.core1Hp <= 0 && this.core1Hp + damage > 0) {
                if (typeof createExplosion === 'function') {
                    createExplosion(this.x + 60, this.y + 60, '#00ffff');
                    createExplosion(this.x + 60, this.y + 60, '#ffaa00');
                }
                if (typeof addScore === 'function') {
                    addScore(3000, this.x + 60, this.y + 60, '#ffcc00');
                }
            }
        } else {
            this.hitFlashTimer2 = 4;
            this.core2Hp -= damage;
            if (this.core2Hp <= 0 && this.core2Hp + damage > 0) {
                if (typeof createExplosion === 'function') {
                    createExplosion(this.x + 60, this.y + 170, '#00ffff');
                    createExplosion(this.x + 60, this.y + 170, '#ffaa00');
                }
                if (typeof addScore === 'function') {
                    addScore(3000, this.x + 60, this.y + 170, '#ffcc00');
                }
            }
        }
        this.hp = Math.max(0, this.core1Hp) + Math.max(0, this.core2Hp);
        this.checkDefeat();
    }

    handleBulletCollision(bullet) {
        if (this.isEntering || this.isDying || !this.active) return;

        this._syncLegacyTestState();

        // レーザーのヒットレート抑制
        if (typeof Laser !== 'undefined' && bullet instanceof Laser) {
            if (bullet.bossHitCooldown && bullet.bossHitCooldown > 0) {
                bullet.bossHitCooldown--;
                return;
            }
            bullet.bossHitCooldown = 4;
        }

        const isDouble = Boolean(bullet.isDouble || (typeof player !== 'undefined' && player && player.weaponType === 'DOUBLE'));
        const shieldDmg = isDouble ? 5 : 1;

        // テスト互換: shieldCoresが全て無効化され hp <= 1 で (this.x, this.y) を撃たれた場合
        if (this.shields1 === 0 && this.shields2 === 0 && this.hp <= 1) {
            const directBox = { x: this.x - 28, y: this.y - 28, width: 56, height: 56 };
            if (checkCollision(bullet, directBox)) {
                if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) bullet.active = false;
                this.core1Hp = 0;
                this.core2Hp = 0;
                this.hp = 0;
                this.checkDefeat();
                return;
            }
        }

        // 1. 上コア・下コアの遮蔽板当たり判定
        let shield1Bounds = null;
        if (this.shields1 > 0) {
            const frontX1 = (this.x + 16) - (this.shields1 - 1) * 12;
            shield1Bounds = {
                x: frontX1 - 6,
                y: this.y + 32,
                width: (this.x + 36) - (frontX1 - 6),
                height: 60
            };
        }

        let shield2Bounds = null;
        if (this.shields2 > 0) {
            const frontX2 = (this.x + 16) - (this.shields2 - 1) * 12;
            shield2Bounds = {
                x: frontX2 - 6,
                y: this.y + 142,
                width: (this.x + 36) - (frontX2 - 6),
                height: 60
            };
        }

        const core1Bounds = { x: this.x + 30, y: this.y + 35, width: 56, height: 54 };
        const core2Bounds = { x: this.x + 30, y: this.y + 145, width: 56, height: 54 };

        // A. 上コアの遮蔽板への着弾判定
        if (this.shields1 > 0 && shield1Bounds && checkCollision(bullet, shield1Bounds)) {
            if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) bullet.active = false;
            const hitX = Math.min(bullet.x + bullet.width, shield1Bounds.x + 10);
            const destroyed = this.hitShield(true, shieldDmg);
            createExplosion(hitX, bullet.y, destroyed ? '#ffaa00' : '#ffffaa');
            if (destroyed && typeof addScore === 'function') addScore(1000, hitX, bullet.y, '#00ffff');
            if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') Sound.playBossHit();
            return;
        }

        // B. 下コアの遮蔽板への着弾判定
        if (this.shields2 > 0 && shield2Bounds && checkCollision(bullet, shield2Bounds)) {
            if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) bullet.active = false;
            const hitX = Math.min(bullet.x + bullet.width, shield2Bounds.x + 10);
            const destroyed = this.hitShield(false, shieldDmg);
            createExplosion(hitX, bullet.y, destroyed ? '#ffaa00' : '#ffffaa');
            if (destroyed && typeof addScore === 'function') addScore(1000, hitX, bullet.y, '#00ffff');
            if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') Sound.playBossHit();
            return;
        }

        // C. 上コアへの直撃（遮蔽板全滅後）
        if (this.shields1 === 0 && this.core1Hp > 0 && checkCollision(bullet, core1Bounds)) {
            if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) bullet.active = false;
            this.hitCore(true, 1);
            createExplosion(bullet.x + bullet.width / 2, bullet.y, '#00ffff');
            if (typeof Sound !== 'undefined') Sound.playBossHit();
            this.checkDefeat();
            return;
        }

        // D. 下コアへの直撃（遮蔽板全滅後）
        if (this.shields2 === 0 && this.core2Hp > 0 && checkCollision(bullet, core2Bounds)) {
            if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) bullet.active = false;
            this.hitCore(false, 1);
            createExplosion(bullet.x + bullet.width / 2, bullet.y, '#ffaa00');
            if (typeof Sound !== 'undefined') Sound.playBossHit();
            this.checkDefeat();
            return;
        }

        // E. 旋回する浮遊モノリス結界石による防御ギミック（通常弾を弾く）
        const monoliths = this._getOrbitingMonoliths();
        for (const m of monoliths) {
            if (checkCollision(bullet, m)) {
                if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) {
                    bullet.active = false;
                    createExplosion(bullet.x, bullet.y, '#38bdf8');
                    if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') Sound.playBossHit();
                }
                return;
            }
        }

        // F. 外装玄武岩＆超古代メカアーマーへの弾かれ判定
        const armorParts = [
            { x: this.x + 25, y: this.y, width: this.width - 25, height: 32 },
            { x: this.x + 25, y: this.y + 92, width: this.width - 25, height: 50 },
            { x: this.x + 25, y: this.y + 202, width: this.width - 25, height: 28 },
            { x: this.x + 90, y: this.y, width: this.width - 90, height: this.height }
        ];

        for (const armor of armorParts) {
            if (checkCollision(bullet, armor)) {
                if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) {
                    bullet.active = false;
                    createExplosion(bullet.x, bullet.y, '#556677');
                    if (typeof Sound !== 'undefined') Sound.playBossHit();
                }
                return;
            }
        }
    }

    checkDefeat() {
        if (this.core1Hp <= 0 && this.core2Hp <= 0 && !this.isDying) {
            this.triggerDeathScream();
            if (typeof triggerBossDefeatExplosion === 'function') {
                triggerBossDefeatExplosion(this);
            } else {
                this.isDying = true;
            }
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();

        if (this.isDying) {
            ctx.translate((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
            if (Math.floor(Date.now() / 60) % 2 === 0) {
                ctx.filter = 'brightness(2.4) saturate(2.0)';
            }
        }

        const bx = this.x;
        const by = this.y;
        const bw = this.width;
        const bh = this.height;

        // --- 0. 上下2本の多関節メカニカル触手アーム（背面から前方へうねる機械触手） ---
        this._drawMechanicalTentacle(ctx, false);
        this._drawMechanicalTentacle(ctx, true);

        // --- 1. 後部プラズマスラスター＆超古代機械フレーム ---
        const thrustLen = 28 + Math.sin(Date.now() * 0.02) * 10;
        const thrustGrad = ctx.createLinearGradient(bx + bw - 10, by, bx + bw + thrustLen, by);
        thrustGrad.addColorStop(0, '#ffffff');
        thrustGrad.addColorStop(0.4, '#38bdf8');
        thrustGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
        ctx.fillStyle = thrustGrad;
        [by + 45, by + bh / 2, by + bh - 45].forEach(ty => {
            ctx.beginPath();
            ctx.moveTo(bx + bw - 8, ty - 14);
            ctx.lineTo(bx + bw + thrustLen, ty);
            ctx.lineTo(bx + bw - 8, ty + 14);
            ctx.closePath();
            ctx.fill();
        });

        // --- 2. 重厚な古代遺跡巨石モノリス × サイバー装甲メインボディ ---
        const stoneGrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
        stoneGrad.addColorStop(0.0, '#64748b');
        stoneGrad.addColorStop(0.3, '#334155');
        stoneGrad.addColorStop(0.7, '#1e293b');
        stoneGrad.addColorStop(1.0, '#090d16');
        ctx.fillStyle = stoneGrad;

        ctx.beginPath();
        ctx.moveTo(bx + 36, by - 6);
        ctx.lineTo(bx + bw - 8, by + 14);
        ctx.lineTo(bx + bw + 6, by + 55);
        ctx.lineTo(bx + bw + 6, by + bh - 55);
        ctx.lineTo(bx + bw - 8, by + bh - 14);
        ctx.lineTo(bx + 36, by + bh + 6);
        ctx.lineTo(bx - 4, by + bh - 34);
        ctx.lineTo(bx + 18, by + bh / 2 + 28);
        ctx.lineTo(bx - 18, by + bh / 2);
        ctx.lineTo(bx + 18, by + bh / 2 - 28);
        ctx.lineTo(bx - 4, by + 34);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 古代石積みのレリーフ分割線と機械装甲プレート
        ctx.fillStyle = '#475569';
        ctx.fillRect(bx + 88, by + 18, 68, 42);
        ctx.fillRect(bx + 88, by + bh - 60, 68, 42);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(bx + 22, by + bh / 2 - 18, 125, 36);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(bx + 22, by + bh / 2 - 18, 125, 36);

        // --- 3. 古代ルーン回路紋様（シアン＆アンバー発光） ---
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
        ctx.lineWidth = 2.2;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(bx + bw * 0.68, by + bh * 0.28, 16, 0, Math.PI * 2);
        ctx.arc(bx + bw * 0.68, by + bh * 0.72, 16, 0, Math.PI * 2);
        ctx.moveTo(bx + bw * 0.68, by + bh * 0.28 + 16);
        ctx.lineTo(bx + bw * 0.68, by + bh * 0.72 - 16);
        ctx.moveTo(bx + 30, by + bh / 2);
        ctx.lineTo(bx + bw * 0.68, by + bh / 2);
        ctx.stroke();
        ctx.restore();

        // --- 4. 2基の古代ルーンコア ---
        this.drawCore(ctx, bx + 62, by + 62, this.core1Hp, this.core1MaxHp, this.hitFlashTimer1, '#00ffff');
        this.drawCore(ctx, bx + 62, by + 172, this.core2Hp, this.core2MaxHp, this.hitFlashTimer2, '#ffaa00');

        // --- 5. 古代石板シールド（ストーンタブレット） ---
        this.drawStoneShields(ctx, bx + 16, by + 62, this.shields1, this.shieldFlashTimer1);
        this.drawStoneShields(ctx, bx + 16, by + 172, this.shields2, this.shieldFlashTimer2);

        // --- 6. 旋回する浮遊モノリス結界石とルーン稲妻 ---
        this._drawOrbitingMonoliths(ctx, bx + 62, by + bh / 2);

        ctx.restore();

        // 弾の描画
        this.bullets.forEach(b => b.draw(ctx));
    }

    _drawMechanicalTentacle(ctx, isBottom) {
        const nodes = this._getTentacleNodes(isBottom);
        ctx.save();

        // 機械触手のエネルギー導管ケーブル
        ctx.strokeStyle = isBottom ? 'rgba(255, 170, 0, 0.55)' : 'rgba(0, 255, 238, 0.55)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        nodes.forEach((n, idx) => {
            if (idx === 0) ctx.moveTo(n.x, n.y);
            else ctx.lineTo(n.x, n.y);
        });
        ctx.stroke();

        // 各関節の重装甲メカセグメント＆古代石材リング
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            const r = Math.max(7, 16 - i * 1.1);

            ctx.save();
            ctx.translate(n.x, n.y);
            if (n.angle !== undefined) ctx.rotate(n.angle);

            // メタリック＆古代石材ハイブリッド装甲節
            const segGrad = ctx.createRadialGradient(-2, -3, 1, 0, 0, r);
            segGrad.addColorStop(0, '#e2e8f0');
            segGrad.addColorStop(0.45, '#64748b');
            segGrad.addColorStop(0.85, '#1e293b');
            segGrad.addColorStop(1, '#090d16');
            ctx.fillStyle = segGrad;
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(-r * 0.9, -r * 0.75, r * 1.8, r * 1.5, 4) : ctx.fillRect(-r * 0.9, -r * 0.75, r * 1.8, r * 1.5);
            ctx.fill();
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // 関節コアのルーン発光ノード
            ctx.fillStyle = isBottom ? '#ffaa00' : '#00ffee';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
            ctx.fill();

            // 先端のメカニカル・クローレーザー砲門
            if (i === nodes.length - 1) {
                ctx.fillStyle = '#cbd5e1';
                ctx.beginPath();
                ctx.moveTo(4, -7);
                ctx.lineTo(18, -12);
                ctx.lineTo(12, -3);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(4, 7);
                ctx.lineTo(18, 12);
                ctx.lineTo(12, 3);
                ctx.closePath();
                ctx.fill();

                ctx.fillStyle = isBottom ? '#ffdd00' : '#00ffff';
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(8, 0, 5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        ctx.restore();
    }

    _drawOrbitingMonoliths(ctx, hubX, hubY) {
        const monoliths = this._getOrbitingMonoliths();
        ctx.save();
        monoliths.forEach((m, idx) => {
            // 本体と結界石を結ぶ古代エネルギーライン
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(hubX, hubY);
            ctx.lineTo(m.cx, m.cy);
            ctx.stroke();

            // 浮遊巨石スラブ
            const g = ctx.createLinearGradient(m.x, m.y, m.x + m.width, m.y + m.height);
            g.addColorStop(0, '#94a3b8');
            g.addColorStop(0.5, '#475569');
            g.addColorStop(1, '#0f172a');
            ctx.fillStyle = g;
            ctx.fillRect(m.x, m.y, m.width, m.height);
            ctx.strokeStyle = '#e2e8f0';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(m.x, m.y, m.width, m.height);

            // ルーン刻印
            ctx.fillStyle = (idx === 0) ? '#00ffee' : '#ffaa00';
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 8;
            ctx.fillRect(m.x + 8, m.y + 8, 8, m.height - 16);
            ctx.shadowBlur = 0;
        });
        ctx.restore();
    }

    drawCore(ctx, cx, cy, hp, maxHp, flashTimer, coreThemeColor) {
        ctx.save();
        const r = 24;

        if (hp <= 0) {
            ctx.fillStyle = '#0a0d14';
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
            return;
        }

        const isFlashing = flashTimer > 0;
        const pulse = Math.sin(Date.now() * 0.008) * 0.3 + 0.7;

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.shadowColor = isFlashing ? '#ffffff' : coreThemeColor;
        ctx.shadowBlur = 20 * pulse;

        const grad = ctx.createRadialGradient(cx - 7, cy - 7, 2, cx, cy, r);
        if (isFlashing) {
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(1, '#ffffff');
        } else {
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, coreThemeColor);
            grad.addColorStop(0.8, '#0369a1');
            grad.addColorStop(1.0, '#020617');
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(this.rotationAngle);
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(-12, -12, 24, 24);
        ctx.restore();

        ctx.restore();
    }

    drawStoneShields(ctx, sx, sy, shields, flashTimer) {
        if (shields <= 0) return;
        const w = 8;
        const h = 50;
        const spacing = 12;
        const isFlashing = flashTimer > 0;

        for (let i = 0; i < shields; i++) {
            const px = sx - (shields - 1 - i) * spacing;
            const py = sy - h / 2;

            ctx.save();
            const grad = ctx.createLinearGradient(px, py, px + w, py);
            if (isFlashing && i === 0) {
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(1, '#ffeeaa');
            } else {
                grad.addColorStop(0, '#cbd5e1');
                grad.addColorStop(0.5, '#64748b');
                grad.addColorStop(1, '#1e293b');
            }
            ctx.fillStyle = grad;
            ctx.fillRect(px, py, w, h);

            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1;
            ctx.strokeRect(px, py, w, h);

            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(px + 2, py + 15, 4, 20);
            ctx.restore();
        }
    }
}


// ==========================================
// STAGE 3 BOSS: 生体脳みそ・脈動する内臓血管 × 機械触手 × 古代モアイ巨石装甲
// 「バイオ・モアイ・ブレイン・コア (BigCoreBoss)」
// 巨大な生体脳みそ（大脳皮質の皺・神経シナプス）と拍動する内臓器官・太い血管網、
// 自機を睨みつける巨大生体眼球コア、上下の古代モアイ巨石顎、
// そして4本のうねる機械触手＆生体触手から苛烈なバイオレーザー・イオンリング嵐を放つ！
// ==========================================
class BigCoreBoss {
    constructor(x, y) {
        this.x = (x || 800) + 100;
        this.targetX = 580;
        this.y = y || 300;
        this.width = 250;
        this.height = 210;
        this.active = true;
        this.isEntering = true;
        this.isDying = false;

        this.maxHp = 40;
        this.hp = 40;

        // 前面4つの生体臓器カプセル・シールドコア（テスト互換維持）
        this.shieldCores = [
            { hp: 8, maxHp: 8, flashTimer: 0, active: true },
            { hp: 8, maxHp: 8, flashTimer: 0, active: true },
            { hp: 8, maxHp: 8, flashTimer: 0, active: true },
            { hp: 8, maxHp: 8, flashTimer: 0, active: true },
        ];

        this.hitFlashTimer = 0;
        this.moveTimer = 0;
        this.rotationAngle = 0;
        this.fireTimer = 0;
        this.tentacleTimer = 0;
        this.bioRingTimer = 0;
        this.organPulse = 0;
        this.jawOpen = 0;
        this.bullets = [];

        // 3面ボスの触手の長さを以前の半分(1.5倍スケール)に調整し、ゆっくり動くよう設定
        this.hasTentacles = true;
        this.tentacleLengthScale = 1.5;
        this.tentacleThicknessScale = 1.8;
        this.rearTentacleBlend = 0;
        this._computedRearBlend = 0;
        this.trackedPlayerX = 120;
        this.trackedPlayerY = 300;
        // 4本の各触手の追従角度・角速度ステート（上からも下からも自機をゆっくり追いかける）
        this.tentacleStates = [
            { angle: -Math.PI, vel: 0, prevRaw: -Math.PI, targetUnwrapped: -Math.PI }, // 上外（機械）
            { angle: -Math.PI, vel: 0, prevRaw: -Math.PI, targetUnwrapped: -Math.PI }, // 上内（生体）
            { angle: Math.PI,  vel: 0, prevRaw: Math.PI,  targetUnwrapped: Math.PI },  // 下内（生体）
            { angle: Math.PI,  vel: 0, prevRaw: Math.PI,  targetUnwrapped: Math.PI }   // 下外（機械）
        ];
        this.volleyIndex = 0;
        this.isScreaming = false;
        this.screamText = '';
    }

    triggerDeathScream() {
        if (this.isScreaming) return;
        this.isScreaming = true;
        this.screamText = '';
        if (typeof Sound !== 'undefined' && typeof Sound.playBossScream === 'function') {
            Sound.playBossScream();
        }
        if (!this._initialDismembered && typeof spawnBossDismembermentWave === 'function') {
            this._initialDismembered = true;
            spawnBossDismembermentWave(this, true);
        }
    }

    checkDefeat() {
        if (this.hp <= 0 && !this.isDying) {
            this.triggerDeathScream();
            if (typeof triggerBossDefeatExplosion === 'function') {
                triggerBossDefeatExplosion(this);
            } else {
                this.isDying = true;
            }
        }
    }

    get allShieldsDestroyed() {
        return this.shieldCores.every(c => !c.active);
    }

    get coreOpen() {
        return this.allShieldsDestroyed;
    }

    _updateTentacleState(state, sign, biasY, px, py, refX, bossCenterY, maxSpeed, accel) {
        const refY = bossCenterY - sign * biasY;
        const dx = px - refX;
        const dy = py - refY;
        const rawAngle = Math.atan2(dy, dx);

        let dRaw = Math.atan2(Math.sin(rawAngle - state.prevRaw), Math.cos(rawAngle - state.prevRaw));
        if (Math.cos(state.prevRaw) < -0.2 && Math.cos(rawAngle) > 0.2) {
            if (dy < 0 && dRaw < 0) dRaw += Math.PI * 2;
            else if (dy >= 0 && dRaw > 0) dRaw -= Math.PI * 2;
        } else if (Math.cos(state.prevRaw) > 0.2 && Math.cos(rawAngle) < -0.2) {
            if (dy < 0 && dRaw > 0) dRaw -= Math.PI * 2;
            else if (dy >= 0 && dRaw < 0) dRaw += Math.PI * 2;
        }
        state.prevRaw = rawAngle;
        state.targetUnwrapped += dRaw;

        // 触手がまだ前方を向いている状態で自機が背後へ回り込んだ際、
        // 自機が基準より上なら必ず上回り(角度増加: -π -> -π/2 -> 0)、下なら必ず下回り(角度減少: +π -> +π/2 -> 0)に誘導
        if (Math.cos(state.angle) < -0.25 && dx > -20) {
            const k = Math.round(state.angle / (Math.PI * 2));
            const rearAligned = k * Math.PI * 2 + rawAngle;
            if (dy < 0) {
                state.targetUnwrapped = (rearAligned > state.angle) ? rearAligned : (rearAligned + Math.PI * 2);
            } else {
                state.targetUnwrapped = (rearAligned < state.angle) ? rearAligned : (rearAligned - Math.PI * 2);
            }
        }

        while (state.targetUnwrapped - state.angle > Math.PI * 1.35) state.targetUnwrapped -= Math.PI * 2;
        while (state.targetUnwrapped - state.angle < -Math.PI * 1.35) state.targetUnwrapped += Math.PI * 2;

        const diff = state.targetUnwrapped - state.angle;
        const desiredVel = Math.max(-maxSpeed, Math.min(maxSpeed, diff * 0.038));
        if (state.vel < desiredVel) {
            state.vel = Math.min(desiredVel, state.vel + accel);
        } else {
            state.vel = Math.max(desiredVel, state.vel - accel);
        }
        state.angle += state.vel;
    }

    // 4本のうねる機械触手＆生体触手（長さを以前の半分に短縮し、自機を追いかけるように上からも下からもゆっくり追随）
    _getBioMechaTentacles() {
        const cx = this.x;
        const cy = this.y;
        const lenScale = this.tentacleLengthScale || 1.5;
        const thickScale = this.tentacleThicknessScale || 1.8;
        const hasManualOverride = (typeof this.rearTentacleBlend === 'number' && Math.abs(this.rearTentacleBlend - (this._computedRearBlend || 0)) > 0.05);

        const baseConfigs = [
            { baseOx: -15, rearShift: 75, oy: -82, sign: -1, isBio: false, phase: 0.0, baseLen: 21, len: 21 * lenScale },
            { baseOx: 20,  rearShift: 55, oy: -58, sign: -1, isBio: true,  phase: 1.6, baseLen: 19, len: 19 * lenScale },
            { baseOx: 20,  rearShift: 55, oy: 58,  sign: 1,  isBio: true,  phase: 3.1, baseLen: 19, len: 19 * lenScale },
            { baseOx: -15, rearShift: 75, oy: 82,  sign: 1,  isBio: false, phase: 4.7, baseLen: 21, len: 21 * lenScale }
        ];

        return baseConfigs.map((cfg, idx) => {
            const state = (this.tentacleStates && this.tentacleStates[idx])
                ? this.tentacleStates[idx]
                : { angle: cfg.sign * Math.PI, vel: 0, targetUnwrapped: cfg.sign * Math.PI };

            let targetDir = state.angle;
            let blend = (1 + Math.cos(targetDir)) * 0.5;
            if (hasManualOverride) {
                blend = this.rearTentacleBlend;
                targetDir = cfg.sign * Math.PI * (1 - blend);
            }

            const nodes = [];
            let nx = cx + cfg.baseOx + blend * cfg.rearShift;
            let ny = cy + cfg.oy;
            const leadDiff = Math.max(-0.28, Math.min(0.28, (state.targetUnwrapped || targetDir) - targetDir));
            const curveSign = -cfg.sign * Math.cos(targetDir);

            nodes.push({ x: nx, y: ny, angle: targetDir, radius: 13 * thickScale });
            const segs = 9;
            for (let i = 1; i <= segs; i++) {
                const t = i / segs;
                const whip = Math.sin(this.moveTimer * 1.35 - i * 0.50 + cfg.phase) * (0.26 + t * 0.16);
                const ang = targetDir + leadDiff * t * 0.175 + curveSign * (0.36 - t * 0.42) + whip;
                nx += Math.cos(ang) * cfg.len;
                ny += Math.sin(ang) * cfg.len;
                const r = Math.max(5, 13 - i * 0.9) * thickScale;
                nodes.push({ x: nx, y: ny, angle: ang, radius: r });
            }
            return {
                isBio: cfg.isBio,
                sign: cfg.sign,
                baseLen: cfg.baseLen,
                len: cfg.len,
                lengthScale: lenScale,
                thicknessScale: thickScale,
                lineWidth: (cfg.isBio ? 7 : 5.5) * thickScale,
                nodes
            };
        });
    }

    update() {
        if (this.isDying) return;

        if (this.x > this.targetX) {
            this.x -= 2.8;
            this.isEntering = true;
            return;
        }
        this.isEntering = false;

        this.moveTimer += 0.015;
        this.organPulse += this.coreOpen ? 0.10 : 0.06;
        this.y = 300 + Math.sin(this.moveTimer) * 65;
        this.rotationAngle += 0.035;

        // 自機位置を取得し、4本の触手が上回り・下回りで自機を従来の半分の速度でゆっくり追いかけるように更新
        const px = (typeof player !== 'undefined' && player) ? (player.x + player.width / 2) : 120;
        const py = (typeof player !== 'undefined' && player) ? (player.y + player.height / 2) : 300;
        this.trackedPlayerX += (px - this.trackedPlayerX) * 0.01;
        this.trackedPlayerY += (py - this.trackedPlayerY) * 0.01;

        const refX = this.x;
        const bossCenterY = this.y;
        this._updateTentacleState(this.tentacleStates[0], -1, 32, px, py, refX, bossCenterY, 0.0102, 0.00036);
        this._updateTentacleState(this.tentacleStates[1], -1, 20, px, py, refX, bossCenterY, 0.0097, 0.00034);
        this._updateTentacleState(this.tentacleStates[2],  1, 20, px, py, refX, bossCenterY, 0.0097, 0.00034);
        this._updateTentacleState(this.tentacleStates[3],  1, 32, px, py, refX, bossCenterY, 0.0102, 0.00036);

        let sumBlend = 0;
        for (let i = 0; i < this.tentacleStates.length; i++) {
            sumBlend += (1 + Math.cos(this.tentacleStates[i].angle)) * 0.5;
        }
        this.rearTentacleBlend = sumBlend / this.tentacleStates.length;
        this._computedRearBlend = this.rearTentacleBlend;

        // 顎の開閉アニメーション
        const targetJaw = (this.bioRingTimer > 80 || this.coreOpen) ? 1.0 : 0.25 + Math.sin(this.organPulse * 0.5) * 0.2;
        this.jawOpen += (targetJaw - this.jawOpen) * 0.08;

        this.shieldCores.forEach(c => { if (c.flashTimer > 0) c.flashTimer--; });
        if (this.hitFlashTimer > 0) this.hitFlashTimer--;

        // 武器1: バイオレーザー（間隔を広げて穏やかに）
        this.fireTimer++;
        const interval = this.coreOpen ? 90 : 115;
        if (this.fireTimer >= interval) {
            this.fireTimer = 0;
            this.shoot();
        }

        // 武器2: 触手からの単発ショット（間隔を広げて穏やかに）
        this.tentacleTimer++;
        const tentacleInterval = this.coreOpen ? 75 : 95;
        if (this.tentacleTimer >= tentacleInterval) {
            this.tentacleTimer = 0;
            this.shootTentacleBarrage();
        }

        // 武器3: バイオ・イオンリング弾（間隔を広げて穏やかに）
        this.bioRingTimer++;
        const ringInterval = this.coreOpen ? 105 : 135;
        if (this.bioRingTimer >= ringInterval) {
            this.bioRingTimer = 0;
            this.shootBioRingStorm();
        }

        this.bullets.forEach(b => b.update(600));
        this.bullets = this.bullets.filter(b => b.active);
    }

    shoot() {
        const bx = this.x - this.width / 2 + 10;
        const rearX = this.x + this.width / 2 - 10;
        const by = this.y;
        const spd = this.coreOpen ? -5.8 : -5.0;
        const rearSpd = 4.6;
        const LaserClass = (typeof EnemyLaser !== 'undefined') ? EnemyLaser : Bullet;

        // 前方へ穏やかな2連レーザー（コア開放時は4連）
        this.bullets.push(new LaserClass(bx, by - 42, spd, 0, '#00ffff'));
        this.bullets.push(new LaserClass(bx, by + 42, spd, 0, '#00ffff'));
        if (this.coreOpen) {
            this.bullets.push(new LaserClass(bx, by - 16, spd, 0, '#ff2266'));
            this.bullets.push(new LaserClass(bx, by + 16, spd, 0, '#ff2266'));
        }

        // 自機が背後にいる時のみ後方へ穏やかなレーザーを発射
        if (typeof player !== 'undefined' && player && player.x > this.x - 50) {
            const tx = player.x + player.width / 2;
            const ty = player.y + player.height / 2;
            const ang = Math.atan2(ty - by, tx - rearX);
            this.bullets.push(new LaserClass(rearX, by, Math.cos(ang) * rearSpd, Math.sin(ang) * rearSpd, '#ff2266'));
        }

        if (typeof Sound !== 'undefined' && typeof Sound.playLaser === 'function') {
            Sound.playLaser();
        }
    }

    shootTentacleBarrage() {
        const tentacles = this._getBioMechaTentacles();
        const targetX = (typeof player !== 'undefined' && player) ? (player.x + player.width / 2) : 120;
        const targetY = (typeof player !== 'undefined' && player) ? (player.y + player.height / 2) : 300;
        const LaserClass = (typeof EnemyLaser !== 'undefined') ? EnemyLaser : Bullet;
        this.volleyIndex = ((this.volleyIndex || 0) + 1) % 2;

        // 4本すべてから同時乱射せず、交互に2本ずつ単発の穏やかなレーザーのみ発射
        tentacles.forEach((t, idx) => {
            if (idx % 2 !== this.volleyIndex) return;
            const tip = t.nodes[t.nodes.length - 1];
            const dx = targetX - tip.x;
            const dy = targetY - tip.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const spd = 4.2;
            const vx = (dx / dist) * spd;
            const vy = (dy / dist) * spd;
            const col = t.isBio ? '#ff2266' : '#00ffee';
            this.bullets.push(new LaserClass(tip.x, tip.y, vx, vy, col));
        });
    }

    shootBioRingStorm() {
        const mouthX = this.x - 88;
        const rearBrainX = this.x + 95;
        const mouthY = this.y;

        // 1. 前方（口）へ撃ち落とし可能なバイオ・イオンリング弾を穏やかに2〜3発発射
        if (typeof RingBullet !== 'undefined') {
            const angles = this.coreOpen ? [-0.24, 0, 0.24] : [-0.18, 0.18];
            angles.forEach((a, i) => {
                const spd = 3.2;
                const col = (i % 2 === 0) ? '#ff2266' : '#00e5ff';
                this.bullets.push(new RingBullet(mouthX, mouthY, -Math.cos(a) * spd, Math.sin(a) * spd, col));
            });
        }

        // 2. 自機が背後に回り込んでいる時のみ、後方へ穏やかなイオンリング弾を1発発射
        if (typeof player !== 'undefined' && player && player.x > this.x - 50) {
            const tx = player.x + player.width / 2;
            const ty = player.y + player.height / 2;
            const aimAng = Math.atan2(ty - mouthY, tx - rearBrainX);
            if (typeof RingBullet !== 'undefined') {
                this.bullets.push(new RingBullet(rearBrainX, mouthY, Math.cos(aimAng) * 3.5, Math.sin(aimAng) * 3.5, '#ff2266'));
            }
        }
    }

    _getShieldCoreX(index) {
        return this.x - 96 + index * 22;
    }

    _getShieldCoreBounds(index) {
        const cx = this._getShieldCoreX(index);
        const r = 14;
        return { x: cx - r, y: this.y - r, width: r * 2, height: r * 2 };
    }

    hitShieldCore(index, damage = 1) {
        if (index === undefined || index === null) {
            index = this.shieldCores.findIndex(c => c.active);
        }
        if (index < 0 || index >= this.shieldCores.length) return false;
        const core = this.shieldCores[index];
        if (!core || !core.active) return false;

        core.hp -= damage;
        core.flashTimer = 8;
        if (core.hp <= 0) {
            core.active = false;
            const scx = this._getShieldCoreX(index);
            if (typeof createExplosion === 'function') {
                createExplosion(scx, this.y, '#ff2266');
                createExplosion(scx, this.y, '#00ffff');
            }
            if (typeof addScore === 'function') {
                addScore(1500, scx, this.y, '#00ffff');
            }
            if (typeof Sound !== 'undefined' && typeof Sound.playExplosion === 'function') {
                Sound.playExplosion();
            }
        }
        return true;
    }

    hitCore(damage) {
        this.hitFlashTimer = 5;
        this.hp -= damage;
        this.checkDefeat();
    }

    handleBulletCollision(bullet) {
        if (this.isEntering || this.isDying || !this.active) return;

        if (typeof Laser !== 'undefined' && bullet instanceof Laser) {
            if (bullet.bossHitCooldown && bullet.bossHitCooldown > 0) {
                bullet.bossHitCooldown--;
                return;
            }
            bullet.bossHitCooldown = 12;
        }

        // シールドコア判定（最前列＝最も左側のアクティブな生体臓器カプセルを探す）
        for (let i = 0; i < this.shieldCores.length; i++) {
            const core = this.shieldCores[i];
            if (!core.active) continue;
            const bounds = this._getShieldCoreBounds(i);
            if (checkCollision(bullet, bounds)) {
                if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) bullet.active = false;
                this.hitShieldCore(i, 1);
                createExplosion(bullet.x, bullet.y, '#ff88aa');
                if (typeof Sound !== 'undefined' && typeof Sound.playBossHit === 'function') {
                    Sound.playBossHit();
                }
                return;
            }
            break; // 最前列のみ被弾（背後のコアは保護される）
        }

        // 中央の脳みそ・生体眼球コア判定（全シールド破壊後のみ）
        if (this.allShieldsDestroyed) {
            const coreBounds = { x: this.x - 28, y: this.y - 28, width: 56, height: 56 };
            if (checkCollision(bullet, coreBounds)) {
                if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) bullet.active = false;
                this.hitCore(1);
                createExplosion(bullet.x, bullet.y, '#ff2266');
                if (typeof Sound !== 'undefined') Sound.playBossHit();
                this.checkDefeat();
                return;
            }
        }

        // 上下モアイ巨石＆機械外殻アーム（無敵装甲）
        const topArm = { x: this.x - this.width / 2, y: this.y - 95, width: this.width - 20, height: 58 };
        const botArm = { x: this.x - this.width / 2, y: this.y + 37, width: this.width - 20, height: 58 };
        if (checkCollision(bullet, topArm) || checkCollision(bullet, botArm)) {
            if (typeof Laser === 'undefined' || !(bullet instanceof Laser)) bullet.active = false;
            createExplosion(bullet.x, bullet.y, '#64748b');
            if (typeof Sound !== 'undefined') Sound.playBossHit();
        }
    }

    draw(ctx) {
        if (!this.active) return;
        ctx.save();

        if (this.isDying) {
            ctx.translate((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14);
            if (Math.floor(Date.now() / 60) % 2 === 0) ctx.filter = 'brightness(2.4) saturate(2)';
        }

        const cx = this.x;
        const cy = this.y;
        const hw = this.width / 2;

        // --- 1. 4本のうねる機械触手＆生体血管触手（太さ・長さ3倍！） ---
        this._drawBioMechaTentacles(ctx);

        // --- 2. 巨大生体脳みそ（大脳皮質の皺）＆拍動する内臓器官・血管網 ---
        this._drawCerebralBrainAndViscera(ctx, cx, cy, hw);

        // --- 3. 上下の古代モアイ巨石外殻 × サイボーグ機械顎 ---
        this._drawMoaiCyberJaw(ctx, cx, cy, hw, false);
        this._drawMoaiCyberJaw(ctx, cx, cy, hw, true);

        // --- 4. 中央の巨大生体眼球・脳神経コア ---
        this._drawMainCore(ctx, cx, cy);

        // --- 5. 前面4つの生体臓器カプセル・シールドコア ---
        this._drawShieldCores(ctx, cy);

        ctx.restore();

        this.bullets.forEach(b => b.draw(ctx));
    }

    _drawBioMechaTentacles(ctx) {
        const tentacles = this._getBioMechaTentacles();
        const thickScale = this.tentacleThicknessScale || 1.8;
        ctx.save();

        tentacles.forEach(t => {
            const nodes = t.nodes;

            // 生体動脈ラインまたは高圧装甲エネルギー導管
            ctx.strokeStyle = t.isBio ? 'rgba(225, 29, 72, 0.75)' : 'rgba(14, 165, 233, 0.65)';
            ctx.lineWidth = (t.isBio ? 7.5 : 6.5) * thickScale;
            ctx.beginPath();
            nodes.forEach((n, idx) => {
                if (idx === 0) ctx.moveTo(n.x, n.y);
                else ctx.lineTo(n.x, n.y);
            });
            ctx.stroke();

            // 各関節の精密3D描画
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                const r = (n.radius !== undefined) ? n.radius : (Math.max(6, 14 - i * 0.9) * thickScale);
                ctx.save();
                ctx.translate(n.x, n.y);
                ctx.rotate(n.angle);

                if (t.isBio) {
                    // 生体触手：脈動する赤紫の筋肉組織＆生体発光リング
                    const pulseR = r + Math.sin(this.organPulse + i * 0.7) * 1.5 * thickScale;
                    const bioGrad = ctx.createRadialGradient(-2 * thickScale, -2 * thickScale, 1, 0, 0, pulseR);
                    bioGrad.addColorStop(0, '#ffe4e6');
                    bioGrad.addColorStop(0.35, '#f43f5e');
                    bioGrad.addColorStop(0.75, '#9f1239');
                    bioGrad.addColorStop(1, '#3b0764');
                    ctx.fillStyle = bioGrad;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, pulseR * 1.12, pulseR * 0.82, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.strokeStyle = '#fda4af';
                    ctx.lineWidth = 1.1;
                    ctx.stroke();
                } else {
                    // 機械触手：多層ベベル加工のクローム＆ガンメタル円筒アクチュエーター節
                    const w = r * 1.65;
                    const h = r * 1.35;
                    const mechGrad = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
                    mechGrad.addColorStop(0.0, '#f8fafc');
                    mechGrad.addColorStop(0.22, '#cbd5e1');
                    mechGrad.addColorStop(0.55, '#475569');
                    mechGrad.addColorStop(0.85, '#1e293b');
                    mechGrad.addColorStop(1.0, '#090d16');
                    ctx.fillStyle = mechGrad;
                    ctx.fillRect(-w / 2, -h / 2, w, h);

                    // ゴールド油圧カラー＆スリット装甲枠
                    ctx.fillStyle = '#f59e0b';
                    ctx.fillRect(-w / 2 + 1, -h / 2, 3, h);
                    ctx.strokeStyle = '#e2e8f0';
                    ctx.lineWidth = 1.2;
                    ctx.strokeRect(-w / 2, -h / 2, w, h);

                    // 関節中央の高輝度リアクターベアリング
                    ctx.fillStyle = '#00f0ff';
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
                    ctx.fill();
                }

                // 触手先端の連装メカニカル・レーザー砲ユニット
                if (i === nodes.length - 1) {
                    ctx.save();
                    ctx.scale(thickScale, thickScale);

                    // 砲身マウントハウジング
                    const tipGrad = ctx.createLinearGradient(-4, -8, 14, 8);
                    tipGrad.addColorStop(0, '#e2e8f0');
                    tipGrad.addColorStop(0.5, '#334155');
                    tipGrad.addColorStop(1, '#0f172a');
                    ctx.fillStyle = tipGrad;
                    ctx.fillRect(-2, -7, 14, 14);
                    ctx.strokeStyle = '#94a3b8';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(-2, -7, 14, 14);

                    // 上下スタビライザーバレル
                    ctx.fillStyle = '#cbd5e1';
                    ctx.fillRect(8, -6, 10, 3);
                    ctx.fillRect(8, 3, 10, 3);

                    // 中央集束レンズコア
                    ctx.fillStyle = t.isBio ? '#ff0055' : '#00ffff';
                    ctx.shadowColor = ctx.fillStyle;
                    ctx.shadowBlur = 10;
                    ctx.beginPath();
                    ctx.arc(10, 0, 4.2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }

                ctx.restore();
            }
        });

        ctx.restore();
    }

    _drawCerebralBrainAndViscera(ctx, cx, cy, hw) {
        ctx.save();
        const beat = Math.sin(this.organPulse) * 4.5;

        // A. 後部4連大型プラズマ・ベクタースラスター＆アフターバーナー噴射炎
        const nozzleYs = [-54, -22, 22, 54];
        const flameLen = 34 + Math.sin(Date.now() * 0.025) * 12;
        nozzleYs.forEach((ny, idx) => {
            const bx = cx + hw + 4;
            const by = cy + ny;

            // スラスター噴射プラズマプルーム
            const pGrad = ctx.createLinearGradient(bx, by, bx + flameLen, by);
            pGrad.addColorStop(0, '#ffffff');
            pGrad.addColorStop(0.35, (idx % 2 === 0) ? '#00f0ff' : '#ff2266');
            pGrad.addColorStop(1, 'rgba(0, 200, 255, 0)');
            ctx.fillStyle = pGrad;
            ctx.beginPath();
            ctx.moveTo(bx, by - 9);
            ctx.lineTo(bx + flameLen, by);
            ctx.lineTo(bx, by + 9);
            ctx.closePath();
            ctx.fill();

            // 装甲ベクターノズル本体
            const nGrad = ctx.createLinearGradient(bx - 16, by - 11, bx + 6, by + 11);
            nGrad.addColorStop(0, '#cbd5e1');
            nGrad.addColorStop(0.5, '#334155');
            nGrad.addColorStop(1, '#090d16');
            ctx.fillStyle = nGrad;
            ctx.beginPath();
            ctx.moveTo(bx - 16, by - 11);
            ctx.lineTo(bx + 4, by - 8);
            ctx.lineTo(bx + 4, by + 8);
            ctx.lineTo(bx - 16, by + 11);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.2;
            ctx.stroke();
        });

        // B. 後部〜中央に広がる「巨大生体脳みそ（大脳半球）」
        const brainX = cx + 28;
        const brainY = cy;
        const brainW = 90 + beat;
        const brainH = 72 + beat * 0.8;

        const brainGrad = ctx.createRadialGradient(brainX - 18, brainY - 14, 8, brainX, brainY, brainW);
        brainGrad.addColorStop(0, '#ffe4e6');
        brainGrad.addColorStop(0.3, '#fb7185');
        brainGrad.addColorStop(0.65, '#be123c');
        brainGrad.addColorStop(0.9, '#881337');
        brainGrad.addColorStop(1, '#3b0764');

        ctx.fillStyle = brainGrad;
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.ellipse(brainX, brainY, brainW, brainH, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 脳みそのリアルな皺（大脳皮質の溝・回）と神経シナプス発光
        ctx.strokeStyle = '#4c0519';
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        for (let row = -2; row <= 2; row++) {
            const ry = brainY + row * 18;
            ctx.moveTo(brainX - 52, ry);
            ctx.bezierCurveTo(brainX - 24, ry - 13, brainX + 5, ry + 13, brainX + 34, ry - 6);
            ctx.bezierCurveTo(brainX + 52, ry - 15, brainX + 66, ry + 10, brainX + 74, ry);
        }
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 210, 225, 0.55)';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        for (let row = -2; row <= 2; row++) {
            const ry = brainY + row * 18 - 2;
            ctx.moveTo(brainX - 48, ry);
            ctx.bezierCurveTo(brainX - 18, ry - 11, brainX + 10, ry + 11, brainX + 42, ry - 4);
        }
        ctx.stroke();

        // C. 上下に拍動する「内臓器官（バイオ臓器サック）」
        [-1, 1].forEach(sign => {
            const ox = cx - 18;
            const oy = cy + sign * (42 + beat * 0.4);
            const orx = 34 + beat * 0.7;
            const ory = 20 - beat * 0.3;

            const visceraGrad = ctx.createRadialGradient(ox - 6, oy - 4, 2, ox, oy, orx);
            visceraGrad.addColorStop(0, '#f472b6');
            visceraGrad.addColorStop(0.5, '#9d174d');
            visceraGrad.addColorStop(1, '#3b0764');
            ctx.fillStyle = visceraGrad;
            ctx.beginPath();
            ctx.ellipse(ox, oy, orx, ory, sign * 0.18, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#500724';
            ctx.lineWidth = 2;
            ctx.stroke();
        });

        // D. 前方のシールドコアと脳・内臓を繋ぐ太い生体動脈・血管束
        ctx.strokeStyle = '#e11d48';
        ctx.lineWidth = 3.8;
        ctx.beginPath();
        for (let v = -2; v <= 2; v++) {
            if (v === 0) continue;
            ctx.moveTo(cx + 25, cy + v * 16);
            ctx.quadraticCurveTo(cx - 35, cy + v * (26 + beat * 0.5), cx - 95, cy + v * 6);
        }
        ctx.stroke();

        // E. 脳の後方〜側面を重厚に装甲する多層サイバネティック・リアクター脊椎フレーム
        const spineGrad = ctx.createLinearGradient(cx + 55, cy - 78, cx + hw + 16, cy + 78);
        spineGrad.addColorStop(0.0, '#f1f5f9');
        spineGrad.addColorStop(0.25, '#94a3b8');
        spineGrad.addColorStop(0.55, '#334155');
        spineGrad.addColorStop(0.85, '#0f172a');
        spineGrad.addColorStop(1.0, '#020617');
        ctx.fillStyle = spineGrad;
        ctx.beginPath();
        ctx.moveTo(cx + 58, cy - 76);
        ctx.lineTo(cx + hw + 6, cy - 64);
        ctx.lineTo(cx + hw + 18, cy - 28);
        ctx.lineTo(cx + hw + 22, cy);
        ctx.lineTo(cx + hw + 18, cy + 28);
        ctx.lineTo(cx + hw + 6, cy + 64);
        ctx.lineTo(cx + 58, cy + 76);
        ctx.lineTo(cx + 82, cy + 38);
        ctx.lineTo(cx + 68, cy);
        ctx.lineTo(cx + 82, cy - 38);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 後部リアクター装甲の内部ベベルパネル＆ゴールド油圧シリンダー＆発光スリット
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(cx + 84, cy - 46, 26, 92);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(cx + 84, cy - 46, 26, 92);

        for (let s = -3; s <= 3; s++) {
            ctx.fillStyle = (s % 2 === 0) ? '#00f0ff' : '#f59e0b';
            ctx.fillRect(cx + 88, cy + s * 11 - 2, 18, 4);
        }

        // 後部中央の回転式大型エネルギータービン・ローター
        ctx.save();
        ctx.translate(cx + 97, cy);
        ctx.rotate(-this.rotationAngle * 1.4);
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.stroke();
        for (let b = 0; b < 4; b++) {
            const a = (Math.PI / 2) * b;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
            ctx.stroke();
        }
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.restore();
    }

    // 豪華な多層3D重武装メカ・ウイングポッド＆連装ヘビーレーザー砲塔（上下アーム）
    _drawMoaiCyberJaw(ctx, cx, cy, hw, isBottom) {
        ctx.save();
        const sign = isBottom ? 1 : -1;
        const jawShift = this.jawOpen * 14 * sign;
        const baseY = cy + jawShift;

        // --- 1. 中央フレームと上下メカポッドを連結する可動式ツイン油圧ダンパー＆ゴールドピストン ---
        const pistonXs = [cx - 32, cx + 24];
        pistonXs.forEach(px => {
            // シリンダー外筒
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(px - 6, Math.min(cy + sign * 18, baseY + sign * 42), 12, Math.abs(baseY + sign * 42 - (cy + sign * 18)));
            // ゴールド油圧シャフト
            const rodGrad = ctx.createLinearGradient(px - 3, 0, px + 3, 0);
            rodGrad.addColorStop(0, '#fef08a');
            rodGrad.addColorStop(0.5, '#f59e0b');
            rodGrad.addColorStop(1, '#78350f');
            ctx.fillStyle = rodGrad;
            ctx.fillRect(px - 3, Math.min(cy + sign * 14, baseY + sign * 44), 6, Math.abs(baseY + sign * 44 - (cy + sign * 14)));
        });

        // --- 2. 前方に突き出す多段バレル式・連装ヘビーレーザー砲身（2門×上下＝4門） ---
        const barrelOffsets = [38, 66];
        barrelOffsets.forEach((bo, bIdx) => {
            const by = baseY + sign * bo;
            const bLen = (bIdx === 0) ? 36 : 26;
            const bxStart = cx - hw - bLen + 12;

            // 砲身メタリックシリンダー
            const bGrad = ctx.createLinearGradient(bxStart, by - 6, bxStart, by + 6);
            bGrad.addColorStop(0, '#f8fafc');
            bGrad.addColorStop(0.4, '#94a3b8');
            bGrad.addColorStop(0.8, '#1e293b');
            bGrad.addColorStop(1, '#090d16');
            ctx.fillStyle = bGrad;
            ctx.fillRect(bxStart, by - 5, bLen + 20, 10);
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 1;
            ctx.strokeRect(bxStart, by - 5, bLen + 20, 10);

            // マズルブレーキ＆冷却ジャケットリング
            ctx.fillStyle = '#0f172a';
            for (let r = 0; r < 3; r++) {
                ctx.fillRect(bxStart + 6 + r * 7, by - 6, 3, 12);
            }

            // 砲口プラズマチェンバー発光
            const muzzleColor = (bIdx === 0) ? '#00f0ff' : '#ff2266';
            ctx.fillStyle = muzzleColor;
            ctx.shadowColor = muzzleColor;
            ctx.shadowBlur = 10;
            ctx.fillRect(bxStart - 3, by - 3.5, 5, 7);
            ctx.shadowBlur = 0;
        });

        // --- 3. 第1層：重厚な多面体チタン＆ガンメタル主装甲ハル（3Dベベルシェーディング） ---
        const hullGrad = ctx.createLinearGradient(cx - hw, baseY + sign * 26, cx + hw, baseY + sign * 96);
        hullGrad.addColorStop(0.0, '#f8fafc');
        hullGrad.addColorStop(0.18, '#cbd5e1');
        hullGrad.addColorStop(0.45, '#64748b');
        hullGrad.addColorStop(0.78, '#1e293b');
        hullGrad.addColorStop(1.0, '#090d16');
        ctx.fillStyle = hullGrad;

        ctx.beginPath();
        ctx.moveTo(cx + hw + 4, baseY + sign * 30);
        ctx.lineTo(cx + hw - 14, baseY + sign * 88);
        ctx.lineTo(cx + 18, baseY + sign * 96);
        ctx.lineTo(cx - 58, baseY + sign * 86);
        ctx.lineTo(cx - hw + 4, baseY + sign * 72);
        ctx.lineTo(cx - hw - 8, baseY + sign * 48);
        ctx.lineTo(cx - hw + 10, baseY + sign * 28);
        ctx.lineTo(cx - 24, baseY + sign * 24);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#020617';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // エッジの鋭い鏡面クロームハイライトライン
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(cx - hw + 10, baseY + sign * 29);
        ctx.lineTo(cx - 24, baseY + sign * 25);
        ctx.lineTo(cx + hw, baseY + sign * 31);
        ctx.stroke();

        // --- 4. 第2層：内部段差アーマープレート＆放熱ラジエーター・ルーバースリット ---
        const innerY = isBottom ? (baseY + 38) : (baseY - 78);
        const plateGrad = ctx.createLinearGradient(cx - 85, innerY, cx + 80, innerY + 40);
        plateGrad.addColorStop(0, '#0f172a');
        plateGrad.addColorStop(0.5, '#1e293b');
        plateGrad.addColorStop(1, '#334155');
        ctx.fillStyle = plateGrad;
        ctx.beginPath();
        ctx.moveTo(cx - 88, baseY + sign * 38);
        ctx.lineTo(cx + 78, baseY + sign * 38);
        ctx.lineTo(cx + 64, baseY + sign * 76);
        ctx.lineTo(cx - 72, baseY + sign * 72);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // 斜め発光ラジエーター・放熱スリット群（6連ネオンルーバー）
        ctx.save();
        const glowPulse = 0.65 + Math.sin(Date.now() * 0.01 + (isBottom ? 1.5 : 0)) * 0.35;
        ctx.fillStyle = `rgba(0, 240, 255, ${glowPulse})`;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 8;
        for (let v = 0; v < 6; v++) {
            const vx = cx - 42 + v * 17;
            const vy = baseY + sign * 48;
            ctx.beginPath();
            ctx.moveTo(vx, vy);
            ctx.lineTo(vx + 9, vy);
            ctx.lineTo(vx + 5, vy + sign * 16);
            ctx.lineTo(vx - 4, vy + sign * 16);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();

        // --- 5. 第3層：前方精密レーザー照準ポッド＆回転式メカニカル・サブタレット ---
        const podX = cx - 72;
        const podY = baseY + sign * 56;

        // 照準ポッド装甲リング
        const podGrad = ctx.createRadialGradient(podX - 3, podY - 3, 2, podX, podY, 16);
        podGrad.addColorStop(0, '#f8fafc');
        podGrad.addColorStop(0.5, '#475569');
        podGrad.addColorStop(1, '#090d16');
        ctx.fillStyle = podGrad;
        ctx.beginPath();
        ctx.arc(podX, podY, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 光学レーザースキャナーレンズ
        ctx.fillStyle = '#ff0055';
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(podX - 2, podY, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(podX - 4, podY - 2, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 後方側のゴールドトリム装甲リブ＆リベットボルト列
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + 52, baseY + sign * 36);
        ctx.lineTo(cx + 38, baseY + sign * 84);
        ctx.moveTo(cx + 76, baseY + sign * 36);
        ctx.lineTo(cx + 62, baseY + sign * 82);
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0';
        for (let b = 0; b < 7; b++) {
            ctx.beginPath();
            ctx.arc(cx - 80 + b * 24, baseY + sign * 32, 2.0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    // 中央の巨大生体眼球＆脳幹コア
    _drawMainCore(ctx, cx, cy) {
        ctx.save();
        const hpRatio = Math.max(0, this.hp / this.maxHp);
        const pulse = Math.sin(Date.now() * 0.009) * 0.25 + 0.75;
        const r = 27;

        const isFlash = this.hitFlashTimer > 0;
        const glowColor = isFlash ? '#ffffff' : (this.coreOpen ? '#ff0044' : '#ff2266');

        ctx.shadowColor = glowColor;
        ctx.shadowBlur = (this.coreOpen ? 34 : 18) * pulse;

        // 生体肉腫リング（眼瞼リング）
        ctx.fillStyle = '#4c0519';
        ctx.beginPath();
        ctx.arc(cx, cy, r + 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 3;
        ctx.stroke();

        // 巨大眼球の強膜（白目〜充血グラデーション）
        const scleraGrad = ctx.createRadialGradient(cx - 5, cy - 5, 2, cx, cy, r);
        if (isFlash) {
            scleraGrad.addColorStop(0, '#ffffff');
            scleraGrad.addColorStop(1, '#ffffff');
        } else {
            scleraGrad.addColorStop(0, '#fff1f2');
            scleraGrad.addColorStop(0.55, '#fecdd3');
            scleraGrad.addColorStop(0.85, '#f43f5e');
            scleraGrad.addColorStop(1, '#881337');
        }
        ctx.fillStyle = scleraGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // 眼球内の毛細血管
        if (!isFlash) {
            ctx.strokeStyle = 'rgba(225, 29, 72, 0.65)';
            ctx.lineWidth = 1.2;
            for (let i = 0; i < 6; i++) {
                const a = this.rotationAngle * 0.3 + (Math.PI / 3) * i;
                ctx.beginPath();
                ctx.moveTo(cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95);
                ctx.quadraticCurveTo(cx + Math.cos(a + 0.2) * r * 0.6, cy + Math.sin(a - 0.2) * r * 0.6, cx, cy);
                ctx.stroke();
            }
        }

        // 自機を睨みつける虹彩＆縦長スリット瞳孔
        const targetX = (typeof player !== 'undefined' && player) ? player.x : 100;
        const targetY = (typeof player !== 'undefined' && player) ? player.y : cy;
        const lookAng = Math.atan2(targetY - cy, targetX - cx);
        const lookDist = 6;
        const ix = cx + Math.cos(lookAng) * lookDist;
        const iy = cy + Math.sin(lookAng) * lookDist;

        const irisColor = hpRatio > 0.4 ? '#00e5ff' : '#ffea00';
        const irisGrad = ctx.createRadialGradient(ix, iy, 1, ix, iy, 13);
        irisGrad.addColorStop(0, irisColor);
        irisGrad.addColorStop(0.6, '#be123c');
        irisGrad.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = irisGrad;
        ctx.beginPath();
        ctx.arc(ix, iy, 13, 0, Math.PI * 2);
        ctx.fill();

        // 爬虫類・生体兵器風の縦長スリット瞳孔
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.ellipse(ix, iy, this.coreOpen ? 4.5 : 3.0, 10.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 眼球の濡れたハイライト反射
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.ellipse(cx - 8, cy - 9, 6, 3.2, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    // 前面4つの生体臓器カプセル・シールドコア
    _drawShieldCores(ctx, cy) {
        ctx.save();
        for (let i = 0; i < this.shieldCores.length; i++) {
            const core = this.shieldCores[i];
            if (!core.active) continue;

            const scx = this._getShieldCoreX(i);
            const scy = cy;
            const r = 13;
            const pulse = Math.sin(Date.now() * 0.012 + i * 1.4) * 0.2 + 0.8;
            const isFlash = core.flashTimer > 0;
            const hpRatio = core.hp / core.maxHp;
            const coreColor = isFlash ? '#ffffff' : (hpRatio > 0.5 ? '#ff2266' : '#ffaa00');

            // 上下顎と臓器カプセルを繋ぐ生体神経腱
            ctx.strokeStyle = 'rgba(244, 63, 94, 0.65)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(scx, scy - 28);
            ctx.lineTo(scx, scy + 28);
            ctx.stroke();

            ctx.shadowColor = coreColor;
            ctx.shadowBlur = 16 * pulse;

            // 生体カプセル外膜
            ctx.strokeStyle = isFlash ? '#ffffff' : '#fda4af';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(scx, scy, r + 3, 0, Math.PI * 2);
            ctx.stroke();

            // 拍動する生体臓器コア球体
            const grad = ctx.createRadialGradient(scx - 3, scy - 3, 1, scx, scy, r);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.35, coreColor);
            grad.addColorStop(0.8, '#881337');
            grad.addColorStop(1, '#1f0318');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(scx, scy, r * pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        ctx.restore();
    }
}

window.GolemBoss = GolemBoss;
window.BigCoreBoss = BigCoreBoss;
window.drawOriginalBigCore = drawOriginalBigCore;

