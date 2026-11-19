import type { CodingToolId } from "../../coding-agent/contracts.ts";
import { summarizeRepoReadOutput } from "./repo-read-guard-core.ts";
import type { ChatToolListSummary, ChatToolSearchSummary, ChatToolSummary } from "../message-parts.ts";

const MAX_LIST_ITEMS = 24;
const MAX_SEARCH_ITEMS = 15;

export function wrapUntrusted(label: string, payload: string): string {
  const slice = payload.slice(0, 16_000);
  return `[UNTRUSTED_REPO_DATA ${label}]\n${slice}\n[/UNTRUSTED_REPO_DATA]`;
}

export function modelContextFromRepoList(output: unknown): string {
  if (!Array.isArray(output)) {
    return wrapUntrusted('kind="list"', "(empty)");
  }
  const lines = (output as Array<{ fullName?: string; defaultBranch?: string }>)
    .slice(0, MAX_LIST_ITEMS)
    .map((repo) => `${repo.fullName ?? "?"} branch=${repo.defaultBranch ?? "?"}`);
  return wrapUntrusted('kind="list"', lines.join("\n") || "(no repos)");
}

export function summarizeRepoListOutput(output: unknown): ChatToolListSummary {
  const repos = Array.isArray(output) ? output : [];
  const preview = (repos as Array<{ fullName?: string }>)
    .slice(0, 8)
    .map((repo) => repo.fullName ?? "?")
    .join(", ");
  const owner =
    repos.length && typeof (repos[0] as { fullName?: string }).fullName === "string"
      ? ((repos[0] as { fullName: string }).fullName.split("/")[0] ?? "")
      : "";
  return {
    tool: "repo.list",
    owner: owner || "—",
    repoCount: repos.length,
    preview: preview || "(пусто)",
  };
}

export function modelContextFromRepoSearch(output: unknown): string {
  if (!output || typeof output !== "object") {
    return wrapUntrusted('kind="search"', "(empty)");
  }
  const body = output as { query?: string; items?: Array<{ path?: string; name?: string }> };
  const lines = (body.items ?? []).slice(0, MAX_SEARCH_ITEMS).map((item) => item.path ?? item.name ?? "?");
  return wrapUntrusted(`kind="search" query=${JSON.stringify(body.query ?? "")}`, lines.join("\n"));
}

export function summarizeRepoSearchOutput(
  owner: string,
  repo: string,
  query: string,
  output: unknown,
): ChatToolSearchSummary {
  const items =
    output && typeof output === "object" && Array.isArray((output as { items?: unknown }).items)
      ? ((output as { items: Array<{ path?: string }> }).items ?? [])
      : [];
  const preview = items
    .slice(0, 8)
    .map((item) => item.path ?? "?")
    .join("\n");
  return {
    tool: "repo.search",
    owner,
    repo,
    query,
    matchCount: items.length,
    preview: preview || "(нет совпадений)",
  };
}

export function buildToolSummary(
  tool: CodingToolId,
  meta: { owner: string; repo: string; path?: string; query?: string },
  output: unknown,
): ChatToolSummary {
  if (tool === "repo.read") {
    const fromOutput = summarizeRepoReadOutput(meta.owner, meta.repo, output);
    if (fromOutput.kind === "file" || fromOutput.kind === "directory") {
      return { tool: "repo.read" as const, ...fromOutput.summary };
    }
    return {
      tool: "repo.read",
      owner: meta.owner,
      repo: meta.repo,
      path: meta.path ?? "",
      kind: "file",
      preview: fromOutput.message.slice(0, 400),
    };
  }
  if (tool === "repo.list") {
    return summarizeRepoListOutput(output);
  }
  return summarizeRepoSearchOutput(meta.owner, meta.repo, meta.query ?? "", output);
}

export function modelContextForTool(tool: CodingToolId, output: unknown): string {
  if (tool === "repo.read") {
    const body = output as Record<string, unknown>;
    const path = typeof body.path === "string" ? body.path : "unknown";
    if (body.kind === "file" && typeof body.content === "string") {
      return wrapUntrusted(`path=${JSON.stringify(path)}`, body.content);
    }
    if (body.kind === "directory" && Array.isArray(body.entries)) {
      const listing = (body.entries as Array<{ path?: string; type?: string }>)
        .slice(0, 40)
        .map((e) => `${e.type ?? "?"} ${e.path ?? "?"}`)
        .join("\n");
      return wrapUntrusted(`path=${JSON.stringify(path)}`, listing);
    }
    return wrapUntrusted(`path=${JSON.stringify(path)}`, "(unreadable)");
  }
  if (tool === "repo.list") return modelContextFromRepoList(output);
  return modelContextFromRepoSearch(output);
}
