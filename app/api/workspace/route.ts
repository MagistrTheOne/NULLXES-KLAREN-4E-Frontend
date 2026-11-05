import type { BatchItem } from "drizzle-orm/batch";
import { asc, eq } from "drizzle-orm";
import { DEFAULT_PREFERENCES } from "@/lib/storage/workspace-storage";
import { db } from "@/lib/db";
import {
  workspaceConversations,
  workspaceMessages,
  workspacePreferences,
  workspaceProjects,
} from "@/lib/db/schema";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { readLimitedBody } from "@/lib/http/read-limited-body";
import {
  workspaceDataSchema,
  type ParsedWorkspaceData,
} from "@/lib/workspace/workspace-contract";

const MAX_WORKSPACE_BODY_BYTES = 8 * 1024 * 1024;

function serviceUnavailable(): Response {
  return Response.json(
    { error: "Данные аккаунта временно недоступны." },
    { status: 503 },
  );
}

async function getUserId(): Promise<string | null | Response> {
  try {
    if (!process.env.NEON_AUTH_BASE_URL) return serviceUnavailable();
    const user = await getAuthenticatedUser();
    return user?.id ?? null;
  } catch (error) {
    console.error("Workspace session lookup failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return serviceUnavailable();
  }
}

export async function GET(): Promise<Response> {
  const userId = await getUserId();
  if (userId instanceof Response) return userId;
  if (!userId) return Response.json({ error: "Требуется вход в аккаунт." }, { status: 401 });

  try {
    const [projects, conversations, messages, preferenceRows] = await Promise.all([
      db.select().from(workspaceProjects)
        .where(eq(workspaceProjects.userId, userId))
        .orderBy(asc(workspaceProjects.createdAt)),
      db.select().from(workspaceConversations)
        .where(eq(workspaceConversations.userId, userId)),
      db.select().from(workspaceMessages)
        .where(eq(workspaceMessages.userId, userId))
        .orderBy(asc(workspaceMessages.position), asc(workspaceMessages.createdAt)),
      db.select().from(workspacePreferences)
        .where(eq(workspacePreferences.userId, userId))
        .limit(1),
    ]);

    const messagesByConversation = new Map<string, typeof messages>();
    for (const message of messages) {
      const current = messagesByConversation.get(message.conversationId) ?? [];
      current.push(message);
      messagesByConversation.set(message.conversationId, current);
    }

    return Response.json({
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        createdAt: new Date(project.createdAt).toISOString(),
      })),
      conversations: conversations
        .map((conversation) => ({
          id: conversation.id,
          title: conversation.title,
          createdAt: new Date(conversation.createdAt).toISOString(),
          updatedAt: new Date(conversation.updatedAt).toISOString(),
          projectId: conversation.projectId,
          messages: (messagesByConversation.get(conversation.id) ?? []).map(
            (message) => ({
              id: message.id,
              role: message.role,
              content: message.content,
              createdAt: new Date(message.createdAt).toISOString(),
              attachments: message.attachments,
            }),
          ),
        }))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
      preferences: { ...DEFAULT_PREFERENCES, ...preferenceRows[0]?.preferences },
    });
  } catch (error) {
    console.error("Workspace read failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Не удалось загрузить данные аккаунта." },
      { status: 500 },
    );
  }
}

function makeProjectRows(userId: string, data: ParsedWorkspaceData) {
  return data.projects.map((project) => ({ ...project, userId }));
}

function makeConversationRows(userId: string, data: ParsedWorkspaceData) {
  return data.conversations.map((conversation) => ({
    userId,
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    projectId: conversation.projectId,
  }));
}

function makeMessageRows(userId: string, data: ParsedWorkspaceData) {
  return data.conversations.flatMap((conversation) =>
    conversation.messages.map((message, position) => ({
      ...message,
      userId,
      conversationId: conversation.id,
      position,
    })),
  );
}

export async function PUT(request: Request): Promise<Response> {
  const userId = await getUserId();
  if (userId instanceof Response) return userId;
  if (!userId) return Response.json({ error: "Требуется вход в аккаунт." }, { status: 401 });

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return Response.json({ error: "Некорректный запрос." }, { status: 403 });
      }
    } catch {
      return Response.json({ error: "Некорректный запрос." }, { status: 403 });
    }
  }

  const body = await readLimitedBody(request, MAX_WORKSPACE_BODY_BYTES);
  if (body === null) {
    return Response.json({ error: "Данные аккаунта слишком велики." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return Response.json({ error: "Некорректные данные аккаунта." }, { status: 400 });
  }

  const parsed = workspaceDataSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: "Проверьте данные и повторите попытку." }, { status: 400 });
  }

  const data = parsed.data;
  const operations: [BatchItem<"pg">, ...BatchItem<"pg">[]] = [
    db.delete(workspaceMessages).where(eq(workspaceMessages.userId, userId)),
    db.delete(workspaceConversations).where(eq(workspaceConversations.userId, userId)),
    db.delete(workspaceProjects).where(eq(workspaceProjects.userId, userId)),
  ];

  const projectRows = makeProjectRows(userId, data);
  const conversationRows = makeConversationRows(userId, data);
  const messageRows = makeMessageRows(userId, data);

  if (projectRows.length > 0) {
    operations.push(db.insert(workspaceProjects).values(projectRows));
  }
  if (conversationRows.length > 0) {
    operations.push(db.insert(workspaceConversations).values(conversationRows));
  }
  if (messageRows.length > 0) {
    operations.push(db.insert(workspaceMessages).values(messageRows));
  }
  operations.push(
    db.insert(workspacePreferences)
      .values({ userId, preferences: data.preferences })
      .onConflictDoUpdate({
        target: workspacePreferences.userId,
        set: {
          preferences: data.preferences,
          updatedAt: new Date().toISOString(),
        },
      }),
  );

  try {
    await db.batch(operations);
    return Response.json({ saved: true });
  } catch (error) {
    console.error("Workspace write failed.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      code: typeof error === "object" && error !== null && "code" in error ? error.code : undefined,
      constraint: typeof error === "object" && error !== null && "constraint" in error ? error.constraint : undefined,
    });
    return Response.json(
      { error: "Не удалось сохранить данные аккаунта." },
      { status: 500 },
    );
  }
}
