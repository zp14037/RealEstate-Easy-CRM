import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2, 
  X, 
  Sparkles, 
  HelpCircle, 
  Download, 
  FileText, 
  ClipboardPaste,
  AlertCircle
} from 'lucide-react';
import { ProjectLead } from '../types';
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
  targetSheet: 'project' | 'secondary';
  onImportProjects: (leads: Partial<ProjectLead>[]) => void;
  onImportSecondary?: (leads: any[]) => void;
}

const PROJECT_COLUMNS: { key: keyof ProjectLead; name: string }[] = [
  { key: 'ownerName', name: 'Client / Owner Name' },
  { key: 'contactNo', name: 'Contact Phone / Mobile' },
  { key: 'projectName', name: 'Project / Property Name' },
  { key: 'developer', name: 'Developer (e.g. Emaar, Sobha)' },
  { key: 'community', name: 'Community / Location' },
  { key: 'unitDetails', name: 'Unit Details (e.g. 2BR, 1350 sqft)' },
  { key: 'propertyType', name: 'Property Type' },
  { key: 'budgetAED', name: 'Budget (AED)' },
  { key: 'handoverDetails', name: 'Handover Date' },
  { key: 'notes', name: 'Notes / Remarks' },
];

export const ExcelPasteDrawer: React.FC<ExcelPasteDrawerProps> = ({
  isOpen,
  onClose,
  onImportProjects,
}) => {
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

  // Reset when closed or opened
  useEffect(() => {
    if (!isOpen) {
      setUploadedFile(null);
      setRawText('');
      setParsedMatrix([]);
      setParseError(null);
      setColumnMappings({});
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

  // Auto-detect column mappings whenever parsedMatrix changes
  useEffect(() => {
    if (parsedMatrix.length === 0) {
      setColumnMappings({});
      return;
    }

    const firstRow = parsedMatrix[0] || [];
    const targets = PROJECT_COLUMNS.map((c) => ({ key: c.key as string, name: c.name }));

    // Detect if first row looks like a header
    const looksLikeHeader = firstRow.some((val) => {
      const v = val.toLowerCase();
      return /name|phone|contact|mobile|budget|price|status|date|notes|project|developer|community|unit|id/i.test(v);
    });
    setHasHeaderRow(looksLikeHeader);

    const newMappings: Record<number, string> = {};
    for (let cIdx = 0; cIdx < detectedColCount; cIdx++) {
      const headerTitle = firstRow[cIdx] || '';
      const sampleValues = parsedMatrix.slice(looksLikeHeader ? 1 : 0, 4).map((r) => r[cIdx] || '');
      const guessed = guessColumnMapping(headerTitle, sampleValues, targets);

      if (guessed) {
        newMappings[cIdx] = guessed;
      } else if (PROJECT_COLUMNS[cIdx]) {
        newMappings[cIdx] = PROJECT_COLUMNS[cIdx].key as string;
      } else {
        newMappings[cIdx] = 'SKIP';
      }
    }

    setColumnMappings(newMappings);
  }, [parsedMatrix, detectedColCount]);

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

  const handleDownloadTemplate = () => {
    const headers = PROJECT_COLUMNS.map((c) => c.name);
    const sample = [
      [
        'Saeed Al-Ghamdi',
        '+971 50 123 4567',
        'Skyline Horizon',
        'Emaar Properties',
        'Dubai Marina',
        '2BR High Floor',
        'Apartment',
        '4500000',
        'Q4 2026',
        'Interested in high floor sea view',
      ],
      [
        'Maria Gonzalez',
        '+971 55 987 6543',
        'Parkside Views',
        'Sobha Realty',
        'MBR City',
        '3BR Villa',
        'Villa',
        '8200000',
        'Q2 2027',
        'Requested payment plan breakdown',
      ],
    ];
    downloadExcelTemplate('Dubai_Project_Leads_Template.xlsx', headers, sample);
  };

  const handleApplyImport = () => {
    if (parsedMatrix.length === 0) return;

    const startRow = hasHeaderRow ? 1 : 0;
    const results: Partial<ProjectLead>[] = [];

    for (let r = startRow; r < parsedMatrix.length; r++) {
      const cells = parsedMatrix[r];
      if (!cells || cells.every((c) => !c.trim())) continue;

      const lead: Partial<ProjectLead> = {
        projectName: 'Off-Plan Project',
        developer: 'Emaar Properties',
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
  };

  const loadSampleData = () => {
    const sample = `Skyline Horizon\tEmaar Properties\tDubai Marina\t2BR High Floor\tApartment\tQ4 2026\t2026-09-24\tSaeed Al-Ghamdi\t+971 50 123 4567\t4500000\tInterested in sea view
Parkside Views\tSobha Realty\tMBR City\t3BR Villa\tVilla\tQ2 2027\t2026-09-24\tMaria Gonzalez\t+971 55 987 6543\t8200000\tRequested payment plan
Creek Gate\tEmaar Properties\tDubai Creek Harbour\t1BR Corner\tApartment\tQ1 2027\t2026-09-24\tLeonid Volkov\t+971 52 444 3322\t2100000\tImmediate cash buyer`;
    setRawText(sample);
  };

  if (!isOpen) return null;

  const validRowCount = parsedMatrix.length > 0 ? (hasHeaderRow ? Math.max(0, parsedMatrix.length - 1) : parsedMatrix.length) : 0;

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
              <p className="text-xs text-slate-300">
                Target: <span className="text-[#D4AF37] font-semibold">Project & Off-Plan Leads</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer"
              title="Download Excel Starter Template"
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
            className="sm:hidden text-xs text-[#0B1B32] font-semibold flex items-center gap-1 underline mb-2"
          >
            <Download className="w-3 h-3" /> Template
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 flex-1">
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
                  Paste Raw Cells from Excel / Sheets:
                </label>
                <button
                  type="button"
                  onClick={loadSampleData}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                  Auto-Fill Sample Excel Rows
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

          {/* Column Mapping Section (Only appears when data is loaded) */}
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
                  <span>First row contains headers (do not insert as lead)</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Map Excel Columns to CRM Lead Fields:
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
                          {PROJECT_COLUMNS.map((col) => (
                            <option key={col.key as string} value={col.key as string}>
                              ➔ {col.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Preview Table */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Live Preview (First 3 Rows):
                </p>
                <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-40">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-[#0B1B32] text-white">
                      <tr>
                        <th className="p-2 w-8 text-center font-mono">#</th>
                        <th className="p-2 font-bold whitespace-nowrap">Client / Owner</th>
                        <th className="p-2 font-bold whitespace-nowrap">Contact No.</th>
                        <th className="p-2 font-bold whitespace-nowrap">Project</th>
                        <th className="p-2 font-bold whitespace-nowrap">Developer</th>
                        <th className="p-2 font-bold whitespace-nowrap">Unit</th>
                        <th className="p-2 font-bold whitespace-nowrap">Budget AED</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {parsedMatrix.slice(hasHeaderRow ? 1 : 0, (hasHeaderRow ? 1 : 0) + 3).map((r, rIdx) => {
                        const getVal = (key: string) => {
                          const cIdx = Object.keys(columnMappings).find((k) => columnMappings[Number(k)] === key);
                          return cIdx !== undefined ? r[Number(cIdx)] : '';
                        };

                        return (
                          <tr key={rIdx} className="hover:bg-slate-50">
                            <td className="p-2 text-center text-slate-400 font-mono text-[10px] bg-slate-50">
                              {rIdx + 1}
                            </td>
                            <td className="p-2 font-bold text-slate-800 whitespace-nowrap">
                              {getVal('ownerName') || <span className="text-slate-300 italic">empty</span>}
                            </td>
                            <td className="p-2 font-mono text-slate-600 whitespace-nowrap">
                              {getVal('contactNo') || <span className="text-slate-300 italic">empty</span>}
                            </td>
                            <td className="p-2 text-slate-700 whitespace-nowrap">
                              {getVal('projectName') || <span className="text-slate-300 italic">empty</span>}
                            </td>
                            <td className="p-2 text-slate-700 whitespace-nowrap">
                              {getVal('developer') || <span className="text-slate-300 italic">empty</span>}
                            </td>
                            <td className="p-2 text-slate-700 whitespace-nowrap">
                              {getVal('unitDetails') || <span className="text-slate-300 italic">empty</span>}
                            </td>
                            <td className="p-2 text-slate-700 font-mono whitespace-nowrap">
                              {getVal('budgetAED') || <span className="text-slate-300 italic">empty</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
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
            <span>Import {validRowCount} Leads from Excel</span>
          </button>
        </div>

      </div>
    </div>
  );
};
