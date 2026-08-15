import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-sunken px-1.5 py-0.5 font-mono text-[10px] leading-none text-faint">
      {children}
    </kbd>
  );
}

export function Chip({
  children,
  color,
  active,
  className,
}: {
  children: ReactNode;
  color?: string;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] leading-5 whitespace-nowrap",
        active
          ? "border-accent-line bg-accent-wash text-ink"
          : "border-line bg-panel text-muted",
        className,
      )}
    >
      {color ? (
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full"
          style={{ background: color }}
        />
      ) : null}
      {children}
    </span>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
  size?: "sm" | "md";
};

export function IconButton({
  label,
  active,
  size = "md",
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border text-muted transition-colors",
        "hover:border-line-strong hover:bg-sunken hover:text-ink",
        active ? "border-accent-line bg-accent-wash text-ink" : "border-transparent",
        size === "sm" ? "size-7" : "size-8",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-3.5 animate-spin rounded-full border-2 border-line border-t-accent",
        className,
      )}
    />
  );
}

export function SectionLabel({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 pt-4 pb-2">
      <h3 className="eyebrow">{children}</h3>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      {icon ? <div className="text-faint">{icon}</div> : null}
      <p className="text-sm font-medium text-muted">{title}</p>
      {hint ? <p className="max-w-[34ch] text-xs leading-relaxed text-faint">{hint}</p> : null}
    </div>
  );
}
