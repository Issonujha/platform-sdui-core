export interface ExportColumn<T = any> {
  key: string;
  label: string;
  render?: (val: any, row: T) => string;
}

/**
 * Generates an RFC 4180 compliant CSV string from an array of objects.
 */
export function generateCsvString<T extends Record<string, any>>(
  columns: ExportColumn<T>[],
  data: T[]
): string {
  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const headerRow = columns.map((col) => escapeCell(col.label)).join(',');
  const dataRows = data.map((row) =>
    columns
      .map((col) => {
        const rawVal = row[col.key];
        const formatted = col.render ? col.render(rawVal, row) : rawVal;
        return escapeCell(formatted);
      })
      .join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Exports data to CSV and opens the native Share sheet on mobile devices.
 */
export async function shareCsvExport<T extends Record<string, any>>(
  filename: string,
  columns: ExportColumn<T>[],
  data: T[],
  options?: { title?: string; dialogTitle?: string }
): Promise<{ success: boolean; csv: string }> {
  const csv = generateCsvString(columns, data);
  try {
    let ShareApi: any = null;
    try {
      const rn = await import('react-native');
      ShareApi = rn?.Share;
    } catch {
      ShareApi = (globalThis as any).ReactNative?.Share;
    }

    if (ShareApi && typeof ShareApi.share === 'function') {
      await ShareApi.share(
        {
          title: options?.title || filename,
          message: csv,
        },
        {
          dialogTitle: options?.dialogTitle || `Export ${filename}`,
        }
      );
    }
    return { success: true, csv };
  } catch (err) {
    console.warn('shareCsvExport caught error:', err);
    return { success: false, csv };
  }
}
