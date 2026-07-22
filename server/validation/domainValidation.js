import { validationError } from '../utils/AppError.js';
import { AUTH_ROLES, CUSTOMER_STATUSES } from '../config/auth.js';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_PATTERN = /^[+]?[0-9\s-]{7,16}$/;
export const OTP_PATTERN = /^\d{6}$/;

const required = (value, field) => { if (value === undefined || value === null || String(value).trim() === '') throw validationError(`${field} is required.`, { field }); };
const nonNegative = (value, field) => { if (!Number.isFinite(Number(value)) || Number(value) < 0) throw validationError(`${field} must be a non-negative number.`, { field }); };

export function validateProduct(input, partial = false) {
  if (!partial) { required(input.Name ?? input.name, 'name'); required(input.Category ?? input.category, 'category'); required(input.Price ?? input.price, 'price'); }
  for (const [key, field] of [['Price', 'price'], ['DiscountPrice', 'discountPrice'], ['Stock', 'stock']]) if ((input[key] ?? input[field]) !== undefined && (input[key] ?? input[field]) !== '') nonNegative(input[key] ?? input[field], field);
  return input;
}
export function validateInventory(input) { required(input.ProductID ?? input.productId, 'productId'); nonNegative(input.Stock ?? input.stock, 'stock'); if ((input.Reserved ?? input.reserved) !== undefined) nonNegative(input.Reserved ?? input.reserved, 'reserved'); return input; }
export function validateOrder(input, partial = false) { if (!partial) { required(input.CustomerID ?? input.customerId, 'customerId'); required(input.GrandTotal ?? input.grandTotal, 'grandTotal'); } if ((input.GrandTotal ?? input.grandTotal) !== undefined) nonNegative(input.GrandTotal ?? input.grandTotal, 'grandTotal'); return input; }
export function validateCoupon(input, partial = false) { if (!partial) { required(input.Code ?? input.code, 'code'); required(input.Value ?? input.value, 'value'); } if ((input.Value ?? input.value) !== undefined) nonNegative(input.Value ?? input.value, 'value'); return input; }
export function validateCustomer(input, partial = false) { if (!partial) required(input.CustomerID ?? input.customerId, 'customerId'); const id = input.CustomerID ?? input.customerId; const email = input.Email ?? input.email; const phone = input.Phone ?? input.phone; const role = input.Role ?? input.role; const status = input.Status ?? input.status; if (id && !/^[A-Za-z0-9_-]{2,100}$/.test(String(id))) throw validationError('Customer ID is invalid.', { field: 'customerId' }); if (email && !EMAIL_PATTERN.test(String(email))) throw validationError('Email is invalid.', { field: 'email' }); if (phone && !PHONE_PATTERN.test(String(phone))) throw validationError('Phone is invalid.', { field: 'phone' }); if (role && !Object.values(AUTH_ROLES).includes(String(role).toLowerCase())) throw validationError('Role is invalid.', { field: 'role' }); if (status && !Object.values(CUSTOMER_STATUSES).includes(String(status).toLowerCase())) throw validationError('Status is invalid.', { field: 'status' }); return input; }
export function validateBlog(input, partial = false) { if (!partial) { required(input.Title ?? input.title, 'title'); required(input.Slug ?? input.slug, 'slug'); } return input; }
export function validateEmail(value) { required(value, 'email'); const email = String(value).trim().toLowerCase(); if (email.length > 254 || !EMAIL_PATTERN.test(email)) throw validationError('Email is invalid.', { field: 'email' }); return email; }
export function validateOtp(value) { required(value, 'otp'); const otp = String(value).trim(); if (!OTP_PATTERN.test(otp)) throw validationError('OTP must contain exactly 6 digits.', { field: 'otp' }); return otp; }
export function normalizePhoneE164(value) { required(value, 'phone'); const compact = String(value).trim().replace(/[\s().-]/g, '').replace(/^00/, '+'); if (!/^\+[1-9]\d{7,14}$/.test(compact)) throw validationError('Phone must include a valid country code in E.164 format.', { field: 'phone' }); return compact; }
