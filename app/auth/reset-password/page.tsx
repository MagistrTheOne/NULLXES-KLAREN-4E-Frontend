import { Suspense } from "react";
import { connection } from "next/server";
import { AuthScreen } from "@/components/auth/auth-screen";
import { isNeonAuthConfigured } from "@/lib/auth/server";

export default function ResetPasswordPage(props: PageProps<"/auth/reset-password">) { return <Suspense fallback={<main className="auth-shell">Загружаем…</main>}><ResetContent searchParams={props.searchParams} /></Suspense>; }
async function ResetContent({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  await connection();
  const params = await searchParams;
  return <AuthScreen configured={isNeonAuthConfigured()} initialResetToken={typeof params.token === "string" ? params.token : ""} />;
}
