/**
 * CONTROLS — xử lý sự kiện nút, input, next/prev/reset.
 */
window.Controls = {
  _steps: [],
  _currentStep: 0,

  init() {
    document.getElementById('btn-next').addEventListener('click', () => this.next());
    document.getElementById('btn-prev').addEventListener('click', () => this.prev());
    document.getElementById('btn-reset').addEventListener('click', () => this.reset());
    document.getElementById('btn-run').addEventListener('click', () => this.run());
    document.getElementById('btn-add-point').addEventListener('click', () => Layout.addDataPoint());
    document.getElementById('btn-remove-point').addEventListener('click', () => Layout.removeLastDataPoint());
    document.getElementById('btn-random-data').addEventListener('click', () => Layout.randomData());
    document.getElementById('new-point-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') Layout.addDataPoint();
    });
  },

  load(steps) {
    this._steps = steps;
    this._currentStep = 0;
    this._render();
    this._updateButtons();
  },

  next() {
    if (this._currentStep < this._steps.length - 1) {
      this._currentStep++;
      this._render();
      this._updateButtons();
    }
  },

  prev() {
    if (this._currentStep > 0) {
      this._currentStep--;
      this._render();
      this._updateButtons();
    }
  },

  reset() {
    this._steps = [];
    this._currentStep = 0;
    Annotations.setTitle('');
    Annotations.render({ description: '', variables: {} });
    Annotations.setCounter(0, 0);
    document.getElementById('btn-next').disabled = true;
    document.getElementById('btn-prev').disabled = true;
    Renderer.canvas && Renderer.ctx.clearRect(0, 0, Renderer.canvas.width, Renderer.canvas.height);
  },

  run() {
    const algo = Layout.currentAlgo;
    const data = Layout.getData();
    if (!data.length) { alert('Vui lòng nhập ít nhất 2 điểm dữ liệu.'); return; }
    const params = Layout.getParams();
    const algoMap = {
      jackknife: window.AlgoJackknife,
      bootstrap: window.AlgoBootstrap,
      permutation: window.AlgoPermutation,
      crossvalidation: window.AlgoCrossValidation
    };
    const steps = algoMap[algo].run(data, params);
    this.load(steps);
  },

  _render() {
    const step = this._steps[this._currentStep];
    if (!step) return;
    Annotations.setTitle(step.title);
    Annotations.render(step);
    Annotations.setCounter(this._currentStep + 1, this._steps.length);
    Renderer.render(step.vizData);
  },

  _updateButtons() {
    document.getElementById('btn-prev').disabled = this._currentStep === 0;
    document.getElementById('btn-next').disabled = this._currentStep >= this._steps.length - 1;
  }
};