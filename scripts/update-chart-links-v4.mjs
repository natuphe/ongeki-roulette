import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DATA_URL =
  "https://raw.githubusercontent.com/zvuc/otoge-db/main/ongeki/data/music-ex.json";
const SDVX_BASE_URL = "https://sdvx.in/ongeki/";
const TIMEOUT_MS = 30000;

const currentFile = fileURLToPath(import.meta.url);
const scriptsDirectory = path.dirname(currentFile);
const projectDirectory = path.resolve(scriptsDirectory, "..");
const songsFile = path.join(projectDirectory, "src", "data", "songs.json");
const unmatchedFile = path.join(projectDirectory, "chart-links-unmatched.txt");

const chartLinkKeys = {
  EXPERT: "lev_exc_chart_link",
  MASTER: "lev_mas_chart_link",
  LUNATIC: "lev_lnt_chart_link",
};

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[！!]/g, "!")
    .replace(/[：:]/g, ":")
    .replace(/[・･]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function findTitle(record) {
  const keys = [
    "title",
    "name",
    "musicName",
    "music_name",
    "songName",
    "song_name",
  ];

  for (const key of keys) {
    if (typeof record?.[key] === "string" && record[key].trim()) {
      return record[key].trim();
    }
  }

  return null;
}

function makeChartUrl(relativePath) {
  const value = String(relativePath ?? "").trim();
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    return value.replace(/^http:/i, "https:");
  }

  const withoutLeadingSlash = value.replace(/^\/+/, "");
  const withExtension = /\.htm(?:$|[?#])/i.test(withoutLeadingSlash)
    ? withoutLeadingSlash
    : `${withoutLeadingSlash}.htm`;

  return new URL(withExtension, SDVX_BASE_URL).href;
}

async function fetchDatabase() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    console.log(`取得中: ${DATA_URL}`);
    const response = await fetch(DATA_URL, {
      signal: controller.signal,
      headers: { "User-Agent": "OngekiRoulette/4.0" },
    });

    if (!response.ok) {
      throw new Error(`データ取得失敗: HTTP ${response.status}`);
    }

    const text = await response.text();
    console.log(`取得完了: ${(text.length / 1024 / 1024).toFixed(1)} MB`);
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

function buildLinkMap(database) {
  if (!Array.isArray(database)) {
    throw new Error("OTOGE DBのデータ形式が配列ではありません");
  }

  const linkMap = new Map();
  let recordsWithLinks = 0;

  for (const record of database) {
    const title = findTitle(record);
    if (!title) continue;

    let hasLink = false;

    for (const [difficulty, key] of Object.entries(chartLinkKeys)) {
      const chartUrl = makeChartUrl(record[key]);
      if (!chartUrl) continue;

      linkMap.set(`${normalize(title)}::${difficulty}`, chartUrl);
      hasLink = true;
    }

    if (hasLink) recordsWithLinks += 1;
  }

  return { linkMap, recordsWithLinks };
}

async function main() {
  console.log("1/4 OTOGE DBデータを取得します");
  const database = await fetchDatabase();

  console.log("2/4 chart_link項目からURLを作成します");
  const { linkMap, recordsWithLinks } = buildLinkMap(database);
  console.log(
    `全楽曲: ${database.length}件 / リンク保有曲: ${recordsWithLinks}件 / 譜面リンク: ${linkMap.size}件`
  );

  console.log("3/4 ルーレットの譜面と照合します");
  const songs = JSON.parse(await readFile(songsFile, "utf8"));
  let matched = 0;
  const unmatched = [];

  const updated = songs.map((song) => {
    const difficulty = String(song.difficulty).toUpperCase();
    const key = `${normalize(song.title)}::${difficulty}`;
    const chartUrl = linkMap.get(key);

    if (chartUrl) {
      matched += 1;
      return { ...song, chartUrl };
    }

    const { chartUrl: _oldChartUrl, ...withoutLink } = song;
    unmatched.push(`${song.title} [${difficulty}]`);
    return withoutLink;
  });

  console.log("4/4 songs.jsonと未登録一覧を保存します");
  await writeFile(songsFile, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  await writeFile(unmatchedFile, `${unmatched.join("\n")}\n`, "utf8");

  const rate = songs.length ? (matched / songs.length) * 100 : 0;

  console.log("");
  console.log(`登録完了: ${matched}/${songs.length}譜面 (${rate.toFixed(1)}%)`);
  console.log(`未登録: ${unmatched.length}譜面`);
  console.log(`未登録一覧: ${unmatchedFile}`);

  const checks = [
    ["Recollect Lines", "MASTER"],
    ["天狗の落とし文 feat. ytr", "MASTER"],
    ["天狗の落とし文 feat. ytr", "LUNATIC"],
  ];

  console.log("");
  console.log("代表リンク確認:");
  for (const [title, difficulty] of checks) {
    const url = linkMap.get(`${normalize(title)}::${difficulty}`);
    console.log(`${title} [${difficulty}]: ${url ?? "未検出"}`);
  }

  if (rate < 70) {
    console.warn("");
    console.warn("注意: 登録率が70%未満です。GitHubへ反映する前に確認してください。");
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error("");
  console.error(`処理失敗: ${error.message}`);
  process.exitCode = 1;
});
