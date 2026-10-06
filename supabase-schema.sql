-- ============================================================
-- Xpotential Real Estate CRM - Safe Supabase Schema
-- ============================================================

-- 1. PROJECT LEADS
CREATE TABLE IF NOT EXISTS public.project_leads (
  id TEXT PRIMARY KEY,
  "projectName" TEXT DEFAULT '',
  developer TEXT DEFAULT '',
  community TEXT DEFAULT '',
  "unitDetails" TEXT DEFAULT '',
  "propertyType" TEXT DEFAULT 'Apartment',
  "handoverDetails" TEXT DEFAULT '',
  "visitedDate" TEXT DEFAULT '',
  "ownerName" TEXT DEFAULT '',
  "contactNo" TEXT DEFAULT '',
  "callStatus" TEXT DEFAULT 'New',
  "followUpDate" TEXT DEFAULT '',
  "followUpTime" TEXT DEFAULT '10:00',
  notes TEXT DEFAULT '',
  "budgetAED" NUMERIC DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);


-- 2. SECONDARY LEADS
CREATE TABLE IF NOT EXISTS public.secondary_leads (
  id TEXT PRIMARY KEY,
  name TEXT DEFAULT '',
  mobile TEXT DEFAULT '',
  property TEXT DEFAULT '',
  "clientType" TEXT DEFAULT 'Buyer',
  "dateContacted" TEXT DEFAULT '',
  budget NUMERIC DEFAULT 0,
  "expectationRequirements" TEXT DEFAULT '',
  "remarksStatus" TEXT DEFAULT 'New Lead',
  "followUpDate" TEXT DEFAULT '',
  "followUpTime" TEXT DEFAULT '10:00',
  notes TEXT DEFAULT '',
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);


-- 3. CUSTOM TABLES
CREATE TABLE IF NOT EXISTS public.custom_tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  columns JSONB DEFAULT '[]'::jsonb,
  "userEmail" TEXT DEFAULT '',
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);


-- 4. CUSTOM TABLE ROWS
CREATE TABLE IF NOT EXISTS public.custom_table_rows (
  id TEXT PRIMARY KEY,
  "tableId" TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  "userEmail" TEXT DEFAULT '',
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);


-- Indexes for high-performance and strict per-user Google ID isolation
CREATE INDEX IF NOT EXISTS idx_custom_tables_userEmail ON public.custom_tables ("userEmail");
CREATE INDEX IF NOT EXISTS idx_custom_table_rows_userEmail ON public.custom_table_rows ("userEmail");
CREATE INDEX IF NOT EXISTS idx_custom_table_rows_tableId ON public.custom_table_rows ("tableId");


-- ============================================================
-- 5. ENABLE RLS
-- ============================================================

ALTER TABLE public.project_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secondary_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_table_rows ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Public access on project_leads"
ON public.project_leads;

CREATE POLICY "Public access on project_leads"
ON public.project_leads
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);


DROP POLICY IF EXISTS "Public access on secondary_leads"
ON public.secondary_leads;

CREATE POLICY "Public access on secondary_leads"
ON public.secondary_leads
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);


DROP POLICY IF EXISTS "Public access on custom_tables"
ON public.custom_tables;

CREATE POLICY "Public access on custom_tables"
ON public.custom_tables
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);


DROP POLICY IF EXISTS "Public access on custom_table_rows"
ON public.custom_table_rows;

CREATE POLICY "Public access on custom_table_rows"
ON public.custom_table_rows
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);


-- ============================================================
-- 7. ENABLE REALTIME SAFELY
-- ============================================================

DO $$
BEGIN

  -- project_leads
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'project_leads'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'project_leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime
    ADD TABLE public.project_leads;
  END IF;


  -- secondary_leads
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'secondary_leads'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'secondary_leads'
  ) THEN
    ALTER PUBLICATION supabase_realtime
    ADD TABLE public.secondary_leads;
  END IF;


  -- custom_tables
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'custom_tables'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'custom_tables'
  ) THEN
    ALTER PUBLICATION supabase_realtime
    ADD TABLE public.custom_tables;
  END IF;


  -- custom_table_rows
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'custom_table_rows'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'custom_table_rows'
  ) THEN
    ALTER PUBLICATION supabase_realtime
    ADD TABLE public.custom_table_rows;
  END IF;

END $$;