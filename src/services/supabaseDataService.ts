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
    .neq('clientType', 'CUSTOM_TABLE')
    .neq('clientType', 'CUSTOM_ROW')
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
// Custom Tables & Rows CRUD (Dynamic User-Defined Tables with Auto-Fallback)
// ============================================================================

export async function fetchCustomTablesFromDb(userEmail?: string): Promise<any[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const cleanEmail = (userEmail || '').trim().toLowerCase();
  if (!cleanEmail) {
    // Strictly private: tables are only visible to the user who created them with their Google sign-in ID
    return [];
  }

  // 1. Try dedicated custom_tables table in Supabase
  try {
    const query = client.from('custom_tables').select('*').eq('userEmail', cleanEmail);
    const { data, error } = await query.order('createdAt', { ascending: true });

    if (!error && data) {
      return data.filter((t: any) => (t.userEmail || '').trim().toLowerCase() === cleanEmail);
    }
  } catch (e) {
    // Fall through to fallback
  }

  // 2. Fallback: retrieve from active Supabase table 'secondary_leads' where clientType = 'CUSTOM_TABLE'
  try {
    const fallbackQuery = client
      .from('secondary_leads')
      .select('*')
      .eq('clientType', 'CUSTOM_TABLE')
      .eq('property', cleanEmail);

    const { data: fbData, error: fbError } = await fallbackQuery.order('createdAt', { ascending: true });
    if (!fbError && fbData) {
      return fbData
        .map((rec) => {
          try {
            const parsed = JSON.parse(rec.notes || '{}');
            return {
              id: rec.id.replace('__ctable_', ''),
              name: rec.name,
              description: rec.expectationRequirements || '',
              columns: parsed.columns || [],
              userEmail: rec.property || '',
              createdAt: rec.createdAt,
              updatedAt: rec.updatedAt,
            };
          } catch {
            return {
              id: rec.id.replace('__ctable_', ''),
              name: rec.name,
              description: '',
              columns: [],
              userEmail: rec.property || '',
              createdAt: rec.createdAt,
              updatedAt: rec.updatedAt,
            };
          }
        })
        .filter((t) => (t.userEmail || '').trim().toLowerCase() === cleanEmail);
    }
  } catch (e) {
    console.warn('Fallback custom_tables fetch error:', e);
  }

  return [];
}

export async function saveCustomTableToDb(table: any, userEmail?: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const cleanEmail = (userEmail || table.userEmail || '').trim().toLowerCase();
  const tablePayload = {
    ...table,
    userEmail: cleanEmail,
  };

  // 1. Try dedicated custom_tables table in Supabase
  try {
    const { error } = await client.from('custom_tables').upsert([tablePayload]);
    if (!error) return true;
  } catch {}

  // 2. Fallback to active Supabase table 'secondary_leads'
  try {
    const fallbackRecord = {
      id: '__ctable_' + table.id,
      name: table.name,
      property: cleanEmail,
      clientType: 'CUSTOM_TABLE',
      expectationRequirements: table.description || '',
      notes: JSON.stringify(tablePayload),
      createdAt: table.createdAt,
      updatedAt: new Date().toISOString(),
    };
    const { error: fbErr } = await client.from('secondary_leads').upsert([fallbackRecord]);
    return !fbErr;
  } catch (e) {
    console.error('Error saving custom table to Supabase:', e);
    return false;
  }
}

export async function deleteCustomTableFromDb(tableId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    // Try primary
    await client.from('custom_table_rows').delete().eq('tableId', tableId);
    await client.from('custom_tables').delete().eq('id', tableId);
  } catch {}

  try {
    // Fallback cleanup in secondary_leads
    await client.from('secondary_leads').delete().eq('id', '__ctable_' + tableId);
    await client.from('secondary_leads').delete().eq('clientType', 'CUSTOM_ROW').eq('property', tableId);
    return true;
  } catch {
    return false;
  }
}

export async function fetchCustomTableRowsFromDb(tableId: string, userEmail?: string): Promise<any[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const cleanEmail = (userEmail || '').trim().toLowerCase();
  if (!cleanEmail) {
    // Strictly private: rows are only visible to the user with their Google sign-in email
    return [];
  }

  // 1. Try dedicated custom_table_rows table
  try {
    let query = client.from('custom_table_rows').select('*').eq('tableId', tableId).eq('userEmail', cleanEmail);
    const { data, error } = await query
      .order('createdAt', { ascending: true })
      .order('id', { ascending: true });
    if (!error && data) {
      return data.filter((r: any) => (r.userEmail || '').trim().toLowerCase() === cleanEmail);
    }
  } catch {}

  // 2. Fallback to secondary_leads
  try {
    const { data, error } = await client
      .from('secondary_leads')
      .select('*')
      .eq('clientType', 'CUSTOM_ROW')
      .eq('property', tableId)
      .eq('remarksStatus', cleanEmail)
      .order('createdAt', { ascending: true })
      .order('id', { ascending: true });

    if (!error && data) {
      return data
        .map((rec) => {
          try {
            const parsed = JSON.parse(rec.notes || '{}');
            return {
              id: rec.id.replace('__crow_', ''),
              tableId: rec.property,
              data: parsed.data || (rec.expectationRequirements ? JSON.parse(rec.expectationRequirements) : {}),
              userEmail: rec.remarksStatus || '',
              createdAt: rec.createdAt,
              updatedAt: rec.updatedAt,
            };
          } catch {
            return {
              id: rec.id.replace('__crow_', ''),
              tableId: rec.property,
              data: {},
              userEmail: rec.remarksStatus || '',
              createdAt: rec.createdAt,
              updatedAt: rec.updatedAt,
            };
          }
        })
        .filter((r) => (r.userEmail || '').trim().toLowerCase() === cleanEmail);
    }
  } catch {}

  return [];
}

export async function insertCustomTableRowToDb(row: any, userEmail?: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const cleanEmail = (userEmail || row.userEmail || '').trim().toLowerCase();
  const rowPayload = {
    ...row,
    userEmail: cleanEmail,
  };

  // 1. Try dedicated custom_table_rows table
  try {
    const { error } = await client.from('custom_table_rows').insert([rowPayload]);
    if (!error) return true;
  } catch {}

  // 2. Fallback to secondary_leads
  try {
    const fallbackRecord = {
      id: '__crow_' + row.id,
      name: row.data?.['name'] || row.data?.['client_name'] || Object.values(row.data || {})[0] || 'Row',
      property: row.tableId, // store tableId in property
      clientType: 'CUSTOM_ROW',
      remarksStatus: userEmail || row.userEmail || '',
      notes: JSON.stringify(rowPayload),
      expectationRequirements: JSON.stringify(row.data || {}),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
    const { error: fbErr } = await client.from('secondary_leads').insert([fallbackRecord]);
    return !fbErr;
  } catch (e) {
    console.error('Error inserting custom row into Supabase:', e);
    return false;
  }
}

export async function updateCustomTableRowInDb(rowId: string, data: Record<string, any>): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || !data || Object.keys(data).length === 0) return false;

  // 1. Try dedicated custom_table_rows table
  try {
    const { data: existingRec } = await client
      .from('custom_table_rows')
      .select('data')
      .eq('id', rowId)
      .maybeSingle();

    const mergedData = { ...(existingRec?.data || {}), ...data };

    const { error } = await client
      .from('custom_table_rows')
      .update({ data: mergedData, updatedAt: new Date().toISOString() })
      .eq('id', rowId);
    if (!error) return true;
  } catch {}

  // 2. Fallback in secondary_leads
  try {
    const { data: existingRec } = await client
      .from('secondary_leads')
      .select('notes')
      .eq('id', '__crow_' + rowId)
      .maybeSingle();

    let updatedNotes = '';
    let mergedData = data;
    try {
      const parsed = JSON.parse(existingRec?.notes || '{}');
      mergedData = { ...(parsed.data || {}), ...data };
      parsed.data = mergedData;
      parsed.updatedAt = new Date().toISOString();
      updatedNotes = JSON.stringify(parsed);
    } catch {
      updatedNotes = JSON.stringify({ data: mergedData, updatedAt: new Date().toISOString() });
    }

    const updatedName = mergedData?.['client_name'] || mergedData?.['name'] || Object.values(mergedData || {})[0] || 'Row';
    const { error: fbErr } = await client
      .from('secondary_leads')
      .update({
        name: String(updatedName).slice(0, 100),
        notes: updatedNotes,
        expectationRequirements: JSON.stringify(mergedData),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', '__crow_' + rowId);
    return !fbErr;
  } catch {
    return false;
  }
}

export async function deleteCustomTableRowFromDb(rowId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    await client.from('custom_table_rows').delete().eq('id', rowId);
  } catch {}

  try {
    const { error } = await client.from('secondary_leads').delete().eq('id', '__crow_' + rowId);
    return !error;
  } catch {
    return false;
  }
}

export async function clearCustomTableRowsFromDb(tableId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    await client.from('custom_table_rows').delete().eq('tableId', tableId);
  } catch {}

  try {
    const { error } = await client
      .from('secondary_leads')
      .delete()
      .eq('clientType', 'CUSTOM_ROW')
      .eq('property', tableId);
    return !error;
  } catch {
    return false;
  }
}

export async function bulkInsertCustomTableRowsToDb(rows: any[], userEmail?: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client || rows.length === 0) return false;

  const cleanEmail = (userEmail || '').trim().toLowerCase();

  // 1. Try dedicated custom_table_rows table
  try {
    const payload = rows.map((r) => ({ ...r, userEmail: cleanEmail || r.userEmail || '' }));
    const { error } = await client.from('custom_table_rows').insert(payload);
    if (!error) return true;
  } catch {}

  // 2. Fallback to secondary_leads
  try {
    const fallbackRecords = rows.map((row) => ({
      id: '__crow_' + row.id,
      name: row.data?.['name'] || row.data?.['client_name'] || Object.values(row.data || {})[0] || 'Row',
      property: row.tableId,
      clientType: 'CUSTOM_ROW',
      remarksStatus: cleanEmail || row.userEmail || '',
      notes: JSON.stringify({ ...row, userEmail: cleanEmail || row.userEmail || '' }),
      expectationRequirements: JSON.stringify(row.data || {}),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
    const { error: fbErr } = await client.from('secondary_leads').insert(fallbackRecords);
    return !fbErr;
  } catch (e) {
    console.error('Error bulk inserting custom rows into Supabase:', e);
    return false;
  }
}
