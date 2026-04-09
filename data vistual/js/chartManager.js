/* ===================================================
   chartManager.js — Chart.js wrapper for all chart types
   Handles: bar, line, pie, doughnut, scatter, radar
   =================================================== */

window.ChartManager = (function () {
  'use strict';

  // Color palettes
  const PALETTES = {
    cosmic: {
      colors: ['#7c3aed','#06b6d4','#9d5df5','#22d3ee','#a855f7','#0891b2','#c084fc','#0e7490','#e879f9','#0369a1'],
      border: ['#9d5df5','#22d3ee','#b07af5','#34d9ee','#bc71f7','#1aa1c8','#d09afc','#1e8faa','#f098fa','#1e7fbb']
    },
    sunset: {
      colors: ['#f97316','#ec4899','#fb923c','#f43f5e','#fbbf24','#e11d48','#fed7aa','#fda4af','#fde68a','#fb7185'],
      border: ['#fb923c','#f472b6','#fba053','#f6677a','#fcd34d','#f4305e','#fde0bb','#fdb5be','#fef0bb','#fc8499']
    },
    forest: {
      colors: ['#10b981','#3b82f6','#34d399','#60a5fa','#6ee7b7','#93c5fd','#a7f3d0','#bfdbfe','#059669','#2563eb'],
      border: ['#34d399','#60a5fa','#6ee7b7','#93c5fd','#a7f3d0','#bfdbfe','#d1fae5','#dbeafe','#10b981','#3b82f6']
    },
    fire: {
      colors: ['#ef4444','#f59e0b','#f87171','#fbbf24','#fca5a5','#fcd34d','#dc2626','#d97706','#b91c1c','#b45309'],
      border: ['#f87171','#fbbf24','#fca5a5','#fcd34d','#fecaca','#fde68a','#ef4444','#f59e0b','#dc2626','#d97706']
    }
  };

  let mainChart = null;
  let galleryCharts = {};
  let currentPalette = 'cosmic';

  // Chart.js global defaults
  function applyGlobalDefaults() {
    Chart.defaults.color = '#8b8dab';
    Chart.defaults.font.family = "'Outfit', 'Inter', system-ui, sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(13,14,31,0.92)';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(124,58,237,0.5)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.titleColor = '#f0f0ff';
    Chart.defaults.plugins.tooltip.bodyColor = '#8b8dab';
    Chart.defaults.plugins.tooltip.cornerRadius = 10;
    Chart.defaults.plugins.tooltip.displayColors = true;
    Chart.defaults.plugins.tooltip.boxPadding = 4;
  }

  function getColors(count, palette) {
    const p = PALETTES[palette] || PALETTES.cosmic;
    const colors = [];
    const borders = [];
    for (let i = 0; i < count; i++) {
      colors.push(p.colors[i % p.colors.length]);
      borders.push(p.border[i % p.border.length]);
    }
    return { colors, borders };
  }

  function makeGradient(ctx, color1, color2, height) {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, color1);
    g.addColorStop(1, color2.replace(')', ', 0.1)').replace('rgb(', 'rgba(').replace('#', 'rgba(').replace(')', ', 0.05)'));
    // Fallback: use transparent
    try {
      g.addColorStop(0, hexToRgba(color1, 0.8));
      g.addColorStop(1, hexToRgba(color1, 0.05));
    } catch (e) {}
    return g;
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function gridColor() { return 'rgba(255,255,255,0.05)'; }

  function scalesConfig(xLabel, yLabel) {
    return {
      x: {
        grid: { color: gridColor(), drawBorder: false },
        ticks: { color: '#585a78', maxRotation: 45 },
        title: xLabel ? { display: true, text: xLabel, color: '#8b8dab', font: { size: 11, weight: '600' } } : undefined
      },
      y: {
        grid: { color: gridColor(), drawBorder: false },
        ticks: { color: '#585a78' },
        title: yLabel ? { display: true, text: yLabel, color: '#8b8dab', font: { size: 11, weight: '600' } } : undefined
      }
    };
  }

  function zoomPlugin() {
    return {
      zoom: {
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy' },
        pan: { enabled: true, mode: 'xy' }
      }
    };
  }

  // ---- Main chart renderer ----
  function render(canvasId, type, labels, datasets, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();

    const ctx = canvas.getContext('2d');
    const colorData = getColors(labels.length, currentPalette);

    let config;
    switch (type) {
      case 'bar':    config = buildBar(ctx, labels, datasets, colorData, options); break;
      case 'line':   config = buildLine(ctx, labels, datasets, colorData, options); break;
      case 'pie':    config = buildPie(ctx, labels, datasets, colorData, options); break;
      case 'doughnut': config = buildDoughnut(ctx, labels, datasets, colorData, options); break;
      case 'scatter':  config = buildScatter(ctx, labels, datasets, colorData, options); break;
      case 'radar':    config = buildRadar(ctx, labels, datasets, colorData, options); break;
      default: config = buildBar(ctx, labels, datasets, colorData, options);
    }

    return new Chart(canvas, config);
  }

  // ---- BAR ----
  function buildBar(ctx, labels, datasets, { colors, borders }, opts) {
    const ds = datasets.map((d, i) => ({
      label: d.label || `Series ${i + 1}`,
      data: d.data,
      backgroundColor: d.data.map((_, j) => hexToRgba(colors[j % colors.length], 0.75)),
      borderColor: d.data.map((_, j) => borders[j % borders.length]),
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false
    }));
    return {
      type: 'bar',
      data: { labels, datasets: ds },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 800, easing: 'easeInOutQuart' },
        plugins: {
          legend: { display: datasets.length > 1 },
          zoom: zoomPlugin().zoom
        },
        scales: scalesConfig(opts.xLabel, opts.yLabel)
      }
    };
  }

  // ---- LINE ----
  function buildLine(ctx, labels, datasets, { colors, borders }, opts) {
    const canvasHeight = ctx.canvas.height || 400;
    const ds = datasets.map((d, i) => {
      const col = colors[i % colors.length];
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      gradient.addColorStop(0, hexToRgba(col, 0.4));
      gradient.addColorStop(1, hexToRgba(col, 0.01));
      return {
        label: d.label || `Series ${i + 1}`,
        data: d.data,
        backgroundColor: gradient,
        borderColor: col,
        borderWidth: 2.5,
        fill: true,
        tension: 0.45,
        pointBackgroundColor: col,
        pointBorderColor: '#0d0e1f',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7
      };
    });
    return {
      type: 'line',
      data: { labels, datasets: ds },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 900, easing: 'easeInOutCubic' },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: datasets.length > 1 },
          zoom: zoomPlugin().zoom
        },
        scales: scalesConfig(opts.xLabel, opts.yLabel)
      }
    };
  }

  // ---- PIE ----
  function buildPie(ctx, labels, datasets, { colors, borders }, opts) {
    const data = datasets[0] ? datasets[0].data : [];
    return {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, data.length).map(c => hexToRgba(c, 0.85)),
          borderColor: borders.slice(0, data.length),
          borderWidth: 2,
          hoverOffset: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { animateRotate: true, animateScale: true, duration: 900 },
        plugins: {
          legend: { position: 'right' },
          tooltip: {
            callbacks: {
              label(ctx) {
                const total = ctx.dataset.data.reduce((s, v) => s + (v || 0), 0);
                const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
                return ` ${ctx.label}: ${ctx.formattedValue} (${pct}%)`;
              }
            }
          }
        }
      }
    };
  }

  // ---- DOUGHNUT ----
  function buildDoughnut(ctx, labels, datasets, { colors, borders }, opts) {
    const cfg = buildPie(ctx, labels, datasets, { colors, borders }, opts);
    cfg.type = 'doughnut';
    cfg.options.cutout = '60%';
    return cfg;
  }

  // ---- SCATTER ----
  function buildScatter(ctx, labels, datasets, { colors, borders }, opts) {
    const ds = datasets.map((d, i) => ({
      label: d.label || `Series ${i + 1}`,
      data: d.data, // expects [{x, y}] format
      backgroundColor: hexToRgba(colors[i % colors.length], 0.7),
      borderColor: borders[i % borders.length],
      borderWidth: 1.5,
      pointRadius: 5,
      pointHoverRadius: 8
    }));
    return {
      type: 'scatter',
      data: { datasets: ds },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 700 },
        plugins: {
          legend: { display: datasets.length > 1 },
          zoom: zoomPlugin().zoom
        },
        scales: scalesConfig(opts.xLabel, opts.yLabel)
      }
    };
  }

  // ---- RADAR ----
  function buildRadar(ctx, labels, datasets, { colors, borders }, opts) {
    const ds = datasets.map((d, i) => ({
      label: d.label || `Series ${i + 1}`,
      data: d.data,
      backgroundColor: hexToRgba(colors[i % colors.length], 0.25),
      borderColor: colors[i % colors.length],
      borderWidth: 2,
      pointBackgroundColor: colors[i % colors.length],
      pointRadius: 4
    }));
    return {
      type: 'radar',
      data: { labels, datasets: ds },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: { duration: 800 },
        scales: {
          r: {
            grid: { color: gridColor() },
            ticks: { color: '#585a78', backdropColor: 'transparent' },
            pointLabels: { color: '#8b8dab' }
          }
        },
        plugins: { legend: { display: datasets.length > 1 } }
      }
    };
  }

  // ---- Set current palette ----
  function setPalette(name) {
    if (PALETTES[name]) currentPalette = name;
  }

  // ---- Destroy main chart ----
  function destroyMain() {
    if (mainChart) { mainChart.destroy(); mainChart = null; }
    const canvas = document.getElementById('main-chart');
    if (canvas) { const c = Chart.getChart(canvas); if (c) c.destroy(); }
  }

  // ---- Reset zoom ----
  function resetZoom() {
    const canvas = document.getElementById('main-chart');
    if (!canvas) return;
    const chart = Chart.getChart(canvas);
    if (chart && chart.resetZoom) chart.resetZoom();
  }

  // ---- Export as PNG ----
  function exportPNG(filename) {
    const canvas = document.getElementById('main-chart');
    if (!canvas) return;
    const chart = Chart.getChart(canvas);
    if (!chart) return;
    const link = document.createElement('a');
    link.download = filename || 'chart.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  // Init global defaults immediately
  if (window.Chart) applyGlobalDefaults();
  else document.addEventListener('DOMContentLoaded', applyGlobalDefaults);

  return { render, setPalette, destroyMain, resetZoom, exportPNG, hexToRgba, PALETTES };
})();
