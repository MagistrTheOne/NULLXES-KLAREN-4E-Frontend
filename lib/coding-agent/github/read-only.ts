import "server-only";

import {
  repoListInputSchema,
  repoReadInputSchema,
  repoSearchInputSchema,
} from "@/lib/coding-agent/contracts";

import {
  CODING_AGENT_DEFAULT_OWNER,
  CODING_AGENT_DEFAULT_REF,
} from "@/lib/coding-agent/defaults";

const API = "https://api.github.com";

function githubToken(): string | undefined {
  return process.env.GITHUB_CODING_AGENT_TOKEN?.trim() || undefined;
}

function githubHeaders(requireAuth = false): HeadersInit {
  const token = githubToken();
  if (requireAuth && !token) {
    throw new Error("Для этого инструмента нужен GITHUB_CODING_AGENT_TOKEN на сервере.");
  }
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "NULLXES-KLAREN-Coding-Agent",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}
export async function githubListRepos(input: unknown) {
  const parsed = repoListInputSchema.parse(input);
  const owner =
    parsed.owner?.trim() ||
    process.env.GITHUB_CODING_AGENT_OWNER?.trim() ||
    CODING_AGENT_DEFAULT_OWNER;  const url = owner
    ? `${API}/users/${encodeURIComponent(owner)}/repos?per_page=30&sort=updated`
    : `${API}/user/repos?per_page=30&sort=updated`;

  const response = await fetch(url, { headers: githubHeaders(), cache: "no-store" });
  if (!response.ok) {
    throw new Error(`GitHub list failed (${response.status}).`);
  }
  const repos = (await response.json()) as Array<{ full_name: string; private: boolean; default_branch: string }>;
  return repos.map((repo) => ({
    fullName: repo.full_name,
    private: repo.private,
    defaultBranch: repo.default_branch,
  }));
}

export async function githubReadPath(input: unknown) {
  const parsed = repoReadInputSchema.parse(input);
  const ref =
    parsed.ref?.trim() ||
    process.env.GITHUB_CODING_AGENT_REF?.trim() ||
    CODING_AGENT_DEFAULT_REF ||
    "HEAD";  const path = parsed.path.replace(/^\/+/, "");
  const base = `${API}/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/contents`;
  const url = path
    ? `${base}/${path.split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(ref)}`
    : `${base}?ref=${encodeURIComponent(ref)}`;

  const response = await fetch(url, { headers: githubHeaders(), cache: "no-store" });
  if (!response.ok) {
    throw new Error(`GitHub read failed (${response.status}).`);
  }

  const body: unknown = await response.json();

  if (Array.isArray(body)) {
    const entries = body as Array<{ name: string; path: string; type: string; size?: number }>;
    return {
      kind: "directory" as const,
      path: path || "/",
      entries: entries.map((entry) => ({
        name: entry.name,
        path: entry.path,
        type: entry.type,
        size: entry.size,
      })),
    };
  }

  const file = body as {
    type: string;
    path: string;
    sha?: string;
    content?: string;
    encoding?: string;
    size?: number;
  };

  if (file.encoding === "base64" && file.content) {
    const text = Buffer.from(file.content.replace(/\n/g, ""), "base64").toString("utf8");
    return {
      kind: "file" as const,
      path: file.path,
      sha: file.sha,
      size: file.size,
      content: text.slice(0, 120_000),
      truncated: text.length > 120_000,
    };
  }

  return { kind: "file" as const, path: file.path, content: "", truncated: false };
}

export async function githubSearchCode(input: unknown) {
  const parsed = repoSearchInputSchema.parse(input);
  const q = `${parsed.query} repo:${parsed.owner}/${parsed.repo}`;
  const url = `${API}/search/code?q=${encodeURIComponent(q)}&per_page=20`;

  const response = await fetch(url, {
    headers: githubHeaders(true),
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`GitHub search failed (${response.status}).`);
  }  const body = (await response.json()) as {
    items: Array<{ name: string; path: string; sha: string; html_url: string }>;
  };
  return {
    query: parsed.query,
    items: body.items.map((item) => ({
      name: item.name,
      path: item.path,
      sha: item.sha,
    })),
  };
}