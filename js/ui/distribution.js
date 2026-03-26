/**
 * DISTRIBUTION — Tab "📊 Phân phối gốc"
 * Hiện dưới dạng tab thứ 5 ngay cạnh 4 tab thuật toán.
 * Khi active: dist-overlay che #viz-col, dist-sidebar hiện ở #annotation-col.
 * Khi inactive: trả về giao diện thuật toán bình thường.
 */
window.Distribution = (() => {
  let _canvas = null;
  let _ctx    = null;
  let _data   = [];
  let _isActive = false;

  const C = {
    bar:     '#ff6b6b33',
    barHigh: '#ff6b6b',
    accent:  '#ff6b6b',
    mean:    '#00e5ff',
    median:  '#a8ff78',
    muted:   '#6b7799',
    text:    '#e8eaf0',
    border:  '#2a3045',
  };

  /* ── Stats ── */
  function _stats(arr) {
    if (!arr.length) return null;
    const n      = arr.length;
    const sorted = [...arr].sort((a, b) => a - b);
    const sum    = arr.reduce((a, b) => a + b, 0);
    const mean   = sum / n;
    const median = n % 2 === 0
      ? (sorted[n/2-1] + sorted[n/2]) / 2
      : sorted[Math.floor(n/2)];
    const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const std  = Math.sqrt(variance);
    const q1   = sorted[Math.floor(n * 0.25)];
    const q3   = sorted[Math.floor(n * 0.75)];
    return { n, sum, mean, median, std, min: sorted[0], max: sorted[n-1], q1, q3 };
  }

  function _r(v, d = 4) {
    const f = 10 ** d;
    return Math.round(v * f) / f;
  }

  /* ── Histogram bins ── */
  function _bins(arr, numBins) {
    const min = Math.min(...arr), max = Math.max(...arr);
    if (min === max) return [{ lo: min - 0.5, hi: min + 0.5, count: arr.length }];
    const w = (max - min) / numBins;
    const bins = Array.from({ length: numBins }, (_, i) => ({
      lo: min + i * w, hi: min + (i + 1) * w, count: 0
    }));
    arr.forEach(v => {
      let idx = Math.floor((v - min) / w);
      if (idx >= numBins) idx = numBins - 1;
      bins[idx].count++;
    });
    return bins;
  }

  /* ── Draw histogram on dist-canvas ── */
  function _draw() {
    if (!_canvas || !_ctx) return;
    const c = _ctx;
    const W = _canvas.width, H = _canvas.height;
    c.clearRect(0, 0, W, H);

    // Empty state
    if (!_data.length) {
      c.fillStyle = C.muted;
      c.font = '13px JetBrains Mono';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('Nhập dữ liệu và bấm ▶ RUN để xem phân phối', W / 2, H / 2);
      return;
    }

    const PAD = { top: 30, right: 24, bottom: 50, left: 48 };
    const cW = W - PAD.left - PAD.right;
    const cH = H - PAD.top  - PAD.bottom;

    const numBins = Math.max(5, Math.min(25, Math.round(Math.sqrt(_data.length) * 1.8)));
    const binsArr = _bins(_data, numBins);
    const maxCount = Math.max(...binsArr.map(b => b.count));
    const barW = cW / binsArr.length;
    const st   = _stats(_data);
    const dataMin = Math.min(..._data), dataMax = Math.max(..._data);
    const xRange  = dataMax - dataMin || 1;

    /* Y gridlines + axis */
    const yTicks = 5;
    for (let t = 0; t <= yTicks; t++) {
      const val = Math.round((maxCount / yTicks) * t);
      const ty  = PAD.top + cH - (val / maxCount) * cH;
      c.strokeStyle = C.border + '88';
      c.lineWidth   = 0.5;
      c.beginPath(); c.moveTo(PAD.left, ty); c.lineTo(PAD.left + cW, ty); c.stroke();
      c.fillStyle = C.muted;
      c.font = '9px JetBrains Mono';
      c.textAlign = 'right';
      c.textBaseline = 'middle';
      c.fillText(val, PAD.left - 5, ty);
    }

    /* Bars */
    binsArr.forEach((bin, i) => {
      const bh = (bin.count / maxCount) * cH;
      const bx = PAD.left + i * barW;
      const by = PAD.top + cH - bh;

      // Gradient-ish fill
      const grad = c.createLinearGradient(bx, by, bx, by + bh);
      grad.addColorStop(0, C.barHigh);
      grad.addColorStop(1, C.bar);
      c.fillStyle = grad;
      c.fillRect(bx + 1, by, barW - 2, bh);

      // Top cap
      c.fillStyle = C.barHigh;
      c.fillRect(bx + 1, by, barW - 2, 2);

      // Count label
      if (bin.count > 0 && barW > 16) {
        c.fillStyle = C.text;
        c.font = `${Math.min(10, barW * 0.5)}px JetBrains Mono`;
        c.textAlign = 'center';
        c.textBaseline = 'bottom';
        c.fillText(bin.count, bx + barW / 2, by - 2);
      }
    });

    /* X axis */
    c.strokeStyle = C.border;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(PAD.left, PAD.top + cH);
    c.lineTo(PAD.left + cW, PAD.top + cH);
    c.stroke();

    // X tick labels
    c.fillStyle = C.muted;
    c.font = '9px JetBrains Mono';
    c.textAlign = 'center';
    c.textBaseline = 'top';
    const tickStep = Math.ceil(binsArr.length / 7);
    binsArr.forEach((bin, i) => {
      if (i % tickStep === 0 || i === binsArr.length - 1) {
        const tx = PAD.left + i * barW + barW / 2;
        c.fillText(_r(bin.lo, 2), tx, PAD.top + cH + 5);
      }
    });

    /* Y axis */
    c.strokeStyle = C.border;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(PAD.left, PAD.top);
    c.lineTo(PAD.left, PAD.top + cH);
    c.stroke();

    /* Mean line */
    const meanX = PAD.left + ((st.mean - dataMin) / xRange) * cW;
    c.save();
    c.strokeStyle = C.mean;
    c.lineWidth   = 2;
    c.setLineDash([6, 4]);
    c.beginPath(); c.moveTo(meanX, PAD.top); c.lineTo(meanX, PAD.top + cH); c.stroke();
    c.setLineDash([]);
    c.fillStyle = C.mean;
    c.font = 'bold 10px JetBrains Mono';
    c.textAlign = 'center';
    c.textBaseline = 'bottom';
    c.fillText(`μ = ${_r(st.mean, 3)}`, meanX, PAD.top - 2);
    c.restore();

    /* Median line */
    const medX = PAD.left + ((st.median - dataMin) / xRange) * cW;
    if (Math.abs(medX - meanX) > 5) {
      c.save();
      c.strokeStyle = C.median;
      c.lineWidth   = 1.5;
      c.setLineDash([4, 4]);
      c.beginPath(); c.moveTo(medX, PAD.top + 14); c.lineTo(medX, PAD.top + cH); c.stroke();
      c.setLineDash([]);
      c.fillStyle = C.median;
      c.font = '9px JetBrains Mono';
      c.textAlign = 'center';
      c.textBaseline = 'bottom';
      c.fillText(`med=${_r(st.median, 3)}`, medX, PAD.top + 12);
      c.restore();
    }

    /* Title */
    c.fillStyle = C.accent;
    c.font = 'bold 11px Syne, sans-serif';
    c.textAlign = 'left';
    c.textBaseline = 'top';
    c.fillText(`HISTOGRAM  (${numBins} bins,  n = ${st.n})`, PAD.left, 6);
  }

  /* ── Resize handler ── */
  function _resize() {
    if (!_canvas || !_isActive) return;
    const overlay = document.getElementById('dist-overlay');
    _canvas.width  = overlay.clientWidth;
    _canvas.height = overlay.clientHeight;
    _draw();
  }

  /* ── Sidebar stats ── */
  function _renderSidebar(st) {
    const statsEl = document.getElementById('dist-stats');
    const infoEl  = document.getElementById('dist-info');
    if (!statsEl) return;
    if (!st) {
      statsEl.innerHTML = '';
      if (infoEl) infoEl.innerHTML = '';
      return;
    }
    const rows = [
      ['n (cỡ mẫu)', st.n],
      ['Min', _r(st.min)],
      ['Max', _r(st.max)],
      ['Mean (μ)',  _r(st.mean)],
      ['Median',   _r(st.median)],
      ['Std Dev (σ)', _r(st.std)],
      ['Q1 (25%)', _r(st.q1)],
      ['Q3 (75%)', _r(st.q3)],
      ['IQR', _r(st.q3 - st.q1)],
      ['Range', _r(st.max - st.min)],
      ['CV (%)', st.mean !== 0 ? _r(Math.abs(st.std / st.mean) * 100, 2) : '—'],
    ];
    statsEl.innerHTML = rows.map(([k, v]) =>
      `<div class="dist-stat-row">
         <span class="dist-stat-key">${k}</span>
         <span class="dist-stat-val">${v}</span>
       </div>`
    ).join('');

    if (infoEl) {
      const skew = st.mean > st.median + 0.001 ? '→ Lệch phải (right-skewed)' :
                   st.mean < st.median - 0.001 ? '← Lệch trái (left-skewed)' :
                   '≈ Phân phối đối xứng';
      infoEl.innerHTML = `<strong>Nhận xét:</strong> ${skew}`;
    }
  }

  /* ── Show/hide distribution view ── */
  function _show() {
    _isActive = true;
    const overlay = document.getElementById('dist-overlay');
    const sidebar = document.getElementById('dist-sidebar');
    const stepInfo  = document.getElementById('step-info');
    const varTable  = document.getElementById('variables-table');

    if (overlay) overlay.style.display = 'flex';
    if (sidebar)  sidebar.style.display  = 'flex';
    if (stepInfo) stepInfo.style.display  = 'none';
    if (varTable) varTable.style.display  = 'none';

    // Sync canvas size
    if (_canvas && overlay) {
      _canvas.width  = overlay.clientWidth;
      _canvas.height = overlay.clientHeight;
    }
    _draw();
    _renderSidebar(_stats(_data));
  }

  function _hide() {
    _isActive = false;
    const overlay = document.getElementById('dist-overlay');
    const sidebar = document.getElementById('dist-sidebar');
    const stepInfo  = document.getElementById('step-info');
    const varTable  = document.getElementById('variables-table');

    if (overlay) overlay.style.display = 'none';
    if (sidebar)  sidebar.style.display  = 'none';
    if (stepInfo) stepInfo.style.display  = '';
    if (varTable) varTable.style.display  = '';
  }

  /* ── Public API ── */
  return {
    init() {
      _canvas = document.getElementById('dist-canvas');
      _ctx    = _canvas ? _canvas.getContext('2d') : null;
      window.addEventListener('resize', _resize);
    },

    /** Gọi khi bấm tab phân phối gốc */
    show() { _show(); },

    /** Gọi khi chuyển sang tab thuật toán */
    hide() { _hide(); },

    /** Gọi sau RUN để cập nhật data */
    update(data) {
      _data = [...data];
      if (_isActive) {
        _draw();
        _renderSidebar(_stats(_data));
      }
    },
  };
})();
