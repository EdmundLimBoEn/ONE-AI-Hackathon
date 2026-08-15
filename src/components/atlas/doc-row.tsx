"use client";

import type { GraphNode } from "@/lib/types";
import { categoryColor, categoryOf, courtLabel } from "./lib/categories";
import { cn } from "@/components/ui/cn";

export function DocRow({
  node,
  active,
  excerpt,
  dense,
  onSelect,
}: {
  node: GraphNode;
  active?: boolean;
  excerpt?: string;
  dense?: boolean;
  onSelect: (id: string) => void;
}) {
  const category = categoryOf(node.categoryPath);
  return (
    <button
      type="button"
      onClick={() => onSelect(node.id)}
      aria-current={active ? "true" : undefined}
      className={cn(
        "group relative flex w-full flex-col gap-0.5 border-l-2 py-1.5 pr-2 pl-2.5 text-left transition-colors",
        active
          ? "border-l-accent bg-accent-wash"
          : "border-l-transparent hover:border-l-line-strong hover:bg-sunken",
      )}
    >
      <span className="flex items-start gap-1.5">
        <span
          aria-hidden
          className="mt-1.5 size-1.5 shrink-0 rounded-full"
          style={{ background: categoryColor(category) }}
        />
        <span
          className={cn(
            "line-clamp-2 text-[13px] leading-snug",
            active ? "font-semibold text-ink" : "font-medium text-ink/90",
          )}
        >
          {node.title}
        </span>
      </span>
      <span className="citation pl-3">
        {node.citation || courtLabel(node.court)}
        {node.year ? ` · ${node.year}` : ""}
      </span>
      {excerpt && !dense ? (
        <span className="line-clamp-2 pl-3 text-[11.5px] leading-relaxed text-muted">
          {excerpt}
        </span>
      ) : null}
    </button>
  );
}
