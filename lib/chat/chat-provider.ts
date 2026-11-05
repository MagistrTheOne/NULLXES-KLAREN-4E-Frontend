import type { ChatRequestMessage } from "@/lib/chat/chat-contract";

export interface ChatAdapter {
  stream(input: {
    messages: ChatRequestMessage[];
    instructions: string;
    signal: AbortSignal;
    onDelta: (delta: string) => void;
  }): Promise<void>;
}
