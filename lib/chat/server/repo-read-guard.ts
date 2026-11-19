import "server-only";

import {
  validateRepoReadInputCore,
  summarizeRepoReadOutput,
  guardRepoReadPath,
} from "@/lib/chat/server/repo-read-guard-core";

export {
  resolveRepoReadDefaults,
  summarizeRepoReadOutput,
  guardRepoReadPath,
  validateRepoReadInputCore,
  type RepoReadGuardResult,
} from "@/lib/chat/server/repo-read-guard-core";

export function validateRepoReadInput(input: unknown) {
  return validateRepoReadInputCore(input, {
    owner: process.env.GITHUB_CODING_AGENT_OWNER,
    repo: process.env.GITHUB_CODING_AGENT_REPO,
  });
}

export function wrapUntrustedRepoPayload(path: string, payload: string): string {
  const slice = payload.slice(0, 24_000);
  return `[UNTRUSTED_REPO_DATA path=${JSON.stringify(path)}]\n${slice}\n[/UNTRUSTED_REPO_DATA]`;
}

export function modelContextFromRepoRead(output: unknown): string {
  if (!output || typeof output !== "object") return "[UNTRUSTED_REPO_DATA] empty [/UNTRUSTED_REPO_DATA]";
  const body = output as Record<string, unknown>;
  const path = typeof body.path === "string" ? body.path : "unknown";
  if (body.kind === "directory" && Array.isArray(body.entries)) {
    const listing = (body.entries as Array<{ path?: string; type?: string }>)
      .slice(0, 40)
      .map((e) => `${e.type ?? "?"} ${e.path ?? e}`)
      .join("\n");
    return wrapUntrustedRepoPayload(path, listing || "(empty directory)");
  }
  if (body.kind === "file" && typeof body.content === "string") {
    return wrapUntrustedRepoPayload(path, body.content);
  }
  return wrapUntrustedRepoPayload(path, "(unreadable)");
}