/* ===================================================
   manualEntry.js — Interactive editable data table
   =================================================== */

window.ManualEntry = (function () {
  'use strict';

  const DEFAULT_COLS = ['Category', 'Value A', 'Value B'];
  const DEFAULT_ROWS = [
    ['Apples', '45', '30'],
    ['Oranges', '78', '55'],
    ['Bananas', '32', '70'],
    ['Grapes', '55', '40'],
    ['Mango', '90', '65']
  ];

  let headers = [];
  let rows = [];
  let tableEl = null;

  function init() {
    tableEl = document.getElementById('manual-table');
    headers = [...DEFAULT_COLS];
    rows = DEFAULT_ROWS.map(r => [...r]);
    render();
    bindButtons();
  }

  function render() {
    if (!tableEl) return;
    tableEl.innerHTML = '';

    // THEAD
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    headers.forEach((h, ci) => {
      const th = document.createElement('th');
      th.setAttribute('contenteditable', 'true');
      th.setAttribute('spellcheck', 'false');
      th.textContent = h;
      th.addEventListener('blur', () => { headers[ci] = th.textContent.trim() || `Column ${ci + 1}`; });
      th.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); th.blur(); } });

      const delBtn = document.createElement('span');
      delBtn.className = 'col-del-btn';
      delBtn.textContent = '✕';
      delBtn.title = 'Delete column';
      delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteColumn(ci); });
      th.appendChild(delBtn);

      tr.appendChild(th);
    });
    // Extra "add col" header cell
    const addColTh = document.createElement('th');
    addColTh.style.cssText = 'width:40px;text-align:center;';
    tr.appendChild(addColTh);
    thead.appendChild(tr);
    tableEl.appendChild(thead);

    // TBODY
    const tbody = document.createElement('tbody');
    rows.forEach((row, ri) => {
      const tr2 = document.createElement('tr');
      row.forEach((cell, ci) => {
        const td = document.createElement('td');
        td.setAttribute('contenteditable', 'true');
        td.setAttribute('spellcheck', 'false');
        td.textContent = cell;
        td.addEventListener('blur', () => { rows[ri][ci] = td.textContent.trim(); });
        td.addEventListener('keydown', e => {
          if (e.key === 'Enter') { e.preventDefault(); td.blur(); }
          if (e.key === 'Tab') {
            e.preventDefault();
            const nextTd = tr2.cells[ci + 1];
            if (nextTd) nextTd.focus();
          }
        });
        tr2.appendChild(td);
      });
      // Delete row button cell
      const delTd = document.createElement('td');
      delTd.style.cssText = 'text-align:center;padding:8px 4px;';
      const rowDelBtn = document.createElement('span');
      rowDelBtn.className = 'row-del-btn';
      rowDelBtn.textContent = '✕';
      rowDelBtn.title = 'Delete row';
      rowDelBtn.addEventListener('click', () => deleteRow(ri));
      delTd.appendChild(rowDelBtn);
      tr2.appendChild(delTd);
      tbody.appendChild(tr2);
    });
    tableEl.appendChild(tbody);
  }

  function addColumn() {
    const name = `Series ${headers.length}`;
    headers.push(name);
    rows = rows.map(row => [...row, '0']);
    render();
  }

  function deleteColumn(ci) {
    if (headers.length <= 1) { window.App && App.toast('Need at least one column.', 'error'); return; }
    headers.splice(ci, 1);
    rows = rows.map(row => { row.splice(ci, 1); return row; });
    render();
  }

  function addRow() {
    rows.push(headers.map(() => ''));
    render();
    // Focus last row first cell
    setTimeout(() => {
      const tbody = tableEl.querySelector('tbody');
      if (tbody) {
        const lastRow = tbody.lastElementChild;
        if (lastRow) lastRow.cells[0].focus();
      }
    }, 50);
  }

  function deleteRow(ri) {
    if (rows.length <= 1) { window.App && App.toast('Need at least one row.', 'error'); return; }
    rows.splice(ri, 1);
    render();
  }

  function clearTable() {
    headers = [...DEFAULT_COLS];
    rows = DEFAULT_ROWS.map(r => [...r]);
    render();
  }

  function getData() {
    // Sync any in-progress edits
    const cells = tableEl.querySelectorAll('td[contenteditable]');
    cells.forEach(td => {
      const ri = td.parentElement.rowIndex - 1;
      const ci = td.cellIndex;
      if (ri >= 0 && ri < rows.length && ci < headers.length) {
        rows[ri][ci] = td.textContent.trim();
      }
    });
    const ths = tableEl.querySelectorAll('th[contenteditable]');
    ths.forEach((th, hi) => { headers[hi] = th.textContent.replace('✕','').trim() || `Column ${hi + 1}`; });

    return { headers: [...headers], rows: rows.map(r => [...r]) };
  }

  function bindButtons() {
    document.getElementById('btn-add-col').addEventListener('click', addColumn);
    document.getElementById('btn-add-row').addEventListener('click', addRow);
    document.getElementById('btn-clear-manual').addEventListener('click', clearTable);
  }

  return { init, getData };
})();
