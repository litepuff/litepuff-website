import { BaseBusinessService } from './BaseBusinessService.js';
import { SHEET_NAMES } from '../../config/sheets.js';
import { validateInventory } from '../../validation/domainValidation.js';
import { validationError } from '../../utils/AppError.js';

export class InventoryService extends BaseBusinessService {
  constructor(dependencies = {}) { super({ sheet: SHEET_NAMES.INVENTORY, primaryKey: 'InventoryID', validator: validateInventory, ...dependencies }); }
  async setStock(productId, stock) { validateInventory({ ProductID: productId, Stock: stock }); const row = await this.sheets.readOne(this.sheet, (item) => item.ProductID === productId); if (!row) throw validationError('Inventory record does not exist.', { productId }); return this.sheets.update(this.sheet, row._row, { ...row, Stock: Number(stock), UpdatedAt: new Date().toISOString() }); }
}
export const inventoryService = new InventoryService();
