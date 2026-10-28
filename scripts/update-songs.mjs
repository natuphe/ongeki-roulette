import * as cheerio from "cheerio";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_URL =
  "https://oshikatsu-techo.com/games/ongeki/chart-constants";

const MIN_CONSTANT = 13.7;

const currentFile = fileURLToPath(import.meta.url);
const scriptsDirectory = path.dirname(currentFile);
const projectDirectory = path.resolve(scriptsDirectory, "..");

const outputDirectory = path.join(
  projectDirectory,
  "src",
  "data"
);

const outputFile = path.join(
  outputDirectory,
  "songs.json"
);

function cleanText(value) {
  return value.replace(/\s+/g, " ").trim();
}

async function main() {
  console.log("譜面データを取得しています...");
  console.log(`対象: 譜面定数 ${MIN_CONSTANT.toFixed(1)} 以上`);

  const response = await fetch(SOURCE_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 OngekiRoulette/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `ページを取得できませんでした: ${response.status}`
    );
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const songs = [];

  $("table tbody tr").each((_, row) => {
    const cells = $(row)
      .find("td")
      .map((__, cell) => cleanText($(cell).text()))
      .get();

    if (cells.length < 3) {
      return;
    }

    const combinedText = cells.join(" ");

    const constantMatch = combinedText.match(
      /\b(1[0-5]\.[0-9])\b\s*$/
    );

    const difficultyMatch = combinedText.match(
      /\b(BASIC|ADVANCED|EXPERT|MASTER|LUNATIC)\b/i
    );

    const levelMatch = combinedText.match(
      /表示レベル\s*([0-9]+\+?)/
    );

    const genreMatch = combinedText.match(
      /ジャンル\s*(.*?)\s*(?:BASIC|ADVANCED|EXPERT|MASTER|LUNATIC)/i
    );

    if (
      !constantMatch ||
      !difficultyMatch ||
      !levelMatch ||
      !genreMatch
    ) {
      return;
    }

    const constant = Number.parseFloat(constantMatch[1]);

    if (constant < MIN_CONSTANT) {
      return;
    }

    const firstCell = cells[0];

    const title = firstCell
      .replace(/表示レベル[\s\S]*$/, "")
      .trim();

    if (!title) {
      return;
    }

    songs.push({
      title,
      constant,
      genre: genreMatch[1].trim(),
      difficulty: difficultyMatch[1].toUpperCase(),
      level: levelMatch[1],
    });
  });

  const uniqueSongs = Array.from(
    new Map(
      songs.map((song) => [
        `${song.title}::${song.difficulty}::${song.constant}`,
        song,
      ])
    ).values()
  );

  uniqueSongs.sort((a, b) => {
    if (b.constant !== a.constant) {
      return b.constant - a.constant;
    }

    return a.title.localeCompare(b.title, "ja");
  });

  if (uniqueSongs.length === 0) {
    throw new Error(
      "譜面を取得できませんでした。ページの構造が変更された可能性があります。"
    );
  }

  await mkdir(outputDirectory, {
    recursive: true,
  });

  await writeFile(
    outputFile,
    JSON.stringify(uniqueSongs, null, 2) + "\n",
    "utf8"
  );

  console.log("");
  console.log("譜面データを保存しました。");
  console.log(`保存先: ${outputFile}`);
  console.log(`合計: ${uniqueSongs.length}譜面`);

  const counts = {};

  for (const song of uniqueSongs) {
    counts[song.difficulty] =
      (counts[song.difficulty] ?? 0) + 1;
  }

  for (const [difficulty, count] of Object.entries(counts)) {
    console.log(`${difficulty}: ${count}譜面`);
  }
}

main().catch((error) => {
  console.error("");
  console.error("更新に失敗しました。");
  console.error(error.message);
  process.exitCode = 1;
});