/**
 * Local OpenAI-compatible mock for KLAREN adapter integration tests.
 * Usage: node scripts/mock-klaren-openai-server.mjs
 *        KLAREN_API_URL=http://127.0.0.1:8765 KLAREN_MODEL=klaren-4e CHAT_PROVIDER=klaren
 */
import { createServer } from "node:http";

const port = Number(process.env.MOCK_KLAREN_PORT ?? 8765);

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);

  if (request.method === "GET" && url.pathname === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  if (request.method === "GET" && url.pathname === "/ready") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ready: true, model: "klaren-4e-mock" }));
    return;
  }

  if (request.method !== "POST" || url.pathname !== "/v1/chat/completions") {
    response.writeHead(404).end();
    return;
  }

  const chunks = ["ХОБА", "-", "ХОБА", "! ", "Кларен на связи."];
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
  });

  for (const chunk of chunks) {
    response.write(
      `data: ${JSON.stringify({ choices: [{ delta: { content: chunk } }] })}\n\n`,
    );
  }
  response.write("data: [DONE]\n\n");
  response.end();
});

server.listen(port, "127.0.0.1", () => {
  console.log(`KLAREN mock gateway listening on http://127.0.0.1:${port}`);
});