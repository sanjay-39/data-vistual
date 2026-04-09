/* ===================================================
   dataProcessor.js — Data cleaning, normalization,
   column type detection, and summary statistics
   =================================================== */

window.DataProcessor = (function () {
  'use strict';

  /**
   * Clean and process a raw dataset
   * @param {{headers: string[], rows: any[][]}} raw
   * @returns {{headers, rows, types, numeric, categorical, stats}}
   */
  function process(raw) {
    let { headers, rows } = raw;

    // 1. Remove completely empty rows
    rows = rows.filter(row => row.some(cell => String(cell).trim() !== ''));

    // 2. Remove duplicate rows (stringify comparison)
    const seen = new Set();
    rows = rows.filter(row => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 3. Trim whitespace from all cells
    rows = rows.map(row => row.map(cell => String(cell).trim()));

    // 4. Detect column types
    const types = headers.map((_, ci) => detectType(rows, ci));

    // 5. Identify numeric and categorical column indices
    const numeric = types.reduce((acc, t, i) => { if (t === 'numeric') acc.push(i); return acc; }, []);
    const categorical = types.reduce((acc, t, i) => { if (t === 'categorical') acc.push(i); return acc; }, []);

    // 6. Compute summary statistics per column
    const stats = computeStats(headers, rows, types);

    return { headers, rows, types, numeric, categorical, stats };
  }

  function detectType(rows, colIndex) {
    const values = rows.map(r => r[colIndex]).filter(v => v !== '' && v != null);
    if (values.length === 0) return 'empty';
    const numericCount = values.filter(v => !isNaN(parseFloat(v)) && isFinite(v)).length;
    const ratio = numericCount / values.length;
    return ratio >= 0.75 ? 'numeric' : 'categorical';
  }

  function computeStats(headers, rows, types) {
    return headers.map((h, ci) => {
      const values = rows.map(r => r[ci]).filter(v => v !== '' && v != null);
      const stat = { header: h, type: types[ci], count: values.length };

      if (types[ci] === 'numeric') {
        const nums = values.map(v => parseFloat(v)).filter(n => !isNaN(n));
        if (nums.length > 0) {
          stat.min = Math.min(...nums);
          stat.max = Math.max(...nums);
          stat.mean = nums.reduce((s, v) => s + v, 0) / nums.length;
          stat.sum = nums.reduce((s, v) => s + v, 0);
          // Median
          const sorted = [...nums].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          stat.median = sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
          // Std dev
          const variance = nums.reduce((s, v) => s + Math.pow(v - stat.mean, 2), 0) / nums.length;
          stat.stdDev = Math.sqrt(variance);
        }
      } else {
        // Categorical: frequency
        const freq = {};
        values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
        const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
        stat.uniqueCount = sorted.length;
        stat.topValue = sorted[0] ? sorted[0][0] : 'N/A';
        stat.topFreq = sorted[0] ? sorted[0][1] : 0;
        stat.frequency = sorted.slice(0, 10); // top 10
      }

      return stat;
    });
  }

  /**
   * Get column values as numbers (NaN-filtered)
   */
  function getNumericValues(dataset, colIndex) {
    return dataset.rows.map(r => parseFloat(r[colIndex])).filter(n => !isNaN(n));
  }

  /**
   * Get column values as strings
   */
  function getStringValues(dataset, colIndex) {
    return dataset.rows.map(r => String(r[colIndex]));
  }

  /**
   * Suggest the best chart type based on column types
   */
  function suggestChartType(dataset, xIdx, yIdx) {
    if (dataset.types[xIdx] === 'categorical') {
      if (dataset.stats[xIdx].uniqueCount <= 8) return 'pie';
      return 'bar';
    }
    if (dataset.types[xIdx] === 'numeric' && dataset.types[yIdx] === 'numeric') return 'scatter';
    return 'bar';
  }

  return { process, getNumericValues, getStringValues, suggestChartType };
})();
