import { Suspense } from "react";
import { connection } from "next/server";
import { AuthScreen } from "@/components/auth/auth-screen";
import { isNeonAuthConfigured } from "@/lib/auth/server";

export default function RegisterPage() { return <Suspense fallback={<main className="auth-shell">Загружаем…</main>}><RegisterContent /></Suspense>; }
async function RegisterContent() {
  await connection();
  return <AuthScreen configured={isNeonAuthConfigured()} initialResetToken="" />;
}
