CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text,
	CONSTRAINT "audit_events_type_check" CHECK ("audit_events"."event_type" in ('CREATED', 'APPROVED', 'REJECTED'))
);
--> statement-breakpoint
CREATE TABLE "lab_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"lab_identity" text,
	CONSTRAINT "memberships_tenant_id_user_id_pk" PRIMARY KEY("tenant_id","user_id"),
	CONSTRAINT "memberships_lab_identity_unique" UNIQUE("lab_identity"),
	CONSTRAINT "memberships_role_check" CHECK ("memberships"."role" in ('REQUESTER', 'APPROVER', 'AUDITOR'))
);
--> statement-breakpoint
CREATE TABLE "purchase_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"requester_id" uuid NOT NULL,
	"title" text NOT NULL,
	"justification" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_requests_tenant_id_unique" UNIQUE("tenant_id","id"),
	CONSTRAINT "purchase_requests_tenant_key_unique" UNIQUE("tenant_id","idempotency_key"),
	CONSTRAINT "purchase_requests_amount_check" CHECK ("purchase_requests"."amount_minor" between 1 and 9007199254740991),
	CONSTRAINT "purchase_requests_currency_check" CHECK ("purchase_requests"."currency" = 'USD'),
	CONSTRAINT "purchase_requests_status_check" CHECK ("purchase_requests"."status" in ('PENDING', 'APPROVED', 'REJECTED'))
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_request_fk" FOREIGN KEY ("tenant_id","request_id") REFERENCES "public"."purchase_requests"("tenant_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_membership_fk" FOREIGN KEY ("tenant_id","actor_id") REFERENCES "public"."memberships"("tenant_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_sessions" ADD CONSTRAINT "lab_sessions_membership_fk" FOREIGN KEY ("tenant_id","user_id") REFERENCES "public"."memberships"("tenant_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_requester_membership_fk" FOREIGN KEY ("tenant_id","requester_id") REFERENCES "public"."memberships"("tenant_id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_request_time_idx" ON "audit_events" USING btree ("tenant_id","request_id","occurred_at");--> statement-breakpoint
CREATE INDEX "purchase_requests_tenant_created_idx" ON "purchase_requests" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "purchase_requests_requester_created_idx" ON "purchase_requests" USING btree ("tenant_id","requester_id","created_at");