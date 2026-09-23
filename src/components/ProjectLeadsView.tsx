import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Phone, 
  MessageSquare, 
  Trash2, 
  Copy, 
  Download, 
  ClipboardPaste, 
  Sparkles, 
  Check, 
  Clock, 
  ArrowUpDown,
  FileSpreadsheet,
  CalendarPlus
} from 'lucide-react';
import { useCrm } from '../context/CrmContext';
import { ProjectLead, CallStatus, PropertyType } from '../types';
import { EditableCell } from './EditableCell';
import { ExcelPasteDrawer } from './ExcelPasteDrawer';
import { saveDirectlyToGoogleCalendar } from '../utils/calendar';
import { 
  DUBAI_DEVELOPERS, 
  DUBAI_COMMUNITIES, 
  CALL_STATUS_OPTIONS, 
  getWhatsAppLink, 
  cleanPhoneNumber, 
  getDaysDiffFromToday, 
  getDateOffset, 
  getTodayDateString 
} from '../data/mockData';

const PROPERTY_TYPES: { label: string; value: PropertyType }[] = [
  { label: 'Apartment', value: 'Apartment' },
  { label: 'Townhouse', value: 'Townhouse' },
  { label: 'Villa', value: 'Villa' },
  { label: 'Penthouse', value: 'Penthouse' },
  { label: 'Duplex', value: 'Duplex' },
];

const DEVELOPER_OPTIONS = DUBAI_DEVELOPERS.map((d) => ({ label: d, value: d }));

export const ProjectLeadsView: React.FC = () => {
  const { 
    projectLeads, 
    updateProjectLead, 
    addBlankProjectLead, 
    bulkAddProjectLeads, 
    deleteProjectLead, 
    duplicateProjectLead, 
    exportToCsv,
    searchQuery,
    setSearchQuery 
  } = useCrm();

  const [developerFilter, setDeveloperFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [communityFilter, setCommunityFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'DUE_TODAY' | 'OVERDUE' | 'UPCOMING'>('ALL');
  const [sortField, setSortField] = useState<keyof ProjectLead | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isBulkPasteOpen, setIsBulkPasteOpen] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [savingCalId, setSavingCalId] = useState<string | null>(null);

  const handleCalendarSync = async (lead: ProjectLead) => {
    setSavingCalId(lead.id);
    const result = await saveDirectlyToGoogleCalendar(lead, 'project');
    setSavingCalId(null);

    window.dispatchEvent(new CustomEvent('crm-show-toast', { 
      detail: { msg: result.message, isError: !result.success } 
    }));
  };

  // Quick Preset Helper for Follow-up Date column
  const handleQuickPresetDate = (id: string, days: number, months: number) => {
    const nextDate = getDateOffset(days, months);
    updateProjectLead(id, { followUpDate: nextDate });
  };

  const handleAddRow = (position: 'top' | 'bottom' = 'top') => {
    const newId = addBlankProjectLead(position);
    setSelectedRowId(newId);
  };

  const toggleSort = (field: keyof ProjectLead) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filtered and sorted dataset
  const filteredLeads = projectLeads
    .filter((lead) => {
      // Global search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          lead.projectName.toLowerCase().includes(q) ||
          lead.developer.toLowerCase().includes(q) ||
          lead.community.toLowerCase().includes(q) ||
          lead.ownerName.toLowerCase().includes(q) ||
          lead.contactNo.toLowerCase().includes(q) ||
          lead.unitDetails.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Developer filter
      if (developerFilter !== 'ALL' && lead.developer !== developerFilter) return false;

      // Status filter
      if (statusFilter !== 'ALL' && lead.callStatus !== statusFilter) return false;

      // Community filter
      if (communityFilter !== 'ALL' && lead.community !== communityFilter) return false;

      // Urgency filter
      if (dateFilter !== 'ALL') {
        if (!lead.followUpDate) return false;
        const diff = getDaysDiffFromToday(lead.followUpDate);
        if (dateFilter === 'DUE_TODAY' && diff !== 0) return false;
        if (dateFilter === 'OVERDUE' && diff >= 0) return false;
        if (dateFilter === 'UPCOMING' && (diff <= 0 || diff > 7)) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      const valA = a[sortField] ?? '';
      const valB = b[sortField] ?? '';
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-3 font-sans">
      
      {/* Spreadsheet Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-sm p-3 shadow-xs space-y-3">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#0B1B32] text-[#D4AF37] flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#0B1B32] font-display">
                  Project & Off-Plan Leads
                </h1>
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200">
                  {projectLeads.length} Rows
                </span>
                <span className="text-[11px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hidden sm:inline">
                  ⚡ Inline Edit Active (Excel Mode)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Click any cell to edit instantly. Click "+ Add Blank Row" to append without popups.
              </p>
            </div>
          </div>

          {/* Primary Toolbar Triggers */}
          <div className="flex flex-wrap items-center gap-2">
            
            <button
              onClick={() => setIsBulkPasteOpen(true)}
              className="px-3 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Paste raw rows directly from Excel or Google Sheets"
            >
              <ClipboardPaste className="w-3.5 h-3.5 text-[#0B1B32]" />
              <span>Bulk Paste from Excel</span>
            </button>

            <button
              onClick={() => exportToCsv('project')}
              className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              id="add-blank-row-top"
              onClick={() => handleAddRow('top')}
              className="px-4 py-1.5 rounded bg-[#0B1B32] hover:bg-[#152945] text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Blank Row</span>
            </button>

          </div>

        </div>

        {/* Quick Excel Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
          
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Developer</label>
            <select
              value={developerFilter}
              onChange={(e) => setDeveloperFilter(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#D4AF37] focus:bg-white"
            >
              <option value="ALL">All Developers ({projectLeads.length})</option>
              {DUBAI_DEVELOPERS.map((dev) => (
                <option key={dev} value={dev}>{dev}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Call Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#D4AF37] focus:bg-white"
            >
              <option value="ALL">All Statuses</option>
              {CALL_STATUS_OPTIONS.map((st) => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Community</label>
            <select
              value={communityFilter}
              onChange={(e) => setCommunityFilter(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#D4AF37] focus:bg-white"
            >
              <option value="ALL">All Communities</option>
              {DUBAI_COMMUNITIES.map((com) => (
                <option key={com} value={com}>{com}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Urgency Schedule</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full bg-[#F8FAFC] border border-slate-200 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#D4AF37] focus:bg-white font-medium"
            >
              <option value="ALL">All Schedule Dates</option>
              <option value="DUE_TODAY">⚡ Due Today</option>
              <option value="OVERDUE">⚠️ Overdue</option>
              <option value="UPCOMING">📅 Next 7 Days</option>
            </select>
          </div>

        </div>

      </div>

      {/* The 11-Column Spreadsheet Grid */}
      <div className="bg-white border border-slate-300 rounded-sm shadow-xs overflow-hidden">
        <div className="overflow-x-auto max-h-[72vh] relative">
          <table className="w-full text-left text-xs border-collapse border-slate-200">
            
            {/* Excel Column Letters + 11-Column Headers */}
            <thead className="bg-[#0B1B32] text-white sticky top-0 z-10 select-none shadow-sm">
              <tr className="border-b border-[#D4AF37]/40 text-[11px] font-bold uppercase tracking-wider">
                
                {/* Row # */}
                <th className="py-2.5 px-2.5 text-center w-12 border-r border-white/10 bg-[#071324] text-slate-400 font-mono text-[10px]">
                  #
                </th>

                {/* 1. Project Name */}
                <th 
                  onClick={() => toggleSort('projectName')}
                  className="py-2.5 px-3 min-w-[160px] border-r border-white/10 cursor-pointer hover:bg-white/10"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>A · 1. Project Name</span>
                    <ArrowUpDown className="w-3 h-3 text-[#D4AF37]" />
                  </div>
                </th>

                {/* 2. Developer */}
                <th 
                  onClick={() => toggleSort('developer')}
                  className="py-2.5 px-3 min-w-[140px] border-r border-white/10 cursor-pointer hover:bg-white/10"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>B · 2. Developer</span>
                    <ArrowUpDown className="w-3 h-3 text-[#D4AF37]" />
                  </div>
                </th>

                {/* 3. Community */}
                <th 
                  onClick={() => toggleSort('community')}
                  className="py-2.5 px-3 min-w-[130px] border-r border-white/10 cursor-pointer hover:bg-white/10"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>C · 3. Community</span>
                    <ArrowUpDown className="w-3 h-3 text-[#D4AF37]" />
                  </div>
                </th>

                {/* 4. Unit Details */}
                <th className="py-2.5 px-3 min-w-[180px] border-r border-white/10">
                  D · 4. Unit Details
                </th>

                {/* 5. Property Type */}
                <th className="py-2.5 px-3 min-w-[120px] border-r border-white/10">
                  E · 5. Type
                </th>

                {/* 6. Handover Details */}
                <th className="py-2.5 px-3 min-w-[110px] border-r border-white/10">
                  F · 6. Handover
                </th>

                {/* 7. Visited Date */}
                <th className="py-2.5 px-3 min-w-[110px] border-r border-white/10">
                  G · 7. Visited
                </th>

                {/* 8. Owner Name */}
                <th 
                  onClick={() => toggleSort('ownerName')}
                  className="py-2.5 px-3 min-w-[140px] border-r border-white/10 cursor-pointer hover:bg-white/10 text-[#D4AF37]"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span>H · 8. Owner Name</span>
                    <ArrowUpDown className="w-3 h-3 text-[#D4AF37]" />
                  </div>
                </th>

                {/* 9. Contact No. */}
                <th className="py-2.5 px-3 min-w-[140px] border-r border-white/10">
                  I · 9. Contact No.
                </th>

                {/* 10. Call Status */}
                <th className="py-2.5 px-3 min-w-[140px] border-r border-white/10 bg-[#0B1B32]">
                  J · 10. Call Status
                </th>

                {/* 11. Follow-up Date & Time */}
                <th className="py-2.5 px-3 min-w-[270px] bg-[#D4AF37] text-[#0B1B32] font-black border-r border-white/20">
                  K · 11. Follow-up Date & Time
                </th>

                {/* Quick Row Action */}
                <th className="py-2.5 px-2 text-center w-16 bg-[#071324]">
                  Edit
                </th>

              </tr>
            </thead>

            {/* Table Spreadsheet Body */}
            <tbody className="divide-y divide-slate-200 text-slate-800 font-sans">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400 bg-slate-50">
                    <p className="font-semibold text-slate-600">No rows match your current filter.</p>
                    <button
                      onClick={() => handleAddRow('top')}
                      className="mt-2 text-xs text-blue-600 font-bold underline cursor-pointer"
                    >
                      + Add a blank row now
                    </button>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead, index) => {
                  const diff = lead.followUpDate ? getDaysDiffFromToday(lead.followUpDate) : 999;
                  const isOverdue = diff < 0 && lead.callStatus !== 'Closed' && lead.callStatus !== 'Not Interested';
                  const isToday = diff === 0 && lead.callStatus !== 'Closed' && lead.callStatus !== 'Not Interested';
                  const isSelected = selectedRowId === lead.id;
                  const waLink = getWhatsAppLink(lead.contactNo, lead.ownerName, lead.projectName);

                  return (
                    <tr 
                      key={lead.id}
                      onClick={() => setSelectedRowId(lead.id)}
                      className={`hover:bg-amber-50/30 transition-colors ${
                        isSelected ? 'bg-amber-50/60' : index % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                      }`}
                    >
                      {/* Row Index */}
                      <td className="py-1.5 px-2 text-center font-mono text-[10px] text-slate-400 bg-slate-100/50 border-r border-slate-200 select-none">
                        {index + 1}
                      </td>

                      {/* 1. Project Name */}
                      <td className="p-0 border-r border-slate-200 font-bold text-[#0B1B32]">
                        <EditableCell
                          value={lead.projectName}
                          onChange={(val) => updateProjectLead(lead.id, { projectName: val })}
                          placeholder="Project Name..."
                          className="font-bold text-[#0B1B32]"
                        />
                      </td>

                      {/* 2. Developer */}
                      <td className="p-0 border-r border-slate-200">
                        <EditableCell
                          type="select"
                          value={lead.developer}
                          options={DEVELOPER_OPTIONS}
                          onChange={(val) => updateProjectLead(lead.id, { developer: val })}
                        />
                      </td>

                      {/* 3. Community */}
                      <td className="p-0 border-r border-slate-200">
                        <EditableCell
                          value={lead.community}
                          onChange={(val) => updateProjectLead(lead.id, { community: val })}
                          placeholder="e.g. Downtown"
                        />
                      </td>

                      {/* 4. Unit Details */}
                      <td className="p-0 border-r border-slate-200">
                        <EditableCell
                          value={lead.unitDetails}
                          onChange={(val) => updateProjectLead(lead.id, { unitDetails: val })}
                          placeholder="e.g. 2BR, 1,380 sqft"
                          className="text-[11px]"
                        />
                      </td>

                      {/* 5. Property Type */}
                      <td className="p-0 border-r border-slate-200">
                        <EditableCell
                          type="select"
                          value={lead.propertyType}
                          options={PROPERTY_TYPES}
                          onChange={(val) => updateProjectLead(lead.id, { propertyType: val as PropertyType })}
                        />
                      </td>

                      {/* 6. Handover Details */}
                      <td className="p-0 border-r border-slate-200">
                        <EditableCell
                          value={lead.handoverDetails}
                          onChange={(val) => updateProjectLead(lead.id, { handoverDetails: val })}
                          placeholder="Q4 2026"
                          className="font-mono text-[11px]"
                        />
                      </td>

                      {/* 7. Visited Date */}
                      <td className="p-0 border-r border-slate-200">
                        <EditableCell
                          type="date"
                          value={lead.visitedDate}
                          onChange={(val) => updateProjectLead(lead.id, { visitedDate: val })}
                        />
                      </td>

                      {/* 8. Owner Name */}
                      <td className="p-0 border-r border-slate-200 font-bold">
                        <EditableCell
                          value={lead.ownerName}
                          onChange={(val) => updateProjectLead(lead.id, { ownerName: val })}
                          placeholder="Owner / Client Name"
                          className="font-semibold text-slate-900"
                        />
                      </td>

                      {/* 9. Contact No. (with WhatsApp & Call icons) */}
                      <td className="p-0 border-r border-slate-200">
                        <div className="flex items-center justify-between pr-2">
                          <div className="flex-1">
                            <EditableCell
                              value={lead.contactNo}
                              onChange={(val) => updateProjectLead(lead.id, { contactNo: val })}
                              placeholder="+971 50..."
                              className="font-mono text-[11px]"
                            />
                          </div>
                          {lead.contactNo && (
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                title="WhatsApp Client"
                                className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200"
                              >
                                <MessageSquare className="w-3 h-3" />
                              </a>
                              <a
                                href={`tel:${cleanPhoneNumber(lead.contactNo)}`}
                                title="Call"
                                className="p-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors border border-slate-200"
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 10. Call Status (Inline Dropdown) */}
                      <td className="p-0 border-r border-slate-200">
                        <EditableCell
                          type="select"
                          value={lead.callStatus}
                          options={CALL_STATUS_OPTIONS}
                          onChange={(val) => updateProjectLead(lead.id, { callStatus: val as CallStatus })}
                        />
                      </td>

                      {/* 11. Follow-up Date (Inline Date Picker + fast presets) */}
                      <td className="p-1.5 border-r border-slate-200 bg-[#D4AF37]/5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="date"
                              value={lead.followUpDate || ''}
                              onChange={(e) => updateProjectLead(lead.id, { followUpDate: e.target.value })}
                              className={`bg-white border px-1.5 py-0.5 rounded text-xs font-mono font-bold w-28 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] ${
                                isOverdue
                                  ? 'border-red-500 text-red-600 bg-red-50'
                                  : isToday
                                  ? 'border-[#D4AF37] text-amber-900 bg-amber-50'
                                  : 'border-slate-300 text-slate-800'
                              }`}
                            />

                            {/* Time Picker */}
                            <input
                              type="time"
                              value={lead.followUpTime || '10:00'}
                              onChange={(e) => updateProjectLead(lead.id, { followUpTime: e.target.value })}
                              title="Time scheduled in Google Calendar"
                              className="bg-white border border-slate-300 px-1 py-0.5 rounded text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] w-[70px]"
                            />

                            {/* Google Calendar Direct Background Save */}
                            <button
                              type="button"
                              onClick={() => handleCalendarSync(lead)}
                              disabled={savingCalId === lead.id}
                              title={`Save directly to Google Calendar at ${lead.followUpTime || '10:00'}`}
                              className="p-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-colors cursor-pointer shrink-0 shadow-2xs disabled:opacity-50"
                            >
                              <CalendarPlus className={`w-3.5 h-3.5 text-amber-700 ${savingCalId === lead.id ? 'animate-spin' : ''}`} />
                            </button>

                            {/* Indicator */}
                            {isOverdue && (
                              <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1 py-0.2 rounded shrink-0">
                                Overdue
                              </span>
                            )}
                            {isToday && (
                              <span className="text-[10px] font-bold text-amber-800 bg-[#D4AF37]/20 px-1 py-0.2 rounded shrink-0">
                                Today
                              </span>
                            )}
                          </div>

                          {/* Quick Fast Presets */}
                          <div className="flex items-center gap-1 text-[10px]">
                            <button
                              type="button"
                              onClick={() => handleQuickPresetDate(lead.id, 0, 0)}
                              className="px-1.5 py-0.2 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
                            >
                              Today
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickPresetDate(lead.id, 1, 0)}
                              className="px-1.5 py-0.2 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
                            >
                              +1d
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickPresetDate(lead.id, 3, 0)}
                              className="px-1.5 py-0.2 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
                            >
                              +3d
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickPresetDate(lead.id, 7, 0)}
                              className="px-1.5 py-0.2 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
                            >
                              +1w
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickPresetDate(lead.id, 0, 4)}
                              title="Schedule follow-up in exactly 4 months"
                              className="px-1.5 py-0.2 rounded bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#0B1B32] border border-[#D4AF37]/40 font-bold cursor-pointer"
                            >
                              +4m ⏳
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Row Action Controls (Duplicate & Delete) */}
                      <td className="py-1 px-2 text-center select-none">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => duplicateProjectLead(lead.id)}
                            title="Duplicate Row"
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteProjectLead(lead.id)}
                            title="Delete Row"
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Excel Bottom Control & Summary Bar */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleAddRow('bottom')}
              className="px-3 py-1 rounded bg-[#0B1B32] hover:bg-[#152945] text-white text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
              <span>+ Add Row at Bottom</span>
            </button>

            <span>
              Showing <strong className="text-slate-800">{filteredLeads.length}</strong> of{' '}
              <strong className="text-slate-800">{projectLeads.length}</strong> leads
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>All edits auto-saved to LocalStorage instantaneously</span>
          </div>

        </div>

      </div>

      {/* Bulk Paste Drawer */}
      <ExcelPasteDrawer
        isOpen={isBulkPasteOpen}
        onClose={() => setIsBulkPasteOpen(false)}
        targetSheet="project"
        onImportProjects={bulkAddProjectLeads}
        onImportSecondary={() => {}}
      />

    </div>
  );
};
