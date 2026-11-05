CREATE TABLE "klaren_conversations" (
	"user_id" text NOT NULL,
	"id" text NOT NULL,
	"title" varchar(160) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"project_id" text,
	CONSTRAINT "klaren_conversations_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "klaren_messages" (
	"user_id" text NOT NULL,
	"id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "klaren_messages_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "klaren_workspace_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"preferences" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "klaren_projects" (
	"user_id" text NOT NULL,
	"id" text NOT NULL,
	"name" varchar(120) NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "klaren_projects_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
ALTER TABLE "klaren_messages" ADD CONSTRAINT "klaren_messages_conversation_fk" FOREIGN KEY ("user_id","conversation_id") REFERENCES "public"."klaren_conversations"("user_id","id") ON DELETE cascade ON UPDATE no action;