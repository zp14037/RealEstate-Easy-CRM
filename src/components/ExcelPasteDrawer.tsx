import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2, 
  X, 
  Sparkles, 
  Download, 
  ClipboardPaste,
  AlertCircle
} from 'lucide-react';
import { CustomTable, ProjectLead } from '../types';
import { useCrm } from '../context/CrmContext';
import { getTodayDateString } from '../data/mockData';
import { 
  parseSpreadsheetText, 
  parseExcelFile, 
  downloadExcelTemplate, 
  guessColumnMapping 
} from '../utils/spreadsheetParser';

interface ExcelPasteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  targetTable?: CustomTable;
  onImportCustomRows?: (tableId: string, rows: Record<string, any>[]) => void;
  targetSheet?: 'project' | 'secondary' | 'custom';
  onImportProjects?: (leads: Partial<ProjectLead>[]) => void;
  onImportSecondary?: (leads: any[]) => void;
}

export const ExcelPasteDrawer: React.FC<ExcelPasteDrawerProps> = ({
  isOpen,
  onClose,
  targetTable,
  onImportCustomRows,
  onImportProjects,
}) => {
  const { customTables, activeTab, bulkAddCustomTableRows } = useCrm();

  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [activeMode, setActiveMode] = useState<'upload' | 'paste'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [parsedMatrix, setParsedMatrix] = useState<string[][]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [hasHeaderRow, setHasHeaderRow] = useState(true);
  const [columnMappings, setColumnMappings] = useState<Record<number, string>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync selected table whenever modal opens or active table/prop changes
  useEffect(() => {
    if (isOpen) {
      if (targetTable) {
        setSelectedTableId(targetTable.id);
      } else {
        const found = customTables.find((t) => t.id === activeTab) || customTables[0];
        if (found) {
          setSelectedTableId(found.id);
        }
      }
    }
  }, [isOpen, targetTable, activeTab, customTables]);

  const activeCustomTable = useMemo(() => {
    return (
      customTables.find((t) => t.id === selectedTableId) ||
      targetTable ||
      customTables[0]
    );
  }, [selectedTableId, targetTable, customTables]);

  // Reset file/text state when closed or opened
  useEffect(() => {
    if (!isOpen) {
      setUploadedFile(null);
      setRawText('');
      setParsedMatrix([]);
      setParseError(null);
      setColumnMappings({});
      setIsParsing(false);
    }
  }, [isOpen]);

  // Handle text paste parsing
  useEffect(() => {
    if (activeMode === 'paste') {
      const matrix = parseSpreadsheetText(rawText);
      setParsedMatrix(matrix);
      setParseError(null);
    }
  }, [rawText, activeMode]);

  // Detected column count
  const detectedColCount = useMemo(() => {
    if (parsedMatrix.length === 0) return 0;
    return Math.max(...parsedMatrix.map((r) => r.length));
  }, [parsedMatrix]);

  // Auto-detect column mappings whenever parsedMatrix or active table changes
  useEffect(() => {
    if (parsedMatrix.length === 0) {
      setColumnMappings({});
      return;
    }

    const availableColumns = activeCustomTable ? activeCustomTable.columns : [];
    const firstRow = parsedMatrix[0] || [];
    const targets = availableColumns.map((c) => ({ key: c.key, name: c.name }));

    // Detect if first row looks like a header
    const looksLikeHeader = firstRow.some((val) => {
      const v = val.toLowerCase().trim();
      return (
        /name|phone|contact|mobile|budget|price|status|date|notes|remark|email|address|lead/i.test(v) ||
        targets.some((t) => t.name.toLowerCase() === v || t.key.toLowerCase() === v)
      );
    });
    setHasHeaderRow(looksLikeHeader);

    const newMappings: Record<number, string> = {};
    for (let cIdx = 0; cIdx < detectedColCount; cIdx++) {
      const headerTitle = firstRow[cIdx] || '';
      const sampleValues = parsedMatrix
        .slice(looksLikeHeader ? 1 : 0, 4)
        .map((r) => r[cIdx] || '');
      const guessed = guessColumnMapping(headerTitle, sampleValues, targets);

      if (guessed) {
        newMappings[cIdx] = guessed;
      } else if (availableColumns[cIdx]) {
        newMappings[cIdx] = availableColumns[cIdx].key;
      } else {
        newMappings[cIdx] = 'SKIP';
      }
    }

    setColumnMappings(newMappings);
  }, [parsedMatrix, detectedColCount, activeCustomTable]);

  // File Upload Handler
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

  // Download Excel template containing ONLY this created table's columns
  const handleDownloadTemplate = () => {
    if (!activeCustomTable || activeCustomTable.columns.length === 0) {
      window.dispatchEvent(
        new CustomEvent('crm-show-toast', {
          detail: { msg: 'Please create a table with columns first before downloading a template.', isError: true },
        })
      );
      return;
    }

    // ONLY the columns created in this table
    const headers = activeCustomTable.columns.map((c) => c.name);

    // Realistic sample rows tailored to each column's type
    const sampleRows = [
      activeCustomTable.columns.map((col) => {
        const lowerName = col.name.toLowerCase();
        if (col.type === 'tel' || lowerName.includes('phone') || lowerName.includes('mobile') || lowerName.includes('contact')) {
          return '+971 50 123 4567';
        }
        if (col.type === 'aed' || lowerName.includes('budget') || lowerName.includes('price') || lowerName.includes('value')) {
          return '2500000';
        }
        if (col.type === 'number') {
          return '150';
        }
        if (col.type === 'select') {
          return col.options && col.options.length > 0 ? col.options[0] : 'Active';
        }
        if (col.type === 'date' || lowerName.includes('date')) {
          return getTodayDateString();
        }
        if (lowerName.includes('name') || lowerName.includes('client') || lowerName.includes('owner')) {
          return 'Ahmed Al-Mansoori';
        }
        if (lowerName.includes('email')) {
          return 'ahmed@example.com';
        }
        if (lowerName.includes('project') || lowerName.includes('property') || lowerName.includes('building')) {
          return 'Downtown Heights';
        }
        if (lowerName.includes('note') || lowerName.includes('remark')) {
          return 'Interested in 2BR unit, requested brochure';
        }
        return `Sample ${col.name}`;
      }),
      activeCustomTable.columns.map((col) => {
        const lowerName = col.name.toLowerCase();
        if (col.type === 'tel' || lowerName.includes('phone') || lowerName.includes('mobile') || lowerName.includes('contact')) {
          return '+971 55 987 6543';
        }
        if (col.type === 'aed' || lowerName.includes('budget') || lowerName.includes('price') || lowerName.includes('value')) {
          return '4200000';
        }
        if (col.type === 'number') {
          return '300';
        }
        if (col.type === 'select') {
          return col.options && col.options.length > 1 ? col.options[1] : (col.options?.[0] || 'Follow-up');
        }
        if (col.type === 'date' || lowerName.includes('date')) {
          return getTodayDateString();
        }
        if (lowerName.includes('name') || lowerName.includes('client') || lowerName.includes('owner')) {
          return 'Sarah Jenkins';
        }
        if (lowerName.includes('email')) {
          return 'sarah@example.com';
        }
        if (lowerName.includes('project') || lowerName.includes('property') || lowerName.includes('building')) {
          return 'Marina Bay Residences';
        }
        if (lowerName.includes('note') || lowerName.includes('remark')) {
          return 'Requested payment plan breakdown';
        }
        return `Sample ${col.name} 2`;
      }),
    ];

    const safeName = activeCustomTable.name.replace(/[^a-zA-Z0-9_\-]/g, '_');
    downloadExcelTemplate(`${safeName}_Template.xlsx`, headers, sampleRows);
  };

  // Bulk Apply Import
  const handleApplyImport = () => {
    if (parsedMatrix.length === 0) return;

    if (activeCustomTable) {
      const startRow = hasHeaderRow ? 1 : 0;
      const newRowsData: Record<string, any>[] = [];

      for (let r = startRow; r < parsedMatrix.length; r++) {
        const cells = parsedMatrix[r];
        if (!cells || cells.every((c) => !c || !c.trim())) continue;

        const rowData: Record<string, any> = {};

        // 1. Initialize default values based on table's defined columns
        activeCustomTable.columns.forEach((col) => {
          if (col.type === 'date') {
            rowData[col.key] = getTodayDateString();
            rowData[`${col.key}_time`] = '10:00';
          } else if (col.type === 'number' || col.type === 'aed') {
            rowData[col.key] = 0;
          } else if (col.type === 'select') {
            rowData[col.key] = col.options?.[0] || 'New';
          } else {
            rowData[col.key] = '';
          }
        });

        // 2. Map cells into corresponding columns
        Object.entries(columnMappings).forEach(([colIdxStr, targetColKey]) => {
          const colIdx = Number(colIdxStr);
          if (targetColKey === 'SKIP') return;

          const rawVal = cells[colIdx] !== undefined ? cells[colIdx].trim() : '';
          const targetCol = activeCustomTable.columns.find((c) => c.key === targetColKey);

          if (targetCol) {
            if (targetCol.type === 'number' || targetCol.type === 'aed') {
              const num = parseFloat(rawVal.replace(/[^0-9.-]/g, ''));
              rowData[targetColKey] = isNaN(num) ? 0 : num;
            } else {
              rowData[targetColKey] = rawVal;
            }
          }
        });

        newRowsData.push(rowData);
      }

      if (newRowsData.length > 0) {
        if (onImportCustomRows) {
          onImportCustomRows(activeCustomTable.id, newRowsData);
        } else {
          bulkAddCustomTableRows(activeCustomTable.id, newRowsData);
        }

        onClose();
        window.dispatchEvent(
          new CustomEvent('crm-show-toast', {
            detail: { msg: `Successfully imported ${newRowsData.length} leads into "${activeCustomTable.name}"!` },
          })
        );
      }
      return;
    }

    // Fallback if legacy project leads handler is passed
    if (onImportProjects) {
      const startRow = hasHeaderRow ? 1 : 0;
      const results: Partial<ProjectLead>[] = [];

      for (let r = startRow; r < parsedMatrix.length; r++) {
        const cells = parsedMatrix[r];
        if (!cells || cells.every((c) => !c.trim())) continue;

        const lead: Partial<ProjectLead> = {
          projectName: 'Off-Plan Project',
          developer: 'Developer',
          community: 'Dubai',
          unitDetails: '',
          propertyType: 'Apartment',
          handoverDetails: 'Q4 2026',
          visitedDate: getTodayDateString(),
          ownerName: 'New Lead',
          contactNo: '',
          callStatus: 'New',
          followUpDate: '',
          followUpTime: '10:00',
          budgetAED: 0,
          notes: '',
        };

        Object.entries(columnMappings).forEach(([colIdxStr, targetKey]: [string, string]) => {
          const colIdx = Number(colIdxStr);
          if (targetKey === 'SKIP') return;

          const val = cells[colIdx] !== undefined ? cells[colIdx].trim() : '';
          if (targetKey === 'budgetAED') {
            const num = parseFloat(val.replace(/[^0-9.-]/g, ''));
            lead.budgetAED = isNaN(num) ? 0 : num;
          } else if (targetKey === 'propertyType') {
            lead.propertyType = (val as any) || 'Apartment';
          } else {
            (lead as Record<string, any>)[targetKey] = val;
          }
        });

        results.push(lead);
      }

      if (results.length > 0) {
        onImportProjects(results);
        onClose();
        window.dispatchEvent(
          new CustomEvent('crm-show-toast', {
            detail: { msg: `Successfully imported ${results.length} project leads from Excel!` },
          })
        );
      }
    }
  };

  const loadSampleData = () => {
    if (!activeCustomTable || activeCustomTable.columns.length === 0) return;

    const sampleSets = [
      ['Khalid Al-Qasimi', '+971 50 777 8899', '4500000', 'Active', getTodayDateString(), 'High intent buyer, interested in 3BR Palm view'],
      ['Elena Rostova', '+971 52 333 4455', '2200000', 'Follow-up', getTodayDateString(), 'Requested updated payment plan and floor plans'],
      ['Marcus Vance', '+971 55 666 1122', '8900000', 'Interested', getTodayDateString(), 'Full floor investor, looking for bulk booking'],
    ];

    const lines = sampleSets.map((vals) => {
      return activeCustomTable.columns
        .map((col, idx) => {
          const lowerName = col.name.toLowerCase();
          if (col.type === 'tel' || lowerName.includes('phone') || lowerName.includes('contact')) return vals[1];
          if (col.type === 'aed' || col.type === 'number' || lowerName.includes('budget') || lowerName.includes('price')) return vals[2];
          if (col.type === 'select' || lowerName.includes('status')) return (col.options && col.options[0]) || vals[3];
          if (col.type === 'date' || lowerName.includes('date')) return vals[4];
          if (lowerName.includes('name') || lowerName.includes('client')) return vals[0];
          return vals[idx] || vals[5] || `Sample ${col.name}`;
        })
        .join('\t');
    });

    setRawText(lines.join('\n'));
  };

  if (!isOpen) return null;

  const validRowCount =
    parsedMatrix.length > 0
      ? hasHeaderRow
        ? Math.max(0, parsedMatrix.length - 1)
        : parsedMatrix.length
      : 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1B32]/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0B1B32] text-white px-6 py-4 flex items-center justify-between border-b border-[#D4AF37]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#AA8010] text-[#0B1B32] flex items-center justify-center font-bold shadow-md">
              <FileSpreadsheet className="w-5 h-5 text-[#0B1B32]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white font-display">
                  Bulk Import from Excel
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  .xlsx · .xls · .csv
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300">
                <span>Target:</span>
                {customTables.length > 1 ? (
                  <select
                    value={selectedTableId}
                    onChange={(e) => {
                      setSelectedTableId(e.target.value);
                      setColumnMappings({});
                    }}
                    className="bg-[#152945] text-[#D4AF37] font-semibold text-xs rounded px-2 py-0.5 border border-[#D4AF37]/50 focus:outline-none cursor-pointer"
                  >
                    {customTables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.columns.length} columns)
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-[#D4AF37] font-semibold">
                    {activeCustomTable
                      ? `${activeCustomTable.name} (${activeCustomTable.columns.length} columns)`
                      : 'No Custom Table Available'}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer"
              title={`Download template containing only ${activeCustomTable?.name || 'this table'}'s columns`}
            >
              <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Download Excel Template</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-100 px-6 pt-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setActiveMode('upload')}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer border-t border-x ${
                activeMode === 'upload'
                  ? 'bg-white text-[#0B1B32] border-slate-200 -mb-px'
                  : 'bg-transparent text-slate-600 hover:text-slate-900 border-transparent'
              }`}
            >
              <UploadCloud className="w-4 h-4 text-[#D4AF37]" />
              <span>📁 Upload Excel File (.xlsx / .csv)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('paste')}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer border-t border-x ${
                activeMode === 'paste'
                  ? 'bg-white text-[#0B1B32] border-slate-200 -mb-px'
                  : 'bg-transparent text-slate-600 hover:text-slate-900 border-transparent'
              }`}
            >
              <ClipboardPaste className="w-4 h-4 text-blue-600" />
              <span>📋 Paste Copied Cells</span>
            </button>
          </div>

          <button
            onClick={handleDownloadTemplate}
            className="sm:hidden text-xs text-[#0B1B32] font-semibold flex items-center gap-1 underline mb-2 cursor-pointer"
          >
            <Download className="w-3 h-3" /> Template
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 flex-1">
          {/* Target Columns Summary Pill */}
          {activeCustomTable && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-bold text-amber-950">
                  Target Table: <span className="underline">{activeCustomTable.name}</span> ({activeCustomTable.columns.length} columns)
                </p>
                <span className="text-[11px] text-amber-800 font-medium">
                  Downloaded template will contain ONLY these columns
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeCustomTable.columns.map((c, i) => (
                  <span
                    key={c.id}
                    className="px-2 py-0.5 rounded bg-white border border-amber-300 text-[11px] font-mono text-slate-800 font-semibold shadow-2xs"
                  >
                    <span className="text-amber-600 mr-1">{String.fromCharCode(65 + (i % 26))}.</span>
                    {c.name}
                    {c.type === 'aed' && <span className="ml-1 text-[10px] text-emerald-700 font-bold">(AED)</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Mode 1: File Drag & Drop */}
          {activeMode === 'upload' && (
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

          {/* Mode 2: Copy-Paste */}
          {activeMode === 'paste' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold uppercase tracking-wider text-[11px] text-slate-600">
                  Paste Raw Cells from Excel / Google Sheets:
                </label>
                <button
                  type="button"
                  onClick={loadSampleData}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                  Auto-Fill Sample Rows
                </button>
              </div>
              
              <textarea
                rows={5}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste copied Excel cells here directly (Ctrl+V)..."
                className="w-full font-mono text-xs p-3 bg-[#F8FAFC] border border-slate-300 rounded-lg focus:outline-none focus:border-[#D4AF37] focus:bg-white resize-y"
              />
            </div>
          )}

          {/* Column Mapping Section (Appears when data is loaded) */}
          {parsedMatrix.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-slate-200">
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
                            Excel Column {cIdx + 1}
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
                          {activeCustomTable?.columns.map((col) => (
                            <option key={col.id} value={col.key}>
                              ➔ {col.name} ({col.type === 'aed' ? 'AED' : col.type})
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Table */}
              {activeCustomTable && (
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Live Preview (First 3 Rows):
                  </p>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-40">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#0B1B32] text-white">
                        <tr>
                          <th className="p-2 w-8 text-center font-mono">#</th>
                          {activeCustomTable.columns.map((col) => (
                            <th key={col.id} className="p-2 font-bold whitespace-nowrap">
                              {col.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {parsedMatrix
                          .slice(hasHeaderRow ? 1 : 0, (hasHeaderRow ? 1 : 0) + 3)
                          .map((r, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50">
                              <td className="p-2 text-center text-slate-400 font-mono text-[10px] bg-slate-50">
                                {rIdx + 1}
                              </td>
                              {activeCustomTable.columns.map((col) => {
                                const mappedColIdx = Object.keys(columnMappings).find(
                                  (k) => columnMappings[Number(k)] === col.key
                                );
                                const val =
                                  mappedColIdx !== undefined ? r[Number(mappedColIdx)] : '';

                                return (
                                  <td
                                    key={col.id}
                                    className="p-2 text-slate-700 whitespace-nowrap max-w-[150px] truncate"
                                  >
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
              )}
            </div>
          )}

        </div>

        {/* Footer Controls */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-600 hover:text-slate-800 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleApplyImport}
            disabled={validRowCount === 0}
            className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-md cursor-pointer ${
              validRowCount > 0
                ? 'bg-[#0B1B32] hover:bg-[#152945] text-white hover:shadow-lg'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
            <span>
              Import {validRowCount} Leads into {activeCustomTable?.name || 'Table'}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
