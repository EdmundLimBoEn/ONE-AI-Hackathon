"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  FileText,
  Folder,
  FolderOpen,
  ListCollapse,
  ScrollText,
} from "lucide-react";
import type { TreeNode } from "@/lib/types";
import type { AtlasIndex } from "./lib/atlas-data";
import { categoryColor, courtLabel } from "./lib/categories";
import { cn } from "@/components/ui/cn";

interface FlatRow {
  node: TreeNode;
  level: number;
  parentId: string | null;
  childCount: number;
  docCount: number;
}

function countDocs(node: TreeNode): number {
  if (node.type === "document") return 1;
  return (node.children ?? []).reduce((sum, child) => sum + countDocs(child), 0);
}

function flatten(root: TreeNode, expanded: Set<string>): FlatRow[] {
  const rows: FlatRow[] = [];
  const walk = (node: TreeNode, level: number, parentId: string | null) => {
    rows.push({
      node,
      level,
      parentId,
      childCount: node.children?.length ?? 0,
      docCount: countDocs(node),
    });
    if (node.type === "folder" && expanded.has(node.id)) {
      for (const child of node.children ?? []) walk(child, level + 1, node.id);
    }
  };
  for (const child of root.children ?? []) walk(child, 0, null);
  return rows;
}

function defaultExpanded(root: TreeNode, depth = 1): Set<string> {
  const expanded = new Set<string>();
  const walk = (node: TreeNode, level: number) => {
    if (node.type !== "folder") return;
    if (level < depth) expanded.add(node.id);
    for (const child of node.children ?? []) walk(child, level + 1);
  };
  for (const child of root.children ?? []) walk(child, 0);
  return expanded;
}

export function TreeView({
  index,
  selectedId,
  onSelect,
}: {
  index: AtlasIndex;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => defaultExpanded(index.tree));
  const [activeId, setActiveId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => flatten(index.tree, expanded), [expanded, index.tree]);

  // Reveal the open document wherever it lives in the hierarchy.
  useEffect(() => {
    if (!selectedId) return;
    setExpanded((current) => {
      const next = new Set(current);
      const walk = (node: TreeNode, trail: string[]): boolean => {
        if (node.docId === selectedId || node.id === selectedId) {
          for (const id of trail) next.add(id);
          return true;
        }
        return (node.children ?? []).some((child) => walk(child, [...trail, node.id]));
      };
      walk(index.tree, []);
      return next.size === current.size ? current : next;
    });
  }, [index.tree, selectedId]);

  const toggle = useCallback((id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const focusRow = useCallback((id: string) => {
    setActiveId(id);
    const element = listRef.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(id)}"]`);
    element?.focus();
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = rows.findIndex((row) => row.node.id === activeId);
      const row = rows[currentIndex];
      const move = (delta: number) => {
        event.preventDefault();
        const nextIndex = Math.min(rows.length - 1, Math.max(0, currentIndex + delta));
        if (rows[nextIndex]) focusRow(rows[nextIndex].node.id);
      };

      switch (event.key) {
        case "ArrowDown":
          move(currentIndex < 0 ? 0 : 1);
          break;
        case "ArrowUp":
          move(currentIndex < 0 ? 0 : -1);
          break;
        case "Home":
          event.preventDefault();
          if (rows[0]) focusRow(rows[0].node.id);
          break;
        case "End":
          event.preventDefault();
          if (rows.length) focusRow(rows[rows.length - 1].node.id);
          break;
        case "ArrowRight":
          if (!row) break;
          event.preventDefault();
          if (row.node.type === "folder" && !expanded.has(row.node.id)) toggle(row.node.id);
          else move(1);
          break;
        case "ArrowLeft":
          if (!row) break;
          event.preventDefault();
          if (row.node.type === "folder" && expanded.has(row.node.id)) toggle(row.node.id);
          else if (row.parentId) focusRow(row.parentId);
          break;
        default:
          break;
      }
    },
    [activeId, expanded, focusRow, rows, toggle],
  );

  const allFolderIds = useMemo(() => {
    const ids: string[] = [];
    const walk = (node: TreeNode) => {
      if (node.type !== "folder") return;
      if (node.id !== index.tree.id) ids.push(node.id);
      node.children?.forEach(walk);
    };
    walk(index.tree);
    return ids;
  }, [index.tree]);

  const allExpanded = expanded.size >= allFolderIds.length;

  return (
    <div className="flex h-full flex-col bg-panel">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <div>
          <h2 className="rule-heading text-sm font-semibold text-ink">Doctrinal outline</h2>
          <p className="text-[11px] text-faint">
            {index.graph.nodes.length} authorities across {allFolderIds.length} headings
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(allExpanded ? new Set() : new Set(allFolderIds))}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-sunken hover:text-ink"
        >
          <ListCollapse aria-hidden className="size-3.5" />
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>
      </header>

      <div
        ref={listRef}
        role="tree"
        aria-label="Doctrinal outline"
        onKeyDown={onKeyDown}
        className="min-h-0 flex-1 overflow-auto py-2"
      >
        {rows.map((row, position) => {
          const isFolder = row.node.type === "folder";
          const isOpen = expanded.has(row.node.id);
          const docId = row.node.docId ?? row.node.id;
          const doc = isFolder ? null : index.docsById.get(docId);
          const isSelected = !isFolder && docId === selectedId;
          const tabbable = activeId ? row.node.id === activeId : position === 0;

          return (
            <div
              key={`${row.node.id}-${row.level}`}
              role="treeitem"
              data-row-id={row.node.id}
              aria-level={row.level + 1}
              aria-expanded={isFolder ? isOpen : undefined}
              aria-selected={isSelected}
              tabIndex={tabbable ? 0 : -1}
              onFocus={() => setActiveId(row.node.id)}
              onClick={() => {
                if (isFolder) toggle(row.node.id);
                else onSelect(docId);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (isFolder) toggle(row.node.id);
                  else onSelect(docId);
                }
              }}
              className={cn(
                "group flex cursor-pointer items-center gap-2 border-l-2 py-1 pr-4 text-left transition-colors",
                isSelected
                  ? "border-l-accent bg-accent-wash"
                  : "border-l-transparent hover:bg-sunken",
              )}
              style={{ paddingLeft: `${row.level * 18 + 12}px` }}
            >
              {isFolder ? (
                <>
                  <ChevronRight
                    aria-hidden
                    className={cn(
                      "size-3.5 shrink-0 text-faint transition-transform",
                      isOpen && "rotate-90",
                    )}
                  />
                  {isOpen ? (
                    <FolderOpen aria-hidden className="size-4 shrink-0 text-faint" />
                  ) : (
                    <Folder aria-hidden className="size-4 shrink-0 text-faint" />
                  )}
                  <span
                    className={cn(
                      "truncate text-[13px]",
                      row.level === 0 ? "font-semibold text-ink" : "font-medium text-ink/85",
                    )}
                  >
                    {row.node.name}
                  </span>
                  <span className="ml-auto shrink-0 text-[10px] tabular-nums text-faint">
                    {row.docCount}
                  </span>
                </>
              ) : (
                <>
                  <span className="w-3.5 shrink-0" />
                  {doc?.kind === "statute" ? (
                    <ScrollText aria-hidden className="size-4 shrink-0 text-faint" />
                  ) : (
                    <FileText aria-hidden className="size-4 shrink-0 text-faint" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink/90">
                    {doc?.title ?? row.node.name}
                  </span>
                  {doc ? (
                    <>
                      <span className="citation hidden shrink-0 sm:inline">{doc.citation}</span>
                      <span className="hidden shrink-0 items-center gap-1 text-[10px] text-faint md:flex">
                        <span
                          aria-hidden
                          className="size-1.5 rounded-full"
                          style={{
                            background: categoryColor(doc.categoryPath[0] ?? "Uncategorised"),
                          }}
                        />
                        {courtLabel(doc.court)}
                      </span>
                    </>
                  ) : null}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
