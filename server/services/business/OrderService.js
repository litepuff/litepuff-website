import { BaseBusinessService } from './BaseBusinessService.js';
import { SHEET_NAMES } from '../../config/sheets.js';
import { validateOrder } from '../../validation/domainValidation.js';
const STATUSES = new Set(['Pending', 'Confirmed', 'Packed', 'Ready for Dispatch', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Returned', 'Refunded']);
export class OrderService extends BaseBusinessService { constructor(dependencies = {}) { super({ sheet: SHEET_NAMES.ORDERS, primaryKey: 'OrderID', validator: validateOrder, ...dependencies }); } async updateStatus(id, status) { if (!STATUSES.has(status)) throw new Error('Invalid order status.'); return this.update(id, { OrderStatus: status, UpdatedAt: new Date().toISOString() }); } }
export const orderBusinessService = new OrderService();
