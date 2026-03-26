/**
 * K-FOLD CROSS-VALIDATION MODULE
 */
window.AlgoCrossValidation = {
  meta: {
    name: 'Cross-Validation',
    description: 'K-Fold CV: chia dữ liệu thành K fold, mỗi lần dùng 1 fold làm tập test, K-1 fold làm tập train.',
    params: [
      { id: 'k', label: 'K (số fold)', type: 'number', default: 5, min: 2, max: 10 },
      { id: 'statistic', label: 'Thống kê lỗi', type: 'select', options: ['mean', 'variance'], default: 'mean' }
    ]
  },

  run(data, params) {
    const K = Math.min(parseInt(params.k) || 5, data.length);
    const stat = params.statistic || 'mean';
    const n = data.length;
    const steps = [];

    // Tạo K fold
    const folds = Array.from({ length: K }, () => []);
    data.forEach((val, i) => folds[i % K].push({ val, origIdx: i }));

    const errors = [];

    steps.push({
      stepIndex: 0,
      title: 'Khởi tạo — K-Fold Cross-Validation',
      description: `Chia ${n} phần tử thành K=${K} fold đều nhau (hoặc gần đều).`,
      variables: {
        'n': n, 'K': K,
        ...Object.fromEntries(folds.map((f, i) => [`Fold ${i+1}`, '[' + f.map(p => p.val).join(', ') + ']'])),
        'k (lần hiện tại)': '—',
        'errors []': '[]'
      },
      vizData: { type: 'crossvalidation', data, n, K, folds, activeFold: null, trainSet: null, testSet: null, errors: [], testError: null, phase: 'init', stat }
    });

    for (let k = 0; k < K; k++) {
      const testSet = folds[k].map(p => p.val);
      const trainSet = folds.filter((_, i) => i !== k).flat().map(p => p.val);
      const trainStat = computeStat(trainSet, stat);
      // Lỗi đơn giản: MSE giữa testSet và trainStat (dự đoán hằng số)
      const testError = testSet.reduce((s, v) => s + (v - trainStat) ** 2, 0) / testSet.length;
      errors.push(testError);

      steps.push({
        stepIndex: k + 1,
        title: `Fold ${k + 1} / ${K} — Test`,
        description: `Fold ${k+1} là tập test (${testSet.length} phần tử), K-1=${K-1} fold còn lại là tập train (${trainSet.length} phần tử).`,
        variables: {
          'K': K, 'k (fold hiện tại)': k + 1,
          'Tập Train': '[' + trainSet.join(', ') + ']',
          'Tập Test': '[' + testSet.join(', ') + ']',
          [`${stat}(Train)`]: round(trainStat),
          'MSE (test fold)': round(testError),
          [`errors [${errors.length}]`]: '[' + errors.map(round).join(', ') + ']'
        },
        vizData: { type: 'crossvalidation', data, n, K, folds, activeFold: k, trainSet, testSet, errors: [...errors], testError, phase: 'loop', stat }
      });
    }

    const cvScore = errors.reduce((s, v) => s + v, 0) / K;

    steps.push({
      stepIndex: K + 1,
      title: 'Kết quả — CV Score',
      description: `CV Score = trung bình MSE qua K=${K} fold. Đây là ước tính lỗi tổng quát hóa.`,
      variables: {
        'K': K,
        'errors per fold': '[' + errors.map(round).join(', ') + ']',
        'CV Score (mean MSE)': round(cvScore)
      },
      vizData: { type: 'crossvalidation', data, n, K, folds, activeFold: null, trainSet: null, testSet: null, errors, testError: null, phase: 'result', stat, cvScore }
    });

    return steps;
  }
};

function computeStat(arr, stat) {
  if (stat === 'mean') return arr.reduce((s, v) => s + v, 0) / arr.length;
  if (stat === 'variance') { const m = arr.reduce((s,v)=>s+v,0)/arr.length; return arr.reduce((s,v)=>s+(v-m)**2,0)/arr.length; }
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
function round(v, d = 4) { return Math.round(v * 10**d) / 10**d; }