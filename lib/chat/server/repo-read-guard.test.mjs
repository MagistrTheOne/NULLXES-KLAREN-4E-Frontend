import assert from "node:assert/strict";
import test from "node:test";

import {
  guardRepoReadPath,
  validateRepoReadInputCore,
  summarizeRepoReadOutput,
} from "./repo-read-guard-core.ts";
import { extractKlarenToolCalls } from "./klaren-tool-protocol-core.ts";

test("blocks env and traversal paths", () => {
  assert.equal(guardRepoReadPath(".env"), false);
  assert.equal(guardRepoReadPath("app/../.env"), false);
  assert.equal(guardRepoReadPath("app/api/chat/route.ts"), true);
});

test("validate requires file path", () => {
  const missingPath = validateRepoReadInputCore({ owner: "o", repo: "r", path: "" });
  assert.equal(missingPath.ok, false);
  assert.equal(missingPath.reason, "invalid_path");
});

test("summarize file preview without leaking full content in card shape", () => {
  const body = {
    kind: "file",
    path: "README.md",
    content: "line1\nline2\nline3",
    truncated: false,
  };
  const summary = summarizeRepoReadOutput("o", "r", body);
  assert.equal(summary.kind, "file");
  assert.ok(summary.summary.preview.includes("line1"));
  assert.ok(summary.summary.preview.length < body.content.length + 50);
});

test("klaren protocol extracts repo.read", () => {
  const text = 'Hi\n```klaren_tool_call\n{"klaren_tool":"repo.read","input":{"path":"app/x.ts"}}\n```';
  const calls = extractKlarenToolCalls(text);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "repo_read");

test("klaren search tool block", () => {
  const text =
    '```klaren_tool_call\n{"klaren_tool":"repo.search","input":{"query":"resolveChatAdapter"}}\n```';
  const calls = extractKlarenToolCalls(text);
  assert.equal(calls[0]?.name, "repo_search");
});
});