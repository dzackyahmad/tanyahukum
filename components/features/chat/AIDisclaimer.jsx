"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

// Baris disclaimer di bawah kotak chat + modal keterbatasan AI
export default function AIDisclaimer({ className = "" }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <p className={`text-xs text-center text-gray-400 dark:text-slate-500 transition-colors ${className}`}>
        TanyaHukum bisa salah. Periksa kembali ke peraturan aslinya.{" "}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="underline underline-offset-2 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
        >
          Keterbatasan AI
        </button>
      </p>

      {isOpen && <AILimitationsModal onClose={() => setIsOpen(false)} />}
    </>
  );
}

const POINTS = [
  {
    title: "Jawaban bisa salah",
    text: "AI bisa salah memahami pertanyaan, salah menyimpulkan, atau salah mengutip pasal dan halaman. Buka dokumen aslinya di Pusat Data sebelum mengandalkan jawaban.",
  },
  {
    title: "Data terbatas",
    text: "Jawaban hanya berdasarkan peraturan yang ada di database TanyaHukum. Peraturan yang belum dimasukkan, sudah diubah, atau sudah dicabut tidak tercakup.",
  },
  {
    title: "Bukan nasihat hukum",
    text: "Jawaban bersifat informasi umum. Untuk perkara nyata, konsultasikan dengan advokat, LBH, atau Posbakum di pengadilan.",
  },
  {
    title: "Privasi",
    text: "Chat disimpan di akun Anda dan diproses oleh layanan AI pihak ketiga. Jangan memasukkan NIK, nomor rekening, atau data pribadi lainnya.",
  },
];

function AILimitationsModal({ onClose }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-limitations-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-transparent dark:border-slate-800 p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        <h2 id="ai-limitations-title" className="text-xl font-bold text-gray-900 dark:text-white pr-8">
          Keterbatasan AI
        </h2>

        <div className="mt-5 space-y-4 text-sm leading-relaxed">
          {POINTS.map((p) => (
            <div key={p.title}>
              <h3 className="font-semibold text-gray-900 dark:text-white">{p.title}</h3>
              <p className="mt-0.5 text-gray-600 dark:text-slate-400">{p.text}</p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-7 w-full py-3 bg-[#2f6fed] hover:bg-[#255cd6] text-white text-sm font-semibold rounded-2xl transition-all active:scale-[0.98]"
        >
          Mengerti
        </button>
      </div>
    </div>,
    document.body
  );
}
