"use client";

import { useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight, Hash, Network } from "lucide-react";
import type { GraphNode } from "@/lib/types";
import type { AtlasDoc, AtlasIndex } from "./lib/atlas-data";
import { resolveWikilink } from "./lib/atlas-data";
import { extractWikilinkTargets } from "./markdown-view";
import { DocRow } from "./doc-row";
import { SectionLabel } from "@/components/ui/primitives";

export function DocContextRail({
  doc,
  index,
  onOpenDoc,
  onSelectTag,
}: {
  doc: AtlasDoc;
  index: AtlasIndex;
  onOpenDoc: (id: string) => void;
  onSelectTag: (tag: string) => void;
}) {
  const { outgoing, incoming, related } = useMemo(() => {
    const self = doc.meta.id;
    const seen = new Set<string>([self]);

    const collect = (ids: Iterable<string>): GraphNode[] => {
      const nodes: GraphNode[] = [];
      for (const id of ids) {
        if (seen.has(id)) continue;
        const node = index.docsById.get(id);
        if (!node) continue;
        seen.add(id);
        nodes.push(node);
      }
      return nodes;
    };

    const linkTargets = extractWikilinkTargets(doc.content)
      .map((target) => resolveWikilink(target, index)?.id)
      .filter((id): id is string => Boolean(id));

    const outgoingNodes = collect([...linkTargets, ...doc.meta.relatedIds]);
    const incomingNodes = collect(index.backlinks.get(self) ?? []);
    const relatedNodes = collect(index.neighbours.get(self) ?? []).sort(
      (a, b) => b.degree - a.degree,
    );

    return { outgoing: outgoingNodes, incoming: incomingNodes, related: relatedNodes };
  }, [doc, index]);

  const tags = doc.meta.tags;

  return (
    <aside
      aria-label="Document links"
      className="flex h-full w-full flex-col overflow-y-auto border-l border-line bg-panel"
    >
      <div className="border-b border-line px-3 py-3">
        <p className="eyebrow">Connections</p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
          {outgoing.length + incoming.length + related.length} authorities linked to this
          document across the atlas.
        </p>
      </div>

      {tags.length > 0 ? (
        <section>
          <SectionLabel>Tags</SectionLabel>
          <div className="flex flex-wrap gap-1.5 px-3 pb-1">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onSelectTag(tag)}
                className="inline-flex items-center gap-1 rounded-full border border-line bg-panel px-2 py-0.5 text-[11px] text-muted transition-colors hover:border-accent-line hover:bg-accent-wash hover:text-ink"
              >
                <Hash aria-hidden className="size-2.5" />
                {tag.replace(/-/g, " ")}
                <span className="text-faint">{index.tagCounts.get(tag) ?? 1}</span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <LinkSection
        title="Cited from this document"
        icon={<ArrowUpRight aria-hidden className="size-3" />}
        nodes={outgoing}
        onOpenDoc={onOpenDoc}
        empty="No outbound links in the text."
      />
      <LinkSection
        title="Backlinks"
        icon={<ArrowDownLeft aria-hidden className="size-3" />}
        nodes={incoming}
        onOpenDoc={onOpenDoc}
        empty="Nothing in the atlas cites this yet."
      />
      <LinkSection
        title="Related precedents"
        icon={<Network aria-hidden className="size-3" />}
        nodes={related}
        onOpenDoc={onOpenDoc}
        empty="No further neighbours in the graph."
      />
      <div className="h-6 shrink-0" />
    </aside>
  );
}

function LinkSection({
  title,
  icon,
  nodes,
  onOpenDoc,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  nodes: GraphNode[];
  onOpenDoc: (id: string) => void;
  empty: string;
}) {
  return (
    <section>
      <SectionLabel
        action={
          <span className="flex items-center gap-1 text-[10px] text-faint">
            {icon}
            {nodes.length}
          </span>
        }
      >
        {title}
      </SectionLabel>
      {nodes.length === 0 ? (
        <p className="px-3 pb-2 text-[11.5px] text-faint">{empty}</p>
      ) : (
        <ul>
          {nodes.map((node) => (
            <li key={node.id}>
              <DocRow node={node} dense onSelect={onOpenDoc} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
