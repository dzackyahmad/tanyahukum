"use client";

import { useCallback, useEffect, useState } from "react";
import { formatResetTime } from "@/components/features/chat/LimitNotice";

const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" });
const numFmt = new Intl.NumberFormat("id-ID");
const compactFmt = new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 });
const fmtDate = (iso) => (iso ? dateFmt.format(new Date(iso)) : "—");
const fmtTime = (iso) => (iso ? timeFmt.format(new Date(iso)) : "—");

function untilText(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "sebentar lagi";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h} jam ${m} menit lagi` : `${m} menit lagi`;
}

function Bar({ pct, tone = "blue" }) {
  const color = { blue: "bg-blue-600", red: "bg-red-500", amber: "bg-amber-500", green: "bg-emerald-500" }[tone];
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-slate-800 overflow-hidden" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.max(pct > 0 ? 2 : 0, Math.min(100, pct))}%` }} />
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
        {hint && <span className="text-xs text-gray-400 dark:text-slate-500">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function PlanSection({ plan }) {
  const pro = plan.tier === "PRO";
  const caption = pro
    ? plan.noExpiry ? "Tanpa tanggal berakhir" : `Aktif hingga ${fmtDate(plan.expiresAt)}`
    : plan.status === "berakhir" ? `Pro berakhir ${fmtDate(plan.expiresAt)}` : "Kuota harian terbatas";
  return (
    <section className="rounded-2xl border border-gray-200 dark:border-slate-700 p-5 flex items-center justify-between gap-4">
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">Paket</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{caption}</p>
      </div>
      {(!pro || !plan.noExpiry) && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event("open-subscription"))}
          className="shrink-0 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          {pro ? "Perpanjang" : "Upgrade ke Pro"}
        </button>
      )}
    </section>
  );
}

function QuotaSection({ quota }) {
  const unlimited = quota.limit === null;
  const pct = unlimited || !quota.limit ? 0 : (quota.used / quota.limit) * 100;
  return (
    <Section title="Pertanyaan hari ini" hint={`Direset ${untilText(quota.resetsAt)}`}>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
          {numFmt.format(quota.used)}
          <span className="text-base font-medium text-gray-400"> / {unlimited ? "∞" : numFmt.format(quota.limit)}</span>
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {unlimited ? "Tanpa batas" : `${Math.round(pct)}% terpakai`}
        </span>
      </div>
      {!unlimited && <Bar pct={pct} tone={pct >= 90 ? "red" : pct >= 70 ? "amber" : "blue"} />}
      {!unlimited && pct >= 70 && (
        <p role="status" className="mt-3 text-sm text-amber-700 dark:text-amber-400">
          {quota.remaining > 0 ? `Tinggal ${numFmt.format(quota.remaining)} pertanyaan hari ini.` : "Kuota hari ini sudah habis."} Upgrade ke Pro untuk tanpa batas.
        </p>
      )}
    </Section>
  );
}

function ModelSection({ models, untracked }) {
  const rows = models.filter((m) => m.last30Days > 0).sort((a, b) => b.last30Days - a.last30Days);
  const total = rows.reduce((n, m) => n + m.last30Days, 0);
  return (
    <Section title="Model yang Anda pakai" hint="30 hari terakhir">
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada data.</p>
      ) : (
        <ul className="space-y-4">
          {rows.map((m) => (
            <li key={m.model}>
              <div className="flex items-baseline justify-between gap-3 mb-1.5 text-sm">
                <span className="font-medium text-gray-900 dark:text-white">{m.name}</span>
                <span className="text-gray-500 dark:text-gray-400 tabular-nums">
                  {numFmt.format(m.last30Days)} pertanyaan · {compactFmt.format(m.inputTokens + m.outputTokens)} token
                </span>
              </div>
              <Bar pct={(m.last30Days / total) * 100} />
            </li>
          ))}
        </ul>
      )}
      {untracked.last30Days > 0 && (
        <p className="mt-4 text-xs text-gray-400 dark:text-slate-500">+{numFmt.format(untracked.last30Days)} pertanyaan lama tanpa data model</p>
      )}
    </Section>
  );
}

// Batas Groq berlaku per menit: data lebih dari 1 menit dianggap sudah pulih.
const FRESH_MS = 60_000;

function AvailabilitySection({ availability }) {
  return (
    <Section title="Status model" hint="Dipakai bersama semua pengguna">
      <ul className="space-y-3">
        {availability.map((a) => {
          const limited = a.status !== "tersedia";
          // Kuota harian seluruh aplikasi ≥ 70% (Groq aktual, Gemini estimasi bila batasnya diisi di env)
          const near = !limited && a.daily?.warning;
          const rate = a.rateLimit;
          const fresh = rate?.observedAt && Date.now() - new Date(rate.observedAt).getTime() < FRESH_MS && rate.limitTokens;
          const capacity = fresh ? (rate.remainingTokens / rate.limitTokens) * 100 : null;
          return (
            <li key={a.model}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <span className={`h-2 w-2 rounded-full ${limited ? "bg-red-500" : near ? "bg-amber-500" : "bg-emerald-500"}`} aria-hidden="true" />
                  {a.name}
                </span>
                <span className={`text-xs ${limited ? "text-red-600 dark:text-red-400" : near ? "text-amber-600 dark:text-amber-400" : "text-gray-500 dark:text-gray-400"}`}>
                  {limited
                    ? a.cooldownReason === "not_configured" ? "Tidak aktif di server"
                      : `${a.cooldownReason === "limit_daily" ? "Kuota harian habis" : "Kena limit"}, pulih ${formatResetTime(a.cooldownUntil)}`
                    : near ? `Hampir habis · ${a.daily.source === "estimasi" ? "±" : ""}${a.daily.percent}% kuota harian`
                      : capacity !== null ? `Kapasitas menit ini ${Math.round(capacity)}%` : "Tersedia"}
                </span>
              </div>
              {near ? (
                <div className="mt-1.5 pl-4">
                  <Bar pct={a.daily.percent} tone={a.daily.percent >= 90 ? "red" : "amber"} />
                </div>
              ) : capacity !== null && !limited && (
                <div className="mt-1.5 pl-4">
                  <Bar pct={capacity} tone={capacity < 20 ? "amber" : "green"} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-gray-400 dark:text-slate-500">Jika model penuh, jawaban otomatis pindah ke model lain.</p>
    </Section>
  );
}

function RefreshButton({ loading, onClick, at }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title="Muat ulang data penggunaan"
      className="inline-flex items-center gap-2 rounded-full border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        className={loading ? "animate-spin" : ""}
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <polyline points="21 3 21 9 15 9" />
      </svg>
      {loading ? "Memuat…" : at ? `Diperbarui ${fmtTime(at)}` : "Muat ulang"}
    </button>
  );
}

export default function UsagePanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/usage", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat data penggunaan");
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <RefreshButton loading={loading} onClick={load} at={data?.generatedAt} />
      </div>

      {!data && loading && <p className="text-sm text-gray-500 dark:text-gray-400">Memuat data penggunaan…</p>}
      {error && (
        <p className="rounded-2xl border border-red-200 dark:border-red-500/40 p-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {data && (
        <>
          <PlanSection plan={data.plan} />
          <QuotaSection quota={data.quota} />
          <ModelSection models={data.models} untracked={data.untracked} />
          <AvailabilitySection availability={data.availability} />
        </>
      )}
    </div>
  );
}
