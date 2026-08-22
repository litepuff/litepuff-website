export function groupOrderItems(items = []) {
  const grouped = [];
  const combos = new Map();
  for (const item of items) {
    if (item.type !== 'combo' || !item.comboId) {
      grouped.push(item);
      continue;
    }
    let combo = combos.get(item.comboId);
    if (!combo) {
      combo = { ...item, id: item.comboId, productName: '', quantity: 1, total: 0, comboProducts: [] };
      combos.set(item.comboId, combo);
      grouped.push(combo);
    }
    combo.comboProducts.push({ productId: item.productId, productName: item.productName, name: item.productName, quantity: Number(item.quantity || 1) });
    combo.productName = combo.comboProducts.map((product) => `${product.productName} × ${product.quantity}`).join(' · ');
    combo.total += Number(item.total || 0);
  }
  return grouped;
}

export function comboSize(item) {
  return (item.comboProducts || []).reduce((sum, product) => sum + Number(product.quantity || 1), 0);
}
