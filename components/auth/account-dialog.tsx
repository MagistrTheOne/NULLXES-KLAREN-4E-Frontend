"use client";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth/client";
import { authErrorMessage } from "./auth-errors";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AccountDialog({ section, account, onClose, onUpdated }: {
  section: "profile" | "security"; account: { name: string; email: string }; onClose: () => void; onUpdated: () => void;
}) {
  const [name, setName] = useState(account.name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setNotice("");
    if (section === "security" && newPassword !== confirmation) { setError("Пароли не совпадают."); return; }
    if (section === "profile" && !name.trim()) { setError("Укажи имя."); return; }
    setBusy(true);
    try {
      const result = section === "profile" ? await authClient.updateUser({ name: name.trim() }) : await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
      if (result.error) { setError(authErrorMessage(result.error)); return; }
      setNotice(section === "profile" ? "Профиль сохранён." : "Пароль изменён. Остальные сеансы завершены.");
      setCurrentPassword(""); setNewPassword(""); setConfirmation(""); onUpdated();
    } catch (error) { setError(authErrorMessage(error)); }
    finally { setBusy(false); }
  }
  async function revokeSessions() {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await authClient.revokeOtherSessions();
      if (result.error) { setError(authErrorMessage(result.error)); return; }
      setNotice("Остальные сеансы завершены.");
    } catch (error) { setError(authErrorMessage(error)); }
    finally { setBusy(false); }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
    <DialogTitle>{section === "profile" ? "Профиль" : "Безопасность"}</DialogTitle>
    <DialogDescription className="break-all">{account.email}</DialogDescription>
    <form onSubmit={submit} className="grid gap-4"><fieldset disabled={busy} className="grid gap-4">
      {section === "profile" ? <label className="grid gap-2">Имя пользователя<Input autoComplete="name" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} /></label> : <>
        <label className="grid gap-2">Текущий пароль<Input type="password" autoComplete="current-password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></label>
        <label className="grid gap-2">Новый пароль<Input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label>
        <label className="grid gap-2">Повторите пароль<Input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label>
      </>}
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}{notice && <p role="status" className="text-sm text-[#c6a46a]">{notice}</p>}
      <Button type="submit">{busy ? "Сохраняем…" : "Сохранить"}</Button>
      {section === "security" && <Button type="button" variant="outline" onClick={() => void revokeSessions()}>Выйти на других устройствах</Button>}
    </fieldset></form>
  </DialogContent></Dialog>;
}
