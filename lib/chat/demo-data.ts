import type { ChatMessage, Conversation, WorkspaceData } from "@/types/workspace";

const REFERENCE_TIME = Date.parse("2026-11-04T18:37:00.000Z");
const timestamp = (minutesAgo: number) =>
  new Date(REFERENCE_TIME - minutesAgo * 60_000).toISOString();

function message(
  id: string,
  role: ChatMessage["role"],
  content: string,
  minutesAgo: number,
): ChatMessage {
  return { id, role, content, createdAt: timestamp(minutesAgo), attachments: [] };
}

const firstConversation: Conversation = {
  id: "klaren-introduction",
  title: "Знакомство с KLAREN",
  createdAt: timestamp(4),
  updatedAt: timestamp(0),
  projectId: null,
  messages: [
    message("intro-user-1", "user", "Расскажи, что ты умеешь?", 3),
    message(
      "intro-klaren-1",
      "assistant",
      "Коротко?\nДумаю, анализирую, рассуждаю, пишу, кодю, работаю с текстом, аудио, изображениями, инструментами и реальным миром.\nИ да — у меня есть характер. 😉",
      2,
    ),
    message("intro-user-2", "user", "А в чём твоя фишка?", 1),
    message(
      "intro-klaren-2",
      "assistant",
      "Я не просто модель. Я — KLAREN 4E.\nМультимодальный интеллект с характером, созданный в NULLXES.\nРаботаю на результат. Без скуки. 😈",
      0,
    ),
  ],
};

export function createDemoData(): WorkspaceData {
  return {
    conversations: [firstConversation],
    projects: [],
    preferences: {
      sidebarCollapsed: false,
      portraitVisible: true,
      reducedMotion: false,
      enterToSend: true,
    },
  };
}
