const warnedProducts = new Set();

export function getMetaCatalogId(product = {}) {
  const metaCatalogId = String(product.metaCatalogId ?? product.MetaCatalogID ?? '').trim();
  if (metaCatalogId) return metaCatalogId;

  const internalId = String(product.productId ?? product.ProductID ?? product.id ?? product.slug ?? 'unknown').trim();
  if (!warnedProducts.has(internalId)) {
    warnedProducts.add(internalId);
    console.warn(`[Meta] Missing MetaCatalogID for product ${internalId}; catalogue product identity was omitted.`);
  }
  return '';
}

export function getMetaCatalogIds(products = []) {
  return products.flatMap((product) => product.type === 'combo'
    ? (product.items || []).map(getMetaCatalogId)
    : [getMetaCatalogId(product)]).filter(Boolean);
}

export function getMetaContents(products = []) {
  return products.flatMap((product) => product.type === 'combo' ? product.items || [] : [product]).flatMap((product) => {
    const id = getMetaCatalogId(product);
    if (!id) return [];
    return [{
      id,
      quantity: Math.max(1, Number(product.quantity) || 1),
      item_price: Number(product.price),
    }];
  });
}
