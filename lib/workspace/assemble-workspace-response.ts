import { DEFAULT_PREFERENCES, createEmptyWorkspaceData } from "@/lib/workspace/defaults";
import {
  conversationSchema,
  workspaceDataSchema,
  type ParsedWorkspaceData,
} from "@/lib/workspace/workspace-contract";
import type { LocalAttachment, WorkspaceData } from "@/types/workspace";

function safeIso(value: string | Date | null | undefined, fallback: string): string {
  const date = value instanceof Date ? value : new Date(value ?? "");
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString();
}

function normalizeAttachments(value: unknown): LocalAttachment[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is LocalAttachment =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as LocalAttachment).id === "string" &&
      typeof (item as LocalAttachment).name === "string" &&
      typeof (item as LocalAttachment).mediaType === "string",
  );
}

export function parseStoredPreferences(stored: unknown): WorkspaceData["preferences"] {
  const merged = {
    ...DEFAULT_PREFERENCES,
    ...(stored && typeof stored === "object" ? stored : {}),
  };
  const parsed = workspaceDataSchema.shape.preferences.safeParse(merged);
  return parsed.success ? parsed.data : { ...DEFAULT_PREFERENCES };
}

type DbProject = { id: string; name: string; createdAt: string | Date };
type DbConversation = {
  id: string;
  title: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  projectId: string | null;
};
type DbMessage = {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string | Date;
  attachments: unknown;
};

export function assembleWorkspaceResponse(input: {
  projects: DbProject[];
  conversations: DbConversation[];
  messages: DbMessage[];
  preferences: unknown;
}): WorkspaceData {
  const now = new Date().toISOString();
  const projectIds = new Set(input.projects.map((project) => project.id));

  const messagesByConversation = new Map<string, DbMessage[]>();
  for (const message of input.messages) {
    const current = messagesByConversation.get(message.conversationId) ?? [];
    current.push(message);
    messagesByConversation.set(message.conversationId, current);
  }

  const assembled: ParsedWorkspaceData = {
    projects: input.projects.map((project) => ({
      id: project.id,
      name: project.name,
      createdAt: safeIso(project.createdAt, now),
    })),
    conversations: input.conversations
      .map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        createdAt: safeIso(conversation.createdAt, now),
        updatedAt: safeIso(conversation.updatedAt, now),
        projectId:
          conversation.projectId && projectIds.has(conversation.projectId)
            ? conversation.projectId
            : null,
        messages: (messagesByConversation.get(conversation.id) ?? []).map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: safeIso(message.createdAt, now),
          attachments: normalizeAttachments(message.attachments),
        })),
      }))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    preferences: parseStoredPreferences(input.preferences),
  };

  const parsed = workspaceDataSchema.safeParse(assembled);
  if (parsed.success) return parsed.data;

  console.error("Workspace payload failed validation after assembly.", {
    issues: parsed.error.issues.slice(0, 5).map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });

  const repaired: ParsedWorkspaceData = {
    ...assembled,
    conversations: assembled.conversations
      .map((conversation) => {
        const conv = conversationSchema.safeParse(conversation);
        return conv.success ? conv.data : null;
      })
      .filter((conversation): conversation is ParsedWorkspaceData["conversations"][number] => conversation !== null),
  };

  const repairedParsed = workspaceDataSchema.safeParse(repaired);
  if (repairedParsed.success) return repairedParsed.data;

  return createEmptyWorkspaceData();
}

export async function withTransientRetry<T>(
  operation: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }
  throw lastError;
}