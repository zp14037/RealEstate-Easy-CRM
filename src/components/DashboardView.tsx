import React, { useState } from 'react';
import { 
  PhoneCall, 
  MessageSquare, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Users, 
  Check, 
  Sparkles, 
  ExternalLink, 
  CheckCheck, 
  ChevronRight,
  ArrowRight,
  Send,
  HelpCircle,
  FileSpreadsheet,
  CalendarPlus
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { ActionItem } from '../types';
import { 
  getWhatsAppLink, 
  cleanPhoneNumber, 
  getDateOffset, 
  getTodayDateString,
  formatAED 
} from '../data/mockData';
import { saveDirectlyToGoogleCalendar } from '../utils/calendar';

export const DashboardView: React.FC = () => {
  const { 
    actionItems, 
    overdueCount, 
    dueTodayCount, 
    totalActiveCount, 
    projectLeads, 
    secondaryLeads, 
    setActiveTab, 
    quickReschedulePreset, 
    markDone, 
    markClosedDeal, 
    markNotInterested,
    searchQuery,
    updateProjectLead,
    updateSecondaryLead
  } = useCrm();

  const [activeFilter, setActiveFilter] = useState<'all' | 'overdue' | 'today' | 'projects' | 'secondary'>('all');
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);
  const [savingCalId, setSavingCalId] = useState<string | null>(null);
  
  // Inline Note expansion state (no modal needed!)
  const [activeNoteItemId, setActiveNoteItemId] = useState<string | null>(null);
  const [noteInputText, setNoteInputText] = useState('');

  const handleUpdateTime = (item: ActionItem, newTime: string) => {
    if (item.sourceType === 'project') {
      updateProjectLead(item.leadId, { followUpTime: newTime });
    } else {
      updateSecondaryLead(item.leadId, { followUpTime: newTime });
    }
  };

  const handleCalendarSync = async (item: ActionItem) => {
    setSavingCalId(item.id);
    const result = await saveDirectlyToGoogleCalendar({
      ownerName: item.clientName,
      projectName: item.propertyName,
      contactNo: item.contactNo,
      followUpDate: item.followUpDate,
      followUpTime: item.followUpTime || '10:00',
      notes: item.notes,
      community: item.subtitle,
    }, item.sourceType);
    setSavingCalId(null);

    window.dispatchEvent(new CustomEvent('crm-show-toast', { 
      detail: { msg: result.message, isError: !result.success } 
    }));
  };

  // Filter items based on activeFilter and global searchQuery
  const filteredItems = actionItems.filter((item) => {
    // Tab filter
    if (activeFilter === 'overdue' && !item.isOverdue) return false;
    if (activeFilter === 'today' && !item.isToday) return false;
    if (activeFilter === 'projects' && item.sourceType !== 'project') return false;
    if (activeFilter === 'secondary' && item.sourceType !== 'secondary') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.clientName.toLowerCase().includes(q);
      const matchProperty = item.propertyName.toLowerCase().includes(q);
      const matchPhone = item.contactNo.toLowerCase().includes(q);
      const matchSubtitle = item.subtitle.toLowerCase().includes(q);
      const matchNotes = (item.notes || '').toLowerCase().includes(q);
      return matchName || matchProperty || matchPhone || matchSubtitle || matchNotes;
    }

    return true;
  });

  const handleSnooze = (item: ActionItem, days: number, months: number, label: string) => {
    setJustCompletedId(item.id);
    setTimeout(() => {
      quickReschedulePreset(item.sourceType, item.leadId, days, months, `Snoozed ${label}`);
      setJustCompletedId(null);
    }, 250);
  };

  const handle1ClickDone = (item: ActionItem) => {
    setJustCompletedId(item.id);
    setTimeout(() => {
      markDone(item.sourceType, item.leadId, noteInputText.trim() ? noteInputText.trim() : undefined);
      setJustCompletedId(null);
      setActiveNoteItemId(null);
      setNoteInputText('');
    }, 250);
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Pipeline summary
  const totalPipelineValue = [
    ...projectLeads.map((l) => l.budgetAED || 0),
    ...secondaryLeads.map((l) => l.budget || 0),
  ].reduce((a, b) => a + b, 0);

  const formattedPipeline = totalPipelineValue > 0 
    ? `AED ${(totalPipelineValue / 1000000).toFixed(1)}M` 
    : 'AED 18.2M';

  return (
    <div className="space-y-6 font-sans">
      
      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Overdue Follow-ups */}
        <div className={`bg-white border border-slate-200 p-4 sm:p-5 shadow-xs rounded-sm ${overdueCount > 0 ? 'border-l-4 border-l-red-500' : ''}`}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Overdue Follow-ups
          </p>
          <p className={`text-3xl font-black font-display ${overdueCount > 0 ? 'text-red-500' : 'text-slate-400'}`}>
            {overdueCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Immediate action required</p>
        </div>

        {/* Due Today */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5 shadow-xs rounded-sm border-l-4 border-l-[#D4AF37]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Due Today
          </p>
          <p className="text-3xl font-black text-[#0B1B32] font-display">
            {dueTodayCount}
          </p>
          <p className="text-[10px] text-[#D4AF37] font-semibold mt-1">Scheduled for today</p>
        </div>

        {/* Total Active Enquiries */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5 shadow-xs rounded-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Total Inquiries
          </p>
          <p className="text-3xl font-black text-blue-600 font-display">
            {totalActiveCount}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">{projectLeads.length} Projects · {secondaryLeads.length} Secondary</p>
        </div>

        {/* Pipeline Value */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5 shadow-xs rounded-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Active Pipeline
          </p>
          <p className="text-3xl font-black text-[#0B1B32] font-display truncate" title={formattedPipeline}>
            {formattedPipeline}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">Estimated client buying volume</p>
        </div>

      </div>

      {/* Action Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center flex-1">
          <h3 className="text-sm font-bold uppercase tracking-widest text-[#0B1B32] whitespace-nowrap">
            Today's Action Feed (Automated Brain)
          </h3>
          <div className="h-px flex-1 bg-slate-200 mx-4 hidden sm:block"></div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
              activeFilter === 'all'
                ? 'bg-[#0B1B32] text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Due ({actionItems.length})
          </button>

          {overdueCount > 0 && (
            <button
              onClick={() => setActiveFilter('overdue')}
              className={`px-3 py-1 text-xs font-semibold rounded transition-all cursor-pointer flex items-center gap-1 ${
                activeFilter === 'overdue'
                  ? 'bg-red-500 text-white shadow-xs'
                  : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Overdue ({overdueCount})</span>
            </button>
          )}

          <button
            onClick={() => setActiveFilter('today')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
              activeFilter === 'today'
                ? 'bg-[#D4AF37] text-[#0B1B32] font-bold shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Due Today ({dueTodayCount})
          </button>

          <button
            onClick={() => setActiveFilter('projects')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
              activeFilter === 'projects'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Projects
          </button>

          <button
            onClick={() => setActiveFilter('secondary')}
            className={`px-3 py-1 text-xs font-semibold rounded transition-all cursor-pointer ${
              activeFilter === 'secondary'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            Secondary
          </button>
        </div>
      </div>

      {/* Action Items List (Zero Popups) */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center shadow-xs rounded space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
            <CheckCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xl font-bold text-[#0B1B32] font-display">Zero Overdue or Pending Actions!</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {searchQuery 
                ? 'No follow-up matches your search query.'
                : 'All scheduled client touchpoints are up to date. Open any spreadsheet to manage your leads or add new rows directly.'}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setActiveTab('project_leads')}
              className="px-4 py-2 rounded bg-[#0B1B32] text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Open Project Spreadsheet ({projectLeads.length} rows)</span>
            </button>
            <button
              onClick={() => setActiveTab('secondary_leads')}
              className="px-4 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all border border-slate-200 cursor-pointer"
            >
              <span>Open Buyers / Sellers Spreadsheet ({secondaryLeads.length} rows)</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const isCompletedAnim = justCompletedId === item.id;
            const isNoteOpen = activeNoteItemId === item.id;
            const waLink = getWhatsAppLink(item.contactNo, item.clientName, item.propertyName);
            const telLink = `tel:${cleanPhoneNumber(item.contactNo)}`;
            const initials = getInitials(item.clientName);

            return (
              <div
                key={item.id}
                className={`bg-white border border-slate-200 p-4 sm:p-5 transition-all duration-200 shadow-xs rounded-sm ${
                  item.isOverdue
                    ? 'border-l-8 border-l-red-500 shadow-sm'
                    : 'border-l-8 border-l-[#D4AF37]'
                } ${isCompletedAnim ? 'opacity-20 scale-98' : ''}`}
              >
                {/* Main Card Header / Info */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Client / Property Details */}
                  <div className="flex gap-4 items-start sm:items-center">
                    <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center font-bold text-[#0B1B32] shrink-0 text-sm border border-slate-200">
                      {initials}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-[#0B1B32] text-base font-display">
                          {item.clientName}
                        </h4>
                        
                        <span className="px-2 py-0.5 bg-slate-100 text-[10px] rounded text-slate-600 uppercase font-semibold border border-slate-200">
                          {item.sourceType === 'project' ? 'Project Lead' : 'Secondary Market'}
                        </span>

                        {item.budgetFormatted && (
                          <span className="px-2 py-0.5 bg-amber-50 text-[10px] rounded text-amber-800 font-bold border border-amber-200">
                            {item.budgetFormatted}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600">
                        Interested in: <strong className="text-slate-900">{item.propertyName}</strong>
                        <span className="text-slate-400"> ({item.subtitle})</span>
                      </p>

                      {item.isOverdue ? (
                        <p className="text-[11px] text-red-500 font-bold uppercase flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Overdue: Was scheduled for {item.followUpDate} ({Math.abs(item.daysDifference)} days ago)</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#D4AF37] font-bold uppercase flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Due Today: Action Required</span>
                        </p>
                      )}

                      <p className="text-xs text-slate-500 line-clamp-2 max-w-xl">
                        {item.details}
                      </p>
                    </div>
                  </div>

                  {/* Direct Contact & 1-Click Action Buttons */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    
                    {/* Direct Contact Triggers */}
                    <div className="flex items-center gap-2">
                      <a
                        href={telLink}
                        title={`Call ${item.contactNo}`}
                        className="p-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">{item.contactNo}</span>
                      </a>

                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        title="Open WhatsApp Chat"
                        className="p-2 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="hidden sm:inline">WhatsApp</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>

                      {/* Time selector for Calendar */}
                      <div 
                        className="flex items-center gap-1 bg-amber-50/80 border border-amber-300 rounded px-2 py-1 text-xs" 
                        title="Set follow-up time for Google Calendar"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <input
                          type="time"
                          value={item.followUpTime || '10:00'}
                          onChange={(e) => handleUpdateTime(item, e.target.value)}
                          className="bg-transparent font-mono font-bold text-amber-950 focus:outline-none w-[68px] cursor-pointer"
                        />
                      </div>

                      {/* Google Calendar Direct Background Save Button */}
                      <button
                        type="button"
                        onClick={() => handleCalendarSync(item)}
                        disabled={savingCalId === item.id}
                        title={`Save reminder directly to Google Calendar at ${item.followUpTime || '10:00'}`}
                        className="p-2 rounded bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <CalendarPlus className={`w-3.5 h-3.5 text-amber-700 ${savingCalId === item.id ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">
                          {savingCalId === item.id ? 'Saving...' : 'Sync Calendar'}
                        </span>
                      </button>
                    </div>

                    {/* The 1-Click "Mark Done" Trigger */}
                    <button
                      onClick={() => handle1ClickDone(item)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-bold rounded shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Mark call completed (schedules standard +3d next step)"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Mark Done</span>
                    </button>

                    {/* Toggle quick inline note */}
                    <button
                      onClick={() => {
                        setActiveNoteItemId(isNoteOpen ? null : item.id);
                        setNoteInputText('');
                      }}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 cursor-pointer"
                    >
                      {isNoteOpen ? 'Cancel Note' : '+ Note'}
                    </button>

                  </div>

                </div>

                {/* Inline Quick Note Field (when clicked "+ Note", zero modal) */}
                {isNoteOpen && (
                  <div className="mt-3 p-3 bg-amber-50/60 border border-amber-200 rounded-md flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Type quick call outcome or remarks..."
                      value={noteInputText}
                      onChange={(e) => setNoteInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handle1ClickDone(item);
                      }}
                      className="flex-1 bg-white border border-amber-300 rounded px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                      autoFocus
                    />
                    <button
                      onClick={() => handle1ClickDone(item)}
                      className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 cursor-pointer flex items-center gap-1"
                    >
                      <span>Save & Complete</span>
                      <Send className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Direct Snooze Action Row (PRD Requirement 3: Snooze 1 Day, Snooze 1 Week, Snooze 4 Months) */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mr-1">
                      Quick Snooze:
                    </span>

                    <button
                      onClick={() => handleSnooze(item, 1, 0, '1 Day')}
                      className="border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer"
                    >
                      Snooze 1 Day
                    </button>

                    <button
                      onClick={() => handleSnooze(item, 7, 0, '1 Week')}
                      className="border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 text-[11px] font-semibold rounded transition-colors cursor-pointer"
                    >
                      Snooze 1 Week
                    </button>

                    <button
                      onClick={() => handleSnooze(item, 0, 4, '4 Months')}
                      title="Push follow-up to exactly 4 months from today"
                      className="border border-[#D4AF37]/50 bg-[#D4AF37]/15 text-[#0B1B32] hover:bg-[#D4AF37]/25 px-2.5 py-1 text-[11px] font-bold rounded transition-colors cursor-pointer"
                    >
                      Snooze 4 Months ⏳
                    </button>

                    {/* Outcome shortcuts */}
                    <button
                      onClick={() => markClosedDeal(item.sourceType, item.leadId)}
                      className="text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1 text-[11px] font-bold rounded transition-colors cursor-pointer ml-1"
                    >
                      🎉 Deal Closed
                    </button>

                    <button
                      onClick={() => markNotInterested(item.sourceType, item.leadId)}
                      className="text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] rounded transition-colors cursor-pointer"
                    >
                      Not Interested
                    </button>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    Current Scheduled: <strong className="text-slate-700">{item.followUpDate}</strong> at <strong className="text-amber-800">{item.followUpTime || '10:00'}</strong>
                  </span>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
