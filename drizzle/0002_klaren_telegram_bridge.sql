CREATE TABLE "klaren_telegram_links" (
  "user_id" text PRIMARY KEY NOT NULL,
  "telegram_user_id" text,
  "code_hash" text,
  "expires_at" timestamp with time zone,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "klaren_telegram_links_telegram_user_id_unique" UNIQUE("telegram_user_id")
);
--> statement-breakpoint
CREATE TABLE "klaren_telegram_messages" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "chat_id" text NOT NULL,
  "business_connection_id" text DEFAULT '' NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "klaren_telegram_messages_user_chat_idx" ON "klaren_telegram_messages" USING btree ("user_id","chat_id","created_at");
--> statement-breakpoint
CREATE TABLE "klaren_telegram_updates" (
  "update_id" text PRIMARY KEY NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
