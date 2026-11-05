"use client";

import { useEffect, useRef, useState } from "react";
import { Microphone, StopCircle } from "@phosphor-icons/react";
import type { ChatMessage, LocalAttachment } from "@/types/workspace";
import { playMp3Stream } from "@/lib/voice/client/play-mp3-stream";

type Stage = "idle" | "recording" | "transcribing" | "replying" | "speaking";
type Turn = { before: number; seenUser: boolean; seenReply: boolean };

export function VoiceModeControl({
  messages, isTyping, onSend,
}: {
  messages: ChatMessage[];
  isTyping: boolean;
  onSend: (text: string, attachments: LocalAttachment[]) => void;
}) {
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const media = useRef<MediaStream | null>(null);
  const blobs = useRef<Blob[]>([]);
  const cancelled = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const player = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef<string | null>(null);
  const turn = useRef<Turn | null>(null);
  const active = useRef(true);

  function releaseMicrophone() {
    media.current?.getTracks().forEach((track) => track.stop());
    media.current = null;
    recorder.current = null;
  }

  function stopSound() {
    abort.current?.abort();
    abort.current = null;
    player.current?.pause();
    player.current = null;
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
  }

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      cancelled.current = true;
      if (recorder.current?.state === "recording") recorder.current.stop();
      media.current?.getTracks().forEach((track) => track.stop());
      abort.current?.abort();
      player.current?.pause();
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    };
  }, []);

  async function playVoice(text: string) {
    setStage("speaking");
    const controller = new AbortController();
    abort.current = controller;
    try {
      const response = await fetch("/api/voice/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("TTS unavailable");
      await playMp3Stream(response, controller.signal, (audio, url) => {
        player.current = audio;
        audioUrl.current = url;
        audio.onended = () => {
          stopSound();
          if (active.current) setStage("idle");
        };
      });
    } catch {
      if (!controller.signal.aborted && active.current) {
        setError("Текст получен, но голос Eleven V4 недоступен.");
        setStage("idle");
      }
    }
  }

  useEffect(() => {
    const pending = turn.current;
    if (!pending) return;
    const newer = messages.slice(pending.before);
    if (newer.some((message) => message.role === "user")) pending.seenUser = true;
    if (isTyping) pending.seenReply = true;
    if (!pending.seenUser || !pending.seenReply || isTyping) return;
    const answer = [...newer].reverse().find((message) => message.role === "assistant" && message.content.trim());
    turn.current = null;
    if (answer) {
      void playVoice(answer.content);
    } else {
      setError("Кларен не ответила. Проверь подключение.");
      setStage("idle");
    }
    // On completion, only the reply to this voice turn can trigger speech.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isTyping]);

  async function transcribe(recorded: Blob) {
    setStage("transcribing");
    const controller = new AbortController();
    abort.current = controller;
    try {
      const form = new FormData();
      const extension = recorded.type.includes("ogg") ? "ogg" : "webm";
      form.append("file", recorded, `klaren-mic.${extension}`);
      const response = await fetch("/api/voice/transcribe", {
        method: "POST", body: form, signal: controller.signal,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(payload.error || "Распознавание недоступно.");
      }
      const data = await response.json() as { text?: string };
      const transcript = data.text?.trim();
      if (!transcript || !active.current || cancelled.current) throw new Error("Речь не распознана.");
      turn.current = { before: messages.length, seenUser: false, seenReply: false };
      setStage("replying");
      onSend(transcript, []);
    } catch (cause) {
      if (!controller.signal.aborted && active.current) {
        setError(cause instanceof Error ? cause.message : "Ошибка распознавания речи.");
        setStage("idle");
      }
    }
  }

  async function begin() {
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Браузер не поддерживает запись. Разреши микрофон.");
      return;
    }
    cancelled.current = false;
    setError("");
    try {
      const input = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      if (cancelled.current || !active.current) {
        input.getTracks().forEach((track) => track.stop());
        return;
      }
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
        .find((format) => MediaRecorder.isTypeSupported(format));
      if (!mime) {
        input.getTracks().forEach((track) => track.stop());
        setError("Формат микрофона не поддерживается.");
        return;
      }
      media.current = input;
      blobs.current = [];
      const current = new MediaRecorder(input, { mimeType: mime });
      recorder.current = current;
      current.ondataavailable = (event) => {
        if (event.data.size) blobs.current.push(event.data);
      };
      current.onstop = () => {
        const audio = new Blob(blobs.current, { type: mime.split(";")[0] });
        releaseMicrophone();
        if (cancelled.current || !active.current) return;
        if (audio.size) void transcribe(audio);
        else {
          setError("Микрофон не записал звук.");
          setStage("idle");
        }
      };
      current.start();
      setStage("recording");
    } catch {
      releaseMicrophone();
      setError("Не удалось открыть микрофон. Проверь разрешение браузера.");
      setStage("idle");
    }
  }

  function toggle() {
    if (stage === "recording") {
      recorder.current?.stop();
      return;
    }
    if (stage === "speaking") {
      stopSound();
      setStage("idle");
      return;
    }
    if (stage === "transcribing" || stage === "replying" || isTyping) return;
    void begin();
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        disabled={stage === "transcribing" || stage === "replying" || isTyping}
        onClick={toggle}
        aria-label={stage === "recording" ? "Завершить запись и отправить Кларен" : stage === "speaking" ? "Остановить голос Кларен" : "Голосовой разговор с Кларен"}
        aria-pressed={stage !== "idle"}
        title={stage === "recording" ? "Завершить запись" : stage === "speaking" ? "Остановить озвучку" : "Микрофон · xAI STT → Grok → Eleven V4"}
        className={`mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${stage === "idle" ? "text-[#a6a6a6] hover:bg-[#242424] hover:text-[#e1c78f]" : "border border-[#75603b] bg-[#2b2217] text-[#e9b56d]"}`}
      >
        {stage === "recording" || stage === "speaking" ? <StopCircle size={19}/> : <Microphone size={19}/>}
      </button>
      {stage !== "idle" && <span role="status" className="hidden text-[10px] text-[#c6a46a] xl:inline">
        {stage === "recording" ? "Запись…" : stage === "transcribing" ? "Распознавание…" : stage === "replying" ? "Кларен отвечает…" : "Кларен говорит…"}
      </span>}
      {error && <span role="alert" className="max-w-48 text-[10px] text-[#df9999]">{error}</span>}
    </div>
  );
}
