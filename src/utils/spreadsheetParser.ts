import * as XLSX from 'xlsx';

/**
 * Robust CSV/TSV parser supporting quotes, delimiters, and embedded line breaks.
 */
export function parseSpreadsheetText(rawText: string): string[][] {
  const text = rawText.trim();
  if (!text) return [];

  // Detect primary delimiter: count tabs vs commas on the first line
  const firstLineEnd = text.indexOf('\n') === -1 ? text.length : text.indexOf('\n');
  const firstLine = text.substring(0, firstLineEnd);
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = tabCount >= commaCount && tabCount > 0 ? '\t' : (commaCount > 0 ? ',' : '\t');

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote: "" -> "
        currentCell += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
        i++;
        continue;
      }
    }

    if (!inQuotes) {
      if (char === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = '';
        i++;
        continue;
      } else if (char === '\r') {
        if (nextChar === '\n') i++;
        currentRow.push(currentCell.trim());
        currentCell = '';
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        currentCell = '';
        if (currentRow.some((c) => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        i++;
        continue;
      }
    }

    currentCell += char;
    i++;
  }

  // Push last cell & row
  currentRow.push(currentCell.trim());
  if (currentRow.some((c) => c.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * Parses an Excel (.xlsx, .xls) or CSV File directly using the xlsx engine.
 */
export async function parseExcelFile(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
        
        // Find the first sheet that has data
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          resolve([]);
          return;
        }

        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          raw: false,
          blankrows: false,
        });

        // Convert all elements to trimmed strings
        const matrix: string[][] = rawJson
          .map((row) => (Array.isArray(row) ? row.map((cell) => String(cell ?? '').trim()) : []))
          .filter((row) => row.some((cell) => cell.length > 0));

        resolve(matrix);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generates and downloads a clean .xlsx starter template matching specific column names.
 */
export function downloadExcelTemplate(
  fileName: string,
  columns: string[],
  sampleRows: string[][] = []
) {
  try {
    const wb = XLSX.utils.book_new();
    const wsData = [columns, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Apply auto column widths
    ws['!cols'] = columns.map((col, idx) => {
      const maxSampleLen = sampleRows.reduce(
        (max, row) => Math.max(max, (row[idx] || '').length),
        col.length
      );
      return { wch: Math.min(Math.max(maxSampleLen + 4, 15), 40) };
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    const safeName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
    XLSX.writeFile(wb, safeName);
  } catch (err) {
    console.error('Failed to create excel template download:', err);
  }
}

/**
 * Fuzzy matches a pasted or imported column title or values to a target column.
 */
export function guessColumnMapping(
  pastedHeader: string,
  sampleValues: string[],
  availableTargets: { key: string; name: string }[]
): string | null {
  const cleanHeader = pastedHeader.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

  // 1. Direct name or key match
  for (const target of availableTargets) {
    const targetCleanName = target.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const targetCleanKey = target.key.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

    if (
      cleanHeader === targetCleanName ||
      cleanHeader === targetCleanKey ||
      cleanHeader.includes(targetCleanName) ||
      targetCleanName.includes(cleanHeader) ||
      cleanHeader.includes(targetCleanKey)
    ) {
      return target.key;
    }
  }

  // 2. Keyword heuristic matching on header
  if (/phone|mobile|contact|cell|whatsapp|number/i.test(pastedHeader)) {
    const found = availableTargets.find((t) => /contact|phone|mobile/i.test(t.key) || /contact|phone|mobile/i.test(t.name));
    if (found) return found.key;
  }
  if (/owner|client|customer|name|buyer|investor|lead/i.test(pastedHeader)) {
    const found = availableTargets.find((t) => /owner|client|name/i.test(t.key) || /owner|client|name/i.test(t.name));
    if (found) return found.key;
  }
  if (/project|building|property|tower|community|location/i.test(pastedHeader)) {
    const found = availableTargets.find((t) => /project|property|tower|community/i.test(t.key) || /project|property|community/i.test(t.name));
    if (found) return found.key;
  }
  if (/budget|price|amount|aed|cost|value/i.test(pastedHeader)) {
    const found = availableTargets.find((t) => /budget|price|amount/i.test(t.key) || /budget|price|amount/i.test(t.name));
    if (found) return found.key;
  }
  if (/status|callstatus|remarks|stage/i.test(pastedHeader)) {
    const found = availableTargets.find((t) => /status/i.test(t.key) || /status/i.test(t.name));
    if (found) return found.key;
  }
  if (/notes|remarks|comment|description/i.test(pastedHeader)) {
    const found = availableTargets.find((t) => /notes|remarks/i.test(t.key) || /notes|remarks/i.test(t.name));
    if (found) return found.key;
  }
  if (/date|followup|schedule|time/i.test(pastedHeader)) {
    const found = availableTargets.find((t) => /date|followup/i.test(t.key) || /date|followup/i.test(t.name));
    if (found) return found.key;
  }
  if (/unit|bedroom|bed|size|sqft/i.test(pastedHeader)) {
    const found = availableTargets.find((t) => /unit/i.test(t.key) || /unit/i.test(t.name));
    if (found) return found.key;
  }
  if (/developer/i.test(pastedHeader)) {
    const found = availableTargets.find((t) => /developer/i.test(t.key) || /developer/i.test(t.name));
    if (found) return found.key;
  }

  // 3. Sample value inspection
  const nonEmpties = sampleValues.filter(Boolean);
  if (nonEmpties.length > 0) {
    const isPhoneLike = nonEmpties.some((v) => /^\+?[0-9\s\-()]{7,18}$/.test(v));
    if (isPhoneLike) {
      const found = availableTargets.find((t) => /contact|phone|mobile/i.test(t.key) || /contact|phone|mobile/i.test(t.name));
      if (found) return found.key;
    }

    const isDateLike = nonEmpties.some((v) => /^\d{4}-\d{2}-\d{2}$|^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(v));
    if (isDateLike) {
      const found = availableTargets.find((t) => /date/i.test(t.key) || /date/i.test(t.name));
      if (found) return found.key;
    }
  }

  return null;
}
