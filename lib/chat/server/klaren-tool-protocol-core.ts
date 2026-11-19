import { z } from "zod";
import type { CodingToolId } from "../../coding-agent/contracts.ts";

const klarenToolCallSchema = z.object({
  klaren_tool: z.enum(["repo.list", "repo.read", "repo.search"]),
  input: z.record(z.string(), z.unknown()).default({}),
});

const TOOL_MARKER = /```klaren_tool_call\s*\n([\s\S]*?)\n```/gi;

export const KLAREN_TOOL_TO_CHAT_NAME: Record<
  "repo.list" | "repo.read" | "repo.search",
  string
> = {
  "repo.list": "repo_list",
  "repo.read": "repo_read",
  "repo.search": "repo_search",
};

export type ExtractedKlarenToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export function extractKlarenToolCalls(assistantText: string): ExtractedKlarenToolCall[] {
  const calls: ExtractedKlarenToolCall[] = [];
  let index = 0;
  for (const match of assistantText.matchAll(TOOL_MARKER)) {
    const block = match[1]?.trim();
    if (!block) continue;
    let json: unknown;
    try {
      json = JSON.parse(block);
    } catch {
      continue;
    }
    const parsed = klarenToolCallSchema.safeParse(json);
    if (!parsed.success) continue;
    const chatName = KLAREN_TOOL_TO_CHAT_NAME[parsed.data.klaren_tool];
    calls.push({
      id: `klaren_tool_${index++}`,
      name: chatName,
      arguments: JSON.stringify(parsed.data.input),
    });
  }
  return calls;
}

export function stripKlarenToolMarkers(text: string): string {
  return text.replace(TOOL_MARKER, "").trim();
}

export const KLAREN_TOOL_PROTOCOL_HINT = `Доступные инструменты (по одному блоку на вызов):
\`\`\`klaren_tool_call
{"klaren_tool":"repo.search","input":{"query":"getAuthenticatedUser","owner":"","repo":""}}
\`\`\`
\`\`\`klaren_tool_call
{"klaren_tool":"repo.read","input":{"path":"lib/auth/server.ts"}}
\`\`\`
\`\`\`klaren_tool_call
{"klaren_tool":"repo.list","input":{"owner":"MagistrTheOne"}}
\`\`\`
klaren_tool: repo.list | repo.read | repo.search. owner/repo опциональны — сервер подставит дефолт. Не выдумывай файлы до результата.`;

export function isKlarenCodingTool(tool: CodingToolId): boolean {
  return tool === "repo.list" || tool === "repo.read" || tool === "repo.search";
}