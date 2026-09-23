-- ==============================================================================
-- Supabase Schema for Xpotential Real Estate CRM
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Create Project Leads Table (Off-Plan CRM Spreadsheet)
CREATE TABLE IF NOT EXISTS project_leads (
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

-- 2. Create Secondary Leads Table (Buyers & Sellers CRM Spreadsheet)
CREATE TABLE IF NOT EXISTS secondary_leads (
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

-- 3. Enable Row Level Security (RLS) with open CRUD policies for web app
ALTER TABLE project_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE secondary_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access on project_leads" ON project_leads;
CREATE POLICY "Public access on project_leads" ON project_leads
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public access on secondary_leads" ON secondary_leads;
CREATE POLICY "Public access on secondary_leads" ON secondary_leads
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Enable Realtime subscriptions so all connected devices update live
ALTER PUBLICATION supabase_realtime ADD TABLE project_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE secondary_leads;
