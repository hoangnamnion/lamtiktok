/**
 * Module điều khiển Bottom Sheet chuẩn iOS cho thiết bị di động
 */

export const SNAP_POINTS = {
  COLLAPSED: 'collapsed',
  HALF: 'half',
  EXPANDED: 'expanded'
};

/**
 * Tính chiều cao theo pixel tương ứng với từng nấc
 * @param {'collapsed' | 'half' | 'expanded'} snapPoint
 * @param {number} windowHeight
 * @returns {number}
 */
export function getSnapHeight(snapPoint, windowHeight = window.innerHeight) {
  switch (snapPoint) {
    case SNAP_POINTS.COLLAPSED:
      return 110;
    case SNAP_POINTS.EXPANDED:
      return Math.min(windowHeight * 0.88, windowHeight - 60);
    case SNAP_POINTS.HALF:
    default:
      return Math.min(windowHeight * 0.50, 480);
  }
}

/**
 * Tính toán nấc hít (Snap point) mục tiêu dựa trên chiều cao hiện tại và vận tốc vuốt
 * @param {Object} params
 * @param {number} params.currentHeight
 * @param {number} params.velocityY - Âm là vuốt lên, dương là vuốt xuống
 * @param {number} params.windowHeight
 * @returns {'collapsed' | 'half' | 'expanded'}
 */
export function calculateSnapPoint({ currentHeight, velocityY = 0, windowHeight = window.innerHeight }) {
  const hCollapsed = getSnapHeight(SNAP_POINTS.COLLAPSED, windowHeight);
  const hHalf = getSnapHeight(SNAP_POINTS.HALF, windowHeight);
  const hExpanded = getSnapHeight(SNAP_POINTS.EXPANDED, windowHeight);

  // Nếu vuốt mạnh lên (vận tốc nhanh)
  if (velocityY < -0.5) {
    if (currentHeight < hHalf + 50) return SNAP_POINTS.HALF;
    return SNAP_POINTS.EXPANDED;
  }

  // Nếu vuốt mạnh xuống
  if (velocityY > 0.5) {
    if (currentHeight > hHalf - 50) return SNAP_POINTS.HALF;
    return SNAP_POINTS.COLLAPSED;
  }

  // Nếu thả tay tĩnh: Tìm khoảng cách gần nhất
  const distCollapsed = Math.abs(currentHeight - hCollapsed);
  const distHalf = Math.abs(currentHeight - hHalf);
  const distExpanded = Math.abs(currentHeight - hExpanded);

  const minDist = Math.min(distCollapsed, distHalf, distExpanded);
  if (minDist === distCollapsed) return SNAP_POINTS.COLLAPSED;
  if (minDist === distHalf) return SNAP_POINTS.HALF;
  return SNAP_POINTS.EXPANDED;
}

/**
 * Khởi tạo Controller điều khiển tương tác cảm ứng cho Bottom Sheet
 * @param {HTMLElement} sheetEl
 * @param {HTMLElement} handleEl
 * @param {Function} onStateChange
 */
export function initBottomSheet(sheetEl, handleEl, onStateChange = () => {}) {
  if (!sheetEl || !handleEl) return;

  let startY = 0;
  let startHeight = 0;
  let currentHeight = 0;
  let lastY = 0;
  let lastTime = 0;
  let velocityY = 0;
  let isDragging = false;
  let currentState = SNAP_POINTS.HALF;

  function setSheetHeight(height, animate = true) {
    if (animate) {
      sheetEl.style.transition = 'height 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)';
    } else {
      sheetEl.style.transition = 'none';
    }
    sheetEl.style.height = `${height}px`;
    currentHeight = height;
  }

  function setSnapState(state) {
    currentState = state;
    const targetHeight = getSnapHeight(state, window.innerHeight);
    setSheetHeight(targetHeight, true);
    sheetEl.setAttribute('data-snap', state);
    onStateChange(state);
  }

  // Touch Events
  handleEl.addEventListener('touchstart', (e) => {
    isDragging = true;
    startY = e.touches[0].clientY;
    lastY = startY;
    lastTime = Date.now();
    startHeight = sheetEl.offsetHeight;
    velocityY = 0;
    setSheetHeight(startHeight, false);
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const clientY = e.touches[0].clientY;
    const deltaY = startY - clientY; // Kéo lên là dương
    const newHeight = Math.max(100, Math.min(window.innerHeight * 0.92, startHeight + deltaY));
    
    const now = Date.now();
    const dt = now - lastTime;
    if (dt > 0) {
      velocityY = (clientY - lastY) / dt; // Kéo xuống là dương
    }
    lastY = clientY;
    lastTime = now;

    setSheetHeight(newHeight, false);
  }, { passive: true });

  window.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    const targetSnap = calculateSnapPoint({
      currentHeight,
      velocityY,
      windowHeight: window.innerHeight
    });
    setSnapState(targetSnap);
  }, { passive: true });

  // Nhấp vào thanh handle để chuyển đổi trạng thái
  handleEl.addEventListener('click', () => {
    if (currentState === SNAP_POINTS.COLLAPSED) {
      setSnapState(SNAP_POINTS.HALF);
    } else if (currentState === SNAP_POINTS.HALF) {
      setSnapState(SNAP_POINTS.EXPANDED);
    } else {
      setSnapState(SNAP_POINTS.HALF);
    }
  });

  // Khởi tạo mặc định ở trạng thái HALF trên mobile
  if (window.innerWidth <= 768) {
    setSnapState(SNAP_POINTS.HALF);
  }

  return {
    setSnapState,
    getState: () => currentState
  };
}
