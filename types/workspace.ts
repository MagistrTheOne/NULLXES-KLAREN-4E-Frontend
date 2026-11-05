export type Workspace =
  | "chat"
  | "conversations"
  | "model"
  | "tools"
  | "projects"
  | "settings";

export type MessageRole = "user" | "assistant";

export interface LocalAttachment {
  id: string;
  name: string;
  mediaType: string;
  previewDataUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  attachments: LocalAttachment[];
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
}

export interface WorkspaceData {
  conversations: Conversation[];
  projects: Project[];
  preferences: Preferences;
}
