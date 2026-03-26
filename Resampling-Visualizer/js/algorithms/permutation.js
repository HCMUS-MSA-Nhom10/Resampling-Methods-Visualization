/**
 * PERMUTATION TEST MODULE
 * So sánh 2 nhóm (group A và group B).
 */
window.AlgoPermutation = {
  meta: {
    name: 'Permutation Test',
    description: 'Kiểm định không tham số: trộn ngẫu nhiên nhãn của 2 nhóm R lần, so sánh với thống kê quan sát được.',
    params: [
      { id: 'groupB', label: 'Nhóm B (phân tách bởi dấu phẩy)', type: 'text', default: '8,9,10,11,12' },
      { id: 'R', label: 'R (số lần hoán vị)', type: 'number', default: 20, min: 5, max: 200 },
      { id: 'seed', label: 'Seed', type: 'number', default: 7, min: 0, max: 9999 }
    ]
  },

  run(dataA, params) {
    const dataB = (params.groupB || '8,9,10,11,12').split(',').map(Number).filter(v => !isNaN(v));
    const R = parseInt(params.R) || 20;
    const rng = _seededRNG(parseInt(params.seed) || 7);
    const combined = [...dataA, ...dataB];
    const nA = dataA.length, nB = dataB.length, n = combined.length;
    const obsStatistic = Math.abs(_mean(dataA) - _mean(dataB));
    const steps = [];
    const permStats = [];

    steps.push({
      stepIndex: 0,
      title: 'Khởi tạo — Permutation Test',
      description: `Nhóm A (n=${nA}) và Nhóm B (n=${nB}). Thống kê quan sát: |mean_A − mean_B|.`,
      variables: {
        'Nhóm A': '[' + dataA.join(', ') + ']',
        'Nhóm B': '[' + dataB.join(', ') + ']',
        'mean_A': round(_mean(dataA)), 'mean_B': round(_mean(dataB)),
        'T_obs = |mean_A − mean_B|': round(obsStatistic),
        'R (số lần hoán vị)': R,
        'r (lần hiện tại)': '—',
        'permStats []': '[]'
      },
      vizData: { type: 'permutation', dataA, dataB, combined, nA, nB, obsStatistic, permStats: [], permA: null, permB: null, tCurrent: null, phase: 'init', r: 0, R }
    });

    for (let r = 0; r < R; r++) {
      // Fisher-Yates shuffle của combined
      const shuffled = [...combined];
      for (let i = n - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const permA = shuffled.slice(0, nA);
      const permB = shuffled.slice(nA);
      const tPerm = Math.abs(_mean(permA) - _mean(permB));
      permStats.push(tPerm);

      steps.push({
        stepIndex: r + 1,
        title: `Hoán vị ${r + 1} / ${R}`,
        description: `Trộn ngẫu nhiên ${n} phần tử, chia lại thành nhóm A (${nA}) và B (${nB}). Tính |mean_A* − mean_B*|.`,
        variables: {
          'T_obs (quan sát)': round(obsStatistic),
          'r (lần hiện tại)': r + 1,
          'Nhóm A* (permuted)': '[' + permA.join(', ') + ']',
          'Nhóm B* (permuted)': '[' + permB.join(', ') + ']',
          'mean_A*': round(_mean(permA)), 'mean_B*': round(_mean(permB)),
          [`T*_${r+1}`]: round(tPerm),
          [`permStats [${permStats.length}]`]: '[' + permStats.map(round).join(', ') + ']'
        },
        vizData: { type: 'permutation', dataA, dataB, combined, nA, nB, obsStatistic, permStats: [...permStats], permA, permB, tCurrent: tPerm, phase: 'loop', r: r + 1, R }
      });
    }

    const pValue = permStats.filter(v => v >= obsStatistic).length / R;

    steps.push({
      stepIndex: R + 1,
      title: 'Kết quả — P-value',
      description: 'p-value = tỉ lệ hoán vị có T* ≥ T_obs. Nếu p < 0.05: bác bỏ H0.',
      variables: {
        'T_obs': round(obsStatistic),
        'R (tổng hoán vị)': R,
        '# T* ≥ T_obs': permStats.filter(v => v >= obsStatistic).length,
        'p-value = count / R': round(pValue, 4),
        'Kết luận': pValue < 0.05 ? '✓ Bác bỏ H0 (p < 0.05)' : '✗ Chưa đủ bằng chứng (p ≥ 0.05)'
      },
      vizData: { type: 'permutation', dataA, dataB, combined, nA, nB, obsStatistic, permStats, permA: null, permB: null, tCurrent: null, phase: 'result', r: R, R, pValue }
    });

    return steps;
  }
};

function _mean(a) { return a.reduce((s, v) => s + v, 0) / a.length; }
function _seededRNG(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0x100000000; }; }
function round(v, d = 4) { return Math.round(v * 10**d) / 10**d; }