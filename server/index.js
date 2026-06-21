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
      totalPrice: { min: 100, max: 300 },
      required: ['apple', 'mooncake']
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
      totalPrice: { min: 200, max: 500 },
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
      totalPrice: { min: 150, max: 400 },
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

app.listen(PORT, () => {
  console.log(`🎁 礼盒搭配校验服务已启动: http://localhost:${PORT}`);
  console.log(`   校验服务端口: 9878`);
  console.log(`   网格礼盒画布: 3874`);
});
