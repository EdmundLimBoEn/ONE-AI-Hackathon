import * as cheerio from "cheerio";
import type { RawDocument } from "./types";

const BASE_URL = "https://www.elitigation.sg";

export interface ListingItem {
  url: string;
  citation: string;
  title: string;
}

const clean = (value: string) => value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

export function citationParts(citation: string): { year: number; court: string } {
  const match = citation.match(/\[(\d{4})\]\s+([A-Z][A-Z()]+)\s+\d+/i);
  return { year: match ? Number(match[1]) : 0, court: match?.[2].replace(/[()]/g, "") ?? "SG" };
}

export function idFromUrl(url: string, citation = ""): string {
  const slug = new URL(url, BASE_URL).pathname.split("/").filter(Boolean).at(-1);
  if (slug) return slug.replace(/[^A-Za-z0-9_-]/g, "_");
  return citation.replace(/[\[\]\s()]/g, "_").replace(/_+/g, "_");
}

export function parseListingHtml(html: string, baseUrl = BASE_URL): ListingItem[] {
  const $ = cheerio.load(html);
  const found = new Map<string, ListingItem>();
  $("a[href*='/gd/s/'], a[href*='/GD/s/']").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    const container = $(element).closest(".row, .card, article, li, tr");
    const text = clean(container.text() || $(element).text());
    const citation = text.match(/\[\d{4}\]\s+SG[A-Z()]+\s+\d+/)?.[0]
      ?? $(element).attr("title")?.match(/\[\d{4}\]\s+SG[A-Z()]+\s+\d+/)?.[0]
      ?? "";
    const title = clean(
      container.find(".case-title, .caseTitle, .gd-title, h3, h4").first().text()
      || $(element).text()
      || citation,
    );
    const url = new URL(href, baseUrl).toString();
    found.set(url, { url, citation, title });
  });
  return [...found.values()];
}

export function parseJudgmentHtml(html: string, sourceUrl: string): RawDocument {
  const $ = cheerio.load(html);
  $("script, style, noscript, .no-print, .modal, svg").remove();
  const citation = clean(
    $(".HN-NeutralCit").first().text()
    || $(".HN-CaseName").filter((_, el) => /\[\d{4}\]/.test($(el).text())).first().text()
    || $("title").text(),
  ).match(/\[\d{4}\]\s+SG[A-Z()]+\s+\d+/)?.[0];
  if (!citation) throw new Error(`Could not find a neutral citation in ${sourceUrl}`);
  const { court, year } = citationParts(citation);
  const title = clean(
    $(".HN-CaseName").filter((_, el) => !/\[\d{4}\]/.test($(el).text())).first().text()
    || $("h1").first().text()
    || citation,
  );
  const content = $("content").first();
  const bodyRoot = content.length ? content : $("#judgment, .judgment-content, main, body").first();
  const paragraphs: string[] = [];
  bodyRoot.find("[class*='Judg-'], .txt-body, p").each((_, el) => {
    const text = clean($(el).text());
    if (text && !paragraphs.includes(text)) paragraphs.push(text);
  });
  const body = paragraphs.join("\n\n") || clean(bodyRoot.text());
  if (body.length < 100) throw new Error(`Judgment body was unexpectedly short in ${sourceUrl}`);
  const dateText = clean($(".Judg-Date-Reserved, .decision-date, time").first().text());
  const catchwords = $(".catchwords, .Catchwords").map((_, el) => clean($(el).text().replace(/^\[|\]$/g, ""))).get().filter(Boolean);
  return {
    id: idFromUrl(sourceUrl, citation),
    title,
    citation,
    court,
    year,
    sourceUrl,
    decisionDate: dateText || undefined,
    catchwords,
    body,
    scrapedAt: new Date().toISOString(),
  };
}
