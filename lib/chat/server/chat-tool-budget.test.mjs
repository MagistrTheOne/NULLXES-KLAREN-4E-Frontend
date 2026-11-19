import assert from "node:assert/strict";
import test from "node:test";

import {
  createToolLoopBudget,
  MAX_CHAT_TOOL_CALLS,
  stableArgsKey,
} from "./chat-tool-budget-core.ts";
import { validateRepoSearchInput } from "./chat-tool-input-guard-core.ts";
import { summarizeRepoListOutput, summarizeRepoSearchOutput } from "./chat-tool-summarize-core.ts";
import { chatToolNameToId } from "./chat-tools-core.ts";

test("chat tool name mapping", () => {
  assert.equal(chatToolNameToId("repo_list"), "repo.list");
  assert.equal(chatToolNameToId("repo_search"), "repo.search");
});

test("duplicate call detection", () => {
  const budget = createToolLoopBudget();
  const key = stableArgsKey({ path: "a.ts" });
  assert.equal(budget.registerDuplicate("repo.read", key), false);
  assert.equal(budget.registerDuplicate("repo.read", key), true);
});

test("tool call budget max", () => {
  const budget = createToolLoopBudget();
  for (let index = 0; index < MAX_CHAT_TOOL_CALLS; index += 1) {
    assert.equal(budget.canExecuteMore(), true);
    budget.markExecuted();
  }
  assert.equal(budget.canExecuteMore(), false);
});

test("search blocks suspicious query", () => {
  const blocked = validateRepoSearchInput({
    owner: "o",
    repo: "r",
    query: "GITHUB_TOKEN secret",
  });
  assert.equal(blocked.ok, false);
});

test("summarize list and search previews", () => {
  const list = summarizeRepoListOutput([
    { fullName: "o/r1", defaultBranch: "main" },
    { fullName: "o/r2", defaultBranch: "dev" },
  ]);
  assert.equal(list.tool, "repo.list");
  assert.ok(list.preview.includes("o/r1"));

  const search = summarizeRepoSearchOutput("o", "r", "auth", {
    query: "auth",
    items: [{ path: "lib/auth/server.ts" }, { path: "app/api/chat/route.ts" }],
  });
  assert.equal(search.matchCount, 2);
  assert.ok(search.preview.includes("lib/auth"));
});