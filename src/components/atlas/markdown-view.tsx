"use client";

import { useMemo } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink, Link2Off } from "lucide-react";
import type { AtlasIndex } from "./lib/atlas-data";
import { resolveWikilink } from "./lib/atlas-data";
import { categoryColor, categoryOf } from "./lib/categories";

const WIKILINK = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
const SCHEME = "wikilink:";

/** Rewrites `[[id|Label]]` into links the markdown pipeline can carry through. */
function encodeWikilinks(markdown: string): string {
  return markdown.replace(WIKILINK, (_match, target: string, label?: string) => {
    const text = (label ?? target).trim();
    return `[${text}](${SCHEME}${encodeURIComponent(target.trim())})`;
  });
}

export function MarkdownView({
  content,
  index,
  onOpenDoc,
}: {
  content: string;
  index: AtlasIndex;
  onOpenDoc: (id: string) => void;
}) {
  const source = useMemo(() => encodeWikilinks(content), [content]);

  const components = useMemo<Components>(
    () => ({
      a({ href, children, ...rest }) {
        if (typeof href === "string" && href.startsWith(SCHEME)) {
          const target = decodeURIComponent(href.slice(SCHEME.length));
          const node = resolveWikilink(target, index);
          if (!node) {
            return (
              <span
                className="inline-flex items-baseline gap-1 text-faint decoration-dashed underline underline-offset-3"
                title={`"${target}" is not in the atlas yet`}
              >
                {children}
                <Link2Off aria-hidden className="size-3 translate-y-0.5" />
                <span className="sr-only">(unresolved link)</span>
              </span>
            );
          }
          const colour = categoryColor(categoryOf(node.categoryPath));
          return (
            <button
              type="button"
              onClick={() => onOpenDoc(node.id)}
              title={`${node.title} — ${node.citation}`}
              className="mx-px inline items-baseline rounded-sm px-0.5 text-left font-medium text-accent decoration-1 underline-offset-3 hover:underline"
              style={{ boxShadow: `inset 0 -0.35em 0 -0.05em ${colour}1f` }}
            >
              {children}
            </button>
          );
        }

        return (
          <a
            {...rest}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-baseline gap-1"
          >
            {children}
            <ExternalLink aria-hidden className="size-3 translate-y-0.5" />
          </a>
        );
      },
    }),
    [index, onOpenDoc],
  );

  return (
    <div className="prose-legal">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}

/** Wikilink targets found in a document body, used to derive live backlinks. */
export function extractWikilinkTargets(content: string): string[] {
  const targets: string[] = [];
  for (const match of content.matchAll(WIKILINK)) {
    const target = match[1]?.trim();
    if (target) targets.push(target);
  }
  return targets;
}
