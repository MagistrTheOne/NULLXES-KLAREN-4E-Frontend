"use client";

import Image from "next/image";
import {
  Brain,
  ChatCircleDots,
  ChatsCircle,
  CaretLeft,
  CaretRight,
  Folder,
  GearSix,
  UserCircle,
  Wrench,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Workspace } from "@/types/workspace";

interface SidebarProps {
  activeWorkspace: Workspace;
  collapsed: boolean;
  conversationCount: number;
  userName: string;
  onCollapse: () => void;
  onNavigate: (workspace: Workspace) => void;
  onNewChat: () => void;
}

const navigation: Array<{
  id: Workspace;
  label: string;
  icon: typeof ChatCircleDots;
}> = [
  { id: "conversations", label: "Диалоги", icon: ChatsCircle },
  { id: "model", label: "Модель", icon: Brain },
  { id: "tools", label: "Инструменты", icon: Wrench },
  { id: "projects", label: "Проекты", icon: Folder },
  { id: "settings", label: "Настройки", icon: GearSix },
];

export function Sidebar({
  activeWorkspace,
  collapsed,
  conversationCount,
  userName,
  onCollapse,
  onNavigate,
  onNewChat,
}: SidebarProps) {
  const newChatIsActive = activeWorkspace === "chat";

  return (
    <aside className="app-sidebar" aria-label="Основная навигация">
      <div className={`flex h-18.5 shrink-0 items-center ${collapsed ? "justify-center px-2" : "justify-between px-5"}`}>
        <button
          type="button"
          onClick={() => onNavigate("chat")}
          className="group flex min-w-0 items-center gap-3 rounded-sm text-left"
          aria-label="NULLXES — на главную"
        >
          <span className="font-serif text-[39px] leading-none text-[#c6a46a] drop-shadow-[0_0_12px_rgba(198,164,106,0.2)]">
            N
          </span>
          {!collapsed && (
            <span className="pt-1 text-[10px] font-medium tracking-[0.47em] text-[#ded2bd]">
              NULLXES
            </span>
          )}
        </button>
        {!collapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onCollapse}
                aria-label="Свернуть меню"
                className="text-[#777] hover:text-[#e8d7b8] max-[760px]:hidden"
              >
                <CaretLeft weight="regular" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Свернуть меню</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className={`shrink-0 border-b border-[#242424] pb-5 pt-1 ${collapsed ? "px-2 text-center" : "px-6"}`}>
        {collapsed ? (
          <span className="text-[9px] font-semibold tracking-widest text-[#c6a46a]">
            K4
          </span>
        ) : (
          <>
            <div className="text-[16px] font-semibold tracking-[0.12em] text-[#eee8dd]">
              KLAREN 4E
            </div>
            <div className="mt-1 text-[9px] tracking-[0.3em] text-[#a18a62]">
              ORBITAL AI
            </div>
          </>
        )}
      </div>

      <nav className={`flex shrink-0 flex-col gap-1 py-5 ${collapsed ? "px-2" : "px-3"}`}>
        <NavItem
          label="Новый чат"
          icon={ChatCircleDots}
          active={newChatIsActive}
          collapsed={collapsed}
          onClick={onNewChat}
        />
        {navigation.map((item) => (
          <NavItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            active={activeWorkspace === item.id}
            collapsed={collapsed}
            count={item.id === "conversations" ? conversationCount : undefined}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </nav>

      {!collapsed && <div className="mx-6 h-px shrink-0 bg-linear-to-r from-transparent via-[#80683e] to-transparent opacity-80" />}

      <div className={`mt-auto shrink-0 ${collapsed ? "px-2 pb-3" : "px-4 pb-4"}`}>
        {!collapsed && (
          <Image
            src="/space.png"
            alt=""
            width={1365}
            height={768}
            sizes="184px"
            className="h-auto w-full rounded-sm object-contain opacity-75"
          />
        )}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onNavigate("settings")}
              className={`mt-3 flex h-10 w-full items-center rounded-md border border-[#292929] text-left text-[#c8c0b2] transition-colors hover:border-[#5b4b30] hover:bg-[#171511] hover:text-[#ead5aa] ${
                collapsed ? "justify-center px-0" : "gap-2.5 px-2.5"
              }`}
              aria-label="Открыть профиль пользователя"
            >
              <UserCircle size={19} weight="light" className="shrink-0 text-[#b89a61]" />
              {!collapsed && (
                <span className="min-w-0 flex-1 truncate text-xs">
                  {userName.trim() || "Профиль пользователя"}
                </span>
              )}
            </button>
          </TooltipTrigger>
          {collapsed && <TooltipContent side="right">Профиль пользователя</TooltipContent>}
        </Tooltip>
        <div className={`mt-3 border-t border-[#242424] pt-3 ${collapsed ? "text-center" : ""}`}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onCollapse}
                  className="inline-flex size-9 items-center justify-center rounded-md text-[#929292] hover:bg-[#1a1a1a] hover:text-[#c6a46a]"
                  aria-label="Развернуть меню"
                >
                  <CaretRight size={17} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Развернуть меню</TooltipContent>
            </Tooltip>
          ) : (
            <>
              <div className="text-[10px] font-medium tracking-[0.15em] text-[#cfc2aa]">
                KLAREN 4E
              </div>
              <div className="mt-1 flex items-center justify-between text-[9px] tracking-[0.14em] text-[#716a5d]">
                <span>NULLXES · ORBITAL AI</span>
              </div>
              <div className="mt-2 text-[9px] tracking-[0.12em] text-[#625e55]">
                © 2026 NULLXES
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

function NavItem({
  label,
  icon: Icon,
  active,
  collapsed,
  count,
  onClick,
}: {
  label: string;
  icon: typeof ChatCircleDots;
  active: boolean;
  collapsed: boolean;
  count?: number;
  onClick: () => void;
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`relative flex h-10 w-full items-center rounded-md text-[13px] transition-colors ${
        collapsed ? "justify-center px-0" : "gap-3 px-3"
      } ${
        active
          ? "border border-[#54452d] bg-[#1a1712] text-[#e2c99d] shadow-[inset_0_0_18px_rgba(198,164,106,0.05)]"
          : "border border-transparent text-[#9b9b9b] hover:bg-[#171717] hover:text-[#ededed]"
      }`}
    >
      <Icon size={19} weight={active ? "regular" : "light"} />
      {!collapsed && <span className="min-w-0 flex-1 truncate text-left">{label}</span>}
      {!collapsed && count !== undefined && (
        <span className="text-[10px] tabular-nums text-[#686868]">{count}</span>
      )}
      {collapsed && count !== undefined && count > 0 && (
        <span className="absolute right-1 top-1 size-1.5 rounded-full bg-[#c6a46a]" />
      )}
    </button>
  );

  if (!collapsed) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
