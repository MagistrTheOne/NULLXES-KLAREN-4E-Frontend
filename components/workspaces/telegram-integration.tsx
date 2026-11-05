"use client";

import { useEffect, useState } from "react";
import { ArrowClockwise, LinkSimple, TelegramLogo, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

type LinkStatus = {
  linked: boolean;
  telegramUserId: string | null;
  bot: string;
  configured: boolean;
  businessEnabled: boolean;
};

export function TelegramIntegration() {
  const [status, setStatus] = useState<LinkStatus | null>(null);
  const [url, setUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/telegram/link", { cache: "no-store" });
      const body = await response.json() as LinkStatus & { error?: string };
      if (!response.ok) throw new Error(body.error || "Не удалось проверить Telegram.");
      setStatus(body);
      if (body.linked) setUrl("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка соединения.");
    } finally { setBusy(false); }
  }

  useEffect(() => {
    const frame = requestAnimationFrame(() => { void refresh(); });
    return () => cancelAnimationFrame(frame);
  }, []);

  async function createLink() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/telegram/link", { method: "POST" });
      const body = await response.json() as { url?: string; expiresAt?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error || "Не удалось создать ссылку.");
      setUrl(body.url);
      setExpiresAt(body.expiresAt ?? "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка привязки.");
    } finally { setBusy(false); }
  }

  async function disconnect() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/telegram/link", { method: "DELETE" });
      if (!response.ok) throw new Error("Не удалось отключить Telegram.");
      setStatus((current) => current ? { ...current, linked: false, telegramUserId: null } : null);
      setUrl("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ошибка отключения.");
    } finally { setBusy(false); }
  }

  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-[#292929] bg-[#101010]">
      <div className="flex items-center justify-between border-b border-[#242424] px-5 py-4">
        <h2 className="flex items-center gap-2 text-[11px] font-medium tracking-[0.16em] text-[#c5b28d]">
          <TelegramLogo size={18} />
          TELEGRAM · KLAREN 4E
        </h2>
        <Button type="button" size="icon" variant="ghost" disabled={busy} onClick={() => void refresh()} aria-label="Обновить статус Telegram" className="size-8 text-[#aaa]">
          <ArrowClockwise size={17} />
        </Button>
      </div>
      <div className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-[#e4e0d7]">Аккаунт Telegram</p>
            <p className="mt-1 text-xs text-[#8e8e8e]">
              {status?.linked ? `Подключён · ID ${status.telegramUserId}` : "Не привязан к аккаунту сайта"}
            </p>
          </div>
          <span className={`text-xs ${status?.linked ? "text-[#c6a46a]" : "text-[#858585]"}`}>
            {status?.linked ? "● Связан" : "○ Ожидание"}
          </span>
        </div>
        <p className="text-xs leading-5 text-[#929292]">
          Привяжи свой Telegram к Neon-аккаунту, чтобы история переписки с Кларен отображалась в «Диалогах» сайта. Внешние чаты пока доступны на сайте только для чтения.
        </p>
        {status?.linked ? (
          <Button type="button" variant="outline" disabled={busy} onClick={() => void disconnect()} className="border-[#43352d] text-[#d6aea4]">
            <Trash size={16}/> Отключить Telegram
          </Button>
        ) : (
          <>
            <Button type="button" variant="outline" disabled={busy || !status?.configured} onClick={() => void createLink()} className="border-[#4a402e] text-[#d6be8b]">
              <LinkSimple size={17}/> Создать ссылку привязки
            </Button>
            {url && <div className="space-y-2 rounded-lg border border-[#343027] bg-[#0c0c0c] p-3">
              <a href={url} target="_blank" rel="noopener noreferrer" className="block break-all text-xs text-[#dec28d] underline underline-offset-4">Открыть @klarennullxes_bot</a>
              <p className="text-[11px] text-[#858585]">
                Нажми Start в Telegram. Ссылка одноразовая, действует до {expiresAt ? new Date(expiresAt).toLocaleTimeString("ru-RU") : "истечения срока"}.
              </p>
            </div>}
          </>
        )}
        {status && <p className="text-[11px] text-[#858585]">
          Business ответы: {status.businessEnabled ? "разрешены конфигурацией" : "выключены для теста"}.
          Автоматические ответы доступны только после настройки разрешённых Telegram ID.
        </p>}
        {error && <p role="alert" className="text-xs text-[#df9a9a]">{error}</p>}
      </div>
    </section>
  );
}
