import "server-only";

import type { ChatAdapter } from "@/lib/chat/chat-provider";
import { KlarenChatAdapter } from "@/lib/chat/server/klaren-adapter";
import { XAIChatAdapter } from "@/lib/chat/server/xai-adapter";

export type ChatProviderId = "xai" | "klaren";

const DEFAULT_PROVIDER: ChatProviderId = "xai";

export function resolveChatProvider(): ChatProviderId {
  const value = process.env.CHAT_PROVIDER?.trim().toLowerCase();
  if (value === "klaren") return "klaren";
  return DEFAULT_PROVIDER;
}

export function isKlarenProviderConfigured(): boolean {
  return Boolean(process.env.KLAREN_API_URL?.trim() && process.env.KLAREN_MODEL?.trim());
}

export function resolveChatAdapter(): ChatAdapter {
  const provider = resolveChatProvider();
  if (provider === "klaren") {
    if (!isKlarenProviderConfigured()) {
      throw new Error("CHAT_PROVIDER=klaren requires KLAREN_API_URL and KLAREN_MODEL.");
    }
    return new KlarenChatAdapter();
  }
  return new XAIChatAdapter();
}

export function describeActiveChatRuntime(): {
  provider: ChatProviderId;
  product: "KLAREN 4E";
  developer: "NULLXES GROUP";
  inferenceHost: "xAI" | "RunPod";
  modelLabel: string;
  klarenConfigured: boolean;
  modalities: {
    text: boolean;
    vision: boolean;
    audio: boolean;
    imagine: boolean;
  };
  modelRevision: string | null;
  status: "connected_proxy" | "staging_pending" | "not_configured";
} {
  const provider = resolveChatProvider();
  const klarenConfigured = isKlarenProviderConfigured();

  if (provider === "klaren" && klarenConfigured) {
    return {
      provider,
      product: "KLAREN 4E",
      developer: "NULLXES GROUP",
      inferenceHost: "RunPod",
      modelLabel: process.env.KLAREN_MODEL?.trim() || "klaren-4e",
      klarenConfigured: true,
      modalities: { text: true, vision: false, audio: false, imagine: false },
      modelRevision: process.env.KLAREN_MODEL_REVISION?.trim() || null,
      status: "connected_proxy",
    };
  }

  if (provider === "klaren") {
    return {
      provider,
      product: "KLAREN 4E",
      developer: "NULLXES GROUP",
      inferenceHost: "RunPod",
      modelLabel: process.env.KLAREN_MODEL?.trim() || "klaren-4e",
      klarenConfigured: false,
      modalities: { text: false, vision: false, audio: false, imagine: false },
      modelRevision: process.env.KLAREN_MODEL_REVISION?.trim() || null,
      status: "not_configured",
    };
  }

  return {
    provider,
    product: "KLAREN 4E",
    developer: "NULLXES GROUP",
    inferenceHost: "xAI",
    modelLabel: process.env.XAI_MODEL?.trim() || "grok-4.7",
    klarenConfigured,
    modalities: {
      text: true,
      vision: Boolean(process.env.XAI_API_KEY),
      audio: false,
      imagine: false,
    },
    modelRevision: null,
    status: process.env.XAI_API_KEY ? "connected_proxy" : "not_configured",
  };
}