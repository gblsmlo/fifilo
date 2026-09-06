CREATE TABLE "entries" (
	"organization_id" text NOT NULL,
	"id" text NOT NULL,
	"transaction_id" text,
	"account_id" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"occurred_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entries_organization_id_id_pk" PRIMARY KEY("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "financial_accounts" (
	"organization_id" text NOT NULL,
	"id" text NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"institution" text,
	"currency" char(3) NOT NULL,
	"color" text,
	"icon" text,
	"archived_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_accounts_organization_id_id_pk" PRIMARY KEY("organization_id","id")
);
--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_organization_id_account_id_financial_accounts_organization_id_id_fk" FOREIGN KEY ("organization_id","account_id") REFERENCES "public"."financial_accounts"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entries_org_account_occurred_idx" ON "entries" USING btree ("organization_id","account_id","occurred_on");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_accounts_org_name_unique" ON "financial_accounts" USING btree ("organization_id",lower("name")) WHERE "financial_accounts"."archived_at" is null;--> statement-breakpoint
ALTER TABLE "entries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "entries" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "entries_workspace" ON "entries" USING (organization_id = nullif(current_setting('app.workspace_id', true), '')) WITH CHECK (organization_id = nullif(current_setting('app.workspace_id', true), ''));
--> statement-breakpoint
ALTER TABLE "financial_accounts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "financial_accounts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "financial_accounts_workspace" ON "financial_accounts" USING (organization_id = nullif(current_setting('app.workspace_id', true), '')) WITH CHECK (organization_id = nullif(current_setting('app.workspace_id', true), ''));
