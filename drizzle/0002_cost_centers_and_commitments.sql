ALTER TABLE "memberships" ADD COLUMN "approval_limit_minor" bigint;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_approval_limit_check" CHECK ("memberships"."approval_limit_minor" is null or "memberships"."approval_limit_minor" between 1 and 9007199254740991);--> statement-breakpoint
CREATE TABLE "cost_centers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"allocated_budget_minor" bigint NOT NULL,
	"committed_budget_minor" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cost_centers_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "cost_centers_tenant_code_unique" UNIQUE("tenant_id","code"),
	CONSTRAINT "cost_centers_currency_check" CHECK ("cost_centers"."currency" = 'USD'),
	CONSTRAINT "cost_centers_allocated_check" CHECK ("cost_centers"."allocated_budget_minor" between 0 and 9007199254740991)
);--> statement-breakpoint
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cost_centers_tenant_code_idx" ON "cost_centers" USING btree ("tenant_id","code");--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD COLUMN "cost_center_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_cost_center_fk" FOREIGN KEY ("tenant_id","cost_center_id") REFERENCES "public"."cost_centers"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "purchase_requests_cost_center_idx" ON "purchase_requests" USING btree ("tenant_id","cost_center_id");--> statement-breakpoint
CREATE TABLE "financial_commitments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"cost_center_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"committed_by_actor_id" uuid NOT NULL,
	"committed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "financial_commitments_amount_check" CHECK ("financial_commitments"."amount_minor" between 1 and 9007199254740991),
	CONSTRAINT "financial_commitments_currency_check" CHECK ("financial_commitments"."currency" = 'USD')
);--> statement-breakpoint
ALTER TABLE "financial_commitments" ADD CONSTRAINT "financial_commitments_cost_center_fk" FOREIGN KEY ("tenant_id","cost_center_id") REFERENCES "public"."cost_centers"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_commitments" ADD CONSTRAINT "financial_commitments_request_fk" FOREIGN KEY ("tenant_id","request_id") REFERENCES "public"."purchase_requests"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_commitments" ADD CONSTRAINT "financial_commitments_actor_membership_fk" FOREIGN KEY ("tenant_id","committed_by_actor_id") REFERENCES "public"."memberships"("tenant_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "financial_commitments_cost_center_idx" ON "financial_commitments" USING btree ("tenant_id","cost_center_id");
