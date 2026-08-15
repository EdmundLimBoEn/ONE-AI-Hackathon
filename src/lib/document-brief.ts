import type { DocMeta } from "@/lib/types";

export interface StatuteProvision {
  statute: string;
  sections: string[];
  note?: string;
}

export interface DocumentBrief {
  summary: string;
  laws: StatuteProvision[];
  quickSummary: string;
}

function haystack(meta: Pick<DocMeta, "title" | "tags" | "categoryPath" | "summary" | "citation">): string {
  return `${meta.title} ${meta.citation} ${meta.summary} ${meta.tags.join(" ")} ${meta.categoryPath.join(" ")}`.toLowerCase();
}

/** Map common Singapore legal topics to real primary legislation and sections. */
export function relevantLawsFor(
  meta: Pick<DocMeta, "title" | "tags" | "categoryPath" | "summary" | "citation" | "kind">,
): StatuteProvision[] {
  if (meta.kind === "statute") {
    return statuteSelfProvisions(meta);
  }

  const text = haystack(meta);
  const laws: StatuteProvision[] = [];
  const push = (statute: string, sections: string[], note?: string) => {
    if (laws.some((item) => item.statute === statute)) return;
    laws.push({ statute, sections, note });
  };

  if (/negligen|duty of care|personal injur|occupier|product liability|tort|medical|psychiatric|vicarious|non-delegable|slip|scaffold|worksafety|workplace safety/.test(text)) {
    push(
      "Civil Law Act 1909",
      [
        "s 3 (apportionment for contributory negligence)",
        "s 12 (survival of causes of action)",
        "ss 20–21 (dependency claims)",
      ],
      "Core civil liability statute for negligence quantum and shared fault.",
    );
  }

  if (/medical|informed consent|hospital|doctor|genetic|assisted reproduction/.test(text)) {
    push(
      "Civil Law Act 1909",
      [
        "s 3 (contributory negligence)",
        "ss 20–21 (dependency claims — quantum framework by analogy)",
      ],
    );
  }

  if (
    /\b(implied terms?|parol evidence|penalty clause|liquidated damages|contractual interpretation|extrinsic evidence|unilateral mistake|algorithmic trading)\b/.test(
      text,
    ) ||
    (/\bcontracts?\b/.test(text) &&
      /\b(breach|termination|interpretation|commercial|remedies|terms?)\b/.test(text))
  ) {
    push(
      "Evidence Act 1893",
      [
        "s 94 (exclusion of oral evidence to contradict written terms)",
        "ss 95–100 (extrinsic evidence and interpretation aids)",
      ],
      "Statutory backdrop to Singapore’s contextual approach to contracts.",
    );
    push("Civil Law Act 1909", ["s 4 (contracts and mercantile law reception)"]);
  }

  if (/criminal|sentenc|murder|rape|hurt|cheating|traffick|drug|wilful blindness|penal|capital|rash|negligent driving|casino/.test(text)) {
    push(
      "Penal Code 1871",
      [
        "s 26C–26E (knowledge, rashness, negligence as fault elements)",
        "ss 299–304 (homicide spectrum)",
        "s 304A (causing death by rash or negligent act)",
        "ss 415–420 (cheating)",
      ],
    );
  }

  if (/drug|misuse of drugs|traffick|possession|wilful blindness/.test(text)) {
    push(
      "Misuse of Drugs Act 1973",
      [
        "s 5 (trafficking)",
        "s 17 (presumption of trafficking from quantity)",
        "s 18 (presumption of possession and knowledge)",
      ],
    );
  }

  if (/family|matrimonial|divorce|maintenance|custody|ancillary|division of assets|women.?s charter/.test(text)) {
    push(
      "Women's Charter 1961",
      [
        "s 112 (just and equitable division of matrimonial assets)",
        "s 113–127 (maintenance)",
        "s 124–128 (children and custody powers)",
      ],
    );
  }

  if (/employment|restraint of trade|non-compete|dismissal|salary|workplace/.test(text)) {
    push(
      "Employment Act 1968",
      [
        "s 10–11 (notice of termination)",
        "s 14 (dismissal)",
        "Part IV (rest days, hours, and overtime for covered employees)",
      ],
    );
  }

  if (/constitutional|article 12|equal protection|judicial review|detention|fundamental|377a|justiciab/.test(text)) {
    push(
      "Constitution of the Republic of Singapore",
      [
        "Art 9 (life and personal liberty)",
        "Art 12 (equal protection)",
        "Art 93 (judicial power)",
      ],
    );
  }

  if (/strata|common property|management corporation|by-?law/.test(text)) {
    push(
      "Building Maintenance and Strata Management Act 2004",
      [
        "s 2 (definition of common property)",
        "s 24–32 (management corporation duties and by-laws)",
      ],
    );
  }

  if (/arbitration|award|setting aside|natural justice/.test(text)) {
    push(
      "International Arbitration Act 1994",
      [
        "s 3 (Model Law force of law)",
        "s 24 (setting aside)",
        "Art 34 Model Law (recourse against award)",
      ],
    );
  }

  if (/insolvency|winding up|liquidat|creditor|ponzi|disputed debt/.test(text)) {
    push(
      "Insolvency, Restructuring and Dissolution Act 2018",
      [
        "s 125 (circumstances in which company may be wound up)",
        "s 224–239 (avoidance of transactions)",
        "s 130–131 (standing and disputed debts practice)",
      ],
    );
  }

  if (/director|oppression|shareholder|fiduciary|company/.test(text)) {
    push(
      "Companies Act 1967",
      [
        "s 157 (directors’ duties)",
        "s 216 (minority oppression)",
        "s 216A (statutory derivative action)",
      ],
    );
  }

  if (/defamation|libel|slander|qualified privilege/.test(text)) {
    push(
      "Defamation Act 1957",
      ["s 3–5 (broadcast and newspaper privilege)", "s 8–10 (mitigation and offers of amends)"],
    );
  }

  if (/evidence|fresh evidence|statement|trial procedure/.test(text) && !laws.some((l) => l.statute.startsWith("Evidence"))) {
    push(
      "Evidence Act 1893",
      ["s 5–11 (relevance)", "s 122–159 (witnesses and statements)"],
    );
  }

  if (laws.length === 0) {
    push(
      "Application of English Law Act 1993",
      ["s 3 (reception of common law and equity)", "First Schedule (specified imperial Acts)"],
      "Default reception framework where no specialised statute is engaged.",
    );
  }

  return laws;
}

function statuteSelfProvisions(
  meta: Pick<DocMeta, "title" | "tags" | "summary"> & { id?: string },
): StatuteProvision[] {
  const id = (meta.id ?? "").toLowerCase();
  const title = meta.title.toLowerCase();

  if (id.includes("penal") || title.includes("penal code")) {
    return [
      {
        statute: "Penal Code 1871",
        sections: [
          "Chapter II (general explanations) and Chapter IV (general exceptions)",
          "ss 299–304A (homicide and causing death by rash/negligent act)",
          "ss 319–338 (hurt and grievous hurt)",
          "ss 415–420 (cheating)",
        ],
        note: "Principal criminal code for fault elements and substantive offences.",
      },
    ];
  }
  if (id.includes("civil-law") || title.includes("civil law act")) {
    return [
      {
        statute: "Civil Law Act 1909",
        sections: [
          "s 3 (contributory negligence)",
          "s 12 (survival of causes of action)",
          "ss 20–21 (dependency claims)",
        ],
      },
    ];
  }
  if (id.includes("women") || title.includes("women")) {
    return [
      {
        statute: "Women's Charter 1961",
        sections: [
          "s 112 (division of matrimonial assets)",
          "s 113–127 (maintenance)",
          "Part X (children)",
        ],
      },
    ];
  }
  if (id.includes("employment") || title.includes("employment act")) {
    return [
      {
        statute: "Employment Act 1968",
        sections: [
          "s 10–11 (notice)",
          "s 14 (dismissal)",
          "Part III–IV (payment of salary; rest days and hours of work)",
        ],
      },
    ];
  }
  if (id.includes("constitution") || title.includes("constitution")) {
    return [
      {
        statute: "Constitution of the Republic of Singapore",
        sections: [
          "Art 4 (supreme law)",
          "Art 9 (life and personal liberty)",
          "Art 12 (equal protection)",
          "Art 93–94 (judicial power and Supreme Court)",
        ],
      },
    ];
  }
  if (id.includes("misuse-of-drugs") || title.includes("misuse of drugs")) {
    return [
      {
        statute: "Misuse of Drugs Act 1973",
        sections: [
          "s 5 (trafficking)",
          "s 17 (presumption of trafficking from quantity)",
          "s 18 (presumptions of possession and knowledge)",
        ],
      },
    ];
  }
  if (id.includes("criminal-procedure") || title.includes("criminal procedure")) {
    return [
      {
        statute: "Criminal Procedure Code 2010",
        sections: [
          "Investigation and arrest powers",
          "Charge and trial procedure",
          "Bail, sentencing powers, and criminal appeals",
        ],
      },
    ];
  }
  if (id.includes("evidence-act") || title.includes("evidence act")) {
    return [
      {
        statute: "Evidence Act 1893",
        sections: [
          "ss 5–11 (relevance)",
          "ss 94–100 (parol evidence and written contracts)",
          "Documentary evidence and witnesses",
        ],
      },
    ];
  }
  if (id.includes("companies-act") || title.includes("companies act")) {
    return [
      {
        statute: "Companies Act 1967",
        sections: [
          "s 157 (directors’ duties)",
          "s 216 (minority oppression)",
          "s 216A (statutory derivative action)",
        ],
      },
    ];
  }
  if (id.includes("irda") || title.includes("insolvency, restructuring")) {
    return [
      {
        statute: "Insolvency, Restructuring and Dissolution Act 2018",
        sections: [
          "Winding up on inability to pay debts",
          "Restructuring tools (schemes / judicial management)",
          "Avoidance of undervalue and preference transactions",
        ],
      },
    ];
  }
  if (id.includes("workplace-safety") || title.includes("workplace safety")) {
    return [
      {
        statute: "Workplace Safety and Health Act 2006",
        sections: [
          "Employer duties (safe systems and workplace)",
          "Principal and occupier duties",
          "Reasonably practicable measures standard",
        ],
      },
    ];
  }
  if (id.includes("bmsma") || title.includes("building maintenance and strata")) {
    return [
      {
        statute: "Building Maintenance and Strata Management Act 2004",
        sections: [
          "s 2 (common property)",
          "Management corporation duties",
          "By-laws and contributions",
        ],
      },
    ];
  }
  if (id.includes("application-of-english") || title.includes("application of english law")) {
    return [
      {
        statute: "Application of English Law Act 1993",
        sections: [
          "s 3 (reception of common law and equity)",
          "s 4 and First Schedule (specified imperial Acts)",
        ],
      },
    ];
  }
  if (id.includes("overview-singapore") || title.includes("written law")) {
    return [
      {
        statute: "Map of Singapore written law",
        sections: [
          "Constitution and reception statutes",
          "Penal Code, CPC, MDA, Evidence Act",
          "Civil, commercial, family, employment, and property Acts",
        ],
        note: "Start with this overview, then open the individual Act nodes.",
      },
    ];
  }
  return [
    {
      statute: meta.title,
      sections: ["See the operative Parts and Schedules of this Act on the Singapore Statutes Online."],
    },
  ];
}

/**
 * Ensures every atlas document has a research-usable summary rather than a
 * catchword stub such as "Judgment concerning Tort — Negligence".
 */
export function ensureCompleteSummary(meta: DocMeta): string {
  const raw = meta.summary?.trim() ?? "";
  const isStub =
    !raw ||
    raw.length < 80 ||
    /^judgment concerning\b/i.test(raw) ||
    /^topic overview\b/i.test(raw);

  if (!isStub) return raw;

  const court =
    meta.kind === "statute"
      ? "This is a primary Singapore statute"
      : meta.kind === "overview"
        ? "This is a topic overview in the atlas"
        : `This is a judgment of the ${meta.court || "Singapore courts"}`;

  const issues =
    meta.tags.length > 0
      ? meta.tags
          .filter((tag) => !["singapore-law", "overview", "statute"].includes(tag))
          .slice(0, 6)
          .map((tag) => tag.replace(/-/g, " "))
          .join("; ")
      : meta.categoryPath.slice(1).join("; ") || meta.categoryPath.join("; ");

  const laws = relevantLawsFor(meta)
    .slice(0, 2)
    .map((law) => `${law.statute} (${law.sections[0]})`)
    .join("; ");

  const base =
    meta.kind === "statute"
      ? `${court}: ${meta.title} (${meta.citation}). It supplies the statutory framework for ${issues || "the subject area"}. Key provisions include ${laws}.`
      : meta.kind === "overview"
        ? `${court} covering ${meta.categoryPath.join(" › ")}. Use it as a map into the judgments below rather than as authority.`
        : `${court} in ${meta.citation}: ${meta.title}. The decision addresses ${issues || "the issues framed by the parties"}. Relevant legislation commonly engaged includes ${laws}. The ratio and subsequent treatment should be checked against the full reasons before citing.`;

  if (raw && !/^judgment concerning\b/i.test(raw)) {
    return `${raw.replace(/\s+/g, " ").trim()} ${base}`.slice(0, 900);
  }
  return base.slice(0, 900);
}

export function quickSummaryFor(meta: DocMeta, summary = ensureCompleteSummary(meta)): string {
  const laws = relevantLawsFor(meta)
    .slice(0, 2)
    .flatMap((law) => law.sections.slice(0, 1).map((section) => `${law.statute} ${section}`))
    .join("; ");

  if (meta.kind === "statute") {
    return `Quick summary: ${meta.title} is binding primary legislation (${meta.citation}). Lead with ${laws || "its operative sections"} when applying it to a live matter.`;
  }
  if (meta.kind === "overview") {
    const firstSentence = summary.split(/(?<=\.)\s+/)[0] ?? summary;
    if (/written law|codes? and principal|legal system/i.test(`${meta.title} ${meta.id} ${summary}`)) {
      return `Quick summary: ${firstSentence} Open the linked Acts (Penal Code, CPC, Civil Law Act, and others) for section-level research before case law.`.slice(
        0,
        520,
      );
    }
    return `Quick summary: Topic guide to ${meta.categoryPath.join(" › ")}. ${firstSentence}`.slice(0, 520);
  }

  const firstSentence = summary.split(/(?<=\.)\s+/)[0] ?? summary;
  return `Quick summary: ${meta.citation} — ${firstSentence}${laws ? ` Statutory touchpoints: ${laws}.` : ""}`.slice(
    0,
    520,
  );
}

export function buildDocumentBrief(meta: DocMeta): DocumentBrief {
  const summary = ensureCompleteSummary(meta);
  return {
    summary,
    laws: relevantLawsFor(meta),
    quickSummary: quickSummaryFor(meta, summary),
  };
}

function formatLaws(laws: StatuteProvision[]): string {
  if (laws.length === 0) return "_No specific statute mapping was inferred for this record._";
  return laws
    .map((law) => {
      const sections = law.sections.map((section) => `  - ${section}`).join("\n");
      const note = law.note ? `\n  - _${law.note}_` : "";
      return `- **${law.statute}**\n${sections}${note}`;
    })
    .join("\n");
}

/**
 * Builds the markdown body shown for every atlas document, including a complete
 * summary, relevant laws/sections, and a bottom quick summary block.
 */
export function buildDocumentMarkdown(
  meta: DocMeta,
  options?: {
    body?: string;
    holdings?: string[];
    relatedIds?: string[];
    relatedTitles?: Map<string, string>;
    includeJudgmentText?: boolean;
    indexHas?: (id: string) => boolean;
  },
): string {
  const brief = buildDocumentBrief(meta);
  const relatedIds = (options?.relatedIds ?? meta.relatedIds).filter(
    (id) => !options?.indexHas || options.indexHas(id),
  );

  const lines: string[] = [
    `# ${meta.title}`,
    "",
    `> ${meta.citation}${meta.court ? ` · ${meta.court}` : ""}${meta.year ? ` · ${meta.year}` : ""}`,
    "",
    "## Summary",
    "",
    brief.summary,
    "",
    "## Relevant laws and sections",
    "",
    formatLaws(brief.laws),
  ];

  if (options?.holdings?.length) {
    lines.push("", "## Holdings", "", ...options.holdings.map((holding) => `- ${holding}`));
  } else if (meta.tags.length > 0) {
    lines.push(
      "",
      "## Issues raised",
      "",
      ...meta.tags
        .filter((tag) => !["overview", "statute", "singapore-law"].includes(tag))
        .slice(0, 10)
        .map((tag) => `- ${tag.replace(/-/g, " ")}`),
    );
  }

  const facets = [
    ["Court", meta.court],
    ["Year", meta.year ? String(meta.year) : ""],
    ["Citation", meta.citation],
    ["Category", meta.categoryPath.join(" › ")],
    ["Kind", meta.kind ?? "judgment"],
  ].filter(([, value]) => Boolean(value));

  lines.push(
    "",
    "## Record",
    "",
    "| Field | Value |",
    "| --- | --- |",
    ...facets.map(([label, value]) => `| ${label} | ${value} |`),
  );

  if (relatedIds.length > 0) {
    lines.push(
      "",
      "## Related precedents",
      "",
      ...relatedIds.map((id) => {
        const title = options?.relatedTitles?.get(id);
        return `- [[${id}${title ? `|${title}` : ""}]]`;
      }),
    );
  }

  if (options?.body?.trim()) {
    lines.push("", options.includeJudgmentText === false ? "## Case note" : "## Judgment text", "", options.body.trim());
  } else if (meta.kind !== "overview") {
    lines.push(
      "",
      "> Full text is not in the local index yet. This view is assembled from verified case metadata and the statutory map above"
        + (meta.sourceUrl ? " — open the authoritative eLitigation or SSO link for the binding text." : "."),
    );
  }

  if (meta.sourceUrl) {
    lines.push("", "---", "", `[Authoritative source](${meta.sourceUrl})`);
  }

  lines.push("", "---", "", `### Quick summary`, "", brief.quickSummary, "");
  return lines.join("\n");
}

/** Append a bottom quick-summary block if the markdown does not already end with one. */
export function ensureBottomQuickSummary(markdown: string, meta: DocMeta): string {
  if (/###\s+Quick summary\b/i.test(markdown) || /##\s+Quick summary\b/i.test(markdown)) {
    return markdown;
  }
  const brief = buildDocumentBrief(meta);
  const lawsBlock =
    brief.laws.length > 0 && !/##\s+Relevant laws/i.test(markdown)
      ? `\n\n## Relevant laws and sections\n\n${formatLaws(brief.laws)}`
      : "";
  return `${markdown.trim()}${lawsBlock}\n\n---\n\n### Quick summary\n\n${brief.quickSummary}\n`;
}

/** Ensure a ## Summary section exists with a complete summary. */
export function ensureSummarySection(markdown: string, meta: DocMeta): string {
  const summary = ensureCompleteSummary(meta);
  if (/^##\s+Summary\b/m.test(markdown)) {
    return markdown.replace(
      /(##\s+Summary\b\s*\n+)([\s\S]*?)(?=\n##\s|\n---\s*$)/m,
      (_match, heading: string) => `${heading}${summary}\n\n`,
    );
  }
  // Insert after the first heading block.
  const lines = markdown.split("\n");
  const firstHeading = lines.findIndex((line) => line.startsWith("# "));
  if (firstHeading === -1) {
    return `## Summary\n\n${summary}\n\n${markdown}`;
  }
  let insertAt = firstHeading + 1;
  while (insertAt < lines.length && (lines[insertAt].startsWith(">") || lines[insertAt].trim() === "")) {
    insertAt += 1;
  }
  lines.splice(insertAt, 0, "", "## Summary", "", summary, "");
  return lines.join("\n");
}

export function finalizeDocumentMarkdown(markdown: string, meta: DocMeta): string {
  const withSummary = ensureSummarySection(markdown, meta);
  return ensureBottomQuickSummary(withSummary, {
    ...meta,
    summary: ensureCompleteSummary(meta),
  });
}
