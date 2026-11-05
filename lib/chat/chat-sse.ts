import type { ChatStreamEvent } from "@/lib/chat/chat-contract";

export function formatChatSseEvent(event: ChatStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
