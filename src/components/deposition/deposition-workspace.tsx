"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  Moon,
  Play,
  RotateCcw,
  ScanSearch,
  Sun,
  TriangleAlert,
} from "lucide-react";
import type { LiabilityIssue } from "@/lib/types";
import { loadIndex, type AtlasIndex } from "@/components/atlas/lib/atlas-data";
import { useTheme } from "@/components/atlas/lib/use-theme";
import { AtlasLogo } from "@/components/atlas/top-bar";
import { analyseDeposition } from "./lib/analyse";
import {
  canStartLiveAnalysis,
  liveAnalysisDisclosure,
  type DepositionAnalysisMode,
} from "./lib/consent";
import { parseFile, parseSampleUrl, type ParsedDocument } from "./lib/parse-file";
import { Dropzone } from "./dropzone";
import { IssueCard } from "./issue-cards";
import { EmptyState, IconButton, Spinner } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";

const SAMPLES = [
  {
    file: "deposition-slip-and-fall.pdf",
    title: "Slip and fall in a shopping centre",
    meta: "PDF transcript",
  },
  {
    file: "deposition-worksite-scaffold.pdf",
    title: "Scaffold collapse on a worksite",
    meta: "PDF transcript",
  },
  {
    file: "deposition-supply-contract.pdf",
    title: "Supply contract dispute",
    meta: "PDF transcript",
  },
];

export function DepositionWorkspace() {
  const { theme, mounted, toggle } = useTheme();
  const [index, setIndex] = useState<AtlasIndex | null>(null);

  const [parsed, setParsed] = useState<ParsedDocument | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const [issues, setIssues] = useState<LiabilityIssue[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [analysisSource, setAnalysisSource] = useState<"live" | "local" | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [mode, setMode] = useState<DepositionAnalysisMode>("local");
  const [consent, setConsent] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadIndex()
      .then((loaded) => {
        if (!cancelled) setIndex(loaded);
      })
      .catch(() => {
        // Precedent linking degrades to an empty list; parsing still works.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setParsed(null);
    setIssues(null);
    setSummary(null);
    setAnalysisSource(null);
    setError(null);
    setPage(0);
    setConsent(false);
  }, []);

  const ingest = useCallback(async (load: () => Promise<ParsedDocument>) => {
    setParsing(true);
    setError(null);
    setIssues(null);
    setSummary(null);
    setAnalysisSource(null);
    setConsent(false);
    try {
      const document = await load();
      setParsed(document);
      setPage(0);
    } catch (cause) {
      setParsed(null);
      setError(cause instanceof Error ? cause.message : "That file could not be read.");
    } finally {
      setParsing(false);
    }
  }, []);

  const run = useCallback(async () => {
    if (!parsed || analysing) return;
    if (mode === "live" && !canStartLiveAnalysis(consent)) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setAnalysing(true);
    try {
      const result = await analyseDeposition(parsed, index, {
        signal: controller.signal,
        mode,
        consent,
      });
      setIssues(result.issues);
      setSummary(result.summary);
      setAnalysisSource(result.source);
    } finally {
      setAnalysing(false);
      abortRef.current = null;
    }
  }, [analysing, consent, index, mode, parsed]);

  const pageText = useMemo(() => parsed?.pages[page] ?? "", [page, parsed]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex h-13 shrink-0 items-center gap-2 border-b border-line bg-panel px-2 sm:px-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] font-medium text-muted transition-colors hover:bg-sunken hover:text-ink"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          <span className="hidden sm:inline">Back to the atlas</span>
          <span className="sm:hidden">Atlas</span>
        </Link>
        <span aria-hidden className="h-5 w-px bg-line" />
        <span className="flex min-w-0 items-center gap-2">
          <AtlasLogo className="size-5 shrink-0 text-ink" />
          <span className="rule-heading truncate text-[14px] font-semibold text-ink">
            Deposition analyser
          </span>
        </span>
        <div className="ml-auto flex items-center gap-1">
          {parsed ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[12.5px] font-medium text-muted transition-colors hover:bg-sunken hover:text-ink"
            >
              <RotateCcw aria-hidden className="size-3.5" />
              <span className="hidden sm:inline">New transcript</span>
            </button>
          ) : null}
          <IconButton
            label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            onClick={toggle}
          >
            {mounted && theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </IconButton>
        </div>
      </header>

      <main id="atlas-main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {!parsed ? (
          <div className="mx-auto max-w-2xl">
            <p className="eyebrow">Deposition analyser</p>
            <h1 className="rule-heading mt-2 text-3xl leading-tight font-semibold text-balance text-ink sm:text-4xl">
              Test a transcript against the precedent map.
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Drop in a deposition. Text is extracted in your browser. Analyse locally, or send the
              transcript to OpenRouter after you accept the disclosure. Each issue is linked to
              the Singapore authorities that govern it.
            </p>

            <div className="mt-7">
              <Dropzone onFile={(file) => void ingest(() => parseFile(file))} busy={parsing} />
            </div>

            {error ? <ErrorNote message={error} /> : null}

            <section className="mt-8">
              <p className="eyebrow">Or start from a sample</p>
              <ul className="mt-2 grid gap-2 sm:grid-cols-3">
                {SAMPLES.map((sample) => (
                  <li key={sample.file}>
                    <button
                      type="button"
                      disabled={parsing}
                      onClick={() =>
                        void ingest(() => parseSampleUrl(`/samples/${sample.file}`, sample.file))
                      }
                      className="flex h-full w-full flex-col gap-1 rounded-lg border border-line bg-panel p-3 text-left transition-colors hover:border-accent-line hover:bg-accent-wash disabled:opacity-50"
                    >
                      <FileText aria-hidden className="size-4 text-faint" />
                      <span className="text-[13px] leading-snug font-medium text-ink">
                        {sample.title}
                      </span>
                      <span className="text-[11px] text-faint">{sample.meta}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <section aria-label="Transcript preview" className="min-w-0">
              <div className="overflow-hidden rounded-xl border border-line bg-panel">
                <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <FileText aria-hidden className="size-4 shrink-0 text-faint" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-ink">
                      {parsed.filename}
                    </p>
                    <p className="text-[11px] text-faint">
                      {parsed.kind.toUpperCase()} · {parsed.pageCount} page
                      {parsed.pageCount === 1 ? "" : "s"} · {parsed.words.toLocaleString()} words ·
                      parsed locally
                    </p>
                  </div>
                </header>

                <div className="max-h-[26rem] overflow-y-auto bg-sunken/40 px-5 py-4 lg:max-h-[calc(100dvh-18rem)]">
                  <pre className="font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-ink/90">
                    {pageText || "This page has no extractable text."}
                  </pre>
                </div>

                {parsed.pageCount > 1 ? (
                  <nav
                    aria-label="Transcript pages"
                    className="flex items-center justify-between gap-2 border-t border-line px-3 py-2"
                  >
                    <IconButton
                      label="Previous page"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((current) => Math.max(0, current - 1))}
                    >
                      <ChevronLeft className="size-4" />
                    </IconButton>
                    <span className="text-[11.5px] tabular-nums text-muted">
                      Page {page + 1} of {parsed.pageCount}
                    </span>
                    <IconButton
                      label="Next page"
                      size="sm"
                      disabled={page >= parsed.pageCount - 1}
                      onClick={() =>
                        setPage((current) => Math.min(parsed.pageCount - 1, current + 1))
                      }
                    >
                      <ChevronRight className="size-4" />
                    </IconButton>
                  </nav>
                ) : null}
              </div>

              <div className="mt-3">
                <Dropzone
                  compact
                  onFile={(file) => void ingest(() => parseFile(file))}
                  busy={parsing}
                />
              </div>
              {error ? <ErrorNote message={error} /> : null}
            </section>

            <section aria-label="Liability analysis" className="min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="rule-heading text-lg font-semibold text-ink">
                    Liability read-out
                  </h2>
                  <p className="text-[11.5px] text-faint">
                    {analysisSource === "live"
                      ? "Returned by OpenRouter under no-storage / ZDR"
                      : analysisSource === "local"
                        ? "Local keyword pass — nothing was uploaded"
                        : "Not run yet"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void run()}
                  disabled={analysing || (mode === "live" && !canStartLiveAnalysis(consent))}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-3.5 py-2 text-[13px] font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {analysing ? <Spinner className="border-t-accent-ink" /> : <Play aria-hidden className="size-3.5" />}
                  {mode === "local"
                    ? issues
                      ? "Re-run locally"
                      : "Analyse locally"
                    : issues
                      ? "Re-run with OpenRouter"
                      : "Analyse with OpenRouter"}
                </button>
              </div>

              <div className="mt-3 rounded-lg border border-line bg-panel px-3.5 py-3">
                <div className="flex rounded-md border border-line p-0.5">
                  <ModeButton
                    label="Local only"
                    active={mode === "local"}
                    onClick={() => setMode("local")}
                  />
                  <ModeButton
                    label="OpenRouter"
                    active={mode === "live"}
                    onClick={() => setMode("live")}
                  />
                </div>
                {mode === "live" ? (
                  <>
                    <p className="mt-2.5 text-[12px] leading-relaxed text-muted">
                      {liveAnalysisDisclosure()}
                    </p>
                    <label className="mt-2 flex items-start gap-2 text-[12.5px] leading-snug text-ink">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(event) => setConsent(event.target.checked)}
                        className="mt-0.5"
                      />
                      <span>I understand and consent to sending this transcript to OpenRouter.</span>
                    </label>
                  </>
                ) : (
                  <p className="mt-2.5 text-[12px] leading-relaxed text-muted">
                    Local analysis stays in this browser. It uses a keyword pass over the extracted
                    text and does not call the analysis API or OpenRouter.
                  </p>
                )}
              </div>

              {summary ? (
                <p className="mt-3 rounded-lg border border-line bg-panel px-3.5 py-2.5 text-[12.5px] leading-relaxed text-muted">
                  {summary}
                </p>
              ) : null}

              <div className="mt-3 flex flex-col gap-3">
                {analysing && !issues ? (
                  <div className="flex flex-col gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-28 animate-pulse rounded-xl border border-line bg-panel"
                        style={{ opacity: 1 - i * 0.22 }}
                      />
                    ))}
                  </div>
                ) : issues && issues.length > 0 ? (
                  issues.map((issue, i) => (
                    <IssueCard key={issue.issue} issue={issue} position={i + 1} />
                  ))
                ) : issues ? (
                  <div className="rounded-xl border border-line bg-panel">
                    <EmptyState
                      icon={<ScanSearch className="size-6" />}
                      title="No liability markers found"
                      hint="Nothing in this transcript matched a known line of enquiry. Try a fuller transcript or check the extracted text on the left."
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-line bg-panel">
                    <EmptyState
                      icon={<ScanSearch className="size-6" />}
                      title="Ready when you are"
                      hint="Choose local or OpenRouter analysis to surface the liability issues in this transcript and the Singapore authorities that bear on them."
                    />
                  </div>
                )}
              </div>

              {issues && issues.length > 0 ? (
                <p className="mt-4 text-[11px] leading-relaxed text-faint">
                  Generated for research triage only. Verify every authority before relying on it.
                </p>
              ) : null}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function ModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex-1 rounded-[5px] px-2.5 py-1.5 text-[12px] font-medium transition-colors",
        active ? "bg-accent-wash text-ink" : "text-muted hover:text-ink",
      )}
    >
      {label}
    </button>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className={cn(
        "mt-3 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-[12.5px] leading-relaxed",
        "border-sev-high/40 bg-sev-high/8 text-ink",
      )}
    >
      <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-sev-high" />
      {message}
    </p>
  );
}
