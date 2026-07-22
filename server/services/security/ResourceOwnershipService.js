import { SHEET_NAMES } from '../../config/sheets.js';
import { googleSheetsService } from '../GoogleSheetsService.js';
import { AppError } from '../../utils/AppError.js';

const resources = Object.freeze({ address: [SHEET_NAMES.ADDRESSES, 'AddressID'], wishlist: [SHEET_NAMES.WISHLIST, 'WishlistID'], cart: [SHEET_NAMES.CART, 'CartID'], order: [SHEET_NAMES.ORDERS, 'OrderID'], payment: [SHEET_NAMES.PAYMENTS, 'PaymentID'], review: [SHEET_NAMES.REVIEWS, 'ReviewID'] });
export class ResourceOwnershipService {
  constructor({ sheets = googleSheetsService } = {}) { this.sheets = sheets; }
  async owner(resource, resourceId) { const definition = resources[resource]; if (!definition) throw new AppError('Ownership resource is invalid.', { status: 500, code: 'OWNERSHIP_RESOURCE_INVALID' }); const [sheet, key] = definition; const row = await this.sheets.readOne(sheet, (item) => item[key] === resourceId); if (!row) throw new AppError('Resource was not found.', { status: 404, code: 'NOT_FOUND' }); return { ownerId: row.CustomerID, row }; }
}
export const resourceOwnershipService = new ResourceOwnershipService();
