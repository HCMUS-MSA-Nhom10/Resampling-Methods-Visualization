/**
 * LAYOUT — Khởi tạo layout, chuyển tab, quản lý data array và params.
 */
window.Layout = {
  currentAlgo: 'jackknife',
  _dataPoints: [3, 7, 2, 9, 5],

  init() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentAlgo = btn.dataset.algo;
        this._renderParams();
        this._renderDescription();
        Controls.reset();
      });
    });
    this._renderDataPoints();
    this._renderParams();
    this._renderDescription();
  },

  _algoModules() {
    return {
      jackknife: window.AlgoJackknife,
      bootstrap: window.AlgoBootstrap,
      permutation: window.AlgoPermutation,
      crossvalidation: window.AlgoCrossValidation
    };
  },

  _renderDescription() {
    const mod = this._algoModules()[this.currentAlgo];
    document.getElementById('algo-description').textContent = mod?.meta?.description || '';
  },

  _renderParams() {
    const mod = this._algoModules()[this.currentAlgo];
    const container = document.getElementById('algo-params');
    container.innerHTML = '';
    (mod?.meta?.params || []).forEach(p => {
      const group = document.createElement('div');
      group.className = 'param-group';
      const label = document.createElement('label');
      label.textContent = p.label;
      group.appendChild(label);

      let input;
      if (p.type === 'select') {
        input = document.createElement('select');
        input.id = `param-${p.id}`;
        p.options.forEach(opt => {
          const o = document.createElement('option');
          o.value = opt; o.textContent = opt;
          if (opt === p.default) o.selected = true;
          input.appendChild(o);
        });
      } else {
        input = document.createElement('input');
        input.type = p.type || 'number';
        input.id = `param-${p.id}`;
        input.value = p.default;
        if (p.min !== undefined) input.min = p.min;
        if (p.max !== undefined) input.max = p.max;
      }
      group.appendChild(input);
      container.appendChild(group);
    });
  },

  _renderDataPoints() {
    const container = document.getElementById('data-points-container');
    container.innerHTML = '';
    this._dataPoints.forEach((v, i) => {
      const chip = document.createElement('span');
      chip.className = 'data-chip';
      chip.textContent = v;
      chip.title = 'Click để xóa';
      chip.addEventListener('click', () => {
        this._dataPoints.splice(i, 1);
        this._renderDataPoints();
      });
      container.appendChild(chip);
    });
  },

  addDataPoint() {
    const input = document.getElementById('new-point-input');
    const val = parseFloat(input.value);
    if (isNaN(val)) return;
    this._dataPoints.push(val);
    input.value = '';
    this._renderDataPoints();
  },

  removeLastDataPoint() {
    if (this._dataPoints.length) {
      this._dataPoints.pop();
      this._renderDataPoints();
    }
  },

  randomData() {
    const n = 6 + Math.floor(Math.random() * 5);
    this._dataPoints = Array.from({ length: n }, () => Math.round(Math.random() * 20 * 10) / 10);
    this._renderDataPoints();
  },

  getData() { return [...this._dataPoints]; },

  getParams() {
    const mod = this._algoModules()[this.currentAlgo];
    const result = {};
    (mod?.meta?.params || []).forEach(p => {
      const el = document.getElementById(`param-${p.id}`);
      result[p.id] = el ? el.value : p.default;
    });
    return result;
  }
};