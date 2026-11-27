DO $$
BEGIN
  -- Serialize preflight checks and constraint installation on both financial tables.
  LOCK TABLE public.cost_centers, public.financial_commitments IN ACCESS EXCLUSIVE MODE;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.cost_centers'::regclass
      AND conname = 'cost_centers_budget_bounds_check'
      AND contype = 'c'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.cost_centers
      WHERE committed_budget_minor < 0
         OR committed_budget_minor > allocated_budget_minor
    ) THEN
      RAISE EXCEPTION 'Cost centers contain overspent or negative committed balances. Reconcile balances before retrying the migration.'
        USING ERRCODE = '23514';
    END IF;

    ALTER TABLE public.cost_centers
      ADD CONSTRAINT cost_centers_budget_bounds_check
      CHECK (committed_budget_minor >= 0 AND committed_budget_minor <= allocated_budget_minor);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.financial_commitments'::regclass
      AND conname = 'financial_commitments_tenant_request_unique'
      AND contype = 'u'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.financial_commitments
      GROUP BY tenant_id, request_id
      HAVING count(*) > 1
    ) THEN
      RAISE EXCEPTION 'Financial commitments contain duplicate tenant/request records. Reconcile duplicates before retrying the migration.'
        USING ERRCODE = '23505';
    END IF;

    ALTER TABLE public.financial_commitments
      ADD CONSTRAINT financial_commitments_tenant_request_unique
      UNIQUE (tenant_id, request_id);
  END IF;
END;
$$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "decision_idempotency_keys" (
	"tenant_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"actor_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"decision" text NOT NULL,
	"reason" text,
	"request_hash" text NOT NULL,
	"response_status" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "decision_idempotency_keys_pk" PRIMARY KEY("tenant_id","idempotency_key"),
	CONSTRAINT "decision_idempotency_keys_decision_check" CHECK ("decision_idempotency_keys"."decision" in ('APPROVE', 'REJECT'))
);--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.decision_idempotency_keys'::regclass
      AND conname = 'decision_idempotency_keys_actor_fk'
  ) THEN
    ALTER TABLE "decision_idempotency_keys"
      ADD CONSTRAINT "decision_idempotency_keys_actor_fk"
      FOREIGN KEY ("tenant_id","actor_id") REFERENCES "public"."memberships"("tenant_id","user_id")
      ON DELETE no action ON UPDATE no action;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.decision_idempotency_keys'::regclass
      AND conname = 'decision_idempotency_keys_request_fk'
  ) THEN
    ALTER TABLE "decision_idempotency_keys"
      ADD CONSTRAINT "decision_idempotency_keys_request_fk"
      FOREIGN KEY ("tenant_id","request_id") REFERENCES "public"."purchase_requests"("tenant_id","id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END;
$$;
