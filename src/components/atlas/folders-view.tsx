"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, FileText, Folder, ScrollText } from "lucide-react";
import type { TreeNode } from "@/lib/types";
import type { AtlasIndex } from "./lib/atlas-data";
import { categoryColor, categoryOf, courtLabel } from "./lib/categories";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/primitives";

function childrenOf(node: TreeNode): TreeNode[] {
  return node.children ?? [];
}

export function FoldersView({
  index,
  selectedId,
  onSelect,
}: {
  index: AtlasIndex;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [trail, setTrail] = useState<TreeNode[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const columns = useMemo(() => {
    const list: TreeNode[][] = [childrenOf(index.tree)];
    for (const folder of trail) list.push(childrenOf(folder));
    return list;
  }, [index.tree, trail]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      left: scrollRef.current.scrollWidth,
      behavior: "smooth",
    });
  }, [trail.length]);

  const openFolder = (folder: TreeNode, columnIndex: number) => {
    setTrail((current) => [...current.slice(0, columnIndex), folder]);
  };

  const previewId = selectedId;
  const preview = previewId ? index.docsById.get(previewId) : null;

  return (
    <div className="flex h-full flex-col bg-panel">
      <header className="flex items-center gap-1 overflow-x-auto border-b border-line px-4 py-2.5 text-[12px] whitespace-nowrap no-scrollbar">
        <button
          type="button"
          onClick={() => setTrail([])}
          className="rounded px-1.5 py-0.5 font-medium text-muted transition-colors hover:bg-sunken hover:text-ink"
        >
          {index.tree.name}
        </button>
        {trail.map((folder, i) => (
          <span key={folder.id} className="flex items-center gap-1">
            <ChevronRight aria-hidden className="size-3 text-faint" />
            <button
              type="button"
              onClick={() => setTrail((current) => current.slice(0, i + 1))}
              className={cn(
                "rounded px-1.5 py-0.5 transition-colors hover:bg-sunken hover:text-ink",
                i === trail.length - 1 ? "font-semibold text-ink" : "text-muted",
              )}
            >
              {folder.name}
            </button>
          </span>
        ))}
      </header>

      <div ref={scrollRef} className="flex min-h-0 flex-1 overflow-x-auto">
        {columns.map((items, columnIndex) => (
          <div
            key={columnIndex}
            className="flex h-full w-[15rem] shrink-0 flex-col border-r border-line last:border-r-0 sm:w-[17rem]"
          >
            <div className="flex items-center justify-between px-3 py-2">
              <span className="eyebrow">
                {columnIndex === 0 ? "Areas of law" : trail[columnIndex - 1]?.name}
              </span>
              <span className="text-[10px] tabular-nums text-faint">{items.length}</span>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto pb-3">
              {items.map((item) => {
                const isFolder = item.type === "folder";
                const docId = item.docId ?? item.id;
                const doc = isFolder ? null : index.docsById.get(docId);
                const isActive = isFolder
                  ? trail[columnIndex]?.id === item.id
                  : selectedId === docId;

                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() =>
                        isFolder ? openFolder(item, columnIndex) : onSelect(docId)
                      }
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors",
                        isActive ? "bg-accent-wash text-ink" : "text-ink/85 hover:bg-sunken",
                      )}
                    >
                      {isFolder ? (
                        <Folder aria-hidden className="size-4 shrink-0 text-faint" />
                      ) : doc?.kind === "statute" ? (
                        <ScrollText aria-hidden className="size-4 shrink-0 text-faint" />
                      ) : (
                        <FileText aria-hidden className="size-4 shrink-0 text-faint" />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-[12.5px] leading-snug">
                          {doc?.title ?? item.name}
                        </span>
                        {doc ? <span className="citation">{doc.citation}</span> : null}
                      </span>
                      {isFolder ? (
                        <ChevronRight aria-hidden className="size-3.5 shrink-0 text-faint" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
              {items.length === 0 ? (
                <li className="px-3 py-2 text-[11.5px] text-faint">Empty folder</li>
              ) : null}
            </ul>
          </div>
        ))}

        <div className="hidden min-w-[17rem] flex-1 border-l border-line bg-sunken/40 lg:block">
          {preview ? (
            <div className="p-5">
              <div className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ background: categoryColor(categoryOf(preview.categoryPath)) }}
                />
                <span className="eyebrow">{preview.categoryPath.join(" › ")}</span>
              </div>
              <h3 className="rule-heading mt-2 text-base leading-snug font-semibold text-ink">
                {preview.title}
              </h3>
              <p className="citation mt-1">
                {preview.citation} · {courtLabel(preview.court)} · {preview.year}
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-muted">{preview.summary}</p>
              <button
                type="button"
                onClick={() => onSelect(preview.id)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-ink transition-opacity hover:opacity-90"
              >
                Open in reader
              </button>
            </div>
          ) : (
            <EmptyState
              icon={<Folder className="size-6" />}
              title="Browse by folder"
              hint="Drill through the doctrinal hierarchy the way you would in a case file. Select a document to preview it here."
            />
          )}
        </div>
      </div>
    </div>
  );
}
