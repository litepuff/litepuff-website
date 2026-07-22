import test from 'node:test';
import assert from 'node:assert/strict';
import { ProductService } from '../services/business/ProductService.js';
import { InventoryService } from '../services/business/InventoryService.js';
import { OrderService } from '../services/business/OrderService.js';
import { CouponService } from '../services/business/CouponService.js';
import { CustomerService } from '../services/business/CustomerService.js';
import { BlogService } from '../services/business/BlogService.js';

class MemorySheets {
  constructor(seed = {}) { this.data = structuredClone(seed); }
  async readRows(sheet, options = {}) { let rows = [...(this.data[sheet] || [])]; if (options.filter) rows = rows.filter(options.filter); return { rows, pagination: { page: 1, limit: rows.length, total: rows.length, pages: 1 } }; }
  async readOne(sheet, predicate) { return (this.data[sheet] || []).find(predicate) || null; }
  async append(sheet, record) { (this.data[sheet] ||= []).push({ _row: (this.data[sheet]?.length || 0) + 2, ...record }); return record; }
  async update(sheet, rowNumber, record) { const index = this.data[sheet].findIndex((row) => row._row === rowNumber); this.data[sheet][index] = { ...record, _row: rowNumber }; return this.data[sheet][index]; }
  async delete(sheet, rowNumber) { this.data[sheet] = this.data[sheet].filter((row) => row._row !== rowNumber); }
}

test('ProductService performs CRUD and rejects negative price', async () => { const sheets = new MemorySheets({ PRODUCTS: [], PRODUCT_IMAGES: [] }); const service = new ProductService({ sheets }); await service.create({ ProductID: 'p1', Name: 'Classic', Slug: 'classic', Category: 'Makhana', Price: 99, Stock: 2 }); assert.equal((await service.get('p1')).Name, 'Classic'); await service.update('p1', { Price: 109 }); assert.equal((await service.get('p1')).Price, 109); await assert.rejects(() => service.update('p1', { Price: -1 })); await service.delete('p1'); assert.equal(await service.get('p1'), null); });
test('InventoryService reads, updates, and rejects negative stock', async () => { const sheets = new MemorySheets({ INVENTORY: [{ _row: 2, InventoryID: 'i1', ProductID: 'p1', Stock: 4 }] }); const service = new InventoryService({ sheets }); assert.equal((await service.get('i1')).Stock, 4); await service.setStock('p1', 8); assert.equal((await service.get('i1')).Stock, 8); await assert.rejects(() => service.setStock('p1', -2)); });
test('OrderService creates and updates valid statuses', async () => { const sheets = new MemorySheets({ ORDERS: [] }); const service = new OrderService({ sheets }); await service.create({ OrderID: 'o1', CustomerID: 'c1', GrandTotal: 200 }); await service.updateStatus('o1', 'Packed'); assert.equal((await service.get('o1')).OrderStatus, 'Packed'); await assert.rejects(() => service.updateStatus('o1', 'Unknown')); });
test('CouponService validates active and expired coupons', async () => { const sheets = new MemorySheets({ COUPONS: [{ _row: 2, CouponID: 'c1', Code: 'SAVE10', Value: 10, MinOrder: 100, Status: 'active', Expiry: '2099-01-01' }, { _row: 3, CouponID: 'c2', Code: 'OLD', Value: 10, Status: 'active', Expiry: '2020-01-01' }] }); const service = new CouponService({ sheets }); assert.equal((await service.validate('save10', 200)).CouponID, 'c1'); await assert.rejects(() => service.validate('OLD', 200)); });
test('CustomerService creates, reads, and updates customers', async () => { const sheets = new MemorySheets({ CUSTOMERS: [] }); const service = new CustomerService({ sheets }); await service.create({ CustomerID: 'c1', Email: 'hello@litepuff.in', Phone: '+919876543210' }); assert.equal((await service.findByEmail('HELLO@LITEPUFF.IN')).CustomerID, 'c1'); await service.update('c1', { FirstName: 'Aditi' }); assert.equal((await service.get('c1')).FirstName, 'Aditi'); });
test('BlogService performs CRUD', async () => { const sheets = new MemorySheets({ BLOGS: [] }); const service = new BlogService({ sheets }); await service.create({ BlogID: 'b1', Title: 'Story', Slug: 'story' }); assert.equal((await service.findBySlug('story')).BlogID, 'b1'); await service.update('b1', { Title: 'New Story' }); assert.equal((await service.get('b1')).Title, 'New Story'); await service.delete('b1'); assert.equal(await service.get('b1'), null); });
