import type { DocMeta } from "@/lib/types";
import recentCorpus from "@/fixtures/recent-corpus.json";
import { SINGAPORE_STATUTES } from "./singapore-statutes";

/**
 * Offline demo corpus. Only used when neither the live index nor the checked-in
 * fixtures return enough material to make the atlas legible, and the UI always
 * labels this state as demo data so it is never mistaken for the real index.
 */
export type DemoDoc = DocMeta & { content?: string };

const EL = "https://www.elitigation.sg/gd/s/";

const CURATED_DEMO_DOCS: DemoDoc[] = [
  {
    id: "spandeck-v-dsta-2007",
    title:
      "Spandeck Engineering (S) Pte Ltd v Defence Science & Technology Agency",
    citation: "[2007] SGCA 37",
    court: "SGCA",
    year: 2007,
    categoryPath: ["Civil Liability", "Negligence", "Duty of Care"],
    tags: ["negligence", "duty-of-care", "pure-economic-loss"],
    summary:
      "Real Court of Appeal decision establishing Singapore's single two-stage duty-of-care test (proximity then policy), preceded by factual foreseeability. Departs from the English Caparo tripartite approach. On the facts, no duty was owed inside a contractual matrix allocating pure economic loss. Pair with Civil Law Act 1909 s 3 when contributory negligence is live.",
    relatedIds: [
      "ngiam-kong-seng-2008",
      "anwar-patrick-adrian-2014",
      "see-toh-siew-kee-2013",
      "ng-huat-seng-2017",
      "civil-law-act-1909",
      "application-of-english-law-act-1993",
      "workplace-safety-health-act-2006",
    ],
    sourceUrl: `${EL}2007_SGCA_37`,
    kind: "judgment",
    content: `## What this paper is

[2007] SGCA 37 is the leading Singapore Court of Appeal judgment on when a duty of care arises in negligence, including pure economic loss.

## Relevant laws and sections

- **Civil Law Act 1909 s 3** — contributory negligence / apportionment once duty and breach are made out.
- **Civil Law Act 1909 ss 20–21** — dependency claims if the negligence claim is fatal.
- Common-law negligence (received via the **Application of English Law Act 1993 s 3**), localised by this decision.

## Holding / precedents set

The Court of Appeal held that a **single test** determines the existence of a duty of care in negligence, regardless of the type of damage claimed. The court declined to follow the English tripartite test in *Caparo Industries plc v Dickman*.

## The two-stage test

1. **Threshold — factual foreseeability.** Ought the defendant to have known that the claimant would suffer damage from his carelessness?
2. **Stage one — legal proximity.** Physical, circumstantial and causal proximity; assumption of responsibility and reliance where relevant.
3. **Stage two — policy.** Indeterminate liability, contractual matrix, defensive practices, and like considerations.

## How it is applicable / how it will be used

Use *Spandeck* whenever duty is contested in negligence (personal injury, psychiatric harm, pure economic loss, occupiers, professionals). Cite it for the framework; then distinguish or analogise on proximity and policy. On the facts, the **contractual matrix** defeated a pure economic loss duty owed by the superintending officer to the contractor.

See [[ngiam-kong-seng-2008|Ngiam Kong Seng]], [[anwar-patrick-adrian-2014]], [[see-toh-siew-kee-2013]], and [[ng-huat-seng-2017]] for later applications.`,
  },
  {
    id: "ngiam-kong-seng-2008",
    title: "Ngiam Kong Seng v Lim Chiew Hock",
    citation: "[2008] SGCA 23",
    court: "SGCA",
    year: 2008,
    categoryPath: ["Civil Liability", "Negligence", "Duty of Care"],
    tags: ["negligence", "duty-of-care", "psychiatric-harm", "personal-injury"],
    summary:
      "Applied the Spandeck framework to a claim for psychiatric harm, holding that a duty may arise from communication of distressing news only in exceptional circumstances.",
    relatedIds: ["spandeck-v-dsta-2007", "see-toh-siew-kee-2013"],
    sourceUrl: `${EL}2008_SGCA_23`,
    kind: "judgment",
    content: `## Holding

The Court of Appeal applied the [[spandeck-v-dsta-2007|Spandeck]] two-stage test to a claim for psychiatric harm brought by the wife of an accident victim, and dismissed the claim.

## Reasoning

- Factual foreseeability was satisfied, but **legal proximity** was not: the defendant was a bystander who conveyed news of the accident, not a participant in the events causing it.
- The court emphasised that psychiatric harm claims are not governed by a separate test. The unified framework applies, with the special features of the claim addressed at the proximity and policy stages.
- Policy considerations weighed against imposing liability for the communication of distressing news, which would chill ordinary human assistance.`,
  },
  {
    id: "anwar-patrick-adrian-2014",
    title: "Anwar Patrick Adrian v Ng Chong & Hue LLC",
    citation: "[2014] SGCA 34",
    court: "SGCA",
    year: 2014,
    categoryPath: ["Civil Liability", "Negligence", "Professional Liability"],
    tags: [
      "negligence",
      "pure-economic-loss",
      "solicitors",
      "concurrent-liability",
    ],
    summary:
      "Confirmed that solicitors may owe concurrent duties in contract and tort, and that a duty to advise on risks outside the retainer can arise where the risk is apparent.",
    relatedIds: ["spandeck-v-dsta-2007", "sembcorp-marine-2013"],
    sourceUrl: `${EL}2014_SGCA_34`,
    kind: "judgment",
  },
  {
    id: "see-toh-siew-kee-2013",
    title: "See Toh Siew Kee v Ho Ah Lam Ferrocement (Pte) Ltd",
    citation: "[2013] SGCA 29",
    court: "SGCA",
    year: 2013,
    categoryPath: ["Civil Liability", "Negligence", "Occupiers' Liability"],
    tags: ["negligence", "occupiers-liability", "duty-of-care", "trespasser"],
    summary:
      "Abolished the common law categories of entrant in occupiers' liability, subsuming the doctrine within the ordinary Spandeck negligence analysis.",
    relatedIds: ["spandeck-v-dsta-2007", "ngiam-kong-seng-2008"],
    sourceUrl: `${EL}2013_SGCA_29`,
    kind: "judgment",
  },
  {
    id: "tv-media-v-de-cruz-2004",
    title: "TV Media Pte Ltd v De Cruz Andrea Heidi",
    citation: "[2004] SGCA 29",
    court: "SGCA",
    year: 2004,
    categoryPath: ["Civil Liability", "Negligence", "Product Liability"],
    tags: ["negligence", "product-liability", "causation", "damages"],
    summary:
      "Landmark product liability decision on the duty owed by distributors and advertisers of health products, and on causation where a product causes organ failure.",
    relatedIds: ["spandeck-v-dsta-2007", "civil-law-act-1909"],
    sourceUrl: `${EL}2004_SGCA_29`,
    kind: "judgment",
  },
  {
    id: "ng-huat-seng-2017",
    title: "Ng Huat Seng v Munib Mohammad Madni",
    citation: "[2017] SGCA 58",
    court: "SGCA",
    year: 2017,
    categoryPath: ["Civil Liability", "Negligence", "Vicarious Liability"],
    tags: [
      "vicarious-liability",
      "non-delegable-duty",
      "independent-contractor",
      "negligence",
    ],
    summary:
      "Declined to extend vicarious liability to independent contractors, and set out when a non-delegable duty arises for hazardous operations.",
    relatedIds: ["spandeck-v-dsta-2007", "see-toh-siew-kee-2013"],
    sourceUrl: `${EL}2017_SGCA_58`,
    kind: "judgment",
  },
  {
    id: "sembcorp-marine-2013",
    title: "Sembcorp Marine Ltd v PPL Holdings Pte Ltd",
    citation: "[2013] SGCA 43",
    court: "SGCA",
    year: 2013,
    categoryPath: ["Commercial Law", "Contract", "Implied Terms"],
    tags: ["contract", "implied-terms", "interpretation", "gaps"],
    summary:
      "Set out the three-step test for implying a term in fact and clarified the relationship between contractual interpretation and gap-filling.",
    relatedIds: ["zurich-insurance-2008", "rdc-concrete-2007", "quoine-2020"],
    sourceUrl: `${EL}2013_SGCA_43`,
    kind: "judgment",
    content: `## Holding

A term will only be implied in fact where the contract contains a **true gap** that the parties did not contemplate. The court set out three steps:

1. Ascertain whether the contract is silent on a matter — a gap must exist, and it must not be a deliberate one.
2. Ask whether it is *necessary in the business or commercial sense* to imply a term in order to give the contract efficacy.
3. Apply the officious bystander test, formulating the term with sufficient clarity.

## Relationship with interpretation

The court distinguished implication from **interpretation**, which is governed by the contextual approach in [[zurich-insurance-2008|Zurich Insurance v B-Gold]]. Interpretation gives meaning to words the parties used; implication supplies terms they did not.

## Evidential rules

Sembcorp also laid down procedural requirements for adducing extrinsic evidence: the relevant context must be pleaded with specificity, and the evidence must be relevant, reasonably available, and relate to a clear and obvious context.`,
  },
  {
    id: "zurich-insurance-2008",
    title:
      "Zurich Insurance (Singapore) Pte Ltd v B-Gold Interior Design & Construction Pte Ltd",
    citation: "[2008] SGCA 27",
    court: "SGCA",
    year: 2008,
    categoryPath: ["Commercial Law", "Contract", "Interpretation"],
    tags: ["contract", "interpretation", "extrinsic-evidence", "parol-evidence"],
    summary:
      "Adopted the contextual approach to contractual interpretation and reconciled it with the parol evidence rule in the Evidence Act.",
    relatedIds: ["sembcorp-marine-2013", "rdc-concrete-2007"],
    sourceUrl: `${EL}2008_SGCA_27`,
    kind: "judgment",
  },
  {
    id: "rdc-concrete-2007",
    title: "RDC Concrete Pte Ltd v Sato Kogyo (S) Pte Ltd",
    citation: "[2007] SGCA 39",
    court: "SGCA",
    year: 2007,
    categoryPath: ["Commercial Law", "Contract", "Breach & Termination"],
    tags: ["contract", "breach", "termination", "conditions"],
    summary:
      "Rationalised the law on discharge by breach into four situations, clarifying when an innocent party may elect to terminate.",
    relatedIds: [
      "sembcorp-marine-2013",
      "zurich-insurance-2008",
      "denka-advantech-2020",
    ],
    sourceUrl: `${EL}2007_SGCA_39`,
    kind: "judgment",
  },
  {
    id: "denka-advantech-2020",
    title: "Denka Advantech Pte Ltd v Seraya Energy Pte Ltd",
    citation: "[2020] SGCA 119",
    court: "SGCA",
    year: 2020,
    categoryPath: ["Commercial Law", "Contract", "Remedies"],
    tags: ["contract", "penalty-clause", "liquidated-damages", "remedies"],
    summary:
      "Retained the classic Dunlop genuine pre-estimate test for penalty clauses and declined to adopt the English legitimate interest test.",
    relatedIds: ["rdc-concrete-2007", "sembcorp-marine-2013"],
    sourceUrl: `${EL}2020_SGCA_119`,
    kind: "judgment",
  },
  {
    id: "quoine-2020",
    title: "Quoine Pte Ltd v B2C2 Ltd",
    citation: "[2020] SGCA(I) 02",
    court: "SGCA(I)",
    year: 2020,
    categoryPath: ["Commercial Law", "Contract", "Mistake"],
    tags: ["contract", "unilateral-mistake", "algorithmic-trading", "trust"],
    summary:
      "First apex court decision on contracts formed by deterministic algorithms, locating the relevant knowledge in the programmer at the time of programming.",
    relatedIds: ["sembcorp-marine-2013", "zurich-insurance-2008"],
    sourceUrl: `${EL}2020_SGCAI_2`,
    kind: "judgment",
  },
  {
    id: "adili-chibuike-2019",
    title: "Adili Chibuike Ejike v Public Prosecutor",
    citation: "[2019] SGCA 38",
    court: "SGCA",
    year: 2019,
    categoryPath: ["Criminal Law", "Drug Offences", "Knowledge"],
    tags: ["criminal", "wilful-blindness", "possession", "misuse-of-drugs"],
    summary:
      "Clarified the doctrine of wilful blindness and the presumption of possession, holding that wilful blindness requires a clear, grounded suspicion and a deliberate refusal to inquire.",
    relatedIds: [
      "misuse-of-drugs-act-1973",
      "penal-code-1871",
      "criminal-procedure-code-2010",
      "evidence-act-1893",
    ],
    sourceUrl: `${EL}2019_SGCA_38`,
    kind: "judgment",
  },
  {
    id: "hue-an-li-2014",
    title: "Public Prosecutor v Hue An Li",
    citation: "[2014] SGHC 171",
    court: "SGHC",
    year: 2014,
    categoryPath: ["Criminal Law", "Sentencing", "Negligent Driving"],
    tags: ["criminal", "sentencing", "rashness", "negligence", "mens-rea"],
    summary:
      "Distinguished rashness from negligence as states of mind and issued sentencing guidance for causing death by a negligent act, with prospective overruling.",
    relatedIds: [
      "penal-code-1871",
      "criminal-procedure-code-2010",
      "adili-chibuike-2019",
      "kho-jabing-2015",
    ],
    sourceUrl: `${EL}2014_SGHC_171`,
    kind: "judgment",
  },
  {
    id: "kho-jabing-2015",
    title: "Public Prosecutor v Kho Jabing",
    citation: "[2015] SGCA 1",
    court: "SGCA",
    year: 2015,
    categoryPath: ["Criminal Law", "Sentencing", "Capital Punishment"],
    tags: ["criminal", "sentencing", "murder", "capital-punishment"],
    summary:
      "Set out the approach to re-sentencing under the amended murder provisions, focusing on whether the offender acted in a way that outrages the feelings of the community.",
    relatedIds: ["penal-code-1871", "criminal-procedure-code-2010", "hue-an-li-2014"],
    sourceUrl: `${EL}2015_SGCA_1`,
    kind: "judgment",
  },
  {
    id: "tan-seng-kee-2022",
    title: "Tan Seng Kee v Attorney-General",
    citation: "[2022] SGCA 16",
    court: "SGCA",
    year: 2022,
    categoryPath: [
      "Constitutional & Administrative Law",
      "Fundamental Liberties",
    ],
    tags: ["constitutional", "justiciability", "standing", "section-377a"],
    summary:
      "Held the challenges to s 377A non-justiciable in light of the Attorney-General's clarified prosecutorial position, while addressing standing and ripeness.",
    relatedIds: ["lim-meng-suang-2014", "chng-suan-tze-1988", "constitution-sg"],
    sourceUrl: `${EL}2022_SGCA_16`,
    kind: "judgment",
  },
  {
    id: "lim-meng-suang-2014",
    title: "Lim Meng Suang v Attorney-General",
    citation: "[2014] SGCA 53",
    court: "SGCA",
    year: 2014,
    categoryPath: [
      "Constitutional & Administrative Law",
      "Fundamental Liberties",
    ],
    tags: ["constitutional", "equal-protection", "article-12", "reasonable-classification"],
    summary:
      "Applied the reasonable classification test under Art 12 and emphasised the limits of the judicial role in matters of social policy.",
    relatedIds: ["tan-seng-kee-2022", "constitution-sg"],
    sourceUrl: `${EL}2014_SGCA_53`,
    kind: "judgment",
  },
  {
    id: "chng-suan-tze-1988",
    title: "Chng Suan Tze v Minister for Home Affairs",
    citation: "[1988] SGCA 16",
    court: "SGCA",
    year: 1988,
    categoryPath: [
      "Constitutional & Administrative Law",
      "Judicial Review",
    ],
    tags: ["administrative", "judicial-review", "rule-of-law", "detention"],
    summary:
      "Foundational judicial review decision affirming that all power has legal limits and that the notion of subjective or unfettered discretion is contrary to the rule of law.",
    relatedIds: ["tan-seng-kee-2022", "constitution-sg"],
    sourceUrl: `${EL}1988_SGCA_16`,
    kind: "judgment",
  },
  {
    id: "anj-v-ans-2015",
    title: "ANJ v ANS",
    citation: "[2015] SGCA 34",
    court: "SGCA",
    year: 2015,
    categoryPath: ["Family Law", "Matrimonial Assets", "Division"],
    tags: ["family", "division-of-assets", "structured-approach", "contributions"],
    summary:
      "Introduced the structured approach to dividing matrimonial assets, giving weight to direct and indirect contributions through an averaged ratio.",
    relatedIds: ["womens-charter-1961", "tnl-v-tnk-2017", "uda-v-udb-2018"],
    sourceUrl: `${EL}2015_SGCA_34`,
    kind: "judgment",
  },
  {
    id: "tnl-v-tnk-2017",
    title: "TNL v TNK",
    citation: "[2017] SGCA 15",
    court: "SGCA",
    year: 2017,
    categoryPath: ["Family Law", "Matrimonial Assets", "Division"],
    tags: ["family", "division-of-assets", "long-marriage", "single-income"],
    summary:
      "Held that the ANJ structured approach does not apply to long single-income marriages, where an equal division is the appropriate starting point.",
    relatedIds: ["womens-charter-1961", "anj-v-ans-2015", "uda-v-udb-2018"],
    sourceUrl: `${EL}2017_SGCA_15`,
    kind: "judgment",
  },
  {
    id: "uda-v-udb-2018",
    title: "UDA v UDB",
    citation: "[2018] SGCA 30",
    court: "SGCA",
    year: 2018,
    categoryPath: ["Family Law", "Matrimonial Assets", "Procedure"],
    tags: ["family", "third-parties", "procedure", "division-of-assets"],
    summary:
      "Addressed how the family court should deal with assets in which third parties assert a proprietary interest.",
    relatedIds: ["womens-charter-1961", "anj-v-ans-2015", "tnl-v-tnk-2017"],
    sourceUrl: `${EL}2018_SGCA_30`,
    kind: "judgment",
  },
  {
    id: "sit-kwong-lam-2018",
    title: "Sit Kwong Lam v Management Corporation Strata Title Plan No 2645",
    citation: "[2018] SGCA 14",
    court: "SGCA",
    year: 2018,
    categoryPath: ["Property Law", "Strata Title", "Common Property"],
    tags: ["property", "strata", "common-property", "by-laws"],
    summary:
      "Real Court of Appeal decision clarifying the meaning of common property under the Building Maintenance and Strata Management Act 2004 (including s 2) and the limits of a management corporation's powers over exterior and common areas.",
    relatedIds: ["bmsma-2004", "land-titles-act-1993"],
    sourceUrl: `${EL}2018_SGCA_14`,
    kind: "judgment",
  },
  {
    id: "mano-vikrant-singh-2012",
    title: "Mano Vikrant Singh v Cargill TSF Asia Pte Ltd",
    citation: "[2012] SGCA 42",
    court: "SGCA",
    year: 2012,
    categoryPath: ["Employment Law", "Restraint of Trade"],
    tags: ["employment", "restraint-of-trade", "non-compete", "deferred-benefits"],
    summary:
      "Held that a forfeiture-for-competition clause in a deferred incentive plan was subject to, and failed, the restraint of trade doctrine.",
    relatedIds: [
      "employment-act-1968",
      "application-of-english-law-act-1993",
      "lek-gwee-noi-2014",
    ],
    sourceUrl: `${EL}2012_SGCA_42`,
    kind: "judgment",
  },
  {
    id: "lek-gwee-noi-2014",
    title: "Lek Gwee Noi v Humming Flowers & Gifts Pte Ltd",
    citation: "[2014] SGHC 64",
    court: "SGHC",
    year: 2014,
    categoryPath: ["Employment Law", "Restraint of Trade"],
    tags: ["employment", "restraint-of-trade", "non-compete", "severance"],
    summary:
      "Reviewed the legitimate proprietary interest requirement and the limits of severance for overly wide restrictive covenants.",
    relatedIds: ["employment-act-1968", "mano-vikrant-singh-2012"],
    sourceUrl: `${EL}2014_SGHC_64`,
    kind: "judgment",
  },
];

const curatedCitations = new Set(
  [...CURATED_DEMO_DOCS, ...SINGAPORE_STATUTES].map((doc) => doc.citation),
);

/** Curated judgments + full written-law corpus, then recent eLitigation judgments. */
export const DEMO_DOCS: DemoDoc[] = [
  ...SINGAPORE_STATUTES,
  ...CURATED_DEMO_DOCS,
  ...(recentCorpus as DemoDoc[]).filter((doc) => !curatedCitations.has(doc.citation)),
];
