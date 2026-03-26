/**
 * BOOTSTRAP ALGORITHM MODULE
 * Pure logic only.
 */
window.AlgoBootstrap = {
  meta: {
    name: 'Bootstrap',
    description: 'Lấy mẫu có hoàn lại (with replacement) B lần, mỗi lần lấy n phần tử. Ước tính phân phối của thống kê.',
    params: [
      { id: 'B', label: 'B (số lần resample)', type: 'number', default: 20, min: 5, max: 200 },
      { id: 'statistic', label: 'Thống kê', type: 'select', options: ['mean', 'median', 'variance'], default: 'mean' },
      { id: 'seed', label: 'Seed (random)', type: 'number', default: 42, min: 0, max: 9999 }
    ]
  },

  run(data, params) {
    const B = parseInt(params.B) || 20;
    const stat = params.statistic || 'mean';
    const n = data.length;
    const rng = seededRNG(parseInt(params.seed) || 42);
    const steps = [];
    const thetaObs = computeStat(data, stat);
    const bootStats = [];

    steps.push({
      stepIndex: 0,
      title: 'Khởi tạo — Bootstrap',
      description: `Chuẩn bị bootstrap với B=${B} lần lấy mẫu có hoàn lại, n=${n} phần tử mỗi lần.`,
      variables: {
        'n': n, 'B (số lần)': B,
        [`θ_obs (${stat} gốc)`]: round(thetaObs),
        'b (lần lặp hiện tại)': '—',
        'bootSample': '—',
        'θ*_b': '—',
        'bootStats []': '[]'
      },
      vizData: { type: 'bootstrap', data, n, B, bootSample: null, bootStats: [], thetaObs, thetaCurrent: null, stat, phase: 'init', b: 0 }
    });

    for (let b = 0; b < B; b++) {
      const indices = Array.from({ length: n }, () => Math.floor(rng() * n));
      const bootSample = indices.map(i => data[i]);
      const thetaStar = computeStat(bootSample, stat);
      bootStats.push(thetaStar);

      steps.push({
        stepIndex: b + 1,
        title: `Bootstrap lần ${b + 1} / ${B}`,
        description: `Lấy ngẫu nhiên có hoàn lại ${n} phần tử. Tính ${stat} trên mẫu bootstrap.`,
        variables: {
          'n': n, 'B': B, 'b (lần hiện tại)': b + 1,
          [`θ_obs (${stat} gốc)`]: round(thetaObs),
          'Chỉ số được chọn': '[' + indices.join(', ') + ']',
          'bootSample': '[' + bootSample.join(', ') + ']',
          [`θ*_${b+1}`]: round(thetaStar),
          [`bootStats [${bootStats.length}]`]: '[' + bootStats.map(round).join(', ') + ']'
        },
        vizData: { type: 'bootstrap', data, n, B, bootSample, bootStats: [...bootStats], thetaObs, thetaCurrent: thetaStar, stat, phase: 'loop', b: b + 1, indices }
      });
    }

    const bootMean = mean(bootStats);
    const bootSE = Math.sqrt(variance(bootStats));
    const bias = bootMean - thetaObs;
    const sorted = [...bootStats].sort((a, b) => a - b);
    const ci95lo = sorted[Math.floor(0.025 * B)];
    const ci95hi = sorted[Math.floor(0.975 * B)];

    steps.push({
      stepIndex: B + 1,
      title: 'Kết quả cuối — Bootstrap Distribution',
      description: 'Phân phối của B thống kê bootstrap. Tính bias, SE và confidence interval 95%.',
      variables: {
        'B': B, [`θ_obs (${stat} gốc)`]: round(thetaObs),
        'E[θ*] (mean bootstrap)': round(bootMean),
        'Bias = E[θ*] − θ_obs': round(bias),
        'SE (Bootstrap std)': round(bootSE),
        'CI 95% lower (2.5%)': round(ci95lo),
        'CI 95% upper (97.5%)': round(ci95hi)
      },
      vizData: { type: 'bootstrap', data, n, B, bootSample: null, bootStats, thetaObs, thetaCurrent: null, stat, phase: 'result', bootMean, bootSE, bias, ci95lo, ci95hi }
    });

    return steps;
  }
};

// ── helpers ──
function seededRNG(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0x100000000; };
}
function computeStat(arr, stat) {
  if (stat === 'mean') return _mean(arr);
  if (stat === 'median') return _median(arr);
  if (stat === 'variance') return _variance(arr);
  return _mean(arr);
}
function _mean(a) { return a.reduce((s, v) => s + v, 0) / a.length; }
function _median(a) { const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m-1]+s[m])/2; }
function _variance(a) { const m = _mean(a); return _mean(a.map(v => (v-m)**2)); }
function round(v, d = 4) { return Math.round(v * 10**d) / 10**d; }