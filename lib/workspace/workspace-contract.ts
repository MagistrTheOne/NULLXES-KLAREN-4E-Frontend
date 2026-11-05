import { z } from "zod";
import type { WorkspaceData } from "@/types/workspace";

const preferencesSchema = z.object({
  sidebarCollapsed: z.boolean(),
  portraitVisible: z.boolean(),
  reducedMotion: z.boolean(),
  enterToSend: z.boolean(),
  userName: z.string().max(60),
  userContext: z.string().max(500),
  sharpness: z.enum(["balanced", "wry", "sharp"]),
  roleplayEnabled: z.boolean(),
  adultThemesEnabled: z.boolean(),
  codingModeEnabled: z.boolean(),
  codingStyle: z.enum(["balanced", "concise", "step-by-step"]),
  renderMarkdown: z.boolean(),
});

const attachmentSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  mediaType: z.string().min(1).max(120),
  previewDataUrl: z.string().max(4_000_000).optional(),
});

const messageSchema = z.object({
  id: z.string().min(1).max(100),
  role: z.enum(["user", "assistant"]),
  content: z.string().max(8_000),
  createdAt: z.string().datetime(),
  attachments: z.array(attachmentSchema).max(10),
});

const conversationSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().min(1).max(160),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  projectId: z.string().max(100).nullable(),
  messages: z.array(messageSchema).max(2_000),
});

const projectSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(120),
  createdAt: z.string().datetime(),
});

export const workspaceDataSchema = z
  .object({
    conversations: z.array(conversationSchema).max(500),
    projects: z.array(projectSchema).max(100),
    preferences: preferencesSchema,
  })
  .superRefine((data, context) => {
    const projectIds = new Set(data.projects.map((project) => project.id));
    if (projectIds.size !== data.projects.length) {
      context.addIssue({
        code: "custom",
        message: "Duplicate project id.",
        path: ["projects"],
      });
    }

    const conversationIds = new Set<string>();
    const messageIds = new Set<string>();
    let messageCount = 0;
    let totalTextLength = 0;

    for (const conversation of data.conversations) {
      if (conversationIds.has(conversation.id)) {
        context.addIssue({
          code: "custom",
          message: "Duplicate conversation id.",
          path: ["conversations"],
        });
      }
      conversationIds.add(conversation.id);

      if (conversation.projectId && !projectIds.has(conversation.projectId)) {
        context.addIssue({
          code: "custom",
          message: "Conversation project does not belong to this workspace.",
          path: ["conversations"],
        });
      }

      messageCount += conversation.messages.length;
      totalTextLength += conversation.messages.reduce(
        (total, message) => total + message.content.length,
        0,
      );
      for (const message of conversation.messages) {
        if (messageIds.has(message.id)) {
          context.addIssue({
            code: "custom",
            message: "Duplicate message id.",
            path: ["conversations"],
          });
        }
        messageIds.add(message.id);
      }
    }

    if (messageCount > 10_000 || totalTextLength > 10_000_000) {
      context.addIssue({
        code: "custom",
        message: "Workspace data exceeds supported limits.",
        path: ["conversations"],
      });
    }
  });

export type ParsedWorkspaceData = z.infer<typeof workspaceDataSchema>;

export function toWorkspaceData(data: ParsedWorkspaceData): WorkspaceData {
  return data;
}
