-- ==============================================================================
-- 028_incident_urgency.sql
-- The report form asks how urgent a case is (critical / urgent / normal) but only "critical"
-- survived, as a "[ฉุกเฉินวิกฤต]" prefix on the symptoms text. Store it in its own column so
-- foundations can see it on each case and sort critical cases first.
-- Applied to the HaBan project on 2026-10-23.
-- ==============================================================================

ALTER TABLE public.incident_reports
  ADD COLUMN IF NOT EXISTS urgency TEXT NOT NULL DEFAULT 'urgent';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'incident_reports_urgency_check') THEN
    ALTER TABLE public.incident_reports
      ADD CONSTRAINT incident_reports_urgency_check CHECK (urgency IN ('critical', 'urgent', 'normal'));
  END IF;
END $$;

-- Reports sent with the old prefix become critical, and lose the prefix
UPDATE public.incident_reports
SET urgency = 'critical',
    symptoms = btrim(substr(symptoms, length('[ฉุกเฉินวิกฤต]') + 1))
WHERE symptoms LIKE '[ฉุกเฉินวิกฤต]%';
