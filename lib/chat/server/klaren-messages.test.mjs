import assert from "node:assert/strict";
import test from "node:test";
import { toKlarenApiMessages } from "../klaren-api-messages.ts";

test("toKlarenApiMessages adds a single system instruction", () => {
  const messages = toKlarenApiMessages("Ты — Кларен.", [
    { role: "user", content: "Привет" },
    { role: "assistant", content: "Здорово." },
    { role: "user", content: "Ещё раз" },
  ]);

  assert.equal(messages[0].role, "system");
  assert.equal(messages[0].content, "Ты — Кларен.");
  assert.equal(messages.length, 4);
  assert.equal(messages[1].role, "user");
});

test("toKlarenApiMessages omits system when instructions empty", () => {
  const messages = toKlarenApiMessages("   ", [{ role: "user", content: "Hi" }]);
  assert.equal(messages.length, 1);
  assert.equal(messages[0].role, "user");
});