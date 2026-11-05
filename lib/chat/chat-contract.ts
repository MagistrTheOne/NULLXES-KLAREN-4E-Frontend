import { z } from "zod";
import {
  MAX_CHAT_HISTORY_LENGTH,
  MAX_CHAT_MESSAGE_LENGTH,
  MAX_CHAT_MESSAGES,
} from "@/lib/chat/chat-limits";

export {
  MAX_CHAT_HISTORY_LENGTH,
  MAX_CHAT_MESSAGE_LENGTH,
  MAX_CHAT_MESSAGES,
  MAX_CHAT_REQUEST_BYTES,
} from "@/lib/chat/chat-limits";

const chatRequestMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(MAX_CHAT_MESSAGE_LENGTH),
});

const chatImageSchema = z.string().max(2_800_000).regex(/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/);

const chatPersonalizationSchema = z.object({
  userName: z.string().max(60).default(""),
  userContext: z.string().max(500).default(""),
  pinnedMemories: z.array(z.string().max(240)).max(10).default([]),
  projectContext: z.string().max(14_000).default(""),
  sharpness: z.enum(["balanced", "wry", "sharp"]).default("wry"),
  roleplayEnabled: z.boolean().default(false),
  adultThemesEnabled: z.boolean().default(false),
  codingModeEnabled: z.boolean().default(false),
  codingStyle: z.enum(["balanced", "concise", "step-by-step"]).default("balanced"),
});

export const chatRequestSchema = z
  .object({
    messages: z.array(chatRequestMessageSchema).min(1).max(MAX_CHAT_MESSAGES),
    personalization: chatPersonalizationSchema.optional(),
    images: z.array(chatImageSchema).max(4).default([]),
    files: z.array(z.object({ id: z.string().max(160), proof: z.string().max(160) })).max(4).default([]),
  })
  .superRefine(({ messages, images }, context) => {
    if (images.reduce((bytes, value) => bytes + Math.ceil((value.length - value.indexOf(",") - 1) * 0.75), 0) > 3_100_000) {
      context.addIssue({ code: "custom", message: "Images exceed the total size limit.", path: ["images"] });
    }
    if (messages.at(-1)?.role !== "user") {
      context.addIssue({
        code: "custom",
        message: "The last message must be from the user.",
        path: ["messages"],
      });
    }

    if (messages.some((message) => message.content.trim().length === 0)) {
      context.addIssue({
        code: "custom",
        message: "Messages must contain text.",
        path: ["messages"],
      });
    }

    if (messages.reduce((total, message) => total + message.content.length, 0) > MAX_CHAT_HISTORY_LENGTH) {
      context.addIssue({
        code: "custom",
        message: "The conversation is too long.",
        path: ["messages"],
      });
    }
  });

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatRequestMessage = z.infer<typeof chatRequestMessageSchema>;
export type ChatPersonalization = z.infer<typeof chatPersonalizationSchema>;

export type ChatStreamEvent =
  | { type: "message.delta"; delta: string }
  | { type: "message.completed" }
  | { type: "message.error"; message: string; retryable: boolean };
