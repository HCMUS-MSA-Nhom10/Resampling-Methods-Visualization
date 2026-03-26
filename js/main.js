/**
 * ENTRY POINT — Khởi tạo toàn bộ app khi DOM load xong.
 */
document.addEventListener('DOMContentLoaded', () => {
  Renderer.init();
  Distribution.init();
  Layout.init();
  Controls.init();
});
/*
```

---

## Tóm tắt kiến trúc
```
main.js
  ├── Layout.init()       ← tab switching, data chips, param form
  ├── Controls.init()     ← next/prev/reset/run events
  └── Renderer.init()     ← canvas setup

Controls.run()
  ├── lấy data từ Layout.getData()
  ├── lấy params từ Layout.getParams()
  ├── gọi AlgoXxx.run(data, params) → Array<Step>
  └── Controls.load(steps)
         ├── Renderer.render(step.vizData)   ← vẽ canvas
         └── Annotations.render(step)        ← render bảng biến
*/