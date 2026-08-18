#!/bin/zsh
# Cloudflare Pages のデプロイ履歴を表示する。
# 「サイトがいつ、何をきっかけに公開されたか」を確認するために使う。
#
# Notionの中身を変えただけではサイトは更新されず、ビルドが走ったときだけ反映される。
# その記録はgitに残らないため（コミットが増えないため）、ここで確認する。
#
# 使い方: ./scripts/deploy-log.sh [表示件数]

set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "エラー: .env が見つかりません（$(pwd)）" >&2
  exit 1
fi

set -a
source .env
set +a

: "${CLOUDFLARE_API_TOKEN:?.env に CLOUDFLARE_API_TOKEN がありません}"
: "${CLOUDFLARE_ACCOUNT_ID:?.env に CLOUDFLARE_ACCOUNT_ID がありません}"
: "${CLOUDFLARE_PAGES_PROJECT:?.env に CLOUDFLARE_PAGES_PROJECT がありません}"

limit="${1:-15}"

curl -sS "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/pages/projects/${CLOUDFLARE_PAGES_PROJECT}/deployments?per_page=${limit}" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  | jq -r '
      if .success then
        .result[]
        | [ (.created_on | sub("\\..*";"Z") | fromdate | strflocaltime("%m/%d %H:%M")),
            (if .environment == "production" then "本番" else "確認用" end),
            (if .deployment_trigger.type == "deploy_hook" then "Notionのボタン" else "git push" end),
            (if .latest_stage.status == "success" then "成功" else .latest_stage.status end),
            (.deployment_trigger.metadata.branch // "-")
          ] | @tsv
      else
        "エラー: \(.errors[0].message // "不明")" | halt_error(1)
      end' \
  | column -t -s "$(printf '\t')"
