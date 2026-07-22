import express from 'express';
import { getOrderDetails, getOrders, getTracking } from '../controllers/orderController.js';
import { downloadInvoice } from '../controllers/productionController.js';
import { protectAdminRoute, protectCustomerRoute, requireOwnership, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../config/auth.js';

const router = express.Router();
const handle = (controller) => (request, response, next) => Promise.resolve(controller(request, response, next)).catch(next);

router.get('/', protectCustomerRoute, requirePermission(PERMISSIONS.CUSTOMER_ORDERS_READ), handle(getOrders));

router.get('/:id/invoice', (request, response, next) => {
  const token = (request.headers.authorization || '').replace(/^Bearer\s+/i, '');
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    if (payload.role === 'admin') return protectAdminRoute(request, response, () => handle(downloadInvoice)(request, response, next));
  } catch {
    // Customer auth below returns the canonical session error.
  }
  return protectCustomerRoute(request, response, () => handle(downloadInvoice)(request, response, next));
});
router.get('/:id', protectCustomerRoute, requirePermission(PERMISSIONS.CUSTOMER_ORDERS_READ), requireOwnership('order'), handle(getOrderDetails));

export const trackingRouter = express.Router();
trackingRouter.get('/:orderId', protectCustomerRoute, requirePermission(PERMISSIONS.CUSTOMER_ORDERS_READ), requireOwnership('order', (request) => request.params.orderId), handle(getTracking));

export default router;
