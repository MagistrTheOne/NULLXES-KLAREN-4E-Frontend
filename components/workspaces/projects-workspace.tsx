"use client";

import {
  Folder,
  FolderOpen,
  PencilSimple,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { Conversation, Project } from "@/types/workspace";

interface ProjectsWorkspaceProps {
  projects: Project[];
  conversations: Conversation[];
  onCreate: () => void;
  onOpenConversation: (id: string) => void;
  onRename: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectsWorkspace({
  projects,
  conversations,
  onCreate,
  onOpenConversation,
  onRename,
  onDelete,
}: ProjectsWorkspaceProps) {
  return (
    <div className="page-workspace overflow-y-auto">
      <div className="mx-auto w-full max-w-[980px] px-5 pb-10 pt-10 sm:px-8 lg:px-12">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[10px] font-medium tracking-[0.3em] text-[#c6a46a]">ОРГАНИЗАЦИЯ</p>
            <h1 className="mt-3 text-3xl font-medium tracking-tight text-[#f1f1f1] sm:text-[38px]">Проекты</h1>
            <p className="mt-2 text-sm text-[#929292]">Группируй связанные диалоги по темам.</p>
          </div>
          <Button onClick={onCreate} className="gap-2 bg-[#c6a46a] text-[#100e0a] hover:bg-[#d6b77e]">
            <Plus size={16} />
            Создать проект
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="mt-10 flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed border-[#303030] bg-[#0d0d0d]/80 px-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-full border border-[#393328] bg-[#17140f] text-[#c6a46a]">
              <Folder size={22} />
            </span>
            <h2 className="mt-4 text-base font-medium text-[#e7e7e7]">Пока без проектов</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-[#888]">
              Создай проект, а затем назначай ему диалоги в разделе «Диалоги».
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {projects.map((project) => {
              const projectConversations = conversations.filter(
                (conversation) => conversation.projectId === project.id,
              );
              return (
                <article key={project.id} className="rounded-xl border border-[#292929] bg-[#101010] p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#393328] bg-[#17140f] text-[#c6a46a]">
                      <FolderOpen size={19} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[15px] font-medium text-[#ededed]">{project.name}</h2>
                      <p className="mt-1 text-xs text-[#828282]">
                        {projectConversations.length} {conversationWord(projectConversations.length)}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon-sm" aria-label="Переименовать проект" onClick={() => onRename(project)} className="text-[#777] hover:text-[#e6d1a7]">
                      <PencilSimple size={16} />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Удалить проект" onClick={() => onDelete(project)} className="text-[#777] hover:text-[#e6a3a3]">
                      <Trash size={16} />
                    </Button>
                  </div>
                  {projectConversations.length > 0 ? (
                    <ul className="mt-4 divide-y divide-[#242424] border-t border-[#242424]">
                      {projectConversations.map((conversation) => (
                        <li key={conversation.id}>
                          <button
                            type="button"
                            onClick={() => onOpenConversation(conversation.id)}
                            className="w-full truncate py-3 text-left text-sm text-[#a8a8a8] transition-colors hover:text-[#e4cca1]"
                          >
                            {conversation.title}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-4 border-t border-[#242424] pt-4 text-xs text-[#777]">
                      Назначь диалог этому проекту в разделе «Диалоги».
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function conversationWord(count: number) {
  const lastTwo = count % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return "диалогов";
  if (count % 10 === 1) return "диалог";
  if (count % 10 >= 2 && count % 10 <= 4) return "диалога";
  return "диалогов";
}
