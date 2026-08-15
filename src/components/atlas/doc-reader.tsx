"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  BookOpenText,
  ChevronDown,
  Gavel,
  MessageSquareQuote,
  PanelRightClose,
  Scale,
  ScrollText,
  X,
} from "lucide-react";
import type { AtlasDoc, AtlasIndex } from "./lib/atlas-data";
import { categoryColor, categoryOf, courtLabel } from "./lib/categories";
import { MarkdownView } from "./markdown-view";
import { Chip, Spinner } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";
import {
  ensureCompleteSummary,
  quickSummaryFor,
  relevantLawsFor,
} from "@/lib/document-brief";

export function DocReader({
  doc,
  loading,
  error,
  index,
  onOpenDoc,
  onClose,
  onAsk,
  contextOpen,
  onToggleContext,
}: {
  doc: AtlasDoc | null;
  loading: boolean;
  error: string | null;
  index: AtlasIndex;
  onOpenDoc: (id: string) => void;
  onClose: () => void;
  onAsk: (doc: AtlasDoc) => void;
  contextOpen: boolean;
  onToggleContext: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const fullTextId = useId();
  const [showFullText, setShowFullText] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    headingRef.current?.focus({ preventScroll: true });
    setShowFullText(false);
  }, [doc?.meta.id]);

  const category = useMemo(
    () => (doc ? categoryOf(doc.meta.categoryPath) : ""),
    [doc],
  );

  const completeSummary = useMemo(
    () => (doc ? ensureCompleteSummary(doc.meta) : ""),
    [doc],
  );
  const footerSummary = useMemo(
    () => (doc ? quickSummaryFor(doc.meta, completeSummary) : ""),
    [doc, completeSummary],
  );
  const laws = useMemo(() => (doc ? relevantLawsFor(doc.meta) : []), [doc]);

  return (
    <section
      aria-label="Document reader"
      className="flex h-full min-w-0 flex-col bg-panel"
    >
      <header className="sticky top-0 z-10 border-b border-line bg-panel/95 backdrop-blur">
        <div className="flex items-start gap-2 px-4 pt-3 pb-2 sm:px-6">
          <div className="min-w-0 flex-1">
            {doc ? (
              <>
                <nav aria-label="Category" className="flex flex-wrap items-center gap-1">
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full"
                    style={{ background: categoryColor(category) }}
                  />
                  {doc.meta.categoryPath.map((segment, i) => (
                    <span key={`${segment}-${i}`} className="eyebrow">
                      {i > 0 ? <span className="px-1 text-faint">›</span> : null}
                      {segment}
                    </span>
                  ))}
                </nav>
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  className="rule-heading mt-1 text-lg leading-tight font-semibold text-balance text-ink outline-none sm:text-xl"
                >
                  {doc.meta.title}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <Chip>
                    {doc.meta.kind === "statute" ? (
                      <ScrollText aria-hidden className="size-3" />
                    ) : (
                      <Gavel aria-hidden className="size-3" />
                    )}
                    {courtLabel(doc.meta.court)}
                  </Chip>
                  {doc.meta.citation ? (
                    <span className="citation">{doc.meta.citation}</span>
                  ) : null}
                  {doc.meta.year ? (
                    <span className="citation">· {doc.meta.year}</span>
                  ) : null}
                  {doc.source !== "live" ? (
                    <Chip className="text-faint">
                      {doc.source === "demo" ? "demo text" : "metadata view"}
                    </Chip>
                  ) : null}
                </div>
              </>
            ) : (
              <h2 className="rule-heading text-lg font-semibold text-muted">Reader</h2>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {doc ? (
              <button
                type="button"
                onClick={() => onAsk(doc)}
                className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent-line hover:bg-accent-wash hover:text-ink"
              >
                <MessageSquareQuote aria-hidden className="size-3.5" />
                <span className="hidden sm:inline">Ask about this</span>
              </button>
            ) : null}
            <button
              type="button"
              onClick={onToggleContext}
              aria-pressed={contextOpen}
              title="Toggle links panel"
              className={cn(
                "hidden rounded-md border p-1.5 transition-colors xl:inline-flex",
                contextOpen
                  ? "border-accent-line bg-accent-wash text-ink"
                  : "border-line text-muted hover:bg-sunken hover:text-ink",
              )}
            >
              <PanelRightClose aria-hidden className="size-4" />
              <span className="sr-only">Toggle links panel</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close reader"
              className="rounded-md border border-line p-1.5 text-muted transition-colors hover:bg-sunken hover:text-ink"
            >
              <X aria-hidden className="size-4" />
              <span className="sr-only">Close reader</span>
            </button>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center gap-2 px-6 py-8 text-sm text-muted">
            <Spinner />
            Retrieving the judgment…
          </div>
        ) : error ? (
          <div className="mx-4 my-6 rounded-lg border border-line bg-sunken p-4 sm:mx-6">
            <p className="text-sm font-medium text-ink">Could not open this document</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{error}</p>
          </div>
        ) : doc ? (
          <article className="mx-auto max-w-[68ch] px-4 py-6 sm:px-6">
            <section className="overflow-hidden rounded-lg border border-line bg-sunken/45">
              <div className="border-l-2 border-accent-line px-4 py-3.5">
                <p className="eyebrow mb-1.5">Summary</p>
                <p className="text-[13.5px] leading-relaxed text-muted">{completeSummary}</p>
              </div>
              {laws.length > 0 ? (
                <div className="border-t border-line px-4 py-3">
                  <p className="eyebrow mb-2">Relevant laws &amp; sections</p>
                  <ul className="space-y-2">
                    {laws.map((law) => (
                      <li key={law.statute} className="text-[13px] leading-relaxed text-muted">
                        <span className="font-medium text-ink">{law.statute}</span>
                        <span className="text-faint"> — {law.sections.slice(0, 3).join("; ")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <button
                type="button"
                aria-expanded={showFullText}
                aria-controls={fullTextId}
                onClick={() => setShowFullText((current) => !current)}
                className="flex w-full items-center gap-2 border-t border-line px-4 py-3 text-left text-xs font-semibold text-ink transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
              >
                <BookOpenText aria-hidden className="size-4 text-accent" />
                <span className="flex-1">
                  {showFullText ? "Hide full document" : "View full document"}
                </span>
                <ChevronDown
                  aria-hidden
                  className={cn("size-4 text-faint transition-transform", showFullText && "rotate-180")}
                />
              </button>
            </section>

            {showFullText ? (
              <div id={fullTextId} className="mt-7 animate-fade-up">
                <div className="mb-5 flex items-center gap-3 border-b border-line pb-2">
                  <span className="eyebrow">Full document</span>
                  <span className="h-px flex-1 bg-line" />
                </div>
                <MarkdownView content={doc.content} index={index} onOpenDoc={onOpenDoc} />
                {doc.meta.sourceUrl ? (
                  <a
                    href={doc.meta.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-8 inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-xs font-medium text-muted transition-colors hover:border-accent-line hover:text-ink"
                  >
                    <Scale aria-hidden className="size-3.5" />
                    Read the authoritative text
                    <ArrowUpRight aria-hidden className="size-3.5" />
                  </a>
                ) : null}
              </div>
            ) : null}

            <footer className="mt-8 rounded-lg border border-line bg-raised/60 px-4 py-3.5">
              <p className="eyebrow mb-1.5">Quick summary</p>
              <p className="text-[13.5px] leading-relaxed text-ink">{footerSummary}</p>
            </footer>
          </article>
        ) : null}
      </div>
    </section>
  );
}
