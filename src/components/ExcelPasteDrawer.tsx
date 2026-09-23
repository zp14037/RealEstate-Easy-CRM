import React, { useState } from 'react';
import { 
  ClipboardPaste, 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Sparkles,
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { ProjectLead, SecondaryLead } from '../types';
import { getTodayDateString } from '../data/mockData';

interface ExcelPasteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  targetSheet: 'project' | 'secondary';
  onImportProjects: (leads: Partial<ProjectLead>[]) => void;
  onImportSecondary: (leads: Partial<SecondaryLead>[]) => void;
}

export const ExcelPasteDrawer: React.FC<ExcelPasteDrawerProps> = ({
  isOpen,
  onClose,
  targetSheet,
  onImportProjects,
  onImportSecondary,
}) => {
  const [rawText, setRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [hasParsed, setHasParsed] = useState(false);

  if (!isOpen) return null;

  // Clean and parse tab-delimited (Excel/Google Sheets copy) or CSV text
  const handleParse = (textToParse: string = rawText) => {
    if (!textToParse.trim()) {
      setParsedRows([]);
      setHasParsed(false);
      return;
    }

    const lines = textToParse
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const results: any[] = [];

    lines.forEach((line) => {
      // Check if tab-delimited or comma-delimited
      let cells: string[] = [];
      if (line.includes('\t')) {
        cells = line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      } else {
        // Simple CSV splitter handling quoted values
        cells = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      }

      if (cells.length === 0 || cells.every((c) => !c)) return;

      if (targetSheet === 'project') {
        // Map 11 potential project columns or raw subset (Project Name, Developer, Community, Unit, Type, Handover, Visited, Owner, Contact)
        const row: Partial<ProjectLead> = {
          projectName: cells[0] || 'Off-Plan Project',
          developer: cells[1] || 'Emaar Properties',
          community: cells[2] || 'Dubai',
          unitDetails: cells[3] || '',
          propertyType: (cells[4] as any) || 'Apartment',
          handoverDetails: cells[5] || 'Q4 2026',
          visitedDate: cells[6] || getTodayDateString(),
          ownerName: cells[7] || cells[0] || 'New Lead',
          contactNo: cells[8] || (cells[1] && /^[\d+ -]{7,}$/.test(cells[1]) ? cells[1] : ''),
          callStatus: 'New', // Left ready for agent to inline edit
          followUpDate: '', // Left blank for agent to schedule
          notes: cells[9] || 'Pasted from Excel list',
        };
        // Smart fallback if raw lead is just [Name, Phone, Property]
        if (cells.length <= 3) {
          row.ownerName = cells[0] || 'Raw Lead';
          row.contactNo = cells[1] || '';
          row.projectName = cells[2] || 'Interest Pending';
        }
        results.push(row);
      } else {
        // Secondary Market: Name, Mobile, Property, Client Type, Date, Budget, Expectation/Requirements
        const rawBudget = cells[5] ? Number(cells[5].replace(/[^0-9]/g, '')) : 0;
        const row: Partial<SecondaryLead> = {
          name: cells[0] || 'New Client',
          mobile: cells[1] || '',
          property: cells[2] || 'Dubai Property',
          clientType: (cells[3] === 'Seller' || cells[3] === 'seller' ? 'Seller' : 'Buyer'),
          dateContacted: cells[4] || getTodayDateString(),
          budget: rawBudget || 2000000,
          expectationRequirements: cells[6] || cells[3] || 'Raw lead requirement',
          remarksStatus: 'New Lead',
          followUpDate: '', // Left blank for agent to schedule
          notes: cells[7] || 'Pasted from Excel list',
        };
        if (cells.length <= 3) {
          row.name = cells[0] || 'Raw Client';
          row.mobile = cells[1] || '';
          row.property = cells[2] || 'General Inquiry';
        }
        results.push(row);
      }
    });

    setParsedRows(results);
    setHasParsed(true);
  };

  const handleApplyImport = () => {
    if (parsedRows.length === 0) return;
    if (targetSheet === 'project') {
      onImportProjects(parsedRows);
    } else {
      onImportSecondary(parsedRows);
    }
    setRawText('');
    setParsedRows([]);
    setHasParsed(false);
    onClose();
  };

  const loadSampleData = () => {
    let sample = '';
    if (targetSheet === 'project') {
      sample = `Skyline Horizon\tEmaar Properties\tDubai Marina\t2BR High Floor\tApartment\tQ4 2026\t2026-08-20\tSaeed Al-Ghamdi\t+971 50 123 4567
Parkside Views\tSobha Realty\tMBR City\t3BR Villa\tVilla\tQ2 2027\t2026-08-21\tMaria Gonzalez\t+971 55 987 6543
Creek Gate\tEmaar Properties\tDubai Creek Harbour\t1BR Corner\tApartment\tQ1 2027\t2026-08-22\tLeonid V\t+971 52 444 3322`;
    } else {
      sample = `Mansoor Rashid\t+971 50 888 1122\tDubai Hills Estate Villa\tBuyer\t2026-08-22\t7500000\tLooking for 4BR single row with garden
Fatima Al-Zahra\t+971 55 222 3344\tPalm Views East 1BR\tSeller\t2026-08-21\t1850000\tRented unit, wants immediate investor cash buyer`;
    }
    setRawText(sample);
    handleParse(sample);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1B32]/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-lg shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#0B1B32] text-white px-6 py-4 flex items-center justify-between border-b border-[#D4AF37]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#D4AF37] text-[#0B1B32] flex items-center justify-center font-bold">
              <ClipboardPaste className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white font-display">
                Bulk Import / Paste from Excel
              </h3>
              <p className="text-xs text-slate-300">
                Target Sheet:{' '}
                <span className="text-[#D4AF37] font-semibold">
                  {targetSheet === 'project' ? 'Project & Off-Plan Leads' : 'Buyers & Sellers'}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700 flex-1">
          
          <div className="bg-slate-50 border border-slate-200 rounded p-3 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-[#0B1B32]">How Excel Copy-Paste works:</p>
              <p className="text-slate-600">
                Select rows in Excel or Google Sheets, press <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">Ctrl+C</kbd> / <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">Cmd+C</kbd>, and paste here with <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px]">Ctrl+V</kbd>. Raw leads with just (Name, Number, Property) will be automatically formatted with blank Call Status and Follow-up Dates ready for your daily call schedule.
              </p>
            </div>
          </div>

          {/* Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold uppercase tracking-wider text-[11px] text-slate-600">
                Paste Raw Tab-Separated Rows / CSV Below:
              </label>
              <button
                type="button"
                onClick={loadSampleData}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Load Sample Excel Rows
              </button>
            </div>
            
            <textarea
              rows={6}
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                handleParse(e.target.value);
              }}
              placeholder={
                targetSheet === 'project'
                  ? 'Project Name\tDeveloper\tCommunity\tUnit Details\tType\tHandover\tVisited Date\tOwner Name\tContact No\nBurj Crown\tEmaar\tDowntown\t2BR\tApartment\tQ4 2026\t2026-08-22\tTariq\t+971501234567'
                  : 'Client Name\tMobile\tProperty\tBuyer/Seller\tDate\tBudget\tExpectation\nKarim Boulos\t+971559018844\tSidra Villa\tSeller\t2026-08-22\t6800000\tPlot 5100 sqft'
              }
              className="w-full font-mono text-xs p-3 bg-[#F8FAFC] border border-slate-300 rounded-md focus:outline-none focus:border-[#D4AF37] focus:bg-white resize-y"
            />
          </div>

          {/* Parsed Preview Table */}
          {hasParsed && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0B1B32] text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Ready to Insert ({parsedRows.length} Rows Detected)
                </span>
                <span className="text-[11px] text-slate-500">
                  Call Status & Follow-up Dates will be left open for inline editing
                </span>
              </div>

              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded bg-white">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0">
                    <tr>
                      <th className="py-2 px-2.5 border-b border-slate-200">#</th>
                      <th className="py-2 px-2.5 border-b border-slate-200">Name / Owner</th>
                      <th className="py-2 px-2.5 border-b border-slate-200">Contact No.</th>
                      <th className="py-2 px-2.5 border-b border-slate-200">
                        {targetSheet === 'project' ? 'Project / Developer' : 'Property / Budget'}
                      </th>
                      <th className="py-2 px-2.5 border-b border-slate-200">Details / Requirements</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-1.5 px-2.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-1.5 px-2.5 font-bold text-slate-800">
                          {targetSheet === 'project' ? row.ownerName : row.name}
                        </td>
                        <td className="py-1.5 px-2.5 font-mono text-slate-600">
                          {targetSheet === 'project' ? row.contactNo : row.mobile}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-700">
                          {targetSheet === 'project' 
                            ? `${row.projectName} (${row.developer})` 
                            : `${row.property} (AED ${row.budget?.toLocaleString()})`}
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-500 max-w-xs truncate">
                          {targetSheet === 'project' ? row.unitDetails : row.expectationRequirements}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer Controls */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded text-slate-600 hover:text-slate-800 text-xs font-semibold"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleApplyImport}
            disabled={parsedRows.length === 0}
            className={`px-5 py-2 rounded text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
              parsedRows.length > 0
                ? 'bg-[#0B1B32] hover:bg-[#152945] text-white'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <span>Insert {parsedRows.length} Rows into Spreadsheet</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
