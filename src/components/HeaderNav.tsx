import React, { useState } from 'react';
import { 
  Building2, 
  Layers, 
  Users, 
  Plus, 
  Download, 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  Clock, 
  PhoneCall, 
  Calendar,
  Sparkles,
  ChevronDown,
  ClipboardPaste,
  FileSpreadsheet,
  LogOut,
  Lock
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { ActiveTab } from '../types';
import { ExcelPasteDrawer } from './ExcelPasteDrawer';
import { GoogleAuthButton } from './GoogleAuthButton';
import { AddTableModal } from './AddTableModal';
import { getStoredAccessToken, getStoredGoogleUser } from '../services/googleAuth';

interface HeaderNavProps {
  onLogout?: () => void;
  currentUser?: string;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({ onLogout, currentUser = 'zuber0902' }) => {
  const { 
    activeTab, 
    setActiveTab, 
    actionItems, 
    overdueCount, 
    dueTodayCount, 
    projectLeads, 
    customTables,
    addCustomTable,
    bulkAddCustomTableRows,
    bulkAddProjectLeads,
    exportToCsv,
    searchQuery,
    setSearchQuery
  } = useCrm();

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isBulkPasteOpen, setIsBulkPasteOpen] = useState(false);
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(() => {
    return !!getStoredAccessToken() && !!getStoredGoogleUser();
  });

  React.useEffect(() => {
    const handleAuthChange = (e: any) => {
      setIsGoogleConnected(!!e.detail?.loggedIn && !!e.detail?.user);
    };

    window.addEventListener('crm-google-auth-changed', handleAuthChange);
    return () => window.removeEventListener('crm-google-auth-changed', handleAuthChange);
  }, []);

  // Today's formatted date
  const todayFormatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  // Title for current view
  const getTabTitle = () => {
    if (activeTab === 'dashboard') {
      return "Today's Action Feed";
    }
    const found = customTables.find((t) => t.id === activeTab);
    return found ? `${found.name} (Spreadsheet)` : 'Custom Spreadsheet';
  };

  return (
    <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 z-20 shrink-0">
      
      {/* View Title & Date */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <h2 className="text-lg sm:text-2xl font-bold text-[#0B1B32] tracking-tight font-display">
            {getTabTitle()}
          </h2>
          {activeTab !== 'dashboard' && (
            <span className="hidden sm:inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              Zero-Modal Excel Mode
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-slate-500">{todayFormatted}</p>
      </div>

      {/* Right Controls: Daily Goal, Search, Export, Reset & Direct Add */}
      <div className="flex items-center gap-2 sm:gap-4">
        
        {/* Global Search */}
        <div className="hidden lg:flex items-center relative w-48 xl:w-56">
          <Search className="w-4 h-4 absolute left-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search all rows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#F8FAFC] border border-slate-200 rounded-md pl-9 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#D4AF37] focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Google OAuth 2.0 Sign-In / Calendar Sync Status */}
        <GoogleAuthButton />

        {/* Bulk Import from Excel Button */}
        <button
          onClick={() => {
            if (customTables.length === 0) {
              window.dispatchEvent(
                new CustomEvent('crm-show-toast', {
                  detail: { msg: 'Please create a table first using "+ Add Table" before importing data.', isError: true }
                })
              );
              setIsAddTableOpen(true);
              return;
            }
            setIsBulkPasteOpen(true);
          }}
          className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          title="Import leads from Excel spreadsheet (.xlsx, .xls, .csv)"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-[#0B1B32]" />
          <span>Bulk Import from Excel</span>
        </button>

        {/* Export Menu */}
        <div className="relative">
          <button
            id="export-menu-btn"
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
          
          {showExportMenu && (
            <div 
              className="absolute right-0 mt-2 w-52 rounded-lg bg-white border border-slate-200 shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              onMouseLeave={() => setShowExportMenu(false)}
            >
              <button
                onClick={() => {
                  exportToCsv('actions');
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                Export Today's Actions CSV
              </button>
            </div>
          )}
        </div>

        {/* "+ Add Table" Button */}
        <div className="relative group">
          <button
            id="global-add-table-btn"
            disabled={!isGoogleConnected}
            onClick={() => {
              if (!isGoogleConnected) {
                window.dispatchEvent(
                  new CustomEvent('crm-show-toast', {
                    detail: { msg: '🔒 Please Sign In with Google first to enable creating custom tables.', isError: true }
                  })
                );
                return;
              }
              setIsAddTableOpen(true);
            }}
            className={`px-3 sm:px-4 py-2 rounded-md font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all border ${
              isGoogleConnected
                ? 'bg-[#0B1B32] text-white hover:bg-[#152945] cursor-pointer border-[#D4AF37]/40 shadow-xs'
                : 'bg-slate-100 text-slate-400 border-slate-300 cursor-not-allowed opacity-75'
            }`}
            title={isGoogleConnected ? "Create a new custom table with defined columns" : "Sign in with Google to enable creating custom tables"}
          >
            {isGoogleConnected ? (
              <Plus className="w-4 h-4 stroke-[3] text-[#D4AF37]" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>+ Add Table</span>
          </button>
          {!isGoogleConnected && (
            <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block bg-slate-900 text-white text-[11px] px-2.5 py-1 rounded shadow-lg whitespace-nowrap z-50 pointer-events-none">
              🔒 Sign in with Google to enable table creation
            </div>
          )}
        </div>

        {/* User Profile & Logout */}
        {onLogout && (
          <div className="flex items-center gap-2 pl-1 sm:pl-2 border-l border-slate-200">
            <div className="hidden xl:flex flex-col text-right">
              <span className="text-[11px] font-bold text-[#0B1B32] leading-tight">{currentUser}</span>
              <span className="text-[9px] font-semibold text-emerald-600 leading-tight">Admin</span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-2 rounded-md bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 text-xs font-semibold transition-colors cursor-pointer"
              title={`Sign Out (${currentUser})`}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        )}

      </div>

      {/* Global Bulk Paste Drawer */}
      <ExcelPasteDrawer
        isOpen={isBulkPasteOpen}
        onClose={() => setIsBulkPasteOpen(false)}
        targetTable={customTables.find((t) => t.id === activeTab) || customTables[0]}
        onImportCustomRows={bulkAddCustomTableRows}
      />

      {/* Create Table Modal */}
      <AddTableModal
        isOpen={isAddTableOpen}
        onClose={() => setIsAddTableOpen(false)}
        onCreateTable={addCustomTable}
      />

    </header>
  );
};
