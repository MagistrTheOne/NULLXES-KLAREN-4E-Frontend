"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";

type AuthMode = "sign-in" | "sign-up" | "forgot" | "otp" | "reset";

export function AuthScreen({
  configured,
  initialResetToken,
}: {
  configured: boolean;
  initialResetToken: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(
    initialResetToken ? "reset" : "sign-in",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resetToken] = useState(initialResetToken);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function completeSignIn(result: { error?: { message?: string } | null }) {
    if (result.error) {
      setError(result.error.message || "Не удалось войти. Проверьте данные.");
      return;
    }
    router.replace("/");
    router.refresh();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setPending(true);

    try {
      if (!configured) {
        setError("Регистрация и вход временно недоступны.");
        return;
      }

      if (mode === "sign-in") {
        await completeSignIn(await authClient.signIn.email({ email, password }));
      } else if (mode === "sign-up") {
        const result = await authClient.signUp.email({ name, email, password });
        if (result.error) {
          setError(result.error.message || "Не удалось создать аккаунт.");
        } else if (result.data?.user) {
          router.replace("/");
          router.refresh();
        } else {
          setMode("sign-in");
          setNotice("Аккаунт создан. Теперь можно войти по email и паролю.");
        }
      } else if (mode === "forgot") {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/auth`,
        });
        if (result.error) {
          setError(result.error.message || "Не удалось отправить ссылку для восстановления.");
        } else {
          setNotice("Если аккаунт существует, инструкция по восстановлению отправлена на почту.");
        }
      } else if (mode === "reset") {
        const result = await authClient.resetPassword({
          newPassword: password,
          token: resetToken,
        });
        if (result.error) {
          setError(result.error.message || "Не удалось изменить пароль.");
        } else {
          setMode("sign-in");
          setPassword("");
          setNotice("Пароль изменён. Войдите с новым паролем.");
        }
      } else if (!otpSent) {
        const result = await authClient.emailOtp.sendVerificationOtp({
          email,
          type: "sign-in",
        });
        if (result.error) {
          setError(result.error.message || "Не удалось отправить код.");
        } else {
          setOtpSent(true);
          setNotice("Код отправлен на почту.");
        }
      } else {
        await completeSignIn(await authClient.signIn.emailOtp({ email, otp }));
      }
    } catch (requestError) {
      console.error("Managed Auth request failed.", {
        errorName:
          requestError instanceof Error ? requestError.name : "UnknownError",
      });
      setError("Не удалось связаться с сервисом авторизации. Повторите попытку.");
    } finally {
      setPending(false);
    }
  }

  const title =
    mode === "sign-up"
      ? "Создать аккаунт"
      : mode === "forgot"
        ? "Восстановить пароль"
        : mode === "reset"
          ? "Новый пароль"
          : mode === "otp"
            ? "Вход по коду"
            : "Войти в аккаунт";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080808] px-5 py-10 text-[#f5f5f5]">
      <section className="w-full max-w-[420px] rounded-xl border border-[#292929] bg-[#101010] p-6 shadow-[0_24px_100px_rgba(0,0,0,0.35)] sm:p-8">
        <div className="text-center">
          <div className="font-serif text-5xl leading-none text-[#c6a46a]">N</div>
          <p className="mt-4 text-[10px] font-medium tracking-[0.35em] text-[#c6a46a]">
            NULLXES
          </p>
          <h1 className="mt-3 text-xl font-medium tracking-wide">KLAREN 4E</h1>
          <p className="mt-2 text-sm text-[#888]">{title}</p>
        </div>

        {!configured ? (
          <p role="status" className="mt-7 rounded-lg border border-[#493a29] bg-[#17130d] px-4 py-3 text-sm leading-6 text-[#e2d2b2]">
            Регистрация пока не подключена. Попробуйте позже.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            {mode === "sign-up" && (
              <label className="block text-xs text-[#b8b2a7]">
                Имя
                <Input
                  autoComplete="name"
                  required
                  maxLength={60}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 border-[#302d27] bg-[#0b0b0b]"
                />
              </label>
            )}

            {mode !== "reset" && (
              <label className="block text-xs text-[#b8b2a7]">
                Email
                <Input
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 border-[#302d27] bg-[#0b0b0b]"
                />
              </label>
            )}

            {(mode === "sign-in" || mode === "sign-up" || mode === "reset") && (
              <label className="block text-xs text-[#b8b2a7]">
                {mode === "reset" ? "Новый пароль" : "Пароль"}
                <Input
                  type="password"
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-2 border-[#302d27] bg-[#0b0b0b]"
                />
              </label>
            )}

            {mode === "otp" && otpSent && (
              <label className="block text-xs text-[#b8b2a7]">
                Код из письма
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={12}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  className="mt-2 border-[#302d27] bg-[#0b0b0b]"
                />
              </label>
            )}

            {error && (
              <p role="alert" className="rounded-md border border-[#593434] bg-[#201212] px-3 py-2 text-sm text-[#e2a2a2]">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="rounded-md border border-[#493a29] bg-[#17130d] px-3 py-2 text-sm text-[#e2d2b2]">
                {notice}
              </p>
            )}

            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-[#c6a46a] text-[#080808] hover:bg-[#d3b77f]"
            >
              {pending
                ? "Подождите…"
                : mode === "sign-up"
                  ? "Создать аккаунт"
                  : mode === "forgot"
                    ? "Отправить инструкцию"
                    : mode === "reset"
                      ? "Сохранить пароль"
                      : mode === "otp" && !otpSent
                        ? "Отправить код"
                        : mode === "otp"
                          ? "Войти по коду"
                          : "Войти"}
            </Button>
          </form>
        )}

        {configured && (
          <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-[#aaa]">
            {mode === "sign-in" && (
              <>
                <button type="button" onClick={() => { setError(""); setNotice(""); setMode("sign-up"); }} className="hover:text-[#e2c99d]">
                  Создать аккаунт
                </button>
                <button type="button" onClick={() => { setError(""); setNotice(""); setMode("forgot"); }} className="hover:text-[#e2c99d]">
                  Забыли пароль?
                </button>
                <button type="button" onClick={() => { setError(""); setNotice(""); setOtpSent(false); setMode("otp"); }} className="hover:text-[#e2c99d]">
                  Войти по коду
                </button>
              </>
            )}
            {mode !== "sign-in" && mode !== "reset" && (
              <button type="button" onClick={() => { setError(""); setNotice(""); setMode("sign-in"); }} className="hover:text-[#e2c99d]">
                Вернуться ко входу
              </button>
            )}
            {mode === "reset" && (
              <button type="button" onClick={() => { setError(""); setNotice(""); setMode("sign-in"); }} className="hover:text-[#e2c99d]">
                Вернуться ко входу
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
