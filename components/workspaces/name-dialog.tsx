"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface NameDialogProps {
  open: boolean;
  title: string;
  description: string;
  initialValue?: string;
  submitLabel: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string) => void;
}

export function NameDialog({
  open,
  title,
  description,
  initialValue = "",
  submitLabel,
  onOpenChange,
  onSubmit,
}: NameDialogProps) {
  const [name, setName] = useState(initialValue);

  useEffect(() => {
    if (open) setName(initialValue);
  }, [initialValue, open]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[#302d27] bg-[#151515] text-[#f5f5f5] sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="text-[#999]">{description}</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            maxLength={72}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Введите название"
            className="mt-5 border-[#343434] bg-[#0d0d0d] focus-visible:ring-[#c6a46a]/40"
          />
          <DialogFooter className="mt-5 border-0 bg-transparent p-0">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={!name.trim()} className="bg-[#c6a46a] text-[#100e0a] hover:bg-[#d6b77e]">
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
