import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Download, 
  ClipboardPaste, 
  Search, 
  Phone, 
  Calendar, 
  MessageSquare,
  Sparkles, 
  ChevronDown,
  Table, 
  CheckCircle2, 
  X,
  FileSpreadsheet,
  UploadCloud,
  AlertCircle,
  CalendarPlus,
  Filter,
  ArrowUpDown,
  Clock
} from 'lucide-react';
import { CustomTable, CustomTableRow } from '../types';
import { EditableCell } from './EditableCell';
import { useCrm } from '../context/CrmContext';
import { saveDirectlyToGoogleCalendar } from '../utils/calendar';
import { getDateOffset, getTodayDateString } from '../data/mockData';
import { compareRowsByCreation } from '../utils/tableSorting';

import { ExcelPasteDrawer } from './ExcelPasteDrawer';

interface CustomTableViewProps {
  table: CustomTable;
}

export const CustomTableView: React.FC<CustomTableViewProps> = ({ table }) => {
  const { 
    customRows, 
    addCustomTableRow, 
    updateCustomTableRow, 
    deleteCustomTableRow, 
    duplicateCustomTableRow,
    bulkAddCustomTableRows,
    clearCustomTableRows,
    deleteCustomTable,
    searchQuery: globalSearch
  } = useCrm();

  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [isPasteDrawerOpen, setIsPasteDrawerOpen] = useState(false);
  const [syncingRowId, setSyncingRowId] = useState<string | null>(null);
  const latestDateMapRef = useRef<Record<string, string>>({});

  // Quick Preset Helper for Date column
  // CUMULATIVE: Every click on +1d, +3d, +1w, +4m adds to the current date no matter how many times clicked!
  const handleQuickPresetDate = (rowId: string, colKey: string, days: number, months: number) => {
    const mapKey = `${rowId}_${colKey}`;

    if (days === 0 && months === 0) {
      const today = getTodayDateString();
      latestDateMapRef.current[mapKey] = today;
      handleCellChange(rowId, colKey, today);
      return;
    }

    const row = customRows.find((r) => r.id === rowId);
    const existingVal = latestDateMapRef.current[mapKey] ?? (row?.data[colKey] ? String(row.data[colKey]).trim() : '');
    const nextDate = getDateOffset(days, months, existingVal || undefined);
    latestDateMapRef.current[mapKey] = nextDate;
    handleCellChange(rowId, colKey, nextDate);
  };

  // Schedule Follow-up directly to Google Calendar
  const handleSyncGoogleCalendar = async (row: CustomTableRow) => {
    // Locate date column
    const dateCol = table.columns.find(
      (c) => c.type === 'date' || c.name.toLowerCase().includes('date') || c.name.toLowerCase().includes('follow')
    );
    const dateVal = dateCol ? row.data[dateCol.key] : null;

    if (!dateVal) {
      window.dispatchEvent(
        new CustomEvent('crm-show-toast', {
          detail: { msg: 'Please select a Follow-up Date first.', isError: true },
        })
      );
      return;
    }

    // Locate client / owner name column
    const nameCol = table.columns.find(
      (c) => c.name.toLowerCase().includes('name') || c.name.toLowerCase().includes('client')
    );
    const nameVal = nameCol ? row.data[nameCol.key] : Object.values(row.data)[0] || 'Client';

    // Locate phone / contact column
    const telCol = table.columns.find(
      (c) => c.type === 'tel' || c.name.toLowerCase().includes('phone') || c.name.toLowerCase().includes('contact')
    );
    const telVal = telCol ? row.data[telCol.key] : '';

    const timeVal = dateCol ? (row.data[`${dateCol.key}_time`] || '10:00') : '10:00';

    setSyncingRowId(row.id);
    const result = await saveDirectlyToGoogleCalendar(
      {
        ownerName: String(nameVal || 'Client'),
        contactNo: String(telVal || ''),
        projectName: table.name,
        followUpDate: String(dateVal),
        followUpTime: String(timeVal),
        notes: `Follow-up reminder from custom table: ${table.name}`,
      },
      'project'
    );
    setSyncingRowId(null);

    window.dispatchEvent(
      new CustomEvent('crm-show-toast', {
        detail: { msg: result.message, isError: !result.success },
      })
    );
  };

  const [createdSortOrder, setCreatedSortOrder] = useState<'asc' | 'desc'>('asc');

  // Get rows belonging to this table (permanently excluding any marked Not Interested)
  // Strictly ordered by creation timestamp ('order by created')
  const tableRows = useMemo(() => {
    const rows = customRows.filter((r) => {
      if (r.tableId !== table.id) return false;
      const statusCol = table.columns.find((c) => c.type === 'select' || c.name.toLowerCase().includes('status'));
      if (statusCol && r.data[statusCol.key] === 'Not Interested') {
        return false;
      }
      return true;
    });

    return [...rows].sort((a, b) => compareRowsByCreation(a, b, createdSortOrder));
  }, [customRows, table.id, table.columns, createdSortOrder]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setActiveSearch('');
  };

  // Filtered rows by search query and status filter
  const filteredRows = useMemo(() => {
    const q = (activeSearch || globalSearch).toLowerCase().trim();

    return tableRows.filter((row) => {
      // 1. Status Filter
      if (statusFilter !== 'All') {
        const statusCol = table.columns.find((c) => c.type === 'select' || c.name.toLowerCase().includes('status'));
        const rowStatus = statusCol ? String(row.data[statusCol.key] || 'New').trim() : '';
        if (rowStatus !== statusFilter) {
          return false;
        }
      }

      // 2. Search Filter
      if (q) {
        return Object.values(row.data).some((val) =>
          String(val || '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [tableRows, activeSearch, globalSearch, statusFilter, table.columns]);

  // Status options for dropdown filter (strictly respect user's selected options from table creation)
  const statusOptions = useMemo(() => {
    const statusCol = table.columns.find((c) => c.type === 'select' || c.name.toLowerCase().includes('status'));
    const baseOpts = statusCol?.options && statusCol.options.length > 0
      ? statusCol.options
      : ['New', 'Active', 'Hot', 'Follow-up', 'Interested', 'Under Negotiation', 'Closed Won', 'Closed Lost', 'Closed'];
    return baseOpts.filter((opt) => opt !== 'Not Interested');
  }, [table.columns]);

  // Handle cell edit
  const handleCellChange = (rowId: string, colKey: string, value: any) => {
    if (String(value).trim() === 'Not Interested') {
      deleteCustomTableRow(rowId);
      window.dispatchEvent(
        new CustomEvent('crm-show-toast', {
          detail: { msg: 'Lead marked as "Not Interested" and removed from table.' },
        })
      );
      return;
    }
    updateCustomTableRow(rowId, { [colKey]: value });
  };

  // Add blank row
  const handleAddBlankRow = (insertAt: 'top' | 'bottom' = 'bottom') => {
    const defaultData: Record<string, any> = {};
    table.columns.forEach((col) => {
      if (col.type === 'date') {
        defaultData[col.key] = new Date().toISOString().split('T')[0];
        defaultData[`${col.key}_time`] = '10:00';
      } else if (col.type === 'number' || col.type === 'aed') {
        defaultData[col.key] = '';
      } else if (col.type === 'select') {
        defaultData[col.key] = 'New';
      } else {
        defaultData[col.key] = '';
      }
    });

    const newId = addCustomTableRow(table.id, defaultData, insertAt);
    setSelectedRowId(newId);
  };

  // Handle CSV Export
  const handleExportCsv = () => {
    const headers = table.columns.map((col) => `"${col.name}"`).join(',');
    const rows = tableRows.map((r) =>
      table.columns
        .map((col) => `"${String(r.data[col.key] ?? '').replace(/"/g, '""')}"`)
        .join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${table.name.replace(/\s+/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="space-y-4">
      {/* Table Header Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-[#0B1B32] text-[#D4AF37]">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-display text-[#0B1B32]">
                  {table.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {tableRows.length} Rows
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Custom Table
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {table.columns.length} columns defined · Inline Excel editing & automatic database sync
              </p>
            </div>
          </div>
        </div>

        {/* Table Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Local Search Form with Dedicated Search Button */}
          <form 
            onSubmit={handleSearchSubmit}
            className="flex items-center shadow-2xs"
          >
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search in table..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (e.target.value === '') setActiveSearch('');
                }}
                className="pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-l-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0B1B32] focus:bg-white w-32 sm:w-44 transition-all"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer font-bold"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 bg-[#0B1B32] hover:bg-[#152945] text-white text-xs font-bold rounded-r-md border border-[#0B1B32] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              title="Click to search table"
            >
              <Search className="w-3 h-3 stroke-[2.5]" />
              <span>Search</span>
            </button>
          </form>

          {/* Status Dropdown Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-md px-2.5 py-1 shadow-2xs">
            <Filter className="w-3.5 h-3.5 text-[#0B1B32] shrink-0" />
            <span className="text-[11px] font-bold text-slate-600 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-[#0B1B32] focus:outline-none cursor-pointer pr-1"
            >
              <option value="All">All Statuses ({tableRows.length})</option>
              {statusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Order by Created Badge / Interactive Toggle */}
          <button
            type="button"
            onClick={() => setCreatedSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded-md shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer text-xs font-semibold text-slate-700"
            title={`Table is ordered by creation time: currently ${createdSortOrder === 'asc' ? 'Oldest First (1, 2, 3...)' : 'Newest First'}. Click to toggle.`}
          >
            <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="text-[11px] font-bold text-slate-600 uppercase">Order:</span>
            <span className="text-xs font-bold text-[#0B1B32]">
              Created ({createdSortOrder === 'asc' ? 'Oldest' : 'Newest'})
            </span>
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Bulk Import from Excel Button */}
          <button
            onClick={() => setIsPasteDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors shadow-2xs cursor-pointer"
            title="Import Excel spreadsheet (.xlsx, .xls, .csv) into this table"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#0B1B32]" />
            <span>Bulk Import from Excel</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            title="Export this table to CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>CSV</span>
          </button>

          {/* Delete All Rows */}
          {tableRows.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete all ${tableRows.length} rows from "${table.name}"? This action cannot be undone.`)) {
                  clearCustomTableRows(table.id);
                }
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold border border-red-200 transition-colors shadow-2xs cursor-pointer"
              title="Delete all rows in this table"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Delete All Rows</span>
            </button>
          )}

          {/* + Add Blank Row Button */}
          <button
            onClick={() => handleAddBlankRow('bottom')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#0B1B32] hover:bg-[#152945] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>+ Add Blank Row</span>
          </button>

          {/* Delete Table Option */}
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete the table "${table.name}" and all its rows?`)) {
                deleteCustomTable(table.id);
              }
            }}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
            title="Delete this entire table"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Spreadsheet Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto max-h-[calc(100vh-270px)]">
          <table className="w-full text-left text-xs border-collapse">
            {/* Table Header */}
            <thead>
              <tr className="bg-[#0B1B32] text-white uppercase text-[11px] font-bold tracking-wider divide-x divide-white/10 select-none">
                <th 
                  onClick={() => setCreatedSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="py-2.5 px-2.5 w-16 text-center bg-[#071324] font-mono text-[10px] text-amber-400 sticky left-0 z-10 cursor-pointer hover:bg-[#0c1f38] transition-colors select-none group"
                  title={`Ordered by Created (${createdSortOrder === 'asc' ? 'Oldest First' : 'Newest First'}) - Click to toggle order`}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>#</span>
                    <ArrowUpDown className="w-3 h-3 text-amber-400/70 group-hover:text-amber-300" />
                  </div>
                </th>
                {table.columns.map((col, idx) => (
                  <th key={col.id} className="py-2.5 px-3 min-w-[160px] whitespace-nowrap">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-amber-400/80 font-mono text-[10px]">
                          {String.fromCharCode(65 + (idx % 26))}.
                        </span>
                        <span>{col.name}</span>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-normal uppercase ${
                        col.type === 'aed' && col.isLeadValue
                          ? 'bg-emerald-500/25 text-emerald-300 font-bold border border-emerald-500/40'
                          : col.type === 'aed'
                          ? 'bg-[#D4AF37]/25 text-amber-300 font-bold'
                          : 'bg-white/10 text-slate-300'
                      }`}>
                        {col.type === 'aed' ? (col.isLeadValue ? '💰 Lead Value' : 'AED') : col.type}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="py-2.5 px-2 w-20 text-center text-slate-300">
                  Actions
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 font-sans">
              {filteredRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.columns.length + 2}
                    className="py-14 text-center text-slate-400 bg-slate-50"
                  >
                    <p className="font-semibold text-slate-600 text-sm">No rows found in {table.name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click "+ Add Blank Row" or "Bulk Import from Excel" to add records
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleAddBlankRow('bottom')}
                        className="px-3 py-1.5 rounded bg-[#0B1B32] text-white font-bold text-xs hover:bg-[#152945] transition-colors cursor-pointer"
                      >
                        + Add Blank Row
                      </button>
                      <button
                        onClick={() => setIsPasteDrawerOpen(true)}
                        className="px-3 py-1.5 rounded bg-white text-slate-700 border border-slate-300 font-semibold text-xs hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#0B1B32]" />
                        <span>Bulk Import from Excel</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => {
                  const isSelected = selectedRowId === row.id;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedRowId(row.id)}
                      className={`hover:bg-amber-50/30 transition-colors divide-x divide-slate-200 ${
                        isSelected
                          ? 'bg-amber-50/60'
                          : index % 2 === 1
                          ? 'bg-slate-50/40'
                          : 'bg-white'
                      }`}
                    >
                      {/* Row Index */}
                      <td className="py-1.5 px-2 text-center font-mono text-[10px] text-slate-400 bg-slate-100/50 select-none sticky left-0 z-10">
                        {index + 1}
                      </td>

                      {/* Dynamic Columns */}
                      {table.columns.map((col) => {
                        const cellValue = row.data[col.key] ?? '';

                        // Special Phone column with WhatsApp quick action
                        if (col.type === 'tel') {
                          const phoneClean = String(cellValue).replace(/[^0-9+]/g, '');
                          const waLink = phoneClean
                            ? `https://wa.me/${phoneClean.replace('+', '')}?text=${encodeURIComponent(
                                `Hello, reaching out regarding ${table.name}`
                              )}`
                            : null;

                          return (
                            <td key={col.id} className="p-0">
                              <div className="flex items-center">
                                <EditableCell
                                  value={cellValue}
                                  onChange={(val) => handleCellChange(row.id, col.key, val)}
                                  placeholder="+971 50..."
                                  className="font-mono text-slate-700"
                                />
                                {cellValue && waLink && (
                                  <a
                                    href={waLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 mr-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                    title="WhatsApp Message"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </td>
                          );
                        }

                        // Special Date column with Google Calendar Sync and Presets
                        // Date column
                        if (col.type === 'date') {
                          const isFollowUpCol = col.name.toLowerCase().includes('follow');
                          const timeVal = row.data[`${col.key}_time`] || '10:00';

                          return (
                            <td key={col.id} className="py-1 px-2">
                              <div className={`flex flex-col gap-1 ${isFollowUpCol ? 'min-w-[210px]' : 'min-w-[130px]'}`}>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="date"
                                    value={cellValue || ''}
                                    onChange={(e) => {
                                      latestDateMapRef.current[`${row.id}_${col.key}`] = e.target.value;
                                      handleCellChange(row.id, col.key, e.target.value);
                                    }}
                                    className="px-2 py-0.5 text-xs bg-slate-50 border border-slate-200 rounded font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-[#0B1B32] transition-colors"
                                  />
                                  {isFollowUpCol && (
                                    <>
                                      <input
                                        type="time"
                                        value={timeVal}
                                        onChange={(e) => handleCellChange(row.id, `${col.key}_time`, e.target.value)}
                                        title="Time scheduled in Google Calendar"
                                        className="px-1.5 py-0.5 text-xs bg-slate-50 border border-slate-200 rounded font-mono font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-[#0B1B32] w-[75px]"
                                      />
                                      {cellValue && (
                                        <button
                                          type="button"
                                          onClick={() => handleSyncGoogleCalendar(row)}
                                          disabled={syncingRowId === row.id}
                                          className="p-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-colors cursor-pointer shrink-0"
                                          title={`Schedule to Google Calendar at ${timeVal}`}
                                        >
                                          {syncingRowId === row.id ? (
                                            <span className="w-3.5 h-3.5 border-2 border-amber-800 border-t-transparent rounded-full animate-spin inline-block" />
                                          ) : (
                                            <CalendarPlus className="w-3.5 h-3.5 text-[#0B1B32]" />
                                          )}
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>

                                {isFollowUpCol && (
                                  <div className="flex items-center gap-1 text-[10px]">
                                    <button
                                      type="button"
                                      onClick={() => handleQuickPresetDate(row.id, col.key, 0, 0)}
                                      className="px-1.5 py-0.2 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
                                    >
                                      Today
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickPresetDate(row.id, col.key, 1, 0)}
                                      className="px-1.5 py-0.2 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
                                    >
                                      +1d
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickPresetDate(row.id, col.key, 3, 0)}
                                      className="px-1.5 py-0.2 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
                                    >
                                      +3d
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickPresetDate(row.id, col.key, 7, 0)}
                                      className="px-1.5 py-0.2 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 cursor-pointer"
                                    >
                                      +1w
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickPresetDate(row.id, col.key, 0, 4)}
                                      title="Schedule follow-up in exactly 4 months"
                                      className="px-1.5 py-0.2 rounded bg-[#D4AF37]/20 hover:bg-[#D4AF37]/30 text-[#0B1B32] border border-[#D4AF37]/40 font-bold cursor-pointer"
                                    >
                                      +4m ⏳
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        }

                        // Special AED Currency column
                        if (col.type === 'aed') {
                          return (
                            <td key={col.id} className="p-0">
                              <EditableCell
                                type="number"
                                value={cellValue}
                                onChange={(val) => handleCellChange(row.id, col.key, val === '' ? '' : Number(val))}
                                placeholder="AED 0"
                                formatter={(v) => {
                                  if (v === '' || v === null || v === undefined) return '';
                                  const num = Number(v);
                                  return isNaN(num) ? String(v) : `AED ${num.toLocaleString()}`;
                                }}
                                className="font-mono text-right font-medium text-slate-800"
                                inputClassName="text-right font-mono font-medium"
                              />
                            </td>
                          );
                        }

                        // Special Plain Number column
                        if (col.type === 'number') {
                          return (
                            <td key={col.id} className="p-0">
                              <EditableCell
                                type="number"
                                value={cellValue}
                                onChange={(val) => handleCellChange(row.id, col.key, val === '' ? '' : Number(val))}
                                placeholder="0"
                                className="font-mono text-right"
                                inputClassName="text-right font-mono"
                              />
                            </td>
                          );
                        }

                        // Special Select / Status column
                        const isStatusCol = col.type === 'select' || col.name.toLowerCase().includes('status');
                        if (isStatusCol) {
                          const currentOptions = col.options && col.options.length > 0
                            ? col.options
                            : ['New', 'Active', 'Hot', 'Follow-up', 'Interested', 'Under Negotiation', 'Closed Won', 'Closed Lost', 'Closed', 'Not Interested'];

                          return (
                            <td key={col.id} className="p-0">
                              <select
                                value={cellValue || 'New'}
                                onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                                className={`w-full px-2 py-1 text-xs bg-transparent border-0 focus:outline-none focus:bg-white font-medium cursor-pointer ${
                                  cellValue === 'Hot' ? 'text-red-600 font-bold' :
                                  cellValue === 'Closed Won' ? 'text-emerald-700 font-bold' :
                                  cellValue === 'Closed Lost' ? 'text-slate-500 line-through' :
                                  'text-slate-800'
                                }`}
                              >
                                {currentOptions.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt === 'Hot' ? '🔥 Hot' :
                                     opt === 'Closed Won' ? '🏆 Closed Won' :
                                     opt === 'Closed Lost' ? '❌ Closed Lost' :
                                     opt}
                                  </option>
                                ))}
                              </select>
                            </td>
                          );
                        }

                        // Default Text column
                        return (
                          <td key={col.id} className="p-0">
                            <EditableCell
                              value={cellValue}
                              onChange={(val) => handleCellChange(row.id, col.key, val)}
                              placeholder={`Enter ${col.name.toLowerCase()}...`}
                            />
                          </td>
                        );
                      })}

                      {/* Row Actions */}
                      <td className="py-1 px-2 text-center select-none">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSyncGoogleCalendar(row)}
                            disabled={syncingRowId === row.id}
                            title="Schedule Follow-up to Google Calendar"
                            className="p-1 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded cursor-pointer"
                          >
                            {syncingRowId === row.id ? (
                              <span className="w-3 h-3 border-2 border-amber-700 border-t-transparent rounded-full animate-spin inline-block" />
                            ) : (
                              <CalendarPlus className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateCustomTableRow(row.id)}
                            title="Duplicate Row"
                            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCustomTableRow(row.id)}
                            title="Delete Row"
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
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

        {/* Spreadsheet Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleAddBlankRow('bottom')}
              className="px-3 py-1 rounded bg-[#0B1B32] hover:bg-[#152945] text-white text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs cursor-pointer"
            >
              <Plus className="w-3 h-3 stroke-[3]" />
              <span>+ Add Row at Bottom</span>
            </button>
            <span>
              Showing <strong className="text-slate-800">{filteredRows.length}</strong> of{' '}
              <strong className="text-slate-800">{tableRows.length}</strong> rows
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Realtime CRUD and Database Sync Active</span>
          </div>
        </div>
      </div>

      {/* Bulk Import from Excel Modal / Drawer */}
      <ExcelPasteDrawer
        isOpen={isPasteDrawerOpen}
        onClose={() => setIsPasteDrawerOpen(false)}
        targetTable={table}
        onImportCustomRows={bulkAddCustomTableRows}
      />
    </div>
  );
};
