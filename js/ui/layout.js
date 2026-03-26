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

        const algo = btn.dataset.algo;

        if (algo === 'distribution') {
          // Show distribution view, hide algo controls
          this.currentAlgo = 'distribution';
          document.getElementById('algo-description').style.display = 'none';
          document.getElementById('input-area').style.display = 'none';
          Controls.reset();
          Distribution.update(this._dataPoints);
          Distribution.show();
        } else {
          // Normal algo tab
          Distribution.hide();
          document.getElementById('algo-description').style.display = '';
          document.getElementById('input-area').style.display = '';
          this.currentAlgo = algo;
          this._renderParams();
          this._renderDescription();
          Controls.reset();
        }
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
    const summary = document.getElementById('data-summary');
    container.innerHTML = '';
    
    // Update summary
    if (this._dataPoints.length > 0) {
      const sum = this._dataPoints.reduce((a, b) => a + b, 0);
      const mean = (sum / this._dataPoints.length).toFixed(2);
      summary.innerHTML = `<span>Count: ${this._dataPoints.length}</span> | <span>Mean: ${mean}</span>`;
    } else {
      summary.innerHTML = '';
    }

    // Limit rendering for performance if n is extreme, but usually n=100 is fine
    const limit = 500; 
    const pointsToRender = this._dataPoints.slice(0, limit);

    pointsToRender.forEach((v, i) => {
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
    
    if (this._dataPoints.length > limit) {
      const more = document.createElement('span');
      more.textContent = `... (+${this._dataPoints.length - limit} more)`;
      more.style.fontSize = '12px';
      more.style.color = 'var(--text-muted)';
      container.appendChild(more);
    }
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
    const nInput = document.getElementById('random-n-input');
    let n = parseInt(nInput.value);
    if (isNaN(n) || n < 1) {
      n = 5 + Math.floor(Math.random() * 6); // default 5-10
    }
    
    // Generate n random points between 0 and 20
    this._dataPoints = Array.from({ length: n }, () => {
      return Math.round(Math.random() * 20 * 10) / 10;
    });
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