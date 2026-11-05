# Telegram Business test — KLAREN 4E

This is a **temporary isolated test**. It does **not** link Telegram conversations to Neon or the website. It does not require an ElevenLabs Agent or a Telegram userbot.

## Architecture

Inbound `business_message` from the personal **@klarenciamaria** Business account → existing Next.js `/api/telegram/webhook` → Grok via the existing xAI adapter → `sendMessage` with `business_connection_id` so the response is sent **from @klarenciamaria**, not from the transport bot.

For a voice note: Telegram `getFile` → xAI `grok-voice-transcribe-2.0` → Grok → ElevenLabs `eleven_v4_turbo` using KLARENCIA MARIA voice → Telegram `sendVoice` with the Business connection ID.

The transport bot `@klarennullxes_bot` must have **Secretary Mode**, and it must be connected in the Business settings of **@klarenciamaria**. Linking the bot in another person's Telegram settings does not grant access to @klarenciamaria.

## Add to the single existing root .env

Keep all existing environment variables and secrets unchanged:

```dotenv
TELEGRAM_TEST_ENABLED=true
TELEGRAM_TEST_OWNER_USERNAME=MagistrTheOne
TELEGRAM_TEST_BUSINESS_USERNAME=klarenciamaria
TELEGRAM_TEST_REPLY_MODE=mirror
# Optional, stronger sender check: numeric Telegram ID, once established:
# TELEGRAM_TEST_OWNER_ID=123456789
```

Also required already: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `XAI_API_KEY`, `ELEVENLABS_API_KEY`. The verified ElevenLabs voice ID is `e738bbd5-79e5-424b-8cbc-6091ef01b82b`, which is the default in the existing voice adapter. No Agent ID.

`TELEGRAM_TEST_REPLY_MODE` values: `mirror` = text → text, voice → voice; `text` = always text; `voice` = always voice. `TELEGRAM_BUSINESS_ENABLED` and `TELEGRAM_BOT_ENABLED` from the legacy Neon bridge are not consulted when the isolated test mode is enabled.

## Privacy and test access

- Only incoming private Business messages from the allowlisted sender are processed. Default sender is Telegram username @MagistrTheOne. Prefer numeric `TELEGRAM_TEST_OWNER_ID` after confirming it, because usernames can change.
- Every Business message verifies the Business connection owner against @klarenciamaria using Telegram's `getBusinessConnection`. If this check fails, the update is ignored.
- The webhook checks Telegram's secret header before reaching the test handler.
- No Telegram conversations are persisted to Neon. An in-memory, capped conversation buffer keeps a small amount of context; it resets when Next.js restarts. Deduplication is also in-memory and therefore best-effort only.
- `after()` lets Telegram receive a prompt webhook acknowledgment while Grok/STT/TTS run. Local Next.js server and HTTPS tunnel must stay running. This is an **experimental delivery mechanism**, not a durable queue.
- Test mode ignores direct DMs sent to the transport bot; it processes `business_message` from the personal account only.
- Until the Business connection is actually enabled in **@klarenciamaria**, replies from that account will not work.
- Telegram Business Bot API does not offer native access to private video calls. Anam is for the website video-call feature and potentially generated video messages later, not a Telegram video call.

## First test

1. Run `npm run dev` and the existing HTTPS tunnel to localhost:3000.
2. Check that the Telegram webhook points to `https://<public-host>/api/telegram/webhook`; re-register only if URL changed.
3. From @MagistrTheOne, message **@klarenciamaria**, not @klarennullxes_bot.
4. KLAREN should answer from the @klarenciamaria Business connection, assuming all provider credentials and Business rights work.
5. Send a short Russian voice note. KLAREN should answer with an Eleven V4 voice note.
6. Disable with `TELEGRAM_TEST_ENABLED=false` when finished; restart the dev server.

Tests against the live accounts have **not** been run through GitHub CI. CI only confirms source-code quality and production build. Do not broaden Telegram's Business chat permissions while testing with a single sender.
