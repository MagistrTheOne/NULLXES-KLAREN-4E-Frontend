# NULLXES KLAREN 4E — Voice runtime contract

Status: frontend transport implemented; own KLAREN ASR/LLM deployment is not connected.

## Current working code paths

- Browser (Next.js 16) records a short audio utterance with MediaRecorder.
- POST `/api/voice/transcribe` — authenticated server route, temporary xAI `grok-voice-transcribe-2.0`.
- Existing POST `/api/chat` — xAI text runtime, SSE text deltas into the existing conversation.
- POST `/api/voice/live` — server-only ElevenLabs `eleven_v4_turbo` Text-to-Dialogue WebSocket; streams MP3 to browser. Voice selection is by `KLARENCIA MARIA` exact match, or explicitly configured `ELEVENLABS_VOICE_ID`.
- POST `/api/voice/speak` — HTTP V4 Turbo fallback.
- GET `/api/voice/status` — authenticated voice discovery check.

No credential is sent to the browser or stored in a conversation.

## Planned KLAREN ASR replacement (not yet implemented)

Keep the frontend `POST /api/voice/transcribe` response stable:

```json
{"text":"Кларен, ты меня слышишь?"}
```

Behind the API boundary, replace the temporary xAI adapter with an independently deployed KLAREN ASR service after a documented runtime contract is available. Proposed request (pending confirmation against our ASR server): `multipart/form-data` with `file` (audio/webm, audio/wav, or audio/ogg), language `ru`, returning JSON `text` and optional timestamps. The exact internal endpoint and authentication mechanism must be agreed before activation.

For full-duplex voice, add a dedicated bidirectional gateway rather than trying to upgrade a Next.js App Router Route Handler directly. Proposed channels: client microphone PCM/Opus, ASR partial/final events, KLAREN text-generation final deltas, V4 audio chunks, explicit cancel/interruption. The current mode is turn-based and deliberately does not claim full-duplex functionality.

## Planned KLAREN model replacement

KLAREN HF weights: https://huggingface.co/MagistrTheOne/NULLXES-KLAREN-4E

The HF model repository is not a running inference endpoint. Keep `POST /api/chat` as the stable frontend boundary. Implement a server-side KLAREN adapter when an inference server is available. The backend applies the model's native Harmony chat template and exposes only final-channel text to the client, preserving existing SSE events: `message.delta`, `message.completed`, `message.error`. Do not concatenate Harmony tokens manually in browser code.

## Validation

```powershell
git pull --ff-only origin main
npm ci
node --env-file=.env scripts/voice-v4-check.mjs
node --env-file=.env scripts/voice-v4-check.mjs --synthesize
npm run dev
```

The last command with `--synthesize` uses ElevenLabs quota and saves the sample MP3 in the operating-system temporary directory. Voice quality, the private voice's V4 eligibility, xAI STT accuracy, Neon session stability and end-to-end latency require a real local environment; successful CI alone does not validate those services.

Environment variables remain in the single root `.env`; none are committed. Required: `XAI_API_KEY`, `ELEVENLABS_API_KEY`; optional override: `ELEVENLABS_VOICE_ID`. V4 Turbo model ID is pinned server-side.
