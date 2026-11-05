import { Suspense } from "react";
import { connection } from "next/server";
import { AuthScreen } from "@/components/auth/auth-screen";
import { isNeonAuthConfigured } from "@/lib/auth/server";

export default function VerifyEmailPage() { return <Suspense fallback={<main className="auth-shell">Загружаем…</main>}><VerifyContent /></Suspense>; }
async function VerifyContent() { await connection(); return <AuthScreen configured={isNeonAuthConfigured()} initialResetToken="" />; }
