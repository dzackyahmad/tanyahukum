"use client";

import { useEffect, useState } from "react";
import { LEGAL_DOCS, LEGAL_PATHS, UI, EFFECTIVE_DATE } from "./legalContent";

// Halaman dokumen legal (Kebijakan Privasi / Syarat & Ketentuan): statis, dua bahasa.
// Bahasa dipilih lewat ?lang=en|id, diingat di localStorage.
const LANG_KEY = "tanyahukum_legal_lang";
const LANGS = [
  { id: "id", label: "ID", name: "Bahasa Indonesia" },
  { id: "en", label: "EN", name: "English" },
];

// Format sebaris: **tebal** dan *miring*
function Inline({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("**")) return <strong key={i} className="font-semibold text-slate-900 dark:text-white">{p.slice(2, -2)}</strong>;
    if (p.startsWith("*")) return <em key={i}>{p.slice(1, -1)}</em>;
    return <span key={i}>{p}</span>;
  });
}

function Block({ block }) {
  if (typeof block === "string") {
    return <p className="leading-relaxed"><Inline text={block} /></p>;
  }
  if (block.list) {
    return (
      <ul className="space-y-2 pl-5 list-disc marker:text-blue-500">
        {block.list.map((item, i) => (
          <li key={i} className="leading-relaxed pl-1"><Inline text={item} /></li>
        ))}
      </ul>
    );
  }
  if (block.note) {
    return (
      <div className="flex gap-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-amber-900 dark:text-amber-100 print:border-slate-400 print:bg-transparent">
        <svg className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="leading-relaxed"><Inline text={block.note} /></p>
      </div>
    );
  }
  if (block.table) {
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-left text-[13.5px]">
          <thead className="bg-slate-50 dark:bg-slate-800/80">
            <tr>
              {block.table.head.map((h) => (
                <th key={h} scope="col" className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {block.table.rows.map((row, i) => (
              <tr key={i} className="align-top">
                {row.map((cell, j) => (
                  <td key={j} className={`px-4 py-2.5 leading-relaxed ${j === 0 ? "font-medium text-slate-800 dark:text-slate-100 min-w-[9rem]" : ""}`}>
                    <Inline text={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return null;
}

export default function LegalDocument({ type }) {
  const [lang, setLang] = useState("id");

  // Bahasa awal: ?lang= di URL → pilihan terakhir → Indonesia
  useEffect(() => {
    let initial = "id";
    try {
      const fromUrl = new URLSearchParams(window.location.search).get("lang");
      const saved = localStorage.getItem(LANG_KEY);
      initial = LANGS.some((l) => l.id === fromUrl) ? fromUrl : LANGS.some((l) => l.id === saved) ? saved : "id";
    } catch {}
    setLang(initial);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    const doc = LEGAL_DOCS[type][lang];
    document.title = `${doc.title} · TanyaHukum`;
  }, [lang, type]);

  // Saat dicetak / disimpan PDF: buka semua FAQ agar jawabannya ikut tercetak
  useEffect(() => {
    const openAll = () => document.querySelectorAll("article details").forEach((d) => { d.open = true; });
    window.addEventListener("beforeprint", openAll);
    return () => window.removeEventListener("beforeprint", openAll);
  }, []);

  const changeLang = (next) => {
    setLang(next);
    try {
      localStorage.setItem(LANG_KEY, next);
      const url = new URL(window.location.href);
      url.searchParams.set("lang", next);
      window.history.replaceState(null, "", url);
    } catch {}
  };

  const doc = LEGAL_DOCS[type][lang];
  const t = UI[lang];
  const otherType = type === "privacy" ? "terms" : "privacy";

  return (
    <div id="top" className="relative min-h-screen bg-slate-100 dark:bg-[#0b1120] text-slate-700 dark:text-slate-300 print:bg-white print:text-black">
      {/* ── Bilah atas ── */}
      <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0b1120]/90 backdrop-blur print:hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <img src="/icons/logo.svg" alt="" className="w-7 h-7" />
            <span>TanyaHukum</span>
          </a>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-600">/</span>
          <span className="hidden sm:inline text-sm text-slate-500 dark:text-slate-400 truncate">{doc.title}</span>

          <div className="ml-auto flex items-center gap-2">
            <div role="radiogroup" aria-label={t.language} className="flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
              {LANGS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  role="radio"
                  aria-checked={lang === l.id}
                  title={l.name}
                  onClick={() => changeLang(l.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                    lang === l.id ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
              </svg>
              {t.print}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12 lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-10 print:block print:p-0">
        {/* ── Daftar isi ── */}
        <nav aria-label={t.toc} className="hidden lg:block print:hidden">
          <div className="sticky top-24">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">{t.toc}</p>
            <ol className="space-y-1 text-[13px] border-l border-slate-200 dark:border-slate-800">
              {doc.sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block -ml-px border-l border-transparent pl-3 py-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 transition-colors">
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
              <li>
                <a href="#faq" className="block -ml-px border-l border-transparent pl-3 py-1 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500 transition-colors">
                  FAQ
                </a>
              </li>
            </ol>
          </div>
        </nav>

        {/* ── Dokumen ── */}
        <article className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm px-5 py-8 sm:px-12 sm:py-12 text-[14.5px] print:border-0 print:shadow-none print:p-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">{t.docLabel}</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">{doc.title}</h1>
          <p className="mt-3 text-base text-slate-500 dark:text-slate-400">{doc.subtitle}</p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            {t.lastUpdated}: {EFFECTIVE_DATE[lang]}
          </p>

          {/* Ringkasan */}
          <section aria-label={t.summary} className="mt-8 rounded-xl border border-blue-100 dark:border-blue-500/20 bg-blue-50/60 dark:bg-blue-500/5 px-5 py-4 print:border-slate-400 print:bg-transparent">
            <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">{t.summary}</h2>
            <ul className="space-y-1.5 pl-5 list-disc marker:text-blue-500 text-[14px]">
              {doc.summary.map((s, i) => (
                <li key={i} className="leading-relaxed"><Inline text={s} /></li>
              ))}
            </ul>
          </section>

          {/* Daftar isi untuk layar kecil */}
          <details className="mt-6 lg:hidden rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 print:hidden">
            <summary className="cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-100">{t.toc}</summary>
            <ol className="mt-3 space-y-1.5 text-[13.5px]">
              {doc.sections.map((s, i) => (
                <li key={s.id}><a href={`#${s.id}`} className="text-blue-600 dark:text-blue-400 hover:underline">{i + 1}. {s.title}</a></li>
              ))}
              <li><a href="#faq" className="text-blue-600 dark:text-blue-400 hover:underline">FAQ</a></li>
            </ol>
          </details>

          {/* Isi */}
          <div className="mt-10 space-y-10">
            {doc.sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-24 break-inside-avoid-page">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex gap-3">
                  <span className="text-blue-600 dark:text-blue-400 tabular-nums">{i + 1}.</span>
                  <span>{s.title}</span>
                </h2>
                <div className="mt-4 space-y-4">
                  {s.body.map((b, j) => <Block key={j} block={b} />)}
                </div>
              </section>
            ))}

            {/* FAQ */}
            <section id="faq" className="scroll-mt-24 pt-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.faq}</h2>
              <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-700 rounded-xl border border-slate-200 dark:border-slate-700">
                {doc.faq.map((f, i) => (
                  <details key={i} className="group px-4 sm:px-5 py-1">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-3 font-semibold text-slate-800 dark:text-slate-100 [&::-webkit-details-marker]:hidden">
                      <span><Inline text={f.q} /></span>
                      <svg className="w-5 h-5 shrink-0 text-slate-400 transition-transform group-open:rotate-45 print:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </summary>
                    <p className="pb-4 leading-relaxed"><Inline text={f.a} /></p>
                  </details>
                ))}
              </div>
            </section>
          </div>

          {/* Kaki dokumen */}
          <footer className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between text-[13px] text-slate-500 dark:text-slate-400">
            <p>© {new Date().getFullYear()} TanyaHukum · {t.footer}</p>
            <div className="flex items-center gap-4 print:hidden">
              <a href={`${LEGAL_PATHS[otherType]}?lang=${lang}`} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                {t.otherDoc[type]} →
              </a>
              <a href="#top" className="hover:text-slate-900 dark:hover:text-white">{t.backToTop} ↑</a>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}
