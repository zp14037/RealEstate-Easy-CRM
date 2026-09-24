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
  FileSpreadsheet
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { ActiveTab } from '../types';
import { ExcelPasteDrawer } from './ExcelPasteDrawer';
import { GoogleAuthButton } from './GoogleAuthButton';
import { AddTableModal } from './AddTableModal';

export const HeaderNav: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    actionItems, 
    overdueCount, 
    dueTodayCount, 
    projectLeads, 
    customTables,
    addCustomTable,
    bulkAddProjectLeads,
    exportToCsv,
    searchQuery,
    setSearchQuery
  } = useCrm();

  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isBulkPasteOpen, setIsBulkPasteOpen] = useState(false);
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);

  // Today's formatted date
  const todayFormatted = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  // Title for current view
  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return "Today's Action Feed";
      case 'project_leads':
        return 'Project & Off-Plan Leads (Spreadsheet)';
      default: {
        const found = customTables.find((t) => t.id === activeTab);
        return found ? `${found.name} (Spreadsheet)` : 'Custom Spreadsheet';
      }
    }
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
          onClick={() => setIsBulkPasteOpen(true)}
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
              <button
                onClick={() => {
                  exportToCsv('project');
                  setShowExportMenu(false);
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Export Project Leads CSV
              </button>
            </div>
          )}
        </div>

        {/* "+ Add Table" Button */}
        <button
          id="global-add-table-btn"
          onClick={() => setIsAddTableOpen(true)}
          className="bg-[#0B1B32] text-white px-3 sm:px-4 py-2 rounded-md font-bold text-xs sm:text-sm flex items-center gap-1.5 hover:bg-[#152945] transition-colors shadow-xs cursor-pointer border border-[#D4AF37]/40"
          title="Create a new custom table with defined columns"
        >
          <Plus className="w-4 h-4 stroke-[3] text-[#D4AF37]" />
          <span>+ Add Table</span>
        </button>

      </div>

      {/* Global Bulk Paste Drawer */}
      <ExcelPasteDrawer
        isOpen={isBulkPasteOpen}
        onClose={() => setIsBulkPasteOpen(false)}
        targetSheet="project"
        onImportProjects={bulkAddProjectLeads}
        onImportSecondary={() => {}}
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
