import "server-only";

import type { CodingToolId } from "@/lib/coding-agent/contracts";

import {
  CHAT_REPO_LIST_TOOL_NAME,
  CHAT_REPO_READ_TOOL_NAME,
  CHAT_REPO_SEARCH_TOOL_NAME,
} from "@/lib/chat/server/chat-tools-core";

export {
  CHAT_REPO_READ_TOOL_NAME,
  CHAT_REPO_LIST_TOOL_NAME,
  CHAT_REPO_SEARCH_TOOL_NAME,
  CHAT_PHASE1_TOOL_NAMES,
  chatToolNameToId,
  parseToolArguments,
} from "@/lib/chat/server/chat-tools-core";

const sharedRepoProps = {
  owner: { type: "string", description: "GitHub org or user (optional if server default)" },
  repo: { type: "string", description: "Repository name" },
};

export const CHAT_CODING_TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: CHAT_REPO_LIST_TOOL_NAME,
      description:
        "List GitHub repositories for an owner (read-only). Use to discover repos before search/read.",
      parameters: {
        type: "object",
        properties: {
          owner: sharedRepoProps.owner,
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: CHAT_REPO_SEARCH_TOOL_NAME,
      description:
        "Search code inside a GitHub repository (GitHub Code Search API). Requires server PAT. Finds matches in file content.",
      parameters: {
        type: "object",
        properties: {
          ...sharedRepoProps,
          query: { type: "string", description: "Code search query (symbol, function name, text)" },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: CHAT_REPO_READ_TOOL_NAME,
      description:
        "Read a single file from a GitHub repository (read-only). Never use for .env or secrets.",
      parameters: {
        type: "object",
        properties: {
          ...sharedRepoProps,
          path: { type: "string", description: "File path inside the repo" },
          ref: { type: "string", description: "Optional git ref" },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
];

export function codingToolIdToChatName(tool: CodingToolId): string | null {
  switch (tool) {
    case "repo.list":
      return CHAT_REPO_LIST_TOOL_NAME;
    case "repo.read":
      return CHAT_REPO_READ_TOOL_NAME;
    case "repo.search":
      return CHAT_REPO_SEARCH_TOOL_NAME;
    default:
      return null;
  }
}