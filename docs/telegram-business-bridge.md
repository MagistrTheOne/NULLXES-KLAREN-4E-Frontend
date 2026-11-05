# KLAREN 4E — Telegram bridge (Next.js 16 / Neon / Grok)

This integration uses the existing @klarennullxes_bot and the existing xAI character model. It does **not** create a Telegram userbot or impersonate arbitrary Telegram accounts.

## Environment

Append to the **one existing root** `.env`; never commit or replace it.

```dotenv
TELEGRAM_BOT_TOKEN=<BotFather token>
TELEGRAM_WEBHOOK_SECRET=<random_32_plus_alphanumeric_characters>
TELEGRAM_BOT_ENABLED=false
TELEGRAM_BUSINESS_ENABLED=false
TELEGRAM_ALLOWED_CHAT_IDS=
```

Other existing environment variables remain unchanged: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `XAI_API_KEY`. Never use `NEXT_PUBLIC_` for BotFather credentials.

A linked user is **not automatically allowed** to trigger replies. Once the first account has linked, inspect the numeric Telegram ID in Settings and place it in `TELEGRAM_ALLOWED_CHAT_IDS`. Only then switch `TELEGRAM_BOT_ENABLED=true` for bot DMs. Keep `TELEGRAM_BUSINESS_ENABLED=false` until the correct @klarenciamaria Business account is connected and tested. For multiple approved senders use comma-separated IDs.

## Database setup

```bash
npm run db:migrate
```

Requires the schema migration in `drizzle/0002_klaren_telegram_bridge.sql`. No existing workspace tables are modified.

## Webhook registration

Telegram sends updates only to a publicly reachable HTTPS address (localhost is not sufficient). The POST endpoint is:

`https://<your-public-host>/api/telegram/webhook`

Set the webhook with the Telegram Bot API `setWebhook`, using:
- `url`: the URL above
- `secret_token`: the value from `TELEGRAM_WEBHOOK_SECRET`
- `allowed_updates`: `["message","business_message","business_connection"]`

For health, call `getWebhookInfo` using your BotFather token **from your machine**. Never paste the token or provider response containing it into issues or screenshots.

Telegram may retry when a webhook responds non-2xx. This starter bridge deduplicates by update ID in Neon. Production-grade high-volume delivery would require a durable queue, job retry policy, monitoring and a stronger delivery state machine.

## Linking and first private test

1. Log in to KLAREN on the website using Neon Auth, open **Settings → Telegram**.
2. Click `Create linking URL`. This gives a one-time `t.me/klarennullxes_bot?start=link_...` URL valid for 10 minutes.
3. Open it from your **personal test Telegram account** (the same account that will write to the bot or to @klarenciamaria). Click **Start**.
4. Refresh the Settings status. It will display your numeric Telegram ID.
5. Put that numeric ID into `TELEGRAM_ALLOWED_CHAT_IDS`, set `TELEGRAM_BOT_ENABLED=true` and restart the Next.js process.
6. Send a private text message to @klarennullxes_bot. The response is generated via xAI Grok and saved in the dedicated Telegram message tables.
7. Reload the KLAREN website. A Telegram conversation appears in **Dialogs** as a **read-only projection**. The main site's full-workspace save will not delete those Telegram records.

### Business account

The Business bot must be connected in the **@klarenciamaria account**, not merely in your other Telegram account. Limit selected chats in Telegram Business settings. When this is verified, set `TELEGRAM_BUSINESS_ENABLED=true`. The bot's `sendMessage` API includes `business_connection_id` on Business replies.

## Limits / not yet implemented

- This is **not** live two-way editing of one chat. Telegram threads are imported into the website on reload and are read-only there; replies must be sent from Telegram. Site and Telegram share the character instructions and linked Neon user preferences, not a single mutable conversation.
- First version handles text messages only. Voice notes, attachments, commands, sending from the site into Telegram, and real-time push to the site are separate work.
- Auto-replies disabled when allowlist is empty. A public webhook and actual live provider response have not been tested solely by passing CI.
- If Telegram has different Business permissions or a connected account changes, verify the connection and allowed chats before enabling broad access.
