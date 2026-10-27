import React, { useEffect, useState } from "react";
import ProfileModal from "@/components/features/profile/ProfileModal";
import SubscriptionList from "@/components/features/subscription/SubscriptionList";
import AuthModal from "@/components/features/auth/AuthModal";
import AdminProfileModal from "@/components/features/profileAdmin/AdminProfileModal";

/**
 * AppShell provides the core layout structure for all main pages (Chatbot, Dashboard, Admin, etc.).
 * It ensures perfect visual consistency, corner radius synchronization, and immersive background effects.
 */
export default function AppShell({ 
  children, 
  sidebar, 
  header, 
  sidebarOpen, 
  setSidebarOpen,
  hideHeader = false,
  isAdmin = false,
  customModals = null
}) {
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSubscription, setShowSubscription] = useState(false);
  const [authMode, setAuthMode] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      // 1. Ambil dari localStorage dulu untuk kecepatan (UI instant)
      const stored = localStorage.getItem("user");
      if (stored) {
        setUser(JSON.parse(stored));
      }

      // 2. Selalu fetch data terbaru dari DB untuk memastikan status (Tier PRO, dsb) sinkron
      try {
        const { getProfile } = await import("@/src/lib/profile");
        const freshData = await getProfile();
        
        if (freshData) {
          setUser(freshData);
          localStorage.setItem("user", JSON.stringify(freshData));
        }
      } catch (err) {
        // Jika unauthorized, berarti session habis atau akun baru saja dihapus
        if (err.message.includes("Unauthorized") || err.message.includes("401")) {
          setUser(null);
          localStorage.removeItem("user");
        } else {
          console.error("Gagal sinkronisasi profil:", err);
        }
      }
    };

    loadUser();
    window.addEventListener("auth-change", loadUser);
    return () => window.removeEventListener("auth-change", loadUser);
  }, []);

  useEffect(() => {
    const handleOpenAuth = (e) => {
      setAuthMode(e.detail?.mode || "login");
    };
    window.addEventListener("open-auth", handleOpenAuth);
    return () => window.removeEventListener("open-auth", handleOpenAuth);
  }, []);

  // Tombol Upgrade/Perpanjang di Profil › Penggunaan
  useEffect(() => {
    const handleOpenSubscription = () => {
      setShowProfile(false);
      setShowSubscription(true);
    };
    window.addEventListener("open-subscription", handleOpenSubscription);
    return () => window.removeEventListener("open-subscription", handleOpenSubscription);
  }, []);

  const handleUpdateLocalUser = (newData) => {
    const updatedUser = { ...user, ...newData };
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
    window.dispatchEvent(new Event("auth-change"));
  };

  return (
    <div className="h-screen flex relative overflow-hidden bg-[#e6eef8] dark:bg-[#0b1120] transition-colors duration-500">
      
      {/* Ambient Glow Effects - Unified Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-15%] right-[-10%] w-[60%] h-[60%] bg-blue-400/10 dark:bg-blue-500/5 blur-[140px] rounded-full transition-colors duration-500" />
        <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] bg-blue-600/5 dark:bg-blue-700/5 blur-[120px] rounded-full transition-colors duration-500" />
        <div className="absolute top-[40%] left-[10%] w-[30%] h-[30%] bg-blue-500/5 dark:bg-blue-600/5 blur-[100px] rounded-full transition-colors duration-500" />
      </div>

      {/* Sidebar Wrapper - Exact spacing match across all pages */}
      <div
        className={`transition-all duration-300 relative z-20 ${
          sidebarOpen ? "w-[280px]" : "w-[80px]"
        }`}
      >
        {sidebar && React.cloneElement(sidebar, { 
          onOpenProfile: () => setShowProfile(true),
          user: user,
          isOpen: sidebarOpen,
          setIsOpen: setSidebarOpen
        })}
      </div>

      {/* Main Content Area - Immersive Glass Panel */}
      <div className="flex-1 relative z-10 overflow-hidden">
        <div className="h-full flex flex-col bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl shadow-lg min-h-0 overflow-hidden relative border border-white/20 dark:border-slate-800/50 transition-colors duration-500">
          
          {/* Internal Header (if provided and not hidden) */}
          {!hideHeader && header && (
            <div className="flex-none border-b border-gray-200/60 dark:border-slate-800/60 transition-colors duration-300">
              {React.cloneElement(header, { 
                onOpenSubscription: () => setShowSubscription(true),
                onOpenAuth: (mode) => setAuthMode(mode || "login"),
                onOpenProfile: () => setShowProfile(true)
              })}
            </div>
          )}

          {/* Page Content Scroll Area */}
          <div className="flex-1 overflow-auto custom-scrollbar relative z-10">
            {children}
          </div>

        </div>
      </div>

      {/* MODAL SYSTEM */}
      {customModals ? (
        customModals
      ) : (
        isAdmin ? (
          <AdminProfileModal
            isOpen={showProfile}
            onClose={() => setShowProfile(false)}
            userData={user || {}}
            updateLocalUser={handleUpdateLocalUser}
          />
        ) : (
          <>
            <ProfileModal 
              isOpen={showProfile} 
              onClose={() => setShowProfile(false)} 
              user={user} 
            />

            {showSubscription && (
              <SubscriptionList 
                user={user}
                onComplete={() => setShowSubscription(false)} 
              />
            )}

            <AuthModal
              isOpen={!!authMode}
              initialMode={authMode || "login"}
              onClose={() => setAuthMode(null)}
              onLoginSuccess={(userData) => {
                setUser(userData);
                setAuthMode(null);
              }}
            />
          </>
        )
      )}
    </div>
  );
}
