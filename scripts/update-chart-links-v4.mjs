import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ARCHIVE_JSON = "https://sdvx.in/ongeki/_/json/";
const VIEWER_URL = "https://sdvx.in/ongeki/_/viewer.php";
const TIMEOUT_MS = 30000;

const currentFile = fileURLToPath(import.meta.url);
const scriptsDirectory = path.dirname(currentFile);
const projectDirectory = path.resolve(scriptsDirectory, "..");
const songsFile = path.join(projectDirectory, "src", "data", "songs.json");
const unmatchedFile = path.join(projectDirectory, "chart-links-unmatched.txt");

const difficultyParam = {
  ADVANCED: "adv",
  EXPERT: "exp",
  MASTER: "mst",
  LUNATIC: "rem",
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

function chartAvailable(level) {
  const value = String(level ?? "").trim();
  if (!value || value === "_" || value === "0" || value === "-") return false;
  return !value.includes("_");
}

function viewerUrl(id, diff) {
  const params = new URLSearchParams({
    id: String(id),
    diff,
  });
  return `${VIEWER_URL}?${params.toString()}`;
}

function legacyId(url) {
  const match = String(url ?? "").match(/(\d{5})(?:bsc|adv|exp|mst|rem|luna\d*)?\.htm/i);
  return match ? match[1] : null;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "OngekiRoulette/5.0" },
    });
    if (!response.ok) return null;
    const text = await response.text();
    const trimmed = text.trim();
    if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return null;
    return JSON.parse(trimmed);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchArchive() {
  const names = [];
  for (let index = 1; index <= 20; index += 1) {
    names.push(`songs${String(index).padStart(2, "0")}.json`);
  }
  names.push("songs_del.json");

  const songs = [];
  for (const name of names) {
    const url = `${ARCHIVE_JSON}${name}`;
    console.log(`取得中: ${url}`);
    const data = await fetchJson(url);
    if (!Array.isArray(data)) {
      console.log("  スキップ");
      continue;
    }
    console.log(`  ${data.length}曲`);
    songs.push(...data);
  }
  return songs;
}

function buildLinkMap(archive, rouletteSongs) {
  const byTitle = new Map();
  const byId = new Map();

  for (const song of archive) {
    if (!song?.id || !song.title) continue;
    byId.set(String(song.id), song);
    const key = normalize(song.title);
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(song);
  }

  const linkMap = new Map();

  for (const song of rouletteSongs) {
    const difficulty = String(song.difficulty).toUpperCase();
    const diff = difficultyParam[difficulty];
    if (!diff) continue;

    const candidates = [];
    const id = legacyId(song.chartUrl);
    if (id && byId.has(id)) candidates.push(byId.get(id));
    candidates.push(...(byTitle.get(normalize(song.title)) ?? []));

    const match = candidates.find((item) => chartAvailable(item.levels?.[diff]));
    if (!match) continue;

    linkMap.set(`${normalize(song.title)}::${difficulty}`, viewerUrl(match.id, diff));
  }

  return { linkMap, archiveCount: byId.size };
}

async function main() {
  console.log("1/4 譜面保管所の楽曲一覧を取得します");
  const archive = await fetchArchive();

  console.log("2/4 ルーレットの譜面を読みます");
  const songs = JSON.parse(await readFile(songsFile, "utf8"));

  console.log("3/4 現在のビューアURLを割り当てます");
  const { linkMap, archiveCount } = buildLinkMap(archive, songs);
  console.log(`保管所: ${archiveCount}曲 / 割り当て: ${linkMap.size}譜面`);

  let matched = 0;
  const unmatched = [];
  const updated = songs.map((song) => {
    const difficulty = String(song.difficulty).toUpperCase();
    const chartUrl = linkMap.get(`${normalize(song.title)}::${difficulty}`);
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

  const checks = [
    ["Recollect Lines", "MASTER"],
    ["Recollect Lines", "ADVANCED"],
    ["Perfect Shining!!", "LUNATIC"],
    ["FestA of PandemoniuM", "MASTER"],
  ];
  console.log("");
  console.log("代表リンク確認:");
  for (const [title, difficulty] of checks) {
    const url = linkMap.get(`${normalize(title)}::${difficulty}`);
    console.log(`${title} [${difficulty}]: ${url ?? "未検出"}`);
  }

  if (rate < 70) {
    console.warn("注意: 登録率が70%未満です。");
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error("");
  console.error(`処理失敗: ${error.message}`);
  process.exitCode = 1;
});
