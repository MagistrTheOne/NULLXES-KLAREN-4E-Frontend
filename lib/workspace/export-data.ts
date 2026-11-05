import type { Conversation, WorkspaceData } from "@/types/workspace";

type ExportFormat = "md" | "txt" | "json";

function safeName(value: string) {
  return value.normalize("NFKC").replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]+/g, "-").slice(0, 64) || "klaren-chat";
}

function saveFile(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime + ";charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportConversation(conversation: Conversation, format: ExportFormat) {
  const filename = safeName(conversation.title);
  if (format === "json") {
    saveFile(filename + ".json", JSON.stringify(conversation, null, 2), "application/json");
    return;
  }
  const lines = [
    format === "md" ? "# " + conversation.title : conversation.title,
    "",
    "KLAREN 4E — NULLXES",
    "",
  ];
  for (const message of conversation.messages) {
    lines.push(format === "md" ? "## " + (message.role === "user" ? "Вы" : "KLAREN 4E") : (message.role === "user" ? "Вы" : "KLAREN 4E"));
    lines.push(message.createdAt, "", message.content, "");
    for (const attachment of message.attachments) lines.push("Вложение: " + attachment.name);
    lines.push("");
  }
  saveFile(filename + "." + format, lines.join("\n"), "text/plain");
}

export function exportAllWorkspaceData(data: WorkspaceData) {
  saveFile("nullxes-klaren-workspace.json", JSON.stringify(data, null, 2), "application/json");
}
