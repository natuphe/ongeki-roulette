import { useEffect, useMemo, useState } from "react";
import SONGS from "./data/songs.json";

const MIN_CONSTANT = 12.0;
const MAX_CONSTANT = 15.7;
const THEME_KEY = "ongeki-theme";

const GENRES = [...new Set(SONGS.map((song) => song.genre))].sort((a, b) =>
  a.localeCompare(b, "ja")
);
const DIFFICULTIES = ["ADVANCED", "EXPERT", "MASTER", "LUNATIC"];
const difficultyStyle = {
  ADVANCED: {
    selected: "border-amber-400 bg-amber-400 text-zinc-900",
    badge: "border-amber-400 bg-amber-400 text-zinc-900",
  },
  EXPERT: {
    selected: "border-red-500 bg-red-500 text-white",
    badge: "border-red-500 bg-red-500 text-white",
  },
  MASTER: {
    selected: "border-purple-600 bg-purple-600 text-white",
    badge: "border-purple-600 bg-purple-600 text-white",
  },
  LUNATIC: {
    selected: "border-zinc-400 bg-white text-zinc-900",
    badge: "border-zinc-300 bg-white text-zinc-900",
  },
};
const genreColors = {
  オンゲキ: "border-pink-300 bg-pink-100 text-pink-800",
  "POPS＆ANIME": "border-sky-300 bg-sky-100 text-sky-800",
  niconico: "border-zinc-300 bg-zinc-100 text-zinc-800",
  東方Project: "border-red-300 bg-red-100 text-red-800",
  VARIETY: "border-amber-300 bg-amber-100 text-amber-800",
  チュウマイ: "border-violet-300 bg-violet-100 text-violet-800",
};
const defaultGenreColor = "border-emerald-300 bg-emerald-100 text-emerald-800";

function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export default function OngekiRoulette() {
  const [theme, setTheme] = useState(readTheme);
  const [min, setMin] = useState(MIN_CONSTANT);
  const [max, setMax] = useState(MAX_CONSTANT);
  const [minInput, setMinInput] = useState(MIN_CONSTANT.toFixed(1));
  const [maxInput, setMaxInput] = useState(MAX_CONSTANT.toFixed(1));
  const [genres, setGenres] = useState([]);
  const [difficulties, setDifficulties] = useState(DIFFICULTIES);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [excludeHistory, setExcludeHistory] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage can be unavailable in private browsing.
    }
  }, [theme]);

  const eligible = useMemo(
    () =>
      SONGS.filter(
        (song) =>
          song.constant >= min &&
          song.constant <= max &&
          (genres.length === 0 || genres.includes(song.genre)) &&
          difficulties.includes(song.difficulty) &&
          (!excludeHistory ||
            !history.some(
              (item) =>
                item.title === song.title && item.difficulty === song.difficulty
            ))
      ),
    [min, max, genres, difficulties, excludeHistory, history]
  );

  const toggle = (value, list, setter) =>
    setter(
      list.includes(value)
        ? list.filter((item) => item !== value)
        : [...list, value]
    );

  const spin = () => {
    if (!eligible.length) return;
    const picked = eligible[Math.floor(Math.random() * eligible.length)];
    setResult(picked);
    setHistory((current) => [picked, ...current]);
  };

  const commitMin = () => {
    const value = Number.parseFloat(minInput);
    const next = Number.isFinite(value)
      ? Math.min(Math.max(value, MIN_CONSTANT), max)
      : min;
    const rounded = Math.round(next * 10) / 10;
    setMin(rounded);
    setMinInput(rounded.toFixed(1));
  };

  const commitMax = () => {
    const value = Number.parseFloat(maxInput);
    const next = Number.isFinite(value)
      ? Math.max(Math.min(value, MAX_CONSTANT), min)
      : max;
    const rounded = Math.round(next * 10) / 10;
    setMax(rounded);
    setMaxInput(rounded.toFixed(1));
  };

  const reset = () => {
    setMin(MIN_CONSTANT);
    setMax(MAX_CONSTANT);
    setMinInput(MIN_CONSTANT.toFixed(1));
    setMaxInput(MAX_CONSTANT.toFixed(1));
    setGenres([]);
    setDifficulties(DIFFICULTIES);
    setResult(null);
    setHistory([]);
  };

  const inputClass =
    "mt-1 w-full border border-zinc-300 bg-white px-2 py-1.5 text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100";

  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <main className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <div>
            <h1 className="text-2xl font-bold">今日は何を叩く？</h1>
            <p className="mt-1 text-sm text-zinc-500">条件を選んで1曲決めます。</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-zinc-300 dark:border-zinc-600">
              <button
                type="button"
                aria-pressed={theme === "light"}
                onClick={() => setTheme("light")}
                className={`px-3 py-1.5 text-sm ${theme === "light" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-white text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"}`}
              >
                ライト
              </button>
              <button
                type="button"
                aria-pressed={theme === "dark"}
                onClick={() => setTheme("dark")}
                className={`border-l border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-600 ${theme === "dark" ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-white text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300"}`}
              >
                ダーク
              </button>
            </div>
            <button
              type="button"
              onClick={reset}
              className="border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-200"
            >
              リセット
            </button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="border border-zinc-200 p-4 dark:border-zinc-800">
            <h2 className="mb-4 text-base font-bold">絞り込み</h2>

            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-bold">譜面定数</label>
                <span className="font-mono text-sm">
                  {min.toFixed(1)} – {max.toFixed(1)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-zinc-500">
                  最小
                  <input
                    type="number"
                    inputMode="decimal"
                    min={MIN_CONSTANT}
                    max={max}
                    step="0.1"
                    value={minInput}
                    onChange={(event) => setMinInput(event.target.value)}
                    onBlur={commitMin}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    className={inputClass}
                  />
                </label>
                <label className="text-xs text-zinc-500">
                  最大
                  <input
                    type="number"
                    inputMode="decimal"
                    min={min}
                    max={MAX_CONSTANT}
                    step="0.1"
                    value={maxInput}
                    onChange={(event) => setMaxInput(event.target.value)}
                    onBlur={commitMax}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                    className={inputClass}
                  />
                </label>
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-bold">ジャンル</label>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggle(genre, genres, setGenres)}
                    className={`border px-2.5 py-1 text-xs ${genres.includes(genre) ? (genreColors[genre] ?? defaultGenreColor) : "border-zinc-300 bg-white text-zinc-600 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-300"}`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="mb-2 block text-sm font-bold">難易度</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {DIFFICULTIES.map((difficulty) => (
                  <button
                    key={difficulty}
                    type="button"
                    onClick={() => toggle(difficulty, difficulties, setDifficulties)}
                    className={`border px-2 py-2 text-xs font-bold ${difficulties.includes(difficulty) ? difficultyStyle[difficulty].selected : "border-zinc-300 bg-white text-zinc-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-400"}`}
                  >
                    {difficulty}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border border-zinc-200 px-3 py-3 dark:border-zinc-800">
              <p className="text-sm font-bold">履歴の曲を除外</p>
              <button
                type="button"
                role="switch"
                aria-checked={excludeHistory}
                onClick={() => setExcludeHistory(!excludeHistory)}
                className={`relative h-7 w-12 shrink-0 rounded-full ${excludeHistory ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-300 dark:bg-zinc-600"}`}
              >
                <span
                  className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow-sm ${excludeHistory ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
            </div>
          </section>

          <section className="flex min-h-80 flex-col border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">抽選結果</h2>
              <span className="text-sm text-zinc-500">候補 {eligible.length} 譜面</span>
            </div>

            <div className="flex flex-1 items-center justify-center py-8 text-center">
              {result ? (
                <div className="w-full">
                  <div
                    className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center border text-2xl font-bold ${difficultyStyle[result.difficulty]?.badge ?? "border-zinc-300 bg-white text-zinc-900"}`}
                  >
                    {result.constant.toFixed(1)}
                  </div>
                  <h3 className="text-2xl font-bold leading-snug">{result.title}</h3>
                  <p className="mt-3 text-sm text-zinc-500">
                    Lv. {result.level} · {result.difficulty} · {result.genre}
                  </p>
                  <div className="mt-5">
                    {result.chartUrl ? (
                      <a
                        href={result.chartUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block border border-zinc-900 px-3 py-2 text-sm font-bold dark:border-zinc-100"
                      >
                        譜面保管所を開く
                      </a>
                    ) : (
                      <p className="text-sm text-zinc-500">この譜面の保管所リンクは未登録です</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">条件を決めて抽選します。</p>
              )}
            </div>

            <button
              type="button"
              onClick={spin}
              disabled={!eligible.length}
              className="w-full bg-zinc-900 px-4 py-3 text-base font-bold text-white disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:bg-zinc-100 dark:text-zinc-900 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
            >
              {eligible.length ? "抽選する" : "候補がありません"}
            </button>
          </section>
        </div>

        {history.length > 0 && (
          <section className="mt-6 border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">抽選履歴</h2>
              <button
                type="button"
                onClick={() => setHistory([])}
                className="text-sm text-zinc-500 underline"
              >
                クリア
              </button>
            </div>
            <div className="grid max-h-96 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-4">
              {history.map((song, index) => (
                <div
                  key={`${song.title}-${song.difficulty}-${index}`}
                  className="flex items-center gap-3 border border-zinc-200 p-2 dark:border-zinc-800"
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center border font-mono text-xs font-bold ${difficultyStyle[song.difficulty]?.badge ?? "border-zinc-300 bg-white text-zinc-900"}`}
                  >
                    {song.constant.toFixed(1)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{song.title}</p>
                    <p className="text-xs text-zinc-500">
                      {song.difficulty} · {song.genre}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-6 text-center text-xs leading-5 text-zinc-500">
          譜面定数{MIN_CONSTANT.toFixed(1)}以上を収録 · 全{SONGS.length}譜面
          <br />
          譜面定数は非公式情報を含み、更新時に変わる場合があります。
        </footer>
      </main>
    </div>
  );
}
