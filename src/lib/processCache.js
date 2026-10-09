// ==============================
// CACHE PROSES JAWABAN AI (di browser)
// Proses (tahap, dokumen, ringkasan berpikir AI) tidak disimpan di database.
// Disimpan di localStorage agar tetap bisa dilihat setelah refresh / saat membuka riwayat
// di browser yang sama. Dihapus saat logout & hapus akun (lihat src/lib/profile.js).
// ==============================

const STORAGE_KEY = "tanyahukum_process_cache";
const MAX_ENTRIES = 50;

// Hash sederhana (djb2) dari isi jawaban → kunci pencocokan jawaban di riwayat
function hashText(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

const keyFor = (chatId, answer) => `${chatId}:${hashText(answer || "")}`;

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveProcess(chatId, answer, process) {
  if (!chatId || !answer || !process) return;
  try {
    const cache = readCache();
    cache[keyFor(chatId, answer)] = { process, at: Date.now() };

    // Simpan maksimal MAX_ENTRIES proses terbaru
    const entries = Object.entries(cache).sort((a, b) => b[1].at - a[1].at).slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // localStorage penuh / diblokir → proses hanya tampil selama sesi ini
  }
}

export function getProcess(chatId, answer) {
  if (!chatId || !answer) return null;
  return readCache()[keyFor(chatId, answer)]?.process || null;
}

export function clearProcessCache() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
