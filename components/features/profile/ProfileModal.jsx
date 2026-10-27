import { useState, useEffect } from "react";
import ProfileCard from "./ProfileCard";
import { getProfile, updateProfile, logout, deleteAccount } from "@/src/lib/profile";
import { deleteAllChats } from "@/src/lib/chat";
import LogoutConfirmModal from "./LogoutConfirmModal";
import UsagePanel from "./UsagePanel";
import { createPortal } from "react-dom";
import { useTheme } from "@/components/shared/ThemeProvider";
import { LEGAL_PATHS } from "@/components/features/legal/legalContent";
import { PREFERENCE_FIELDS, loadPreferences, savePreferences } from "@/lib/chatPreferences";

export default function ProfileModal({ isOpen, onClose, user }) {
  const [activeTab, setActiveTab] = useState("profile"); // "profile" | "personalisasi" | "keamanan"
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    personalContext: "",
    avatarChanged: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // SCROLL LOCK & ESC KEY
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      const handleEsc = (e) => {
        if (e.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleEsc);
      return () => {
        document.body.style.overflow = "auto";
        window.removeEventListener("keydown", handleEsc);
      };
    }
  }, [isOpen, onClose]);

  // LOAD DATA ONCE
  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      try {
        const data = await getProfile();
        setProfileData({
          name: data.name || "",
          email: data.email || "",
          personalContext: data.personalContext || "",
          avatarChanged: false,
        });
      } catch (err) {
        setError(err.message);
      }
    };
    load();
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSave = async (dataToSave) => {
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      await updateProfile(dataToSave);
      
      // Update local state and reset avatarChanged
      setProfileData(prev => ({ ...prev, ...dataToSave, avatarChanged: false }));

      // Sync to localStorage if name updated
      if (dataToSave.name) {
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        const updatedUser = { ...stored, name: dataToSave.name, nama: dataToSave.name };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        window.dispatchEvent(new Event("auth-change"));
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    onClose(); // Close settings
    await logout();
  };

  const menuItems = [
    { id: "profile", label: "Profile", icon: null },
    { id: "personalisasi", label: "Personalisasi", icon: null },
    { id: "tampilan", label: "Tampilan", icon: null },
    { id: "keamanan", label: "Keamanan", icon: null },
    { id: "penggunaan", label: "Penggunaan", icon: null },
    { id: "akun", label: "Akun", icon: null },
  ];

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/20 backdrop-blur-md animate-in fade-in duration-300"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-4xl h-[90vh] md:h-[640px] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] flex overflow-hidden animate-in zoom-in-95 duration-300 mx-4 transition-colors duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* CLOSE BUTTON */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-50 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 p-2 rounded-full transition-all active:scale-90"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>

          {/* SIDEBAR */}
          <div className="hidden md:flex w-64 bg-gray-50/50 dark:bg-slate-900/50 border-r border-gray-100 dark:border-slate-800 flex-col p-6 transition-colors duration-300">
            <div className="mb-8">
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">Pengaturan</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">TanyaHukum Account</p>
            </div>

            <nav className="flex-1 space-y-1.5">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  disabled={item.disabled}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all
                    ${item.disabled ? "opacity-30 cursor-not-allowed" : 
                      activeTab === item.id 
                      ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-100 dark:border-slate-700" 
                      : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-gray-300"}`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Bottom Actions */}
            <div className="pt-6 border-t border-gray-100 dark:border-slate-800 space-y-4">
              <button
                onClick={() => setShowLogoutModal(true)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all group/logout active:scale-95"
              >
                <div className="text-red-500 group-hover/logout:scale-110 group-hover/logout:-translate-x-0.5 transition-all duration-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </div>
                <span className="group-hover/logout:translate-x-0.5 transition-all duration-300">
                  Keluar Akun
                </span>
              </button>

              <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center overflow-hidden border border-white dark:border-slate-800 shadow-sm">
                  {user?.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" /> : <span className="text-[10px]">👤</span>}
                </div>
                <div className="flex-1 truncate">
                  <p className="text-[10px] font-black text-gray-900 dark:text-gray-200 truncate">{user?.name || user?.nama || "User"}</p>
                  <p className="text-[8px] text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* CONTENT PANEL */}
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-y-auto custom-scrollbar transition-colors duration-300">
            <div className="p-10 max-w-2xl mx-auto w-full space-y-8">
              
              {activeTab === "profile" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Informasi Umum</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Kelola identitas dan detail kontak akun Anda.</p>
                  </div>

                  <ProfileCard 
                    user={user} 
                    onChange={() => setProfileData(prev => ({ ...prev, avatarChanged: true }))} 
                  />

                  <SectionGeneral 
                    data={profileData} 
                    onSave={handleSave} 
                    loading={loading}
                  />
                </div>
              )}

              {activeTab === "personalisasi" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Personalisasi AI</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Atur cara AI menjawab pertanyaan hukum Anda.</p>
                  </div>

                  <SectionPersonalization 
                    data={profileData} 
                    onSave={handleSave} 
                    loading={loading}
                  />
                </div>
              )}

              {activeTab === "tampilan" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Tampilan</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sesuaikan tema aplikasi sesuai kenyamanan mata Anda.</p>
                  </div>
                  <SectionAppearance />
                </div>
              )}

              {activeTab === "keamanan" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Keamanan</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Perbarui kata sandi Anda untuk menjaga keamanan akun.</p>
                  </div>

                  <SectionSecurity 
                    onSave={handleSave} 
                    loading={loading}
                  />
                </div>
              )}

              {activeTab === "penggunaan" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Penggunaan</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Paket, kuota harian, dan pemakaian model AI Anda.</p>
                  </div>
                  <UsagePanel />
                </div>
              )}

              {activeTab === "akun" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-1">Akun</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Dokumen legal dan pengelolaan data akun Anda.</p>
                  </div>

                  <SectionLegal />

                  <SectionDataAndAccount onDeleteAccount={deleteAccount} />
                </div>
              )}

              {/* FEEDBACK OVERLAY */}
              {(error || success) && (
                <div className="fixed bottom-10 right-10 z-[60] animate-in slide-in-from-bottom-4">
                  {error && (
                    <div className="bg-red-500 text-white px-6 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="bg-green-500 text-white px-6 py-3 rounded-2xl shadow-xl text-sm font-bold flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                      Perubahan berhasil disimpan!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LOGOUT CONFIRMATION MODAL */}
      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />
    </>,
    document.body
  );
}

// ==============================
// INTERNAL SECTION COMPONENTS
// ==============================

function SectionGeneral({ data, onSave, loading }) {
  const [val, setVal] = useState(data.name);

  useEffect(() => { setVal(data.name); }, [data.name]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nama Lengkap</label>
        <input 
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium text-gray-900 dark:text-white"
          placeholder="Nama Anda"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Email (Terkunci)</label>
        <div className="relative">
          <input 
            value={data.email}
            readOnly
            className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 rounded-2xl text-gray-400 italic outline-none cursor-not-allowed"
          />
          <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
        </div>
      </div>

      <button 
        onClick={() => onSave({ name: val })}
        disabled={loading || (val === data.name && !data.avatarChanged)}
        className="px-8 py-4 bg-black dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold hover:opacity-80 transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center min-w-[200px]"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 dark:border-slate-900/30 border-t-white dark:border-t-slate-900 rounded-full animate-spin"></div>
        ) : "Simpan Perubahan"}
      </button>
    </div>
  );
}

// Personalisasi gaya jawaban AI (disimpan di browser, dikirim bersama setiap pertanyaan)
// + konteks personal (disimpan di akun).
function SectionPersonalization({ data, onSave, loading }) {
  const [val, setVal] = useState(data.personalContext);
  const [prefs, setPrefs] = useState({});
  const [savedKey, setSavedKey] = useState(null);

  useEffect(() => { setVal(data.personalContext); }, [data.personalContext]);
  useEffect(() => { setPrefs(loadPreferences()); }, []);

  const changePref = (key, value) => {
    const next = { ...prefs, [key]: value };
    if (value === "default") delete next[key];
    setPrefs(next);
    savePreferences(next);
    setSavedKey(key);
    setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1500);
  };

  const isCustomized = Object.keys(prefs).length > 0;

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-end justify-between gap-4 mb-3">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Gaya jawaban</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Berlaku untuk pertanyaan berikutnya. Akurasi dan kutipan sumber tetap dijaga.</p>
          </div>
          {isCustomized && (
            <button
              type="button"
              onClick={() => { setPrefs({}); savePreferences({}); }}
              className="shrink-0 text-xs font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              Kembalikan default
            </button>
          )}
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-200 dark:divide-slate-700">
          {PREFERENCE_FIELDS.map((field) => (
            <div key={field.key} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <label htmlFor={`pref-${field.key}`} className="block text-sm font-medium text-gray-900 dark:text-white">{field.label}</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{field.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {savedKey === field.key && <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Tersimpan</span>}
                <div className="relative">
                  <select
                    id={`pref-${field.key}`}
                    value={prefs[field.key] || "default"}
                    onChange={(e) => changePref(field.key, e.target.value)}
                    className="appearance-none cursor-pointer rounded-full border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 pl-4 pr-9 py-2 text-sm font-medium text-gray-900 dark:text-white outline-none hover:bg-gray-100 dark:hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
                  >
                    {field.options.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Tentang Anda</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3">
          Konteks yang membantu AI memahami situasi Anda, misalnya profesi atau bidang usaha. Disimpan di akun Anda (maks. 500 karakter).
        </p>
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          rows={4}
          maxLength={500}
          className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm resize-none text-gray-900 dark:text-white"
          placeholder="Misal: Saya pemilik UMKM dengan 5 karyawan di Jawa Tengah."
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">{(val || "").length}/500</span>
          <button
            onClick={() => onSave({ personalContext: val })}
            disabled={loading || val === data.personalContext}
            className="px-5 py-2 bg-gray-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-sm font-semibold hover:opacity-85 transition-opacity disabled:opacity-30 flex items-center justify-center min-w-[96px]"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 dark:border-slate-900/30 border-t-white dark:border-t-slate-900 rounded-full animate-spin"></div>
            ) : "Simpan"}
          </button>
        </div>
      </section>
    </div>
  );
}

function SectionSecurity({ onSave, loading }) {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // ENSURE EMPTY ON MOUNT
  useEffect(() => {
    setForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleInitialSubmit = () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError("Semua field wajib diisi");
      return;
    }

    if (form.newPassword.length < 8) {
      setError("Password baru minimal 8 karakter");
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("Konfirmasi password tidak cocok");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmedSave = async () => {
    setShowConfirmModal(false);
    await onSave({ 
      currentPassword: form.currentPassword,
      newPassword: form.newPassword 
    });
    
    // Clear form on success
    setForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  return (
    <>
      <div className="space-y-6 max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* CURRENT PASSWORD */}
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Kata Sandi Saat Ini</label>
          <div className="relative">
            <input 
              type={showCurrent ? "text" : "password"}
              name="currentPassword"
              value={form.currentPassword}
              onChange={handleChange}
              autoComplete="new-password"
              className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 focus:border-black dark:focus:border-white transition-all font-medium pr-12 text-gray-900 dark:text-white"
              placeholder="••••••••"
            />
            <button 
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showCurrent ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              )}
            </button>
          </div>
        </div>

        {/* NEW PASSWORD */}
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Kata Sandi Baru</label>
          <div className="relative">
            <input 
              type={showNew ? "text" : "password"}
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              autoComplete="new-password"
              className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 focus:border-black dark:focus:border-white transition-all font-medium pr-12 text-gray-900 dark:text-white"
              placeholder="••••••••"
            />
            <button 
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showNew ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              )}
            </button>
          </div>
        </div>

        {/* CONFIRM PASSWORD */}
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Konfirmasi Kata Sandi Baru</label>
          <div className="relative">
            <input 
              type={showConfirm ? "text" : "password"}
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              className="w-full px-5 py-4 bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl outline-none focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 focus:border-black dark:focus:border-white transition-all font-medium pr-12 text-gray-900 dark:text-white"
              placeholder="••••••••"
            />
            <button 
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showConfirm ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs font-bold text-red-500 animate-shake">{error}</p>
        )}

        <button 
          onClick={handleInitialSubmit}
          disabled={loading}
          className="px-8 py-4 bg-black dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold hover:opacity-80 transition-all active:scale-[0.98] shadow-lg shadow-black/5 dark:shadow-white/5 disabled:opacity-30 flex items-center justify-center min-w-[200px]"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 dark:border-slate-900/30 border-t-white dark:border-t-slate-900 rounded-full animate-spin"></div>
          ) : "Ubah Password"}
        </button>
      </div>

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setShowConfirmModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300">
             <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Konfirmasi Ubah Password</h3>
             <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed mb-8">
               Apakah Anda yakin ingin mengubah kata sandi Anda? Anda perlu masuk kembali jika sesi berakhir.
             </p>
             <div className="flex gap-3">
               <button 
                 onClick={() => setShowConfirmModal(false)}
                 className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition-all"
               >
                 Batal
               </button>
               <button 
                 onClick={handleConfirmedSave}
                 className="flex-1 px-4 py-3 bg-black dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:opacity-80 transition-all shadow-lg shadow-black/10"
               >
                 Ya, Ubah
               </button>
             </div>
          </div>
        </div>
      )}
    </>
  );
}

function SectionAppearance() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 rounded-3xl transition-colors duration-300">
        <h4 className="text-sm font-black text-gray-900 dark:text-white mb-4">Tema Aplikasi</h4>
        
        <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm transition-colors duration-300">
          <button
            onClick={() => toggleTheme("light")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              theme === "light" 
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm" 
                : "text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>
            Terang
          </button>
          <button
            onClick={() => toggleTheme("dark")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
              theme === "dark" 
                ? "bg-slate-800 text-white shadow-sm" 
                : "text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>
            Gelap
          </button>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-4 leading-relaxed font-medium uppercase tracking-wider">
          Pilih tema gelap untuk mengurangi ketegangan mata saat membaca dokumen hukum yang panjang.
        </p>
      </div>
    </div>
  );
}

// ── Tab Akun: daftar pengaturan sederhana (dokumen legal, hapus riwayat, hapus akun) ──

function SettingsGroup({ title, children }) {
  return (
    <section>
      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{title}</h4>
      <div className="rounded-2xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-200 dark:divide-slate-700">
        {children}
      </div>
    </section>
  );
}

function SettingsRow({ title, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const pillButton =
  "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40";
const pillNeutral = `${pillButton} border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700`;
const pillDanger = `${pillButton} border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10`;

// Dialog konfirmasi 2 langkah: (1) penjelasan → (2) ketik HAPUS
function ConfirmDeleteDialog({ open, title, description, consequences, confirmLabel, busy, error, onConfirm, onClose }) {
  const [step, setStep] = useState(1);
  const [text, setText] = useState("");

  useEffect(() => {
    if (open) { setStep(1); setText(""); }
  }, [open]);

  if (!open) return null;
  const close = () => { if (!busy) onClose(); };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-xl p-6">
        <p className="text-[11px] font-medium text-gray-400 mb-1">Langkah {step} dari 2</p>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>

        {step === 1 ? (
          <>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{description}</p>
            {consequences?.length > 0 && (
              <ul className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-300 list-disc pl-5">
                {consequences.map((c) => <li key={c}>{c}</li>)}
              </ul>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={close} className={pillNeutral}>Batal</button>
              <button type="button" onClick={() => setStep(2)} className={`${pillButton} border-red-600 bg-red-600 text-white hover:bg-red-700`}>Lanjutkan</button>
            </div>
          </>
        ) : (
          <>
            <label htmlFor="confirm-delete" className="mt-2 block text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Tindakan ini permanen. Ketik <span className="font-semibold text-gray-900 dark:text-white">HAPUS</span> untuk mengonfirmasi.
            </label>
            <input
              id="confirm-delete"
              type="text"
              autoFocus
              autoComplete="off"
              value={text}
              onChange={(e) => setText(e.target.value.toUpperCase())}
              placeholder="HAPUS"
              className="mt-3 w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-medium tracking-wider text-gray-900 dark:text-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            />
            {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={close} disabled={busy} className={pillNeutral}>Batal</button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={text !== "HAPUS" || busy}
                className={`${pillButton} border-red-600 bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed`}
              >
                {busy ? "Menghapus..." : confirmLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

const EXTERNAL_ICON = (
  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

function SectionLegal() {
  return (
    <SettingsGroup title="Dokumen legal">
      <SettingsRow title="Kebijakan Privasi" description="Data yang kami kumpulkan, penggunaannya, dan hak Anda.">
        <a href={LEGAL_PATHS.privacy} target="_blank" rel="noopener noreferrer" className={pillNeutral} aria-label="Buka Kebijakan Privasi di tab baru">
          Buka {EXTERNAL_ICON}
        </a>
      </SettingsRow>
      <SettingsRow title="Syarat dan Ketentuan" description="Aturan penggunaan layanan dan batasan informasi hukum AI.">
        <a href={LEGAL_PATHS.terms} target="_blank" rel="noopener noreferrer" className={pillNeutral} aria-label="Buka Syarat dan Ketentuan di tab baru">
          Buka {EXTERNAL_ICON}
        </a>
      </SettingsRow>
    </SettingsGroup>
  );
}

function SectionDataAndAccount({ onDeleteAccount }) {
  const [dialog, setDialog] = useState(null); // "history" | "account" | null
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const open = (which) => { setError(""); setDialog(which); };

  const deleteHistory = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await deleteAllChats();
      setDialog(null);
      setNotice(`${data.deletedChats ?? 0} percakapan telah dihapus.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    setBusy(true);
    setError("");
    try {
      await onDeleteAccount();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <SettingsGroup title="Data dan akun">
        <SettingsRow
          title="Hapus semua riwayat chat"
          description={notice || "Menghapus seluruh percakapan secara permanen. Akun dan langganan tetap aman."}
        >
          <button type="button" onClick={() => open("history")} className={pillDanger}>Hapus riwayat</button>
        </SettingsRow>
        <SettingsRow title="Hapus akun" description="Menghapus akun beserta profil, percakapan, dan riwayat transaksi secara permanen.">
          <button type="button" onClick={() => open("account")} className={pillDanger}>Hapus akun</button>
        </SettingsRow>
      </SettingsGroup>

      <ConfirmDeleteDialog
        open={dialog === "history"}
        title="Hapus semua riwayat chat?"
        description="Semua percakapan di sidebar akan dihapus dan tidak dapat dikembalikan."
        consequences={["Akun, profil, dan paket langganan tetap aman", "Kuota pertanyaan hari ini tidak bertambah"]}
        confirmLabel="Hapus semua riwayat"
        busy={busy}
        error={error}
        onConfirm={deleteHistory}
        onClose={() => setDialog(null)}
      />
      <ConfirmDeleteDialog
        open={dialog === "account"}
        title="Hapus akun Anda?"
        description="Anda akan keluar dan kehilangan akses ke TanyaHukum. Data berikut dihapus permanen:"
        consequences={["Profil dan konteks personal", "Seluruh riwayat percakapan", "Paket Pro dan riwayat transaksi"]}
        confirmLabel="Hapus akun permanen"
        busy={busy}
        error={error}
        onConfirm={deleteAccount}
        onClose={() => setDialog(null)}
      />
    </>
  );
}
