const state = {
  currentLevel: null,
  materials: {},
  boxItems: [],
  history: [],
  gridSize: { rows: 4, cols: 4 },
  premiumUnlocked: false
};

const API_BASE = '/api';

async function init() {
  await loadMaterials();
  await loadLevels();
  initGrid();
  bindEvents();
}

async function loadMaterials() {
  try {
    const res = await fetch(`${API_BASE}/materials`);
    const data = await res.json();
    if (data.success) {
      state.materials = data.data;
      renderMaterials();
    }
  } catch (e) {
    console.error('加载素材失败:', e);
  }
}

async function loadLevels() {
  try {
    const res = await fetch(`${API_BASE}/levels`);
    const data = await res.json();
    if (data.success) {
      const select = document.getElementById('levelSelect');
      data.data.forEach(level => {
        const option = document.createElement('option');
        option.value = level.id;
        option.textContent = `${level.name} - ${level.scene}`;
        select.appendChild(option);
      });
    }
  } catch (e) {
    console.error('加载关卡失败:', e);
  }
}

function renderMaterials() {
  const categories = ['fruits', 'meat', 'dried'];
  const listIds = ['fruitsList', 'meatList', 'driedList'];
  
  categories.forEach((cat, idx) => {
    const listEl = document.getElementById(listIds[idx]);
    listEl.innerHTML = '';
    
    state.materials[cat].forEach(material => {
      const item = document.createElement('div');
      item.className = 'material-item';
      item.draggable = true;
      item.dataset.materialId = material.id;
      item.innerHTML = `
        <span class="material-emoji">${material.emoji}</span>
        <div class="material-info">
          <div class="material-name">${material.name}</div>
          <div class="material-stats">${material.weight}g · ¥${material.price}</div>
        </div>
      `;
      
      item.addEventListener('dragstart', handleDragStart);
      item.addEventListener('dragend', handleDragEnd);
      listEl.appendChild(item);
    });
  });
}

function initGrid() {
  const grid = document.getElementById('boxGrid');
  grid.innerHTML = '';
  
  for (let i = 0; i < state.gridSize.rows * state.gridSize.cols; i++) {
    const cell = document.createElement('div');
    cell.className = 'grid-cell';
    cell.dataset.index = i;
    
    cell.addEventListener('dragover', handleDragOver);
    cell.addEventListener('dragleave', handleDragLeave);
    cell.addEventListener('drop', handleDrop);
    cell.addEventListener('click', handleCellClick);
    
    grid.appendChild(cell);
  }
}

function bindEvents() {
  document.getElementById('levelSelect').addEventListener('change', handleLevelChange);
  document.getElementById('btnUndo').addEventListener('click', handleUndo);
  document.getElementById('btnClear').addEventListener('click', handleClear);
  document.getElementById('btnValidate').addEventListener('click', handleValidate);
  document.getElementById('btnPremium').addEventListener('click', handleUnlockPremium);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalConfirm').addEventListener('click', closeModal);
  document.getElementById('resultModal').addEventListener('click', (e) => {
    if (e.target.id === 'resultModal') closeModal();
  });
}

function handleDragStart(e) {
  e.dataTransfer.setData('materialId', e.target.dataset.materialId);
  e.target.classList.add('dragging');
}

function handleDragEnd(e) {
  e.target.classList.remove('dragging');
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  
  const materialId = e.dataTransfer.getData('materialId');
  const cellIndex = parseInt(e.currentTarget.dataset.index);
  
  if (!materialId || !state.currentLevel) return;
  
  const material = getMaterialById(materialId);
  if (!material) return;
  
  const existingItem = state.boxItems.find(item => item.cellIndex === cellIndex);
  if (existingItem) return;
  
  saveHistory();
  
  state.boxItems.push({
    ...material,
    cellIndex,
    quantity: 1
  });
  
  renderBox();
  updateConstraints();
  updateButtons();
}

function handleCellClick(e) {
  const cell = e.currentTarget;
  const cellIndex = parseInt(cell.dataset.index);
  
  const itemIndex = state.boxItems.findIndex(item => item.cellIndex === cellIndex);
  if (itemIndex > -1) {
    saveHistory();
    state.boxItems.splice(itemIndex, 1);
    renderBox();
    updateConstraints();
    updateButtons();
  }
}

function handleLevelChange(e) {
  const levelId = parseInt(e.target.value);
  if (!levelId) {
    state.currentLevel = null;
    resetBox();
    return;
  }
  
  loadLevel(levelId);
}

async function loadLevel(levelId) {
  try {
    const res = await fetch(`${API_BASE}/levels/${levelId}`);
    const data = await res.json();
    if (data.success) {
      state.currentLevel = data.data;
      state.premiumUnlocked = false;
      resetBox();
      updateLevelUI();
    }
  } catch (e) {
    console.error('加载关卡详情失败:', e);
  }
}

function updateLevelUI() {
  if (!state.currentLevel) return;
  
  document.querySelector('.box-container').style.background = state.currentLevel.bgColor;
  
  const requiredList = document.getElementById('requiredList');
  requiredList.innerHTML = '';
  
  state.currentLevel.required.forEach(reqId => {
    const material = getMaterialById(reqId);
    if (material) {
      const span = document.createElement('span');
      span.className = 'required-item';
      span.dataset.materialId = reqId;
      span.textContent = `${material.emoji} ${material.name}`;
      requiredList.appendChild(span);
    }
  });
  
  updateConstraints();
  updatePremiumStatus();
}

function updateConstraints() {
  if (!state.currentLevel) return;
  
  const counts = { fruits: 0, meat: 0, dried: 0 };
  let totalWeight = 0;
  let totalPrice = 0;
  const itemIds = new Set();
  
  state.boxItems.forEach(item => {
    counts[item.category]++;
    totalWeight += item.weight * item.quantity;
    totalPrice += item.price * item.quantity;
    itemIds.add(item.id);
  });
  
  const constraints = state.currentLevel.constraints;
  
  document.getElementById('fruitsCount').textContent = `${counts.fruits}/${constraints.fruits.min}-${constraints.fruits.max}`;
  document.getElementById('meatCount').textContent = `${counts.meat}/${constraints.meat.min}-${constraints.meat.max}`;
  document.getElementById('driedCount').textContent = `${counts.dried}/${constraints.dried.min}-${constraints.dried.max}`;
  document.getElementById('weightValue').textContent = `${totalWeight}g/${constraints.totalWeight.max}g`;
  document.getElementById('priceValue').textContent = `¥${totalPrice}/¥${constraints.totalPrice.min}-${constraints.totalPrice.max}`;
  
  updateConstraintStyle('constraintFruits', counts.fruits, constraints.fruits.min, constraints.fruits.max);
  updateConstraintStyle('constraintMeat', counts.meat, constraints.meat.min, constraints.meat.max);
  updateConstraintStyle('constraintDried', counts.dried, constraints.dried.min, constraints.dried.max);
  updateConstraintStyle('constraintWeight', totalWeight, 0, constraints.totalWeight.max, true);
  updatePriceConstraint(counts.dried, constraints.dried.min, constraints.dried.max);
  
  const weightEl = document.getElementById('constraintWeight');
  weightEl.classList.remove('warning', 'error', 'success');
  if (totalWeight > constraints.totalWeight.max) {
    weightEl.classList.add('error');
  } else if (totalWeight > 0) {
    weightEl.classList.add('success');
  }
  
  const priceEl = document.getElementById('constraintPrice');
  priceEl.classList.remove('warning', 'error', 'success');
  if (totalPrice < constraints.totalPrice.min && totalPrice > 0) {
    priceEl.classList.add('warning');
  } else if (totalPrice > constraints.totalPrice.max) {
    priceEl.classList.add('error');
  } else if (totalPrice > 0) {
    priceEl.classList.add('success');
  }
  
  document.querySelectorAll('.required-item').forEach(el => {
    const id = el.dataset.materialId;
    el.classList.remove('has', 'missing');
    if (itemIds.has(id)) {
      el.classList.add('has');
    } else {
      el.classList.add('missing');
    }
  });
}

function updateConstraintStyle(elementId, current, min, max, isWeight = false) {
  const el = document.getElementById(elementId);
  el.classList.remove('warning', 'error', 'success');
  
  if (isWeight) {
    if (current > max) {
      el.classList.add('error');
    } else if (current > 0) {
      el.classList.add('success');
    }
  } else {
    if (current < min && current > 0) {
      el.classList.add('warning');
    } else if (current > max) {
      el.classList.add('error');
    } else if (current >= min) {
      el.classList.add('success');
    }
  }
}

function updatePriceConstraint(current, min, max) {
}

function renderBox() {
  const cells = document.querySelectorAll('.grid-cell');
  
  cells.forEach(cell => {
    const index = parseInt(cell.dataset.index);
    const item = state.boxItems.find(i => i.cellIndex === index);
    
    if (item) {
      cell.classList.add('filled');
      cell.innerHTML = `
        <div class="cell-item">
          <span class="cell-emoji">${item.emoji}</span>
          <span class="cell-name">${item.name}</span>
        </div>
        <span class="cell-remove">×</span>
      `;
    } else {
      cell.classList.remove('filled');
      cell.innerHTML = '';
    }
  });
}

function saveHistory() {
  state.history.push(JSON.parse(JSON.stringify(state.boxItems)));
  if (state.history.length > 20) {
    state.history.shift();
  }
}

function handleUndo() {
  if (state.history.length === 0) return;
  
  state.boxItems = state.history.pop();
  renderBox();
  updateConstraints();
  updateButtons();
}

function handleClear() {
  if (state.boxItems.length === 0) return;
  
  saveHistory();
  state.boxItems = [];
  renderBox();
  updateConstraints();
  updateButtons();
}

function resetBox() {
  state.boxItems = [];
  state.history = [];
  state.premiumUnlocked = false;
  renderBox();
  updateConstraints();
  updateButtons();
  updatePremiumStatus();
  document.getElementById('validationResult').innerHTML = '<p class="placeholder">请选择关卡并组装礼盒后提交校验</p>';
  
  const giftBox = document.getElementById('giftBox');
  giftBox.classList.remove('premium');
}

function updateButtons() {
  document.getElementById('btnUndo').disabled = state.history.length === 0;
  document.getElementById('btnClear').disabled = state.boxItems.length === 0;
  document.getElementById('btnValidate').disabled = !state.currentLevel || state.boxItems.length === 0;
}

async function handleValidate() {
  if (!state.currentLevel || state.boxItems.length === 0) return;
  
  const assembly = {
    items: state.boxItems.map(item => ({ id: item.id, quantity: item.quantity }))
  };
  
  try {
    const res = await fetch(`${API_BASE}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ levelId: state.currentLevel.id, assembly })
    });
    
    const data = await res.json();
    if (data.success) {
      displayValidationResult(data.data);
    }
  } catch (e) {
    console.error('校验失败:', e);
    showModal('错误', '<p>校验请求失败，请稍后重试</p>');
  }
}

function displayValidationResult(result) {
  const resultEl = document.getElementById('validationResult');
  
  if (result.valid) {
    resultEl.innerHTML = `
      <div class="result-summary success">
        <h4>🎉 校验通过！</h4>
        <p>所有条件均已满足，可以解锁高端包装</p>
      </div>
      <div style="padding: 12px; background: #f8f9fa; border-radius: 8px;">
        <p style="margin-bottom: 8px;"><strong>统计信息：</strong></p>
        <p>🍎 果蔬：${result.summary.categoryCounts.fruits} 种</p>
        <p>🥩 鲜肉：${result.summary.categoryCounts.meat} 种</p>
        <p>🍄 干货：${result.summary.categoryCounts.dried} 种</p>
        <p>⚖️ 总重量：${result.summary.totalWeight}g</p>
        <p>💰 总价：¥${result.summary.totalPrice}</p>
      </div>
    `;
    
    document.getElementById('btnPremium').disabled = false;
    showModal('🎉 校验通过', `
      <div class="success-icon">🎊</div>
      <p style="text-align: center; margin-bottom: 16px;">恭喜！所有四层校验均已通过！</p>
      <p style="text-align: center; color: #666;">可以解锁高端礼盒包装了</p>
    `);
  } else {
    let errorsHtml = '';
    result.errors.forEach(error => {
      let icon = '⚠️';
      if (error.type === 'weight') icon = '⚖️';
      if (error.type === 'price') icon = '💰';
      if (error.type === 'required') icon = '❌';
      if (error.type === 'quantity') icon = '📦';
      
      errorsHtml += `
        <div class="error-item type-${error.type}">
          <span class="error-icon">${icon}</span>
          <span class="error-message">${error.message}</span>
        </div>
      `;
    });
    
    resultEl.innerHTML = `
      <div class="result-summary fail">
        <h4>❌ 校验未通过</h4>
        <p>共发现 ${result.errors.length} 项违规</p>
      </div>
      <div class="error-list">
        ${errorsHtml}
      </div>
    `;
    
    document.getElementById('btnPremium').disabled = true;
    showModal('❌ 校验未通过', `
      <p style="margin-bottom: 12px;"><strong>发现 ${result.errors.length} 项违规：</strong></p>
      <div class="error-list">${errorsHtml}</div>
    `);
  }
}

async function handleUnlockPremium() {
  if (!state.currentLevel || state.boxItems.length === 0) return;
  
  const assembly = {
    items: state.boxItems.map(item => ({ id: item.id, quantity: item.quantity }))
  };
  
  try {
    const res = await fetch(`${API_BASE}/unlock-premium`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ levelId: state.currentLevel.id, assembly })
    });
    
    const data = await res.json();
    if (data.success) {
      state.premiumUnlocked = true;
      const giftBox = document.getElementById('giftBox');
      giftBox.classList.add('premium');
      updatePremiumStatus();
      
      showModal('👑 解锁成功', `
        <div class="success-icon">🎁</div>
        <p style="text-align: center; margin-bottom: 8px;">高端礼盒包装已解锁！</p>
        <p style="text-align: center; color: #666; font-size: 13px;">
          剩余解锁次数：${data.data.remaining} / ${data.data.total}
        </p>
      `);
    } else {
      showModal('解锁失败', `<p>${data.message}</p>`);
      if (data.errors) {
        let errorsHtml = '';
        data.errors.forEach(error => {
          errorsHtml += `<div class="error-item type-${error.type}"><span>${error.message}</span></div>`;
        });
        displayValidationResult({ valid: false, errors: data.errors });
      }
    }
  } catch (e) {
    console.error('解锁失败:', e);
    showModal('错误', '<p>解锁请求失败，请稍后重试</p>');
  }
}

function updatePremiumStatus() {
  const statusText = document.getElementById('premiumStatusText');
  const level = state.currentLevel;
  
  if (!level) {
    statusText.textContent = '高端包装：未解锁';
    document.getElementById('btnPremium').disabled = true;
    return;
  }
  
  fetch(`${API_BASE}/premium-status/${level.id}`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        if (state.premiumUnlocked) {
          statusText.textContent = `高端包装：已解锁（剩余 ${data.data.remaining} 次）`;
        } else if (data.data.remaining <= 0) {
          statusText.textContent = `高端包装：次数已用完（${data.data.total}次）`;
          document.getElementById('btnPremium').disabled = true;
        } else {
          statusText.textContent = `高端包装：待解锁（共 ${data.data.total} 次）`;
        }
      }
    })
    .catch(e => console.error(e));
}

function getMaterialById(id) {
  const allMaterials = [
    ...(state.materials.fruits || []),
    ...(state.materials.meat || []),
    ...(state.materials.dried || [])
  ];
  return allMaterials.find(m => m.id === id);
}

function showModal(title, content) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = content;
  document.getElementById('resultModal').classList.add('show');
}

function closeModal() {
  document.getElementById('resultModal').classList.remove('show');
}

document.addEventListener('DOMContentLoaded', init);
