import { Client } from "@notionhq/client";
import fs from "node:fs/promises";
import path from "node:path";

// Notion APIクライアント初期化
const notion = new Client({ auth: import.meta.env.NOTION_API_KEY });
const databaseId = import.meta.env.NOTION_DATABASE_ID;

// WorkItem の型定義
export type WorkItem = {
  id: string;
  slug: string | null; // スラッグ未設定ならnull
  title: string;
  client: string;
  category: string;
  overview: string;
  tools: string[];
  thumbnail: string; // ローカルパス(/notion-images/...)
  externalUrl: string | null;
  date: string | null; // ISO文字列
};

// Notionブロック用の型定義
export type NotionBlock = {
  id: string;
  type: string;
  [key: string]: any;
};

/**
 * ブックマークカード表示用に対象ページのOGP情報を取得（失敗時はnull）
 */
export type OgpData = { title: string | null; description: string | null };

/**
 * OGP情報を取得する関数
 * @param url 対象URL
 * @returns OGPデータ（失敗時はnull）
 */
export async function fetchOgpData(url: string): Promise<OgpData | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // og:title を取得、なければ <title> から取得
    let title: string | null = null;
    const ogTitleMatch = html.match(
      /<meta\s+(?:property="og:title"|name="og:title"|property="og:title"[^>]*content="([^"]*)"[^>]*|[^>]*property="og:title"[^>]*content="([^"]*)")/i
    );
    if (ogTitleMatch) {
      // より柔軟な正規表現
      const contentMatch = html.match(
        /<meta\s+[^>]*property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']*)["']/i
      );
      if (contentMatch) {
        title = contentMatch[1];
      }
    }

    if (!title) {
      const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleTagMatch) {
        title = titleTagMatch[1];
      }
    }

    // og:description を取得、なければ meta name="description" から取得
    let description: string | null = null;
    const ogDescMatch = html.match(
      /<meta\s+[^>]*property\s*=\s*["']og:description["'][^>]*content\s*=\s*["']([^"']*)["']/i
    );
    if (ogDescMatch) {
      description = ogDescMatch[1];
    }

    if (!description) {
      const descMatch = html.match(
        /<meta\s+[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']*)["']/i
      );
      if (descMatch) {
        description = descMatch[1];
      }
    }

    // HTMLエンティティをデコード
    const decodeEntities = (str: string): string => {
      const entities: { [key: string]: string } = {
        "&amp;": "&",
        "&quot;": '"',
        "&#39;": "'",
        "&lt;": "<",
        "&gt;": ">",
      };
      let result = str;
      for (const [entity, char] of Object.entries(entities)) {
        result = result.replace(new RegExp(entity, "g"), char);
      }
      return result;
    };

    return {
      title: title ? decodeEntities(title) : null,
      description: description ? decodeEntities(description) : null,
    };
  } catch (e) {
    console.error("OGP fetch error:", e);
    return null;
  }
}

/**
 * 画像をダウンロードしてローカル化する関数
 * @param url ダウンロード対象のURL
 * @param fileName ファイル名（拡張子含む）
 * @returns ローカルパス（/notion-images/{fileName}）またはエラー時は元のurl
 */
export async function downloadImage(
  url: string,
  fileName: string
): Promise<string> {
  try {
    const isProd = import.meta.env.PROD;
    const publicImagesDir = path.join(process.cwd(), "public", "notion-images");

    // ディレクトリを作成
    await fs.mkdir(publicImagesDir, { recursive: true });

    // public フォルダに保存
    const filePathPublic = path.join(publicImagesDir, fileName);
    const imgRes = await fetch(url);
    if (!imgRes.ok) {
      console.error("Failed to fetch image:", imgRes.statusText);
      return url; // フォールバック
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePathPublic, buffer);

    // 本番ビルド時は dist フォルダにも保存
    if (isProd) {
      const distImagesDir = path.join(process.cwd(), "dist", "notion-images");
      await fs.mkdir(distImagesDir, { recursive: true });
      const filePathDist = path.join(distImagesDir, fileName);
      await fs.writeFile(filePathDist, buffer);
    }

    return `/notion-images/${fileName}`;
  } catch (e) {
    console.error("Image download error:", e);
    return url; // フォールバック
  }
}

/**
 * 公開状態の実績を取得
 * @returns 公開かつ実施時期でソートされたWorkItem配列
 */
export async function getWorks(): Promise<WorkItem[]> {
  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: "公開",
        checkbox: {
          equals: true,
        },
      },
      sorts: [
        {
          property: "実施時期",
          direction: "descending",
        },
      ],
    });

    const works = await Promise.all(
      response.results.map(async (page: any) => {
        const props = page.properties;

        // プロパティから値を抽出
        const title = props["案件名"]?.title?.[0]?.plain_text || "名称未設定";
        const client = props["クライアント名"]?.rich_text?.[0]?.plain_text || "";
        const category = props["カテゴリ"]?.select?.name || "";
        const overview = props["概要"]?.rich_text?.[0]?.plain_text || "";
        const tools =
          props["使用ツール"]?.multi_select?.map((t: any) => t.name) || [];

        // スラッグの取得（rich_text）
        const slugRichText = props["スラッグ"]?.rich_text;
        const slug =
          slugRichText && slugRichText.length > 0
            ? slugRichText[0].plain_text || null
            : null;

        // 外部リンクの取得
        const externalUrl = props["外部リンク"]?.url || null;

        // 実施時期の取得（日付のstart値）
        const dateObject = props["実施時期"]?.date;
        const date =
          dateObject && dateObject.start ? dateObject.start : null;

        // サムネイル画像の処理
        const thumbnailFile = props["サムネイル"]?.files?.[0];
        let thumbnail = "https://picsum.photos/seed/notion/800/800"; // デフォルト画像
        if (thumbnailFile) {
          const fileUrl = thumbnailFile.file?.url || thumbnailFile.external?.url;
          if (fileUrl) {
            try {
              // URLから拡張子を取得
              const urlObj = new URL(fileUrl);
              let ext = path.extname(urlObj.pathname);
              if (!ext) ext = ".png"; // デフォルト

              const fileName = `${page.id}${ext}`;
              thumbnail = await downloadImage(fileUrl, fileName);
            } catch (e) {
              console.error("Thumbnail processing error:", e);
              thumbnail = fileUrl; // フォールバック
            }
          }
        }

        return {
          id: page.id,
          slug,
          title,
          client,
          category,
          overview,
          tools,
          thumbnail,
          externalUrl,
          date,
        };
      })
    );

    return works;
  } catch (err) {
    console.error("Notion API Error (getWorks):", err);
    return [];
  }
}

/**
 * ページのブロック子要素を再帰的に取得
 * @param pageId ページID
 * @returns ブロック配列（子ブロックは children プロパティに格納）
 */
export async function getPageBlocks(pageId: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  try {
    // has_more がfalseになるまでページネーション取得
    while (true) {
      const response = await notion.blocks.children.list({
        block_id: pageId,
        start_cursor: cursor,
        page_size: 100,
      });

      for (const block of response.results) {
        const blockWithId = block as any;

        // image タイプのブロックはURLをローカル化
        if (blockWithId.type === "image") {
          const imageBlock = blockWithId.image;
          const fileUrl =
            imageBlock?.file?.url || imageBlock?.external?.url;

          if (fileUrl) {
            try {
              const urlObj = new URL(fileUrl);
              let ext = path.extname(urlObj.pathname);
              if (!ext) ext = ".png";

              const fileName = `${blockWithId.id}${ext}`;
              const localPath = await downloadImage(fileUrl, fileName);
              blockWithId.localImagePath = localPath;
            } catch (e) {
              console.error("Image block processing error:", e);
              // localImagePath を設定しない場合は元URLを使用
            }
          }
        }

        // bookmark タイプのブロックはOGP情報を取得
        if (blockWithId.type === "bookmark") {
          const bookmarkBlock = blockWithId.bookmark;
          const bookmarkUrl = bookmarkBlock?.url;

          if (bookmarkUrl) {
            const ogpData = await fetchOgpData(bookmarkUrl);
            blockWithId.ogpData = ogpData;
          }
        }

        // has_children = true なら子を1階層再帰取得
        if (blockWithId.has_children) {
          const children = await getPageBlocks(blockWithId.id);
          blockWithId.children = children;
        }

        blocks.push(blockWithId);
      }

      // ページネーション判定
      if (!response.has_more) break;
      cursor = response.next_cursor || undefined;
    }

    return blocks;
  } catch (err) {
    console.error("Notion API Error (getPageBlocks):", err);
    return [];
  }
}

// Journal の型定義
export type JournalEntry = {
  id: string;
  slug: string; // 日付から自動生成（YYYY-MM-DD または YYYY-MM-DD-2 等）
  title: string;
  category: string;
  date: string; // ISO文字列
};

/**
 * 公開状態の活動記録を取得
 * @returns 公開かつ日付でソートされたJournalEntry配列
 */
export async function getJournalEntries(): Promise<JournalEntry[]> {
  try {
    const journalDatabaseId = import.meta.env.NOTION_JOURNAL_DB_ID;

    const response = await notion.databases.query({
      database_id: journalDatabaseId,
      filter: {
        property: "公開",
        checkbox: {
          equals: true,
        },
      },
      sorts: [
        {
          property: "日付",
          direction: "descending",
        },
      ],
    });

    // 日付が入力されているエントリのみを処理
    const entriesWithDate = response.results
      .map((page: any) => {
        const props = page.properties;
        const dateObject = props["日付"]?.date;

        // 日付がない場合はスキップ
        if (!dateObject || !dateObject.start) {
          return null;
        }

        const title = props["タイトル"]?.title?.[0]?.plain_text || "名称未設定";
        const category = props["カテゴリ"]?.select?.name || "";
        const date = dateObject.start;

        return {
          id: page.id,
          title,
          category,
          date,
        };
      })
      .filter((entry) => entry !== null) as Array<Omit<JournalEntry, "slug">>;

    // スラッグを自動生成（同じ日付の場合は -2, -3 を付ける）
    const slugMap = new Map<string, number>();
    const entries: JournalEntry[] = entriesWithDate.map((entry) => {
      const dateStr = entry.date.split("T")[0]; // YYYY-MM-DD
      const count = (slugMap.get(dateStr) || 0) + 1;
      slugMap.set(dateStr, count);

      const slug = count === 1 ? dateStr : `${dateStr}-${count}`;

      return {
        ...entry,
        slug,
      };
    });

    return entries;
  } catch (err) {
    console.error("Notion API Error (getJournalEntries):", err);
    return [];
  }
}
