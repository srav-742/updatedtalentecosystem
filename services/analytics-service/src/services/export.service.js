const flattenRows = (rows) => rows.map((row) => Object.fromEntries(
  Object.entries(row).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : value])
));

export class ExportService {
  toCsv(rows) {
    const flatRows = flattenRows(rows);
    const headers = [...new Set(flatRows.flatMap((row) => Object.keys(row)))];
    const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    return [
      headers.join(','),
      ...flatRows.map((row) => headers.map((header) => escape(row[header])).join(',')),
    ].join('\n');
  }

  toExcel(rows) {
    return this.toCsv(rows);
  }

  toPdf(rows, title = 'Hire1Percent Analytics Report') {
    const body = rows.map((row) => JSON.stringify(row)).join('\n');
    return `%PDF-1.4\n% ${title}\n${body}\n%%EOF`;
  }
}

export const exportService = new ExportService();
export default exportService;
