export function hasFlag(name: string): boolean {
  return Bun.argv.includes(`--${name}`);
}

export function option(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = Bun.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = Bun.argv.indexOf(`--${name}`);
  return index >= 0 ? Bun.argv[index + 1] ?? fallback : fallback;
}

export function numberOption(name: string, fallback: number): number {
  const value = Number(option(name, String(fallback)));
  if (!Number.isFinite(value) || value < 0) throw new Error(`--${name} must be a positive number`);
  return value;
}

export async function sleep(ms: number): Promise<void> {
  await Bun.sleep(ms);
}

export function safeSlug(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
    .slice(0, 100) || "document";
}

export function log(message: string): void {
  process.stdout.write(`${message}\n`);
}
