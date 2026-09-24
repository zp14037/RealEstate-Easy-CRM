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
  CheckCircle2
} from 'lucide-react';
import { CustomTable, CustomTableColumn } from '../types';

interface AddTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTable: (table: Omit<CustomTable, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const AddTableModal: React.FC<AddTableModalProps> = ({
  isOpen,
  onClose,
  onCreateTable,
}) => {
  const [tableName, setTableName] = useState('');
  const [description, setDescription] = useState('');
  const [quickInput, setQuickInput] = useState('');
  const [columns, setColumns] = useState<Array<{ name: string; type: CustomTableColumn['type'] }>>([
    { name: 'Client Name', type: 'text' },
    { name: 'Contact Number', type: 'tel' },
    { name: 'Budget AED', type: 'number' },
    { name: 'Status', type: 'select' },
    { name: 'Follow-up Date', type: 'date' },
    { name: 'Notes', type: 'text' },
  ]);

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
    setColumns((prev) =>
      prev.map((col, i) => (i === index ? { ...col, type: newType } : col))
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

    const parsedCols: Array<{ name: string; type: CustomTableColumn['type'] }> = names.map((name) => {
      const lower = name.toLowerCase();
      let type: CustomTableColumn['type'] = 'text';
      if (lower.includes('phone') || lower.includes('mobile') || lower.includes('contact') || lower.includes('tel')) {
        type = 'tel';
      } else if (lower.includes('date') || lower.includes('time') || lower.includes('day')) {
        type = 'date';
      } else if (lower.includes('budget') || lower.includes('price') || lower.includes('amount') || lower.includes('rate') || lower.includes('cost')) {
        type = 'number';
      } else if (lower.includes('status') || lower.includes('type') || lower.includes('stage')) {
        type = 'select';
      }
      return { name, type };
    });

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
        { name: 'Budget AED', type: 'number' },
        { name: 'Requirements', type: 'text' },
        { name: 'Status', type: 'select' },
        { name: 'Follow-up Date', type: 'date' },
        { name: 'Notes', type: 'text' },
      ]);
    } else if (presetName === 'investors') {
      setTableName('VIP Investors');
      setColumns([
        { name: 'Investor Name', type: 'text' },
        { name: 'Mobile / WhatsApp', type: 'tel' },
        { name: 'Target Community', type: 'text' },
        { name: 'Max Budget AED', type: 'number' },
        { name: 'Expected ROI %', type: 'number' },
        { name: 'Stage', type: 'select' },
        { name: 'Meeting Date', type: 'date' },
        { name: 'Investment Notes', type: 'text' },
      ]);
    } else if (presetName === 'inventory') {
      setTableName('Direct Units Inventory');
      setColumns([
        { name: 'Building / Tower', type: 'text' },
        { name: 'Unit Number', type: 'text' },
        { name: 'Property Type', type: 'select' },
        { name: 'Size SqFt', type: 'number' },
        { name: 'Selling Price AED', type: 'number' },
        { name: 'Owner Contact', type: 'tel' },
        { name: 'Listing Status', type: 'select' },
        { name: 'Key Notes', type: 'text' },
      ]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTableName = tableName.trim() || 'Untitled Table';
    const cleanColumns: CustomTableColumn[] = columns
      .filter((c) => c.name.trim().length > 0)
      .map((c, idx) => ({
        id: `col_${Date.now()}_${idx}`,
        key: `col_${c.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')}_${idx}`,
        name: c.name.trim(),
        type: c.type,
      }));

    if (cleanColumns.length === 0) {
      alert('Please add at least one column.');
      return;
    }

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
        <div className="bg-[#0B1B32] px-6 py-4 text-white flex items-center justify-between border-b border-amber-400/30">
          <div className="flex items-center gap-2.5">
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Table Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Table Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Luxury Buyers, Commercial Properties, Palm Penthouse List..."
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0B1B32] focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Quick Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick Templates:
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('secondary')}
                className="px-2.5 py-1 text-xs rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors font-medium cursor-pointer"
              >
                + Buyers & Sellers Template
              </button>
              <button
                type="button"
                onClick={() => applyPreset('investors')}
                className="px-2.5 py-1 text-xs rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors font-medium cursor-pointer"
              >
                + VIP Investors Template
              </button>
              <button
                type="button"
                onClick={() => applyPreset('inventory')}
                className="px-2.5 py-1 text-xs rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors font-medium cursor-pointer"
              >
                + Direct Units Inventory
              </button>
            </div>
          </div>

          {/* Fast Comma-separated Column Generator */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ⚡ Paste or Type Column Names (Comma-separated)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. Name, Phone, Budget AED, Area, Status, Date, Notes"
                value={quickInput}
                onChange={(e) => setQuickInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyQuickInput();
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0B1B32]"
              />
              <button
                type="button"
                onClick={handleApplyQuickInput}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold rounded transition-colors cursor-pointer"
              >
                Set Columns
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Automatically detects column types like Phone, Number, Date, or Status.
            </p>
          </div>

          {/* Column Designer List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Columns3 className="w-4 h-4 text-[#0B1B32]" />
                Defined Columns ({columns.length})
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
              {columns.map((col, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs"
                >
                  <span className="w-6 text-center text-xs font-mono font-bold text-slate-400">
                    {String.fromCharCode(65 + (idx % 26))}
                  </span>

                  <input
                    type="text"
                    required
                    placeholder={`Column ${idx + 1}`}
                    value={col.name}
                    onChange={(e) => handleColumnNameChange(idx, e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded font-semibold text-slate-800 focus:outline-none focus:bg-white focus:border-[#0B1B32]"
                  />

                  <select
                    value={col.type}
                    onChange={(e) => handleColumnTypeChange(idx, e.target.value as any)}
                    className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded text-slate-700 font-medium focus:outline-none focus:border-[#0B1B32]"
                  >
                    <option value="text">📝 Text</option>
                    <option value="tel">📞 Phone / WhatsApp</option>
                    <option value="number">💰 Number / AED</option>
                    <option value="date">📅 Date</option>
                    <option value="select">🏷️ Status / Tag</option>
                  </select>

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
                </div>
              ))}
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
            className="px-5 py-2 bg-[#0B1B32] hover:bg-[#152945] text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-[#D4AF37]" />
            <span>Create Table</span>
          </button>
        </div>
      </div>
    </div>
  );
};
