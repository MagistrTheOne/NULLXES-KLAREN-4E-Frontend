import type { Preferences, WorkspaceData } from "@/types/workspace";

/** Removed from the browser after the first successful account workspace load. */
export const LEGACY_LOCAL_STORAGE_KEY = "nullxes-klaren-workspace-v1";

export const DEFAULT_PREFERENCES: Preferences = {
  sidebarCollapsed: false,
  portraitVisible: true,
  reducedMotion: false,
  enterToSend: true,
  userName: "",
  userContext: "",
  pinnedMemories: [],
  projectContexts: {},
  projectFiles: {},
  sharpness: "wry",
  roleplayEnabled: false,
  adultThemesEnabled: false,
  codingModeEnabled: false,
  codingStyle: "balanced",
  renderMarkdown: true,
};

export function createEmptyWorkspaceData(): WorkspaceData {
  return {
    conversations: [],
    projects: [],
    preferences: { ...DEFAULT_PREFERENCES },
  };
}