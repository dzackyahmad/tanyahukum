"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

// Tutorial singkat untuk user yang baru login.
// Elemen yang disorot ditandai dengan atribut data-tour="..." di komponen terkait.
const STEPS = [
  {
    target: "chat-input",
    title: "Chatbot",
    text: "Tulis pertanyaan hukum Anda di sini. Jawaban disertai referensi peraturan yang bisa Anda buka.",
  },
  {
    target: "nav-dashboard",
    title: "Dashboard Statistik",
    text: "Lihat dokumen yang paling sering dibuka, isu hukum terkini, dan tren pencarian.",
  },
  {
    target: "nav-pusat-data",
    title: "Pusat Data Hukum",
    text: "Cari, baca, dan unduh dokumen peraturan yang menjadi sumber jawaban chatbot.",
  },
  {
    target: "subscription",
    title: "Subscription",
    text: "Akun gratis punya batas pertanyaan harian. Upgrade ke PRO untuk bertanya tanpa batas.",
  },
  {
    target: "profile",
    title: "Profil",
    text: "Atur nama, foto, password, dan konteks pribadi agar jawaban lebih sesuai dengan situasi Anda.",
  },
];

const PADDING = 6; // jarak sorotan dari tepi elemen
const TOOLTIP_W = 300;

const storageKey = (userId) => `tanyahukum_tour_done_${userId}`;

export default function OnboardingTour({ user }) {
  const [phase, setPhase] = useState("idle"); // idle | ask | tour
  const [step, setStep] = useState(0);

  // Tanya sekali per akun setelah login
  useEffect(() => {
    if (!user?.id) {
      setPhase("idle");
      return;
    }
    try {
      if (!localStorage.getItem(storageKey(user.id))) setPhase("ask");
    } catch {}
  }, [user?.id]);

  // Bisa dipanggil ulang dari mana saja: window.dispatchEvent(new Event("start-tour"))
  useEffect(() => {
    const start = () => {
      setStep(0);
      setPhase("tour");
    };
    window.addEventListener("start-tour", start);
    return () => window.removeEventListener("start-tour", start);
  }, []);

  const finish = useCallback(() => {
    try {
      if (user?.id) localStorage.setItem(storageKey(user.id), "1");
    } catch {}
    setPhase("idle");
  }, [user?.id]);

  if (phase === "ask") {
    return (
      <WelcomePrompt
        name={user?.name}
        onStart={() => {
          setStep(0);
          setPhase("tour");
        }}
        onSkip={finish}
      />
    );
  }

  if (phase === "tour") {
    return (
      <TourStep
        step={step}
        onNext={() => (step < STEPS.length - 1 ? setStep(step + 1) : finish())}
        onBack={() => setStep(Math.max(0, step - 1))}
        onSkip={finish}
      />
    );
  }

  return null;
}

/* ─── Pertanyaan awal ─────────────────────────────────────────────────────── */

function WelcomePrompt({ name, onStart, onSkip }) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
      <div role="dialog" aria-modal="true" className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-transparent dark:border-slate-800 p-7 text-center">
        <img src="/icons/logo.svg" alt="" className="w-14 h-14 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Selamat datang{name ? `, ${name.split(" ")[0]}` : ""}!
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
          Mau lihat tutorial singkat? Kami tunjukkan 5 fitur utama TanyaHukum, kurang dari 1 menit.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onStart}
            className="w-full py-3 bg-[#2f6fed] hover:bg-[#255cd6] text-white text-sm font-semibold rounded-2xl transition-all active:scale-[0.98]"
          >
            Mulai tutorial
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="w-full py-3 text-sm font-semibold text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
          >
            Lewati
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─── Langkah tutorial dengan sorotan ─────────────────────────────────────── */

function findTarget(name) {
  // Ambil elemen yang terlihat (mis. input chat ada dua versi, hanya satu yang tampil)
  return [...document.querySelectorAll(`[data-tour="${name}"]`)].find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
}

function TourStep({ step, onNext, onBack, onSkip }) {
  const current = STEPS[step];
  const [rect, setRect] = useState(null);
  const isLast = step === STEPS.length - 1;

  // Ukur posisi elemen target, ikuti saat resize/scroll
  useLayoutEffect(() => {
    let frame;
    const measure = () => {
      const el = findTarget(current.target);
      if (!el) {
        setRect(null);
        return;
      }
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    const onChange = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [current.target]);

  // Keyboard: → / Enter lanjut, ← kembali, Esc lewati
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onSkip();
      else if (e.key === "ArrowRight" || e.key === "Enter") onNext();
      else if (e.key === "ArrowLeft") onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onNext, onBack, onSkip]);

  // Elemen tidak ditemukan (mis. layar terlalu kecil) → lanjut otomatis
  useEffect(() => {
    if (rect !== null) return;
    const t = setTimeout(() => {
      if (!findTarget(current.target)) onNext();
    }, 300);
    return () => clearTimeout(t);
  }, [rect, current.target, onNext]);

  if (!rect) return null;

  const hole = {
    top: rect.top - PADDING,
    left: rect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  };

  // Tooltip: di kanan elemen jika muat, selain itu di bawah / di atas
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let tip;
  if (hole.left + hole.width + 16 + TOOLTIP_W < vw && hole.width < vw / 2) {
    tip = { left: hole.left + hole.width + 16, top: Math.min(Math.max(16, hole.top), vh - 230) };
  } else {
    const left = Math.min(Math.max(16, hole.left + hole.width / 2 - TOOLTIP_W / 2), vw - TOOLTIP_W - 16);
    tip = hole.top + hole.height + 16 + 200 < vh
      ? { left, top: hole.top + hole.height + 16 }
      : { left, top: Math.max(16, hole.top - 16 - 200) };
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999]" aria-live="polite">
      {/* Lapisan gelap: blokir klik ke halaman selama tutorial */}
      <div className="absolute inset-0" />

      {/* Sorotan: klik bagian yang disorot untuk lanjut */}
      <button
        type="button"
        onClick={onNext}
        aria-label={`Lanjut: ${current.title}`}
        style={{ ...hole, boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.65)" }}
        className="absolute rounded-2xl ring-2 ring-blue-400 cursor-pointer transition-all duration-300 ease-out"
      >
        <span className="absolute inset-0 rounded-2xl ring-4 ring-blue-400/40 animate-pulse" />
      </button>

      {/* Penjelasan */}
      <div
        role="dialog"
        aria-labelledby="tour-title"
        style={{ top: tip.top, left: tip.left, width: TOOLTIP_W }}
        className="absolute bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 p-5 transition-all duration-300 ease-out"
      >
        <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
          Langkah {step + 1} dari {STEPS.length}
        </p>
        <h3 id="tour-title" className="mt-1 text-base font-bold text-gray-900 dark:text-white">{current.title}</h3>
        <p className="mt-1.5 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">{current.text}</p>
        <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">Klik bagian yang disorot untuk lanjut.</p>

        {/* Indikator langkah */}
        <div className="mt-4 flex gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-blue-600" : "w-1.5 bg-gray-200 dark:bg-slate-700"}`}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
          >
            Lewati
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={onBack}
                className="px-3 py-1.5 text-sm font-semibold text-gray-600 dark:text-slate-300 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                Kembali
              </button>
            )}
            <button
              type="button"
              onClick={onNext}
              className="px-4 py-1.5 text-sm font-semibold text-white bg-[#2f6fed] hover:bg-[#255cd6] rounded-xl transition-colors"
            >
              {isLast ? "Selesai" : "Lanjut"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
