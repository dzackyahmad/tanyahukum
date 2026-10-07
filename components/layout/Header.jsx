"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Header({ onOpenSubscription, onOpenAuth }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = () => {
      const stored = localStorage.getItem("user");
      setUser(stored ? JSON.parse(stored) : null);
    };

    loadUser();

    window.addEventListener("auth-change", loadUser);

    return () => {
      window.removeEventListener("auth-change", loadUser);
    };
  }, []);

  // =========================
  // DYNAMIC TITLE + ICON
  // =========================
  let title = "TanyaHukum";
  let icon = "/icons/logo.svg";
  let iconSize = "w-12 h-12";

  if (pathname === "/dashboard") {
    title = "Dashboard Statistik";
    icon = "/icons/dashboardStatistik.svg";
    iconSize = "w-8 h-8";
  }

  if (pathname === "/pusat-data") {
    title = "Pusat Data Hukum";
    icon = "/icons/pusatDataSidebar.svg";
    iconSize = "w-8 h-8";
  }

  // =========================
  // HANDLER
  // =========================
  const handleOpenSubscription = () => {
    if (onOpenSubscription) {
      onOpenSubscription();
    } else {
      router.push("/subscription"); // fallback
    }
  };

  const handleOpenAuth = (mode) => {
    if (onOpenAuth) {
      onOpenAuth(mode);
    } else {
      router.push("/login");
    }
  };

  // =========================
  // RENDER
  // =========================
  return (
    <div className="w-full flex items-center justify-between px-4 py-3">
      
      {/* LEFT */}
      <div
        onClick={() => router.push("/chatbot")}
        className="flex items-center gap-3 cursor-pointer"
      >
        <img src={icon} className={iconSize} />
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors">
          {title}
        </h1>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-3">

        {/* ===== BELUM LOGIN ===== */}
        {!user && (
          <>
            <button
              onClick={() => handleOpenAuth("login")}
              className="text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-[#2f6fed] dark:hover:text-[#4f8eff] transition-colors px-2 py-1 rounded-lg dark:hover:bg-transparent"
            >
              Masuk
            </button>

            <button
              onClick={() => handleOpenAuth("register")}
              className="text-sm px-6 py-2 bg-[#2f6fed] hover:bg-[#255cd6] text-white rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-[0.98] font-bold"
            >
              Daftar
            </button>
          </>
        )}

        {/* ===== USER FREE ===== */}
        {user && user.tier !== "PRO" && (
          <button
            data-tour="subscription"
            onClick={handleOpenSubscription}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 transition 
            text-white px-4 py-2 rounded-xl shadow-md text-sm font-medium"
          >
            <img src="/icons/bintangPro.svg" className="w-4 h-4" />
            Konsultasi Pro
          </button>
        )}

        {/* ===== USER PRO ===== */}
        {user && user.tier === "PRO" && (
          <button
            data-tour="subscription"
            onClick={onOpenSubscription}
            className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded-lg font-medium transition-all active:scale-[0.98]"
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            PRO Member
          </button>
        )}

      </div>
    </div>
  );
}