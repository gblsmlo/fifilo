CREATE TABLE "conversations" (
	"organization_id" text NOT NULL,
	"id" text NOT NULL,
	"created_by" text NOT NULL,
	"title" text,
	"provider_session_id" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversations_organization_id_id_pk" PRIMARY KEY("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"organization_id" text NOT NULL,
	"id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"author_type" text NOT NULL,
	"author_id" text,
	"role" text NOT NULL,
	"content" jsonb NOT NULL,
	"tool_call_id" text,
	"token_usage" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_organization_id_id_pk" PRIMARY KEY("organization_id","id")
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_organization_id_conversation_id_conversations_organization_id_id_fk" FOREIGN KEY ("organization_id","conversation_id") REFERENCES "public"."conversations"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversations_org_created_by_idx" ON "conversations" USING btree ("organization_id","created_by");--> statement-breakpoint
CREATE INDEX "messages_org_conversation_created_idx" ON "messages" USING btree ("organization_id","conversation_id","created_at");--> statement-breakpoint
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "conversations" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "conversations_workspace" ON "conversations" USING (organization_id = nullif(current_setting('app.workspace_id', true), '')) WITH CHECK (organization_id = nullif(current_setting('app.workspace_id', true), ''));--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "messages" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "messages_workspace" ON "messages" USING (organization_id = nullif(current_setting('app.workspace_id', true), '')) WITH CHECK (organization_id = nullif(current_setting('app.workspace_id', true), ''));