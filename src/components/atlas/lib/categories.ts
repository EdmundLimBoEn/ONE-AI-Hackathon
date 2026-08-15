import type { Court } from "@/lib/types";

const CATEGORY_VARS: Record<string, string> = {
  "civil liability": "--cat-civil",
  tort: "--cat-civil",
  "criminal law": "--cat-criminal",
  criminal: "--cat-criminal",
  "commercial law": "--cat-commercial",
  contract: "--cat-commercial",
  "contract law": "--cat-commercial",
  "family law": "--cat-family",
  family: "--cat-family",
  "property law": "--cat-property",
  "land law": "--cat-property",
  property: "--cat-property",
  "employment law": "--cat-employment",
  employment: "--cat-employment",
  "constitutional & administrative law": "--cat-constitutional",
  "constitutional law": "--cat-constitutional",
  "administrative law": "--cat-constitutional",
  "civil procedure": "--cat-procedure",
  "intellectual property": "--cat-intellectual",
  statutes: "--cat-statute",
  legislation: "--cat-statute",
};

const FALLBACK_VARS = [
  "--cat-commercial",
  "--cat-property",
  "--cat-family",
  "--cat-employment",
  "--cat-constitutional",
  "--cat-procedure",
  "--cat-intellectual",
  "--cat-criminal",
];

export function categoryOf(categoryPath: string[] | undefined): string {
  return categoryPath?.[0]?.trim() || "Uncategorised";
}

/** Stable CSS custom property for a top-level category, hashed when unknown. */
export function categoryVar(category: string): string {
  const known = CATEGORY_VARS[category.toLowerCase()];
  if (known) return known;
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  }
  return FALLBACK_VARS[hash % FALLBACK_VARS.length];
}

export function categoryColor(category: string): string {
  return `var(${categoryVar(category)}, var(--cat-default))`;
}

/**
 * Canvas rendering cannot resolve CSS variables, so the graph reads the
 * computed values once per theme change and passes plain colours to the canvas.
 */
export function resolveCategoryColor(
  category: string,
  styles: CSSStyleDeclaration,
): string {
  const value = styles.getPropertyValue(categoryVar(category)).trim();
  return value || styles.getPropertyValue("--cat-default").trim() || "#77808f";
}

export const COURT_LABELS: Record<string, string> = {
  SGCA: "Court of Appeal",
  "SGCA(I)": "Court of Appeal (Intl)",
  SGHC: "High Court",
  "SGHC(A)": "Appellate Division",
  "SGHC(I)": "Singapore Intl Commercial Court",
  SGDC: "District Court",
  SGMC: "Magistrates' Court",
  SGC: "Singapore Courts",
  Parliament: "Parliament of Singapore",
};

export function courtLabel(court: Court): string {
  return COURT_LABELS[court] ?? String(court);
}

/** Apex courts get heavier visual weight in lists and on the canvas. */
export function courtRank(court: Court): number {
  const key = String(court);
  if (key.startsWith("SGCA")) return 3;
  if (key.startsWith("SGHC")) return 2;
  if (key === "Parliament") return 3;
  return 1;
}
