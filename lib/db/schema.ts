import {
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import type {
  ChatMessage,
  LocalAttachment,
  Preferences,
} from "@/types/workspace";

export const workspacePreferences = pgTable("klaren_workspace_preferences", {
  userId: text("user_id").primaryKey(),
  preferences: jsonb("preferences").$type<Preferences>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});

export const workspaceProjects = pgTable(
  "klaren_projects",
  {
    userId: text("user_id").notNull(),
    id: text("id").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.id] })],
);

export const workspaceConversations = pgTable(
  "klaren_conversations",
  {
    userId: text("user_id").notNull(),
    id: text("id").notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
    projectId: text("project_id"),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
  ],
);

export const workspaceMessages = pgTable(
  "klaren_messages",
  {
    userId: text("user_id").notNull(),
    id: text("id").notNull(),
    conversationId: text("conversation_id").notNull(),
    role: text("role").$type<ChatMessage["role"]>().notNull(),
    content: text("content").notNull(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
    attachments: jsonb("attachments").$type<LocalAttachment[]>().notNull().default([]),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.id] }),
    foreignKey({
      name: "klaren_messages_conversation_fk",
      columns: [table.userId, table.conversationId],
      foreignColumns: [workspaceConversations.userId, workspaceConversations.id],
    }).onDelete("cascade"),
  ],
);
