"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  MessagesSquare,
  Minimize2,
  Sparkles,
  Square,
  WifiOff,
  X,
} from "lucide-react";
import type { AtlasIndex } from "./lib/atlas-data";
import { localAnswer, streamChat, type ChatCitation, type ChatMessage } from "./lib/chat";
import { extractCitedDocIds } from "./lib/linkify-citations";
import { MarkdownView } from "./markdown-view";
import { cn } from "@/components/ui/cn";

const SUGGESTIONS = [
  "What is the test for a duty of care in Singapore?",
  "How does the Penal Code define rashness versus negligence?",
  "How are matrimonial assets divided under s 112 of the Women's Charter?",
  "What duties does the Workplace Safety and Health Act impose on employers?",
];

let messageCounter = 0;
const nextId = () => `m${++messageCounter}`;

export function ChatDock({
  index,
  open,
  onOpenChange,
  contextDocId,
  onClearContext,
  onOpenDoc,
  pendingPrompt,
  onPromptConsumed,
}: {
  index: AtlasIndex;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contextDocId: string | null;
  onClearContext: () => void;
  onOpenDoc: (id: string) => void;
  pendingPrompt: string | null;
  onPromptConsumed: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const contextDoc = contextDocId ? index.docsById.get(contextDocId) : null;

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || streaming) return;

      const userMessage: ChatMessage = { id: nextId(), role: "user", content: trimmed };
      const replyId = nextId();
      const history = [...messages, userMessage].map(({ role, content }) => ({ role, content }));

      setMessages((current) => [
        ...current,
        userMessage,
        { id: replyId, role: "assistant", content: "" },
      ]);
      setInput("");
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const update = (updater: (message: ChatMessage) => ChatMessage) =>
        setMessages((current) =>
          current.map((message) => (message.id === replyId ? updater(message) : message)),
        );

      const onDelta = (text: string) =>
        update((message) => ({ ...message, content: message.content + text }));
      const onCitations = (citations: ChatCitation[]) =>
        update((message) => ({
          ...message,
          citations: mergeCitations(message.citations, citations),
        }));

      try {
        const served = await streamChat({
          messages: history,
          docId: contextDocId,
          signal: controller.signal,
          onDelta,
          onCitations,
        });

        if (!served && !controller.signal.aborted) {
          update((message) => ({ ...message, offline: true }));
          await localAnswer(trimmed, index, contextDocId, {
            onDelta,
            onCitations,
            signal: controller.signal,
          });
        }

        // Harvest any inline [[docId]] / neutral cites the model put in the body
        // so the footer chips always match what is clickable mid-answer.
        if (!controller.signal.aborted) {
          update((message) => {
            const fromBody = citationsFromContent(message.content, index);
            return {
              ...message,
              citations: mergeCitations(message.citations, fromBody),
            };
          });
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [contextDocId, index, messages, streaming],
  );

  useEffect(() => {
    if (!pendingPrompt) return;
    onPromptConsumed();
    onOpenChange(true);
    setInput(pendingPrompt);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [onOpenChange, onPromptConsumed, pendingPrompt]);

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full border border-accent-line bg-accent px-4 py-3 text-sm font-semibold text-accent-ink shadow-lg transition-transform hover:scale-[1.02] sm:right-6 sm:bottom-6"
      >
        <MessagesSquare aria-hidden className="size-4" />
        Ask the atlas
        <span className="hidden rounded bg-black/15 px-1.5 py-0.5 font-mono text-[10px] sm:inline">
          ⌘J
        </span>
      </button>
    );
  }

  return (
    <section
      aria-label="Ask the atlas"
      className={cn(
        "fixed z-40 flex flex-col overflow-hidden border border-line bg-panel panel-shadow",
        "inset-x-0 bottom-0 h-[80dvh] rounded-t-2xl",
        "sm:inset-auto sm:right-6 sm:bottom-6 sm:h-[min(34rem,80dvh)] sm:w-[24.5rem] sm:rounded-xl",
      )}
    >
      <header className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <span className="flex size-6 items-center justify-center rounded-md bg-accent-wash text-accent">
          <Sparkles aria-hidden className="size-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] leading-tight font-semibold text-ink">Atlas counsel</h2>
          <p className="truncate text-[10.5px] text-faint">
            Grounded in Singapore written law &amp; cases
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="rounded-md p-1.5 text-faint transition-colors hover:bg-sunken hover:text-ink"
        >
          <Minimize2 aria-hidden className="size-4" />
          <span className="sr-only">Minimise chat</span>
        </button>
      </header>

      {contextDoc ? (
        <div className="flex items-center gap-1.5 border-b border-line bg-sunken px-3 py-1.5">
          <span className="eyebrow shrink-0">Context</span>
          <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted">
            {contextDoc.title}
          </span>
          <button
            type="button"
            onClick={onClearContext}
            className="rounded p-0.5 text-faint hover:text-ink"
          >
            <X aria-hidden className="size-3" />
            <span className="sr-only">Remove document context</span>
          </button>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3"
      >
        {messages.length === 0 ? (
          <div className="pt-2">
            <p className="text-[13px] leading-relaxed text-muted">
              Ask about doctrine, a specific authority, or how a line of cases developed.
              Answers cite documents in the atlas so you can open them directly.
            </p>
            <div className="mt-3 flex flex-col gap-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  className="rounded-lg border border-line px-2.5 py-2 text-left text-[12px] text-muted transition-colors hover:border-accent-line hover:bg-accent-wash hover:text-ink"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message}
              index={index}
              onOpenDoc={onOpenDoc}
              streaming={streaming}
            />
          ))
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
        className="border-t border-line p-2"
      >
        <div className="flex items-end gap-1.5 rounded-lg border border-line bg-surface p-1.5 focus-within:border-accent-line">
          <label htmlFor="atlas-chat-input" className="sr-only">
            Ask a question about Singapore law
          </label>
          <textarea
            id="atlas-chat-input"
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              event.target.style.height = "auto";
              event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(input);
              }
            }}
            placeholder="Ask about a doctrine or authority…"
            className="max-h-30 min-h-8 flex-1 resize-none bg-transparent px-1.5 py-1 text-[13px] text-ink placeholder:text-faint focus:outline-none"
          />
          {streaming ? (
            <button
              type="button"
              onClick={stop}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-line text-muted transition-colors hover:bg-sunken hover:text-ink"
            >
              <Square aria-hidden className="size-3.5" />
              <span className="sr-only">Stop generating</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-ink transition-opacity hover:opacity-90 disabled:opacity-30"
            >
              <ArrowUp aria-hidden className="size-4" />
              <span className="sr-only">Send question</span>
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function ChatBubble({
  message,
  index,
  onOpenDoc,
  streaming,
}: {
  message: ChatMessage;
  index: AtlasIndex;
  onOpenDoc: (id: string) => void;
  streaming: boolean;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-sm border border-accent-line bg-accent-wash px-3 py-2 text-[13px] leading-relaxed text-ink">
          {message.content}
        </p>
      </div>
    );
  }

  const empty = message.content.length === 0;

  return (
    <div className="animate-fade-up">
      {message.offline ? (
        <p className="mb-1.5 inline-flex items-center gap-1 rounded border border-line px-1.5 py-0.5 text-[10px] text-faint">
          <WifiOff aria-hidden className="size-2.5" />
          offline retrieval
        </p>
      ) : null}
      {empty && streaming ? (
        <p className="flex items-center gap-1 py-1" aria-label="Thinking">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="typing-dot size-1.5 rounded-full bg-faint"
              style={{ animationDelay: `${i * 0.18}s` }}
            />
          ))}
        </p>
      ) : (
        <div className="text-[13px] [&_.prose-legal]:text-[13px] [&_.prose-legal]:leading-relaxed [&_.prose-legal_h2]:text-sm [&_.prose-legal_h3]:text-[13px]">
          <MarkdownView
            content={message.content}
            index={index}
            onOpenDoc={onOpenDoc}
            linkifyCitations
          />
        </div>
      )}
      {message.citations && message.citations.length > 0 ? (
        <div className="mt-2">
          <p className="mb-1 text-[10px] font-medium tracking-wide text-faint uppercase">
            Open cited papers
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {message.citations.map((citation) => (
              <li key={citation.docId}>
                <button
                  type="button"
                  onClick={() => onOpenDoc(citation.docId)}
                  title={citation.title}
                  className="inline-flex max-w-56 items-center gap-1 truncate rounded-full border border-line bg-sunken px-2 py-0.5 text-[10.5px] text-muted transition-colors hover:border-accent-line hover:text-ink"
                >
                  <span className="truncate">{citation.title}</span>
                  {citation.citation ? (
                    <span className="shrink-0 font-mono text-faint">{citation.citation}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function mergeCitations(
  existing: ChatCitation[] | undefined,
  incoming: ChatCitation[],
): ChatCitation[] {
  const map = new Map<string, ChatCitation>();
  for (const item of existing ?? []) map.set(item.docId, item);
  for (const item of incoming) {
    if (!item.docId) continue;
    const prior = map.get(item.docId);
    map.set(item.docId, {
      docId: item.docId,
      title: item.title || prior?.title || item.docId,
      citation: item.citation || prior?.citation || "",
    });
  }
  return [...map.values()];
}

function citationsFromContent(content: string, index: AtlasIndex): ChatCitation[] {
  return extractCitedDocIds(content, index).map((docId) => {
    const node = index.docsById.get(docId);
    return {
      docId,
      title: node?.title ?? docId,
      citation: node?.citation ?? "",
    };
  });
}
