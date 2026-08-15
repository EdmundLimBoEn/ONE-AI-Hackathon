# Singapore Law Atlas corpus pipeline

The pipeline turns public Singapore judgments into an R2-backed markdown vault and a Vectorize search index. It is resumable and has an offline fixture mode for development.

## Quick offline run

From the repository root:

```bash
bun pipeline/scrape.ts --offline
bun pipeline/enrich.ts --offline
bun pipeline/overviews.ts --offline
bun pipeline/index.ts
bun pipeline/upload.ts --dry-run
bun pipeline/embed.ts --dry-run
```

This copies three fixture judgments into `pipeline/raw/`, builds the vault in `pipeline/vault/`, and writes `pipeline/generated/graph.json` and `tree.json`.

## Live corpus run

```bash
# Conservative 20-case integration pilot
bun pipeline/scrape.ts --pilot --delay-ms 1500

# Resume toward the 300-case target (cached pages and documents are reused)
bun pipeline/scrape.ts --target 300 --recent-pages 40 --delay-ms 1500

# OPENROUTER_API_KEY is read from the environment and never logged
bun pipeline/enrich.ts --concurrency 2
bun pipeline/overviews.ts --llm
bun pipeline/index.ts
```

The curated seeds in `config/seeds.json` cover negligence, contract, employment, personal injury, medical negligence, defamation, company/director liability, drugs, dishonesty, offences against the person, evidence, and sentencing. Recent listing pages fill the remaining target. Failed enrichment entries are recorded in `.progress/enrich.json`; rerunning retries failures and skips completed work. Use `--force` to regenerate completed notes.

The scraper caches source HTML before parsing, waits at least 750 ms between requests, sends an identifying user agent, retries transient failures, and stops listing discovery cleanly if the public markup or service changes. Before a large run, check the source site's current terms, robots policy, and publication restrictions. Do not use this tool to bypass access controls or collect restricted material.

## Upload and embeddings

Preview all R2 keys without changing Cloudflare:

```bash
bun pipeline/upload.ts --dry-run --bucket law-vault
```

Upload the vault plus `indexes/graph.json` and `indexes/tree.json`:

```bash
bun pipeline/upload.ts --bucket law-vault
```

Preview chunk counts, then embed through the Workers AI REST API and insert batches with Wrangler:

```bash
bun pipeline/embed.ts --dry-run --index law-corpus --dimensions 768
bun pipeline/embed.ts --index law-corpus --dimensions 768
```

Embedding requires `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. The primary model is `@cf/baai/bge-m3`. Because its output dimension may not match a 768-dimension index, the script detects the returned dimension and automatically retries that batch with `@cf/baai/bge-base-en-v1.5`. Keep the query embedding path configured with the same 768-dimensional fallback behavior.

Use `--local` with upload to target Wrangler's local R2 storage. Wrangler's Vectorize insert command targets the configured remote index. Generated NDJSON batches stay under `.cache/` so an interrupted Vectorize run can be inspected without printing vectors or credentials.

## Tests

```bash
bun test pipeline
```

The parser tests use saved, minimal HTML fixtures and never contact eLitigation.

This project is a research aid, not legal advice. Always verify a judgment against the official source and check for subsequent appellate treatment.
