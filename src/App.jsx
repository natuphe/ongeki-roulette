import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dices, RotateCcw, SlidersHorizontal, Music2, History, Sparkles, X, ExternalLink } from "lucide-react";
import SONGS from "./data/songs.json";

const GENRES = [...new Set(SONGS.map((song) => song.genre))].sort((a, b) =>
  a.localeCompare(b, "ja")
);
const DIFFICULTIES = ["EXPERT", "MASTER", "LUNATIC"];
const genreColors = {
  オンゲキ: "bg-pink-100 text-pink-700 border-pink-200",
  "POPS＆ANIME": "bg-sky-100 text-sky-700 border-sky-200",
  niconico: "bg-zinc-100 text-zinc-700 border-zinc-200",
  東方Project: "bg-red-100 text-red-700 border-red-200",
  VARIETY: "bg-amber-100 text-amber-700 border-amber-200",
  チュウマイ: "bg-violet-100 text-violet-700 border-violet-200",
};
const defaultGenreColor = "bg-emerald-100 text-emerald-700 border-emerald-200";

export default function OngekiRoulette() {
  const [min, setMin] = useState(13.7);
  const [max, setMax] = useState(15.7);
  const [minInput, setMinInput] = useState("13.7");
  const [maxInput, setMaxInput] = useState("15.7");
  const [genres, setGenres] = useState([]);
  const [difficulties, setDifficulties] = useState(["EXPERT", "MASTER", "LUNATIC"]);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [rolling, setRolling] = useState(false);
  const [excludeHistory, setExcludeHistory] = useState(true);

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
    if (!eligible.length || rolling) return;

    setRolling(true);
    let ticks = 0;
    const timer = setInterval(() => {
      setResult(eligible[Math.floor(Math.random() * eligible.length)]);
      ticks += 1;

      if (ticks >= 12) {
        clearInterval(timer);
        const picked = eligible[Math.floor(Math.random() * eligible.length)];
        setResult(picked);
        setHistory((current) => [picked, ...current].slice(0, 8));
        setRolling(false);
      }
    }, 75);
  };

  const commitMin = () => {
    const value = Number.parseFloat(minInput);
    const next = Number.isFinite(value)
      ? Math.min(Math.max(value, 13.7), max)
      : min;
    const rounded = Math.round(next * 10) / 10;
    setMin(rounded);
    setMinInput(rounded.toFixed(1));
  };

  const commitMax = () => {
    const value = Number.parseFloat(maxInput);
    const next = Number.isFinite(value)
      ? Math.max(Math.min(value, 15.7), min)
      : max;
    const rounded = Math.round(next * 10) / 10;
    setMax(rounded);
    setMaxInput(rounded.toFixed(1));
  };

  const reset = () => {
    setMin(13.7);
    setMax(15.7);
    setMinInput("13.7");
    setMaxInput("15.7");
    setGenres([]);
    setDifficulties(["EXPERT", "MASTER", "LUNATIC"]);
    setResult(null);
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-[#f7f7fb] text-slate-900 selection:bg-pink-200">
      <div className="h-1.5 bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500" />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-pink-200 bg-white px-3 py-1 text-xs font-bold tracking-wide text-pink-600 shadow-sm">
              <Sparkles size={14} /> ONGEKI SONG PICKER
            </div>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">今日は何を叩く？</h1>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">条件を選んで、次の1曲をルーレットで決めよう。</p>
          </div>
          <button onClick={reset} className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <RotateCcw size={16} /> リセット
          </button>
        </header>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-2">
              <SlidersHorizontal className="text-violet-500" size={20} />
              <h2 className="text-lg font-black">絞り込み</h2>
            </div>

            <div className="mb-7">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-bold">譜面定数</label>
                <span className="rounded-lg bg-violet-50 px-2.5 py-1 font-mono text-sm font-black text-violet-700">{min.toFixed(1)} – {max.toFixed(1)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-slate-500">最小
                  <input type="number" inputMode="decimal" min="13.7" max={max} step="0.1" value={minInput} onChange={(event) => setMinInput(event.target.value)} onBlur={commitMin} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-bold outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                </label>
                <label className="text-xs text-slate-500">最大
                  <input type="number" inputMode="decimal" min={min} max="15.7" step="0.1" value={maxInput} onChange={(event) => setMaxInput(event.target.value)} onBlur={commitMax} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-bold outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
                </label>
              </div>
            </div>

            <div className="mb-7">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-bold">ジャンル</label>
                <span className="text-xs text-slate-400">未選択ならすべて</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {GENRES.map((genre) => (
                  <button key={genre} onClick={() => toggle(genre, genres, setGenres)} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${genres.includes(genre) ? `${genreColors[genre] ?? defaultGenreColor} ring-2 ring-slate-200 ring-offset-1` : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-7">
              <label className="mb-3 block text-sm font-bold">難易度</label>
              <div className="grid grid-cols-3 gap-2">
                {DIFFICULTIES.map((difficulty) => (
                  <button key={difficulty} onClick={() => toggle(difficulty, difficulties, setDifficulties)} className={`rounded-xl border px-2 py-3 text-xs font-black transition ${difficulties.includes(difficulty) ? difficulty === "LUNATIC" ? "border-purple-500 bg-purple-500 text-white shadow-md shadow-purple-200" : difficulty === "MASTER" ? "border-pink-500 bg-pink-500 text-white shadow-md shadow-pink-200" : "border-red-500 bg-red-500 text-white" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
                    {difficulty}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
              <div>
                <p className="text-sm font-bold">履歴の曲を除外</p>
                <p className="mt-0.5 text-xs text-slate-400">同じ譜面が連続しません</p>
              </div>
              <button type="button" aria-pressed={excludeHistory} onClick={() => setExcludeHistory(!excludeHistory)} className={`relative h-7 w-12 rounded-full transition ${excludeHistory ? "bg-violet-500" : "bg-slate-300"}`}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${excludeHistory ? "left-6" : "left-1"}`} />
              </button>
            </div>
          </section>

          <section className="flex min-h-[480px] flex-col rounded-3xl bg-slate-950 p-5 text-white shadow-xl shadow-violet-200/60 sm:p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-300"><Music2 size={18} className="text-cyan-400" /> 抽選結果</div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">候補 {eligible.length} 譜面</span>
            </div>

            <div className="flex flex-1 items-center justify-center py-8 text-center">
              <AnimatePresence mode="wait">
                {result ? (
                  <motion.div key={`${result.title}-${result.difficulty}-${rolling}`} initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }} className="w-full">
                    <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-400 via-violet-500 to-pink-500 text-4xl font-black shadow-lg shadow-violet-500/30">{result.constant.toFixed(1)}</div>
                    <p className="mb-2 text-xs font-black tracking-[.25em] text-cyan-400">{rolling ? "SELECTING..." : "NEXT SONG"}</p>
                    <h2 className="mx-auto max-w-lg text-3xl font-black leading-tight sm:text-4xl">{result.title}</h2>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">Lv. {result.level}</span>
                      <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">{result.difficulty}</span>
                      <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">{result.genre}</span>
                    </div>
                    <div className="mt-6">
                      {result.chartUrl ? (
                        <a
                          href={result.chartUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-cyan-300/30 bg-cyan-400/15 px-4 py-3 text-sm font-black text-cyan-200 transition hover:bg-cyan-400/25"
                        >
                          <ExternalLink size={17} />
                          譜面画像を開く
                        </a>
                      ) : (
                        <p className="text-xs font-bold text-slate-500">
                          この譜面の画像リンクは未登録です
                        </p>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-slate-500">
                    <Dices size={64} strokeWidth={1.25} className="mx-auto mb-4" />
                    <p className="font-bold">条件を決めてルーレットを回そう</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button onClick={spin} disabled={!eligible.length || rolling} className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-500 px-6 py-4 text-lg font-black shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:grayscale disabled:opacity-40">
              <Dices className={rolling ? "animate-spin" : "transition group-hover:rotate-12"} />
              {rolling ? "抽選中..." : eligible.length ? "ルーレットを回す" : "候補がありません"}
            </button>
          </section>
        </div>

        {history.length > 0 && (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2"><History size={19} className="text-cyan-500" /><h2 className="font-black">抽選履歴</h2></div>
              <button onClick={() => setHistory([])} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-700"><X size={14} /> クリア</button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {history.map((song, index) => (
                <div key={`${song.title}-${song.difficulty}-${index}`} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 font-mono text-xs font-black text-white">{song.constant.toFixed(1)}</span>
                  <div className="min-w-0"><p className="truncate text-sm font-bold">{song.title}</p><p className="text-[11px] text-slate-400">{song.difficulty} · {song.genre}</p></div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="mt-8 text-center text-xs leading-5 text-slate-400">
          譜面定数13.7以上を収録 · 全{SONGS.length}譜面
          <br />
          譜面定数は非公式情報を含み、更新時に変わる場合があります。
        </footer>
      </main>
    </div>
  );
}
