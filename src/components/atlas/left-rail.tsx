"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Eye,
  EyeOff,
  FolderTree,
  ListTree,
  Search,
  Share2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { SearchResult } from "@/lib/types";
import type { AtlasIndex } from "./lib/atlas-data";
import { categoryColor, categoryOf, courtLabel } from "./lib/categories";
import { DocRow } from "./doc-row";
import { EmptyState, Kbd, SectionLabel } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";

export type AtlasView = "graph" | "tree" | "folders";

const VIEWS: { id: AtlasView; label: string; icon: typeof Share2; hint: string }[] = [
  { id: "graph", label: "Graph", icon: Share2, hint: "Force-directed precedent map" },
  { id: "tree", label: "Tree", icon: ListTree, hint: "Collapsible doctrinal outline" },
  { id: "folders", label: "Folders", icon: FolderTree, hint: "Classic folder columns" },
];

export function LeftRail({
  index,
  view,
  onViewChange,
  query,
  onQueryChange,
  results,
  selectedId,
  onSelect,
  activeCategories,
  focusedCategory,
  onFocusCategory,
  onToggleCategoryVisibility,
  onResetCategories,
  searchRef,
}: {
  index: AtlasIndex;
  view: AtlasView;
  onViewChange: (view: AtlasView) => void;
  query: string;
  onQueryChange: (query: string) => void;
  results: SearchResult[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  activeCategories: Set<string>;
  focusedCategory: string | null;
  onFocusCategory: (category: string) => void;
  onToggleCategoryVisibility: (category: string) => void;
  onResetCategories: () => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of index.graph.nodes) {
      const category = categoryOf(node.categoryPath);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [index]);

  const hubs = useMemo(
    () =>
      [...index.graph.nodes]
        .filter((node) => activeCategories.has(categoryOf(node.categoryPath)))
        .sort((a, b) => b.degree - a.degree || a.year - b.year)
        .slice(0, 8),
    [activeCategories, index.graph.nodes],
  );

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [query]);

  const allActive = activeCategories.size === categories.length;
  const resetDisabled = allActive && !focusedCategory;

  return (
    <div className="flex h-full min-h-0 flex-col bg-panel">
      <div className="border-b border-line p-2">
        <div
          role="tablist"
          aria-label="Atlas view"
          className="grid grid-cols-3 gap-0.5 rounded-lg bg-sunken p-0.5"
        >
          {VIEWS.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                role="tab"
                type="button"
                aria-selected={active}
                title={item.hint}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium transition-colors",
                  active
                    ? "bg-raised text-ink shadow-xs"
                    : "text-muted hover:text-ink",
                )}
              >
                <Icon aria-hidden className="size-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="relative mt-2">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search authorities, tags, citations"
            aria-label="Search the atlas"
            className="w-full rounded-md border border-line bg-surface py-1.5 pr-16 pl-8 text-[13px] text-ink placeholder:text-faint focus:border-accent-line"
          />
          {query ? (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-faint hover:text-ink"
            >
              <X aria-hidden className="size-3.5" />
              <span className="sr-only">Clear search</span>
            </button>
          ) : (
            <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2">
              <Kbd>⌘K</Kbd>
            </span>
          )}
        </div>
      </div>

      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
        {query ? (
          <section aria-label="Search results">
            <SectionLabel
              action={<span className="text-[10px] text-faint">{results.length}</span>}
            >
              Results
            </SectionLabel>
            {results.length === 0 ? (
              <EmptyState
                title="No authorities match"
                hint="Try a doctrine (negligence), a court (SGCA), a year, or part of a citation."
              />
            ) : (
              <ul>
                {results.map((result) => {
                  const node = index.docsById.get(result.docId);
                  if (!node) return null;
                  return (
                    <li key={result.docId}>
                      <DocRow
                        node={node}
                        excerpt={result.excerpt}
                        active={selectedId === result.docId}
                        onSelect={onSelect}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : (
          <>
            <section aria-label="Filter by area of law">
              <SectionLabel
                action={
                  <button
                    type="button"
                    onClick={onResetCategories}
                    disabled={resetDisabled}
                    className="inline-flex items-center gap-1 text-[10px] text-faint transition-colors hover:text-ink disabled:opacity-40"
                  >
                    <SlidersHorizontal aria-hidden className="size-3" />
                    Reset
                  </button>
                }
              >
                Areas of law
              </SectionLabel>
              <div className="flex flex-col gap-0.5 px-2 pb-1">
                {categories.map(([category, count]) => {
                  const visible = activeCategories.has(category);
                  const focused = focusedCategory === category;
                  return (
                    <div
                      key={category}
                      className={cn(
                        "group flex items-center rounded-md transition-colors hover:bg-sunken focus-within:bg-sunken",
                        focused && visible && "bg-sunken ring-1 ring-inset ring-line-strong",
                      )}
                    >
                      <button
                        type="button"
                        aria-pressed={focused}
                        onClick={() => onFocusCategory(category)}
                        className={cn(
                          "flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left text-[12.5px] transition-colors",
                          visible ? "text-ink" : "text-faint line-through",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "size-2.5 shrink-0 rounded-full transition-transform",
                            focused && visible && "scale-125",
                          )}
                          style={{
                            background: categoryColor(category),
                            opacity: visible ? 1 : 0.3,
                            boxShadow: focused && visible ? `0 0 0 3px ${categoryColor(category)}22` : undefined,
                          }}
                        />
                        <span className="min-w-0 flex-1 truncate">{category}</span>
                        <span className="text-[10px] tabular-nums text-faint">{count}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleCategoryVisibility(category)}
                        aria-label={`${visible ? "Hide" : "Show"} ${category}`}
                        title={`${visible ? "Hide" : "Show"} ${category}`}
                        className={cn(
                          "mr-1 inline-flex size-6 shrink-0 items-center justify-center rounded text-faint transition-all hover:bg-raised hover:text-ink focus-visible:opacity-100",
                          visible
                            ? "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
                            : "opacity-100 text-muted",
                        )}
                      >
                        {visible ? <EyeOff aria-hidden className="size-3.5" /> : <Eye aria-hidden className="size-3.5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            <section aria-label="Most connected authorities">
              <SectionLabel>Key authorities</SectionLabel>
              <ul>
                {hubs.map((node) => (
                  <li key={node.id}>
                    <DocRow
                      node={node}
                      dense
                      active={selectedId === node.id}
                      onSelect={onSelect}
                    />
                  </li>
                ))}
              </ul>
            </section>

            <section aria-label="Courts in the corpus" className="pb-4">
              <SectionLabel>Courts</SectionLabel>
              <div className="flex flex-wrap gap-1.5 px-3">
                {courtSummary(index).map(([court, count]) => (
                  <span
                    key={court}
                    className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-[11px] text-muted"
                  >
                    {courtLabel(court)}
                    <span className="text-faint">{count}</span>
                  </span>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function courtSummary(index: AtlasIndex): [string, number][] {
  const counts = new Map<string, number>();
  for (const node of index.graph.nodes) {
    const court = String(node.court);
    counts.set(court, (counts.get(court) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
