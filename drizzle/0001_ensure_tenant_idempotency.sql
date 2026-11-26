DO $$
BEGIN
  -- Keep the preflight and the constraint installation in the same locked transaction.
  LOCK TABLE public.purchase_requests IN ACCESS EXCLUSIVE MODE;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.purchase_requests'::regclass
      AND conname = 'purchase_requests_tenant_key_unique'
      AND contype = 'u'
      AND pg_catalog.pg_get_constraintdef(oid) = 'UNIQUE (tenant_id, idempotency_key)'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.purchase_requests
      GROUP BY tenant_id, idempotency_key
      HAVING count(*) > 1
    ) THEN
      RAISE EXCEPTION 'The lab contains duplicate tenant/idempotency keys. Reconcile the duplicates before retrying the migration.'
        USING ERRCODE = '23505';
    END IF;

    ALTER TABLE public.purchase_requests
      ADD CONSTRAINT purchase_requests_tenant_key_unique UNIQUE (tenant_id, idempotency_key);
  END IF;
END;
$$;
