/* ===================================================
   app.js — Application bootstrap, navigation,
   state management, and event orchestration
   =================================================== */

(function () {
  'use strict';

  // ---- Global App State ----
  const App = {
    dataset: null,   // processed dataset
    fileName: null,
    sourceType: null // 'upload' | 'manual'
  };
  window.App = App;

  // ---- Toast notifications ----
  App.toast = function (msg, type = 'info', duration = 3500) {
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 350);
    }, duration);
  };

  // ---- Navigation ----
  const sections = ['upload', 'manual', 'visualize', 'stats', 'about'];
  const pageTitles = {
    upload: 'Upload Data',
    manual: 'Manual Entry',
    visualize: 'Visualization Studio',
    stats: 'Data Statistics',
    about: 'About DataVis Pro'
  };

  function showSection(id) {
    sections.forEach(s => {
      document.getElementById(`section-${s}`)?.classList.remove('active');
      document.getElementById(`nav-${s}`)?.classList.remove('active');
    });
    document.getElementById(`section-${id}`)?.classList.add('active');
    document.getElementById(`nav-${id}`)?.classList.add('active');
    document.getElementById('page-title').textContent = pageTitles[id] || id;
    window.__uiEffects?.initEffects();
  }

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const s = item.dataset.section;
      if (s) showSection(s);
      // Close mobile sidebar
      if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.remove('mobile-open');
      }
    });
  });

  // ---- Sidebar Toggle ----
  document.getElementById('menu-toggle').addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const main = document.getElementById('main-content');
    if (window.innerWidth < 768) {
      sidebar.classList.toggle('mobile-open');
    } else {
      sidebar.classList.toggle('collapsed');
      main.classList.toggle('expanded');
    }
  });

  // ---- File Upload ----
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  const btnBrowse = document.getElementById('btn-browse');

  btnBrowse.addEventListener('click', () => fileInput.click());
  uploadZone.addEventListener('click', (e) => {
    if (e.target === uploadZone || e.target.closest('.upload-zone-inner')) fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  async function handleFile(file) {
    const allowed = ['.csv', '.xlsx', '.xls', '.txt'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowed.includes(ext)) {
      App.toast(`Unsupported file type: ${ext}. Use CSV, XLSX, XLS, or TXT.`, 'error');
      return;
    }

    showProgress(true, 'Reading file...');
    await sleep(100);

    try {
      const raw = await FileParser.parseFile(file);
      showProgress(true, 'Processing data...');
      await sleep(150);

      App.dataset = DataProcessor.process(raw);
      App.fileName = file.name;
      App.sourceType = 'upload';

      showProgress(false);
      onDataReady();
      showPreviewTable(raw);
      App.toast(`✨ ${file.name} loaded — ${App.dataset.rows.length} rows, ${App.dataset.headers.length} columns`, 'success');
    } catch (err) {
      showProgress(false);
      App.toast(err.message, 'error');
    }
  }

  function showProgress(show, label = '') {
    const prog = document.getElementById('upload-progress');
    const inner = document.querySelector('.upload-zone-inner');
    prog.style.display = show ? 'block' : 'none';
    inner.style.display = show ? 'none' : 'flex';
    if (show) {
      document.getElementById('progress-label').textContent = label;
      animateProgress();
    }
  }

  let progInterval = null;
  function animateProgress() {
    const fill = document.getElementById('progress-fill');
    let w = 0;
    clearInterval(progInterval);
    progInterval = setInterval(() => {
      w = Math.min(w + Math.random() * 20, 90);
      fill.style.width = w + '%';
    }, 120);
    setTimeout(() => {
      clearInterval(progInterval);
      fill.style.width = '100%';
    }, 800);
  }

  // ---- Show Data Preview Table ----
  function showPreviewTable(raw) {
    const card = document.getElementById('preview-card');
    const table = document.getElementById('preview-table');
    const note = document.getElementById('table-note');
    const badge = document.getElementById('file-info-badge');

    card.style.display = 'block';
    badge.textContent = `${App.fileName} — ${App.dataset.rows.length} rows × ${App.dataset.headers.length} cols`;

    const maxPreview = 100;
    const allRows = App.dataset.rows;
    const headers = App.dataset.headers;

    // Build table
    table.innerHTML = '';
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    const rowNumTh = document.createElement('th');
    rowNumTh.textContent = '#';
    rowNumTh.style.color = 'var(--text-muted)';
    headRow.appendChild(rowNumTh);
    headers.forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    allRows.slice(0, maxPreview).forEach((row, ri) => {
      const tr = document.createElement('tr');
      const numTd = document.createElement('td');
      numTd.textContent = ri + 1;
      numTd.style.color = 'var(--text-muted)';
      numTd.style.fontFamily = 'var(--font-mono)';
      numTd.style.fontSize = '0.75rem';
      tr.appendChild(numTd);
      row.forEach(cell => {
        const td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    if (allRows.length > maxPreview) {
      note.textContent = `Showing first ${maxPreview} of ${allRows.length} rows. All rows are used for visualization.`;
    } else {
      note.textContent = `All ${allRows.length} rows loaded.`;
    }
  }

  // ---- When data is ready ----
  function onDataReady() {
    const ds = App.dataset;
    // Update header pill
    document.getElementById('data-summary-pill').style.display = 'flex';
    document.getElementById('row-count').textContent = ds.rows.length;
    document.getElementById('col-count').textContent = ds.headers.length;
    document.getElementById('btn-clear-data').style.display = 'flex';
    // Status dot
    document.getElementById('status-dot').classList.add('active');
    document.getElementById('status-text').textContent = App.fileName || 'Manual data';
    // Populate filters
    Filters.populate(ds);
    // Update stats section
    renderStats(ds);
    // Show gallery header in visualize section
    document.getElementById('multi-chart-header').style.display = 'flex';
  }

  // ---- Navigation to visualize ----
  document.getElementById('btn-goto-visualize').addEventListener('click', () => {
    showSection('visualize');
    setTimeout(renderMainChart, 100);
  });

  // ---- Manual Entry Visualize ----
  document.getElementById('btn-manual-visualize').addEventListener('click', () => {
    const raw = ManualEntry.getData();
    if (!raw.rows.length) { App.toast('Enter some data first.', 'error'); return; }
    App.dataset = DataProcessor.process(raw);
    App.fileName = 'Manual Data';
    App.sourceType = 'manual';
    onDataReady();
    showSection('visualize');
    setTimeout(renderMainChart, 100);
    App.toast('Manual data loaded!', 'success');
  });

  // ---- Chart render ----
  function renderMainChart() {
    if (!App.dataset) { App.toast('No data loaded. Upload a file or use Manual Entry.', 'error'); return; }

    const { xIndex, yIndex, chartType, palette } = Filters.getSelection();
    ChartManager.setPalette(palette);

    const { labels, datasets } = Filters.getDatasets(chartType, xIndex, yIndex);

    document.getElementById('chart-placeholder').style.display = 'none';
    document.getElementById('chart-canvas-wrap').style.display = 'block';

    ChartManager.render('main-chart', chartType, labels, datasets, {
      xLabel: App.dataset.headers[xIndex],
      yLabel: App.dataset.headers[yIndex]
    });

    App.toast(`${chartType.charAt(0).toUpperCase() + chartType.slice(1)} chart rendered!`, 'success');
  }

  document.getElementById('btn-render-chart').addEventListener('click', renderMainChart);

  // ---- Chart type buttons ----
  document.querySelectorAll('.chart-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ---- Palette buttons ----
  document.querySelectorAll('.palette-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ---- Export PNG ----
  document.getElementById('btn-download-chart').addEventListener('click', () => {
    const name = (App.fileName || 'chart').replace(/\.[^.]+$/, '') + '_chart.png';
    ChartManager.exportPNG(name);
  });

  // ---- Reset Zoom ----
  document.getElementById('btn-reset-zoom').addEventListener('click', () => {
    ChartManager.resetZoom();
  });

  // ---- Gallery toggle ----
  let galleryOpen = false;
  document.getElementById('btn-toggle-gallery').addEventListener('click', function () {
    galleryOpen = !galleryOpen;
    const gallery = document.getElementById('chart-gallery');
    gallery.style.display = galleryOpen ? 'grid' : 'none';
    this.textContent = galleryOpen ? 'Hide Gallery ▲' : 'Show Gallery ▼';
    if (galleryOpen && App.dataset) renderGallery();
  });

  function renderGallery() {
    const types = ['bar', 'line', 'pie', 'scatter'];
    const ids = ['gallery-bar', 'gallery-line', 'gallery-pie', 'gallery-scatter'];
    const { xIndex, yIndex, palette } = Filters.getSelection();
    ChartManager.setPalette(palette);
    types.forEach((type, i) => {
      const { labels, datasets } = Filters.getDatasets(type, xIndex, yIndex);
      ChartManager.render(ids[i], type, labels, datasets, {
        xLabel: App.dataset.headers[xIndex],
        yLabel: App.dataset.headers[yIndex]
      });
    });
  }

  // ---- Clear all data ----
  document.getElementById('btn-clear-data').addEventListener('click', () => {
    App.dataset = null;
    App.fileName = null;
    App.sourceType = null;

    document.getElementById('data-summary-pill').style.display = 'none';
    document.getElementById('btn-clear-data').style.display = 'none';
    document.getElementById('status-dot').classList.remove('active');
    document.getElementById('status-text').textContent = 'No data loaded';
    document.getElementById('preview-card').style.display = 'none';
    document.getElementById('chart-placeholder').style.display = 'flex';
    document.getElementById('chart-canvas-wrap').style.display = 'none';
    document.getElementById('multi-chart-header').style.display = 'none';
    document.getElementById('chart-gallery').style.display = 'none';
    galleryOpen = false;
    document.getElementById('btn-toggle-gallery').textContent = 'Show Gallery ▼';

    // Reset stats
    document.getElementById('stats-grid').innerHTML = '<div class="no-data-msg"><p>Load data first to see statistics.</p></div>';

    // Reset file input
    document.getElementById('file-input').value = '';
    document.getElementById('progress-fill').style.width = '0%';
    showProgress(false);

    // Destroy charts
    ['main-chart', 'gallery-bar', 'gallery-line', 'gallery-pie', 'gallery-scatter'].forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) { const c = Chart.getChart(canvas); if (c) c.destroy(); }
    });

    App.toast('Data cleared.', 'info');
    showSection('upload');
  });

  // ---- Stats Renderer ----
  function renderStats(ds) {
    const grid = document.getElementById('stats-grid');
    grid.innerHTML = '';

    ds.stats.forEach(stat => {
      const card = document.createElement('div');
      card.className = 'stat-card';

      if (stat.type === 'numeric') {
        card.innerHTML = `
          <div class="stat-col-name">${escHtml(stat.header)} <span style="color:var(--accent-cyan-light);font-size:0.65rem;">NUMERIC</span></div>
          <div class="stat-main-val">${fmt(stat.mean)}</div>
          <div class="stat-rows">
            <div class="stat-row"><span class="stat-row-label">Count</span><span class="stat-row-val">${stat.count}</span></div>
            <div class="stat-row"><span class="stat-row-label">Min</span><span class="stat-row-val">${fmt(stat.min)}</span></div>
            <div class="stat-row"><span class="stat-row-label">Max</span><span class="stat-row-val">${fmt(stat.max)}</span></div>
            <div class="stat-row"><span class="stat-row-label">Mean</span><span class="stat-row-val">${fmt(stat.mean)}</span></div>
            <div class="stat-row"><span class="stat-row-label">Median</span><span class="stat-row-val">${fmt(stat.median)}</span></div>
            <div class="stat-row"><span class="stat-row-label">Std Dev</span><span class="stat-row-val">${fmt(stat.stdDev)}</span></div>
            <div class="stat-row"><span class="stat-row-label">Sum</span><span class="stat-row-val">${fmt(stat.sum)}</span></div>
          </div>`;
      } else {
        card.innerHTML = `
          <div class="stat-col-name">${escHtml(stat.header)} <span style="color:var(--accent-violet-light);font-size:0.65rem;">CATEGORICAL</span></div>
          <div class="stat-main-val">${stat.uniqueCount}</div>
          <div class="stat-rows">
            <div class="stat-row"><span class="stat-row-label">Count</span><span class="stat-row-val">${stat.count}</span></div>
            <div class="stat-row"><span class="stat-row-label">Unique</span><span class="stat-row-val">${stat.uniqueCount}</span></div>
            <div class="stat-row"><span class="stat-row-label">Top Value</span><span class="stat-row-val" title="${escHtml(stat.topValue)}">${escHtml(String(stat.topValue).slice(0,20))}</span></div>
            <div class="stat-row"><span class="stat-row-label">Frequency</span><span class="stat-row-val">${stat.topFreq}</span></div>
          </div>`;
      }

      grid.appendChild(card);
    });
  }

  // ---- Helpers ----
  function fmt(n) {
    if (n === undefined || n === null || isNaN(n)) return 'N/A';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return parseFloat(n.toFixed(4)).toString();
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ---- Init ----
  ManualEntry.init();
  window.__uiEffects?.initEffects();

  console.log('%cDataVis Pro 🚀 loaded!', 'color:#7c3aed;font-size:14px;font-weight:bold;');
})();
