import type { WorkspaceData } from "@/types/workspace";

const STORAGE_KEY = "nullxes-klaren-workspace-v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isWorkspaceData(value: unknown): value is WorkspaceData {
  if (!isRecord(value) || !Array.isArray(value.conversations) || !Array.isArray(value.projects)) {
    return false;
  }

  if (!isRecord(value.preferences)) return false;

  const { preferences } = value;
  const preferenceKeys = [
    "sidebarCollapsed",
    "portraitVisible",
    "reducedMotion",
    "enterToSend",
  ] as const;

  return (
    preferenceKeys.every((key) => typeof preferences[key] === "boolean") &&
    value.conversations.every(
      (conversation) =>
        isRecord(conversation) &&
        typeof conversation.id === "string" &&
        typeof conversation.title === "string" &&
        isValidDate(conversation.createdAt) &&
        isValidDate(conversation.updatedAt) &&
        (typeof conversation.projectId === "string" || conversation.projectId === null) &&
        Array.isArray(conversation.messages) &&
        conversation.messages.every(
          (message) =>
            isRecord(message) &&
            typeof message.id === "string" &&
            (message.role === "user" || message.role === "assistant") &&
            typeof message.content === "string" &&
            isValidDate(message.createdAt) &&
            Array.isArray(message.attachments) &&
            message.attachments.every(
              (attachment) =>
                isRecord(attachment) &&
                typeof attachment.id === "string" &&
                typeof attachment.name === "string" &&
                typeof attachment.mediaType === "string" &&
                (attachment.previewDataUrl === undefined ||
                  typeof attachment.previewDataUrl === "string"),
            ),
        ),
    ) &&
    value.projects.every(
      (project) =>
        isRecord(project) &&
        typeof project.id === "string" &&
        typeof project.name === "string" &&
        isValidDate(project.createdAt),
    )
  );
}

export function readWorkspaceData(): WorkspaceData | null {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error("Сохранённые данные повреждены и не могут быть прочитаны.");
  }

  if (!isWorkspaceData(parsed)) {
    throw new Error("Формат сохранённых данных не поддерживается.");
  }

  return parsed;
}

export function writeWorkspaceData(data: WorkspaceData): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function removeWorkspaceData(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
