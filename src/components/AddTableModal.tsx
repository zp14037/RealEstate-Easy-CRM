import React, { useState } from 'react';
import { 
  X, 
  TableProperties, 
  Plus, 
  Trash2, 
  Sparkles, 
  Columns3, 
  Hash, 
  Calendar, 
  Phone, 
  Type, 
  ListFilter,
  CheckCircle2,
  CalendarPlus,
  Lock
} from 'lucide-react';
import { CustomTable, CustomTableColumn } from '../types';

import { getStoredAccessToken, getStoredGoogleUser } from '../services/googleAuth';

interface AddTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTable: (table: Omit<CustomTable, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

interface FormColumn {
  name: string;
  type: CustomTableColumn['type'];
  isDefault?: boolean;
  isLeadValue?: boolean;
}

const DEFAULT_REQUIRED_COLUMNS: FormColumn[] = [
  { name: 'Client Name', type: 'text' },
  { name: 'Contact Number', type: 'tel' },
  { name: 'Budget AED', type: 'aed', isLeadValue: true },
  { name: 'First Contacted', type: 'date', isDefault: true },
  { name: 'Recent Contacted', type: 'date', isDefault: true },
  { name: 'Status', type: 'select', isDefault: true },
  { name: 'Follow-up Date & Time', type: 'date', isDefault: true },
  { name: 'Notes', type: 'text' },
];

export const AddTableModal: React.FC<AddTableModalProps> = ({
  isOpen,
  onClose,
  onCreateTable,
}) => {
  const [tableName, setTableName] = useState('');
  const [description, setDescription] = useState('');
  const [quickInput, setQuickInput] = useState('');
  const [columns, setColumns] = useState<FormColumn[]>(
    DEFAULT_REQUIRED_COLUMNS
  );
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

  if (!isOpen) return null;

  const handleAddColumn = () => {
    setColumns((prev) => [...prev, { name: `Column ${prev.length + 1}`, type: 'text' }]);
  };

  const handleRemoveColumn = (index: number) => {
    if (columns.length <= 1) return;
    setColumns((prev) => prev.filter((_, i) => i !== index));
  };

  const handleColumnNameChange = (index: number, newName: string) => {
    setColumns((prev) =>
      prev.map((col, i) => (i === index ? { ...col, name: newName } : col))
    );
  };

  const handleColumnTypeChange = (index: number, newType: CustomTableColumn['type']) => {
    setColumns((prev) => {
      const alreadyHasLeadValue = prev.some((c, i) => i !== index && c.type === 'aed' && c.isLeadValue);

      return prev.map((col, i) => {
        if (i !== index) return col;
        return {
          ...col,
          type: newType,
          // When switching to AED, if no other column is Lead Value, set to true
          isLeadValue: newType === 'aed' ? !alreadyHasLeadValue : false,
        };
      });
    });
  };

  const handleToggleLeadValue = (index: number, isLead: boolean) => {
    setColumns((prev) =>
      prev.map((col, i) => {
        if (i === index) {
          return { ...col, isLeadValue: isLead };
        }
        // Strictly only ONE column in a table can be the lead value!
        if (isLead && col.type === 'aed') {
          return { ...col, isLeadValue: false };
        }
        return col;
      })
    );
  };

  // Quick parse from comma-separated text
  const handleApplyQuickInput = () => {
    if (!quickInput.trim()) return;
    const names = quickInput
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (names.length === 0) return;

    let hasLeadValueAssigned = false;
    const parsedCols: FormColumn[] = names.map((name) => {
      const lower = name.toLowerCase();
      let type: CustomTableColumn['type'] = 'text';
      let isLeadValue = false;
      if (lower.includes('phone') || lower.includes('mobile') || lower.includes('contact') || lower.includes('tel')) {
        type = 'tel';
      } else if (lower.includes('date') || lower.includes('time') || lower.includes('day')) {
        type = 'date';
      } else if (lower.includes('aed') || lower.includes('budget') || lower.includes('price') || lower.includes('amount') || lower.includes('cost') || lower.includes('currency')) {
        type = 'aed';
        if (!hasLeadValueAssigned) {
          isLeadValue = true;
          hasLeadValueAssigned = true;
        }
      } else if (lower.includes('number') || lower.includes('count') || lower.includes('qty') || lower.includes('sqft') || lower.includes('area') || lower.includes('rate')) {
        type = 'number';
      } else if (lower.includes('status') || lower.includes('type') || lower.includes('stage')) {
        type = 'select';
      }
      return { name, type, isLeadValue };
    });

    // Ensure Status is always present
    const hasStatus = parsedCols.some((c) => c.name.toLowerCase().includes('status') || c.type === 'select');
    if (!hasStatus) {
      parsedCols.push({ name: 'Status', type: 'select', isDefault: true });
    }

    // Ensure Follow-up Date is always present for Google Calendar scheduling
    const hasFollowUp = parsedCols.some((c) => c.name.toLowerCase().includes('follow') || c.type === 'date');
    if (!hasFollowUp) {
      parsedCols.push({ name: 'Follow-up Date', type: 'date', isDefault: true });
    }

    setColumns(parsedCols);
    setQuickInput('');
  };

  // Presets
  const applyPreset = (presetName: string) => {
    if (presetName === 'secondary') {
      setTableName('Buyers & Sellers');
      setColumns([
        { name: 'Client Name', type: 'text' },
        { name: 'Phone', type: 'tel' },
        { name: 'Property Interest', type: 'text' },
        { name: 'Client Type', type: 'select' },
        { name: 'Budget AED', type: 'aed', isLeadValue: true },
        { name: 'Requirements', type: 'text' },
        { name: 'Status', type: 'select', isDefault: true },
        { name: 'Follow-up Date', type: 'date', isDefault: true },
        { name: 'Notes', type: 'text' },
      ]);
    } else if (presetName === 'investors') {
      setTableName('VIP Investors');
      setColumns([
        { name: 'Investor Name', type: 'text' },
        { name: 'Mobile / WhatsApp', type: 'tel' },
        { name: 'Target Community', type: 'text' },
        { name: 'Max Budget AED', type: 'aed', isLeadValue: true },
        { name: 'Expected ROI %', type: 'number' },
        { name: 'Status', type: 'select', isDefault: true },
        { name: 'Follow-up Date', type: 'date', isDefault: true },
        { name: 'Investment Notes', type: 'text' },
      ]);
    } else if (presetName === 'inventory') {
      setTableName('Direct Units Inventory');
      setColumns([
        { name: 'Building / Tower', type: 'text' },
        { name: 'Unit Number', type: 'text' },
        { name: 'Property Type', type: 'select' },
        { name: 'Size SqFt', type: 'number' },
        { name: 'Selling Price AED', type: 'aed', isLeadValue: true },
        { name: 'Owner Contact', type: 'tel' },
        { name: 'Status', type: 'select', isDefault: true },
        { name: 'Follow-up Date', type: 'date', isDefault: true },
        { name: 'Key Notes', type: 'text' },
      ]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isGoogleConnected = !!getStoredAccessToken() && !!getStoredGoogleUser();
    if (!isGoogleConnected) {
      window.dispatchEvent(
        new CustomEvent('crm-show-toast', {
          detail: { msg: '🔒 Please Sign In with Google before creating custom tables.', isError: true },
        })
      );
      return;
    }

    const cleanTableName = tableName.trim() || 'Untitled Table';

    let finalColumns = [...columns].filter((c) => c.name.trim().length > 0);

    // Guaranteed First Contacted column
    const hasFirstContacted = finalColumns.some(
      (c) => c.name.toLowerCase().includes('first contact')
    );
    if (!hasFirstContacted) {
      finalColumns.push({ name: 'First Contacted', type: 'date', isDefault: true });
    }

    // Guaranteed Recent Contacted column
    const hasRecentContacted = finalColumns.some(
      (c) => c.name.toLowerCase().includes('recent contact')
    );
    if (!hasRecentContacted) {
      finalColumns.push({ name: 'Recent Contacted', type: 'date', isDefault: true });
    }

    // Guaranteed Status column by default
    const hasStatus = finalColumns.some(
      (c) => c.name.toLowerCase() === 'status' || c.type === 'select'
    );
    if (!hasStatus) {
      finalColumns.push({ name: 'Status', type: 'select', isDefault: true });
    }

    // Guaranteed Follow-up Date column by default for Google Calendar
    const hasFollowUpDate = finalColumns.some(
      (c) => c.name.toLowerCase().includes('follow') || c.type === 'date'
    );
    if (!hasFollowUpDate) {
      finalColumns.push({ name: 'Follow-up Date & Time', type: 'date', isDefault: true });
    }

    const cleanColumns: CustomTableColumn[] = finalColumns.map((c, idx) => ({
      id: `col_${Date.now()}_${idx}`,
      key: `col_${c.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}_${idx}`,
      name: c.name.trim(),
      type: c.type,
      isLeadValue: c.type === 'aed' ? Boolean(c.isLeadValue) : false,
      options: c.type === 'select' || c.name.toLowerCase().includes('status')
        ? ['New', 'Active', 'Hot', 'Follow-up', 'Interested', 'Under Negotiation', 'Closed Won', 'Closed Lost', 'Closed', 'Not Interested']
        : undefined,
    }));

    onCreateTable({
      name: cleanTableName,
      description: description.trim(),
      columns: cleanColumns,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0B1B32] text-white px-6 py-4 flex items-center justify-between border-b border-[#D4AF37]/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <TableProperties className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-display tracking-tight text-white flex items-center gap-2">
                Create New Table
              </h3>
              <p className="text-xs text-slate-300">
                Define your custom columns, spreadsheet layout, and Excel bulk import rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 flex-1">
          {/* Calendar Notice Banner */}
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200/80 flex items-start gap-2.5">
            <CalendarPlus className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#0B1B32]">
                Google Calendar & Pipeline Sync Active
              </p>
              <p className="text-slate-600 mt-0.5">
                Every table includes <strong className="text-slate-900">"Status"</strong> and <strong className="text-slate-900">"Follow-up Date"</strong> by default. This enables instant 1-click scheduling to your Google Calendar and tracking in Today's Action Feed.
              </p>
            </div>
          </div>

          {/* Google Sign-in Requirement Notice */}
          {!isGoogleConnected && (
            <div className="p-3 bg-red-50 rounded-lg border border-red-200 flex items-start gap-2.5 text-red-900">
              <Lock className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-900">Google Sign-In Required</p>
                <p className="text-red-700 mt-0.5 text-[11px]">
                  You must be signed in with Google to create tables so they are saved to your account and synced across your devices.
                </p>
              </div>
            </div>
          )}

          {/* Table Name & Description */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Table Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. VIP Investors, Buyers & Sellers, Commercial Leads"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1B32] focus:bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Description / Purpose (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Off-market buyer requests, direct villa inventory, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0B1B32] focus:bg-white"
              />
            </div>
          </div>

          {/* Quick Presets */}
          <div className="pt-2 border-t border-slate-200">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Quick Industry Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('secondary')}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                Buyers & Sellers (Secondary)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('investors')}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                VIP High-Net-Worth Investors
              </button>
              <button
                type="button"
                onClick={() => applyPreset('inventory')}
                className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-[#D4AF37]" />
                Direct Units Inventory
              </button>
            </div>
          </div>

          {/* Quick Paste Columns via Comma separated */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Add multiple columns quickly (comma-separated):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                placeholder="e.g. Full Name, WhatsApp, Budget, Preferred Location"
                className="flex-1 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:border-[#0B1B32] focus:bg-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyQuickInput();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleApplyQuickInput}
                className="px-3 py-1.5 bg-[#0B1B32] hover:bg-[#152945] text-white text-xs font-bold rounded-md transition-colors cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Defined Columns Editor */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Columns3 className="w-4 h-4 text-[#D4AF37]" />
                <span>Table Columns ({columns.length})</span>
              </label>
              <button
                type="button"
                onClick={handleAddColumn}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Column
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {columns.map((col, idx) => {
                const isLockedColumn =
                  col.name.toLowerCase() === 'status' ||
                  col.name.toLowerCase().includes('follow') ||
                  col.name.toLowerCase().includes('first contact') ||
                  col.name.toLowerCase().includes('recent contact') ||
                  col.isDefault;

                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-2 p-2 bg-white rounded border transition-colors shadow-2xs ${
                      isLockedColumn
                        ? 'border-amber-300 bg-amber-50/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="w-6 text-center text-xs font-mono font-bold text-slate-400">
                      {String.fromCharCode(65 + (idx % 26))}
                    </span>

                    <input
                      type="text"
                      required
                      placeholder={`Column ${idx + 1}`}
                      value={col.name}
                      readOnly={isLockedColumn}
                      onChange={(e) => handleColumnNameChange(idx, e.target.value)}
                      className={`flex-1 px-2.5 py-1 text-xs border rounded font-semibold text-slate-800 focus:outline-none ${
                        isLockedColumn
                          ? 'bg-slate-100 border-slate-200 cursor-not-allowed select-none'
                          : 'bg-slate-50 border-slate-200 focus:bg-white focus:border-[#0B1B32]'
                      }`}
                    />

                    <select
                      value={col.type}
                      disabled={isLockedColumn}
                      onChange={(e) => handleColumnTypeChange(idx, e.target.value as any)}
                      className={`px-2 py-1 text-xs border rounded font-medium focus:outline-none focus:border-[#0B1B32] ${
                        isLockedColumn
                          ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed select-none'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <option value="text">📝 Text</option>
                      <option value="tel">📞 Phone / WhatsApp</option>
                      <option value="number">🔢 Number</option>
                      <option value="aed">💰 AED (Currency)</option>
                      <option value="date">📅 Date</option>
                      <option value="select">🏷️ Status / Tag</option>
                    </select>

                    {col.type === 'aed' && (
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-xs shrink-0">
                        <span className="text-[11px] font-bold text-emerald-900 whitespace-nowrap">
                          Lead Value?
                        </span>
                        <div className="inline-flex rounded border border-emerald-300 bg-white p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleToggleLeadValue(idx, true)}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors cursor-pointer ${
                              col.isLeadValue
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50'
                            }`}
                            title="Set as the single Lead Value column for this table"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleLeadValue(idx, false)}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded transition-colors cursor-pointer ${
                              !col.isLeadValue
                                ? 'bg-slate-200 text-slate-700 font-bold'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                            }`}
                            title="Not the main lead value"
                          >
                            No
                          </button>
                        </div>
                      </div>
                    )}

                    {isLockedColumn ? (
                      <span
                        className="p-1.5 text-amber-700 bg-amber-100 border border-amber-300 rounded text-[10px] font-bold flex items-center gap-1 select-none shrink-0"
                        title="Default system column: type and deletion are locked"
                      >
                        <Lock className="w-3 h-3" />
                        <span className="hidden sm:inline">Locked</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRemoveColumn(idx)}
                        disabled={columns.length <= 1}
                        className={`p-1.5 rounded transition-colors ${
                          columns.length <= 1
                            ? 'text-slate-200 cursor-not-allowed'
                            : 'text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                        }`}
                        title="Remove Column"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isGoogleConnected}
            className={`px-5 py-2 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 ${
              isGoogleConnected
                ? 'bg-[#0B1B32] hover:bg-[#152945] text-white cursor-pointer'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
            }`}
          >
            {isGoogleConnected ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
                <span>Create Table</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Google Sign-In Required</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
