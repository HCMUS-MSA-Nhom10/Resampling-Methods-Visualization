/**
 * RENDERER — Vẽ visualization lên canvas/svg dựa trên vizData của từng step.
 * Mỗi algo type có 1 hàm draw riêng.
 */
window.Renderer = {
  canvas: null,
  ctx: null,

  init() {
    this.canvas = document.getElementById('viz-canvas');
    this.ctx = this.canvas.getContext('2d');
    this._resize();
    window.addEventListener('resize', () => this._resize());
  },

  _resize() {
    const col = document.getElementById('viz-col');
    this.canvas.width = col.clientWidth - 32;
    this.canvas.height = col.clientHeight - 60;
  },

  render(vizData) {
    this._resize();
    const { type } = vizData;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (type === 'jackknife')       this._drawJackknife(vizData);
    else if (type === 'bootstrap')  this._drawBootstrap(vizData);
    else if (type === 'permutation')this._drawPermutation(vizData);
    else if (type === 'crossvalidation') this._drawCrossVal(vizData);
  },

  /* ── Shared helpers ── */
  _colors: {
    normal:   '#2a3045',
    active:   '#00e5ff',
    removed:  '#ff6b6b',
    train:    '#a8ff78',
    test:     '#ffd166',
    text:     '#e8eaf0',
    muted:    '#6b7799',
    bar:      '#00e5ff44',
    barHigh:  '#00e5ff',
    groupA:   '#00e5ff',
    groupB:   '#ff6b6b',
  },

  _drawPoints(cx, cy, data, radius, colors, labels) {
    const c = this.ctx;
    data.forEach((val, i) => {
      const color = colors ? colors[i] : this._colors.active;
      c.beginPath();
      c.arc(cx[i], cy, radius, 0, Math.PI * 2);
      c.fillStyle = color;
      c.fill();
      if (labels) {
        c.fillStyle = '#0d0f14';
        c.font = `bold ${Math.max(8, radius * 0.8)}px JetBrains Mono`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(val, cx[i], cy);
      }
    });
  },

  _getXPositions(n, W, margin = 40) {
    if (n === 1) return [W / 2];
    return Array.from({ length: n }, (_, i) => margin + (i / (n - 1)) * (W - 2 * margin));
  },

  /* ── Jackknife ── */
  _drawJackknife(d) {
    const c = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const { data, removedIndex, jackSamples, thetaFull, thetaCurrent, phase } = d;
    const n = data.length;
    const R = Math.min(22, Math.floor((W - 80) / (n * 2)));
    const xs = this._getXPositions(n, W);

    // Row 1: original data
    c.fillStyle = this._colors.muted;
    c.font = '11px JetBrains Mono';
    c.textAlign = 'left';
    c.fillText('Original data:', 16, 30);

    data.forEach((val, i) => {
      const x = xs[i], y = 55;
      const isRemoved = i === removedIndex;
      c.beginPath();
      c.arc(x, y, R, 0, Math.PI * 2);
      c.fillStyle = isRemoved ? this._colors.removed : this._colors.normal;
      c.fill();
      c.strokeStyle = isRemoved ? this._colors.removed : this._colors.active;
      c.lineWidth = isRemoved ? 2.5 : 1;
      c.stroke();
      c.fillStyle = isRemoved ? '#0d0f14' : this._colors.text;
      c.font = `${Math.max(9, R * 0.75)}px JetBrains Mono`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(val, x, y);
      // Index label
      c.fillStyle = this._colors.muted;
      c.font = '9px JetBrains Mono';
      c.fillText(`[${i}]`, x, y + R + 10);
    });

    // Row 2: subsample (nếu đang trong loop)
    if (d.subsample && phase === 'loop') {
      c.fillStyle = this._colors.muted;
      c.font = '11px JetBrains Mono';
      c.textAlign = 'left';
      c.fillText('Subsample (n−1):', 16, 110);
      const subXs = this._getXPositions(d.subsample.length, W);
      d.subsample.forEach((val, i) => {
        const x = subXs[i], y = 135;
        c.beginPath();
        c.arc(x, y, R, 0, Math.PI * 2);
        c.fillStyle = this._colors.active + '33';
        c.fill();
        c.strokeStyle = this._colors.active;
        c.lineWidth = 1.5;
        c.stroke();
        c.fillStyle = this._colors.active;
        c.font = `${Math.max(9, R * 0.75)}px JetBrains Mono`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(val, x, y);
      });
    }

    // Row 3: jackSamples bar chart
    if (jackSamples.length > 0) {
      const chartY = phase === 'result' ? H * 0.25 : H * 0.45;
      c.fillStyle = this._colors.muted;
      c.font = '11px JetBrains Mono';
      c.textAlign = 'left';
      c.fillText(`θ_i per iteration (${d.stat}):`, 16, chartY - 10);
      this._drawMiniBarChart(jackSamples, thetaFull, 16, chartY, W - 32, H * 0.28);

      if (phase === 'result') {
        c.fillStyle = this._colors.train;
        c.font = '12px JetBrains Mono';
        c.textAlign = 'center';
        c.fillText(`Bias: ${round4(d.bias)}  |  SE: ${round4(d.se)}  |  θ_corrected: ${round4(d.thetaFull - d.bias)}`, W / 2, H - 20);
      }
    }
  },

  _drawMiniBarChart(values, refLine, x, y, w, h) {
    const c = this.ctx;
    const n = values.length;
    if (n === 0) return;
    const min = Math.min(...values, refLine) * 0.97;
    const max = Math.max(...values, refLine) * 1.03;
    const bw = Math.max(4, w / n - 2);
    const scale = h / (max - min || 1);

    values.forEach((v, i) => {
      const bx = x + (i / n) * w;
      const bh = Math.abs(v - min) * scale;
      const by = y + h - bh;
      c.fillStyle = this._colors.bar;
      c.fillRect(bx, by, bw - 1, bh);
      c.fillStyle = this._colors.barHigh;
      c.fillRect(bx, by, bw - 1, 2);
    });
    // Reference line
    const refY = y + h - (refLine - min) * scale;
    c.strokeStyle = this._colors.active;
    c.lineWidth = 1.5;
    c.setLineDash([4, 4]);
    c.beginPath(); c.moveTo(x, refY); c.lineTo(x + w, refY); c.stroke();
    c.setLineDash([]);
    c.fillStyle = this._colors.active;
    c.font = '10px JetBrains Mono';
    c.textAlign = 'right';
    c.fillText(`θ_full=${round4(refLine)}`, x + w, refY - 4);
  },

  _drawPointsGrid(data, x, y, w, h, options = {}) {
    const c = this.ctx;
    const n = data.length;
    if (n === 0) return 0;

    const { 
      radiusLimit = 18, 
      padding = 4, 
      highlights = [], 
      removedIndex = -1,
      counts = [],
      showLabels = n <= 40
    } = options;

    // Smart grid layout
    let cols = n <= 10 ? n : (n <= 25 ? 10 : (n <= 50 ? 15 : 20));
    const rows = Math.ceil(n / cols);
    const cellW = w / cols;
    const cellH = Math.min(40, h / rows);
    const R = Math.min(radiusLimit, cellW/2 - padding, cellH/2 - padding);

    data.forEach((val, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const px = x + col * cellW + cellW / 2;
      const py = y + row * cellH + cellH / 2;

      const isRemoved = i === removedIndex;
      const highlight = highlights.includes(i);
      const count = counts[i] || 0;

      c.beginPath();
      c.arc(px, py, R, 0, Math.PI * 2);
      c.fillStyle = isRemoved ? this._colors.removed : (highlight ? this._colors.active + '44' : this._colors.normal);
      c.fill();
      
      c.strokeStyle = isRemoved ? this._colors.removed : (highlight ? this._colors.active : this._colors.muted);
      c.lineWidth = isRemoved ? 2.5 : 1;
      c.stroke();

      if (showLabels || isRemoved) {
        c.fillStyle = isRemoved ? '#0d0f14' : this._colors.text;
        c.font = `${Math.max(8, R * 0.75)}px JetBrains Mono`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(val, px, py);
      }

      if (count > 1) {
        c.fillStyle = this._colors.removed;
        c.font = 'bold 9px JetBrains Mono';
        c.fillText(`×${count}`, px, py - R - 4);
      }
    });

    return rows * cellH; // return overall height used
  },

  /* ── Jackknife ── */
  _drawJackknife(d) {
    const c = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const { data, removedIndex, jackSamples, thetaFull, thetaCurrent, phase } = d;
    const n = data.length;

    // Row 1: original data
    c.fillStyle = this._colors.muted;
    c.font = '11px JetBrains Mono';
    c.textAlign = 'left';
    c.fillText('Original data:', 16, 25);

    const gridH = this._drawPointsGrid(data, 16, 35, W - 32, 110, { removedIndex });
    
    // Position for the next section depends on grid height
    let nextY = 35 + gridH + 25;

    // Row 2: subsample (nếu đang trong loop)
    if (d.subsample && phase === 'loop') {
      const R_sub = Math.min(20, Math.floor((W - 80) / (d.subsample.length * 2)));
      c.fillStyle = this._colors.muted;
      c.font = '11px JetBrains Mono';
      c.textAlign = 'left';
      c.fillText('Subsample (n−1):', 16, nextY - 10);
      
      const subXs = this._getXPositions(d.subsample.length, W);
      d.subsample.forEach((val, i) => {
        const x = subXs[i], y = nextY + 15;
        c.beginPath();
        c.arc(x, y, R_sub, 0, Math.PI * 2);
        c.fillStyle = this._colors.active + '33';
        c.fill();
        c.strokeStyle = this._colors.active;
        c.lineWidth = 1.5;
        c.stroke();
        c.fillStyle = this._colors.active;
        c.font = `${Math.max(9, R_sub * 0.75)}px JetBrains Mono`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(val, x, y);
      });
      nextY += 50;
    }

    // Row 3: jackSamples bar chart
    if (jackSamples.length > 0) {
      const chartBaseY = Math.max(nextY + 10, H * 0.45);
      const chartY = phase === 'result' ? H * 0.28 : chartBaseY;
      c.fillStyle = this._colors.muted;
      c.font = '11px JetBrains Mono';
      c.textAlign = 'left';
      c.fillText(`θ_i per iteration (${d.stat}):`, 16, chartY - 10);
      this._drawMiniBarChart(jackSamples, thetaFull, 16, chartY, W - 32, H * 0.28);

      if (phase === 'result') {
        c.fillStyle = this._colors.train;
        c.font = '12px JetBrains Mono';
        c.textAlign = 'center';
        c.fillText(`Bias: ${round4(d.bias)}  |  SE: ${round4(d.se)}  |  θ_corrected: ${round4(d.thetaFull - d.bias)}`, W / 2, H - 20);
      }
    }
  },

  /* ── Bootstrap ── */
  _drawBootstrap(d) {
    const c = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const { data, bootSample, bootStats, thetaObs, phase, indices } = d;
    const n = data.length;

    c.fillStyle = this._colors.muted;
    c.font = '11px JetBrains Mono';
    c.textAlign = 'left';
    c.fillText('Original data:', 16, 25);

    const counts = [];
    if (indices) {
      indices.forEach(idx => counts[idx] = (counts[idx] || 0) + 1);
    }
    const gridH = this._drawPointsGrid(data, 16, 35, W - 32, 110, { 
      highlights: indices || [], 
      counts 
    });

    let nextY = 35 + gridH + 25;

    if (bootSample && phase === 'loop') {
      const R_boot = Math.min(20, Math.floor((W - 80) / (bootSample.length * 2)));
      c.fillStyle = this._colors.muted;
      c.font = '11px JetBrains Mono';
      c.textAlign = 'left';
      c.fillText('Bootstrap sample (with replacement):', 16, nextY - 10);
      
      const bxs = this._getXPositions(bootSample.length, W);
      bootSample.forEach((val, i) => {
        const x = bxs[i], y = nextY + 15;
        c.beginPath();
        c.arc(x, y, R_boot, 0, Math.PI * 2);
        c.fillStyle = this._colors.active + '33';
        c.fill();
        c.strokeStyle = this._colors.active;
        c.lineWidth = 1.5;
        c.stroke();
        c.fillStyle = this._colors.active;
        c.font = `${Math.max(9, R_boot * 0.75)}px JetBrains Mono`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(val, x, y);
      });
      nextY += 50;
    }

    if (bootStats.length > 0) {
      const chartBaseY = Math.max(nextY + 10, H * 0.45);
      const chartY = phase === 'result' ? H * 0.25 : chartBaseY;
      c.fillStyle = this._colors.muted;
      c.font = '11px JetBrains Mono';
      c.textAlign = 'left';
      c.fillText('Bootstrap distribution θ*:', 16, chartY - 10);
      this._drawMiniBarChart(bootStats, thetaObs, 16, chartY, W - 32, H * 0.35);

      if (phase === 'result') {
        c.fillStyle = this._colors.train;
        c.font = '12px JetBrains Mono';
        c.textAlign = 'center';
        c.fillText(`CI 95%: [${round4(d.ci95lo)}, ${round4(d.ci95hi)}]  |  SE: ${round4(d.bootSE)}  |  Bias: ${round4(d.bias)}`, W/2, H - 20);
      }
    }
  },

  /* ── Permutation ── */
  _drawPermutation(d) {
    const c = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const { dataA, dataB, permA, permB, permStats, obsStatistic, phase, tCurrent } = d;
    
    // Group A Title
    c.fillStyle = this._colors.muted;
    c.font = '11px JetBrains Mono';
    c.textAlign = 'left';
    c.fillText(`Nhóm A (n=${dataA.length}):`, 16, 25);
    
    // Use half width minus margin for each group side-by-side
    const groupW = (W / 2) - 24;
    
    // Draw Group A grid
    const gridHA = this._drawPointsGrid(dataA, 16, 35, groupW, 100, { 
      radiusLimit: 14, 
      showLabels: dataA.length <= 30 
    });
    
    // Group B Title (on the right)
    c.fillStyle = this._colors.groupA; 
    c.fillText(`Nhóm B (n=${dataB.length}):`, W / 2 + 8, 25);
    
    // Draw Group B grid
    const gridHB = this._drawPointsGrid(dataB, W / 2 + 8, 35, groupW, 100, { 
      radiusLimit: 14, 
      showLabels: dataB.length <= 30 
    });

    let nextY = 35 + Math.max(gridHA, gridHB) + 25;

    // Phase Loop: Draw Permuted Samples
    if (permA && phase === 'loop') {
      c.fillStyle = this._colors.muted;
      c.font = '11px JetBrains Mono';
      c.textAlign = 'left';
      c.fillText('Permuted A*:', 16, nextY - 10);
      c.fillText('Permuted B*:', W / 2 + 8, nextY - 10);

      const pGridHA = this._drawPointsGrid(permA, 16, nextY + 5, groupW, 100, { 
        radiusLimit: 14, 
        showLabels: permA.length <= 30 
      });
      const pGridHB = this._drawPointsGrid(permB, W / 2 + 8, nextY + 5, groupW, 100, { 
        radiusLimit: 14, 
        showLabels: permB.length <= 30 
      });
      
      nextY += Math.max(pGridHA, pGridHB) + 30;
    }

    if (permStats.length > 0) {
      const chartBaseY = Math.max(nextY + 10, H * 0.45);
      const chartY = phase === 'result' ? H * 0.3 : chartBaseY;
      c.fillStyle = this._colors.muted; 
      c.font = '11px JetBrains Mono'; 
      c.textAlign = 'left';
      c.fillText('Phân phối T* (permutation):', 16, chartY - 10);
      this._drawMiniBarChart(permStats, obsStatistic, 16, chartY, W - 32, H * 0.32);
      
      if (phase === 'result') {
        c.fillStyle = this._colors.train; 
        c.font = '12px JetBrains Mono'; 
        c.textAlign = 'center';
        c.fillText(`p-value = ${round4(d.pValue)}  ${d.pValue < 0.05 ? '→ Bác bỏ H0' : '→ Không bác bỏ H0'}`, W / 2, H - 20);
      }
    }
  },

  /* ── Cross-Validation ── */
  _drawCrossVal(d) {
    const c = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const { data, K, folds, activeFold, errors, phase } = d;
    const n = data.length;
    const rowH = Math.min(38, (H - 120) / K);
    const blockW = (W - 80) / n;

    c.fillStyle = this._colors.muted;
    c.font = '11px JetBrains Mono';
    c.textAlign = 'left';
    c.fillText(`K-Fold layout (K=${K}, n=${n}):`, 16, 24);

    // Draw grid: K rows = K folds, each cell = 1 data point
    const order = folds.flat(); // all points in fold order
    folds.forEach((fold, fi) => {
      const y = 36 + fi * (rowH + 4);
      const isTrain = activeFold !== null && fi !== activeFold;
      const isTest  = fi === activeFold;

      c.fillStyle = this._colors.muted;
      c.font = '10px JetBrains Mono';
      c.textAlign = 'right';
      c.fillText(`F${fi+1}`, 24, y + rowH / 2 + 4);

      fold.forEach((pt, pi) => {
        const globalIdx = folds.slice(0, fi).reduce((s, f) => s + f.length, 0) + pi;
        const x = 30 + globalIdx * blockW;
        const color = isTest ? this._colors.test : isTrain ? this._colors.train : this._colors.normal;
        c.fillStyle = color + (phase === 'init' ? '55' : 'cc');
        c.fillRect(x, y, blockW - 2, rowH);
        c.strokeStyle = isTest ? this._colors.test : this._colors.border;
        c.lineWidth = isTest ? 2 : 0.5;
        c.strokeRect(x, y, blockW - 2, rowH);
        c.fillStyle = isTest ? '#0d0f14' : isTrain ? '#0d0f14' : this._colors.muted;
        c.font = `${Math.min(11, blockW * 0.7)}px JetBrains Mono`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(pt.val, x + (blockW-2)/2, y + rowH/2);
      });
    });

    // Legend
    const legendY = 36 + K * (rowH + 4) + 20;
    [['Train', this._colors.train], ['Test', this._colors.test], ['Inactive', this._colors.normal]].forEach(([label, color], i) => {
      c.fillStyle = color + 'cc';
      c.fillRect(16 + i * 90, legendY, 14, 14);
      c.fillStyle = this._colors.muted;
      c.font = '11px JetBrains Mono';
      c.textAlign = 'left';
      c.fillText(label, 34 + i * 90, legendY + 11);
    });

    // Errors bar chart
    if (errors.length > 0) {
      const chartY = legendY + 30;
      c.fillStyle = this._colors.muted; c.font = '11px JetBrains Mono'; c.textAlign = 'left';
      c.fillText('MSE per fold:', 16, chartY - 4);
      this._drawMiniBarChart(errors, errors.reduce((s,v)=>s+v,0)/errors.length, 16, chartY, W-32, H - chartY - 30);
      if (phase === 'result') {
        c.fillStyle = this._colors.train; c.font = '12px JetBrains Mono'; c.textAlign = 'center';
        c.fillText(`CV Score (mean MSE): ${round4(d.cvScore)}`, W/2, H-12);
      }
    }
  }
};

function round4(v) { return Math.round(v * 10000) / 10000; }