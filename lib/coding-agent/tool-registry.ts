import type { CodingToolDefinition } from "./contracts";

export const CODING_TOOL_REGISTRY: CodingToolDefinition[] = [
  {
    id: "repo.list",
    title: "repo.list",
    capability: "Структура репозитория",
    access: "read",
    phase: 1,
    availability: "preview",
    description: "Список репозиториев и корневого дерева (read-only GitHub).",
  },
  {
    id: "repo.read",
    title: "repo.read",
    capability: "Чтение файлов",
    access: "read",
    phase: 1,
    availability: "preview",
    description: "Просмотр содержимого файла без изменений.",
  },
  {
    id: "repo.search",
    title: "repo.search",
    capability: "Поиск по коду",
    access: "read",
    phase: 1,
    availability: "preview",
    description: "Поиск по репозиторию через GitHub Code Search.",
  },
  {
    id: "code.patch",
    title: "code.patch",
    capability: "Подготовка изменений",
    access: "approval",
    phase: 3,
    availability: "disabled",
    description: "Генерация патча. Требует явного подтверждения (не включено в V1).",
  },
  {
    id: "code.diff",
    title: "code.diff",
    capability: "Просмотр изменений",
    access: "read",
    phase: 3,
    availability: "not_connected",
    description: "Diff preview перед apply. Подключится после Phase 3.",
  },
  {
    id: "sandbox.test",
    title: "sandbox.test",
    capability: "Запуск тестов в изоляции",
    access: "approval",
    phase: 4,
    availability: "disabled",
    description: "Только изолированный sandbox после отдельной проверки.",
  },
  {
    id: "git.commit",
    title: "git.commit",
    capability: "Коммит изменений",
    access: "approval",
    phase: 5,
    availability: "disabled",
    description: "Без авто-коммита. Отдельный approval flow.",
  },
  {
    id: "git.push",
    title: "git.push",
    capability: "Отправка изменений",
    access: "separate_approval",
    phase: 5,
    availability: "disabled",
    description: "Отдельное подтверждение от commit; branch protection.",
  },
];

export function getToolDefinition(id: CodingToolDefinition["id"]): CodingToolDefinition | undefined {
  return CODING_TOOL_REGISTRY.find((tool) => tool.id === id);
}