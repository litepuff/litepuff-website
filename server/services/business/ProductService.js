import { BaseBusinessService } from './BaseBusinessService.js';
import { SHEET_NAMES } from '../../config/sheets.js';
import { validateProduct } from '../../validation/domainValidation.js';

export class ProductService extends BaseBusinessService {
  constructor(dependencies = {}) { super({ sheet: SHEET_NAMES.PRODUCTS, primaryKey: 'ProductID', validator: validateProduct, ...dependencies }); }
  async listWithImages(options) { const [{ rows: products, pagination }, { rows: images }] = await Promise.all([this.list(options), this.sheets.readRows(SHEET_NAMES.PRODUCT_IMAGES)]); return { products: products.map((product) => ({ ...product, Images: images.filter((image) => image.ProductID === product.ProductID) })), pagination }; }
  async listCategories() { const { rows } = await this.sheets.readRows(SHEET_NAMES.CATEGORIES); return rows; }
}
export const productService = new ProductService();
