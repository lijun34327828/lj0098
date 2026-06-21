const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 9878;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const materials = {
  fruits: [
    { id: 'apple', name: '苹果', category: 'fruits', weight: 150, price: 8, emoji: '🍎' },
    { id: 'orange', name: '橙子', category: 'fruits', weight: 180, price: 6, emoji: '🍊' },
    { id: 'grape', name: '葡萄', category: 'fruits', weight: 200, price: 15, emoji: '🍇' },
    { id: 'strawberry', name: '草莓', category: 'fruits', weight: 100, price: 20, emoji: '🍓' },
    { id: 'watermelon', name: '西瓜', category: 'fruits', weight: 3000, price: 35, emoji: '🍉' },
    { id: 'peach', name: '桃子', category: 'fruits', weight: 200, price: 12, emoji: '🍑' },
  ],
  meat: [
    { id: 'beef', name: '牛肉', category: 'meat', weight: 500, price: 68, emoji: '🥩' },
    { id: 'pork', name: '猪肉', category: 'meat', weight: 500, price: 28, emoji: '🥓' },
    { id: 'chicken', name: '鸡肉', category: 'meat', weight: 400, price: 22, emoji: '🍗' },
    { id: 'fish', name: '鱼', category: 'meat', weight: 800, price: 45, emoji: '🐟' },
    { id: 'shrimp', name: '虾', category: 'meat', weight: 300, price: 58, emoji: '🦐' },
  ],
  dried: [
    { id: 'mushroom', name: '香菇', category: 'dried', weight: 50, price: 25, emoji: '🍄' },
    { id: '木耳', name: '木耳', category: 'dried', weight: 30, price: 18, emoji: '🌿' },
    { id: 'date', name: '红枣', category: 'dried', weight: 80, price: 15, emoji: '🫒' },
    { id: 'walnut', name: '核桃', category: 'dried', weight: 100, price: 30, emoji: '🥜' },
    { id: 'longan', name: '桂圆', category: 'dried', weight: 60, price: 22, emoji: '🧿' },
  ]
};

const levels = [
  {
    id: 1,
    name: '中秋佳节',
    scene: '中秋送礼',
    description: '中秋佳节走亲访友，送一份心意满满的生鲜礼盒',
    bgColor: '#FFF5E6',
    boxStyle: 'mid-autumn',
    constraints: {
      fruits: { min: 2, max: 4 },
      meat: { min: 1, max: 3 },
      dried: { min: 1, max: 2 },
      totalWeight: { max: 2500 },
      totalPrice: { min: 100, max: 300 }
    },
    required: ['apple', 'mushroom'],
    premiumUnlockLimit: 3
  },
  {
    id: 2,
    name: '春节拜年',
    scene: '新春贺礼',
    description: '春节拜年必备，红红火火过大年',
    bgColor: '#FFE6E6',
    boxStyle: 'spring-festival',
    constraints: {
      fruits: { min: 3, max: 5 },
      meat: { min: 2, max: 4 },
      dried: { min: 2, max: 4 },
      totalWeight: { max: 4000 },
      totalPrice: { min: 200, max: 500 }
    },
    required: ['orange', 'date', 'beef'],
    premiumUnlockLimit: 2
  },
  {
    id: 3,
    name: '端午安康',
    scene: '端午礼盒',
    description: '端午佳节，粽香情浓',
    bgColor: '#E6FFE6',
    boxStyle: 'dragon-boat',
    constraints: {
      fruits: { min: 1, max: 3 },
      meat: { min: 2, max: 3 },
      dried: { min: 2, max: 3 },
      totalWeight: { max: 3000 },
      totalPrice: { min: 150, max: 400 }
    },
    required: ['pork', 'date', 'walnut'],
    premiumUnlockLimit: 4
  }
];

let premiumUnlockCounts = {};
levels.forEach(level => {
  premiumUnlockCounts[level.id] = 0;
});

function getMaterialById(id) {
  const allMaterials = [...materials.fruits, ...materials.meat, ...materials.dried];
  return allMaterials.find(m => m.id === id);
}

function validateAssembly(levelId, assembly) {
  const level = levels.find(l => l.id === levelId);
  if (!level) {
    return { valid: false, errors: [{ type: 'level', message: '关卡不存在' }] };
  }

  const errors = [];
  const items = assembly.items || [];

  const categoryCounts = { fruits: 0, meat: 0, dried: 0 };
  let totalWeight = 0;
  let totalPrice = 0;
  const itemIds = new Set();

  items.forEach(item => {
    const material = getMaterialById(item.id);
    if (material) {
      categoryCounts[material.category]++;
      totalWeight += material.weight * (item.quantity || 1);
      totalPrice += material.price * (item.quantity || 1);
      itemIds.add(material.id);
    }
  });

  if (categoryCounts.fruits < level.constraints.fruits.min) {
    errors.push({
      type: 'quantity',
      category: 'fruits',
      message: `果蔬数量不足，至少需要${level.constraints.fruits.min}种`
    });
  }
  if (categoryCounts.fruits > level.constraints.fruits.max) {
    errors.push({
      type: 'quantity',
      category: 'fruits',
      message: `果蔬数量超出上限，最多${level.constraints.fruits.max}种`
    });
  }

  if (categoryCounts.meat < level.constraints.meat.min) {
    errors.push({
      type: 'quantity',
      category: 'meat',
      message: `鲜肉数量不足，至少需要${level.constraints.meat.min}种`
    });
  }
  if (categoryCounts.meat > level.constraints.meat.max) {
    errors.push({
      type: 'quantity',
      category: 'meat',
      message: `鲜肉数量超出上限，最多${level.constraints.meat.max}种`
    });
  }

  if (categoryCounts.dried < level.constraints.dried.min) {
    errors.push({
      type: 'quantity',
      category: 'dried',
      message: `干货数量不足，至少需要${level.constraints.dried.min}种`
    });
  }
  if (categoryCounts.dried > level.constraints.dried.max) {
    errors.push({
      type: 'quantity',
      category: 'dried',
      message: `干货数量超出上限，最多${level.constraints.dried.max}种`
    });
  }

  if (totalWeight > level.constraints.totalWeight.max) {
    errors.push({
      type: 'weight',
      message: `礼盒超重！当前${totalWeight}g，上限${level.constraints.totalWeight.max}g`
    });
  }

  if (totalPrice < level.constraints.totalPrice.min) {
    errors.push({
      type: 'price',
      message: `礼盒总价过低，当前¥${totalPrice}，最低¥${level.constraints.totalPrice.min}`
    });
  }
  if (totalPrice > level.constraints.totalPrice.max) {
    errors.push({
      type: 'price',
      message: `礼盒总价过高，当前¥${totalPrice}，最高¥${level.constraints.totalPrice.max}`
    });
  }

  const requiredMissing = level.required.filter(id => !itemIds.has(id));
  if (requiredMissing.length > 0) {
    const missingNames = requiredMissing.map(id => {
      const m = getMaterialById(id);
      return m ? m.name : id;
    }).join('、');
    errors.push({
      type: 'required',
      message: `缺少必备食材：${missingNames}`
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    summary: {
      categoryCounts,
      totalWeight,
      totalPrice
    }
  };
}

app.get('/api/materials', (req, res) => {
  res.json({ success: true, data: materials });
});

app.get('/api/levels', (req, res) => {
  res.json({ success: true, data: levels });
});

app.get('/api/levels/:id', (req, res) => {
  const level = levels.find(l => l.id === parseInt(req.params.id));
  if (!level) {
    return res.status(404).json({ success: false, message: '关卡不存在' });
  }
  res.json({ 
    success: true, 
    data: {
      ...level,
      premiumUnlocked: premiumUnlockCounts[level.id] < level.premiumUnlockLimit,
      premiumUnlockCount: premiumUnlockCounts[level.id]
    }
  });
});

app.post('/api/validate', (req, res) => {
  const { levelId, assembly } = req.body;
  const result = validateAssembly(levelId, assembly);
  res.json({ success: true, data: result });
});

app.post('/api/unlock-premium', (req, res) => {
  const { levelId, assembly } = req.body;
  
  const validationResult = validateAssembly(levelId, assembly);
  if (!validationResult.valid) {
    return res.json({ 
      success: false, 
      message: '请先通过所有校验',
      errors: validationResult.errors 
    });
  }

  const level = levels.find(l => l.id === levelId);
  if (!level) {
    return res.status(404).json({ success: false, message: '关卡不存在' });
  }

  if (premiumUnlockCounts[levelId] >= level.premiumUnlockLimit) {
    return res.json({ 
      success: false, 
      message: `本关高端包装解锁次数已用完（${level.premiumUnlockLimit}次）` 
    });
  }

  premiumUnlockCounts[levelId]++;
  
  res.json({
    success: true,
    data: {
      unlocked: true,
      remaining: level.premiumUnlockLimit - premiumUnlockCounts[levelId],
      total: level.premiumUnlockLimit
    }
  });
});

app.get('/api/premium-status/:levelId', (req, res) => {
  const levelId = parseInt(req.params.levelId);
  const level = levels.find(l => l.id === levelId);
  if (!level) {
    return res.status(404).json({ success: false, message: '关卡不存在' });
  }
  
  res.json({
    success: true,
    data: {
      unlocked: premiumUnlockCounts[levelId] < level.premiumUnlockLimit,
      used: premiumUnlockCounts[levelId],
      total: level.premiumUnlockLimit,
      remaining: level.premiumUnlockLimit - premiumUnlockCounts[levelId]
    }
  });
});

function getAllMaterials() {
  return [...materials.fruits, ...materials.meat, ...materials.dried];
}

function checkLevelFeasibility(level) {
  const allMats = getAllMaterials();
  const matMap = new Map(allMats.map(m => [m.id, m]));

  const requiredMats = (level.required || []).map(id => matMap.get(id)).filter(Boolean);
  const requiredSet = new Set(level.required || []);

  const categoryRanges = {
    fruits: level.constraints.fruits,
    meat: level.constraints.meat,
    dried: level.constraints.dried
  };

  let baseWeight = 0, basePrice = 0;
  const reqCategoryCount = { fruits: 0, meat: 0, dried: 0 };

  for (const m of requiredMats) {
    baseWeight += m.weight;
    basePrice += m.price;
    reqCategoryCount[m.category]++;
  }

  for (const cat of ['fruits', 'meat', 'dried']) {
    if (reqCategoryCount[cat] > categoryRanges[cat].max) {
      return { feasible: false, reason: `必备食材中${catName(cat)}有${reqCategoryCount[cat]}种，超出上限${categoryRanges[cat].max}` };
    }
    if (reqCategoryCount[cat] > categoryRanges[cat].min) {
      categoryRanges[cat].effectiveMin = 0;
    } else {
      categoryRanges[cat].effectiveMin = categoryRanges[cat].min - reqCategoryCount[cat];
    }
    categoryRanges[cat].effectiveMax = categoryRanges[cat].max - reqCategoryCount[cat];
  }

  const nonRequired = allMats.filter(m => !requiredSet.has(m.id));
  const byCategory = {
    fruits: nonRequired.filter(m => m.category === 'fruits').sort((a, b) => a.price - b.price),
    meat: nonRequired.filter(m => m.category === 'meat').sort((a, b) => a.price - b.price),
    dried: nonRequired.filter(m => m.category === 'dried').sort((a, b) => a.price - b.price)
  };

  for (const cat of ['fruits', 'meat', 'dried']) {
    if (byCategory[cat].length < categoryRanges[cat].effectiveMin) {
      return { feasible: false, reason: `${catName(cat)}非必备素材只有${byCategory[cat].length}种，至少需要${categoryRanges[cat].effectiveMin}种` };
    }
  }

  const weightMax = level.constraints.totalWeight.max;
  const priceMin = level.constraints.totalPrice.min;
  const priceMax = level.constraints.totalPrice.max;

  const remainWeightMax = weightMax - baseWeight;
  if (remainWeightMax < 0) {
    return { feasible: false, reason: `必备食材总重${baseWeight}g已超重，上限${weightMax}g` };
  }

  const remainPriceMin = Math.max(0, priceMin - basePrice);
  const remainPriceMax = priceMax - basePrice;
  if (remainPriceMax < 0) {
    return { feasible: false, reason: `必备食材总价¥${basePrice}已超上限，上限¥${priceMax}` };
  }

  const candidates = [];
  for (const cat of ['fruits', 'meat', 'dried']) {
    for (const m of byCategory[cat]) {
      candidates.push({ ...m, cat });
    }
  }

  function findCombination(idx, picked, catCount, weight, price, minToPick) {
    if (picked.length > 16) return null;

    let totalCats = { fruits: 0, meat: 0, dried: 0 };
    for (const p of picked) totalCats[p.cat]++;

    let valid = true;
    for (const cat of ['fruits', 'meat', 'dried']) {
      if (totalCats[cat] > categoryRanges[cat].effectiveMax) valid = false;
      if (totalCats[cat] + countRemaining(candidates.slice(idx), cat) < categoryRanges[cat].effectiveMin) valid = false;
    }
    if (!valid) return null;

    if (weight > remainWeightMax) return null;
    if (price > remainPriceMax) return null;

    const allMinMet = ['fruits', 'meat', 'dried'].every(cat => totalCats[cat] >= categoryRanges[cat].effectiveMin);
    const priceMet = price >= remainPriceMin;

    if (allMinMet && priceMet && picked.length >= minToPick) {
      return picked.slice();
    }

    if (idx >= candidates.length) return null;

    const maxPossibleWeight = weight + candidates.slice(idx).reduce((s, c) => s + c.weight, 0);
    const maxPossiblePrice = price + candidates.slice(idx).reduce((s, c) => s + c.price, 0);
    if (maxPossibleWeight < remainWeightMax && maxPossiblePrice < remainPriceMin) return null;

    const cur = candidates[idx];
    const take = findCombination(idx + 1, [...picked, cur], catCount, weight + cur.weight, price + cur.price, minToPick);
    if (take) return take;

    const skip = findCombination(idx + 1, picked, catCount, weight, price, minToPick);
    if (skip) return skip;

    return null;
  }

  const result = findCombination(0, [], { fruits: 0, meat: 0, dried: 0 }, 0, 0, 0);

  if (!result) {
    return { feasible: false, reason: '在品类、重量、价格、必备食材的多重约束下，找不到任何合法组合' };
  }

  return { feasible: true, witness: result };
}

function catName(cat) {
  return { fruits: '果蔬', meat: '鲜肉', dried: '干货' }[cat] || cat;
}

function countRemaining(list, cat) {
  let n = 0;
  for (const m of list) if (m.cat === cat) n++;
  return n;
}

function runLevelSelfCheck() {
  const allMats = getAllMaterials();
  const validIds = new Set(allMats.map(m => m.id));
  const errors = [];
  const warnings = [];
  const levelMap = new Map();

  for (const level of levels) {
    const prefix = `【第${level.id}关·${level.name}】`;

    if (levelMap.has(level.id)) {
      errors.push(`${prefix}关卡ID重复，与其他关卡冲突`);
    }
    levelMap.set(level.id, level);

    if (level.constraints && 'required' in level.constraints) {
      warnings.push(`${prefix}constraints 内部残留了 required 字段，真正生效的是顶层 required，建议删除`);
    }
    if (level.constraints && level.constraints.required && Array.isArray(level.constraints.required)) {
      if (Array.isArray(level.required) && JSON.stringify([...level.constraints.required].sort()) !== JSON.stringify([...level.required].sort())) {
        errors.push(`${prefix}存在两份互相冲突的必备清单：constraints.required=[${level.constraints.required.join(',')}] vs 顶层 required=[${level.required.join(',')}]，请统一`);
      }
    }

    const req = level.required || [];
    const reqSeen = new Set();
    for (const id of req) {
      if (reqSeen.has(id)) {
        warnings.push(`${prefix}必备食材「${id}」重复定义`);
      }
      reqSeen.add(id);
      if (!validIds.has(id)) {
        errors.push(`${prefix}必备食材引用了素材库中不存在的 id：${id}`);
      }
    }

    const c = level.constraints;
    if (!c) {
      errors.push(`${prefix}缺少 constraints 约束定义`);
      continue;
    }
    for (const cat of ['fruits', 'meat', 'dried']) {
      if (!c[cat] || typeof c[cat].min !== 'number' || typeof c[cat].max !== 'number') {
        errors.push(`${prefix}${catName(cat)}品类区间定义缺失或格式错误`);
        continue;
      }
      if (c[cat].min < 0 || c[cat].max < 0) {
        errors.push(`${prefix}${catName(cat)}品类区间含负数（min=${c[cat].min}, max=${c[cat].max}）`);
      }
      if (c[cat].min > c[cat].max) {
        errors.push(`${prefix}${catName(cat)}品类区间下限${c[cat].min}大于上限${c[cat].max}`);
      }
      if (c[cat].max > 16) {
        warnings.push(`${prefix}${catName(cat)}品类上限${c[cat].max}超过礼盒网格总容量16`);
      }
    }
    if (!c.totalWeight || typeof c.totalWeight.max !== 'number') {
      errors.push(`${prefix}总重量上限定义缺失`);
    } else if (c.totalWeight.max <= 0) {
      errors.push(`${prefix}总重量上限${c.totalWeight.max}必须为正数`);
    }
    if (!c.totalPrice || typeof c.totalPrice.min !== 'number' || typeof c.totalPrice.max !== 'number') {
      errors.push(`${prefix}总价区间定义缺失或格式错误`);
    } else {
      if (c.totalPrice.min < 0 || c.totalPrice.max < 0) {
        errors.push(`${prefix}总价区间含负数（min=${c.totalPrice.min}, max=${c.totalPrice.max}）`);
      }
      if (c.totalPrice.min > c.totalPrice.max) {
        errors.push(`${prefix}总价区间下限¥${c.totalPrice.min}大于上限¥${c.totalPrice.max}`);
      }
    }

    if (typeof level.premiumUnlockLimit !== 'number' || level.premiumUnlockLimit < 0) {
      warnings.push(`${prefix}premiumUnlockLimit 定义异常（${level.premiumUnlockLimit}）`);
    }
  }

  if (levels.length === 0) {
    errors.push('没有定义任何关卡');
  }

  for (const level of levels) {
    const prefix = `【第${level.id}关·${level.name}】`;
    if (!level.constraints) continue;
    const feas = checkLevelFeasibility(level);
    if (!feas.feasible) {
      errors.push(`${prefix}可行性校验失败：${feas.reason}`);
    } else {
      const witNames = feas.witness.map(m => m.name).join('、');
      console.log(`  ✅ ${prefix} 存在合法解，例如：必备食材 + [${witNames || '（无需额外素材）'}]`);
    }
  }

  return { errors, warnings };
}

console.log('═══════════════════════════════════════════');
console.log('🔍 启动前关卡自检进行中...');
console.log('───────────────────────────────────────────');
const selfCheck = runLevelSelfCheck();
console.log('───────────────────────────────────────────');

if (selfCheck.warnings.length > 0) {
  console.log('⚠️  自检发现以下警告：');
  selfCheck.warnings.forEach(w => console.log(`   - ${w}`));
}

if (selfCheck.errors.length > 0) {
  console.error('❌ 自检发现以下致命错误，启动被阻止：');
  selfCheck.errors.forEach(e => console.error(`   ❗ ${e}`));
  console.error('═══════════════════════════════════════════');
  console.error('💥 服务启动失败：请修复上述关卡配置问题后重试。');
  process.exit(1);
}

if (selfCheck.warnings.length === 0) {
  console.log('✅ 关卡数据自检全部通过，未发现问题。');
} else {
  console.log('✅ 关卡自检致命错误已清除，仅存警告，继续启动。');
}
console.log('═══════════════════════════════════════════');

function computeAssemblyStats(items) {
  const categoryCounts = { fruits: 0, meat: 0, dried: 0 };
  let totalWeight = 0;
  let totalPrice = 0;
  const ids = new Set();

  items.forEach(item => {
    const mat = getMaterialById(item.id);
    if (mat) {
      categoryCounts[mat.category]++;
      totalWeight += mat.weight * (item.quantity || 1);
      totalPrice += mat.price * (item.quantity || 1);
      ids.add(mat.id);
    }
  });

  return { categoryCounts, totalWeight, totalPrice, ids };
}

function buildItemsFromIds(idList) {
  return idList.map(id => {
    const m = getMaterialById(id);
    return { id, name: m ? m.name : id, price: m ? m.price : 0, weight: m ? m.weight : 0 };
  });
}

function solveSuggestion(levelId, currentItems, strategy) {
  const level = levels.find(l => l.id === levelId);
  if (!level) {
    return { feasible: false, reason: '关卡不存在', stuckAt: 'level' };
  }

  const currentIds = currentItems.map(it => it.id);
  const currentIdSet = new Set(currentIds);
  const allMats = getAllMaterials();
  const matMap = new Map(allMats.map(m => [m.id, m]));

  const requiredIds = level.required || [];
  const requiredSet = new Set(requiredIds);

  const missingRequired = requiredIds.filter(id => !currentIdSet.has(id));
  const extraNonRequiredCount = currentIds.filter(id => !requiredSet.has(id)).length;

  const cons = level.constraints;
  const weightMax = cons.totalWeight.max;
  const priceMin = cons.totalPrice.min;
  const priceMax = cons.totalPrice.max;

  const GRID_CAPACITY = 16;
  const TIME_LIMIT_MS = 3000;
  const startTime = Date.now();
  let timedOut = false;
  let bestSolution = null;
  let bestScore = Infinity;
  let bestPriceDiff = Infinity;
  let statesExplored = 0;

  function checkTimeout() {
    if (Date.now() - startTime > TIME_LIMIT_MS) {
      timedOut = true;
      return true;
    }
    return false;
  }

  function computePriceDiff(price) {
    return Math.abs(price - (priceMin + priceMax) / 2);
  }

  function isBetter(newIds, newPrice) {
    const addCount = newIds.filter(id => !currentIdSet.has(id)).length;
    const removeCount = currentIds.filter(id => !new Set(newIds).has(id)).length;
    const steps = addCount + removeCount;

    if (strategy === 'min-change') {
      if (steps < bestScore) return true;
      if (steps === bestScore) {
        return computePriceDiff(newPrice) < bestPriceDiff;
      }
      return false;
    } else {
      if (newPrice < bestScore) return true;
      if (newPrice === bestScore) {
        return steps < bestPriceDiff;
      }
      return false;
    }
  }

  function updateBest(newIds) {
    const idSet = new Set(newIds);
    const items = newIds.map(id => ({ id, quantity: 1 }));
    const stats = computeAssemblyStats(items);

    if (strategy === 'min-change') {
      const addCount = newIds.filter(id => !currentIdSet.has(id)).length;
      const removeCount = currentIds.filter(id => !idSet.has(id)).length;
      const steps = addCount + removeCount;
      const priceDiff = computePriceDiff(stats.totalPrice);

      if (steps < bestScore || (steps === bestScore && priceDiff < bestPriceDiff)) {
        bestScore = steps;
        bestPriceDiff = priceDiff;
        bestSolution = { ids: newIds.slice(), stats };
        return true;
      }
    } else {
      const addCount = newIds.filter(id => !currentIdSet.has(id)).length;
      const removeCount = currentIds.filter(id => !idSet.has(id)).length;
      const steps = addCount + removeCount;

      if (stats.totalPrice < bestScore || (stats.totalPrice === bestScore && steps < bestPriceDiff)) {
        bestScore = stats.totalPrice;
        bestPriceDiff = steps;
        bestSolution = { ids: newIds.slice(), stats };
        return true;
      }
    }
    return false;
  }

  const nonRequiredMats = allMats.filter(m => !requiredSet.has(m.id));
  const byCategory = {
    fruits: nonRequiredMats.filter(m => m.category === 'fruits'),
    meat: nonRequiredMats.filter(m => m.category === 'meat'),
    dried: nonRequiredMats.filter(m => m.category === 'dried')
  };

  if (strategy === 'min-cost') {
    byCategory.fruits.sort((a, b) => a.price - b.price);
    byCategory.meat.sort((a, b) => a.price - b.price);
    byCategory.dried.sort((a, b) => a.price - b.price);
  } else {
    byCategory.fruits.sort((a, b) => {
      const aIn = currentIdSet.has(a.id) ? 0 : 1;
      const bIn = currentIdSet.has(b.id) ? 0 : 1;
      if (aIn !== bIn) return aIn - bIn;
      return a.price - b.price;
    });
    byCategory.meat.sort((a, b) => {
      const aIn = currentIdSet.has(a.id) ? 0 : 1;
      const bIn = currentIdSet.has(b.id) ? 0 : 1;
      if (aIn !== bIn) return aIn - bIn;
      return a.price - b.price;
    });
    byCategory.dried.sort((a, b) => {
      const aIn = currentIdSet.has(a.id) ? 0 : 1;
      const bIn = currentIdSet.has(b.id) ? 0 : 1;
      if (aIn !== bIn) return aIn - bIn;
      return a.price - b.price;
    });
  }

  const reqCategoryCount = { fruits: 0, meat: 0, dried: 0 };
  let reqWeight = 0;
  let reqPrice = 0;
  for (const id of requiredIds) {
    const m = matMap.get(id);
    if (m) {
      reqCategoryCount[m.category]++;
      reqWeight += m.weight;
      reqPrice += m.price;
    }
  }

  for (const cat of ['fruits', 'meat', 'dried']) {
    if (reqCategoryCount[cat] > cons[cat].max) {
      return { feasible: false, reason: `必备食材中${catName(cat)}有${reqCategoryCount[cat]}种，超出上限${cons[cat].max}`, stuckAt: 'required' };
    }
  }

  if (reqWeight > weightMax) {
    return { feasible: false, reason: `必备食材总重${reqWeight}g已超重，上限${weightMax}g`, stuckAt: 'weight' };
  }
  if (reqPrice > priceMax) {
    return { feasible: false, reason: `必备食材总价¥${reqPrice}已超上限，上限¥${priceMax}`, stuckAt: 'price' };
  }

  const effectiveMin = {
    fruits: Math.max(0, cons.fruits.min - reqCategoryCount.fruits),
    meat: Math.max(0, cons.meat.min - reqCategoryCount.meat),
    dried: Math.max(0, cons.dried.min - reqCategoryCount.dried)
  };
  const effectiveMax = {
    fruits: cons.fruits.max - reqCategoryCount.fruits,
    meat: cons.meat.max - reqCategoryCount.meat,
    dried: cons.dried.max - reqCategoryCount.dried
  };

  for (const cat of ['fruits', 'meat', 'dried']) {
    if (byCategory[cat].length < effectiveMin[cat]) {
      return { feasible: false, reason: `${catName(cat)}非必备素材只有${byCategory[cat].length}种，至少需要${effectiveMin[cat]}种`, stuckAt: 'quantity' };
    }
  }

  const remainWeightMax = weightMax - reqWeight;
  const remainPriceMin = Math.max(0, priceMin - reqPrice);
  const remainPriceMax = priceMax - reqPrice;

  if (remainPriceMax < 0) {
    return { feasible: false, reason: '必备食材总价已超价格上限', stuckAt: 'price' };
  }

  const maxTotalExtra = Math.min(
    GRID_CAPACITY - requiredIds.length,
    effectiveMax.fruits + effectiveMax.meat + effectiveMax.dried
  );

  function getMinPossibleForRemaining(startIdx, catCounts, priceSoFar) {
    let minPrice = 0;
    const remainingNeeded = {
      fruits: Math.max(0, effectiveMin.fruits - catCounts.fruits),
      meat: Math.max(0, effectiveMin.meat - catCounts.meat),
      dried: Math.max(0, effectiveMin.dried - catCounts.dried)
    };

    for (const cat of ['fruits', 'meat', 'dried']) {
      if (remainingNeeded[cat] > 0) {
        const catMats = byCategory[cat].filter((_, i) => {
          const globalIdx = getGlobalIndex(cat, byCategory[cat][i]);
          return globalIdx >= startIdx;
        });
        if (catMats.length < remainingNeeded[cat]) return Infinity;
        for (let i = 0; i < remainingNeeded[cat]; i++) {
          minPrice += catMats[i].price;
        }
      }
    }
    return priceSoFar + minPrice;
  }

  function getGlobalIndex(cat, mat) {
    let idx = 0;
    const order = ['fruits', 'meat', 'dried'];
    for (const c of order) {
      if (c === cat) {
        idx += byCategory[c].indexOf(mat);
        break;
      }
      idx += byCategory[c].length;
    }
    return idx;
  }

  const candidates = [];
  for (const cat of ['fruits', 'meat', 'dried']) {
    for (const m of byCategory[cat]) {
      candidates.push({ ...m, cat });
    }
  }

  function countRemainingCat(fromIdx, cat) {
    let n = 0;
    for (let i = fromIdx; i < candidates.length; i++) {
      if (candidates[i].cat === cat) n++;
    }
    return n;
  }

  function minPriceRemaining(fromIdx, neededByCat) {
    let total = 0;
    for (const cat of ['fruits', 'meat', 'dried']) {
      let need = neededByCat[cat];
      if (need <= 0) continue;
      let found = 0;
      for (let i = fromIdx; i < candidates.length && found < need; i++) {
        if (candidates[i].cat === cat) {
          total += candidates[i].price;
          found++;
        }
      }
      if (found < need) return Infinity;
    }
    return total;
  }

  function dfs(idx, picked, catCounts, weight, price) {
    if (checkTimeout()) return null;
    statesExplored++;

    if (weight > remainWeightMax) return null;
    if (price > remainPriceMax) return null;
    if (picked.length > maxTotalExtra) return null;

    for (const cat of ['fruits', 'meat', 'dried']) {
      if (catCounts[cat] > effectiveMax[cat]) return null;
      const remaining = countRemainingCat(idx, cat);
      if (catCounts[cat] + remaining < effectiveMin[cat]) return null;
    }

    if (strategy === 'min-cost' && bestSolution) {
      const neededByCat = {
        fruits: Math.max(0, effectiveMin.fruits - catCounts.fruits),
        meat: Math.max(0, effectiveMin.meat - catCounts.meat),
        dried: Math.max(0, effectiveMin.dried - catCounts.dried)
      };
      const minRestPrice = minPriceRemaining(idx, neededByCat);
      if (price + minRestPrice >= bestScore) return null;
    }

    if (strategy === 'min-change' && bestSolution) {
      const addsNeeded = picked.filter(m => !currentIdSet.has(m.id)).length;
      const removesWillHappen = Math.max(0, extraNonRequiredCount - picked.length);
      const minSteps = addsNeeded + removesWillHappen;
      if (minSteps > bestScore) return null;
    }

    const allMinMet = ['fruits', 'meat', 'dried'].every(cat => catCounts[cat] >= effectiveMin[cat]);
    const priceMet = price >= remainPriceMin;

    if (allMinMet && priceMet) {
      const newIds = [...requiredIds, ...picked.map(m => m.id)];
      updateBest(newIds);
    }

    if (idx >= candidates.length) return null;

    const cur = candidates[idx];
    const newCatCounts = { ...catCounts, [cur.cat]: catCounts[cur.cat] + 1 };
    const takeIt = dfs(
      idx + 1,
      [...picked, cur],
      newCatCounts,
      weight + cur.weight,
      price + cur.price
    );
    if (takeIt) return takeIt;

    const skipIt = dfs(idx + 1, picked, catCounts, weight, price);
    if (skipIt) return skipIt;

    return null;
  }

  dfs(0, [], { fruits: 0, meat: 0, dried: 0 }, 0, 0);

  if (!bestSolution) {
    return { feasible: false, reason: '在品类、重量、价格、必备食材的多重约束下，找不到任何合法组合', stuckAt: 'combined' };
  }

  const finalIds = bestSolution.ids;
  const finalIdSet = new Set(finalIds);

  const toAdd = finalIds.filter(id => !currentIdSet.has(id));
  const toRemove = currentIds.filter(id => !finalIdSet.has(id));

  const finalItems = finalIds.map(id => ({ id, quantity: 1 }));
  const finalStats = computeAssemblyStats(finalItems);

  const canUnlockPremium = (premiumUnlockCounts[levelId] || 0) < level.premiumUnlockLimit;

  return {
    feasible: true,
    isOptimal: !timedOut,
    toAdd,
    toRemove,
    result: {
      items: buildItemsFromIds(finalIds),
      summary: {
        categoryCounts: finalStats.categoryCounts,
        totalWeight: finalStats.totalWeight,
        totalPrice: finalStats.totalPrice
      }
    },
    canUnlockPremium,
    stats: {
      statesExplored,
      timeMs: Date.now() - startTime
    }
  };
}

app.post('/api/suggest', (req, res) => {
  const { levelId, assembly, strategy = 'min-change' } = req.body;

  if (!levelId) {
    return res.status(400).json({ success: false, message: '缺少关卡ID' });
  }
  if (!assembly || !Array.isArray(assembly.items)) {
    return res.status(400).json({ success: false, message: '缺少合法的礼盒素材清单' });
  }
  if (!['min-change', 'min-cost'].includes(strategy)) {
    return res.status(400).json({ success: false, message: '不支持的策略类型' });
  }

  const currentItems = assembly.items.map(it => ({ id: it.id, quantity: it.quantity || 1 }));

  try {
    const result = solveSuggestion(parseInt(levelId), currentItems, strategy);

    if (!result.feasible) {
      return res.json({
        success: true,
        data: {
          feasible: false,
          reason: result.reason,
          stuckAt: result.stuckAt
        }
      });
    }

    const addMaterials = result.toAdd.map(id => {
      const m = getMaterialById(id);
      return m ? { id: m.id, name: m.name, emoji: m.emoji, category: m.category, weight: m.weight, price: m.price } : { id };
    });
    const removeMaterials = result.toRemove.map(id => {
      const m = getMaterialById(id);
      return m ? { id: m.id, name: m.name, emoji: m.emoji, category: m.category, weight: m.weight, price: m.price } : { id };
    });

    res.json({
      success: true,
      data: {
        feasible: true,
        isOptimal: result.isOptimal,
        strategy,
        toAdd: addMaterials,
        toRemove: removeMaterials,
        result: {
          items: result.result.items.map(it => ({
            id: it.id,
            name: it.name,
            quantity: 1
          })),
          summary: result.result.summary
        },
        canUnlockPremium: result.canUnlockPremium
      }
    });
  } catch (e) {
    console.error('建议计算出错:', e);
    res.status(500).json({ success: false, message: '建议计算过程中发生错误' });
  }
});

app.listen(PORT, () => {
  console.log(`🎁 礼盒搭配校验服务已启动: http://localhost:${PORT}`);
  console.log(`   校验服务端口: 9878`);
  console.log(`   网格礼盒画布: 3874`);
  console.log(`   智能建议接口: /api/suggest`);
});
