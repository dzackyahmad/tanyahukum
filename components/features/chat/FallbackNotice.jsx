// Pemberitahuan pergantian model otomatis, ditampilkan di atas jawaban (tidak ikut tertutup
// bersama panel Proses).
export default function FallbackNotice({ fallbacks }) {
  return (
    <div role="status" className="mb-3 space-y-1">
      {fallbacks.map((f, i) => (
        <p
          key={i}
          className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-[13px] text-amber-800 dark:text-amber-300"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0" aria-hidden="true">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>
            <strong>{f.from}</strong> {f.reason}, diganti ke <strong>{f.to}</strong>.{f.restarted ? " Jawaban diulang dari awal." : ""}
          </span>
        </p>
      ))}
    </div>
  );
}
