import { z } from "zod";

export const rawDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  citation: z.string().min(1),
  court: z.string().min(1),
  year: z.number().int(),
  sourceUrl: z.string().url(),
  decisionDate: z.string().optional(),
  catchwords: z.array(z.string()).default([]),
  body: z.string().min(1),
  scrapedAt: z.string(),
});

export type RawDocument = z.infer<typeof rawDocumentSchema>;

export const enrichmentSchema = z.object({
  summary: z.string().min(20),
  holdings: z.array(z.string().min(3)).min(1).max(8),
  tags: z.array(z.string().min(2)).min(1).max(15),
  categoryPath: z.array(z.string().min(1)).min(2).max(5),
  relatedIds: z.array(z.string()).max(12).default([]),
});

export type Enrichment = z.infer<typeof enrichmentSchema>;

export interface SeedCase {
  citation: string;
  title: string;
  url: string;
  categoryPath: string[];
  tags: string[];
}

export interface VaultMeta {
  id: string;
  title: string;
  citation: string;
  court: string;
  year: number;
  categoryPath: string[];
  tags: string[];
  summary: string;
  relatedIds: string[];
  sourceUrl?: string;
  kind?: "judgment" | "statute" | "overview";
}
