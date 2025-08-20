(function () {
  const svg = document.getElementById('viewport');
  const layer = document.getElementById('layer');

  // Transform state: matrix(sx, 0, 0, sy, tx, ty) where sx=sy=s (uniform scale)
  let s = 1, tx = 0, ty = 0;
  const MIN_SCALE = 0.25;
  const MAX_SCALE = 8;

  // Drag state
  let dragging = false;
  let lastX = 0, lastY = 0;

  function applyTransform() {
    layer.setAttribute('transform', `matrix(${s} 0 0 ${s} ${tx} ${ty})`);
  }

  // Convert a client (screen) point to *content* coordinates (pre-transform)
  function clientToContent(clientX, clientY) {
    const pt = new DOMPoint(clientX, clientY);
    const inv = layer.getScreenCTM().inverse();
    const { x, y } = pt.matrixTransform(inv);
    return { x, y };
  }

  // Wheel to zoom (centered on cursor)
  svg.addEventListener('wheel', (e) => {
    e.preventDefault(); // keep the page from scrolling
    const delta = Math.sign(e.deltaY); // 1 for out, -1 for in (typical mice)
    const zoomFactor = Math.pow(1.1, -delta); // smooth step
    const ns = clamp(s * zoomFactor, MIN_SCALE, MAX_SCALE);
    const k = ns / s;
    if (k === 1) return;

    // Cursor point in *content* coordinates
    const { x, y } = clientToContent(e.clientX, e.clientY);

    // Keep the cursor-anchored point stable on screen:
    // screen = s*x + tx   ->   ns*x + ntx  === screen  =>  ntx = tx + (s - ns)*x
    tx = tx + (s - ns) * x;
    ty = ty + (s - ns) * y;

    s = ns;
    applyTransform();
  }, { passive: false });

  // Mouse / pointer drag to pan
  svg.addEventListener('pointerdown', (e) => {
    svg.setPointerCapture(e.pointerId);
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    svg.classList.add('dragging');
  });

  svg.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;

    // Since tx,ty are in screen units (post-scale), we can add raw dx/dy
    tx += dx;
    ty += dy;
    applyTransform();
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    svg.classList.remove('dragging');
    if (e && e.pointerId) svg.releasePointerCapture(e.pointerId);
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointerleave', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  // Double-click resets view
  svg.addEventListener('dblclick', () => {
    s = 1; tx = 0; ty = 0;
    applyTransform();
  });

  // Keyboard (optional): + / - to zoom around center, arrows to pan
  svg.addEventListener('keydown', (e) => {
    const step = 40; // pan step in pixels
    if (e.key === 'ArrowLeft') { tx += step; applyTransform(); }
    else if (e.key === 'ArrowRight') { tx -= step; applyTransform(); }
    else if (e.key === 'ArrowUp') { ty += step; applyTransform(); }
    else if (e.key === 'ArrowDown') { ty -= step; applyTransform(); }
    else if (e.key === '+' || e.key === '=') {
      zoomAtCenter(1.1);
    } else if (e.key === '-' || e.key === '_') {
      zoomAtCenter(1 / 1.1);
    }
  });

  function zoomAtCenter(factor) {
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const ns = clamp(s * factor, MIN_SCALE, MAX_SCALE);
    const k = ns / s; if (k === 1) return;
    const { x, y } = clientToContent(cx, cy);
    tx = tx + (s - ns) * x;
    ty = ty + (s - ns) * y;
    s = ns;
    applyTransform();
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // Initial apply (in case you want to change defaults above)
  applyTransform();
})();
