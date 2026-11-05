# NULLXES KLAREN 4E

**Official Frontend Interface · Orbital AI**

Developed by **NULLXES AI**

---

## Overview

**KLAREN 4E** is a proprietary multimodal artificial intelligence project developed by NULLXES.

This repository contains the official web interface for KLAREN 4E, designed to provide a unified environment for conversational intelligence, multimodal interaction, project management, and future autonomous capabilities.

The interface is built around a distinct AI identity, with a premium minimalist design and a modular architecture intended for integration with the KLAREN 4E inference runtime.

The chat interface sends messages through a server-side API route. Neon Managed Better Auth provides account sessions; each authenticated account's conversations, projects, and preferences are stored in Neon PostgreSQL.

## Technology Stack

- Next.js 16 — App Router
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui — `bpzk` preset
- Radix UI
- Phosphor Icons
- Neon PostgreSQL and Neon Serverless Driver
- Drizzle ORM and Drizzle Kit
- Neon Managed Better Auth (`@neon/auth`)

## Interface

The public `/` landing is composed from independent components in `components/landing`. It uses the approved character assets and English product copy. Technology has a compact architecture panel; research milestones are identified as goals. Contact details appear in Contact, without repetition in the footer.

Account routes: `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`. `/auth` redirects to login. Login shows email/password with recovery and registration links; verification is a separate contextual flow. Authenticated visitors entering through login continue to `/app`.

The sidebar account menu reads the real session and provides profile editing, workspace settings, password change, revocation of other sessions, and logout. No test credentials are included in this repository.

See [implementation and verification report](docs/frontend-delivery.md) for checks and external configuration requirements.

The application is organized into six primary workspaces:

| Workspace | Description |
|---|---|
| New Chat | Authenticated chat with streamed xAI responses |
| Conversations | Search, rename, delete, and organize account conversations |
| Model | KLAREN 4E product identity |
| Tools | Chat, coding-focused mode, conversation, and project workspaces |
| Projects | Create projects and associate conversations with them |
| Settings | User profile, response style, coding and Markdown preferences, interface and history controls |

The design follows the NULLXES visual identity: black and graphite surfaces, restrained metallic gold, minimal ornamentation, and a character-focused interface.

Conversation history, projects, preferences, and selected image previews are stored per account in Neon PostgreSQL. Chat requests go to `/api/chat`; attachments are not uploaded as model input. Existing experimental browser history is not automatically imported or deleted.

The optional user name and context are stored with the account and included in chat requests so they can personalize responses. Response-style controls cover tone, roleplay, adult themes, and coding verbosity. Coding mode changes response instructions but does not execute tools or inspect local project files. Assistant messages support Markdown, including syntax-highlighted fenced code; this can be disabled in Settings.

## Architecture
The frontend separates reusable UI, account authentication, workspace persistence, and inference communication.

```text
NULLXES KLAREN 4E
│
├── Frontend Application
│   ├── components/layout/       Application shell
│   ├── components/navigation/   Responsive sidebar
│   ├── components/chat/         Messages and composer
│   └── components/workspaces/   Conversations, model, tools, projects, settings
│
├── Server API
│   ├── app/api/auth/            Neon Managed Better Auth proxy
│   ├── app/api/chat/            Authenticated streaming chat endpoint
│   ├── app/api/workspace/       Per-account workspace persistence
│   └── lib/chat/server/         Fixed inference chain and adapters
│
├── Database
│   ├── lib/db/schema.ts         Drizzle workspace schema
│   └── drizzle/                 Versioned PostgreSQL migrations
│
└── Browser
    ├── lib/auth/client.ts       Same-origin Managed Auth client
    └── lib/chat/chat-client.ts  SSE chat client
```

The server sends chat requests only to xAI Grok. It never switches providers or retries through OpenAI. A provider failure is returned as an honest chat error; partial responses are not restarted. The browser always uses the same `/api/chat` SSE contract: `message.delta`, `message.completed`, and `message.error`. xAI uses the official `https://api.x.ai/v1` base URL and defaults to `grok-4.7`. See the [xAI quickstart](https://docs.x.ai/developers/quickstart), [text generation guide](https://docs.x.ai/developers/model-capabilities/text/generate-text), and [streaming guide](https://docs.x.ai/developers/model-capabilities/text/streaming).

Each event is sent as `data: <JSON>\n\n`:

```text
message.delta     {"type":"message.delta","delta":"text"}
message.completed {"type":"message.completed"}
message.error     {"type":"message.error","message":"Не удалось отправить сообщение. Повторите попытку.","retryable":true}
```

### Server configuration

Use only the root `.env` file. Never prefix credentials with `NEXT_PUBLIC_`.

| Variable | Purpose |
|---|---|
| `XAI_API_KEY` | Server-side xAI credential |
| `XAI_MODEL` | xAI model identifier; defaults to `grok-4.7` |
| `DATABASE_URL` | Neon PostgreSQL connection |
| `DATABASE_URL_UNPOOLED` | Optional direct Neon connection for schema migrations; use the hostname without `-pooler` |
| `NEON_AUTH_BASE_URL` | Auth URL copied from the enabled Neon Better Auth settings |
| `NEON_AUTH_COOKIE_SECRET` | At least 32 characters; if omitted, the existing `BETTER_AUTH_SECRET` is used |

Enable Better Auth for the Neon project in the Neon Console before using account flows. Managed Auth requires a supported AWS project without IP Allow or Private Networking. Email/password, email OTP, and password recovery use Neon's managed email delivery for development; production requires custom SMTP. Google/GitHub OAuth are intentionally not enabled yet. Phone OTP is not configured: it requires an SMS delivery webhook and an approved SMS provider.

Generate and apply schema changes with `npm run db:generate` and `npm run db:migrate`. For migrations, set `DATABASE_URL_UNPOOLED` in the root `.env` to the direct Neon connection (without `-pooler`); `DATABASE_URL` remains the runtime connection. The current Neon database already has the workspace tables. New users start with an empty account workspace; existing experimental browser history is left untouched and is not uploaded.

When the KLAREN 4E inference service is ready, replace the server-side xAI adapter with the native model endpoint; no browser provider or model selection is involved.

Restart the development server after changing `.env`. The chat endpoint requires an authenticated account, limits requests to 10 per minute per account, and caps each output at 1,024 tokens. The in-memory limit is not distributed rate limiting; production deployments still need appropriate spending controls.

## Getting Started

### Requirements

- Node.js compatible with Next.js 16
- npm

### Installation

```bash
git clone <repository-url>
cd <repository-directory>
npm install
```

### Development

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

### Production Build

```bash
npm run build
npm run start
```

## Development Status

| Component | Status |
|---|---|
| Visual design | Concept approved |
| Frontend architecture | Server-side chat API with account authentication |
| Chat interface | Streaming through `/api/chat` |
| Account authentication | Neon Managed Better Auth integration |
| Conversation persistence | Neon PostgreSQL, scoped to the signed-in account |
| Project management | Neon PostgreSQL, scoped to the signed-in account |
| Settings and navigation | Implemented |
| Image attachments | Local preview only |
| Chat inference | xAI Grok |
| Audio and vision integration | Planned |
| External tool execution | Planned |
| Physical AI integration | Research roadmap |
| Orbital AI capabilities | Long-term roadmap |

Features described as planned are not represented as operational.

## KLAREN 4E Intelligence

The KLAREN 4E model is developed separately from this frontend application.

Model repository:

[NULLXES KLAREN 4E — Hugging Face](https://huggingface.co/MagistrTheOne/NULLXES-KLAREN-4E)

The frontend repository does not contain the complete model weights, training datasets, or private inference infrastructure.

## Security

Do not commit API keys, credentials, private model artifacts, or production environment configuration.

Backend credentials and sensitive operations must remain server-side.

Keep credentials server-side. Configure and verify Neon Managed Auth, production SMTP, and spending controls before public deployment. The app does not implement SMS delivery or activate OAuth providers until configured.

## Organization

**NULLXES**

Private AI engineering and intelligent systems development.

Areas of research and development include multimodal intelligence, autonomous systems, physical AI, and orbital intelligence architectures.

**Contact:** ceo@nullxes.com

**Model:** [huggingface.co/MagistrTheOne/NULLXES-KLAREN-4E](https://huggingface.co/MagistrTheOne/NULLXES-KLAREN-4E)

## Intellectual Property

NULLXES and KLAREN 4E are project and product identifiers associated with NULLXES.

Unless a separate license is provided, no open-source license is granted for this frontend repository.

The licensing terms of the underlying AI model and third-party dependencies are separate from those of this application.

---

**NULLXES — ONE INTELLIGENCE. DIFFERENT BODIES.**

© 2026 NULLXES. All rights reserved.
