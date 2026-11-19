# KLAREN 4E · RunPod integration (frontend)

**NULLXES GROUP · ORBITAL AI · Draft alignment with spec v1.0 (2026-11-19)**

## Stage 0 — Repository audit

| Integration point | Path | Role |
|---|---|---|
| Browser SSE client | `lib/chat/chat-client.ts` | Unchanged contract |
| Chat API | `app/api/chat/route.ts` | Auth, rate limit, `buildChatInstructions`, adapter |
| Adapter interface | `lib/chat/chat-provider.ts` | `ChatAdapter.stream` |
| Provider factory | `lib/chat/server/resolve-chat-adapter.ts` | `CHAT_PROVIDER` → xai \| klaren |
| xAI adapter | `lib/chat/server/xai-adapter.ts` | Default production proxy |
| KLAREN adapter | `lib/chat/server/klaren-adapter.ts` | RunPod OpenAI-compatible SSE |
| System prompt | `lib/chat/server/chat-instructions.ts` | App-level context (not weight identity) |
| KLAREN messages | `lib/chat/server/klaren-messages.ts` | `instructions` → single `system` message |
| SSE parser | `lib/chat/server/openai-sse.ts` | Upstream chunk parser |
| Runtime metadata | `app/api/chat/runtime/route.ts` | Model workspace facts |
| Telegram | `app/api/telegram/webhook/route.ts`, `lib/telegram/business-test.ts` | Shared `resolveChatAdapter()` |
| Persistence | `app/api/workspace/route.ts`, Neon | Unchanged |

**Not in this repo:** RunPod Pod image, weight download, `modeling_klaren.py`, GPU sizing. Use a separate runtime repository.

**Colab:** research/benchmarks only — not production chat availability.

**Default:** `CHAT_PROVIDER=xai` until staging signs off on live KLAREN stream.

## Stage 1 — RunPod runtime (separate deliverable)

Dedicated **GPU Pod** first (custom `trust_remote_code`, BF16 ~21B MoE). Serverless only after cold-start / TTFT / concurrency measurements.

Required endpoints on the gateway:

- `GET /health`
- `GET /ready` (false until weights loaded)
- `POST /v1/chat/completions` (streaming, UTF-8)

Pin HF revision: [NULLXES-KLAREN-4E](https://huggingface.co/MagistrTheOne/NULLXES-KLAREN-4E).

## Stage 2 — Local mock (no paid GPU)

```bash
node scripts/mock-klaren-openai-server.mjs
```

```env
CHAT_PROVIDER=klaren
KLAREN_API_URL=http://127.0.0.1:8765
KLAREN_MODEL=klaren-4e
```

```bash
node --test lib/chat/server/klaren-messages.test.mjs lib/chat/server/openai-sse.test.mjs
```

## Stage 3–5 — Staging → production

### Staging checklist

- [ ] `GET /api/chat/runtime` shows `provider: klaren`, `inferenceHost: RunPod`
- [ ] Authenticated `/api/chat` streams Cyrillic tokens
- [ ] Cancel mid-stream aborts upstream
- [ ] Empty / timeout / 503 return `message.error` with `retryable`
- [ ] Telegram webhook uses same provider
- [ ] No `KLAREN_API_KEY` in browser bundle
- [ ] Model workspace shows factual modalities (text only for Phase A)

### Rollback

Set `CHAT_PROVIDER=xai`, redeploy. No DB migration required.

### RunPod go-live target (owner schedule)

Planned staging window: **20–21 November 2026** — dedicated Pod, live checkpoint stream, then `CHAT_PROVIDER=klaren` on staging only.

**Do not** enable silent xAI fallback while UI labels replies as KLAREN 4E.

## Multimodal phases

| Phase | Frontend | Runtime |
|---|---|---|
| A Text | Current | RunPod chat |
| B Vision | `images[]` already in contract | Gateway multimodal body |
| C Audio | Existing STT/TTS routes | KLAREN ASR later |
| D Imagine | New async job API (future) | Separate generative service |

## Acceptance mapping

Production cutover requires explicit owner approval, live RunPod checkpoint, and staging checklist complete. Frontend adapter work does **not** imply GPU deployment is done.