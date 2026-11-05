import { Suspense } from "react";
import { connection } from "next/server";
import { AuthScreen } from "@/components/auth/auth-screen";
import { isNeonAuthConfigured } from "@/lib/auth/server";

type AuthPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default function AuthPage({ searchParams }: AuthPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#080808] text-sm text-[#b8b2a7]">
          Загружаем…
        </div>
      }
    >
      <AuthContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AuthContent({ searchParams }: AuthPageProps) {
  await connection();
  const params = await searchParams;
  const resetToken = typeof params.token === "string" ? params.token : "";
  return (
    <AuthScreen
      configured={isNeonAuthConfigured()}
      initialResetToken={resetToken}
    />
  );
}
