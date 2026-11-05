type AuthError = { code?: string; status?: number; message?: string } | null;
export function normalizeAuthError(value: unknown): AuthError {
  if (!value || typeof value !== "object") return null;
  const outer = value as Record<string, unknown>;
  const raw = outer.error && typeof outer.error === "object" ? outer.error as Record<string, unknown> : outer;
  return { code: typeof raw.code === "string" ? raw.code : undefined, status: typeof raw.status === "number" ? raw.status : undefined };
}
export function needsEmailVerification(value: unknown): boolean {
  const code = normalizeAuthError(value)?.code;
  return code === "EMAIL_NOT_VERIFIED" || code === "email_not_confirmed";
}
export function authErrorMessage(value: unknown): string {
  const error = normalizeAuthError(value);
  if (!error) return "Не удалось выполнить действие. Попробуйте ещё раз.";
  if (error.status === 429) return "Слишком много попыток. Подождите минуту и попробуйте снова.";
  switch (error.code) {
    case "invalid_credentials":
    case "INVALID_PASSWORD":
    case "INVALID_EMAIL_OR_PASSWORD": return "Неверная почта или пароль.";
    case "user_already_exists":
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL": return "Этот email уже используется. Войдите или восстановите доступ.";
    case "email_not_confirmed":
    case "EMAIL_NOT_VERIFIED": return "Подтвердите электронную почту, чтобы войти.";
    case "OTP_EXPIRED":
    case "INVALID_OTP": return "Код неверен или срок его действия истёк. Запросите новый код.";
    case "INVALID_TOKEN": return "Ссылка недействительна или устарела. Запросите восстановление ещё раз.";
    case "PASSWORD_TOO_SHORT": return "Пароль должен содержать не менее 8 символов.";
    default: return "Не удалось выполнить действие. Повторите попытку позже.";
  }
}
