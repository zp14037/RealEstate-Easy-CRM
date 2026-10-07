/**
 * tableSorting.ts
 * Reliable, immutable row ordering helper.
 * Ensures custom table rows strictly preserve their creation order ('order by created')
 * even when cell statuses are updated or Supabase realtime synchronizations occur.
 */

/**
 * Extracts a numeric creation timestamp from a row.
 * Handles:
 * 1. ISO 8601 strings (e.g., '2026-10-07T18:25:30.123Z')
 * 2. Embedded timestamps in row IDs (e.g. 'row_1728325000000_abcd', 'row_bulk_1728325000000_3_abcd')
 * 3. Fallback date strings (e.g. '2026-10-07')
 */
export function extractRowCreationTimestamp(row: { createdAt?: string; id?: string }): number {
  if (!row) return 0;

  // 1. Full ISO timestamp with time precision
  if (row.createdAt && (row.createdAt.includes('T') || row.createdAt.length > 10)) {
    const parsed = new Date(row.createdAt).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // 2. Extract timestamp embedded in row.id
  if (row.id) {
    // Bulk pattern with index: row_bulk_1728325000000_12_... or proj-bulk-1728325000000-12-...
    const bulkMatch = row.id.match(/(?:bulk[_-]|row_bulk_)(\d{12,14})[_-](\d+)/);
    if (bulkMatch && bulkMatch[1] && bulkMatch[2]) {
      const base = parseInt(bulkMatch[1], 10);
      const idx = parseInt(bulkMatch[2], 10);
      return base + idx * 10;
    }

    // Single row pattern: row_1728325000000_..., row_dup_1728325000000_..., proj-1728325000000-..., sec-1728325000000-...
    const singleMatch = row.id.match(/(?:row_|row_dup_|proj-|sec-|crow_)?(\d{12,14})/);
    if (singleMatch && singleMatch[1]) {
      const base = parseInt(singleMatch[1], 10);
      if (!isNaN(base) && base > 0) {
        return base;
      }
    }
  }

  // 3. Fallback to createdAt date
  if (row.createdAt) {
    const parsed = new Date(row.createdAt).getTime();
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 0;
}

/**
 * Deterministic comparator for custom table rows.
 * Default is 'asc' (oldest first: 1, 2, 3... in the exact order rows were created).
 */
export function compareRowsByCreation(
  a: { createdAt?: string; id?: string },
  b: { createdAt?: string; id?: string },
  direction: 'asc' | 'desc' = 'asc'
): number {
  const tA = extractRowCreationTimestamp(a);
  const tB = extractRowCreationTimestamp(b);

  if (tA !== tB) {
    return direction === 'asc' ? tA - tB : tB - tA;
  }

  // Secondary deterministic tiebreaker by id
  const idCompare = String(a.id || '').localeCompare(String(b.id || ''));
  return direction === 'asc' ? idCompare : -idCompare;
}
