import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  Check, 
  Copy, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { 
  getSupabaseUrl, 
  getSupabaseAnonKey, 
  setSupabaseConfig, 
  isSupabaseConfigured,
  getSupabaseClient 
} from '../lib/supabaseClient';

interface SupabaseConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConnectModal: React.FC<SupabaseConnectModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUrl(getSupabaseUrl());
      setAnonKey(getSupabaseAnonKey());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestAndSave = async () => {
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({ ok: false, msg: 'Please provide both the Supabase URL and Anon Key.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      setSupabaseConfig(url.trim(), anonKey.trim());
      const client = getSupabaseClient();
      if (!client) throw new Error('Failed to initialize Supabase client.');

      // Test query
      const { data, error } = await client.from('project_leads').select('id').limit(1);
      if (error) {
        if (error.code === '42P01') {
          throw new Error('Connected to Supabase, but tables are not created yet! Please run the SQL schema in your Supabase SQL Editor.');
        }
        throw error;
      }

      setTestResult({ ok: true, msg: '✅ Successfully connected to Supabase PostgreSQL database!' });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setTestResult({ ok: false, msg: err.message || 'Connection failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleCopySql = () => {
    const sql = `-- Supabase Schema for Xpotential Real Estate CRM
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

ALTER TABLE project_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE secondary_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access on project_leads" ON project_leads FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public access on secondary_leads" ON secondary_leads FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE project_leads;
ALTER PUBLICATION supabase_realtime ADD TABLE secondary_leads;`;

    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const isConfigured = isSupabaseConfigured();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-[#0B1B32] to-[#1E3A8A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-display">Supabase Cloud Database</h3>
              <p className="text-xs text-slate-300">Live PostgreSQL storage with real-time sync</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600">
          
          {isConfigured ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">Connected to Supabase PostgreSQL</span>
              </div>
              <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">Live DB</span>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Connect Your Supabase Project</p>
                <p className="text-[11px] text-amber-800/90 mt-0.5">
                  All leads, follow-ups, and notes will be saved in real PostgreSQL tables instead of sample mock data.
                </p>
              </div>
            </div>
          )}

          {/* Quick Setup Guide */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">1. Run SQL Schema in Supabase:</span>
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-semibold cursor-pointer shadow-2xs"
              >
                {copiedSql ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSql ? 'Copied!' : 'Copy SQL Script'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-blue-600 underline">supabase.com/dashboard</a> → open your project → click <strong>SQL Editor</strong> → paste the SQL and click <strong>Run</strong>.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Supabase Project URL:
              </label>
              <input
                type="url"
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Supabase Anon Public API Key:
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              />
            </div>
          </div>

          {testResult && (
            <div className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 border ${
              testResult.ok 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-red-50 text-red-800 border-red-200'
            }`}>
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{testResult.msg}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleTestAndSave}
            disabled={testing || !url.trim() || !anonKey.trim()}
            className="px-4 py-1.5 rounded-lg bg-[#0B1B32] hover:bg-[#1E3A8A] text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {testing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
            ) : (
              <Check className="w-3.5 h-3.5 text-[#D4AF37]" />
            )}
            <span>{testing ? 'Connecting...' : 'Connect & Save'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
