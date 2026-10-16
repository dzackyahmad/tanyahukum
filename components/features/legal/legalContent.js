// Isi Kebijakan Privasi & Syarat dan Ketentuan TanyaHukum (statis, dua bahasa).
// Isi disusun berdasarkan cara kerja aplikasi yang sebenarnya (data yang disimpan, cookie,
// pihak ketiga). Jika fitur/penyedia berubah, perbarui juga dokumen ini dan tanggal berlakunya.
//
// Format blok isi:
//   "teks"                         → paragraf (mendukung **tebal**)
//   { list: ["...", ...] }         → daftar poin
//   { table: { head, rows } }      → tabel
//   { note: "..." }                → kotak catatan penting

// Email kontak resmi untuk permintaan privasi & pertanyaan hukum. Atur lewat env
// NEXT_PUBLIC_LEGAL_CONTACT_EMAIL (mis. di Vercel) agar tidak perlu mengubah kode.
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL || "";

const contact = {
  id: CONTACT_EMAIL ? `email **${CONTACT_EMAIL}**` : "email kontak resmi TanyaHukum (belum diatur)",
  en: CONTACT_EMAIL ? `email at **${CONTACT_EMAIL}**` : "TanyaHukum's official contact email (not yet configured)",
};

export const EFFECTIVE_DATE = { id: "16 Oktober 2026", en: "October 16, 2026" };

export const UI = {
  id: {
    lastUpdated: "Terakhir diperbarui",
    toc: "Daftar Isi",
    faq: "Pertanyaan yang Sering Diajukan (FAQ)",
    print: "Cetak / Simpan PDF",
    backToTop: "Kembali ke atas",
    otherDoc: { privacy: "Baca Syarat & Ketentuan", terms: "Baca Kebijakan Privasi" },
    footer: "Dokumen ini berlaku untuk seluruh penggunaan aplikasi TanyaHukum.",
    language: "Bahasa",
    summary: "Ringkasan Singkat",
    docLabel: "Dokumen Legal",
    contact: "Kontak",
  },
  en: {
    lastUpdated: "Last updated",
    toc: "Table of Contents",
    faq: "Frequently Asked Questions (FAQ)",
    print: "Print / Save PDF",
    backToTop: "Back to top",
    otherDoc: { privacy: "Read Terms of Service", terms: "Read Privacy Policy" },
    footer: "This document applies to all use of the TanyaHukum application.",
    language: "Language",
    summary: "At a Glance",
    docLabel: "Legal Document",
    contact: "Contact",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// KEBIJAKAN PRIVASI / PRIVACY POLICY
// ─────────────────────────────────────────────────────────────────────────────
const privacy = {
  id: {
    title: "Kebijakan Privasi",
    subtitle: "Bagaimana TanyaHukum mengumpulkan, menggunakan, dan melindungi data pribadi Anda.",
    summary: [
      "Kami hanya mengumpulkan data yang diperlukan untuk menjalankan layanan: akun, percakapan, dan pemakaian.",
      "Pertanyaan Anda dikirim ke penyedia model AI (Google Gemini atau Groq) untuk dibuatkan jawaban.",
      "Kami **tidak menjual** data Anda dan **tidak memakai** cookie iklan atau pelacak.",
      "Anda dapat menghapus percakapan, seluruh riwayat, atau akun Anda kapan saja.",
    ],
    sections: [
      {
        id: "pendahuluan",
        title: "Pendahuluan",
        body: [
          "TanyaHukum (\"**kami**\") adalah aplikasi asisten informasi hukum Indonesia berbasis kecerdasan buatan (AI). Kebijakan Privasi ini menjelaskan data pribadi apa saja yang kami kumpulkan saat Anda menggunakan aplikasi TanyaHukum, untuk apa data tersebut digunakan, kepada siapa data dibagikan, dan hak-hak Anda atas data tersebut.",
          "Kebijakan ini disusun dengan mengacu pada **Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi** (UU PDP). Dengan membuat akun atau menggunakan TanyaHukum, Anda menyatakan telah membaca dan memahami Kebijakan Privasi ini.",
        ],
      },
      {
        id: "data-dikumpulkan",
        title: "Data yang Kami Kumpulkan",
        body: [
          "Kami mengumpulkan data berikut, baik yang Anda berikan langsung maupun yang tercatat saat Anda menggunakan layanan:",
          {
            table: {
              head: ["Kategori", "Data", "Sumber"],
              rows: [
                ["Data akun", "Nama, alamat email, dan kata sandi. Kata sandi disimpan dalam bentuk **hash (bcrypt)**, sehingga tidak dapat dibaca siapa pun, termasuk kami.", "Anda saat mendaftar"],
                ["Login Google", "Nama, alamat email, dan foto profil dari akun Google Anda", "Google, atas persetujuan Anda"],
                ["Profil", "Foto profil yang Anda unggah dan **konteks personal** opsional (maks. 500 karakter), misalnya profesi Anda", "Anda melalui menu Profil"],
                ["Percakapan", "Pertanyaan yang Anda ajukan, jawaban AI, dan judul obrolan", "Penggunaan fitur chatbot"],
                ["Pemakaian", "Catatan waktu setiap pertanyaan (untuk kuota harian), kata kunci pencarian di Pusat Data Hukum, dan jumlah dilihat dokumen", "Tercatat otomatis"],
                ["Pembayaran", "ID pesanan, nominal, dan status transaksi paket Pro", "Midtrans"],
                ["Teknis", "Alamat IP (disimpan sementara di memori server untuk pembatasan laju, **tidak** disimpan ke database) dan cookie sesi", "Perangkat Anda"],
              ],
            },
          },
          { note: "Kami **tidak** menyimpan data kartu kredit, rekening bank, atau dompet digital Anda. Data pembayaran tersebut diproses langsung oleh Midtrans." },
        ],
      },
      {
        id: "penggunaan-data",
        title: "Cara Kami Menggunakan Data",
        body: [
          {
            list: [
              "**Menjalankan layanan:** membuat dan mengelola akun, menjawab pertanyaan hukum Anda, dan menampilkan riwayat percakapan.",
              "**Personalisasi jawaban:** konteks personal (jika Anda isi) dan preferensi gaya jawaban (misalnya bahasa sederhana atau jawaban ringkas) dikirim bersama pertanyaan agar jawaban sesuai kebutuhan Anda. Preferensi gaya jawaban hanya disimpan di browser Anda.",
              "**Kuota dan paket:** menghitung batas pertanyaan harian paket Basic dan mengaktifkan paket Pro setelah pembayaran.",
              "**Keamanan:** mencegah penyalahgunaan (misalnya percobaan login berulang), menjaga sesi login, dan melindungi akun.",
              "**Statistik layanan:** menampilkan dokumen terpopuler dan pencarian terbanyak, serta meningkatkan kualitas pencarian dokumen.",
              "**Komunikasi penting:** mengirim email pemulihan kata sandi atas permintaan Anda.",
            ],
          },
          "Kami **tidak** menggunakan data Anda untuk iklan, **tidak** menjual data Anda, dan **tidak** melatih model AI kami sendiri dengan percakapan Anda.",
        ],
      },
      {
        id: "pemrosesan-ai",
        title: "Pemrosesan oleh Kecerdasan Buatan (AI)",
        body: [
          "Saat Anda mengajukan pertanyaan, sistem bekerja sebagai berikut:",
          {
            list: [
              "Teks pertanyaan dikirim ke **Voyage AI** untuk diubah menjadi vektor angka (embedding).",
              "Vektor tersebut dicocokkan dengan database dokumen peraturan di **Pinecone**. Yang dikirim ke Pinecone hanya vektor angka, bukan teks pertanyaan.",
              "Pertanyaan, potongan dokumen peraturan yang relevan, dan konteks personal Anda (jika ada) dikirim ke **penyedia model AI** sesuai model yang Anda pilih: **Google Gemini** atau **Groq** (GPT-OSS, Qwen). Jika model pilihan sedang tidak tersedia, jawaban dapat dibuat oleh model Gemini cadangan.",
            ],
          },
          "Setiap penyedia memproses data sesuai kebijakannya masing-masing. Pada layanan **tier gratis Gemini API**, Google dapat menggunakan konten yang dikirim untuk meningkatkan produknya sesuai ketentuan Google.",
          { note: "**Jangan memasukkan data pribadi sensitif** ke dalam pertanyaan, seperti NIK, nomor rekening, data kesehatan, atau identitas pihak lain. Ajukan pertanyaan secara umum, misalnya \"pekerja kontrak yang di-PHK\", bukan nama dan identitas lengkap seseorang." },
        ],
      },
      {
        id: "pihak-ketiga",
        title: "Pihak Ketiga yang Memproses Data",
        body: [
          "Kami menggunakan penyedia layanan berikut untuk menjalankan TanyaHukum. Mereka hanya menerima data yang dibutuhkan untuk fungsinya masing-masing:",
          {
            table: {
              head: ["Penyedia", "Fungsi", "Data yang diterima", "Lokasi"],
              rows: [
                ["Google (Gemini API)", "Membuat jawaban AI", "Pertanyaan, potongan dokumen, konteks personal", "Global / AS"],
                ["Groq", "Membuat jawaban AI (model GPT-OSS & Qwen)", "Pertanyaan, potongan dokumen, konteks personal", "AS"],
                ["Voyage AI", "Embedding pertanyaan", "Teks pertanyaan", "AS"],
                ["Pinecone", "Pencarian dokumen", "Vektor angka pertanyaan", "AS"],
                ["Supabase", "Database & penyimpanan foto profil", "Data akun, percakapan, pemakaian, foto profil", "Singapura"],
                ["Vercel", "Hosting aplikasi", "Lalu lintas permintaan (request)", "AS"],
                ["Midtrans", "Pemrosesan pembayaran", "Data transaksi & pembayaran", "Indonesia"],
                ["Google Sign-In", "Login dengan akun Google", "Nama, email, foto profil", "Global"],
                ["Penyedia email (SMTP)", "Email pemulihan kata sandi", "Alamat email & tautan reset", "—"],
              ],
            },
          },
          "Data juga dapat kami ungkapkan bila **diwajibkan oleh hukum** atau perintah pejabat/lembaga yang berwenang sesuai peraturan perundang-undangan.",
        ],
      },
      {
        id: "cookie",
        title: "Cookie dan Penyimpanan Lokal",
        body: [
          "TanyaHukum hanya memakai cookie dan penyimpanan lokal (localStorage) yang **diperlukan agar aplikasi berfungsi**. Kami tidak memakai cookie iklan maupun pelacak analitik pihak ketiga.",
          {
            table: {
              head: ["Nama", "Jenis", "Fungsi", "Masa berlaku"],
              rows: [
                ["token", "Cookie (httpOnly, aman)", "Menjaga sesi login Anda", "7 hari / sampai logout"],
                ["user", "localStorage", "Menampilkan nama dan paket Anda di aplikasi", "Sampai logout"],
                ["tanyahukum_chat_mode", "localStorage", "Mengingat model dan mode AI pilihan Anda", "Sampai dihapus"],
                ["tanyahukum_chat_prefs", "localStorage", "Menyimpan preferensi gaya jawaban (Profil › Personalisasi)", "Sampai dihapus"],
                ["tanyahukum_process_cache", "localStorage", "Menyimpan tampilan panel \"Proses\" jawaban", "Dihapus saat logout"],
                ["theme, tanyahukum_tour_done_*, hide_about_modal", "localStorage", "Mengingat tema dan status tur pengenalan", "Sampai dihapus"],
              ],
            },
          },
          "Saat Anda melakukan pembayaran, skrip **Midtrans Snap** dimuat dan dapat menggunakan cookie milik Midtrans sesuai kebijakan privasi Midtrans.",
        ],
      },
      {
        id: "retensi",
        title: "Penyimpanan dan Retensi Data",
        body: [
          {
            table: {
              head: ["Data", "Disimpan selama"],
              rows: [
                ["Akun & profil", "Selama akun aktif; dihapus saat Anda menghapus akun"],
                ["Percakapan", "Sampai Anda menghapus obrolan, menghapus seluruh riwayat, atau menghapus akun"],
                ["Catatan pemakaian kuota", "Tetap ada walau riwayat obrolan dihapus (agar kuota harian berjalan adil); dihapus bersama akun"],
                ["Riwayat transaksi", "Selama akun aktif; Midtrans menyimpan catatan pembayarannya sendiri sesuai kewajiban hukum"],
                ["Kata kunci pencarian", "Disimpan untuk statistik layanan; tautan ke akun Anda dilepas saat akun dihapus"],
                ["Token pemulihan kata sandi", "Maksimal 1 jam dan hanya dapat dipakai sekali"],
              ],
            },
          },
        ],
      },
      {
        id: "keamanan",
        title: "Keamanan Data",
        body: [
          "Kami menerapkan langkah pengamanan teknis yang wajar, antara lain:",
          {
            list: [
              "Koneksi terenkripsi (HTTPS) di seluruh aplikasi.",
              "Kata sandi disimpan sebagai hash bcrypt; token pemulihan kata sandi disimpan sebagai hash SHA-256.",
              "Sesi login disimpan dalam cookie httpOnly yang tidak dapat dibaca oleh skrip di browser.",
              "Pemeriksaan kepemilikan data: Anda hanya dapat mengakses percakapan dan data milik Anda sendiri.",
              "Pembatasan jumlah permintaan (rate limit) untuk mencegah serangan dan penyalahgunaan.",
              "Tidak ada fitur bagi admin untuk membaca isi percakapan pengguna.",
            ],
          },
          "Meski demikian, tidak ada sistem yang 100% aman. Jaga kerahasiaan kata sandi Anda dan segera hubungi kami bila Anda menduga akun Anda disalahgunakan.",
        ],
      },
      {
        id: "hak-anda",
        title: "Hak Anda atas Data Pribadi",
        body: [
          "Sesuai UU PDP, Anda memiliki hak untuk:",
          {
            table: {
              head: ["Hak", "Cara menggunakannya di TanyaHukum"],
              rows: [
                ["Mengakses dan memperoleh informasi data Anda", "Lihat profil dan riwayat obrolan di aplikasi, atau minta salinan data melalui kontak kami"],
                ["Memperbaiki data", "Ubah nama, foto, dan konteks personal di **Profil**"],
                ["Menghapus data", "Hapus satu obrolan, **Profil › Akun › Hapus Semua Riwayat**, atau **Hapus Akun**"],
                ["Menarik persetujuan", "Kosongkan konteks personal, berhenti menggunakan layanan, atau hapus akun"],
                ["Mengajukan keberatan atau pertanyaan", "Hubungi kami (lihat bagian Kontak)"],
              ],
            },
          },
          "Kami akan menanggapi permintaan yang diajukan melalui kontak resmi dalam jangka waktu yang wajar sesuai ketentuan peraturan perundang-undangan.",
        ],
      },
      {
        id: "transfer",
        title: "Transfer Data ke Luar Negeri",
        body: [
          "Beberapa penyedia layanan kami berada di luar Indonesia (lihat bagian Pihak Ketiga), sehingga data Anda dapat diproses di negara lain seperti Singapura dan Amerika Serikat. Kami memilih penyedia yang menerapkan standar keamanan data yang memadai, dan hanya mengirim data yang diperlukan untuk fungsinya.",
        ],
      },
      {
        id: "anak",
        title: "Pengguna di Bawah Umur",
        body: [
          "TanyaHukum ditujukan untuk pengguna berusia **18 tahun ke atas**. Pengguna di bawah 18 tahun hanya boleh menggunakan layanan dengan persetujuan dan pendampingan orang tua atau wali. Jika kami mengetahui ada data anak yang dikumpulkan tanpa persetujuan tersebut, kami akan menghapusnya.",
        ],
      },
      {
        id: "perubahan",
        title: "Perubahan Kebijakan",
        body: [
          "Kami dapat memperbarui Kebijakan Privasi ini bila fitur, penyedia layanan, atau ketentuan hukum berubah. Tanggal \"Terakhir diperbarui\" di bagian atas dokumen akan disesuaikan. Untuk perubahan yang signifikan, kami akan memberi tahu melalui aplikasi. Dengan tetap menggunakan TanyaHukum setelah perubahan berlaku, Anda dianggap menyetujui kebijakan yang diperbarui.",
        ],
      },
      {
        id: "kontak",
        title: "Kontak",
        body: [
          `Untuk pertanyaan, permintaan akses/penghapusan data, atau keluhan terkait privasi, hubungi tim TanyaHukum melalui ${contact.id}.`,
        ],
      },
    ],
    faq: [
      { q: "Apakah percakapan saya dipakai untuk melatih AI?", a: "TanyaHukum tidak melatih model AI sendiri dengan percakapan Anda. Namun, pertanyaan dikirim ke penyedia model (Google Gemini atau Groq) untuk dibuatkan jawaban, dan diproses sesuai kebijakan penyedia tersebut. Pada tier gratis Gemini API, Google dapat menggunakan konten untuk meningkatkan produknya. Karena itu, hindari memasukkan data pribadi sensitif." },
      { q: "Siapa saja yang bisa melihat riwayat obrolan saya?", a: "Hanya Anda. Sistem memeriksa kepemilikan setiap obrolan, dan admin tidak memiliki fitur untuk membaca isi percakapan. Akses langsung ke database dibatasi untuk keperluan pemeliharaan teknis." },
      { q: "Bagaimana cara menghapus data saya?", a: "Hapus satu obrolan dari daftar riwayat, atau hapus semuanya sekaligus di Profil › Akun › Hapus Semua Riwayat (dengan konfirmasi dua langkah). Untuk menghapus seluruh data akun, gunakan Profil › Akun › Hapus Akun." },
      { q: "Jika saya menghapus riwayat, apakah kuota harian saya kembali?", a: "Tidak. Kuota dihitung dari catatan pemakaian yang terpisah dari riwayat obrolan. Catatan ini hanya berisi waktu pertanyaan, bukan isi pertanyaan." },
      { q: "Apakah TanyaHukum menyimpan data kartu atau rekening saya?", a: "Tidak. Pembayaran paket Pro diproses sepenuhnya oleh Midtrans. Kami hanya menerima ID pesanan, nominal, dan status transaksi." },
      { q: "Apakah aman menuliskan NIK atau nama lengkap dalam pertanyaan?", a: "Sebaiknya tidak. Ajukan pertanyaan secara umum tanpa identitas pribadi. Jawaban tetap akurat karena TanyaHukum mencari peraturan berdasarkan isi pertanyaan, bukan identitas Anda." },
      { q: "Mengapa TanyaHukum memakai cookie?", a: "Hanya untuk menjaga sesi login (cookie \"token\") dan mengingat pengaturan Anda, seperti tema dan model AI. Tidak ada cookie iklan atau pelacak." },
    ],
  },

  en: {
    title: "Privacy Policy",
    subtitle: "How TanyaHukum collects, uses, and protects your personal data.",
    summary: [
      "We only collect the data needed to run the service: your account, conversations, and usage.",
      "Your questions are sent to an AI model provider (Google Gemini or Groq) to generate answers.",
      "We **do not sell** your data and **do not use** advertising or tracking cookies.",
      "You can delete a conversation, your entire history, or your account at any time.",
    ],
    sections: [
      {
        id: "pendahuluan",
        title: "Introduction",
        body: [
          "TanyaHukum (\"**we**\", \"**us**\") is an AI-powered Indonesian legal information assistant. This Privacy Policy explains what personal data we collect when you use the TanyaHukum application, how we use it, who we share it with, and your rights over that data.",
          "This policy refers to **Indonesian Law No. 27 of 2022 on Personal Data Protection** (the \"PDP Law\"). By creating an account or using TanyaHukum, you confirm that you have read and understood this Privacy Policy.",
        ],
      },
      {
        id: "data-dikumpulkan",
        title: "Data We Collect",
        body: [
          "We collect the following data, either provided directly by you or recorded when you use the service:",
          {
            table: {
              head: ["Category", "Data", "Source"],
              rows: [
                ["Account data", "Name, email address, and password. The password is stored as a **bcrypt hash**, so no one, including us, can read it.", "You, at sign-up"],
                ["Google sign-in", "Name, email address, and profile photo from your Google account", "Google, with your consent"],
                ["Profile", "Uploaded profile photo and optional **personal context** (max. 500 characters), e.g. your profession", "You, via the Profile menu"],
                ["Conversations", "Your questions, AI answers, and chat titles", "Use of the chatbot"],
                ["Usage", "A timestamp of each question (for the daily quota), search keywords in the Legal Data Center, and document view counts", "Recorded automatically"],
                ["Payments", "Order ID, amount, and transaction status of the Pro plan", "Midtrans"],
                ["Technical", "IP address (held temporarily in server memory for rate limiting, **not** stored in the database) and session cookie", "Your device"],
              ],
            },
          },
          { note: "We do **not** store your credit card, bank account, or e-wallet details. That payment data is processed directly by Midtrans." },
        ],
      },
      {
        id: "penggunaan-data",
        title: "How We Use Your Data",
        body: [
          {
            list: [
              "**Providing the service:** creating and managing your account, answering your legal questions, and showing your conversation history.",
              "**Personalised answers:** your personal context (if provided) and answer style preferences (e.g. plain language or short answers) are sent along with your question so answers suit your needs. Answer style preferences are stored only in your browser.",
              "**Quota and plans:** counting the daily question limit of the Basic plan and activating the Pro plan after payment.",
              "**Security:** preventing abuse (e.g. repeated login attempts), maintaining your login session, and protecting your account.",
              "**Service statistics:** showing the most popular documents and searches, and improving document search quality.",
              "**Important communication:** sending password recovery emails at your request.",
            ],
          },
          "We do **not** use your data for advertising, do **not** sell your data, and do **not** train our own AI models on your conversations.",
        ],
      },
      {
        id: "pemrosesan-ai",
        title: "Artificial Intelligence (AI) Processing",
        body: [
          "When you ask a question, the system works as follows:",
          {
            list: [
              "Your question text is sent to **Voyage AI** to be converted into a numeric vector (embedding).",
              "The vector is matched against a database of regulation documents in **Pinecone**. Only the numeric vector is sent to Pinecone, not the text of your question.",
              "Your question, relevant excerpts of regulations, and your personal context (if any) are sent to the **AI model provider** you selected: **Google Gemini** or **Groq** (GPT-OSS, Qwen). If the selected model is unavailable, a backup Gemini model may generate the answer.",
            ],
          },
          "Each provider processes data under its own policies. Under the **free tier of the Gemini API**, Google may use submitted content to improve its products in accordance with Google's terms.",
          { note: "**Do not include sensitive personal data** in your questions, such as national ID (NIK) numbers, bank account numbers, health data, or other people's identities. Ask in general terms, e.g. \"a contract worker who was laid off\" rather than someone's full name and identity." },
        ],
      },
      {
        id: "pihak-ketiga",
        title: "Third-Party Processors",
        body: [
          "We use the following service providers to operate TanyaHukum. Each receives only the data required for its function:",
          {
            table: {
              head: ["Provider", "Purpose", "Data received", "Location"],
              rows: [
                ["Google (Gemini API)", "Generating AI answers", "Question, document excerpts, personal context", "Global / US"],
                ["Groq", "Generating AI answers (GPT-OSS & Qwen models)", "Question, document excerpts, personal context", "US"],
                ["Voyage AI", "Question embeddings", "Question text", "US"],
                ["Pinecone", "Document search", "Numeric question vector", "US"],
                ["Supabase", "Database & profile photo storage", "Account data, conversations, usage, profile photo", "Singapore"],
                ["Vercel", "Application hosting", "Request traffic", "US"],
                ["Midtrans", "Payment processing", "Transaction & payment data", "Indonesia"],
                ["Google Sign-In", "Sign in with Google", "Name, email, profile photo", "Global"],
                ["Email provider (SMTP)", "Password recovery emails", "Email address & reset link", "—"],
              ],
            },
          },
          "We may also disclose data where **required by law** or by an order of a competent authority under applicable regulations.",
        ],
      },
      {
        id: "cookie",
        title: "Cookies and Local Storage",
        body: [
          "TanyaHukum only uses cookies and local storage (localStorage) that are **necessary for the application to work**. We do not use advertising cookies or third-party analytics trackers.",
          {
            table: {
              head: ["Name", "Type", "Purpose", "Duration"],
              rows: [
                ["token", "Cookie (httpOnly, secure)", "Keeps you signed in", "7 days / until logout"],
                ["user", "localStorage", "Shows your name and plan in the app", "Until logout"],
                ["tanyahukum_chat_mode", "localStorage", "Remembers your selected AI model and mode", "Until removed"],
                ["tanyahukum_chat_prefs", "localStorage", "Stores your answer style preferences (Profil › Personalisasi)", "Until removed"],
                ["tanyahukum_process_cache", "localStorage", "Stores the answer \"Process\" panel view", "Cleared on logout"],
                ["theme, tanyahukum_tour_done_*, hide_about_modal", "localStorage", "Remembers theme and onboarding tour status", "Until removed"],
              ],
            },
          },
          "When you make a payment, the **Midtrans Snap** script is loaded and may use Midtrans' own cookies in accordance with Midtrans' privacy policy.",
        ],
      },
      {
        id: "retensi",
        title: "Data Storage and Retention",
        body: [
          {
            table: {
              head: ["Data", "Retained for"],
              rows: [
                ["Account & profile", "While your account is active; deleted when you delete your account"],
                ["Conversations", "Until you delete a chat, delete your entire history, or delete your account"],
                ["Quota usage records", "Kept even if chat history is deleted (so the daily quota stays fair); deleted with your account"],
                ["Transaction history", "While your account is active; Midtrans keeps its own payment records as required by law"],
                ["Search keywords", "Kept for service statistics; the link to your account is removed when the account is deleted"],
                ["Password recovery token", "At most 1 hour, single use"],
              ],
            },
          },
        ],
      },
      {
        id: "keamanan",
        title: "Data Security",
        body: [
          "We apply reasonable technical safeguards, including:",
          {
            list: [
              "Encrypted connections (HTTPS) across the application.",
              "Passwords stored as bcrypt hashes; password recovery tokens stored as SHA-256 hashes.",
              "Login sessions stored in an httpOnly cookie that browser scripts cannot read.",
              "Ownership checks: you can only access your own conversations and data.",
              "Request rate limiting to prevent attacks and abuse.",
              "No feature allows administrators to read users' conversations.",
            ],
          },
          "However, no system is 100% secure. Keep your password confidential and contact us immediately if you suspect your account has been misused.",
        ],
      },
      {
        id: "hak-anda",
        title: "Your Rights",
        body: [
          "Under the PDP Law, you have the right to:",
          {
            table: {
              head: ["Right", "How to exercise it in TanyaHukum"],
              rows: [
                ["Access and obtain information about your data", "View your profile and chat history in the app, or request a copy via our contact"],
                ["Correct your data", "Edit your name, photo, and personal context in **Profil**"],
                ["Delete your data", "Delete a single chat, **Profil › Akun › Hapus Semua Riwayat** (Delete All History), or **Hapus Akun** (Delete Account)"],
                ["Withdraw consent", "Clear your personal context, stop using the service, or delete your account"],
                ["Object or ask questions", "Contact us (see the Contact section)"],
              ],
            },
          },
          "We will respond to requests submitted through our official contact within a reasonable time in accordance with applicable regulations.",
        ],
      },
      {
        id: "transfer",
        title: "International Data Transfers",
        body: [
          "Some of our service providers are located outside Indonesia (see Third-Party Processors), so your data may be processed in other countries such as Singapore and the United States. We choose providers that apply adequate data security standards, and only send the data each needs to perform its function.",
        ],
      },
      {
        id: "anak",
        title: "Minors",
        body: [
          "TanyaHukum is intended for users aged **18 and over**. Users under 18 may only use the service with the consent and supervision of a parent or guardian. If we learn that a minor's data was collected without such consent, we will delete it.",
        ],
      },
      {
        id: "perubahan",
        title: "Changes to This Policy",
        body: [
          "We may update this Privacy Policy when features, service providers, or legal requirements change. The \"Last updated\" date at the top will be revised accordingly. For significant changes, we will notify you in the app. By continuing to use TanyaHukum after a change takes effect, you agree to the updated policy.",
        ],
      },
      {
        id: "kontak",
        title: "Contact",
        body: [
          `For questions, data access/deletion requests, or privacy complaints, contact the TanyaHukum team by ${contact.en}.`,
        ],
      },
    ],
    faq: [
      { q: "Are my conversations used to train AI?", a: "TanyaHukum does not train its own AI models on your conversations. However, questions are sent to a model provider (Google Gemini or Groq) to generate answers and are processed under that provider's policies. Under the free tier of the Gemini API, Google may use content to improve its products. For this reason, avoid entering sensitive personal data." },
      { q: "Who can see my chat history?", a: "Only you. The system checks ownership of every chat, and administrators have no feature to read conversations. Direct database access is limited to technical maintenance." },
      { q: "How do I delete my data?", a: "Delete a single chat from the history list, or delete everything at once via Profil › Akun › Hapus Semua Riwayat (Delete All History, with a two-step confirmation). To delete all account data, use Profil › Akun › Hapus Akun (Delete Account)." },
      { q: "If I delete my history, is my daily quota restored?", a: "No. The quota is counted from usage records kept separately from chat history. These records only contain the time of each question, not its content." },
      { q: "Does TanyaHukum store my card or bank details?", a: "No. Pro plan payments are processed entirely by Midtrans. We only receive the order ID, amount, and transaction status." },
      { q: "Is it safe to write my ID number or full name in a question?", a: "It is better not to. Ask your question in general terms without personal identifiers. Answers remain accurate because TanyaHukum searches regulations based on the content of your question, not your identity." },
      { q: "Why does TanyaHukum use cookies?", a: "Only to keep you signed in (the \"token\" cookie) and to remember your settings, such as theme and AI model. There are no advertising or tracking cookies." },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SYARAT & KETENTUAN / TERMS OF SERVICE
// ─────────────────────────────────────────────────────────────────────────────
const terms = {
  id: {
    title: "Syarat dan Ketentuan Layanan",
    subtitle: "Aturan penggunaan aplikasi TanyaHukum. Mohon dibaca dengan saksama.",
    summary: [
      "TanyaHukum memberikan **informasi hukum umum** berbasis AI, **bukan nasihat hukum** dari advokat.",
      "Jawaban AI dapat keliru. Selalu periksa sumber peraturan dan konsultasikan masalah penting kepada advokat.",
      "Paket Basic gratis dengan batas pertanyaan harian; paket Pro berbayar melalui Midtrans.",
      "Dilarang menyalahgunakan layanan, termasuk menyerang sistem atau mengakali batas pemakaian.",
    ],
    sections: [
      {
        id: "penerimaan",
        title: "Penerimaan Ketentuan",
        body: [
          "Syarat dan Ketentuan ini (\"**Ketentuan**\") mengatur penggunaan aplikasi TanyaHukum (\"**Layanan**\"). Dengan membuat akun, masuk, atau menggunakan Layanan, Anda menyatakan telah membaca, memahami, dan menyetujui Ketentuan ini beserta **Kebijakan Privasi** kami. Jika Anda tidak setuju, mohon tidak menggunakan Layanan.",
        ],
      },
      {
        id: "layanan",
        title: "Tentang Layanan",
        body: [
          "TanyaHukum adalah asisten informasi hukum Indonesia berbasis kecerdasan buatan. Layanan mencakup:",
          {
            list: [
              "**Chatbot hukum** yang menjawab pertanyaan berdasarkan database dokumen peraturan perundang-undangan, lengkap dengan sumber peraturan dan halaman.",
              "**Pilihan model dan mode AI** (misalnya Kilat atau Berpikir) dengan kecepatan dan karakteristik jawaban yang berbeda.",
              "**Pusat Data Hukum** untuk mencari, membaca, dan mengunduh dokumen peraturan.",
              "**Dashboard** statistik dan isu hukum terkini.",
            ],
          },
          "Kami dapat menambah, mengubah, atau menghentikan fitur, termasuk mengganti model AI yang tersedia, untuk menjaga kualitas dan keberlanjutan Layanan.",
        ],
      },
      {
        id: "bukan-nasihat",
        title: "Bukan Nasihat Hukum",
        body: [
          { note: "Jawaban TanyaHukum adalah **informasi hukum umum** yang disusun oleh AI. Jawaban tersebut **bukan nasihat hukum**, **bukan pendapat hukum resmi**, dan **tidak menciptakan hubungan advokat–klien** antara Anda dan TanyaHukum." },
          {
            list: [
              "AI dapat salah memahami pertanyaan, melewatkan ketentuan penting, atau merujuk peraturan yang sudah diubah atau dicabut.",
              "Selalu periksa kembali sumber peraturan yang dirujuk, dan utamakan teks peraturan resmi (misalnya dari JDIH atau Lembaran Negara).",
              "Untuk masalah hukum yang berdampak penting (perkara di pengadilan, PHK, sengketa harta, pidana, dan sejenisnya), **konsultasikan kepada advokat** atau lembaga bantuan hukum.",
              "Jawaban TanyaHukum tidak dapat dijadikan alat bukti atau dasar tunggal pengambilan keputusan hukum.",
            ],
          },
        ],
      },
      {
        id: "akun",
        title: "Akun Pengguna",
        body: [
          {
            list: [
              "Anda harus berusia **18 tahun ke atas**, atau menggunakan Layanan dengan persetujuan dan pendampingan orang tua/wali.",
              "Data yang Anda berikan saat mendaftar harus benar dan milik Anda sendiri.",
              "Anda bertanggung jawab menjaga kerahasiaan kata sandi dan seluruh aktivitas di akun Anda.",
              "Satu akun digunakan oleh satu orang. Membuat banyak akun untuk mengakali batas pemakaian tidak diperbolehkan.",
              "Segera beri tahu kami jika Anda menduga akun Anda digunakan tanpa izin.",
            ],
          },
        ],
      },
      {
        id: "paket",
        title: "Paket dan Pembayaran",
        body: [
          {
            table: {
              head: ["Paket", "Harga", "Ketentuan utama"],
              rows: [
                ["Basic", "Gratis", "Jumlah pertanyaan per hari dibatasi sesuai batas yang berlaku pada akun Anda"],
                ["Pro", "Rp 49.900", "Pertanyaan chatbot tanpa batas harian; aktif setelah pembayaran dikonfirmasi oleh Midtrans"],
              ],
            },
          },
          {
            list: [
              "Pembayaran diproses oleh **Midtrans** dengan metode yang tersedia di halaman pembayaran. Ketentuan Midtrans berlaku untuk proses pembayaran tersebut.",
              "Harga dan manfaat paket yang berlaku adalah yang ditampilkan di halaman **Langganan** saat Anda melakukan pembayaran. Perubahan harga tidak berlaku surut untuk pembayaran yang sudah berhasil.",
              "Jika pembayaran berhasil tetapi paket Pro belum aktif, atau terjadi tagihan ganda, hubungi kami. Permintaan pengembalian dana ditinjau kasus per kasus sesuai peraturan perundang-undangan yang berlaku.",
              "Akun yang menghapus dirinya sendiri kehilangan akses paket Pro tanpa pengembalian dana otomatis.",
            ],
          },
        ],
      },
      {
        id: "batas-pemakaian",
        title: "Batas Pemakaian dan Ketersediaan Model",
        body: [
          {
            list: [
              "Kuota harian dihitung dari setiap pertanyaan yang berhasil dijawab, termasuk jawaban yang Anda hentikan (Stop) setelah AI mulai menulis. **Menghapus riwayat tidak mengembalikan kuota.**",
              "Untuk mencegah penyalahgunaan, berlaku pembatasan jumlah permintaan per menit.",
              "Model AI disediakan oleh pihak ketiga dan memiliki batas kuotanya sendiri. Jika model pilihan Anda sedang tidak tersedia, sistem dapat otomatis memakai model cadangan; hal ini ditampilkan di panel \"Proses\".",
            ],
          },
        ],
      },
      {
        id: "larangan",
        title: "Penggunaan yang Dilarang",
        body: [
          "Anda dilarang:",
          {
            list: [
              "Menggunakan Layanan untuk tujuan yang melanggar hukum, termasuk merencanakan atau membantu tindak pidana.",
              "Menyerang, membebani, atau mencoba membobol sistem (misalnya peretasan, injeksi, atau serangan DDoS), atau mengakses data pengguna lain.",
              "Mengambil data secara otomatis (scraping/bot) atau menggunakan Layanan sebagai API tanpa izin tertulis.",
              "Mengakali batas pemakaian, misalnya dengan banyak akun atau memanipulasi permintaan.",
              "Mengunggah konten berbahaya, seperti file berisi malware, atau konten yang melanggar hak pihak lain.",
              "Menyamar sebagai pihak lain atau menyalahgunakan jawaban AI untuk menipu, mencemarkan nama baik, atau merugikan orang lain.",
              "Membongkar (reverse engineering) atau menyalin bagian aplikasi untuk membuat layanan tiruan.",
            ],
          },
        ],
      },
      {
        id: "konten",
        title: "Konten Anda dan Jawaban AI",
        body: [
          {
            list: [
              "Pertanyaan yang Anda kirim tetap menjadi milik Anda. Anda memberi kami izin untuk memprosesnya, termasuk mengirimnya ke penyedia model AI, semata-mata untuk menjalankan Layanan sesuai Kebijakan Privasi.",
              "Anda boleh menggunakan jawaban AI untuk keperluan pribadi, pendidikan, maupun pekerjaan, dengan tetap memeriksa kebenarannya dan mencantumkan sumber peraturan yang dirujuk bila diperlukan.",
              "Anda bertanggung jawab atas keputusan dan tindakan yang Anda ambil berdasarkan jawaban AI.",
            ],
          },
        ],
      },
      {
        id: "dokumen",
        title: "Dokumen Peraturan dan Kekayaan Intelektual",
        body: [
          "Dokumen peraturan di TanyaHukum dihimpun dari sumber publik. Sesuai **Pasal 42 Undang-Undang Nomor 28 Tahun 2014 tentang Hak Cipta**, peraturan perundang-undangan tidak dilindungi hak cipta. Namun, salinan di TanyaHukum dapat mengandung kesalahan pengetikan/pemindaian (OCR) atau belum mencakup perubahan terbaru. **Teks resmi yang diterbitkan pemerintah selalu menjadi acuan utama.**",
          "Nama, logo, desain antarmuka, kode, dan susunan database TanyaHukum dilindungi hak kekayaan intelektual dan tidak boleh disalin atau digunakan tanpa izin.",
        ],
      },
      {
        id: "ketersediaan",
        title: "Ketersediaan Layanan",
        body: [
          "Layanan disediakan **\"sebagaimana adanya\"** dan **\"sebagaimana tersedia\"**. Kami berupaya menjaga Layanan tetap berjalan, tetapi tidak menjamin Layanan bebas gangguan, bebas kesalahan, atau selalu tersedia. Gangguan dapat terjadi karena pemeliharaan, batas kuota penyedia pihak ketiga, atau hal di luar kendali kami.",
        ],
      },
      {
        id: "tanggung-jawab",
        title: "Batasan Tanggung Jawab",
        body: [
          "Sejauh diizinkan oleh hukum yang berlaku, TanyaHukum tidak bertanggung jawab atas kerugian langsung maupun tidak langsung yang timbul dari:",
          {
            list: [
              "keputusan atau tindakan yang diambil berdasarkan jawaban AI tanpa verifikasi atau konsultasi dengan advokat;",
              "ketidakakuratan, ketidaklengkapan, atau keterlambatan pembaruan dokumen peraturan;",
              "gangguan, kehilangan data, atau ketidaktersediaan Layanan maupun layanan pihak ketiga;",
              "penyalahgunaan akun akibat kelalaian Anda menjaga kata sandi.",
            ],
          },
          "Tanggung jawab kami, bila ada, terbatas pada jumlah yang Anda bayarkan untuk paket Pro dalam 12 bulan terakhir.",
        ],
      },
      {
        id: "penghentian",
        title: "Penangguhan dan Penghentian",
        body: [
          "Anda dapat berhenti menggunakan Layanan dan menghapus akun kapan saja melalui **Profil › Akun**. Kami dapat menangguhkan atau menutup akun yang melanggar Ketentuan ini, membahayakan sistem, atau merugikan pengguna lain, dengan atau tanpa pemberitahuan terlebih dahulu sesuai tingkat pelanggarannya.",
        ],
      },
      {
        id: "perubahan",
        title: "Perubahan Ketentuan",
        body: [
          "Kami dapat mengubah Ketentuan ini dari waktu ke waktu. Tanggal \"Terakhir diperbarui\" akan disesuaikan, dan perubahan penting akan diberitahukan melalui aplikasi. Penggunaan Layanan setelah perubahan berlaku berarti Anda menyetujui Ketentuan yang diperbarui.",
        ],
      },
      {
        id: "hukum",
        title: "Hukum yang Berlaku dan Penyelesaian Sengketa",
        body: [
          "Ketentuan ini diatur oleh **hukum Negara Republik Indonesia**. Setiap perselisihan akan diselesaikan terlebih dahulu secara musyawarah untuk mufakat. Jika tidak tercapai kesepakatan dalam 30 hari, perselisihan diselesaikan melalui pengadilan yang berwenang di Indonesia.",
        ],
      },
      {
        id: "kontak",
        title: "Kontak",
        body: [`Pertanyaan mengenai Ketentuan ini dapat disampaikan kepada tim TanyaHukum melalui ${contact.id}.`],
      },
    ],
    faq: [
      { q: "Apakah jawaban TanyaHukum bisa dijadikan dasar di pengadilan?", a: "Tidak. Jawaban TanyaHukum adalah informasi hukum umum dari AI, bukan nasihat atau pendapat hukum resmi. Untuk perkara, gunakan teks peraturan resmi dan konsultasikan dengan advokat." },
      { q: "Berapa batas pertanyaan untuk paket gratis?", a: "Paket Basic memiliki batas pertanyaan per hari sesuai batas yang berlaku pada akun Anda. Paket Pro tidak memiliki batas harian. Kuota dihitung per hari dan tidak bertambah dengan menghapus riwayat." },
      { q: "Apa bedanya mode Kilat dan Berpikir?", a: "Mode Kilat langsung menyusun jawaban sehingga lebih cepat. Mode Berpikir membuat AI menimbang dulu sebelum menjawab (prosesnya bisa dilihat di panel \"Proses\"), cocok untuk pertanyaan yang lebih rumit tetapi butuh waktu lebih lama." },
      { q: "Mengapa jawaban saya dibuat oleh model lain (model cadangan)?", a: "Model AI disediakan pihak ketiga dengan batas kuota tertentu. Jika model pilihan Anda sedang penuh atau kuotanya habis, sistem otomatis memakai model cadangan agar Anda tetap mendapat jawaban. Hal ini selalu ditampilkan di panel \"Proses\"." },
      { q: "Bisakah saya meminta pengembalian dana paket Pro?", a: "Jika terjadi kendala, seperti pembayaran berhasil tetapi paket tidak aktif atau tagihan ganda, hubungi kami. Permintaan pengembalian dana ditinjau kasus per kasus sesuai peraturan yang berlaku." },
      { q: "Bolehkah saya memakai jawaban untuk tugas kuliah atau pekerjaan?", a: "Boleh, dengan tetap memeriksa kebenarannya dan merujuk langsung ke peraturan yang dicantumkan sebagai sumber. Anda bertanggung jawab atas penggunaan jawaban tersebut." },
      { q: "Bagaimana jika saya menemukan peraturan yang salah atau sudah tidak berlaku?", a: "Teks peraturan resmi dari pemerintah selalu menjadi acuan utama. Mohon laporkan temuan Anda kepada kami agar database dapat diperbaiki." },
      { q: "Apa yang terjadi jika saya melanggar ketentuan?", a: "Bergantung pada tingkat pelanggarannya, kami dapat memberi peringatan, membatasi fitur, atau menangguhkan dan menutup akun Anda." },
    ],
  },

  en: {
    title: "Terms of Service",
    subtitle: "Rules for using the TanyaHukum application. Please read them carefully.",
    summary: [
      "TanyaHukum provides AI-generated **general legal information**, **not legal advice** from an advocate.",
      "AI answers may be wrong. Always check the cited regulations and consult an advocate on important matters.",
      "The Basic plan is free with a daily question limit; the Pro plan is paid via Midtrans.",
      "Misusing the service is prohibited, including attacking the system or circumventing usage limits.",
    ],
    sections: [
      {
        id: "penerimaan",
        title: "Acceptance of Terms",
        body: [
          "These Terms of Service (the \"**Terms**\") govern your use of the TanyaHukum application (the \"**Service**\"). By creating an account, signing in, or using the Service, you confirm that you have read, understood, and agreed to these Terms and our **Privacy Policy**. If you do not agree, please do not use the Service.",
        ],
      },
      {
        id: "layanan",
        title: "About the Service",
        body: [
          "TanyaHukum is an AI-powered Indonesian legal information assistant. The Service includes:",
          {
            list: [
              "A **legal chatbot** that answers questions based on a database of Indonesian regulations, citing the regulation and page.",
              "**AI model and mode options** (e.g. *Kilat* (Fast) or *Berpikir* (Thinking)) with different speeds and answer characteristics.",
              "A **Legal Data Center** to search, read, and download regulation documents.",
              "A **dashboard** with statistics and current legal issues.",
            ],
          },
          "We may add, change, or discontinue features, including replacing the available AI models, to maintain the quality and sustainability of the Service.",
        ],
      },
      {
        id: "bukan-nasihat",
        title: "Not Legal Advice",
        body: [
          { note: "TanyaHukum's answers are AI-generated **general legal information**. They are **not legal advice**, **not an official legal opinion**, and **do not create an advocate–client relationship** between you and TanyaHukum." },
          {
            list: [
              "The AI may misunderstand questions, miss important provisions, or refer to regulations that have been amended or revoked.",
              "Always verify the cited regulations and rely on official texts (e.g. from JDIH or the State Gazette).",
              "For legal matters with significant consequences (court cases, dismissals, property disputes, criminal matters, etc.), **consult an advocate** or a legal aid institution.",
              "TanyaHukum's answers cannot be used as evidence or as the sole basis for legal decisions.",
            ],
          },
        ],
      },
      {
        id: "akun",
        title: "User Accounts",
        body: [
          {
            list: [
              "You must be **18 years or older**, or use the Service with the consent and supervision of a parent/guardian.",
              "The information you provide at sign-up must be accurate and your own.",
              "You are responsible for keeping your password confidential and for all activity on your account.",
              "One account is for one person. Creating multiple accounts to circumvent usage limits is not allowed.",
              "Notify us immediately if you suspect unauthorised use of your account.",
            ],
          },
        ],
      },
      {
        id: "paket",
        title: "Plans and Payments",
        body: [
          {
            table: {
              head: ["Plan", "Price", "Key terms"],
              rows: [
                ["Basic", "Free", "The number of questions per day is limited according to the limit applied to your account"],
                ["Pro", "IDR 49,900", "No daily chatbot question limit; activated once payment is confirmed by Midtrans"],
              ],
            },
          },
          {
            list: [
              "Payments are processed by **Midtrans** using the methods available on the payment page. Midtrans' terms apply to that payment process.",
              "The applicable price and plan benefits are those shown on the **Subscription** page at the time of payment. Price changes do not apply retroactively to completed payments.",
              "If your payment succeeded but the Pro plan is not active, or you were charged twice, contact us. Refund requests are reviewed case by case in accordance with applicable laws.",
              "If you delete your own account, you lose access to the Pro plan without an automatic refund.",
            ],
          },
        ],
      },
      {
        id: "batas-pemakaian",
        title: "Usage Limits and Model Availability",
        body: [
          {
            list: [
              "The daily quota counts every successfully answered question, including answers you stop after the AI has started writing. **Deleting your history does not restore your quota.**",
              "To prevent abuse, a per-minute request limit applies.",
              "AI models are provided by third parties and have their own quota limits. If your selected model is unavailable, the system may automatically use a backup model; this is shown in the \"Process\" panel.",
            ],
          },
        ],
      },
      {
        id: "larangan",
        title: "Prohibited Use",
        body: [
          "You must not:",
          {
            list: [
              "Use the Service for unlawful purposes, including planning or assisting a crime.",
              "Attack, overload, or attempt to breach the system (e.g. hacking, injection, or DDoS attacks), or access other users' data.",
              "Collect data automatically (scraping/bots) or use the Service as an API without written permission.",
              "Circumvent usage limits, e.g. through multiple accounts or manipulated requests.",
              "Upload harmful content, such as files containing malware, or content that infringes others' rights.",
              "Impersonate others or misuse AI answers to deceive, defame, or harm other people.",
              "Reverse engineer or copy parts of the application to build an imitation service.",
            ],
          },
        ],
      },
      {
        id: "konten",
        title: "Your Content and AI Answers",
        body: [
          {
            list: [
              "The questions you submit remain yours. You grant us permission to process them, including sending them to AI model providers, solely to operate the Service in accordance with the Privacy Policy.",
              "You may use AI answers for personal, educational, or professional purposes, provided you verify their accuracy and cite the referenced regulations where appropriate.",
              "You are responsible for the decisions and actions you take based on AI answers.",
            ],
          },
        ],
      },
      {
        id: "dokumen",
        title: "Regulation Documents and Intellectual Property",
        body: [
          "Regulation documents in TanyaHukum are compiled from public sources. Under **Article 42 of Indonesian Law No. 28 of 2014 on Copyright**, laws and regulations are not protected by copyright. However, copies in TanyaHukum may contain typing/scanning (OCR) errors or may not include the latest amendments. **The official text published by the government always prevails.**",
          "TanyaHukum's name, logo, interface design, code, and database structure are protected by intellectual property rights and may not be copied or used without permission.",
        ],
      },
      {
        id: "ketersediaan",
        title: "Service Availability",
        body: [
          "The Service is provided **\"as is\"** and **\"as available\"**. We strive to keep the Service running but do not guarantee that it will be uninterrupted, error-free, or always available. Disruptions may occur due to maintenance, third-party provider quota limits, or circumstances beyond our control.",
        ],
      },
      {
        id: "tanggung-jawab",
        title: "Limitation of Liability",
        body: [
          "To the extent permitted by applicable law, TanyaHukum is not liable for any direct or indirect loss arising from:",
          {
            list: [
              "decisions or actions taken based on AI answers without verification or consultation with an advocate;",
              "inaccurate, incomplete, or outdated regulation documents;",
              "disruptions, data loss, or unavailability of the Service or third-party services;",
              "account misuse resulting from your failure to keep your password secure.",
            ],
          },
          "Our liability, if any, is limited to the amount you paid for the Pro plan in the last 12 months.",
        ],
      },
      {
        id: "penghentian",
        title: "Suspension and Termination",
        body: [
          "You may stop using the Service and delete your account at any time via **Profil › Akun**. We may suspend or close accounts that violate these Terms, endanger the system, or harm other users, with or without prior notice depending on the severity of the violation.",
        ],
      },
      {
        id: "perubahan",
        title: "Changes to These Terms",
        body: [
          "We may change these Terms from time to time. The \"Last updated\" date will be revised, and important changes will be announced in the app. Using the Service after a change takes effect means you accept the updated Terms.",
        ],
      },
      {
        id: "hukum",
        title: "Governing Law and Dispute Resolution",
        body: [
          "These Terms are governed by the **laws of the Republic of Indonesia**. Any dispute will first be resolved amicably through deliberation. If no agreement is reached within 30 days, the dispute will be settled by a competent court in Indonesia.",
        ],
      },
      {
        id: "kontak",
        title: "Contact",
        body: [`Questions about these Terms can be sent to the TanyaHukum team by ${contact.en}.`],
      },
    ],
    faq: [
      { q: "Can TanyaHukum's answers be used as a basis in court?", a: "No. TanyaHukum's answers are AI-generated general legal information, not legal advice or an official legal opinion. For legal cases, rely on official regulation texts and consult an advocate." },
      { q: "What is the question limit for the free plan?", a: "The Basic plan has a daily question limit according to the limit applied to your account. The Pro plan has no daily limit. The quota is counted per day and is not increased by deleting your history." },
      { q: "What is the difference between the Kilat (Fast) and Berpikir (Thinking) modes?", a: "Kilat mode composes the answer directly, so it is quicker. Berpikir mode lets the AI reason before answering (the process is visible in the \"Process\" panel). It suits more complex questions but takes longer." },
      { q: "Why was my answer generated by a different (backup) model?", a: "AI models are provided by third parties with quota limits. If your selected model is busy or out of quota, the system automatically uses a backup model so you still get an answer. This is always shown in the \"Process\" panel." },
      { q: "Can I request a refund for the Pro plan?", a: "If something goes wrong, such as a successful payment without plan activation or a double charge, contact us. Refund requests are reviewed case by case in accordance with applicable regulations." },
      { q: "May I use the answers for coursework or work?", a: "Yes, provided you verify their accuracy and refer directly to the regulations cited as sources. You are responsible for how you use the answers." },
      { q: "What if I find a regulation that is wrong or no longer in force?", a: "Official government texts always prevail. Please report your finding to us so the database can be corrected." },
      { q: "What happens if I violate these Terms?", a: "Depending on the severity, we may issue a warning, restrict features, or suspend and close your account." },
    ],
  },
};

export const LEGAL_DOCS = { privacy, terms };
export const LEGAL_PATHS = { privacy: "/privacy-policy", terms: "/terms-of-service" };
