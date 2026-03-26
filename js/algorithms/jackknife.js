/**
 * JACKKNIFE ALGORITHM MODULE
 * Pure logic — không chứa bất kỳ DOM/render code nào.
 *
 * Returns: Array of steps, mỗi step là:
 * {
 *   stepIndex: number,
 *   title: string,
 *   description: string,
 *   variables: { [name]: value },   // tất cả biến cần hiện
 *   vizData: { type: 'jackknife', ... }  // data cho renderer
 * }
 */
window.AlgoJackknife = {
  meta: {
    name: 'Jackknife',
    description: 'Leave-one-out resampling. Mỗi vòng lặp i: loại bỏ x_i, tính thống kê trên n-1 điểm còn lại.',
    params: [
      { id: 'statistic', label: 'Thống kê', type: 'select', options: ['mean', 'median', 'variance'], default: 'mean' }
    ]
  },

  run(data, params) {
    const stat = params.statistic || 'mean';
    const n = data.length;
    const steps = [];
    const thetaAll = computeStat(data, stat);
    const jackSamples = [];

    // Step 0: hiện toàn bộ dataset
    steps.push({
      stepIndex: 0,
      title: 'Khởi tạo — Toàn bộ dataset',
      description: `Tính thống kê θ trên toàn bộ n=${n} điểm dữ liệu trước khi bắt đầu jackknife.`,
      variables: {
        'n (kích thước mẫu)': n,
        [`θ_full (${stat} toàn bộ)`]: round(thetaAll),
        'i (lần lặp hiện tại)': '—',
        'Mẫu bị loại': '—',
        'θ_i (thống kê mẫu con)': '—',
        'jackSamples []': '[]'
      },
      vizData: {
        type: 'jackknife',
        data, n,
        removedIndex: null,
        subsample: null,
        thetaFull: thetaAll,
        thetaCurrent: null,
        jackSamples: [],
        stat,
        phase: 'init'
      }
    });

    // Steps 1..n: leave-one-out
    for (let i = 0; i < n; i++) {
      const subsample = [...data.slice(0, i), ...data.slice(i + 1)];
      const thetaI = computeStat(subsample, stat);
      jackSamples.push(thetaI);

      steps.push({
        stepIndex: i + 1,
        title: `Vòng lặp ${i + 1} / ${n} — Loại bỏ x[${i}] = ${data[i]}`,
        description: `Loại phần tử tại vị trí i=${i} (giá trị ${data[i]}), tính ${stat} trên ${n-1} phần tử còn lại.`,
        variables: {
          'n': n,
          [`θ_full (${stat} toàn bộ)`]: round(thetaAll),
          'i (lần lặp hiện tại)': i,
          'x[i] bị loại': data[i],
          [`Subsample (n-1=${n-1} phần tử)`]: '[' + subsample.join(', ') + ']',
          [`θ_${i} (${stat} mẫu con)`]: round(thetaI),
          [`jackSamples [${jackSamples.length}]`]: '[' + jackSamples.map(round).join(', ') + ']'
        },
        vizData: {
          type: 'jackknife',
          data, n,
          removedIndex: i,
          subsample,
          thetaFull: thetaAll,
          thetaCurrent: thetaI,
          jackSamples: [...jackSamples],
          stat,
          phase: 'loop'
        }
      });
    }

    // Final step: tính jackknife estimate
    const thetaJack = mean(jackSamples);
    const bias = (n - 1) * (thetaJack - thetaAll);
    const se = Math.sqrt(((n - 1) / n) * jackSamples.reduce((s, v) => s + (v - thetaJack) ** 2, 0));

    steps.push({
      stepIndex: n + 1,
      title: 'Kết quả cuối — Jackknife Estimate',
      description: 'Tổng hợp tất cả θ_i để ước tính bias và standard error của thống kê.',
      variables: {
        'n': n,
        [`θ_full (${stat} toàn bộ)`]: round(thetaAll),
        [`jackSamples [${n} phần tử]`]: '[' + jackSamples.map(round).join(', ') + ']',
        'θ̄_jack (mean của jackSamples)': round(thetaJack),
        'Bias ≈ (n-1)(θ̄_jack − θ_full)': round(bias),
        'SE (Standard Error)': round(se),
        'θ_corrected = θ_full − Bias': round(thetaAll - bias)
      },
      vizData: {
        type: 'jackknife',
        data, n,
        removedIndex: null,
        subsample: null,
        thetaFull: thetaAll,
        thetaCurrent: null,
        jackSamples,
        stat,
        phase: 'result',
        thetaJack, bias, se
      }
    });

    return steps;
  }
};

// ── helpers ──
function computeStat(arr, stat) {
  if (stat === 'mean') return mean(arr);
  if (stat === 'median') return median(arr);
  if (stat === 'variance') return variance(arr);
  return mean(arr);
}
function mean(a) { return a.reduce((s, v) => s + v, 0) / a.length; }
function median(a) {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function variance(a) {
  const m = mean(a);
  return mean(a.map(v => (v - m) ** 2));
}
function round(v, d = 4) { return Math.round(v * 10 ** d) / 10 ** d; }