export type Workspace =
  | "chat"
  | "conversations"
  | "model"
  | "tools"
  | "coding"
  | "projects"
  | "settings";

export type MessageRole = "user" | "assistant";

export interface LocalAttachment {
  id: string;
  name: string;
  mediaType: string;
  previewDataUrl?: string;
  contentText?: string;
  remoteFileId?: string;
  remoteFileProof?: string;
}

export type ChatMessagePart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "tool";
      tool: "repo.list" | "repo.read" | "repo.search";
      requestId: string;
      status: "pending" | "ok" | "error";
      summary?: import("@/lib/chat/message-parts").ChatToolSummary;
      errorMessage?: string;
    };

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  attachments: LocalAttachment[];
  /** Опционально: tool cards и сегменты текста (старые диалоги — только content). */
  parts?: ChatMessagePart[];
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  projectId: string | null;
  messages: ChatMessage[];
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
}

export interface Preferences {
  sidebarCollapsed: boolean;
  portraitVisible: boolean;
  reducedMotion: boolean;
  enterToSend: boolean;
  userName: string;
  userContext: string;
  pinnedMemories: { id: string; text: string }[];
  projectContexts: Record<string, string>;
  projectFiles: Record<string, LocalAttachment[]>;
  sharpness: "balanced" | "wry" | "sharp";
  roleplayEnabled: boolean;
  adultThemesEnabled: boolean;
  codingModeEnabled: boolean;
  codingStyle: "balanced" | "concise" | "step-by-step";
  renderMarkdown: boolean;
}

export interface WorkspaceData {
  conversations: Conversation[];
  projects: Project[];
  preferences: Preferences;
}
