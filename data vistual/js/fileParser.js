/* ===================================================
   fileParser.js — CSV, Excel, and text file parsers
   Returns normalized { headers: [], rows: [[]] }
   =================================================== */

window.FileParser = (function () {
  'use strict';

  /**
   * Parse a File object into a structured dataset
   * @param {File} file
   * @returns {Promise<{headers: string[], rows: any[][]}>}
   */
  function parseFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv') return parseCSV(file);
    if (ext === 'xlsx' || ext === 'xls') return parseExcel(file);
    if (ext === 'txt') return parseTxt(file);
    return Promise.reject(new Error(`Unsupported file type: .${ext}`));
  }

  // ---- CSV ----
  function parseCSV(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete(result) {
          if (!result.data || result.data.length < 1) {
            return reject(new Error('CSV file is empty or unreadable.'));
          }
          const raw = result.data;
          const headers = raw[0].map((h, i) => (String(h).trim() || `Column ${i + 1}`));
          const rows = raw.slice(1).map(r => {
            // Pad short rows
            while (r.length < headers.length) r.push('');
            return r.slice(0, headers.length);
          });
          resolve({ headers, rows });
        },
        error(err) { reject(new Error('CSV parse error: ' + err.message)); }
      });
    });
  }

  // ---- Excel ----
  function parseExcel(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const data = new Uint8Array(e.target.result);
          const wb = XLSX.read(data, { type: 'array' });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const raw = XLSX.utils.sheet_to_array(sheet, { defval: '' });
          if (!raw || raw.length < 1) return reject(new Error('Excel sheet is empty.'));
          const maxCols = Math.max(...raw.map(r => r.length));
          const headers = (raw[0] || []).map((h, i) => (String(h).trim() || `Column ${i + 1}`));
          // Ensure headers cover all columns
          while (headers.length < maxCols) headers.push(`Column ${headers.length + 1}`);
          const rows = raw.slice(1).map(r => {
            const padded = [...r];
            while (padded.length < headers.length) padded.push('');
            return padded.slice(0, headers.length).map(v => String(v));
          });
          resolve({ headers, rows });
        } catch (err) {
          reject(new Error('Excel parse error: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsArrayBuffer(file);
    });
  }

  // ---- Plain Text ----
  function parseTxt(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const text = e.target.result;
          const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
          if (lines.length === 0) return reject(new Error('Text file is empty.'));

          // Auto-detect delimiter: tab, pipe, comma, semicolon, or spaces
          const sample = lines[0];
          let delim = ',';
          if (sample.includes('\t')) delim = '\t';
          else if (sample.includes('|')) delim = '|';
          else if (sample.includes(';')) delim = ';';
          else if (/\s{2,}/.test(sample)) delim = /\s{2,}/;

          function splitLine(line) {
            if (typeof delim === 'string') return line.split(delim).map(s => s.trim());
            return line.split(delim).map(s => s.trim()).filter(s => s.length > 0);
          }

          const headers = splitLine(lines[0]).map((h, i) => h || `Column ${i + 1}`);
          const rows = lines.slice(1).map(l => {
            const parts = splitLine(l);
            while (parts.length < headers.length) parts.push('');
            return parts.slice(0, headers.length);
          });
          resolve({ headers, rows });
        } catch (err) {
          reject(new Error('Text parse error: ' + err.message));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsText(file);
    });
  }

  return { parseFile };
})();
