import type { CodingToolId } from "../../coding-agent/contracts.ts";

export const MAX_CHAT_TOOL_CALLS = 6;
export const MAX_CHAT_TOOL_CONTEXT_CHARS = 48_000;
export const MAX_CHAT_TOOL_LOOP_MS = 120_000;

export type ToolCallFingerprint = {
  tool: CodingToolId;
  argsKey: string;
};

export function stableArgsKey(input: Record<string, unknown>): string {
  const keys = Object.keys(input).sort();
  const normalized: Record<string, unknown> = {};
  for (const key of keys) normalized[key] = input[key];
  return JSON.stringify(normalized);
}

export function createToolLoopBudget() {
  const startedAt = Date.now();
  const seen = new Set<string>();
  let contextChars = 0;
  let executed = 0;

  return {
    canExecuteMore(): boolean {
      return executed < MAX_CHAT_TOOL_CALLS;
    },
    assertTime(signal: AbortSignal) {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      if (Date.now() - startedAt > MAX_CHAT_TOOL_LOOP_MS) {
        throw new Error("tool_loop_timeout");
      }
    },
    registerDuplicate(tool: CodingToolId, argsKey: string): boolean {
      const key = `${tool}:${argsKey}`;
      if (seen.has(key)) return true;
      seen.add(key);
      return false;
    },
    addContext(chars: number): { allowed: boolean; total: number } {
      contextChars += chars;
      return {
        allowed: contextChars <= MAX_CHAT_TOOL_CONTEXT_CHARS,
        total: contextChars,
      };
    },
    markExecuted() {
      executed += 1;
    },
    executedCount() {
      return executed;
    },
  };
}