"use client";

import { useEffect, useRef, useState } from "react";
import { SpeakerHigh, StopCircle, Waveform } from "@phosphor-icons/react";
import type { ChatMessage, LocalAttachment } from "@/types/workspace";

type Stage = "idle" | "recording" | "transcribing" | "replying" | "speaking";

export function VoiceModeControl({
  messages, isTyping, onSend,
}: {
  messages: ChatMessage[];
  isTyping: boolean;
  onSend: (text: string, attachments: LocalAttachment[]) => void;
}) {
  const [enabled, setEnabled] = useState(false);
  const [stage, setStage] = useState<Stage>("idle");
  const [notice, setNotice] = useState("");
  const [waiting, setWaiting] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const microphone = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);
  const audioUrl = useRef<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const lastBeforeRequest = useRef<string | undefined>(undefined);
  const lastMessage = messages.at(-1);
  const isSupported = typeof window !== "undefined" && typeof MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia);

  function stopPlayback() {
    controller.current?.abort();
    controller.current = null;
    audio.current?.pause();
    audio.current = null;
    if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    audioUrl.current = null;
  }

  function cleanupMicrophone() {
    recorder.current = null;
    microphone.current?.getTracks().forEach((track) => track.stop());
    microphone.current = null;
  }

  useEffect(() => {
    return () => {
      controller.current?.abort();
      audio.current?.pause();
      microphone.current?.getTracks().forEach((track) => track.stop());
      recorder.current?.stop();
      if (audioUrl.current) URL.revokeObjectURL(audioUrl.current);
    };
  }, []);

  async function speak(text: string) {
    setStage("speaking");
    const abort = new AbortController();
    controller.current = abort;
    try {
      const response = await fetch("/api/voice/speak", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }), signal: abort.signal,
      });
      if (!response.ok) throw new Error("V4 TTS unavailable");
      const blob = await response.blob();
      if (abort.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      audioUrl.current = url;
      const player = new Audio(url);
      audio.current = player;
      player.onended = () => {
        if (audioUrl.current === url) {
          URL.revokeObjectURL(url);
          audioUrl.current = null;
          audio.current = null;
          setStage("idle");
        }
      };
      await player.play();
    } catch {
      if (!abort.signal.aborted) {
        setNotice("Не удалось воспроизвести Eleven V4. Текст ответа сохранён.");
        setStage("idle");
      }
    }
  }

  useEffect(() => {
    if (!waiting || isTyping || !lastMessage || lastMessage.role !== "assistant" || !lastMessage.content.trim()) return;
    if (lastMessage.id === lastBeforeRequest.current) return;
    setWaiting(false);
    void speak(lastMessage.content);
    // Only trigger at the completion of the voice-requested assistant reply.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting, isTyping, lastMessage?.id, lastMessage?.content]);

  async function transmit(blob: Blob) {
    setStage("transcribing");
    const body = new FormData();
    const extension = blob.type.includes("ogg") ? "ogg" : "webm";
    body.append("file", blob, `klaren-recording.${extension}`);
    try {
      const response = await fetch("/api/voice/transcribe", { method: "POST", body });
      if (!response.ok) throw new Error("STT failed");
      const { text } = await response.json() as { text?: string };
      if (!text?.trim()) throw new Error("Empty transcript");
      lastBeforeRequest.current = [...messages].reverse().find((item) => item.role === "assistant")?.id;
      setWaiting(true);
      setStage("replying");
      onSend(text.trim(), []);
    } catch {
      setNotice("Речь не распознана. Повтори запись.");
      setStage("idle");
    }
  }

  async function beginRecording() {
    setNotice("");
    stopPlayback();
    if (!isSupported) { setNotice("Браузер не поддерживает запись микрофона."); return; }
    try {
      const status = await fetch("/api/voice/status", { cache: "no-store" });
      if (!status.ok) { setNotice("KLARENCIA MARIA пока недоступна через ElevenLabs API."); return; }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
      microphone.current = stream;
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find((v) => MediaRecorder.isTypeSupported(v));
      if (!mime) { cleanupMicrophone(); setNotice("Нет поддерживаемого аудиоформата."); return; }
      chunks.current = [];
      const active = new MediaRecorder(stream, { mimeType: mime });
      recorder.current = active;
      active.ondataavailable = (event) => { if (event.data.size) chunks.current.push(event.data); };
      active.onstop = () => {
        const blob = new Blob(chunks.current, { type: mime.split(";")[0] });
        cleanupMicrophone();
        if (blob.size) void transmit(blob);
        else setStage("idle");
      };
      active.start();
      setStage("recording");
    } catch {
      cleanupMicrophone();
      setStage("idle");
      setNotice("Не удалось открыть микрофон. Проверь разрешение браузера.");
    }
  }

  function toggle() {
    if (stage === "recording") {
      recorder.current?.stop();
      return;
    }
    if (stage === "speaking") {
      stopPlayback();
      setStage("idle");
      return;
    }
    if (stage !== "idle" || isTyping) return;
    void beginRecording();
  }

  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => {
        if (enabled) {
          recorder.current?.stop();
          stopPlayback();
          setWaiting(false);
          setStage("idle");
        }
        setEnabled(!enabled);
        setNotice("");
      }} aria-pressed={enabled} title="Голос KLARENCIA MARIA — Eleven V4" className={`flex size-9 items-center justify-center rounded-full transition-colors ${enabled ? "bg-[#392d1b] text-[#dfbd7e]" : "text-[#989898] hover:bg-[#242424]"}`}>
        <SpeakerHigh size={19} />
      </button>
      {enabled && <button type="button" onClick={toggle} disabled={stage === "transcribing" || stage === "replying"} title={stage === "recording" ? "Закончить запись" : stage === "speaking" ? "Остановить звук" : "Сказать Кларен"} aria-label={stage === "recording" ? "Остановить запись" : "Начать голосовой запрос"} className="flex size-9 items-center justify-center rounded-full border border-[#75603b] text-[#d6b47b] disabled:opacity-50">
        {stage === "recording" || stage === "speaking" ? <StopCircle size={19} /> : <Waveform size={19} />}
      </button>}
      {enabled && stage !== "idle" && <span role="status" className="hidden text-[10px] text-[#b8a17a] xl:inline">{stage === "recording" ? "Запись…" : stage === "transcribing" ? "Распознавание…" : stage === "replying" ? "Ответ…" : "Говорит…"}</span>}
      {enabled && notice && <span role="alert" className="max-w-40 text-[10px] text-[#df9b9b]">{notice}</span>}
    </div>
  );
}
