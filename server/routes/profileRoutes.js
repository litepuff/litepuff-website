import express from 'express';
import { protectCustomerRoute, requireOwnership, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../config/auth.js';
import { addAddress, addWishlist, getAddresses, getProfile, getWishlist, removeAddress, removeWishlist, updateAddress, updateProfile } from '../controllers/profileController.js';
const handle = (controller) => (request, response, next) => Promise.resolve(controller(request, response, next)).catch(next);

export const profileRouter = express.Router();
profileRouter.use(protectCustomerRoute);
profileRouter.get('/', requirePermission(PERMISSIONS.CUSTOMER_PROFILE_READ), handle(getProfile));
profileRouter.put('/update', requirePermission(PERMISSIONS.CUSTOMER_PROFILE_UPDATE), handle(updateProfile));

export const addressesRouter = express.Router();
addressesRouter.get('/addresses', protectCustomerRoute, requirePermission(PERMISSIONS.CUSTOMER_ADDRESS_READ), handle(getAddresses));
addressesRouter.post('/address', protectCustomerRoute, requirePermission(PERMISSIONS.CUSTOMER_ADDRESS_CREATE), handle(addAddress));
addressesRouter.put('/address/:id', protectCustomerRoute, requirePermission(PERMISSIONS.CUSTOMER_ADDRESS_UPDATE), requireOwnership('address'), handle(updateAddress));
addressesRouter.delete('/address/:id', protectCustomerRoute, requirePermission(PERMISSIONS.CUSTOMER_ADDRESS_DELETE), requireOwnership('address'), handle(removeAddress));

export const wishlistRouter = express.Router();
wishlistRouter.get('/', protectCustomerRoute, requirePermission(PERMISSIONS.CUSTOMER_WISHLIST_READ), handle(getWishlist));
wishlistRouter.post('/', protectCustomerRoute, requirePermission(PERMISSIONS.CUSTOMER_WISHLIST_MANAGE), handle(addWishlist));
wishlistRouter.delete('/:id', protectCustomerRoute, requirePermission(PERMISSIONS.CUSTOMER_WISHLIST_MANAGE), requireOwnership('wishlist'), handle(removeWishlist));
