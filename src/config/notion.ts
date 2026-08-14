// NotionのデータベースIDをまとめた設定ファイル。
//
// データベースIDは秘密情報ではないため、あえてgit管理下のここに直接書いている。
// （DBを読むにはAPIトークンとインテグレーションの接続の両方が必要で、
//   トークンが漏れれば /v1/search でIDは列挙できる＝隠しても防御にならない）
// .env に置く秘密情報は NOTION_API_KEY だけ。
//
// この方針により、複数のMacで開発してもIDの食い違いが起きない。
// Notion側にDBを追加したときは、ここへ定数を1つ追記すればgit経由で共有される。

// 実績DB（Notion上の名称は HP_Projects）
// getProjects() が公開レコードを実施時期の降順で取得し、実績一覧・実績詳細ページに使う
export const projectsDatabaseId = "5556c055-b6b6-4e35-b70b-8d9e8a432059";

// 活動記録DB（HP_Journal）
// getJournalEntries() が公開レコードを日付の降順で取得し、Journalの各エントリに使う
export const journalDatabaseId = "21bc13ea-d3c8-4e8d-a238-1a0bd587a505";

// 活動カテゴリDB（HP_Works）
// getWorkCategories() が公開レコードを並び順の昇順で取得し、
// トップの活動カテゴリカードとカテゴリページ（/works/[slug]）の中身に使う
export const worksDatabaseId = "d245a52a-5950-44f0-aabe-22173e1efc1c";

// サイトコンテンツDB（HP_Contents）
// getSiteContents() が「用途」をキーにキービジュアル・スナップ写真・About本文を、
// getBackgroundItems() が用途 = background の経歴レコードを取得する
export const contentsDatabaseId = "25569558-d1d3-4630-b511-6ed84f9dc35c";
