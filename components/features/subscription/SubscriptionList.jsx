"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

import SubscriptionSelect from "./SubscriptionSelect";
import SubscriptionSummary from "./SubscriptionSummary";

import { createCheckout } from "@/src/lib/payment";

export default function SubscriptionList({ user, onComplete }) {
  const [selected, setSelected] = useState("pro");
  const [step, setStep] = useState("select");
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Guard: prevent calling snap.pay while popup is already open
  const isSnapOpen = useRef(false);

  const router = useRouter();

  const plans = [
    {
      id: "basic",
      name: "Basic",
      price: "Gratis!",
      benefits: [
        "Prompt chatbot terbatas",
        "Pencarian dokumen terbatas",
        "Memori maksimal di seluruh obrolan",
      ],
    },
    {
      id: "pro",
      name: "Pro",
      price: "Rp 49.900,00",
      benefits: [
        "Berlaku 30 hari, tidak diperpanjang otomatis",
        "Prompt chatbot tanpa batas",
        "Pencarian dokumen tanpa batas",
        "Memori diperluas di seluruh obrolan",
      ],
    },
  ];

  const selectedPlan = plans.find((p) => p.id === selected);

  // =========================
  // HANDLE CHECKOUT
  // =========================
  const handleCheckout = async () => {
    // Prevent duplicate calls while Snap popup is already active
    if (isSnapOpen.current || isLoading) return;

    try {
      if (!user?.id) {
        alert("User tidak ditemukan");
        return;
      }

      if (selected !== "pro") return;

      setIsLoading(true);
      const data = await createCheckout(user.id);
      setIsLoading(false);

      isSnapOpen.current = true;

      window.snap.pay(data.token, {
        onSuccess: async function (result) {
          console.log("[SNAP SUCCESS]", result);
          isSnapOpen.current = false;

          try {
            // 1. Fetch data terbaru dari backend (DB sudah diupdate via webhook/sync)
            const res = await fetch("/api/profile");
            const freshUser = await res.json();

            if (res.ok) {
              // 2. Update localStorage dengan data asli dari DB
              localStorage.setItem("user", JSON.stringify(freshUser));
              
              // 3. Trigger update global instant ke seluruh komponen (AppShell, Header, dsb)
              window.dispatchEvent(new Event("auth-change"));
              console.log("[FRONTEND] User state synced with Database.");
            }
          } catch (err) {
            console.error("Gagal sinkronisasi otomatis:", err);
          }

          // 4. Tutup modal secara otomatis
          if (onComplete) onComplete();
          
          // 5. Tampilkan success toast
          setShowSuccess(true);

          // 6. Redirect ke /chatbot & Hard Reload untuk memastikan UI bersih dan flow berakhir
          router.push("/chatbot");
          setTimeout(() => {
            window.location.href = "/chatbot";
          }, 300);
        },

        onPending: function () {
          isSnapOpen.current = false;
          alert("Selesaikan pembayaran Anda");
        },

        onError: function () {
          isSnapOpen.current = false;
          alert("Pembayaran gagal");
        },

        onClose: function () {
          isSnapOpen.current = false;
        },
      });
    } catch (err) {
      isSnapOpen.current = false;
      setIsLoading(false);
      console.error(err);
      alert("Gagal memulai pembayaran");
    }
  };

  // =========================
  // CLOSE MODAL
  // =========================
  const handleClose = () => {
    if (onComplete) onComplete();
    else router.back();
  };

  // =========================
  // RENDER
  // =========================
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* ── Backdrop ── */}
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-md animate-in fade-in duration-300"
        onClick={handleClose}
      >
        {/* ── Modal Shell ── */}
        <div
          className="relative w-full max-w-4xl bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-white/20 dark:border-slate-800/50 overflow-hidden animate-in zoom-in-95 fade-in duration-300 transition-all mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-1 md:grid-cols-5 h-full min-h-[580px]">
            
            {/* ─── Left Info Panel ─── */}
            <div className="md:col-span-2 bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-800 dark:to-slate-950 p-10 md:p-12 text-white flex flex-col justify-between gap-10 transition-colors">
              <div>
                {/* Icon */}
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md border border-white/10">
                  <img src="/icons/bintangPro.svg" className="w-6 h-6 brightness-0 invert" alt="Pro" />
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 border border-white/15 text-blue-100 rounded-full text-[9px] font-black tracking-widest uppercase mb-5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                  </span>
                  Premium Access
                </div>

                <h2 className="text-2xl md:text-3xl font-black mb-4 leading-tight">
                  Buka Potensi Penuh TanyaHukum
                </h2>
                <p className="text-blue-100 dark:text-blue-200 font-medium leading-relaxed text-sm">
                  Tingkatkan pengalaman riset hukum Anda dengan akses tak terbatas ke seluruh fitur kecerdasan legal kami.
                </p>
              </div>

              {/* Trust Signal */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04c-.233.63-.362 1.31-.362 2.016 0 5.867 3.34 10.971 8.25 13.25a11.959 11.959 0 018.25-13.25c0-.706-.129-1.386-.362-2.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold">Aman &amp; Terpercaya</p>
                    <p className="text-[10px] text-blue-200 font-black uppercase tracking-widest mt-0.5">Verified Intelligence</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center border border-white/10 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold">Pembayaran Aman</p>
                    <p className="text-[10px] text-blue-200 font-black uppercase tracking-widest mt-0.5">Powered by Midtrans</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Right Step Panel ─── */}
            <div className="md:col-span-3 flex flex-col bg-gray-50/50 dark:bg-slate-900/50 transition-colors">
              {/* ── Header ── */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100 dark:border-slate-800 transition-colors">
                <div className="w-8">
                  {step === "summary" && (
                    <button
                      onClick={() => setStep("select")}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 shadow-sm border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-750 transition-all active:scale-90"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Step Indicator */}
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 transition-all ${step === "select" ? "opacity-100" : "opacity-50"}`}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-colors bg-blue-600 text-white">
                      {step === "summary" ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : "1"}
                    </div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 hidden sm:inline transition-colors">Pilih</span>
                  </div>
                  <div className={`h-[2px] w-8 rounded-full transition-colors ${step === "summary" ? "bg-blue-600" : "bg-gray-200 dark:bg-slate-800"}`} />
                  <div className={`flex items-center gap-2 transition-all ${step === "summary" ? "opacity-100" : "opacity-40"}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-colors ${
                      step === "summary" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-gray-400"
                    }`}>
                      2
                    </div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 hidden sm:inline transition-colors">Konfirmasi</span>
                  </div>
                </div>

                <button
                  onClick={handleClose}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 shadow-sm border border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-750 transition-all active:scale-90"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* ── Body ── */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                {step === "select" && (
                  <SubscriptionSelect
                    plans={plans}
                    selected={selected}
                    setSelected={setSelected}
                    setStep={setStep}
                    user={user}
                    onClose={handleClose}
                    embedded
                  />
                )}

                {step === "summary" && (
                  <SubscriptionSummary
                    user={user}
                    selectedPlan={selectedPlan}
                    onBack={() => setStep("select")}
                    onPay={handleCheckout}
                    isLoading={isLoading}
                    embedded
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Success Toast ── */}
      {showSuccess && (
        <div className="fixed bottom-8 right-8 z-[10000] animate-in slide-in-from-bottom-4 fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/40 shadow-2xl shadow-emerald-500/10 dark:shadow-none rounded-[1.25rem] px-6 py-5 flex items-center gap-4 min-w-[280px] transition-colors">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-200 dark:shadow-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight transition-colors">
                Pembayaran Berhasil!
              </p>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1 transition-colors">
                Paket PRO aktif selama 30 hari. Cek tanggal berakhir di Profil › Penggunaan.
              </p>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}