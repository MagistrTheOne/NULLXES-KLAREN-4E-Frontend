"use client";

import Image from "next/image";
import {
  ArrowClockwise,
  Check,
  CopySimple,
  Eye,
  EyeSlash,
  FileImage,
  GitBranch,
  List,
  Paperclip,
  Microphone,
  MicrophoneSlash,
  PaperPlaneTilt,
  PencilSimple,
  Plus,
  Stop,
  X,
} from "@phosphor-icons/react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownContent } from "@/components/chat/markdown-content";
import type { ChatMessage, Conversation, LocalAttachment } from "@/types/workspace";

type SpeechResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type SpeechRecognizer = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechResult) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognizer;
  webkitSpeechRecognition?: new () => SpeechRecognizer;
};

interface ChatWorkspaceProps {
  conversation: Conversation | null;
  isTyping: boolean;
  portraitVisible: boolean;
  enterToSend: boolean;
  reducedMotion: boolean;
  renderMarkdown: boolean;
  onNewChat: () => void;
  onRename: (conversation: Conversation) => void;
  onTogglePortrait: () => void;
  onSend: (text: string, attachments: LocalAttachment[]) => void;
  onCancel: () => void;
  onRegenerate: () => void;
  onBranch: (messageId: string) => void;
  onCopyError: (message: string) => void;
  onToggleMobileSidebar: () => void;
  searchTargetMessageId: string | null;
  onSearchTargetHandled: () => void;
}

const EMPTY_MESSAGES: ChatMessage[] = [];

const promptSuggestions = [
  "Расскажи, что ты умеешь?",
  "А в чём твоя фишка?",
  "А кто тут главный?",
];

export function ChatWorkspace({
  conversation,
  isTyping,
  portraitVisible,
  enterToSend,
  reducedMotion,
  renderMarkdown,
  onNewChat,
  onRename,
  onTogglePortrait,
  onSend,
  onCancel,
  onRegenerate,
  onBranch,
  onCopyError,
  onToggleMobileSidebar,
  searchTargetMessageId,
  onSearchTargetHandled,
}: ChatWorkspaceProps) {
  const [draft, setDraft] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const voiceRef = useRef<SpeechRecognizer | null>(null);
  const [attachments, setAttachments] = useState<LocalAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const transcriptEnd = useRef<HTMLDivElement>(null);
  const anyFileInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messages = conversation?.messages ?? EMPTY_MESSAGES;

  useEffect(() => {
    const speech = window as SpeechWindow;
    setVoiceSupported(Boolean(speech.SpeechRecognition || speech.webkitSpeechRecognition));
    return () => { voiceRef.current?.stop(); voiceRef.current = null; };
  }, []);

  function toggleVoiceInput() {
    if (voiceRecording) { voiceRef.current?.stop(); setVoiceRecording(false); return; }
    const speech = window as SpeechWindow;
    const Recognizer = speech.SpeechRecognition ?? speech.webkitSpeechRecognition;
    if (!Recognizer) { setAttachmentError("Голосовой ввод не поддерживается этим браузером."); return; }
    try {
      const recognition = new Recognizer();
      recognition.lang = "ru-RU";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript?.trim();
        if (transcript) setDraft((previous) => (previous.trim() ? previous.trim() + " " : "") + transcript);
      };
      recognition.onerror = () => { setAttachmentError("Не удалось распознать речь. Проверь разрешение на микрофон."); setVoiceRecording(false); };
      recognition.onend = () => { setVoiceRecording(false); voiceRef.current = null; };
      voiceRef.current = recognition;
      recognition.start();
      setAttachmentError("");
      setVoiceRecording(true);
    } catch { setAttachmentError("Не удалось начать запись. Проверь доступ к микрофону."); setVoiceRecording(false); }
  }

  useEffect(() => {
    transcriptEnd.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "end",
    });
  }, [isTyping, messages, reducedMotion]);

  useEffect(() => {
    if (!searchTargetMessageId) return;
    const target = Array.from(document.querySelectorAll<HTMLElement>("[data-chat-message-id]")).find((node) => node.dataset.chatMessageId === searchTargetMessageId);
    if (!target) return;
    target.scrollIntoView({ behavior: "auto", block: "center" });
    onSearchTargetHandled();
  }, [conversation?.id, searchTargetMessageId, onSearchTargetHandled]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
  }, [draft]);

  async function copyMessage(message: ChatMessage) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      window.setTimeout(() => setCopiedMessageId(null), 1400);
    } catch {
      onCopyError("Не удалось скопировать ответ. Попробуйте ещё раз.");
    }
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    setAttachmentError("");
    if (!files.length) return;

    const remainingSlots = 4 - attachments.length;
    if (files.length > remainingSlots) {
      setAttachmentError("Можно выбрать не более четырёх вложений в одном сообщении.");
      return;
    }

    let totalImageBytes = attachments.reduce(
      (total, attachment) =>
        total + (attachment.previewDataUrl ? Math.ceil(attachment.previewDataUrl.length * 0.75) : 0),
      0,
    );
    const nextAttachments: LocalAttachment[] = [];

    for (const file of files) {
      if (file.type.startsWith("image/")) {
        if (file.size > 2_000_000 || totalImageBytes + file.size > 3_000_000) {
          setAttachmentError("Файл слишком большой. Размер одного изображения — до 2 МБ, общий размер — до 3 МБ.");
          return;
        }
        try {
          const previewDataUrl = await readFileAsDataUrl(file);
          nextAttachments.push({
            id: crypto.randomUUID(),
            name: file.name,
            mediaType: file.type,
            previewDataUrl,
          });
          totalImageBytes += file.size;
        } catch {
          setAttachmentError("Не удалось прикрепить файл. Попробуйте ещё раз.");
          return;
        }
      } else {
        const isText = /\.(txt|md|json|csv|ts|tsx|js|jsx|py|html|css|sql|xml|yaml|yml|sh|log)$/i.test(file.name);
        if (!isText) {
          setAttachmentError("Поддерживаются текстовые файлы и изображения для предпросмотра. PDF и другие форматы пока не анализируются.");
          return;
        }
        if (file.size > 32_000) {
          setAttachmentError("Текстовый файл слишком большой. Максимум — 32 КБ.");
          return;
        }
        try {
          const contentText = (await file.text()).slice(0, 3_000);
          if (!contentText.trim()) { setAttachmentError("Текстовый файл пустой."); return; }
          nextAttachments.push({
            id: crypto.randomUUID(),
            name: file.name,
            mediaType: file.type || "text/plain",
            contentText,
          });
        } catch {
          setAttachmentError("Не удалось прочитать текстовый файл.");
          return;
        }
      }
    }
    setAttachments((current) => [...current, ...nextAttachments]);
  }

  function submitMessage(text = draft) {
    if (isTyping || (!text.trim() && attachments.length === 0)) return;
    onSend(text.trim(), attachments);
    setDraft("");
    setAttachments([]);
    setAttachmentError("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    if (!enterToSend && !event.metaKey && !event.ctrlKey) return;
    event.preventDefault();
    submitMessage();
  }

  return (
    <div className="chat-workspace">
      <header className="relative z-10 flex min-h-[76px] shrink-0 items-center justify-between gap-3 border-b border-[#262626] bg-[#080808]/90 px-4 backdrop-blur-md sm:px-7 lg:px-10">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-[#a6a6a6] hover:bg-[#202020] hover:text-[#e4c990] min-[761px]:hidden"
            aria-label="Открыть меню"
          >
            <List size={20} />
          </button>
          <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-[#745b32] bg-[#15120e] shadow-[0_0_16px_rgba(198,164,106,0.12)]">
            <Image src="/klaren.png" alt="" fill sizes="40px" className="object-cover object-[72%_28%]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-[15px] font-semibold tracking-[0.03em] text-[#eee]">KLAREN 4E</span>
            </div>
            <div className="mt-1 truncate text-[11px] text-[#898989]">NULLXES · Orbital AI</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {conversation && (
            <IconButton
              label="Переименовать диалог"
              onClick={() => onRename(conversation)}
            >
              <PencilSimple size={17} />
            </IconButton>
          )}
          <IconButton label="Создать новый чат" onClick={onNewChat}>
            <Plus size={19} />
          </IconButton>
          <IconButton
            label={portraitVisible ? "Скрыть визуальный слой KLAREN" : "Показать визуальный слой KLAREN"}
            onClick={onTogglePortrait}
          >
            {portraitVisible ? <EyeSlash size={18} /> : <Eye size={18} />}
          </IconButton>
        </div>
      </header>

      <div className="chat-transcript relative z-[1] min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 sm:px-7 lg:px-10">
        <div className="mx-auto flex min-h-full w-full max-w-[980px] flex-col justify-end pb-5 pt-7 sm:pt-9">
          {messages.length === 0 && (
            <div className="my-auto flex flex-col items-center px-1 py-10 text-center sm:px-4">
              <div className="relative size-[62px] overflow-hidden rounded-full border border-[#755b32] bg-[#15120e] shadow-[0_0_28px_rgba(198,164,106,0.12)]">
                <Image src="/klaren.png" alt="" fill sizes="62px" className="object-cover object-[72%_28%]" />
              </div>
              <h1 className="mt-5 text-2xl font-medium tracking-tight text-[#f0ece4] sm:text-[30px]">
                На связи. Что разбираем?
              </h1>
              <div className="mt-7 flex w-full max-w-xl flex-wrap justify-center gap-2">
                {promptSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => submitMessage(suggestion)}
                    disabled={isTyping}
                    className="rounded-full border border-[#33302a] bg-[#10100e] px-3.5 py-2 text-left text-xs leading-5 text-[#c5bcae] transition-colors hover:border-[#675432] hover:text-[#e3cca0] disabled:opacity-50"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-6">
            {messages.map((message, index) => {
              if (isTyping && message.role === "assistant" && !message.content) return null;
              const lastAssistant =
                message.role === "assistant" &&
                index === messages.length - 1;
              return (
                <MessageRow
                  key={message.id}
                  message={message}
                  renderMarkdown={renderMarkdown}
                  copied={copiedMessageId === message.id}
                  canRegenerate={lastAssistant}
                  onCopy={() => void copyMessage(message)}
                  onRegenerate={onRegenerate}
                  onBranch={() => onBranch(message.id)}
                />
              );
            })}
            {isTyping && (
              <div className="flex items-center gap-3 py-1" role="status" aria-live="polite">
                <AssistantAvatar />
                <div className="flex items-center gap-1.5 rounded-2xl border border-[#33302a] bg-[#111] px-4 py-3">
                  <span className="size-1.5 animate-pulse rounded-full bg-[#c6a46a]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-[#c6a46a] [animation-delay:150ms]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-[#c6a46a] [animation-delay:300ms]" />
                  <span className="ml-1 text-[11px] text-[#969696]">Кларенсия печатает</span>
                </div>
              </div>
            )}
          </div>
          <div ref={transcriptEnd} />
        </div>
      </div>

      <div className="relative z-[2] shrink-0 px-3 pb-3 pt-2 sm:px-6 sm:pb-5 lg:px-10">
        <div className="composer mx-auto w-full max-w-[980px] rounded-2xl border border-[#856b41] p-2 shadow-[0_0_22px_rgba(198,164,106,0.06)] focus-within:border-[#b49258]">
          {attachments.length > 0 && (
            <div className="mb-1 flex flex-wrap gap-2 px-1 pt-1.5">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex max-w-full items-center gap-2 rounded-lg border border-[#36322b] bg-[#0c0c0c] p-1.5 pr-2">
                  {attachment.previewDataUrl ? (
                    <Image
                      src={attachment.previewDataUrl}
                      alt={`Предпросмотр: ${attachment.name}`}
                      width={36}
                      height={36}
                      unoptimized
                      className="size-9 rounded object-cover"
                    />
                  ) : (
                    <span className="flex size-9 shrink-0 items-center justify-center rounded bg-[#1a1711] text-[#c6a46a]">
                      <FileImage size={17} />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block max-w-[150px] truncate text-[11px] text-[#ddd]">{attachment.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachments((current) => current.filter((item) => item.id !== attachment.id))}
                    aria-label={`Убрать вложение ${attachment.name}`}
                    className="ml-1 flex size-6 shrink-0 items-center justify-center rounded text-[#888] hover:bg-[#292929] hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {attachmentError && (
            <p role="alert" className="px-3 pb-1 text-xs text-[#e1a0a0]">{attachmentError}</p>
          )}
          <div className="flex items-end gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => anyFileInput.current?.click()}
              aria-label="Добавить текстовый файл или изображение для предпросмотра"
              className="mb-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-[#39352e] text-[#c7bca9] transition-colors hover:border-[#75603b] hover:text-[#e3c88e]"
            >
              <Paperclip size={18} />
            </button>
            <input ref={anyFileInput} type="file" multiple className="hidden" onChange={(event) => void handleFiles(event)} />
            <input ref={imageInput} type="file" accept="image/*" multiple className="hidden" onChange={(event) => void handleFiles(event)} />
            <button type="button" onClick={toggleVoiceInput} disabled={!voiceSupported || isTyping} aria-label={voiceRecording ? "Остановить диктовку" : "Голосовой ввод"} title={voiceSupported ? "Распознать речь в текст (отправка вручную)" : "Браузер не поддерживает распознавание речи"} className={`mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-30 ${voiceRecording ? "bg-[#382b1d] text-[#e9b56d]" : "text-[#a6a6a6] hover:bg-[#242424] hover:text-[#e1c78f]"}`}>
              {voiceRecording ? <MicrophoneSlash size={19} /> : <Microphone size={19} />}
            </button>
            <Textarea
              ref={textareaRef}
              rows={1}
              value={draft}
              maxLength={8_000}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напиши Кларенсии..."
              aria-label="Сообщение для KLAREN"
              disabled={isTyping}
              className="max-h-40 min-h-10 resize-none self-center overflow-y-auto border-0 bg-transparent px-3 py-2.5 text-sm leading-5 text-[#eee] shadow-none placeholder:text-[#777] focus-visible:border-0 focus-visible:ring-0 disabled:opacity-65"
            />
            <button
              type="button"
              onClick={() => imageInput.current?.click()}
              aria-label="Добавить изображение для предпросмотра (анализ изображения пока недоступен)"
              className="mb-0.5 hidden size-9 shrink-0 items-center justify-center rounded-full text-[#a6a6a6] transition-colors hover:bg-[#242424] hover:text-[#e1c78f] sm:flex"
            >
              <FileImage size={19} />
            </button>
            {isTyping ? (
              <button
                type="button"
                onClick={onCancel}
                aria-label="Остановить ответ"
                className="mb-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-[#75603b] text-[#e3c88e] transition-colors hover:bg-[#242019]"
              >
                <Stop size={17} weight="fill" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => submitMessage()}
                disabled={!draft.trim() && attachments.length === 0}
                aria-label="Отправить сообщение"
                className="mb-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-[#c6a46a] text-[#100e0a] transition-colors hover:bg-[#d6b77e] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <PaperPlaneTilt size={18} weight="fill" />
              </button>
            )}
          </div>
        </div>
        <p className="mx-auto mt-2 max-w-[980px] px-1 text-center text-[10px] leading-4 text-[#797979]">
          {enterToSend ? "Enter — отправить" : "Ctrl/⌘ + Enter — отправить"} · Shift + Enter — новая строка
        </p>
      </div>
    </div>
  );
}

function MessageRow({
  message,
  renderMarkdown,
  copied,
  canRegenerate,
  onCopy,
  onRegenerate,
  onBranch,
}: {
  message: ChatMessage;
  renderMarkdown: boolean;
  copied: boolean;
  canRegenerate: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
  onBranch: () => void;
}) {
  const user = message.role === "user";
  return (
    <article data-chat-message-id={message.id} className={`flex min-w-0 items-start gap-3 ${user ? "flex-row-reverse" : ""}`}>
      {user ? <UserAvatar /> : <AssistantAvatar />}
      <div className={`flex min-w-0 max-w-[min(82%,720px)] flex-col ${user ? "items-end" : "items-start"}`}>
        <div className={`mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 px-1 ${user ? "justify-end" : ""}`}>
          <span className="text-[11px] font-medium text-[#d6d6d6]">{user ? "Вы" : "KLAREN 4E"}</span>
          <time className="text-[10px] text-[#777]">{formatTime(message.createdAt)}</time>
        </div>
        <div className={`message-copy min-w-0 max-w-full rounded-2xl border px-4 py-3 text-[13px] leading-[1.65] sm:text-sm ${
          user
            ? "rounded-tr-md border-[#4c4030] bg-[#211d17] text-[#eee7dc]"
            : "rounded-tl-md border-[#323232] bg-[#111]/95 text-[#e1e1e1]"
        }`}>
          {message.content && (
            renderMarkdown
              ? <MarkdownContent value={message.content} />
              : <p className="whitespace-pre-wrap">{message.content}</p>
          )}
          {message.attachments.length > 0 && (
            <div className={`flex flex-wrap gap-2 ${message.content ? "mt-3" : ""}`}>
              {message.attachments.map((attachment) => (
                <div key={attachment.id} className="max-w-[200px] overflow-hidden rounded-lg border border-[#37332c] bg-[#0c0c0c]">
                  {attachment.previewDataUrl && (
                    <Image
                      src={attachment.previewDataUrl}
                      alt={attachment.name}
                      width={320}
                      height={220}
                      unoptimized
                      className="max-h-40 w-full object-contain"
                    />
                  )}
                  <span className="block truncate px-2 py-1.5 text-[10px] text-[#b4aa98]">
                    {attachment.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1">
          {!user && (
            <IconButton label={copied ? "Скопировано" : "Скопировать ответ"} onClick={onCopy}>
              {copied ? <Check size={15} /> : <CopySimple size={15} />}
            </IconButton>
          )}
          <IconButton label="Продолжить в отдельной ветке" onClick={onBranch}>
            <GitBranch size={15} />
          </IconButton>
          {!user && canRegenerate && (
            <IconButton label="Повторить ответ" onClick={onRegenerate}>
              <ArrowClockwise size={15} />
            </IconButton>
          )}
        </div>
      </div>
    </article>
  );
}

function AssistantAvatar() {
  return (
    <div className="relative mt-5 size-8 shrink-0 overflow-hidden rounded-full border border-[#715a33] bg-[#16130e]">
      <Image src="/klaren.png" alt="" fill sizes="32px" className="object-cover object-[72%_28%]" />
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="mt-5 flex size-8 shrink-0 items-center justify-center rounded-full border border-[#3b3b3b] bg-[#171717] text-[10px] font-medium text-[#bababa]">
      ВЫ
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="text-[#909090] hover:bg-[#26221b] hover:text-[#dfc58e]"
    >
      {children}
    </Button>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ru", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Браузер вернул некорректный формат файла."));
    };
    reader.onerror = () => reject(new Error("Ошибка чтения файла."));
    reader.readAsDataURL(file);
  });
}
