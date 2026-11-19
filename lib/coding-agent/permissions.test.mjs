import assert from "node:assert/strict";
import test from "node:test";

import { evaluateToolExecution } from "./permissions-core.ts";
import { accessLabel } from "./access-labels.ts";

test("repo.list and repo.read work without GitHub PAT (public read)", () => {
  assert.equal(evaluateToolExecution("repo.list", {}).allowed, true);
  assert.equal(evaluateToolExecution("repo.read", {}).allowed, true);
});

test("repo.search requires server token", () => {
  const decision = evaluateToolExecution("repo.search", {});
  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "not_connected");
});

test("destructive tools stay disabled", () => {
  for (const tool of ["code.patch", "sandbox.test", "git.commit", "git.push"]) {
    const decision = evaluateToolExecution(tool, {});
    assert.equal(decision.allowed, false);
  }
});

test("access labels", () => {
  assert.equal(accessLabel("read"), "Чтение");
  assert.equal(accessLabel("separate_approval"), "Отдельное подтверждение");
});