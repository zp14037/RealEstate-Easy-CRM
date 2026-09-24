import React, { useState } from 'react';
import { CrmProvider, useCrm } from './context/CrmContext';
import { HeaderNav } from './components/HeaderNav';
import { DashboardView } from './components/DashboardView';
import { ProjectLeadsView } from './components/ProjectLeadsView';
import { CustomTableView } from './components/CustomTableView';
import { 
  Building2, 
  Users, 
  Menu, 
  X, 
  FileSpreadsheet, 
  Clock, 
  Sparkles, 
  Zap, 
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Table as TableIcon,
  Plus,
  Trash2,
  LogOut
} from 'lucide-react';
import { getDateOffset, getTodayDateString } from './data/mockData';
import { LoginPage } from './components/LoginPage';

interface CrmMainLayoutProps {
  onLogout: () => void;
  currentUser: string;
}

const CrmMainLayout: React.FC<CrmMainLayoutProps> = ({ onLogout, currentUser }) => {
  const { 
    activeTab, 
    setActiveTab, 
    overdueCount, 
    dueTodayCount,
    projectLeads,
    customTables,
    customRows,
    deleteCustomTable,
    addBlankProjectLead,
    updateProjectLead,
  } = useCrm();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; msg: string; isError?: boolean }>({ show: false, msg: '' });

  React.useEffect(() => {
    const handleToast = (e: any) => {
      setToast({ show: true, msg: e.detail?.msg || '', isError: !!e.detail?.isError });
      setTimeout(() => {
        setToast((prev) => ({ ...prev, show: false }));
      }, 4000);
    };

    window.addEventListener('crm-show-toast', handleToast);

    return () => {
      window.removeEventListener('crm-show-toast', handleToast);
    };
  }, []);

  // Helper for CEO test demo (instant row insert, zero popups)
  const handleQuickAdd4MonthLead = () => {
    const newId = addBlankProjectLead('top');
    updateProjectLead(newId, {
      projectName: 'Palm Beach Penthouse Collection',
      developer: 'Nakheel',
      community: 'Palm Jumeirah',
      unitDetails: '4BR Super Luxury Penthouse, 4,100 sq.ft',
      propertyType: 'Penthouse',
      handoverDetails: 'Q1 2028',
      ownerName: 'CEO Demo VIP Client',
      contactNo: '+971 50 999 8888',
      callStatus: 'Follow-up',
      followUpDate: getDateOffset(0, 4), // 4 MONTHS
      budgetAED: 18000000,
      notes: 'Demo test: Client requested call back in exactly 4 months after capital reallocation.',
    });
    setActiveTab('project_leads');
  };

  const handleQuickAddTodayLead = () => {
    const newId = addBlankProjectLead('top');
    updateProjectLead(newId, {
      projectName: 'Creek Harbour Horizon',
      developer: 'Emaar Properties',
      community: 'Dubai Creek Harbour',
      unitDetails: '3BR Waterfront, 1,850 sq.ft',
      propertyType: 'Apartment',
      handoverDetails: 'Q4 2026',
      ownerName: 'Hamdan Al-Maktoum Inquirer',
      contactNo: '+971 50 555 4321',
      callStatus: 'Follow-up',
      followUpDate: getTodayDateString(), // DUE TODAY
      budgetAED: 4500000,
      notes: 'Demo test: Hot buyer waiting for updated floor plan & booking token link today.',
    });
    setActiveTab('dashboard');
  };

  const totalUrgent = overdueCount + dueTodayCount;

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation: Geometric Balance Theme (#0B1B32 & #D4AF37) */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0B1B32] text-white flex flex-col border-r border-[#C5A059] transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div className="cursor-pointer" onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}>
            <h1 className="text-xl font-bold tracking-tight text-[#D4AF37] font-display">XPOTENTIAL</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">Real Estate Dubai · CRM</p>
          </div>
          <button 
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 py-6 overflow-y-auto">
          <div className="px-3 mb-2">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-4 mb-3">Main Menu</p>
            
            {/* Menu Item 1: Today's Action (Automated Brain) */}
            <button
              id="nav-tab-dashboard"
              onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-[#D4AF37]/15 border-l-4 border-[#D4AF37] text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Zap className={`w-4 h-4 ${activeTab === 'dashboard' ? 'text-[#D4AF37]' : 'text-slate-500'}`} />
                <span className="text-sm">Today's Action</span>
              </div>
              {totalUrgent > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  overdueCount > 0 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-[#D4AF37] text-[#0B1B32]'
                }`}>
                  {totalUrgent}
                </span>
              )}
            </button>

            {/* Menu Item 2: Project & Off-Plan Leads (Spreadsheet) */}
            <button
              id="nav-tab-projects"
              onClick={() => { setActiveTab('project_leads'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 transition-colors text-left cursor-pointer ${
                activeTab === 'project_leads'
                  ? 'bg-[#D4AF37]/15 border-l-4 border-[#D4AF37] text-white font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileSpreadsheet className={`w-4 h-4 ${activeTab === 'project_leads' ? 'text-blue-400' : 'text-slate-500'}`} />
                <span className="text-sm">Project Leads (11 Col)</span>
              </div>
              <span className="text-xs text-slate-400 bg-white/10 px-2 py-0.5 rounded font-mono">
                {projectLeads.length}
              </span>
            </button>

            {/* Custom Dynamic Tables Section */}
            {customTables.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/10">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-4 mb-2">
                  Custom Tables
                </p>
                {customTables.map((table) => {
                  const isActive = activeTab === table.id;
                  const rowCount = customRows.filter((r) => r.tableId === table.id).length;

                  return (
                    <div key={table.id} className="group relative flex items-center">
                      <button
                        onClick={() => { setActiveTab(table.id); setMobileMenuOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 transition-colors text-left cursor-pointer pr-8 ${
                          isActive
                            ? 'bg-[#D4AF37]/15 border-l-4 border-[#D4AF37] text-white font-bold'
                            : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <TableIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#D4AF37]' : 'text-slate-500'}`} />
                          <span className="text-sm truncate">{table.name}</span>
                        </div>
                        <span className="text-xs text-slate-400 bg-white/10 px-2 py-0.5 rounded font-mono shrink-0">
                          {rowCount}
                        </span>
                      </button>

                      {/* Quick Delete Table Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete table "${table.name}"?`)) {
                            deleteCustomTable(table.id);
                          }
                        }}
                        className="absolute right-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity cursor-pointer"
                        title="Delete table"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Metrics in Sidebar */}
          <div className="mx-4 mt-6 p-4 rounded bg-[#071324] border border-white/5 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Due Today</span>
              <span className="font-bold text-[#D4AF37]">{dueTodayCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Overdue</span>
              <span className={`font-bold ${overdueCount > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                {overdueCount}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Records</span>
              <span className="font-bold text-white">{projectLeads.length + customRows.length}</span>
            </div>
          </div>
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-white/10 bg-[#071324] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded bg-[#D4AF37] flex items-center justify-center text-[#0B1B32] font-bold text-xs shrink-0">
              ZO
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{currentUser}</p>
              <p className="text-[10px] text-emerald-400 font-semibold truncate">Active Session</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Log Out"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Mobile Header Toggle */}
        <div className="lg:hidden bg-[#0B1B32] text-white px-4 py-3 flex items-center justify-between border-b border-[#C5A059]">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-1 rounded text-slate-300 hover:text-white cursor-pointer"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="text-lg font-bold tracking-tight text-[#D4AF37] font-display">XPOTENTIAL</span>
          </div>
          <button
            onClick={onLogout}
            className="text-xs text-slate-300 hover:text-white flex items-center gap-1 bg-white/10 px-2 py-1 rounded"
          >
            <LogOut className="w-3 h-3" />
            <span>Logout</span>
          </button>
        </div>

        {/* Top Header Bar */}
        <HeaderNav onLogout={onLogout} currentUser={currentUser} />

        {/* Workspace Views */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'project_leads' && <ProjectLeadsView />}
            {customTables.find((t) => t.id === activeTab) && (
              <CustomTableView table={customTables.find((t) => t.id === activeTab)!} />
            )}
          </div>
        </main>

        {/* CEO / Stakeholder Demo Quick Bar */}
        <footer className="bg-white border-t border-slate-200 py-2.5 px-4 sm:px-6 shrink-0">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 text-xs text-slate-500">
            
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-700">Xpotential Real Estate CRM</span>
              <span className="hidden sm:inline">· Zero Modals · Excel Spreadsheet Mode · LocalStorage Synced</span>
            </div>

            {/* Quick Demo Helper Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">CEO Test Shortcuts:</span>
              
              <button
                onClick={handleQuickAddTodayLead}
                className="px-2.5 py-1 rounded bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#0B1B32] border border-[#D4AF37]/40 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                <span>+ Insert "Due Today" Lead</span>
              </button>

              <button
                onClick={handleQuickAdd4MonthLead}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Clock className="w-3 h-3 text-blue-600" />
                <span>+ Insert "4 Months" Lead</span>
              </button>
            </div>

          </div>
        </footer>

      </div>

      {/* Floating Direct Sync Notification Toast */}
      {toast.show && (
        <div 
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-200 border ${
            toast.isError
              ? 'bg-red-50 text-red-800 border-red-200'
              : 'bg-[#0B1B32] text-white border-amber-400/40 shadow-2xl'
          }`}
        >
          {toast.isError ? (
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('crm_auth_user') || sessionStorage.getItem('crm_auth_user');
  });

  const handleLoginSuccess = (user: string) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('crm_auth_user');
    sessionStorage.removeItem('crm_auth_user');
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <CrmProvider>
      <CrmMainLayout onLogout={handleLogout} currentUser={currentUser} />
    </CrmProvider>
  );
}
