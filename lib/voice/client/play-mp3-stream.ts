/**
 * Progressive MP3 playback for Eleven V4 audio streamed by our Next.js proxy.
 * Uses MediaSource where available and falls back to buffered playback.
 * Never connects the browser directly to the ElevenLabs service.
 */
export async function playMp3Stream(
  response: Response,
  signal: AbortSignal,
  onPlayer: (player: HTMLAudioElement, url: string) => void,
): Promise<void> {
  if (!response.body) throw new Error("No audio stream.");
  const progressive =
    typeof MediaSource !== "undefined" &&
    MediaSource.isTypeSupported("audio/mpeg");

  if (!progressive) {
    const blob = await response.blob();
    if (signal.aborted) return;
    const url = URL.createObjectURL(blob);
    const player = new Audio(url);
    onPlayer(player, url);
    await player.play();
    return;
  }

  const media = new MediaSource();
  const url = URL.createObjectURL(media);
  const player = new Audio(url);
  onPlayer(player, url);

  await new Promise<void>((resolve, reject) => {
    const opened = () => { clear(); resolve(); };
    const cancelled = () => { clear(); reject(new Error("Audio cancelled.")); };
    const clear = () => {
      media.removeEventListener("sourceopen", opened);
      signal.removeEventListener("abort", cancelled);
    };
    media.addEventListener("sourceopen", opened, { once: true });
    signal.addEventListener("abort", cancelled, { once: true });
  });
  if (signal.aborted) return;

  const buffer = media.addSourceBuffer("audio/mpeg");
  const pending: Uint8Array[] = [];
  let complete = false;
  let started = false;
  const pump = () => {
    if (signal.aborted || buffer.updating || media.readyState !== "open") return;
    const next = pending.shift();
    if (next) {
      const bytes = new Uint8Array(next.byteLength);
      bytes.set(next);
      buffer.appendBuffer(bytes.buffer);
      if (!started) {
        started = true;
        void player.play().catch(() => {
          // Some browsers require a second user gesture to enable audio.
          player.controls = true;
        });
      }
    } else if (complete) {
      media.endOfStream();
    }
  };
  buffer.addEventListener("updateend", pump);
  const reader = response.body.getReader();
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value?.length) {
        pending.push(value);
        pump();
      }
    }
    complete = true;
    pump();
  } finally {
    reader.releaseLock();
    buffer.removeEventListener("updateend", pump);
    // If chunks are still pending, keep the append callback until playback finishes.
    if (!signal.aborted && (pending.length > 0 || buffer.updating)) {
      buffer.addEventListener("updateend", pump);
    }
  }
}
