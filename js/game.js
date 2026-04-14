// === Game State ===
const GameState = {
  playerName: '',
  coins: 50,
  completedPuzzles: {}, // { "北京-故宫-easy": true, ... }
  unlockedSpots: {},    // { "北京": [0], "天津": [0], ... } index of unlocked spots
  props: { hint: 0, autoPlace: 0, preview: 0 },
  currentProvince: null,
  currentSpotIndex: null,
  currentDifficulty: null,
  dailyBonusClaimed: null, // date string
};

// === Save / Load ===
function saveState() {
  const data = {
    playerName: GameState.playerName,
    coins: GameState.coins,
    completedPuzzles: GameState.completedPuzzles,
    unlockedSpots: GameState.unlockedSpots,
    props: GameState.props,
    dailyBonusClaimed: GameState.dailyBonusClaimed,
  };
  localStorage.setItem('puzzle_game_' + GameState.playerName, JSON.stringify(data));
}
function loadState(name) {
  const raw = localStorage.getItem('puzzle_game_' + name);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      Object.assign(GameState, data);
    } catch(e) {}
  }
  GameState.playerName = name;
  // Ensure all provinces have at least spot 0 unlocked
  PROVINCES_DATA.forEach(p => {
    if (!GameState.unlockedSpots[p.province]) {
      GameState.unlockedSpots[p.province] = [0];
    }
  });
  if (!GameState.props) GameState.props = { hint: 0, autoPlace: 0, preview: 0 };
}

// === Screen Navigation ===
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active','fade-in'));
  const el = document.getElementById(id);
  el.classList.add('active', 'fade-in');
}

// === Toast ===
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
}

// === Update Coins Display ===
function updateCoinsDisplay() {
  document.querySelectorAll('[id^="coins-"]').forEach(el => {
    el.textContent = GameState.coins;
  });
}

// === Splash Screen ===
document.getElementById('btn-start').addEventListener('click', () => {
  const name = document.getElementById('player-name').value.trim() || '旅行者';
  loadState(name);
  document.getElementById('player-display-name').textContent = name;
  updateCoinsDisplay();
  showProvinces();
  showScreen('screen-provinces');
});
document.getElementById('player-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-start').click();
});

// === Province Grid ===
function showProvinces() {
  const grid = document.getElementById('province-grid');
  grid.innerHTML = '';
  let totalCompleted = 0;
  PROVINCES_DATA.forEach((prov, idx) => {
    const card = document.createElement('div');
    card.className = 'province-card';
    // Count completions for this province
    let count = 0;
    prov.spots.forEach((spot, si) => {
      const keys = Object.keys(DIFFICULTY);
      if (keys.some(d => GameState.completedPuzzles[`${prov.province}-${spot}-${d}`])) count++;
    });
    totalCompleted += count;
    if (count === 3) card.classList.add('completed');
    const progressPct = Math.round((count / 3) * 100);
    card.innerHTML = `
      <span class="province-name">${prov.province}</span>
      <span class="province-progress">${count}/3</span>
      <div class="province-progress-bar"><div class="province-progress-fill" style="width:${progressPct}%"></div></div>
    `;
    card.addEventListener('click', () => {
      GameState.currentProvince = prov;
      showSpots(prov);
      showScreen('screen-spots');
    });
    grid.appendChild(card);
  });
  document.getElementById('total-progress').textContent = totalCompleted;
  updateCoinsDisplay();
}

// === Spot Selection ===
function showSpots(prov) {
  document.getElementById('spot-province-name').textContent = prov.province;
  const container = document.getElementById('spots-container');
  container.innerHTML = '';
  const unlocked = GameState.unlockedSpots[prov.province] || [0];

  prov.spots.forEach((spot, idx) => {
    const isUnlocked = unlocked.includes(idx);
    const isCompleted = Object.keys(DIFFICULTY).some(d => GameState.completedPuzzles[`${prov.province}-${spot}-${d}`]);
    const card = document.createElement('div');
    card.className = 'spot-card' + (isUnlocked ? '' : ' locked') + (isCompleted ? ' completed' : '');
    const imgPath = getImagePath(prov.province, spot);
    card.innerHTML = `
      <img class="spot-card-image" src="${imgPath}" alt="${spot}" loading="lazy">
      <div class="spot-card-overlay">
        ${!isUnlocked ? '<div class="lock-icon">🔒</div>' : ''}
        <div class="spot-card-name">${spot}</div>
        <div class="spot-card-status">${isCompleted ? '已完成' : (isUnlocked ? '未完成' : '完成上一关解锁')}</div>
      </div>
      ${isCompleted ? '<div class="spot-card-badge">✓ 已完成</div>' : ''}
    `;
    if (isUnlocked) {
      card.addEventListener('click', () => {
        GameState.currentSpotIndex = idx;
        showDifficulty(prov, idx);
        showScreen('screen-difficulty');
      });
    } else {
      card.addEventListener('click', () => showToast('请先完成上一个景点'));
    }
    container.appendChild(card);
  });
  updateCoinsDisplay();
}

// === Difficulty Selection ===
function showDifficulty(prov, spotIdx) {
  const spot = prov.spots[spotIdx];
  const imgPath = getImagePath(prov.province, spot);
  document.getElementById('difficulty-preview-img').src = imgPath;
  document.getElementById('difficulty-spot-name').textContent = `${prov.province} · ${spot}`;
  const container = document.getElementById('difficulty-cards');
  container.innerHTML = '';
  Object.entries(DIFFICULTY).forEach(([key, cfg]) => {
    const completed = GameState.completedPuzzles[`${prov.province}-${spot}-${key}`];
    const card = document.createElement('div');
    card.className = 'difficulty-card';
    card.innerHTML = `
      <div class="difficulty-card-icon">${cfg.icon}</div>
      <div class="difficulty-card-info">
        <div class="difficulty-card-name">${cfg.label}${completed ? ' ✓' : ''}</div>
        <div class="difficulty-card-desc">${cfg.cols}×${cfg.rows} = ${cfg.total}块</div>
      </div>
      <div class="difficulty-card-reward">+${cfg.coins} 🪙</div>
    `;
    card.addEventListener('click', () => {
      GameState.currentDifficulty = key;
      startPuzzle(prov, spotIdx, key);
    });
    container.appendChild(card);
  });
}

// === Puzzle Engine ===
let puzzleState = null; // runtime puzzle data

function startPuzzle(prov, spotIdx, diffKey) {
  const spot = prov.spots[spotIdx];
  const cfg = DIFFICULTY[diffKey];
  const imgPath = getImagePath(prov.province, spot);

  showScreen('screen-game');
  document.getElementById('total-count').textContent = cfg.total;
  document.getElementById('placed-count').textContent = '0';

  // Reference image
  const refImg = document.getElementById('reference-img');
  refImg.src = imgPath;
  const refOverlay = document.getElementById('reference-overlay');
  refOverlay.classList.remove('hidden', 'expanded');

  // Load image and initialize puzzle
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => initPuzzle(img, cfg, prov, spotIdx, diffKey);
  img.onerror = () => showToast('图片加载失败');
  img.src = imgPath;
}

function initPuzzle(img, cfg, prov, spotIdx, diffKey) {
  const canvas = document.getElementById('puzzle-canvas');
  const ctx = canvas.getContext('2d');
  const wrapper = document.querySelector('.game-area-wrapper');
  const wrapperW = wrapper.clientWidth - 16;
  const wrapperH = wrapper.clientHeight - 16;

  // Calculate canvas size to fit
  const imgAspect = img.width / img.height;
  let canvasW, canvasH;
  if (wrapperW / wrapperH > imgAspect) {
    canvasH = wrapperH;
    canvasW = canvasH * imgAspect;
  } else {
    canvasW = wrapperW;
    canvasH = canvasW / imgAspect;
  }
  canvasW = Math.floor(canvasW);
  canvasH = Math.floor(canvasH);
  canvas.width = canvasW;
  canvas.height = canvasH;
  canvas.style.width = canvasW + 'px';
  canvas.style.height = canvasH + 'px';

  const cellW = canvasW / cfg.cols;
  const cellH = canvasH / cfg.rows;

  // Generate piece indices and shuffle
  const pieces = [];
  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < cfg.cols; c++) {
      pieces.push({ row: r, col: c, placed: false });
    }
  }
  // Shuffle for tray
  const shuffled = [...pieces];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  puzzleState = {
    img, cfg, prov, spotIdx, diffKey,
    canvasW, canvasH, cellW, cellH,
    board: Array.from({ length: cfg.rows }, () => Array(cfg.cols).fill(null)),
    trayPieces: shuffled,
    placedCount: 0,
    startTime: Date.now(),
    timerInterval: null,
    spot: prov.spots[spotIdx],
  };

  // Draw grid
  drawBoard();
  // Build tray
  buildTray();
  // Start timer
  startTimer();
  // Setup drag
  setupDrag();
}

function drawBoard() {
  const { img, canvasW, canvasH, cellW, cellH, cfg, board } = puzzleState;
  const canvas = document.getElementById('puzzle-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvasW, canvasH);

  // Draw background (subtle pattern)
  ctx.fillStyle = 'rgba(15,22,40,0.8)';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Draw placed pieces
  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < cfg.cols; c++) {
      const x = c * cellW;
      const y = r * cellH;
      if (board[r][c]) {
        const p = board[r][c];
        const sx = p.col * (img.width / cfg.cols);
        const sy = p.row * (img.height / cfg.rows);
        const sw = img.width / cfg.cols;
        const sh = img.height / cfg.rows;
        ctx.drawImage(img, sx, sy, sw, sh, x, y, cellW, cellH);
      }
    }
  }

  // Draw grid lines
  ctx.strokeStyle = 'rgba(100,130,180,0.3)';
  ctx.lineWidth = 1;
  for (let r = 0; r <= cfg.rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cellH);
    ctx.lineTo(canvasW, r * cellH);
    ctx.stroke();
  }
  for (let c = 0; c <= cfg.cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellW, 0);
    ctx.lineTo(c * cellW, canvasH);
    ctx.stroke();
  }

  // Draw subtle position hints for empty cells (only for easy/medium)
  if (cfg.total <= 48) {
    ctx.fillStyle = 'rgba(100,130,180,0.12)';
    ctx.font = `${Math.min(cellW, cellH) * 0.25}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let r = 0; r < cfg.rows; r++) {
      for (let c = 0; c < cfg.cols; c++) {
        if (!board[r][c]) {
          const x = c * cellW + cellW / 2;
          const y = r * cellH + cellH / 2;
          ctx.fillText(`${r * cfg.cols + c + 1}`, x, y);
        }
      }
    }
  }
}

function buildTray() {
  const tray = document.getElementById('piece-tray');
  tray.innerHTML = '';
  const { img, cfg, cellW, cellH, trayPieces } = puzzleState;

  // Calculate tray piece size
  const trayH = tray.parentElement.clientHeight - 16;
  const pieceDisplayH = Math.min(trayH, 90);
  const pieceDisplayW = pieceDisplayH * (cellW / cellH);

  trayPieces.forEach((piece, idx) => {
    if (piece.placed) return;
    const pieceCanvas = document.createElement('canvas');
    pieceCanvas.width = Math.ceil(img.width / cfg.cols);
    pieceCanvas.height = Math.ceil(img.height / cfg.rows);
    const pctx = pieceCanvas.getContext('2d');
    const sx = piece.col * (img.width / cfg.cols);
    const sy = piece.row * (img.height / cfg.rows);
    pctx.drawImage(img, sx, sy, img.width / cfg.cols, img.height / cfg.rows, 0, 0, pieceCanvas.width, pieceCanvas.height);

    const el = document.createElement('canvas');
    el.width = Math.ceil(pieceDisplayW);
    el.height = Math.ceil(pieceDisplayH);
    el.className = 'tray-piece';
    el.style.width = pieceDisplayW + 'px';
    el.style.height = pieceDisplayH + 'px';
    const ectx = el.getContext('2d');
    ectx.drawImage(pieceCanvas, 0, 0, el.width, el.height);
    el.dataset.trayIndex = idx;
    el.dataset.row = piece.row;
    el.dataset.col = piece.col;
    tray.appendChild(el);
  });
}

function startTimer() {
  if (puzzleState.timerInterval) clearInterval(puzzleState.timerInterval);
  const timerEl = document.getElementById('game-timer');
  puzzleState.timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - puzzleState.startTime) / 1000);
    const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    timerEl.textContent = `${m}:${s}`;
  }, 1000);
}

function stopTimer() {
  if (puzzleState && puzzleState.timerInterval) {
    clearInterval(puzzleState.timerInterval);
    puzzleState.timerInterval = null;
  }
}

// === Drag & Drop System (Touch + Mouse) ===
let dragData = null;
let ghostEl = null;

let _dragCleanup = null;
function setupDrag() {
  // Clean up previous listeners
  if (_dragCleanup) { _dragCleanup(); _dragCleanup = null; }

  const tray = document.getElementById('piece-tray');

  const touchStartHandler = (e) => onDragStart(e);
  const mouseDownHandler = (e) => onDragStart(e);
  const touchMoveHandler = (e) => onDragMove(e);
  const mouseMoveHandler = (e) => onDragMove(e);
  const touchEndHandler = (e) => onDragEnd(e);
  const mouseUpHandler = (e) => onDragEnd(e);

  tray.addEventListener('touchstart', touchStartHandler, { passive: false });
  tray.addEventListener('mousedown', mouseDownHandler);
  document.addEventListener('touchmove', touchMoveHandler, { passive: false });
  document.addEventListener('mousemove', mouseMoveHandler);
  document.addEventListener('touchend', touchEndHandler);
  document.addEventListener('mouseup', mouseUpHandler);

  _dragCleanup = () => {
    tray.removeEventListener('touchstart', touchStartHandler);
    tray.removeEventListener('mousedown', mouseDownHandler);
    document.removeEventListener('touchmove', touchMoveHandler);
    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('touchend', touchEndHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
  };
}

function getPos(e) {
  if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  if (e.changedTouches && e.changedTouches.length > 0) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

let dragStartPos = null;
let isDragging = false;
let longPressTimer = null;

function onDragStart(e) {
  const target = e.target.closest('.tray-piece');
  if (!target) return;

  const pos = getPos(e);
  dragStartPos = pos;
  isDragging = false;

  const row = parseInt(target.dataset.row);
  const col = parseInt(target.dataset.col);
  const trayIdx = parseInt(target.dataset.trayIndex);

  // Start drag after small movement or long press
  const initDrag = () => {
    if (dragData) return;
    isDragging = true;
    target.classList.add('dragging');

    // Create ghost
    ghostEl = document.createElement('canvas');
    ghostEl.className = 'drag-ghost';
    const { cellW, cellH } = puzzleState;
    // Ghost same size as board cell
    const scale = 1;
    ghostEl.width = Math.ceil(cellW);
    ghostEl.height = Math.ceil(cellH);
    ghostEl.style.width = cellW + 'px';
    ghostEl.style.height = cellH + 'px';

    const gctx = ghostEl.getContext('2d');
    const { img, cfg } = puzzleState;
    const sx = col * (img.width / cfg.cols);
    const sy = row * (img.height / cfg.rows);
    gctx.drawImage(img, sx, sy, img.width / cfg.cols, img.height / cfg.rows, 0, 0, ghostEl.width, ghostEl.height);

    ghostEl.style.left = (pos.x - cellW / 2) + 'px';
    ghostEl.style.top = (pos.y - cellH / 2) + 'px';
    document.body.appendChild(ghostEl);

    dragData = { row, col, trayIdx, el: target };
  };

  // For touch: use small delay, for mouse: immediate on move
  if (e.type === 'touchstart') {
    longPressTimer = setTimeout(initDrag, 150);
  }

  // Store initDrag for mousemove
  dragData = null;
  target._initDrag = initDrag;
  target._row = row;
  target._col = col;
  target._trayIdx = trayIdx;

  if (e.type === 'mousedown') {
    e.preventDefault();
    initDrag();
  }
}

function onDragMove(e) {
  if (!dragData && !dragStartPos) return;

  const pos = getPos(e);

  // Check if moved enough to start drag (touch)
  if (!isDragging && dragStartPos) {
    const dist = Math.hypot(pos.x - dragStartPos.x, pos.y - dragStartPos.y);
    if (dist > 10 && longPressTimer) {
      clearTimeout(longPressTimer);
      // Find the target
      const tray = document.getElementById('piece-tray');
      const pieces = tray.querySelectorAll('.tray-piece');
      // Can't easily recover, just cancel
    }
  }

  if (!dragData || !ghostEl) return;
  e.preventDefault();

  const { cellW, cellH } = puzzleState;
  ghostEl.style.left = (pos.x - cellW / 2) + 'px';
  ghostEl.style.top = (pos.y - cellH / 2) + 'px';

  // Highlight target cell
  highlightDropTarget(pos);
}

function highlightDropTarget(pos) {
  const canvas = document.getElementById('puzzle-canvas');
  const rect = canvas.getBoundingClientRect();
  const { cfg, cellW, cellH } = puzzleState;

  // Remove old highlights
  document.querySelectorAll('.drop-highlight').forEach(el => el.remove());

  const relX = pos.x - rect.left;
  const relY = pos.y - rect.top;
  if (relX >= 0 && relX < rect.width && relY >= 0 && relY < rect.height) {
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const col = Math.floor((relX * scaleX) / cellW);
    const row = Math.floor((relY * scaleY) / cellH);
    if (row >= 0 && row < cfg.rows && col >= 0 && col < cfg.cols) {
      const hl = document.createElement('div');
      hl.className = 'drop-highlight';
      hl.style.cssText = `
        position:fixed; pointer-events:none; z-index:900;
        border:2px solid ${(row === dragData.row && col === dragData.col) ? 'rgba(16,185,129,0.8)' : 'rgba(245,158,11,0.5)'};
        background:${(row === dragData.row && col === dragData.col) ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.08)'};
        border-radius:3px;
        left:${rect.left + (col * cellW / scaleX)}px;
        top:${rect.top + (row * cellH / scaleY)}px;
        width:${cellW / scaleX}px;
        height:${cellH / scaleY}px;
      `;
      document.body.appendChild(hl);
    }
  }
}

function onDragEnd(e) {
  clearTimeout(longPressTimer);
  document.querySelectorAll('.drop-highlight').forEach(el => el.remove());

  if (!dragData || !ghostEl) {
    dragData = null;
    dragStartPos = null;
    isDragging = false;
    if (ghostEl) { ghostEl.remove(); ghostEl = null; }
    return;
  }

  const pos = getPos(e);
  const canvas = document.getElementById('puzzle-canvas');
  const rect = canvas.getBoundingClientRect();
  const { cfg, cellW, cellH, board } = puzzleState;

  const relX = pos.x - rect.left;
  const relY = pos.y - rect.top;
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const col = Math.floor((relX * scaleX) / cellW);
  const row = Math.floor((relY * scaleY) / cellH);

  let placed = false;
  if (row >= 0 && row < cfg.rows && col >= 0 && col < cfg.cols) {
    if (row === dragData.row && col === dragData.col && !board[row][col]) {
      // Correct placement!
      board[row][col] = { row: dragData.row, col: dragData.col };
      puzzleState.trayPieces[dragData.trayIdx].placed = true;
      puzzleState.placedCount++;
      document.getElementById('placed-count').textContent = puzzleState.placedCount;
      placed = true;
      drawBoard();
      buildTray();
      setupDrag();

      // Snap flash effect
      showSnapFlash(rect, col, row);

      // Check completion
      if (puzzleState.placedCount === cfg.total) {
        showConfetti();
        setTimeout(() => onPuzzleComplete(), 600);
      }
    } else if (board[row][col]) {
      showToast('该位置已有拼图块');
    } else {
      // Wrong position - no toast, just return piece to tray
    }
  }

  // Cleanup
  dragData.el.classList.remove('dragging');
  ghostEl.remove();
  ghostEl = null;
  dragData = null;
  dragStartPos = null;
  isDragging = false;
}

// === Visual Effects ===
function showSnapFlash(canvasRect, col, row) {
  const { cellW, cellH, cfg } = puzzleState;
  const scaleX = canvasRect.width / puzzleState.canvasW;
  const scaleY = canvasRect.height / puzzleState.canvasH;
  const flash = document.createElement('div');
  flash.className = 'snap-flash';
  flash.style.left = (canvasRect.left + col * cellW * scaleX) + 'px';
  flash.style.top = (canvasRect.top + row * cellH * scaleY) + 'px';
  flash.style.width = (cellW * scaleX) + 'px';
  flash.style.height = (cellH * scaleY) + 'px';
  document.body.appendChild(flash);
  setTimeout(() => flash.remove(), 500);
}

function showConfetti() {
  const container = document.createElement('div');
  container.className = 'confetti-container';
  const colors = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 0.5 + 's';
    piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    container.appendChild(piece);
  }
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 3000);
}

// === Puzzle Complete ===
function onPuzzleComplete() {
  stopTimer();
  const { prov, spotIdx, diffKey, spot, startTime } = puzzleState;
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const cfg = DIFFICULTY[diffKey];

  // Mark as completed
  const key = `${prov.province}-${spot}-${diffKey}`;
  const alreadyCompleted = GameState.completedPuzzles[key];
  GameState.completedPuzzles[key] = true;

  // Unlock next spot
  const unlocked = GameState.unlockedSpots[prov.province];
  if (spotIdx + 1 < prov.spots.length && !unlocked.includes(spotIdx + 1)) {
    unlocked.push(spotIdx + 1);
  }

  // Award coins (only first completion)
  let coinsEarned = 0;
  if (!alreadyCompleted) {
    coinsEarned = cfg.coins;
    GameState.coins += coinsEarned;
  }
  saveState();

  // Show completion screen
  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  document.getElementById('complete-image').src = getImagePath(prov.province, spot);
  document.getElementById('complete-spot-name').textContent = `${prov.province} · ${spot}`;
  document.getElementById('complete-time').textContent = `${m}:${s}`;
  document.getElementById('complete-difficulty').textContent = cfg.label;
  document.getElementById('complete-coins').textContent = alreadyCompleted ? '已领取' : `+${coinsEarned}`;
  showScreen('screen-complete');
  updateCoinsDisplay();
}

// === Props/Tools ===
document.getElementById('tool-hint').addEventListener('click', () => {
  if (!puzzleState) return;
  if (GameState.coins < PROPS.hint.cost) return showToast('金币不足');
  // Find first unplaced piece
  const unplaced = puzzleState.trayPieces.find(p => !p.placed);
  if (!unplaced) return;
  GameState.coins -= PROPS.hint.cost;
  updateCoinsDisplay();
  saveState();

  // Highlight the correct cell on the board
  const { cellW, cellH, cfg } = puzzleState;
  const canvas = document.getElementById('puzzle-canvas');
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / canvas.width;
  const scaleY = rect.height / canvas.height;

  const hl = document.createElement('div');
  hl.className = 'hint-cell-highlight';
  hl.style.left = (rect.left + unplaced.col * cellW * scaleX) + 'px';
  hl.style.top = (rect.top + unplaced.row * cellH * scaleY) + 'px';
  hl.style.width = (cellW * scaleX) + 'px';
  hl.style.height = (cellH * scaleY) + 'px';
  document.body.appendChild(hl);

  // Also highlight the tray piece
  const tray = document.getElementById('piece-tray');
  const idx = puzzleState.trayPieces.indexOf(unplaced);
  const trayPieces = tray.querySelectorAll('.tray-piece');
  trayPieces.forEach(tp => {
    if (parseInt(tp.dataset.trayIndex) === idx) {
      tp.classList.add('hint-active');
      tp.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    }
  });

  setTimeout(() => {
    hl.remove();
    trayPieces.forEach(tp => tp.classList.remove('hint-active'));
  }, 3000);

  showToast('提示：已高亮正确位置');
});

document.getElementById('tool-autoplace').addEventListener('click', () => {
  if (!puzzleState) return;
  if (GameState.coins < PROPS.autoPlace.cost) return showToast('金币不足');
  const unplaced = puzzleState.trayPieces.find(p => !p.placed);
  if (!unplaced) return;
  GameState.coins -= PROPS.autoPlace.cost;
  updateCoinsDisplay();
  saveState();

  // Place it
  const idx = puzzleState.trayPieces.indexOf(unplaced);
  unplaced.placed = true;
  puzzleState.board[unplaced.row][unplaced.col] = { row: unplaced.row, col: unplaced.col };
  puzzleState.placedCount++;
  document.getElementById('placed-count').textContent = puzzleState.placedCount;
  drawBoard();
  buildTray();
  setupDrag();
  showToast('已自动放置一块');

  if (puzzleState.placedCount === puzzleState.cfg.total) {
    showConfetti();
    setTimeout(() => onPuzzleComplete(), 600);
  }
});

document.getElementById('tool-preview').addEventListener('click', () => {
  if (!puzzleState) return;
  if (GameState.coins < PROPS.preview.cost) return showToast('金币不足');
  GameState.coins -= PROPS.preview.cost;
  updateCoinsDisplay();
  saveState();

  const overlay = document.createElement('div');
  overlay.className = 'preview-fullscreen';
  const img = document.createElement('img');
  img.src = getImagePath(puzzleState.prov.province, puzzleState.spot);
  overlay.appendChild(img);
  document.body.appendChild(overlay);
  showToast('预览3秒');
  setTimeout(() => overlay.remove(), 3000);
  overlay.addEventListener('click', () => overlay.remove());
});

// === Reference Image Toggle ===
document.getElementById('btn-ref-toggle').addEventListener('click', () => {
  const ref = document.getElementById('reference-overlay');
  if (ref.classList.contains('hidden')) {
    ref.classList.remove('hidden');
  } else if (ref.classList.contains('expanded')) {
    ref.classList.remove('expanded');
    ref.classList.add('hidden');
  } else {
    ref.classList.add('expanded');
  }
});
document.getElementById('reference-overlay').addEventListener('click', () => {
  const ref = document.getElementById('reference-overlay');
  if (ref.classList.contains('expanded')) {
    ref.classList.remove('expanded');
  } else {
    ref.classList.add('expanded');
  }
});

// === Navigation Buttons ===
document.getElementById('btn-back-provinces').addEventListener('click', () => {
  showProvinces();
  showScreen('screen-provinces');
});
document.getElementById('btn-back-spots').addEventListener('click', () => {
  showSpots(GameState.currentProvince);
  showScreen('screen-spots');
});
document.getElementById('btn-back-difficulty').addEventListener('click', () => {
  stopTimer();
  puzzleState = null;
  showDifficulty(GameState.currentProvince, GameState.currentSpotIndex);
  showScreen('screen-difficulty');
});
document.getElementById('btn-next-puzzle').addEventListener('click', () => {
  const prov = GameState.currentProvince;
  const nextIdx = GameState.currentSpotIndex + 1;
  if (nextIdx < prov.spots.length) {
    GameState.currentSpotIndex = nextIdx;
    showDifficulty(prov, nextIdx);
    showScreen('screen-difficulty');
  } else {
    showProvinces();
    showScreen('screen-provinces');
    showToast('该省份已全部完成！');
  }
});
document.getElementById('btn-replay').addEventListener('click', () => {
  startPuzzle(GameState.currentProvince, GameState.currentSpotIndex, GameState.currentDifficulty);
});
document.getElementById('btn-back-home').addEventListener('click', () => {
  showProvinces();
  showScreen('screen-provinces');
});

// === Shop ===
document.getElementById('btn-shop-from-provinces').addEventListener('click', () => {
  showShop();
  showScreen('screen-shop');
});
document.getElementById('btn-back-from-shop').addEventListener('click', () => {
  showProvinces();
  showScreen('screen-provinces');
});

function showShop() {
  const container = document.getElementById('shop-items');
  container.innerHTML = '';
  Object.entries(PROPS).forEach(([key, prop]) => {
    const item = document.createElement('div');
    item.className = 'shop-item';
    item.innerHTML = `
      <div class="shop-item-icon">${prop.icon}</div>
      <div class="shop-item-info">
        <div class="shop-item-name">${prop.name}</div>
        <div class="shop-item-desc">${prop.desc}</div>
      </div>
      <div class="shop-item-actions">
        <button class="shop-buy-btn shop-buy-coin" data-prop="${key}" data-method="coin">${prop.cost} 🪙 购买</button>
        <button class="shop-buy-btn shop-buy-ad" data-prop="${key}" data-method="ad">📺 免费</button>
      </div>
    `;
    container.appendChild(item);
  });
  // Buy handlers
  container.querySelectorAll('.shop-buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const propKey = btn.dataset.prop;
      const method = btn.dataset.method;
      if (method === 'coin') {
        if (GameState.coins < PROPS[propKey].cost) return showToast('金币不足');
        GameState.coins -= PROPS[propKey].cost;
        GameState.props[propKey] = (GameState.props[propKey] || 0) + 1;
        updateCoinsDisplay();
        saveState();
        showToast(`已购买 ${PROPS[propKey].name}`);
      } else {
        showAd(() => {
          GameState.props[propKey] = (GameState.props[propKey] || 0) + 1;
          saveState();
          showToast(`已获得 ${PROPS[propKey].name}`);
        });
      }
    });
  });
  updateCoinsDisplay();
}

// === Ad System ===
function showAd(callback) {
  const modal = document.getElementById('ad-modal');
  const progress = document.getElementById('ad-progress');
  const timerText = document.getElementById('ad-timer-text');
  const closeBtn = document.getElementById('ad-close-btn');
  modal.classList.add('show');
  closeBtn.disabled = true;
  let elapsed = 0;
  const duration = 3000;
  const interval = setInterval(() => {
    elapsed += 100;
    const pct = Math.min((elapsed / duration) * 100, 100);
    progress.style.width = pct + '%';
    const remaining = Math.ceil((duration - elapsed) / 1000);
    timerText.textContent = remaining > 0 ? `${remaining}秒后可关闭` : '广告已播放完成';
    if (elapsed >= duration) {
      clearInterval(interval);
      closeBtn.disabled = false;
    }
  }, 100);
  closeBtn.onclick = () => {
    modal.classList.remove('show');
    progress.style.width = '0';
    if (callback) callback();
  };
}

// === Watch Ad / Daily Bonus ===
document.getElementById('btn-watch-ad').addEventListener('click', () => {
  showAd(() => {
    GameState.coins += 5;
    updateCoinsDisplay();
    saveState();
    showToast('获得 5 金币');
  });
});
document.getElementById('btn-daily-bonus').addEventListener('click', () => {
  const today = new Date().toDateString();
  if (GameState.dailyBonusClaimed === today) {
    return showToast('今天已领取过每日奖励');
  }
  GameState.dailyBonusClaimed = today;
  GameState.coins += 20;
  updateCoinsDisplay();
  saveState();
  showToast('获得 20 金币每日奖励！');
});

// === Window Resize ===
window.addEventListener('resize', () => {
  if (puzzleState && document.getElementById('screen-game').classList.contains('active')) {
    // Redraw at new size
    const { img, cfg, prov, spotIdx, diffKey } = puzzleState;
    const savedBoard = puzzleState.board;
    const savedTray = puzzleState.trayPieces;
    const savedPlaced = puzzleState.placedCount;
    const savedStart = puzzleState.startTime;

    initPuzzle(img, cfg, prov, spotIdx, diffKey);
    // Restore state
    puzzleState.board = savedBoard;
    puzzleState.trayPieces = savedTray;
    puzzleState.placedCount = savedPlaced;
    puzzleState.startTime = savedStart;
    drawBoard();
    buildTray();
    setupDrag();
  }
});
