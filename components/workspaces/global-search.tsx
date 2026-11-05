"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import type { Conversation, Project } from "@/types/workspace";

interface SearchResult { conversationId: string; messageId?: string; title: string; context: string; category: string; }
interface Props {
  open: boolean;
  conversations: Conversation[];
  projects: Project[];
  onClose: () => void;
  onSelect: (conversationId: string, messageId?: string) => void;
}

export function GlobalSearch({ open, conversations, projects, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) { const frame = requestAnimationFrame(() => { setQuery(""); input.current?.focus(); }); return () => cancelAnimationFrame(frame); }
  }, [open]);

  const results = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("ru");
    if (!term) return [] as SearchResult[];
    const found: SearchResult[] = [];
    const projectNames = new Map(projects.map((project) => [project.id, project.name]));
    for (const conversation of conversations) {
      const projectName = conversation.projectId ? projectNames.get(conversation.projectId) ?? "" : "";
      if ((conversation.title + " " + projectName).toLocaleLowerCase("ru").includes(term)) {
        found.push({ conversationId: conversation.id, title: conversation.title, context: projectName || "Диалог", category: projectName ? "ПРОЕКТ" : "ДИАЛОГ" });
      }
      for (const message of conversation.messages) {
        const text = message.content;
        const position = text.toLocaleLowerCase("ru").indexOf(term);
        if (position < 0) continue;
        const excerpt = text.slice(Math.max(0, position - 48), position + term.length + 96).replace(/\s+/g, " ");
        found.push({ conversationId: conversation.id, messageId: message.id, title: conversation.title, context: excerpt, category: message.role === "assistant" ? "КЛАРЕН" : "ВЫ" });
        if (found.length >= 80) break;
      }
      if (found.length >= 80) break;
    }
    return found.slice(0, 80);
  }, [query, conversations, projects]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/75 px-4 pt-[min(15vh,130px)] backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Поиск по рабочему пространству" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }} className="flex max-h-[76vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#40382b] bg-[#101010] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[#2c2a26] px-4 py-3">
          <MagnifyingGlass size={20} className="shrink-0 text-[#c6a46a]" />
          <input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти диалог, сообщение или проект…" aria-label="Поисковый запрос" className="min-w-0 flex-1 bg-transparent text-sm text-[#eee] outline-none placeholder:text-[#797979]" />
          <button type="button" onClick={onClose} aria-label="Закрыть поиск" className="rounded p-1 text-[#888] hover:text-white"><X size={18} /></button>
        </div>
        <div className="min-h-24 overflow-y-auto p-2">
          {!query.trim() && <p className="px-3 py-8 text-center text-xs text-[#888]">Поиск по истории, сообщениям и названиям проектов</p>}
          {query.trim() && results.length === 0 && <p className="px-3 py-8 text-center text-xs text-[#888]">Совпадений не найдено</p>}
          {results.map((result, index) => (
            <button key={result.conversationId + ":" + (result.messageId ?? "title") + ":" + index} type="button" onClick={() => { onSelect(result.conversationId, result.messageId); onClose(); }} className="flex w-full flex-col gap-1 rounded-md px-3 py-3 text-left hover:bg-[#211c15] focus-visible:bg-[#211c15] focus-visible:outline-none">
              <span className="flex w-full items-center justify-between gap-3"><span className="truncate text-sm text-[#efefef]">{result.title}</span><span className="shrink-0 text-[10px] tracking-wider text-[#bd9657]">{result.category}</span></span>
              <span className="line-clamp-2 break-words text-xs leading-5 text-[#999]">{result.context}</span>
            </button>
          ))}
        </div>
        <p className="border-t border-[#2c2a26] px-4 py-2 text-[10px] text-[#777]">Ctrl / ⌘ + K · Esc — закрыть</p>
      </div>
    </div>
  );
}
