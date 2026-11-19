"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ChatMessagePart, ChatToolSummary } from "@/lib/chat/message-parts";

type ToolPart = Extract<ChatMessagePart, { type: "tool" }>;

function titleFor(part: ToolPart): string {
  if (part.status === "pending") return `${part.tool} · выполняем…`;
  if (part.status === "error") return `${part.tool} · ошибка`;
  if (!part.summary) return part.tool;
  switch (part.summary.tool) {
    case "repo.read":
      return `${part.tool} · ${part.summary.path}`;
    case "repo.search":
      return `${part.tool} · «${part.summary.query}»`;
    case "repo.list":
      return `${part.tool} · ${part.summary.owner}`;
    default:
      return part.tool;
  }
}

function MetaRows({ summary }: { summary: ChatToolSummary }) {
  if (summary.tool === "repo.list") {
    return (
      <dl className="mt-2 grid gap-1 text-[#a9a396] sm:grid-cols-2">
        <div>
          <span className="text-[#7a7468]">owner </span>
          {summary.owner}
        </div>
        <div>
          <span className="text-[#7a7468]">репозиториев </span>
          {summary.repoCount}
        </div>
      </dl>
    );
  }
  if (summary.tool === "repo.search") {
    return (
      <dl className="mt-2 grid gap-1 text-[#a9a396] sm:grid-cols-2">
        <div>
          <span className="text-[#7a7468]">repo </span>
          {summary.owner}/{summary.repo}
        </div>
        <div>
          <span className="text-[#7a7468]">совпадений </span>
          {summary.matchCount}
        </div>
      </dl>
    );
  }
  return (
    <dl className="mt-2 grid gap-1 text-[#a9a396] sm:grid-cols-2">
      <div>
        <span className="text-[#7a7468]">repo </span>
        {summary.owner}/{summary.repo}
      </div>
      <div>
        <span className="text-[#7a7468]">тип </span>
        {summary.kind}
      </div>
      {typeof summary.lines === "number" && (
        <div>
          <span className="text-[#7a7468]">строк </span>
          {summary.lines}
        </div>
      )}
    </dl>
  );
}

export function ToolCallCard({ part }: { part: ToolPart }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3 w-full rounded-xl border border-[#3d362c] bg-[#0c0c0a] p-3 text-[12px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#c6a46a]">{titleFor(part)}</p>
        {part.status === "ok" && part.summary && (
          <Button
            type="button"
            variant="ghost"
            className="h-7 px-2 text-[11px] text-[#cbb98e] hover:bg-[#1a1611]"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "Свернуть" : "Превью"}
          </Button>
        )}
      </div>
      {part.status === "error" && (
        <p className="mt-2 text-[#e0a89a]" role="alert">
          {part.errorMessage ?? "Инструмент не выполнен."}
        </p>
      )}
      {part.status === "ok" && part.summary && <MetaRows summary={part.summary} />}
      {open && part.summary && (
        <pre className="mt-3 max-h-56 overflow-auto rounded-md border border-[#2a2824] bg-[#080808] p-2 font-mono text-[11px] leading-5 text-[#d3cec4]">
          {part.summary.preview}
        </pre>
      )}
      {part.status === "ok" && part.summary && (
        <p className="mt-2 text-[10px] text-[#7a756c]">
          В SSE только краткий preview · полный контекст уходит модели на сервере (с лимитом).
        </p>
      )}
    </div>
  );
}