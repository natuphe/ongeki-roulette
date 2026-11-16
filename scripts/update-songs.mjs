import * as cheerio from "cheerio";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIN_CONSTANT = 12.0;
const OTOGE_URL =
  "https://raw.githubusercontent.com/zvuc/otoge-db/main/ongeki/data/music-ex.json";

const WIKI_PAGES = [
  "オンゲキ Re：Fresh Act.2 楽曲一覧(定数順1)",
  "オンゲキ Re：Fresh Act.2 楽曲一覧(定数順2)",
  "オンゲキ Re：Fresh Act.2 楽曲一覧(定数順3)",
];

const GENRES = {
  音撃: "オンゲキ",
  "P&A": "POPS＆ANIME",
  nico: "niconico",
  東方: "東方Project",
  厨舞: "チュウマイ",
  VAR: "VARIETY",
  BON: "オンゲキ",
};

const DIFFICULTIES = {
  EXP: "EXPERT",
  MAS: "MASTER",
  LUN: "LUNATIC",
};

const CHARTS = {
  ADVANCED: ["lev_adv", "lev_adv_i"],
  EXPERT: ["lev_exc", "lev_exc_i"],
  MASTER: ["lev_mas", "lev_mas_i"],
  LUNATIC: ["lev_lnt", "lev_lnt_i"],
};

const currentFile = fileURLToPath(import.meta.url);
const scriptsDirectory = path.dirname(currentFile);
const projectDirectory = path.resolve(scriptsDirectory, "..");
const outputDirectory = path.join(projectDirectory, "src", "data");
const outputFile = path.join(outputDirectory, "songs.json");

function cleanText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalize(value) {
  return cleanText(value)
    .normalize("NFKC")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[！!]/g, "!")
    .replace(/[：:]/g, ":")
    .replace(/[・･]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

function levelFromConstant(constant) {
  const base = Math.floor(constant + 1e-9);
  const tenth = Math.round((constant - base) * 10);
  return tenth >= 7 ? `${base}+` : String(base);
}

function songKey(song) {
  return `${normalize(song.title)}::${song.difficulty}`;
}

function isSoloVersion(title) {
  return /ソロ\s*ver|solo\s*ver/i.test(title);
}

function wikiUrl(title) {
  return `https://wikiwiki.jp/gameongeki/${encodeURIComponent(title)}`;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 OngekiRoulette/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`ページを取得できませんでした: ${response.status} ${url}`);
  }

  return response.text();
}

function makeSong(title, constant, difficulty, genre, level) {
  const cleanedTitle = cleanText(title);
  if (
    !cleanedTitle ||
    isSoloVersion(cleanedTitle) ||
    !difficulty ||
    !Number.isFinite(constant) ||
    constant < MIN_CONSTANT
  ) {
    return null;
  }

  return {
    title: cleanedTitle,
    constant,
    genre: genre || null,
    difficulty,
    level: level || levelFromConstant(constant),
  };
}

function parseConstantPage(html) {
  const $ = cheerio.load(html);
  const songs = [];
  let constant = null;
  let difficulty = null;
  let genre = null;

  $("table").each((_, table) => {
    const header = $(table)
      .find("tr")
      .first()
      .find("th,td")
      .map((__, cell) => cleanText($(cell).text()))
      .get();
    if (!header.includes("旧定数")) return;

    $(table)
      .find("tr")
      .each((__, row) => {
        const cells = $(row)
          .find("th,td")
          .map((__, cell) => cleanText($(cell).text()))
          .get();

        if (cells.length === 1 && /^\d{1,2}(?:\.\d)?$/.test(cells[0])) {
          constant = Number.parseFloat(cells[0]);
          difficulty = null;
          genre = null;
          return;
        }

        if (cells.length === 1 && difficulty && cells[0]) {
          songs.push(makeSong(cells[0], constant, difficulty, genre));
          return;
        }

        if (cells.length === 5 && cells[0] === "LUN") {
          difficulty = "LUNATIC";
          genre = null;
          songs.push(makeSong(cells[2], constant, difficulty, genre));
          return;
        }

        if (cells.length === 5 && DIFFICULTIES[cells[0]] && GENRES[cells[1]]) {
          difficulty = DIFFICULTIES[cells[0]];
          genre = GENRES[cells[1]];
          songs.push(makeSong(cells[2], constant, difficulty, genre));
          return;
        }

        if (cells.length === 5 && cells[0] === "ADV" && GENRES[cells[1]]) {
          difficulty = "ADVANCED";
          genre = GENRES[cells[1]];
          songs.push(makeSong(cells[2], constant, difficulty, genre));
          return;
        }

        if (cells.length === 4 && GENRES[cells[0]] && difficulty) {
          genre = GENRES[cells[0]];
          songs.push(makeSong(cells[1], constant, difficulty, genre));
          return;
        }

        if (cells.length === 3 && difficulty) {
          songs.push(makeSong(cells[0], constant, difficulty, genre));
        }
      });
  });

  return songs.filter(Boolean);
}

function parseSongPage(html) {
  const $ = cheerio.load(html);
  const songs = [];

  $("table").each((_, table) => {
    const headers = $(table)
      .find("tr")
      .first()
      .find("th,td")
      .map((__, cell) => cleanText($(cell).text()))
      .get();
    const constantIndex = headers.indexOf("譜面定数");
    const levelIndex = headers.indexOf("楽曲Lv");
    if (constantIndex < 0) return;

    $(table)
      .find("tr")
      .slice(1)
      .each((__, row) => {
        const cells = $(row)
          .find("th,td")
          .map((___, cell) => cleanText($(cell).text()))
          .get();
        const difficulty = cells[0]?.toUpperCase();
        if (!CHARTS[difficulty]) return;
        const constant = Number.parseFloat(cells[constantIndex]);
        if (!Number.isFinite(constant) || constant < MIN_CONSTANT) return;
        const level =
          levelIndex >= 0 && cells[levelIndex]
            ? cells[levelIndex]
            : levelFromConstant(constant);
        songs.push({ difficulty, constant, level });
      });
  });

  return songs;
}

async function fetchDatabase() {
  console.log("ジャンル補完用の楽曲一覧を取得します");
  const text = await fetchText(OTOGE_URL);
  const database = JSON.parse(text);
  if (!Array.isArray(database)) {
    throw new Error("楽曲一覧の形式が配列ではありません");
  }
  return database;
}

function genreMap(database) {
  const genres = new Map();
  for (const record of database) {
    const title = cleanText(record.title);
    if (title && record.category) {
      genres.set(normalize(title), record.category);
    }
  }
  return genres;
}

async function supplementNewSongs(songs, database) {
  const present = new Set(songs.map(songKey));
  const pending = new Map();

  for (const record of database) {
    if (String(record.date_added) < "20260901") continue;
    const title = cleanText(record.title);
    if (!title) continue;

    for (const difficulty of Object.keys(CHARTS)) {
      const constant = Number.parseFloat(record[CHARTS[difficulty][1]]);
      if (!Number.isFinite(constant) || constant < MIN_CONSTANT) continue;
      const key = `${normalize(title)}::${difficulty}`;
      if (present.has(key)) continue;

      const pageTitle = record.wikiwiki_url
        ? decodeURIComponent(record.wikiwiki_url.split("/").pop())
        : title;
      if (!pending.has(pageTitle)) pending.set(pageTitle, []);
      pending.get(pageTitle).push({ title, difficulty, genre: record.category });
    }
  }

  if (pending.size === 0) return;

    console.log(`定数表に無い新曲ページを確認します: ${pending.size}曲`);
    for (const [pageTitle, expected] of pending) {
      let response;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        response = await fetch(wikiUrl(pageTitle), {
          headers: { "User-Agent": "Mozilla/5.0 OngekiRoulette/1.0" },
        });
        if (response.status !== 429 && response.status !== 503) break;
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
      if (!response?.ok) {
        console.warn(`  ページなし: ${pageTitle} (${response?.status ?? "no response"})`);
        continue;
      }

    const parsed = parseSongPage(await response.text());
    const byDifficulty = new Map(parsed.map((song) => [song.difficulty, song]));
    for (const item of expected) {
      const confirmed = byDifficulty.get(item.difficulty);
      if (!confirmed) {
        console.warn(`  定数未掲載: ${item.title} [${item.difficulty}]`);
        continue;
      }
      songs.push(
        makeSong(
          item.title,
          confirmed.constant,
          item.difficulty,
          item.genre,
          confirmed.level
        )
      );
      console.log(
        `  追加: ${item.title} [${item.difficulty}] ${confirmed.constant.toFixed(1)}`
      );
    }
  }
}

async function main() {
  console.log("譜面データを取得しています...");
  console.log(`対象: 譜面定数 ${MIN_CONSTANT.toFixed(1)} 以上の ADVANCED / EXPERT / MASTER / LUNATIC`);

  const songs = [];
  for (const title of WIKI_PAGES) {
    console.log(`取得中: ${title}`);
    const parsed = parseConstantPage(await fetchText(wikiUrl(title)));
    console.log(`  ${parsed.length}譜面`);
    songs.push(...parsed);
  }

  const database = await fetchDatabase();
  const genres = genreMap(database);
  await supplementNewSongs(songs, database);

  for (const song of songs) {
    if (!song.genre) {
      song.genre = genres.get(normalize(song.title)) ?? null;
    }
  }

  const missingGenre = songs.filter((song) => !song.genre);
  if (missingGenre.length > 0) {
    throw new Error(
      `ジャンルを決められない譜面があります: ${missingGenre
        .slice(0, 5)
        .map((song) => song.title)
        .join(", ")}`
    );
  }

  const uniqueSongs = Array.from(
    new Map(songs.map((song) => [songKey(song), song])).values()
  );

  uniqueSongs.sort((a, b) => {
    if (b.constant !== a.constant) return b.constant - a.constant;
    return a.title.localeCompare(b.title, "ja");
  });

  const required = [
    ["Recollect Lines", "MASTER", 15.7],
    ["Demonia", "MASTER", 15.3],
    ["Demonia", "EXPERT", 14.0],
    ["8OROCHI", "MASTER", null],
    ["怨撃", "LUNATIC", null],
  ];

  for (const [title, difficulty, constant] of required) {
    const song = uniqueSongs.find(
      (item) => item.title === title && item.difficulty === difficulty
    );
    if (!song || (constant !== null && song.constant !== constant)) {
      throw new Error(`${title} [${difficulty}] の定数を確認できませんでした。`);
    }
  }

  if (uniqueSongs.some((song) => isSoloVersion(song.title))) {
    throw new Error("ソロバージョンが残っています。");
  }

  if (!uniqueSongs.some((song) => song.difficulty === "ADVANCED")) {
    throw new Error("ADVANCED譜面を取得できませんでした。");
  }

  if (uniqueSongs.length < 800) {
    throw new Error(`譜面数が少なすぎます: ${uniqueSongs.length}`);
  }

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(uniqueSongs, null, 2)}\n`, "utf8");

  console.log("");
  console.log("譜面データを保存しました。");
  console.log(`保存先: ${outputFile}`);
  console.log(`合計: ${uniqueSongs.length}譜面`);
  console.log(
    `定数: ${uniqueSongs.at(-1).constant.toFixed(1)} – ${uniqueSongs[0].constant.toFixed(1)}`
  );

  const counts = {};
  for (const song of uniqueSongs) {
    counts[song.difficulty] = (counts[song.difficulty] ?? 0) + 1;
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
