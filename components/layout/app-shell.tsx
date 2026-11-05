"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { List } from "@phosphor-icons/react";
import { AccountDialog } from "@/components/auth/account-dialog";
import { Sidebar } from "@/components/navigation/sidebar";
import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { ConversationsWorkspace } from "@/components/workspaces/conversations-workspace";
import { ModelWorkspace } from "@/components/workspaces/model-workspace";
import { NameDialog } from "@/components/workspaces/name-dialog";
import { ProjectsWorkspace } from "@/components/workspaces/projects-workspace";
import { SettingsWorkspace } from "@/components/workspaces/settings-workspace";
import { GlobalSearch } from "@/components/workspaces/global-search";
import { exportAllWorkspaceData } from "@/lib/workspace/export-data";
import { ToolsWorkspace } from "@/components/workspaces/tools-workspace";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { streamChatResponse } from "@/lib/chat/chat-client";
import { authClient } from "@/lib/auth/client";
import {
  MAX_CHAT_HISTORY_LENGTH,
  MAX_CHAT_MESSAGE_LENGTH,
  MAX_CHAT_MESSAGES,
} from "@/lib/chat/chat-limits";
import {
  DEFAULT_PREFERENCES,
} from "@/lib/storage/workspace-storage";
import { workspaceDataSchema } from "@/lib/workspace/workspace-contract";
import type {
  ChatMessage,
  Conversation,
  LocalAttachment,
  Preferences,
  Project,
  Workspace,
  WorkspaceData,
} from "@/types/workspace";

type NameTarget = { entity: "conversation" | "project"; id?: string };
type ConfirmTarget =
  | { action: "delete-conversation"; conversation: Conversation }
  | { action: "delete-project"; project: Project }
  | { action: "clear-history" }
  | null;

interface AppShellProps {
  account: {
    name: string;
    email: string;
  };
}

const workspaceTitles: Record<Exclude<Workspace, "chat">, string> = {
  conversations: "Диалоги",
  model: "Модель",
  tools: "Инструменты",
  projects: "Проекты",
  settings: "Настройки",
};

function createId() {
  return crypto.randomUUID();
}

function createConversation(): Conversation {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title: "Новый чат",
    createdAt: now,
    updatedAt: now,
    projectId: null,
    messages: [],
  };
}

function createEmptyWorkspaceData(): WorkspaceData {
  return {
    conversations: [],
    projects: [],
    preferences: { ...DEFAULT_PREFERENCES },
  };
}

function createMessage(
  role: ChatMessage["role"],
  content: string,
  attachments: LocalAttachment[] = [],
): ChatMessage {
  return {
    id: createId(),
    role,
    content,
    createdAt: new Date().toISOString(),
    attachments,
  };
}

async function saveWorkspaceData(data: WorkspaceData): Promise<void> {
  const response = await fetch("/api/workspace", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error("Workspace save failed.");
  }
}

export function AppShell({ account }: AppShellProps) {
  const router = useRouter();
  const [accountSection, setAccountSection] = useState<"profile" | "security" | null>(null);
  const [data, setData] = useState<WorkspaceData>(createEmptyWorkspaceData);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>("chat");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [pendingConversationIds, setPendingConversationIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [searchTargetMessageId, setSearchTargetMessageId] = useState<string | null>(null);
  const [nameTarget, setNameTarget] = useState<NameTarget | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);
  const [workspaceNotice, setWorkspaceNotice] = useState("");
  const [storageNotice, setStorageNotice] = useState("");
  const [storageReady, setStorageReady] = useState(false);
  const [persistencePaused, setPersistencePaused] = useState(false);
  const [storageRecoveryRequired, setStorageRecoveryRequired] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const chatControllers = useRef(new Map<string, AbortController>());
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const savedSnapshot = useRef("");

  useEffect(() => {
    const controllers = chatControllers.current;
    return () => {
      controllers.forEach((controller) => controller.abort());
      controllers.clear();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const response = await fetch("/api/workspace", { cache: "no-store" });
        if (response.status === 401) { router.replace("/auth/login?returnTo=%2Fapp"); return; }
        if (!response.ok) {
          const body = await response.json().catch(() => null) as { error?: unknown } | null;
          const message = typeof body?.error === "string" ? body.error : `HTTP ${response.status}`;
          throw new Error(`Workspace GET failed (${response.status}): ${message}`);
        }
        const payload: unknown = await response.json();
        const parsed = workspaceDataSchema.safeParse(payload);
        if (!parsed.success) {
          const details = parsed.error.issues.slice(0, 3).map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
          throw new Error(`Workspace response schema mismatch: ${details}`);
        }
        if (cancelled) return;
        savedSnapshot.current = JSON.stringify(parsed.data);
        setData(parsed.data);
        setActiveConversationId(parsed.data.conversations[0]?.id ?? null);
        setStorageNotice("");
        setPersistencePaused(false);
        setStorageRecoveryRequired(false);
        setStorageReady(true);
      } catch (error) {
        if (cancelled) return;
        console.error("Unable to load account workspace.", {
          errorName: error instanceof Error ? error.name : "UnknownError",
          message: error instanceof Error ? error.message : String(error),
        });
        setStorageNotice("Не удалось загрузить данные аккаунта. Повторите попытку.");
        setPersistencePaused(true);
        setStorageRecoveryRequired(true);
      }
    }

    void loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, [loadAttempt, router]);

  useEffect(() => {
    if (!storageReady || persistencePaused) return;
    const snapshot = data;
    const serialized = JSON.stringify(snapshot);
    if (serialized === savedSnapshot.current) return;
    const timeout = window.setTimeout(() => {
      const save = saveQueue.current.catch(() => undefined).then(() => saveWorkspaceData(snapshot));
      saveQueue.current = save;
      void save.then(() => {
        savedSnapshot.current = serialized;
        setStorageNotice("");
        setStorageRecoveryRequired(false);
      }).catch((error: unknown) => {
        console.error("Unable to save account workspace.", {
          errorName: error instanceof Error ? error.name : "UnknownError",
        });
        setStorageNotice("Не удалось сохранить данные аккаунта. Проверьте соединение и повторите попытку.");
        setPersistencePaused(true);
      });
    }, 2_000);
    return () => window.clearTimeout(timeout);
  }, [data, persistencePaused, storageReady]);

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileSidebarOpen]);

  useEffect(() => {
    function onSearchShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setGlobalSearchOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onSearchShortcut);
    return () => window.removeEventListener("keydown", onSearchShortcut);
  }, []);

  const activeConversation = useMemo(
    () => data.conversations.find((conversation) => conversation.id === activeConversationId) ?? null,
    [activeConversationId, data.conversations],
  );

  function navigate(workspace: Workspace) {
    setActiveWorkspace(workspace);
    setMobileSidebarOpen(false);
    setWorkspaceNotice("");
  }

  function newProjectChat(projectId: string) {
    const conversation = { ...createConversation(), projectId };
    setData((current) => ({ ...current, conversations: [conversation, ...current.conversations] }));
    setActiveConversationId(conversation.id);
    setActiveWorkspace("chat");
    setMobileSidebarOpen(false);
    setWorkspaceNotice("");
  }

  function newChat() {
    const conversation = createConversation();
    setData((current) => ({
      ...current,
      conversations: [conversation, ...current.conversations],
    }));
    setActiveConversationId(conversation.id);
    setActiveWorkspace("chat");
    setMobileSidebarOpen(false);
    setWorkspaceNotice("");
  }

  function openSearchResult(id: string, messageId?: string) {
    setSearchTargetMessageId(messageId ?? null);
    openConversation(id);
  }

  function openConversation(id: string) {
    setActiveConversationId(id);
    setActiveWorkspace("chat");
    setMobileSidebarOpen(false);
    setWorkspaceNotice("");
  }

  async function requestReply(
    conversationId: string,
    prompt: string,
    history: ChatMessage[],
  ) {
    const controller = new AbortController();
    const reply = createMessage("assistant", "");
    let content = "";
    chatControllers.current.set(conversationId, controller);
    setPendingConversationIds((current) => new Set(current).add(conversationId));
    setData((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, messages: [...conversation.messages, reply] }
          : conversation,
      ),
    }));

    try {
      const requestMessages: { role: ChatMessage["role"]; content: string }[] = [];
      let historyLength = 0;
      for (let index = history.length - 1; index >= 0; index -= 1) {
        const message = history[index];
        if (!message) continue;
        let content =
          index === history.length - 1 && message.role === "user"
            ? prompt
            : message.content;
        if (message.role === "user" && index !== history.length - 1) {
          const textFiles = message.attachments.filter((attachment) => attachment.contentText);
          if (textFiles.length) {
            const available = Math.max(0, MAX_CHAT_MESSAGE_LENGTH - content.length - 100);
            const files = textFiles.map((file) => `[Файл: ${file.name}]\n${file.contentText}\n[/Файл]`).join("\n");
            content += "\n\nПрикреплённые текстовые данные:\n" + files.slice(0, available);
          }
        }
        if (content.length > MAX_CHAT_MESSAGE_LENGTH) {
          content = content.slice(-MAX_CHAT_MESSAGE_LENGTH);
        }
        if (
          requestMessages.length >= MAX_CHAT_MESSAGES ||
          historyLength + content.length > MAX_CHAT_HISTORY_LENGTH
        ) {
          break;
        }
        requestMessages.unshift({ role: message.role, content });
        historyLength += content.length;
      }
      await streamChatResponse(requestMessages, {
        signal: controller.signal,
        personalization: {
          userName: data.preferences.userName,
          userContext: data.preferences.userContext,
          pinnedMemories: data.preferences.pinnedMemories.map((memory) => memory.text),
          projectContext: data.preferences.projectContexts[data.conversations.find((item) => item.id === conversationId)?.projectId ?? ""] ?? "",
          sharpness: data.preferences.sharpness,
          roleplayEnabled: data.preferences.roleplayEnabled,
          adultThemesEnabled: data.preferences.adultThemesEnabled,
          codingModeEnabled: data.preferences.codingModeEnabled,
          codingStyle: data.preferences.codingStyle,
        },
        onDelta: (delta) => {
          content += delta;
          const updatedAt = new Date().toISOString();
          setData((current) => ({
            ...current,
            conversations: current.conversations.map((conversation) =>
              conversation.id === conversationId
                ? {
                    ...conversation,
                    updatedAt,
                    messages: conversation.messages.map((message) =>
                      message.id === reply.id
                        ? { ...message, content: content, createdAt: updatedAt }
                        : message,
                    ),
                  }
                : conversation,
            ),
          }));
        },
      });
      if (!content) throw new Error("The provider returned an empty response.");
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        if (!content) {
          setData((current) => ({
            ...current,
            conversations: current.conversations.map((conversation) =>
              conversation.id === conversationId
                ? { ...conversation, messages: conversation.messages.filter((message) => message.id !== reply.id) }
                : conversation,
            ),
          }));
        }
      } else {
        setData((current) => ({
          ...current,
          conversations: current.conversations.map((conversation) =>
            conversation.id === conversationId
              ? { ...conversation, messages: conversation.messages.filter((message) => message.id !== reply.id) }
              : conversation,
          ),
        }));
        setWorkspaceNotice("Не удалось отправить сообщение. Повторите попытку.");
      }
    } finally {
      chatControllers.current.delete(conversationId);
      setPendingConversationIds((current) => {
        const next = new Set(current);
        next.delete(conversationId);
        return next;
      });
    }
  }

  function cancelReply() {
    if (!activeConversationId) return;
    chatControllers.current.get(activeConversationId)?.abort();
  }

  function sendMessage(text: string, attachments: LocalAttachment[]) {
    const existingConversation =
      data.conversations.find((item) => item.id === activeConversationId) ?? null;
    if (existingConversation && pendingConversationIds.has(existingConversation.id)) return;
    const conversation = existingConversation ?? createConversation();
    if (!existingConversation) setActiveConversationId(conversation.id);

    const readableFiles = attachments.filter((attachment) => attachment.contentText);
    const contentFromFiles = readableFiles.map((file) => `[Файл: ${file.name}]\n${file.contentText}\n[/Файл]`).join("\n");
    const prompt = (text.trim() + (contentFromFiles ? "\n\nПрикреплённые текстовые данные:\n" + contentFromFiles : "")).slice(0, MAX_CHAT_MESSAGE_LENGTH);
    if (!prompt.trim()) {
      setWorkspaceNotice("Пока доступно чтение текстовых файлов. Анализ изображений и PDF ещё не подключён к модели.");
      return;
    }
    const userMessage = createMessage("user", text, attachments);
    const messageCount = conversation.messages.filter((message) => message.role === "user").length;
    const nextTitle =
      messageCount === 0 && conversation.title === "Новый чат"
        ? (text.trim() || "Вложение").slice(0, 52)
        : conversation.title;
    const updatedConversation: Conversation = {
      ...conversation,
      title: nextTitle,
      updatedAt: userMessage.createdAt,
      messages: [...conversation.messages, userMessage],
    };

    setData((current) => ({
      ...current,
      conversations: current.conversations.some((item) => item.id === conversation.id)
        ? current.conversations.map((item) =>
            item.id === conversation.id ? updatedConversation : item,
          ).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        : [updatedConversation, ...current.conversations],
    }));

    setWorkspaceNotice("");

    void requestReply(conversation.id, prompt, updatedConversation.messages);
  }

  function regenerateReply() {
    if (!activeConversation || pendingConversationIds.has(activeConversation.id)) return;
    const lastMessage = activeConversation.messages.at(-1);
    if (!lastMessage || lastMessage.role !== "assistant") return;

    const history = activeConversation.messages.slice(0, -1);
    const lastUserMessage = [...history].reverse().find((message) => message.role === "user");
    if (!lastUserMessage) return;

    setData((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) =>
        conversation.id === activeConversation.id
          ? { ...conversation, messages: history }
          : conversation,
      ),
    }));
    void requestReply(
      activeConversation.id,
      lastUserMessage.content || activeConversation.messages.at(-2)?.attachments.map((item) => `Вложение: ${item.name}`).join("\n") || "",
      history,
    );
  }

  function branchConversation(messageId: string) {
    if (!activeConversation || pendingConversationIds.has(activeConversation.id)) return;
    const position = activeConversation.messages.findIndex((message) => message.id === messageId);
    if (position < 0) return;
    const now = new Date().toISOString();
    const branched: Conversation = {
      id: createId(),
      title: `${activeConversation.title.slice(0, 110)} · ответвление`,
      createdAt: now,
      updatedAt: now,
      projectId: activeConversation.projectId,
      messages: activeConversation.messages.slice(0, position + 1).map((message) => ({
        ...message,
        id: createId(),
        attachments: message.attachments.map((attachment) => ({ ...attachment, id: createId() })),
      })),
    };
    setData((current) => ({ ...current, conversations: [branched, ...current.conversations] }));
    setActiveConversationId(branched.id);
    setWorkspaceNotice("");
  }

  function updatePreference<K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) {
    setData((current) => ({
      ...current,
      preferences: { ...current.preferences, [key]: value },
    }));
  }

  function startCodingMode() {
    updatePreference("codingModeEnabled", true);
    newChat();
  }

  function openNameDialog(entity: NameTarget["entity"], id?: string) {
    setNameTarget({ entity, id });
  }

  function submitName(name: string) {
    if (!nameTarget) return;
    if (nameTarget.entity === "conversation" && nameTarget.id) {
      setData((current) => ({
        ...current,
        conversations: current.conversations.map((conversation) =>
          conversation.id === nameTarget.id
            ? { ...conversation, title: name }
            : conversation,
        ),
      }));
    } else if (nameTarget.entity === "project" && nameTarget.id) {
      setData((current) => ({
        ...current,
        projects: current.projects.map((project) =>
          project.id === nameTarget.id ? { ...project, name } : project,
        ),
      }));
    } else if (nameTarget.entity === "project") {
      setData((current) => ({
        ...current,
        projects: [...current.projects, { id: createId(), name, createdAt: new Date().toISOString() }],
      }));
    }
  }

  function assignProject(conversationId: string, projectId: string | null) {
    setData((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, projectId }
          : conversation,
      ),
    }));
  }

  function deleteConversation(conversationId: string) {
    setData((current) => ({
      ...current,
      conversations: current.conversations.filter((conversation) => conversation.id !== conversationId),
    }));
    if (activeConversationId === conversationId) {
      const remaining = data.conversations.filter((conversation) => conversation.id !== conversationId);
      setActiveConversationId(remaining[0]?.id ?? null);
      setActiveWorkspace("chat");
    }
    setConfirmTarget(null);
  }

  function deleteProject(projectId: string) {
    setData((current) => ({
      ...current,
      projects: current.projects.filter((project) => project.id !== projectId),
      conversations: current.conversations.map((conversation) =>
        conversation.projectId === projectId ? { ...conversation, projectId: null } : conversation,
      ),
    }));
    setConfirmTarget(null);
  }

  function clearHistory() {
    setData((current) => ({ ...current, conversations: [] }));
    setActiveConversationId(null);
    setActiveWorkspace("chat");
    setConfirmTarget(null);
  }

  function recoverStorage() {
    setStorageNotice("");
    if (storageRecoveryRequired) {
      setStorageReady(false);
      setStorageRecoveryRequired(false);
      setLoadAttempt((attempt) => attempt + 1);
      return;
    }
    setPersistencePaused(false);
  }

  async function signOut() {
    try {
      if (pendingConversationIds.size) { setWorkspaceNotice("Дождись окончания ответа перед выходом."); return; }
      const save = saveQueue.current
        .catch(() => undefined)
        .then(() => saveWorkspaceData(data));
      saveQueue.current = save;
      await save;
      const result = await authClient.signOut();
      if (result.error) throw new Error("Neon Auth sign out failed.");
      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Unable to sign out.", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      setWorkspaceNotice("Не удалось завершить сеанс. Повторите попытку.");
    }
  }

  if (!storageReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080808] px-5 text-center">
        <div className="max-w-md">
          <p className="text-[11px] font-medium tracking-[0.3em] text-[#c6a46a]">KLAREN 4E</p>
          <p className="mt-4 text-sm text-[#b8b2a7]">
            {storageRecoveryRequired ? storageNotice : "Загружаем данные аккаунта…"}
          </p>
          {storageRecoveryRequired && (
            <Button
              type="button"
              onClick={recoverStorage}
              className="mt-5 bg-[#c6a46a] text-[#080808] hover:bg-[#d3b77f]"
            >
              Повторить
            </Button>
          )}
        </div>
      </div>
    );
  }

  const nameInitialValue =
    nameTarget?.entity === "conversation"
      ? data.conversations.find((conversation) => conversation.id === nameTarget.id)?.title ?? ""
      : nameTarget?.entity === "project"
        ? data.projects.find((project) => project.id === nameTarget.id)?.name ?? ""
        : "";

  return (
    <div
      className={`app-shell${data.preferences.reducedMotion ? " reduced-motion" : ""}`}
      data-collapsed={data.preferences.sidebarCollapsed}
      data-mobile-open={mobileSidebarOpen}
    >
      <Sidebar
        activeWorkspace={activeWorkspace}
        collapsed={data.preferences.sidebarCollapsed && !mobileSidebarOpen}
        conversationCount={data.conversations.length}
        userName={account.name || account.email}
        userEmail={account.email}
        onSignOut={signOut}
        onAccount={setAccountSection}
        onCollapse={() => updatePreference("sidebarCollapsed", !data.preferences.sidebarCollapsed)}
        onNavigate={navigate}
        onNewChat={newChat}
      />

      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Закрыть меню"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-10 bg-black/60 min-[761px]:hidden"
        />
      )}

      <main className="app-main">
        {activeWorkspace === "chat" && data.preferences.portraitVisible && (
          <div className="portrait-layer" aria-hidden="true">
            <Image
              src="/klaren.png"
              alt=""
              fill
              priority
              sizes="(max-width: 760px) 72vw, (max-width: 1100px) 40vw, 46vw"
              className="portrait-image"
            />
          </div>
        )}

        {storageNotice && (
          <div
            role="alert"
            className="relative z-30 flex flex-wrap items-center justify-between gap-3 border-b border-[#493a29] bg-[#17130d] px-4 py-2.5 text-xs text-[#e2d2b2] sm:px-7"
          >
            <span className="min-w-0 flex-1">{storageNotice}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={recoverStorage}
              className="h-7 shrink-0 border-[#655333] text-[#e5cc98] hover:bg-[#292215]"
            >
              {storageRecoveryRequired ? "Восстановить историю" : "Повторить"}
            </Button>
          </div>
        )}

        {workspaceNotice && (
          <div
            role="status"
            className="relative z-30 flex items-center justify-between gap-3 border-b border-[#35312a] bg-[#13120f] px-4 py-2 text-xs text-[#c8b990] sm:px-7"
          >
            <span>{workspaceNotice}</span>
            <button type="button" onClick={() => setWorkspaceNotice("")} className="shrink-0 rounded px-2 py-1 text-[#a6a6a6] hover:bg-[#25231e]" aria-label="Закрыть уведомление">
              Закрыть
            </button>
          </div>
        )}

        {activeWorkspace === "chat" ? (
          <ChatWorkspace
            conversation={activeConversation}
            isTyping={
              activeConversationId !== null &&
              pendingConversationIds.has(activeConversationId)
            }
            portraitVisible={data.preferences.portraitVisible}
            enterToSend={data.preferences.enterToSend}
            reducedMotion={data.preferences.reducedMotion}
            renderMarkdown={data.preferences.renderMarkdown}
            onNewChat={newChat}
            onRename={(conversation) => openNameDialog("conversation", conversation.id)}
            onTogglePortrait={() => updatePreference("portraitVisible", !data.preferences.portraitVisible)}
            onSend={sendMessage}
            onCancel={cancelReply}
            onRegenerate={regenerateReply}
            onBranch={branchConversation}
            onCopyError={setWorkspaceNotice}
            onToggleMobileSidebar={() => setMobileSidebarOpen((open) => !open)}
            searchTargetMessageId={searchTargetMessageId}
            onSearchTargetHandled={() => setSearchTargetMessageId(null)}
          />
        ) : (
          <>
            <WorkspaceHeader
              title={workspaceTitles[activeWorkspace]}
              subtitle={
                activeWorkspace === "model"
                  ? "KLAREN 4E"
                  : "NULLXES · KLAREN 4E"
              }
              onOpenMenu={() => setMobileSidebarOpen((open) => !open)}
            />
            {activeWorkspace === "conversations" && (
              <ConversationsWorkspace
                conversations={data.conversations}
                projects={data.projects}
                onCreate={newChat}
                onOpen={openConversation}
                onRename={(conversation) => openNameDialog("conversation", conversation.id)}
                onDelete={(conversation) => setConfirmTarget({ action: "delete-conversation", conversation })}
                onAssignProject={assignProject}
              />
            )}
            {activeWorkspace === "model" && (
              <ModelWorkspace onOpenChat={() => navigate("chat")} />
            )}
            {activeWorkspace === "tools" && (
              <ToolsWorkspace
                onOpenChat={newChat}
                onOpenConversations={() => navigate("conversations")}
                onOpenProjects={() => navigate("projects")}
                onStartCoding={startCodingMode}
              />
            )}
            {activeWorkspace === "projects" && (
              <ProjectsWorkspace
                projects={data.projects}
                conversations={data.conversations}
                onCreate={() => openNameDialog("project")}
                projectContexts={data.preferences.projectContexts}
                onUpdateContext={(projectId, value) => updatePreference("projectContexts", { ...data.preferences.projectContexts, [projectId]: value })}
                onNewProjectChat={newProjectChat}
                onOpenConversation={openConversation}
                onRename={(project) => openNameDialog("project", project.id)}
                onDelete={(project) => setConfirmTarget({ action: "delete-project", project })}
              />
            )}
            {activeWorkspace === "settings" && (
              <SettingsWorkspace
                preferences={data.preferences}
                conversationCount={data.conversations.length}
                accountEmail={account.email}
                onPreferenceChange={updatePreference}
                onClearHistory={() => setConfirmTarget({ action: "clear-history" })}
                onExportAll={() => exportAllWorkspaceData(data)}
              />
            )}
          </>
        )}
      </main>

      <GlobalSearch
        open={globalSearchOpen}
        conversations={data.conversations}
        projects={data.projects}
        onClose={() => setGlobalSearchOpen(false)}
        onSelect={openSearchResult}
      />

      <NameDialog
        open={nameTarget !== null}
        title={
          nameTarget?.id
            ? nameTarget.entity === "conversation" ? "Переименовать диалог" : "Переименовать проект"
            : "Новый проект"
        }
        description={
          nameTarget?.id
            ? "Измени название, чтобы быстрее находить нужную переписку."
            : "Создай тематическую группу для связанных диалогов."
        }
        initialValue={nameInitialValue}
        submitLabel={nameTarget?.id ? "Сохранить" : "Создать"}
        onOpenChange={(open) => {
          if (!open) setNameTarget(null);
        }}
        onSubmit={submitName}
      />

      {accountSection && <AccountDialog section={accountSection} account={account} onClose={() => setAccountSection(null)} onUpdated={() => router.refresh()} />}

      <AlertDialog open={confirmTarget !== null} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <AlertDialogContent className="border-[#302d27] bg-[#151515] text-[#f5f5f5]">
          <AlertDialogHeader>
            <AlertDialogTitle>{getConfirmTitle(confirmTarget)}</AlertDialogTitle>
            <AlertDialogDescription className="leading-6 text-[#999]">
              {getConfirmDescription(confirmTarget)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-[#292929] bg-[#111]">
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!confirmTarget) return;
                if (confirmTarget.action === "delete-conversation") {
                  deleteConversation(confirmTarget.conversation.id);
                } else if (confirmTarget.action === "delete-project") {
                  deleteProject(confirmTarget.project.id);
                } else {
                  clearHistory();
                }
              }}
            >
              {confirmTarget?.action === "clear-history" ? "Очистить" : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function WorkspaceHeader({
  title,
  subtitle,
  onOpenMenu,
}: {
  title: string;
  subtitle: string;
  onOpenMenu: () => void;
}) {
  return (
    <header className="relative z-10 flex min-h-[76px] shrink-0 items-center gap-3 border-b border-[#262626] bg-[#080808]/95 px-4 backdrop-blur-md sm:px-7 lg:px-10">
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex size-9 shrink-0 items-center justify-center rounded-md text-[#a6a6a6] hover:bg-[#202020] hover:text-[#e4c990] min-[761px]:hidden"
        aria-label="Открыть меню"
      >
        <List size={20} />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-semibold tracking-[0.03em] text-[#eee]">{title}</h1>
        <p className="mt-1 text-[11px] text-[#898989]">{subtitle}</p>
      </div>
    </header>
  );
}

function getConfirmTitle(target: ConfirmTarget) {
  if (target?.action === "delete-conversation") return "Удалить диалог?";
  if (target?.action === "delete-project") return `Удалить проект «${target.project.name}»?`;
  if (target?.action === "clear-history") return "Очистить всю историю?";
  return "Подтвердить действие";
}

function getConfirmDescription(target: ConfirmTarget) {
  if (target?.action === "delete-conversation") {
    return `«${target.conversation.title}» и все сообщения в нём будут удалены без возможности восстановления.`;
  }
  if (target?.action === "delete-project") {
    return "Проект будет удалён. Диалоги останутся в истории, но связь с этим проектом будет снята.";
  }
  if (target?.action === "clear-history") {
    return "Все диалоги и сохранённые в них вложения будут удалены. Проекты и настройки останутся.";
  }
  return "Это действие нельзя отменить.";
}
