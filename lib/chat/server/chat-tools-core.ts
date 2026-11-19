import type { CodingToolId } from "../../coding-agent/contracts.ts";

export const CHAT_REPO_READ_TOOL_NAME = "repo_read";
export const CHAT_REPO_LIST_TOOL_NAME = "repo_list";
export const CHAT_REPO_SEARCH_TOOL_NAME = "repo_search";

export const CHAT_PHASE1_TOOL_NAMES = new Set([
  CHAT_REPO_READ_TOOL_NAME,
  CHAT_REPO_LIST_TOOL_NAME,
  CHAT_REPO_SEARCH_TOOL_NAME,
]);

export function chatToolNameToId(name: string): CodingToolId | null {
  switch (name) {
    case CHAT_REPO_LIST_TOOL_NAME:
      return "repo.list";
    case CHAT_REPO_READ_TOOL_NAME:
      return "repo.read";
    case CHAT_REPO_SEARCH_TOOL_NAME:
      return "repo.search";
    default:
      return null;
  }
}

export function parseToolArguments(raw: string): Record<string, unknown> {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    return typeof value === "object" && value !== null ? value : {};
  } catch {
    return {};
  }
}