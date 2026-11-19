import assert from "node:assert/strict";
import test from "node:test";

import { validateRepoReadInputCore } from "./repo-read-guard-core.ts";

test("coding mode off is implicit — guard still blocks secrets", () => {
  const blocked = validateRepoReadInputCore({
    owner: "MagistrTheOne",
    repo: "nullxes_klaren",
    path: "config/.env.production",
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, "blocked_path");
});

test("allowed path resolves defaults", () => {
  const ok = validateRepoReadInputCore({
    path: "app/api/chat/route.ts",
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.input.owner, "MagistrTheOne");
  assert.equal(ok.input.repo, "nullxes_klaren");
});