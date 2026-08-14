import './setup.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import exportService from '../src/services/export.service.js';

test('ExportService creates CSV, Excel-compatible CSV, and PDF payloads', () => {
  const rows = [{ stage: 'job_created', count: 2 }];
  assert.match(exportService.toCsv(rows), /stage,count/);
  assert.match(exportService.toExcel(rows), /job_created/);
  assert.match(exportService.toPdf(rows), /%PDF-1.4/);
});
