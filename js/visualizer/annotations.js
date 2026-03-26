/**
 * ANNOTATIONS — Render bảng biến bên phải + step info.
 */
window.Annotations = {
  render(step) {
    const infoEl = document.getElementById('step-info');
    const tableEl = document.getElementById('variables-table');
    const counterEl = document.getElementById('step-counter');

    infoEl.textContent = step.description || '';
    tableEl.innerHTML = '';

    Object.entries(step.variables || {}).forEach(([name, value]) => {
      const row = document.createElement('div');
      row.className = 'var-row' + (this._isHighlight(name) ? ' highlight' : '');
      row.innerHTML = `
        <span class="var-name">${escapeHtml(name)}</span>
        <span class="var-value">${escapeHtml(String(value))}</span>
      `;
      tableEl.appendChild(row);
    });
  },

  setCounter(current, total) {
    document.getElementById('step-counter').textContent = `Step ${current} / ${total}`;
  },

  setTitle(text) {
    document.getElementById('step-title').textContent = text || '';
  },

  _isHighlight(name) {
    return /θ|CV Score|p-value|bias|SE/i.test(name);
  }
};

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}