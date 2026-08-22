export function comboCartId(combo = {}) {
  const identity = (combo.items || [])
    .flatMap((item) => Array.from({ length: Math.max(1, Number(item.quantity || 1)) }, () => String(item.productId || item.id)))
    .sort()
    .join('-');
  return `${String(combo.comboType || 'combo').toLowerCase()}-${identity}`;
}

export function checkoutCartItems(items = []) {
  return items.flatMap((item) => {
    if (item.type !== 'combo') return [{ productId: item.id, quantity: item.quantity }];
    return Array.from({ length: Math.max(1, Number(item.quantity || 1)) }, (_, index) => ({
      type: 'combo', comboType: item.comboType, comboId: `${item.id}-${index + 1}`,
      items: item.items.map((selection) => ({ productId: selection.productId || selection.id, quantity: selection.quantity })),
    }));
  });
}
