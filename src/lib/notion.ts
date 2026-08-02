import { Client } from "@notionhq/client";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Notion APIクライアント初期化
const notion = new Client({ auth: import.meta.env.NOTION_API_KEY });
const databaseId = import.meta.env.NOTION_DATABASE_ID;

// --- 画像最適化の設定 ---
// 長辺の上限。各用途の最大表示幅の2倍（Retina想定）を満たす値にしている
//   キービジュアル(.hero-kv-wrap)      : 880px  → 1760px
//   スナップ写真(.about-grid 右カラム) : 928px  → 1856px ← 最大
//   Worksサムネイル(.gallery-item)     : 768px  → 1536px
const maxImageSize = 1920;

// WebPの品質。写真の劣化が目視でわからない範囲に収めるため高めに取る
const webpQuality = 88;

// sharpで安全に再エンコードできる形式。
// アニメーションGIFはコマ落ち、SVGはラスタライズで劣化するため対象から外す
const optimizableFormats = ["jpeg", "png", "webp", "avif", "tiff"];

/**
 * 画像を表示サイズに見合ったサイズ・形式へ最適化する
 * @param buffer 元画像のバッファ
 * @param fileName 元のファイル名（拡張子含む）
 * @returns 最適化後のバッファとファイル名（最適化しない場合は引数のまま返す）
 */
async function optimizeImage(
  buffer: Buffer,
  fileName: string
): Promise<{ buffer: Buffer; fileName: string }> {
  try {
    const metadata = await sharp(buffer).metadata();

    // 再エンコードで壊れる形式はそのまま保存する
    if (!metadata.format || !optimizableFormats.includes(metadata.format)) {
      return { buffer, fileName };
    }

    // withoutEnlargement で「上限より小さい画像は拡大しない」を担保する
    // （引き伸ばすと画質が落ちるため、縮小方向のみ効かせる）
    const optimized = await sharp(buffer)
      .resize({
        width: maxImageSize,
        height: maxImageSize,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: webpQuality })
      .toBuffer();

    // 変換してかえって重くなる画像（すでに軽量な小さい画像など）は元のまま使う
    if (optimized.length >= buffer.length) {
      return { buffer, fileName };
    }

    // 拡張子をWebPに差し替える
    const webpFileName = `${fileName.replace(/\.[^.]+$/, "")}.webp`;
    return { buffer: optimized, fileName: webpFileName };
  } catch (e) {
    // 最適化に失敗してもサイトの表示は止めない。元の画像をそのまま使う
    console.error("Image optimize error:", e);
    return { buffer, fileName };
  }
}

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
 * 画像をダウンロードし、最適化してローカル化する関数
 * @param url ダウンロード対象のURL
 * @param fileName ファイル名（拡張子含む。WebP変換時は拡張子が .webp に変わる）
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

    const imgRes = await fetch(url);
    if (!imgRes.ok) {
      console.error("Failed to fetch image:", imgRes.statusText);
      return url; // フォールバック
    }

    const arrayBuffer = await imgRes.arrayBuffer();

    // 表示サイズに見合うリサイズ・WebP変換を通す（拡張子が変わりうるので名前も受け取る）
    const { buffer, fileName: outputFileName } = await optimizeImage(
      Buffer.from(arrayBuffer),
      fileName
    );

    // public フォルダに保存
    const filePathPublic = path.join(publicImagesDir, outputFileName);
    await fs.writeFile(filePathPublic, buffer);

    // 本番ビルド時は dist フォルダにも保存
    if (isProd) {
      const distImagesDir = path.join(process.cwd(), "dist", "notion-images");
      await fs.mkdir(distImagesDir, { recursive: true });
      const filePathDist = path.join(distImagesDir, outputFileName);
      await fs.writeFile(filePathDist, buffer);
    }

    return `/notion-images/${outputFileName}`;
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

// サイト内の差し替えコンテンツ（キービジュアル・スナップ写真・About本文）の型定義
export type SiteContent = {
  images: string[]; // ローカルパス(/notion-images/...)の配列
  imageAlt: string;
  text: string; // 改行(\n)を含む本文
};

// 「用途」の値をキーにしたコンテンツの集合
export type SiteContents = Record<string, SiteContent>;

/**
 * サイトコンテンツを用途キーで取り出す（未登録なら空の値を返す）
 * @param contents getSiteContents() の戻り値
 * @param usage 「用途」の値（hero-kv / about-photo / about-en / about-jp）
 * @returns 該当するSiteContent（無ければ空のSiteContent）
 */
export function pickSiteContent(
  contents: SiteContents,
  usage: string
): SiteContent {
  return contents[usage] || { images: [], imageAlt: "", text: "" };
}

/**
 * 公開状態のサイトコンテンツを取得
 * @returns 「用途」をキーにしたSiteContentの連想配列（取得失敗時は空オブジェクト）
 */
export async function getSiteContents(): Promise<SiteContents> {
  try {
    const contentsDatabaseId = import.meta.env.NOTION_CONTENTS_DB_ID;

    const response = await notion.databases.query({
      database_id: contentsDatabaseId,
      filter: {
        property: "公開",
        checkbox: {
          equals: true,
        },
      },
    });

    const contents: SiteContents = {};

    for (const page of response.results as any[]) {
      const props = page.properties;

      // 「用途」が未設定のレコードはキーにできないためスキップ
      const usage = props["用途"]?.select?.name;
      if (!usage) continue;

      // rich_textは装飾の切れ目で分割されるため、連結して元の文字列（改行込み）に戻す
      const text = (props["本文"]?.rich_text || [])
        .map((t: any) => t.plain_text)
        .join("");
      const imageAlt = (props["代替テキスト"]?.rich_text || [])
        .map((t: any) => t.plain_text)
        .join("");

      // NotionのファイルURLは期限切れするため、全枚数をビルド時にローカル化する
      const files = props["画像"]?.files || [];
      const images: string[] = [];
      for (const [index, file] of files.entries()) {
        const fileUrl = file.file?.url || file.external?.url;
        if (!fileUrl) continue;

        try {
          // URLから拡張子を取得
          const urlObj = new URL(fileUrl);
          let ext = path.extname(urlObj.pathname);
          if (!ext) ext = ".png"; // デフォルト

          const fileName = `${page.id}-${index}${ext}`;
          images.push(await downloadImage(fileUrl, fileName));
        } catch (e) {
          console.error("Site content image processing error:", e);
          images.push(fileUrl); // フォールバック
        }
      }

      contents[usage] = { images, imageAlt, text };
    }

    return contents;
  } catch (err) {
    console.error("Notion API Error (getSiteContents):", err);
    return {};
  }
}

// 経歴（Background）1件分の型定義
export type BackgroundItem = {
  year: string; // 表示用にNotionの入力をそのまま持つ
  en: string;
  jp: string;
};

/**
 * 公開状態の経歴（用途 = background）を取得
 *
 * 用途が1対1になっている他のスロットと違い background は複数レコードあるため、
 * getSiteContents()（用途をキーにした連想配列）とは分けて配列で取得する。
 * こうすることで既存スロットの取得処理には手を入れずに済む。
 *
 * @returns 年の昇順に並べたBackgroundItem配列（取得失敗時は空配列）
 */
export async function getBackgroundItems(): Promise<BackgroundItem[]> {
  try {
    const contentsDatabaseId = import.meta.env.NOTION_CONTENTS_DB_ID;

    const response = await notion.databases.query({
      database_id: contentsDatabaseId,
      filter: {
        and: [
          { property: "公開", checkbox: { equals: true } },
          { property: "用途", select: { equals: "background" } },
        ],
      },
    });

    const items: BackgroundItem[] = [];

    for (const page of response.results as any[]) {
      const props = page.properties;

      // rich_textは装飾の切れ目で分割されるため、連結して元の文字列（改行込み）に戻す
      const text = (props["本文"]?.rich_text || [])
        .map((t: any) => t.plain_text)
        .join("");

      // 本文は「1行目=年 / 2行目=英文 / 3行目=和文」の3行構成
      const lines = text.split("\n").map((line: string) => line.trim());
      if (lines.length < 3) {
        console.error("Background skipped (3行未満):", page.id);
        continue;
      }

      const [year, en, jp] = lines;

      // 年が数値でないものは並べ替えできないためスキップする
      if (!/^\d+$/.test(year)) {
        console.error("Background skipped (年が数値でない):", page.id);
        continue;
      }

      items.push({ year, en, jp });
    }

    // Notionのレコード順に依存せず、常に年の昇順で表示する
    items.sort((a, b) => Number(a.year) - Number(b.year));

    return items;
  } catch (err) {
    console.error("Notion API Error (getBackgroundItems):", err);
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
