"use client";

export default function SubscriptionSelect({
  plans,
  selected,
  setSelected,
  setStep,
  user,
  onClose,
  embedded = false,
}) {
  const Content = () => (
    <>
      {/* Header */}
      <div className="mb-8">
        <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight transition-colors">Pilih Paket</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium transition-colors">Bandingkan paket dan temukan yang sesuai untuk Anda</p>
      </div>

      {/* Plan Cards - Vertical List for better flow */}
      <div className="grid grid-cols-1 gap-5">
        {plans.map((plan) => {
          const isActive = selected === plan.id;
          const isPro = plan.id === "pro";

          const isCurrent =
            (user?.tier === "FREE" && plan.id === "basic") ||
            (user?.tier === "PRO" && plan.id === "pro");

          return (
            <div
              key={plan.id}
              onClick={() => {
                if (!isCurrent) setSelected(plan.id);
              }}
              className={`relative rounded-[1.75rem] border-2 p-6 transition-all duration-300 ${
                isPro
                  ? "border-blue-600 dark:border-blue-600/70 bg-white dark:bg-slate-800/80 shadow-xl shadow-blue-100/50 dark:shadow-none"
                  : "border-gray-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/40"
              } ${!isCurrent && "cursor-pointer hover:border-blue-300 dark:hover:border-slate-600"}`}
            >
              {/* Pro Badge */}
              {isPro && !isCurrent && (
                <div className="absolute -top-3.5 left-6 px-4 py-1 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-blue-200/50 dark:shadow-none">
                  Recommended
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrent && (
                <div className={`absolute -top-3.5 ${isPro ? "right-6" : "left-6"} px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-full`}>
                  Aktif
                </div>
              )}

              <div className="flex justify-between items-start mb-5">
                <div>
                  <h4 className="text-base font-black text-gray-900 dark:text-white tracking-tight transition-colors">{plan.name}</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5 transition-colors">
                    {isPro ? "Untuk profesional & mahasiswa hukum" : "Untuk eksplorasi awal hukum"}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className={`font-black transition-colors ${isPro ? "text-2xl text-gray-900 dark:text-white" : "text-xl text-gray-600 dark:text-gray-300"}`}>
                    {plan.price}
                  </p>
                  {isPro && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider transition-colors">
                      /30 hari
                    </p>
                  )}
                </div>
              </div>

              {/* Features */}
              <div className={`grid gap-y-2 gap-x-4 mb-6 ${isPro ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                {plan.benefits.map((b, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300 transition-colors list-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 shrink-0 ${isPro ? "text-blue-600 dark:text-blue-400" : "text-gray-300 dark:text-gray-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {b}
                  </li>
                ))}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isCurrent && isPro) {
                    setSelected("pro");
                    setStep("summary");
                  }
                }}
                disabled={isCurrent}
                className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.98] ${
                  isCurrent
                    ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 cursor-default border border-emerald-200 dark:border-emerald-900/30"
                    : isPro
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 dark:shadow-none"
                    : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 cursor-default"
                }`}
              >
                {isCurrent ? "Paket Saat Ini" : isPro ? "Upgrade Sekarang" : "Gratis"}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );

  // When embedded inside SubscriptionList modal shell, render content directly
  if (embedded) {
    return <Content />;
  }

  // Standalone mode (used by subscription page) — render own card wrapper
  return (
    <div className="relative w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-9 border border-transparent dark:border-slate-800 transition-colors">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <Content />
    </div>
  );
}