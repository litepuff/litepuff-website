import { appendRow, deleteRow, getRows, updateRow } from '../services/googleSheets.js';
import { createId } from '../utils/createId.js';
import { created, ok } from '../utils/apiResponse.js';
import { productPricing } from '../utils/productPricing.js';

function publicCartItem(row, product) {
  const pricing = productPricing();
  return {
    id: row.CartID,
    cartId: row.CartID,
    customerId: row.CustomerID,
    productId: row.ProductID,
    quantity: Number(row.Quantity || 1),
    addedAt: row.AddedAt,
    updatedAt: row.UpdatedAt,
    product: product ? {
      id: product.ProductID,
      name: product.Name,
      slug: product.Slug,
      price: pricing.sellingPrice,
      regularPrice: pricing.mrp,
      oldPrice: pricing.mrp,
      weight: pricing.weight,
      stock: Number(product.Stock || 0),
      image: product.PrimaryImage,
      status: product.Status
    } : null
  };
}

async function customerCart(customerId) {
  const [cartRows, products] = await Promise.all([getRows('CART'), getRows('PRODUCTS')]);
  return cartRows
    .filter((row) => row.CustomerID === customerId)
    .map((row) => publicCartItem(row, products.find((product) => product.ProductID === row.ProductID)));
}

export async function getCart(request, response) {
  const items = await customerCart(request.customer.id);
  ok(response, { cart: items, count: items.reduce((sum, item) => sum + item.quantity, 0) });
}

export async function addCartItem(request, response) {
  const productId = request.body.productId;
  const quantity = Math.max(1, Number(request.body.quantity || 1));
  if (!productId) return response.status(400).json({ success: false, message: 'Product ID is required.' });

  const [cartRows, products] = await Promise.all([getRows('CART'), getRows('PRODUCTS')]);
  const product = products.find((item) => item.ProductID === productId);
  if (!product || String(product.Status).toLowerCase() !== 'active' || Number(product.Stock || 0) < quantity) {
    return response.status(409).json({ success: false, message: 'This product is currently unavailable.' });
  }

  const existing = cartRows.find((row) => row.CustomerID === request.customer.id && row.ProductID === productId);
  const now = new Date().toISOString();
  if (existing) {
    const nextQuantity = Number(existing.Quantity || 0) + quantity;
    if (nextQuantity > Number(product.Stock || 0)) return response.status(409).json({ success: false, message: 'Requested quantity exceeds available stock.' });
    existing.Quantity = nextQuantity;
    existing.UpdatedAt = now;
    await updateRow('CART', existing._row, existing);
    return ok(response, { item: publicCartItem(existing, product) }, 'Cart updated.');
  }

  const row = { CartID: createId('cart'), CustomerID: request.customer.id, ProductID: productId, Quantity: quantity, AddedAt: now, UpdatedAt: now };
  await appendRow('CART', row);
  created(response, { item: publicCartItem(row, product) }, 'Added to cart.');
}

export async function updateCartItem(request, response) {
  const quantity = Number(request.body.quantity);
  const row = (await getRows('CART')).find((item) => item.CartID === request.params.id && item.CustomerID === request.customer.id);
  if (!row) return response.status(404).json({ success: false, message: 'Cart item not found.' });
  if (!Number.isInteger(quantity)) return response.status(422).json({ success: false, message: 'Quantity must be a whole number.' });
  if (quantity <= 0) {
    await deleteRow('CART', row._row);
    return ok(response, {}, 'Cart item removed.');
  }
  const product = (await getRows('PRODUCTS')).find((item) => item.ProductID === row.ProductID && String(item.Status).toLowerCase() === 'active');
  if (!product || quantity > Number(product.Stock || 0)) return response.status(409).json({ success: false, message: 'Requested quantity is unavailable.' });
  row.Quantity = quantity;
  row.UpdatedAt = new Date().toISOString();
  await updateRow('CART', row._row, row);
  ok(response, { item: publicCartItem(row, product) }, 'Cart updated.');
}

export async function removeCartItem(request, response) {
  const row = (await getRows('CART')).find((item) => item.CartID === request.params.id && item.CustomerID === request.customer.id);
  if (!row) return response.status(404).json({ success: false, message: 'Cart item not found.' });
  await deleteRow('CART', row._row);
  ok(response, {}, 'Cart item removed.');
}

export async function clearCart(request, response) {
  const rows = (await getRows('CART')).filter((row) => row.CustomerID === request.customer.id).sort((a, b) => b._row - a._row);
  for (const row of rows) await deleteRow('CART', row._row);
  ok(response, {}, 'Cart cleared.');
}
