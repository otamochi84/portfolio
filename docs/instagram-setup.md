# Instagram連携のセットアップ手順

トップページのJournalに、Instagramの投稿をグリッド表示するための下準備。
**大橋さんの作業**は STEP 0〜4。STEP 5以降は実装側（コード）の話。

> **Metaの管理画面はボタン名・メニュー位置がよく変わります。**
> この手順書では「何を達成するか」を書き、画面上の文言は目安として扱ってください。
> 一方、**APIのエンドポイント名・パラメータ名・権限名は公式ドキュメントで確認した確定値**です（2026-08-12時点）。

---

## 用語の整理

| 用語 | 中身 |
|---|---|
| プロアカウント | Instagramの「ビジネス」または「クリエイター」アカウント。個人アカウントはAPIから一切アクセスできない |
| 長期ユーザートークン | 60日で失効する。**これは通過点** |
| **長期ページトークン** | **無期限。最終的に欲しいのはこれ** |

公式ドキュメントの記述:
> Long-lived Page access token do not have an expiration date and only expire or are invalidated under certain conditions.

失効する「certain conditions」= パスワード変更・アプリの連携解除・ページ権限の喪失。

---

## STEP 0: Instagramをプロアカウントにする

スマホのInstagramアプリで、ビジネスまたはクリエイターに切り替える。

- どちらでもAPIは使える
- 個人アカウントのままでは**この先すべて不可能**

## STEP 1: Facebookページを作り、Instagramと連携する

**このルートの肝。** Instagramが「Facebookページに紐づいている」状態を作る。これがないと無期限のページトークンが取れない。

1. Facebookページを作成（既にあればそれでよい。内容は空でも構わない）
2. Instagramのプロアカウントとそのページを連携する

連携はInstagramアプリ側の設定からでも、Facebookページ側の設定からでも可能。

**確認方法**: STEP 4 で `instagram_business_account` が返ってくれば連携成功。ここが `null` なら連携できていない。

## STEP 2: Meta for Developers でアプリを作る

https://developers.facebook.com/ で開発者登録し、アプリを作成する。

- **アプリは「開発モード」のままでよい。**自分のアカウントだけを扱うなら **App Review は不要**
  （公式: *If your app only serves your Instagram professional account or an account you manage, Standard Access is all your app needs.*）
- アプリに **Facebook Login** の製品を追加する
- **アプリID（App ID）と app secret を控える**

> **app secret は秘密情報です。** 人に見せない・チャットに貼らない・gitに入れない。

## STEP 3: トークンを3段階で育てる

Graph API Explorer（Meta for Developers 内のツール）を使う。

### 3-1. 短期ユーザートークンを取る

Explorerで自分のアプリを選び、次の**2つの権限**を付けてトークンを生成する。権限名は確定値:

```
instagram_basic
pages_show_list
```

生成されるトークンは**1時間で失効**する。すぐ次へ進むこと。

### 3-2. 長期ユーザートークンに交換する（60日）

```
GET oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id={アプリID}
  &client_secret={app secret}
  &fb_exchange_token={3-1で取った短期トークン}
```

### 3-3. 長期ページトークンを取る（無期限）★これが最終目標

```
GET /me/accounts?access_token={3-2で取った長期ユーザートークン}
```

**必ず3-2の長期トークンを使うこと。** 短期トークンから取ったページトークンは無期限になりません。

レスポンスの中から、STEP 1 で連携したページの `access_token` と `id` を控える。

## STEP 4: 動作確認

### 4-1. Instagramアカウントのidを調べる

```
GET /{ページのid}?fields=instagram_business_account
  &access_token={ページトークン}
```

返ってきた `instagram_business_account.id` が **IGユーザーID**。
`null` が返る場合は STEP 1 の連携ができていない。

### 4-2. 投稿が取れるか確かめる

```
GET /{IGユーザーID}/media
  ?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp
  &access_token={ページトークン}
```

投稿の配列が返れば成功。**ここまで来ればセットアップ完了。**

---

## 大橋さんに控えておいてほしいもの

| 値 | 秘密？ | 置き場所 |
|---|---|---|
| 長期ページトークン | **秘密** | `.env` の `INSTAGRAM_ACCESS_TOKEN`。Cloudflare Pages側にも同名で環境変数を設定する |
| IGユーザーID | 秘密ではない | `src/config/notion.ts` と同じ考え方でgit管理下に置く |
| アプリID / app secret | **秘密** | トークン取得時にだけ使う。サイトのビルドには不要なので `.env` に入れなくてよい |

> **トークンをこのチャットに貼らないでください。** `.env` に自分で書き込んでください。
> `.env` は `.gitignore` 済みなので、git に入る心配はありません。

---

## 実装側の設計メモ（STEP 5以降・私の作業）

### 取得する項目

`media_type` は `IMAGE` / `VIDEO` / `CAROUSEL_ALBUM` の3種類。

- 静止画は `media_url`
- **VIDEOは `media_url` が動画ファイルなので、`thumbnail_url`（VIDEOのみ利用可）を使う**
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

- [Instagram API with Facebook Login - Get Started](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/get-started)
- [Generate Long-Lived User and Page Access Tokens](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived/)
- [IG Media reference](https://developers.facebook.com/docs/instagram-platform/reference/instagram-media)
- [Overview of the Instagram API](https://developers.facebook.com/docs/instagram-platform/overview/)
