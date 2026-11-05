"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ChatCircleDots,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Conversation, Project } from "@/types/workspace";

interface ConversationsWorkspaceProps {
  conversations: Conversation[];
  projects: Project[];
  onCreate: () => void;
  onOpen: (id: string) => void;
  onRename: (conversation: Conversation) => void;
  onDelete: (conversation: Conversation) => void;
  onAssignProject: (conversationId: string, projectId: string | null) => void;
}

export function ConversationsWorkspace({
  conversations,
  projects,
  onCreate,
  onOpen,
  onRename,
  onDelete,
  onAssignProject,
}: ConversationsWorkspaceProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      conversations.filter((conversation) =>
        conversation.title.toLocaleLowerCase("ru").includes(query.trim().toLocaleLowerCase("ru")) ||
        conversation.messages.some((message) =>
          message.content.toLocaleLowerCase("ru").includes(query.trim().toLocaleLowerCase("ru")),
        ),
      ),
    [conversations, query],
  );

  return (
    <div className="page-workspace overflow-y-auto">
      <div className="mx-auto w-full max-w-245 px-5 pb-10 pt-10 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[10px] font-medium tracking-[0.3em] text-[#c6a46a]">ИСТОРИЯ ПЕРЕПИСОК</p>
            <h1 className="mt-3 text-3xl font-medium tracking-tight text-[#f1f1f1] sm:text-[38px]">Диалоги</h1>
            <p className="mt-2 text-sm text-[#929292]">
              {conversations.length} {conversationWord(conversations.length)}
            </p>
          </div>
          <Button onClick={onCreate} className="gap-2 bg-[#c6a46a] text-[#100e0a] hover:bg-[#d6b77e]">
            <Plus size={16} />
            Новый чат
          </Button>
        </div>

        <label className="relative mt-8 block max-w-lg">
          <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4.25 -translate-y-1/2 text-[#777]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти диалог"
            aria-label="Поиск диалогов"
            className="h-10 border-[#292929] bg-[#111] pl-10 text-sm placeholder:text-[#686868]"
          />
        </label>

        <div className="mt-5 flex flex-col divide-y divide-[#242424]">
          {filtered.map((conversation) => {
            const lastMessage = conversation.messages.at(-1);
            return (
              <article
                key={conversation.id}
                className="group flex min-w-0 flex-wrap items-center gap-3 py-4 sm:gap-4"
              >
                <button
                  type="button"
                  onClick={() => onOpen(conversation.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#302d27] bg-[#15130f] text-[#c6a46a]">
                    <ChatCircleDots size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-[#e4e4e4] group-hover:text-[#e5cc9d]">
                      {conversation.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-[#818181]">
                      {lastMessage?.content ?? "Пока без сообщений"}
                    </span>
                  </span>
                </button>
                <div className="flex shrink-0 items-center">
                  <ActionButton label="Переименовать" onClick={() => onRename(conversation)}>
                    <PencilSimple size={16} />
                  </ActionButton>
                  <ActionButton label="Удалить диалог" onClick={() => onDelete(conversation)}>
                    <Trash size={16} />
                  </ActionButton>
                </div>
                <div className="w-full pl-[52px] lg:hidden">
                  <Select
                    value={conversation.projectId ?? "unassigned"}
                    onValueChange={(value) =>
                      onAssignProject(conversation.id, value === "unassigned" ? null : value)
                    }
                  >
                    <SelectTrigger
                      aria-label={`Проект для диалога ${conversation.title}`}
                      className="h-8 w-full max-w-[240px] border-[#292929] bg-[#101010] text-xs text-[#a6a6a6]"
                    >
                      <SelectValue placeholder="Без проекта" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Без проекта</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <span className="hidden shrink-0 text-[11px] text-[#777] sm:block">
                  {formatDate(conversation.updatedAt)}
                </span>
                <Select
                  value={conversation.projectId ?? "unassigned"}
                  onValueChange={(value) =>
                    onAssignProject(conversation.id, value === "unassigned" ? null : value)
                  }
                >
                  <SelectTrigger
                    aria-label={`Проект для диалога ${conversation.title}`}
                    className="hidden h-8 w-37.5 shrink-0 border-[#292929] bg-[#101010] text-xs text-[#a6a6a6] lg:flex"
                  >
                    <SelectValue placeholder="Без проекта" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Без проекта</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </article>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-[#8b8b8b]">
              {query ? "Совпадений нет. Попробуй изменить запрос." : "Диалогов пока нет."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="text-[#777] hover:text-[#e6d1a7]"
    >
      {children}
    </Button>
  );
}

function conversationWord(count: number) {
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return "диалогов";
  if (count % 10 === 1) return "диалог";
  if (count % 10 >= 2 && count % 10 <= 4) return "диалога";
  return "диалогов";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
