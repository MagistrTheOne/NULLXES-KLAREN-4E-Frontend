import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { telegramLinks } from "@/lib/db/schema";
import { getAuthenticatedUser } from "@/lib/auth/server";

async function owner(): Promise<string | Response> {
  try {
    const user = await getAuthenticatedUser();
    return user?.id ?? Response.json({ error: "Требуется авторизация." }, { status: 401 });
  } catch {
    return Response.json({ error: "Neon Auth временно недоступен." }, { status: 503 });
  }
}

export async function GET(): Promise<Response> {
  const userId = await owner();
  if (userId instanceof Response) return userId;
  try {
    const [linked] = await db.select().from(telegramLinks).where(eq(telegramLinks.userId, userId)).limit(1);
    return Response.json({
      linked: Boolean(linked?.telegramUserId),
      telegramUserId: linked?.telegramUserId ?? null,
      bot: "klarennullxes_bot",
      configured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_WEBHOOK_SECRET),
      businessEnabled: process.env.TELEGRAM_BUSINESS_ENABLED === "true",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Не удалось проверить привязку Telegram." }, { status: 503 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const userId = await owner();
  if (userId instanceof Response) return userId;
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_WEBHOOK_SECRET) {
    return Response.json({ error: "Telegram backend не настроен." }, { status: 503 });
  }
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return Response.json({ error: "Некорректный источник." }, { status: 403 });
  }
  const token = randomBytes(18).toString("hex");
  const codeHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  try {
    await db.insert(telegramLinks).values({ userId, codeHash, expiresAt }).onConflictDoUpdate({
      target: telegramLinks.userId,
      set: { codeHash, expiresAt, updatedAt: new Date().toISOString() },
    });
    return Response.json({ url: `https://t.me/klarennullxes_bot?start=link_${token}`, expiresAt }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ error: "Не удалось создать код привязки." }, { status: 503 });
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const userId = await owner();
  if (userId instanceof Response) return userId;
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) {
    return Response.json({ error: "Некорректный источник." }, { status: 403 });
  }
  try {
    await db.delete(telegramLinks).where(eq(telegramLinks.userId, userId));
    return Response.json({ linked: false });
  } catch {
    return Response.json({ error: "Не удалось отключить Telegram." }, { status: 503 });
  }
}
