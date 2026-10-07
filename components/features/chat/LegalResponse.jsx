"use client";

import ReactMarkdown from "react-markdown";
import { Children, isValidElement, memo, useCallback, useEffect, useMemo, useState } from "react";

// Pola kutipan dari AI: "(Sumber: Nama Dokumen, Hal: 12)" atau "[DOKUMEN 3 | Sumber: ... | Hal: 12]".
// Mendukung satu tingkat kurung di dalam kutipan, mis. "Lampiran I.F (I.F.1-700)".
const CITATION_BODY = String.raw`\(Sumber:(?:[^()]|\([^()]*\))+\)|\[\s*DOKUMEN[^\]]+\]`;
const CITATION_TEST = new RegExp(String.raw`^\s*(${CITATION_BODY})\s*\.?\s*$`, "i");
const CITATION_SPLIT = new RegExp(`(${CITATION_BODY})`, "i");
const CITATION_ALL = new RegExp(CITATION_BODY, "gi");

// ─── Parsing kutipan ─────────────────────────────────────────────────────────

// Satu sumber: "Sumber: Regulasi Perdata - PP X, Hal: 19" → { title, docName, page, key }
function parseOne(raw) {
  let source = raw.trim();
  let page = null;

  if (source.includes("|")) {
    // Format "[DOKUMEN 1 | Sumber: X | Hal: 19]"
    const segments = source.split("|").map((s) => s.trim());
    source = segments.find((s) => /^Sumber\s*:/i.test(s)) || segments[0];
    const halSeg = segments.find((s) => /^(Hal(?:aman)?|Hlm)\b/i.test(s));
    if (halSeg) page = halSeg.replace(/^(Hal(?:aman)?|Hlm)\.?\s*:?\s*/i, "");
  } else {
    const halMatch = source.match(/,\s*(Hal(?:aman)?|Hlm)\.?\s*:?\s*([^,]+)$/i);
    if (halMatch) {
      page = halMatch[2].trim();
      source = source.slice(0, halMatch.index);
    }
  }

  const title = source.replace(/^Sumber\s*:\s*/i, "").trim();
  const docName = title.replace(/^Regulasi\s+[^-]+-\s*/i, "").trim() || title; // "Regulasi Perdata - PP ..." → "PP ..."
  if (!page || page === "?") page = null;

  return { title, docName, page, key: `${title.toLowerCase()}|${page || ""}` };
}

// Satu kutipan bisa berisi beberapa sumber yang dipisah ";" →
// "(Sumber: A, Hal: 1; B, Hal: 2)" → [ {A, 1}, {B, 2} ]
export function parseCitations(text) {
  const inner = text
    .trim()
    .replace(/\.$/, "")
    .replace(/^[([]\s*|\s*[)\]]$/g, "")
    .trim();

  return inner
    .split(/\s*;\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map(parseOne)
    // Buang kutipan tanpa nama dokumen, mis. "[DOKUMEN 11, #24]" (nomor urut konteks AI yang
    // tidak disimpan) atau "Tidak diketahui" — tidak bisa ditautkan ke dokumen mana pun.
    .filter((c) => c.title && !/^DOKUMEN\b/i.test(c.title) && !/^Tidak diketahui$/i.test(c.title));
}

// Kumpulkan kutipan unik sesuai urutan kemunculan → nomor [1], [2], ...
function collectCitations(content) {
  const list = [];
  const indexByKey = new Map();
  let rawCount = 0; // jumlah kutipan mentah, termasuk yang tidak bisa ditautkan
  for (const match of content.matchAll(CITATION_ALL)) {
    rawCount++;
    for (const c of parseCitations(match[0])) {
      if (!indexByKey.has(c.key)) {
        indexByKey.set(c.key, list.length + 1);
        list.push(c);
      }
    }
  }
  return { list, indexByKey, hasUnlinkable: rawCount > 0 && list.length === 0 };
}

// ─── Resolusi judul → link dokumen (cache global antar pesan) ────────────────

const resolveCache = new Map(); // judul lowercase → { doc: { id, fileUrl } | null, at }
const MISS_TTL_MS = 30_000; // judul yang tidak ditemukan dicoba lagi setelah 30 detik

function cachedDoc(title) {
  const entry = resolveCache.get(title.toLowerCase());
  if (!entry) return undefined;
  if (!entry.doc && Date.now() - entry.at > MISS_TTL_MS) return undefined; // miss kedaluwarsa
  return entry.doc;
}

function useResolvedDocs(titles) {
  const [version, rerender] = useState(0);
  const signature = titles.join("\n");

  useEffect(() => {
    const missing = titles.filter((t) => t && cachedDoc(t) === undefined).slice(0, 20);
    if (missing.length === 0) return;

    let cancelled = false;
    const qs = new URLSearchParams();
    missing.forEach((t) => qs.append("title", t));

    fetch(`/api/regulations/resolve?${qs.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(({ data = {} }) => {
        const at = Date.now();
        missing.forEach((t) => resolveCache.set(t.toLowerCase(), { doc: data[t.toLowerCase()] || null, at }));
        if (!cancelled) rerender((n) => n + 1);
      })
      .catch(() => {}); // gagal → referensi tetap tampil, hanya tidak bisa diklik

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  // Stabil antar render; berubah hanya saat hasil resolusi baru masuk
  return useCallback(
    (citation) => {
      const doc = cachedDoc(citation.title);
      if (!doc?.fileUrl) return null;
      const startPage = parseInt(citation.page, 10);
      return Number.isFinite(startPage) && startPage > 0 ? `${doc.fileUrl}#page=${startPage}` : doc.fileUrl;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version]
  );
}

// ─── Helpers render ──────────────────────────────────────────────────────────

function textOf(children) {
  return Children.toArray(children)
    .map((c) => (typeof c === "string" ? c : isValidElement(c) ? textOf(c.props.children) : ""))
    .join("");
}

const ExternalIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// ─── Komponen utama ──────────────────────────────────────────────────────────

function LegalResponse({ content }) {
  const { list: citations, indexByKey, hasUnlinkable } = useMemo(() => collectCitations(content || ""), [content]);
  const hrefFor = useResolvedDocs(citations.map((c) => c.title));

  const components = useMemo(() => {
    // Badge nomor kutipan [n] di dalam kalimat (bisa lebih dari satu: [2][3])
    const CitationRef = ({ text }) => (
      <>
        {parseCitations(text).map((c) => (
          <CitationBadge key={c.key} c={c} />
        ))}
      </>
    );

    const CitationBadge = ({ c }) => {
      const n = indexByKey.get(c.key);
      if (!n) return null;
      const href = hrefFor(c);
      const label = `${c.docName}${c.page ? `, Hal. ${c.page}` : ""}`;
      const cls =
        "inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 mx-0.5 rounded-md text-[11px] font-semibold leading-none align-[2px] no-underline transition-colors " +
        (href
          ? "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white dark:bg-blue-500/15 dark:text-blue-300 dark:hover:bg-blue-500 dark:hover:text-white"
          : "bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400");

      return href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" title={`Buka: ${label}`} className={cls}>{n}</a>
      ) : (
        <span title={label} className={cls}>{n}</span>
      );
    };

    const withCitations = (children) =>
      Children.map(children, (child) => {
        if (typeof child !== "string" || !CITATION_SPLIT.test(child)) return child;
        return child.split(CITATION_SPLIT).map((part, i) =>
          i % 2 === 1 ? <CitationRef key={i} text={part} /> : part
        );
      });

    return {
      h1: ({ children }) => <h3 className="text-[17px] font-semibold text-gray-900 dark:text-slate-100 mt-5 mb-2 first:mt-0">{children}</h3>,
      h2: ({ children }) => <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100 mt-5 mb-2 first:mt-0">{children}</h3>,
      h3: ({ children }) => <h4 className="text-[15px] font-semibold text-gray-900 dark:text-slate-100 mt-4 mb-1.5 first:mt-0">{children}</h4>,

      p: ({ children }) => <p className="mb-3 last:mb-0">{withCitations(children)}</p>,

      ul: ({ children }) => (
        <ul className="mb-3 last:mb-0 pl-5 space-y-1 list-disc marker:text-gray-400 dark:marker:text-slate-500 [&_ul]:mt-1 [&_ul]:mb-0 [&_ul]:list-[circle]">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="mb-3 last:mb-0 pl-5 space-y-1 list-decimal marker:text-gray-400 dark:marker:text-slate-500 [&_ol]:mt-1 [&_ol]:mb-0">
          {children}
        </ol>
      ),
      li: ({ children }) => <li className="pl-1 [&>p]:mb-1">{withCitations(children)}</li>,

      // AI sering menulis kutipan dalam **bold** → tampilkan sebagai nomor, bukan teks tebal
      strong: ({ children }) => {
        const text = textOf(children);
        if (CITATION_TEST.test(text)) return <CitationRef text={text} />;
        return <strong className="font-semibold text-gray-900 dark:text-slate-100">{children}</strong>;
      },

      blockquote: ({ children }) => (
        <blockquote className="my-3 border-l-2 border-gray-300 dark:border-slate-600 pl-4 text-gray-600 dark:text-slate-400 [&>p]:mb-1">
          {children}
        </blockquote>
      ),
      a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline underline-offset-2">
          {children}
        </a>
      ),
      code: ({ children }) => (
        <code className="bg-gray-100 dark:bg-slate-700/60 text-gray-800 dark:text-slate-200 px-1.5 py-0.5 rounded text-[13px] font-mono">{children}</code>
      ),
      hr: () => <hr className="my-4 border-gray-200 dark:border-slate-700" />,
    };
  }, [indexByKey, hrefFor]);

  if (!content) return null;

  return (
    <div className="legal-response select-text text-[15px] leading-7 text-gray-700 dark:text-slate-300 break-words">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>

      {/* Jawaban lama yang mengutip "DOKUMEN n" tanpa nama dokumen */}
      {hasUnlinkable && (
        <p className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-400 dark:text-slate-500">
          Referensi jawaban ini tidak dapat ditautkan ke dokumen. Ajukan ulang pertanyaan untuk mendapatkan referensi yang bisa dibuka.
        </p>
      )}

      {citations.length > 0 && (
        <div className="mt-5 pt-4 border-t border-gray-200 dark:border-slate-700">
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">Referensi</p>
          <ol className="space-y-1">
            {citations.map((c, i) => {
              const href = hrefFor(c);
              const inner = (
                <>
                  <span className="shrink-0 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300">
                    {i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={href ? "text-gray-800 dark:text-slate-200 group-hover/ref:text-blue-600 dark:group-hover/ref:text-blue-400" : "text-gray-600 dark:text-slate-400"}>
                      {c.docName}
                    </span>
                    {c.page && <span className="text-gray-400 dark:text-slate-500"> · Hal. {c.page}</span>}
                  </span>
                  {href && <ExternalIcon className="w-3.5 h-3.5 shrink-0 mt-1 text-gray-400 group-hover/ref:text-blue-500" />}
                </>
              );
              return (
                <li key={c.key}>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Buka dokumen: ${c.title}`}
                      className="group/ref flex items-start gap-2 text-[13px] leading-6 rounded-lg -mx-1.5 px-1.5 py-0.5 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors"
                    >
                      {inner}
                    </a>
                  ) : (
                    <div title={c.title} className="flex items-start gap-2 text-[13px] leading-6 px-0 py-0.5">
                      {inner}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

// memo: jawaban lama tidak ikut render ulang saat user mengetik / pesan baru masuk
export default memo(LegalResponse);
