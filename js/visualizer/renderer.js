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

  /* ── Bootstrap ── */
  _drawBootstrap(d) {
    const c = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const { data, bootSample, bootStats, thetaObs, phase, indices } = d;
    const n = data.length;
    const R = Math.min(22, Math.floor((W - 80) / (n * 2)));
    const xs = this._getXPositions(n, W);

    c.fillStyle = this._colors.muted;
    c.font = '11px JetBrains Mono';
    c.textAlign = 'left';
    c.fillText('Original data:', 16, 30);

    data.forEach((val, i) => {
      const isSelected = indices ? indices.includes(i) : false;
      const count = indices ? indices.filter(idx => idx === i).length : 0;
      c.beginPath();
      c.arc(xs[i], 55, R, 0, Math.PI * 2);
      c.fillStyle = isSelected ? this._colors.active + '44' : this._colors.normal;
      c.fill();
      c.strokeStyle = isSelected ? this._colors.active : this._colors.muted;
      c.lineWidth = isSelected ? 2 : 1;
      c.stroke();
      c.fillStyle = this._colors.text;
      c.font = `${Math.max(9, R * 0.75)}px JetBrains Mono`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(val, xs[i], 55);
      if (count > 1) {
        c.fillStyle = this._colors.removed;
        c.font = 'bold 10px JetBrains Mono';
        c.fillText(`×${count}`, xs[i], 55 - R - 6);
      }
    });

    if (bootSample && phase === 'loop') {
      c.fillStyle = this._colors.muted;
      c.font = '11px JetBrains Mono';
      c.textAlign = 'left';
      c.fillText('Bootstrap sample (with replacement):', 16, 110);
      const bxs = this._getXPositions(bootSample.length, W);
      bootSample.forEach((val, i) => {
        c.beginPath();
        c.arc(bxs[i], 135, R, 0, Math.PI * 2);
        c.fillStyle = this._colors.active + '33';
        c.fill();
        c.strokeStyle = this._colors.active;
        c.lineWidth = 1.5;
        c.stroke();
        c.fillStyle = this._colors.active;
        c.font = `${Math.max(9, R * 0.75)}px JetBrains Mono`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(val, bxs[i], 135);
      });
    }

    if (bootStats.length > 0) {
      const chartY = phase === 'result' ? H * 0.2 : H * 0.45;
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
    const allData = [...dataA, ...dataB];
    const n = allData.length;
    const R = Math.min(20, Math.floor((W - 80) / (n * 2)));

    // Draw combined data with original color coding
    c.fillStyle = this._colors.muted;
    c.font = '11px JetBrains Mono';
    c.textAlign = 'left';
    c.fillText(`Nhóm A (n=${dataA.length}):`, 16, 30);
    c.fillStyle = this._colors.groupA;
    c.fillText(`Nhóm B (n=${dataB.length}):`, 16, 80);

    const xsA = this._getXPositions(dataA.length, W * 0.45, 20);
    const xsB = this._getXPositions(dataB.length, W * 0.45, W * 0.53);

    dataA.forEach((val, i) => {
      c.beginPath(); c.arc(xsA[i], 50, R, 0, Math.PI*2);
      c.fillStyle = this._colors.groupA + '44'; c.fill();
      c.strokeStyle = this._colors.groupA; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = this._colors.groupA; c.font = `${Math.max(9, R*0.75)}px JetBrains Mono`;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(val, xsA[i], 50);
    });
    dataB.forEach((val, i) => {
      c.beginPath(); c.arc(xsB[i], 50, R, 0, Math.PI*2);
      c.fillStyle = this._colors.groupB + '44'; c.fill();
      c.strokeStyle = this._colors.groupB; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = this._colors.groupB; c.font = `${Math.max(9, R*0.75)}px JetBrains Mono`;
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(val, xsB[i], 50);
    });

    if (permA && phase === 'loop') {
      c.fillStyle = this._colors.muted;
      c.font = '11px JetBrains Mono';
      c.textAlign = 'left';
      c.fillText('Permuted A*:', 16, 110); c.fillText('Permuted B*:', W/2+10, 110);
      const pxsA = this._getXPositions(permA.length, W * 0.45, 20);
      const pxsB = this._getXPositions(permB.length, W * 0.45, W * 0.53);
      const drawRow = (arr, xs, y, color) => arr.forEach((val, i) => {
        c.beginPath(); c.arc(xs[i], y, R, 0, Math.PI*2);
        c.fillStyle = color + '33'; c.fill();
        c.strokeStyle = color; c.lineWidth = 1.5; c.stroke();
        c.fillStyle = color; c.font = `${Math.max(9, R*0.75)}px JetBrains Mono`;
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(val, xs[i], y);
      });
      drawRow(permA, pxsA, 135, this._colors.groupA);
      drawRow(permB, pxsB, 135, this._colors.groupB);
    }

    if (permStats.length > 0) {
      const chartY = H * 0.45;
      c.fillStyle = this._colors.muted; c.font = '11px JetBrains Mono'; c.textAlign = 'left';
      c.fillText('Phân phối T* (permutation):', 16, chartY - 10);
      this._drawMiniBarChart(permStats, obsStatistic, 16, chartY, W - 32, H * 0.32);
      if (phase === 'result') {
        c.fillStyle = this._colors.train; c.font = '12px JetBrains Mono'; c.textAlign = 'center';
        c.fillText(`p-value = ${round4(d.pValue)}  ${d.pValue < 0.05 ? '→ Bác bỏ H0' : '→ Không bác bỏ H0'}`, W/2, H - 20);
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