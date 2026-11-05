import type { ChatRequestMessage } from "@/lib/chat/chat-contract";

export interface ChatAdapter {
  stream(input: {
    messages: ChatRequestMessage[];
    images?: string[];
    files?: string[];
    instructions: string;
    signal: AbortSignal;
    onDelta: (delta: string) => void;
  }): Promise<void>;
}
