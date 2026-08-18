# otamochi portfolio

大橋亮太（otamochi）のポートフォリオサイト。公開先は https://otamochi.com/

**文章・画像・実績はNotionで管理している。** このリポジトリが持っているのはデザインと組み立ての仕組みで、中身はサイトを作るたびにNotionから取ってくる。つまり、載せる内容を変えたいときに触るのはNotionであって、このコードではない。

**「なぜこうなっているのか」は [DECISIONS.md](./DECISIONS.md) にある。** 見た目や仕様を変えようとする前に読むこと。過去に検討して却下した案が理由つきで書いてある。

---

## ブランチは2つだけ

| ブランチ | 役割 |
| --- | --- |
| `main` | **公開用。** ここに反映すると otamochi.com が自動で更新される |
| `work` | **編集用。** ふだんの作業はここでやる。保存すると確認用URLが自動で発行される |

`main` に直接コミットしない。必ず `work` で作業してから `main` に反映する。

## Notionだけ変えたとき

**Notionを更新しても、それだけではサイトに出ない。** 中身をNotionから取ってくるのはビルドの瞬間だけなので、ビルドが走らない限り何日でも古いままになる。

反映させるには、Notionの親ページ「HP」にある **「サイトに公開」ボタン**を押す。数分で otamochi.com に反映される。

このボタンはCloudflareのDeploy Hookを叩いており、`main` の最新コードでビルドをやり直す。**コミットは増えない**（コードは何も変わっていないため）。

注意点:

- **押した時点のNotion全体が公開される。** 書きかけのページがあるまま押さない
- 押すのは編集がひととおり終わってから1回でよい。連打しない（ビルドは同時に1本まで、無料枠は月500回）
- このボタンがあるページを外部共有しない（Deploy HookのURLには認証がないため）

## 日々の更新の流れ

### 1. 編集する

```bash
git checkout work        # 編集用に移動（すでにいるなら不要）
```

コードを編集する。**Notionの中身を変えただけなら、この手順ではなく上の「Notionだけ変えたとき」を見ること。**

### 2. 保存して確認する

```bash
git add .
git commit -m "何を変えたかを書く（例: Aboutの本文を差し替え）"
git push
```

pushすると、Cloudflareが自動でビルドして**確認用のURL**に反映する。まだ公開はされていないので、ここで安心して見比べられる。スマホからも開ける。

**https://work.otamochi-portfolio.pages.dev/**

反映まで数分かかる。ビルドの進み具合はCloudflareのダッシュボード（Workers & Pages → プロジェクト → デプロイ）で見られる。

### 3. 公開する

確認して問題なければ、`main` に反映する。

```bash
git checkout main
git merge work
git push
```

pushした時点で自動的にビルドが始まり、数分で otamochi.com に反映される。

そのあと編集用に戻る。

```bash
git checkout work
git merge main           # mainの内容をworkにも取り込んで揃えておく
```

## 手元で確認する

公開もCloudflareも通さず、自分のMacだけで見たいとき。

```bash
npm install                                  # 初回のみ
./scripts/with-notion-token.sh astro dev
```

http://localhost:4321/ が開ける。編集するとその場で反映される。

## 公開されたか確認する

サイトがいつ、何をきっかけに更新されたかを見る。

```bash
./scripts/deploy-log.sh
```

```
08/17 17:00  本番    Notionのボタン  成功  main
08/16 19:06  本番    Notionのボタン  成功  main
08/15 04:56  本番    git push        成功  main
```

**ボタンで公開してもgitのコミットは増えない**ため、`git log` を見ても公開の履歴は追えない。Cloudflare側にしか記録が残らないので、ここで読んでいる。

---

## Notionとの対応

Notionの親ページ「HP」の下に4つのデータベースがある。

| データベース | サイト上のどこ |
| --- | --- |
| `HP_Contents` | キービジュアル、About本文、スナップ写真、Background（経歴） |
| `HP_Works` | トップの活動カテゴリ3枚のカードと、その各ページ（`/works/[スラッグ]`） |
| `HP_Projects` | 個別の実績と、その詳細ページ（`/projects/[スラッグ]`） |
| `HP_Journal` | Journal（画像の横スクロールギャラリー）と、各記事ページ |

### 新しくデータベースを作ったときの注意

**Notionの画面で、親ページ「HP」にインテグレーション「HP連携」を接続すること。** 接続を忘れるとサイトを作るときに404で失敗する。現在は親ページに接続済みなので、その下に作れば自動的に引き継がれる。

### 画像をアップするときの条件

活動カテゴリ（`HP_Works`）の画像は **3:2の横長・長辺1200px以上**。大きいぶんはサイトを作るときに自動で軽くするので、縮小してから貼る必要はない。

---

## 設定と鍵

### Notionのトークン（Keychainで管理）

`NOTION_API_KEY`（インテグレーション「HP連携」）は、ビルドのときにHP配下の4つのDBを読むための鍵。**読み取り専用**に絞ってあり、これでNotionを書き換えることはできない。それでも平文では置かず、macOS Keychain に入れてある。

```bash
# 登録（Macを乗り換えたとき、2台目をセットアップするとき）
security add-generic-password -U -a "$USER" -s "otamochi-portfolio-notion" -w
# → 入力欄が出るので貼り付ける。コマンド履歴には残らない
```

ビルド時は `scripts/with-notion-token.sh` が実行の直前にKeychainから取り出し、**そのプロセスにだけ**渡す。シェル全体には渡さない（渡すと、そこから起動する子プロセスすべてが読めてしまうため）。

**Keychainは複数のMacで同期されない。** 2台目では上のコマンドで登録し直す。

Cloudflare側にも同じ鍵を「シークレット」として登録してある（設定 → 変数とシークレット）。本番ビルドはそちらを使う。

### Cloudflareのトークン（.envに平文）

`CLOUDFLARE_API_TOKEN` は**読み取り専用**（Cloudflare Pages: Read）で、漏れてもデプロイ履歴が見えるだけ。サイトの改ざんも課金もできないため、`.env` に平文で置いている。`.env` は `chmod 600`（本人以外読めない）にしてある。

**`.env` はgitに含めない。**

### 秘密にしないもの

データベースIDは `src/config/notion.ts` にそのまま書いてgit管理している。IDを読むにはAPIトークンとインテグレーションの接続が両方必要で、トークンが漏れればIDは一覧で取得できてしまうため、隠しても防御にならない。

git管理にしておくことで、複数のMacで作業してもIDの食い違いが起きない。

---

## 構成

- **Astro**（静的サイト生成）— すべてのページをあらかじめHTMLにしておく方式。訪問者を待たせない
- **Cloudflare Pages**（公開先）— `main` への反映を検知して自動でビルドする
- **Notion API**（データ取得）— ビルド時にNotionから文章と画像を取得し、画像はローカルに保存して最適化する

### コマンド一覧

| コマンド | 内容 |
| --- | --- |
| `./scripts/with-notion-token.sh astro dev` | 手元で確認する（http://localhost:4321/） |
| `./scripts/with-notion-token.sh astro build` | サイトを組み立てて `dist/` に出力する |
| `./scripts/deploy-log.sh` | 公開の履歴を見る |
| `npm run preview` | 組み立てた結果を手元で表示して確かめる |

**`npm run dev` と `npm run build` は直接使わない。** Keychainからトークンを渡す必要があるため、上のラッパー経由で実行する。`package.json` を書き換えていないのは、Cloudflareの本番ビルドが `npm run build` を実行しており、そこにmacOS専用のラッパーを噛ませると落ちるため。

### 画像の扱い

Notionから取得した画像は `public/notion-images/` に保存され、WebPに変換される。前回から変わっていない画像は再ダウンロードしない（`.image-manifest.json` で管理）。

このフォルダはgit管理外なので、**中身を消しても次のビルドで作り直される。** 全部取り直したいときは手で消してよい。
