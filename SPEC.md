# otamochi-portfolio 改修仕様書

作成日: 2026-07-07
このドキュメントは全Phaseの実装仕様を事前に確定させるためのもの。
実装は原則サブエージェント(Haiku)が本仕様書に従って行い、レビュー・検証は上位モデルが行う。

---

## 現在地と引き継ぎ(2026-07-18更新)

別マシンのセッションから作業を再開するためのメモ。**着手前に必ずこのセクションを読むこと。**

### 進捗状況(2026-07-19更新)
- **Phase 1: 完了**(コミット `c96c7d8`)
- **Phase 2: 完了 + デザイン反復調整済み**(コミット `cd586a4` → 微修正 `031dbca`: 概要リード文削除・前後ナビ化)
- **Phase 3: 完了 + デザイン反復調整済み**(Journal実装。詳細は下記「Phase 3の実装は仕様から変更済み」)
- **次のタスク(この順で)**: Phase 4(Contact整備。Notionフォーム公開URLをユーザーから受領して着手) → Phase 5

### Phase 3の実装は仕様から以下の点が変更済み(ユーザーとの調整結果。戻さないこと)
- スラッグプロパティ廃止。URLは日付から自動生成(`/journal/YYYY-MM-DD/`、同日2件目以降 `-2`)
- 行リスト(トップ・一覧)はカテゴリ非表示の「日付 / タイトル」2カラム
- 詳細ページは日付の横にカテゴリをNotionタグ風バッジで表示(背景 `#f7e7de` × 文字 `#b3592f`=Claude風テラコッタ。今後のアクセント色)
- Journalセクションはトップの最初のセクション(ヒーロー直後)に配置
- セクション背景は白/グレー互い違い(ヒーロー灰→Journal白→Works灰→About白→Contact灰)。Contactの黒背景は廃止し、見出しは `section-title` + Quicksand・罫線なし
- NotionBlocks拡張: callout子ブロック描画、link_mention(ファビコン+タイトル)、bookmark(ビルド時OGP取得のNotion風カード)、組み込みアイコン対応

### Phase 2の実装は仕様(2-3)から以下の点が変更済み(ユーザーとの調整結果。戻さないこと)
- **サムネイル画像は詳細ページに表示しない**(モーダルと情報が重複するため削除)
- ヘッダー構成は「実施時期(YYYY.MM) → 案件名(h1) → カテゴリ → 連携ツール(テキストのみ)」。クライアント名は非表示
- 戻るリンクはナビ左上の「← Works」のみ。ページ下部の戻るリンクは廃止し、代わりに「Other Works」回遊セクション(最新3件のカード)を設置
- 概要プロパティはコールアウト風リード文(薄グレー背景 `#f7f6f3`)として本文の前に表示
- 本文最大幅は 720px ではなく **860px**
- コールアウト/コードブロックの配色はNotionライトテーマの実色に合わせた(works.css参照)

### 運用ルール(このプロジェクト固有)
- **コード実装はOpus 4.8サブエージェント**(Agentツールで `model: opus` 指定)に委任し、メインスレッドはレビュー・検証に徹する(2026-07-19にHaikuから変更。Haikuは指示範囲外の変更や仕上がりの粗さが目立ったため)
- Notion操作は `ntn` CLI。DB構造を触る前にNotion内の「NOTION.md」(ページID `e84cafd5-d2df-40d5-9819-d3fc5685c4fd`)を必読
- コミットメッセージ末尾に `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>` トレーラーを付ける
- 各Phase完了ごとにユーザー確認 → コミット

### デザイン調整の指針(ユーザーの嗜好。反復調整時の初期値にする)
- 情報の重複・羅列を嫌う。同じ情報が2箇所に見えるなら片方を削る方向で提案する
- Notionでの見え方に忠実に(コールアウト色・キャプション非斜体など)
- 画像・キャプションは中央配置が基本。枠外はみ出し等の遊びは歓迎
- 遷移直後のファーストビューで要素が見切れるのを嫌う
- **横並び要素は上下センターラインを一直線に**(「ガタつき」指摘が複数回)。サイズ違いの要素はflex + align-items:center を基本にし、margin決め打ちで合わせない
- **細部(位置合わせ・揃え)を詰め切ってから確認を出す**。細かい調整を残したまま確認依頼しない
- アクセント色はClaude風テラコッタ(背景 `#f7e7de` × 文字 `#b3592f`)。薄いオレンジ系は歓迎
- **Apple等の洗練系サイトを設計の参照点にする**。過剰な装飾・不要な動き(scale等)は削り、控えめで小ぶりなUIに寄せる
- ナビ左上はロゴ設置予定地(空の `.nav-brand`)。ロゴ完成後にここへ置く
- 一発で決めず「行ったり来たり」で詰めるスタイル。小さな修正指摘が続くのは正常

### 環境メモ
- `.env` に `NOTION_API_KEY` / `NOTION_DATABASE_ID` / `NOTION_JOURNAL_DB_ID` が必要(gitに含めない)
- HP_Works: database_id `5556c055-b6b6-4e35-b70b-8d9e8a432059` / data_source_id `42bc74c6-9713-49a3-8f7f-8e6241d4d93d`
- HP_Journal: database_id `21bc13ea-d3c8-4e8d-a238-1a0bd587a505` / data_source_id `5f2b7456-2cdb-4547-9d2b-5eaed42c2376`(Phase 3-0で作成済み・HPページ内)
- 既知の未解決(対応Phaseで処理): og:imageが相対パス(Phase 5で `astro.config` に `site` 設定)、ナビContactボタンが `href="#"`(Phase 4)

---

## 0. 全体方針

### 変えないもの
- 技術スタック: Astro 5(静的ビルド) + Anime.js + バニラJS/CSS
- デザイン路線: 明るい背景(#f8f8f8) + モノクロ + 大型タイポ。現路線を磨く
- デプロイ: `npm run build` → Cloudflare Pages(`git push` で自動デプロイ)
- 既存のCSS設計(`:root` のデザイントークン、クラス命名)

### コーディング規約(全Phase共通)
- コメントは日本語、変数名・関数名は英語camelCase
- 1関数1責務。過度に抽象化しない(引き渡し前提のシンプルさ優先)
- APIキー等は必ず `import.meta.env` 経由。ハードコード禁止
- 既存コードのスタイル(インデント・命名)に合わせる

### 検証手順(各Phase共通の完了条件)
1. `npm run build` がエラーなく通る
2. `npm run preview` で対象ページを目視確認
3. `view-source`(dist内HTML)で、SEO対象テキストがHTMLに直接含まれることを確認

---

## Phase 1: 基盤整理(テキストのHTML化)

### 目的
`public/js/main.js` の `portfolioConfig` にあるテキストをAstroテンプレート側へ移し、
検索エンジンが本文を読める状態にする。**見た目・アニメーションは一切変えない。**

### 変更ファイル
| ファイル | 変更内容 |
|---|---|
| `src/pages/index.astro` | frontmatterに `siteConfig` 定数を定義し、テキストをHTMLに直接展開 |
| `public/js/main.js` | `portfolioConfig` と `setupContent()` のテキスト流し込み処理を削除 |

### 実装詳細
1. `index.astro` のfrontmatterに以下を定義(値は現 `main.js` の `portfolioConfig` からコピー):
   ```ts
   const siteConfig = {
     name: "Ryota Ohashi",
     role: "otamochi",
     bio: "...",           // 現行のまま
     freeTextTitle: "About",
     freeTextBodyEn: "...", // 現行のまま
     freeTextBodyJp: "...", // 現行のまま
     links: [ /* 現行の4件 */ ],
   };
   ```
2. HTML側の変更:
   - `#user-name`: `name` を空白で分割し、各単語を `<span class="reveal-text"><span>単語</span></span>` としてAstroの `map` で出力(現在JSで生成しているものと同一のDOM構造にする)
   - `#user-bio`, `#free-text-title`, `#free-text-body-en`, `#free-text-body-jp`: テキストを直接埋め込む。改行(`\n`)は `white-space: pre-line` で表現するため、CSSに `.user-subtitle, .text-body { white-space: pre-line; }` が無ければ追加
   - `#nav-role-text`: `role` を直接埋め込む
   - `#copyright`: `&copy; {new Date().getFullYear()} {role}` をAstro式で出力
   - `#links-list`: `links` 配列を `map` で `<li class="link-item">...` として出力(現在JSが生成しているDOM構造をそのまま再現)
3. `main.js` の変更:
   - `portfolioConfig` 定義を削除
   - `setupContent()` からテキスト・リンク流し込みを削除し、`initCursor()` の呼び出しだけ残す(関数名は `setupContent` のままでよい)
   - アニメーション(`startOpeningAnimation` 等)は**一切変更しない**

### 受け入れ基準
- ビルド後の `dist/index.html` に名前・About日英・リンクラベルが含まれる
- 開場アニメーション(背景文字ドリフト→名前→コピー)が現行と同じ動きをする
- リンク4件が機能する

---

## Phase 2: Works詳細ページ

### 目的
Notionの実績ページ本文から `/works/[slug]/` を静的生成する。
モーダル(概要のクイックビュー)は維持し、モーダル内に「詳しく見る →」を追加して詳細ページへ誘導する。

### 2-0. Notion DB拡張(実装前の準備・上位モデルが担当)
`HP_Works`(data_source_id: `42bc74c6-9713-49a3-8f7f-8e6241d4d93d`)に以下のプロパティを追加する:

| プロパティ名 | 型 | 用途 |
|---|---|---|
| `スラッグ` | rich_text | URL用の英小文字ケバブケース(例: `task-management-db`)。未入力の実績は詳細ページを作らない |
| `公開` | checkbox | ONのものだけサイトに表示(下書き運用を可能にする) |
| `実施時期` | date | 実績の時期。一覧の並び順(降順)に使用 |
| `外部リンク` | url | 公開可能な成果物URL(任意)。モーダルの「プロジェクトを見る↗」に接続 |

※ Notion側の変更はNOTION.mdの規則に従って行う。

### 2-1. データ取得の共通化: `src/lib/notion.ts`(新規)
`index.astro` にあるNotion取得・画像ダウンロード処理をここへ移す。

```ts
// 公開エクスポート
export type WorkItem = {
  id: string;
  slug: string | null;   // スラッグ未設定ならnull
  title: string;
  client: string;
  category: string;
  overview: string;
  tools: string[];
  thumbnail: string;      // ローカルパス(/notion-images/...)
  externalUrl: string | null;
  date: string | null;    // ISO文字列
};

export async function getWorks(): Promise<WorkItem[]>;
export async function getPageBlocks(pageId: string): Promise<NotionBlock[]>;
export async function downloadImage(url: string, fileName: string): Promise<string>; // 戻り値はローカルパス
```

実装要件:
- `getWorks()`: `公開` = true のみ取得。`実施時期` 降順ソート(Notion APIの `sorts` を使用)。
  現行の画像ダウンロード処理(public/dist両方に保存)を `downloadImage()` として切り出して利用
- `getPageBlocks()`: `blocks/{id}/children` を `has_more` がfalseになるまでページネーション取得。
  ネストブロック(リストの子など)は1階層まで再帰取得
- 画像ブロックのURLも `downloadImage()` でローカル化する(ファイル名は `{blockId}.{ext}`)
- Notion APIエラー時は空配列を返し、`console.error` でビルドログに残す(現行と同じ方針)

### 2-2. ブロックレンダラー: `src/components/NotionBlocks.astro`(新規)
Notionブロック配列をHTMLに変換する。対応ブロックと出力:

| Notionブロック | 出力HTML |
|---|---|
| `paragraph` | `<p>` |
| `heading_1` | `<h2>`(ページ内ではh1はタイトル専用のため格下げ) |
| `heading_2` | `<h3>` |
| `heading_3` | `<h4>` |
| `bulleted_list_item` | `<ul><li>`(連続する項目は1つの `<ul>` にまとめる) |
| `numbered_list_item` | `<ol><li>`(同上) |
| `image` | `<figure><img src="ローカルパス"><figcaption>` (captionがあれば) |
| `quote` | `<blockquote>` |
| `divider` | `<hr>` |
| `callout` | `<aside class="notion-callout">` (アイコン絵文字 + テキスト) |
| `code` | `<pre><code>` |
| 上記以外 | 無視(console.warnで型名をログ) |

リッチテキスト装飾: bold→`<strong>`、italic→`<em>`、code→`<code>`、リンク→`<a target="_blank" rel="noopener">`。
テキストは必ずエスケープ処理してから装飾タグを組み立てる(XSS対策)。

### 2-3. 詳細ページ: `src/pages/works/[slug].astro`(新規)
- `getStaticPaths()`: `getWorks()` から `slug` が設定されている実績のみパス生成
- ページ構成(上から順):
  1. 戻るリンク「← Works」(トップの `/#works` へ)
  2. カテゴリ + 実施時期(メタ情報行)
  3. `<h1>` 案件名
  4. クライアント名 + 使用ツールバッジ
  5. サムネイル画像(大)
  6. Notion本文(`NotionBlocks`)
  7. 外部リンクがあれば「プロジェクトを見る ↗」
  8. ページ下部に「← Works一覧へ戻る」
- `<head>`: `<title>{案件名} | otamochi portfolio</title>`、`<meta name="description">` に概要の先頭120字、OGPタグ(og:title / og:description / og:image=サムネイル)
- レイアウト: トップと同じ `style.css` を読み込み、共通のデザイントークンを使用。
  本文最大幅 `720px` 中央寄せ。フローティングナビはトップと共通で表示
- **詳細ページ用CSSは `public/css/works.css`(新規)に分離**(style.cssを肥大化させない)

### 2-4. トップページの変更
- `index.astro` のNotion取得処理を `src/lib/notion.ts` の呼び出しに置き換え
- ギャラリーは `公開` = true のみ表示
- モーダルに「詳しく見る →」リンクを追加:
  - `slug` がある実績: `/works/{slug}/` へのリンクを表示
  - `slug` が無い実績: リンク非表示(現行の外部リンクと同じ出し分け方式)
- `Works` セクションに `id="works"` を付与(詳細ページからの戻り先)

### 受け入れ基準
- `公開` ONかつスラッグありの実績数だけ `dist/works/*/index.html` が生成される
- 詳細ページに案件名・本文・画像が表示され、画像は `/notion-images/` 配下のローカルパスである
- モーダル→「詳しく見る」→詳細ページ→「← Works」の往復が機能する
- `公開` OFFの実績は一覧・詳細とも出ない
- 各詳細ページのtitle/descriptionが実績ごとに異なる

---

## Phase 3: Journal(活動記録)

### 目的
活動ログをNotionで書き、サイトに時系列表示する。「Notionで活動を記録→そのまま発信」の実演。

### 3-0. Notion DB新規作成(上位モデルが担当・NOTION.md準拠)【完了】
`HP_Journal` データベースを作成済み(IDは環境メモ参照):

| プロパティ名 | 型 | 用途 |
|---|---|---|
| `タイトル` | title | 記事タイトル |
| `日付` | date | 表示・ソート用(降順)。詳細ページURLにも使用 |
| `カテゴリ` | select | `制作`, `学び`, `お知らせ`, `イベント` |
| `公開` | checkbox | ONのみ表示 |

※ スラッグプロパティは廃止(ユーザー決定)。URLは `日付` から自動生成する。
`.env` に `NOTION_JOURNAL_DB_ID` を追加済み。

### 3-1. 実装
- `src/lib/notion.ts` に `getJournalEntries()` を追加(型は `JournalEntry`。取得方針はWorksと同じ)
- **スラッグは日付から自動生成**: `YYYY-MM-DD` 形式(例: `/journal/2026-07-10/`)。
  同日に複数記事がある場合、2件目以降に `-2`, `-3` を付ける(並びはNotion取得順)。
  日付未入力の記事は一覧・詳細とも表示しない
- トップページに `Journal` セクションを新設(About と Contact の間):
  - 最新5件を「日付 / カテゴリ / タイトル」の行リストで表示(ミニマルなテキスト主体。ギャラリーとの対比で静的に)
  - 各行は `/journal/{slug}/` へリンク
  - セクション末尾に「View all →」で `/journal/` へ
- `src/pages/journal/index.astro`(新規): 全件を年ごとにグルーピングして一覧表示
- `src/pages/journal/[slug].astro`(新規): Works詳細と同じレイアウト基盤 + `NotionBlocks` で本文表示
- スクロール時のフェードイン(`IntersectionObserver`)は既存の仕組みを流用

### 受け入れ基準
- Notionで記事を書き `公開` ONにして `npm run build` すると、一覧と詳細に反映される
- トップには最新5件のみ、`/journal/` には全件表示される

---

## Phase 4: Contact整備

### 目的
Notionフォームへの導線を設置し、問い合わせを受けられる状態にする。

### 実装(2026-07-19ユーザー決定で変更)
- ナビの `.nav-contact-btn`(全4ページ: トップ・works詳細・journal一覧・journal詳細)→ Notionフォーム公開URLへ新規タブで直接遷移
  - URL: `https://otamochi.notion.site/154df30866d3805ab4a2ca7eae98e150?pvs=105`
- Contactセクションの `links` は増やさない(アンカースクロール化も行わない)
- リンク方式を採用(iframe埋め込みは不採用)。理由: Notionフォームのiframe表示は仕様変更に弱く、デザインの統一も難しいため

### 受け入れ基準
- 各ページのナビContactボタンからNotionフォームが新規タブで開ける

---

## Phase 5: デザイン磨き込み(上位モデル + ユーザーで実施)

Haikuには任せず、対話しながら詰める。候補リスト:

- [ ] 開場アニメーションのイージング・タイミング微調整
- [ ] Worksギャラリーのホバー表現(画像ズーム・キャプション出現の質感)
- [ ] 詳細ページのタイポグラフィ(行間・見出しのジャンプ率)
- [ ] Journalセクションの行ホバー演出
- [ ] スマホでの余白・フォントサイズ最適化
- [ ] OGP画像(SNSシェア時の見た目)の設計
- [ ] favicon・メタ情報の整備

---

## 実装順序と担当

| 順序 | 作業 | 担当 |
|---|---|---|
| 1 | Phase 1 実装 | Haiku |
| 2 | Phase 1 レビュー・検証 | 上位モデル |
| 3 | Phase 2-0 Notion DB拡張 | 上位モデル(NOTION.md準拠) |
| 4 | Phase 2-1〜2-4 実装 | Haiku(2-1/2-2 → 2-3/2-4 の2段階に分割) |
| 5 | Phase 2 レビュー・検証 | 上位モデル |
| 6 | Phase 3-0 Journal DB作成 | 上位モデル(NOTION.md準拠) |
| 7 | Phase 3 実装 | Haiku |
| 8 | Phase 3 レビュー・検証 | 上位モデル |
| 9 | Phase 4 実装 | Haiku |
| 10 | Phase 5 デザイン磨き | 上位モデル + ユーザー |

各Phase完了ごとにコミットし、ユーザー確認後に次へ進む。
