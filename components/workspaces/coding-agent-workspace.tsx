"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AgentStreamEvent, CodingToolDefinition } from "@/lib/coding-agent/contracts";
import {
  CodingToolsTable,
  type GithubCodingAgentUiMode,
} from "@/components/workspaces/coding-tools-table";
interface CodingAgentWorkspaceProps {
  onOpenChat: () => void;
}

export function CodingAgentWorkspace({ onOpenChat }: CodingAgentWorkspaceProps) {
  const [tools, setTools] = useState<CodingToolDefinition[]>([]);
  const [githubMode, setGithubMode] = useState<GithubCodingAgentUiMode>("public");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [path, setPath] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch("/api/coding-agent/tools", { cache: "no-store" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then(
        (
          payload: {
            tools?: CodingToolDefinition[];
            githubMode?: GithubCodingAgentUiMode;
            githubConnected?: boolean;
            defaults?: { owner?: string; repo?: string };
          } | null,
        ) => {
          if (!payload) return;
          setTools(payload.tools ?? []);
          setGithubMode(
            payload.githubMode ??
              (payload.githubConnected ? "full" : "public"),
          );
          if (payload.defaults?.owner) {
            setOwner((prev) => prev || payload.defaults!.owner!);
          }
          if (payload.defaults?.repo) {
            setRepo((prev) => prev || payload.defaults!.repo!);
          }
        },
      )
      .catch(() => undefined);
  }, []);
  const runTool = useCallback(async (tool: "repo.list" | "repo.read" | "repo.search") => {
    setBusy(true);
    setError("");
    setResult("");
    try {
      const input =
        tool === "repo.list"
          ? { owner: owner.trim() || undefined }
          : tool === "repo.read"
            ? { owner: owner.trim(), repo: repo.trim(), path: path.trim() }
            : { owner: owner.trim(), repo: repo.trim(), query: query.trim() };

      const response = await fetch("/api/coding-agent/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, input }),
      });
      const payload = (await response.json()) as { events?: AgentStreamEvent[]; error?: string };
      if (!response.ok) throw new Error(payload.error ?? `HTTP ${response.status}`);

      const toolResult = payload.events?.find((event) => event.type === "tool.result");
      const toolError = payload.events?.find((event) => event.type === "tool.error");
      const approval = payload.events?.find((event) => event.type === "approval.required");

      if (toolResult && toolResult.type === "tool.result") {
        setResult(JSON.stringify(toolResult.output, null, 2));
      } else if (toolError && toolError.type === "tool.error") {
        setError(toolError.message);
      } else if (approval && approval.type === "approval.required") {
        setError(approval.summary);
      } else {
        setError("Нет результата инструмента.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Сбой Coding Agent.");
    } finally {
      setBusy(false);
    }
  }, [owner, path, query, repo]);

  return (
    <div className="page-workspace overflow-y-auto">
      <div className="mx-auto w-full max-w-245 px-5 pb-12 pt-10 sm:px-8 lg:px-12">
        <p className="text-[10px] font-medium tracking-[0.3em] text-[#c6a46a]">РЕЖИМ КОДИНГА</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight text-[#f1f1f1] sm:text-[38px]">
          Coding Agent
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#929292]">
          Чтение репозитория на сервере. Патчи, тесты, commit и push отключены до отдельных approval-flow.
          Чат с Кларен остаётся отдельным контуром.
        </p>

        {tools.length > 0 && (
          <CodingToolsTable tools={tools} githubMode={githubMode} />
        )}
        <section className="mt-8 border border-[#292929] p-4 sm:p-5">
          <p className="text-[11px] font-medium tracking-[0.2em] text-[#b89a61]">PHASE 1 · READ ONLY</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-[12px] text-[#9a9489]">
              owner
              <Input value={owner} onChange={(e) => setOwner(e.target.value)} className="mt-1 border-[#302d27] bg-[#0b0b0b]" placeholder="org-or-user" />
            </label>
            <label className="block text-[12px] text-[#9a9489]">
              repo
              <Input value={repo} onChange={(e) => setRepo(e.target.value)} className="mt-1 border-[#302d27] bg-[#0b0b0b]" placeholder="nullxes_klaren" />
            </label>
            <label className="block text-[12px] text-[#9a9489] sm:col-span-2">
              path (repo.read)
              <Input value={path} onChange={(e) => setPath(e.target.value)} className="mt-1 border-[#302d27] bg-[#0b0b0b]" placeholder="README.md" />
            </label>
            <label className="block text-[12px] text-[#9a9489] sm:col-span-2">
              query (repo.search)
              <Input value={query} onChange={(e) => setQuery(e.target.value)} className="mt-1 border-[#302d27] bg-[#0b0b0b]" placeholder="resolveChatAdapter" />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" disabled={busy} variant="outline" className="border-[#3d362c] text-[#e5d4b2]" onClick={() => void runTool("repo.list")}>
              repo.list
            </Button>
            <Button type="button" disabled={busy || !owner.trim() || !repo.trim()} variant="outline" className="border-[#3d362c] text-[#e5d4b2]" onClick={() => void runTool("repo.read")}>
              repo.read
            </Button>
            <Button
              type="button"
              disabled={
                busy ||
                githubMode !== "full" ||
                !owner.trim() ||
                !repo.trim() ||
                !query.trim()
              }
              variant="outline"
              className="border-[#3d362c] text-[#e5d4b2]"
              title={githubMode !== "full" ? "Нужен PAT на сервере" : undefined}
              onClick={() => void runTool("repo.search")}
            >
              repo.search
            </Button>            <Button type="button" onClick={onOpenChat} className="ml-auto gap-2 bg-[#c6a46a] text-[#100e0a] hover:bg-[#d6b77e]">
              Чат с подсказками кода
              <ArrowRight size={14} />
            </Button>
          </div>
          {error && <p className="mt-4 text-sm text-[#e0a89a]" role="alert">{error}</p>}
          {result && (
            <pre className="mt-4 max-h-80 overflow-auto rounded-md border border-[#2a2a2a] bg-[#0a0a0a] p-3 text-[11px] leading-5 text-[#d3cec4]">
              {result}
            </pre>
          )}
        </section>
      </div>
    </div>
  );
}