"use client";

import type { CodingToolDefinition, ToolAccess } from "@/lib/coding-agent/contracts";

const accessLabels: Record<ToolAccess, string> = {
  read: "Чтение",
  approval: "С подтверждением",
  separate_approval: "Отдельное подтверждение",
};

const availabilityLabels: Record<CodingToolDefinition["availability"], string> = {
  available: "Доступно",
  preview: "Preview",
  not_connected: "Не подключено",
  disabled: "Отключено",
};

const availabilityClass: Record<CodingToolDefinition["availability"], string> = {
  available: "text-[#b8d4a8]",
  preview: "text-[#c6a46a]",
  not_connected: "text-[#8f8f8f]",
  disabled: "text-[#6a6a6a]",
};

export type GithubCodingAgentUiMode = "full" | "public";

interface CodingToolsTableProps {
  tools: CodingToolDefinition[];
  githubMode?: GithubCodingAgentUiMode;
  /** @deprecated используй githubMode */
  githubConnected?: boolean;
}

export function CodingToolsTable({
  tools,
  githubMode,
  githubConnected,
}: CodingToolsTableProps) {
  const mode: GithubCodingAgentUiMode =
    githubMode ?? (githubConnected ? "full" : "public");

  const githubLine =
    mode === "full"      ? "GitHub (server): PAT — list / read / search"
      : "GitHub: публичное чтение (search — после PAT на сервере)";

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-[10px] font-medium tracking-[0.3em] text-[#c6a46a]">CODING AGENT V1</p>
        <p className="text-[11px] text-[#7a756c]">{githubLine}</p>
      </div>
      <div className="mt-4 overflow-x-auto border border-[#292929]">
        <table className="w-full min-w-160 text-left text-[12px]">
          <thead className="bg-[#111] text-[#8a8479]">
            <tr>
              <th className="px-4 py-2.5 font-medium">Tool</th>
              <th className="px-4 py-2.5 font-medium">Возможность</th>
              <th className="px-4 py-2.5 font-medium">Доступ</th>
              <th className="px-4 py-2.5 font-medium">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#292929]">
            {tools.map((tool) => (
              <tr key={tool.id} className="text-[#d8d2c8]">
                <td className="px-4 py-3 font-mono text-[11px] text-[#e8e2d8]">{tool.id}</td>
                <td className="px-4 py-3">{tool.capability}</td>
                <td className="px-4 py-3 text-[#a9a396]">{accessLabels[tool.access]}</td>
                <td className={`px-4 py-3 ${availabilityClass[tool.availability]}`}>
                  {availabilityLabels[tool.availability]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}