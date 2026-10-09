// ==============================
// STORAGE KEY (Legacy & Session)
// ==============================
const ACTIVE_KEY = "active_conversation_id";

// ==============================
// GET ALL CHATS (BACKEND)
// ==============================
export async function getConversations(userId) {
  if (!userId) return [];
  const res = await fetch(`/api/chat?userId=${userId}&type=list`);
  const data = await res.json();
  return data.chats || [];
}

// ==============================
// CREATE NEW CONVERSATION (LOCAL RESET)
// ==============================
export function createNewConversation() {
  localStorage.removeItem(ACTIVE_KEY);
  window.dispatchEvent(new Event("load-conversation"));
  return { id: null };
}

// ==============================
// GET CURRENT ACTIVE ID
// ==============================
export function getCurrentConversationId() {
  return localStorage.getItem(ACTIVE_KEY);
}

// ==============================
// SET ACTIVE
// ==============================
export function setActiveConversation(id) {
  if (id) {
    localStorage.setItem(ACTIVE_KEY, id);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

// ==============================
// GET MESSAGES FOR CHAT (BACKEND)
// ==============================
export async function getChatMessages(userId, chatId) {
  if (!userId || !chatId) return [];
  const res = await fetch(`/api/chat?userId=${userId}&chatId=${chatId}`);
  const data = await res.json();
  return (data.history || []).map(m => ({
    role: m.role.toLowerCase() === "ai" ? "assistant" : "user",
    content: m.content
  }));
}

// ==============================
// RENAME CHAT (BACKEND)
// ==============================
export async function renameChat(chatId, title) {
  const res = await fetch("/api/chat", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, title }),
  });
  return await res.json();
}

// ==============================
// DELETE CHAT (BACKEND)
// ==============================
export async function deleteChat(chatId) {
  const res = await fetch(`/api/chat?chatId=${chatId}`, {
    method: "DELETE",
  });
  return await res.json();
}

// ==============================
// SEND MESSAGE (STREAMING) — transparansi proses
// Membaca event NDJSON dari /api/chat ({ stream: true }) dan meneruskannya ke onEvent.
// Error sebelum stream dimulai (401/403/429/...) tetap berupa JSON → dilempar seperti sendMessage.
// ==============================
export async function sendMessageStream({ message, chatId, onEvent }) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, chatId, stream: true }),
  });

  const contentType = res.headers.get("content-type") || "";
  if (!res.ok || !contentType.includes("ndjson") || !res.body) {
    const data = await res.json().catch(() => ({ error: "Terjadi kesalahan." }));
    if (!res.ok) throw data;
    return data; // fallback: server mengembalikan JSON biasa
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result = null;

  const handleLine = (line) => {
    if (!line.trim()) return;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      return;
    }
    if (event.type === "error") throw { error: event.error, limitReached: event.limitReached };
    if (event.type === "done") result = { answer: event.answer, chatId: event.chatId, durationMs: event.durationMs };
    onEvent?.(event);
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    lines.forEach(handleLine);
  }
  handleLine(buffer);

  if (!result) throw { error: "Koneksi terputus sebelum jawaban selesai. Silakan coba lagi." };
  return result;
}

// ==============================
// SEND MESSAGE (API)
// ==============================
export async function sendMessage({ message, userId, chatId }) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ message, userId, chatId }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw data;
  }

  return data;
}