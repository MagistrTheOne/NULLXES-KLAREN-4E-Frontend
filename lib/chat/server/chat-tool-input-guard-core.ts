import { repoListInputSchema, repoSearchInputSchema } from "../../coding-agent/contracts.ts";
import { CODING_AGENT_DEFAULT_OWNER, CODING_AGENT_DEFAULT_REPO } from "../../coding-agent/defaults.ts";
import { guardRepoReadPath, validateRepoReadInputCore } from "./repo-read-guard-core.ts";

const BLOCKED_SEARCH = /\.env|secret|token|password|private[_-]?key/i;

export function resolveOwnerRepo(input: { owner?: string; repo?: string }, env?: { owner?: string; repo?: string }) {
  return {
    owner: input.owner?.trim() || env?.owner?.trim() || CODING_AGENT_DEFAULT_OWNER,
    repo: input.repo?.trim() || env?.repo?.trim() || CODING_AGENT_DEFAULT_REPO,
  };
}

export function validateRepoListInput(input: unknown, env?: { owner?: string }) {
  const parsed = repoListInputSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, reason: "invalid_input" as const };
  const owner = parsed.data.owner?.trim() || env?.owner?.trim() || CODING_AGENT_DEFAULT_OWNER;
  return { ok: true as const, input: { owner } };
}

export function validateRepoSearchInput(
  input: unknown,
  env?: { owner?: string; repo?: string },
) {
  const parsed = repoSearchInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, reason: "invalid_input" as const };
  const { owner, repo } = resolveOwnerRepo(parsed.data, env);
  const query = parsed.data.query.trim();
  if (!query || query.length > 256) return { ok: false as const, reason: "invalid_input" as const };
  if (BLOCKED_SEARCH.test(query)) return { ok: false as const, reason: "blocked_query" as const };
  return { ok: true as const, input: { owner, repo, query } };
}

export function validateRepoReadForChat(input: unknown, env?: { owner?: string; repo?: string }) {
  return validateRepoReadInputCore(input, env);
}

export { guardRepoReadPath };