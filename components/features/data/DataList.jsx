"use client";

import { useState, useEffect, useRef } from "react";
import DocumentDetailModal from "./DocumentDetailModal";

// Kategori yang tersedia sesuai backend
const CATEGORIES = ["Semua", "Ketenagakerjaan", "Perdata"];

export default function DataList() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // State untuk API temen bos
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [sortBy, setSortBy] = useState("title"); // title, viewCount, createdAt, updatedAt
  const [isEditingPage, setIsEditingPage] = useState(false);
  const [pageInputValue, setPageInputValue] = useState("");
  const trackedDocs = useRef(new Set()); // Anti-spam: Track docs already incremented in this session

  // Debounce: Tunggu 500ms setelah ngetik baru cari
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset ke halaman 1 kalau ganti pencarian/kategori
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, activeCategory]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Susun query parameter buat backend
        const params = new URLSearchParams();
        params.append("page", currentPage);
        if (debouncedSearch) params.append("search", debouncedSearch);
        if (activeCategory !== "Semua") params.append("category", activeCategory);
        params.append("sortBy", sortBy);

        // Tembak API yang udah dibikin temen
        const response = await fetch(`/api/regulations?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        // Sesuaikan dengan response JSON backend
        if (result.data && Array.isArray(result.data)) {
          setDocuments(result.data);
          setTotalPages(result.meta?.totalPages || 1);
        } else {
          console.error("Format data tidak sesuai:", result);
          setDocuments([]);
        }

      } catch (error) {
        console.error("Gagal mengambil data regulasi:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [debouncedSearch, activeCategory, currentPage, sortBy]);

  // Fungsi untuk menambah view count ke backend & update local state
  const handleIncrementView = async (docId, actionType = 'view') => {
    const trackKey = `${docId}:${actionType}`;
    if (!docId || trackedDocs.current.has(trackKey)) return;

    try {
      // Optimistic Update: Update UI immediately
      setDocuments(prev => prev.map(doc => 
        doc.id === docId ? { ...doc, viewCount: (doc.viewCount || 0) + 1 } : doc
      ));
      
      // Update selected doc if it's currently open
      if (selectedDoc?.id === docId) {
        setSelectedDoc(prev => ({ ...prev, viewCount: (prev.viewCount || 0) + 1 }));
      }

      trackedDocs.current.add(trackKey);

      // Tembak backend
      const response = await fetch(`/api/regulations/${docId}`, {
        method: 'PATCH'
      });

      if (!response.ok) {
        // Jika gagal, kita tidak rollback di sini agar UI tetap terasa snappy, 
        // tapi di dunia nyata mungkin perlu logic sinkronisasi ulang.
        console.warn("Gagal sinkronisasi viewCount ke server");
      }
    } catch (error) {
      console.error("Error incrementing viewCount:", error);
    }
  };

  // Fungsi untuk membuka link file (Tombol Baca)
  const handleOpenFile = (doc) => {
    if (doc?.fileUrl) {
      handleIncrementView(doc.id, 'read');
      window.open(doc.fileUrl, '_blank', 'noopener,noreferrer');
    } else {
      alert("Link file tidak tersedia.");
    }
  };

  // Fungsi khusus untuk memaksa unduhan (Tombol Unduh) — via server proxy
  const handleDownloadFile = async (doc) => {
    if (!doc?.fileUrl) {
      alert("Link file tidak tersedia.");
      return;
    }

    handleIncrementView(doc.id, 'download');

    const fileName = doc.fileName || doc.title || "document.pdf";
    const proxyUrl = `/api/regulations/download?url=${encodeURIComponent(doc.fileUrl)}&name=${encodeURIComponent(fileName)}`;

    try {
      const res = await fetch(proxyUrl);
      if (!res.ok || !res.headers.get("content-type")?.includes("application/pdf")) {
        const data = await res.json().catch(() => null);
        alert(data?.error || "Gagal mengunduh dokumen. Silakan coba lagi.");
        return;
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      alert("Gagal mengunduh dokumen. Silakan coba lagi.");
    }
  };

  // Helper to generate pagination numbers - Smarter & More Expanded
  const getPaginationRange = () => {
    const delta = 2; // Pages around current page
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">

      {/* Premium Header & Search Section */}
      <div className="flex-none p-8 pb-6 relative overflow-hidden">
        {/* Ambient Radial Glow */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full -translate-y-1/2 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto space-y-8 relative z-10">
          {/* Greeting Section */}
          <div className="space-y-2 animate-fade-down">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-black tracking-widest uppercase border border-blue-100 dark:border-blue-800 shadow-sm transition-colors">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              Legal Intelligence System
            </div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight leading-none transition-colors">
              Pusat Data Hukum
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium max-w-xl leading-relaxed transition-colors">
              Temukan regulasi dan dokumen hukum resmi melalui sistem pencarian cerdas kami.
            </p>
          </div>

          {/* Integrated Search & Filter Container */}
          <div className="space-y-6">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-slate-700/80 rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] p-2 animate-fade-down delay-75 focus-ring premium-glow transition-colors">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 group">
                  <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Cari regulasi ketenagakerjaan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-14 pr-6 py-5 bg-transparent border-none outline-none font-bold text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 text-lg transition-colors"
                  />
                </div>

                <button className="flex items-center justify-center w-14 h-14 bg-gray-900 hover:bg-black dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-xl shadow-black/10 mr-1 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </button>
              </div>
            </div>

            {/* Control Bar: Categories & Sorting */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 animate-fade-down delay-150">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 scrollbar-hide">
                <style jsx>{`
                  .scrollbar-hide::-webkit-scrollbar { display: none; }
                  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                `}</style>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`whitespace-nowrap px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 border ${
                      activeCategory === cat
                      ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 dark:shadow-blue-900/50 scale-105"
                      : "bg-white/50 dark:bg-slate-800/50 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-800 hover:text-blue-500 hover:bg-white dark:hover:bg-slate-800 shadow-sm"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Advanced Sorting Control */}
              <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-1.5 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm transition-colors">
                {[
                  { id: "title", label: "A-Z", icon: <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4"></path><path d="M7 20V4"></path><path d="m20 8-4-4-4 4"></path><path d="M16 4v16"></path></svg> },
                  { id: "viewCount", label: "Populer", icon: <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"></path><path d="m17 5-5-3-5 3"></path><path d="m17 19-5 3-5-3"></path></svg> },
                  { id: "createdAt", label: "Terbaru", icon: <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14"></path><path d="M5 2h14"></path><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path></svg> }
                ].map((sort) => (
                  <button
                    key={sort.id}
                    onClick={() => setSortBy(sort.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                      sortBy === sort.id
                      ? "bg-gray-900 dark:bg-slate-200 text-white dark:text-slate-900 border-gray-900 dark:border-slate-200 shadow-md shadow-gray-200 dark:shadow-none"
                      : "text-gray-400 border-transparent hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white dark:hover:bg-slate-800"
                    }`}
                  >
                    {sort.icon}
                    {sort.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* List Section - Productivity Focused */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-0">
        <div className="max-w-5xl mx-auto space-y-4">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-2 mb-2">
              {searchQuery || activeCategory !== "Semua" ? "Hasil Pencarian" : "Koleksi Regulasi"}
            </h3>

        {isLoading ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500"></div>
            <p className="text-blue-500 font-medium">Memuat Dokumen...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-[2.5rem] border border-dashed border-gray-200 dark:border-slate-700 transition-colors">
            <p className="font-bold">Tidak ada dokumen yang ditemukan.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {documents.map((item, i) => (
                <div
                  key={item.id || i}
                  onClick={() => {
                    setSelectedDoc(item);
                    handleIncrementView(item.id, 'view');
                  }}
                  className={`group flex flex-col p-6 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-[2.5rem] hover:border-blue-400 dark:hover:border-blue-500 hover-lift transition-all duration-500 cursor-pointer animate-fade-down relative overflow-hidden`}
                  style={{ animationDelay: `${(i % 6) * 75 + 200}ms` }}
                >
                  {/* Subtle Hover Glow */}
                  <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/[0.02] transition-colors duration-500" />

                  <div className="flex items-start justify-between mb-6 relative z-10">
                    <div className="w-14 h-14 flex items-center justify-center bg-gray-50 dark:bg-slate-800 text-gray-400 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-inner border border-gray-100 dark:border-slate-700 group-hover:border-blue-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {item.category && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md border border-blue-200 dark:border-blue-800 transition-colors">
                          {item.category}
                        </span>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Verified</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-8 relative z-10">
                    <h3 className="text-[17px] font-black text-gray-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300 line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-gray-400 font-medium line-clamp-2 leading-relaxed">
                      {item.description || "Dokumen hukum resmi yang mengatur tentang subjek terkait. Informasi ini telah diverifikasi dan merupakan bagian dari pusat data hukum nasional."}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-5 border-t border-gray-50 dark:border-slate-800 relative z-10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-100 dark:border-slate-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:border-blue-100 dark:group-hover:border-blue-800 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-blue-500"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        <span className="text-[10px] font-black text-gray-500 group-hover:text-blue-600">
                          {item.viewCount?.toLocaleString() || "0"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest mr-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">View Details</span>
                      <div className="w-8 h-8 flex items-center justify-center bg-gray-50 dark:bg-slate-800 rounded-lg text-gray-400 dark:text-gray-500 group-hover:bg-blue-600 group-hover:text-white group-hover:rotate-[-45deg] transition-all duration-500">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Clean Numerical Pagination Controls - Moved Outside Grid for True Centering */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-8 mt-16 py-10 border-t border-gray-100/80 dark:border-slate-800 w-full transition-colors">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-sm mr-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>

                  <div className="flex items-center gap-2">
                    {getPaginationRange().map((page, idx) => (
                      page === "..." ? (
                        <span key={`dots-${idx}`} className="px-2 text-gray-300 font-black tracking-widest text-[10px]">...</span>
                      ) : (
                        <div key={`page-container-${page}`} className="relative">
                          {currentPage === page ? (
                            isEditingPage ? (
                              <input
                                autoFocus
                                type="number"
                                value={pageInputValue}
                                onChange={(e) => setPageInputValue(e.target.value)}
                                onBlur={() => setIsEditingPage(false)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const val = parseInt(pageInputValue);
                                    if (val >= 1 && val <= totalPages) {
                                      setCurrentPage(val);
                                      setIsEditingPage(false);
                                    }
                                  } else if (e.key === "Escape") {
                                    setIsEditingPage(false);
                                  }
                                }}
                                className="w-12 h-10 flex items-center justify-center rounded-xl text-xs font-black border-2 border-blue-600 text-center focus:outline-none focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/30 shadow-inner bg-blue-50/30 dark:bg-blue-900/10 text-gray-900 dark:text-white"
                              />
                            ) : (
                              <button
                                onClick={() => {
                                  setIsEditingPage(true);
                                  setPageInputValue(currentPage.toString());
                                }}
                                className="w-10 h-10 flex items-center justify-center rounded-xl text-xs font-black border border-blue-600 bg-blue-600 text-white scale-110 shadow-lg shadow-blue-200 transition-all group"
                              >
                                {page}
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Klik untuk loncat</div>
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => setCurrentPage(page)}
                              className="w-10 h-10 flex items-center justify-center rounded-xl text-xs font-black transition-all border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-400 hover:border-blue-300 dark:hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 hover:shadow-md active:scale-95"
                            >
                              {page}
                            </button>
                          )}
                        </div>
                      )
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-sm ml-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        </div>

      <DocumentDetailModal 
        isOpen={!!selectedDoc} 
        onClose={() => setSelectedDoc(null)} 
        document={selectedDoc}
        onIncrementView={handleIncrementView}
      />
      </div>
    </div>
  );
}