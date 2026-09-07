CREATE TABLE "ai_budgets" (
	"organization_id" text NOT NULL,
	"period" text NOT NULL,
	"limit_minor" bigint,
	"consumed_minor" bigint DEFAULT 0 NOT NULL,
	"currency" char(3) DEFAULT 'BRL' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_budgets_organization_id_period_pk" PRIMARY KEY("organization_id","period")
);
--> statement-breakpoint
CREATE TABLE "ai_global_kill_switch" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "ai_runs" (
	"organization_id" text NOT NULL,
	"id" text NOT NULL,
	"actor_id" text,
	"actor_type" text DEFAULT 'user' NOT NULL,
	"kind" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"status" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cost_minor" bigint DEFAULT 0 NOT NULL,
	"currency" char(3) DEFAULT 'BRL' NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"duration_ms" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_runs_organization_id_id_pk" PRIMARY KEY("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "ai_workspace_kill_switches" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
ALTER TABLE "ai_budgets" ADD CONSTRAINT "ai_budgets_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_global_kill_switch" ADD CONSTRAINT "ai_global_kill_switch_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_runs" ADD CONSTRAINT "ai_runs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_workspace_kill_switches" ADD CONSTRAINT "ai_workspace_kill_switches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_workspace_kill_switches" ADD CONSTRAINT "ai_workspace_kill_switches_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_runs_org_started_idx" ON "ai_runs" USING btree ("organization_id","started_at" desc);--> statement-breakpoint
ALTER TABLE "ai_runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_runs" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "ai_runs_workspace" ON "ai_runs" USING (organization_id = nullif(current_setting('app.workspace_id', true), '')) WITH CHECK (organization_id = nullif(current_setting('app.workspace_id', true), ''));--> statement-breakpoint
ALTER TABLE "ai_budgets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_budgets" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "ai_budgets_workspace" ON "ai_budgets" USING (organization_id = nullif(current_setting('app.workspace_id', true), '')) WITH CHECK (organization_id = nullif(current_setting('app.workspace_id', true), ''));--> statement-breakpoint
ALTER TABLE "ai_workspace_kill_switches" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "ai_workspace_kill_switches" FORCE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "ai_workspace_kill_switches_workspace" ON "ai_workspace_kill_switches" USING (organization_id = nullif(current_setting('app.workspace_id', true), '')) WITH CHECK (organization_id = nullif(current_setting('app.workspace_id', true), ''));