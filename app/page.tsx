import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthenticatedUser, isNeonAuthConfigured } from "@/lib/auth/server";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#080808] text-sm text-[#b8b2a7]">
          Загружаем аккаунт…
        </div>
      }
    >
      <AuthenticatedHome />
    </Suspense>
  );
}

async function AuthenticatedHome() {
  await connection();
  if (!isNeonAuthConfigured()) redirect("/auth");

  let user: Awaited<ReturnType<typeof getAuthenticatedUser>>;
  try {
    user = await getAuthenticatedUser();
  } catch (error) {
    console.error("Unable to restore Neon Auth session.", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    redirect("/auth");
  }

  if (!user) redirect("/auth");

  return (
    <AppShell
      account={{
        name: user.name,
        email: user.email,
      }}
    />
  );
}
