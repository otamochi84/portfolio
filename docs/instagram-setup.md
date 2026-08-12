# Instagram連携のセットアップ手順

トップページのJournalに、Instagramの投稿をグリッド表示するための下準備。
**大橋さんの作業**は STEP 1〜5。STEP 6以降は実装側（コード）の話。

**PCのブラウザで進めてください。** スマホアプリは設定項目が階層に散っていて迷いやすいです。

> **画面の文言について**
> ボタン名・メニュー名は公式ヘルプで確認した2026-08-12時点のものです。
> ただし**Metaは画面をよく変えます。** 文言が違っても同じ意味の項目を探してください。
> 一方、**APIのエンドポイント名・パラメータ名・権限名は公式ドキュメントの確定値**です。ここは一字一句そのままで動きます。

---

## 全体像

```
STEP 1  Instagramをプロアカウントにする      （スマホ）
STEP 2  Facebookページを作る                 （PC）
STEP 3  InstagramとFacebookページを連携する   （PC）
STEP 4  Metaアプリを作る                     （PC）
STEP 5  トークンを3段階で育てる ＋ 動作確認    （PC）
```

**所要時間の目安: 30〜40分。** STEP 2 は10〜15分、STEP 5 は10分ほど。

### トークンは3段階で育てる

ここが一番つまずくところ。**欲しいのは3つ目だけ**で、前の2つは通過点。

| | トークン | 寿命 |
|---|---|---|
| 1 | 短期ユーザートークン | 1時間 |
| 2 | 長期ユーザートークン | 60日 |
| 3 | **長期ページトークン** | **無期限 ← 目標** |

公式ドキュメントの記述:
> Long-lived Page access token do not have an expiration date and only expire or are invalidated under certain conditions.

失効する条件 = パスワード変更・アプリの連携解除・ページ権限の喪失。

---

## STEP 1: Instagramをプロアカウントにする

スマホのInstagramアプリで、**ビジネス**または**クリエイター**に切り替える。

- どちらでもAPIは使えます
- **個人アカウントのままでは、この先すべて不可能です**

---

## STEP 2: Facebookページを作る

**個人アカウントを変換するのではありません。** 個人アカウントはそのままで、そこから「ページ」を1つ新しく作ります。中身は空でも構いません。

### 操作手順

1. PCブラウザで Facebook にログインする
2. **左側のメニューから「ページ」をクリック**
3. **「ページを作成」をクリック**
4. **「公開ページ」を選択**して「次へ」をクリック
5. **「スタート」をクリック**
6. **ページ名**と**カテゴリ**を入力する（この2つが必須）
7. 自己紹介を入力して**「ページを作成」をクリック**

ここまででページは完成します。以降は任意項目なので、飛ばして構いません。

8. 連絡先情報・所在地・営業時間 → **入力せず「次へ」でOK**
9. プロフィール写真・カバー写真 → **後から設定できるので「次へ」でOK**
10. WhatsApp連携 → **「スキップ」**
11. 友達を招待 → **招待せず「次へ」**
12. お知らせの設定 → **「完了」**

### 入力内容の目安

| 項目 | 内容 |
|---|---|
| ページ名 | `otamochi` など。75文字以内 |
| カテゴリ | 「経営コンサルタント」など近いもの。**後から変更できる**ので迷わなくてよい |
| 自己紹介 | 空でも可 |

### 注意

- ページは**公開状態のままにしておいてください。** 非公開だとAPIから見えない可能性があります
- ページ作成時、大橋さんの個人アカウントは自動的にそのページの管理者になります。**この権限がSTEP 5で必要**です

---

## STEP 3: InstagramとFacebookページを連携する

**このルートの肝です。** Instagramが「Facebookページに紐づいている」状態を作ります。これがないと無期限のページトークンは取れません。

入口が3つあります。**どれか1つで繋がればOK**です。

### 経路A: Meta Business Suite（推奨）

1. `business.facebook.com` を開く
2. 対象のビジネス／ページを選ぶ
3. **「設定」→「ビジネス設定」**へ進む
4. **「アカウント」→「Instagramアカウント」**を開く
5. **「追加」または「接続」**をクリック
6. Instagramのプロアカウントでログインする

### 経路B: Instagramアプリから

1. プロフィール →**「プロフィールを編集」**
2. **「公開ビジネス情報」→「ページ」**
3. **「接続または作成」→「次へ」**
4. ページの管理者であるFacebookアカウントでログインし、STEP 2 で作ったページを選ぶ

### 経路C: Facebookページの設定から

1. `business.facebook.com` で対象のページを表示していることを確認
2. 左メニューの**「設定」**
3. **「リンク済みアカウント」**または**「Instagramアカウント」**
4. **「アカウントを接続」**

### 連携できたかの確認

**UIで探し回らないでください。STEP 5-4 でAPIを叩けば一意に判定できます。**

```
instagram_business_account が返る → 連携できている
null が返る                      → できていない
```

自信がなくても STEP 4 へ進んで構いません。STEP 5-4 で判定して、ダメならここへ戻ります。

---

## STEP 4: Metaアプリを作る

1. `developers.facebook.com` を開き、開発者登録する（初回のみ）
2. アプリを作成する
3. 作ったアプリに **Facebook Login** の製品を追加する
4. **アプリID（App ID）**と**app secret**を控える

### 重要

- **アプリは「開発モード」のままでOK。App Review は不要です**
  公式: *If your app only serves your Instagram professional account or an account you manage, Standard Access is all your app needs.*
- **app secret は秘密情報です。** 人に見せない・チャットに貼らない・gitに入れない

---

## STEP 5: トークンを3段階で育てる

**Graph API Explorer** を使います。`developers.facebook.com` のツールメニューから開けます。

画面右側に操作パネルがあります。UI要素の名称は公式ドキュメントで確認した確定値です。

### 5-1. 短期ユーザートークンを取る（1時間で失効）

1. 右上の**「Metaアプリ」ドロップダウン**で、STEP 4 で作ったアプリを選ぶ
2. **「アクセス許可」ドロップダウン**を開き、次の**2つの権限**を追加する

```
instagram_basic
pages_show_list
```

3. **「アクセストークンを取得」ボタン**をクリック
4. Facebookのログイン・許可画面が出るので承認する
5. 生成されたトークンが画面右上に表示される

**このトークンは1時間で失効します。すぐ 5-2 へ進んでください。**

### 5-2. 長期ユーザートークンに交換する（60日）

Explorerの**クエリ文字列フィールド**に次を入力して送信します（改行せず1行で）。

```
oauth/access_token?grant_type=fb_exchange_token&client_id={アプリID}&client_secret={app secret}&fb_exchange_token={5-1のトークン}
```

返ってきた `access_token` が**長期ユーザートークン**です。

### 5-3. 長期ページトークンを取る（無期限）★これが目標

```
me/accounts?access_token={5-2の長期ユーザートークン}
```

**必ず 5-2 の長期トークンを使ってください。** 5-1 の短期トークンから取ったページトークンは無期限になりません。**ここが一番間違えやすいところです。**

レスポンスの中から、STEP 2 で作ったページの `access_token` と `id` を控えます。

### 5-4. 連携できているかの判定

```
{ページのid}?fields=instagram_business_account&access_token={ページトークン}
```

| 結果 | 意味 |
|---|---|
| `instagram_business_account.id` が返る | **連携OK。** このidが**IGユーザーID** |
| `null` が返る | STEP 3 の連携ができていない。STEP 3 に戻る |

### 5-5. 投稿が取れるか確かめる

```
{IGユーザーID}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token={ページトークン}
```

投稿の配列が返れば成功。**ここまで来ればセットアップ完了です。**

---

## 控えておいてほしいもの

| 値 | 秘密？ | 置き場所 |
|---|---|---|
| 長期ページトークン（5-3） | **秘密** | `.env` の `INSTAGRAM_ACCESS_TOKEN`。Cloudflare Pages側にも同名で環境変数を設定する |
| IGユーザーID（5-4） | 秘密ではない | git管理下の設定ファイルに置く（`src/config/notion.ts` と同じ考え方） |
| アプリID / app secret | **秘密** | トークン取得時にだけ使う。サイトのビルドには不要なので `.env` に入れなくてよい |

> **トークンと app secret をチャットに貼らないでください。**
> `.env` にご自身で書き込んでください。`.env` は `.gitignore` 済みなのでgitには入りません。
> 私に教えていただく必要があるのは **IGユーザーIDだけ**です（秘密情報ではありません）。

---

## つまずいたときは

| 症状 | 原因 |
|---|---|
| 5-4 で `null` が返る | STEP 3 の連携ができていない |
| `me/accounts` にページが出てこない | STEP 2 のページの管理者になっていない／別のFacebookアカウントでログインしている |
| 権限エラーが出る | 5-1 で `instagram_basic` と `pages_show_list` を付け忘れている |
| トークンがすぐ失効する | 5-2 を飛ばして短期トークンのまま進んでいる |

**どの画面で何が表示されたかを教えてください。** エラーメッセージがあればそのまま貼っていただければ、原因を絞り込めます（**トークンの値そのものは伏せてください**）。

---

## 実装側の設計メモ（STEP 6以降・私の作業）

### 取得する項目

`media_type` は `IMAGE` / `VIDEO` / `CAROUSEL_ALBUM` の3種類。

- 静止画は `media_url`
- **VIDEOは `media_url` が動画ファイル**なので、`thumbnail_url`（VIDEOのみ利用可）を使う
- `CAROUSEL_ALBUM` は先頭の1枚を代表として使う想定

### 画像の扱い

**Notion画像と同じ方式**でビルド時にローカルへ落とし、WebP化・srcset生成をする。
Instagramの `media_url` も**時間で失効するURL**なので、直接埋め込むと必ず壊れる。

### 静的サイトであることへの対処

ビルド時にデータが焼き込まれるので、**投稿しても次のビルドまでHPに反映されない**。
GitHub Actions で定期的に Cloudflare Pages のビルドを叩く仕組みを別途入れる。

### 失敗時の設計（重要）

`data_access_expires_at`（約90日でデータアクセスが失効）に引っかかると、
**トークンは有効なままデータだけ空で返る**。エラーにならないので気づけない。

そのため **取得済みのデータと画像はリポジトリにコミットする**。
こうすれば失効時も「新しい投稿が増えない」だけで済み、**Journalが空になることはない**。

---

## 参照した公式ドキュメント

- [Facebookページを作成する（Facebookヘルプセンター）](https://www.facebook.com/help/104002523024878)
- [Instagram API with Facebook Login - Get Started](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/get-started)
- [Generate Long-Lived User and Page Access Tokens](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived/)
- [Graph API Explorer](https://developers.facebook.com/docs/graph-api/guides/explorer)
- [IG Media reference](https://developers.facebook.com/docs/instagram-platform/reference/instagram-media)
- [Overview of the Instagram API](https://developers.facebook.com/docs/instagram-platform/overview/)
