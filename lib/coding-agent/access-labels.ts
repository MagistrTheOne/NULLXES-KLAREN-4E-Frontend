import type { ToolAccess } from "./contracts";

const LABELS: Record<ToolAccess, string> = {
  read: "Чтение",
  approval: "С подтверждением",
  separate_approval: "Отдельное подтверждение",
};

export function accessLabel(access: ToolAccess): string {
  return LABELS[access];
}