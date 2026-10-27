// Peringatan batas pemakaian (≥ 70%):
// - ModelLimitNotice: kuota harian model yang baru menjawab hampir habis (seluruh aplikasi),
//   ditampilkan di atas jawaban bersama pemberitahuan fallback.
// - QuotaWarning: kuota pertanyaan harian pengguna hampir habis, di atas kotak pertanyaan.

const WarnIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden="true">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export const formatResetTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const time = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return time;
  if (d.toDateString() === tomorrow.toDateString()) return `besok ${time}`;
  return d.toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

export function ModelLimitNotice({ warning }) {
  return (
    <p
      role="status"
      className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-[13px] text-amber-800 dark:text-amber-300"
    >
      <WarnIcon />
      <span>
        Kuota harian <strong>{warning.name}</strong> hampir habis ({warning.source === "estimasi" ? "±" : ""}{warning.percent}% terpakai).
      </span>
    </p>
  );
}

// Pilihan model dipindah otomatis karena model yang dipilih sedang habis (di atas kotak pertanyaan)
export function ModelSwitchNotice({ change, onClose, className = "max-w-5xl mx-auto" }) {
  return (
    <div
      role="status"
      className={`${className} w-full mb-2 flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-[13px] text-left text-amber-800 dark:text-amber-300`}
    >
      <WarnIcon />
      <span className="flex-1">
        <strong>{change.from}</strong> {change.reason || "kena limit"}, diganti ke <strong>{change.to}</strong>.
      </span>
      <button type="button" onClick={onClose} aria-label="Tutup pemberitahuan model" className="shrink-0 rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-800/40">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

export function QuotaWarning({ quota, onUpgrade, onClose, className = "max-w-5xl mx-auto" }) {
  const empty = quota.remaining <= 0;
  return (
    <div
      role="status"
      className={`${className} w-full mb-2 flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-[13px] text-left text-amber-800 dark:text-amber-300`}
    >
      <WarnIcon />
      <span className="flex-1">
        {empty
          ? <>Kuota pertanyaan hari ini sudah habis ({quota.used} dari {quota.limit}).</>
          : <>Kuota hari ini tinggal <strong>{quota.remaining} dari {quota.limit}</strong> pertanyaan.</>}{" "}
        Pulih {formatResetTime(quota.resetsAt)}.{" "}
        {onUpgrade && (
          <button type="button" onClick={onUpgrade} className="font-semibold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200">
            Upgrade ke Pro
          </button>
        )}
      </span>
      <button type="button" onClick={onClose} aria-label="Tutup peringatan kuota" className="shrink-0 rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-800/40">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
