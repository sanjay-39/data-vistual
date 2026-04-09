/* ===================================================
   filters.js — Column selector and real-time chart updates
   =================================================== */

window.Filters = (function () {
  'use strict';

  let dataset = null;

  function populate(ds) {
    dataset = ds;
    const xSel = document.getElementById('sel-x-axis');
    const ySel = document.getElementById('sel-y-axis');
    if (!xSel || !ySel) return;

    xSel.innerHTML = '';
    ySel.innerHTML = '';

    ds.headers.forEach((h, i) => {
      const optX = new Option(h, i);
      const optY = new Option(h, i);
      xSel.appendChild(optX);
      ySel.appendChild(optY);
    });

    // Default: first categorical for X, first numeric for Y
    if (ds.categorical.length > 0) xSel.value = ds.categorical[0];
    else xSel.value = 0;

    if (ds.numeric.length > 0) ySel.value = ds.numeric[0];
    else ySel.value = Math.min(1, ds.headers.length - 1);
  }

  function getSelection() {
    return {
      xIndex: parseInt(document.getElementById('sel-x-axis').value || 0),
      yIndex: parseInt(document.getElementById('sel-y-axis').value || 1),
      chartType: document.querySelector('.chart-type-btn.active')?.dataset?.type || 'bar',
      palette: document.querySelector('.palette-btn.active')?.dataset?.palette || 'cosmic'
    };
  }

  function getDatasets(type, xIdx, yIdx) {
    if (!dataset) return { labels: [], datasets: [] };

    const labels = dataset.rows.map(r => String(r[xIdx]));

    if (type === 'scatter') {
      const xVals = dataset.rows.map(r => parseFloat(r[xIdx]));
      const yVals = dataset.rows.map(r => parseFloat(r[yIdx]));
      const points = xVals.map((x, i) => ({
        x: isNaN(x) ? i : x,
        y: isNaN(yVals[i]) ? 0 : yVals[i]
      }));
      return {
        labels,
        datasets: [{ label: `${dataset.headers[xIdx]} vs ${dataset.headers[yIdx]}`, data: points }]
      };
    }

    if (type === 'radar') {
      // Use all numeric columns as dimensions
      const numericCols = dataset.numeric.slice(0, 8);
      const radarLabels = numericCols.map(ci => dataset.headers[ci]);
      // Use up to 5 rows as series
      const seriesRows = dataset.rows.slice(0, 5);
      const ds = seriesRows.map(row => ({
        label: String(row[xIdx]),
        data: numericCols.map(ci => parseFloat(row[ci]) || 0)
      }));
      return { labels: radarLabels, datasets: ds };
    }

    if (type === 'pie' || type === 'doughnut') {
      const vals = dataset.rows.map(r => parseFloat(r[yIdx]) || 0);
      return {
        labels,
        datasets: [{ label: dataset.headers[yIdx], data: vals }]
      };
    }

    // Bar / Line: y data
    const yVals = dataset.rows.map(r => parseFloat(r[yIdx]) || 0);
    return {
      labels,
      datasets: [{ label: dataset.headers[yIdx], data: yVals }]
    };
  }

  return { populate, getSelection, getDatasets };
})();
