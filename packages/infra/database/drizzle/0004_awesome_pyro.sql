CREATE TABLE "card_invoices" (
	"organization_id" text NOT NULL,
	"id" text NOT NULL,
	"account_id" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"due_on" date NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"total_minor" bigint DEFAULT 0 NOT NULL,
	"closed_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_invoices_organization_id_id_pk" PRIMARY KEY("organization_id","id")
);
--> statement-breakpoint
CREATE TABLE "credit_card_details" (
	"organization_id" text NOT NULL,
	"account_id" text NOT NULL,
	"closing_day" integer NOT NULL,
	"due_day" integer NOT NULL,
	"limit_minor" bigint NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_card_details_organization_id_account_id_pk" PRIMARY KEY("organization_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "installment_plans" (
	"organization_id" text NOT NULL,
	"id" text NOT NULL,
	"description" text NOT NULL,
	"notes" text,
	"total_minor" bigint NOT NULL,
	"installments" integer NOT NULL,
	"first_occurred_on" date NOT NULL,
	"category_id" text,
	"created_by" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "installment_plans_organization_id_id_pk" PRIMARY KEY("organization_id","id")
);
--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "invoice_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "installment_plan_id" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "installment_number" integer;--> statement-breakpoint
ALTER TABLE "card_invoices" ADD CONSTRAINT "card_invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_invoices" ADD CONSTRAINT "card_invoices_organization_id_account_id_financial_accounts_organization_id_id_fk" FOREIGN KEY ("organization_id","account_id") REFERENCES "public"."financial_accounts"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_details" ADD CONSTRAINT "credit_card_details_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card_details" ADD CONSTRAINT "credit_card_details_organization_id_account_id_financial_accounts_organization_id_id_fk" FOREIGN KEY ("organization_id","account_id") REFERENCES "public"."financial_accounts"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "installment_plans" ADD CONSTRAINT "installment_plans_organization_id_category_id_categories_organization_id_id_fk" FOREIGN KEY ("organization_id","category_id") REFERENCES "public"."categories"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "card_invoices_org_account_period_unique" ON "card_invoices" USING btree ("organization_id","account_id","period_start");--> statement-breakpoint
CREATE INDEX "card_invoices_org_account_status_idx" ON "card_invoices" USING btree ("organization_id","account_id","status");--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_organization_id_invoice_id_card_invoices_organization_id_id_fk" FOREIGN KEY ("organization_id","invoice_id") REFERENCES "public"."card_invoices"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_organization_id_installment_plan_id_installment_plans_organization_id_id_fk" FOREIGN KEY ("organization_id","installment_plan_id") REFERENCES "public"."installment_plans"("organization_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entries_org_invoice_idx" ON "entries" USING btree ("organization_id","invoice_id");--> statement-breakpoint
CREATE INDEX "transactions_org_installment_plan_idx" ON "transactions" USING btree ("organization_id","installment_plan_id");--> statement-breakpoint
ALTER TABLE "card_invoices" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "card_invoices" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "card_invoices_workspace" ON "card_invoices" USING (organization_id = nullif(current_setting('app.workspace_id', true), '')) WITH CHECK (organization_id = nullif(current_setting('app.workspace_id', true), ''));
--> statement-breakpoint
ALTER TABLE "credit_card_details" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "credit_card_details" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "credit_card_details_workspace" ON "credit_card_details" USING (organization_id = nullif(current_setting('app.workspace_id', true), '')) WITH CHECK (organization_id = nullif(current_setting('app.workspace_id', true), ''));
--> statement-breakpoint
ALTER TABLE "installment_plans" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "installment_plans" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "installment_plans_workspace" ON "installment_plans" USING (organization_id = nullif(current_setting('app.workspace_id', true), '')) WITH CHECK (organization_id = nullif(current_setting('app.workspace_id', true), ''));