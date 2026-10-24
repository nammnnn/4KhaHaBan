-- 030: things the admin console watches.
-- Additive only: one new table, one new column, a trigger. Nothing is dropped or rewritten.

-- 1. Reports can point at a listing (an animal), not only at a person
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS animal_id uuid REFERENCES public.animals(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS reports_animal_id_idx ON public.reports (animal_id);

-- 2. PromptPay changes on approved foundations, for an admin to confirm.
--    Donations go to this number, so a change (e.g. after an account takeover) should be seen by a person.
CREATE TABLE IF NOT EXISTS public.foundation_payout_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  foundation_id uuid NOT NULL REFERENCES public.foundation_profiles(id) ON DELETE CASCADE,
  old_number text,
  new_number text,
  changed_by uuid,
  changed_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);
CREATE INDEX IF NOT EXISTS foundation_payout_changes_open_idx ON public.foundation_payout_changes (changed_at) WHERE reviewed_at IS NULL;

ALTER TABLE public.foundation_payout_changes ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'foundation_payout_changes' AND policyname = 'payout_changes_admin_select') THEN
    CREATE POLICY payout_changes_admin_select ON public.foundation_payout_changes FOR SELECT TO authenticated USING (public.is_super_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'foundation_payout_changes' AND policyname = 'payout_changes_admin_update') THEN
    CREATE POLICY payout_changes_admin_update ON public.foundation_payout_changes FOR UPDATE TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
  END IF;
END;
$$;

-- Rows are only written by this trigger (security definer), never directly by the app
CREATE OR REPLACE FUNCTION public.log_promptpay_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.promptpay_number IS DISTINCT FROM OLD.promptpay_number
     AND NEW.verification_status = 'approved'
     AND NOT COALESCE(public.is_super_admin(), false) THEN
    INSERT INTO public.foundation_payout_changes (foundation_id, old_number, new_number, changed_by)
    VALUES (NEW.id, OLD.promptpay_number, NEW.promptpay_number, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_promptpay_change ON public.foundation_profiles;
CREATE TRIGGER trg_log_promptpay_change
  AFTER UPDATE OF promptpay_number ON public.foundation_profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_promptpay_change();
