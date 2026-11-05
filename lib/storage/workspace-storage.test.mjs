import assert from "node:assert/strict";
import test from "node:test";
import { readWorkspaceData, writeWorkspaceData } from "./workspace-storage.ts";

function installStorage(initialValue) {
  const values = new Map(initialValue ? [["nullxes-klaren-workspace-v1", initialValue]] : []);
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
      },
    },
  });
  return values;
}

test("migrates existing workspace preferences without losing conversations", () => {
  const conversation = {
    id: "conversation-1",
    title: "Сохранённый диалог",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    projectId: null,
    messages: [],
  };
  installStorage(JSON.stringify({
    conversations: [conversation],
    projects: [],
    preferences: {
      sidebarCollapsed: false,
      portraitVisible: true,
      reducedMotion: false,
      enterToSend: true,
    },
  }));

  const data = readWorkspaceData();

  assert.equal(data.conversations[0].id, conversation.id);
  assert.equal(data.preferences.renderMarkdown, true);
  assert.equal(data.preferences.codingModeEnabled, false);
  assert.equal(data.preferences.sharpness, "wry");
});

test("persists new profile preferences without changing conversation data", () => {
  const conversation = {
    id: "conversation-1",
    title: "Сохранённый диалог",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    projectId: null,
    messages: [],
  };
  const values = installStorage(JSON.stringify({
    conversations: [conversation],
    projects: [],
    preferences: {
      sidebarCollapsed: false,
      portraitVisible: true,
      reducedMotion: false,
      enterToSend: true,
    },
  }));
  const data = readWorkspaceData();
  data.preferences.userName = "Мага";
  data.preferences.codingModeEnabled = true;
  writeWorkspaceData(data);

  const saved = JSON.parse(values.get("nullxes-klaren-workspace-v1"));
  assert.equal(saved.conversations[0].title, conversation.title);
  assert.equal(saved.preferences.userName, "Мага");
  assert.equal(saved.preferences.codingModeEnabled, true);
});
