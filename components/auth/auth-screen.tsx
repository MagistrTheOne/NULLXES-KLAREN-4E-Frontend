"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { AuthLayout } from "./auth-layout";
import { authErrorMessage, needsEmailVerification } from "./auth-errors";

type Mode = "login" | "register" | "forgot-password" | "reset-password" | "verify-email";
const titles: Record<Mode, string> = { login: "С возвращением", register: "Создать аккаунт", "forgot-password": "Восстановление доступа", "reset-password": "Новый пароль", "verify-email": "Подтвердите email" };
const descriptions: Record<Mode, string> = { login: "Войди, чтобы продолжить общение с Кларен.", register: "Создай аккаунт, чтобы начать общение с Кларен.", "forgot-password": "Укажи email своего аккаунта для восстановления доступа.", "reset-password": "Выбери новый пароль для своего аккаунта.", "verify-email": "Введи код из письма или запроси новый." };

export function AuthScreen({ configured, initialResetToken }: { configured: boolean; initialResetToken: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const mode = (pathname.split("/").at(-1) || "login") as Mode;
  const [name, setName] = useState("");
  const [email, setEmail] = useState(params.get("email") || "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(params.get("reset") === "success" ? "Пароль изменён. Войди с новым паролем." : "");
  const [cooldown, setCooldown] = useState(0);
  const [resetSent, setResetSent] = useState(false);
  const [verified, setVerified] = useState(false);
  // This flow has a single permitted destination; query strings cannot redirect off-site.
  const destination = "/app";
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function enterWorkspace() {
    const session = await authClient.getSession({ query: { disableCookieCache: true } });
    if (session.error) { setError(authErrorMessage(session.error)); return; }
    if (session.data?.user) { router.replace(destination); router.refresh(); return; }
    router.replace(`/auth/login?email=${encodeURIComponent(email.trim())}`);
  }

  async function sendCode() {
    if (pending || cooldown || !email.trim()) return;
    setPending(true); setError(""); setNotice("");
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({ email: email.trim(), type: "email-verification" });
      if (result.error) { setError(authErrorMessage(result.error)); return; }
      setNotice("Запрос принят. Проверь почту, включая папку «Спам»."); setCooldown(60);
    } catch (error) { setError(authErrorMessage(error)); }
    finally { setPending(false); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(""); setNotice("");
    if (!configured) { setError("Вход временно недоступен. Попробуй позже."); return; }
    if ((mode === "register" || mode === "reset-password") && password !== confirmation) { setError("Пароли не совпадают."); return; }
    if (mode === "register" && !name.trim()) { setError("Укажи имя пользователя."); return; }
    setPending(true);
    try {
      if (mode === "login") {
        const result = await authClient.signIn.email({ email: email.trim(), password });
        if (needsEmailVerification(result.error)) { router.push(`/auth/verify-email?email=${encodeURIComponent(email.trim())}`); return; }
        if (result.error) { setError(authErrorMessage(result.error)); return; }
        await enterWorkspace();
      } else if (mode === "register") {
        const result = await authClient.signUp.email({ name: name.trim(), email: email.trim(), password, callbackURL: `${window.location.origin}/app` });
        if (result.error) { setError(authErrorMessage(result.error)); return; }
        const session = await authClient.getSession({ query: { disableCookieCache: true } });
        if (session.error) { setError(authErrorMessage(session.error)); return; }
        if (session.data?.user) { router.replace(destination); router.refresh(); return; }
        router.push(`/auth/verify-email?email=${encodeURIComponent(email.trim())}`);
      } else if (mode === "forgot-password") {
        const result = await authClient.requestPasswordReset({ email: email.trim(), redirectTo: `${window.location.origin}/auth/reset-password` });
        if (result.error) { setError(authErrorMessage(result.error)); return; }
        setResetSent(true); setCooldown(60); setNotice("Если аккаунт с таким адресом существует, инструкция по восстановлению придёт на почту. Проверь также папку «Спам».");
      } else if (mode === "reset-password") {
        if (!initialResetToken) { setError("Ссылка недействительна. Запроси новую инструкцию."); return; }
        const result = await authClient.resetPassword({ newPassword: password, token: initialResetToken });
        if (result.error) { setError(authErrorMessage(result.error)); return; }
        router.replace("/auth/login?reset=success");
      } else {
        const result = await authClient.emailOtp.verifyEmail({ email: email.trim(), otp });
        if (result.error) { setError(authErrorMessage(result.error)); return; }
        setVerified(true); await enterWorkspace();
      }
    } catch (error) {
      if ((mode === "login" || mode === "register") && needsEmailVerification(error)) {
        router.push(`/auth/verify-email?email=${encodeURIComponent(email.trim())}`);
      } else setError(authErrorMessage(error));
    }
    finally { setPending(false); }
  }

  const needsPassword = mode === "login" || mode === "register" || mode === "reset-password";
  const missingToken = mode === "reset-password" && !initialResetToken;
  return <AuthLayout title={titles[mode]} description={descriptions[mode]}>
    {!configured && <p role="alert" className="auth-message auth-message-error">Вход временно недоступен. Попробуй позже.</p>}
    {missingToken ? <p className="auth-message auth-message-error" role="alert">Ссылка недействительна или устарела. <Link href="/auth/forgot-password">Запросить новую</Link></p> : <form className="auth-form" onSubmit={submit}>
      <fieldset disabled={pending || !configured} className="contents">
        {mode === "register" && <label>Имя пользователя<Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} /></label>}
        {mode !== "reset-password" && <label>Электронная почта<Input type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} /></label>}
        {needsPassword && <div><div className="auth-label-row"><label htmlFor="password">{mode === "reset-password" ? "Новый пароль" : "Пароль"}</label>{mode === "login" && <Link href="/auth/forgot-password">Забыли пароль?</Link>}</div><div className="auth-password-field"><Input id="password" type={visible ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "login" ? 1 : 8} maxLength={128} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Скрыть пароль" : "Показать пароль"} aria-pressed={visible}>{visible ? <EyeSlash size={18} /> : <Eye size={18} />}</button></div></div>}
        {(mode === "register" || mode === "reset-password") && <label>Повторите пароль<Input type={visible ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required minLength={8} maxLength={128} /></label>}
        {mode === "verify-email" && <label>Код из письма<Input inputMode="numeric" autoComplete="one-time-code" placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} required pattern="[0-9]{6}" minLength={6} maxLength={6} /></label>}
        {error && <p role="alert" className="auth-message auth-message-error">{error}</p>}
        {notice && <p role="status" className="auth-message auth-message-notice">{notice}</p>}
        <Button type="submit" className="auth-submit" disabled={pending || !configured || verified || (mode === "forgot-password" && cooldown > 0)}>{pending ? "Подождите…" : mode === "login" ? "Войти" : mode === "register" ? "Создать аккаунт" : mode === "forgot-password" ? resetSent ? cooldown ? `Повторить через ${cooldown} с` : "Отправить ещё раз" : "Продолжить" : mode === "reset-password" ? "Сохранить пароль" : "Подтвердить email"}</Button>
      </fieldset>
    </form>}
    {mode === "login" && <p className="auth-switch">Нет аккаунта? <Link href="/auth/register">Зарегистрироваться</Link></p>}
    {mode === "register" && <p className="auth-switch">Уже есть аккаунт? <Link href="/auth/login">Войти</Link></p>}
    {mode === "forgot-password" && <p className="auth-switch"><Link href="/auth/login">Вернуться ко входу</Link></p>}
    {mode === "verify-email" && <button type="button" className="auth-resend" disabled={pending || cooldown > 0 || !configured || !email.trim()} onClick={() => void sendCode()}>{cooldown ? `Запросить новый код через ${cooldown} с` : "Запросить новый код"}</button>}
  </AuthLayout>;
}
