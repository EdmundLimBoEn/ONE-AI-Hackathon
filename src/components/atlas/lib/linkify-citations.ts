import type { AtlasIndex } from "./atlas-data";
import { resolveWikilink } from "./atlas-data";

const PROTECT = "\uE000";
const PROTECT_END = "\uE001";

/**
 * Rewrites model citation forms into atlas wikilinks so MarkdownView can open
 * the paper on click — including mid-answer cites, not only footer chips.
 *
 * Handles:
 * - already-valid `[[id|label]]` (left intact)
 * - `[Title [2007] SGCA 37]` (model "Citation label" form)
 * - bare neutral cites `[2007] SGCA 37` / `[2020] SGCA(I) 02`
 * - unique document titles from the index
 */
export function linkifyAtlasCitations(markdown: string, index: AtlasIndex): string {
  if (!markdown.trim() || index.docsById.size === 0) return markdown;

  const vault: string[] = [];
  const stash = (value: string) => {
    const token = `${PROTECT}${vault.length}${PROTECT_END}`;
    vault.push(value);
    return token;
  };

  let text = markdown
    // Existing wikilinks
    .replace(/\[\[[^\]]+\]\]/g, (match) => stash(match))
    // Markdown links
    .replace(/\[[^\]]*\]\([^)]+\)/g, (match) => stash(match))
    // Inline / fenced code
    .replace(/```[\s\S]*?```/g, (match) => stash(match))
    .replace(/`[^`\n]+`/g, (match) => stash(match));

  // [Title … [YYYY] COURT N] — the Citation label form from the prompt.
  text = text.replace(
    /\[([^[\]]+?)\s+(\[\d{4}\]\s+SG[A-Z()]+\s+\d+)\]/g,
    (full, title: string, citation: string) => {
      const node =
        resolveWikilink(citation, index) ??
        resolveWikilink(title.trim(), index) ??
        resolveWikilink(full.slice(1, -1), index);
      if (!node) return full;
      const label = `${compactTitle(title.trim(), node.title)} ${citation}`;
      return stash(`[[${node.id}|${label}]]`);
    },
  );

  // Bare neutral citations still outside wikilinks.
  text = text.replace(/\[\d{4}\]\s+SG[A-Z()]+\s+\d+/g, (citation) => {
    const node = resolveWikilink(citation, index);
    if (!node) return citation;
    return stash(`[[${node.id}|${citation}]]`);
  });

  // Unique full titles (longest first) so partial overlaps prefer the longer case name.
  const titles = [...index.docsById.values()]
    .filter((node) => node.title.trim().length >= 16)
    .sort((a, b) => b.title.length - a.title.length);

  for (const node of titles) {
    const title = node.title.trim();
    const escaped = escapeRegExp(title);
    if (!escaped) continue;
    let cursor = 0;
    let next = "";
    while (cursor < text.length) {
      const found = text.indexOf(title, cursor);
      if (found === -1) {
        next += text.slice(cursor);
        break;
      }
      next += text.slice(cursor, found);
      // Skip if this occurrence already sits inside a protection token or a wikilink.
      const before = text.slice(Math.max(0, found - 2), found);
      if (before.includes(PROTECT) || before.endsWith("[[") || before.endsWith("|")) {
        next += title;
      } else {
        next += stash(`[[${node.id}|${title}]]`);
      }
      cursor = found + title.length;
    }
    text = next || text;
  }

  return text.replace(new RegExp(`${PROTECT}(\\d+)${PROTECT_END}`, "g"), (_m, indexToken: string) => {
    return vault[Number(indexToken)] ?? "";
  });
}

function compactTitle(raw: string, fallback: string): string {
  const cleaned = raw.replace(/\s+/g, " ").trim() || fallback;
  if (cleaned.length <= 42) return cleaned;
  const party = cleaned.match(/^(.+?)\s+v(?:ersus)?\s+/i);
  if (party?.[1] && party[1].length >= 4 && party[1].length <= 36) return party[1].trim();
  return `${cleaned.slice(0, 40).trim()}…`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Pull atlas docs referenced by wikilinks or neutral citations in the answer body. */
export function extractCitedDocIds(markdown: string, index: AtlasIndex): string[] {
  const ids = new Set<string>();
  for (const match of markdown.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)) {
    const node = resolveWikilink(match[1]?.trim() ?? "", index);
    if (node) ids.add(node.id);
  }
  for (const match of markdown.matchAll(/\[\d{4}\]\s+SG[A-Z()]+\s+\d+/g)) {
    const node = resolveWikilink(match[0], index);
    if (node) ids.add(node.id);
  }
  return [...ids];
}
