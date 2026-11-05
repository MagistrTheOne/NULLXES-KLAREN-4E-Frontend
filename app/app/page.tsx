import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthenticatedUser, isNeonAuthConfigured } from "@/lib/auth/server";

export default function WorkspacePage() {
  if (!isNeonAuthConfigured()) redirect("/auth/login");
  return <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#080808] text-sm text-[#b8b2a7]">Загружаем аккаунт…</div>}><AuthenticatedWorkspace /></Suspense>;
}

async function AuthenticatedWorkspace() {
  await connection();
  let user: Awaited<ReturnType<typeof getAuthenticatedUser>>;
  try {
    user = await getAuthenticatedUser();
  } catch (error) {
    console.error("Unable to restore Neon Auth session.", { errorName: error instanceof Error ? error.name : "UnknownError" });
    redirect("/auth/login");
  }
  if (!user) redirect("/auth/login");
  return <AppShell account={{ name: user.name, email: user.email }} />;
}
