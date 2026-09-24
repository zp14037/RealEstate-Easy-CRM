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
  CalendarPlus
} from 'lucide-react';
import { CustomTable, CustomTableRow } from '../types';
import { EditableCell } from './EditableCell';
import { useCrm } from '../context/CrmContext';
import { saveDirectlyToGoogleCalendar } from '../utils/calendar';
import { getDateOffset } from '../data/mockData';

import { 
  parseSpreadsheetText, 
  parseExcelFile, 
  downloadExcelTemplate, 
  guessColumnMapping 
} from '../utils/spreadsheetParser';

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

  const [localSearch, setLocalSearch] = useState('');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [isPasteDrawerOpen, setIsPasteDrawerOpen] = useState(false);
  const [activeImportMode, setActiveImportMode] = useState<'upload' | 'paste'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');
  const [parsedMatrix, setParsedMatrix] = useState<string[][]>([]);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [columnMappings, setColumnMappings] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [syncingRowId, setSyncingRowId] = useState<string | null>(null);

  // Quick Preset Helper for Date column
  const handleQuickPresetDate = (rowId: string, colKey: string, days: number, months: number) => {
    const nextDate = getDateOffset(days, months);
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

    setSyncingRowId(row.id);
    const result = await saveDirectlyToGoogleCalendar(
      {
        ownerName: String(nameVal || 'Client'),
        contactNo: String(telVal || ''),
        projectName: table.name,
        followUpDate: String(dateVal),
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

  // Get rows belonging to this table
  const tableRows = useMemo(() => {
    return customRows.filter((r) => r.tableId === table.id);
  }, [customRows, table.id]);

  // Filtered rows by search query
  const filteredRows = useMemo(() => {
    const q = (localSearch || globalSearch).toLowerCase().trim();
    if (!q) return tableRows;

    return tableRows.filter((row) => {
      return Object.values(row.data).some((val) =>
        String(val || '').toLowerCase().includes(q)
      );
    });
  }, [tableRows, localSearch, globalSearch]);

  // Handle cell edit
  const handleCellChange = (rowId: string, colKey: string, value: any) => {
    updateCustomTableRow(rowId, { [colKey]: value });
  };

  // Add blank row
  const handleAddBlankRow = (insertAt: 'top' | 'bottom' = 'top') => {
    const defaultData: Record<string, any> = {};
    table.columns.forEach((col) => {
      if (col.type === 'date') {
        defaultData[col.key] = new Date().toISOString().split('T')[0];
      } else if (col.type === 'number') {
        defaultData[col.key] = 0;
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

  // Parse raw text into matrix when in paste mode
  useEffect(() => {
    if (activeImportMode === 'paste') {
      const matrix = parseSpreadsheetText(pasteRawText);
      setParsedMatrix(matrix);
      setParseError(null);
    }
  }, [pasteRawText, activeImportMode]);

  // Reset modal state on open/close
  useEffect(() => {
    if (!isPasteDrawerOpen) {
      setUploadedFile(null);
      setPasteRawText('');
      setParsedMatrix([]);
      setParseError(null);
      setColumnMappings({});
      setIsParsing(false);
    }
  }, [isPasteDrawerOpen]);

  // Total columns detected in the pasted or uploaded data
  const detectedColCount = useMemo(() => {
    if (parsedMatrix.length === 0) return 0;
    return Math.max(...parsedMatrix.map((r) => r.length));
  }, [parsedMatrix]);

  // Auto-initialize mappings when parsedMatrix changes
  useEffect(() => {
    if (parsedMatrix.length === 0) {
      setColumnMappings({});
      return;
    }

    const firstRow = parsedMatrix[0] || [];
    const targets = table.columns.map((c) => ({ key: c.key, name: c.name }));

    // Detect if first row looks like headers
    const looksLikeHeader = firstRow.some((val) => {
      const v = val.toLowerCase();
      return /name|phone|contact|mobile|budget|price|status|date|notes|project|developer|community|unit|id/i.test(v);
    });
    setHasHeaderRow(looksLikeHeader);

    const newMappings: Record<number, string> = {};
    for (let colIdx = 0; colIdx < detectedColCount; colIdx++) {
      const headerTitle = firstRow[colIdx] || '';
      const sampleValues = parsedMatrix.slice(looksLikeHeader ? 1 : 0, 4).map((r) => r[colIdx] || '');
      const guessedKey = guessColumnMapping(headerTitle, sampleValues, targets);
      
      if (guessedKey) {
        newMappings[colIdx] = guessedKey;
      } else if (table.columns[colIdx]) {
        newMappings[colIdx] = table.columns[colIdx].key;
      } else {
        newMappings[colIdx] = 'SKIP';
      }
    }

    setColumnMappings(newMappings);
  }, [parsedMatrix, table.columns, detectedColCount]);

  // Handle file upload
  const handleFileSelected = async (file: File) => {
    setParseError(null);
    setUploadedFile(file);
    setIsParsing(true);

    try {
      const matrix = await parseExcelFile(file);
      if (matrix.length === 0) {
        setParseError('The uploaded file appears to be empty.');
        setParsedMatrix([]);
      } else {
        setParsedMatrix(matrix);
      }
    } catch (err: any) {
      console.error('Error parsing Excel file:', err);
      setParseError(err.message || 'Failed to read file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
      setParsedMatrix([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadCustomTemplate = () => {
    const headers = table.columns.map((c) => c.name);
    const sampleRows = [
      table.columns.map((col, idx) => {
        if (col.type === 'tel') return '+971 50 123 4567';
        if (col.type === 'number') return '5000000';
        if (col.type === 'select') return 'Active';
        if (col.type === 'date') return '2026-10-15';
        return `Sample ${col.name}`;
      })
    ];
    downloadExcelTemplate(`${table.name.replace(/\s+/g, '_')}_Template.xlsx`, headers, sampleRows);
  };

  // Parse and import bulk paste with column mappings
  const handleProcessBulkPaste = () => {
    if (parsedMatrix.length === 0) return;

    const startRow = hasHeaderRow ? 1 : 0;
    const newRowsData: Record<string, any>[] = [];

    for (let r = startRow; r < parsedMatrix.length; r++) {
      const tokens = parsedMatrix[r];
      if (!tokens || tokens.every((t) => !t.trim())) continue;

      const rowData: Record<string, any> = {};

      // Initialize default column values
      table.columns.forEach((col) => {
        rowData[col.key] = col.type === 'number' ? 0 : col.type === 'date' ? new Date().toISOString().split('T')[0] : '';
      });

      // Map values based on user's column configuration
      Object.entries(columnMappings).forEach(([colIdxStr, targetColKey]: [string, string]) => {
        const colIdx = Number(colIdxStr);
        if (targetColKey === 'SKIP') return;

        const rawVal = tokens[colIdx] !== undefined ? tokens[colIdx].trim() : '';
        const targetCol = table.columns.find((c) => c.key === targetColKey);

        if (targetCol) {
          if (targetCol.type === 'number') {
            const num = parseFloat(rawVal.replace(/[^0-9.-]/g, ''));
            (rowData as Record<string, any>)[targetColKey] = isNaN(num) ? 0 : num;
          } else {
            (rowData as Record<string, any>)[targetColKey] = rawVal;
          }
        }
      });

      newRowsData.push(rowData);
    }

    if (newRowsData.length > 0) {
      bulkAddCustomTableRows(table.id, newRowsData);
      setPasteRawText('');
      setIsPasteDrawerOpen(false);
      window.dispatchEvent(
        new CustomEvent('crm-show-toast', {
          detail: { msg: `Successfully imported ${newRowsData.length} rows into ${table.name}` },
        })
      );
    }
  };

  // Helper to load realistic sample data matching this table's defined columns
  const handleLoadSampleData = () => {
    const sampleRows = [
      ['Khalid Al-Qasimi', '+971 50 777 8899', '4500000', 'Active', '2026-10-10', 'High intent buyer, interested in 3BR Palm view'],
      ['Elena Rostova', '+971 52 333 4455', '2200000', 'Follow-up', '2026-10-12', 'Requested updated payment plan and floor plans'],
      ['Marcus Vance', '+971 55 666 1122', '8900000', 'Interested', '2026-10-15', 'Full floor investor, looking for bulk booking discount'],
    ];

    const lines = sampleRows.map((vals) => {
      return table.columns.map((col, idx) => {
        if (col.type === 'tel') return vals[1];
        if (col.type === 'number') return vals[2];
        if (col.type === 'select') return vals[3];
        if (col.type === 'date') return vals[4];
        return vals[idx] || (idx === 0 ? vals[0] : vals[5]);
      }).join('\t');
    });

    setPasteRawText(lines.join('\n'));
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
        <div className="flex flex-wrap items-center gap-2">
          {/* Local Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search table..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0B1B32] focus:bg-white w-36 sm:w-48 transition-all"
            />
          </div>

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
            onClick={() => handleAddBlankRow('top')}
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
                <th className="py-2.5 px-3 w-12 text-center bg-[#071324] font-mono text-[10px] text-amber-400 sticky left-0 z-10">
                  #
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
                      <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-slate-300 font-normal">
                        {col.type}
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
                        onClick={() => handleAddBlankRow('top')}
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
                        if (col.type === 'date') {
                          const isFollowUpCol =
                            col.name.toLowerCase().includes('follow') ||
                            col.name.toLowerCase().includes('date');

                          return (
                            <td key={col.id} className="py-1 px-2">
                              <div className="flex flex-col gap-1 min-w-[150px]">
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="date"
                                    value={cellValue || ''}
                                    onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                                    className="px-2 py-0.5 text-xs bg-slate-50 border border-slate-200 rounded font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-[#0B1B32] transition-colors"
                                  />
                                  {isFollowUpCol && cellValue && (
                                    <button
                                      type="button"
                                      onClick={() => handleSyncGoogleCalendar(row)}
                                      disabled={syncingRowId === row.id}
                                      className="p-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 transition-colors cursor-pointer"
                                      title="Schedule this date directly to Google Calendar"
                                    >
                                      {syncingRowId === row.id ? (
                                        <span className="w-3 h-3 border-2 border-amber-800 border-t-transparent rounded-full animate-spin inline-block" />
                                      ) : (
                                        <CalendarPlus className="w-3.5 h-3.5 text-[#0B1B32]" />
                                      )}
                                    </button>
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

                        // Special Number column
                        if (col.type === 'number') {
                          return (
                            <td key={col.id} className="p-0">
                              <input
                                type="number"
                                value={cellValue}
                                onChange={(e) => handleCellChange(row.id, col.key, parseFloat(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full px-2 py-1 text-xs bg-transparent border-0 focus:outline-none focus:bg-white text-slate-800 font-mono text-right"
                              />
                            </td>
                          );
                        }

                        // Special Select / Status column
                        if (col.type === 'select') {
                          return (
                            <td key={col.id} className="p-0">
                              <select
                                value={cellValue || 'New'}
                                onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                                className="w-full px-2 py-1 text-xs bg-transparent border-0 focus:outline-none focus:bg-white text-slate-800 font-medium"
                              >
                                <option value="New">New</option>
                                <option value="Active">Active</option>
                                <option value="Follow-up">Follow-up</option>
                                <option value="Interested">Interested</option>
                                <option value="Under Negotiation">Under Negotiation</option>
                                <option value="Closed">Closed</option>
                                <option value="Not Interested">Not Interested</option>
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

      {/* Bulk Import from Excel Modal */}
      {isPasteDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#0B1B32]/75 backdrop-blur-xs">
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-[#0B1B32] px-6 py-4 text-white flex items-center justify-between border-b border-[#D4AF37]/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#AA8010] text-[#0B1B32] flex items-center justify-center font-bold shadow-md">
                  <FileSpreadsheet className="w-5 h-5 text-[#0B1B32]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white font-display">
                      Bulk Import from Excel
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                      {table.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Upload an Excel file (.xlsx, .xls, .csv) or paste copied cells
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCustomTemplate}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer"
                  title="Download Excel template pre-configured with this table's columns"
                >
                  <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>Download Excel Template</span>
                </button>
                <button
                  onClick={() => setIsPasteDrawerOpen(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="bg-slate-100 px-6 pt-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setActiveImportMode('upload')}
                  className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer border-t border-x ${
                    activeImportMode === 'upload'
                      ? 'bg-white text-[#0B1B32] border-slate-200 -mb-px'
                      : 'bg-transparent text-slate-600 hover:text-slate-900 border-transparent'
                  }`}
                >
                  <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
                  <span>📁 Upload Excel File (.xlsx / .csv)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImportMode('paste')}
                  className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer border-t border-x ${
                    activeImportMode === 'paste'
                      ? 'bg-white text-[#0B1B32] border-slate-200 -mb-px'
                      : 'bg-transparent text-slate-600 hover:text-slate-900 border-transparent'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4 text-blue-600" />
                  <span>📋 Paste Copied Cells</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleDownloadCustomTemplate}
                className="sm:hidden text-xs text-[#0B1B32] font-semibold flex items-center gap-1 underline mb-2 cursor-pointer"
              >
                <Download className="w-3 h-3" /> Template
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 flex-1 overflow-y-auto text-xs text-slate-700">
              {/* Expected Columns Pill */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                <p className="font-semibold mb-1">Expected Table Columns ({table.columns.length}):</p>
                <div className="flex flex-wrap gap-1.5">
                  {table.columns.map((c, i) => (
                    <span
                      key={c.id}
                      className="px-2 py-0.5 rounded bg-white border border-amber-300 text-[11px] font-mono text-slate-700 font-bold"
                    >
                      {String.fromCharCode(65 + (i % 26))}: {c.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Mode A: File Upload */}
              {activeImportMode === 'upload' && (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelected(e.target.files[0]);
                      }
                    }}
                  />

                  {!uploadedFile ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                        isDragOver
                          ? 'border-[#D4AF37] bg-amber-50/60 scale-[0.99]'
                          : 'border-slate-300 hover:border-[#0B1B32] bg-slate-50/70 hover:bg-white'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-[#0B1B32] shadow-xs">
                        <UploadCloud className="w-7 h-7 text-[#D4AF37]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#0B1B32]">
                          Click to choose an Excel file or drag & drop here
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Supports Microsoft Excel (<strong className="text-slate-700">.xlsx, .xls</strong>) and CSV (<strong className="text-slate-700">.csv</strong>)
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B1B32] text-white text-xs font-bold mt-1 shadow-xs hover:bg-[#152945]">
                        Browse Computer
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                          <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{uploadedFile.name}</h4>
                          <p className="text-xs text-slate-500">
                            {(uploadedFile.size / 1024).toFixed(1)} KB · {parsedMatrix.length} rows read
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedFile(null);
                          setParsedMatrix([]);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
                      >
                        Change File
                      </button>
                    </div>
                  )}

                  {isParsing && (
                    <div className="text-center py-4 text-xs font-semibold text-slate-500 flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                      <span>Reading and analyzing Excel spreadsheet...</span>
                    </div>
                  )}

                  {parseError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                      <span>{parseError}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Mode B: Copy-Paste */}
              {activeImportMode === 'paste' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Paste Copied Excel Data Here:
                    </label>
                    <button
                      type="button"
                      onClick={handleLoadSampleData}
                      className="px-2.5 py-1 rounded bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#0B1B32] border border-[#D4AF37]/40 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                      <span>Auto-Fill Sample Data</span>
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    placeholder={`Paste cells directly here from your spreadsheet...\nColumn 1 \t Column 2 \t Column 3 ...`}
                    value={pasteRawText}
                    onChange={(e) => setPasteRawText(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1B32] focus:bg-white resize-y"
                  />
                </div>
              )}

              {/* Column Mapping Section */}
              {parsedMatrix.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  {/* Header Checkbox & Summary */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <span className="text-xs text-slate-700 font-semibold">
                      Detected <strong>{parsedMatrix.length}</strong> rows and <strong>{detectedColCount}</strong> columns
                    </span>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hasHeaderRow}
                        onChange={(e) => setHasHeaderRow(e.target.checked)}
                        className="rounded text-[#0B1B32] focus:ring-0"
                      />
                      <span>First row contains headers (do not insert as data row)</span>
                    </label>
                  </div>

                  {/* Column Mapping Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      Map Excel Columns to Table Columns:
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {Array.from({ length: detectedColCount }).map((_, cIdx) => {
                        const firstVal = parsedMatrix[0]?.[cIdx] || `Col ${cIdx + 1}`;
                        const currentTarget = columnMappings[cIdx] || 'SKIP';

                        return (
                          <div
                            key={cIdx}
                            className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-xs"
                          >
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span className="font-mono font-bold text-slate-700">
                                Excel Col {cIdx + 1}
                              </span>
                              <span className="truncate max-w-[120px] italic text-slate-400" title={firstVal}>
                                "{firstVal}"
                              </span>
                            </div>

                            <select
                              value={currentTarget}
                              onChange={(e) =>
                                setColumnMappings((prev) => ({
                                  ...prev,
                                  [cIdx]: e.target.value,
                                }))
                              }
                              className={`w-full px-2 py-1.5 text-xs rounded-md border font-semibold ${
                                currentTarget === 'SKIP'
                                  ? 'bg-slate-100 text-slate-400 border-slate-200'
                                  : 'bg-white text-[#0B1B32] border-[#0B1B32]'
                              }`}
                            >
                              <option value="SKIP">❌ Skip / Do Not Import</option>
                              {table.columns.map((col) => (
                                <option key={col.id} value={col.key}>
                                  ➔ {col.name} ({col.type})
                                </option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live Import Preview Table */}
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Preview (First 3 Rows):
                    </p>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-36">
                      <table className="w-full text-left text-[11px]">
                        <thead className="bg-[#0B1B32] text-white">
                          <tr>
                            <th className="p-2 w-8 text-center font-mono">#</th>
                            {table.columns.map((col) => (
                              <th key={col.id} className="p-2 font-bold whitespace-nowrap">
                                {col.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {parsedMatrix.slice(hasHeaderRow ? 1 : 0, (hasHeaderRow ? 1 : 0) + 3).map((r, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50">
                              <td className="p-2 text-center text-slate-400 font-mono text-[10px] bg-slate-50">
                                {rIdx + 1}
                              </td>
                              {table.columns.map((col) => {
                                const mappedColIdx = Object.keys(columnMappings).find(
                                  (k) => columnMappings[Number(k)] === col.key
                                );
                                const val = mappedColIdx !== undefined ? r[Number(mappedColIdx)] : '';

                                return (
                                  <td key={col.id} className="p-2 text-slate-700 whitespace-nowrap max-w-[150px] truncate">
                                    {val || <span className="text-slate-300 italic">empty</span>}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsPasteDrawerOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessBulkPaste}
                disabled={parsedMatrix.length === 0}
                className="px-6 py-2.5 bg-[#0B1B32] hover:bg-[#152945] disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-md"
              >
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                <span>Import {parsedMatrix.length > 0 ? (hasHeaderRow ? Math.max(0, parsedMatrix.length - 1) : parsedMatrix.length) : 0} Rows from Excel</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
