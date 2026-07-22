import express from 'express';
import { protectCustomerRoute, requireOwnership, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../config/auth.js';
import { addCartItem, clearCart, getCart, removeCartItem, updateCartItem } from '../controllers/cartController.js';

const router = express.Router();
const handle = (controller) => (request, response, next) => Promise.resolve(controller(request, response, next)).catch(next);

router.use(protectCustomerRoute);
router.get('/', requirePermission(PERMISSIONS.CUSTOMER_CART_READ), handle(getCart));
router.post('/', requirePermission(PERMISSIONS.CUSTOMER_CART_MANAGE), handle(addCartItem));
router.put('/:id', requirePermission(PERMISSIONS.CUSTOMER_CART_MANAGE), requireOwnership('cart'), handle(updateCartItem));
router.delete('/', requirePermission(PERMISSIONS.CUSTOMER_CART_MANAGE), handle(clearCart));
router.delete('/:id', requirePermission(PERMISSIONS.CUSTOMER_CART_MANAGE), requireOwnership('cart'), handle(removeCartItem));

export default router;
