"use client";

import { useState, type ChangeEvent } from "react";
import {
  FileText,
  Folder,
  FolderOpen,
  PencilSimple,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { Conversation, Project, LocalAttachment } from "@/types/workspace";

interface ProjectsWorkspaceProps {
  projects: Project[];
  conversations: Conversation[];
  onCreate: () => void;
  projectContexts: Record<string, string>;
  projectFiles: Record<string, LocalAttachment[]>;
  onAddFile: (projectId: string, file: LocalAttachment) => void;
  onRemoveFile: (projectId: string, fileId: string) => void;
  onUpdateContext: (projectId: string, value: string) => void;
  onNewProjectChat: (projectId: string) => void;
  onOpenConversation: (id: string) => void;
  onRename: (project: Project) => void;
  onDelete: (project: Project) => void;
}

export function ProjectsWorkspace({
  projects,
  conversations,
  onCreate,
  projectContexts,
  projectFiles,
  onAddFile,
  onRemoveFile,
  onUpdateContext,
  onNewProjectChat,
  onOpenConversation,
  onRename,
  onDelete,
}: ProjectsWorkspaceProps) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  async function addProjectFile(projectId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    setUploadError("");
    if ((projectFiles[projectId] ?? []).length >= 5) { setUploadError("До пяти файлов на проект."); return; }
    setUploadingId(projectId);
    try {
      let attachment: LocalAttachment;
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        if (file.size > 5_000_000) throw new Error("PDF до 5 МБ.");
        const form = new FormData(); form.append("file", file);
        const response = await fetch("/api/chat/files", { method: "POST", body: form });
        if (!response.ok) throw new Error("PDF не загружен.");
        const uploaded = await response.json() as { id: string; proof: string };
        if (!uploaded.id || !uploaded.proof) throw new Error("Ответ загрузки недействителен.");
        attachment = { id: crypto.randomUUID(), name: file.name, mediaType: "application/pdf", remoteFileId: uploaded.id, remoteFileProof: uploaded.proof };
      } else if (/\\.(txt|md|json|csv|ts|tsx|js|jsx|py|html|css|sql|xml|yaml|yml|sh|log)$/i.test(file.name)) {
        if (file.size > 32_000) throw new Error("Текстовый файл до 32 КБ.");
        const contentText = (await file.text()).slice(0, 3_000);
        if (!contentText.trim()) throw new Error("Файл пуст.");
        attachment = { id: crypto.randomUUID(), name: file.name, mediaType: file.type || "text/plain", contentText };
      } else throw new Error("Поддерживаются текстовые файлы и PDF.");
      onAddFile(projectId, attachment);
    } catch (error) { setUploadError(error instanceof Error ? error.message : "Ошибка файла."); }
    finally { setUploadingId(null); }
  }
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

        {uploadError && <p role="alert" className="mt-4 text-xs text-[#e6a3a3]">{uploadError}</p>}
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
                  <div className="mt-4 border-t border-[#242424] pt-4">
                    <label htmlFor={`project-context-${project.id}`} className="block text-[11px] font-medium text-[#c5b28d]">КОНТЕКСТ ПРОЕКТА</label>
                    <textarea
                      id={`project-context-${project.id}`}
                      value={projectContexts[project.id] ?? ""}
                      maxLength={1200}
                      onChange={(event) => onUpdateContext(project.id, event.target.value)}
                      placeholder="Цель проекта, важные сведения и ограничения"
                      className="mt-2 min-h-24 w-full resize-y rounded-md border border-[#302d27] bg-[#0b0b0b] p-3 text-xs leading-5 text-[#dedbd5] outline-none focus-visible:border-[#907348]"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-[#777]">Применяется к чатам проекта</span>
                      <button type="button" onClick={() => onNewProjectChat(project.id)} className="text-xs text-[#c6a46a] hover:text-[#ecd2a1]">+ Новый чат</button>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-[#242424] pt-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-medium text-[#c5b28d]">ФАЙЛЫ ПРОЕКТА · {(projectFiles[project.id] ?? []).length}/5</span>
                      <label className="cursor-pointer text-xs text-[#c6a46a] hover:text-[#ecd2a1]">
                        {uploadingId === project.id ? "Загрузка…" : "+ Добавить файл"}
                        <input type="file" className="hidden" disabled={uploadingId !== null || (projectFiles[project.id] ?? []).length >= 5} onChange={(event) => void addProjectFile(project.id, event)} accept=".pdf,.txt,.md,.json,.csv,.ts,.tsx,.js,.jsx,.py,.html,.css,.sql,.xml,.yaml,.yml,.sh,.log" />
                      </label>
                    </div>
                    {(projectFiles[project.id] ?? []).map((file) => <div key={file.id} className="flex items-center gap-2 py-1.5 text-xs text-[#a8a8a8]">
                      <FileText size={15} className="shrink-0 text-[#c6a46a]" />
                      <span className="min-w-0 flex-1 truncate" title={file.name}>{file.name}</span>
                      <button type="button" onClick={() => onRemoveFile(project.id, file.id)} aria-label={`Удалить ${file.name}`} className="text-[#777] hover:text-[#e6a3a3]"><Trash size={15} /></button>
                    </div>)}
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
