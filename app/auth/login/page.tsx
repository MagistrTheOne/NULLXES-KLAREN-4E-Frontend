import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { AuthScreen } from "@/components/auth/auth-screen";
import { getAuthenticatedUser, isNeonAuthConfigured } from "@/lib/auth/server";

export default function LoginPage(props: PageProps<"/auth/login">) {
  return <Suspense fallback={<AuthFallback />}><AuthContent searchParams={props.searchParams} /></Suspense>;
}

async function AuthContent({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  await connection();
  const params = await searchParams;
  if (isNeonAuthConfigured()) {
    const user = await getAuthenticatedUser().catch(() => null);
    if (user) redirect("/app");
  }
  return <AuthScreen configured={isNeonAuthConfigured()} initialResetToken={typeof params.token === "string" ? params.token : ""} />;
}

function AuthFallback() { return <main className="auth-shell"><p className="text-sm text-[#b8b2a7]">Загружаем…</p></main>; }
