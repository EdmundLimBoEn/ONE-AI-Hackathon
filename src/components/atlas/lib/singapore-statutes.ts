import type { DocMeta } from "@/lib/types";

export type StatuteDoc = DocMeta & { content?: string };

const SSO = "https://sso.agc.gov.sg/Act";

/**
 * Written law corpus for the Legislation domain — real Singapore primary
 * legislation with section maps, short statutory digests, and SSO links.
 * Prefer these over case-only browsing when the research question is statutory.
 */
export const SINGAPORE_STATUTES: StatuteDoc[] = [
  {
    id: "overview-singapore-written-law",
    title: "Singapore written law — overview of codes and principal Acts",
    citation: "Atlas guide · Written law",
    court: "Parliament",
    year: 1965,
    categoryPath: ["Statutes", "Singapore Legal System"],
    tags: [
      "overview",
      "statute",
      "written-law",
      "penal-code",
      "constitution",
      "codes",
    ],
    summary:
      "Map of Singapore’s written law: the Constitution as supreme law; reception of common law; the Penal Code and other criminal statutes; civil codes and commercial Acts; family, employment, property, and procedure statutes. Start here before opening individual Acts or case law.",
    relatedIds: [
      "constitution-sg",
      "application-of-english-law-act-1993",
      "penal-code-1871",
      "criminal-procedure-code-2010",
      "misuse-of-drugs-act-1973",
      "evidence-act-1893",
      "civil-law-act-1909",
      "companies-act-1967",
      "womens-charter-1961",
      "employment-act-1968",
      "workplace-safety-health-act-2006",
      "personal-data-protection-act-2012",
      "prevention-of-corruption-act-1960",
      "supreme-court-of-judicature-act-1969",
    ],
    sourceUrl: "https://sso.agc.gov.sg",
    kind: "overview",
    content: `## What this guide is

Singapore law is a **mixed written-law and common-law** system. Parliament enacts **statutes** (Acts of Parliament). The courts develop **common law** and interpret those statutes. This atlas node is the entry map for **written law** — the codes and principal Acts — so research does not start only from case names.

Authoritative text lives on [Singapore Statutes Online](https://sso.agc.gov.sg). What follows is a research map of the main codes and how they fit together.

## 1. Supreme law and reception of common law

| Instrument | Role | Open |
| --- | --- | --- |
| **Constitution of the Republic of Singapore** | Supreme law; fundamental liberties (Part 4); judicial power (Art 93) | [[constitution-sg]] |
| **Application of English Law Act 1993** | Receives English common law and equity so far as applicable; lists certain imperial Acts | [[application-of-english-law-act-1993]] |
| **Interpretation Act 1965** | How statutes are read (definitions, commencement, repeal, gender/number rules) | [[interpretation-act-1965]] |

## 2. Criminal codes and offence statutes

Singapore does **not** leave crime to pure common law. Substantive offences and many fault rules are statutory.

| Act | What it covers | Open |
| --- | --- | --- |
| **Penal Code 1871** | General exceptions, fault ideas, homicide, hurt, property and dishonesty offences, sexual offences (as amended) | [[penal-code-1871]] |
| **Criminal Procedure Code 2010** | Investigation, charge, trial, bail, sentencing procedure, appeals | [[criminal-procedure-code-2010]] |
| **Misuse of Drugs Act 1973** | Trafficking, possession, presumptions (ss 17–18), capital thresholds | [[misuse-of-drugs-act-1973]] |
| **Evidence Act 1893** | Relevance, confessions, witnesses, documentary evidence, parol evidence (ss 94–100) | [[evidence-act-1893]] |
| **Computer Misuse Act 1993** | Unauthorised access and computer offences | [[computer-misuse-act-1993]] |
| **Prevention of Corruption Act 1960** | Corrupt gratification and CPIB enforcement architecture | [[prevention-of-corruption-act-1960]] |
| **Road Traffic Act 1961** | Dangerous/careless driving and vehicle offences | [[road-traffic-act-1961]] |

**How to use them together:** identify the **offence section** (usually Penal Code, MDA, PCA, CMA, or RTA) → check **fault and exceptions** → apply **CPC** procedure and **Evidence Act** proof rules → only then layer sentencing or appellate case law.

## 3. Civil liability and commercial written law

| Act | What it covers | Open |
| --- | --- | --- |
| **Civil Law Act 1909** | Contributory negligence (s 3), survival of actions, dependency claims | [[civil-law-act-1909]] |
| **Companies Act 1967** | Incorporation, directors’ duties (s 157), oppression (s 216), corporate machinery | [[companies-act-1967]] |
| **Insolvency, Restructuring and Dissolution Act 2018** | Winding up, schemes, avoidance of transactions | [[irda-2018]] |
| **International Arbitration Act 1994** | Model Law force of law; setting aside and enforcement of awards | [[international-arbitration-act-1994]] |
| **Defamation Act 1957** | Statutory overlays on the common law of defamation | [[defamation-act-1957]] |
| **Protection from Harassment Act 2014** | Harassment, false statements of fact, protection orders | [[protection-from-harassment-act-2014]] |
| **Personal Data Protection Act 2012** | Consent, purpose limitation, access/correction, organisational duties | [[personal-data-protection-act-2012]] |
| **Supreme Court of Judicature Act 1969** | Supreme Court structure and jurisdiction | [[supreme-court-of-judicature-act-1969]] |

Negligence **duty** remains largely common law ([[spandeck-v-dsta-2007|Spandeck]]), but **quantum, shared fault, and death claims** are often statutory under the Civil Law Act.

## 4. Family, employment, workplace, and property

| Act | What it covers | Open |
| --- | --- | --- |
| **Women’s Charter 1961** | Marriage, divorce, s 112 division of assets, maintenance, children | [[womens-charter-1961]] |
| **Employment Act 1968** | Notice, dismissal, salary and hours for covered employees | [[employment-act-1968]] |
| **Workplace Safety and Health Act 2006** | Duties of employers, principals, occupiers; safe work systems | [[workplace-safety-health-act-2006]] |
| **Building Maintenance and Strata Management Act 2004** | Common property, management corporations, by-laws | [[bmsma-2004]] |
| **Land Titles Act 1993** | Torrens registration, indefeasibility, caveats | [[land-titles-act-1993]] |

## 5. How written law and court cases fit in this atlas

1. **Start with the Act and section** when the dispute is created by statute (drugs, cheating, winding up, s 112 division, WSH duties).
2. **Use case law** for tests the statute does not fully spell out (duty of care, implied terms, restraint of trade, constitutional review).
3. Every statute node below ends with a **Quick summary** and links to related judgments that apply those sections.

## Suggested reading order for newcomers

1. [[constitution-sg|Constitution]] and [[application-of-english-law-act-1993|AELA]]  
2. [[penal-code-1871|Penal Code]] + [[criminal-procedure-code-2010|CPC]]  
3. [[civil-law-act-1909|Civil Law Act]] + [[evidence-act-1893|Evidence Act]]  
4. Topic statutes (Companies, Women’s Charter, Employment, WSHA, IRDA) as needed  
5. Then the linked Court of Appeal and High Court decisions`,
  },
  {
    id: "constitution-sg",
    title: "Constitution of the Republic of Singapore",
    citation: "1985 Rev Ed, 1999 Reprint",
    court: "Parliament",
    year: 1965,
    categoryPath: ["Statutes", "Constitution & Public Law"],
    tags: ["statute", "constitutional", "fundamental-liberties", "article-12", "written-law"],
    summary:
      "Supreme written law of Singapore. Part 4 protects fundamental liberties (including Arts 9 and 12). Arts 93–94 vest judicial power in the Supreme Court. All other written law and executive action is read subject to the Constitution.",
    relatedIds: [
      "overview-singapore-written-law",
      "lim-meng-suang-2014",
      "tan-seng-kee-2022",
      "chng-suan-tze-1988",
      "application-of-english-law-act-1993",
    ],
    sourceUrl: `${SSO}/CONS1963`,
    kind: "statute",
    content: `## What this written law is

The **Constitution** is the highest form of Singapore written law. Ordinary Acts of Parliament must be consistent with it. Public-law research usually starts with the relevant Article, then the case law that applies it.

## Key provisions (digest)

- **Art 4** — Constitution is the supreme law; inconsistent law is void to the extent of inconsistency.
- **Art 9** — No person shall be deprived of life or personal liberty save in accordance with law.
- **Art 12(1)** — All persons are equal before the law and entitled to equal protection of the law.
- **Art 14** — Freedom of speech, assembly, and association (subject to restrictions in Art 14 itself).
- **Art 93** — Judicial power of Singapore is vested in a Supreme Court and in such subordinate courts as provided by written law.
- **Art 94** — Constitution of the Supreme Court (Court of Appeal and High Court structure as provided).

## How counsel uses it

Plead the **Article** first, then authorities such as [[lim-meng-suang-2014|Lim Meng Suang]] (Art 12 reasonable classification), [[tan-seng-kee-2022|Tan Seng Kee]] (justiciability posture), and [[chng-suan-tze-1988|Chng Suan Tze]] (reviewability of executive power).`,
  },
  {
    id: "application-of-english-law-act-1993",
    title: "Application of English Law Act 1993",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 1993,
    categoryPath: ["Statutes", "Constitution & Public Law"],
    tags: ["statute", "reception", "common-law", "equity", "written-law"],
    summary:
      "Written reception statute: English common law (including equity principles) continues in force in Singapore so far as local circumstances permit. Certain imperial Acts are continued by the First Schedule. Explains why negligence and much of contract still rest on local common-law cases built on received law.",
    relatedIds: [
      "overview-singapore-written-law",
      "constitution-sg",
      "spandeck-v-dsta-2007",
      "sembcorp-marine-2013",
      "civil-law-act-1909",
    ],
    sourceUrl: `${SSO}/AELA1993`,
    kind: "statute",
    content: `## What this written law is

The **Application of English Law Act 1993 (AELA)** is the modern reception statute. It tells courts which English common-law rules and which listed imperial statutes form part of Singapore law.

## Key sections (digest)

- **s 3** — Common law of England (including principles and rules of equity) so far as it was part of Singapore law before 12 November 1993 continues, subject to suitability to local circumstances and to Singapore written law.
- **s 4 and First Schedule** — Specified imperial Acts (or parts of them) continue to have force with necessary modifications.
- Interaction with **local statutes** — where Parliament has enacted a complete code (for example large parts of the Penal Code), the code displaces inconsistent common-law rules.

## How counsel uses it

Cite **AELA s 3** when explaining why Singapore still applies incremental common-law tests (duty of care, implied terms, restraint of trade) unless a local Act covers the field. Pair with [[spandeck-v-dsta-2007|Spandeck]] and [[sembcorp-marine-2013|Sembcorp Marine]].`,
  },
  {
    id: "interpretation-act-1965",
    title: "Interpretation Act 1965",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 1965,
    categoryPath: ["Statutes", "Constitution & Public Law"],
    tags: ["statute", "interpretation", "legislation", "written-law"],
    summary:
      "Horizontal statute that governs how all other Singapore written law is read: definitions, computation of time, gender and number, repeal and amendment effects, and standard construction rules.",
    relatedIds: [
      "overview-singapore-written-law",
      "constitution-sg",
      "penal-code-1871",
      "companies-act-1967",
    ],
    sourceUrl: `${SSO}/IA1965`,
    kind: "statute",
    content: `## What this written law is

The **Interpretation Act 1965** is the drafting and construction toolbox for every other Act. When a section is ambiguous about time, persons, or effect of repeal, start here before inventing a purposive gloss.

## Key themes (digest)

- **General definitions** — standard meanings for “person”, “month”, “writing”, “public officer”, and related terms unless a contrary intention appears.
- **Construction rules** — singular includes plural and vice versa; masculine/feminine inclusion rules as enacted.
- **Time and distance** — how periods are computed for statutory deadlines.
- **Repeal and amendment** — effect of repeals on rights, liabilities, and pending proceedings (subject to specific saving provisions in the amending Act).

## How counsel uses it

Use it as a **supporting citation** whenever a limitation period, notice period, or definition fight turns on drafting defaults rather than specialised case law.`,
  },
  {
    id: "penal-code-1871",
    title: "Penal Code 1871",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 1871,
    categoryPath: ["Statutes", "Criminal Codes"],
    tags: ["statute", "criminal", "penal-code", "mens-rea", "offences", "written-law"],
    summary:
      "Principal criminal code of Singapore. Defines general exceptions, fault concepts, and core offences including homicide (ss 299–304A), hurt, property and dishonesty offences, and sexual offences as amended. Charge drafting almost always begins with a Penal Code section number.",
    relatedIds: [
      "overview-singapore-written-law",
      "criminal-procedure-code-2010",
      "evidence-act-1893",
      "misuse-of-drugs-act-1973",
      "adili-chibuike-2019",
      "hue-an-li-2014",
      "kho-jabing-2015",
    ],
    sourceUrl: `${SSO}/PC1871`,
    kind: "statute",
    content: `## What this written law is

The **Penal Code 1871** is Singapore’s main **criminal code**. It is primary legislation, not a judgment. Most “ordinary” criminal charges cite a Penal Code section; special statutes (for example the Misuse of Drugs Act) sit beside it.

## Structure of the Code

- **Chapter II** — general explanations (including fault vocabulary as amended).
- **Chapter IV** — general exceptions (private defence, unsoundness of mind, consent doctrines, and related defences).
- **Offence chapters** — offences against the State, public tranquillity, human body, property, reputation, documents, and sexual autonomy (as reformed by later amendments).

## Key sections (research digest)

### Fault and general rules
- **Knowledge, rashness, negligence** — modern fault language used across offence-creating provisions (see the Code’s general explanations as amended).
- **Chapter IV exceptions** — private defence, insanity/unsoundness pathways, and other excuses that can reduce or eliminate liability.

### Offences against the person
- **ss 299–300** — culpable homicide and murder definitions.
- **ss 302–304** — punishment for murder and culpable homicide not amounting to murder.
- **s 304A** — causing death by a rash or negligent act.
- **ss 319–338** — hurt, grievous hurt, and related endangerment offences.

### Dishonesty and property
- **ss 378–382** — theft and related.
- **ss 403–409** — criminal misappropriation and criminal breach of trust.
- **ss 415–420** — cheating and dishonest inducement.
- **ss 441–462** — criminal trespass and house-breaking cluster (as amended).

## How counsel uses it with other written law

1. Select the **charging section**.  
2. Check **Chapter IV** exceptions and fault.  
3. Apply [[criminal-procedure-code-2010|CPC 2010]] for investigation and trial.  
4. Prove the case under the [[evidence-act-1893|Evidence Act]].  
5. Use judgments such as [[hue-an-li-2014|Hue An Li]] (rashness vs negligence) or [[kho-jabing-2015|Kho Jabing]] only after the statutory elements are fixed.`,
  },
  {
    id: "criminal-procedure-code-2010",
    title: "Criminal Procedure Code 2010",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 2010,
    categoryPath: ["Statutes", "Criminal Codes"],
    tags: ["statute", "criminal-procedure", "bail", "sentencing", "written-law"],
    summary:
      "Principal criminal procedure statute: powers of investigation, arrest, charge, trial process, bail, community sentences framework, and criminal appeals. Pair every Penal Code or MDA charge with the CPC pathway that gets the case to court.",
    relatedIds: [
      "overview-singapore-written-law",
      "penal-code-1871",
      "misuse-of-drugs-act-1973",
      "evidence-act-1893",
      "adili-chibuike-2019",
    ],
    sourceUrl: `${SSO}/CPC2010`,
    kind: "statute",
    content: `## What this written law is

The **Criminal Procedure Code 2010 (CPC)** is the procedure code for almost all Singapore criminal prosecutions. Substantive guilt is usually in the Penal Code or a special Act; **how** the State investigates, charges, tries, and sentences is CPC territory.

## Key parts (digest)

- **Investigation and arrest** — police powers, statements, and production of accused persons.
- **Charge and trial** — framing of charges, joint trials, mode of trial in the State Courts and High Court.
- **Bail and remand** — when bail may be granted and conditions.
- **Evidence at trial** — interfaces with the Evidence Act; witnesses, exhibits, and formal admissions.
- **Sentencing powers** — imprisonment, fines, caning where authorised, and community-based sentences as provided.
- **Appeals and revisions** — pathways from the State Courts and High Court criminal jurisdiction.

## How counsel uses it

Cite the **CPC provision** for procedural complaints (defective charge, bail, discovery of statements, appellate competence). Cite the **Penal Code/MDA** for the offence itself. Use case law only to interpret ambiguous CPC language or constitutional limits on procedure.`,
  },
  {
    id: "misuse-of-drugs-act-1973",
    title: "Misuse of Drugs Act 1973",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 1973,
    categoryPath: ["Statutes", "Criminal Codes"],
    tags: ["statute", "drugs", "trafficking", "presumptions", "written-law"],
    summary:
      "Special criminal statute for controlled drugs. Creates trafficking and possession offences and reverse-onus presumptions (notably ss 17–18). Capital and other mandatory frameworks turn on drug type and weight. Always read with the Penal Code only where MDA is silent.",
    relatedIds: [
      "overview-singapore-written-law",
      "penal-code-1871",
      "criminal-procedure-code-2010",
      "adili-chibuike-2019",
    ],
    sourceUrl: `${SSO}/MDA1973`,
    kind: "statute",
    content: `## What this written law is

The **Misuse of Drugs Act 1973 (MDA)** is a complete special statute for controlled-drug crime. Trafficking prosecutions are MDA cases, not generic Penal Code possession theories.

## Key sections (digest)

- **s 5** — trafficking in a controlled drug (and related definitions of trafficking conduct).
- **s 8** — possession and consumption offences (as enacted/amended).
- **s 17** — presumption of trafficking from possession of a threshold quantity.
- **s 18** — presumptions of possession and knowledge when drugs are found in particular circumstances (subject to the constitutional and appellate limits developed in case law).
- **Schedules** — drug types, pure-weight thresholds, and penalty bands including capital tiers where applicable.

## How counsel uses it

1. Identify the **drug and weight**.  
2. Choose the correct **s 5 / s 8** charge theory.  
3. Test whether **ss 17–18** presumptions are properly engaged.  
4. Bring knowledge analysis from authorities such as [[adili-chibuike-2019|Adili]] only after the statutory presumption structure is understood.`,
  },
  {
    id: "evidence-act-1893",
    title: "Evidence Act 1893",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 1893,
    categoryPath: ["Statutes", "Procedure & Evidence"],
    tags: ["statute", "evidence", "procedure", "parol-evidence", "written-law"],
    summary:
      "Core evidence code for civil and criminal trials: relevance, admissions and confessions, witness competence, documentary evidence, and the parol evidence framework (ss 94–100) that interacts with contractual interpretation.",
    relatedIds: [
      "overview-singapore-written-law",
      "penal-code-1871",
      "criminal-procedure-code-2010",
      "zurich-insurance-2008",
      "sembcorp-marine-2013",
    ],
    sourceUrl: `${SSO}/EA1893`,
    kind: "statute",
    content: `## What this written law is

The **Evidence Act 1893** is Singapore’s evidence code. It applies in civil and criminal proceedings unless a later Act carves out a special rule.

## Key sections (digest)

- **ss 5–11** — what facts are relevant (including motive, preparation, conduct, and introductory facts).
- **Admissions and confessions cluster** — when out-of-court statements are receivable, especially against an accused.
- **ss 61–73A** — documentary evidence and electronic records framework (as amended).
- **ss 94–100** — exclusion of oral evidence to contradict written contracts and the limited exceptions; the statutory backbone of Singapore contract interpretation practice.
- **Witnesses** — competence, compellability, examination, and impeachment structure.

## How counsel uses it

- **Criminal:** pair with [[criminal-procedure-code-2010|CPC]] for statement-taking and with the offence statute for elements.  
- **Civil/contract:** start with **ss 94–100**, then [[zurich-insurance-2008|Zurich Insurance]] and [[sembcorp-marine-2013|Sembcorp Marine]] for the contextual approach and implication of terms.`,
  },
  {
    id: "civil-law-act-1909",
    title: "Civil Law Act 1909",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 1909,
    categoryPath: ["Statutes", "Civil & Commercial Codes"],
    tags: [
      "statute",
      "damages",
      "dependency-claims",
      "contributory-negligence",
      "written-law",
    ],
    summary:
      "Key civil statute for negligence quantum and fatal accidents: s 3 contributory negligence, s 12 survival of causes of action, ss 20–21 dependency claims. Complements common-law duty cases such as Spandeck.",
    relatedIds: [
      "overview-singapore-written-law",
      "spandeck-v-dsta-2007",
      "tv-media-v-de-cruz-2004",
      "workplace-safety-health-act-2006",
      "application-of-english-law-act-1993",
    ],
    sourceUrl: `${SSO}/CLA1909`,
    kind: "statute",
    content: `## What this written law is

The **Civil Law Act 1909** supplies statutory rules that common-law negligence does not invent from scratch: shared fault, survival of actions, and dependency claims on death.

## Key sections (digest)

- **s 3** — Where any person suffers damage as a result partly of his own fault and partly of another’s fault, damages are reduced to such extent as the court thinks just and equitable having regard to the claimant’s share in responsibility.
- **s 12** — On death, causes of action vested in the deceased generally survive for the benefit of the estate (with statutory exceptions).
- **ss 20–21** — Dependency claims by defined relatives for loss of support caused by a wrongful act that causes death.

## How counsel uses it

Plead **duty/breach/causation** from common law ([[spandeck-v-dsta-2007|Spandeck]]), then plead **s 3** if the defence alleges contributory negligence, and **ss 20–21 / s 12** in fatal cases. Workplace accidents may also engage [[workplace-safety-health-act-2006|WSHA]] duties.`,
  },
  {
    id: "companies-act-1967",
    title: "Companies Act 1967",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 1967,
    categoryPath: ["Statutes", "Civil & Commercial Codes"],
    tags: ["statute", "company-law", "directors-duties", "oppression", "written-law"],
    summary:
      "Principal companies statute: incorporation, share capital, directors’ duties (s 157), members’ remedies including minority oppression (s 216) and statutory derivative actions (s 216A), accounts, and winding-up interfaces with IRDA.",
    relatedIds: [
      "overview-singapore-written-law",
      "irda-2018",
      "sembcorp-marine-2013",
    ],
    sourceUrl: `${SSO}/CoA1967`,
    kind: "statute",
    content: `## What this written law is

The **Companies Act 1967** is the main corporate code. Most shareholder, director, and corporate authority disputes begin with a Companies Act section, not with a free-standing equitable claim alone.

## Key sections (digest)

- **Part III–IV** — incorporation, constitution of companies, capacity and powers.
- **s 157** — directors’ duties (skill, diligence, honesty; overlaps with general law fiduciary duties).
- **s 156** — disclosure of interests in transactions and conflicts machinery.
- **s 216** — minority oppression / disregard of interests remedy (buy-out and other court orders).
- **s 216A–216B** — statutory derivative action leave regime.
- **Accounts and audit Parts** — financial reporting duties of companies and officers.

## How counsel uses it

Frame oppression under **s 216**, director breach under **s 157** plus general law, and insolvency outcomes under [[irda-2018|IRDA]]. Use commercial cases only to illustrate how the statutory discretions are exercised.`,
  },
  {
    id: "irda-2018",
    title: "Insolvency, Restructuring and Dissolution Act 2018",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 2018,
    categoryPath: ["Statutes", "Civil & Commercial Codes"],
    tags: ["statute", "insolvency", "winding-up", "restructuring", "written-law"],
    summary:
      "Modern insolvency code for corporate rescue and liquidation: schemes, judicial management, winding up on inability to pay debts, and avoidance of undervalue or unfair preference transactions.",
    relatedIds: [
      "overview-singapore-written-law",
      "companies-act-1967",
    ],
    sourceUrl: `${SSO}/IRDA2018`,
    kind: "statute",
    content: `## What this written law is

The **Insolvency, Restructuring and Dissolution Act 2018 (IRDA)** is the corporate insolvency and restructuring code. Winding-up petitions, schemes of arrangement in distress, and clawback actions are IRDA problems first.

## Key themes (digest)

- **Winding up** — circumstances in which a company may be wound up by the Court, including inability to pay debts; standing of creditors and disputed-debt practice.
- **Restructuring tools** — schemes, moratoria, and judicial management pathways as enacted.
- **Avoidance provisions** — transactions at undervalue, unfair preferences, and related clawbacks within look-back periods.
- **Liquidators** — appointment, powers, and duties.

## How counsel uses it

Cite the **IRDA section** for standing, ground for winding up, and avoidance. Use Court of Appeal insolvency decisions only to interpret those sections (for example disputed-debt thresholds and liquidator duties).`,
  },
  {
    id: "international-arbitration-act-1994",
    title: "International Arbitration Act 1994",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 1994,
    categoryPath: ["Statutes", "Civil & Commercial Codes"],
    tags: ["statute", "arbitration", "model-law", "written-law"],
    summary:
      "Gives force of law to the UNCITRAL Model Law for international arbitrations seated in Singapore, and provides setting-aside and enforcement machinery (including s 24 and Model Law Art 34).",
    relatedIds: [
      "overview-singapore-written-law",
      "evidence-act-1893",
    ],
    sourceUrl: `${SSO}/IAA1994`,
    kind: "statute",
    content: `## What this written law is

The **International Arbitration Act 1994 (IAA)** is the written framework for international arbitrations in Singapore. Court intervention is deliberately limited to the grounds Parliament and the Model Law allow.

## Key sections (digest)

- **s 3** — Model Law has the force of law in Singapore (with scheduled modifications).
- **Model Law Art 34** — exclusive recourse against an award for a seat court (setting aside).
- **s 24** — additional setting-aside grounds as provided in the IAA (including fraud and breach of natural justice as enacted).
- **Enforcement Parts** — recognition and enforcement of foreign awards (New York Convention architecture).

## How counsel uses it

For set-aside or enforcement, start with **IAA + Model Law articles**, not with free-standing common-law natural justice theories. Case law only illustrates those statutory gateways.`,
  },
  {
    id: "defamation-act-1957",
    title: "Defamation Act 1957",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 1957,
    categoryPath: ["Statutes", "Civil & Commercial Codes"],
    tags: ["statute", "defamation", "reputation", "written-law"],
    summary:
      "Statutory overlay on the common law of defamation: offers of amends, certain privilege and newspaper rules, and mitigation. Substantive defamation still draws heavily on common law, but pleadings should track this Act where it applies.",
    relatedIds: [
      "overview-singapore-written-law",
      "protection-from-harassment-act-2014",
      "constitution-sg",
    ],
    sourceUrl: `${SSO}/DA1957`,
    kind: "statute",
    content: `## What this written law is

The **Defamation Act 1957** modifies and supplements the received common law of libel and slander. It is not a complete code, but several defences and procedural devices are statutory.

## Key themes (digest)

- **Broadcast and publication rules** — how certain publications are treated for libel/slander classification.
- **Privilege and reports** — statutory qualified privilege for specified reports and proceedings.
- **Offers of amends** — structured mitigation and settlement pathway.
- **Damages mitigation** — statutory avenues to reduce damages where apology or amends are made.

## How counsel uses it

Plead common-law elements of defamatory meaning, reference, and publication, then slot **Defamation Act** defences or mitigation. Consider parallel [[protection-from-harassment-act-2014|POHA]] claims for online harassment-style facts.`,
  },
  {
    id: "protection-from-harassment-act-2014",
    title: "Protection from Harassment Act 2014",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 2014,
    categoryPath: ["Statutes", "Civil & Commercial Codes"],
    tags: ["statute", "harassment", "online-harm", "written-law"],
    summary:
      "Modern written law against harassment, causing fear or provocation of violence, and knowingly publishing false statements of fact about a person. Provides criminal offences and civil remedies including protection orders.",
    relatedIds: [
      "overview-singapore-written-law",
      "defamation-act-1957",
      "penal-code-1871",
    ],
    sourceUrl: `${SSO}/PHA2014`,
    kind: "statute",
    content: `## What this written law is

The **Protection from Harassment Act 2014 (POHA)** is a purpose-built statute for harassment and certain online falsehoods aimed at persons. It sits beside defamation and Penal Code offences against the person.

## Key themes (digest)

- **Harassment offences** — intentionally causing harassment, alarm, or distress by prescribed courses of conduct.
- **Fear or provocation of violence** — related offence pathways.
- **False statements of fact** — civil and criminal routes where a person publishes a false statement of fact about a target (as amended).
- **Protection orders** — court orders to stop continuing harassment, including expedited forms where available.

## How counsel uses it

Identify whether the facts are better charged or claimed under **POHA**, the [[defamation-act-1957|Defamation Act]], or the [[penal-code-1871|Penal Code]], then plead the matching statutory elements.`,
  },
  {
    id: "womens-charter-1961",
    title: "Women's Charter 1961",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 1961,
    categoryPath: ["Statutes", "Family Law"],
    tags: ["statute", "family", "division-of-assets", "maintenance", "written-law"],
    summary:
      "Principal family statute for non-Muslim marriages: solemnisation, divorce, s 112 just and equitable division of matrimonial assets, maintenance, and children’s orders. Family litigation is statute-first.",
    relatedIds: [
      "overview-singapore-written-law",
      "anj-v-ans-2015",
      "tnl-v-tnk-2017",
      "uda-v-udb-2018",
    ],
    sourceUrl: `${SSO}/WC1961`,
    kind: "statute",
    content: `## What this written law is

The **Women’s Charter 1961** is the core family code for civil marriages in Singapore. Division of assets, maintenance, and many children’s issues are **section-driven**.

## Key sections (digest)

- **Part X** — divorce, judicial separation, and nullity framework.
- **s 112** — court shall order division of matrimonial assets in such proportions as is just and equitable, having regard to listed factors (including contributions and needs of children).
- **ss 113–127** — maintenance of wife/incapacitated husband and children; enforcement tools.
- **Children provisions** — custody, care and control, access, and welfare principle as enacted.
- **Chapter 4A (ss 121A–G)** — financial relief after foreign matrimonial proceedings (as introduced/amended).

## How counsel uses it

Open with **s 112** (or the maintenance/children section in play), then apply structured case law such as [[anj-v-ans-2015|ANJ v ANS]] and [[tnl-v-tnk-2017|TNL v TNK]] to the statutory discretion.`,
  },
  {
    id: "employment-act-1968",
    title: "Employment Act 1968",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 1968,
    categoryPath: ["Statutes", "Employment & Workplace"],
    tags: ["statute", "employment", "termination", "salary", "written-law"],
    summary:
      "Baseline employment statute for employees within its scope: notice (ss 10–11), dismissal (s 14), salary payment, rest days and hours. Restraint of trade remains largely common law.",
    relatedIds: [
      "overview-singapore-written-law",
      "workplace-safety-health-act-2006",
      "mano-vikrant-singh-2012",
      "lek-gwee-noi-2014",
    ],
    sourceUrl: `${SSO}/EmA1968`,
    kind: "statute",
    content: `## What this written law is

The **Employment Act 1968** sets statutory floors for covered employees. It does not exhaust employment law: common-law contract and restraint-of-trade doctrines still matter for many executives.

## Key sections (digest)

- **ss 10–11** — notice of termination by employer or employee and payment in lieu.
- **s 14** — dismissal; inquiries and related protections as enacted.
- **Part III** — payment of salary, authorised deductions, time of payment.
- **Part IV** — rest days, hours of work, overtime for categories still covered by those caps.
- **Maternity and childcare-related provisions** — as amended over time.

## How counsel uses it

Check **scope** (who is an “employee” under the Act) first. Plead statutory contraventions for salary/notice/hours; plead contract and [[mano-vikrant-singh-2012|Mano Vikrant Singh]] / [[lek-gwee-noi-2014|Lek Gwee Noi]] for non-competes.`,
  },
  {
    id: "workplace-safety-health-act-2006",
    title: "Workplace Safety and Health Act 2006",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 2006,
    categoryPath: ["Statutes", "Employment & Workplace"],
    tags: [
      "statute",
      "workplace-safety",
      "employer-duties",
      "negligence",
      "written-law",
    ],
    summary:
      "Primary workplace safety statute: duties of employers, principals, occupiers, and other duty-holders to take reasonably practicable measures for safety and health at work, including safe systems of work. Critical for industrial accident and deposition analysis.",
    relatedIds: [
      "overview-singapore-written-law",
      "civil-law-act-1909",
      "employment-act-1968",
      "spandeck-v-dsta-2007",
      "see-toh-siew-kee-2013",
    ],
    sourceUrl: `${SSO}/WSHA2006`,
    kind: "statute",
    content: `## What this written law is

The **Workplace Safety and Health Act 2006 (WSHA)** is the modern industrial safety code. Many worksite injury cases are both common-law negligence claims and **WSHA duty** problems.

## Key duties (digest)

- **Employers** — duty to take reasonably practicable measures to ensure safety and health of employees at work, including safe work environment, adequate instruction, and safe systems.
- **Principals** — duties toward contractors and workers under their direction in defined circumstances.
- **Occupiers** — duties regarding the workplace premises.
- **Manufacturers/suppliers** — duties regarding machinery and hazardous substances as enacted.
- **Offences and codes of practice** — criminal enforcement and the role of approved codes in gauging reasonably practicable steps.

## How counsel uses it

In deposition or liability analysis, map facts to **specific WSHA duty-holders**, then to civil claims under [[spandeck-v-dsta-2007|Spandeck]] / [[see-toh-siew-kee-2013|See Toh]] and quantum under [[civil-law-act-1909|Civil Law Act s 3]].`,
  },
  {
    id: "bmsma-2004",
    title: "Building Maintenance and Strata Management Act 2004",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 2004,
    categoryPath: ["Statutes", "Property Law"],
    tags: ["statute", "strata", "common-property", "by-laws", "written-law"],
    summary:
      "Strata living code: definition of common property, functions of management corporations, by-laws, contributions, and dispute pathways for subsidiary proprietors.",
    relatedIds: [
      "overview-singapore-written-law",
      "land-titles-act-1993",
      "sit-kwong-lam-2018",
    ],
    sourceUrl: `${SSO}/BMSMA2004`,
    kind: "statute",
    content: `## What this written law is

The **Building Maintenance and Strata Management Act 2004 (BMSMA)** governs strata developments and management corporations. Disputes about common property and by-laws are BMSMA problems first.

## Key sections (digest)

- **s 2** — definitions, including **common property**.
- **Management corporation Parts** — constitution, duties, meetings, and financial management.
- **By-laws** — making, effect, and enforcement against subsidiary proprietors and occupiers.
- **Contributions and recovery** — maintenance contributions and enforcement tools.
- **Dispute resolution** — specialised pathways as provided (including board/court routes depending on the dispute type).

## How counsel uses it

Start with the **definition of common property** and the MC’s statutory duty, then use [[sit-kwong-lam-2018|Sit Kwong Lam]] and related cases only to interpret those provisions.`,
  },
  {
    id: "land-titles-act-1993",
    title: "Land Titles Act 1993",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 1993,
    categoryPath: ["Statutes", "Property Law"],
    tags: ["statute", "land", "torrens", "registration", "written-law"],
    summary:
      "Torrens registration statute for land in Singapore: registration confers title, indefeasibility subject to statutory exceptions, and caveat machinery to protect unregistered interests.",
    relatedIds: [
      "overview-singapore-written-law",
      "bmsma-2004",
    ],
    sourceUrl: `${SSO}/LTA1993`,
    kind: "statute",
    content: `## What this written law is

The **Land Titles Act 1993** is the Torrens statute. Ownership of registered land is a **folio and registration** question before it is a pure equity story.

## Key themes (digest)

- **Registration principle** — title passes by registration, not by deed alone.
- **Indefeasibility** — registered proprietors take free of unregistered interests subject to express exceptions (fraud, overriding interests as enacted).
- **Caveats** — mechanism to warn of and protect unregistered claims.
- **Transfers, mortgages, leases** — prescribed instruments and priority rules.

## How counsel uses it

Identify the **registered interest** and any **caveat**, then apply the statutory exception relied on. Equity follows the statute; it does not replace it.`,
  },
  {
    id: "supreme-court-of-judicature-act-1969",
    title: "Supreme Court of Judicature Act 1969",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 1969,
    categoryPath: ["Statutes", "Procedure & Evidence"],
    tags: ["statute", "courts", "jurisdiction", "appeals", "written-law"],
    summary:
      "Constitution of the Supreme Court (Court of Appeal and High Court), civil and criminal jurisdiction, and key appeal pathways. Read with the Constitution’s judicial-power articles.",
    relatedIds: [
      "overview-singapore-written-law",
      "constitution-sg",
      "criminal-procedure-code-2010",
      "evidence-act-1893",
    ],
    sourceUrl: `${SSO}/SCJA1969`,
    kind: "statute",
    content: `## What this written law is

The **Supreme Court of Judicature Act 1969 (SCJA)** is the main statute for Supreme Court structure and jurisdiction. Forum, appeal rights, and many High Court powers start here.

## Key themes (digest)

- **Court structure** — Court of Appeal and High Court (including specialised divisions as provided).
- **Civil jurisdiction** — original and appellate civil jurisdiction of the High Court and Court of Appeal.
- **Criminal jurisdiction** — High Court original criminal jurisdiction and appellate criminal routes as enacted.
- **Ancillary powers** — inherent and statutory case-management powers of the courts.

## How counsel uses it

Cite **SCJA** for competence and appeal routes; cite the **CPC** for criminal procedure steps and the **Evidence Act** for proof.`,
  },
  {
    id: "personal-data-protection-act-2012",
    title: "Personal Data Protection Act 2012",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 2012,
    categoryPath: ["Statutes", "Civil & Commercial Codes"],
    tags: ["statute", "data-protection", "privacy", "written-law"],
    summary:
      "Singapore’s general data protection statute: consent, purpose limitation, access and correction, and protection obligations for organisations handling personal data, with PDPC enforcement.",
    relatedIds: [
      "overview-singapore-written-law",
      "protection-from-harassment-act-2014",
      "constitution-sg",
    ],
    sourceUrl: `${SSO}/PDPA2012`,
    kind: "statute",
    content: `## What this written law is

The **Personal Data Protection Act 2012 (PDPA)** is the baseline privacy and data-protection code for private-sector organisations in Singapore (subject to exclusions).

## Key themes (digest)

- **Consent and notification** — collecting, using, and disclosing personal data with consent or under recognised exceptions.
- **Purpose limitation** — use only for purposes a reasonable person would consider appropriate.
- **Access and correction** — individual rights to access and correct personal data.
- **Protection and retention** — security arrangements and retention limitation.
- **Enforcement** — PDPC investigations, directions, and financial penalties as enacted.

## How counsel uses it

Identify the **organisation**, the **personal data**, and the **activity** (collect/use/disclose), then map to the matching PDPA obligation or exception.`,
  },
  {
    id: "computer-misuse-act-1993",
    title: "Computer Misuse Act 1993",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 1993,
    categoryPath: ["Statutes", "Criminal Codes"],
    tags: ["statute", "cybercrime", "computer-misuse", "written-law"],
    summary:
      "Cybercrime statute: unauthorised access, modification, interception, and related computer offences. Charged beside or instead of Penal Code property offences when the medium is a computer system.",
    relatedIds: [
      "overview-singapore-written-law",
      "penal-code-1871",
      "criminal-procedure-code-2010",
      "personal-data-protection-act-2012",
    ],
    sourceUrl: `${SSO}/CMA1993`,
    kind: "statute",
    content: `## What this written law is

The **Computer Misuse Act 1993 (CMA)** creates specific computer-related offences. It is a special criminal statute, not a substitute for the entire Penal Code.

## Key themes (digest)

- **Unauthorised access** — securing access to computer material without authority.
- **Modification and interference** — unauthorised modification of computer material and related impairment offences.
- **Interception and misuse of devices** — as enacted in later amendments.
- **Aggravating contexts** — enhanced penalties for critical information infrastructure and similar contexts where provided.

## How counsel uses it

Prefer **CMA sections** for pure computer intrusion facts; use the **Penal Code** for underlying dishonesty or harm, and the **CPC** for procedure.`,
  },
  {
    id: "prevention-of-corruption-act-1960",
    title: "Prevention of Corruption Act 1960",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 1960,
    categoryPath: ["Statutes", "Criminal Codes"],
    tags: ["statute", "corruption", "bribery", "written-law"],
    summary:
      "Principal anti-corruption statute: corrupt gratification offences, presumption provisions in defined circumstances, and CPIB investigation architecture. Core white-collar charging statute.",
    relatedIds: [
      "overview-singapore-written-law",
      "penal-code-1871",
      "criminal-procedure-code-2010",
      "evidence-act-1893",
    ],
    sourceUrl: `${SSO}/PCA1960`,
    kind: "statute",
    content: `## What this written law is

The **Prevention of Corruption Act 1960 (PCA)** is Singapore’s main bribery and corruption code, enforced primarily through the Corrupt Practices Investigation Bureau.

## Key themes (digest)

- **Corrupt gratification** — giving and receiving gratification as an inducement or reward.
- **Agent offences** — corruption in principal–agent relationships.
- **Presumptions** — evidentiary presumptions in specified factual patterns (as enacted).
- **Investigation powers** — special investigation framework supporting CPIB work.

## How counsel uses it

Charge and defend under the **PCA section** first; use the **Evidence Act** and **CPC** for proof and procedure; use the Penal Code only where a non-PCA offence is also disclosed.`,
  },
  {
    id: "road-traffic-act-1961",
    title: "Road Traffic Act 1961",
    citation: "2020 Rev Ed",
    court: "Parliament",
    year: 1961,
    categoryPath: ["Statutes", "Criminal Codes"],
    tags: ["statute", "road-traffic", "driving", "written-law"],
    summary:
      "Road traffic code: licensing, construction and use, dangerous and careless driving, and related offences. Fatal driving cases often combine RTA charges with Penal Code s 304A analysis.",
    relatedIds: [
      "overview-singapore-written-law",
      "penal-code-1871",
      "criminal-procedure-code-2010",
      "hue-an-li-2014",
    ],
    sourceUrl: `${SSO}/RTA1961`,
    kind: "statute",
    content: `## What this written law is

The **Road Traffic Act 1961 (RTA)** regulates vehicles, drivers, and road use. Many traffic prosecutions are pure RTA cases; death or serious injury cases may also engage the Penal Code.

## Key themes (digest)

- **Licensing and vehicle standards** — authority to drive and vehicle construction/use rules.
- **Dangerous and careless driving** — core behavioural offences as enacted.
- **Drink/drug driving cluster** — specialised offences and evidential regimes.
- **Penalties** — fines, disqualification, and imprisonment bands.

## How counsel uses it

Identify whether the charge is **RTA-only** or also **Penal Code s 304A** (causing death by rash/negligent act). Use [[hue-an-li-2014|Hue An Li]] for the rashness/negligence distinction when death is charged under the Code.`,
  },
];
