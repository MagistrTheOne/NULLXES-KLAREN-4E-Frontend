# KLAREN 4E

## ORBITAL INTELLIGENCE

**Orbital AI · Official Frontend**

A mind of her own.  
And a personality you won't forget.

She thinks. She talks back. **Meet Klaren.**

*мяу.*

---

**NULLXES GROUP**  
[ceo@nullxes.com](mailto:ceo@nullxes.com) · Telegram [@MagistrTheOne](https://t.me/MagistrTheOne)

This repository is the **frontend** of **KLAREN 4E — Orbital AI**: the web interface for conversational intelligence, multimodal interaction, projects, and future autonomous capabilities. Inference runtimes and model weights live outside this repo.

---

## Overview

**KLAREN 4E** is a proprietary multimodal artificial intelligence project developed by NULLXES.

The interface is built around a distinct AI identity: premium minimalist design, modular architecture, and a path to the KLAREN 4E inference runtime.

Authenticated users work in `/app`. Neon Managed Better Auth provides sessions; conversations, projects, and preferences persist in **Neon PostgreSQL** via `/api/workspace`. Chat streams through server-side `/api/chat` (currently xAI Grok behind the adapter boundary).

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

Public `/` landing: `components/landing` (approved character assets, English product copy).

Account routes: `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`. `/auth` redirects to login. After login, users continue to `/app`.

See [implementation and verification report](docs/frontend-delivery.md) for checks and external configuration.

| Workspace | Description |
|---|---|
| New Chat | Authenticated chat with streamed responses |
| Conversations | Search, rename, delete, and organize account conversations |
| Model | KLAREN 4E product identity |
| Tools | Chat, coding mode, navigation to conversations and projects |
| Projects | Create projects and associate conversations |
| Settings | Profile, response style, UI preferences, history controls |

Visual identity: black and graphite surfaces, restrained metallic gold, character-focused layout.

Workspace data is **not** stored in `localStorage`; only PostgreSQL via `/api/workspace`. Legacy browser key `nullxes-klaren-workspace-v1` is removed after the first successful account load (no import).

## Architecture

```text
NULLXES KLAREN 4E
│
├── Frontend Application
│   ├── components/layout/       Application shell
│   ├── components/navigation/   Responsive sidebar
│   ├── components/chat/         Messages, composer, video call
│   └── components/workspaces/   Conversations, model, tools, projects, settings
│
├── Server API
│   ├── app/api/auth/            Neon Managed Better Auth proxy
│   ├── app/api/chat/            Authenticated streaming chat endpoint
│   ├── app/api/workspace/       Per-account workspace persistence
│   └── lib/chat/server/         Inference adapters
│
├── Database
│   ├── lib/db/schema.ts         Drizzle workspace schema
│   └── drizzle/                 Versioned PostgreSQL migrations
│
└── Browser
    ├── lib/auth/client.ts       Same-origin Managed Auth client
    └── lib/chat/chat-client.ts  SSE chat client
```

Chat uses SSE: `message.delta`, `message.completed`, `message.error`. Default inference proxy: **xAI Grok** (`CHAT_PROVIDER=xai`). **KLAREN 4E on RunPod** is enabled with `CHAT_PROVIDER=klaren` and `KLAREN_API_URL` (OpenAI-compatible streaming). See [RunPod integration guide](docs/klaren-runpod-integration.md) and `.env.example`. No model weights in this frontend.

### Server configuration

Use only the root `.env`. Never prefix credentials with `NEXT_PUBLIC_`.

| Variable | Purpose |
|---|---|
| `XAI_API_KEY` | Server-side xAI credential |
| `XAI_MODEL` | xAI model identifier; defaults to `grok-4.7` |
| `DATABASE_URL` | Neon PostgreSQL connection |
| `DATABASE_URL_UNPOOLED` | Direct Neon connection for migrations (no `-pooler`) |
| `NEON_AUTH_BASE_URL` | Auth URL from Neon Better Auth settings |
| `NEON_AUTH_COOKIE_SECRET` | At least 32 characters |

Schema: `npm run db:generate`, `npm run db:migrate`. Chat endpoint: authenticated account, 10 requests/minute per account, 1,024 output tokens max.

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

Open `http://localhost:3000`.

### Production

```bash
npm run build
npm run start
```

## Development Status

| Component | Status |
|---|---|
| Visual design | Concept approved |
| Frontend architecture | Server-side chat API with account auth |
| Chat interface | Streaming through `/api/chat` |
| Conversation persistence | Neon PostgreSQL |
| KLAREN 4E inference | Planned (adapter prepared) |
| Orbital AI capabilities | Long-term roadmap |

Planned features are not represented as operational.

## KLAREN 4E Intelligence

Model development is separate from this frontend.

[NULLXES KLAREN 4E — Hugging Face](https://huggingface.co/MagistrTheOne/NULLXES-KLAREN-4E)

## Security

Do not commit API keys, credentials, or production environment configuration. Sensitive operations stay server-side.

## Contact & Organization

**NULLXES GROUP** — private AI engineering and intelligent systems.

Multimodal intelligence, autonomous systems, physical AI, orbital intelligence architectures.

- **Email:** [ceo@nullxes.com](mailto:ceo@nullxes.com)
- **Telegram:** [@MagistrTheOne](https://t.me/MagistrTheOne)
- **Model:** [huggingface.co/MagistrTheOne/NULLXES-KLAREN-4E](https://huggingface.co/MagistrTheOne/NULLXES-KLAREN-4E)

## Intellectual Property

NULLXES and KLAREN 4E are identifiers associated with NULLXES GROUP. Unless a separate license is provided, no open-source license is granted for this frontend repository.

---

**NULLXES — ONE INTELLIGENCE. DIFFERENT BODIES.**

© 2026 NULLXES GROUP. All rights reserved.