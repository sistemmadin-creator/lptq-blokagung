-- Migration to add no_wa and kode_kamar columns to santri table
-- and create app_settings table for hierarchy dropdown configuration

ALTER TABLE public.santri
ADD COLUMN IF NOT EXISTS no_wa TEXT;

ALTER TABLE public.santri
ADD COLUMN IF NOT EXISTS kode_kamar TEXT;

-- Table for app settings / hierarchy rules (similar to madin blokagung)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for security
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access for public/authenticated
DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Allow public read access on app_settings'
  ) THEN
    CREATE POLICY "Allow public read access on app_settings"
      ON public.app_settings FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Allow write access on app_settings'
  ) THEN
    CREATE POLICY "Allow write access on app_settings"
      ON public.app_settings FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END
$policy$;
