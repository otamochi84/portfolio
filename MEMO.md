# プロジェクト開発メモ

## 1. 現在のステータス
*   **GitHubリポジトリ**: `git@github.com:otamochi84/portfolio.git`
*   **公開先 (Cloudflare Pages)**: 独自ドメイン設定中（`otamochi.com` など）
*   **SSH接続**: 設定済み（PCからパスワードなしでプッシュ可能）

## 2. 日々の更新手順（ファイルの変更を反映させる）
PCでHTMLやCSSを編集したら、ターミナルで以下の3行を実行するだけでHPが更新されます。

```bash
git add .
git commit -m "ここに変更内容を書く（例：自己紹介を更新）"
git push
```

## 3. 画像の差し替え方法
1.  載せたい画像を `otamochi-portfolio` フォルダ内の適切な場所（例：新しい `img` フォルダなど）に置く。
2.  `js/main.js` の `portfolioConfig` 内の設定を書き換える。
3.  上記 2. の手順でGitHubに送る。

## 4. 困った時の確認コマンド
*   接続確認: `ssh -T git@github.com`
*   現在の状態確認: `git status`
