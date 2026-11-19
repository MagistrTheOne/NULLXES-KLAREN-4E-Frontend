import type { CodingToolId, ToolAccess } from "./contracts.ts";
import { getToolDefinition } from "./tool-registry.ts";

export type ToolExecutionDecision =
  | { allowed: true; reason: "read" }
  | { allowed: true; reason: "approved"; approvalToken: string }
  | { allowed: false; reason: "disabled" | "not_connected" | "approval_required" | "separate_approval_required" };

const PHASE1_READ = new Set<CodingToolId>(["repo.list", "repo.read"]);
const PHASE1_SEARCH = new Set<CodingToolId>(["repo.search"]);

export type GithubCodingAgentMode = "full" | "public" | "off";

export function isGithubCodingAgentConfigured(): boolean {
  return Boolean(process.env.GITHUB_CODING_AGENT_TOKEN?.trim());
}

/** full = серверный PAT (list/read/search); public = анонимное чтение публичных репо. */
export function getGithubCodingAgentMode(): GithubCodingAgentMode {
  if (isGithubCodingAgentConfigured()) return "full";
  return "public";
}

export function evaluateToolExecution(
  toolId: CodingToolId,
  options: { approvalToken?: string },
): ToolExecutionDecision {
  const tool = getToolDefinition(toolId);
  if (!tool) return { allowed: false, reason: "disabled" };

  if (tool.availability === "disabled" || tool.availability === "not_connected") {
    return { allowed: false, reason: tool.availability === "not_connected" ? "not_connected" : "disabled" };
  }

  if (PHASE1_READ.has(toolId)) {
    return { allowed: true, reason: "read" };
  }

  if (PHASE1_SEARCH.has(toolId)) {
    if (!isGithubCodingAgentConfigured()) {
      return { allowed: false, reason: "not_connected" };
    }
    return { allowed: true, reason: "read" };
  }

  return requireApprovalAccess(tool.access, options.approvalToken);
}
function requireApprovalAccess(access: ToolAccess, approvalToken?: string): ToolExecutionDecision {
  if (access === "read") {
    return { allowed: true, reason: "read" };
  }
  if (!approvalToken?.trim()) {
    return {
      allowed: false,
      reason: access === "separate_approval" ? "separate_approval_required" : "approval_required",
    };
  }
  return { allowed: true, reason: "approved", approvalToken: approvalToken.trim() };
}