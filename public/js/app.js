const state = {
  currentLevel: null,
  materials: {},
  boxItems: [],
  history: [],
  gridSize: { rows: 4, cols: 4 },
  premiumUnlocked: false,
  suggestion: null,
  appliedAdds: new Set(),
  appliedRemoves: new Set(),
  assistPanelOpen: false
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
  document.getElementById('btnAssist').addEventListener('click', handleAssistToggle);
  document.getElementById('assistClose').addEventListener('click', closeAssistPanel);
  document.getElementById('assistStrategy').addEventListener('change', handleStrategyChange);
  document.getElementById('btnApplyAll').addEventListener('click', applyAllSuggestions);
  document.getElementById('btnCancelAssist').addEventListener('click', cancelSuggestion);
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
  
  clearSuggestionState();
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
    clearSuggestionState();
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
  clearSuggestionState();
  renderBox();
  updateConstraints();
  updateButtons();
}

function handleClear() {
  if (state.boxItems.length === 0) return;
  
  saveHistory();
  state.boxItems = [];
  clearSuggestionState();
  renderBox();
  updateConstraints();
  updateButtons();
}

function resetBox() {
  state.boxItems = [];
  state.history = [];
  state.premiumUnlocked = false;
  clearSuggestionState();
  renderBox();
  updateConstraints();
  updateButtons();
  updatePremiumStatus();
  document.getElementById('validationResult').innerHTML = '<p class="placeholder">请选择关卡并组装礼盒后提交校验</p>';
  
  const giftBox = document.getElementById('giftBox');
  giftBox.classList.remove('premium');
}

function clearSuggestionState() {
  if (state.suggestion) {
    state.suggestion = null;
    state.appliedAdds.clear();
    state.appliedRemoves.clear();
    if (state.assistPanelOpen) {
      const content = document.getElementById('assistContent');
      content.innerHTML = '<p class="assist-placeholder">礼盒内容已变化，点击「求助手建议」重新生成方案</p>';
      document.getElementById('assistActions').style.display = 'none';
    }
    clearSuggestionOverlay();
  }
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

function handleAssistToggle() {
  if (!state.currentLevel) {
    showModal('提示', '<p>请先选择关卡</p>');
    return;
  }
  
  const panel = document.getElementById('assistPanel');
  if (state.assistPanelOpen && state.suggestion) {
    closeAssistPanel();
  } else {
    openAssistPanel();
    if (!state.suggestion) {
      fetchSuggestion();
    }
  }
}

function openAssistPanel() {
  state.assistPanelOpen = true;
  document.getElementById('assistPanel').style.display = 'block';
  updateAssistButtonState();
}

function closeAssistPanel() {
  state.assistPanelOpen = false;
  document.getElementById('assistPanel').style.display = 'none';
  clearSuggestionOverlay();
  updateAssistButtonState();
}

function updateAssistButtonState() {
  const btn = document.getElementById('btnAssist');
  if (state.assistPanelOpen) {
    btn.textContent = '💡 收起助手';
  } else {
    btn.textContent = '💡 求助手建议';
  }
}

function handleStrategyChange() {
  if (state.suggestion && state.suggestion.strategy !== document.getElementById('assistStrategy').value) {
    fetchSuggestion();
  }
}

async function fetchSuggestion() {
  const strategy = document.getElementById('assistStrategy').value;
  const content = document.getElementById('assistContent');
  const actions = document.getElementById('assistActions');
  
  content.innerHTML = `
    <div class="assist-loading">
      <div class="spinner"></div>
      <p style="color: #666; font-size: 13px;">正在计算最优方案...</p>
    </div>
  `;
  actions.style.display = 'none';

  const assembly = {
    items: state.boxItems.map(item => ({ id: item.id, quantity: item.quantity }))
  };

  try {
    const res = await fetch(`${API_BASE}/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        levelId: state.currentLevel.id,
        assembly,
        strategy
      })
    });
    
    const data = await res.json();
    if (data.success) {
      state.suggestion = data.data;
      state.appliedAdds = new Set();
      state.appliedRemoves = new Set();
      renderSuggestion();
      renderSuggestionOverlay();
    } else {
      content.innerHTML = `
        <div class="assist-unreachable">
          <div class="icon">❌</div>
          <div class="title">获取建议失败</div>
          <div class="reason">${data.message || '请稍后重试'}</div>
        </div>
      `;
    }
  } catch (e) {
    console.error('获取建议失败:', e);
    content.innerHTML = `
      <div class="assist-unreachable">
        <div class="icon">🌐</div>
        <div class="title">网络错误</div>
        <div class="reason">获取建议请求失败，请检查网络连接</div>
      </div>
    `;
  }
}

function renderSuggestion() {
  const content = document.getElementById('assistContent');
  const actions = document.getElementById('assistActions');
  const s = state.suggestion;

  if (!s.feasible) {
    actions.style.display = 'none';
    const stuckLabels = {
      level: '关卡不存在',
      required: '必备食材约束',
      quantity: '品类数量约束',
      weight: '重量约束',
      price: '价格约束',
      combined: '多重约束组合'
    };
    content.innerHTML = `
      <div class="assist-unreachable">
        <div class="icon">🚫</div>
        <div class="title">本关无解</div>
        <div class="reason">
          <p style="margin-bottom: 8px;"><strong>卡壳在：${stuckLabels[s.stuckAt] || s.stuckAt}</strong></p>
          <p>${s.reason}</p>
        </div>
      </div>
    `;
    clearSuggestionOverlay();
    return;
  }

  actions.style.display = 'flex';

  const strategyLabels = {
    'min-change': '最小改动合规',
    'min-cost': '成本最优合规'
  };

  const summaryClass = s.isOptimal ? 'optimal' : 'suboptimal';
  const badgeClass = s.isOptimal ? 'optimal' : 'suboptimal';
  const badgeText = s.isOptimal ? '最优解' : '近似解（超时）';

  const addCount = s.toAdd.length;
  const removeCount = s.toRemove.length;

  let addHtml = '';
  if (s.toAdd.length > 0) {
    addHtml = `
      <div class="assist-section">
        <div class="assist-section-title add">➕ 拟新增 (${s.toAdd.length}种)</div>
        <div class="assist-item-list">
          ${s.toAdd.map(m => `
            <div class="assist-item add" data-material-id="${m.id}" data-action="add" onclick="handleSingleSuggestionClick('${m.id}', 'add')">
              <span class="emoji">${m.emoji}</span>
              <span>${m.name}</span>
              <span class="apply-btn">点我应用</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  let removeHtml = '';
  if (s.toRemove.length > 0) {
    removeHtml = `
      <div class="assist-section">
        <div class="assist-section-title remove">➖ 拟移除 (${s.toRemove.length}种)</div>
        <div class="assist-item-list">
          ${s.toRemove.map(m => `
            <div class="assist-item remove" data-material-id="${m.id}" data-action="remove" onclick="handleSingleSuggestionClick('${m.id}', 'remove')">
              <span class="emoji">${m.emoji}</span>
              <span>${m.name}</span>
              <span class="apply-btn">点我应用</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  const summaryData = s.result.summary;

  let premiumHtml = '';
  if (s.canUnlockPremium) {
    premiumHtml = '<div class="assist-premium-hint">👑 此方案可以解锁高端包装</div>';
  }

  content.innerHTML = `
    <div class="assist-summary ${summaryClass}">
      <strong>${strategyLabels[s.strategy] || s.strategy}</strong>
      <span class="badge ${badgeClass}">${badgeText}</span>
      <div style="margin-top: 4px; font-size: 12px; color: #666;">
        ${addCount + removeCount > 0 
          ? `共 ${addCount + removeCount} 步操作（新增 ${addCount} 种，移除 ${removeCount} 种`
          : '当前礼盒已合规，无需改动'}
      </div>
    </div>
    ${addHtml}
    ${removeHtml}
    <div class="assist-stats">
      <div class="assist-stats-row">
        <span>🍎 果蔬</span>
        <span>${summaryData.categoryCounts.fruits} 种</span>
      </div>
      <div class="assist-stats-row">
        <span>🥩 鲜肉</span>
        <span>${summaryData.categoryCounts.meat} 种</span>
      </div>
      <div class="assist-stats-row">
        <span>🍄 干货</span>
        <span>${summaryData.categoryCounts.dried} 种</span>
      </div>
      <div class="assist-stats-row">
        <span>⚖️ 总重量</span>
        <span>${summaryData.totalWeight}g</span>
      </div>
      <div class="assist-stats-row">
        <span>💰 总价</span>
        <span>¥${summaryData.totalPrice}</span>
      </div>
    </div>
    ${premiumHtml}
  `;
}

function renderSuggestionOverlay() {
  if (!state.suggestion || !state.suggestion.feasible) return;
  
  const s = state.suggestion;
  const cells = document.querySelectorAll('.grid-cell');
  
  const addIds = new Set(s.toAdd.map(m => m.id));
  const removeIds = new Set(s.toRemove.map(m => m.id));
  
  let emptyCellIndices = [];
  for (let i = 0; i < 16; i++) {
    const item = state.boxItems.find(it => it.cellIndex === i);
    if (!item) emptyCellIndices.push(i);
  }
  
  const addItemsToCells = [];
  s.toAdd.forEach(m => {
    const idx = emptyCellIndices.shift();
    if (idx !== undefined) {
      addItemsToCells.push({ material: m, cellIndex: idx });
    }
  });
  
  cells.forEach(cell => {
    const index = parseInt(cell.dataset.index);
    
    const item = state.boxItems.find(it => it.cellIndex === index);
    
    if (item && removeIds.has(item.id) && !state.appliedRemoves.has(item.id)) {
      cell.classList.add('suggest-remove');
      const badge = document.createElement('span');
      badge.className = 'suggest-remove-badge';
      badge.textContent = '删';
      cell.appendChild(badge);
    }
    
    const addItem = addItemsToCells.find(a => a.cellIndex === index);
    if (addItem && !state.appliedAdds.has(addItem.material.id)) {
      cell.classList.add('suggest-add');
      cell.classList.add('filled');
      cell.innerHTML = `
        <div class="cell-item">
          <span class="cell-emoji">${addItem.material.emoji}</span>
          <span class="cell-name">${addItem.material.name}</span>
        </div>
        <span class="suggest-add-badge">+</span>
      `;
    }
  });
  
  state.suggestion._addMapping = addItemsToCells;
}

function clearSuggestionOverlay() {
  const cells = document.querySelectorAll('.grid-cell');
  cells.forEach(cell => {
    cell.classList.remove('suggest-add', 'suggest-remove');
    const addBadge = cell.querySelector('.suggest-add-badge');
    if (addBadge && !cell.classList.contains('filled')) {
      cell.classList.remove('filled');
      cell.innerHTML = '';
    } else if (addBadge) {
      addBadge.remove();
    }
    const removeBadge = cell.querySelector('.suggest-remove-badge');
    if (removeBadge) removeBadge.remove();
  });
  
  renderBox();
}

function handleSingleSuggestionClick(materialId, action) {
  if (action === 'add') {
    if (state.appliedAdds.has(materialId)) return;
    applySingleAdd(materialId);
  } else {
    if (state.appliedRemoves.has(materialId)) return;
    applySingleRemove(materialId);
  }
}

function applySingleAdd(materialId) {
  const material = getMaterialById(materialId);
  if (!material) return;
  
  let targetIndex = -1;
  for (let i = 0; i < 16; i++) {
    const item = state.boxItems.find(it => it.cellIndex === i);
    if (!item) {
      targetIndex = i;
      break;
    }
  }
  
  if (targetIndex === -1) {
    showModal('提示', '<p>礼盒已满，无法添加更多素材</p>');
    return;
  }
  
  saveHistory();
  
  state.boxItems.push({
    ...material,
    cellIndex: targetIndex,
    quantity: 1
  });
  
  state.appliedAdds.add(materialId);
  
  renderBox();
  renderSuggestionOverlay();
  updateConstraints();
  updateButtons();
  
  updateSuggestionItemState(materialId, 'add');
  checkAllApplied();
}

function applySingleRemove(materialId) {
  const itemIndex = state.boxItems.findIndex(item => item.id === materialId);
  if (itemIndex === -1) return;
  
  saveHistory();
  
  state.boxItems.splice(itemIndex, 1);
  
  state.appliedRemoves.add(materialId);
  
  renderBox();
  renderSuggestionOverlay();
  updateConstraints();
  updateButtons();
  
  updateSuggestionItemState(materialId, 'remove');
  checkAllApplied();
}

function updateSuggestionItemState(materialId, action) {
  const el = document.querySelector(`.assist-item[data-material-id="${materialId}"][data-action="${action}"]`);
  if (el) {
    el.classList.add('applied');
    const btn = el.querySelector('.apply-btn');
    if (btn) {
      btn.textContent = '已应用';
    }
  }
}

function checkAllApplied() {
  if (!state.suggestion || !state.suggestion.feasible) return;
  
  const allAddsApplied = state.suggestion.toAdd.every(m => state.appliedAdds.has(m.id));
  const allRemovesApplied = state.suggestion.toRemove.every(m => state.appliedRemoves.has(m.id));
  
  if (allAddsApplied && allRemovesApplied) {
    state.suggestion = null;
    state.appliedAdds.clear();
    state.appliedRemoves.clear();
    closeAssistPanel();
    
    const assembly = {
      items: state.boxItems.map(item => ({ id: item.id, quantity: item.quantity }))
    };
    
    fetch(`${API_BASE}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ levelId: state.currentLevel.id, assembly })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        displayValidationResult(data.data);
      }
    })
    .catch(e => console.error(e));
  }
}

function applyAllSuggestions() {
  if (!state.suggestion || !state.suggestion.feasible) return;
  
  saveHistory();
  
  const s = state.suggestion;
  const currentIds = new Set(state.boxItems.map(item => item.id));
  
  state.boxItems = state.boxItems.filter(item => {
    return !s.toRemove.some(r => r.id === item.id);
  });
  
  const occupiedIndices = new Set(state.boxItems.map(item => item.cellIndex));
  let emptyIndices = [];
  for (let i = 0; i < 16; i++) {
    if (!occupiedIndices.has(i)) continue;
    emptyIndices.push(i);
  }
  
  emptyIndices = [];
  for (let i = 0; i < 16; i++) {
    const item = state.boxItems.find(it => it.cellIndex === i);
    if (!item) emptyIndices.push(i);
  }
  
  s.toAdd.forEach(m => {
    if (emptyIndices.length > 0) {
      const idx = emptyIndices.shift();
      const material = getMaterialById(m.id);
      if (material) {
        state.boxItems.push({
          ...material,
          cellIndex: idx,
          quantity: 1
        });
      }
    }
  });
  
  state.suggestion = null;
  state.appliedAdds.clear();
  state.appliedRemoves.clear();
  
  closeAssistPanel();
  
  const assembly = {
    items: state.boxItems.map(item => ({ id: item.id, quantity: item.quantity }))
  };
  
  fetch(`${API_BASE}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ levelId: state.currentLevel.id, assembly })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      displayValidationResult(data.data);
      updatePremiumStatus();
    }
  })
  .catch(e => console.error(e));
  
  renderBox();
  updateConstraints();
  updateButtons();
}

function cancelSuggestion() {
  state.suggestion = null;
  state.appliedAdds.clear();
  state.appliedRemoves.clear();
  closeAssistPanel();
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

document.addEventListener('DOMContentLoaded', init);
