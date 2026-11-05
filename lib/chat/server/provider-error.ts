import "server-only";

export type ChatProviderErrorCode = "configuration" | "provider" | "protocol";

export class ChatProviderError extends Error {
  constructor(
    readonly code: ChatProviderErrorCode,
    readonly retryable: boolean,
    readonly status?: number,
    readonly failureReason?: string,
  ) {
    super("Chat provider request failed.");
    this.name = "ChatProviderError";
  }
}
