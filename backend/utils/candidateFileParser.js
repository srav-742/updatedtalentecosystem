const path = require('path');
const pdf = require('pdf-parse');
let mammoth = null;
try {
    mammoth = require('mammoth');
} catch (mErr) {
    console.warn('[CANDIDATE-PARSER] Mammoth not loaded:', mErr.message);
}
let xlsx = null;
try {
    xlsx = require('xlsx');
} catch (xErr) {
    console.warn('[CANDIDATE-PARSER] XLSX not loaded:', xErr.message);
}

/**
 * Extracts readable candidate text from various document and spreadsheet formats.
 * Supports: .pdf, .docx, .doc, .xlsx, .xls, .csv, .txt
 *
 * @param {Buffer} fileBuffer
 * @param {string} originalname
 * @param {string} mimeType
 * @returns {Promise<{ text: string, metadata: { detectedEmail?: string, detectedName?: string, detectedPhone?: string, detectedSkills?: string[] } }>}
 */
async function extractCandidateText(fileBuffer, originalname = '', mimeType = '') {
    if (!fileBuffer || !fileBuffer.length) {
        throw new Error('Uploaded file is empty.');
    }

    const ext = path.extname(originalname || '').toLowerCase();
    const mime = (mimeType || '').toLowerCase();
    let text = '';
    const metadata = {};

    // 1. PDF Documents (.pdf)
    if (ext === '.pdf' || mime.includes('pdf')) {
        try {
            const data = await pdf(fileBuffer);
            text = (data?.text || '').trim();
        } catch (pdfErr) {
            console.warn('[CANDIDATE-PARSER] PDF Parse error, trying raw UTF-8:', pdfErr.message);
            const rawStr = fileBuffer.toString('utf8');
            if (rawStr && rawStr.trim().length > 20) {
                text = rawStr.trim();
            } else {
                throw new Error(`Failed to extract text from PDF file: ${pdfErr.message}`);
            }
        }
    }

    // 2. Word Documents (.docx, .doc)
    else if (ext === '.docx' || ext === '.doc' || mime.includes('word') || mime.includes('wordprocessingml') || mime.includes('msword')) {
        if (mammoth) {
            try {
                const docxResult = await mammoth.extractRawText({ buffer: fileBuffer });
                if (docxResult && docxResult.value && docxResult.value.trim()) {
                    text = docxResult.value.trim();
                }
            } catch (docxErr) {
                console.warn('[CANDIDATE-PARSER] Mammoth parsing warning:', docxErr.message);
            }
        }

        // Fallback for .docx (XML text string match inside zip)
        if (!text) {
            const rawUtf8 = fileBuffer.toString('utf8');
            const textParts = rawUtf8.match(/<w:t[^>]*>([^<]+)<\/w:t>/g) || [];
            if (textParts.length > 0) {
                text = textParts.map(t => t.replace(/<[^>]+>/g, '')).join(' ').trim();
            }
        }

        // Fallback for legacy binary .doc (Latin-1 string filter)
        if (!text) {
            const asciiParts = (fileBuffer.toString('latin1').match(/[\x20-\x7E\r\n\t]{6,}/g) || [])
                .map(s => s.trim())
                .filter(s => s.length > 5 && !/^(?:Microsoft|WordDocument|CompObj|Normal\.dotm?|Root Entry|DocumentSummaryInformation)/i.test(s));
            if (asciiParts.length > 0) {
                text = asciiParts.join('\n\n').trim();
            }
        }

        if (!text) {
            throw new Error('Unable to extract text from Word document. Please ensure it is a valid .docx or .doc file.');
        }
    }

    // 3. Excel Spreadsheets (.xlsx, .xls) & CSV (.csv)
    else if (ext === '.xlsx' || ext === '.xls' || ext === '.csv' || mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) {
        if (xlsx) {
            try {
                const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
                const lines = [];

                for (const sheetName of workbook.SheetNames) {
                    const sheet = workbook.Sheets[sheetName];
                    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                    if (!rows || rows.length === 0) continue;

                    // Identify potential headers
                    const headerRow = (rows[0] || []).map(cell => String(cell || '').trim());
                    let nameCol = -1;
                    let emailCol = -1;
                    let phoneCol = -1;
                    let skillsCol = -1;

                    headerRow.forEach((col, idx) => {
                        const lower = col.toLowerCase();
                        if (nameCol === -1 && /^(name|candidate|candidate\s*name|full\s*name|applicant)$/i.test(lower)) nameCol = idx;
                        if (emailCol === -1 && /email|e-mail|mail/i.test(lower)) emailCol = idx;
                        if (phoneCol === -1 && /phone|mobile|contact|tel/i.test(lower)) phoneCol = idx;
                        if (skillsCol === -1 && /skill|tech|stack|expertise/i.test(lower)) skillsCol = idx;
                    });

                    // Format each row with column identifiers
                    for (let r = 0; r < rows.length; r++) {
                        const row = rows[r];
                        if (!row || row.every(c => !String(c).trim())) continue;

                        if (r === 0 && (nameCol !== -1 || emailCol !== -1)) {
                            lines.push(`Columns: ${headerRow.join(' | ')}`);
                            continue;
                        }

                        // Capture first detected candidate in metadata
                        if (r >= 1) {
                            if (!metadata.detectedName && nameCol !== -1 && row[nameCol]) {
                                metadata.detectedName = String(row[nameCol]).trim();
                            }
                            if (!metadata.detectedEmail && emailCol !== -1 && row[emailCol]) {
                                const em = String(row[emailCol]).trim();
                                if (em.includes('@')) metadata.detectedEmail = em;
                            }
                            if (!metadata.detectedPhone && phoneCol !== -1 && row[phoneCol]) {
                                metadata.detectedPhone = String(row[phoneCol]).trim();
                            }
                            if (!metadata.detectedSkills && skillsCol !== -1 && row[skillsCol]) {
                                metadata.detectedSkills = String(row[skillsCol]).split(/[,;|]/).map(s => s.trim()).filter(Boolean);
                            }
                        }

                        // Create readable text line
                        const cellDescriptions = row.map((val, idx) => {
                            const valStr = String(val || '').trim();
                            if (!valStr) return '';
                            const header = headerRow[idx] ? `${headerRow[idx]}: ` : '';
                            return `${header}${valStr}`;
                        }).filter(Boolean);

                        if (cellDescriptions.length > 0) {
                            lines.push(cellDescriptions.join(', '));
                        }
                    }
                }

                if (lines.length > 0) {
                    text = lines.join('\n');
                }
            } catch (xlsxErr) {
                console.warn('[CANDIDATE-PARSER] XLSX parsing warning:', xlsxErr.message);
            }
        }

        // CSV plain-text fallback
        if (!text) {
            const rawCsv = fileBuffer.toString('utf8').replace(/^\uFEFF/, '').trim();
            if (rawCsv) text = rawCsv;
        }

        if (!text) {
            throw new Error('Unable to extract content from spreadsheet or CSV file.');
        }
    }

    // 4. Plain Text (.txt) or Generic Fallback
    else {
        text = fileBuffer.toString('utf8').replace(/^\uFEFF/, '').trim();
        if (!text && fileBuffer.length > 0) {
            text = fileBuffer.toString('latin1').trim();
        }
    }

    if (!text || text.trim().length === 0) {
        throw new Error('Uploaded file has no extractable text or data.');
    }

    return {
        text: text.trim(),
        metadata
    };
}

module.exports = {
    extractCandidateText
};
