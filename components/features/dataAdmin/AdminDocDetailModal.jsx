"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminDocDetailModal({ item, onClose, onEdit, onDelete }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => { setMounted(false); document.removeEventListener('keydown', handleEsc); };
  }, [onClose]);

  if (!item || !mounted) return null;

  const fileName = item.fileName || item.dokumen || item.title || "";
  const ext = fileName.split('.').pop()?.toUpperCase() || "DOC";
  const formattedDate = item.createdAt
    ? new Date(item.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : "—";

  // Admin open: uses GET only, no PATCH (no viewCount increment)
  const handleOpenDoc = () => {
    if (item.fileUrl) {
      window.open(item.fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Admin download: proxy through server to force Content-Disposition: attachment
  const handleDownload = async () => {
    if (!item.fileUrl) return;
    const safeFileName = fileName || "document.pdf";
    const proxyUrl = `/api/regulations/download?url=${encodeURIComponent(item.fileUrl)}&name=${encodeURIComponent(safeFileName)}`;
    try {
      const res = await fetch(proxyUrl);
      if (!res.ok || !res.headers.get("content-type")?.includes("application/pdf")) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Gagal mengunduh dokumen. Silakan coba lagi.");
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = safeFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      alert("Gagal mengunduh dokumen. Silakan coba lagi.");
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/30 backdrop-blur-md animate-fadeIn p-4 transition-colors" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] w-full max-w-[750px] overflow-hidden transform transition-all animate-slideUp border border-gray-100 dark:border-slate-800 transition-colors" onClick={(e) => e.stopPropagation()}>

        {/* HEADER */}
        <div className="bg-gray-50/50 dark:bg-slate-800/50 px-8 py-6 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between transition-colors">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center border border-blue-100 dark:border-blue-900/30 shrink-0 transition-colors">
              <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase transition-colors">{ext}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight truncate max-w-[450px] transition-colors">{item.dokumen || item.title}</h2>
              <p className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-0.5 transition-colors">Admin Preview · View Count Protected</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-gray-500"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* LEFT: Document Information */}
            <div className="space-y-5">
              <div>
                <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 transition-colors">Informasi Dokumen</h3>
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-gray-100 dark:border-slate-800 space-y-3 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors">Doc ID</span>
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 font-mono transition-colors">{item.id?.slice(-8) || "—"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors">Kategori</span>
                    <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-900/30 uppercase transition-colors">{item.category || "—"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors">Ukuran</span>
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 transition-colors">{formatFileSize(item.fileSize)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors">Format</span>
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 transition-colors">{ext}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest transition-colors">Tanggal Upload</span>
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 transition-colors">{formattedDate}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {item.deskripsi && (
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 transition-colors">Deskripsi</h3>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 leading-relaxed bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-100 dark:border-slate-800 transition-colors">{item.deskripsi}</p>
                </div>
              )}
            </div>

            {/* RIGHT: Analytics + Actions */}
            <div className="space-y-5">
              <div>
                <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 transition-colors">Analitik Engagement</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30 text-center transition-colors">
                    <p className="text-2xl font-black text-blue-600 dark:text-blue-400 transition-colors">{(item.viewCount || 0).toLocaleString()}</p>
                    <p className="text-[8px] font-black text-blue-400 dark:text-blue-500 uppercase tracking-widest mt-1 transition-colors">Total Views</p>
                  </div>
                  <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-xl p-4 border border-emerald-100 dark:border-emerald-900/30 text-center transition-colors">
                    <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 transition-colors">{item.viewCount > 50 ? "Popular" : item.viewCount > 10 ? "Active" : "Low"}</p>
                    <p className="text-[8px] font-black text-emerald-400 dark:text-emerald-500 uppercase tracking-widest mt-1 transition-colors">Status</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div>
                <h3 className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 transition-colors">Aksi Admin</h3>
                <div className="space-y-2">
                  <button onClick={handleOpenDoc} className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition shadow-lg shadow-blue-100 dark:shadow-blue-900/20 active:scale-95 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                    Buka Dokumen
                  </button>
                  <button onClick={handleDownload} className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-gray-900 dark:bg-slate-800 text-white font-bold text-xs hover:bg-black dark:hover:bg-slate-700 transition shadow-lg active:scale-95 transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Download File
                  </button>
                  {onEdit && (
                    <button onClick={() => { onClose(); onEdit(); }} className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 font-bold text-xs border border-gray-100 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition active:scale-95 transition-all">
                      <img src="/icons/edit.svg" alt="Edit" className="w-4 h-4 opacity-60" />
                      Edit Metadata
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => { onClose(); onDelete(); }} className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-500 dark:text-red-400 font-bold text-xs border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/20 transition active:scale-95 transition-all">
                      <img src="/icons/hapus.svg" alt="Hapus" className="w-4 h-4 opacity-60 dark:opacity-50" />
                      Hapus Dokumen
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
