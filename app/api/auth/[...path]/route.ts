import { getNeonAuth, isNeonAuthConfigured } from "@/lib/auth/server";

type AuthRouteContext = { params: Promise<{ path: string[] }> };
type AuthHandlers = ReturnType<ReturnType<typeof getNeonAuth>["handler"]>;
type AuthMethod = keyof AuthHandlers;

async function handleAuthRequest(
  method: AuthMethod,
  request: Request,
  context: AuthRouteContext,
): Promise<Response> {
  if (!isNeonAuthConfigured()) {
    return Response.json(
      { error: "Авторизация временно недоступна." },
      { status: 503 },
    );
  }

  try {
    return await getNeonAuth().handler()[method](request, context);
  } catch (error) {
    console.error("Neon Auth request failed.", {
      method,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json(
      { error: "Не удалось выполнить запрос авторизации." },
      { status: 503 },
    );
  }
}

export const GET = (request: Request, context: AuthRouteContext) =>
  handleAuthRequest("GET", request, context);
export const POST = (request: Request, context: AuthRouteContext) =>
  handleAuthRequest("POST", request, context);
export const PUT = (request: Request, context: AuthRouteContext) =>
  handleAuthRequest("PUT", request, context);
export const PATCH = (request: Request, context: AuthRouteContext) =>
  handleAuthRequest("PATCH", request, context);
export const DELETE = (request: Request, context: AuthRouteContext) =>
  handleAuthRequest("DELETE", request, context);
