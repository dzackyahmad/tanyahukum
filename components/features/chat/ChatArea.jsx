"use client";

import { useState, useEffect, useRef } from "react";
import Header from "@/components/layout/Header";
import LegalResponse from "./LegalResponse";
import AIDisclaimer from "./AIDisclaimer";
import ProcessPanel from "./ProcessPanel";
import FallbackNotice from "./FallbackNotice";
import { ModelLimitNotice, ModelSwitchNotice, QuotaWarning } from "./LimitNotice";
import ChatInput from "./ChatInput";
import ModeToggle, { DEFAULT_MODE, MODE_IDS } from "./ModeToggle";

import {
  sendMessageStream,
  createNewConversation,
  getCurrentConversationId,
  getChatMessages,
  setActiveConversation
} from "@/src/lib/chat";
import { saveProcess, getProcess } from "@/src/lib/processCache";

// RANDOM TEXT
const EMPTY_TITLES = [
  "Halo Sobat Indonesia!!",
  "Butuh Bantuan Hukum?",
  "Yuk Kita Bahas Masalahmu",
  "Tanya Hukum Tanpa Ribet",
  "Ngobrolin Hukum Jadi Mudah",
  "Cari Jawaban Hukum di Sini",
];

const EMPTY_PROMPTS = [
  "Lagi bingung soal hukum? Tanyakan di sini, biar jelas dan nggak salah langkah.",
  "Ada masalah hukum? Jelaskan situasimu, nanti aku bantu jelasin aturannya.",
  "Butuh pencerahan soal hukum? Tanya aja, kita bedah bareng sampai paham.",
  "Dari kasus ringan sampai serius, semua bisa kamu tanyakan di sini.",
  "Nggak ngerti pasal-pasal? Tenang, aku bantu jelasin dengan bahasa yang simpel.",
  "Curiga ada pelanggaran hukum? Coba ceritakan, kita analisis bareng.",
  "Mau tahu hak dan kewajibanmu secara hukum? Mulai dari sini.",
];

// Rekomendasi pertanyaan — tiap item sudah diuji ke database (Pinecone): dokumen teratas
// berisi pasal yang langsung menjawab. Jangan menambah pertanyaan tanpa menguji dulu.
// Setiap obrolan baru menampilkan SUGGESTION_COUNT pertanyaan acak dari daftar ini.
const SUGGESTED_QUESTIONS = [
  { label: "Kontrak kerja (PKWT)", question: "Berapa lama maksimal perjanjian kerja waktu tertentu (PKWT)?" },
  { label: "Kerja lembur", question: "Berapa batas maksimal waktu kerja lembur?" },
  { label: "Cuti tahunan", question: "Apa hak istirahat dan cuti tahunan pekerja?" },
  { label: "Pekerja disabilitas", question: "Apa saja kewajiban pemberi kerja terhadap penyandang disabilitas?" },
  { label: "Alasan PHK", question: "Apa saja alasan perusahaan boleh melakukan PHK?" },
  { label: "Lapor lowongan kerja", question: "Apakah perusahaan wajib melaporkan lowongan pekerjaan?" },
  { label: "Upah minimum", question: "Bagaimana ketentuan upah minimum bagi pekerja?" },
  { label: "Pekerja anak", question: "Apa larangan mempekerjakan anak di bawah umur?" },
  { label: "Kawasan tanpa rokok", question: "Apa saja tempat yang termasuk kawasan tanpa rokok?" },
  { label: "Bangunan gedung", question: "Apa saja kewajiban pemilik bangunan gedung?" },
  { label: "Perselisihan kerja", question: "Bagaimana penyelesaian perselisihan hubungan industrial?" },
  { label: "Jam kerja", question: "Berapa jam waktu kerja maksimal dalam seminggu?" },
  { label: "Perjanjian kerja bersama", question: "Apa itu perjanjian kerja bersama (PKB)?" },
  { label: "Serikat pekerja", question: "Apa hak serikat pekerja di perusahaan?" },
  { label: "Pemagangan", question: "Apa syarat program pemagangan bagi peserta magang?" },
  { label: "Penanggulangan bencana", question: "Bagaimana penyelenggaraan penanggulangan bencana di daerah?" },
  { label: "Disabilitas & layanan publik", question: "Apa saja hak penyandang disabilitas dalam pelayanan publik?" },
  { label: "Izin bangunan (PBG)", question: "Apa itu Persetujuan Bangunan Gedung (PBG)?" },
  { label: "Penempatan tenaga kerja", question: "Bagaimana mekanisme penempatan tenaga kerja?" },
  { label: "Pekerja menyusui", question: "Apa kewajiban pengusaha terhadap pekerja perempuan yang menyusui?" },
  { label: "Mogok kerja", question: "Bagaimana tata cara mogok kerja yang sah?" },
];

const getRandomItem = (arr) => {
  return arr[Math.floor(Math.random() * arr.length)];
};

// Ambil n item acak tanpa duplikat (Fisher–Yates)
const getRandomItems = (arr, n) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
};

const SUGGESTION_COUNT = 4;

export default function ChatArea({ user, onOpenAuth, onOpenSubscription }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Model & mode jawaban (default: Gemini 3.5 Flash-Lite · Kilat). Pilihan disimpan di browser.
  const [chatMode, setChatMode] = useState(DEFAULT_MODE);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tanyahukum_chat_mode");
      if (MODE_IDS.includes(saved)) setChatMode(saved);
    } catch {}
  }, []);
  const changeChatMode = (mode) => {
    setChatMode(mode);
    try { localStorage.setItem("tanyahukum_chat_mode", mode); } catch {}
  };

  const [emptyTitle, setEmptyTitle] = useState("");
  const [emptyText, setEmptyText] = useState("");
  const [suggestions, setSuggestions] = useState([]); // diacak tiap obrolan baru

  const sendingRef = useRef(false);
  // Peringatan batas ≥ 70%: kuota pertanyaan pengguna (dari server) & kuota harian model
  // (cukup sekali per model selama halaman terbuka agar tidak muncul di setiap jawaban)
  const [quota, setQuota] = useState(null);
  const [quotaDismissed, setQuotaDismissed] = useState(false);
  const warnedModelsRef = useRef(new Set());
  // Model terpilih habis → menu model memindahkan pilihan otomatis & memberi tahu di sini.
  // statusRefresh naik setelah ada fallback agar status menu model diambil ulang.
  const [modelSwitch, setModelSwitch] = useState(null);
  const [statusRefresh, setStatusRefresh] = useState(0);
  const openUpgrade = () => (onOpenSubscription ? onOpenSubscription() : window.dispatchEvent(new Event("open-subscription")));

  // ==============================
  // INIT & SWITCH CONVERSATION
  // ==============================
  useEffect(() => {
    const loadConversation = async () => {
      const activeId = getCurrentConversationId();
      
      if (activeId && user) {
        setLoading(true);
        try {
          const history = await getChatMessages(user.id, activeId);
          // Pasang kembali proses jawaban yang tersimpan di browser (jika ada)
          setMessages(history.map((m) =>
            m.role === "assistant" ? { ...m, process: getProcess(activeId, m.content) } : m
          ));
        } catch (err) {
          console.error("Failed to load messages:", err);
          setMessages([]);
        } finally {
          setLoading(false);
        }
      } else {
        setMessages([]);
        setEmptyTitle(getRandomItem(EMPTY_TITLES));
        setEmptyText(getRandomItem(EMPTY_PROMPTS));
        setSuggestions(getRandomItems(SUGGESTED_QUESTIONS, SUGGESTION_COUNT));
      }
    };

    loadConversation();

    window.addEventListener("load-conversation", loadConversation);
    return () =>
      window.removeEventListener("load-conversation", loadConversation);
    // Bergantung pada user.id (bukan objek user): event "auth-change" setelah menjawab
    // membuat objek user baru → dulu memicu muat ulang dari DB & menghapus panel proses.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ==============================
  // SEND MESSAGE
  // ==============================
  // overrideText: dipakai tombol rekomendasi pertanyaan (kirim langsung tanpa mengetik)
  // Tombol Stop: membatalkan request yang sedang berjalan
  const abortRef = useRef(null);
  const stopGeneration = () => abortRef.current?.abort();

  // Edit pertanyaan yang dihentikan: { key, text }
  const [editing, setEditing] = useState(null);
  const submitEdit = (userKey, newText) => {
    if (!newText.trim()) return;
    const aiKey = userKey.replace(/-user$/, "");
    // Pertanyaan yang dihentikan tidak tersimpan di riwayat → ganti dengan versi baru
    setMessages((prev) => prev.filter((m) => m.key !== userKey && m.key !== aiKey));
    setEditing(null);
    handleSend(newText);
  };

  const handleSend = async (overrideText) => {
    const text = typeof overrideText === "string" ? overrideText : message;
    if (!text.trim()) return;

    if (!user) {
      onOpenAuth("login");
      return;
    }

    if (user?.tier !== "PRO" && user?.promptLimit <= 0) {
      if (onOpenSubscription) onOpenSubscription();
      else window.location.href = "/subscription";
      return;
    }

    if (loading || sendingRef.current) return;
    sendingRef.current = true;

    const currentChatId = getCurrentConversationId();

    // Placeholder jawaban AI yang diisi bertahap oleh event streaming (transparansi proses)
    const streamKey = `stream-${Date.now()}`;
    const userKey = `${streamKey}-user`;
    const userMessage = {
      role: "user",
      content: text,
      key: userKey,
    };
    const placeholder = {
      role: "assistant",
      content: "",
      streaming: true,
      key: streamKey,
      process: {
        mode: chatMode,
        model: null,
        fallback: false,
        steps: { search: "pending", think: "pending", write: "pending" },
        sources: null,
        thinking: "",
        done: false,
        durationMs: null,
        startedAt: Date.now(),      // untuk penghitung waktu berjalan
        stepDurations: {},          // ms per tahap: { search, think, write }
      },
    };
    // Waktu mulai tiap tahap, diukur saat event tiba di browser
    const stepStartedAt = {};
    const updateStreamMsg = (fn) =>
      setMessages((prev) => prev.map((m) => (m.key === streamKey ? fn(m) : m)));

    setMessages((prev) => [...prev, userMessage, placeholder]);
    setMessage("");
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let hadFallback = false;
      const data = await sendMessageStream({
        signal: controller.signal,
        message: text,
        chatId: currentChatId,
        mode: chatMode,
        onEvent: (event) => {
          if (event.type === "step") {
            const now = Date.now();
            if (event.state === "active") stepStartedAt[event.step] = now;
            const duration = event.state === "done" && stepStartedAt[event.step] ? now - stepStartedAt[event.step] : null;
            updateStreamMsg((m) => ({
              ...m,
              process: {
                ...m.process,
                steps: { ...m.process.steps, [event.step]: event.state },
                stepDurations: duration !== null ? { ...m.process.stepDurations, [event.step]: duration } : m.process.stepDurations,
              },
            }));
          } else if (event.type === "sources") {
            updateStreamMsg((m) => ({ ...m, process: { ...m.process, sources: { count: event.count, used: event.used, filtered: event.filtered, uniqueCount: event.uniqueCount, docs: event.docs || [] } } }));
          } else if (event.type === "model") {
            updateStreamMsg((m) => ({ ...m, process: { ...m.process, model: event.model, provider: event.provider, contextChunks: event.contextChunks, mode: event.mode || m.process.mode, fallback: !!event.fallback } }));
          } else if (event.type === "fallback") {
            hadFallback = true;
            // Model berganti otomatis; pengguna tidak perlu mengirim ulang pertanyaan
            updateStreamMsg((m) => ({ ...m, process: { ...m.process, fallbacks: [...(m.process.fallbacks || []), { from: event.fromLabel, to: event.toLabel, reason: event.reason, restarted: !!event.restarted }] } }));
          } else if (event.type === "reset") {
            // Jawaban diulang dari awal (model berganti di tengah jawaban, atau jawaban diblok)
            updateStreamMsg((m) => ({ ...m, content: "", process: { ...m.process, thinking: "" } }));
          } else if (event.type === "thinking") {
            updateStreamMsg((m) => ({ ...m, process: { ...m.process, thinking: m.process.thinking + event.text } }));
          } else if (event.type === "text") {
            updateStreamMsg((m) => ({ ...m, content: m.content + event.text }));
          }
        },
      });

      // Update chatId if it was a new chat
      if (!currentChatId && data.chatId) {
        setActiveConversation(data.chatId);
        window.dispatchEvent(new Event("refresh-chats"));
      }

      if (hadFallback) setStatusRefresh((k) => k + 1);
      if (data.quota) {
        setQuota(data.quota);
        setQuotaDismissed(false);
      }
      if (user?.tier !== "PRO" && (data.quota || !data.blocked)) {
        const updatedUser = {
          ...user,
          // Sisa dari server bila ada (lebih akurat), selain itu dikurangi satu seperti sebelumnya
          promptLimit: data.quota ? data.quota.remaining : Math.max(0, (user.promptLimit || 1) - 1),
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        window.dispatchEvent(new Event("auth-change"));
      }
      const modelWarning = data.modelWarning && !warnedModelsRef.current.has(data.modelWarning.model) ? data.modelWarning : null;
      if (modelWarning) warnedModelsRef.current.add(modelWarning.model);

      // Finalisasi: jawaban lengkap dari server + tandai proses selesai, lalu simpan
      // prosesnya di browser agar tetap bisa dilihat setelah refresh / buka riwayat.
      updateStreamMsg((m) => {
        const finalMsg = {
          ...m,
          content: data.answer ?? m.content,
          streaming: false,
          process: {
            ...m.process,
            steps: { search: "done", think: "done", write: "done" },
            done: true,
            durationMs: data.durationMs ?? null,
            modelWarning,
          },
        };
        saveProcess(data.chatId, finalMsg.content, finalMsg.process);
        return finalMsg;
      });
      window.dispatchEvent(new Event("auth-change"));

    } catch (err) {
      if (err?.aborted) {
        // Dihentikan pengguna: jawaban sebagian tetap tampil (tidak disimpan), pertanyaan bisa diedit
        setMessages((prev) =>
          prev
            .filter((m) => m.key !== streamKey || m.content)
            .map((m) => {
              if (m.key === userKey) return { ...m, stopped: true };
              if (m.key === streamKey) {
                return { ...m, streaming: false, stopped: true, process: m.process ? { ...m.process, done: true, durationMs: Date.now() - m.process.startedAt } : m.process };
              }
              return m;
            })
        );
        return;
      }
      // Ganti placeholder dengan pesan error (tanpa panel proses)
      updateStreamMsg(() => ({
        role: "assistant",
        content: err.error || "Terjadi kesalahan.",
      }));
    } finally {
      abortRef.current = null;
      setLoading(false);
      sendingRef.current = false;
    }
  };

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  return (
    <div className="h-full flex flex-col min-h-0 relative">

      {/* HEADER */}
      <div className="flex-none border-b border-gray-200 dark:border-slate-800">
        <Header
          user={user}
          onOpenAuth={onOpenAuth}
          onOpenSubscription={onOpenSubscription}
        />
      </div>

      {/* CONTENT */}
      <div className="flex-1 flex flex-col min-h-0">

        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6">

            <h1 className="text-4xl font-semibold text-gray-900 dark:text-white mb-2 text-center animate-fade-down">
              {emptyTitle}
            </h1>

            <p className="text-gray-600 dark:text-gray-400 text-lg mb-10 text-center max-w-xl animate-fade-down delay-75">
              {emptyText}
            </p>

            {quota?.warning && !quotaDismissed && (
              <QuotaWarning quota={quota} onUpgrade={openUpgrade} onClose={() => setQuotaDismissed(true)} className="max-w-2xl" />
            )}
            {modelSwitch && <ModelSwitchNotice change={modelSwitch} onClose={() => setModelSwitch(null)} className="max-w-2xl" />}

            {/* INPUT TENGAH */}
            <div data-tour="chat-input" className="w-full max-w-2xl flex flex-col border-2 border-blue-100 dark:border-slate-700 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm animate-fade-down delay-150 focus-ring premium-glow transition-colors">

              {/* Teks memakai seluruh lebar kotak; pilihan model & tombol kirim di baris bawah */}
              <ChatInput
                value={message}
                onChange={setMessage}
                onSubmit={handleSend}
                disabled={loading}
                placeholder="Ketik Pertanyaan Hukum Anda di sini..."
                className="px-6 pt-4 pb-1"
              />

              <div className="flex items-center gap-1 px-2 pb-2">
                {/* spacer, bukan justify-end: di kotak yang sangat sempit tombol meluap ke kanan, tidak tertutup sidebar */}
                <div className="flex-1" />
                <ModeToggle mode={chatMode} onChange={changeChatMode} disabled={loading} refreshKey={statusRefresh} onAutoSwitch={setModelSwitch} />

                <button
                  id="send-btn-center"
                  onClick={loading ? stopGeneration : handleSend}
                  title={loading ? "Hentikan jawaban" : "Kirim"}
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all active:scale-95 group/send"
                >
                  {loading ? <StopIcon /> : <img
                    src="/icons/sendChat.svg"
                    className="w-6 h-6 transition-all group-hover/send:scale-110"
                    style={{
                      filter: "invert(37%) sepia(93%) saturate(1352%) hue-rotate(200deg) brightness(88%) contrast(101%)"
                    }}
                  />}
                </button>
              </div>

            </div>

            {/* REKOMENDASI PERTANYAAN */}
            <div className="w-full max-w-2xl mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-fade-down delay-150">
              {suggestions.map((s) => (
                <button
                  key={s.question}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSend(s.question)}
                  className="group text-left px-4 py-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/50 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50/60 dark:hover:bg-slate-800 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  <span className="block text-xs font-semibold text-blue-600 dark:text-blue-400">{s.label}</span>
                  <span className="block mt-0.5 text-sm text-gray-600 dark:text-slate-300 group-hover:text-gray-900 dark:group-hover:text-white leading-snug transition-colors">
                    {s.question}
                  </span>
                </button>
              ))}
            </div>

            <AIDisclaimer className="mt-5 max-w-2xl animate-fade-down delay-150" />
          </div>

        ) : (
          <>
            {/* CHAT LIST */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 min-h-0 scroll-smooth">
              <div className="max-w-5xl mx-auto flex flex-col gap-7">

                {messages.map((msg, i) =>
                  msg.role === "user" ? (
                    <div key={i} className="flex flex-col items-end group/user">
                      {editing && msg.key && editing.key === msg.key ? (
                        <div className="w-full sm:max-w-[70%] rounded-2xl border border-blue-300 dark:border-blue-500/50 bg-white dark:bg-slate-800 p-3">
                          <textarea
                            autoFocus
                            value={editing.text}
                            onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                            rows={3}
                            className="w-full resize-none bg-transparent outline-none text-[15px] text-gray-800 dark:text-slate-100"
                          />
                          <div className="mt-2 flex justify-end gap-2">
                            <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 text-xs font-semibold rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700">Batal</button>
                            <button type="button" disabled={loading || !editing.text.trim()} onClick={() => submitEdit(msg.key, editing.text)} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">Kirim ulang</button>
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl rounded-br-md bg-blue-600 text-white text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                          {msg.content}
                        </div>
                      )}
                      {!(editing && msg.key && editing.key === msg.key) && (
                        <div className="mt-1 flex items-center gap-1 opacity-70 group-hover/user:opacity-100 transition-opacity">
                          {msg.stopped && <span className="text-[11px] text-amber-600 dark:text-amber-400 mr-1">Dihentikan · tidak disimpan</span>}
                          <ActionButton
                            icon="/icons/copy.svg"
                            label={copiedIndex === `u-${i}` ? "Tersalin" : "Salin"}
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content);
                              setCopiedIndex(`u-${i}`);
                              setTimeout(() => setCopiedIndex((cur) => (cur === `u-${i}` ? null : cur)), 2000);
                            }}
                          />
                          {msg.stopped && msg.key && (
                            <ActionButton icon="/icons/pen.svg" label="Edit" onClick={() => setEditing({ key: msg.key, text: msg.content })} />
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div key={i} className="flex items-start gap-3 group">
                      <BotAvatar />

                      <div className="flex-1 min-w-0 sm:max-w-[92%]">
                        <div className="px-5 py-4 sm:px-6 sm:py-5 rounded-2xl rounded-tl-md bg-white dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/60">
                          {msg.process && <ProcessPanel process={msg.process} />}
                          {msg.process?.fallbacks?.length > 0 && <FallbackNotice fallbacks={msg.process.fallbacks} />}
                          {msg.process?.modelWarning && <ModelLimitNotice warning={msg.process.modelWarning} />}
                          {msg.content && <LegalResponse content={msg.content} />}
                        </div>

                        {/* ACTIONS (di bawah jawaban) */}
                        <div className={`mt-1.5 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity ${msg.streaming ? "hidden" : ""}`}>
                          <ActionButton
                            icon="/icons/copy.svg"
                            label={copiedIndex === i ? "Tersalin" : "Salin"}
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content);
                              setCopiedIndex(i);
                              setTimeout(() => setCopiedIndex((cur) => (cur === i ? null : cur)), 2000);
                            }}
                          />
                          <ActionButton
                            icon="/icons/regenerate.svg"
                            label="Ulangi"
                            onClick={() => {
                              const lastUserIdx = messages.slice(0, i).findLastIndex(m => m.role === "user");
                              if (lastUserIdx !== -1) {
                                const lastUserText = messages[lastUserIdx].content;
                                setMessage(lastUserText);
                                setTimeout(() => {
                                  const sendBtn = document.getElementById("send-btn");
                                  if (sendBtn) sendBtn.click();
                                }, 0);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                )}

                {loading && !messages.some((m) => m.streaming) && (
                  <div className="flex items-start gap-3">
                    <BotAvatar />
                    <div className="bg-white dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700/60 px-5 py-4 rounded-2xl rounded-tl-md flex gap-1.5 items-center">
                      <div className="w-1.5 h-1.5 bg-blue-400 dark:bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-blue-600 dark:bg-blue-300 rounded-full animate-bounce"></div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="px-4 sm:px-6 pt-4 pb-3 border-t border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 transition-colors">
              {quota?.warning && !quotaDismissed && (
                <QuotaWarning quota={quota} onUpgrade={openUpgrade} onClose={() => setQuotaDismissed(true)} />
              )}
              {modelSwitch && <ModelSwitchNotice change={modelSwitch} onClose={() => setModelSwitch(null)} />}
              <div data-tour="chat-input" className="max-w-5xl mx-auto w-full flex flex-col border border-blue-200 dark:border-slate-700 rounded-[1.5rem] overflow-hidden bg-white dark:bg-slate-800 shadow-xl shadow-blue-500/5 focus-ring transition-all">

                {/* Teks memakai seluruh lebar kotak; pilihan model & tombol kirim di baris bawah */}
                <ChatInput
                  value={message}
                  onChange={setMessage}
                  onSubmit={handleSend}
                  disabled={loading}
                  placeholder="Ketik Pertanyaan Hukum Anda di sini..."
                  className="px-6 pt-4 pb-1"
                />

                <div className="flex items-center gap-1 px-2 pb-2">
                  {/* spacer, bukan justify-end: di kotak yang sangat sempit tombol meluap ke kanan, tidak tertutup sidebar */}
                  <div className="flex-1" />
                  <ModeToggle mode={chatMode} onChange={changeChatMode} disabled={loading} openUpward refreshKey={statusRefresh} onAutoSwitch={setModelSwitch} />

                  <button
                    id="send-btn"
                    onClick={loading ? stopGeneration : handleSend}
                    title={loading ? "Hentikan jawaban" : "Kirim"}
                    className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl transition-all active:scale-95 flex items-center justify-center shrink-0 group/send"
                  >
                    {loading ? <StopIcon /> : <img
                      src="/icons/sendChat.svg"
                      className="w-5 h-5 transition-all group-hover/send:translate-x-0.5 group-hover/send:-translate-y-0.5"
                      style={{
                        filter: "invert(37%) sepia(93%) saturate(1352%) hue-rotate(200deg) brightness(88%) contrast(101%)"
                      }}
                    />}
                  </button>
                </div>

              </div>

              <AIDisclaimer className="mt-3" />
            </div>
          </>
        )}

      </div>
    </div>
  );
}

function StopIcon() {
  return (
    <span className="w-5 h-5 flex items-center justify-center" aria-label="Hentikan">
      <span className="w-3 h-3 rounded-[3px] bg-blue-600 dark:bg-blue-400" />
    </span>
  );
}

function BotAvatar() {
  return (
    <div className="shrink-0 w-8 h-8 mt-0.5 rounded-xl bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 flex items-center justify-center">
      <img src="/icons/logo.svg" alt="TanyaHukum" className="w-5 h-5" />
    </div>
  );
}

function ActionButton({ icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-700 dark:hover:text-slate-200 transition-colors"
    >
      <img src={icon} alt="" className="w-3.5 h-3.5 opacity-60 dark:invert" />
      {label}
    </button>
  );
}
