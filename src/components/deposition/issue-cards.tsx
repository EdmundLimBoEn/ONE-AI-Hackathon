"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Scale, ShieldAlert, ShieldCheck } from "lucide-react";
import type { LiabilityIssue } from "@/lib/types";
import { cn } from "@/components/ui/cn";

const SEVERITY = {
  high: {
    label: "High exposure",
    icon: ShieldAlert,
    text: "text-sev-high",
    bar: "bg-sev-high",
  },
  medium: {
    label: "Watch closely",
    icon: AlertTriangle,
    text: "text-sev-medium",
    bar: "bg-sev-medium",
  },
  low: {
    label: "Low exposure",
    icon: ShieldCheck,
    text: "text-sev-low",
    bar: "bg-sev-low",
  },
} as const;

export function IssueCard({ issue, position }: { issue: LiabilityIssue; position: number }) {
  const severity = SEVERITY[issue.severity];
  const Icon = severity.icon;

  return (
    <article className="animate-fade-up overflow-hidden rounded-xl border border-line bg-panel">
      <div className="flex items-start gap-3 border-b border-line p-4">
        <span aria-hidden className={cn("mt-1 h-8 w-1 shrink-0 rounded-full", severity.bar)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="eyebrow">Issue {String(position).padStart(2, "0")}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10.5px] font-semibold tracking-wide uppercase",
                severity.text,
              )}
            >
              <Icon aria-hidden className="size-3" />
              {severity.label}
            </span>
          </div>
          <h3 className="rule-heading mt-1 text-[15px] leading-snug font-semibold text-balance text-ink">
            {issue.issue}
          </h3>
        </div>
      </div>

      {issue.assessment ? (
        <p className="px-4 py-3 text-[13px] leading-relaxed text-muted">{issue.assessment}</p>
      ) : null}

      {issue.precedents.length > 0 ? (
        <div className="border-t border-line bg-sunken/50 px-4 py-3">
          <p className="eyebrow mb-2 flex items-center gap-1.5">
            <Scale aria-hidden className="size-3" />
            Precedents in the atlas
          </p>
          <ul className="flex flex-col gap-1.5">
            {issue.precedents.map((precedent) => (
              <li key={`${issue.issue}-${precedent.docId}`}>
                <Link
                  href={`/?doc=${encodeURIComponent(precedent.docId)}`}
                  className="group flex items-start gap-2 rounded-md border border-transparent px-2 py-1.5 transition-colors hover:border-line hover:bg-panel"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-medium text-ink">
                      {precedent.title}
                    </span>
                    <span className="citation">{precedent.citation}</span>
                    {precedent.excerpt ? (
                      <span className="mt-0.5 line-clamp-2 block text-[11.5px] leading-relaxed text-muted">
                        {precedent.excerpt}
                      </span>
                    ) : null}
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    className="mt-0.5 size-3.5 shrink-0 text-faint transition-colors group-hover:text-accent"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
