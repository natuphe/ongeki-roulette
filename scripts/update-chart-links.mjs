import * as cheerio from "cheerio";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = "https://sdvx.in";
const START_URL = `${BASE_URL}/ongeki.html`;
const CONCURRENCY = 6;
const SEED_CHART_URLS = [
  "https://sdvx.in/ongeki/04/04182mst.htm",
  "https://sdvx.in/ongeki/luna/03067luna.htm",
  "https://sdvx.in/ongeki/03/03067mst.htm",
];

const currentFile = fileURLToPath(import.meta.url);
const scriptsDirectory = path.dirname(currentFile);
const projectDirectory = path.resolve(scriptsDirectory, "..");
const songsFile = path.join(projectDirectory, "src", "data", "songs.json");

function normalize(value) {
  return value
    .normalize("NFKC")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function absoluteUrl(href, base = START_URL) {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "OngekiRouletteLinkUpdater/1.0" },
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

function collectLinks(html, pageUrl) {
  const $ = cheerio.load(html);
  return $("a[href]")
    .map((_, element) => absoluteUrl($(element).attr("href"), pageUrl))
    .get()
    .filter(Boolean);
}

function isChartUrl(url) {
  return /^https:\/\/sdvx\.in\/ongeki\/(?:luna\/|\d{2}\/)(?:mrr)?\d+(?:exp|mst|luna)\.htm$/i.test(url);
}

function isIndexUrl(url) {
  return (
    url.startsWith(`${BASE_URL}/ongeki/`) &&
    url.endsWith(".htm") &&
    !isChartUrl(url) &&
    !url.includes("/mrr")
  );
}

async function discoverChartUrls() {
  const firstHtml = await fetchHtml(START_URL);
  const firstLinks = collectLinks(firstHtml, START_URL);
  const indexUrls = [...new Set(firstLinks.filter(isIndexUrl))];
  const chartUrls = new Set([...SEED_CHART_URLS, ...firstLinks.filter(isChartUrl)]);

  console.log(`索引ページ: ${indexUrls.length}件`);

  for (let i = 0; i < indexUrls.length; i += CONCURRENCY) {
    const batch = indexUrls.slice(i, i + CONCURRENCY);
    const pages = await Promise.allSettled(
      batch.map(async (url) => ({ url, html: await fetchHtml(url) }))
    );
    for (const page of pages) {
      if (page.status !== "fulfilled") continue;
      for (const link of collectLinks(page.value.html, page.value.url)) {
        if (isChartUrl(link)) chartUrls.add(link);
      }
    }
  }

  return [...chartUrls].filter((url) => !url.includes("/mrr"));
}

function parseChart(url, html) {
  const $ = cheerio.load(html);
  const rawTitle = $("title").first().text().trim() || $("h1").first().text().trim();
  const match = rawTitle.match(/^(.*?)\s*\[(EXPERT|MASTER|LUNATIC)\]/i);
  if (!match) return null;
  return {
    title: match[1].trim(),
    difficulty: match[2].toUpperCase(),
    chartUrl: url,
  };
}

async function main() {
  const songs = JSON.parse(await readFile(songsFile, "utf8"));
  console.log(`songs.json: ${songs.length}譜面`);
  console.log("sdvx.in から譜面ページを探しています...");

  const chartUrls = await discoverChartUrls();
  console.log(`候補URL: ${chartUrls.length}件`);

  const charts = [];
  for (let i = 0; i < chartUrls.length; i += CONCURRENCY) {
    const batch = chartUrls.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (url) => parseChart(url, await fetchHtml(url)))
    );
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) charts.push(result.value);
    }
    process.stdout.write(`\r確認中: ${Math.min(i + CONCURRENCY, chartUrls.length)}/${chartUrls.length}`);
  }
  console.log("");

  const chartMap = new Map();
  for (const chart of charts) {
    chartMap.set(`${normalize(chart.title)}::${chart.difficulty}`, chart.chartUrl);
  }

  let matched = 0;
  const updated = songs.map((song) => {
    const difficulty = song.difficulty.toUpperCase();
    const direct = chartMap.get(`${normalize(song.title)}::${difficulty}`);
    if (direct) {
      matched += 1;
      return { ...song, chartUrl: direct };
    }

    // URL規則が分かる既登録データは保持する
    if (song.chartUrl) return song;
    return song;
  });

  await writeFile(songsFile, `${JSON.stringify(updated, null, 2)}\n`, "utf8");
  console.log(`リンク登録: ${matched}/${songs.length}譜面`);
  console.log(`保存先: ${songsFile}`);
  console.log("未登録譜面はアプリ上で『未登録です』と表示されます。");
}

main().catch((error) => {
  console.error("\n譜面リンクの更新に失敗しました。");
  console.error(error);
  process.exitCode = 1;
});
