import { Suspense } from "react";
import { connection } from "next/server";
import { AuthScreen } from "@/components/auth/auth-screen";
import { isNeonAuthConfigured } from "@/lib/auth/server";

export default function ForgotPasswordPage() { return <Suspense fallback={<main className="auth-shell">Загружаем…</main>}><ForgotContent /></Suspense>; }
async function ForgotContent() { await connection(); return <AuthScreen configured={isNeonAuthConfigured()} initialResetToken="" />; }
