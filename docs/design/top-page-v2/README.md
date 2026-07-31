# Handoff: トップページ改修（otamochi portfolio）

## Overview
otamochi（大橋僚太）のポートフォリオサイト トップページの全面改修。Claude Design 上で作った `Top Page v2.dc.html` を、既存の Astro サイト（otamochi84/portfolio）に実装する。

参考にしている構成の考え方は **ヨシダナギ公式サイト（nagi-yoshida.com）**。写真だけが「面」を持ち、テキストは一切囲まずに静かに置く。罫線・塗り・連番といった装飾を足さないことが要件。

## About the Design Files
同梱の `Top Page v2.dc.html` は **デザインリファレンス**であり、そのまま本番に載せるコードではない。既存の Astro プロジェクト（`src/pages/index.astro` + `public/css/style.css`）の書き方に合わせて再現すること。

## Fidelity
**High-fidelity。** 色・タイポグラフィ・余白はすべて確定値。ピクセル単位で再現してよい。ただし画像素材は未確定（後述）。

## セクション構成（変更後）

```
Intro（ロード画面） → Nav（固定） → Hero → About → Journal → Works → Service → Contact（コピーライトのみ）
```

旧構成からの変更点:
- Hero から肩書き・英語タグライン・名前表示をすべて削除し、キービジュアル1枚に
- About を新設（プロフィール＋Background）
- Journal を About の下に移動（更新頻度が高いため上位に）
- Notion の説明文を Works の後ろの独立セクション「Service」に
- Contact セクションはコピーライト1行のみに縮小（リンクは Nav のアイコンへ集約）
- セクション連番（01〜05）は不採用

## 1. Intro（ロード画面）

屋号だけを見せる導入。写真とは干渉させない。

- 全画面 `position: fixed; inset: 0; z-index: 200`、背景 `#f8f8f8`
- 中央に「otamochi」: Comfortaa 700 / `clamp(2.2rem, 7vw, 6rem)` / `#111` / `line-height: 1`
- その下 `gap: 1.75rem` に細い横罫: `width: min(30vw, 260px)`、`height: 1px`、`background: #b3592f`、`transform-origin: center`
- アニメーション（全 2.5s、`cubic-bezier(0.19,1,0.22,1)`）:
  - 文字: `opacity 0→1`、`letter-spacing 0.44em→0.02em`、同時に `padding-left 0.44em→0.02em`（中心を保つため必須）。46% で完了
  - 罫線: `scaleX(0)→scaleX(1)`、10%〜58%
  - パネル: 68% まで静止 → `translateY(-101%)` で上へ抜ける → 100% で `visibility: hidden`

## 2. Nav（固定ヘッダー）

- `position: fixed`、右寄せ、`padding: 1.5rem 3rem`、`gap: 1.75rem`
- 背景 `rgba(248,248,248,0.88)` + `backdrop-filter: blur(10px)`（本文と重なるため必須）
- 構成は3ブロック、間に縦罫（`width: 1px; height: 14px; background: #e5e7eb`）:
  1. アンカーリンク: About / Journal / Works / Service — `0.7rem` / 500 / `letter-spacing: 0.24em` / uppercase / `#6b7280`、hover `#111`
  2. 公式アイコン2つ（`gap: 1.1rem`、`#6b7280`、hover `#111`）:
     - Notion（19×19、Templatesへ: https://www.notion.com/ja/@otamochi）
     - X（17×17、https://x.com/Otamochi84）
     - ※ SVG パスは `Top Page v2.dc.html` からそのまま流用（公式グリフ）
  3. Contact ボタン: 背景 `#f7e7de` / 文字 `#b3592f` / `padding: 0.55em 1.4em` / `border-radius: 10px` / `0.9rem` / 600、hover 背景 `#f0dccf`
     - リンク先: https://otamochi.notion.site/154df30866d3805ab4a2ca7eae98e150?pvs=105
- 全 `section[id]` に `scroll-margin-top: 92px`、`html { scroll-behavior: smooth }`

## 3. Hero

- `min-height: 100vh`、`display: flex`、上下左右中央、`padding: 8rem 3rem 6rem`
- **キービジュアル**: `width: min(62vw, 880px, 86vh)`、`aspect-ratio: 16 / 9`、背景 `#e5e7eb`
  - 画像は未確定（奈良・大淀／吉野の風景、山椒・梨などの植物を予定）。プレースホルダで実装可
  - **くすみフィルターを常時適用**（どの写真でもサイト world view に揃える）:
    - `filter: saturate(0.78) contrast(0.94) sepia(0.1) brightness(1.02)`
    - さらに `::after` で `background: #b3592f; opacity: 0.07; mix-blend-mode: multiply`
- **Welcome!**: 画像の左外、`position: absolute; left: 3rem; top: 50%`
  - Quicksand 700 / `1.25rem` / `letter-spacing: 0.12em` / `#b3592f` / `writing-mode: vertical-rl`
  - 下に縦罫: `width: 1px; height: 4.5rem; background: #d8d3cf`（`gap: 1.5rem`）
- 名前・SCROLL・屋号の透かしは **置かない**

## 4. About

背景 `#fff`、`padding: 8rem 96px`。

**見出し行**（全セクション共通パターン）: 左に `h2` `1.6rem` / 500 / `letter-spacing: 0.3em` / uppercase / `#111`、右に `flex: 1` の横罫 `1px #e5e7eb`、`gap: 2rem`、下 `margin-bottom: 4.5rem`

**本体グリッド**:
```css
display: grid;
grid-template-columns: minmax(300px, 1fr) minmax(0, 1.5fr); /* 左テキスト : 右写真 */
gap: 3.5rem;
align-items: stretch;
min-height: 570px;
width: min(78vw, 1150px);
max-width: 100%;
margin: 0 auto;
```

### 左カラム（`display: flex; flex-direction: column; height: 100%`）

**名前行**（`display: flex; align-items: baseline; gap: 1.1em; margin-bottom: 3rem`）:
- 「Ryota Ohashi」: `1.5rem` / 500 / `letter-spacing: 0.12em` / `#111` / `white-space: nowrap` / `flex-shrink: 0`
- 横罫（境界）: `flex: 1 1 0; min-width: 2rem; height: 1px; background: #e5e7eb`
- 「otamochi」: Comfortaa 700 / `0.95rem` / `letter-spacing: 0.06em` / `#9ca3af` / `nowrap` / `flex-shrink: 0`

**日本語プロフィール** — Zen Old Mincho 400 / `0.8rem` / `line-height: 1.95` / `letter-spacing: 0.15em` / `#555`
改行位置は下記のとおり固定（`<br>`）:
```
1994年生まれ
奈良県吉野郡大淀町出身
大学では果樹の香りを研究し
化粧品メーカーで研究開発へ
その後　中小企業のアトツギ支援を経て
2024年に独立
2025年　結婚を機に奈良へUターン
現在は香芝市を拠点に活動
```

**伸縮スペーサー**: `<div style="flex: 1; min-height: 2.5rem"></div>`
→ 英文の下端が右カラムの下端と揃うために必要。

**英語プロフィール** — EB Garamond 400 / `0.8rem` / `line-height: 1.95` / **`letter-spacing: 0.06em`** / `#6b7280`
※ 欧文に `0.15em` を当てると行長が3割伸びて手置き改行が崩れる。必ず `0.06em`。
```
Born in 1994
in Oyodo, Nara Prefecture.
Researched the aroma of fruit trees at university,
then joined a cosmetics manufacturer in R&D.
Later supported successors of family-run businesses,
and became independent in 2024.
Returned to Nara in 2025 after marrying,
and now works from Kashiba.
```

### 右カラム（`display: flex; flex-direction: column; height: 100%`）

**スナップ写真**: `flex: 1; min-height: 0`（比率固定しない）、背景 `#e5e7eb`、`margin-bottom: 1.5rem`
→ 左カラムの高さから余りを吸収するので左右の下端が構造的に一致する。**`aspect-ratio` を付けると崩れる。**
写真素材は未確定。

**Background ブロック**（`flex-shrink: 0`）— 装飾なし、塗りなし、罫線なし:
- 見出し「Background」: Comfortaa 700 / `0.62rem` / `letter-spacing: 0.24em` / **`#b3592f`**
- 各行（`gap: 0.4rem`、`margin-top: 0.7rem`）: `grid-template-columns: 2.4rem 1fr; gap: 0.7rem; align-items: baseline`
  - 年: `0.62rem` / 400 / `letter-spacing: 0.06em` / `#9ca3af` / `font-variant-numeric: tabular-nums`
  - 和文: Zen Old Mincho / `0.65rem` / `line-height: 1.5` / `letter-spacing: 0.06em` / `#6b7280`
  - 欧文: EB Garamond / `0.64rem` / `line-height: 1.5` / `letter-spacing: 0.03em` / `#9ca3af`

| 年 | 和文 | 欧文 |
|---|---|---|
| 2013 | 奈良県立畝傍高等学校 卒業 | Graduated from Unebi High School, Nara |
| 2018 | 神戸大学農学部 卒業 | B.Agr., Faculty of Agriculture, Kobe University |
| 2020 | 神戸大学大学院農学研究科 修了 | M.Agr., Graduate School of Agricultural Science, Kobe University |

※ 英語だけを読んでも学歴が完結するよう機関名・学位を省略しない。

## 5. Journal

背景 `#f8f8f8`、`padding: 8rem 96px`。見出しは共通パターン。

- コンテナ: `max-width: 900px; margin: 0`（左寄せ）
- 各行: `grid-template-columns: 130px 1fr auto; gap: 2rem; padding: 1.75rem 0; border-bottom: 1px solid #e5e7eb`
  - 日付: `0.7rem` / 500 / `letter-spacing: 0.16em` / `#6b7280` / `tabular-nums`
  - タイトル: Noto Sans JP / `0.9rem` / 400 / `#111`、hover で `translateX(10px)`（0.5s）
  - 「READ ↗」: `0.65rem` / `letter-spacing: 0.2em` / `#b3592f`、通常 `opacity: 0` → hover で 1（0.4s）
- 「View all」: `0.7rem` / 500 / `letter-spacing: 0.28em` / uppercase、`border-bottom: 1px solid #111`、hover でテラコッタ
- データソースは既存の Notion データベース連携を継続

## 6. Works

背景 `#fff`、`padding: 8rem 96px`。見出しは共通パターン。

- `grid-template-columns: repeat(3, 1fr); gap: 2rem`
- 各カード: `aspect-ratio: 1 / 1`、背景 `#e5e7eb`、`overflow: hidden`、`cursor: pointer`
  - `role="button" tabindex="0"` + `aria-label`、Enter / Space で click 発火
  - hover: `outline: 2px solid #b3592f; outline-offset: 3px`、画像が `scale(1.05)`（1.5s `cubic-bezier(0.19,1,0.22,1)`）
  - オーバーレイ: `rgba(0,0,0,0.3)`、中央に「VIEW」（`0.75rem` / `letter-spacing: 0.3em` / 300 / 白 / `border: 1px solid rgba(255,255,255,0.5)` / `padding: 0.5rem 1rem` / `backdrop-filter: blur(2px)`）、`opacity 0→1`（0.5s）
- 現在は Notion 画像2枚 + 空枠1。**カードを画像ではなく色面＋テキストにする案が検討中**（未決定、実装前に確認）

## 7. Service

背景 `#f8f8f8`、`padding: 8rem 96px 5rem`。見出しは共通パターン（表記は「Service」）。

- 外枠 `width: min(74vw, 1120px); margin: 0 auto`、内側 `max-width: 34rem`（単一カラム）
- 日本語5段落 → 英語2段落の縦積み。書式は About と同一（和文 Zen Old Mincho `0.8rem`/`1.95`/`0.15em`/`#555`、欧文 EB Garamond `0.8rem`/`1.95`/`0.06em`/`#6b7280`）
- 「まずはお気軽にご相談ください。」のみ `#111`（ボールドにはしない）
- 英語は `margin-top: 3rem` で日本語群から離す
- **文言・改行位置は `Top Page v2.dc.html` から一字一句そのまま。書き換え不可。**

## 8. Contact

背景 `#f8f8f8`、`padding: 0 96px 2.5rem`。見出し・リンク・罫線なし。
- 「© 2026 otamochi」: `10px` / `#6b7280` / uppercase / `letter-spacing: 0.1em`

## Design Tokens

### Colors
| 用途 | 値 |
|---|---|
| ベース背景 | `#f8f8f8` |
| セクション背景（交互） | `#fff` |
| 本文・見出し | `#111` |
| 本文グレー | `#555` |
| 補助グレー | `#6b7280` |
| 最薄グレー | `#9ca3af` |
| 罫線 | `#e5e7eb` |
| 縦罫（Hero） | `#d8d3cf` |
| テラコッタ（文字） | `#b3592f` |
| テラコッタ（面） | `#f7e7de` |
| テラコッタ（hover面） | `#f0dccf` |
| プレースホルダ背景 | `#e5e7eb` |

※ 背景は `#f8f8f8` と `#fff` の交互のみ。**黒背景は使わない**（黒は文字色としてのみ）。

### Typography
| 役割 | フォント |
|---|---|
| 屋号（Intro / About） | **Comfortaa 700** |
| Welcome! | Quicksand 700 |
| セクション見出し・ナビ・数値 | Jost（`Futura` フォールバック先） |
| 和文本文 | **Zen Old Mincho 400** |
| 欧文本文 | **EB Garamond 400** |
| Journal タイトル | Noto Sans JP 400 |

Google Fonts:
```html
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@300;400;500;600;700;800&family=Noto+Sans+JP:wght@300;400;500;700&family=Quicksand:wght@500;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@700&family=Zen+Old+Mincho:wght@400&family=EB+Garamond:wght@400&display=swap" rel="stylesheet">
```
body: `font-family: 'Futura', 'Jost', 'Noto Sans JP', sans-serif`

### Spacing
- セクション padding: `8rem 96px`
- 見出し下: `4.5rem`
- 見出し行の gap: `2rem`
- About カラム gap: `3.5rem`
- 段落間: `2rem`（本文）/ `3rem`（言語切り替え）

### Type scale
`1.6rem`（見出し）/ `1.5rem`（名前）/ `1.25rem`（Welcome!）/ `0.95rem`（屋号）/ `0.9rem`（Journal タイトル・Contactボタン）/ `0.8rem`（本文）/ `0.75rem`（VIEW）/ `0.7rem`（ナビ・日付）/ `0.65rem`（Background 和文）/ `0.64rem`（Background 欧文）/ `0.62rem`（Background 見出し・年）/ `10px`（コピーライト）

### Radius / Easing
- `border-radius: 10px`（Contactボタンのみ）。他は角丸なし
- イージング: `cubic-bezier(0.19,1,0.22,1)`（大きい動き）、`ease`（色・不透明度）

## Assets
| 用途 | 状態 |
|---|---|
| Hero キービジュアル | **未撮影**。奈良・大淀／吉野の風景、山椒・梨などの植物を予定。プレースホルダで実装 |
| About スナップ写真 | **未確定**。プレースホルダで実装 |
| Works サムネイル | 既存の `public/notion-images/` 2枚 + 3枠目は空 |
| Notion / X アイコン | 公式グリフを SVG インライン（`Top Page v2.dc.html` からコピー） |

## 実装上の注意（ハマりどころ）

1. **About の左右カラム等高**: 写真に `aspect-ratio` や `min-height` を付けず `flex: 1; min-height: 0` にする。左カラムには日本語と英語の間に `flex: 1` のスペーサーを置く。両方セットで初めて下端が揃う
2. **欧文の `letter-spacing`**: 和文と同じ `0.15em` を当てないこと。`0.06em`。手置き改行が崩れる
3. **名前行**: 名前と屋号に `flex-shrink: 0` と `white-space: nowrap`、罫線に `flex: 1 1 0; min-width: 2rem`。左カラムが狭いと溢れて写真に重なるので `minmax(300px, 1fr)` の下限は必須
4. **Intro の中心合わせ**: `letter-spacing` のアニメーションと同時に `padding-left` も動かす。片方だけだと文字が罫線に対して右にずれる
5. **Nav の背景**: 半透明+blur がないと本文と文字が重なって読めない
6. **屋号は写真に重ねない**: 一部でも隠れる配置は不可

## 未決定・要相談
- Works カードを画像から色面＋テキストに変更するか
- Journal を Instagram 連携にするか（Meta API 申請＋60日ごとのトークン更新が必要。手動登録の方が現実的）
- Service セクションをトップに置くか、別ページに移すか
- Hero キービジュアルの最終素材と縦横比
- 屋号を最終的にロゴとして書き起こすか（Comfortaa で確定 → 将来ロゴ化の可能性）

## Files
- `Top Page v2.dc.html` — 完成デザイン（このバンドルに同梱）
- `image-slot.js` — プレースホルダ用コンポーネント（本番実装では不要）
- 実装先: `src/pages/index.astro`、`public/css/style.css`
