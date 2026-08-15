"use client";

import Link from "next/link";
import { FileSearch, Moon, PanelLeft, Sun } from "lucide-react";
import type { DataSource } from "./lib/atlas-data";
import { IconButton } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";

const SOURCE_COPY: Record<DataSource, { label: string; tone: string; hint: string }> = {
  live: {
    label: "Live index",
    tone: "text-sev-low",
    hint: "Served from the indexing pipeline",
  },
  fixture: {
    label: "Fixture index",
    tone: "text-sev-medium",
    hint: "Served from the checked-in fixtures — the pipeline is not answering",
  },
  demo: {
    label: "Demo corpus",
    tone: "text-sev-medium",
    hint: "The index is empty, so a bundled demo corpus is shown",
  },
};

export function AtlasLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className} fill="none">
      <circle cx="16" cy="7" r="3.4" fill="var(--accent)" />
      <circle cx="7" cy="23" r="2.6" fill="currentColor" opacity="0.75" />
      <circle cx="25" cy="23" r="2.6" fill="currentColor" opacity="0.75" />
      <path
        d="M16 10.4 8.4 20.6M16 10.4l7.6 10.2M9.6 23h12.8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

export function TopBar({
  source,
  nodeCount,
  theme,
  onToggleTheme,
  onToggleRail,
  railOpen,
  mounted,
}: {
  source: DataSource;
  nodeCount: number;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onToggleRail: () => void;
  railOpen: boolean;
  mounted: boolean;
}) {
  const status = SOURCE_COPY[source];

  return (
    <header className="z-30 flex h-13 shrink-0 items-center gap-2 border-b border-line bg-panel px-2 sm:px-3">
      <IconButton
        label={railOpen ? "Hide browser" : "Show browser"}
        onClick={onToggleRail}
        active={railOpen}
        className="lg:hidden"
      >
        <PanelLeft className="size-4" />
      </IconButton>

      <Link
        href="/"
        className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-sunken"
      >
        <AtlasLogo className="size-6 shrink-0 text-ink" />
        <span className="min-w-0">
          <span className="rule-heading block truncate text-[15px] leading-tight font-semibold text-ink">
            Singapore Law Atlas
          </span>
          <span className="hidden text-[10.5px] leading-tight text-faint sm:block">
            {nodeCount} codes, statutes &amp; cases · graph atlas
          </span>
        </span>
      </Link>

      <span
        title={status.hint}
        className="ml-1 hidden items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[10.5px] text-muted md:inline-flex"
      >
        <span aria-hidden className={cn("size-1.5 rounded-full bg-current", status.tone)} />
        {status.label}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <Link
          href="/deposition"
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-[12.5px] font-medium text-muted transition-colors hover:border-accent-line hover:bg-accent-wash hover:text-ink"
        >
          <FileSearch aria-hidden className="size-3.5" />
          <span className="hidden sm:inline">Deposition analyser</span>
          <span className="sm:hidden">Deposition</span>
        </Link>
        <IconButton
          label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          onClick={onToggleTheme}
        >
          {mounted && theme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </IconButton>
      </div>
    </header>
  );
}
