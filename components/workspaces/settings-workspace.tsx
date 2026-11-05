"use client";

import type { ReactNode } from "react";
import { Eye, Gauge, Keyboard, SidebarSimple, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { Preferences } from "@/types/workspace";

interface SettingsWorkspaceProps {
  preferences: Preferences;
  conversationCount: number;
  onPreferenceChange: (key: keyof Preferences, value: boolean) => void;
  onClearHistory: () => void;
}

export function SettingsWorkspace({
  preferences,
  conversationCount,
  onPreferenceChange,
  onClearHistory,
}: SettingsWorkspaceProps) {
  return (
    <div className="page-workspace overflow-y-auto">
      <div className="mx-auto w-full max-w-[820px] px-5 pb-12 pt-10 sm:px-8 lg:px-12">
        <p className="text-[10px] font-medium tracking-[0.3em] text-[#c6a46a]">ИНТЕРФЕЙС KLAREN 4E</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight text-[#f1f1f1] sm:text-[38px]">Настройки</h1>
        <p className="mt-2 text-sm text-[#929292]">Настрой внешний вид и поведение интерфейса.</p>

        <section className="mt-8 overflow-hidden rounded-xl border border-[#292929] bg-[#101010]">
          <h2 className="border-b border-[#242424] px-5 py-4 text-[11px] font-medium tracking-[0.16em] text-[#c5b28d]">
            ИНТЕРФЕЙС
          </h2>
          <PreferenceRow
            icon={<SidebarSimple size={19} />}
            title="Компактная боковая панель"
            description="Показывать навигацию в режиме иконок."
            checked={preferences.sidebarCollapsed}
            onCheckedChange={(checked) => onPreferenceChange("sidebarCollapsed", checked)}
          />
          <PreferenceRow
            icon={<Eye size={19} />}
            title="Визуальный слой KLAREN"
            description="Показывать изображение рядом с рабочей областью."
            checked={preferences.portraitVisible}
            onCheckedChange={(checked) => onPreferenceChange("portraitVisible", checked)}
          />
          <PreferenceRow
            icon={<Gauge size={19} />}
            title="Уменьшить движение"
            description="Отключить переходы и анимацию интерфейса."
            checked={preferences.reducedMotion}
            onCheckedChange={(checked) => onPreferenceChange("reducedMotion", checked)}
          />
          <PreferenceRow
            icon={<Keyboard size={19} />}
            title="Enter отправляет сообщение"
            description="Shift + Enter всегда добавляет новую строку."
            checked={preferences.enterToSend}
            onCheckedChange={(checked) => onPreferenceChange("enterToSend", checked)}
            last
          />
        </section>

        <section className="mt-5 rounded-xl border border-[#292929] bg-[#101010]">
          <div className="flex flex-wrap items-center justify-between gap-5 p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-[#a88f60]"><Trash size={19} /></span>
              <div>
                <h2 className="text-sm font-medium text-[#e5e5e5]">Очистить историю диалогов</h2>
                <p className="mt-1 text-xs leading-5 text-[#898989]">
                  Удалятся все диалоги и вложения ({conversationCount}); проекты и настройки сохранятся.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={onClearHistory}
              disabled={conversationCount === 0}
              className="border-[#3c3030] text-[#d2a3a3] hover:bg-[#281919] hover:text-[#efbaba]"
            >
              Очистить историю
            </Button>
          </div>
        </section>

      </div>
    </div>
  );
}

function PreferenceRow({
  icon,
  title,
  description,
  checked,
  onCheckedChange,
  last = false,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  last?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-4 ${last ? "" : "border-b border-[#242424]"}`}>
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 shrink-0 text-[#a88f60]">{icon}</span>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-[#e1e1e1]">{title}</h3>
          <p className="mt-1 text-xs leading-5 text-[#858585]">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={title}
        className="shrink-0 data-checked:bg-[#c6a46a]"
      />
    </div>
  );
}
