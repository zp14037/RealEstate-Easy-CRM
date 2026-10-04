import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { 
  ProjectLead, 
  SecondaryLead, 
  ActiveTab, 
  ActionItem, 
  CallStatus, 
  SecondaryStatus,
  CustomTable,
  CustomTableRow,
  CustomTableColumn
} from '../types';
import { 
  formatAED, 
  getDaysDiffFromToday, 
  getDateOffset, 
  getTodayDateString 
} from '../data/mockData';
import { 
  fetchProjectLeadsFromDb, 
  fetchSecondaryLeadsFromDb, 
  insertProjectLeadToDb, 
  insertSecondaryLeadToDb, 
  updateProjectLeadInDb, 
  updateSecondaryLeadInDb, 
  deleteProjectLeadFromDb, 
  deleteSecondaryLeadFromDb, 
  bulkInsertProjectLeadsToDb, 
  bulkInsertSecondaryLeadsToDb,
  fetchCustomTablesFromDb,
  saveCustomTableToDb,
  deleteCustomTableFromDb,
  fetchCustomTableRowsFromDb,
  insertCustomTableRowToDb,
  updateCustomTableRowInDb,
  deleteCustomTableRowFromDb,
  clearCustomTableRowsFromDb,
  bulkInsertCustomTableRowsToDb
} from '../services/supabaseDataService';
import { isSupabaseConfigured, getSupabaseClient } from '../lib/supabaseClient';
import { getStoredGoogleUser } from '../services/googleAuth';

interface CrmContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  projectLeads: ProjectLead[];
  secondaryLeads: SecondaryLead[];
  customTables: CustomTable[];
  customRows: CustomTableRow[];
  actionItems: ActionItem[];
  overdueCount: number;
  dueTodayCount: number;
  upcomingCount: number;
  totalActiveCount: number;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isDbConnected: boolean;
  refreshFromDb: () => Promise<void>;
  
  // Custom Dynamic Tables CRUD
  addCustomTable: (table: Omit<CustomTable, 'id' | 'createdAt' | 'updatedAt'>) => string;
  deleteCustomTable: (tableId: string) => void;
  addCustomTableRow: (tableId: string, data: Record<string, any>, insertAt?: 'top' | 'bottom') => string;
  updateCustomTableRow: (rowId: string, dataUpdates: Record<string, any>) => void;
  deleteCustomTableRow: (rowId: string) => void;
  duplicateCustomTableRow: (rowId: string) => void;
  bulkAddCustomTableRows: (tableId: string, rowsData: Record<string, any>[]) => number;
  clearCustomTableRows: (tableId: string) => void;
  clearProjectLeads: () => void;

  // Row Mutations (Zero-Modal Spreadsheet Paradigm)
  updateProjectLead: (id: string, updates: Partial<ProjectLead>) => void;
  updateSecondaryLead: (id: string, updates: Partial<SecondaryLead>) => void;
  addBlankProjectLead: (insertAt?: 'top' | 'bottom') => string;
  addBlankSecondaryLead: (insertAt?: 'top' | 'bottom') => string;
  bulkAddProjectLeads: (leads: Partial<ProjectLead>[]) => number;
  bulkAddSecondaryLeads: (leads: Partial<SecondaryLead>[]) => number;
  deleteProjectLead: (id: string) => void;
  deleteSecondaryLead: (id: string) => void;
  duplicateProjectLead: (id: string) => void;
  duplicateSecondaryLead: (id: string) => void;
  
  // Action & Follow-up Handlers
  rescheduleLead: (sourceType: 'project' | 'secondary' | 'custom', id: string, newDate: string, newStatus?: string, note?: string) => void;
  quickReschedulePreset: (sourceType: 'project' | 'secondary' | 'custom', id: string, days: number, months: number, note?: string) => void;
  markDone: (sourceType: 'project' | 'secondary' | 'custom', id: string, note?: string) => void;
  markClosedDeal: (sourceType: 'project' | 'secondary' | 'custom', id: string, note?: string) => void;
  markNotInterested: (sourceType: 'project' | 'secondary' | 'custom', id: string, note?: string) => void;
  
  // Management
  clearAllData: () => void;
  resetToDemoData: () => void;
  exportToCsv: (type: 'project' | 'secondary' | 'actions') => void;
}

const STORAGE_KEY_PROJECTS = 'xpotential_crm_project_leads_v2';
const STORAGE_KEY_SECONDARY = 'xpotential_crm_secondary_leads_v2';
const STORAGE_KEY_CUSTOM_TABLES = 'xpotential_crm_custom_tables_v1';
const STORAGE_KEY_CUSTOM_ROWS = 'xpotential_crm_custom_rows_v1';

const CrmContext = createContext<CrmContextType | undefined>(undefined);

export const CrmProvider: React.FC<{ children: React.ReactNode; currentUser?: string }> = ({ 
  children, 
  currentUser 
}) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Real Database state: starts empty, no sample data needed!
  const [projectLeads, setProjectLeads] = useState<ProjectLead[]>([]);
  const [secondaryLeads, setSecondaryLeads] = useState<SecondaryLead[]>([]);
  
  // Custom tables strictly scoped to the creator's Google email
  const [customTables, setCustomTables] = useState<CustomTable[]>([]);
  const [customRows, setCustomRows] = useState<CustomTableRow[]>([]);
  const customRowsRef = useRef<CustomTableRow[]>([]);
  useEffect(() => {
    customRowsRef.current = customRows;
  }, [customRows]);

  const [googleEmail, setGoogleEmail] = useState<string>(() => {
    return (getStoredGoogleUser()?.email || '').trim().toLowerCase();
  });

  useEffect(() => {
    const handleAuthChange = (e: any) => {
      setGoogleEmail((e.detail?.user?.email || '').trim().toLowerCase());
    };
    window.addEventListener('crm-google-auth-changed', handleAuthChange);
    return () => window.removeEventListener('crm-google-auth-changed', handleAuthChange);
  }, []);

  const effectiveEmail = googleEmail || (currentUser && currentUser.includes('@') ? currentUser.trim().toLowerCase() : '');

  const [isDbConnected, setIsDbConnected] = useState<boolean>(() => isSupabaseConfigured());

  // Function to refresh leads directly from Supabase
  const refreshFromDb = async () => {
    if (!isSupabaseConfigured()) {
      setIsDbConnected(false);
      return;
    }
    setIsDbConnected(true);
    try {
      const [proj, sec, dbTables] = await Promise.all([
        fetchProjectLeadsFromDb(),
        fetchSecondaryLeadsFromDb(),
        effectiveEmail ? fetchCustomTablesFromDb(effectiveEmail) : Promise.resolve([]),
      ]);
      setProjectLeads(proj);
      setSecondaryLeads(sec);

      if (effectiveEmail && dbTables && dbTables.length > 0) {
        setCustomTables(dbTables);
        const rowsArrays = await Promise.all(
          dbTables.map((t: any) => fetchCustomTableRowsFromDb(t.id, effectiveEmail))
        );
        const flatRows = rowsArrays.flat();
        setCustomRows(flatRows);
      } else {
        setCustomTables([]);
        setCustomRows([]);
      }
    } catch (e) {
      console.error('Failed to load leads from Supabase:', e);
    }
  };

  // Initial load and listen for config or user changes
  useEffect(() => {
    refreshFromDb();

    const handleConfigChange = () => {
      refreshFromDb();
    };

    window.addEventListener('crm-supabase-config-changed', handleConfigChange);
    return () => window.removeEventListener('crm-supabase-config-changed', handleConfigChange);
  }, [effectiveEmail]);

  // Supabase Realtime synchronization across all tabs and devices
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    const channel = client
      .channel('realtime-crm-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_leads' }, () => {
        fetchProjectLeadsFromDb().then((leads) => setProjectLeads(leads));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'secondary_leads' }, (payload: any) => {
        fetchSecondaryLeadsFromDb().then((leads) => setSecondaryLeads(leads));
        if (payload?.new?.clientType === 'CUSTOM_TABLE' || payload?.old?.clientType === 'CUSTOM_TABLE') {
          if (effectiveEmail) {
            fetchCustomTablesFromDb(effectiveEmail).then((tables) => {
              setCustomTables(tables || []);
            });
          }
        }
        if (payload?.new?.clientType === 'CUSTOM_ROW' || payload?.old?.clientType === 'CUSTOM_ROW') {
          if (effectiveEmail && customTables.length > 0) {
            Promise.all(customTables.map((t) => fetchCustomTableRowsFromDb(t.id, effectiveEmail))).then((arrays) => {
              const flat = arrays.flat();
              if (flat.length > 0) setCustomRows(flat);
            });
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_tables' }, () => {
        if (effectiveEmail) {
          fetchCustomTablesFromDb(effectiveEmail).then((tables) => {
            setCustomTables(tables || []);
          });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_table_rows' }, () => {
        // Refresh custom table rows
        if (effectiveEmail && customTables.length > 0) {
          Promise.all(customTables.map((t) => fetchCustomTableRowsFromDb(t.id, effectiveEmail))).then((arrays) => {
            const flat = arrays.flat();
            if (flat.length > 0) {
              setCustomRows(flat);
            }
          });
        }
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [isDbConnected, customTables, effectiveEmail]);

  // ==========================================================================
  // Dynamic Custom Tables CRUD
  // ==========================================================================

  const addCustomTable = (tableData: Omit<CustomTable, 'id' | 'createdAt' | 'updatedAt'>): string => {
    const newId = `table_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newTable: CustomTable = {
      ...tableData,
      id: newId,
      userEmail: effectiveEmail,
      createdAt: getTodayDateString(),
      updatedAt: getTodayDateString(),
    };
    setCustomTables((prev) => [...prev, newTable]);
    saveCustomTableToDb(newTable, effectiveEmail);
    setActiveTab(newId);
    return newId;
  };

  const deleteCustomTable = (tableId: string) => {
    setCustomTables((prev) => prev.filter((t) => t.id !== tableId));
    setCustomRows((prev) => prev.filter((r) => r.tableId !== tableId));
    deleteCustomTableFromDb(tableId);
    if (activeTab === tableId) {
      setActiveTab('dashboard');
    }
  };

  const addCustomTableRow = (tableId: string, data: Record<string, any>, insertAt: 'top' | 'bottom' = 'top'): string => {
    const newId = `row_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newRow: CustomTableRow = {
      id: newId,
      tableId,
      userEmail: effectiveEmail,
      data,
      createdAt: getTodayDateString(),
      updatedAt: getTodayDateString(),
    };
    customRowsRef.current = insertAt === 'top' ? [newRow, ...customRowsRef.current] : [...customRowsRef.current, newRow];
    setCustomRows((prev) => (insertAt === 'top' ? [newRow, ...prev] : [...prev, newRow]));
    insertCustomTableRowToDb(newRow, effectiveEmail);
    return newId;
  };

  const updateCustomTableRow = (rowId: string, dataUpdates: Record<string, any>) => {
    const existingRow = customRowsRef.current.find((r) => r.id === rowId) || customRows.find((r) => r.id === rowId);
    const updatedRowData = { ...(existingRow?.data || {}), ...dataUpdates };

    // Update in-memory ref immediately so consecutive edits never lose columns
    customRowsRef.current = customRowsRef.current.map((r) =>
      r.id === rowId ? { ...r, data: updatedRowData, updatedAt: getTodayDateString() } : r
    );

    // Update state
    setCustomRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, data: updatedRowData, updatedAt: getTodayDateString() } : r))
    );

    // Save full merged data to Supabase (never empty!)
    if (Object.keys(updatedRowData).length > 0) {
      updateCustomTableRowInDb(rowId, updatedRowData);
    }
  };

  const deleteCustomTableRow = (rowId: string) => {
    customRowsRef.current = customRowsRef.current.filter((r) => r.id !== rowId);
    setCustomRows((prev) => prev.filter((r) => r.id !== rowId));
    deleteCustomTableRowFromDb(rowId);
  };

  const duplicateCustomTableRow = (rowId: string) => {
    const existing = customRows.find((r) => r.id === rowId);
    if (!existing) return;
    const newId = `row_dup_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newRow: CustomTableRow = {
      ...existing,
      id: newId,
      userEmail: effectiveEmail || existing.userEmail || '',
      createdAt: getTodayDateString(),
      updatedAt: getTodayDateString(),
    };
    setCustomRows((prev) => [newRow, ...prev]);
    insertCustomTableRowToDb(newRow, effectiveEmail);
  };

  const bulkAddCustomTableRows = (tableId: string, rowsData: Record<string, any>[]): number => {
    if (!rowsData || rowsData.length === 0) return 0;
    const formatted: CustomTableRow[] = rowsData.map((data, idx) => ({
      id: `row_bulk_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
      tableId,
      userEmail: effectiveEmail,
      data,
      createdAt: getTodayDateString(),
      updatedAt: getTodayDateString(),
    }));
    setCustomRows((prev) => [...formatted, ...prev]);
    bulkInsertCustomTableRowsToDb(formatted, effectiveEmail);
    return formatted.length;
  };

  // Lead update helpers (Optimistic + Supabase DB)
  const updateProjectLead = (id: string, updates: Partial<ProjectLead>) => {
    setProjectLeads((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates, updatedAt: getTodayDateString() } : item))
    );
    updateProjectLeadInDb(id, updates);
  };

  const updateSecondaryLead = (id: string, updates: Partial<SecondaryLead>) => {
    setSecondaryLeads((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates, updatedAt: getTodayDateString() } : item))
    );
    updateSecondaryLeadInDb(id, updates);
  };

  // Add Blank Row (Direct spreadsheet append - zero popups)
  const addBlankProjectLead = (insertAt: 'top' | 'bottom' = 'top'): string => {
    const newId = `proj-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const blankRow: ProjectLead = {
      id: newId,
      projectName: '',
      developer: 'Emaar Properties',
      community: 'Downtown Dubai',
      unitDetails: '',
      propertyType: 'Apartment',
      handoverDetails: 'Q4 2026',
      visitedDate: getTodayDateString(),
      ownerName: '',
      contactNo: '',
      callStatus: 'New',
      followUpDate: getTodayDateString(),
      followUpTime: '10:00',
      notes: '',
      budgetAED: 0,
      createdAt: getTodayDateString(),
      updatedAt: getTodayDateString(),
    };

    setProjectLeads((prev) => (insertAt === 'top' ? [blankRow, ...prev] : [...prev, blankRow]));
    insertProjectLeadToDb(blankRow);
    return newId;
  };

  const addBlankSecondaryLead = (insertAt: 'top' | 'bottom' = 'top'): string => {
    const newId = `sec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const blankRow: SecondaryLead = {
      id: newId,
      name: '',
      mobile: '',
      property: '',
      clientType: 'Buyer',
      dateContacted: getTodayDateString(),
      budget: 2500000,
      expectationRequirements: '',
      remarksStatus: 'New Lead',
      followUpDate: getTodayDateString(),
      followUpTime: '10:00',
      notes: '',
      createdAt: getTodayDateString(),
      updatedAt: getTodayDateString(),
    };

    setSecondaryLeads((prev) => (insertAt === 'top' ? [blankRow, ...prev] : [...prev, blankRow]));
    insertSecondaryLeadToDb(blankRow);
    return newId;
  };

  // Bulk Import / Raw Data handling
  const bulkAddProjectLeads = (newLeads: Partial<ProjectLead>[]): number => {
    if (!newLeads || newLeads.length === 0) return 0;
    const formatted: ProjectLead[] = newLeads.map((item, idx) => ({
      id: `proj-bulk-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      projectName: item.projectName || 'Off-Plan Project',
      developer: item.developer || 'Developer',
      community: item.community || 'Dubai',
      unitDetails: item.unitDetails || '',
      propertyType: item.propertyType || 'Apartment',
      handoverDetails: item.handoverDetails || 'TBD',
      visitedDate: item.visitedDate || getTodayDateString(),
      ownerName: item.ownerName || 'New Lead',
      contactNo: item.contactNo || '',
      callStatus: item.callStatus || 'New',
      followUpDate: item.followUpDate || '',
      followUpTime: item.followUpTime || '10:00',
      notes: item.notes || 'Imported via Bulk Raw Paste',
      budgetAED: item.budgetAED || 0,
      createdAt: getTodayDateString(),
      updatedAt: getTodayDateString(),
    }));

    setProjectLeads((prev) => [...formatted, ...prev]);
    bulkInsertProjectLeadsToDb(formatted);
    return formatted.length;
  };

  const bulkAddSecondaryLeads = (newLeads: Partial<SecondaryLead>[]): number => {
    if (!newLeads || newLeads.length === 0) return 0;
    const formatted: SecondaryLead[] = newLeads.map((item, idx) => ({
      id: `sec-bulk-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      name: item.name || 'New Client',
      mobile: item.mobile || '',
      property: item.property || 'Dubai Property',
      clientType: item.clientType || 'Buyer',
      dateContacted: item.dateContacted || getTodayDateString(),
      budget: item.budget || 0,
      expectationRequirements: item.expectationRequirements || '',
      remarksStatus: item.remarksStatus || 'New Lead',
      followUpDate: item.followUpDate || '',
      followUpTime: item.followUpTime || '10:00',
      notes: item.notes || 'Imported via Bulk Raw Paste',
      createdAt: getTodayDateString(),
      updatedAt: getTodayDateString(),
    }));

    setSecondaryLeads((prev) => [...formatted, ...prev]);
    bulkInsertSecondaryLeadsToDb(formatted);
    return formatted.length;
  };

  const deleteProjectLead = (id: string) => {
    setProjectLeads((prev) => prev.filter((item) => item.id !== id));
    deleteProjectLeadFromDb(id);
  };

  const deleteSecondaryLead = (id: string) => {
    setSecondaryLeads((prev) => prev.filter((item) => item.id !== id));
    deleteSecondaryLeadFromDb(id);
  };

  const duplicateProjectLead = (id: string) => {
    const item = projectLeads.find((p) => p.id === id);
    if (!item) return;
    const duplicated: ProjectLead = {
      ...item,
      id: `proj-dup-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ownerName: `${item.ownerName} (Copy)`,
      createdAt: getTodayDateString(),
      updatedAt: getTodayDateString(),
    };
    setProjectLeads((prev) => [duplicated, ...prev]);
    insertProjectLeadToDb(duplicated);
  };

  const duplicateSecondaryLead = (id: string) => {
    const item = secondaryLeads.find((s) => s.id === id);
    if (!item) return;
    const duplicated: SecondaryLead = {
      ...item,
      id: `sec-dup-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `${item.name} (Copy)`,
      createdAt: getTodayDateString(),
      updatedAt: getTodayDateString(),
    };
    setSecondaryLeads((prev) => [duplicated, ...prev]);
    insertSecondaryLeadToDb(duplicated);
  };

  // Direct Reschedule action
  const rescheduleLead = (
    sourceType: 'project' | 'secondary' | 'custom',
    id: string,
    newDate: string,
    newStatus?: string,
    note?: string
  ) => {
    if (sourceType === 'custom') {
      const row = customRows.find((r) => r.id === id);
      if (!row) return;
      const table = customTables.find((t) => t.id === row.tableId);
      const dateCol = table?.columns.find((c) => c.type === 'date' || c.name.toLowerCase().includes('follow') || c.name.toLowerCase().includes('date'));
      const statusCol = table?.columns.find((c) => c.type === 'select' || c.name.toLowerCase().includes('status'));
      const noteCol = table?.columns.find((c) => c.name.toLowerCase().includes('note') || c.name.toLowerCase().includes('remark'));

      const updates: Record<string, any> = {};
      if (dateCol) updates[dateCol.key] = newDate;
      if (newStatus && statusCol) updates[statusCol.key] = newStatus;
      if (note && noteCol) {
        const existing = row.data[noteCol.key];
        updates[noteCol.key] = existing ? `${existing} | [${getTodayDateString()}]: ${note}` : note;
      }
      updateCustomTableRow(id, updates);
      return;
    }

    if (sourceType === 'project') {
      const existing = projectLeads.find((p) => p.id === id);
      if (!existing) return;
      const updatedNotes = note 
        ? `${existing.notes ? existing.notes + ' | ' : ''}[${getTodayDateString()}]: ${note}`
        : existing.notes;
      updateProjectLead(id, {
        followUpDate: newDate,
        ...(newStatus ? { callStatus: newStatus as CallStatus } : {}),
        notes: updatedNotes,
      });
    } else {
      const existing = secondaryLeads.find((s) => s.id === id);
      if (!existing) return;
      const updatedNotes = note 
        ? `${existing.notes ? existing.notes + ' | ' : ''}[${getTodayDateString()}]: ${note}`
        : existing.notes;
      updateSecondaryLead(id, {
        followUpDate: newDate,
        ...(newStatus ? { remarksStatus: newStatus as SecondaryStatus } : {}),
        notes: updatedNotes,
      });
    }
  };

  const quickReschedulePreset = (
    sourceType: 'project' | 'secondary' | 'custom',
    id: string,
    days: number,
    months: number,
    note?: string
  ) => {
    const newDate = getDateOffset(days, months);
    rescheduleLead(sourceType, id, newDate, undefined, note || `Rescheduled to ${newDate}`);
  };

  // Instant 1-Click Done (marks call done and schedules standard next touchpoint +3 days)
  const markDone = (sourceType: 'project' | 'secondary' | 'custom', id: string, note?: string) => {
    const nextDate = getDateOffset(3);
    if (sourceType === 'custom') {
      const row = customRows.find((r) => r.id === id);
      if (!row) return;
      const table = customTables.find((t) => t.id === row.tableId);
      const dateCol = table?.columns.find((c) => c.type === 'date' || c.name.toLowerCase().includes('follow') || c.name.toLowerCase().includes('date'));
      const statusCol = table?.columns.find((c) => c.type === 'select' || c.name.toLowerCase().includes('status'));
      const noteCol = table?.columns.find((c) => c.name.toLowerCase().includes('note') || c.name.toLowerCase().includes('remark'));

      const updates: Record<string, any> = {};
      if (dateCol) updates[dateCol.key] = nextDate;
      if (statusCol) updates[statusCol.key] = 'Follow-up';
      if (noteCol) {
        const noteText = note || 'Follow-up call completed. Next touchpoint in 3 days.';
        const existing = row.data[noteCol.key];
        updates[noteCol.key] = existing ? `${existing} | [${getTodayDateString()}]: ${noteText}` : noteText;
      }
      updateCustomTableRow(id, updates);
      return;
    }

    if (sourceType === 'project') {
      const existing = projectLeads.find((p) => p.id === id);
      const noteText = note || 'Follow-up call completed. Next touchpoint in 3 days.';
      updateProjectLead(id, {
        callStatus: 'Follow-up',
        followUpDate: nextDate,
        notes: existing?.notes ? `${existing.notes} | [${getTodayDateString()}]: ${noteText}` : noteText,
      });
    } else {
      const existing = secondaryLeads.find((s) => s.id === id);
      const noteText = note || 'Follow-up touchpoint completed. Next step in 3 days.';
      updateSecondaryLead(id, {
        remarksStatus: 'Active Follow-up',
        followUpDate: nextDate,
        notes: existing?.notes ? `${existing.notes} | [${getTodayDateString()}]: ${noteText}` : noteText,
      });
    }
  };

  const markClosedDeal = (sourceType: 'project' | 'secondary' | 'custom', id: string, note?: string) => {
    if (sourceType === 'custom') {
      const row = customRows.find((r) => r.id === id);
      if (!row) return;
      const table = customTables.find((t) => t.id === row.tableId);
      const statusCol = table?.columns.find((c) => c.type === 'select' || c.name.toLowerCase().includes('status'));
      const noteCol = table?.columns.find((c) => c.name.toLowerCase().includes('note') || c.name.toLowerCase().includes('remark'));

      const updates: Record<string, any> = {};
      if (statusCol) updates[statusCol.key] = 'Closed Won';
      if (noteCol) {
        const noteText = note ? `Deal Closed! ${note}` : 'Deal Closed & Follow-up Completed';
        const existing = row.data[noteCol.key];
        updates[noteCol.key] = existing ? `${existing} | [${getTodayDateString()}]: ${noteText}` : noteText;
      }
      updateCustomTableRow(id, updates);
      return;
    }

    if (sourceType === 'project') {
      updateProjectLead(id, {
        callStatus: 'Closed',
        notes: note ? `Deal Closed! ${note}` : 'Deal Closed & Follow-up Completed',
      });
    } else {
      updateSecondaryLead(id, {
        remarksStatus: 'Deal Closed',
        notes: note ? `Deal Closed! ${note}` : 'Deal Closed & Follow-up Completed',
      });
    }
  };

  const markNotInterested = (sourceType: 'project' | 'secondary' | 'custom', id: string, note?: string) => {
    if (sourceType === 'custom') {
      deleteCustomTableRow(id);
      return;
    }

    if (sourceType === 'project') {
      updateProjectLead(id, {
        callStatus: 'Not Interested',
        notes: note || 'Client marked as Not Interested',
      });
    } else {
      updateSecondaryLead(id, {
        remarksStatus: 'Not Interested',
        notes: note || 'Client marked as Not Interested',
      });
    }
  };

  const clearProjectLeads = () => {
    setProjectLeads([]);
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify([]));
    } catch (e) {
      console.error(e);
    }
    const client = getSupabaseClient();
    if (client) {
      client.from('project_leads').delete().neq('id', '___non_existent___').then();
    }
  };

  const clearCustomTableRows = (tableId: string) => {
    setCustomRows((prev) => prev.filter((r) => r.tableId !== tableId));
    clearCustomTableRowsFromDb(tableId);
  };

  const clearAllData = () => {
    setProjectLeads([]);
    setSecondaryLeads([]);
    try {
      localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_SECONDARY, JSON.stringify([]));
    } catch (e) {
      console.error(e);
    }
  };

  const resetToDemoData = () => {
    // Pure Supabase mode - no sample data needed
    refreshFromDb();
  };

  // CSV Export
  const exportToCsv = (type: 'project' | 'secondary' | 'actions') => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let filename = '';

    if (type === 'project') {
      filename = `Xpotential_Project_Leads_${getTodayDateString()}.csv`;
      headers = [
        'Project Name',
        'Developer',
        'Community',
        'Unit Details',
        'Property Type',
        'Handover Details',
        'Visited Date',
        'Owner Name',
        'Contact No',
        'Call Status',
        'Follow-up Date',
        'Notes',
      ];
      rows = projectLeads.map((p) => [
        `"${p.projectName}"`,
        `"${p.developer}"`,
        `"${p.community}"`,
        `"${p.unitDetails}"`,
        `"${p.propertyType}"`,
        `"${p.handoverDetails}"`,
        `"${p.visitedDate}"`,
        `"${p.ownerName}"`,
        `"${p.contactNo}"`,
        `"${p.callStatus}"`,
        `"${p.followUpDate}"`,
        `"${(p.notes || '').replace(/"/g, '""')}"`,
      ]);
    } else if (type === 'secondary') {
      filename = `Xpotential_Buyers_Sellers_${getTodayDateString()}.csv`;
      headers = [
        'Name',
        'Mobile',
        'Property',
        'Client Type',
        'Date Contacted',
        'Budget (AED)',
        'Expectation Requirements',
        'Remarks/Status',
        'Follow-up Date',
        'Notes',
      ];
      rows = secondaryLeads.map((s) => [
        `"${s.name}"`,
        `"${s.mobile}"`,
        `"${s.property}"`,
        `"${s.clientType}"`,
        `"${s.dateContacted}"`,
        `"${s.budget}"`,
        `"${(s.expectationRequirements || '').replace(/"/g, '""')}"`,
        `"${s.remarksStatus}"`,
        `"${s.followUpDate}"`,
        `"${(s.notes || '').replace(/"/g, '""')}"`,
      ]);
    } else {
      filename = `Xpotential_Todays_Actions_${getTodayDateString()}.csv`;
      headers = ['Type', 'Client Name', 'Phone', 'Property / Project', 'Details', 'Status', 'Follow-up Due', 'Urgency'];
      rows = actionItems.map((a) => [
        `"${a.sourceType === 'project' ? 'Project Lead' : 'Buyer/Seller'}"`,
        `"${a.clientName}"`,
        `"${a.contactNo}"`,
        `"${a.propertyName}"`,
        `"${a.details}"`,
        `"${a.status}"`,
        `"${a.followUpDate}"`,
        `"${a.isOverdue ? 'Overdue' : 'Due Today'}"`,
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute Action Items:
  // ONLY show follow-ups scheduled for today / overdue from tables created by the user
  const actionItems: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [];

    // Custom table leads with scheduled follow-up date & time
    customTables.forEach((table) => {
      const dateCol = table.columns.find((c) => c.type === 'date' || c.name.toLowerCase().includes('follow') || c.name.toLowerCase().includes('date'));
      if (!dateCol) return;

      const nameCol = table.columns.find((c) => c.name.toLowerCase().includes('name') || c.name.toLowerCase().includes('client') || c.name.toLowerCase().includes('owner'));
      const telCol = table.columns.find((c) => c.type === 'tel' || c.name.toLowerCase().includes('contact') || c.name.toLowerCase().includes('phone') || c.name.toLowerCase().includes('mobile'));
      const statusCol = table.columns.find((c) => c.type === 'select' || c.name.toLowerCase().includes('status'));
      const noteCol = table.columns.find((c) => c.name.toLowerCase().includes('note') || c.name.toLowerCase().includes('remark'));
      const budgetCol = table.columns.find((c) => c.type === 'aed' || c.name.toLowerCase().includes('budget') || c.name.toLowerCase().includes('price') || c.name.toLowerCase().includes('aed'));

      const rowsForTable = customRows.filter((r) => r.tableId === table.id);
      rowsForTable.forEach((row) => {
        const followUpDate = row.data[dateCol.key];
        if (!followUpDate || typeof followUpDate !== 'string' || !followUpDate.trim()) return;

        const diff = getDaysDiffFromToday(followUpDate.trim());
        if (diff <= 0) {
          const statusVal = statusCol ? row.data[statusCol.key] : 'Active';
          if (
            statusVal === 'Closed' || 
            statusVal === 'Not Interested' || 
            statusVal === 'Deal Closed' || 
            statusVal === 'Lost' ||
            statusVal === 'Closed Won' ||
            statusVal === 'Closed Lost'
          ) return;

          const clientName = nameCol ? row.data[nameCol.key] : Object.values(row.data).find(v => typeof v === 'string' && v.trim().length > 0) || 'Lead';
          const contactNo = telCol ? row.data[telCol.key] : '';
          const timeVal = row.data[`${dateCol.key}_time`] || '10:00';
          const noteVal = noteCol ? row.data[noteCol.key] : '';
          const budgetVal = budgetCol ? row.data[budgetCol.key] : undefined;

          items.push({
            id: `act-custom-${row.id}`,
            sourceType: 'custom',
            leadId: row.id,
            clientName: String(clientName || 'Lead'),
            contactNo: String(contactNo || ''),
            propertyName: table.name,
            subtitle: `Table: ${table.name}`,
            details: noteVal ? String(noteVal) : `Scheduled Follow-up in ${table.name}`,
            status: statusVal as any,
            followUpDate: followUpDate.trim(),
            followUpTime: timeVal,
            notes: noteVal ? String(noteVal) : undefined,
            budgetFormatted: budgetVal ? formatAED(parseFloat(String(budgetVal).replace(/[^0-9.-]+/g, '')) || 0) : undefined,
            isOverdue: diff < 0,
            isToday: diff === 0,
            daysDifference: diff,
            rawLead: row as any,
          });
        }
      });
    });

    // Sort: Overdue first (most overdue on top), then Today's items
    return items.sort((a, b) => a.daysDifference - b.daysDifference);
  }, [customTables, customRows]);

  // Statistics
  const overdueCount = useMemo(() => actionItems.filter((i) => i.isOverdue).length, [actionItems]);
  const dueTodayCount = useMemo(() => actionItems.filter((i) => i.isToday).length, [actionItems]);

  const upcomingCount = useMemo(() => {
    let count = 0;
    customTables.forEach((table) => {
      const dateCol = table.columns.find((c) => c.type === 'date' || c.name.toLowerCase().includes('follow') || c.name.toLowerCase().includes('date'));
      if (!dateCol) return;
      const statusCol = table.columns.find((c) => c.type === 'select' || c.name.toLowerCase().includes('status'));
      const rows = customRows.filter((r) => r.tableId === table.id);
      rows.forEach((row) => {
        const d = row.data[dateCol.key];
        if (!d || typeof d !== 'string' || !d.trim()) return;
        const diff = getDaysDiffFromToday(d.trim());
        if (diff > 0 && diff <= 7) {
          const s = statusCol ? row.data[statusCol.key] : 'Active';
          if (
            s !== 'Closed' && 
            s !== 'Not Interested' && 
            s !== 'Deal Closed' && 
            s !== 'Lost' &&
            s !== 'Closed Won' &&
            s !== 'Closed Lost'
          ) {
            count++;
          }
        }
      });
    });
    return count;
  }, [customTables, customRows]);

  const totalActiveCount = useMemo(() => {
    let count = 0;
    customTables.forEach((table) => {
      const statusCol = table.columns.find((c) => c.type === 'select' || c.name.toLowerCase().includes('status'));
      const rows = customRows.filter((r) => r.tableId === table.id);
      rows.forEach((row) => {
        const s = statusCol ? row.data[statusCol.key] : 'Active';
        if (
          s !== 'Closed' && 
          s !== 'Not Interested' && 
          s !== 'Deal Closed' && 
          s !== 'Lost' &&
          s !== 'Closed Won' &&
          s !== 'Closed Lost'
        ) {
          count++;
        }
      });
    });
    return count;
  }, [customTables, customRows]);

  return (
    <CrmContext.Provider
      value={{
        activeTab,
        setActiveTab,
        projectLeads,
        secondaryLeads,
        customTables,
        customRows,
        actionItems,
        overdueCount,
        dueTodayCount,
        upcomingCount,
        totalActiveCount,
        searchQuery,
        setSearchQuery,
        isDbConnected,
        refreshFromDb,
        addCustomTable,
        deleteCustomTable,
        addCustomTableRow,
        updateCustomTableRow,
        deleteCustomTableRow,
        duplicateCustomTableRow,
        bulkAddCustomTableRows,
        clearCustomTableRows,
        clearProjectLeads,
        updateProjectLead,
        updateSecondaryLead,
        addBlankProjectLead,
        addBlankSecondaryLead,
        bulkAddProjectLeads,
        bulkAddSecondaryLeads,
        deleteProjectLead,
        deleteSecondaryLead,
        duplicateProjectLead,
        duplicateSecondaryLead,
        rescheduleLead,
        quickReschedulePreset,
        markDone,
        markClosedDeal,
        markNotInterested,
        clearAllData,
        resetToDemoData,
        exportToCsv,
      }}
    >
      {children}
    </CrmContext.Provider>
  );
};

export const useCrm = () => {
  const context = useContext(CrmContext);
  if (!context) {
    throw new Error('useCrm must be used within a CrmProvider');
  }
  return context;
};
