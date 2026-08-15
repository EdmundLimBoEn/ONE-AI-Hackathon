"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Network } from "lucide-react";
import type { SearchResult } from "@/lib/types";
import { loadDoc, loadIndex, type AtlasDoc, type AtlasIndex } from "./lib/atlas-data";
import { categoryOf } from "./lib/categories";
import { SINGAPORE_LAW_OVERVIEW_ID } from "./lib/guide-docs";
import { searchNodes } from "./lib/search";
import { useTheme } from "./lib/use-theme";
import { TopBar } from "./top-bar";
import { LeftRail, type AtlasView } from "./left-rail";
import { GraphView } from "./graph-view";
import { TreeView } from "./tree-view";
import { FoldersView } from "./folders-view";
import { DocReader } from "./doc-reader";
import { DocContextRail } from "./doc-context";
import { ChatDock } from "./chat-dock";
import { EmptyState, Spinner } from "@/components/ui/primitives";
import { cn } from "@/components/ui/cn";

interface InitialState {
  docId: string | null;
  view: AtlasView;
  query: string;
}

function readInitialState(): InitialState {
  if (typeof window === "undefined") {
    return { docId: SINGAPORE_LAW_OVERVIEW_ID, view: "graph", query: "" };
  }
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");
  return {
    docId: params.get("doc") || SINGAPORE_LAW_OVERVIEW_ID,
    view: view === "tree" || view === "folders" ? view : "graph",
    query: params.get("q") ?? "",
  };
}

export function AtlasWorkspace() {
  const { theme, mounted, toggle } = useTheme();

  const [index, setIndex] = useState<AtlasIndex | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);

  const [view, setView] = useState<AtlasView>("graph");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [doc, setDoc] = useState<AtlasDoc | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [categoryFocus, setCategoryFocus] = useState<{ category: string; sequence: number } | null>(null);
  const [railOpen, setRailOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(true);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatContextId, setChatContextId] = useState<string | null>(null);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const initial = readInitialState();
    setView(initial.view);
    setQuery(initial.query);
    setSelectedId(initial.docId);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadIndex()
      .then((loaded) => {
        if (cancelled) return;
        setIndex(loaded);
        setActiveCategories(
          new Set(loaded.graph.nodes.map((node) => categoryOf(node.categoryPath))),
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setIndexError(error instanceof Error ? error.message : "The atlas index failed to load.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!index || !selectedId) {
      setDoc(null);
      setDocError(null);
      return;
    }
    let cancelled = false;
    setDocLoading(true);
    setDocError(null);
    loadDoc(selectedId, index)
      .then((loaded) => {
        if (!cancelled) setDoc(loaded);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setDoc(null);
        setDocError(error instanceof Error ? error.message : "Unknown error");
      })
      .finally(() => {
        if (!cancelled) setDocLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [index, selectedId]);

  // Keep the address bar shareable without opting the route into dynamic rendering.
  useEffect(() => {
    if (!hydrated.current) return;
    const params = new URLSearchParams();
    if (selectedId) params.set("doc", selectedId);
    if (view !== "graph") params.set("view", view);
    if (query) params.set("q", query);
    const search = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${search ? `?${search}` : ""}`,
    );
  }, [query, selectedId, view]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setRailOpen(true);
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (meta && event.key.toLowerCase() === "j") {
        event.preventDefault();
        setChatOpen((open) => !open);
        return;
      }
      if (event.key === "Escape") {
        const target = event.target as HTMLElement | null;
        if (target?.closest("[data-atlas-chat]")) return;
        if (document.activeElement === searchRef.current) return;
        setSelectedId((current) => (current ? null : current));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    if (!index || !query.trim()) return [];
    return searchNodes(index.docsById.values(), query);
  }, [index, query]);

  const matchedIds = useMemo(() => {
    if (!query.trim()) return null;
    return new Set(results.map((result) => result.docId));
  }, [query, results]);

  const openDoc = useCallback((id: string) => {
    setSelectedId(id);
    setRailOpen(false);
  }, []);

  const focusCategory = useCallback((category: string | null) => {
    if (!category) {
      setCategoryFocus(null);
      return;
    }
    setView("graph");
    setSelectedId(null);
    setQuery("");
    setActiveCategories((current) => new Set(current).add(category));
    setCategoryFocus((current) => ({
      category,
      sequence: (current?.sequence ?? 0) + 1,
    }));
    setRailOpen(false);
  }, []);

  const toggleCategoryVisibility = useCallback(
    (category: string) => {
      const hiding = activeCategories.has(category);
      if (hiding && categoryFocus?.category === category) setCategoryFocus(null);
      setActiveCategories((current) => {
        const next = new Set(current);
        if (next.has(category)) next.delete(category);
        else next.add(category);
        // Never leave the canvas empty: an empty selection means "show all".
        if (next.size === 0 && index) {
          return new Set(index.graph.nodes.map((node) => categoryOf(node.categoryPath)));
        }
        return next;
      });
    },
    [activeCategories, categoryFocus?.category, index],
  );

  const resetCategories = useCallback(() => {
    if (!index) return;
    setActiveCategories(new Set(index.graph.nodes.map((node) => categoryOf(node.categoryPath))));
    setCategoryFocus(null);
  }, [index]);

  const askAbout = useCallback((target: AtlasDoc) => {
    setChatContextId(target.meta.id);
    setPendingPrompt(
      `Summarise the holding in ${target.meta.title} (${target.meta.citation}) and how later authorities have treated it.`,
    );
  }, []);

  if (indexError) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <EmptyState
          icon={<Network className="size-7" />}
          title="The atlas could not be loaded"
          hint={indexError}
        />
      </div>
    );
  }

  if (!index) {
    return <WorkspaceSkeleton />;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <TopBar
        source={index.source}
        nodeCount={index.graph.nodes.length}
        theme={theme}
        mounted={mounted}
        onToggleTheme={toggle}
        railOpen={railOpen}
        onToggleRail={() => setRailOpen((open) => !open)}
      />

      <div className="relative flex min-h-0 flex-1">
        {railOpen ? (
          <button
            type="button"
            aria-label="Close the browser panel"
            onClick={() => setRailOpen(false)}
            className="absolute inset-0 z-30 bg-black/40 lg:hidden"
          />
        ) : null}

        <aside
          aria-label="Browse and search"
          className={cn(
            "z-30 w-[17.5rem] shrink-0 border-r border-line",
            "absolute inset-y-0 left-0 transition-transform lg:static lg:translate-x-0",
            railOpen ? "translate-x-0 panel-shadow" : "-translate-x-full",
          )}
        >
          <LeftRail
            index={index}
            view={view}
            onViewChange={(next) => {
              setView(next);
              setRailOpen(false);
            }}
            query={query}
            onQueryChange={setQuery}
            results={results}
            selectedId={selectedId}
            onSelect={openDoc}
            activeCategories={activeCategories}
            focusedCategory={categoryFocus?.category ?? null}
            onFocusCategory={focusCategory}
            onToggleCategoryVisibility={toggleCategoryVisibility}
            onResetCategories={resetCategories}
            searchRef={searchRef}
          />
        </aside>

        <main id="atlas-main" className="relative flex min-w-0 flex-1">
          <div className="min-w-0 flex-1">
            {view === "graph" ? (
              <GraphView
                index={index}
                selectedId={selectedId}
                onSelect={openDoc}
                activeCategories={activeCategories}
                focusRequest={categoryFocus}
                onFocusCategory={focusCategory}
                matchedIds={matchedIds}
                theme={theme}
              />
            ) : view === "tree" ? (
              <TreeView index={index} selectedId={selectedId} onSelect={openDoc} />
            ) : (
              <FoldersView index={index} selectedId={selectedId} onSelect={openDoc} />
            )}
          </div>

          {selectedId ? (
            <div
              className={cn(
                "absolute inset-0 z-20 animate-slide-in border-l border-line bg-panel",
                "lg:static lg:z-auto lg:w-[44%] lg:max-w-[46rem] lg:min-w-[25rem]",
              )}
            >
              <DocReader
                doc={doc}
                loading={docLoading}
                error={docError}
                index={index}
                onOpenDoc={openDoc}
                onClose={() => setSelectedId(null)}
                onAsk={askAbout}
                contextOpen={contextOpen}
                onToggleContext={() => setContextOpen((open) => !open)}
              />
            </div>
          ) : null}

          {selectedId && doc && contextOpen ? (
            <div className="hidden w-[16.5rem] shrink-0 xl:block">
              <DocContextRail
                doc={doc}
                index={index}
                onOpenDoc={openDoc}
                onSelectTag={(tag) => {
                  setQuery(tag);
                  setRailOpen(true);
                }}
              />
            </div>
          ) : null}
        </main>
      </div>

      <div data-atlas-chat>
        <ChatDock
          index={index}
          open={chatOpen}
          onOpenChange={setChatOpen}
          contextDocId={chatContextId ?? selectedId}
          onClearContext={() => setChatContextId(null)}
          onOpenDoc={openDoc}
          pendingPrompt={pendingPrompt}
          onPromptConsumed={() => setPendingPrompt(null)}
        />
      </div>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="flex h-13 shrink-0 items-center gap-2 border-b border-line bg-panel px-3">
        <div className="size-6 animate-pulse rounded-md bg-sunken" />
        <div className="h-4 w-44 animate-pulse rounded bg-sunken" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-[17.5rem] shrink-0 border-r border-line bg-panel p-3 lg:block">
          <div className="h-8 animate-pulse rounded-lg bg-sunken" />
          <div className="mt-2 h-8 animate-pulse rounded-md bg-sunken" />
          <div className="mt-6 space-y-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-6 animate-pulse rounded bg-sunken" style={{ opacity: 1 - i * 0.1 }} />
            ))}
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center bg-panel">
          <p className="flex items-center gap-2 text-sm text-muted">
            <Spinner />
            Building the precedent index…
          </p>
        </div>
      </div>
    </div>
  );
}
