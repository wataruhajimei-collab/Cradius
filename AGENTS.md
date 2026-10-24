# プロジェクト指示 (AGENTS.md)

## このプロジェクト

1985年アーケード版「グラディウス」の忠実な再現を目指す、スマホ向け横スクロールシューティング。

- リポジトリ: `wataruhajimei-collab/Cradius`（GitHub）
- 公開: Cloudflare（`main` へ push すると自動デプロイ）
- プレイヤーはスマホの友人が中心。タッチ操作と縦画面レイアウトを最優先する

## 行動方針

- **質問・選択肢提示の禁止**
  - 実装方針や細かい仕様に迷っても、ユーザーに問いかけず、本家アーケード版（1985年グラディウス）の仕様とベストプラクティスに基づいて最適解を自分で判断し、そのまま実装する。
  - 例外は「破壊的で取り返しがつかない操作」のみ（下記「公開」を参照）。
- **迅速な直接実行**
  - 指示を受けたら確認フェーズを挟まず、調査 → コード編集 → 検証まで一気に完了させる。
  - 報告は簡潔に。何を変えたか、どう確認したか、残課題だけを書く。

## 技術構成

- **ビルド不要**。Node.js / npm / バンドラは一切使わない。素の HTML + CSS + JavaScript。
- `index.html` が `js/*.js` を**この順番で**読み込む。各ファイルはグローバルスコープで連携しているため、
  - script タグの順番を変えない
  - 読み込みを `type="module"` に変えない（`import`/`export` は使えない）
  - 依存関係のあるファイルを削除・統合しない
- **キャッシュバスター**: `?v=12.1`（JS）、`style.css?v=5.3`（CSS）。ファイルを変更したら該当する数字を上げること。上げ忘れるとスマホで古いコードが動く。
- `fetch()` / `XMLHttpRequest` は未使用。よって `file://` で直接開いても動作確認できる。
- 画像は `img/` と `assets/`、効果音・BGM は `js/sound.js` 内で管理。

### ファイル構成

| ファイル | 役割 |
| --- | --- |
| `js/main.js` | メインループ、ステージ進行 |
| `js/player.js` | 自機（ビックバイパー）、パワーアップ |
| `js/enemy.js` | 雑魚敵（Fan 等） |
| `js/boss.js` | ボス |
| `js/level.js` | ステージ構成 |
| `js/stage3.js` / `js/stage4.js` | 個別ステージ |
| `js/stonehenge.js` | ストーンヘンジ |
| `js/particle.js` | パーティクル演出 |
| `js/sound.js` | 効果音・BGM（Web Audio） |
| `js/input.js` | キーボード / タッチ入力 |
| `js/ui.js` | HUD |

## 検証（変更したら必ず実行）

1. **読み込み・構文チェック**（ヘッドレス Edge で全 JS を読み込ませる）

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\scratch\run_syntax.ps1
   ```

   正常時は 16 ファイルすべてが `LOADED` になり、`ERROR` が 0 件になる。

   > `scratch/check_syntax.html` は `index.html` と同じ 16 本の JS を検証対象にしている。
   > `index.html` の script タグを増減したら、このファイルも同じ構成に更新すること。

2. **目視確認**: `index.html` をブラウザ（Edge / Chrome）で開く。`file://` のままで動く。
3. 機能別の検証ページ: `test_*.html`（例: `test_laser.html`, `test_bgm.html`）。該当機能を触ったらこれも開く。

> スクリプト実行ポリシーが Restricted のため、`.\script.ps1` の直接実行は失敗する。
> 必ず `powershell -NoProfile -ExecutionPolicy Bypass -File <script>` の形で呼ぶこと。

## 公開（本番デプロイ）

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\push.ps1 "変更内容の要約"
```

- `push.ps1` は `git add -A` → commit → `git push origin main` を行う。**push した瞬間に友人のスマホへ反映される。**
- そのため **push はユーザーが明示的に指示したときだけ実行する**。編集・検証・ローカル commit までは自動でよい。
- `scratch/` と `*.txt` は `.gitignore` 済み。検証用の一時ファイルは `scratch/` に置くこと。
- `_headers` でキャッシュ無効化を指定済み。

## 注意事項

- `.git/config` に GitHub トークンが平文で入っている。**この値をログ・コミット・報告に含めない。**
- プロジェクトが OneDrive 配下にある。`node_modules` や大量の生成物を置かない。
- `index.html` の script タグを増減したら、`scratch/check_syntax.html` も同じ構成に更新する。
