"use client";

import { useCallback, useRef, useState } from "react";
import { FileText, UploadCloud } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Spinner } from "@/components/ui/primitives";

export function Dropzone({
  onFile,
  busy,
  compact,
}: {
  onFile: (file: File) => void;
  busy: boolean;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        event.preventDefault();
        depth.current -= 1;
        if (depth.current <= 0) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        depth.current = 0;
        setDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-colors",
        dragging ? "border-accent bg-accent-wash" : "border-line bg-panel hover:border-line-strong",
        compact ? "p-4" : "p-8 sm:p-12",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
        className="sr-only"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <div className={cn("flex items-center gap-4", compact ? "flex-row" : "flex-col text-center")}>
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full border border-line bg-sunken text-muted",
            compact ? "size-10" : "size-14",
          )}
        >
          {busy ? (
            <Spinner />
          ) : dragging ? (
            <FileText className={compact ? "size-5" : "size-6"} />
          ) : (
            <UploadCloud className={compact ? "size-5" : "size-6"} />
          )}
        </span>

        <div className={cn("min-w-0", compact ? "flex-1 text-left" : "")}>
          <p className={cn("font-semibold text-ink", compact ? "text-[13px]" : "text-base")}>
            {busy ? "Reading the transcript…" : "Drop a deposition here"}
          </p>
          <p
            className={cn(
              "text-muted",
              compact ? "text-[11.5px]" : "mt-1 text-[13px] leading-relaxed",
            )}
          >
            PDF or plain text, parsed in your browser. Nothing is uploaded until you run live
            OpenRouter analysis and accept the disclosure.
          </p>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "shrink-0 rounded-md bg-accent px-3.5 py-2 text-[13px] font-semibold text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-40",
            compact ? "" : "mt-4",
          )}
        >
          Choose file
        </button>
      </div>
    </div>
  );
}
