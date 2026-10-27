"use client";

import { useLayoutEffect, useRef } from "react";

// Kotak pertanyaan yang tumbuh ke bawah mengikuti isi (seperti ChatGPT/Claude).
// Enter = kirim, Shift+Enter = baris baru. Saat mengetik dengan IME, Enter tidak mengirim.
const MAX_HEIGHT = 208; // ±8 baris, sesudahnya menggulir di dalam kotak

export default function ChatInput({ value, onChange, onSubmit, disabled, placeholder, className = "" }) {
  const ref = useRef(null);

  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    // Kosong → satu baris. scrollHeight ikut menghitung placeholder, yang di kotak sempit (HP) bisa
    // terlipat banyak baris dan mendorong tombol keluar layar.
    if (!el.value) { el.style.overflowY = "hidden"; return; }
    const next = Math.min(el.scrollHeight, MAX_HEIGHT);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  };

  useLayoutEffect(fit, [value]);

  // Ukur ulang saat lebar kotak berubah (mis. sidebar dibuka/ditutup di HP), bukan hanya saat teks berubah
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let width = el.clientWidth;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth === width) return; // perubahan tinggi dari fit() sendiri diabaikan
      width = el.clientWidth;
      fit();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Padding di pembungkus (bukan di textarea) agar saat menggulir, teks terpotong di dalam
  // ruang kosong, bukan tepat di garis tepi kotak.
  return (
    <div className={`w-full min-w-0 flex ${className}`}>
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full resize-none bg-transparent outline-none p-0 leading-6 dark:text-white sidebar-scroll"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (!disabled) onSubmit();
          }
        }}
      />
    </div>
  );
}
