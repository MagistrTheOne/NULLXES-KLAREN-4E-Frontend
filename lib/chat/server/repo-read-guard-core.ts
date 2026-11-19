import { CODING_AGENT_DEFAULT_OWNER, CODING_AGENT_DEFAULT_REPO } from "../../coding-agent/defaults.ts";
import { repoReadInputSchema } from "../../coding-agent/contracts.ts";
type RepoReadCardSummary = {
  owner: string;
  repo: string;
  path: string;
  kind: "file" | "directory";
  lines?: number;
  chars?: number;
  preview: string;
  truncated?: boolean;
};

const BLOCKED_PATH_SEGMENTS = [
  /^\.env/i,
  /\.env\./i,
  /credentials/i,
  /secret/i,
  /private[_-]?key/i,
  /\.pem$/i,
  /id_rsa/i,
  /\.p12$/i,
  /\.pfx$/i,
  /token\.json$/i,
];

const MAX_REPO_READ_PATH_LEN = 500;

export type RepoReadGuardResult =
  | { ok: true; input: { owner: string; repo: string; path: string; ref?: string } }
  | { ok: false; reason: "invalid_path" | "blocked_path" | "invalid_input" };

export function resolveRepoReadDefaults(
  input: {
    owner?: string;
    repo?: string;
    path?: string;
    ref?: string;
  },
  env?: { owner?: string; repo?: string },
) {
  return {
    owner: input.owner?.trim() || env?.owner?.trim() || CODING_AGENT_DEFAULT_OWNER,
    repo: input.repo?.trim() || env?.repo?.trim() || CODING_AGENT_DEFAULT_REPO,
    path: input.path?.trim() ?? "",
    ref: input.ref?.trim() || undefined,
  };
}

export function guardRepoReadPath(rawPath: string): boolean {
  const path = rawPath.replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (path.length > MAX_REPO_READ_PATH_LEN) return false;
  if (path.includes("..")) return false;
  const lower = path.toLowerCase();
  for (const pattern of BLOCKED_PATH_SEGMENTS) {
    if (pattern.test(lower) || pattern.test(path.split("/").pop() ?? "")) {
      return false;
    }
  }
  return true;
}

export function validateRepoReadInputCore(
  input: unknown,
  env?: { owner?: string; repo?: string },
): RepoReadGuardResult {
  const seed =
    typeof input === "object" && input !== null
      ? resolveRepoReadDefaults(input as { owner?: string; repo?: string; path?: string; ref?: string }, env)
      : resolveRepoReadDefaults({}, env);
  const parsed = repoReadInputSchema.safeParse(seed);
  if (!parsed.success) return { ok: false, reason: "invalid_input" };

  const resolved = parsed.data;
  if (!resolved.owner || !resolved.repo) {
    return { ok: false, reason: "invalid_input" };
  }
  if (resolved.path && !guardRepoReadPath(resolved.path)) {
    return { ok: false, reason: "blocked_path" };
  }
  if (!resolved.path) {
    return { ok: false, reason: "invalid_path" };
  }

  return {
    ok: true,
    input: {
      owner: resolved.owner,
      repo: resolved.repo,
      path: resolved.path.replace(/^\/+/, ""),
      ref: resolved.ref,
    },
  };
}

export function summarizeRepoReadOutput(
  owner: string,
  repo: string,
  output: unknown,
):
  | { kind: "file"; summary: RepoReadCardSummary }
  | { kind: "directory"; summary: RepoReadCardSummary }
  | { kind: "error"; message: string } {
  if (!output || typeof output !== "object") {
    return { kind: "error", message: "Пустой ответ инструмента." };
  }
  const body = output as Record<string, unknown>;
  const path = typeof body.path === "string" ? body.path : "";

  if (body.kind === "directory" && Array.isArray(body.entries)) {
    const names = (body.entries as Array<{ name?: string }>)
      .slice(0, 12)
      .map((entry) => entry.name ?? "?")
      .join(", ");
    return {
      kind: "directory",
      summary: {
        owner,
        repo,
        path,
        kind: "directory",
        preview: names || "(пусто)",
        chars: names.length,
      },
    };
  }

  if (body.kind === "file" && typeof body.content === "string") {
    const content = body.content;
    const lines = content.split("\n").length;
    const preview = content.split("\n").slice(0, 8).join("\n").slice(0, 1_200);
    return {
      kind: "file",
      summary: {
        owner,
        repo,
        path,
        kind: "file",
        lines,
        chars: content.length,
        preview,
        truncated: Boolean(body.truncated),
      },
    };
  }

  return { kind: "error", message: "Неизвестный формат repo.read." };
}