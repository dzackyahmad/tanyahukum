"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatResetTime } from "./LimitNotice";

// Pemilih model & mode jawaban di dalam kotak chat.
// Atas: pilihan model. Bawah: pilihan mode (Kilat / Berpikir).
// Semua memakai API tier gratis. id mode harus sama dengan MODE_CONFIG di app/api/chat/route.js.
const BOLT = <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />;
const BRAIN = (
  <>
    <path d="M9.5 2a2.5 2.5 0 0 1 2.5 2.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24A2.5 2.5 0 0 1 9.5 2z" />
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24A2.5 2.5 0 0 0 14.5 2z" />
  </>
);

// `model` = id model di server (lib/modelRouter.js), untuk mencocokkan status dari /api/usage.
export const MODELS = [
  { key: "flash-lite", model: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", short: "3.5 Flash-Lite", provider: "Google", description: "Ringan & paling cepat", modes: { fast: "lite", think: "lite-think" } },
  { key: "flash-36", model: "gemini-3.6-flash", label: "Gemini 3.6 Flash", short: "3.6 Flash", provider: "Google", description: "Seimbang, jawaban lebih lengkap", modes: { fast: "fast", think: "deep" } },
  { key: "flash-35", model: "gemini-3.5-flash", label: "Gemini 3.5 Flash", short: "3.5 Flash", provider: "Google", description: "Model Gemini terbaru", modes: { fast: "next-fast", think: "next" } },
  { key: "gptoss", model: "openai/gpt-oss-120b", label: "GPT-OSS 120B", short: "GPT-OSS", provider: "Groq", description: "Open-source besar, sangat cepat", modes: { fast: "gptoss-fast", think: "gptoss" } },
  { key: "qwen", model: "qwen/qwen3.8-27b", label: "Qwen 3.8", short: "Qwen 3.8", provider: "Groq", description: "Open-source, respons tercepat", modes: { fast: "qwen", think: "qwen-think" } },
];

// ── Status model (habis / hampir habis) dari /api/usage ─────────────────────
// Di-cache sebentar agar membuka menu berulang kali tidak terus memanggil API. Gagal / belum
// login → tanpa status (menu tetap berfungsi seperti biasa).
// data = { byModel: Map(model → status), order: [id mode sesuai urutan Ragas] }
const STATUS_TTL_MS = 15_000;
let statusCache = { at: 0, data: null, pending: null };

function fetchModelStatus({ force = false } = {}) {
  if (!force && statusCache.data && Date.now() - statusCache.at < STATUS_TTL_MS) return Promise.resolve(statusCache.data);
  if (!statusCache.pending) {
    statusCache.pending = fetch("/api/usage", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const data = json?.availability
          ? { byModel: new Map(json.availability.map((a) => [a.model, a])), order: json.fallbackOrder || [] }
          : null;
        statusCache = { at: Date.now(), data, pending: null };
        return data;
      })
      .catch(() => {
        statusCache.pending = null;
        return null;
      });
  }
  return statusCache.pending;
}

const LIMIT_TEXT = {
  limit_daily: "Kuota harian habis",
  limit: "Batas tercapai",
  auth: "Akses ditolak penyedia",
  transient: "Sedang terganggu",
  timeout: "Sedang terganggu",
};

// → { tone: "limited" | "near", text } atau null
function modelStatusInfo(st) {
  if (!st) return null;
  if (st.status === "dibatasi") {
    return { tone: "limited", text: `${LIMIT_TEXT[st.cooldownReason] || "Sementara tidak tersedia"} · tersedia lagi ${formatResetTime(st.cooldownUntil)}` };
  }
  if (st.daily?.warning) {
    return { tone: "near", text: `Hampir habis · ${st.daily.source === "estimasi" ? "±" : ""}${st.daily.percent}% kuota harian terpakai` };
  }
  return null;
}

export const MODES = [
  { key: "fast", label: "Kilat", description: "Langsung menjawab", icon: BOLT },
  { key: "think", label: "Berpikir", description: "Berpikir dulu, prosesnya bisa dilihat", icon: BRAIN },
];

export const DEFAULT_MODE = "lite"; // Gemini 3.5 Flash-Lite · Kilat
export const MODE_IDS = MODELS.flatMap((m) => Object.values(m.modes));

// id mode → { model, mode } (mis. "deep" → Gemini 2.5 Flash · Berpikir)
export function describeMode(id) {
  for (const model of MODELS) {
    for (const mode of MODES) {
      if (model.modes[mode.key] === id) return { model, mode };
    }
  }
  return null;
}
export const modeLabel = (id) => {
  const d = describeMode(id);
  return d ? `${d.model.label} · ${d.mode.label}` : id;
};
export const isThinkingMode = (id) => describeMode(id)?.mode.key === "think";

const Icon = ({ children, className = "w-4 h-4" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const Check = () => (
  <Icon className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400">
    <polyline points="20 6 9 17 4 12" />
  </Icon>
);

const MENU_WIDTH = 288;

// refreshKey: naik setiap kali ada model yang baru gagal/berganti → status diambil ulang tanpa cache.
// onAutoSwitch({ from, to, reason }): dipanggil saat pilihan dipindah otomatis karena modelnya habis.
export default function ModeToggle({ mode, onChange, disabled = false, openUpward = false, refreshKey = 0, onAutoSwitch }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const current = describeMode(mode) || describeMode(DEFAULT_MODE);
  const [status, setStatus] = useState(null);

  // Status diambil saat halaman dibuka (untuk tanda di tombol), setiap kali menu dibuka, dan
  // setelah ada fallback (refreshKey)
  const lastRefreshKey = useRef(refreshKey);
  useEffect(() => {
    let alive = true;
    const force = lastRefreshKey.current !== refreshKey;
    lastRefreshKey.current = refreshKey;
    fetchModelStatus({ force }).then((s) => alive && s && setStatus(s));
    return () => { alive = false; };
  }, [open, refreshKey]);
  const statusOf = (model) => status?.byModel.get(model.model);
  const isLimited = (model) => statusOf(model)?.status === "dibatasi";
  const currentInfo = modelStatusInfo(statusOf(current.model));

  // Model terpilih sedang habis → pindah ke model terbaik yang masih tersedia (urutan Ragas,
  // jenis mode Kilat/Berpikir sama). Bila semua habis, pilihan dibiarkan (server memberi pesan kuota).
  useEffect(() => {
    if (!status || !isLimited(current.model)) return;
    const candidate = status.order
      .map((id) => describeMode(id))
      .find((d) => d && d.mode.key === current.mode.key && !isLimited(d.model));
    if (!candidate) return;
    const next = candidate.model.modes[current.mode.key];
    onChange(next);
    onAutoSwitch?.({ from: current.model.label, to: modeLabel(next), reason: modelStatusInfo(statusOf(current.model))?.text });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, mode]);

  const pickModel = (model) => {
    if (isLimited(model)) return; // model yang habis tidak bisa dipilih
    onChange(model.modes[current.mode.key]);
  };
  const pickMode = (m) => {
    onChange(current.model.modes[m.key]);
    setOpen(false);
  };

  // Hitung posisi menu dari tombol (menu di-render lewat portal agar tidak terpotong)
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const place = () => {
      const r = buttonRef.current.getBoundingClientRect();
      const left = Math.min(Math.max(8, r.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
      // Buka ke arah yang ruangnya cukup; tinggi menu dibatasi agar tidak keluar layar
      const spaceAbove = r.top - 16;
      const spaceBelow = window.innerHeight - r.bottom - 16;
      const needed = menuRef.current?.scrollHeight || 480;
      const up = openUpward ? spaceAbove >= Math.min(needed, 240) || spaceAbove >= spaceBelow : spaceBelow < needed && spaceAbove > spaceBelow;
      const maxHeight = Math.max(160, up ? spaceAbove : spaceBelow);
      setPos(up ? { left, bottom: window.innerHeight - r.top + 8, maxHeight } : { left, top: r.bottom + 8, maxHeight });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, openUpward]);

  // Tutup saat klik di luar atau tekan Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={`${current.model.label} · ${current.mode.label}`}
        className="shrink-0 self-center flex items-center gap-1.5 px-2.5 py-1.5 mr-1 rounded-lg text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700/60 transition-colors disabled:opacity-50"
      >
        <Icon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400">{current.mode.icon}</Icon>
        {currentInfo && (
          <>
            <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${currentInfo.tone === "limited" ? "bg-red-500" : "bg-amber-500"}`} />
            <span className="sr-only">{currentInfo.text}</span>
          </>
        )}
        <span className="hidden sm:inline">{current.model.short}</span>
        <span className="hidden sm:inline text-gray-400 dark:text-slate-500 font-medium">· {current.mode.label}</span>
        <Icon className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </Icon>
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          role="dialog"
          aria-label="Pilih model dan mode"
          style={{ position: "fixed", width: MENU_WIDTH, overflowY: "auto", ...pos }}
          className="z-[9999] p-1.5 rounded-2xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-2xl"
        >
          {/* ── Atas: pilihan model ── */}
          <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">Model</p>
          <div role="listbox" aria-label="Model">
            {MODELS.map((m) => {
              const active = m.key === current.model.key;
              // Model yang habis tidak bisa dipilih sampai kuotanya pulih
              const info = modelStatusInfo(statusOf(m));
              const locked = info?.tone === "limited";
              return (
                <button
                  key={m.key}
                  type="button"
                  role="option"
                  aria-selected={active}
                  aria-disabled={locked}
                  disabled={locked}
                  onClick={() => pickModel(m)}
                  title={locked ? `Tidak bisa dipilih: ${info.text}` : m.description}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-colors ${
                    locked ? "cursor-not-allowed" : active ? "bg-blue-50 dark:bg-blue-500/10" : "hover:bg-gray-50 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <span className={`flex flex-col min-w-0 ${info?.tone === "limited" ? "opacity-60" : ""}`}>
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{m.label}</span>
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300">
                        {m.provider}
                      </span>
                    </span>
                    {info && (
                      <span className={`flex items-center gap-1.5 mt-0.5 text-[11px] leading-snug ${info.tone === "limited" ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`}>
                        <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full shrink-0 ${info.tone === "limited" ? "bg-red-500" : "bg-amber-500"}`} />
                        {info.text}
                      </span>
                    )}
                  </span>
                  <span className="ml-auto">{active && <Check />}</span>
                </button>
              );
            })}
          </div>

          {/* ── Bawah: pilihan mode ── */}
          <div className="mt-1.5 pt-1.5 border-t border-gray-100 dark:border-slate-700">
            <p className="px-2.5 pt-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">Mode</p>
            <div role="radiogroup" aria-label="Mode" className="grid grid-cols-2 gap-1.5 px-1 pb-1">
              {MODES.map((m) => {
                const active = m.key === current.mode.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => pickMode(m)}
                    className={`flex flex-col items-start gap-0.5 px-2.5 py-2 rounded-xl border text-left transition-colors ${
                      active
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 dark:border-blue-400"
                        : "border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                      <Icon className="w-4 h-4 text-blue-600 dark:text-blue-400">{m.icon}</Icon>
                      {m.label}
                    </span>
                    <span className="text-[11px] leading-snug text-gray-500 dark:text-slate-400">{m.description}</span>
                  </button>
                );
              })}
            </div>
            {current.model.provider === "Groq" && (
              <p className="px-2.5 pb-1 text-[10.5px] text-gray-400 dark:text-slate-500">
                Model Groq membaca 20 potongan dokumen teratas (batas tier gratis).
              </p>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
