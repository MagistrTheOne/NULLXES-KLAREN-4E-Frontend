"use client";

import type { ReactNode } from "react";
import {
  BracketsCurly,
  Eye,
  Gauge,
  Keyboard,
  SidebarSimple,
  Sparkle,
  Trash,
  UserCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Preferences } from "@/types/workspace";

interface SettingsWorkspaceProps {
  preferences: Preferences;
  conversationCount: number;
  onPreferenceChange: <K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) => void;
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
        <p className="text-[10px] font-medium tracking-[0.3em] text-[#c6a46a]">KLAREN 4E</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight text-[#f1f1f1] sm:text-[38px]">Персонализация</h1>
        <p className="mt-2 text-sm text-[#929292]">
          Настройки сохраняются в браузере, а профиль учитывается при формировании ответов.
        </p>

        <section className="mt-8 overflow-hidden rounded-xl border border-[#292929] bg-[#101010]">
          <h2 className="flex items-center gap-2 border-b border-[#242424] px-5 py-4 text-[11px] font-medium tracking-[0.16em] text-[#c5b28d]">
            <UserCircle size={16} />
            О ТЕБЕ
          </h2>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-[#d9d4ca]">Как к тебе обращаться</span>
              <Input
                value={preferences.userName}
                maxLength={60}
                onChange={(event) => onPreferenceChange("userName", event.target.value)}
                placeholder="Имя или обращение"
                className="mt-2 border-[#302d27] bg-[#0b0b0b]"
              />
            </label>
            <div className="text-xs leading-5 text-[#77736b] sm:self-end sm:pb-2">
              Имя используется только для обращения в диалоге.
            </div>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-[#d9d4ca]">Полезная информация</span>
              <Textarea
                value={preferences.userContext}
                maxLength={500}
                onChange={(event) => onPreferenceChange("userContext", event.target.value)}
                placeholder="Например: чем занимаешься, какие у тебя цели или предпочтения"
                className="mt-2 min-h-24 border-[#302d27] bg-[#0b0b0b] text-sm"
              />
              <span className="mt-1 block text-right text-[10px] text-[#68645c]">
                {preferences.userContext.length}/500
              </span>
            </label>
          </div>
        </section>

        <section className="mt-5 overflow-hidden rounded-xl border border-[#292929] bg-[#101010]">
          <h2 className="flex items-center gap-2 border-b border-[#242424] px-5 py-4 text-[11px] font-medium tracking-[0.16em] text-[#c5b28d]">
            <Sparkle size={16} />
            МАНЕРА ОБЩЕНИЯ
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#242424] px-5 py-4">
            <div>
              <h3 className="text-sm font-medium text-[#e1e1e1]">Характер</h3>
              <p className="mt-1 text-xs leading-5 text-[#858585]">От сдержанного тона до заметной колкости.</p>
            </div>
            <NativeSelect
              value={preferences.sharpness}
              onChange={(event) =>
                onPreferenceChange("sharpness", event.target.value as Preferences["sharpness"])
              }
              aria-label="Характер общения"
              className="w-full sm:w-44"
            >
              <NativeSelectOption value="balanced">Сдержанный</NativeSelectOption>
              <NativeSelectOption value="wry">Ироничный</NativeSelectOption>
              <NativeSelectOption value="sharp">Колкий</NativeSelectOption>
            </NativeSelect>
          </div>
          <PreferenceRow
            icon={<Sparkle size={19} />}
            title="Ролевой режим"
            description="Поддерживать заданные пользователем вымышленные сцены."
            checked={preferences.roleplayEnabled}
            onCheckedChange={(checked) => onPreferenceChange("roleplayEnabled", checked)}
          />
          <PreferenceRow
            icon={<Eye size={19} />}
            title="Темы 18+"
            description="Разрешать взрослые темы между совершеннолетними персонажами."
            checked={preferences.adultThemesEnabled}
            onCheckedChange={(checked) => onPreferenceChange("adultThemesEnabled", checked)}
            last
          />
        </section>

        <section className="mt-5 overflow-hidden rounded-xl border border-[#292929] bg-[#101010]">
          <h2 className="flex items-center gap-2 border-b border-[#242424] px-5 py-4 text-[11px] font-medium tracking-[0.16em] text-[#c5b28d]">
            <BracketsCurly size={16} />
            КОД И ФОРМАТИРОВАНИЕ
          </h2>
          <PreferenceRow
            icon={<BracketsCurly size={19} />}
            title="Режим кодинга"
            description="Фокусировать ответы на написании, объяснении и исправлении кода."
            checked={preferences.codingModeEnabled}
            onCheckedChange={(checked) => onPreferenceChange("codingModeEnabled", checked)}
          />
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#242424] px-5 py-4">
            <div>
              <h3 className="text-sm font-medium text-[#e1e1e1]">Стиль объяснений кода</h3>
              <p className="mt-1 text-xs leading-5 text-[#858585]">Применяется, когда включён режим кодинга.</p>
            </div>
            <NativeSelect
              value={preferences.codingStyle}
              onChange={(event) =>
                onPreferenceChange("codingStyle", event.target.value as Preferences["codingStyle"])
              }
              aria-label="Стиль объяснений кода"
              className="w-full sm:w-44"
            >
              <NativeSelectOption value="balanced">По ситуации</NativeSelectOption>
              <NativeSelectOption value="concise">Кратко</NativeSelectOption>
              <NativeSelectOption value="step-by-step">По шагам</NativeSelectOption>
            </NativeSelect>
          </div>
          <PreferenceRow
            icon={<BracketsCurly size={19} />}
            title="Форматировать Markdown"
            description="Показывать заголовки, списки, ссылки и блоки кода в удобном виде."
            checked={preferences.renderMarkdown}
            onCheckedChange={(checked) => onPreferenceChange("renderMarkdown", checked)}
            last
          />
        </section>

        <section className="mt-5 overflow-hidden rounded-xl border border-[#292929] bg-[#101010]">
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
