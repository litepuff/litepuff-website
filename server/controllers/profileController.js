import { appendRow, deleteRow, getRows, publicCustomer, updateRow } from '../services/googleSheets.js';
import { customerBusinessService } from '../services/business/CustomerService.js';
import { createId } from '../utils/createId.js';
import { created, ok } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';

async function findCustomer(customerId) {
  const row = (await getRows('CUSTOMERS')).find((item) => item.CustomerID === customerId);
  if (!row) {
    const error = new Error('Customer not found.');
    error.status = 404;
    throw error;
  }
  return row;
}

function publicAddress(row) {
  return {
    id: row.AddressID,
    name: row.FullName,
    fullName: row.FullName,
    phone: row.Phone,
    addressLine: row.AddressLine1,
    addressLine1: row.AddressLine1,
    addressLine2: row.AddressLine2,
    landmark: row.Landmark,
    city: row.City,
    state: row.State,
    pincode: row.Pincode,
    country: row.Country,
    addressType: row.AddressType,
    isDefault: String(row.IsDefault).toLowerCase() === 'true',
    createdAt: row.CreatedAt
  };
}

export async function getProfile(request, response) {
  ok(response, { customer: publicCustomer(await findCustomer(request.customer.id)) });
}

export async function updateProfile(request, response) {
  const { firstName, lastName, phone, newsletter, newsletterSubscribed, currentPassword, newPassword } = request.body;
  if (phone !== undefined || currentPassword !== undefined || newPassword !== undefined) throw new AppError('Phone changes require OTP verification. Passwords are not supported.', { status: 422, code: 'SECURE_IDENTITY_CHANGE_REQUIRED', details: { phoneEndpoint: '/api/account/change-phone' } });
  const changes = {};
  if (firstName !== undefined) changes.firstName = firstName;
  if (lastName !== undefined) changes.lastName = lastName;
  if (newsletter !== undefined || newsletterSubscribed !== undefined) changes.marketingConsent = Boolean(newsletter ?? newsletterSubscribed);
  const row = await customerBusinessService.updateCustomer(request.customer.id, changes);
  ok(response, { customer: publicCustomer(row) }, 'Account updated.');
}

export async function getAddresses(request, response) {
  const rows = (await getRows('ADDRESSES')).filter((row) => row.CustomerID === request.customer.id);
  ok(response, { addresses: rows.map(publicAddress) });
}

export async function addAddress(request, response) {
  const { name, fullName, phone, addressLine, addressLine1, addressLine2 = '', landmark = '', city, state, pincode, country = 'India', addressType = 'Home', isDefault = false } = request.body;
  const resolvedName = String(fullName || name || '').trim();
  const resolvedAddress = String(addressLine1 || addressLine || '').trim();
  if (![resolvedName, phone, resolvedAddress, city, state, pincode].every((value) => String(value || '').trim())) return response.status(400).json({ success: false, message: 'Please complete every address field.' });

  const row = {
    AddressID: createId('address'),
    CustomerID: request.customer.id,
    FullName: resolvedName,
    Phone: String(phone).trim(),
    AddressLine1: resolvedAddress,
    AddressLine2: String(addressLine2 || '').trim(),
    Landmark: String(landmark || '').trim(),
    City: String(city).trim(),
    State: String(state).trim(),
    Pincode: String(pincode).trim(),
    Country: String(country || 'India').trim(),
    AddressType: String(addressType || 'Home').trim(),
    IsDefault: Boolean(isDefault),
    CreatedAt: new Date().toISOString()
  };
  if (row.IsDefault) {
    const currentDefaults = (await getRows('ADDRESSES')).filter((item) => item.CustomerID === request.customer.id && String(item.IsDefault).toLowerCase() === 'true');
    await Promise.all(currentDefaults.map((item) => updateRow('ADDRESSES', item._row, { ...item, IsDefault: false })));
  }
  await appendRow('ADDRESSES', row);
  created(response, { address: publicAddress(row) }, 'Address saved.');
}

export async function updateAddress(request, response) {
  const row = (await getRows('ADDRESSES')).find((item) => item.AddressID === request.params.id && item.CustomerID === request.customer.id);
  if (!row) return response.status(404).json({ success: false, message: 'Address not found.' });

  const fields = {
    name: 'FullName',
    fullName: 'FullName',
    phone: 'Phone',
    addressLine: 'AddressLine1',
    addressLine1: 'AddressLine1',
    addressLine2: 'AddressLine2',
    landmark: 'Landmark',
    city: 'City',
    state: 'State',
    pincode: 'Pincode',
    country: 'Country',
    addressType: 'AddressType',
    isDefault: 'IsDefault'
  };
  Object.entries(fields).forEach(([input, column]) => {
    if (request.body[input] !== undefined) row[column] = input === 'isDefault' ? Boolean(request.body[input]) : request.body[input];
  });
  if (String(row.IsDefault).toLowerCase() === 'true') {
    const currentDefaults = (await getRows('ADDRESSES')).filter((item) => item.CustomerID === request.customer.id && item.AddressID !== row.AddressID && String(item.IsDefault).toLowerCase() === 'true');
    await Promise.all(currentDefaults.map((item) => updateRow('ADDRESSES', item._row, { ...item, IsDefault: false })));
  }
  await updateRow('ADDRESSES', row._row, row);
  ok(response, { address: publicAddress(row) }, 'Address updated.');
}

export async function removeAddress(request, response) {
  const row = (await getRows('ADDRESSES')).find((item) => item.AddressID === request.params.id && item.CustomerID === request.customer.id);
  if (!row) return response.status(404).json({ success: false, message: 'Address not found.' });
  await deleteRow('ADDRESSES', row._row);
  ok(response, {}, 'Address removed.');
}

export async function getWishlist(request, response) {
  const rows = (await getRows('WISHLIST')).filter((row) => row.CustomerID === request.customer.id);
  const wishlist = rows.map((row) => ({ id: row.WishlistID, productId: row.ProductID, createdAt: row.CreatedAt, addedAt: row.CreatedAt }));
  ok(response, { wishlist, count: wishlist.length });
}

export async function addWishlist(request, response) {
  if (!request.body.productId) return response.status(400).json({ success: false, message: 'Product ID is required.' });
  const rows = (await getRows('WISHLIST')).filter((row) => row.CustomerID === request.customer.id);
  if (rows.some((row) => row.ProductID === request.body.productId)) return response.status(409).json({ success: false, message: 'This item is already in your wishlist.' });

  const row = { WishlistID: createId('wishlist'), CustomerID: request.customer.id, ProductID: request.body.productId, CreatedAt: new Date().toISOString() };
  await appendRow('WISHLIST', row);
  created(response, { item: { id: row.WishlistID, productId: row.ProductID, createdAt: row.CreatedAt, addedAt: row.CreatedAt } }, 'Added to wishlist.');
}

export async function removeWishlist(request, response) {
  const row = (await getRows('WISHLIST')).find((item) => item.WishlistID === request.params.id && item.CustomerID === request.customer.id);
  if (!row) return response.status(404).json({ success: false, message: 'Wishlist item not found.' });
  await deleteRow('WISHLIST', row._row);
  ok(response, {}, 'Item removed.');
}
