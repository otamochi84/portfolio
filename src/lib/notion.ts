import { Client } from "@notionhq/client";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  projectsDatabaseId,
  journalDatabaseId,
  worksDatabaseId,
  contentsDatabaseId,
} from "../config/notion";

// Notion APIクライアント初期化
const notion = new Client({ auth: import.meta.env.NOTION_API_KEY });

// --- 画像最適化の設定 ---
// 長辺の上限。各用途の最大表示幅の2倍（Retina想定）を満たす値にしている
//   キービジュアル(.hero-kv-wrap)      : 880px  → 1760px
//   スナップ写真(.about-grid 右カラム) : 928px  → 1856px ← 最大
//   Worksカテゴリカード(.wcard-image)  : 下の cardImageSizes でsrcset対応するため、ここでは上限のみ効く
const maxImageSize = 1920;

// Worksカードのsrcset用に追加生成する縮小版の長辺（幅の昇順で持つ）。
//   1200px : PCの3列表示（カード実表示幅は最大でも約554px）のRetina相当
//    800px : モバイル1列（表示幅約318px）のRetina相当。これが無いとモバイルでも1200版が選ばれてしまう
// アップされた画像そのもの（フルサイズ版）は縮小せず残す方針は変えない
const cardImageSizes = [800, 1200];

// 縮小版を作るかどうかのしきい値。
// 縮小後の幅がフルサイズ幅のこの割合以上なら作らない。
// 例: 1222pxの画像に1200px版を作っても容量は5%しか減らず、
// ファイルを1枚増やすコストに見合う削減量がないため
const cardImageShrinkRatio = 0.9;

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

// 実績（HP_Projects）1件分の型定義
export type ProjectItem = {
  id: string;
  slug: string | null; // スラッグ未設定ならnull
  title: string;
  client: string;
  category: string;
  overview: string;
  tools: string[];
  thumbnail: string; // ローカルパス(/notion-images/...)。サムネイル未設定なら空文字
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

// --- 画像の差分ダウンロード（マニフェスト） ---
// ビルドのたびに全画像を落とし直すのは無駄なので、Notionの last_edited_time を
// マニフェストに記録しておき、前回から変わっていない画像はダウンロードごとスキップする。
// ファイルのmtimeを見ないのは、時計ずれやファイル操作で簡単に壊れる情報だから。
//
// キャッシュを捨てて全画像を落とし直したいときは public/notion-images/ を手で削除する
// （マニフェストも同じフォルダにあるので一緒に消える）。
// public/notion-images/ は .gitignore 済みなので、本番（Cloudflare Pages）は
// 毎回クリーンな状態から始まり初回は全ダウンロードになる。効くのはローカルの反復ビルド

const publicImagesDir = path.join(process.cwd(), "public", "notion-images");
const distImagesDir = path.join(process.cwd(), "dist", "notion-images");
const manifestPath = path.join(publicImagesDir, ".image-manifest.json");

// マニフェスト1件分。1回のダウンロードで作った出力ファイルをまとめて持つ
// （Worksカード画像は1回のfetchからフルサイズ版と縮小版が生成されるため）
type ManifestEntry = {
  lastEditedTime: string;
  // 出力ファイル。先頭は必ずフルサイズ版。
  // width はsrcsetのw値を復元するための実出力幅（不要・不明なものは null）
  files: { name: string; width: number | null }[];
};

// キーはダウンロード要求時のファイル名（例: {pageId}.png）。
// 出力名は最適化で拡張子が変わりうるため、キーには使えない
type ImageManifest = Record<string, ManifestEntry>;

// 1ビルド中の読み込みは1回だけ。以降はこのオブジェクトを共有して更新する
let manifestPromise: Promise<ImageManifest> | null = null;

// 書き込みが並列に重なるとJSONが壊れるため、直列につないで実行する
let manifestWriteChain: Promise<void> = Promise.resolve();

/**
 * マニフェストを読み込む（1ビルド中は同じオブジェクトを使い回す）
 * @returns マニフェストの中身（未作成・壊れている場合は空オブジェクト）
 */
function loadManifest(): Promise<ImageManifest> {
  if (!manifestPromise) {
    manifestPromise = (async () => {
      try {
        const parsed = JSON.parse(await fs.readFile(manifestPath, "utf-8"));

        // 配列やnullが入っていたら壊れているとみなす
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          return {};
        }
        return parsed as ImageManifest;
      } catch {
        // 未作成・壊れている場合は「キャッシュ無し」＝全ダウンロードにフォールバックする
        return {};
      }
    })();
  }
  return manifestPromise;
}

/**
 * 現在のマニフェストをファイルへ書き戻す
 */
function saveManifest(): Promise<void> {
  manifestWriteChain = manifestWriteChain.then(async () => {
    const manifest = await loadManifest();

    // ビルドごとの並列実行でキー順が揺れないよう、常に名前順で書き出す
    const sorted: ImageManifest = {};
    for (const key of Object.keys(manifest).sort()) {
      sorted[key] = manifest[key];
    }

    try {
      await fs.mkdir(publicImagesDir, { recursive: true });
      await fs.writeFile(manifestPath, JSON.stringify(sorted, null, 2));
    } catch (e) {
      // マニフェストが書けなくても画像自体は出力できているのでビルドは止めない
      console.error("画像マニフェストの保存に失敗しました:", e);
    }
  });
  return manifestWriteChain;
}

/**
 * ダウンロード結果をマニフェストに記録する
 * @param cacheKey ダウンロード要求時のファイル名
 * @param lastEditedTime Notionの last_edited_time（取得できなければ記録しない）
 * @param files 生成した出力ファイル（先頭がフルサイズ版）
 */
async function recordManifestEntry(
  cacheKey: string,
  lastEditedTime: string | undefined,
  files: ManifestEntry["files"]
): Promise<void> {
  // 更新時刻が取れない画像は次回の判定ができないので記録しない（毎回落とし直す）
  if (!lastEditedTime) return;

  const manifest = await loadManifest();
  manifest[cacheKey] = { lastEditedTime, files };
  await saveManifest();
}

// dist側の準備は1ビルド1回だけでよいので結果を使い回す
let distImagesDirPromise: Promise<void> | null = null;

/**
 * dist/notion-images を書き込める状態にする
 *
 * Astroは public を dist へコピーしてから各ページをレンダリングするため、
 * 2回目以降のローカルビルドでは前回のマニフェストまで dist に運ばれてしまう。
 * マニフェストはビルド用のキャッシュであって配信物ではないので取り除く
 */
function prepareDistImagesDir(): Promise<void> {
  if (!distImagesDirPromise) {
    distImagesDirPromise = (async () => {
      await fs.mkdir(distImagesDir, { recursive: true });
      await fs.rm(path.join(distImagesDir, ".image-manifest.json"), {
        force: true,
      });
    })();
  }
  return distImagesDirPromise;
}

/**
 * 画像1枚を public から dist へコピーする（本番ビルド時のみ）
 * @param fileName public/notion-images 配下のファイル名
 */
async function copyImageToDist(fileName: string): Promise<void> {
  if (!import.meta.env.PROD) return;

  await prepareDistImagesDir();
  await fs.copyFile(
    path.join(publicImagesDir, fileName),
    path.join(distImagesDir, fileName)
  );
}

/**
 * マニフェストと突き合わせ、前回のダウンロード結果を再利用できるか判定する
 *
 * last_edited_time はページ（ブロック）のどこを編集しても更新されるため、
 * タイトルだけ直した場合でも画像を落とし直すことになる。
 * 「必要以上に落とす」ことはあっても「必要なのに落とさない」ことは起きない安全側なので許容する
 *
 * @param cacheKey ダウンロード要求時のファイル名
 * @param lastEditedTime 今回のNotionの last_edited_time
 * @returns 再利用できるならマニフェストの記録、できないなら null
 */
async function reuseDownloadedImage(
  cacheKey: string,
  lastEditedTime: string | undefined
): Promise<ManifestEntry | null> {
  if (!lastEditedTime) return null;

  const manifest = await loadManifest();
  const entry = manifest[cacheKey];

  // 記録が無い・更新時刻が変わった・記録が壊れている場合は通常どおりダウンロードする
  if (!entry || entry.lastEditedTime !== lastEditedTime) return null;
  if (!Array.isArray(entry.files) || entry.files.length === 0) return null;

  try {
    for (const file of entry.files) {
      // 記録があっても実ファイルが消えていれば再利用できない
      await fs.access(path.join(publicImagesDir, file.name));

      // dist へのコピーは自前で行う。
      // Astroが public を dist へコピーするタイミングに依存させないため
      // （ダウンロードしないのでネットワークは使わず、ローカルコピーだけで済む）
      await copyImageToDist(file.name);
    }
  } catch {
    return null;
  }

  return entry;
}

/**
 * 画像バッファを public（本番ビルド時は dist にも）へ保存する
 * @param fileName 保存するファイル名（拡張子含む）
 * @param buffer 保存する画像バッファ
 * @returns ローカルパス（/notion-images/{fileName}）
 */
async function saveImageFile(
  fileName: string,
  buffer: Buffer
): Promise<string> {
  await fs.mkdir(publicImagesDir, { recursive: true });
  await fs.writeFile(path.join(publicImagesDir, fileName), buffer);

  // 本番ビルド時は dist フォルダにも保存
  if (import.meta.env.PROD) {
    await prepareDistImagesDir();
    await fs.writeFile(path.join(distImagesDir, fileName), buffer);
  }

  return `/notion-images/${fileName}`;
}

/**
 * 画像をダウンロードし、最適化してローカル化する関数
 * @param url ダウンロード対象のURL
 * @param fileName ファイル名（拡張子含む。WebP変換時は拡張子が .webp に変わる）
 * @param lastEditedTime Notionの last_edited_time（渡すと差分ダウンロードが効く）
 * @returns ローカルパス（/notion-images/{fileName}）。エラー時は空文字
 *
 * エラー時に元のurlを返さないのは、NotionのファイルURLが約1時間で失効し、
 * 静的サイトでは「必ず後で壊れるリンク」になるため。画像を出さないほうがマシという判断
 */
export async function downloadImage(
  url: string,
  fileName: string,
  lastEditedTime?: string
): Promise<string> {
  // 前回から更新されていなければ、ダウンロードも再エンコードもせず前回の出力を使う
  const cached = await reuseDownloadedImage(fileName, lastEditedTime);
  if (cached) return `/notion-images/${cached.files[0].name}`;

  try {
    const imgRes = await fetch(url);
    if (!imgRes.ok) {
      console.error(
        "画像のローカル化に失敗したので表示しません (fetch失敗):",
        imgRes.statusText,
        fileName
      );
      return "";
    }

    const arrayBuffer = await imgRes.arrayBuffer();

    // 表示サイズに見合うリサイズ・WebP変換を通す（拡張子が変わりうるので名前も受け取る）
    const { buffer, fileName: outputFileName } = await optimizeImage(
      Buffer.from(arrayBuffer),
      fileName
    );

    const localPath = await saveImageFile(outputFileName, buffer);
    await recordManifestEntry(fileName, lastEditedTime, [
      { name: outputFileName, width: null },
    ]);

    return localPath;
  } catch (e) {
    console.error("画像のローカル化に失敗したので表示しません:", fileName, e);
    return "";
  }
}

/**
 * 公開状態の実績（HP_Projects）を取得
 * @returns 公開かつ実施時期でソートされたProjectItem配列
 */
export async function getProjects(): Promise<ProjectItem[]> {
  try {
    const response = await notion.databases.query({
      database_id: projectsDatabaseId,
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

    const projects = await Promise.all(
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

        // サムネイル画像の処理（未設定なら空文字。外部のダミー画像には依存しない）
        const thumbnailFile = props["サムネイル"]?.files?.[0];
        let thumbnail = "";
        if (thumbnailFile) {
          const fileUrl = thumbnailFile.file?.url || thumbnailFile.external?.url;
          if (fileUrl) {
            try {
              // URLから拡張子を取得
              const urlObj = new URL(fileUrl);
              let ext = path.extname(urlObj.pathname);
              if (!ext) ext = ".png"; // デフォルト

              const fileName = `${page.id}${ext}`;
              thumbnail = await downloadImage(
                fileUrl,
                fileName,
                page.last_edited_time
              );
            } catch (e) {
              // NotionのファイルURLは失効するのでフォールバックに使わない（空文字＝非表示）
              console.error("サムネイルのローカル化に失敗したので表示しません:", page.id, e);
              thumbnail = "";
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

    return projects;
  } catch (err) {
    console.error("Notion API Error (getProjects):", err);
    return [];
  }
}

// srcset用の画像候補1件分。widthは「実際に出力されたpx」
export type ImageSource = { src: string; width: number };

// Worksカテゴリ（HP_Works）1件分の型定義
export type WorkCategory = {
  id: string;
  slug: string;
  title: string;
  overview: string;
  image: string; // ローカルパス(/notion-images/...)。画像が未登録なら空文字
  // カード画像。srcset用に幅の異なる候補を幅の昇順で持つ（候補が1つ以下ならsrcsetは出さない）
  imageSources: ImageSource[];
};

/**
 * Worksカード用の画像をローカル化する。
 * フルサイズ版（既存どおり）に加えて、srcset用の縮小版（cardImageSizes）を生成する
 *
 * srcsetのw値には「要求した幅」ではなく sharp が返した実際の出力幅を入れる。
 * withoutEnlargement により元画像が要求幅より小さいと縮小されず元の幅のまま返るため、
 * 要求値を書くとブラウザが解像度を誤認して拡大表示し、かえって粗くなるため
 *
 * @param url ダウンロード対象のURL
 * @param fileName ファイル名（拡張子含む）
 * @param lastEditedTime Notionの last_edited_time（渡すと差分ダウンロードが効く）
 * @returns フルサイズのローカルパスとsrcset用の候補配列（ローカル化に失敗したら空文字・空配列）
 */
async function downloadCardImage(
  url: string,
  fileName: string,
  lastEditedTime?: string
): Promise<{ image: string; imageSources: ImageSource[] }> {
  const emptyResult = { image: "", imageSources: [] };

  // 前回から更新されていなければ、フルサイズ版・縮小版をまとめてスキップする。
  // 1回のfetchから作る一式なので、判定も記録もこの単位で行う。
  // srcsetのw値は「実出力幅」でなければならないため、マニフェストに記録した幅から復元する
  const cached = await reuseDownloadedImage(fileName, lastEditedTime);
  if (cached) {
    return {
      image: `/notion-images/${cached.files[0].name}`,
      imageSources: cached.files
        .filter((file) => typeof file.width === "number")
        .map((file) => ({
          src: `/notion-images/${file.name}`,
          width: file.width as number,
        }))
        .sort((a, b) => a.width - b.width),
    };
  }

  try {
    const imgRes = await fetch(url);
    if (!imgRes.ok) {
      console.error(
        "画像のローカル化に失敗したので表示しません (fetch失敗):",
        imgRes.statusText,
        fileName
      );
      return emptyResult;
    }

    const originalBuffer = Buffer.from(await imgRes.arrayBuffer());

    // フルサイズ版は他の画像とまったく同じ扱いで保存する
    const { buffer: fullBuffer, fileName: fullFileName } = await optimizeImage(
      originalBuffer,
      fileName
    );
    const image = await saveImageFile(fullFileName, fullBuffer);
    const fullWidth = (await sharp(fullBuffer).metadata()).width;

    // マニフェストに記録する出力ファイル一覧（先頭はフルサイズ版）
    const manifestFiles: ManifestEntry["files"] = [
      { name: fullFileName, width: fullWidth ?? null },
    ];

    // 幅が取れない形式（SVG等）はsrcsetを組めないのでフルサイズ版だけ返す
    if (!fullWidth) {
      await recordManifestEntry(fileName, lastEditedTime, manifestFiles);
      return { image, imageSources: [] };
    }

    const imageSources: ImageSource[] = [{ src: image, width: fullWidth }];
    // 同じ幅の候補が並ぶとブラウザが選べないため、採用済みの幅を控えておく
    const usedWidths = new Set<number>([fullWidth]);

    for (const size of cardImageSizes) {
      // 縮小版の生成条件は optimizeImage と揃える（長辺基準・拡大しない）
      const resizedBuffer = await sharp(originalBuffer)
        .resize({
          width: size,
          height: size,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: webpQuality })
        .toBuffer();
      const resizedWidth = (await sharp(resizedBuffer).metadata()).width;

      // 幅が取れない・ほとんど縮まらない（＝作る価値がない）ものは捨てる。
      // 元画像が小さくて縮小されなかったケースもここで弾かれる
      if (!resizedWidth || resizedWidth >= fullWidth * cardImageShrinkRatio) {
        continue;
      }

      // 縮小版どうしで幅が並んだ場合も、重複した候補は作らない
      if (usedWidths.has(resizedWidth)) continue;

      // ファイル名は要求サイズ。縦長画像では実出力幅と一致しないが、
      // ブラウザが見るのはsrcsetのw値（＝実出力幅）なので表示には影響しない
      const resizedFileName = `${fileName.replace(/\.[^.]+$/, "")}-${size}.webp`;
      const resizedPath = await saveImageFile(resizedFileName, resizedBuffer);

      imageSources.push({ src: resizedPath, width: resizedWidth });
      manifestFiles.push({ name: resizedFileName, width: resizedWidth });
      usedWidths.add(resizedWidth);
    }

    // ブラウザが読みやすいよう幅の昇順に並べる
    imageSources.sort((a, b) => a.width - b.width);

    await recordManifestEntry(fileName, lastEditedTime, manifestFiles);

    return { image, imageSources };
  } catch (e) {
    // NotionのファイルURLは失効するのでフォールバックに使わない（空文字＝非表示）
    console.error("画像のローカル化に失敗したので表示しません:", fileName, e);
    return emptyResult;
  }
}

/**
 * 公開状態のWorksカテゴリを取得
 *
 * トップの3カードとカテゴリページ（/works/[slug]）の両方がこの関数を使う。
 * 各レコードのページ本文がカテゴリページの中身になるため、idも返している。
 *
 * @returns 並び順の昇順に並べたWorkCategory配列（取得失敗時は空配列）
 */
export async function getWorkCategories(): Promise<WorkCategory[]> {
  try {
    const response = await notion.databases.query({
      database_id: worksDatabaseId,
      filter: {
        property: "公開",
        checkbox: {
          equals: true,
        },
      },
      sorts: [
        {
          property: "並び順",
          direction: "ascending",
        },
      ],
    });

    const categories: WorkCategory[] = [];

    for (const page of response.results as any[]) {
      const props = page.properties;

      const title = props["名前"]?.title?.[0]?.plain_text || "名称未設定";

      // rich_textは装飾の切れ目で分割されるため、連結して元の文字列に戻す
      const slug = (props["スラッグ"]?.rich_text || [])
        .map((t: any) => t.plain_text)
        .join("");
      const overview = (props["概要"]?.rich_text || [])
        .map((t: any) => t.plain_text)
        .join("");

      // スラッグが無いとページのURLを決められないためスキップする
      if (!slug) {
        console.error("WorkCategory skipped (スラッグ未設定):", page.id);
        continue;
      }

      // NotionのファイルURLは期限切れするため、ビルド時にローカル化する。
      // 画像は1枚だけ使う。未登録のときは空文字のままにし、表示側のプレースホルダに任せる
      // （カードは表示幅に対して画像が過大になりやすいので、srcset用の縮小版も併せて作る）
      let image = "";
      let imageSources: ImageSource[] = [];
      const imageFile = props["画像"]?.files?.[0];
      if (imageFile) {
        const fileUrl = imageFile.file?.url || imageFile.external?.url;
        if (fileUrl) {
          try {
            // URLから拡張子を取得
            const urlObj = new URL(fileUrl);
            let ext = path.extname(urlObj.pathname);
            if (!ext) ext = ".png"; // デフォルト

            const result = await downloadCardImage(
              fileUrl,
              `${page.id}${ext}`,
              page.last_edited_time
            );
            image = result.image;
            imageSources = result.imageSources;
          } catch (e) {
            // NotionのファイルURLは失効するのでフォールバックに使わない（空文字＝非表示）
            console.error("カテゴリ画像のローカル化に失敗したので表示しません:", page.id, e);
            image = "";
            imageSources = [];
          }
        }
      }

      categories.push({ id: page.id, slug, title, overview, image, imageSources });
    }

    return categories;
  } catch (err) {
    console.error("Notion API Error (getWorkCategories):", err);
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
              // 本文画像は last_edited_time をブロック単位で持っているのでそれを使う
              const localPath = await downloadImage(
                fileUrl,
                fileName,
                blockWithId.last_edited_time
              );
              blockWithId.localImagePath = localPath;
            } catch (e) {
              // localImagePath が未設定のときの扱いは NotionBlocks 側に任せる
              // （外部URLならそれを使い、NotionのファイルURLなら失効するので表示しない）
              console.error("本文画像のローカル化に失敗しました:", blockWithId.id, e);
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

          // 1ページに複数枚あるため、差分判定はファイル名（＝index込み）単位で行う
          const fileName = `${page.id}-${index}${ext}`;
          // ローカル化に失敗すると空文字が返る。<img src=""> を出さないよう、その場合はpushしない
          const localPath = await downloadImage(
            fileUrl,
            fileName,
            page.last_edited_time
          );
          if (localPath) images.push(localPath);
        } catch (e) {
          // NotionのファイルURLは失効するのでフォールバックに使わない（pushせず欠番にする）
          console.error("サイト内画像のローカル化に失敗したので表示しません:", page.id, index, e);
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
