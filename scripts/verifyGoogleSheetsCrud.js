import { appendRow, batchUpdateRows, deleteRow, findRow, getRows, SHEETS, updateRow } from '../server/services/googleSheets.js';

const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const id = (name) => `qa-${name}-${stamp}`;
const created = [];
const now = new Date().toISOString();

async function create(sheet, record) {
  await appendRow(sheet, record);
  created.push([sheet, SHEETS[sheet][0], record[SHEETS[sheet][0]]]);
  const stored = await findRow(sheet, (row) => row[SHEETS[sheet][0]] === record[SHEETS[sheet][0]]);
  if (!stored) throw new Error(`${sheet} create/read verification failed.`);
  return stored;
}

async function update(sheet, key, value, changes) {
  const row = await findRow(sheet, (item) => item[key] === value);
  await updateRow(sheet, row._row, { ...row, ...changes });
  const stored = await findRow(sheet, (item) => item[key] === value);
  for (const [field, expected] of Object.entries(changes)) {
    if (String(stored[field]) !== String(expected)) throw new Error(`${sheet} update verification failed for ${field}.`);
  }
}

async function cleanup() {
  for (const [sheet, key, value] of created.reverse()) {
    const row = await findRow(sheet, (item) => item[key] === value);
    if (row) await deleteRow(sheet, row._row);
  }
}

async function cleanupStaleQaRows() {
  const order = ['NEWSLETTER', 'CONTACT_MESSAGES', 'REVIEWS', 'FAQ', 'BLOGS', 'BLOG_CATEGORIES', 'COUPONS', 'ORDER_TRACKING', 'PAYMENTS', 'ORDER_ITEMS', 'ORDERS', 'ADDRESSES', 'WISHLIST', 'CART', 'PRODUCT_IMAGES', 'PRODUCTS', 'CUSTOMERS'];
  for (const sheet of order) {
    const primaryKey = SHEETS[sheet][0];
    const rows = (await getRows(sheet)).filter((row) => String(row[primaryKey]).startsWith('qa-')).sort((a, b) => b._row - a._row);
    for (const row of rows) await deleteRow(sheet, row._row);
  }
}

try {
  await cleanupStaleQaRows();
  await create('CUSTOMERS', { CustomerID: id('customer'), FirstName: 'QA', LastName: 'Customer', Email: `qa-${stamp}@example.com`, Phone: '9876543210', PasswordHash: 'qa-only-not-a-login', NewsletterSubscribed: false, GoogleAuth: false, Status: 'active', CreatedAt: now, LastLogin: now });
  await create('PRODUCTS', { ProductID: id('product'), Name: 'QA Product', Slug: id('product-slug'), Category: 'QA', Flavor: 'QA', ShortDescription: 'CRUD verification', Description: 'CRUD verification', Ingredients: '', NutritionPDF: '', Price: 100, DiscountPrice: '', Weight: '100g', Stock: 10, Featured: false, BestSeller: false, Status: 'active', PrimaryImage: '', CreatedAt: now, UpdatedAt: now });
  await create('PRODUCT_IMAGES', { ImageID: id('image'), ProductID: id('product'), ImageURL: '/qa.png', SortOrder: 1 });
  await create('CART', { CartID: id('cart'), CustomerID: id('customer'), ProductID: id('product'), Quantity: 1, AddedAt: now, UpdatedAt: now });
  await create('WISHLIST', { WishlistID: id('wishlist'), CustomerID: id('customer'), ProductID: id('product'), CreatedAt: now });
  await create('ADDRESSES', { AddressID: id('address'), CustomerID: id('customer'), FullName: 'QA Customer', Phone: '9876543210', AddressLine1: 'QA Address', AddressLine2: '', Landmark: '', City: 'Delhi', State: 'Delhi', Pincode: '110001', Country: 'India', AddressType: 'Home', IsDefault: false, CreatedAt: now });
  await create('ORDERS', { OrderID: id('order'), OrderNumber: id('order-number'), CustomerID: id('customer'), AddressID: id('address'), Subtotal: 100, Shipping: 0, Discount: 0, Tax: 0, GrandTotal: 100, CouponCode: '', PaymentMethod: 'QA', PaymentStatus: 'Pending', OrderStatus: 'Pending', TrackingNumber: id('tracking-number'), EstimatedDelivery: '', CreatedAt: now, UpdatedAt: now });
  await create('ORDER_ITEMS', { OrderItemID: id('order-item'), OrderID: id('order'), ProductID: id('product'), ProductName: 'QA Product', Price: 100, Quantity: 1, Total: 100 });
  await create('PAYMENTS', { PaymentID: id('payment'), OrderID: id('order'), CustomerID: id('customer'), RazorpayOrderID: '', RazorpayPaymentID: '', RazorpaySignature: '', PaymentMethod: 'QA', Amount: 100, Currency: 'INR', Status: 'Pending', PaidAt: '', TransactionReference: '', Gateway: 'QA', Remarks: '' });
  await create('ORDER_TRACKING', { TrackingID: id('tracking'), OrderID: id('order'), CurrentStatus: 'Pending', UpdatedBy: 'QA', Remarks: 'CRUD verification', UpdatedAt: now, EstimatedDeliveryDate: '' });
  await create('COUPONS', { CouponID: id('coupon'), Code: id('coupon-code').toUpperCase(), Type: 'percent', Value: 10, MinOrder: 0, MaxDiscount: 100, Expiry: '', UsageLimit: 1, UsedCount: 0, Status: 'active' });
  await create('BLOG_CATEGORIES', { CategoryID: id('blog-category'), Name: 'QA', Slug: id('blog-category-slug') });
  await create('BLOGS', { BlogID: id('blog'), Title: 'QA Blog', Slug: id('blog-slug'), Category: 'QA', Author: 'QA', CoverImage: '', Excerpt: 'QA', Content: 'QA', ReadingTime: '1 min', Tags: 'qa', Featured: false, PublishedDate: now, Status: 'draft' });
  await create('FAQ', { FAQID: id('faq'), Category: 'QA', Question: 'QA?', Answer: 'QA.', SortOrder: 999, Status: 'active' });
  await create('REVIEWS', { ReviewID: id('review'), CustomerID: id('customer'), OrderID: id('order'), ProductID: id('product'), Rating: 5, Title: 'QA', Review: 'CRUD verification', Status: 'pending', CreatedAt: now });
  await create('CONTACT_MESSAGES', { MessageID: id('message'), Name: 'QA', Email: `contact-${stamp}@example.com`, Phone: '9876543210', Subject: 'QA', Message: 'CRUD verification', CreatedAt: now, Status: 'new' });
  await create('NEWSLETTER', { SubscriberID: id('subscriber'), Email: `newsletter-${stamp}@example.com`, SubscribedAt: now, Status: 'active' });

  await update('CUSTOMERS', 'CustomerID', id('customer'), { LastName: 'Updated' });
  await update('CART', 'CartID', id('cart'), { Quantity: 2 });
  await update('WISHLIST', 'WishlistID', id('wishlist'), { CreatedAt: now });
  await update('ADDRESSES', 'AddressID', id('address'), { City: 'New Delhi' });
  await update('ORDERS', 'OrderID', id('order'), { OrderStatus: 'Confirmed' });
  await update('ORDER_ITEMS', 'OrderItemID', id('order-item'), { Quantity: 2, Total: 200 });
  await update('PAYMENTS', 'PaymentID', id('payment'), { Status: 'Processing' });
  await update('ORDER_TRACKING', 'TrackingID', id('tracking'), { CurrentStatus: 'Confirmed' });
  await update('COUPONS', 'CouponID', id('coupon'), { UsedCount: 1 });
  await update('BLOGS', 'BlogID', id('blog'), { Status: 'published' });
  await update('BLOG_CATEGORIES', 'CategoryID', id('blog-category'), { Name: 'QA Updated' });
  await update('FAQ', 'FAQID', id('faq'), { Answer: 'Updated.' });
  await update('REVIEWS', 'ReviewID', id('review'), { Status: 'approved' });
  await update('CONTACT_MESSAGES', 'MessageID', id('message'), { Status: 'read' });
  await update('NEWSLETTER', 'SubscriberID', id('subscriber'), { Status: 'inactive' });
  const product = await findRow('PRODUCTS', (row) => row.ProductID === id('product'));
  await batchUpdateRows('PRODUCTS', [{ rowNumber: product._row, record: { ...product, Stock: 9 } }]);
  if (Number((await findRow('PRODUCTS', (row) => row.ProductID === id('product'))).Stock) !== 9) throw new Error('PRODUCTS batch update verification failed.');
  await update('PRODUCT_IMAGES', 'ImageID', id('image'), { SortOrder: 2 });

  await cleanup();
  for (const [sheet] of created) {
    if ((await getRows(sheet)).some((row) => String(row[SHEETS[sheet][0]]).includes(stamp))) throw new Error(`${sheet} cleanup verification failed.`);
  }
  console.log(`Google Sheets CRUD verification passed for ${Object.keys(SHEETS).length} standardized sheets.`);
} catch (error) {
  await cleanup().catch((cleanupError) => console.error(`Cleanup failed: ${cleanupError.message}`));
  throw error;
}
