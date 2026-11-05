"use client";

import { ArrowRight, BracketsCurly, ChatCircleDots, ChatsCircle, Folder } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

interface ToolsWorkspaceProps {
  onOpenChat: () => void;
  onOpenConversations: () => void;
  onOpenProjects: () => void;
  onStartCoding: () => void;
}

const workspaces = [
  {
    title: "Новый чат",
    description: "Начни разговор с Кларенсией.",
    icon: ChatCircleDots,
    action: "Открыть чат",
    onOpen: "chat",
  },
  {
    title: "Режим кодинга",
    description: "Писать, объяснять и исправлять код в выбранном стиле.",
    icon: BracketsCurly,
    action: "Начать кодинг",
    onOpen: "coding",
  },
  {
    title: "Диалоги",
    description: "Возвращайся к перепискам, находи и переименовывай их.",
    icon: ChatsCircle,
    action: "К диалогам",
    onOpen: "conversations",
  },
  {
    title: "Проекты",
    description: "Собирай связанные разговоры в тематические проекты.",
    icon: Folder,
    action: "К проектам",
    onOpen: "projects",
  },
] as const;

export function ToolsWorkspace({
  onOpenChat,
  onOpenConversations,
  onOpenProjects,
  onStartCoding,
}: ToolsWorkspaceProps) {
  const actions = {
    chat: onOpenChat,
    conversations: onOpenConversations,
    projects: onOpenProjects,
    coding: onStartCoding,
  };

  return (
    <div className="page-workspace overflow-y-auto">
      <div className="mx-auto w-full max-w-[980px] px-5 pb-12 pt-10 sm:px-8 lg:px-12">
        <p className="text-[10px] font-medium tracking-[0.3em] text-[#c6a46a]">
          РАБОЧЕЕ ПРОСТРАНСТВО
        </p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight text-[#f1f1f1] sm:text-[38px]">
          Инструменты
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#929292]">
          Всё необходимое для разговоров и организации идей.
        </p>
        <div className="mt-8 divide-y divide-[#292929] border-y border-[#292929]">
          {workspaces.map(({ title, description, icon: Icon, action, onOpen }) => (
            <article
              key={title}
              className="flex flex-wrap items-center gap-4 py-5 sm:gap-6"
            >
              <span className="flex size-10 shrink-0 items-center justify-center text-[#b89a61]">
                <Icon size={20} weight="light" />
              </span>
              <div className="min-w-[180px] flex-1">
                <h2 className="text-sm font-medium text-[#e8e5de]">{title}</h2>
                <p className="mt-1.5 text-[13px] leading-5 text-[#929088]">
                  {description}
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={actions[onOpen]}
                className="ml-auto gap-2 text-[12px] text-[#cbb98e] hover:bg-[#171511] hover:text-[#ecd7a8]"
              >
                {action}
                <ArrowRight size={14} />
              </Button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
