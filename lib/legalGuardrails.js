// Guardrail jawaban hukum: jenis pertanyaan (umum/spesifik), kekuatan dukungan dokumen,
// peringatan konsultasi, dan pemeriksaan bahwa sumber yang dikutip AI memang ada di
// dokumen yang dibacanya.

// ── 1. Jenis pertanyaan ──────────────────────────────────────────────────────
// UMUM     : isi/arti aturan, syarat, prosedur, hak & kewajiban secara umum.
//            Contoh: "Apa saja hak pekerja yang di-PHK?"
// SPESIFIK : situasi pribadi/studi kasus, meminta penilaian hasil (menang/kalah, dipidana
//            atau tidak), strategi atau langkah untuk kasusnya, atau hitungan untuk dirinya.
//            Contoh: "Saya di-PHK tanpa pesangon setelah 5 tahun, apakah saya bisa menggugat?"
// Pertanyaan spesifik TETAP dijawab dari dokumen, ditambah peringatan bahwa jawaban
// bukan pengganti konsultasi dengan ahli hukum.

const FIRST_PERSON = "(saya|aku|kami|gue|gw|sy)";
const PARTIES =
  "(atasan|bos|majikan|perusahaan|kantor|pabrik|suami|istri|anak|ayah|ibu|orang ?tua|mertua|keluarga|tetangga|pacar|mantan|pemilik|penyewa|pembeli|penjual|debitur|kreditur|karyawan|pegawai|klien|kontrak|perjanjian|tanah|rumah|sertifikat|gaji|upah|pesangon|utang|hutang|pinjaman|warisan|akun|kasus|perkara|masalah|laporan|sengketa)";

const SPECIFIC_PATTERNS = [
  // pihak/objek milik penanya: "atasan saya", "suamiku", "kontrak kami"
  { id: "situasi_pribadi", re: new RegExp(`\\b${PARTIES}\\s*(${FIRST_PERSON.slice(1, -1)}|ku|nya saya)\\b`) },
  // penanya mengalami sesuatu: "saya dipecat", "aku ditipu", "kami terlambat"
  { id: "situasi_pribadi", re: new RegExp(`\\b${FIRST_PERSON}\\s+(sudah |telah |baru |pernah |sedang |akan )?(di|ter)-?[a-z]{3,}`) },
  // penanya bertindak dalam kasus: "saya bekerja 5 tahun", "saya meminjam", "saya menandatangani"
  { id: "situasi_pribadi", re: new RegExp(`\\b${FIRST_PERSON}\\s+(sudah |telah |pernah |sedang )?(bekerja|meminjam|menyewa|membeli|menjual|menandatangani|menikah|bercerai|ditipu|melapor|menggugat|digugat|berutang|berhutang|kerja)\\b`) },
  // meminta penilaian hasil
  { id: "penilaian_hasil", re: /\b(peluang|kemungkinan|apakah (saya|aku|kami)( bisa| akan| pasti)?)\s+(menang|kalah|dipenjara|dipidana|dihukum|bebas|berhasil|ditahan|dipecat)\b/ },
  { id: "penilaian_hasil", re: /\b(bisakah|bisa(kah)?|dapatkah|boleh(kah)?)\s+(saya|aku|kami)\s+(menuntut|menggugat|melaporkan|melapor|mempidanakan|memenjarakan|menang)\b/ },
  // meminta strategi/langkah untuk dirinya
  { id: "strategi", re: /\b(apa yang (harus|sebaiknya|perlu)|langkah apa (yang )?(harus|sebaiknya|perlu)|bagaimana (sebaiknya|seharusnya))\s+(saya|aku|kami)\b/ },
  { id: "strategi", re: /\b(saya|aku|kami)\s+(harus|sebaiknya|perlu)\s+(bagaimana|apa|ke mana|melakukan apa)\b/ },
  // meminta hitungan untuk dirinya
  { id: "hitungan_pribadi", re: /\b(berapa|hitung(kan|lah)?)\b.{0,60}\b(saya|aku|kami)\s+(dapat|dapatkan|terima|peroleh|bayar|harus bayar|tanggung)\b/ },
];

export function classifyQuestion(message) {
  const text = String(message ?? "").toLowerCase().replace(/\s+/g, " ");
  const signals = [...new Set(SPECIFIC_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.id))];
  return { type: signals.length ? "spesifik" : "umum", signals };
}

// ── 2. Kekuatan dukungan dokumen ─────────────────────────────────────────────
// Skor kemiripan Pinecone (cosine, voyage-law-2) potongan teratas. Dikalibrasi 27 Okt 2026
// (tests/PPL-II/scripts/calibrate_evidence.mjs, 18 pertanyaan):
//   hukum, dokumen ADA di database   : 0,580 – 0,732
//   hukum, kemungkinan TIDAK ada     : 0,541 – 0,629  (tumpang tindih dengan baris atas)
//   di luar hukum                    : 0,425 – 0,554
// Skor tidak bisa memisahkan pertanyaan hukum yang ada/tidak ada di database, jadi "terbatas"
// hanya peringatan lunak (AI tetap menjawab bila dokumen mendukung). "tidak_ada" (< 0,50)
// melarang menjawab dari pengetahuan umum; jaraknya 0,08 dari pertanyaan hukum terendah.
export const EVIDENCE_THRESHOLDS = { weak: 0.57, none: 0.5 };

export function assessEvidence(matches, thresholds = EVIDENCE_THRESHOLDS) {
  const topScore = Math.max(0, ...(matches || []).map((m) => (typeof m?.score === "number" ? m.score : 0)));
  if (!matches?.length || topScore < thresholds.none) return { level: "tidak_ada", topScore };
  if (topScore < thresholds.weak) return { level: "terbatas", topScore };
  return { level: "cukup", topScore };
}

// ── 3. Peringatan konsultasi ─────────────────────────────────────────────────
export const CONSULTATION_DISCLAIMER =
  "> **Catatan:** Jawaban ini adalah informasi awal berdasarkan dokumen hukum yang tersedia, **bukan pengganti konsultasi dengan advokat atau ahli hukum**. Untuk menilai kasus Anda secara utuh, pertimbangkan berkonsultasi dengan advokat, Lembaga Bantuan Hukum (LBH), atau Pos Bantuan Hukum (Posbakum) di pengadilan terdekat.";

const DISCLAIMER_ALREADY_PRESENT = /bukan pengganti konsultasi|tidak menggantikan konsultasi|bukan (merupakan )?nasihat hukum/i;

export function consultationNote(answer, questionType) {
  if (questionType !== "spesifik" || DISCLAIMER_ALREADY_PRESENT.test(answer || "")) return "";
  return `\n\n${CONSULTATION_DISCLAIMER}`;
}

// ── 4. Sumber yang dikutip AI harus ada di dokumen yang dibaca ──────────────
const ABBREVIATIONS = [
  [/\buu\b/g, "undang undang"],
  [/\bperpu\b/g, "peraturan pemerintah pengganti undang undang"],
  [/\bpp\b/g, "peraturan pemerintah"],
  [/\bperpres\b/g, "peraturan presiden"],
  [/\bpermen\b/g, "peraturan menteri"],
  [/\bperda\b/g, "peraturan daerah"],
  [/\bno\b/g, "nomor"],
  [/\bth\b/g, "tahun"],
  [/\bthn\b/g, "tahun"],
];

function normalizeTitle(title) {
  let t = String(title ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ");
  for (const [re, rep] of ABBREVIATIONS) t = t.replace(re, rep);
  return t.replace(/\s+/g, " ").trim();
}

const tokens = (t) => new Set(t.split(" ").filter(Boolean));

// Kutipan dianggap cocok bila semua angka di judul kutipan (nomor & tahun) ada di judul
// dokumen, dan sebagian besar kata judul kutipan muncul di judul dokumen.
function citationMatches(cited, docTitle) {
  const a = normalizeTitle(cited);
  const b = normalizeTitle(docTitle);
  if (!a || !b) return false;
  if (b.includes(a) || a.includes(b)) return true;
  const ta = tokens(a);
  const tb = tokens(b);
  const numbers = [...ta].filter((x) => /^\d+$/.test(x));
  if (numbers.some((n) => !tb.has(n))) return false;
  const words = [...ta].filter((x) => !/^\d+$/.test(x));
  if (!words.length) return numbers.length > 0;
  const hit = words.filter((w) => tb.has(w)).length;
  return hit / words.length >= 0.6;
}

// Ambil nama dokumen dari pola "(Sumber: [Nama], Hal: x; [Nama2], Hal: y)"
export function extractCitedTitles(answer) {
  const titles = [];
  const re = /Sumber:\s*([^)]*)\)/gi;
  let m;
  while ((m = re.exec(answer || ""))) {
    for (const part of m[1].split(";")) {
      const title = part.replace(/\*+/g, "").replace(/,?\s*Hal(aman)?\s*:.*$/i, "").replace(/^\[|\]$/g, "").trim();
      if (title) titles.push(title);
    }
  }
  return [...new Set(titles)];
}

export function findUnverifiedCitations(answer, docTitles) {
  const known = (docTitles || []).filter(Boolean);
  return extractCitedTitles(answer).filter((t) => !known.some((d) => citationMatches(t, d)));
}

export function unverifiedCitationNote(unverified) {
  if (!unverified?.length) return "";
  const list = unverified.map((t) => `"${t}"`).join(", ");
  return `\n\n> ⚠️ **Catatan sistem:** sumber berikut tidak ditemukan di dokumen yang dibaca AI untuk pertanyaan ini, sehingga belum dapat diverifikasi: ${list}. Mohon periksa langsung ke peraturan aslinya.`;
}
