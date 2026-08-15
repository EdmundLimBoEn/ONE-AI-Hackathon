/**
 * Maps graph guide nodes (root / domain / topic shells) to real atlas documents
 * so clicking "Singapore law" or a domain opens readable written-law content.
 */
export const SINGAPORE_LAW_OVERVIEW_ID = "overview-singapore-written-law";

export const DOMAIN_ENTRY_DOC: Record<string, string> = {
  Legislation: SINGAPORE_LAW_OVERVIEW_ID,
  "Criminal justice": "penal-code-1871",
  "Civil law": "civil-law-act-1909",
  "Public law": "constitution-sg",
  "Other law": SINGAPORE_LAW_OVERVIEW_ID,
};

export function entryDocForDomain(domain: string): string {
  return DOMAIN_ENTRY_DOC[domain] ?? SINGAPORE_LAW_OVERVIEW_ID;
}

export function entryDocForGuide(role: string, domain: string, category?: string): string | null {
  if (role === "root") return SINGAPORE_LAW_OVERVIEW_ID;
  if (role === "domain") return entryDocForDomain(domain);
  if (role === "topic" && (category === "Statutes" || domain === "Legislation")) {
    return SINGAPORE_LAW_OVERVIEW_ID;
  }
  return null;
}
