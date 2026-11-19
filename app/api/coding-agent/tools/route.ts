import { CODING_TOOL_REGISTRY } from "@/lib/coding-agent/tool-registry";
import { getGithubCodingAgentMode } from "@/lib/coding-agent/permissions";
import { CODING_AGENT_DEFAULT_OWNER, CODING_AGENT_DEFAULT_REPO } from "@/lib/coding-agent/defaults";import { getAuthenticatedUser } from "@/lib/auth/server";

export async function GET(): Promise<Response> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return Response.json({ error: "Требуется вход в аккаунт." }, { status: 401 });
    }
  } catch {
    return Response.json({ error: "Не удалось проверить сессию." }, { status: 503 });
  }

  const githubMode = getGithubCodingAgentMode();

  return Response.json(
    {
      version: "coding-agent-v1",
      githubMode,
      githubConnected: githubMode === "full",
      defaults: {
        owner: process.env.GITHUB_CODING_AGENT_OWNER?.trim() || CODING_AGENT_DEFAULT_OWNER,
        repo: process.env.GITHUB_CODING_AGENT_REPO?.trim() || CODING_AGENT_DEFAULT_REPO,
      },
      tools: CODING_TOOL_REGISTRY,
    },
    { headers: { "Cache-Control": "no-store" } },
  );}