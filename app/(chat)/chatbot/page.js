"use client";

import { useState, useEffect } from "react";

import Sidebar from "@/components/layout/Sidebar";
import ChatArea from "@/components/features/chat/ChatArea";

// SUBSCRIPTION
import AboutModal from "@/components/features/about/AboutModal";
import AppShell from "@/components/layout/AppShell";
import OnboardingTour from "@/components/features/onboarding/OnboardingTour";

import { getProfile } from "@/src/lib/profile";

export default function ChatbotPage() {
  const [isOpen, setIsOpen] = useState(true);

  // AUTH
  const [user, setUser] = useState(null);
  const [showToast, setShowToast] = useState(false);

  // ==============================
  // LOAD USER (API BASED)
  // ==============================
  useEffect(() => {
    const loadUser = () => {
      const stored = localStorage.getItem("user");

      if (!stored) {
        setUser(null);
        return;
      }

      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch {
        setUser(null);
      }
    };

    loadUser();

    window.addEventListener("auth-change", loadUser);

    return () => {
      window.removeEventListener("auth-change", loadUser);
    };
  }, []);

  useEffect(() => {
    const handleToast = () => {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    };

    window.addEventListener("show-toast", handleToast);

    return () => {
      window.removeEventListener("show-toast", handleToast);
    };
  }, []);

  return (
    <AppShell
      sidebarOpen={isOpen}
      setSidebarOpen={setIsOpen}
      sidebar={
        <Sidebar
          isOpen={isOpen}
          setIsOpen={setIsOpen}
        />
      }
      hideHeader={true} // ChatArea has its own specific Header logic for now
    >
      <AboutModal onOpenAuth={(mode) => window.dispatchEvent(new CustomEvent("open-auth", { detail: { mode: mode || "login" } }))} />
      
      <OnboardingTour user={user} />

      <ChatArea
        user={user}
        onOpenAuth={(mode) => window.dispatchEvent(new CustomEvent("open-auth", { detail: { mode: mode || "login" } }))}
      />


      {/* ================= TOAST ================= */}
      {showToast && (
        <div className="fixed top-6 right-6 z-50">
          <div className="bg-white border border-green-200 shadow-xl rounded-xl px-5 py-4 flex items-center gap-3">
            
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-sm">
              ✓
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-900">
                Berhasil
              </p>
              <p className="text-xs text-gray-500">
                Aksi berhasil dilakukan
              </p>
            </div>

          </div>
        </div>
      )}
    </AppShell>
  );
}