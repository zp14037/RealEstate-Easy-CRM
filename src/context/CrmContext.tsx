import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
  bulkInsertCustomTableRowsToDb
} from '../services/supabaseDataService';
import { isSupabaseConfigured, getSupabaseClient } from '../lib/supabaseClient';

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
  rescheduleLead: (sourceType: 'project' | 'secondary', id: string, newDate: string, newStatus?: string, note?: string) => void;
  quickReschedulePreset: (sourceType: 'project' | 'secondary', id: string, days: number, months: number, note?: string) => void;
  markDone: (sourceType: 'project' | 'secondary', id: string, note?: string) => void;
  markClosedDeal: (sourceType: 'project' | 'secondary', id: string, note?: string) => void;
  markNotInterested: (sourceType: 'project' | 'secondary', id: string, note?: string) => void;
  
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

export const CrmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  // Real Database state: starts empty, no sample data needed!
  const [projectLeads, setProjectLeads] = useState<ProjectLead[]>([]);
  const [secondaryLeads, setSecondaryLeads] = useState<SecondaryLead[]>([]);
  const [customTables, setCustomTables] = useState<CustomTable[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_TABLES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customRows, setCustomRows] = useState<CustomTableRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_ROWS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isDbConnected, setIsDbConnected] = useState<boolean>(() => isSupabaseConfigured());

  // Save to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_TABLES, JSON.stringify(customTables));
    } catch (e) {
      console.error(e);
    }
  }, [customTables]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_ROWS, JSON.stringify(customRows));
    } catch (e) {
      console.error(e);
    }
  }, [customRows]);

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
        fetchCustomTablesFromDb(),
      ]);
      setProjectLeads(proj);
      setSecondaryLeads(sec);

      if (dbTables && dbTables.length > 0) {
        setCustomTables(dbTables);
        const rowsArrays = await Promise.all(
          dbTables.map((t: any) => fetchCustomTableRowsFromDb(t.id))
        );
        const flatRows = rowsArrays.flat();
        if (flatRows.length > 0) {
          setCustomRows(flatRows);
        }
      }
    } catch (e) {
      console.error('Failed to load leads from Supabase:', e);
    }
  };

  // Initial load and listen for config changes
  useEffect(() => {
    refreshFromDb();

    const handleConfigChange = () => {
      refreshFromDb();
    };

    window.addEventListener('crm-supabase-config-changed', handleConfigChange);
    return () => window.removeEventListener('crm-supabase-config-changed', handleConfigChange);
  }, []);

  // Supabase Realtime synchronization across all tabs and devices
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    const channel = client
      .channel('realtime-crm-leads')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_leads' }, () => {
        fetchProjectLeadsFromDb().then((leads) => setProjectLeads(leads));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'secondary_leads' }, () => {
        fetchSecondaryLeadsFromDb().then((leads) => setSecondaryLeads(leads));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_tables' }, () => {
        fetchCustomTablesFromDb().then((tables) => {
          if (tables && tables.length > 0) setCustomTables(tables);
        });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_table_rows' }, () => {
        // Refresh custom table rows
        if (customTables.length > 0) {
          Promise.all(customTables.map((t) => fetchCustomTableRowsFromDb(t.id))).then((arrays) => {
            setCustomRows(arrays.flat());
          });
        }
      })
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [isDbConnected, customTables]);

  // ==========================================================================
  // Dynamic Custom Tables CRUD
  // ==========================================================================

  const addCustomTable = (tableData: Omit<CustomTable, 'id' | 'createdAt' | 'updatedAt'>): string => {
    const newId = `table_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newTable: CustomTable = {
      ...tableData,
      id: newId,
      createdAt: getTodayDateString(),
      updatedAt: getTodayDateString(),
    };
    setCustomTables((prev) => [...prev, newTable]);
    saveCustomTableToDb(newTable);
    setActiveTab(newId);
    return newId;
  };

  const deleteCustomTable = (tableId: string) => {
    setCustomTables((prev) => prev.filter((t) => t.id !== tableId));
    setCustomRows((prev) => prev.filter((r) => r.tableId !== tableId));
    deleteCustomTableFromDb(tableId);
    if (activeTab === tableId) {
      setActiveTab('project_leads');
    }
  };

  const addCustomTableRow = (tableId: string, data: Record<string, any>, insertAt: 'top' | 'bottom' = 'top'): string => {
    const newId = `row_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newRow: CustomTableRow = {
      id: newId,
      tableId,
      data,
      createdAt: getTodayDateString(),
      updatedAt: getTodayDateString(),
    };
    setCustomRows((prev) => (insertAt === 'top' ? [newRow, ...prev] : [...prev, newRow]));
    insertCustomTableRowToDb(newRow);
    return newId;
  };

  const updateCustomTableRow = (rowId: string, dataUpdates: Record<string, any>) => {
    let updatedRowData: Record<string, any> = {};
    setCustomRows((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          updatedRowData = { ...r.data, ...dataUpdates };
          return {
            ...r,
            data: updatedRowData,
            updatedAt: getTodayDateString(),
          };
        }
        return r;
      })
    );
    updateCustomTableRowInDb(rowId, updatedRowData);
  };

  const deleteCustomTableRow = (rowId: string) => {
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
      createdAt: getTodayDateString(),
      updatedAt: getTodayDateString(),
    };
    setCustomRows((prev) => [newRow, ...prev]);
    insertCustomTableRowToDb(newRow);
  };

  const bulkAddCustomTableRows = (tableId: string, rowsData: Record<string, any>[]): number => {
    if (!rowsData || rowsData.length === 0) return 0;
    const formatted: CustomTableRow[] = rowsData.map((data, idx) => ({
      id: `row_bulk_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
      tableId,
      data,
      createdAt: getTodayDateString(),
      updatedAt: getTodayDateString(),
    }));
    setCustomRows((prev) => [...formatted, ...prev]);
    bulkInsertCustomTableRowsToDb(formatted);
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
    sourceType: 'project' | 'secondary',
    id: string,
    newDate: string,
    newStatus?: string,
    note?: string
  ) => {
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
    sourceType: 'project' | 'secondary',
    id: string,
    days: number,
    months: number,
    note?: string
  ) => {
    const newDate = getDateOffset(days, months);
    rescheduleLead(sourceType, id, newDate, undefined, note || `Rescheduled to ${newDate}`);
  };

  // Instant 1-Click Done (marks call done and schedules standard next touchpoint +3 days)
  const markDone = (sourceType: 'project' | 'secondary', id: string, note?: string) => {
    const nextDate = getDateOffset(3);
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

  const markClosedDeal = (sourceType: 'project' | 'secondary', id: string, note?: string) => {
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

  const markNotInterested = (sourceType: 'project' | 'secondary', id: string, note?: string) => {
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
    const client = getSupabaseClient();
    if (client) {
      client.from('custom_table_rows').delete().eq('tableId', tableId).then();
    }
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

  // Compute Action Items for the Core Requirement:
  // "Filter all leads from both lists where followUpDate <= today's date, AND status is not Closed/Dead"
  const actionItems: ActionItem[] = useMemo(() => {
    const items: ActionItem[] = [];

    // Filter project leads
    projectLeads.forEach((p) => {
      const isDead = p.callStatus === 'Closed' || p.callStatus === 'Not Interested';
      if (isDead) return;
      if (!p.followUpDate) return; // Unscheduled leads live in spreadsheet

      const diff = getDaysDiffFromToday(p.followUpDate);
      if (diff <= 0) {
        items.push({
          id: `act-proj-${p.id}`,
          sourceType: 'project',
          leadId: p.id,
          clientName: p.ownerName || 'Unnamed Lead',
          contactNo: p.contactNo || 'No Number',
          propertyName: p.projectName || 'Off-Plan Project',
          subtitle: `${p.developer || ''} · ${p.community || ''}`,
          details: p.unitDetails || 'No unit details specified',
          status: p.callStatus,
          followUpDate: p.followUpDate,
          followUpTime: p.followUpTime || '10:00',
          notes: p.notes,
          budgetFormatted: p.budgetAED ? formatAED(p.budgetAED) : undefined,
          isOverdue: diff < 0,
          isToday: diff === 0,
          daysDifference: diff,
          rawLead: p,
        });
      }
    });

    // Filter secondary leads
    secondaryLeads.forEach((s) => {
      const isDead = s.remarksStatus === 'Deal Closed' || s.remarksStatus === 'Not Interested' || s.remarksStatus === 'Lost';
      if (isDead) return;
      if (!s.followUpDate) return; // Unscheduled leads live in spreadsheet

      const diff = getDaysDiffFromToday(s.followUpDate);
      if (diff <= 0) {
        items.push({
          id: `act-sec-${s.id}`,
          sourceType: 'secondary',
          leadId: s.id,
          clientName: s.name || 'Unnamed Client',
          contactNo: s.mobile || 'No Mobile',
          propertyName: s.property || 'Secondary Property',
          subtitle: `${s.clientType === 'Buyer' ? '🟢 Buyer' : '🟣 Seller'} · Budget: ${formatAED(s.budget)}`,
          details: s.expectationRequirements || 'No requirements specified',
          status: s.remarksStatus,
          followUpDate: s.followUpDate,
          followUpTime: s.followUpTime || '10:00',
          notes: s.notes,
          budgetFormatted: formatAED(s.budget),
          isOverdue: diff < 0,
          isToday: diff === 0,
          daysDifference: diff,
          rawLead: s,
        });
      }
    });

    // Sort: Overdue first (most overdue on top), then Today's items
    return items.sort((a, b) => a.daysDifference - b.daysDifference);
  }, [projectLeads, secondaryLeads]);

  // Statistics
  const overdueCount = useMemo(() => actionItems.filter((i) => i.isOverdue).length, [actionItems]);
  const dueTodayCount = useMemo(() => actionItems.filter((i) => i.isToday).length, [actionItems]);

  const upcomingCount = useMemo(() => {
    let count = 0;
    projectLeads.forEach((p) => {
      if (p.callStatus !== 'Closed' && p.callStatus !== 'Not Interested' && p.followUpDate) {
        const diff = getDaysDiffFromToday(p.followUpDate);
        if (diff > 0 && diff <= 7) count++;
      }
    });
    secondaryLeads.forEach((s) => {
      if (s.remarksStatus !== 'Deal Closed' && s.remarksStatus !== 'Not Interested' && s.remarksStatus !== 'Lost' && s.followUpDate) {
        const diff = getDaysDiffFromToday(s.followUpDate);
        if (diff > 0 && diff <= 7) count++;
      }
    });
    return count;
  }, [projectLeads, secondaryLeads]);

  const totalActiveCount = useMemo(() => {
    const activeProjects = projectLeads.filter((p) => p.callStatus !== 'Closed' && p.callStatus !== 'Not Interested').length;
    const activeSecondary = secondaryLeads.filter((s) => s.remarksStatus !== 'Deal Closed' && s.remarksStatus !== 'Not Interested' && s.remarksStatus !== 'Lost').length;
    return activeProjects + activeSecondary;
  }, [projectLeads, secondaryLeads]);

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
