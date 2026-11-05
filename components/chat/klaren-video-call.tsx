"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnamEvent, createClient } from "@anam-ai/js-sdk";
import {
  Camera, CameraSlash, ChatCircleText, HandPalm, Microphone, MicrophoneSlash,
  PhoneDisconnect, Smiley, SpeakerHigh, X, ArrowsOut, ArrowsIn,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

type Client = ReturnType<typeof createClient>;
type CallStatus = "preparing" | "ready" | "connecting" | "connected" | "error";
type MessageEvent = { id: string; content: string; role: "user" | "persona"; endOfSpeech: boolean };
const REACTIONS = ["🗿", "💅", "😂", "❤️", "🔥", "🤫"];
const CUE_REACTIONS: Record<string, string> = {
  laughter: "😂", playful: "💅", happy: "💃", surprised: "😮", curious: "🤨",
};
const SHOWN_MILLISECONDS = 2400;

export function KlarenVideoCall({ open, onClose }: { open: boolean; onClose: () => void }) {
  const videoId = "klaren-live-avatar-video";
  const avatarRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<Client | null>(null);
  const cameraRef = useRef<MediaStream | null>(null);
  const tokenRef = useRef<string | null>(null);
  const preparingRef = useRef(false);
  const cancelledRef = useRef(false);
  const chunksRef = useRef(new Map<string, string>());
  const effectTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [status, setStatus] = useState<CallStatus>("preparing");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [reactionsOn, setReactionsOn] = useState(false);
  const [lastCaption, setLastCaption] = useState("");
  const [lastSpeaker, setLastSpeaker] = useState("");
  const [reaction, setReaction] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

  const stopCamera = useCallback(() => {
    cameraRef.current?.getTracks().forEach((track) => track.stop());
    cameraRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  const closeStream = useCallback(() => {
    cancelledRef.current = true;
    tokenRef.current = null;
    clientRef.current?.stopStreaming();
    clientRef.current = null;
    if (avatarRef.current) avatarRef.current.srcObject = null;
    stopCamera();
    effectTimersRef.current.forEach(clearTimeout);
    effectTimersRef.current = [];
  }, [stopCamera]);

  useEffect(() => {
    if (!open) return;
    cancelledRef.current = false;
    preparingRef.current = true;
    const abort = new AbortController();
    // The SDK is bundled and loaded with this component; token can be prefetched.
    void fetch("/api/avatar/session", { method: "POST", cache: "no-store", signal: abort.signal })
      .then(async (response) => {
        const payload = await response.json() as { sessionToken?: string; error?: string };
        if (!response.ok || !payload.sessionToken) throw new Error(payload.error ?? "Видеозвонок недоступен.");
        if (cancelledRef.current) return;
        tokenRef.current = payload.sessionToken;
        preparingRef.current = false;
        setStatus("ready");
      })
      .catch((cause: unknown) => {
        if (abort.signal.aborted || cancelledRef.current) return;
        preparingRef.current = false;
        setError(cause instanceof Error ? cause.message : "Не удалось подготовить видеозвонок.");
        setStatus("error");
      });
    return () => {
      abort.abort();
      closeStream();
    };
  }, [open, closeStream]);

  function flashReaction(symbol: string) {
    setReaction(symbol);
    const timer = setTimeout(() => setReaction((current) => current === symbol ? "" : current), SHOWN_MILLISECONDS);
    effectTimersRef.current.push(timer);
  }

  async function startCall() {
    const token = tokenRef.current;
    if (!token || preparingRef.current || status === "connecting" || status === "connected") return;
    setError("");
    setStatus("connecting");
    try {
      const client = createClient(token);
      clientRef.current = client;
      client.addListener(AnamEvent.CONNECTION_ESTABLISHED, () => setStatus("connecting"));
      client.addListener(AnamEvent.SESSION_READY, () => setStatus("connected"));
      client.addListener(AnamEvent.VIDEO_PLAY_STARTED, () => setStatus("connected"));
      client.addListener(AnamEvent.MIC_PERMISSION_DENIED, () => {
        setError("Микрофон заблокирован. Разреши доступ в браузере.");
        setStatus("error");
      });
      client.addListener(AnamEvent.CONNECTION_CLOSED, () => {
        if (!cancelledRef.current) setStatus("error");
      });
      client.addListener(AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED, (event: MessageEvent) => {
        if (cancelledRef.current) return;
        const merged = (chunksRef.current.get(event.id) ?? "") + (event.content ?? "");
        chunksRef.current.set(event.id, merged.slice(-600));
        if (chunksRef.current.size > 30) chunksRef.current.delete(chunksRef.current.keys().next().value ?? "");
        setLastSpeaker(event.role === "persona" ? "КЛАРЕН" : "ВЫ");
        setLastCaption(merged.slice(-280));
      });
      client.addListener(AnamEvent.DIRECTOR_NOTE_CUE_APPLIED, (event: { cueTag: string }) => {
        // Only show local UI feedback for cues actually reported by the avatar engine.
        const symbol = CUE_REACTIONS[event.cueTag];
        if (symbol) flashReaction(symbol);
      });
      await client.streamToVideoElement(videoId);
      if (cancelledRef.current) client.stopStreaming();
    } catch (cause) {
      clientRef.current?.stopStreaming();
      clientRef.current = null;
      setError(cause instanceof Error ? cause.message : "Не удалось открыть видеопоток.");
      setStatus("error");
    }
  }

  function toggleMute() {
    const client = clientRef.current;
    if (!client) return;
    try {
      if (muted) client.unmuteInputAudio();
      else client.muteInputAudio();
      setMuted(!muted);
    } catch { setError("Не удалось переключить микрофон."); }
  }

  async function toggleCamera() {
    if (cameraRef.current) { stopCamera(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (cancelledRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      cameraRef.current = stream;
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        await previewRef.current.play();
      }
      setCameraOn(true);
    } catch { setError("Не удалось получить доступ к камере."); }
  }

  function hangUp() {
    closeStream();
    onClose();
  }

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="Видеозвонок с Кларенсией"
      className="fixed inset-0 z-[110] flex flex-col bg-[#080808] text-[#eee] [padding-top:env(safe-area-inset-top)] [padding-bottom:env(safe-area-inset-bottom)]">
      <header className="z-10 flex h-14 shrink-0 items-center justify-between border-b border-[#282522] bg-[#090909] px-4 sm:h-16 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="font-serif text-2xl text-[#c7a46a]">N</span>
          <div>
            <p className="text-xs font-semibold tracking-[.07em]">KLAREN 4E</p>
            <p className="text-[10px] tracking-[.15em] text-[#938979]">PRIVATE VIDEO SESSION</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#a5a09a]">
          <span className="hidden sm:inline">{status === "connected" ? "Соединение установлено" : status === "connecting" ? "Подключаем…" : status === "preparing" ? "Подготавливаем…" : status === "ready" ? "Готова к звонку" : "Нет соединения"}</span>
          <Button variant="ghost" size="icon" className="text-[#b4b4b4] hover:bg-[#262626]" aria-label="Закрыть видеозвонок" onClick={hangUp}><X size={20}/></Button>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black">
        <div className={`relative h-full w-full overflow-hidden ${fullscreen ? "" : "mx-auto max-w-[min(100%,1700px)]"}`}>
          <video id={videoId} ref={avatarRef} autoPlay playsInline className="h-full w-full object-cover object-center" aria-label="Живой видеопоток Кларенсии"/>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/15"/>
          {cameraOn && <video ref={previewRef} autoPlay muted playsInline aria-label="Предпросмотр собственной камеры" className="absolute right-4 top-4 aspect-video w-28 rounded-xl border border-[#534a3d] bg-black object-cover shadow-xl sm:right-7 sm:top-6 sm:w-48" />}
          {reaction && <div aria-live="polite" className="pointer-events-none absolute right-[12%] top-[24%] text-5xl drop-shadow-2xl sm:text-7xl">{reaction}</div>}
          {captionsOn && lastCaption && status === "connected" && (
            <div className="pointer-events-none absolute bottom-6 left-1/2 max-w-[min(90vw,850px)] -translate-x-1/2 rounded-xl border border-white/10 bg-black/65 px-4 py-2 text-center backdrop-blur-md">
              <p className="text-[10px] font-semibold tracking-wider text-[#c7a46a]">{lastSpeaker}</p>
              <p className="mt-1 text-sm leading-6 text-white sm:text-base">{lastCaption}</p>
            </div>
          )}
          {status !== "connected" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#080808]/75 px-5 text-center backdrop-blur-md">
              <div className="size-14 overflow-hidden rounded-full border border-[#75603b] bg-[#18130e] p-3 font-serif text-2xl text-[#c9ab77]">N</div>
              <h2 className="text-xl font-medium">Кларенсия Мария</h2>
              <p className="max-w-sm text-sm text-[#aaa]">{status === "error" ? error : status === "connecting" ? "Подключаем видео и голос…" : status === "preparing" ? "Готовим приватный видеозвонок…" : "Кларен на связи. Готова?"}</p>
              {(status === "ready" || status === "error") && (
                <Button type="button" onClick={() => {
                  if (status === "error") { hangUp(); return; }
                  void startCall();
                }} className="h-10 rounded-full bg-[#b79a69] px-6 text-[#090909] hover:bg-[#d3b783]">
                  {status === "error" ? "Закрыть" : "Начать видеозвонок"}
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      {error && status === "connected" && <p role="alert" className="bg-[#201717] px-4 py-1 text-center text-xs text-[#efb2a7]">{error}</p>}
      <footer className="z-10 flex shrink-0 flex-col items-center gap-2 border-t border-[#282522] bg-[#0b0b0b] px-3 py-3 sm:flex-row sm:justify-between sm:px-7 sm:py-4">
        <div className="hidden text-xs text-[#a69b88] md:block">
          <strong className="font-medium text-[#eee]">КЛАРЕНСИЯ МАРИЯ</strong>
          <span className="ml-3">NULLXES · Orbital AI</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          <Button variant="outline" size="icon-lg" className="size-11 rounded-full border-[#363636] bg-[#181818] text-white hover:bg-[#272727]" disabled={status !== "connected"} onClick={toggleMute} aria-label={muted ? "Включить микрофон" : "Отключить микрофон"}>
            {muted ? <MicrophoneSlash size={20}/> : <Microphone size={20}/>}
          </Button>
          <Button variant="outline" size="icon-lg" className="size-11 rounded-full border-[#363636] bg-[#181818] text-white hover:bg-[#272727]" onClick={() => void toggleCamera()} aria-label={cameraOn ? "Выключить камеру" : "Включить локальную камеру"}>
            {cameraOn ? <Camera size={20}/> : <CameraSlash size={20}/>}
          </Button>
          <Button variant="outline" size="icon-lg" className="size-11 rounded-full border-[#363636] bg-[#181818] text-white hover:bg-[#272727]" onClick={() => setCaptionsOn(!captionsOn)} aria-pressed={captionsOn} aria-label="Субтитры">
            <ChatCircleText size={20}/>
          </Button>
          <Button variant="outline" size="icon-lg" className="size-11 rounded-full border-[#363636] bg-[#181818] text-white hover:bg-[#272727]" disabled={status !== "connected"} onClick={() => clientRef.current?.interruptPersona()} aria-label="Прервать речь Кларен">
            <HandPalm size={20}/>
          </Button>
          <div className="relative">
            <Button variant="outline" size="icon-lg" className="size-11 rounded-full border-[#363636] bg-[#181818] text-white hover:bg-[#272727]" onClick={() => setReactionsOn(!reactionsOn)} aria-label="Реакции" aria-expanded={reactionsOn}>
              <Smiley size={20}/>
            </Button>
            {reactionsOn && <div className="absolute bottom-14 left-1/2 flex -translate-x-1/2 gap-2 rounded-2xl border border-[#51432e] bg-[#191715] p-2 shadow-xl">
              {REACTIONS.map((emoji) => <button key={emoji} type="button" className="rounded-lg p-1 text-2xl hover:bg-white/10" onClick={() => { flashReaction(emoji); setReactionsOn(false); }} aria-label={`Реакция ${emoji}`}>{emoji}</button>)}
            </div>}
          </div>
          <Button variant="outline" size="icon-lg" className="hidden size-11 rounded-full border-[#363636] bg-[#181818] text-white hover:bg-[#272727] sm:inline-flex" aria-label="Переключить размер видео" onClick={() => setFullscreen(!fullscreen)}>
            {fullscreen ? <ArrowsIn size={20}/> : <ArrowsOut size={20}/>}
          </Button>
          <Button type="button" className="h-11 rounded-full bg-[#a33939] px-5 text-white hover:bg-[#bc4545]" onClick={hangUp} aria-label="Завершить видеозвонок"><PhoneDisconnect size={20}/><span className="hidden sm:inline">Завершить</span></Button>
        </div>
        <div className="hidden items-center gap-2 text-xs text-[#8f8f8f] lg:flex"><SpeakerHigh size={17}/> KLAREN LIVE</div>
      </footer>
    </div>
  );
}
