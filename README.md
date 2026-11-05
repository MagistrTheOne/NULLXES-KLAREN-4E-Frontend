# NULLXES KLAREN 4E

**Official Frontend Interface · Orbital AI**

Developed by **NULLXES AI**

---

## Overview

**KLAREN 4E** is a proprietary multimodal artificial intelligence project developed by NULLXES.

This repository contains the official web interface for KLAREN 4E, designed to provide a unified environment for conversational intelligence, multimodal interaction, project management, and future autonomous capabilities.

The interface is built around a distinct AI identity, with a premium minimalist design and a modular architecture intended for integration with the KLAREN 4E inference runtime.

The chat interface sends messages through a server-side API route. Conversation history, projects, and preferences are stored in the browser.

## Technology Stack

- Next.js 16 — App Router
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui — `bpzk` preset
- Radix UI
- Phosphor Icons

## Interface

The application is organized into six primary workspaces:

| Workspace | Description |
|---|---|
| New Chat | Local chat experience with a replaceable response adapter |
| Conversations | Search, rename, delete, and organize locally saved conversations |
| Model | KLAREN 4E product identity |
| Tools | Chat, coding-focused mode, conversation, and project workspaces |
| Projects | Create projects and associate conversations with them |
| Settings | User profile, response style, coding and Markdown preferences, interface and history controls |

The design follows the NULLXES visual identity: black and graphite surfaces, restrained metallic gold, minimal ornamentation, and a character-focused interface.

Conversation history, projects, preferences, and selected image previews are stored in the current browser. Chat requests go to `/api/chat`; attachments are not uploaded as model input.

The optional user name and context are stored in browser storage and included in chat requests so they can personalize responses. Response-style controls cover tone, roleplay, adult themes, and coding verbosity. Coding mode changes response instructions but does not execute tools or inspect local project files. Assistant messages support Markdown, including syntax-highlighted fenced code; this can be disabled in Settings.

## Architecture
The frontend separates reusable UI, workspace features, local persistence, and inference communication.

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
│   ├── app/api/chat/            Validated streaming chat endpoint
│   └── lib/chat/server/         Fixed inference chain and adapters
│
└── Browser Services
    ├── lib/chat/chat-client.ts  Provider-independent SSE client
    └── lib/storage/             Browser persistence
```

The server sends chat requests only to xAI Grok. It never switches providers or retries through OpenAI. A provider failure is returned as an honest chat error; partial responses are not restarted. The browser always uses the same `/api/chat` SSE contract: `message.delta`, `message.completed`, and `message.error`. xAI uses the official `https://api.x.ai/v1` base URL and defaults to `grok-4.7`. See the [xAI quickstart](https://docs.x.ai/developers/quickstart), [text generation guide](https://docs.x.ai/developers/model-capabilities/text/generate-text), and [streaming guide](https://docs.x.ai/developers/model-capabilities/text/streaming).

Each event is sent as `data: <JSON>\n\n`:

```text
message.delta     {"type":"message.delta","delta":"text"}
message.completed {"type":"message.completed"}
message.error     {"type":"message.error","message":"Не удалось отправить сообщение. Повторите попытку.","retryable":true}
```

### Server configuration

Use the single root `.env` file. Never prefix credentials with `NEXT_PUBLIC_`.

| Variable | Purpose |
|---|---|
| `XAI_API_KEY` | Server-side xAI credential |
| `XAI_MODEL` | xAI model identifier; defaults to `grok-4.7` |

When the KLAREN 4E inference service is ready, replace the server-side xAI adapter with the native model endpoint; no browser provider or model selection is involved.

Restart the development server after changing `.env`. The endpoint limits requests to 10 per minute per forwarded client address and caps each output at 1,024 tokens. This in-memory limit is not a substitute for authentication or distributed rate limiting; do not deploy with a billable provider enabled until access control and production spending controls are in place.

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
| Frontend architecture | Server-side chat API with local workspace storage |
| Chat interface | Streaming through `/api/chat` |
| Conversation persistence | Implemented in browser storage |
| Project management | Implemented in browser storage |
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

Do not expose a billable chat provider in a public deployment until authentication and production-grade spending controls are in place.

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