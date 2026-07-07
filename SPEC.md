# otamochi-portfolio 改修仕様書

作成日: 2026-07-07
このドキュメントは全Phaseの実装仕様を事前に確定させるためのもの。
実装は原則サブエージェント(Haiku)が本仕様書に従って行い、レビュー・検証は上位モデルが行う。

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

### 3-0. Notion DB新規作成(上位モデルが担当・NOTION.md準拠)
`HP_Journal` データベースを作成:

| プロパティ名 | 型 | 用途 |
|---|---|---|
| `タイトル` | title | 記事タイトル |
| `日付` | date | 表示・ソート用(降順) |
| `カテゴリ` | select | 例: `制作`, `学び`, `お知らせ`, `イベント` |
| `スラッグ` | rich_text | 詳細ページURL用(任意。無ければ一覧のみ) |
| `公開` | checkbox | ONのみ表示 |

作成後、`.env` に `NOTION_JOURNAL_DB_ID` を追加する。

### 3-1. 実装
- `src/lib/notion.ts` に `getJournalEntries()` を追加(型は `JournalEntry`。取得方針はWorksと同じ)
- トップページに `Journal` セクションを新設(About と Contact の間):
  - 最新5件を「日付 / カテゴリ / タイトル」の行リストで表示(ミニマルなテキスト主体。ギャラリーとの対比で静的に)
  - 各行はスラッグがあれば `/journal/{slug}/` へリンク
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

### 実装
- ユーザーからNotionフォームの公開URLを受領する(前提)
- ナビの `.nav-contact-btn`(現在 `href="#"`)→ Contactセクション(`#contact`)へのアンカースクロールに変更
- Contactセクションの `links` に「お問い合わせフォーム」を追加(Notionフォームへ新規タブで遷移)
- リンク方式を採用(iframe埋め込みは不採用)。理由: Notionフォームのiframe表示は仕様変更に弱く、デザインの統一も難しいため

### 受け入れ基準
- ナビのContactボタンでContactセクションへスムーズスクロールする
- フォームリンクからNotionフォームが開ける

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
