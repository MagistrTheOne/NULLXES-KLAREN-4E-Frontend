# NULLXES KLAREN 4E — Video Call Contract

## Identity / resource IDs

- Anam saved persona reference: `af7fc98c-b24a-47f9-b894-02a261d8763f` (character identity reference, not an LLM endpoint).
- Anam avatar: `71d29277-08ab-4cb7-88fd-606f284b6224`.
- Anam voice resource: `e738bbd5-79e5-424b-8cbc-6091ef01b82b`.
- ElevenLabs TTS voice: looked up from **ElevenLabs** by exact voice name `KLARENCIA MARIA` or via `ELEVENLABS_VOICE_ID` in the existing root `.env`. Do not assume the Anam UUID is a valid ElevenLabs voice ID.
- No ElevenLabs Agent. No `ELEVENLABS_AGENT_ID`. No Anam LLM.

## Pipeline

1. `ChatWorkspace` opens `KlarenVideoCall` via video icon in the composer. Existing sidebar and chat remain untouched.
2. Next.js `POST /api/avatar/session` verifies Neon Auth, creates a short-lived Anam token with `enableAudioPassthrough: true`; `CUSTOMER_CLIENT_V1` denotes external client orchestration, not a hosted Anam LLM.
3. Browser bundles `@anam-ai/js-sdk`, starts `createClient(sessionToken, { disableInputAudio: true })`, and streams to a video element.
4. Microphone recording is sent to `POST /api/voice/transcribe` for temporary xAI speech recognition.
5. Transcript is added as a normal chat user message; the existing `POST /api/chat` uses Grok with `mode: "video"`, adding the KLAREN spoken-character instructions only to that request.
6. Finished text is retained in the existing Neon/Drizzle conversation; `POST /api/voice/avatar-audio` streams ElevenLabs `eleven_v4_turbo` raw PCM 16kHz mono.
7. Browser forwards PCM bytes via Anam's `createAgentAudioInputStream({encoding:"pcm_s16le",sampleRate:16000,channels:1})`; Anam renders the lip-synced WebRTC output. **No second browser audio player**.
8. Hanging up ends the avatar video stream and microphone/audio requests; the main chat remains available.

## Current limitations and acceptance tests

- Video speech turns are **push-to-talk** pending a true full-duplex transport. Do not describe as natural barge-in realtime audio conversation.
- Anam session token, real ElevenLabs voice selection, avatar lip sync, and quality of Russian V4 TTS must be tested against the owner's connected account. A green CI build is not a provider integration test.
- Anam's saved persona config is not mutated, and any saved Anam LLM is bypassed by this particular external-audio session.
- In-browser emoji overlays are separate from provider facial expressions. Text-conditioned reactions are best effort; Director Notes events, if emitted by the avatar engine, can add more.
- No Anam/ElevenLabs keys are included in JavaScript bundles or committed configuration.
- Maintain the one-root-`.env` convention. Do not modify or delete existing credentials.
- CI/CD remains unchanged.

## Local checks

```powershell
git pull --ff-only origin main
npm ci
node --env-file=.env scripts/voice-v4-check.mjs
npm run dev
```

After Neon Auth login, use the video button in the existing chat. The `/api/voice/status` endpoint can confirm the resolved ElevenLabs voice ID. If that lookup fails, verify the voice is actually in the ElevenLabs workspace; do not substitute an Anam UUID.
