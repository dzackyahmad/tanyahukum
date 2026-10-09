"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

// Panel transparansi proses jawaban AI. Semua isi berasal dari event server yang
// benar-benar terjadi (lihat mode streaming di app/api/chat/route.js) — bukan animasi tebakan.
//
// process = {
//   steps: { search, think, write }  // "pending" | "active" | "done"
//   sources: { count, uniqueCount, docs: [{ title, page }] } | null
//   thinking: string                 // ringkasan proses berpikir dari Gemini
//   done: boolean, durationMs: number | null      // total, diukur server
//   startedAt: number, stepDurations: { search, think, write }  // ms, diukur browser
// }

// 4200 → "4,2 detik"
const formatSeconds = (ms) => `${(ms / 1000).toFixed(1).replace(".", ",")} detik`;

// Penghitung waktu berjalan selama proses belum selesai
function useElapsed(startedAt, running) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [running]);
  return startedAt ? Math.max(0, now - startedAt) : null;
}

const STEP_LABELS = {
  search: { active: "Mencari dokumen hukum yang relevan…", done: "Menelusuri database dokumen hukum" },
  think: { active: "Menganalisis dokumen…", done: "Menganalisis dokumen" },
  write: { active: "Menyusun jawaban…", done: "Menyusun jawaban" },
};

const shortTitle = (title) => title.replace(/^Regulasi\s+[^-]+-\s*/i, "").trim() || title;

// Perilaku panel (seperti dropdown):
// - Jawaban baru: terbuka selama AI mencari & menganalisis, lalu otomatis menutup
//   begitu teks jawaban mulai muncul. Panel tidak pernah hilang — cukup klik untuk membuka.
// - Jika user sudah membuka/menutup manual selama proses, pilihannya dihormati.
// - Jawaban dari riwayat (proses sudah selesai saat dimuat): tertutup.
export default function ProcessPanel({ process }) {
  const [open, setOpen] = useState(() => !process.done);
  const [showThinking, setShowThinking] = useState(false);
  const userToggled = useRef(false);

  const answering = process.done || process.steps.write !== "pending";
  useEffect(() => {
    if (answering && !userToggled.current) setOpen(false);
  }, [answering]);

  const toggle = () => {
    userToggled.current = true;
    setOpen((o) => !o);
  };

  const elapsed = useElapsed(process.startedAt, !process.done);
  const durations = process.stepDurations || {};

  return (
    <div className="mb-3 rounded-xl border border-gray-200 dark:border-slate-700/70 bg-gray-50/70 dark:bg-slate-800/40 text-[13px]">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        title={open ? "Sembunyikan detail proses" : "Lihat detail proses"}
        className="group/proc w-full flex items-center gap-2 px-3.5 py-2.5 text-left rounded-xl text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-slate-700/40 transition-colors cursor-pointer"
      >
        {process.done ? <CheckIcon /> : <Spinner />}
        <span className="font-medium">
          {process.done
            ? `Proses${process.durationMs ? ` · ${formatSeconds(process.durationMs)}` : ""}`
            : `Sedang memproses…${elapsed !== null ? ` ${formatSeconds(elapsed)}` : ""}`}
        </span>
        <span className="ml-auto text-xs text-gray-400 dark:text-slate-500 group-hover/proc:text-blue-600 dark:group-hover/proc:text-blue-400 transition-colors">
          {open ? "Sembunyikan" : "Lihat detail"}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 group-hover/proc:text-blue-600 dark:group-hover/proc:text-blue-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <ol className="px-3.5 pb-3 space-y-2.5">
          {/* 1. Pencarian dokumen */}
          <Step state={process.steps.search} labels={STEP_LABELS.search} duration={durations.search}>
            {process.sources && (
              <div className="mt-1 text-gray-500 dark:text-slate-400">
                <p>
                  Menemukan {process.sources.count} potongan teks dari {process.sources.uniqueCount} dokumen.
                  {process.sources.docs.length > 0 && " Dokumen teratas:"}
                </p>
                {process.sources.docs.length > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {process.sources.docs.map((d) => (
                      <li key={d.title} title={d.title} className="flex gap-1.5">
                        <span className="text-gray-300 dark:text-slate-600">•</span>
                        <span className="min-w-0">
                          {shortTitle(d.title)}
                          {d.page && <span className="text-gray-400 dark:text-slate-500"> · Hal. {d.page}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Step>

          {/* 2. Proses berpikir AI */}
          <Step state={process.steps.think} labels={STEP_LABELS.think} duration={durations.think}>
            {process.thinking && (
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => setShowThinking((s) => !s)}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showThinking ? "Sembunyikan proses berpikir AI" : "Lihat proses berpikir AI"}
                </button>
                {showThinking && (
                  <div className="mt-1.5 border-l-2 border-gray-200 dark:border-slate-600 pl-3 text-gray-500 dark:text-slate-400 leading-relaxed [&_p]:mb-1.5 [&_strong]:font-semibold [&_strong]:text-gray-600 dark:[&_strong]:text-slate-300">
                    <ReactMarkdown>{process.thinking}</ReactMarkdown>
                    <p className="mt-2 text-[11px] text-gray-400 dark:text-slate-500 italic">
                      Ringkasan otomatis dari model AI (bisa berbahasa Inggris). Ini bukan rujukan hukum.
                    </p>
                  </div>
                )}
              </div>
            )}
          </Step>

          {/* 3. Menyusun jawaban */}
          <Step state={process.steps.write} labels={STEP_LABELS.write} duration={durations.write} />
        </ol>
      )}
    </div>
  );
}

function Step({ state = "pending", labels, duration, children }) {
  return (
    <li className="flex gap-2.5">
      <span className="mt-0.5 shrink-0">
        {state === "done" ? <CheckIcon /> : state === "active" ? <Spinner /> : <PendingDot />}
      </span>
      <div className={`min-w-0 flex-1 ${state === "pending" ? "text-gray-400 dark:text-slate-500" : "text-gray-700 dark:text-slate-200"}`}>
        {state === "done" ? labels.done : labels.active}
        {state === "done" && duration != null && (
          <span className="text-gray-400 dark:text-slate-500 tabular-nums"> · {formatSeconds(duration)}</span>
        )}
        {state !== "pending" && children}
      </div>
    </li>
  );
}

const Spinner = () => (
  <span className="inline-block w-4 h-4 rounded-full border-2 border-blue-200 border-t-blue-600 dark:border-slate-600 dark:border-t-blue-400 animate-spin" aria-hidden="true" />
);

const CheckIcon = () => (
  <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const PendingDot = () => (
  <span className="inline-flex w-4 h-4 items-center justify-center" aria-hidden="true">
    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-slate-600" />
  </span>
);
