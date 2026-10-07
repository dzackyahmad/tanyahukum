"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";

import {
  getConversations,
  createNewConversation,
  setActiveConversation,
  renameChat,
  deleteChat,
} from "@/src/lib/chat";

/* ===== MENU ===== */
const MENU = [
  {
    label: "Obrolan Baru",
    icon: "/icons/newChat.svg",
    action: "new_chat",
    restricted: false,
  },
  {
    label: "Dashboard Statistik",
    icon: "/icons/dashboardStatistik.svg",
    path: "/dashboard",
    restricted: true,
    tour: "nav-dashboard",
  },
  {
    label: "Pusat Data Hukum",
    icon: "/icons/pusatDataSidebar.svg",
    path: "/pusat-data",
    restricted: true,
    tour: "nav-pusat-data",
  },
];

export default function Sidebar({ isOpen, setIsOpen, onOpenProfile }) {
  const router = useRouter();
  const pathname = usePathname();

  const [chatHistory, setChatHistory] = useState([]);
  const [user, setUser] = useState(null);
  const [toasts, setToasts] = useState([]);

  const activeChatIdFromStorage =
    typeof window !== "undefined"
      ? localStorage.getItem("active_conversation_id")
      : null;

  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  useEffect(() => {
    const loadUser = () => {
      const stored = localStorage.getItem("user");
      setUser(stored ? JSON.parse(stored) : null);
    };
    loadUser();
    window.addEventListener("auth-change", loadUser);
    return () => window.removeEventListener("auth-change", loadUser);
  }, []);

  // ==============================
  // LOAD HISTORY
  // ==============================
  useEffect(() => {
    if (pathname !== "/chatbot" || !user) return;

    const load = async () => {
      try {
        const chats = await getConversations(user.id);
        setChatHistory(chats);
      } catch (err) {
        console.error("Failed to load history:", err);
      }
    };

    load();
    window.addEventListener("storage", load);
    window.addEventListener("refresh-chats", load);
    window.addEventListener("load-conversation", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("refresh-chats", load);
      window.removeEventListener("load-conversation", load);
    };
  }, [pathname, user]);

  // ==============================
  // MENU CLICK
  // ==============================
  const handleMenuClick = (item) => {
    if (item.restricted && !user) return;

    if (item.action === "new_chat") {
      createNewConversation();
      window.dispatchEvent(new Event("load-conversation"));
      router.push("/chatbot");
      return;
    }

    router.push(item.path);
  };

  // ==============================
  // RENAME (called by ChatItem with new title)
  // ==============================
  const handleRename = async (id, newTitle) => {
    if (!newTitle || !newTitle.trim()) return;
    try {
      await renameChat(id, newTitle.trim());
      addToast("Nama obrolan berhasil diubah");
      window.dispatchEvent(new Event("refresh-chats"));
    } catch (err) {
      addToast("Gagal mengubah nama", "error");
    }
  };

  // ==============================
  // DELETE (called by ChatItem after confirmation)
  // ==============================
  const handleDelete = async (id) => {
    try {
      await deleteChat(id);
      addToast("Obrolan berhasil dihapus");

      const activeId = localStorage.getItem("active_conversation_id");
      if (activeId === id) {
        localStorage.removeItem("active_conversation_id");
        window.dispatchEvent(new Event("load-conversation"));
      }

      window.dispatchEvent(new Event("refresh-chats"));
    } catch (err) {
      addToast("Gagal menghapus obrolan", "error");
    }
  };

  return (
    <>
      <div
        className={`relative z-10 h-full bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 shadow-lg 
        flex flex-col justify-between transition-all duration-300 border border-transparent dark:border-slate-800
        ${isOpen ? "w-64" : "w-20 items-center"}`}
      >
        {/* TOP */}
        <div className="w-full flex flex-col h-full">

          {/* HEADER */}
          {isOpen ? (
            <div className="flex items-center justify-between mb-6">
              <img src="/icons/logo.svg" className="w-14 h-14" />
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-lg border border-blue-300 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-800 transition"
              >
                <img 
                  src="/icons/sidebar.svg" 
                  className="w-5 h-5 transition-all" 
                  style={{ 
                    filter: "invert(37%) sepia(93%) saturate(1352%) hue-rotate(200deg) brightness(88%) contrast(101%)" 
                  }} 
                />
              </button>
            </div>
          ) : (
            <div className="flex justify-center mb-6">
              <div className="relative group/logo">
                <img src="/icons/logo.svg" className="w-14 h-14" />
                <button
                  onClick={() => setIsOpen(true)}
                  className="absolute inset-0 flex items-center justify-center 
                  opacity-0 group-hover/logo:opacity-100 transition z-50
                  rounded-lg bg-white/90 dark:bg-slate-800/90 border border-blue-300 dark:border-slate-600"
                >
                  <img 
                    src="/icons/sidebar.svg" 
                    className="w-5 h-5 transition-all" 
                    style={{ 
                      filter: "invert(37%) sepia(93%) saturate(1352%) hue-rotate(200deg) brightness(88%) contrast(101%)" 
                    }} 
                  />
                </button>
              </div>
            </div>
          )}

          {/* MENU */}
          <div className="space-y-3">
            {MENU.map((item, i) => (
              <MenuItem
                key={i}
                icon={item.icon}
                label={item.label}
                isOpen={isOpen}
                tour={item.tour}
                onClick={() => handleMenuClick(item)}
                disabled={item.restricted && !user}
              />
            ))}
          </div>

          {/* HISTORY */}
          {isOpen && pathname === "/chatbot" && (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-6 mb-2 px-1 font-bold uppercase tracking-wider">
                Riwayat Obrolan
              </p>

              <div className="space-y-1.5 flex-1 overflow-y-auto overflow-x-visible pr-1">
                {!user ? (
                  <div className="p-4 bg-blue-50/50 dark:bg-slate-800/50 rounded-xl border border-blue-100 dark:border-slate-700 border-dashed animate-in fade-in duration-500">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center leading-relaxed">
                      Masuk untuk melihat riwayat obrolan Anda
                    </p>
                  </div>
                ) : chatHistory.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 px-2 italic">
                    Belum ada obrolan
                  </p>
                ) : (
                  chatHistory.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      text={chat.title}
                      isActive={activeChatIdFromStorage === chat.id}
                      onClick={() => {
                        setActiveConversation(chat.id);
                        window.dispatchEvent(new Event("load-conversation"));
                      }}
                      onRename={(newTitle) => handleRename(chat.id, newTitle)}
                      onDelete={() => handleDelete(chat.id)}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* PROFILE */}
        {user && (
          <div
            data-tour="profile"
            onClick={onOpenProfile}
            className={`flex items-center ${
              isOpen ? "gap-3 px-2" : "justify-center"
            } cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl p-2 transition`}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} className="w-9 h-9 rounded-full object-cover border border-blue-200 shadow-sm" alt="Profile" />
            ) : (
              <img 
                src="/icons/profile.svg" 
                className="w-9 h-9 opacity-80 transition-all" 
                alt="Default Profile" 
                style={{ 
                  filter: "invert(37%) sepia(93%) saturate(1352%) hue-rotate(200deg) brightness(88%) contrast(101%)" 
                }}
              />
            )}
            {isOpen && (
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                  {user.nama || user.name || "User"}
                </p>
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                  {user.tier || "Gratis"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TOAST CONTAINER */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-in slide-in-from-right-full duration-300 flex items-center gap-3 backdrop-blur-md
            ${t.type === "error" ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400" : "bg-white/90 dark:bg-slate-800/90 border-blue-100 dark:border-slate-700 text-gray-800 dark:text-slate-200"}`}
          >
            <div className={`w-2 h-2 rounded-full ${t.type === "error" ? "bg-red-500" : "bg-blue-500"}`} />
            {t.message}
          </div>
        ))}
      </div>
    </>
  );
}

/* ===== MENU ITEM ===== */
function MenuItem({ icon, label, isOpen, onClick, disabled, tour }) {
  return (
    <div data-tour={tour} className="relative group">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full flex items-center ${
          isOpen ? "justify-start px-3" : "justify-center"
        } gap-3 py-3 border rounded-xl transition-all duration-300
        ${disabled
          ? "opacity-40 grayscale cursor-not-allowed border-gray-100 dark:border-slate-800"
          : "border-blue-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-800 active:scale-[0.98] shadow-sm"}`}
      >
        <img 
          src={icon} 
          className="w-5 h-5 dark:invert transition-all" 
          style={{ 
            filter: "invert(37%) sepia(93%) saturate(1352%) hue-rotate(200deg) brightness(88%) contrast(101%)" 
          }} 
        />
        {isOpen && <span className="text-gray-800 dark:text-slate-200 text-sm font-medium">{label}</span>}
      </button>

      {/* Tooltip */}
      {disabled && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[60] whitespace-nowrap">
          Perlu Masuk
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
        </div>
      )}
    </div>
  );
}

/* ===== CHAT ITEM ===== */
function ChatItem({ text, onClick, onRename, onDelete, isActive }) {
  const [menuPos, setMenuPos] = useState(null);
  const [showRename, setShowRename] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const btnRef = useRef(null);

  const openMenu = (e) => {
    e.stopPropagation();
    if (menuPos) {
      setMenuPos(null);
      return;
    }
    const rect = btnRef.current.getBoundingClientRect();
    setMenuPos({ top: rect.top, left: rect.right + 8 });
  };

  const closeMenu = () => setMenuPos(null);

  // Close on Escape key
  useEffect(() => {
    if (!menuPos && !showRename && !showDeleteConfirm) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        closeMenu();
        setShowRename(false);
        setShowDeleteConfirm(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuPos, showRename, showDeleteConfirm]);

  const handleRenameSubmit = (e) => {
    e.stopPropagation();
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    onRename(trimmed);
    setShowRename(false);
  };

  const handleDeleteConfirm = (e) => {
    e.stopPropagation();
    onDelete();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="group relative">
      <div
        onClick={onClick}
        className={`p-3 pr-10 border rounded-xl text-sm transition-all cursor-pointer truncate font-medium
        ${isActive
          ? "bg-blue-600 dark:bg-blue-500 text-white shadow-md border-blue-500 dark:border-blue-400"
          : "text-gray-700 dark:text-slate-300 border-transparent hover:bg-blue-50/80 dark:hover:bg-slate-800 hover:border-blue-100 dark:hover:border-slate-700"}`}
      >
        {text}
      </div>

      {/* THREE DOTS TRIGGER */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
        <button
          ref={btnRef}
          onClick={openMenu}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all text-base leading-none
          ${isActive ? "hover:bg-white/20 text-white" : "hover:bg-blue-100 dark:hover:bg-slate-700 text-gray-400 dark:text-slate-500 opacity-0 group-hover:opacity-100"}`}
        >
          •••
        </button>
      </div>

      {/* PORTAL DROPDOWN */}
      {menuPos && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={closeMenu} />
          <div
            style={{ top: menuPos.top, left: menuPos.left }}
            className="fixed z-[9999] w-44 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 py-1.5 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowRename(true);
                setRenameValue(text);
                closeMenu();
              }}
              className="w-full text-left px-3.5 py-2.5 text-[13px] text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors"
            >
              <img src="/icons/pen.svg" className="w-4 h-4 opacity-70 dark:invert" />
              <span>Ganti Nama</span>
            </button>
            <div className="h-[1px] bg-gray-100 dark:bg-slate-700 mx-2" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
                closeMenu();
              }}
              className="w-full text-left px-3.5 py-2.5 text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors"
            >
              <img src="/icons/delete.svg" className="w-4 h-4 opacity-80" />
              <span className="font-medium">Hapus Obrolan</span>
            </button>
          </div>
        </>,
        document.body
      )}

      {/* RENAME MODAL */}
      {showRename && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[10000]" onClick={() => setShowRename(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-[10001]">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg w-80 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ganti Nama Obrolan</h2>
              <input
                autoFocus
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit(e);
                }}
                className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white rounded-lg px-3 py-2 mb-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
              />
              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                  onClick={() => setShowRename(false)}
                >
                  Batal
                </button>
                <button
                  className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  onClick={handleRenameSubmit}
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[10000]" onClick={() => setShowDeleteConfirm(false)} />
          <div className="fixed inset-0 flex items-center justify-center z-[10001]">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg w-80 p-6">
              <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">Hapus Obrolan?</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Tindakan ini tidak dapat dibatalkan.</p>
              <div className="flex justify-end gap-2">
                <button
                  className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Batal
                </button>
                <button
                  className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                  onClick={handleDeleteConfirm}
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}