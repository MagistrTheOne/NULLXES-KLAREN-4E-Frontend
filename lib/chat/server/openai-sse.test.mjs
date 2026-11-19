import assert from "node:assert/strict";
import test from "node:test";
import { consumeOpenAIChatCompletionStream } from "../openai-sse-parse.ts";

function streamFromText(text) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
}

test("consumeOpenAIChatCompletionStream parses Cyrillic deltas", async () => {
  const payload = [
    'data: {"choices":[{"delta":{"content":"Привет"}}]}',
    "",
    'data: {"choices":[{"delta":{"content":"!"}}]}',
    "",
    "data: [DONE]",
    "",
  ].join("\n");

  let output = "";
  await consumeOpenAIChatCompletionStream(
    streamFromText(payload),
    (delta) => {
      output += delta;
    },
    new AbortController().signal,
  );

  assert.equal(output, "Привет!");
});