CREATE TABLE "financial_onboarding_progress" (
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_onboarding_progress_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "financial_onboarding_progress" ADD CONSTRAINT "financial_onboarding_progress_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_onboarding_progress" ADD CONSTRAINT "financial_onboarding_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "financial_onboarding_progress" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "financial_onboarding_progress" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "financial_onboarding_progress_workspace" ON "financial_onboarding_progress" USING (
  organization_id = nullif(current_setting('app.workspace_id', true), '')
  AND user_id = nullif(current_setting('app.user_id', true), '')
) WITH CHECK (
  organization_id = nullif(current_setting('app.workspace_id', true), '')
  AND user_id = nullif(current_setting('app.user_id', true), '')
);
