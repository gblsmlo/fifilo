CREATE TABLE "categories" (
	"organization_id" text NOT NULL,
	"id" text NOT NULL,
	"parent_id" text,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"icon" text,
	"archived_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_organization_id_id_pk" PRIMARY KEY("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"organization_id" text NOT NULL,
	"id" text NOT NULL,
	"kind" text NOT NULL,
	"description" text NOT NULL,
	"notes" text,
	"occurred_on" date NOT NULL,
	"category_id" text,
	"created_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_organization_id_id_pk" PRIMARY KEY("organization_id","id")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_organization_id_parent_id_categories_organization_id_id_fk" FOREIGN KEY ("organization_id","parent_id") REFERENCES "public"."categories"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_organization_id_category_id_categories_organization_id_id_fk" FOREIGN KEY ("organization_id","category_id") REFERENCES "public"."categories"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_org_parent_kind_name_unique" ON "categories" USING btree ("organization_id",coalesce("parent_id", ''),"kind",lower("name")) WHERE "categories"."archived_at" is null;--> statement-breakpoint
CREATE INDEX "transactions_org_occurred_idx" ON "transactions" USING btree ("organization_id","occurred_on" desc);--> statement-breakpoint
CREATE INDEX "transactions_org_category_occurred_idx" ON "transactions" USING btree ("organization_id","category_id","occurred_on");--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_organization_id_transaction_id_transactions_organization_id_id_fk" FOREIGN KEY ("organization_id","transaction_id") REFERENCES "public"."transactions"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "categories_workspace" ON "categories" USING (organization_id = nullif(current_setting('app.workspace_id', true), '')) WITH CHECK (organization_id = nullif(current_setting('app.workspace_id', true), ''));
--> statement-breakpoint
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "transactions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "transactions_workspace" ON "transactions" USING (organization_id = nullif(current_setting('app.workspace_id', true), '')) WITH CHECK (organization_id = nullif(current_setting('app.workspace_id', true), ''));
