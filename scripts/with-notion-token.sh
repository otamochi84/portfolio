#!/bin/zsh
# Notionのトークンを、このコマンドのプロセスにだけ渡して実行するラッパー。
#
# トークンはこのファイルにもリポジトリにも書かない。macOS Keychain から実行直前に取り出す。
# シェル全体やClaude Codeのプロセスに環境変数を渡さないのが目的
# （渡すと、そこから起動するすべての子プロセスがトークンを読めてしまうため）。
#
# 使い方: ./scripts/with-notion-token.sh astro build

set -euo pipefail

# Cloudflare Pages のビルド環境では、NOTION_API_KEY がシークレットとして既に渡されている。
# かつ security コマンドが存在しない（Linuxコンテナのため）。
# よって「すでに値がある場合は Keychain を見ない」。ここを外すと本番ビルドが落ちる。
if [ -z "${NOTION_API_KEY:-}" ]; then
  if [ ! -x /usr/bin/security ]; then
    echo "エラー: NOTION_API_KEY が未設定で、Keychain も利用できません。" >&2
    exit 1
  fi

  if ! NOTION_API_KEY="$(/usr/bin/security find-generic-password -a "$USER" -s "otamochi-portfolio-notion" -w 2>/dev/null)"; then
    echo "エラー: Keychain に 'otamochi-portfolio-notion' が見つかりません。" >&2
    echo "" >&2
    echo "次のコマンドで登録してください（入力欄に貼り付け。コマンド履歴には残りません）:" >&2
    echo '  security add-generic-password -U -a "$USER" -s "otamochi-portfolio-notion" -w' >&2
    exit 1
  fi
  export NOTION_API_KEY
fi

exec npx "$@"
