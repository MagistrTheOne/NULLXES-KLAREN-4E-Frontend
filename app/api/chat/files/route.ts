import { getAuthenticatedUser } from "@/lib/auth/server";
import { createFileProof } from "@/lib/chat/server/file-proof";

export async function POST(request: Request): Promise<Response> {
  if (!process.env.XAI_API_KEY || !process.env.NEON_AUTH_BASE_URL) return Response.json({ error: "Недоступно." }, { status: 503 });
  const user = await getAuthenticatedUser().catch(() => null);
  if (!user) return Response.json({ error: "Требуется авторизация." }, { status: 401 });
  if (Number(request.headers.get("content-length") || 0) > 5_200_000) return Response.json({ error: "PDF слишком большой." }, { status: 413 });
  const data = await request.formData().catch(() => null);
  const file = data?.get("file");
  if (!(file instanceof File) || file.size > 5_000_000 || file.size < 5 || file.type !== "application/pdf" || !file.name.toLowerCase().endsWith(".pdf")) return Response.json({ error: "Ожидается PDF до 5 МБ." }, { status: 400 });
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (new TextDecoder().decode(header) !== "%PDF-") return Response.json({ error: "Некорректный PDF." }, { status: 400 });
  const outgoing = new FormData();
  outgoing.append("purpose", "assistants");
  outgoing.append("file", file, file.name);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch("https://api.x.ai/v1/files", { method: "POST", headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}` }, body: outgoing, signal: controller.signal, cache: "no-store" });
    if (!response.ok) return Response.json({ error: "Хранилище документов недоступно." }, { status: 502 });
    const result = await response.json() as { id?: string };
    if (!result.id || !/^file-[a-zA-Z0-9_-]+$/.test(result.id)) return Response.json({ error: "Не удалось подтвердить загрузку." }, { status: 502 });
    return Response.json({ id: result.id, proof: createFileProof(user.id, result.id) });
  } catch { return Response.json({ error: "Ошибка загрузки PDF." }, { status: 502 }); }
  finally { clearTimeout(timeout); }
}
