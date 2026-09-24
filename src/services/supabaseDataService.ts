import { getSupabaseClient } from '../lib/supabaseClient';
import { ProjectLead, SecondaryLead } from '../types';

export async function fetchProjectLeadsFromDb(): Promise<ProjectLead[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('project_leads')
    .select('*')
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('Error fetching project leads from Supabase:', error);
    return [];
  }

  return (data || []) as ProjectLead[];
}

export async function fetchSecondaryLeadsFromDb(): Promise<SecondaryLead[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data, error } = await client
    .from('secondary_leads')
    .select('*')
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('Error fetching secondary leads from Supabase:', error);
    return [];
  }

  return (data || []) as SecondaryLead[];
}

export async function insertProjectLeadToDb(lead: ProjectLead): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client.from('project_leads').insert([lead]);
  if (error) {
    console.error('Error inserting project lead into Supabase:', error);
    return false;
  }
  return true;
}

export async function insertSecondaryLeadToDb(lead: SecondaryLead): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client.from('secondary_leads').insert([lead]);
  if (error) {
    console.error('Error inserting secondary lead into Supabase:', error);
    return false;
  }
  return true;
}

export async function updateProjectLeadInDb(id: string, updates: Partial<ProjectLead>): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client
    .from('project_leads')
    .update({ ...updates, updatedAt: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error updating project lead in Supabase:', error);
    return false;
  }
  return true;
}

export async function updateSecondaryLeadInDb(id: string, updates: Partial<SecondaryLead>): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client
    .from('secondary_leads')
    .update({ ...updates, updatedAt: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Error updating secondary lead in Supabase:', error);
    return false;
  }
  return true;
}

export async function deleteProjectLeadFromDb(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client.from('project_leads').delete().eq('id', id);
  if (error) {
    console.error('Error deleting project lead from Supabase:', error);
    return false;
  }
  return true;
}

export async function deleteSecondaryLeadFromDb(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client.from('secondary_leads').delete().eq('id', id);
  if (error) {
    console.error('Error deleting secondary lead from Supabase:', error);
    return false;
  }
  return true;
}

export async function bulkInsertProjectLeadsToDb(leads: ProjectLead[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || leads.length === 0) return false;

  const { error } = await client.from('project_leads').insert(leads);
  if (error) {
    console.error('Error bulk inserting project leads into Supabase:', error);
    return false;
  }
  return true;
}

export async function bulkInsertSecondaryLeadsToDb(leads: SecondaryLead[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || leads.length === 0) return false;

  const { error } = await client.from('secondary_leads').insert(leads);
  if (error) {
    console.error('Error bulk inserting secondary leads into Supabase:', error);
    return false;
  }
  return true;
}

// ============================================================================
// Custom Tables & Rows CRUD (Dynamic User-Defined Tables)
// ============================================================================

export async function fetchCustomTablesFromDb(): Promise<any[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('custom_tables')
      .select('*')
      .order('createdAt', { ascending: true });

    if (error) {
      // Table might not exist yet if user hasn't run the SQL migration
      return [];
    }
    return data || [];
  } catch {
    return [];
  }
}

export async function saveCustomTableToDb(table: any): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('custom_tables').upsert([table]);
    if (error) {
      console.warn('Supabase custom_tables upsert:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function deleteCustomTableFromDb(tableId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    await client.from('custom_table_rows').delete().eq('tableId', tableId);
    await client.from('custom_tables').delete().eq('id', tableId);
    return true;
  } catch {
    return false;
  }
}

export async function fetchCustomTableRowsFromDb(tableId: string): Promise<any[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('custom_table_rows')
      .select('*')
      .eq('tableId', tableId)
      .order('createdAt', { ascending: false });

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function insertCustomTableRowToDb(row: any): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('custom_table_rows').insert([row]);
    return !error;
  } catch {
    return false;
  }
}

export async function updateCustomTableRowInDb(rowId: string, data: Record<string, any>): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client
      .from('custom_table_rows')
      .update({ data, updatedAt: new Date().toISOString() })
      .eq('id', rowId);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteCustomTableRowFromDb(rowId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('custom_table_rows').delete().eq('id', rowId);
    return !error;
  } catch {
    return false;
  }
}

export async function bulkInsertCustomTableRowsToDb(rows: any[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || rows.length === 0) return false;

  try {
    const { error } = await client.from('custom_table_rows').insert(rows);
    return !error;
  } catch {
    return false;
  }
}

